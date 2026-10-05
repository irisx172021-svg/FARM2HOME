import { GoogleGenAI } from '@google/genai';
import Groq from 'groq-sdk';
import { Product, Order, WeatherDay, Role, Language } from '../types.js';
import { formatQuantity, normalizeUnit } from '../lib/quantity.js';
import {
  AIProvider,
  AssistantContext,
  ConversationTurn,
  AssistantResponseMetadata,
  ImageAttachment,
  ErrorClassification,
} from './ai/types.js';
import { GroqProvider, classifyGroqError } from './ai/groqProvider.js';
import { GeminiProvider, classifyGeminiError, isTransientGeminiError } from './ai/geminiProvider.js';

// Re-export shared types and error classification helpers for backwards compatibility
export type {
  AssistantContext,
  ConversationTurn,
  AssistantResponseMetadata,
  ImageAttachment,
  ErrorClassification,
  AIProvider,
};

export {
  classifyGroqError,
  classifyGeminiError,
  isTransientGeminiError,
};

export interface AgronomistBrainOptions {
  geminiKey?: string;
  groqKey?: string;
  geminiClient?: GoogleGenAI;
  groqClient?: Groq;
}

export class Farm2HomeAgronomistBrain {
  public groqProvider: GroqProvider;
  public geminiProvider: GeminiProvider;

  constructor(
    geminiKeyOrOptions?: string | AgronomistBrainOptions,
    customGeminiClient?: GoogleGenAI,
    customGroqClient?: Groq
  ) {
    let geminiKey: string | undefined;
    let groqKey: string | undefined;
    let geminiClient: GoogleGenAI | undefined = customGeminiClient;
    let groqClient: Groq | undefined = customGroqClient;

    if (typeof geminiKeyOrOptions === 'string') {
      geminiKey = geminiKeyOrOptions;
      // If an isolated customGeminiClient was provided without a customGroqClient,
      // do not bind real ambient GROQ_API_KEY to allow isolated Gemini unit testing
      if (customGeminiClient && !customGroqClient) {
        groqKey = '';
      }
    } else if (geminiKeyOrOptions && typeof geminiKeyOrOptions === 'object') {
      geminiKey = geminiKeyOrOptions.geminiKey;
      groqKey = geminiKeyOrOptions.groqKey;
      if (geminiKeyOrOptions.geminiClient) geminiClient = geminiKeyOrOptions.geminiClient;
      if (geminiKeyOrOptions.groqClient) groqClient = geminiKeyOrOptions.groqClient;
    }

    // Initialize Primary (Groq) and Fallback (Gemini) providers
    this.groqProvider = new GroqProvider(groqKey, groqClient);
    this.geminiProvider = new GeminiProvider(geminiKey, geminiClient);
  }

  // Backwards compatibility accessors for existing tests and legacy references
  public get ai(): GoogleGenAI | null {
    return this.geminiProvider.ai;
  }
  public set ai(val: GoogleGenAI | null) {
    this.geminiProvider.ai = val;
  }

  public get primaryModel(): string {
    return this.geminiProvider.primaryModel;
  }
  public set primaryModel(val: string) {
    this.geminiProvider.primaryModel = val;
    this.geminiProvider.modelName = val;
  }

  public get fallbackModel(): string {
    return this.geminiProvider.fallbackModel;
  }
  public set fallbackModel(val: string) {
    this.geminiProvider.fallbackModel = val;
  }

  public get retryDelaysMs(): number[] {
    return this.groqProvider.retryDelaysMs;
  }
  public set retryDelaysMs(val: number[]) {
    this.groqProvider.retryDelaysMs = val;
    this.geminiProvider.retryDelaysMs = val;
  }

  public get circuitBreaker429Threshold(): number {
    return this.groqProvider.circuitBreaker429Threshold;
  }
  public set circuitBreaker429Threshold(val: number) {
    this.groqProvider.circuitBreaker429Threshold = val;
    this.geminiProvider.circuitBreaker429Threshold = val;
  }

  public get circuitBreakerCooldownMs(): number {
    return this.groqProvider.circuitBreakerCooldownMs;
  }
  public set circuitBreakerCooldownMs(val: number) {
    this.groqProvider.circuitBreakerCooldownMs = val;
    this.geminiProvider.circuitBreakerCooldownMs = val;
  }

  public get circuitState(): 'CLOSED' | 'OPEN' | 'HALF_OPEN' {
    if (this.groqProvider.isConfigured()) {
      return this.groqProvider.circuitState;
    }
    return this.geminiProvider.circuitState;
  }
  public set circuitState(val: 'CLOSED' | 'OPEN' | 'HALF_OPEN') {
    this.groqProvider.circuitState = val;
    this.geminiProvider.circuitState = val;
  }

  public isPrimaryInCooldown(): boolean {
    if (this.groqProvider.isConfigured()) {
      return this.groqProvider.isCooldownActive();
    }
    return this.geminiProvider.isCooldownActive();
  }

  public recordSuccess(model: string): void {
    if (this.groqProvider.modelName === model || this.groqProvider.visionModelName === model) {
      this.groqProvider.recordSuccess();
    } else {
      this.geminiProvider.recordSuccess(model);
    }
  }

  public record429Failure(model: string): void {
    if (this.groqProvider.modelName === model || this.groqProvider.visionModelName === model) {
      this.groqProvider.record429Failure();
    } else {
      this.geminiProvider.record429Failure(model);
    }
  }

  public isConfigured(): boolean {
    return this.groqProvider.isConfigured() || this.geminiProvider.isConfigured();
  }

  /**
   * Builds the comprehensive agronomic system prompt tailored to the user's role,
   * language, real Farm2Home marketplace state, and live farm advisory data.
   */
  public buildSystemInstruction(context: AssistantContext): string {
    const role = context.role || 'farmer';
    const lang = context.language || 'en';

    let marketplaceContextText = 'No active marketplace inventory linked.';

    if (role === 'farmer') {
      const myProds = context.farmerProducts || [];
      const myOrds = context.farmerOrders || [];
      const prodSummary =
        myProds.length > 0
          ? myProds
              .map(
                (p) =>
                  `- "${p.title}" (Category: ${p.category}, stock_quantity: ${p.stock}, stock_unit: ${normalizeUnit(p.unit)}, Price: ₹${p.price}/${normalizeUnit(p.unit)}, Organic: ${p.is_organic ? 'Yes' : 'No'})`
              )
              .join('\n')
          : 'No crops currently listed in your Farm2Home catalog.';

      const ordSummary =
        myOrds.length > 0
          ? myOrds
              .slice(0, 5)
              .map(
                (o) =>
                  `- Order ${o.id}: ${o.items.map((i) => `${formatQuantity(i.quantity, i.unit)} of ${i.title}`).join(', ')} (Status: ${o.status})`
              )
              .join('\n')
          : 'No pending customer orders.';

      const myCropPlans = context.farmerCropPlans || [];
      const plansSummary =
        myCropPlans.length > 0
          ? myCropPlans
              .map(
                (cp) =>
                  `- "${cp.crop_name}" (Status: ${cp.status}, Season: ${cp.season || 'N/A'}, Area: ${cp.area_acres ? `${cp.area_acres} acres` : 'N/A'}${cp.notes ? `, Notes: ${cp.notes}` : ''})`
              )
              .join('\n')
          : 'No specific seasonal crop plans recorded.';

      marketplaceContextText = `FARMER'S ACTIVE FARM2HOME INVENTORY, CROP PLANS & ORDERS:
Farmer Name: ${context.userName || 'Registered Farmer'}
Current Listed Products (${myProds.length}):
${prodSummary}

Active Seasonal Crop Plans (${myCropPlans.length}):
${plansSummary}

Recent Customer Orders:
${ordSummary}`;
    } else if (role === 'customer') {
      const availableProds = (context.availableMarketProducts || []).slice(0, 10);
      const prodList =
        availableProds.length > 0
          ? availableProds
              .map(
                (p) =>
                  `- ${p.title} from ${p.farmer_name || 'Verified Farmer'} (₹${p.price}/${normalizeUnit(p.unit)}, ${p.is_organic ? 'Organic Certified' : 'Fresh Farm'})`
              )
              .join('\n')
          : 'Fresh seasonal produce available in marketplace.';

      marketplaceContextText = `CUSTOMER MARKETPLACE CONTEXT:
Customer Name: ${context.userName || 'Valued Customer'}
Sample Marketplace Fresh Produce Available Today:
${prodList}`;
    } else if (role === 'delivery') {
      marketplaceContextText = `DELIVERY PARTNER CONTEXT:
Delivery Partner: ${context.userName || 'Delivery Associate'}
Focus: Perishable crop handling, cold-chain preservation, transit safety (e.g. glass bottles, leafy greens, ripe tomatoes), and 6-digit OTP delivery security.`;
    }

    // Weather forecast context
    let weatherContextText = 'Weather data not currently synchronized.';
    if (context.weatherForecast && context.weatherForecast.length > 0) {
      const today = context.weatherForecast[0];
      const tomorrow = context.weatherForecast[1];
      weatherContextText = `LOCAL REGIONAL AGRI WEATHER CONTEXT (Medak / Chittoor / Krishna Delta agro-climatic zone):
- Today (${today.day}, ${today.date}): Temp ${today.tempMin}°C - ${today.tempMax}°C, ${today.condition}, Humidity: ${today.humidity}%, Wind: ${today.windKm} km/h, Rain: ${today.rainfallMm} mm. Advisory: "${today.advisory}"
${tomorrow ? `- Tomorrow (${tomorrow.day}, ${tomorrow.date}): Temp ${tomorrow.tempMin}°C - ${tomorrow.tempMax}°C, ${tomorrow.condition}, Humidity: ${tomorrow.humidity}%, Rain: ${tomorrow.rainfallMm} mm. Advisory: "${tomorrow.advisory}"` : ''}`;
    }

    const languageInstructionMap: Record<Language, string> = {
      en: 'Primary Language: English. Use clear, accessible agricultural terminology with simple structured explanations.',
      te: 'Primary Language: Telugu (తెలుగు). Respond fluently and naturally in Telugu. Use natural farmer-friendly Telugu phrasing (e.g., సహజ ఎరువులు, నీటి యాజమాన్యం, తెగుళ్ల నివారణ, డ్రిప్ పద్ధతి). Avoid awkward machine translations.',
      hi: 'Primary Language: Hindi (हिन्दी). Respond fluently and naturally in Hindi. Use common agricultural terminology (e.g., फसल सुरक्षा, जैविक खाद, सिंचाई, कीट प्रबंधन, मंडी भाव). Avoid awkward robotic translations.',
      ta: 'Primary Language: Tamil (தமிழ்). Respond fluently and naturally in Tamil. Use standard, respectful farmer terminology (e.g., இயற்கை உரம், பயிர் பாதுகாப்பு, பாசன மேலாண்மை, பூச்சி கட்டுப்பாடு).',
    };

    return `You are the "Farm2Home AI Agronomist", a dedicated, trustworthy, and knowledgeable agricultural advisor and farm co-pilot built specifically for the Farm2Home platform.

CORE IDENTITY & PHILOSOPHY:
- Behavior: Knowledgeable, practical, calm, respectful, and farmer-friendly.
- Depth: Concise when the question is simple; detailed, practical, and step-by-step when the farmer needs an in-depth agronomic explanation.
- Integrity: Never arrogant; NEVER pretend to know something you do not know. Never fabricate pesticide dosages, chemical spray charts, market prices, or scientific claims.
- Role-Aware: Prioritize the farmer's livelihood, crop yields, and sustainable practices. If a customer asks, provide clear nutritional, storage, or culinary guidance. If a delivery partner asks, provide transit and produce safety tips.

LANGUAGE RULE:
${languageInstructionMap[lang] || languageInstructionMap.en}
* Note: If the user inputs a message in Telugu, Hindi, or Tamil regardless of the default setting, naturally answer in that same language.

FARMER KNOWLEDGE & DOMAIN SCOPE:
1. CROPS: Crop selection, lifecycle, sowing seasons, seed rates, nursery preparation, seedling transplanting, spacing, harvesting indicators, and post-harvest curing/storage.
2. SOIL & NUTRITION: Soil types (black cotton, red loamy, alluvial, sandy), soil testing fundamentals, pH balance, organic carbon, compost/FYM/jeevamrutha preparation, NPK balance, and deficiency diagnosis.
3. IRRIGATION: Drip vs flood irrigation, critical watering stages (flowering, fruit development), avoiding waterlogging and root rot, water conservation.
4. WEATHER & RISKS: Correlating temperature, wind, humidity, and rainfall to crop diseases (e.g., fungal outbreaks during high humidity, blossom drop during extreme heat), drainage during heavy rain, withholding fertilizer sprays before rain.
5. PESTS & DISEASES (SAFE DIAGNOSIS MANDATE):
   - NEVER claim certainty from symptoms alone. Use cautious, responsible phrasing: "This may be consistent with...", "Possible causes include...", "To narrow this down, check whether...".
   - Distinguish observations (yellowing veins vs yellowing leaf margins) from conclusions.
   - Emphasize Integrated Pest Management (IPM), yellow sticky traps, pheromone traps, neem seed kernel extract (NSKE), Trichoderma, and bio-controls before synthetic options.
   - For chemical questions: Never fabricate proprietary mixing rates. Advise reading manufacturer labels and consulting qualified local agricultural officers (KVK / Grama Ward Krishi Sahayak / Agriculture Extension Officer).
6. ORGANIC FARMING: Crop rotation, mulching, green manuring (dhaincha, sunn hemp), Panchagavya, Dashaparni kashayam, beneficial insects.
7. MARKETS & FARM MANAGEMENT: Help farmers understand seasonal demand, sorting/grading for direct-to-consumer premiums, reducing post-harvest losses. Distinguish verified current data from general historical trends.

SYSTEMATIC TROUBLESHOOTING PATTERNS:
- If asked "What should I grow?": Ask follow-up questions regarding region/district, season/month, water availability (borewell, canal, rainfed), soil type, and farming goal.
- If asked "My crop leaves are turning yellow": Systematically analyze nitrogen deficiency (older leaves yellowing from tip), iron/zinc chlorosis (younger leaves with green veins), overwatering/poor drainage, or fungal/viral root infection. Ask clarifying questions on which leaves are affected first.
- If asked "How much water does my crop need?": Explain that exact volume depends on growth stage, soil type, irrigation method (drip vs furrow), and ambient weather.

STRUCTURING ANSWERS:
For practical farmer questions, prefer this structure when appropriate:
- Direct, clear summary (1-2 sentences)
- **What to do**: Practical step 1, 2, 3
- **Why it matters**: Agronomic principle explained simply
- **What to watch for**: Symptoms, weather triggers, or risks
- **When to seek local expert help**: Specific thresholds to consult the nearest KVK or Agri Officer
(For simple or casual questions, respond conversationally and concisely without forcing rigid templates).

CURRENT APPLICATION CONTEXT (REAL DATA):
${marketplaceContextText}

${weatherContextText}

When referencing Farm2Home data, use the verified information above. If specific farm data (like exact soil test reports) is not available, explicitly state that it is unavailable and guide the user on how to gather or test it.`;
  }

  /**
   * Consults the AI Agronomist following the required provider hierarchy:
   * 1. Primary: Groq Provider
   * 2. Fallback: Gemini Provider
   * Automatically handles 429 rate limits, cooldowns, bounded retries, and clean fallbacks.
   */
  public async consultAgronomist(params: {
    prompt: string;
    context: AssistantContext;
    history?: ConversationTurn[];
    image?: ImageAttachment;
  }): Promise<AssistantResponseMetadata> {
    const { prompt, context, history = [], image } = params;

    // Check if at least one provider is configured
    if (!this.isConfigured()) {
      const fallbackMsg = this.getFallbackMessage(context.language || 'en');
      return {
        answer: fallbackMsg,
        language: context.language || 'en',
        category: 'general_guidance',
        confidence: 'low',
        needs_more_information: true,
        warnings: ['Neither GROQ_API_KEY nor GEMINI_API_KEY is configured in the server environment.'],
      };
    }

    const systemInstruction = this.buildSystemInstruction(context);
    let lastClassification: ErrorClassification | null = null;

    // -------------------------------------------------------------
    // STEP 1: PRIMARY PROVIDER — GroqCloud (via GroqProvider)
    // -------------------------------------------------------------
    if (this.groqProvider.isConfigured()) {
      const isGroqCooldown = this.groqProvider.isCooldownActive();

      if (!isGroqCooldown) {
        try {
          console.log(`[AI Agronomist] Invoking Primary Provider: Groq (${this.groqProvider.modelName})`);
          const groqResult = await this.groqProvider.generateResponse({
            systemInstruction,
            prompt,
            history,
            image,
            context,
          });

          console.log(`[AI Agronomist] Primary Provider Groq succeeded (model: ${groqResult.modelUsed})`);
          return groqResult;
        } catch (groqErr: unknown) {
          const classification = this.groqProvider.classifyError(groqErr);
          lastClassification = classification;
          console.warn(
            `[AI Agronomist] Primary Provider Groq failed (status=${classification.statusCode || classification.statusText || 'N/A'}, isTransient=${classification.isTransient}). Switching to Gemini fallback.`
          );
        }
      } else {
        console.warn(
          `[AI Agronomist] Primary Provider Groq is in cooldown after repeated 429s. Bypassing directly to Gemini fallback.`
        );
      }
    } else {
      console.log(`[AI Agronomist] Primary Provider Groq not configured (no key). Using Gemini fallback.`);
    }

    // -------------------------------------------------------------
    // STEP 2: FALLBACK PROVIDER — Gemini (via GeminiProvider)
    // -------------------------------------------------------------
    if (this.geminiProvider.isConfigured()) {
      try {
        console.log(`[AI Agronomist] Invoking Fallback Provider: Gemini (${this.geminiProvider.primaryModel})`);
        const geminiResult = await this.geminiProvider.generateResponse({
          systemInstruction,
          prompt,
          history,
          image,
          context,
        });

        console.log(`[AI Agronomist] Fallback Provider Gemini succeeded (model: ${geminiResult.modelUsed})`);
        return geminiResult;
      } catch (geminiErr: unknown) {
        const classification = this.geminiProvider.classifyError(geminiErr);
        lastClassification = classification;
        console.error(
          `[AI Agronomist] Fallback Provider Gemini failed (status=${classification.statusCode || classification.statusText || 'N/A'}, isTransient=${classification.isTransient}).`
        );
      }
    } else {
      console.warn(`[AI Agronomist] Fallback Provider Gemini is not configured.`);
    }

    // -------------------------------------------------------------
    // STEP 3: RESILIENT ERROR RESPONSE (Both Providers Exhausted)
    // -------------------------------------------------------------
    console.error(`[AI Agronomist] All AI providers (Groq and Gemini) failed or are unavailable. Returning safe service notice.`);
    if (lastClassification && !lastClassification.isTransient) {
      return {
        answer:
          'The AI Agronomist encountered an authentication or configuration error. Please ensure your API key is correctly configured in settings.',
        language: context.language || 'en',
        category: 'system_error',
        confidence: 'low',
        needs_more_information: false,
        follow_up_questions: [],
        warnings: ['API key or model configuration error.'],
      };
    }
    return {
      answer: this.getBusyMessage(context.language || 'en'),
      language: context.language || 'en',
      category: 'service_notice',
      confidence: 'low',
      needs_more_information: false,
      follow_up_questions: [],
      warnings: ['Farm2Home AI Agronomist is temporarily busy. Please try again in a moment.'],
    };
  }

  public getBusyMessage(lang: Language): string {
    const messages: Record<Language, string> = {
      en: 'Farm2Home AI Agronomist is temporarily busy. Please try again in a moment.',
      te: 'ఫార్మ్2హోమ్ AI వ్యవసాయ నిపుణుల సేవ ప్రస్తుతం బిజీగా ఉంది. దయచేసి కాసేపటి తర్వాత మళ్లీ ప్రయత్నించండి.',
      hi: 'फार्म2होम एआई कृषि विशेषज्ञ सेवा वर्तमान में व्यस्त है। कृपया कुछ क्षण बाद पुनः प्रयास करें।',
      ta: 'ஃபார்ம்2ஹோம் AI வேளாண் சேவை தற்போது பிஸியாக உள்ளது. சிறிது நேரம் கழித்து மீண்டும் முயற்センチவும்.',
    };
    return messages[lang] || messages.en;
  }

  public getFallbackMessage(lang: Language): string {
    const messages: Record<Language, string> = {
      te: '🌾 **ఫార్మ్2హోమ్ AI వ్యవసాయ నిపుణుడు**: నమస్కారం! పూర్తి స్థాయి AI సలహాలు పొందడానికి, దయచేసి సర్వర్ సెట్టింగ్స్‌లో `GROQ_API_KEY` లేదా `GEMINI_API_KEY` సరిచూసుకోండి.',
      hi: '🌾 **फार्म2होम एआई कृषि विशेषज्ञ**: नमस्ते! उन्नत एआई कृषि सलाह सक्रिय करने के लिए कृपया सर्वर सेटिंग्स में `GROQ_API_KEY` या `GEMINI_API_KEY` कॉन्फ़िगर करें।',
      ta: '🌾 **ஃபார்ம்2ஹோம் AI விவசாய ஆலோசகர்**: வணக்கம்! வேளாண் ஆலோசனைகளைப் பெற, தயவுசெய்து உங்கள் `GROQ_API_KEY` அல்லது `GEMINI_API_KEY` ஐ சரிபார்க்கவும்.',
      en: '🌾 **Farm2Home AI Agronomist**: Hello! To activate agricultural intelligence, please ensure your `GROQ_API_KEY` or `GEMINI_API_KEY` is configured in Settings.',
    };
    return messages[lang] || messages.en;
  }
}

// Export singleton instance for server routes
export const agronomistBrain = new Farm2HomeAgronomistBrain();

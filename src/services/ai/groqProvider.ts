import Groq from 'groq-sdk';
import {
  AIProvider,
  AssistantContext,
  ConversationTurn,
  AssistantResponseMetadata,
  ImageAttachment,
  ErrorClassification,
} from './types.js';

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function executeWithTimeout<T>(
  promiseFactory: () => Promise<T>,
  timeoutMs: number,
  operationDesc: string
): Promise<T> {
  let timer: NodeJS.Timeout | null = null;
  const timeoutPromise = new Promise<never>((_, reject) => {
    timer = setTimeout(() => {
      const err = new Error(`${operationDesc} timed out after ${timeoutMs}ms`);
      err.name = 'TimeoutError';
      (err as any).status = 504;
      (err as any).code = 504;
      reject(err);
    }, timeoutMs);
  });

  try {
    return await Promise.race([promiseFactory(), timeoutPromise]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

function cleanJsonText(rawText: string): string {
  let cleaned = rawText.trim();
  if (cleaned.startsWith('```json')) {
    cleaned = cleaned.replace(/^```json\s*/i, '').replace(/\s*```$/, '');
  } else if (cleaned.startsWith('```')) {
    cleaned = cleaned.replace(/^```\s*/, '').replace(/\s*```$/, '');
  }
  return cleaned.trim();
}

/**
 * Classifies errors from Groq SDK, HTTP, or network layers into transient vs non-transient.
 * Transient: 429, 500, 502, 503, 504, rate limits, timeouts, service unavailable.
 * Non-transient: 400, 401, 403, 404, invalid API key, permission denied.
 */
export function classifyGroqError(error: unknown): ErrorClassification {
  if (!error) {
    return { isTransient: false, reason: 'Unknown error (empty)' };
  }

  // Timeout checks
  if (
    error instanceof Error &&
    (error.name === 'TimeoutError' ||
      error.name === 'APIConnectionTimeoutError' ||
      error.message.toLowerCase().includes('timeout') ||
      error.message.toLowerCase().includes('deadline exceeded'))
  ) {
    return {
      isTransient: true,
      statusCode: 504,
      statusText: 'DEADLINE_EXCEEDED',
      reason: 'Groq request deadline exceeded (timeout)',
    };
  }

  let statusCode: number | undefined;
  let statusText: string | undefined;
  let rawMessage = '';

  if (typeof error === 'object' && error !== null) {
    const errObj = error as Record<string, any>;
    if (typeof errObj.status === 'number') {
      statusCode = errObj.status;
    } else if (typeof errObj.status === 'string') {
      statusText = errObj.status;
    }

    if (typeof errObj.code === 'number') {
      statusCode = errObj.code;
    }

    if (errObj.error && typeof errObj.error === 'object') {
      if (typeof errObj.error.code === 'number') {
        statusCode = errObj.error.code;
      }
      if (typeof errObj.error.status === 'string') {
        statusText = errObj.error.status;
      }
      if (typeof errObj.error.message === 'string') {
        rawMessage = errObj.error.message;
      }
    }

    if (!rawMessage && typeof errObj.message === 'string') {
      rawMessage = errObj.message;
      if (rawMessage.includes('{') && rawMessage.includes('}')) {
        try {
          const jsonStart = rawMessage.indexOf('{');
          const jsonEnd = rawMessage.lastIndexOf('}') + 1;
          const parsed = JSON.parse(rawMessage.substring(jsonStart, jsonEnd));
          if (parsed.error) {
            if (typeof parsed.error.code === 'number') statusCode = parsed.error.code;
            if (typeof parsed.error.status === 'string') statusText = parsed.error.status;
            if (typeof parsed.error.message === 'string') rawMessage = parsed.error.message;
          }
        } catch {
          // ignore json parse error
        }
      }
    }
  }

  const upperStatus = (statusText || '').toUpperCase();
  const lowerMsg = (rawMessage || '').toLowerCase();

  // 1. Explicit Non-Transient Codes
  const nonTransientCodes = [400, 401, 403, 404];
  if (
    (statusCode && nonTransientCodes.includes(statusCode)) ||
    lowerMsg.includes('api key') ||
    lowerMsg.includes('invalid_api_key') ||
    lowerMsg.includes('unauthorized') ||
    lowerMsg.includes('permission denied') ||
    lowerMsg.includes('invalid argument') ||
    lowerMsg.includes('model_not_found')
  ) {
    return {
      isTransient: false,
      statusCode: statusCode || (lowerMsg.includes('api key') || lowerMsg.includes('unauthorized') ? 401 : 400),
      statusText: statusText || 'NON_TRANSIENT',
      reason: rawMessage || statusText || 'Non-transient authentication or configuration error',
    };
  }

  // 2. Explicit Transient Codes
  const transientCodes = [429, 500, 502, 503, 504];
  if (
    (statusCode && transientCodes.includes(statusCode)) ||
    upperStatus === 'RATE_LIMIT_EXCEEDED' ||
    lowerMsg.includes('rate limit') ||
    lowerMsg.includes('resource_exhausted') ||
    lowerMsg.includes('server error') ||
    lowerMsg.includes('service unavailable') ||
    lowerMsg.includes('econnreset') ||
    lowerMsg.includes('etimedout') ||
    lowerMsg.includes('fetch failed')
  ) {
    return {
      isTransient: true,
      statusCode: statusCode || 429,
      statusText: statusText || 'TRANSIENT',
      reason: rawMessage || statusText || 'Transient service unavailability or rate limit',
    };
  }

  return {
    isTransient: false,
    statusCode,
    statusText,
    reason: rawMessage || 'Unknown error',
  };
}

export class GroqProvider implements AIProvider {
  public readonly providerName = 'groq' as const;
  public groq: Groq | null = null;
  public modelName: string;
  public visionModelName: string;
  public requestTimeoutMs: number;
  public retryDelaysMs: number[];

  // Circuit breaker state for Groq 429 rate limits
  public circuitBreaker429Threshold: number;
  public circuitBreakerCooldownMs: number;
  public consecutive429Count: number = 0;
  public circuitState: 'CLOSED' | 'OPEN' | 'HALF_OPEN' = 'CLOSED';
  public cooldownUntilTimestamp: number = 0;

  constructor(apiKey?: string, customGroqClient?: Groq) {
    this.modelName = process.env.GROQ_MODEL || 'openai/gpt-oss-120b';
    this.visionModelName = process.env.GROQ_VISION_MODEL || 'llama-3.2-11b-vision-preview';
    this.requestTimeoutMs = Number(process.env.GROQ_TIMEOUT_MS) || 25000;
    this.circuitBreaker429Threshold = Number(process.env.GROQ_CB_429_THRESHOLD) || 2;
    this.circuitBreakerCooldownMs = Number(process.env.GROQ_CB_COOLDOWN_MS) || 60000;
    // Bounded retry delays: single fast retry (400ms) before switching to fallback provider
    this.retryDelaysMs = [400];

    if (customGroqClient) {
      this.groq = customGroqClient;
    } else {
      const key = apiKey !== undefined ? apiKey : process.env.GROQ_API_KEY;
      if (key && key.trim().length > 0) {
        this.groq = new Groq({ apiKey: key.trim() });
      }
    }
  }

  public isConfigured(): boolean {
    return Boolean(this.groq);
  }

  public isCooldownActive(): boolean {
    if (this.circuitState === 'OPEN') {
      if (Date.now() < this.cooldownUntilTimestamp) {
        return true;
      }
      this.circuitState = 'HALF_OPEN';
      return false;
    }
    return false;
  }

  public recordSuccess(): void {
    if (this.circuitState === 'HALF_OPEN' || this.consecutive429Count > 0) {
      console.log(`[AI Agronomist - Groq] Model '${this.modelName}' verified healthy; circuit closed.`);
    }
    this.consecutive429Count = 0;
    this.circuitState = 'CLOSED';
    this.cooldownUntilTimestamp = 0;
  }

  public record429Failure(): void {
    this.consecutive429Count++;
    if (this.consecutive429Count >= this.circuitBreaker429Threshold || this.circuitState === 'HALF_OPEN') {
      this.circuitState = 'OPEN';
      this.cooldownUntilTimestamp = Date.now() + this.circuitBreakerCooldownMs;
      console.warn(
        `[AI Agronomist - Groq] Model '${this.modelName}' 429 threshold reached (${this.consecutive429Count} failures). Cooldown active for ${this.circuitBreakerCooldownMs}ms.`
      );
    }
  }

  public classifyError(error: unknown): ErrorClassification {
    return classifyGroqError(error);
  }

  public async generateResponse(params: {
    systemInstruction: string;
    prompt: string;
    history?: ConversationTurn[];
    image?: ImageAttachment;
    context: AssistantContext;
  }): Promise<AssistantResponseMetadata> {
    if (!this.groq) {
      throw new Error('Groq client is not initialized or GROQ_API_KEY is missing');
    }

    const { systemInstruction, prompt, history = [], image, context } = params;

    // Use vision model if image is attached, otherwise production text model
    const hasImage = Boolean(image?.inlineData?.data);
    const model = hasImage ? this.visionModelName : this.modelName;

    // Build chat completion messages
    const messages: Array<any> = [
      {
        role: 'system',
        content: `${systemInstruction}\n\nCRITICAL RESPONSE INSTRUCTION:
You MUST respond strictly with a valid JSON object. Do not wrap with code fences or other prose. Format:
{
  "answer": "Clear, practical, farmer-friendly response formatted with clean markdown, bullet points, and actionable guidance in the user's language.",
  "language": "ISO code: en, te, hi, ta",
  "category": "One of: crop_management, pest_disease, soil_nutrients, irrigation, weather_risk, organic_farming, market_pricing, farm2home_orders, general",
  "confidence": "high, medium, or low",
  "needs_more_information": false,
  "follow_up_questions": ["Question 1", "Question 2"],
  "warnings": ["Warning if chemical handling or severe weather"]
}`,
      },
    ];

    // Include recent conversation turns (up to 8 turns)
    const recentHistory = history.slice(-8);
    for (const turn of recentHistory) {
      messages.push({
        role: turn.role === 'assistant' ? 'assistant' : 'user',
        content: turn.content,
      });
    }

    // Build user turn
    if (hasImage && image?.inlineData?.data) {
      const mimeType = image.inlineData.mimeType || 'image/jpeg';
      messages.push({
        role: 'user',
        content: [
          { type: 'text', text: prompt },
          {
            type: 'image_url',
            image_url: {
              url: `data:${mimeType};base64,${image.inlineData.data}`,
            },
          },
        ],
      });
    } else {
      messages.push({
        role: 'user',
        content: prompt,
      });
    }

    // Bounded retries: 0 (initial call) + 1 retry
    const maxRetries = this.retryDelaysMs.length;
    let lastError: unknown = null;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        if (attempt > 0) {
          console.log(`[AI Agronomist - Groq] Model '${model}' retry attempt ${attempt}/${maxRetries}`);
        }

        const completion = await executeWithTimeout(
          () =>
            this.groq!.chat.completions.create({
              model,
              messages,
              temperature: 0.4,
              response_format: { type: 'json_object' },
            }),
          this.requestTimeoutMs,
          `Groq [${model}]`
        );

        const rawText = completion.choices?.[0]?.message?.content?.trim();
        if (!rawText) {
          throw new Error(`Empty response received from Groq model ${model}`);
        }

        const cleanedJson = cleanJsonText(rawText);
        let parsed: any;
        try {
          parsed = JSON.parse(cleanedJson);
        } catch {
          parsed = {
            answer: cleanedJson,
            language: context.language || 'en',
            category: 'general_guidance',
            confidence: 'medium',
            needs_more_information: false,
          };
        }

        this.recordSuccess();

        return {
          answer: parsed.answer || cleanedJson,
          language: parsed.language || context.language || 'en',
          category: parsed.category || 'general',
          confidence: parsed.confidence || 'high',
          needs_more_information: Boolean(parsed.needs_more_information),
          follow_up_questions: Array.isArray(parsed.follow_up_questions) ? parsed.follow_up_questions : [],
          warnings: Array.isArray(parsed.warnings) ? parsed.warnings : [],
          providerUsed: 'groq',
          modelUsed: model,
        };
      } catch (err: unknown) {
        lastError = err;
        const classification = this.classifyError(err);

        console.warn(
          `[AI Agronomist - Groq] Model '${model}' failed on attempt ${attempt + 1}: status=${classification.statusCode || classification.statusText || 'N/A'}, isTransient=${classification.isTransient}`
        );

        if (!classification.isTransient) {
          throw err;
        }

        if (classification.statusCode === 429) {
          this.record429Failure();
        }

        const canRetry = attempt < maxRetries && this.circuitState !== 'OPEN';
        if (canRetry) {
          const baseDelay = this.retryDelaysMs[attempt] || 400;
          const jitter = Math.floor(Math.random() * 100);
          const waitMs = baseDelay + jitter;
          console.log(`[AI Agronomist - Groq] Backing off for ${waitMs}ms before retry ${attempt + 1}/${maxRetries}...`);
          await sleep(waitMs);
        } else {
          break;
        }
      }
    }

    throw lastError;
  }
}

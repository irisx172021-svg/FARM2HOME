import { GoogleGenAI, Type } from '@google/genai';
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
 * Classifies errors from @google/genai, HTTP, or network layers into transient vs non-transient.
 */
export function classifyGeminiError(error: unknown): ErrorClassification {
  if (!error) {
    return { isTransient: false, reason: 'Unknown error (empty)' };
  }

  // Check timeout errors
  if (
    error instanceof Error &&
    (error.name === 'TimeoutError' ||
      error.message.toLowerCase().includes('timeout') ||
      error.message.toLowerCase().includes('deadline exceeded'))
  ) {
    return {
      isTransient: true,
      statusCode: 504,
      statusText: 'DEADLINE_EXCEEDED',
      reason: 'Gemini request deadline exceeded (timeout)',
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

  // 1. Explicit Non-Transient Codes and Statuses
  const nonTransientCodes = [400, 401, 403, 404];
  const nonTransientStatuses = ['INVALID_ARGUMENT', 'UNAUTHENTICATED', 'PERMISSION_DENIED', 'NOT_FOUND'];
  if (
    (statusCode && nonTransientCodes.includes(statusCode)) ||
    nonTransientStatuses.includes(upperStatus) ||
    lowerMsg.includes('api key not valid') ||
    lowerMsg.includes('api_key_invalid') ||
    lowerMsg.includes('permission denied') ||
    lowerMsg.includes('unauthenticated') ||
    lowerMsg.includes('invalid argument') ||
    lowerMsg.includes('not found') ||
    lowerMsg.includes('project access denied')
  ) {
    return {
      isTransient: false,
      statusCode: statusCode || (upperStatus === 'PERMISSION_DENIED' ? 403 : upperStatus === 'UNAUTHENTICATED' ? 401 : 400),
      statusText: statusText || 'NON_TRANSIENT',
      reason: rawMessage || statusText || 'Non-transient authentication or configuration error',
    };
  }

  // 2. Explicit Transient Codes and Statuses
  const transientCodes = [429, 500, 502, 503, 504];
  const transientStatuses = ['RESOURCE_EXHAUSTED', 'INTERNAL', 'BAD_GATEWAY', 'UNAVAILABLE', 'DEADLINE_EXCEEDED'];

  if (
    (statusCode && transientCodes.includes(statusCode)) ||
    transientStatuses.includes(upperStatus) ||
    lowerMsg.includes('resource_exhausted') ||
    lowerMsg.includes('high demand') ||
    lowerMsg.includes('unavailable') ||
    lowerMsg.includes('spikes in demand') ||
    lowerMsg.includes('deadline exceeded') ||
    lowerMsg.includes('econnreset') ||
    lowerMsg.includes('etimedout') ||
    lowerMsg.includes('fetch failed') ||
    lowerMsg.includes('rate limit') ||
    lowerMsg.includes('busy')
  ) {
    return {
      isTransient: true,
      statusCode: statusCode || (upperStatus === 'RESOURCE_EXHAUSTED' ? 429 : 503),
      statusText: statusText || 'TRANSIENT',
      reason: rawMessage || statusText || 'Transient service unavailability',
    };
  }

  return {
    isTransient: false,
    statusCode,
    statusText,
    reason: rawMessage || 'Unknown non-transient error',
  };
}

export function isTransientGeminiError(error: unknown): boolean {
  return classifyGeminiError(error).isTransient;
}

export class GeminiProvider implements AIProvider {
  public readonly providerName = 'gemini' as const;
  public ai: GoogleGenAI | null = null;
  public modelName: string;
  public primaryModel: string;
  public fallbackModel: string;
  public requestTimeoutMs: number;
  public retryDelaysMs: number[];

  // Circuit breaker state for Gemini 429 rate limits
  public circuitBreaker429Threshold: number;
  public circuitBreakerCooldownMs: number;
  public consecutive429Count: number = 0;
  public circuitState: 'CLOSED' | 'OPEN' | 'HALF_OPEN' = 'CLOSED';
  public cooldownUntilTimestamp: number = 0;

  constructor(apiKey?: string, customAiClient?: GoogleGenAI) {
    this.primaryModel = process.env.PRIMARY_GEMINI_MODEL || 'gemini-3.1-flash-lite';
    this.fallbackModel = process.env.FALLBACK_GEMINI_MODEL || 'gemini-3.8-flash';
    this.modelName = this.primaryModel;
    this.requestTimeoutMs = Number(process.env.GEMINI_TIMEOUT_MS) || 25000;
    this.circuitBreaker429Threshold = Number(process.env.GEMINI_CB_429_THRESHOLD) || 2;
    this.circuitBreakerCooldownMs = Number(process.env.GEMINI_CB_COOLDOWN_MS) || 60000;
    this.retryDelaysMs = [400];

    if (customAiClient) {
      this.ai = customAiClient;
    } else {
      const key = apiKey || process.env.GEMINI_API_KEY;
      if (key) {
        this.ai = new GoogleGenAI({
          apiKey: key,
          httpOptions: {
            headers: {
              'User-Agent': 'aistudio-build',
            },
          },
        });
      }
    }
  }

  public isConfigured(): boolean {
    return Boolean(this.ai);
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

  public recordSuccess(model: string): void {
    if (model === this.primaryModel) {
      if (this.circuitState === 'HALF_OPEN' || this.consecutive429Count > 0) {
        console.log(`[AI Agronomist - Gemini] Model '${this.primaryModel}' verified healthy; circuit closed.`);
      }
      this.consecutive429Count = 0;
      this.circuitState = 'CLOSED';
      this.cooldownUntilTimestamp = 0;
    }
  }

  public record429Failure(model: string): void {
    if (model === this.primaryModel) {
      this.consecutive429Count++;
      if (this.consecutive429Count >= this.circuitBreaker429Threshold || this.circuitState === 'HALF_OPEN') {
        this.circuitState = 'OPEN';
        this.cooldownUntilTimestamp = Date.now() + this.circuitBreakerCooldownMs;
        console.warn(
          `[AI Agronomist - Gemini] Model '${this.primaryModel}' 429 threshold reached (${this.consecutive429Count} failures). Cooldown active for ${this.circuitBreakerCooldownMs}ms.`
        );
      }
    }
  }

  public classifyError(error: unknown): ErrorClassification {
    return classifyGeminiError(error);
  }

  public async generateResponse(params: {
    systemInstruction: string;
    prompt: string;
    history?: ConversationTurn[];
    image?: ImageAttachment;
    context: AssistantContext;
  }): Promise<AssistantResponseMetadata> {
    if (!this.ai) {
      throw new Error('Gemini client is not initialized or GEMINI_API_KEY is missing');
    }

    const { systemInstruction, prompt, history = [], image, context } = params;

    // Structured contents
    const contents: Array<{
      role: 'user' | 'model';
      parts: Array<{ text?: string; inlineData?: { mimeType: string; data: string } }>;
    }> = [];

    const recentHistory = history.slice(-8);
    for (const turn of recentHistory) {
      contents.push({
        role: turn.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: turn.content }],
      });
    }

    const currentParts: Array<{ text?: string; inlineData?: { mimeType: string; data: string } }> = [];
    if (image?.inlineData?.data) {
      currentParts.push({
        inlineData: {
          mimeType: image.inlineData.mimeType,
          data: image.inlineData.data,
        },
      });
    }
    currentParts.push({ text: prompt });

    contents.push({
      role: 'user',
      parts: currentParts,
    });

    const structuredResponseSchema = {
      type: Type.OBJECT,
      properties: {
        answer: {
          type: Type.STRING,
          description:
            'The natural language, farmer-friendly answer formatted with clean markdown, bullet points, and practical steps in the requested language.',
        },
        language: {
          type: Type.STRING,
          description: 'ISO code of language used (en, te, hi, ta).',
        },
        category: {
          type: Type.STRING,
          description:
            'Primary topic: crop_management, pest_disease, soil_nutrients, irrigation, weather_risk, organic_farming, market_pricing, farm2home_orders, general.',
        },
        confidence: {
          type: Type.STRING,
          description: 'Assessment confidence: high, medium, or low.',
        },
        needs_more_information: {
          type: Type.BOOLEAN,
          description:
            'True if critical details (such as crop variety, stage, soil type, or symptoms) are missing.',
        },
        follow_up_questions: {
          type: Type.ARRAY,
          items: { type: Type.STRING },
          description: 'Specific follow-up questions to ask the user to refine the agronomic advice.',
        },
        warnings: {
          type: Type.ARRAY,
          items: { type: Type.STRING },
          description: 'Any critical safety warnings (e.g. chemical handling caution, weather alert).',
        },
      },
      required: ['answer', 'language', 'category', 'confidence', 'needs_more_information'],
    };

    const inCooldown = this.isCooldownActive();
    const modelsToTry: Array<{ model: string; isFallback: boolean }> = [];

    if (inCooldown && this.fallbackModel && this.fallbackModel !== 'none') {
      console.warn(`[AI Agronomist - Gemini] Primary in cooldown; switching to ${this.fallbackModel}`);
      modelsToTry.push({ model: this.fallbackModel, isFallback: true });
    } else {
      modelsToTry.push({ model: this.primaryModel, isFallback: false });
      if (this.fallbackModel && this.fallbackModel !== 'none' && this.fallbackModel !== this.primaryModel) {
        modelsToTry.push({ model: this.fallbackModel, isFallback: true });
      }
    }

    let lastError: unknown = null;

    for (let mIdx = 0; mIdx < modelsToTry.length; mIdx++) {
      const { model, isFallback } = modelsToTry[mIdx];
      const maxRetries = this.retryDelaysMs.length;

      for (let attempt = 0; attempt <= maxRetries; attempt++) {
        try {
          if (attempt > 0) {
            console.log(
              `[AI Agronomist - Gemini] ${isFallback ? 'Fallback' : 'Primary'} model '${model}' retry attempt ${attempt}/${maxRetries}`
            );
          }

          const response = await executeWithTimeout(
            () =>
              this.ai!.models.generateContent({
                model,
                contents,
                config: {
                  systemInstruction,
                  temperature: 0.4,
                  responseMimeType: 'application/json',
                  responseSchema: structuredResponseSchema,
                },
              }),
            this.requestTimeoutMs,
            `Gemini [${model}]`
          );

          const rawText = response.text?.trim();
          if (!rawText) {
            throw new Error(`Empty response received from ${model}`);
          }

          const cleaned = cleanJsonText(rawText);
          const parsed = JSON.parse(cleaned);

          this.recordSuccess(model);

          return {
            answer: parsed.answer || cleaned,
            language: parsed.language || context.language || 'en',
            category: parsed.category || 'general',
            confidence: parsed.confidence || 'medium',
            needs_more_information: Boolean(parsed.needs_more_information),
            follow_up_questions: parsed.follow_up_questions || [],
            warnings: parsed.warnings || [],
            providerUsed: 'gemini',
            modelUsed: model,
          };
        } catch (err: unknown) {
          lastError = err;
          const classification = this.classifyError(err);

          console.warn(
            `[AI Agronomist - Gemini] ${isFallback ? 'Fallback' : 'Primary'} model '${model}' failed on attempt ${attempt + 1}: status=${classification.statusCode || classification.statusText || 'N/A'}, isTransient=${classification.isTransient}`
          );

          if (!classification.isTransient) {
            throw err;
          }

          if (!isFallback && classification.statusCode === 429) {
            this.record429Failure(model);
          }

          const canRetry = attempt < maxRetries && (!isFallback ? this.circuitState !== 'OPEN' : true);
          if (canRetry) {
            const baseDelay = this.retryDelaysMs[attempt] || 400;
            const jitter = Math.floor(Math.random() * 100);
            const waitMs = baseDelay + jitter;
            await sleep(waitMs);
          } else {
            break;
          }
        }
      }

      if (!isFallback && mIdx < modelsToTry.length - 1) {
        console.warn(`[AI Agronomist - Gemini] Primary temporarily unavailable; switching to fallback model`);
      }
    }

    throw lastError;
  }
}

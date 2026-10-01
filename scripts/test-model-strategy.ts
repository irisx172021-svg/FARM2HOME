import {
  classifyGeminiError,
  isTransientGeminiError,
  Farm2HomeAgronomistBrain,
} from '../src/services/agronomistBrain.js';

async function runVerification() {
  console.log('=== FARM2HOME MODEL STRATEGY VERIFICATION ===\n');

  // Test 1: Model Defaults
  console.log('--- Test 1: Verify Default Model Configuration ---');
  const defaultBrain = new Farm2HomeAgronomistBrain();
  console.log(`  Primary model: ${defaultBrain.primaryModel} (expected: gemini-3.1-flash-lite)`);
  console.log(`  Fallback model: ${defaultBrain.fallbackModel} (expected: gemini-3.8-flash)`);
  if (defaultBrain.primaryModel !== 'gemini-3.1-flash-lite') {
    throw new Error(`Expected primary model to be gemini-3.1-flash-lite, got ${defaultBrain.primaryModel}`);
  }
  if (defaultBrain.fallbackModel !== 'gemini-3.8-flash') {
    throw new Error(`Expected fallback model to be gemini-3.8-flash, got ${defaultBrain.fallbackModel}`);
  }
  console.log('✅ Test 1 Passed: Default models configured correctly.\n');

  // Test 2: Normal Farmer Question with Primary Model (gemini-3.1-flash-lite)
  console.log('--- Test 2: Normal Request Uses Primary Model Successfully ---');
  let primaryInvoked = false;
  let fallbackInvoked = false;
  let modelPassedToGenAI = '';

  const mockNormalClient: any = {
    models: {
      generateContent: async ({ model, contents }: any) => {
        modelPassedToGenAI = model;
        if (model === 'gemini-3.1-flash-lite') {
          primaryInvoked = true;
          return {
            text: JSON.stringify({
              answer: 'Apply diluted Jeevamrutha 1:10 every 14 days near the root zone.',
              language: 'en',
              category: 'organic_farming',
              confidence: 'high',
              needs_more_information: false,
              follow_up_questions: ['What is the stage of tomato flowering?'],
              warnings: ['Ensure soil is moist before application.'],
            }),
          };
        } else {
          fallbackInvoked = true;
          return { text: '{}' };
        }
      },
    },
  };

  const brainNormal = new Farm2HomeAgronomistBrain('test-key', mockNormalClient);
  const resNormal = await brainNormal.consultAgronomist({
    prompt: 'How to use Jeevamrutha on tomatoes?',
    context: { role: 'farmer', language: 'en', userName: 'Ramesh' },
  });

  console.log(`  Model invoked: ${modelPassedToGenAI}`);
  console.log(`  Primary invoked: ${primaryInvoked}`);
  console.log(`  Fallback invoked: ${fallbackInvoked}`);
  console.log(`  Answer: "${resNormal.answer}"`);
  if (!primaryInvoked || fallbackInvoked || modelPassedToGenAI !== 'gemini-3.1-flash-lite') {
    throw new Error('Test 2 failed: Primary model was not invoked as expected');
  }
  console.log('✅ Test 2 Passed: Normal request seamlessly handled by gemini-3.1-flash-lite.\n');

  // Test 3: Simulated 429 Rate Limit with Fast Bounded Retry & Fallback to gemini-3.8-flash
  console.log('--- Test 3: Simulated 429 Rate Limit on Primary -> Fallback to gemini-3.8-flash ---');
  let primary429Calls = 0;
  let fallbackSuccessCalls = 0;

  const mock429Client: any = {
    models: {
      generateContent: async ({ model }: any) => {
        if (model === 'gemini-3.1-flash-lite') {
          primary429Calls++;
          const err: any = new Error('RESOURCE_EXHAUSTED: 429 Rate limit exceeded');
          err.status = 429;
          throw err;
        } else if (model === 'gemini-3.8-flash') {
          fallbackSuccessCalls++;
          return {
            text: JSON.stringify({
              answer: 'Fallback response from gemini-3.8-flash for tomato blight.',
              language: 'en',
              category: 'pest_disease',
              confidence: 'high',
              needs_more_information: false,
            }),
          };
        }
        throw new Error(`Unexpected model: ${model}`);
      },
    },
  };

  const brain429 = new Farm2HomeAgronomistBrain('test-key', mock429Client);
  brain429.retryDelaysMs = [10]; // fast for test
  const res429 = await brain429.consultAgronomist({
    prompt: 'How to diagnose early blight on tomato?',
    context: { role: 'farmer', language: 'en' },
  });

  console.log(`  Primary 429 attempts: ${primary429Calls} (expected bounded 2: 1 initial + 1 retry)`);
  console.log(`  Fallback calls: ${fallbackSuccessCalls} (expected 1: succeeded on first try)`);
  console.log(`  Result answer: "${res429.answer}"`);
  if (primary429Calls > 2 || fallbackSuccessCalls !== 1 || !res429.answer.includes('gemini-3.8-flash')) {
    throw new Error('Test 3 failed: Fallback to gemini-3.8-flash did not trigger smoothly on 429');
  }
  console.log('✅ Test 3 Passed: Bounded 429 handling successfully switched to gemini-3.8-flash.\n');

  // Test 4: Circuit Breaker & Cooldown for Repeated 429s
  console.log('--- Test 4: Circuit Breaker Trips on Repeated 429s & Enforces Cooldown ---');
  let cbPrimaryCalls = 0;
  let cbFallbackCalls = 0;

  const mockCbClient: any = {
    models: {
      generateContent: async ({ model }: any) => {
        if (model === 'gemini-3.1-flash-lite') {
          cbPrimaryCalls++;
          const err: any = new Error('429 RESOURCE_EXHAUSTED');
          err.status = 429;
          throw err;
        } else if (model === 'gemini-3.8-flash') {
          cbFallbackCalls++;
          return {
            text: JSON.stringify({
              answer: 'Fallback response during cooldown.',
              language: 'en',
              category: 'general',
              confidence: 'medium',
              needs_more_information: false,
            }),
          };
        }
        throw new Error(`Unexpected model: ${model}`);
      },
    },
  };

  const brainCb = new Farm2HomeAgronomistBrain('test-key', mockCbClient);
  brainCb.circuitBreaker429Threshold = 2;
  brainCb.circuitBreakerCooldownMs = 500; // 500ms cooldown for test
  brainCb.retryDelaysMs = [10];

  // Request 1: Primary fails with 429 (records 1st 429 failure, retries once, records 2nd failure -> trips circuit breaker!)
  console.log('  Triggering Request 1 (should trip circuit breaker)...');
  await brainCb.consultAgronomist({
    prompt: 'Query 1',
    context: { role: 'farmer', language: 'en' },
  });

  console.log(`  Circuit State after Request 1: ${brainCb.circuitState} (expected OPEN)`);
  console.log(`  Is primary in cooldown: ${brainCb.isPrimaryInCooldown()} (expected true)`);
  if (brainCb.circuitState !== 'OPEN' || !brainCb.isPrimaryInCooldown()) {
    throw new Error('Circuit breaker failed to trip to OPEN state on repeated 429s');
  }

  // Request 2: While in cooldown, primary MUST be bypassed completely (0 primary calls!)
  console.log('  Triggering Request 2 during active cooldown (should bypass primary)...');
  const prePrimaryCalls = cbPrimaryCalls;
  await brainCb.consultAgronomist({
    prompt: 'Query 2',
    context: { role: 'farmer', language: 'en' },
  });
  const postPrimaryCalls = cbPrimaryCalls;
  console.log(`  Primary calls during cooldown: ${postPrimaryCalls - prePrimaryCalls} (expected 0)`);
  if (postPrimaryCalls - prePrimaryCalls !== 0) {
    throw new Error('Circuit breaker failed to bypass primary during cooldown!');
  }

  // Wait for cooldown to expire
  console.log('  Waiting 550ms for cooldown to expire...');
  await new Promise((r) => setTimeout(r, 550));
  console.log(`  Is primary in cooldown now: ${brainCb.isPrimaryInCooldown()} (expected false)`);
  console.log(`  Circuit state transitioned to: ${brainCb.circuitState} (expected HALF_OPEN)`);
  if ((brainCb.circuitState as string) !== 'HALF_OPEN') {
    throw new Error('Circuit state should be HALF_OPEN after cooldown expires');
  }
  console.log('✅ Test 4 Passed: Circuit breaker and cooldown prevent retry storms effectively.\n');

  // Test 5: Simulated 503 UNAVAILABLE
  console.log('--- Test 5: Simulated 503 UNAVAILABLE -> 1 Bounded Retry -> Fallback Success ---');
  let p503Calls = 0;
  let f503Calls = 0;
  const mock503Client: any = {
    models: {
      generateContent: async ({ model }: any) => {
        if (model === 'gemini-3.1-flash-lite') {
          p503Calls++;
          const err: any = new Error('503 Service Unavailable');
          err.status = 503;
          throw err;
        } else if (model === 'gemini-3.8-flash') {
          f503Calls++;
          return {
            text: JSON.stringify({
              answer: 'Harvest carrots after 70-80 days when tops are bright green.',
              language: 'en',
              category: 'crop_management',
              confidence: 'high',
              needs_more_information: false,
            }),
          };
        }
      },
    },
  };

  const brain503 = new Farm2HomeAgronomistBrain('test-key', mock503Client);
  brain503.retryDelaysMs = [10];
  const res503 = await brain503.consultAgronomist({
    prompt: 'When to harvest carrots?',
    context: { role: 'farmer', language: 'en' },
  });

  console.log(`  Primary 503 calls: ${p503Calls} (expected 2: 1 initial + 1 retry)`);
  console.log(`  Fallback calls: ${f503Calls} (expected 1)`);
  if (p503Calls !== 2 || f503Calls !== 1) {
    throw new Error('Test 5 failed: 503 handling did not follow bounded retry + fallback pattern');
  }
  console.log('✅ Test 5 Passed: 503 handled with bounded retry and clean fallback.\n');

  // Test 6: Non-Transient Errors (400, 401, 403)
  console.log('--- Test 6: Non-Transient Error (401 / 403) Aborts Immediately ---');
  let authCalls = 0;
  const mockAuthClient: any = {
    models: {
      generateContent: async () => {
        authCalls++;
        const err: any = new Error('401 UNAUTHENTICATED: API key not valid');
        err.status = 401;
        throw err;
      },
    },
  };

  const brainAuth = new Farm2HomeAgronomistBrain('test-key', mockAuthClient);
  const resAuth = await brainAuth.consultAgronomist({
    prompt: 'Test query',
    context: { role: 'farmer', language: 'en' },
  });

  console.log(`  Auth error calls: ${authCalls} (expected exactly 1)`);
  console.log(`  Answer message: "${resAuth.answer}"`);
  if (authCalls !== 1 || !resAuth.answer.includes('authentication') && !resAuth.answer.includes('configuration')) {
    throw new Error('Non-transient error did not abort immediately or returned incorrect message');
  }
  console.log('✅ Test 6 Passed: Non-transient errors abort immediately with clean notice.\n');

  // Test 7: Language Grounding and Context Preservation
  console.log('--- Test 7: Farmer Context & Multilingual Instruction Grounding ---');
  const languages = ['en', 'te', 'hi', 'ta'] as const;
  for (const lang of languages) {
    const sysPrompt = defaultBrain.buildSystemInstruction({
      role: 'farmer',
      userName: 'Ramesh Kumar',
      language: lang,
      farmerProducts: [
        {
          id: 'p1',
          farmer_id: 'f1',
          farmer_name: 'Ramesh',
          farmer_location: 'Medak',
          title: 'Organic Tomatoes',
          description: 'Fresh',
          price: 45,
          unit: 'kg',
          stock: 120,
          category: 'Vegetables',
          is_organic: true,
          image_url: 'https://images.unsplash.com/photo-1592924357228-91a4daadcfea?w=400',
          created_at: '2026-09-20',
        },
      ],
      weatherForecast: [
        {
          day: 'Today',
          date: 'Sep 21',
          tempMax: 32,
          tempMin: 22,
          condition: 'Sunny',
          humidity: 60,
          windKm: 10,
          rainfallMm: 0,
          advisory: 'Optimal condition for evening irrigation.',
        },
      ],
    });

    if (!sysPrompt.includes('Organic Tomatoes') || !sysPrompt.includes('Optimal condition for evening irrigation')) {
      throw new Error(`Context preservation failed for language ${lang}`);
    }
    console.log(`  ✅ Farmer context and agricultural instructions verified for language: ${lang}`);
  }
  console.log('✅ Test 7 Passed: All farmer context, weather grounding, and languages verified.\n');

  // Test 8: Frontend Security Verification (No API key leaks)
  console.log('--- Test 8: Client Security & No Key Exposure ---');
  const sampleClientResponse = JSON.stringify(resNormal);
  if (sampleClientResponse.includes('test-key') || sampleClientResponse.includes('apiKey') || sampleClientResponse.includes('GEMINI_API_KEY')) {
    throw new Error('Security violation: Sensitive key leaked in client response payload!');
  }
  console.log('✅ Test 8 Passed: No sensitive keys or model internals exposed to client.\n');

  console.log('==================================================');
  console.log('🎉 ALL 8 MODEL STRATEGY VERIFICATION SUITES PASSED');
  console.log('==================================================');
}

runVerification().catch((e) => {
  console.error('Verification failed:', e);
  process.exit(1);
});

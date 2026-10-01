import { Farm2HomeAgronomistBrain, classifyGroqError, classifyGeminiError } from '../src/services/agronomistBrain.js';
import { AssistantContext } from '../src/services/ai/types.js';

async function runGroqTests() {
  console.log('================================================================');
  console.log('🌾 Farm2Home AI Agronomist - GroqCloud Primary Strategy Tests');
  console.log('================================================================\n');

  // Test 1: Error Classification for Groq
  console.log('--- Test 1: Groq Error Classification ---');
  const groq429 = classifyGroqError({ status: 429, message: 'Rate limit exceeded' });
  const groq503 = classifyGroqError({ status: 503, message: 'Service Unavailable' });
  const groqTimeout = classifyGroqError(new Error('APIConnectionTimeoutError: Request timed out'));
  const groq401 = classifyGroqError({ status: 401, message: 'Invalid API Key provided' });

  if (!groq429.isTransient || groq429.statusCode !== 429) {
    throw new Error(`Test 1 Failed: Expected groq429 to be transient, got ${JSON.stringify(groq429)}`);
  }
  if (!groq503.isTransient || groq503.statusCode !== 503) {
    throw new Error(`Test 1 Failed: Expected groq503 to be transient, got ${JSON.stringify(groq503)}`);
  }
  if (!groqTimeout.isTransient || groqTimeout.statusCode !== 504) {
    throw new Error(`Test 1 Failed: Expected timeout to be transient 504, got ${JSON.stringify(groqTimeout)}`);
  }
  if (groq401.isTransient || groq401.statusCode !== 401) {
    throw new Error(`Test 1 Failed: Expected groq401 to be non-transient, got ${JSON.stringify(groq401)}`);
  }
  console.log('✅ Test 1 Passed: Groq error classification accurately handles 429/503/timeout/401.\n');

  // Test 2: Groq as Primary Provider (Normal Operation)
  console.log('--- Test 2: Groq as Primary Provider (Normal Execution) ---');
  let groqCalled = false;
  let geminiCalled = false;

  const mockGroqClient: any = {
    chat: {
      completions: {
        create: async (params: any) => {
          groqCalled = true;
          return {
            choices: [
              {
                message: {
                  content: JSON.stringify({
                    answer: 'Use drip irrigation at 4 liters per hour for tomatoes to maintain optimal root zone moisture.',
                    language: 'en',
                    category: 'irrigation',
                    confidence: 'high',
                    needs_more_information: false,
                    follow_up_questions: ['What is your current soil type?'],
                    warnings: [],
                  }),
                },
              },
            ],
          };
        },
      },
    },
  };

  const mockGeminiClient: any = {
    models: {
      generateContent: async () => {
        geminiCalled = true;
        return { text: '{}' };
      },
    },
  };

  const brain = new Farm2HomeAgronomistBrain({
    groqClient: mockGroqClient,
    geminiClient: mockGeminiClient,
  });

  const testContext: AssistantContext = {
    role: 'farmer',
    userName: 'Ramesh Patel',
    language: 'en',
    farmerProducts: [
      {
        id: 'p1',
        farmer_id: 'f1',
        farmer_name: 'Ramesh Patel',
        title: 'Organic Tomatoes',
        description: 'Vine-ripened red tomatoes',
        price: 45,
        unit: 'kg',
        stock: 150,
        category: 'Vegetables',
        is_organic: true,
        image_url: 'https://example.com/tomato.jpg',
        created_at: '2026-09-20',
      },
    ],
    farmerOrders: [
      {
        id: 'ORD-9812',
        customer_id: 'c1',
        customer_name: 'Ananya Roy',
        farmer_id: 'f1',
        farmer_name: 'Ramesh Patel',
        delivery_partner_id: null,
        items: [{ product_id: 'p1', title: 'Organic Tomatoes', price: 45, quantity: 10, unit: 'kg', image_url: 'https://example.com/tomato.jpg' }],
        total_amount: 450,
        delivery_address: 'Gachibowli, Hyderabad',
        status: 'pending',
        otp_code: '482910',
        created_at: '2026-09-21',
      },
    ],
    weatherForecast: [
      {
        day: 'Today',
        date: 'Sep 21',
        tempMin: 22,
        tempMax: 33,
        condition: 'Humid & Partly Cloudy',
        humidity: 78,
        windKm: 14,
        rainfallMm: 5,
        advisory: 'High humidity detected. Watch for early blight on tomato leaves.',
      },
    ],
  };

  const res1 = await brain.consultAgronomist({
    prompt: 'How should I irrigate my tomatoes given today humidity?',
    context: testContext,
  });

  if (!groqCalled) throw new Error('Test 2 Failed: Groq was not invoked!');
  if (geminiCalled) throw new Error('Test 2 Failed: Gemini should NOT be invoked when Groq succeeds!');
  if (res1.providerUsed !== 'groq') throw new Error(`Test 2 Failed: providerUsed should be groq, got ${res1.providerUsed}`);
  if (!res1.answer.includes('drip irrigation')) throw new Error('Test 2 Failed: Answer content mismatch');
  console.log(`  Provider used: ${res1.providerUsed}`);
  console.log(`  Model used: ${res1.modelUsed}`);
  console.log(`  Answer preview: ${res1.answer}`);
  console.log('✅ Test 2 Passed: Groq successfully served as the PRIMARY provider.\n');

  // Test 3: Multilingual Support (Telugu, Hindi, Tamil) & Context Preservation
  console.log('--- Test 3: Multilingual Support (Telugu, Hindi, Tamil) & Context Grounding ---');
  const languages = [
    { code: 'te' as const, name: 'Telugu', expectedSnippet: 'టమాట' },
    { code: 'hi' as const, name: 'Hindi', expectedSnippet: 'टमाटर' },
    { code: 'ta' as const, name: 'Tamil', expectedSnippet: 'தக்காளி' },
  ];

  for (const lang of languages) {
    let capturedSystemPrompt = '';
    const mockMultiGroq: any = {
      chat: {
        completions: {
          create: async (params: any) => {
            capturedSystemPrompt = params.messages[0].content;
            return {
              choices: [
                {
                  message: {
                    content: JSON.stringify({
                      answer: `మొక్కల సంరక్షణ సలహా (${lang.name}): ${lang.expectedSnippet}`,
                      language: lang.code,
                      category: 'crop_management',
                      confidence: 'high',
                      needs_more_information: false,
                    }),
                  },
                },
              ],
            };
          },
        },
      },
    };

    const multiBrain = new Farm2HomeAgronomistBrain({ groqClient: mockMultiGroq });
    const multiRes = await multiBrain.consultAgronomist({
      prompt: 'Crop advice',
      context: { ...testContext, language: lang.code },
    });

    if (!capturedSystemPrompt.includes('Organic Tomatoes')) {
      throw new Error(`Test 3 Failed: Farmer products context missing for ${lang.name}!`);
    }
    if (!capturedSystemPrompt.includes('ORD-9812')) {
      throw new Error(`Test 3 Failed: Farmer orders context missing for ${lang.name}!`);
    }
    if (!capturedSystemPrompt.includes('High humidity detected')) {
      throw new Error(`Test 3 Failed: Weather advisory missing for ${lang.name}!`);
    }
    console.log(`  Language ${lang.name} (${lang.code}): Context verified & response received (${multiRes.language})`);
  }
  console.log('✅ Test 3 Passed: Multilingual support and database context fully preserved.\n');

  // Test 4: Multi-Turn Conversation Memory
  console.log('--- Test 4: Multi-Turn Conversation Memory ---');
  let capturedMessages: any[] = [];
  const mockMemoryGroq: any = {
    chat: {
      completions: {
        create: async (params: any) => {
          capturedMessages = params.messages;
          return {
            choices: [
              {
                message: {
                  content: JSON.stringify({
                    answer: 'Organic neem oil spray is recommended for aphids at 5ml per liter.',
                    language: 'en',
                    category: 'pest_disease',
                    confidence: 'high',
                    needs_more_information: false,
                  }),
                },
              },
            ],
          };
        },
      },
    },
  };

  const memoryBrain = new Farm2HomeAgronomistBrain({ groqClient: mockMemoryGroq });
  await memoryBrain.consultAgronomist({
    prompt: 'What spray should I use?',
    context: testContext,
    history: [
      { role: 'user', content: 'My tomato leaves have small green bugs.' },
      { role: 'assistant', content: 'Those appear to be aphids.' },
    ],
  });

  // Verify history turns were passed into Groq chat completion messages
  const userTurnFound = capturedMessages.some((m) => m.role === 'user' && m.content === 'My tomato leaves have small green bugs.');
  const assistantTurnFound = capturedMessages.some((m) => m.role === 'assistant' && m.content === 'Those appear to be aphids.');

  if (!userTurnFound || !assistantTurnFound) {
    throw new Error('Test 4 Failed: Multi-turn conversation history was not properly passed to Groq!');
  }
  console.log('  Multi-turn history length:', capturedMessages.length);
  console.log('✅ Test 4 Passed: Multi-turn conversation memory correctly structured for Groq.\n');

  // Test 5: Groq 429 Rate Limit -> Automatic Fallback to Gemini
  console.log('--- Test 5: Groq 429 Failure -> Bounded Retry -> Fallback to Gemini ---');
  let groqAttempts = 0;
  let geminiFallbackCalled = false;

  const mockFailingGroq: any = {
    chat: {
      completions: {
        create: async () => {
          groqAttempts++;
          const err: any = new Error('Rate limit reached for model openai/gpt-oss-120b');
          err.status = 429;
          throw err;
        },
      },
    },
  };

  const mockGeminiFallback: any = {
    models: {
      generateContent: async ({ model }: any) => {
        geminiFallbackCalled = true;
        return {
          text: JSON.stringify({
            answer: 'Tomato blight can be controlled using copper oxychloride or biological Trichoderma.',
            language: 'en',
            category: 'pest_disease',
            confidence: 'high',
            needs_more_information: false,
          }),
        };
      },
    },
  };

  const fallbackBrain = new Farm2HomeAgronomistBrain({
    groqClient: mockFailingGroq,
    geminiClient: mockGeminiFallback,
  });
  fallbackBrain.retryDelaysMs = [10]; // fast retry for test

  const fallbackRes = await fallbackBrain.consultAgronomist({
    prompt: 'How to treat tomato leaf spot?',
    context: testContext,
  });

  console.log(`  Groq attempts before failover: ${groqAttempts}`);
  console.log(`  Gemini fallback invoked: ${geminiFallbackCalled}`);
  console.log(`  Provider used in result: ${fallbackRes.providerUsed}`);

  if (groqAttempts < 2) throw new Error('Test 5 Failed: Groq did not perform bounded retry before failover');
  if (!geminiFallbackCalled) throw new Error('Test 5 Failed: Gemini fallback was not invoked!');
  if (fallbackRes.providerUsed !== 'gemini') throw new Error(`Test 5 Failed: Expected providerUsed to be gemini, got ${fallbackRes.providerUsed}`);
  console.log('✅ Test 5 Passed: Groq 429 correctly triggered bounded retry and failover to Gemini.\n');

  // Test 6: Groq 500 / 503 Internal Error -> Gemini Fallback
  console.log('--- Test 6: Groq 500/503 Failure -> Immediate Gemini Fallback ---');
  let groq503Attempts = 0;
  let gemini503Success = false;

  const mock503Groq: any = {
    chat: {
      completions: {
        create: async () => {
          groq503Attempts++;
          const err: any = new Error('503 Service Unavailable on Groq cloud');
          err.status = 503;
          throw err;
        },
      },
    },
  };

  const mock503Gemini: any = {
    models: {
      generateContent: async () => {
        gemini503Success = true;
        return {
          text: JSON.stringify({
            answer: 'Soil moisture is 65%, which is optimal for tomato fruit setting.',
            language: 'en',
            category: 'soil_nutrients',
            confidence: 'high',
            needs_more_information: false,
          }),
        };
      },
    },
  };

  const brain503 = new Farm2HomeAgronomistBrain({
    groqClient: mock503Groq,
    geminiClient: mock503Gemini,
  });
  brain503.retryDelaysMs = [10];

  const res503 = await brain503.consultAgronomist({
    prompt: 'Check soil moisture',
    context: testContext,
  });

  if (!gemini503Success || res503.providerUsed !== 'gemini') {
    throw new Error('Test 6 Failed: 503 error did not successfully fallback to Gemini');
  }
  console.log('✅ Test 6 Passed: Groq 503 error successfully fell back to Gemini.\n');

  // Test 7: Circuit Breaker on Groq 429s (Bypass Groq during Cooldown)
  console.log('--- Test 7: Groq Circuit Breaker Cooldown Prevents Retry Storms ---');
  const brainCb = new Farm2HomeAgronomistBrain({
    groqClient: mockFailingGroq,
    geminiClient: mockGeminiFallback,
  });
  brainCb.circuitBreaker429Threshold = 2;
  brainCb.circuitBreakerCooldownMs = 300; // 300ms cooldown for fast test
  brainCb.retryDelaysMs = [5];

  // First request fails Groq twice -> trips circuit to OPEN
  await brainCb.consultAgronomist({ prompt: 'Test 1', context: testContext });

  console.log(`  Circuit state after threshold: ${brainCb.groqProvider.circuitState} (expected OPEN)`);
  console.log(`  Is Groq in cooldown: ${brainCb.groqProvider.isCooldownActive()} (expected true)`);

  if (brainCb.groqProvider.circuitState !== 'OPEN') {
    throw new Error('Test 7 Failed: Circuit should be OPEN after reaching 429 threshold');
  }

  // Second request during cooldown: should BYPASS Groq immediately
  const preAttempts = groqAttempts;
  const cbRes = await brainCb.consultAgronomist({ prompt: 'Test 2', context: testContext });
  const postAttempts = groqAttempts;

  console.log(`  Groq attempts during cooldown: ${postAttempts - preAttempts} (expected 0)`);
  if (postAttempts - preAttempts !== 0) {
    throw new Error('Test 7 Failed: Groq was invoked while circuit breaker was in cooldown!');
  }
  if (cbRes.providerUsed !== 'gemini') {
    throw new Error('Test 7 Failed: Request during cooldown should be routed directly to Gemini');
  }
  console.log('✅ Test 7 Passed: Groq circuit breaker avoids retry storms and routes directly to fallback.\n');

  // Test 8: Both Providers Fail -> Safe User-Friendly Service Notice
  console.log('--- Test 8: Resilient Error Handling when Both Providers Fail ---');
  const mockFailingGemini: any = {
    models: {
      generateContent: async () => {
        const err: any = new Error('503 All models unavailable');
        err.status = 503;
        throw err;
      },
    },
  };

  const brainBothFail = new Farm2HomeAgronomistBrain({
    groqClient: mockFailingGroq,
    geminiClient: mockFailingGemini,
  });
  brainBothFail.retryDelaysMs = [5];

  const bothFailRes = await brainBothFail.consultAgronomist({
    prompt: 'Severe weather check',
    context: { ...testContext, language: 'te' },
  });

  console.log(`  Response answer: "${bothFailRes.answer}"`);
  console.log(`  Response category: ${bothFailRes.category}`);
  if (!bothFailRes.answer.includes('బిజీగా ఉంది')) {
    throw new Error('Test 8 Failed: Expected Telugu localized busy message when both fail');
  }
  if (bothFailRes.category !== 'service_notice') {
    throw new Error('Test 8 Failed: Expected category to be service_notice');
  }
  console.log('✅ Test 8 Passed: Graceful localized busy notice returned without throwing or crashing.\n');

  // Test 9: Security Check (No Secrets Leaked in Response or Code)
  console.log('--- Test 9: Security Check (No Keys Exposed) ---');
  const serialized = JSON.stringify({ res1, fallbackRes, bothFailRes });
  if (serialized.includes('AIzaSy') || serialized.includes('gsk_') || serialized.includes('fake_key')) {
    throw new Error('Test 9 Failed: Found API key pattern in assistant responses!');
  }
  console.log('✅ Test 9 Passed: Zero API key leakage in responses.\n');

  console.log('================================================================');
  console.log('🎉 ALL 9 GROQ PRIMARY & GEMINI FALLBACK TESTS PASSED!');
  console.log('================================================================\n');
}

runGroqTests().catch((err) => {
  console.error('❌ Test suite failed:', err);
  process.exit(1);
});

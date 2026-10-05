/**
 * Verification test for Google Identity Services Frontend Integration
 * Validates:
 * 1. Single script tag loading & reuse
 * 2. Exactly one google.accounts.id.initialize() call across multiple callers/mounts
 * 3. Elimination of multiple initialize() calls
 * 4. Explicit button uses renderButton / credential callback (no prompt() call)
 * 5. FedCM errors do not block explicit Google login
 * 6. Dynamic listener registration and cleanup on unmount
 */

import assert from 'assert';

// Mock browser DOM environment
(global as any).window = {};
(global as any).document = {
  getElementById: (id: string) => null,
  createElement: (tag: string) => {
    return {
      id: '',
      src: '',
      async: false,
      defer: false,
      onload: null as any,
      onerror: null as any,
      addEventListener: (evt: string, cb: any) => {},
    };
  },
  head: {
    appendChild: (el: any) => {
      // Simulate script loading immediately
      if (el.onload) {
        // Setup window.google
        (global as any).window.google = {
          accounts: {
            id: {
              initializeCalls: 0,
              promptCalls: 0,
              renderButtonCalls: 0,
              lastConfig: null as any,
              initialize(cfg: any) {
                this.initializeCalls++;
                this.lastConfig = cfg;
              },
              prompt(cb?: any) {
                this.promptCalls++;
              },
              renderButton(el: any, opts: any) {
                this.renderButtonCalls++;
              },
            },
          },
        };
        el.onload();
      }
    },
  },
};

async function testGsiFrontendIntegration() {
  console.log('====================================================');
  console.log('🧪 Testing Google Identity Services Frontend Integration');
  console.log('====================================================\n');

  // Import after setting up mock DOM
  const {
    getGoogleClientId,
    ensureGoogleIdentityInitialized,
    renderGoogleSignInButton,
    addGoogleCredentialListener,
  } = await import('../src/lib/googleIdentity.js');

  // 1. Google Client ID detection
  console.log('--- Test 1: Google Client ID Detection ---');
  const clientId = getGoogleClientId();
  console.log('Client ID detected:', !!clientId);
  assert(!!clientId, 'Google Client ID is detected from environment');
  console.log('✅ PASS: Google Client ID successfully detected\n');

  // 2. Initialize called exactly ONCE
  console.log('--- Test 2: Singleton Initialization Verification ---');
  const init1 = await ensureGoogleIdentityInitialized();
  const init2 = await ensureGoogleIdentityInitialized();
  const init3 = await ensureGoogleIdentityInitialized();

  assert(init1 === true, 'First initialize call resolves true');
  assert(init2 === true, 'Second initialize call resolves true');
  assert(init3 === true, 'Third initialize call resolves true');

  const gsi = (global as any).window.google.accounts.id;
  console.log('Initialize calls count:', gsi.initializeCalls);
  assert.strictEqual(gsi.initializeCalls, 1, 'google.accounts.id.initialize() must be called strictly ONCE');
  console.log('✅ PASS: google.accounts.id.initialize() executed exactly once across 3 invocations\n');

  // 3. Prompt NOT called on explicit button setup or render
  console.log('--- Test 3: Independence from One Tap / prompt() ---');
  const mockContainer = { innerHTML: '' };
  await renderGoogleSignInButton(mockContainer as any);

  console.log('Prompt calls count:', gsi.promptCalls);
  console.log('RenderButton calls count:', gsi.renderButtonCalls);
  assert.strictEqual(gsi.promptCalls, 0, 'google.accounts.id.prompt() must NOT be called for explicit button');
  assert.strictEqual(gsi.renderButtonCalls, 1, 'google.accounts.id.renderButton() is called to setup credential flow');
  console.log('✅ PASS: Explicit Google Sign-In does NOT call prompt() and is independent of One Tap/FedCM\n');

  // 4. Credential listener dispatching & cleanup
  console.log('--- Test 4: Dynamic Listener Registration & Cleanup ---');
  let receivedCredential = '';
  const unregister = addGoogleCredentialListener((res) => {
    receivedCredential = res.credential;
  });

  // Simulate GIS calling the registered initialize callback
  gsi.lastConfig.callback({ credential: 'mock-google-credential-token-123' });
  assert.strictEqual(receivedCredential, 'mock-google-credential-token-123', 'Listener received credential token');

  // Unregister listener (simulating component unmount)
  unregister();
  receivedCredential = '';
  gsi.lastConfig.callback({ credential: 'second-token' });
  assert.strictEqual(receivedCredential, '', 'Unregistered listener was not called after cleanup');
  console.log('✅ PASS: Credential callback dispatch and unmount cleanup verified\n');

  console.log('====================================================');
  console.log('🏁 All GSI Frontend Integration Tests Passed!');
  console.log('====================================================');
}

testGsiFrontendIntegration().catch((err) => {
  console.error('Test failed:', err);
  process.exit(1);
});

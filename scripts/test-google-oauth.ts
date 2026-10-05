import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';

const BASE_URL = 'http://localhost:3000';

const sbUrl = process.env.SUPABASE_URL!;
const sbKey = (process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY)!;
const supabase = createClient(sbUrl, sbKey);

async function runTests() {
  console.log('====================================================');
  console.log('🧪 Starting Farm2Home Google OAuth & Auth Regression Tests');
  console.log('====================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, msg: string) {
    if (condition) {
      console.log(`✅ PASS: ${msg}`);
      passed++;
    } else {
      console.error(`❌ FAIL: ${msg}`);
      failed++;
    }
  }

  // --- TEST 1: Configured Google Client ID & Token Validation ---
  console.log('--- Test 1: Configured Google OAuth Environment & Token Validation ---');
  {
    const clientId = process.env.GOOGLE_CLIENT_ID;
    const viteClientId = process.env.VITE_GOOGLE_CLIENT_ID;

    assert(
      !!clientId && !!viteClientId && clientId === viteClientId,
      'Both GOOGLE_CLIENT_ID and VITE_GOOGLE_CLIENT_ID are set and match'
    );
    assert(
      clientId?.endsWith('.apps.googleusercontent.com') === true,
      'Google Client ID format is valid (.apps.googleusercontent.com)'
    );

    // Test missing credential payload
    const resEmpty = await fetch(`${BASE_URL}/api/auth/google`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });
    const emptyData = (await resEmpty.json()) as any;
    assert(
      resEmpty.status === 400 && emptyData.error === 'Valid Google credential token is required',
      'Rejects missing credential payload with HTTP 400'
    );

    // Test invalid credential token verification with Google
    const resInvalid = await fetch(`${BASE_URL}/api/auth/google`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ credential: 'mock.invalid.google.credential.token' }),
    });
    const invalidData = (await resInvalid.json()) as any;
    assert(
      resInvalid.status === 401 && invalidData.error.includes('Google authentication token'),
      'Validates token with Google and rejects invalid token with HTTP 401'
    );
  }

  // --- TEST 3: Email/Password Authentication Regression Tests ---
  console.log('\n--- Test 3: Email/Password Auth Regression Tests ---');
  const testEmail = `test.oauth.audit.${Date.now()}@example.com`;
  const testPassword = 'SecurePassword@123';
  let emailSessionToken = '';
  let emailUserId = '';

  // 3.1 Register with email/password
  {
    const res = await fetch(`${BASE_URL}/api/auth/register-email`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: testEmail,
        password: testPassword,
        fullName: 'Audit Test User',
        role: 'customer',
      }),
    });
    const data = (await res.json()) as any;
    assert(res.status === 201 && !!data.sessionToken, 'Email registration succeeds with 201');
    emailSessionToken = data.sessionToken;
    emailUserId = data.profile.id;
  }

  // 3.2 Duplicate email registration rejection
  {
    const res = await fetch(`${BASE_URL}/api/auth/register-email`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: testEmail,
        password: testPassword,
        fullName: 'Duplicate User',
        role: 'customer',
      }),
    });
    assert(res.status === 409, 'Duplicate email registration rejected with 409 Conflict');
  }

  // 3.3 Verify /api/auth/me with session
  {
    const res = await fetch(`${BASE_URL}/api/auth/me`, {
      headers: { Authorization: `Bearer ${emailSessionToken}` },
    });
    const data = (await res.json()) as any;
    assert(
      res.status === 200 && data.user.userId === emailUserId,
      '/api/auth/me returns authenticated user profile'
    );
  }

  // 3.4 Wrong password rejection
  {
    const res = await fetch(`${BASE_URL}/api/auth/login-email`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: testEmail,
        password: 'WrongPassword!',
      }),
    });
    assert(res.status === 401, 'Wrong password rejected with 401');
  }

  // 3.5 Successful login with email/password
  {
    const res = await fetch(`${BASE_URL}/api/auth/login-email`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: testEmail,
        password: testPassword,
      }),
    });
    const data = (await res.json()) as any;
    assert(res.status === 200 && !!data.sessionToken, 'Email login succeeds with valid token');
    if (data.sessionToken) {
      emailSessionToken = data.sessionToken;
    }
  }

  // 3.6 Logout session invalidation
  {
    const resLogout = await fetch(`${BASE_URL}/api/auth/logout`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${emailSessionToken}` },
    });
    assert(resLogout.status === 200, 'Logout succeeds with 200');

    const resMe = await fetch(`${BASE_URL}/api/auth/me`, {
      headers: { Authorization: `Bearer ${emailSessionToken}` },
    });
    assert(resMe.status === 401, 'Token is invalidated after logout (HTTP 401)');
  }

  // --- CLEANUP TEST USER ---
  console.log('\n--- Cleanup Test User ---');
  if (emailUserId) {
    await supabase.from('sessions').delete().eq('user_id', emailUserId);
    await supabase.from('customer_profiles').delete().eq('user_id', emailUserId);
    await supabase.from('auth_identities').delete().eq('user_id', emailUserId);
    await supabase.from('users').delete().eq('user_id', emailUserId);
    console.log('Cleaned up test user:', emailUserId);
  }

  // --- TEST 4: Development Personas Verification ---
  console.log('\n--- Test 4: Development Personas Isolated Session Test ---');
  {
    const res = await fetch(`${BASE_URL}/api/auth/dev-login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ personaId: 'usr_ramesh_farmer' }),
    });
    const data = (await res.json()) as any;
    assert(
      res.status === 200 && data.profile.role === 'farmer' && data.profile.id === 'usr_ramesh_farmer',
      'Development persona login works and remains isolated'
    );
  }

  // --- TEST 5: Verify zero fake records in Supabase ---
  console.log('\n--- Test 5: Verify Zero Fake Records in Production Supabase Tables ---');
  {
    const { data: fakeUsers } = await supabase.from('users').select('*').like('email', '%@example.com');
    const { data: fakeIdentities } = await supabase.from('auth_identities').select('*').like('provider_user_id', '%@example.com');
    const { data: testSessions } = await supabase.from('sessions').select('*').eq('user_id', emailUserId || 'none');

    assert((fakeUsers?.length || 0) === 0, `Users table has 0 fake test records (found ${fakeUsers?.length || 0})`);
    assert((fakeIdentities?.length || 0) === 0, `Auth identities table has 0 fake test records (found ${fakeIdentities?.length || 0})`);
    assert((testSessions?.length || 0) === 0, `Sessions table has 0 leaked test sessions (found ${testSessions?.length || 0})`);
  }

  console.log(`\n====================================================`);
  console.log(`🏁 Test Summary: ${passed} passed, ${failed} failed`);
  console.log(`====================================================`);

  if (failed > 0) {
    process.exit(1);
  }
}

runTests().catch((err) => {
  console.error('Fatal error during test run:', err);
  process.exit(1);
});

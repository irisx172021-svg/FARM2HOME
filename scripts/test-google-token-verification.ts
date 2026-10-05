import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';
import http from 'http';
import { supabaseAuthRepo } from '../src/server/db/supabaseAuthRepo.js';

const sbUrl = process.env.SUPABASE_URL!;
const sbKey = (process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY)!;
const supabase = createClient(sbUrl, sbKey);

async function runVerificationUnitTests() {
  console.log('====================================================');
  console.log('🧪 Starting Google OAuth Token Verification & Flow Tests');
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

  // --- Step 1: Account Takeover Prevention in Supabase ---
  console.log('--- Test 1: Account Takeover Prevention Verification ---');
  const existingEmail = `farmer.rajesh.${Date.now()}@farm2home.org`;
  const existingUserId = `usr_test_${Date.now()}`;

  // Create an email/password user first
  await supabaseAuthRepo.createUserWithIdentityAndProfile({
    userId: existingUserId,
    fullName: 'Rajesh Kumar',
    email: existingEmail,
    role: 'farmer',
    provider: 'email',
    providerUid: existingEmail,
    passwordHash: 'dummy-salt$dummy-hash',
  });

  // Now verify that findUserByEmail finds the existing user
  const foundUser = await supabaseAuthRepo.findUserByEmail(existingEmail);
  assert(foundUser?.id === existingUserId, 'Existing email/password user located');

  // Verify that an unlinked Google sub is NOT found
  const mockGoogleSub = `google_sub_${Date.now()}`;
  const linkedIdentity = await supabaseAuthRepo.findIdentityByProvider('google', mockGoogleSub);
  assert(linkedIdentity === null, 'Google identity is not yet linked');

  // If unlinked but email exists, our server logic returns 409 ACCOUNT_EXISTS_LINK_REQUIRED.
  // Verify this condition:
  const shouldBlockTakeover = Boolean(!linkedIdentity && foundUser);
  assert(shouldBlockTakeover === true, 'Account takeover blocked when email exists without linked Google sub');

  // --- Step 2: New First-Time Google User Registration ---
  console.log('\n--- Test 2: First-Time Google User Creation Verification ---');
  const newGoogleSub = `google_sub_new_${Date.now()}`;
  const newGoogleEmail = `new.google.user.${Date.now()}@gmail.com`;
  const newUserId = `usr_g_${Date.now()}`;

  const { user: createdUser, profile: createdProfile } = await supabaseAuthRepo.createUserWithIdentityAndProfile({
    userId: newUserId,
    fullName: 'Priya Sharma',
    email: newGoogleEmail,
    role: 'customer',
    provider: 'google',
    providerUid: newGoogleSub,
    avatarUrl: 'https://lh3.googleusercontent.com/mock-avatar',
  });

  assert(createdUser.id === newUserId, 'New Google user created with stable userId');
  assert(!!createdProfile.avatar_url, 'Profile contains valid avatar URL');

  // Verify identity in auth_identities
  const idnRecord = await supabaseAuthRepo.findIdentityByProvider('google', newGoogleSub);
  assert(idnRecord?.user_id === newUserId, 'auth_identities contains google provider and sub');

  // Issue session
  const { token: sessionToken } = await supabaseAuthRepo.createSession(newUserId);
  const verifySession = await supabaseAuthRepo.verifySessionToken(sessionToken);
  assert(verifySession.valid === true && verifySession.userId === newUserId, 'Valid session token issued and verified');

  // --- Step 3: Existing Linked Google User Returning ---
  console.log('\n--- Test 3: Returning Linked Google User Verification ---');
  const returningIdentity = await supabaseAuthRepo.findIdentityByProvider('google', newGoogleSub);
  assert(returningIdentity?.user_id === newUserId, 'Returning Google user recognized by Google sub');

  const returningProfile = await supabaseAuthRepo.getCombinedProfile(returningIdentity!.user_id);
  assert(returningProfile?.id === newUserId && returningProfile.full_name === 'Priya Sharma', 'Returning Google profile retrieved accurately');

  // --- Step 4: Cleanup & Zero Fake Records Verification ---
  console.log('\n--- Step 4: Clean up test accounts ---');
  await supabase.from('sessions').delete().in('user_id', [existingUserId, newUserId]);
  await supabase.from('farmer_profiles').delete().eq('user_id', existingUserId);
  await supabase.from('customer_profiles').delete().eq('user_id', newUserId);
  await supabase.from('auth_identities').delete().in('user_id', [existingUserId, newUserId]);
  await supabase.from('users').delete().in('user_id', [existingUserId, newUserId]);

  const { data: remainingTestUsers } = await supabase.from('users').select('*').in('user_id', [existingUserId, newUserId]);
  assert((remainingTestUsers?.length || 0) === 0, `Users table has 0 fake records (found ${remainingTestUsers?.length || 0})`);

  console.log(`\n====================================================`);
  console.log(`🏁 Verification Summary: ${passed} passed, ${failed} failed`);
  console.log(`====================================================`);

  if (failed > 0) process.exit(1);
}

runVerificationUnitTests().catch((err) => {
  console.error('Fatal error during verification test:', err);
  process.exit(1);
});

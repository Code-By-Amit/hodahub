import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import { getMSG91WidgetConfig, extract10DigitMobile, formatIndianMobile } from '../src/lib/msg91.js';
import { verifyMSG91AccessToken } from '../src/lib/msg91-server.js';
import { isTokenUsed, markTokenUsed, hashAccessToken } from '../src/lib/tokenReplayGuard.js';

async function runTests() {
  console.log('====================================================');
  console.log('🧪 RUNNING COMPREHENSIVE MSG91 OTP SECURITY & VERIFY TEST SUITE');
  console.log('====================================================\n');

  let passedTests = 0;
  let totalTests = 0;

  function assert(condition, message) {
    totalTests++;
    if (condition) {
      console.log(`  ✅ PASS: ${message}`);
      passedTests++;
    } else {
      console.error(`  ❌ FAIL: ${message}`);
    }
  }

  // TEST SUITE 1: Secrets Hygiene
  console.log('--- TEST SUITE 1: Secrets Hygiene ---');
  const widgetConfig = getMSG91WidgetConfig();
  assert(Boolean(widgetConfig.widgetId), 'getMSG91WidgetConfig returns widgetId');
  assert(Boolean(widgetConfig.tokenAuth), 'getMSG91WidgetConfig returns tokenAuth');
  assert(widgetConfig.isConfigured === true, 'getMSG91WidgetConfig isConfigured is true');
  assert(!('authKey' in widgetConfig) && !('authkey' in widgetConfig), 'getMSG91WidgetConfig NEVER returns server authkey');
  assert(process.env.MSG91_AUTH_KEY && !process.env.MSG91_AUTH_KEY.startsWith('NEXT_PUBLIC_'), 'MSG91_AUTH_KEY has no NEXT_PUBLIC_ prefix (server-only)');

  // TEST SUITE 2: Negative Cases for verifyMSG91AccessToken
  console.log('\n--- TEST SUITE 2: Negative Cases ---');

  // 2.1 Empty token
  const emptyRes = await verifyMSG91AccessToken('');
  assert(emptyRes.success === false, 'Empty token is rejected');
  assert(emptyRes.error.includes('required'), 'Empty token error message is descriptive');

  // 2.2 Null/undefined token
  const nullRes = await verifyMSG91AccessToken(null);
  assert(nullRes.success === false, 'Null token is rejected');

  // 2.3 Fabricated/garbled token
  const fakeToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.fabricated_payload.signature';
  const fakeRes = await verifyMSG91AccessToken(fakeToken);
  assert(fakeRes.success === false, 'Fabricated token is rejected by MSG91');
  console.log('    MSG91 response for fabricated token:', JSON.stringify(fakeRes.raw));
  assert(fakeRes.raw?.type === 'error' || fakeRes.raw?.code === 701, 'MSG91 returned error payload');

  // TEST SUITE 3: Phone Binding & Mismatch Rejection
  console.log('\n--- TEST SUITE 3: Phone Binding & Identity Enforcement ---');

  // Simulate what MSG91 returns on successful verification: { type: "success", message: "919328084782" }
  // We test the normalization and binding logic directly
  const verifiedMobileFromMSG91 = '919328084782';
  const claimedCorrectPhone = '9328084782';
  const claimedAttackerVictimPhone = '9876543210';

  const normVerified = formatIndianMobile(extract10DigitMobile(verifiedMobileFromMSG91));
  const normCorrect = formatIndianMobile(extract10DigitMobile(claimedCorrectPhone));
  const normAttacker = formatIndianMobile(extract10DigitMobile(claimedAttackerVictimPhone));

  assert(normVerified === normCorrect, 'Correct claimed phone matches MSG91 verified identity');
  assert(normVerified !== normAttacker, 'Attacker victim phone DOES NOT match MSG91 verified identity');

  // TEST SUITE 4: Token Replay Protection
  console.log('\n--- TEST SUITE 4: Token Replay Protection ---');

  const testReplayToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.token_replay_unique_' + Date.now();
  const initiallyUsed = await isTokenUsed(testReplayToken);
  assert(initiallyUsed === false, 'New token is initially not used');

  await markTokenUsed(testReplayToken);
  const nowUsed = await isTokenUsed(testReplayToken);
  assert(nowUsed === true, 'Token is marked as used in memory and DB');

  // When verifyMSG91AccessToken is called with an already used token:
  const replayRes = await verifyMSG91AccessToken(testReplayToken);
  assert(replayRes.success === false, 'Replayed token is rejected immediately');
  assert(replayRes.error.includes('already been used'), 'Replay error message explicitly indicates token reuse');

  // TEST SUITE 5: Client-side Token Extraction Logic Simulation
  console.log('\n--- TEST SUITE 5: Client-Side Token Extraction Logic ---');

  function simulateClientTokenExtraction(response) {
    if (response && response.type === 'success') {
      if (typeof response.message === 'string' && response.message.trim()) {
        return { success: true, token: response.message.trim() };
      }
    }
    const err = (response?.type !== 'success' && typeof response?.message === 'string' && response.message.trim())
      ? response.message.trim()
      : 'Verification failed: No access token received from OTP provider.';
    return { success: false, error: err };
  }

  // 5.1 Real MSG91 verifyOtp payload
  const realWidgetPayload = { type: 'success', message: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.real_jwt_sample' };
  const extractedReal = simulateClientTokenExtraction(realWidgetPayload);
  assert(extractedReal.success === true && extractedReal.token === realWidgetPayload.message, 'Token correctly extracted from data.message when type === "success"');

  // 5.2 Widget failure payload (e.g. wrong OTP)
  const wrongOtpPayload = { type: 'error', message: 'Incorrect OTP' };
  const extractedFailure = simulateClientTokenExtraction(wrongOtpPayload);
  assert(extractedFailure.success === false && extractedFailure.error === 'Incorrect OTP', 'Failure payload stops immediately with MSG91 message');

  // 5.3 Empty message in success payload
  const emptyMsgPayload = { type: 'success', message: '' };
  const extractedEmpty = simulateClientTokenExtraction(emptyMsgPayload);
  assert(extractedEmpty.success === false, 'Empty message field stops immediately, never invents token');

  // 5.4 Unexpected shape
  const unexpectedPayload = { status: 'unknown' };
  const extractedUnexpected = simulateClientTokenExtraction(unexpectedPayload);
  assert(extractedUnexpected.success === false, 'Unexpected shape stops immediately');

  console.log('\n====================================================');
  console.log(`📊 TEST RESULTS: ${passedTests}/${totalTests} tests passed`);
  console.log('====================================================');

  if (passedTests !== totalTests) {
    process.exit(1);
  }
}

runTests().catch((err) => {
  console.error('Fatal test error:', err);
  process.exit(1);
});

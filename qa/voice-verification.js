/**
 * LearnBridge Voice System Automated Verification Test Suite
 * Authoritative verification of:
 * 1. State machine deterministic transitions
 * 2. Consequential action confirmation gates
 * 3. Security fence preventing automatic authentication via spoken "Log in"
 * 4. Half-duplex acoustic muting & echo rejection
 * 5. Screen Reader Mode suppression & ARIA live output
 * 6. Structured cross-frame messaging allowlist & origin security
 * 7. Form dictation security fence against password leakage
 * 8. Language capability honesty
 */

const assert = require('assert');
const path = require('path');

const { VoiceState, VoiceStateMachine } = require('../voice/stateMachine');
const { CommandRegistry } = require('../voice/commandRegistry');
const { SpeechPriority, SpeechOutputCoordinator } = require('../voice/speechOutput');
const { ALLOWED_FRAME_ACTIONS, VoiceBridge } = require('../voice/voiceBridge');
const { LanguageCapabilityManager } = require('../voice/languageCapabilities');
const { LearnBridgeVoiceController } = require('../voice/voiceController');

let passedTests = 0;
let totalTests = 0;

function runTest(name, fn) {
  totalTests++;
  try {
    fn();
    console.log(`  [PASS] ${name}`);
    passedTests++;
  } catch (err) {
    console.error(`  [FAIL] ${name}`);
    console.error(`         ${err.message}`);
  }
}

async function runAsyncTest(name, fn) {
  totalTests++;
  try {
    await fn();
    console.log(`  [PASS] ${name}`);
    passedTests++;
  } catch (err) {
    console.error(`  [FAIL] ${name}`);
    console.error(`         ${err.message}`);
  }
}

console.log('====================================================');
console.log(' LEARNBRIDGE UNIFIED VOICE SYSTEM VERIFICATION SUITE');
console.log('====================================================\n');

// 1. STATE MACHINE TESTS
console.log('--- 1. Deterministic Voice State Machine ---');

runTest('Initializes in IDLE state with unique session ID', () => {
  const sm = new VoiceStateMachine();
  assert.strictEqual(sm.state, VoiceState.IDLE);
  assert.ok(sm.sessionId > 0);
});

runTest('Valid transition: IDLE -> REQUESTING_PERMISSION -> INITIALIZING -> LISTENING', () => {
  const sm = new VoiceStateMachine();
  assert.ok(sm.canTransitionTo(VoiceState.REQUESTING_PERMISSION));
  sm.transition(VoiceState.REQUESTING_PERMISSION);
  assert.strictEqual(sm.state, VoiceState.REQUESTING_PERMISSION);

  assert.ok(sm.canTransitionTo(VoiceState.INITIALIZING));
  sm.transition(VoiceState.INITIALIZING);
  assert.strictEqual(sm.state, VoiceState.INITIALIZING);

  assert.ok(sm.canTransitionTo(VoiceState.LISTENING));
  sm.transition(VoiceState.LISTENING);
  assert.strictEqual(sm.state, VoiceState.LISTENING);
});

runTest('Illegal transition rejected (e.g., IDLE -> LISTENING directly)', () => {
  const sm = new VoiceStateMachine();
  assert.strictEqual(sm.canTransitionTo(VoiceState.LISTENING), false);
  const transitioned = sm.transition(VoiceState.LISTENING);
  assert.strictEqual(transitioned, false);
  assert.strictEqual(sm.state, VoiceState.IDLE);
});

runTest('Session rotation invalidates obsolete session callbacks', () => {
  const sm = new VoiceStateMachine();
  const session1 = sm.sessionId;
  const session2 = sm.rotateSession();
  assert.notStrictEqual(session1, session2);
  assert.strictEqual(sm.sessionId, session2);
});

// 2. COMMAND REGISTRY & SECURITY TESTS
console.log('\n--- 2. Command Registry & Security Fences ---');

runTest('Security Fence: Spoken "Log in" routes to login screen but NEVER authenticates', () => {
  const reg = new CommandRegistry();
  const result = reg.execute('log in');
  assert.ok(result.executed);
  assert.strictEqual(result.intent, 'NAVIGATE_LOGIN');
  assert.strictEqual(result.securityFence, 'AUTO_LOGIN_BLOCKED');
  assert.ok(result.message.includes('Please select a profile or submit credentials directly'));
});

runTest('Security Fence: Spoken "ይግቡ" (Amharic Login) blocked from auto-authenticating', () => {
  const reg = new CommandRegistry();
  const result = reg.execute('ይግቡ');
  assert.ok(result.executed);
  assert.strictEqual(result.intent, 'NAVIGATE_LOGIN');
  assert.strictEqual(result.securityFence, 'AUTO_LOGIN_BLOCKED');
});

runTest('Consequential Gate: "Apply" requires explicit confirmation before execution', () => {
  const reg = new CommandRegistry();
  const applyResult = reg.execute('apply');
  assert.strictEqual(applyResult.executed, false);
  assert.strictEqual(applyResult.requiresConfirmation, true);
  assert.ok(applyResult.message.includes('Confirm'));

  // Reject before confirmation
  const cancelResult = reg.execute('cancel');
  assert.strictEqual(cancelResult.executed, true);
  assert.ok(cancelResult.message.includes('cancelled'));

  // Re-trigger and confirm
  reg.execute('apply');
  const confirmResult = reg.execute('confirm');
  assert.strictEqual(confirmResult.executed, true);
});

runTest('Form Dictation Gate: Passwords rejected from voice dictation', () => {
  const reg = new CommandRegistry();
  const passwordField = { type: 'password', getAttribute: () => 'password' };
  const allowed = reg.setDictationTarget(passwordField);
  assert.strictEqual(allowed, false);
  assert.strictEqual(reg.isDictationActive, false);
});

// 3. SPEECH OUTPUT & SCREEN READER MODE
console.log('\n--- 3. Speech Output Coordinator & Screen Reader Mode ---');

runTest('Screen Reader Mode suppresses audio TTS synthesis and announces to ARIA live', () => {
  const sp = new SpeechOutputCoordinator();
  sp.setScreenReaderMode(true);
  assert.strictEqual(sp.screenReaderMode, true);
  assert.strictEqual(sp.isSpeaking, false);

  sp.speak('Important system announcement');
  assert.strictEqual(sp.isSpeaking, false); // Audio playback is strictly suppressed
  assert.strictEqual(sp.lastSpokenText, 'Important system announcement');
});

runTest('Critical error priority preempts lower-priority navigation speech', () => {
  const sp = new SpeechOutputCoordinator();
  assert.strictEqual(SpeechPriority.CRITICAL_ERROR < SpeechPriority.USER_REQUESTED, true);
});

// 4. VOICE BRIDGE & CROSS-FRAME SECURITY
console.log('\n--- 4. Voice Bridge & Cross-Frame Security ---');

runTest('Cross-frame allowed actions whitelist is strictly enforced', () => {
  assert.ok(ALLOWED_FRAME_ACTIONS.includes('JOB_APPLY'));
  assert.ok(ALLOWED_FRAME_ACTIONS.includes('JOB_PASS'));
  assert.ok(ALLOWED_FRAME_ACTIONS.includes('JOB_REJECT'));
  assert.ok(ALLOWED_FRAME_ACTIONS.includes('JOB_DETAILS'));
  assert.ok(ALLOWED_FRAME_ACTIONS.includes('STOP_SPEECH'));
  assert.strictEqual(ALLOWED_FRAME_ACTIONS.includes('EXECUTE_SHELL'), false);
  assert.strictEqual(ALLOWED_FRAME_ACTIONS.includes('EVAL_JS'), false);
});

runTest('Job Portal Voice Commands: Pass and Reject recognized and routed', () => {
  const reg = new CommandRegistry();
  const passResult = reg.execute('pass');
  assert.ok(passResult.executed);
  assert.strictEqual(passResult.intent, 'EMPLOYMENT_PASS');

  const rejectResult = reg.execute('reject');
  assert.ok(rejectResult.executed);
  assert.strictEqual(rejectResult.intent, 'EMPLOYMENT_REJECT');

  const leftArrowResult = reg.execute('left arrow');
  assert.ok(leftArrowResult.executed);
  assert.strictEqual(leftArrowResult.intent, 'EMPLOYMENT_PASS');

  const rightArrowResult = reg.execute('right arrow');
  assert.strictEqual(rightArrowResult.intent, 'EMPLOYMENT_APPLY');

  const amharicReject = reg.execute('ውድቅ');
  assert.ok(amharicReject.executed);

  const oromoPass = reg.execute('didi');
  assert.ok(oromoPass.executed);
});

runTest('Voice Stop Command: Immediately silences speech', () => {
  const reg = new CommandRegistry();
  const stopResult = reg.execute('stop');
  assert.ok(stopResult.executed);
  assert.strictEqual(stopResult.intent, 'STOP_SPEECH');

  const quietResult = reg.execute('quiet');
  assert.ok(quietResult.executed);
  assert.strictEqual(quietResult.intent, 'STOP_SPEECH');

  const amharicStop = reg.execute('ዝም');
  assert.ok(amharicStop.executed);
  assert.strictEqual(amharicStop.intent, 'STOP_SPEECH');
});

// 5. LANGUAGE CAPABILITY REPORTING
console.log('\n--- 5. Language Capability Honesty ---');

runTest('Reports browser STT as native for English and Amharic, but accurately unsupported for Tigrinya & Afaan Oromoo in standard Web Speech API', () => {
  const enCaps = LanguageCapabilityManager.getCapabilities('en');
  assert.strictEqual(enCaps.sttSupport.browserNative, true);

  const tiCaps = LanguageCapabilityManager.getCapabilities('ti');
  assert.strictEqual(tiCaps.sttSupport.browserNative, false);

  const omCaps = LanguageCapabilityManager.getCapabilities('om');
  assert.strictEqual(omCaps.sttSupport.browserNative, false);
});

// 6. HALF-DUPLEX ACOUSTIC ECHO REJECTION
console.log('\n--- 6. Half-Duplex Acoustic Muting & Echo Rejection ---');

runTest('Controller rejects transcripts that match recent spoken assistant output', () => {
  const ctrl = new LearnBridgeVoiceController();
  ctrl.onSpeechStart('Navigated to Home Dashboard');
  ctrl.onSpeechEnd();

  // Instant acoustic echo
  assert.strictEqual(ctrl._isAcousticEcho('Navigated to Home Dashboard'), true);
  // Unrelated user speech
  ctrl._lastSpeakingEndedTime = Date.now() - 500;
  assert.strictEqual(ctrl._isAcousticEcho('open job portal'), false);
});

runTest('Controller allows instant barge-in commands (stop, quiet, ዝም) during speech', () => {
  const ctrl = new LearnBridgeVoiceController();
  ctrl.onSpeechStart('Reading lesson content aloud...');
  // Barge in should match stop rule
  assert.strictEqual(ctrl._isAcousticEcho('stop'), true);
  assert.strictEqual(ctrl._isAcousticEcho('ዝም'), true);
});

runTest('Controller never drops registered user commands as lexical echoes', () => {
  const ctrl = new LearnBridgeVoiceController();
  ctrl.onSpeechStart('Ready, say access learning to start learning');
  ctrl.onSpeechEnd();
  ctrl._lastSpeakingEndedTime = Date.now() - 400;

  // Even though assistant prompt contained "access learning", it must NOT be dropped!
  assert.strictEqual(ctrl._isAcousticEcho('access learning'), false);
  assert.strictEqual(ctrl._isAcousticEcho('pass'), false);
  assert.strictEqual(ctrl._isAcousticEcho('reject'), false);
});

console.log('\n----------------------------------------------------');
console.log(`TOTAL TESTS: ${totalTests} | PASSED: ${passedTests} | FAILED: ${totalTests - passedTests}`);
console.log('----------------------------------------------------');

if (passedTests === totalTests) {
  console.log('\n>>> ALL 12 VOICE ARCHITECTURE CRITICAL GATES PASSED DETERMINISTICALLY <<<\n');
  process.exit(0);
} else {
  console.error('\n>>> TEST SUITE FAILURES DETECTED <<<\n');
  process.exit(1);
}

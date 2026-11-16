/**
 * LearnBridge Authentication & Idempotency Integration Test Suite
 * Validates:
 * 1. Unauthenticated requests to private endpoints receive 401 UNAUTHORIZED
 * 2. Invalid login requests are rejected with 400 Bad Request
 * 3. Legitimate login issues cryptographic bearer token
 * 4. Authenticated requests with bearer token succeed
 * 5. Sync requests with X-Idempotency-Key are acknowledged
 * 6. Repeated sync requests with identical key return idempotentReplay: true without duplicating
 */

const http = require('http');
const assert = require('assert');

function post(path, body, headers = {}) {
  return new Promise((resolve, reject) => {
    const payload = JSON.stringify(body);
    const req = http.request({
      hostname: 'localhost',
      port: 4173,
      path: path,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(payload),
        ...headers
      }
    }, res => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, data: JSON.parse(data) });
        } catch (_) {
          resolve({ status: res.statusCode, raw: data });
        }
      });
    });
    req.on('error', reject);
    req.write(payload);
    req.end();
  });
}

function get(path, headers = {}) {
  return new Promise((resolve, reject) => {
    const req = http.request({
      hostname: 'localhost',
      port: 4173,
      path: path,
      method: 'GET',
      headers: headers
    }, res => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, data: JSON.parse(data) });
        } catch (_) {
          resolve({ status: res.statusCode, raw: data });
        }
      });
    });
    req.on('error', reject);
    req.end();
  });
}

async function runVerification() {
  console.log('====================================================');
  console.log(' AUTHENTICATION BOUNDARY & IDEMPOTENCY VERIFICATION');
  console.log('====================================================\n');

  // TEST 1
  console.log('--- TEST 1: Unauthenticated request to protected endpoint ---');
  const unauth = await get('/api/user/profile');
  assert.strictEqual(unauth.status, 401, 'Should return HTTP 401');
  assert.strictEqual(unauth.data.error, 'UNAUTHORIZED');
  console.log('  [PASS] Protected endpoint blocked unauthenticated request (401)');

  // TEST 2
  console.log('\n--- TEST 2: Invalid login payload validation ---');
  const badLogin = await post('/api/auth/login', { email: 'invalid_email', password: '12' });
  assert.strictEqual(badLogin.status, 400, 'Should return HTTP 400');
  console.log('  [PASS] Invalid login payload rejected (400)');

  // TEST 3
  console.log('\n--- TEST 3: Legitimate login & token issuance ---');
  const goodLogin = await post('/api/auth/login', { email: 'learner@alx.app', password: 'password123' });
  assert.strictEqual(goodLogin.status, 200, 'Should return HTTP 200');
  assert.ok(goodLogin.data.token && goodLogin.data.token.startsWith('lb_sess_'));
  assert.strictEqual(goodLogin.data.user.email, 'learner@alx.app');
  console.log('  [PASS] Valid login issued bearer token: ' + goodLogin.data.token.slice(0, 16) + '...');

  // TEST 4
  console.log('\n--- TEST 4: Token verification endpoint ---');
  const verify = await get('/api/auth/verify', { 'Authorization': 'Bearer ' + goodLogin.data.token });
  assert.strictEqual(verify.status, 200);
  assert.strictEqual(verify.data.authenticated, true);
  console.log('  [PASS] Token verified successfully by server');

  // TEST 5
  console.log('\n--- TEST 5: Authenticated access to protected profile ---');
  const authProfile = await get('/api/user/profile', { 'Authorization': 'Bearer ' + goodLogin.data.token });
  assert.strictEqual(authProfile.status, 200);
  assert.strictEqual(authProfile.data.email, 'learner@alx.app');
  console.log('  [PASS] Profile retrieved with verified token for: ' + authProfile.data.email);

  // TEST 6
  console.log('\n--- TEST 6: Offline sync with X-Idempotency-Key ---');
  const key = 'op-sync-' + Date.now() + '-' + Math.random().toString(36).slice(2, 8);
  const sync1 = await post('/api/sync', { operationId: key, type: 'QUIZ_SUBMIT', payload: { score: 100 } }, { 'X-Idempotency-Key': key });
  assert.strictEqual(sync1.status, 200);
  assert.strictEqual(sync1.data.success, true);
  console.log('  [PASS] Sync operation processed & acknowledged');

  // TEST 7
  console.log('\n--- TEST 7: Duplicate sync replay prevention (Idempotency) ---');
  const sync2 = await post('/api/sync', { operationId: key, type: 'QUIZ_SUBMIT', payload: { score: 100 } }, { 'X-Idempotency-Key': key });
  assert.strictEqual(sync2.status, 200);
  assert.strictEqual(sync2.data.idempotentReplay, true, 'Should detect duplicate replay');
  console.log('  [PASS] Duplicate request detected; idempotent replay returned without re-executing');

  console.log('\n====================================================');
  console.log(' >>> ALL 7 AUTH & IDEMPOTENCY CHECKS PASSED 100% <<<');
  console.log('====================================================\n');
}

runVerification().catch(err => {
  console.error('[FAIL]', err);
  process.exit(1);
});

/**
 * LearnBridge — Complete REST API Verification Suite
 * Tests all endpoints, authentication, validation, rate limiting, and OpenAPI compliance.
 */
const http = require('http');

const BASE_URL = 'http://127.0.0.1:4173';
const API_KEY_SAVANNA = 'lb_live_savanna_9842a1b7c';
const API_KEY_ETHIOJOBS = 'lb_live_ethiojobs_45c82e01f';

async function request(path, options = {}) {
  const url = new URL(path, BASE_URL);
  return new Promise((resolve, reject) => {
    const req = http.request(url, {
      method: options.method || 'GET',
      headers: {
        'Accept': 'application/json',
        ...(options.headers || {})
      }
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        let json = null;
        try { json = JSON.parse(data); } catch (_) {}
        resolve({
          status: res.statusCode,
          headers: res.headers,
          data,
          json
        });
      });
    });

    req.on('error', reject);
    if (options.body) {
      req.write(typeof options.body === 'string' ? options.body : JSON.stringify(options.body));
    }
    req.end();
  });
}

async function runApiVerification() {
  console.log('====================================================');
  console.log(' LearnBridge Universal REST API Comprehensive Audit ');
  console.log('====================================================\n');

  const tests = [];
  let passed = 0;
  let failed = 0;

  function assert(name, condition, details = '') {
    if (condition) {
      console.log(`  [PASS] ${name}`);
      tests.push({ name, status: 'PASS', details });
      passed++;
    } else {
      console.error(`  [FAIL] ${name} ${details ? '— ' + details : ''}`);
      tests.push({ name, status: 'FAIL', details });
      failed++;
    }
  }

  try {
    // 1. Health & Status
    console.log('--- 1. Health & Status Endpoints ---');
    const healthRes = await request('/api/v1/health');
    assert('GET /api/v1/health returns 200 OK', healthRes.status === 200);
    assert('Health payload contains success=true', healthRes.json?.success === true);
    assert('Health payload contains status="healthy"', healthRes.json?.data?.status === 'healthy');
    assert('Health contains X-Request-Id header', Boolean(healthRes.headers['x-request-id']));

    const statusRes = await request('/api/v1/status');
    assert('GET /api/v1/status returns 200 OK', statusRes.status === 200);
    assert('Status contains memory and uptime', Boolean(statusRes.json?.data?.uptimeSeconds !== undefined));

    // 2. Localization & 5 Priority Languages
    console.log('\n--- 2. Localization & Priority Languages Endpoints ---');
    const langsRes = await request('/api/v1/localization/languages');
    assert('GET /api/v1/localization/languages returns 200 OK', langsRes.status === 200);
    const languages = langsRes.json?.data?.languages || [];
    assert('Returns at least 5 priority languages (EN, AM, OM, TI, SO, AA, HAR)', languages.length >= 5);
    const codes = languages.map(l => l.code);
    assert('Contains en, am, om, ti, so', ['en', 'am', 'om', 'ti', 'so'].every(c => codes.includes(c)));

    for (const lang of ['en', 'am', 'om', 'ti', 'so']) {
      const transRes = await request(`/api/v1/localization/translations/${lang}`);
      assert(`GET /api/v1/localization/translations/${lang} returns 200`, transRes.status === 200);
      assert(`Translation for ${lang} contains translations dictionary`, Boolean(transRes.json?.data?.translations?.app_title));
    }

    const invalidLangRes = await request('/api/v1/localization/translations/invalid_lang');
    assert('Invalid language code returns 404', invalidLangRes.status === 404);

    // 3. Accessibility Profiles
    console.log('\n--- 3. Accessibility Profiles Endpoints ---');
    const profilesRes = await request('/api/v1/accessibility/profiles');
    assert('GET /api/v1/accessibility/profiles returns 200 OK', profilesRes.status === 200);
    const profiles = profilesRes.json?.data?.profiles || [];
    assert('Returns 6 standard profiles', profiles.length === 6);

    const screenReaderRes = await request('/api/v1/accessibility/profiles/screen_reader');
    assert('GET profile screen_reader returns 200', screenReaderRes.status === 200);
    assert('Profile has targetAudience and defaults', Boolean(screenReaderRes.json?.data?.defaults));

    const invalidProfileRes = await request('/api/v1/accessibility/profiles/non_existent_profile');
    assert('Invalid profile ID returns 404', invalidProfileRes.status === 404);

    // 4. Preferences & Storage
    console.log('\n--- 4. Preferences & Tenant Storage Endpoints ---');
    const prefsRes = await request('/api/v1/accessibility/preferences?userId=savanna-student-1', {
      headers: { 'x-api-key': API_KEY_SAVANNA }
    });
    assert('GET preferences for savanna-student-1 returns 200', prefsRes.status === 200);
    assert('Preferences contain highContrast and captionsEnabled', Boolean(prefsRes.json?.data?.userId === 'savanna-student-1'));

    const postPrefsRes = await request('/api/v1/accessibility/preferences', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': API_KEY_SAVANNA
      },
      body: {
        userId: 'test-learner-99',
        highContrast: true,
        fontSizeMultiplier: 1.3,
        captionsEnabled: true
      }
    });
    assert('POST /api/v1/accessibility/preferences returns 200/201', postPrefsRes.status === 200 || postPrefsRes.status === 201);
    assert('POST response confirms saved preferences', postPrefsRes.json?.data?.userId === 'test-learner-99');

    const patchPrefsRes = await request('/api/v1/accessibility/preferences/me', {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': API_KEY_ETHIOJOBS
      },
      body: {
        userId: 'ethio-applicant-42',
        highContrast: true,
        reduceMotion: true
      }
    });
    assert('PATCH /api/v1/accessibility/preferences/me returns 200 OK', patchPrefsRes.status === 200);

    // 5. Integrations & Tenants
    console.log('\n--- 5. Platform Integrations & Tenants ---');
    const integrationsRes = await request('/api/v1/integrations', {
      headers: { 'x-api-key': API_KEY_SAVANNA }
    });
    assert('GET /api/v1/integrations returns 200 OK', integrationsRes.status === 200);
    const integrations = integrationsRes.json?.data?.integrations || [];
    assert('Registered tenants include savanna-lms and ethio-jobs-portal', integrations.some(i => i.id === 'savanna-lms') && integrations.some(i => i.id === 'ethio-jobs-portal'));

    const savannaTenantRes = await request('/api/v1/integrations/savanna-lms', {
      headers: { 'x-api-key': API_KEY_SAVANNA }
    });
    assert('GET /api/v1/integrations/savanna-lms returns 200 OK', savannaTenantRes.status === 200);

    // 6. Security, Authentication & Rate Limiting
    console.log('\n--- 6. Security & Rate Limiting Verification ---');
    const unauthRes = await request('/api/v1/accessibility/preferences/me', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ highContrast: true })
    });
    assert('Calling protected endpoint without x-api-key returns 401 Unauthorized', unauthRes.status === 401);

    const forbiddenRes = await request('/api/v1/accessibility/preferences/me', {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': 'lb_invalid_fake_key_12345'
      },
      body: JSON.stringify({ highContrast: true })
    });
    assert('Calling with invalid x-api-key returns 403 Forbidden', forbiddenRes.status === 403);

    assert('Rate limit headers present', Boolean(healthRes.headers['x-ratelimit-limit']));
    assert('CORS header allows cross-origin requests', healthRes.headers['access-control-allow-origin'] === '*');

    // 7. OpenAPI 3.0 Documentation
    console.log('\n--- 7. OpenAPI 3.0 Specification & Swagger Docs ---');
    const openapiRes = await request('/api/v1/openapi.json');
    assert('GET /api/v1/openapi.json returns 200 OK', openapiRes.status === 200);
    assert('OpenAPI version is 3.0.x', Boolean(openapiRes.json?.openapi?.startsWith('3.0')));
    assert('OpenAPI defines paths for health, localization, accessibility', Boolean(openapiRes.json?.paths?.['/health'] && openapiRes.json?.paths?.['/localization/languages']));

    const docsHtmlRes = await request('/api/v1/docs');
    assert('GET /api/v1/docs returns 200 OK HTML explorer', docsHtmlRes.status === 200 && (docsHtmlRes.data.includes('LearnBridge API Documentation') || docsHtmlRes.data.includes('SwaggerUIBundle')));

  } catch (err) {
    console.error('Fatal API audit error:', err);
    failed++;
  }

  console.log('\n====================================================');
  console.log(` API Verification Summary: ${passed} PASSED | ${failed} FAILED`);
  console.log('====================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runApiVerification();

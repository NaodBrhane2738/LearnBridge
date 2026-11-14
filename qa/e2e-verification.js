/**
 * LearnBridge — Master E2E & Multi-Browser Automated Verification Suite
 * Exercises all journeys across Chromium, Firefox, WebKit, axe-core WCAG 2.2 AA, and responsive viewports.
 */
const fs = require('fs');
const path = require('path');
const { chromium, firefox, webkit } = require('D:/LearnBridge/qa-toolkit/node_modules/@playwright/test');
const { AxeBuilder } = require('D:/LearnBridge/qa-toolkit/node_modules/@axe-core/playwright');

const BASE_URL = 'http://127.0.0.1:4173';
const EVIDENCE_DIR = path.join(__dirname, 'evidence');

if (!fs.existsSync(EVIDENCE_DIR)) {
  fs.mkdirSync(EVIDENCE_DIR, { recursive: true });
}

async function runE2EVerification() {
  console.log('====================================================');
  console.log(' LearnBridge End-to-End Multi-Browser QA & Axe Scan ');
  console.log('====================================================\n');

  const browsers = [
    { type: chromium, name: 'chromium' },
    { type: firefox, name: 'firefox' },
    { type: webkit, name: 'webkit' }
  ];

  const results = {
    timestamp: new Date().toISOString(),
    tests: [],
    axeAudits: [],
    viewports: []
  };

  let totalPassed = 0;
  let totalFailed = 0;

  function record(name, passed, details = '') {
    if (passed) {
      console.log(`  [PASS] ${name}`);
      results.tests.push({ name, status: 'PASS', details });
      totalPassed++;
    } else {
      console.error(`  [FAIL] ${name} — ${details}`);
      results.tests.push({ name, status: 'FAIL', details });
      totalFailed++;
    }
  }

  for (const { type, name: browserName } of browsers) {
    console.log(`\n>>> EXECUTING TEST MATRIX ON: ${browserName.toUpperCase()} <<<`);
    const browser = await type.launch({ headless: true });

    try {
      // ----------------------------------------------------
      // Journey 1: Landing Page Load & 6-Second Automatic Fallback
      // ----------------------------------------------------
      console.log('\n--- Journey 1: 6-Second Automatic Fallback ---');
      const context1 = await browser.newContext({ viewport: { width: 1280, height: 800 } });
      await context1.addInitScript(() => {
        try { localStorage.clear(); } catch (_) {}
      });
      const page1 = await context1.newPage();
      await page1.goto(`${BASE_URL}/index.html`);

      // Verify onboarding dialog opens
      await page1.waitForFunction(() => {
        const d = document.getElementById('onboardingDialog');
        return d && d.open;
      }, { timeout: 4000 });
      const dialogOpenInitial = await page1.evaluate(() => {
        const d = document.getElementById('onboardingDialog');
        return d ? d.open : false;
      });
      record(`[${browserName}] Onboarding dialog opens automatically on fresh load`, dialogOpenInitial);

      // Verify countdown is running
      const rawSeconds = await page1.textContent('#countdownSeconds');
      const secVal = parseInt(rawSeconds?.trim() || '0', 10);
      record(`[${browserName}] Countdown starts at 6s`, secVal >= 1 && secVal <= 6, `Timer value: ${rawSeconds}`);

      // Wait 7 seconds for automatic fallback without ANY interaction
      console.log('    Waiting 7 seconds for fallback timer to elapse without interaction...');
      await page1.waitForTimeout(7000);

      const dialogOpenAfter = await page1.evaluate(() => {
        const d = document.getElementById('onboardingDialog');
        return d ? d.open : false;
      });
      record(`[${browserName}] Dialog closed automatically after 6s`, !dialogOpenAfter);

      const isScreenReaderMode = await page1.evaluate(() => document.body.classList.contains('screen-reader-mode'));
      record(`[${browserName}] Screen reader profile automatically activated`, isScreenReaderMode);

      const ariaLiveText = await page1.textContent('#onboardingAriaLive');
      record(`[${browserName}] ARIA live announces screen reader assistance without labeling`, ariaLiveText.includes('Automatic screen reader assistance enabled'));

      await page1.screenshot({ path: path.join(EVIDENCE_DIR, `${browserName}-journey1-fallback.png`) });
      await context1.close();


      // ----------------------------------------------------
      // Journey 2: Onboarding Pause / Cancellation on User Interaction
      // ----------------------------------------------------
      console.log('\n--- Journey 2: Onboarding Cancellation on User Keypress ---');
      const context2 = await browser.newContext({ viewport: { width: 1280, height: 800 } });
      await context2.addInitScript(() => {
        try { localStorage.clear(); } catch (_) {}
      });
      const page2 = await context2.newPage();
      await page2.goto(`${BASE_URL}/index.html`);

      await page2.waitForFunction(() => {
        const d = document.getElementById('onboardingDialog');
        return d && d.open;
      }, { timeout: 4000 });

      await page2.waitForTimeout(600);
      // Send keyboard press to trigger cancellation
      await page2.keyboard.press('ArrowDown');
      await page2.waitForTimeout(300);

      const isPaused = await page2.evaluate(() => {
        const label = document.getElementById('countdownLabel');
        return label ? label.textContent.includes('paused') : false;
      });
      record(`[${browserName}] Countdown pauses immediately on user keydown`, isPaused);

      // Select Deaf / Hard of Hearing option
      await page2.locator('label:has(input[value="deaf_hard_of_hearing"])').click();
      await page2.click('#submitOnboardingBtn');
      await page2.waitForTimeout(500);

      const isCaptionsActive = await page2.getAttribute('#captionsButton', 'aria-pressed');
      record(`[${browserName}] Manual selection applies captions profile`, isCaptionsActive === 'true');

      await page2.screenshot({ path: path.join(EVIDENCE_DIR, `${browserName}-journey2-manual-selection.png`) });
      await context2.close();


      // ----------------------------------------------------
      // Journey 3: 5-Language Switching
      // ----------------------------------------------------
      console.log('\n--- Journey 3: Multilingual Support (5 Priority Languages) ---');
      const context3 = await browser.newContext({ viewport: { width: 1280, height: 800 } });
      const page3 = await context3.newPage();
      await page3.goto(`${BASE_URL}/index.html`);
      await page3.evaluate(() => localStorage.setItem('learnbridge_onboarding_done', 'true'));
      await page3.reload();

      // Test Amharic
      await page3.selectOption('#langSelect', 'am');
      await page3.waitForTimeout(600);
      const headlineAm = await page3.textContent('#heroHeadline');
      record(`[${browserName}] Switches to Amharic (አማርኛ)`, headlineAm.includes('ወሰን የለሽ'));

      // Test Afaan Oromo
      await page3.selectOption('#langSelect', 'om');
      await page3.waitForTimeout(600);
      const headlineOm = await page3.textContent('#heroHeadline');
      record(`[${browserName}] Switches to Afaan Oromo`, headlineOm.includes('Dhaqqabummaa'));

      // Test Tigrinya
      await page3.selectOption('#langSelect', 'ti');
      await page3.waitForTimeout(600);
      const headlineTi = await page3.textContent('#heroHeadline');
      record(`[${browserName}] Switches to Tigrinya (ትግርኛ)`, headlineTi.includes('ወሰን ዘይብሉ'));

      // Test Somali
      await page3.selectOption('#langSelect', 'so');
      await page3.waitForTimeout(600);
      const headlineSo = await page3.textContent('#heroHeadline');
      record(`[${browserName}] Switches to Somali (Af-Soomaali)`, headlineSo.includes('Helitaan'));

      // Return to English
      await page3.selectOption('#langSelect', 'en');
      await page3.waitForTimeout(600);
      const headlineEn = await page3.textContent('#heroHeadline');
      record(`[${browserName}] Restores English baseline`, headlineEn.includes('Accessibility Without Boundaries'));

      await page3.screenshot({ path: path.join(EVIDENCE_DIR, `${browserName}-journey3-languages.png`) });
      await context3.close();


      // ----------------------------------------------------
      // Journey 4: Live REST API Sandbox on Landing Page
      // ----------------------------------------------------
      console.log('\n--- Journey 4: Live REST API Sandbox Execution ---');
      const context4 = await browser.newContext({ viewport: { width: 1280, height: 800 } });
      const page4 = await context4.newPage();
      await page4.goto(`${BASE_URL}/index.html`);
      await page4.evaluate(() => localStorage.setItem('learnbridge_onboarding_done', 'true'));
      await page4.reload();

      // Execute Health check
      await page4.selectOption('#sandboxEndpointSelect', '/api/v1/health');
      await page4.click('#sandboxExecuteBtn');
      await page4.waitForTimeout(600);
      const resHealth = await page4.textContent('#sandboxResponsePre');
      record(`[${browserName}] Sandbox executes GET /api/v1/health successfully`, resHealth.includes('"status": "healthy"'));

      // Execute Languages check
      await page4.selectOption('#sandboxEndpointSelect', '/api/v1/localization/languages');
      await page4.click('#sandboxExecuteBtn');
      await page4.waitForTimeout(600);
      const resLangs = await page4.textContent('#sandboxResponsePre');
      record(`[${browserName}] Sandbox executes GET /api/v1/localization/languages`, resLangs.includes('"code": "am"'));

      await page4.screenshot({ path: path.join(EVIDENCE_DIR, `${browserName}-journey4-api-sandbox.png`) });
      await context4.close();


      // ----------------------------------------------------
      // Journey 5: Integration A — Savanna LMS Demo
      // ----------------------------------------------------
      console.log('\n--- Journey 5: Integration A — Savanna LMS Demo ---');
      const context5 = await browser.newContext({ viewport: { width: 1280, height: 800 } });
      const page5 = await context5.newPage();
      await page5.goto(`${BASE_URL}/integrations/savanna-lms/index.html`);

      // Verify connection to API
      await page5.waitForSelector('#inspectorPayload', { state: 'attached' });
      await page5.waitForTimeout(1000);
      const lmsPayload = await page5.textContent('#inspectorPayload');
      record(`[${browserName}] Savanna LMS loads learner profile from REST API`, lmsPayload.includes('savanna-student-1') || lmsPayload.includes('high_contrast') || lmsPayload.includes('success'));

      // Simulate profile switch to low_vision
      await page5.selectOption('#inspectorProfileSelect', 'low_vision');
      await page5.waitForTimeout(1000);
      const isLmsHighContrast = await page5.evaluate(() => document.body.classList.contains('high-contrast'));
      record(`[${browserName}] LMS dynamically applies high contrast profile from API`, isLmsHighContrast);

      // Toggle captions button
      await page5.click('#lmsCaptionsBtn');
      const isCaptionsOverlayVisible = await page5.evaluate(() => {
        const el = document.getElementById('lmsCaptions');
        return el ? !el.hidden : false;
      });
      record(`[${browserName}] LMS captions overlay toggles cleanly`, isCaptionsOverlayVisible);

      await page5.screenshot({ path: path.join(EVIDENCE_DIR, `${browserName}-journey5-savanna-lms.png`) });
      await context5.close();


      // ----------------------------------------------------
      // Journey 6: Integration B — EthioCareers Job Portal Demo
      // ----------------------------------------------------
      console.log('\n--- Journey 6: Integration B — EthioCareers Job Portal Demo ---');
      const context6 = await browser.newContext({ viewport: { width: 1280, height: 800 } });
      const page6 = await context6.newPage();
      await page6.goto(`${BASE_URL}/integrations/job-portal/index.html`);

      await page6.waitForSelector('#inspectorPayload', { state: 'attached' });
      await page6.waitForTimeout(1000);
      const jobPayload = await page6.textContent('#inspectorPayload');
      record(`[${browserName}] EthioCareers connects to LearnBridge API for applicant`, jobPayload.includes('ethio-applicant-42') || jobPayload.includes('success'));

      // Filter jobs
      await page6.click('button[data-filter="screen-reader"]');
      await page6.waitForTimeout(400);
      const hiddenCards = await page6.evaluate(() => {
        return [...document.querySelectorAll('.job-card')].filter(c => c.hidden).length;
      });
      record(`[${browserName}] EthioCareers accessibility filter functions`, hiddenCards > 0);

      // Open preferences modal & trigger PATCH
      await page6.click('#openSettingsBtn');
      await page6.waitForSelector('#settingsModal:not([hidden])');
      await page6.click('#prefHighContrast');
      await page6.click('#savePrefsBtn');
      await page6.waitForTimeout(1000);

      const jobEndpoint = await page6.textContent('#inspectorEndpoint');
      record(`[${browserName}] EthioCareers persists preference via PATCH /api/v1/accessibility/preferences/me`, jobEndpoint.includes('PATCH'));

      await page6.screenshot({ path: path.join(EVIDENCE_DIR, `${browserName}-journey6-ethio-careers.png`) });
      await context6.close();


      // ----------------------------------------------------
      // Journey 7: Axe-Core WCAG 2.2 AA Audits
      // ----------------------------------------------------
      console.log('\n--- Journey 7: axe-core WCAG 2.2 Level AA Accessibility Audits ---');
      const context7 = await browser.newContext({ viewport: { width: 1280, height: 800 } });
      const page7 = await context7.newPage();

      // Scan Landing Page
      await page7.goto(`${BASE_URL}/index.html`);
      await page7.evaluate(() => localStorage.setItem('learnbridge_onboarding_done', 'true'));
      await page7.reload();
      await page7.waitForTimeout(600);
      const axeLanding = await new AxeBuilder({ page: page7 })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
        .analyze();
      if (axeLanding.violations.length > 0) {
        console.error(`[${browserName}] Landing violations:`, JSON.stringify(axeLanding.violations.map(v => ({ id: v.id, help: v.help, nodes: v.nodes.map(n => n.target) })), null, 2));
      }
      record(`[${browserName}] Landing page has 0 WCAG 2.2 AA violations`, axeLanding.violations.length === 0, `${axeLanding.violations.length} violations found`);

      // Scan Savanna LMS
      await page7.goto(`${BASE_URL}/integrations/savanna-lms/index.html`);
      await page7.waitForTimeout(600);
      const axeLms = await new AxeBuilder({ page: page7 })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
        .analyze();
      if (axeLms.violations.length > 0) {
        console.error(`[${browserName}] Savanna LMS violations:`, JSON.stringify(axeLms.violations.map(v => ({ id: v.id, help: v.help, nodes: v.nodes.map(n => n.target) })), null, 2));
      }
      record(`[${browserName}] Savanna LMS demo has 0 WCAG 2.2 AA violations`, axeLms.violations.length === 0, `${axeLms.violations.length} violations found`);

      // Scan EthioCareers
      await page7.goto(`${BASE_URL}/integrations/job-portal/index.html`);
      await page7.waitForTimeout(600);
      const axeJob = await new AxeBuilder({ page: page7 })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
        .analyze();
      if (axeJob.violations.length > 0) {
        console.error(`[${browserName}] EthioCareers violations:`, JSON.stringify(axeJob.violations.map(v => ({ id: v.id, help: v.help, nodes: v.nodes.map(n => n.target) })), null, 2));
      }
      record(`[${browserName}] EthioCareers job portal has 0 WCAG 2.2 AA violations`, axeJob.violations.length === 0, `${axeJob.violations.length} violations found`);

      await context7.close();


      // ----------------------------------------------------
      // Journey 8: 320px Reflow Verification
      // ----------------------------------------------------
      console.log('\n--- Journey 8: 320px Reflow & Responsive Verification ---');
      const context8 = await browser.newContext({ viewport: { width: 320, height: 700 } });
      const page8 = await context8.newPage();
      await page8.goto(`${BASE_URL}/index.html`);
      await page8.evaluate(() => localStorage.setItem('learnbridge_onboarding_done', 'true'));
      await page8.reload();

      const scrollWidth = await page8.evaluate(() => document.documentElement.scrollWidth);
      const clientWidth = await page8.evaluate(() => document.documentElement.clientWidth);
      record(`[${browserName}] 320px viewport has zero horizontal scroll (Reflow 1.4.10)`, scrollWidth <= clientWidth + 1);

      await page8.screenshot({ path: path.join(EVIDENCE_DIR, `${browserName}-reflow-320px.png`) });
      await context8.close();

    } catch (err) {
      console.error(`Browser execution failure for ${browserName}:`, err);
      totalFailed++;
    } finally {
      await browser.close();
    }
  }

  console.log('\n====================================================');
  console.log(` E2E Multi-Browser Verification Summary:`);
  console.log(`   ${totalPassed} PASSED | ${totalFailed} FAILED`);
  console.log('====================================================\n');

  fs.writeFileSync(path.join(__dirname, 'e2e-summary.json'), JSON.stringify(results, null, 2));

  if (totalFailed > 0) {
    process.exit(1);
  }
}

runE2EVerification();

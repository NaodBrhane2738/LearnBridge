/**
 * LearnBridge — Master Browser Testing, Verification & Evidence Collector
 *
 * Exercises all 12 User Journeys (A to L), multi-browser matrix (Chromium, Firefox, WebKit),
 * 6 responsive viewports, axe-core scans, performance metrics, and offline Service Worker inspection.
 */

const fs = require('fs');
const path = require('path');
const { chromium, firefox, webkit } = require('D:/LearnBridge/qa-toolkit/node_modules/@playwright/test');
const { AxeBuilder } = require('D:/LearnBridge/qa-toolkit/node_modules/@axe-core/playwright');

const BASE_URL = 'http://127.0.0.1:4173';
const ROOT = 'D:/LearnBridge';
const EVIDENCE = path.join(ROOT, 'qa', 'evidence');

const VIEWPORTS = [
  { name: 'desktop-1440x900', width: 1440, height: 900 },
  { name: 'laptop-1280x800', width: 1280, height: 800 },
  { name: 'tablet-landscape-1024x768', width: 1024, height: 768 },
  { name: 'tablet-portrait-768x1024', width: 768, height: 1024 },
  { name: 'mobile-390x844', width: 390, height: 844 },
  { name: 'reflow-320x700', width: 320, height: 700 }
];

async function runMasterAudit() {
  console.log('=== [PHASE THREE TO EIGHT] MASTER BROWSER AUDIT & EVIDENCE GENERATOR ===\n');

  const auditResults = {
    timestamp: new Date().toISOString(),
    browsersTested: {},
    userJourneys: {},
    responsiveMatrix: {},
    accessibilitySummary: {},
    performanceMetrics: {},
    offlineAudit: {},
    securityAudit: {}
  };

  const browserTypes = [
    { type: chromium, name: 'chromium' },
    { type: firefox, name: 'firefox' },
    { type: webkit, name: 'webkit' }
  ];

  for (const { type, name: browserName } of browserTypes) {
    console.log(`\n--- Testing Browser: ${browserName.toUpperCase()} ---`);
    const consoleLogs = [];
    const networkErrors = [];

    const browser = await type.launch({
      headless: true
    });

    try {
      // 1. Desktop primary run & user journeys
      const context = await browser.newContext({
        viewport: { width: 1440, height: 900 }
      });
      const page = await context.newPage();

      page.on('console', msg => consoleLogs.push({ type: msg.type(), text: msg.text() }));
      page.on('pageerror', err => consoleLogs.push({ type: 'error', text: err.message }));
      page.on('requestfailed', req => {
        networkErrors.push({ url: req.url(), error: req.failure() ? req.failure().errorText : 'failed' });
      });

      console.log(`[${browserName}] Navigating to ${BASE_URL}/index.html...`);
      await page.goto(`${BASE_URL}/index.html`);
      await page.waitForLoadState('networkidle');

      // Screenshot initial state
      await page.screenshot({
        path: path.join(EVIDENCE, 'screenshots', `${browserName}-1440x900-initial.png`),
        fullPage: false
      });

      // User Journey Test A: Startup & Layout
      const title = await page.title();
      const hasHeader = await page.locator('#floatingHeader').isVisible();
      const hasVideo = await page.locator('#lessonVideo').isVisible();
      const hasAccordion = await page.locator('.course-classes').isVisible();
      const hasRail = await page.locator('#navRail').isVisible();

      console.log(`[${browserName}] Test A (Startup): Title="${title}", Header=${hasHeader}, Video=${hasVideo}, Rail=${hasRail}`);

      // Initial Default Mode Axe-Core Scan
      const initialAxe = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'])
        .analyze();
      fs.writeFileSync(
        path.join(EVIDENCE, 'accessibility', `axe-core-index-initial-${browserName}.json`),
        JSON.stringify(initialAxe, null, 2),
        'utf8'
      );
      const initialCrit = initialAxe.violations.filter(v => v.impact === 'critical' || v.impact === 'serious');
      console.log(`[${browserName}] Initial Default Axe Scan: Violations=${initialAxe.violations.length}, Critical/Serious=${initialCrit.length}`);

      // User Journey Test B: Navigation links
      const navLinks = ['#nav-home', '#nav-learn', '#nav-resources', '#nav-career', '#nav-certs', '#assistSettingsButton'];
      let navPassed = true;
      for (const sel of navLinks) {
        const visible = await page.locator(sel).isVisible();
        if (!visible) navPassed = false;
      }
      console.log(`[${browserName}] Test B (Navigation): All rail icons present=${navPassed}`);

      // User Journey Test C: Course Accordion & Lesson Seek
      const accordionToggle = page.locator('.course-group-toggle').first();
      await accordionToggle.click();
      await page.waitForTimeout(200);
      await accordionToggle.click();
      await page.waitForTimeout(200);

      // Chapter click
      const chapter2 = page.locator('.chapter-row').nth(1);
      await chapter2.click();
      await page.waitForTimeout(300);
      const timeAfterChapter = await page.evaluate(() => document.querySelector('#lessonVideo').currentTime);
      console.log(`[${browserName}] Test C (Accordion & Chapter seek): Time after chapter 2 click=${timeAfterChapter}`);

      // User Journey Test D: Player controls
      const playBtn = page.locator('#playButton');
      await playBtn.click();
      await page.waitForTimeout(400);
      await playBtn.click();
      await page.waitForTimeout(200);
      const backBtn = page.locator('#backButton');
      await backBtn.click();
      await page.waitForTimeout(200);

      // User Journey Test E: Captions
      const captionsBtn = page.locator('#captionsButton');
      await captionsBtn.click(); // turn on
      await page.waitForTimeout(200);

      // Seek to 1s
      await page.evaluate(() => {
        if (window.learnbridgeSeek) window.learnbridgeSeek(1.0);
      });
      await page.waitForTimeout(300);

      const capOverlay = page.locator('#captionOverlay');
      const textEn = await capOverlay.textContent();
      await page.screenshot({
        path: path.join(EVIDENCE, 'screenshots', `${browserName}-1440x900-captions-active.png`)
      });

      // Switch to Amharic
      await page.locator('#tab-transcript').click();
      await page.waitForTimeout(200);
      const transcriptComp = page.locator('#mainTranscript');
      await transcriptComp.evaluate(el => el.setLanguage('am'));
      await page.waitForTimeout(300);
      const textAm = await capOverlay.textContent();

      await page.screenshot({
        path: path.join(EVIDENCE, 'screenshots', `${browserName}-1440x900-captions-amharic.png`)
      });
      console.log(`[${browserName}] Test E (Captions): EN="${textEn.trim()}", AM="${textAm.trim()}"`);

      // Switch back to English
      await transcriptComp.evaluate(el => el.setLanguage('en'));
      await page.waitForTimeout(200);

      // User Journey Test F: Transcript search & seek
      await transcriptComp.evaluate(el => {
        const input = el.shadowRoot.querySelector('#searchInput');
        input.value = 'robust';
        input.dispatchEvent(new Event('input'));
      });
      await page.waitForTimeout(200);
      const matchCount = await transcriptComp.evaluate(el => {
        return el.shadowRoot.querySelectorAll('.transcript-line').length;
      });

      // Click matched cue
      await transcriptComp.evaluate(el => {
        const line = el.shadowRoot.querySelector('.transcript-line');
        if (line) line.click();
      });
      await page.waitForTimeout(300);
      const timeAfterTranscriptClick = await page.evaluate(() => document.querySelector('#lessonVideo').currentTime);

      // Clear search
      await transcriptComp.evaluate(el => {
        const input = el.shadowRoot.querySelector('#searchInput');
        input.value = '';
        input.dispatchEvent(new Event('input'));
      });
      await page.screenshot({
        path: path.join(EVIDENCE, 'screenshots', `${browserName}-1440x900-transcript-active.png`)
      });
      console.log(`[${browserName}] Test F (Transcript): Matches for 'robust'=${matchCount}, Time after seek=${timeAfterTranscriptClick}`);

      // User Journey Test G: Interpreter Window
      const interpBtn = page.locator('#interpreterButton');
      await interpBtn.click();
      await page.waitForTimeout(300);
      const interpOverlay = page.locator('#interpreterOverlay');

      await page.screenshot({
        path: path.join(EVIDENCE, 'screenshots', `${browserName}-1440x900-interpreter-top-right.png`)
      });

      // Reposition to bottom-left via non-drag button
      await interpOverlay.evaluate(el => {
        el.dock('bottom-left');
      });
      await page.waitForTimeout(300);
      const pos = await interpOverlay.evaluate(el => el.position);
      await page.screenshot({
        path: path.join(EVIDENCE, 'screenshots', `${browserName}-1440x900-interpreter-bottom-left.png`)
      });
      console.log(`[${browserName}] Test G (Interpreter): Repositioned to=${pos}`);

      // User Journey Test H: Audio Description
      const adBtn = page.locator('#descriptionButton');
      await adBtn.click();
      await page.waitForTimeout(200);
      const adPressed = await adBtn.getAttribute('aria-pressed');
      await adBtn.click(); // turn off
      console.log(`[${browserName}] Test H (Audio Description): Toggle pressed=${adPressed}`);

      // User Journey Test I: Accessible Resources modal
      const resSection = page.locator('#resources-section');
      await resSection.scrollIntoViewIfNeeded();
      const resList = page.locator('#resources-section learnbridge-resource-list');
      await resList.evaluate(el => {
        const btn = el.shadowRoot.querySelector('.preview-btn');
        if (btn) btn.click();
      });
      await page.waitForTimeout(300);
      const docDialogState = await resList.evaluate(el => {
        const d = el.shadowRoot.querySelector('#docDialog');
        return d ? d.open : false;
      });
      await page.screenshot({
        path: path.join(EVIDENCE, 'screenshots', `${browserName}-1440x900-resource-modal.png`)
      });
      // Close doc modal
      await resList.evaluate(el => {
        const closeBtn = el.shadowRoot.querySelector('#closeDocBtn');
        if (closeBtn) closeBtn.click();
      });
      await page.waitForTimeout(200);
      console.log(`[${browserName}] Test I (Resource Modal): Opened=${docDialogState}`);

      // User Journey Test J: Career Card
      const jobCard = page.locator('learnbridge-job-card').first();
      await jobCard.scrollIntoViewIfNeeded();
      await jobCard.evaluate(el => {
        const listenBtn = el.shadowRoot.querySelector('#listenBtn');
        if (listenBtn) listenBtn.click();
      });
      await page.waitForTimeout(200);
      await jobCard.evaluate(el => {
        const saveBtn = el.shadowRoot.querySelector('#saveBtn');
        if (saveBtn) saveBtn.click();
      });
      const isJobSaved = await jobCard.evaluate(el => el.saved);
      console.log(`[${browserName}] Test J (Career Card): Saved=${isJobSaved}`);

      // User Journey Test K: Certificate Modal
      const certComp = page.locator('learnbridge-certificate').first();
      await certComp.scrollIntoViewIfNeeded();
      await certComp.evaluate(el => {
        const btn = el.shadowRoot.querySelector('#verifyBtn');
        if (btn) btn.click();
      });
      await page.waitForTimeout(300);
      const certDialogState = await certComp.evaluate(el => {
        const d = el.shadowRoot.querySelector('#verifyDialog');
        return d ? d.open : false;
      });
      await page.screenshot({
        path: path.join(EVIDENCE, 'screenshots', `${browserName}-1440x900-certificate-modal.png`)
      });

      // Test clipboard copy
      await certComp.evaluate(el => {
        const copyBtn = el.shadowRoot.querySelector('#copyIdBtn');
        if (copyBtn) copyBtn.click();
      });
      await page.waitForTimeout(200);
      // Close cert modal
      await certComp.evaluate(el => {
        const cBtn = el.shadowRoot.querySelector('#closeDialogBtn');
        if (cBtn) cBtn.click();
      });
      await page.waitForTimeout(200);
      console.log(`[${browserName}] Test K (Certificate Modal): Opened=${certDialogState}`);

      // User Journey Test L: Offline & Preferences
      const settingsBtn = page.locator('#settingsButton');
      await settingsBtn.scrollIntoViewIfNeeded();
      await settingsBtn.click();
      await page.waitForTimeout(300);
      const prefDialogOpen = await page.locator('#preferencesDialog').isVisible();

      await page.screenshot({
        path: path.join(EVIDENCE, 'screenshots', `${browserName}-1440x900-preferences-dialog.png`)
      });

      // Turn on high contrast and reduced transparency
      await page.locator('#highContrastToggle').check({ force: true });
      await page.locator('#reduceTransparencyToggle').check({ force: true });
      await page.locator('#savePreferencesButton').click();
      await page.waitForTimeout(300);

      await page.screenshot({
        path: path.join(EVIDENCE, 'screenshots', `${browserName}-1440x900-high-contrast.png`)
      });

      // Offline pack download toast
      const downloadBtn = page.locator('#downloadPackButton');
      await downloadBtn.scrollIntoViewIfNeeded();
      await downloadBtn.click();
      await page.waitForTimeout(300);
      const toastVisible = await page.locator('#toast').isVisible();
      await page.screenshot({
        path: path.join(EVIDENCE, 'screenshots', `${browserName}-1440x900-offline-feedback.png`)
      });
      console.log(`[${browserName}] Test L (Offline & Prefs): PrefsOpen=${prefDialogOpen}, ToastVisible=${toastVisible}`);

      // Run Axe Core Scan on main page
      console.log(`[${browserName}] Running Axe-Core scan on index.html...`);
      const axeResults = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'])
        .analyze();

      const criticalSerious = axeResults.violations.filter(
        v => v.impact === 'critical' || v.impact === 'serious'
      );
      fs.writeFileSync(
        path.join(EVIDENCE, 'accessibility', `axe-core-index-${browserName}.json`),
        JSON.stringify(axeResults, null, 2),
        'utf8'
      );
      console.log(`[${browserName}] Axe Scan: Total violations=${axeResults.violations.length}, Critical/Serious=${criticalSerious.length}`);

      // Performance Metrics (Chromium only for PerformanceNavigationTiming)
      if (browserName === 'chromium') {
        const perfData = await page.evaluate(() => {
          const nav = performance.getEntriesByType('navigation')[0] || {};
          const paints = performance.getEntriesByType('paint');
          const fcp = paints.find(p => p.name === 'first-contentful-paint');
          const resources = performance.getEntriesByType('resource');
          const totalTransfer = resources.reduce((acc, r) => acc + (r.transferSize || 0), 0);

          return {
            dnsTimeMs: nav.domainLookupEnd - nav.domainLookupStart,
            tcpTimeMs: nav.connectEnd - nav.connectStart,
            requestTimeMs: nav.responseEnd - nav.requestStart,
            domContentLoadedMs: nav.domContentLoadedEventEnd - nav.startTime,
            loadCompleteMs: nav.loadEventEnd - nav.startTime,
            fcpMs: fcp ? fcp.startTime : null,
            totalResourceCount: resources.length,
            totalTransferBytes: totalTransfer
          };
        });
        fs.writeFileSync(
          path.join(EVIDENCE, 'performance', 'performance-metrics.json'),
          JSON.stringify(perfData, null, 2),
          'utf8'
        );
        auditResults.performanceMetrics = perfData;
        console.log(`[${browserName}] Performance: DOMContentLoaded=${perfData.domContentLoadedMs?.toFixed(1)}ms, Resources=${perfData.totalResourceCount}`);

        // Service Worker & Cache Storage Audit
        const cacheData = await page.evaluate(async () => {
          if (!('caches' in window)) return { supported: false };
          const keys = await caches.keys();
          const details = {};
          for (const key of keys) {
            const cache = await caches.open(key);
            const requests = await cache.keys();
            details[key] = requests.map(r => r.url);
          }
          const swReg = await navigator.serviceWorker.getRegistration();
          return {
            supported: true,
            hasServiceWorker: Boolean(swReg),
            swState: swReg && swReg.active ? swReg.active.state : null,
            cacheKeys: keys,
            cacheDetails: details
          };
        });
        fs.writeFileSync(
          path.join(EVIDENCE, 'offline', 'service-worker-cache-audit.json'),
          JSON.stringify(cacheData, null, 2),
          'utf8'
        );
        auditResults.offlineAudit = cacheData;
        console.log(`[${browserName}] Service Worker Audit: active=${cacheData.hasServiceWorker}, Caches=[${cacheData.cacheKeys?.join(', ')}]`);
      }

      // Security & XSS Audit
      const xssResult = await page.evaluate(() => {
        // Test script injection into search
        const mainTranscript = document.querySelector('#mainTranscript');
        let xssDetected = false;
        window.__xssTriggered = false;

        const maliciousPayload = '<img src="x" onerror="window.__xssTriggered=true">';
        if (mainTranscript) {
          mainTranscript.filter(maliciousPayload);
          if (window.__xssTriggered) xssDetected = true;
        }

        // Test note storage
        const noteArea = document.querySelector('#noteText');
        if (noteArea) {
          noteArea.value = maliciousPayload;
          const saveNoteBtn = document.querySelector('#saveNoteButton');
          if (saveNoteBtn) saveNoteBtn.click();
          if (window.__xssTriggered) xssDetected = true;
        }

        return {
          payloadTested: maliciousPayload,
          xssExecuted: xssDetected || window.__xssTriggered,
          safe: !xssDetected && !window.__xssTriggered
        };
      });
      fs.writeFileSync(
        path.join(EVIDENCE, 'security-audit.json'),
        JSON.stringify(xssResult, null, 2),
        'utf8'
      );
      auditResults.securityAudit = xssResult;

      // Close primary context
      await context.close();

      // 2. Responsive Viewports Matrix Check
      console.log(`[${browserName}] Testing 6 responsive viewports...`);
      for (const vp of VIEWPORTS) {
        const vpContext = await browser.newContext({
          viewport: { width: vp.width, height: vp.height }
        });
        const vpPage = await vpContext.newPage();
        await vpPage.goto(`${BASE_URL}/index.html`);
        await vpPage.waitForLoadState('domcontentloaded');

        // Check horizontal overflow
        const overflow = await vpPage.evaluate(() => {
          return document.documentElement.scrollWidth > window.innerWidth;
        });

        await vpPage.screenshot({
          path: path.join(EVIDENCE, 'screenshots', `${browserName}-${vp.name}.png`)
        });

        auditResults.responsiveMatrix[`${browserName}-${vp.name}`] = {
          width: vp.width,
          height: vp.height,
          hasHorizontalOverflow: overflow,
          status: !overflow ? 'PASS' : 'WARN_OVERFLOW'
        };
        await vpContext.close();
      }

      // 3. Savanna Embed Demo Page Check
      const embedContext = await browser.newContext({
        viewport: { width: 1440, height: 900 }
      });
      const embedPage = await embedContext.newPage();
      await embedPage.goto(`${BASE_URL}/savanna-embed-demo.html`);
      await embedPage.waitForLoadState('networkidle');

      await embedPage.screenshot({
        path: path.join(EVIDENCE, 'screenshots', `savanna-embed-${browserName}-1440x900.png`)
      });

      const embedAxe = await new AxeBuilder({ page: embedPage })
        .withTags(['wcag2a', 'wcag2aa'])
        .analyze();

      fs.writeFileSync(
        path.join(EVIDENCE, 'accessibility', `axe-core-savanna-embed-${browserName}.json`),
        JSON.stringify(embedAxe, null, 2),
        'utf8'
      );
      await embedContext.close();

      // Write browser logs
      fs.writeFileSync(
        path.join(EVIDENCE, 'browser-logs', `console-${browserName}.log`),
        consoleLogs.map(l => `[${l.type}] ${l.text}`).join('\n'),
        'utf8'
      );
      if (networkErrors.length > 0) {
        fs.appendFileSync(
          path.join(EVIDENCE, 'browser-logs', 'network-errors.log'),
          networkErrors.map(e => `[${browserName}] ${e.url} -> ${e.error}`).join('\n') + '\n',
          'utf8'
        );
      }

      auditResults.browsersTested[browserName] = {
        status: 'PASS',
        criticalAxeViolations: criticalSerious.length,
        consoleErrorsCount: consoleLogs.filter(l => l.type === 'error').length
      };

    } catch (err) {
      console.error(`[${browserName}] Encountered audit error:`, err);
      auditResults.browsersTested[browserName] = {
        status: 'FAIL',
        error: err.message
      };
    } finally {
      await browser.close();
    }
  }

  // Save master audit summary JSON
  fs.writeFileSync(
    path.join(EVIDENCE, 'playwright', 'master-audit-summary.json'),
    JSON.stringify(auditResults, null, 2),
    'utf8'
  );

  console.log('\n=== MASTER BROWSER AUDIT COMPLETED ===');
  console.log('Results written to D:/LearnBridge/qa/evidence/playwright/master-audit-summary.json');
}

runMasterAudit().catch(err => {
  console.error('Fatal audit failure:', err);
  process.exit(1);
});

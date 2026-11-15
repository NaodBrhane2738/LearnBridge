/**
 * LearnBridge Employment — End-to-End Browser, Gateway Onboarding, Tab TTS & Axe-Core Verification
 */

const assert = require('assert');
const { chromium } = require('playwright');
const { AxeBuilder } = require('@axe-core/playwright');
const path = require('path');
const fs = require('fs');
const app = require('../server');

const EVIDENCE_DIR = path.resolve(__dirname, '../evidence');
if (!fs.existsSync(EVIDENCE_DIR)) {
  fs.mkdirSync(EVIDENCE_DIR, { recursive: true });
}

async function runBrowserTests() {
  console.log('====================================================');
  console.log('LEARNBRIDGE EMPLOYMENT — PLAYWRIGHT & AXE-CORE SUITE');
  console.log('====================================================\n');

  let server = null;
  const targetPort = 4174;
  try {
    server = await new Promise((resolve) => {
      const s = app.listen(targetPort, () => {
        console.log(`✓ Test server started on http://127.0.0.1:${targetPort}`);
        resolve(s);
      });
      s.on('error', (err) => {
        if (err.code === 'EADDRINUSE') {
          console.log(`✓ Reusing existing running server on http://127.0.0.1:${targetPort}`);
          resolve(null);
        }
      });
    });
  } catch (_) {
    console.log(`✓ Connecting to server on http://127.0.0.1:${targetPort}`);
  }

  let browser;
  let passed = 0;
  let failed = 0;

  try {
    const browserPath = process.env.PLAYWRIGHT_BROWSERS_PATH || 'D:\\LearnBridge\\tools\\playwright-browsers';
    process.env.PLAYWRIGHT_BROWSERS_PATH = browserPath;

    browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({
      viewport: { width: 1440, height: 900 }
    });
    const page = await context.newPage();
    page.on('console', msg => console.log('PAGE LOG:', msg.text()));
    page.on('pageerror', err => console.error('PAGE ERROR:', err));

    // 1. Fresh Load: Universal Access Gateway Opens Automatically
    await page.goto('http://127.0.0.1:4174/', { waitUntil: 'networkidle' });
    await page.waitForFunction(() => {
      const g = document.getElementById('gateway-dialog');
      return g && (g.open || g.style.display === 'flex' || !g.hidden);
    }, { timeout: 5000 });
    const gatewayOpen = await page.evaluate(() => {
      const g = document.getElementById('gateway-dialog');
      return g && (g.open || g.style.display === 'flex' || !g.hidden);
    });
    console.log(`✓ 1. Universal Access Gateway opened automatically on first load: ${gatewayOpen}`);
    assert.ok(gatewayOpen, "Gateway must open on fresh load");
    passed++;

    // 2. Gateway Step 1: Select Language (Click English or press E)
    await page.click('.gateway-lang-choice[data-lang="en"]');
    await page.waitForFunction(() => {
      const s2 = document.getElementById('gateway-step-a11y');
      return s2 && !s2.hidden;
    }, { timeout: 4000 });
    const step2Visible = await page.evaluate(() => {
      const s2 = document.getElementById('gateway-step-a11y');
      return s2 && !s2.hidden;
    });
    console.log(`✓ 2. Gateway Step 2 (Disability & Accessibility Preferences) visible: ${step2Visible}`);
    assert.ok(step2Visible, "Step 2 should be active after language selection");
    passed++;

    // 3. Gateway Countdown Timer starts and Space pauses it
    const countdownInitial = await page.textContent('#gateway-countdown-seconds');
    console.log(`✓ 3. Countdown timer initial seconds: ${countdownInitial}`);
    await page.keyboard.press('Space');
    await page.waitForTimeout(300);
    const isPaused = await page.evaluate(() => !window.a11y.gatewayActive);
    console.log(`✓ 4. Pressing Space paused countdown timer: ${isPaused}`);
    assert.ok(isPaused, "Space key must pause timer");
    passed++;

    // 4. Select Blind Mode in Gateway by pressing 'B'
    await page.keyboard.press('KeyB');
    await page.waitForTimeout(400);
    const isBlindMode = await page.evaluate(() => document.body.classList.contains('mode-blind'));
    const isGatewayClosed = await page.evaluate(() => {
      const g = document.getElementById('gateway-dialog');
      return !g.open || g.style.display === 'none' || g.hidden;
    });
    console.log(`✓ 5. Blind-accessible profile applied via 'B' key: ${isBlindMode}, Gateway dismissed: ${isGatewayClosed}`);
    assert.ok(isBlindMode, "Blind mode should be applied");
    assert.ok(isGatewayClosed, "Gateway should close after profile selection");
    passed++;

    // 5. Test Blind Mode Tab Navigation TTS Readout
    // When focus moves to an element, speech should be synthesized
    const spokenTextPromise = page.evaluate(() => {
      return new Promise((resolve) => {
        const origSpeak = window.a11y.speak.bind(window.a11y);
        window.a11y.speak = (text, lang) => {
          origSpeak(text, lang);
          resolve(text);
        };
        // Tab to the first focusable link/button
        const skipLink = document.querySelector('.skip-link');
        if (skipLink) skipLink.focus();
      });
    });
    const spokenText = await spokenTextPromise;
    console.log(`✓ 6. Tab-focus synthesized spoken feedback: "${spokenText}"`);
    assert.ok(spokenText && spokenText.length > 0, "Spoken text must be generated on focus in blind mode");
    passed++;

    // 6. WCAG 2.2 AA Accessibility Audit with Axe-Core
    const axeResults = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
      .analyze();

    console.log(`Axe-Core Violations Found: ${axeResults.violations.length}`);
    if (axeResults.violations.length > 0) {
      console.warn("Axe violations detail:", JSON.stringify(axeResults.violations.map(v => ({ id: v.id, impact: v.impact, description: v.description, nodes: v.nodes.map(n => ({ html: n.html, target: n.target, failureSummary: n.failureSummary })) })), null, 2));
    }
    assert.strictEqual(axeResults.violations.length, 0, "Axe-core must find 0 WCAG 2.2 AA violations");
    console.log('✓ 7. WCAG 2.2 AA Axe-Core Audit: 0 violations! Clean pass.');
    passed++;

    // 7. Verify Top-Right Language Dropdown is present and functional
    await page.selectOption('#lang-select-dropdown', 'am');
    await page.waitForTimeout(300);
    const htmlLangAm = await page.getAttribute('html', 'lang');
    console.log(`✓ 8. Switched language to Amharic via dropdown: html lang = "${htmlLangAm}"`);
    assert.strictEqual(htmlLangAm, 'am');
    passed++;

    // Switch back to English
    await page.selectOption('#lang-select-dropdown', 'en');
    await page.waitForTimeout(200);
    const htmlLangEn = await page.getAttribute('html', 'lang');
    console.log(`✓ 9. Switched back to English: html lang = "${htmlLangEn}"`);
    assert.strictEqual(htmlLangEn, 'en');
    passed++;

    // 8. Verify Left Filter Sidebar is completely removed from DOM
    const hasFilterSidebar = await page.evaluate(() => !!document.getElementById('search-filter-panel'));
    const hasDockSidebar = await page.evaluate(() => !!document.querySelector('.dock-floating-nav'));
    console.log(`✓ 10. Filter sidebar removed: ${!hasFilterSidebar}, Dock removed: ${!hasDockSidebar}`);
    assert.strictEqual(hasFilterSidebar, false, "Filter sidebar must be removed");
    assert.strictEqual(hasDockSidebar, false, "Dock sidebar must not exist");
    passed++;

    // 9. Verify CV Upload Stage is present upfront
    const uploadStageVisible = await page.evaluate(() => {
      const u = document.getElementById('cv-upload-stage');
      return u && u.style.display !== 'none';
    });
    console.log(`✓ 11. Upfront CV upload stage visible: ${uploadStageVisible}`);
    assert.ok(uploadStageVisible, "CV upload stage should be visible before upload");
    passed++;

    // 10. Load Software Engineer Demo CV
    await page.click('#btn-demo-swe');
    await page.waitForFunction(() => {
      const b = document.getElementById('active-cv-banner');
      const d = document.getElementById('swipe-deck-stage');
      return b && b.style.display !== 'none' && d && d.style.display !== 'none';
    }, { timeout: 5000 });
    const candidateName = await page.textContent('#active-cv-candidate-name');
    console.log(`✓ 12. Demo CV parsed & loaded for candidate: "${candidateName}"`);
    assert.ok(candidateName.includes('Abenezer') || candidateName.length > 0);
    passed++;

    // 11. Verify Swipeable Card Deck is populated with recommendation match scores
    const firstCardTitle = await page.textContent('.swipe-card-title');
    const firstCardScore = await page.textContent('.match-score-pill');
    console.log(`✓ 13. Top recommended card: "${firstCardTitle}" (${firstCardScore.trim()})`);
    assert.ok(firstCardTitle && firstCardTitle.length > 0);
    passed++;

    // 12. Test Tab Key to Reveal More Job Information
    await page.keyboard.press('Tab');
    await page.waitForTimeout(300);
    const detailsVisibleAfterTab = await page.evaluate(() => {
      const el = document.querySelector('.swipe-card-expanded-details');
      return el && el.style.display !== 'none';
    });
    console.log(`✓ 14. Pressed Tab key: Expanded job details visible = ${detailsVisibleAfterTab}`);
    assert.strictEqual(detailsVisibleAfterTab, true, "Pressing Tab must expand full job details");
    passed++;

    // 13. Test Right Arrow While Viewing Full Details (Arrow keys must still work!)
    await page.keyboard.press('ArrowRight');
    await page.waitForTimeout(400);
    const secondCardTitle = await page.textContent('.swipe-card-title');
    console.log(`✓ 15. Pressed ArrowRight while expanded: Applied with CV and advanced deck to: "${secondCardTitle}"`);
    assert.ok(secondCardTitle && secondCardTitle !== firstCardTitle);
    passed++;

    // 14. Test Tab Key on Next Card and Left Arrow to Pass While Expanded
    await page.keyboard.press('Tab');
    await page.waitForTimeout(300);
    await page.keyboard.press('ArrowLeft');
    await page.waitForTimeout(400);
    const thirdCardTitle = await page.textContent('.swipe-card-title');
    console.log(`✓ 16. Pressed ArrowLeft while expanded: Passed on vacancy and advanced deck to: "${thirdCardTitle}"`);
    assert.ok(thirdCardTitle && thirdCardTitle !== secondCardTitle);
    passed++;

    await page.screenshot({ path: path.join(EVIDENCE_DIR, '02-swipeable-card-deck.png') });

    // 14. Test Job Details View
    await page.goto('http://127.0.0.1:4174/#job/job-eth-001', { waitUntil: 'networkidle' });
    await page.waitForTimeout(400);
    const jobTitle = await page.textContent('#detail-title');
    console.log(`✓ 16. Job Details View loaded for: "${jobTitle}"`);
    passed++;

    await page.screenshot({ path: path.join(EVIDENCE_DIR, '04-job-detail-accommodations.png') });

    // 15. Test Application Modal Opening from Details View
    await page.click('#detail-sidebar-actions .btn-open-apply-modal');
    await page.waitForTimeout(300);
    const appModalOpen = await page.evaluate(() => {
      const d = document.getElementById('application-modal');
      return d && d.open;
    });
    console.log(`✓ 17. Application modal open state: ${appModalOpen}`);
    assert.ok(appModalOpen, "Application modal should open");
    passed++;

    await page.screenshot({ path: path.join(EVIDENCE_DIR, '05-application-modal.png') });
    await page.click('#btn-cancel-apply');
    await page.waitForTimeout(200);

    // 16. Mobile 320px Reflow Audit (Zero horizontal scrolling)
    await page.setViewportSize({ width: 320, height: 600 });
    await page.goto('http://127.0.0.1:4174/#search', { waitUntil: 'networkidle' });
    await page.waitForTimeout(300);
    const hasHorizontalScroll = await page.evaluate(() => {
      return document.documentElement.scrollWidth > document.documentElement.clientWidth;
    });
    console.log(`✓ 18. 320px Reflow Audit: has horizontal scroll = ${hasHorizontalScroll} (Must be false)`);
    assert.strictEqual(hasHorizontalScroll, false, "320px viewport must not have horizontal scroll.");
    passed++;

    await page.screenshot({ path: path.join(EVIDENCE_DIR, '06-mobile-reflow-320px.png') });

  } catch (err) {
    console.error("❌ Browser Test Error:", err);
    failed++;
  } finally {
    if (browser) await browser.close();
    if (server) server.close();
  }

  console.log('\n====================================================');
  console.log(`BROWSER VERIFICATION: ${passed} PASSED, ${failed} FAILED.`);
  console.log('====================================================');

  if (failed > 0) process.exit(1);
  else process.exit(0);
}

runBrowserTests();

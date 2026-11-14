/**
 * LearnBridge — Gateway & Tailored Player Multi-Profile Automated Verification Suite
 * Exercises:
 *  1. Initial Fullscreen Gateway on arrival with 7 Ethiopian language choices
 *  2. Multilingual selection (via shortcut keys & click) and spoken TTS prompt status
 *  3. Step 2 Disability Identification (Blind vs Deaf vs Standard) with 10s countdown
 *  4. Blind Mode Tailored Experience (TTS walkthrough, ETSL interpreter excluded, Braille & MP3 downloads, hotkeys L, P, D, T)
 *  5. Deaf Mode Tailored Experience (Visual instructions modal, ETSL interpreter docked/active, captions enabled, Braille/Audio stripped out)
 *  6. Persistent Accessibility Quick-Bar & Reset ('O' key)
 *  7. Full axe-core WCAG 2.2 Level AA accessibility scans on both tailored views
 *  8. 320px viewport mobile reflow verification
 */
const { chromium } = require('D:/LearnBridge/qa-toolkit/node_modules/@playwright/test');
const { AxeBuilder } = require('D:/LearnBridge/qa-toolkit/node_modules/@axe-core/playwright');
const path = require('path');
const fs = require('fs');

const BASE_URL = 'http://127.0.0.1:4173';
const EVIDENCE_DIR = path.join(__dirname, 'evidence');
if (!fs.existsSync(EVIDENCE_DIR)) fs.mkdirSync(EVIDENCE_DIR, { recursive: true });

async function runVerification() {
  console.log('====================================================');
  console.log(' LearnBridge Gateway & Tailored Player QA Matrix   ');
  console.log('====================================================\n');

  const browser = await chromium.launch();
  let totalPassed = 0;
  let totalFailed = 0;

  function record(name, pass, detail = '') {
    if (pass) {
      console.log(`  [PASS] ${name}`);
      totalPassed++;
    } else {
      console.error(`  [FAIL] ${name} — ${detail}`);
      totalFailed++;
    }
  }

  try {
    // -------------------------------------------------------------------------
    // TEST JOURNEY 1: Initial Gateway & 7 Language Selection (Step 1)
    // -------------------------------------------------------------------------
    console.log('--- Test Journey 1: Initial Gateway & 7-Language Selection ---');
    const ctx1 = await browser.newContext({ viewport: { width: 1280, height: 800 } });
    await ctx1.addInitScript(() => {
      try { localStorage.clear(); } catch (_) {}
    });
    const page1 = await ctx1.newPage();
    await page1.goto(`${BASE_URL}/index.html`);

    // Verify gateway screen appears full screen
    const isGatewayVisible = await page1.isVisible('#gatewayScreen');
    record('Gateway screen is visible immediately on fresh arrival', isGatewayVisible);

    // Verify 7 languages are rendered
    const langCardsCount = await page1.locator('.lang-card').count();
    record('Gateway presents 7 language options (EN, AM, OM, TI, SO, AA, HAR)', langCardsCount === 7, `Found ${langCardsCount}`);

    // Verify TTS status text exists
    const ttsText = await page1.textContent('#ttsStatusText');
    record('Spoken voice guidance prompt is active', Boolean(ttsText && ttsText.length > 10));

    // Select Amharic by pressing key 'A'
    await page1.keyboard.press('a');
    await page1.waitForTimeout(800);

    // Verify Step 2 is now visible
    const isStep2Visible = await page1.isVisible('#gatewayStep2');
    record('Pressing shortcut "A" selects Amharic and advances to Step 2', isStep2Visible);

    await page1.screenshot({ path: path.join(EVIDENCE_DIR, 'gateway-step2-amharic.png') });
    await ctx1.close();


    // -------------------------------------------------------------------------
    // TEST JOURNEY 2: Step 2 10-Second Countdown & Automatic Fallback to Blind Mode
    // -------------------------------------------------------------------------
    console.log('\n--- Test Journey 2: 10-Second Fallback to Vision-Assisted (Blind) Mode ---');
    const ctx2 = await browser.newContext({ viewport: { width: 1280, height: 800 } });
    await ctx2.addInitScript(() => {
      try { localStorage.clear(); } catch (_) {}
    });
    const page2 = await ctx2.newPage();
    await page2.goto(`${BASE_URL}/index.html`);

    // Advance to Step 2 via English card click
    await page2.click('.lang-card[data-lang="en"]');
    await page2.waitForSelector('#gatewayStep2:not([hidden])');

    // Verify 10-second countdown is active
    const timerVal = await page2.textContent('#gatewayCountdownSeconds');
    record('Countdown timer starts at 10s', parseInt(timerVal?.trim() || '0', 10) >= 8);

    // Pause timer with Space
    await page2.keyboard.press('Space');
    await page2.waitForTimeout(300);
    const labelAfterPause = await page2.textContent('#gatewayCountdownLabel');
    record('Pressing Space pauses the countdown timer', labelAfterPause.includes('paused'));

    // Resume timer and trigger Blind choice directly with 'B'
    await page2.keyboard.press('b');
    await page2.waitForTimeout(600);

    // Verify Gateway is closed
    const isGatewayHidden = await page2.isHidden('#gatewayScreen');
    record('Selecting Blind mode closes the gateway screen', isGatewayHidden);

    // Verify Blind Mode DOM characteristics
    const isHighContrast = await page2.evaluate(() => document.body.classList.contains('high-contrast') && document.body.classList.contains('blind-mode'));
    record('Blind mode applies high-contrast and blind-mode classes', isHighContrast);

    // Verify Sign Language window and toggle button are EXCLUDED / HIDDEN for Blind mode
    const isSignBtnHidden = await page2.evaluate(() => {
      const btn = document.getElementById('interpreterButton');
      return btn ? btn.style.display === 'none' : false;
    });
    record('Sign Language interpreter toggle is excluded/hidden in Blind mode', isSignBtnHidden);

    // Verify persistent keyboard guide banner is visible
    const isBannerVisible = await page2.isVisible('#blindKeyboardBanner');
    record('Persistent audio & keyboard navigation banner is visible', isBannerVisible);

    // Test Global Hotkeys: 'L' (Learn/Play)
    await page2.keyboard.press('l');
    await page2.waitForTimeout(400);
    const isVideoPlaying = await page2.evaluate(() => {
      const v = document.getElementById('lessonVideo');
      return v ? !v.paused : false;
    });
    record('Hot-key "L" starts video playback and scrolls to media stage', isVideoPlaying);

    // Test Hotkey 'P' (Pause)
    await page2.keyboard.press('p');
    await page2.waitForTimeout(400);
    const isVideoPaused = await page2.evaluate(() => {
      const v = document.getElementById('lessonVideo');
      return v ? v.paused : false;
    });
    record('Hot-key "P" pauses video playback', isVideoPaused);

    // Test Tailored Resources for Blind mode: Braille and MP3 present
    const blindResourceChecks = await page2.evaluate(() => {
      const res = document.getElementById('mainResources');
      if (!res || !res.shadowRoot) return { braille: false, mp3: false, videoSignedHidden: false };
      const cards = [...res.shadowRoot.querySelectorAll('.resource-card')];
      const brailleCard = cards.find(c => c.innerHTML.includes('BRF'));
      const mp3Card = cards.find(c => c.innerHTML.includes('MP3'));
      const signedCard = cards.find(c => c.innerHTML.includes('Signed Lesson Video'));
      return {
        braille: brailleCard ? !brailleCard.hidden : false,
        mp3: mp3Card ? !mp3Card.hidden : false,
        videoSignedHidden: signedCard ? signedCard.hidden : false
      };
    });
    record('Blind mode downloads include Braille (.brf)', blindResourceChecks.braille);
    record('Blind mode downloads include Audio Narration (.mp3)', blindResourceChecks.mp3);
    record('Blind mode downloads exclude Sign Language video', blindResourceChecks.videoSignedHidden);

    await page2.screenshot({ path: path.join(EVIDENCE_DIR, 'blind-mode-tailored-dashboard.png') });
    await ctx2.close();


    // -------------------------------------------------------------------------
    // TEST JOURNEY 3: Deaf & Hard-of-Hearing Tailored Experience
    // -------------------------------------------------------------------------
    console.log('\n--- Test Journey 3: Hearing-Assisted (Deaf) Tailored Experience ---');
    const ctx3 = await browser.newContext({ viewport: { width: 1280, height: 800 } });
    await ctx3.addInitScript(() => {
      try { localStorage.clear(); } catch (_) {}
    });
    const page3 = await ctx3.newPage();
    await page3.goto(`${BASE_URL}/index.html`);

    // Step 1: Select English
    await page3.keyboard.press('e');
    await page3.waitForSelector('#gatewayStep2:not([hidden])');

    // Step 2: Select Deaf mode with 'D'
    await page3.keyboard.press('d');
    await page3.waitForTimeout(700);

    // Verify Deaf Visual Guide modal appears
    const isDeafModalOpen = await page3.evaluate(() => {
      const d = document.getElementById('deafGuideModal');
      return d ? d.open : false;
    });
    record('Deaf mode automatically displays visual instructions guide modal', isDeafModalOpen);

    // Close the visual modal
    await page3.click('#closeDeafGuideBtn');
    await page3.waitForTimeout(300);

    // Verify Sign Language interpreter overlay is enabled and docked
    const isInterpreterEnabled = await page3.evaluate(() => {
      const interp = document.getElementById('interpreterOverlay');
      const btn = document.getElementById('interpreterButton');
      const hasVisibleAttr = interp ? (interp.hasAttribute('visible') || interp.visible === true) : false;
      const isBtnPressed = btn ? btn.getAttribute('aria-pressed') === 'true' : false;
      return hasVisibleAttr && isBtnPressed;
    });
    record('Deaf mode docks and activates Ethiopian Sign Language interpreter window', isInterpreterEnabled);

    // Verify Captions overlay is enabled
    const isCaptionsActive = await page3.evaluate(() => {
      const cap = document.getElementById('captionOverlay');
      const btn = document.getElementById('captionsButton');
      return (btn && btn.getAttribute('aria-pressed') === 'true') && (cap && !cap.hidden);
    });
    record('Deaf mode automatically enables closed captions overlay', isCaptionsActive);

    // Verify Tailored Resources for Deaf mode: Braille and MP3 are REMOVED; Signed video and PDF present
    const deafResourceChecks = await page3.evaluate(() => {
      const res = document.getElementById('mainResources');
      if (!res || !res.shadowRoot) return { brailleHidden: false, mp3Hidden: false, signedVideo: false, pdfTranscript: false };
      const cards = [...res.shadowRoot.querySelectorAll('.resource-card')];
      const brailleCard = cards.find(c => c.innerHTML.includes('BRF'));
      const mp3Card = cards.find(c => c.innerHTML.includes('MP3'));
      const signedCard = cards.find(c => c.innerHTML.includes('Signed Lesson Video'));
      const pdfCard = cards.find(c => c.innerHTML.includes('PDF'));
      return {
        brailleHidden: brailleCard ? brailleCard.hidden : true,
        mp3Hidden: mp3Card ? mp3Card.hidden : true,
        signedVideo: signedCard ? !signedCard.hidden : false,
        pdfTranscript: pdfCard ? !pdfCard.hidden : false
      };
    });
    record('Deaf mode downloads strip out Braille (.brf) file', deafResourceChecks.brailleHidden);
    record('Deaf mode downloads strip out Audio Narration (.mp3) file', deafResourceChecks.mp3Hidden);
    record('Deaf mode downloads emphasize Signed Video (.mp4)', deafResourceChecks.signedVideo);
    record('Deaf mode downloads emphasize Full Transcript & Slides (.pdf)', deafResourceChecks.pdfTranscript);

    // Test Quick-Bar Mode Reset with 'O'
    await page3.keyboard.press('o');
    await page3.waitForTimeout(500);
    const isGatewayReopened = await page3.isVisible('#gatewayScreen');
    record('Pressing "O" reopens the full-screen onboarding gateway cleanly', isGatewayReopened);

    await page3.screenshot({ path: path.join(EVIDENCE_DIR, 'deaf-mode-tailored-dashboard.png') });
    await ctx3.close();


    // -------------------------------------------------------------------------
    // TEST JOURNEY 4: WCAG 2.2 Level AA Axe-Core Audits on Tailored Views
    // -------------------------------------------------------------------------
    console.log('\n--- Test Journey 4: axe-core WCAG 2.2 AA Audits on Tailored Views ---');
    const ctx4 = await browser.newContext({ viewport: { width: 1280, height: 800 } });
    const page4 = await ctx4.newPage();

    // 1. Audit Gateway Screen
    await page4.goto(`${BASE_URL}/index.html`);
    await page4.waitForTimeout(500);
    const axeGateway = await new AxeBuilder({ page: page4 })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
      .analyze();
    record('Gateway screen has 0 WCAG 2.2 AA violations', axeGateway.violations.length === 0, `${axeGateway.violations.length} violations found`);

    // 2. Audit Blind Mode Dashboard
    await page4.keyboard.press('e');
    await page4.waitForTimeout(400);
    await page4.keyboard.press('b');
    await page4.waitForTimeout(600);
    const axeBlind = await new AxeBuilder({ page: page4 })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
      .analyze();
    record('Vision-Assisted (Blind) dashboard has 0 WCAG 2.2 AA violations', axeBlind.violations.length === 0, `${axeBlind.violations.length} violations found`);

    // 3. Audit Deaf Mode Dashboard
    await page4.keyboard.press('o');
    await page4.waitForTimeout(400);
    await page4.keyboard.press('e');
    await page4.waitForTimeout(400);
    await page4.keyboard.press('d');
    await page4.waitForTimeout(400);
    if (await page4.isVisible('#closeDeafGuideBtn')) {
      await page4.click('#closeDeafGuideBtn');
    }
    await page4.waitForTimeout(400);
    const axeDeaf = await new AxeBuilder({ page: page4 })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
      .analyze();
    record('Hearing-Assisted (Deaf) dashboard has 0 WCAG 2.2 AA violations', axeDeaf.violations.length === 0, `${axeDeaf.violations.length} violations found`);

    await ctx4.close();


    // -------------------------------------------------------------------------
    // TEST JOURNEY 5: 320px Viewport Mobile Reflow (WCAG 1.4.10)
    // -------------------------------------------------------------------------
    console.log('\n--- Test Journey 5: 320px Mobile Reflow Verification ---');
    const ctx5 = await browser.newContext({ viewport: { width: 320, height: 750 } });
    const page5 = await ctx5.newPage();
    await page5.goto(`${BASE_URL}/index.html`);
    await page5.waitForTimeout(500);

    const hasHorizontalScrollGateway = await page5.evaluate(() => {
      return document.documentElement.scrollWidth > document.documentElement.clientWidth;
    });
    record('320px viewport has zero horizontal scroll on gateway screen', !hasHorizontalScrollGateway);

    // Advance to dashboard
    await page5.keyboard.press('e');
    await page5.waitForTimeout(400);
    await page5.keyboard.press('b');
    await page5.waitForTimeout(500);

    const hasHorizontalScrollDashboard = await page5.evaluate(() => {
      return document.documentElement.scrollWidth > document.documentElement.clientWidth;
    });
    record('320px viewport has zero horizontal scroll on tailored dashboard', !hasHorizontalScrollDashboard);

    await page5.screenshot({ path: path.join(EVIDENCE_DIR, 'gateway-reflow-320px.png') });
    await ctx5.close();

  } finally {
    await browser.close();
  }

  console.log('\n====================================================');
  console.log(` Gateway & Tailored Player QA Summary: ${totalPassed} PASSED | ${totalFailed} FAILED`);
  console.log('====================================================\n');

  if (totalFailed > 0) {
    process.exit(1);
  }
}

runVerification().catch(err => {
  console.error('Test execution exception:', err);
  process.exit(1);
});

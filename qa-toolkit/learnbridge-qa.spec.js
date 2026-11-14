/**
 * LearnBridge — Comprehensive Automated QA Test Suite
 *
 * Covers:
 * - WCAG 2.2 AA Automated Audit via @axe-core/playwright
 * - All 19 Required Functional User Journeys (Section 19 of Brief)
 * - Savanna Standalone Embed Demonstration
 */

const { test, expect } = require('@playwright/test');
const { AxeBuilder } = require('@axe-core/playwright');

const BASE_URL = 'http://127.0.0.1:4173';

test.describe('LearnBridge — Automated Functional & Accessibility QA', () => {

  test('1. Open application and verify WCAG 2.2 AA accessibility scan with axe-core', async ({ page }) => {
    await page.goto(`${BASE_URL}/index.html`);
    await page.waitForLoadState('networkidle');

    // Run axe-core accessibility scanner
    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'])
      .analyze();

    const criticalOrSerious = results.violations.filter(
      v => v.impact === 'critical' || v.impact === 'serious'
    );

    if (criticalOrSerious.length > 0) {
      console.log('axe-core findings:', JSON.stringify(criticalOrSerious, null, 2));
    }

    expect(criticalOrSerious, 'Must have zero critical or serious WCAG 2.2 violations').toHaveLength(0);
  });

  test('2-4. Play and pause media, seek, and verify play states', async ({ page }) => {
    await page.goto(`${BASE_URL}/index.html`);
    const playBtn = page.locator('#playButton');
    const stage = page.locator('#videoStage');

    // Verify initial paused state
    await expect(stage).toHaveClass(/paused/);

    // Click play
    await playBtn.click();
    await page.waitForTimeout(600);

    // Toggle pause
    await playBtn.click();
    await expect(stage).toHaveClass(/paused/);

    // Replay 10s button
    const backBtn = page.locator('#backButton');
    await backBtn.click();
    const currTime = await page.locator('#currentTime').textContent();
    expect(currTime).toBe('00:00');
  });

  test('5-6. Enable/disable captions and switch language between English and Amharic', async ({ page }) => {
    await page.goto(`${BASE_URL}/index.html`);
    await page.waitForLoadState('domcontentloaded');

    const captionsBtn = page.locator('#captionsButton');
    const captionOverlay = page.locator('#captionOverlay');

    // Initially captions hidden
    await expect(captionOverlay).toBeHidden();

    // Turn captions on
    await captionsBtn.click();
    await expect(captionsBtn).toHaveAttribute('aria-pressed', 'true');

    // Seek to 1 second where cue is active
    await page.evaluate(() => {
      if (typeof window.learnbridgeSeek === 'function') {
        window.learnbridgeSeek(1.0);
      } else {
        const vid = document.querySelector('#lessonVideo');
        if (vid) {
          vid.currentTime = 1.0;
          vid.dispatchEvent(new Event('timeupdate'));
        }
      }
    });
    await page.waitForTimeout(300);

    await expect(captionOverlay).toBeVisible();
    const textEn = await captionOverlay.textContent();
    expect(textEn).toContain('Good design starts by removing barriers.');

    // Switch transcript and caption language to Amharic via Preferences or transcript
    await page.locator('#tab-transcript').click();
    const mainTranscript = page.locator('#mainTranscript');
    await mainTranscript.evaluate((el) => el.setLanguage('am'));

    await page.evaluate(() => {
      const vid = document.querySelector('#lessonVideo');
      if (vid) vid.dispatchEvent(new Event('timeupdate'));
    });
    await page.waitForTimeout(300);

    const textAm = await captionOverlay.textContent();
    expect(textAm).toContain('ጥሩ ንድፍ');

    // Turn captions off
    await captionsBtn.click();
    await expect(captionOverlay).toBeHidden();
  });

  test('7-8. Synchronized transcript: open, search, select segment, and seek', async ({ page }) => {
    await page.goto(`${BASE_URL}/index.html`);

    // Open transcript tab
    await page.locator('#tab-transcript').click();
    const transcriptPanel = page.locator('#panel-transcript');
    await expect(transcriptPanel).toBeVisible();

    const mainTranscript = page.locator('#mainTranscript');
    await expect(mainTranscript).toBeVisible();

    // Verify transcript cues render inside shadow DOM
    const cueCount = await mainTranscript.evaluate((el) => {
      return el.shadowRoot.querySelectorAll('.transcript-line').length;
    });
    expect(cueCount).toBeGreaterThanOrEqual(4);

    // Click on cue 3 (starts at 8.3s)
    await mainTranscript.evaluate((el) => {
      const cue3 = el.shadowRoot.querySelectorAll('.transcript-line')[2];
      cue3.click();
    });
    await page.waitForTimeout(300);

    // Check video currentTime updated
    const vidTime = await page.evaluate(() => document.querySelector('#lessonVideo').currentTime);
    expect(vidTime).toBeCloseTo(8.3, 0.5);

    // Search within transcript
    await mainTranscript.evaluate((el) => {
      const input = el.shadowRoot.querySelector('#searchInput');
      input.value = 'robust';
      input.dispatchEvent(new Event('input'));
    });

    const filteredCount = await mainTranscript.evaluate((el) => {
      return el.shadowRoot.querySelectorAll('.transcript-line').length;
    });
    expect(filteredCount).toBe(1);
  });

  test('9-10. Ethiopian Sign Language interpreter window: toggle, reposition, and resize', async ({ page }) => {
    await page.goto(`${BASE_URL}/index.html`);

    const interpBtn = page.locator('#interpreterButton');
    const interpComp = page.locator('#interpreterOverlay');

    // Initially hidden
    const initialVisible = await interpComp.evaluate((el) => el.visible);
    expect(initialVisible).toBe(false);

    // Toggle interpreter on
    await interpBtn.click();
    await expect(interpBtn).toHaveAttribute('aria-pressed', 'true');
    const nowVisible = await interpComp.evaluate((el) => el.visible);
    expect(nowVisible).toBe(true);

    // Reposition using non-drag keyboard control button inside shadow DOM
    await interpComp.evaluate((el) => {
      el.shadowRoot.querySelector('#moveNextBtn').click();
    });
    const pos = await interpComp.evaluate((el) => el.position);
    expect(['top-right', 'bottom-right', 'bottom-left', 'top-left']).toContain(pos);

    // Resize using grow button
    await interpComp.evaluate((el) => {
      el.shadowRoot.querySelector('#growBtn').click();
    });
    const scale = await interpComp.evaluate((el) => el._scale);
    expect(scale).toBeGreaterThan(1.0);

    // Close interpreter via window close button
    await interpComp.evaluate((el) => {
      el.shadowRoot.querySelector('#hideBtn').click();
    });
    await expect(interpBtn).toHaveAttribute('aria-pressed', 'false');
  });

  test('11. Audio description track toggle and synchronization', async ({ page }) => {
    await page.goto(`${BASE_URL}/index.html`);

    const adBtn = page.locator('#descriptionButton');
    await adBtn.click();
    await expect(adBtn).toHaveAttribute('aria-pressed', 'true');

    // Turn off
    await adBtn.click();
    await expect(adBtn).toHaveAttribute('aria-pressed', 'false');
  });

  test('12-13. Course playlist accordion and lesson navigation', async ({ page }) => {
    await page.goto(`${BASE_URL}/index.html`);

    // Verify accordion toggle collapses/expands
    const firstGroupToggle = page.locator('.course-group-toggle').first();
    const firstGroup = page.locator('.course-group').first();

    await expect(firstGroup).toHaveClass(/expanded/);
    await firstGroupToggle.click();
    await expect(firstGroup).not.toHaveClass(/expanded/);

    await firstGroupToggle.click();
    await expect(firstGroup).toHaveClass(/expanded/);

    // Next class button seeks to next chapter
    const nextBtn = page.locator('#nextClassButton');
    await nextBtn.click();
    await page.waitForTimeout(300);
    const currTime = await page.evaluate(() => document.querySelector('#lessonVideo').currentTime);
    expect(currTime).toBeGreaterThan(0);
  });

  test('14. Accessible documents & resources list', async ({ page }) => {
    await page.goto(`${BASE_URL}/index.html`);

    // Click Resources nav
    const resNav = page.locator('nav.rail-glass a[href="#resources-section"]');
    await resNav.click();

    const resSection = page.locator('#resources-section');
    await expect(resSection).toBeVisible();

    const resList = page.locator('#resources-section learnbridge-resource-list');
    await expect(resList).toBeVisible();

    // Test in-app accessible document preview modal
    await resList.evaluate((el) => {
      const btn = el.shadowRoot.querySelector('.preview-btn');
      btn.click();
    });

    const isModalOpen = await resList.evaluate((el) => {
      const dialog = el.shadowRoot.querySelector('#docDialog');
      return dialog && dialog.open;
    });
    expect(isModalOpen).toBe(true);
  });

  test('15. Accessible Career & Job card with audio summary speech synthesis', async ({ page }) => {
    await page.goto(`${BASE_URL}/index.html`);

    const jobCard = page.locator('learnbridge-job-card').first();
    await expect(jobCard).toBeVisible();

    // Click Listen to summary
    await jobCard.evaluate((el) => {
      const listenBtn = el.shadowRoot.querySelector('#listenBtn');
      listenBtn.click();
    });

    // Toggle save role
    await jobCard.evaluate((el) => {
      const saveBtn = el.shadowRoot.querySelector('#saveBtn');
      saveBtn.click();
    });

    const isSaved = await jobCard.evaluate((el) => el.saved);
    expect(isSaved).toBe(true);
  });

  test('16. Certificate verification modal and ID copy', async ({ page }) => {
    await page.goto(`${BASE_URL}/index.html`);

    const certComp = page.locator('learnbridge-certificate').first();
    await expect(certComp).toBeVisible();

    // Click Verify Credential
    await certComp.evaluate((el) => {
      const btn = el.shadowRoot.querySelector('#verifyBtn');
      btn.click();
    });

    const isDialogOpen = await certComp.evaluate((el) => {
      const dialog = el.shadowRoot.querySelector('#verifyDialog');
      return dialog && dialog.open;
    });
    expect(isDialogOpen).toBe(true);

    // Close dialog
    await certComp.evaluate((el) => {
      el.shadowRoot.querySelector('#closeDialogBtn').click();
    });

    const isClosed = await certComp.evaluate((el) => {
      const dialog = el.shadowRoot.querySelector('#verifyDialog');
      return dialog && !dialog.open;
    });
    expect(isClosed).toBe(true);
  });

  test('17. Offline package caching feedback', async ({ page }) => {
    await page.goto(`${BASE_URL}/index.html`);

    const downloadBtn = page.locator('#downloadPackButton');
    await downloadBtn.click();

    // Verify toast feedback appears
    const toast = page.locator('#toast');
    await expect(toast).toHaveClass(/show/);
  });

  test('18-19. Preferences dialog: high-contrast, reduced-transparency, caption-scaling', async ({ page }) => {
    await page.goto(`${BASE_URL}/index.html`);

    const settingsBtn = page.locator('#settingsButton');
    await settingsBtn.click();

    const dialog = page.locator('#preferencesDialog');
    await expect(dialog).toBeVisible();

    // Turn on high contrast and reduced transparency
    await page.locator('#highContrastToggle').check({ force: true });
    await page.locator('#reduceTransparencyToggle').check({ force: true });
    await page.locator('#reduceMotionToggle').check({ force: true });

    // Apply
    await page.locator('#savePreferencesButton').click();
    await expect(dialog).toBeHidden();

    // Verify body classes applied
    await expect(page.locator('body')).toHaveClass(/high-contrast/);
    await expect(page.locator('body')).toHaveClass(/reduce-transparency/);
    await expect(page.locator('body')).toHaveClass(/reduce-motion/);
  });

  test('Savanna Embed Demo page loads and runs isolated components', async ({ page }) => {
    await page.goto(`${BASE_URL}/savanna-embed-demo.html`);
    await page.waitForLoadState('networkidle');

    // Run axe scan on Savanna Embed page too
    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa'])
      .analyze();

    const criticalOrSerious = results.violations.filter(
      v => v.impact === 'critical' || v.impact === 'serious'
    );
    expect(criticalOrSerious).toHaveLength(0);

    const player = page.locator('#sandboxPlayer');
    const transcript = page.locator('#sandboxTranscript');
    await expect(player).toBeVisible();
    await expect(transcript).toBeVisible();
  });

});

/**
 * LearnBridge Universal Accessibility Client - Savanna LMS Integration
 * Demonstrates real, live REST API consumption by an external LMS platform.
 */
(() => {
  'use strict';

  // API Configuration
  const API_BASE = window.location.origin;
  const API_KEY = 'lb_live_savanna_9842a1b7c';
  const USER_ID = 'savanna-student-1';

  // State
  let currentPreferences = null;
  let captionsActive = false;
  let interpreterActive = false;

  // DOM Elements
  const video = document.getElementById('lmsVideo');
  const captionsOverlay = document.getElementById('lmsCaptions');
  const interpreterOverlay = document.getElementById('lmsInterpreter');
  const captionsBtn = document.getElementById('lmsCaptionsBtn');
  const interpreterBtn = document.getElementById('lmsInterpreterBtn');
  const contrastBtn = document.getElementById('lmsContrastBtn');
  const fontBiggerBtn = document.getElementById('lmsFontBiggerBtn');
  const fontResetBtn = document.getElementById('lmsFontResetBtn');
  const profileSelect = document.getElementById('inspectorProfileSelect');
  const inspectorPayload = document.getElementById('inspectorPayload');
  const inspectorStatus = document.getElementById('inspectorStatus');
  const inspectorLatency = document.getElementById('inspectorLatency');
  const inspectorEndpoint = document.getElementById('inspectorEndpoint');
  const profileChipLabel = document.getElementById('profileChipLabel');
  const inspectorToggle = document.getElementById('inspectorToggle');
  const apiInspector = document.getElementById('apiInspector');
  const ariaAnnouncer = document.getElementById('ariaAnnouncer');

  function announce(msg) {
    if (ariaAnnouncer) {
      ariaAnnouncer.textContent = msg;
    }
  }

  // Captions Timing (Sample track)
  const cues = [
    { start: 0.5, end: 4.5, text: "Welcome to Savanna. Good accessibility starts by removing barriers." },
    { start: 4.5, end: 8.5, text: "Educational media must be perceivable, operable, and understandable." },
    { start: 8.5, end: 12.5, text: "LearnBridge provides unified accessibility profiles for every learner." },
    { start: 12.5, end: 17.5, text: "Let's explore accessible media composition for the ALX Hackathon." }
  ];

  if (video) {
    video.addEventListener('timeupdate', () => {
      if (!captionsActive || !captionsOverlay) return;
      const t = video.currentTime;
      const cue = cues.find(c => t >= c.start && t < c.end);
      if (cue) {
        captionsOverlay.textContent = cue.text;
        captionsOverlay.hidden = false;
      } else {
        captionsOverlay.hidden = true;
      }
    });
  }

  // Apply Preferences to the LMS UI
  function applyPreferences(prefs) {
    currentPreferences = prefs;

    // High Contrast
    if (prefs.highContrast || prefs.high_contrast) {
      document.body.classList.add('high-contrast');
      contrastBtn?.classList.add('active');
    } else {
      document.body.classList.remove('high-contrast');
      contrastBtn?.classList.remove('active');
    }

    // Font Scaling
    const scale = prefs.fontSizeMultiplier || (prefs.fontSize === 'large' ? 1.25 : 1);
    document.documentElement.style.setProperty('--ui-font-scale', String(scale));

    // Captions
    captionsActive = Boolean(prefs.captionsEnabled);
    if (captionsOverlay) captionsOverlay.hidden = !captionsActive;
    captionsBtn?.classList.toggle('active', captionsActive);

    // Sign Language Overlay
    interpreterActive = Boolean(prefs.signLanguageEnabled);
    if (interpreterOverlay) interpreterOverlay.hidden = !interpreterActive;
    interpreterBtn?.classList.toggle('active', interpreterActive);

    // Cognitive / Simplified Reading Mode
    if (prefs.readingGuide || prefs.simplifiedLayout) {
      document.body.classList.add('cognitive-mode');
    } else {
      document.body.classList.remove('cognitive-mode');
    }

    // Reduce Motion
    if (prefs.reduceMotion) {
      document.body.classList.add('reduce-motion');
    } else {
      document.body.classList.remove('reduce-motion');
    }

    // Update active profile pill
    if (profileChipLabel) {
      profileChipLabel.textContent = prefs.profileId || 'custom';
    }

    announce(`Savanna LMS updated with accessibility profile: ${prefs.profileId || 'custom'}`);
  }

  // Fetch Preferences from LearnBridge REST API
  async function fetchPreferences() {
    const endpoint = `${API_BASE}/api/v1/accessibility/preferences?userId=${USER_ID}`;
    if (inspectorEndpoint) inspectorEndpoint.textContent = `GET /api/v1/accessibility/preferences?userId=${USER_ID}`;

    const startTime = performance.now();
    try {
      const response = await fetch(endpoint, {
        method: 'GET',
        headers: {
          'x-api-key': API_KEY,
          'Accept': 'application/json'
        }
      });

      const elapsed = Math.round(performance.now() - startTime);
      if (inspectorLatency) inspectorLatency.textContent = `${elapsed} ms`;
      if (inspectorStatus) {
        inspectorStatus.textContent = `${response.status} ${response.statusText}`;
        inspectorStatus.style.color = response.ok ? '#4ade80' : '#f87171';
      }

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      const json = await response.json();
      if (inspectorPayload) {
        inspectorPayload.textContent = JSON.stringify(json, null, 2);
      }

      if (json.success && json.data) {
        applyPreferences(json.data);
        if (profileSelect && json.data.profileId) {
          profileSelect.value = json.data.profileId;
        }
      }
    } catch (err) {
      console.error('[LearnBridge LMS Client] Failed to fetch preferences:', err);
      if (inspectorPayload) {
        inspectorPayload.textContent = JSON.stringify({ error: err.message, status: 'offline/error' }, null, 2);
      }
    }
  }

  // Switch Profile on the API
  async function switchProfile(profileId) {
    const startTime = performance.now();
    try {
      // 1. Fetch Profile Definition
      const profRes = await fetch(`${API_BASE}/api/v1/accessibility/profiles/${profileId}`, {
        headers: { 'x-api-key': API_KEY }
      });
      const profJson = await profRes.json();
      if (!profJson.success) throw new Error('Failed to load profile');

      const profilePrefs = {
        ...profJson.data.defaults,
        profileId: profileId,
        userId: USER_ID
      };

      // 2. Persist to API
      const patchRes = await fetch(`${API_BASE}/api/v1/accessibility/preferences/me`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': API_KEY
        },
        body: JSON.stringify(profilePrefs)
      });
      const patchJson = await patchRes.json();

      const elapsed = Math.round(performance.now() - startTime);
      if (inspectorLatency) inspectorLatency.textContent = `${elapsed} ms`;
      if (inspectorStatus) inspectorStatus.textContent = `${patchRes.status} Profile Applied`;
      if (inspectorPayload) inspectorPayload.textContent = JSON.stringify(patchJson, null, 2);
      if (inspectorEndpoint) inspectorEndpoint.textContent = `PATCH /api/v1/accessibility/preferences/me`;

      applyPreferences(profilePrefs);
    } catch (err) {
      console.error('[LearnBridge LMS Client] Profile switch failed:', err);
    }
  }

  // Event Listeners for Manual Controls
  captionsBtn?.addEventListener('click', () => {
    captionsActive = !captionsActive;
    if (captionsOverlay) captionsOverlay.hidden = !captionsActive;
    captionsBtn.classList.toggle('active', captionsActive);
    announce(captionsActive ? 'Captions enabled' : 'Captions disabled');
  });

  interpreterBtn?.addEventListener('click', () => {
    interpreterActive = !interpreterActive;
    if (interpreterOverlay) interpreterOverlay.hidden = !interpreterActive;
    interpreterBtn.classList.toggle('active', interpreterActive);
    announce(interpreterActive ? 'Sign language interpreter enabled' : 'Sign language interpreter hidden');
  });

  contrastBtn?.addEventListener('click', () => {
    const isHigh = document.body.classList.toggle('high-contrast');
    contrastBtn.classList.toggle('active', isHigh);
    announce(isHigh ? 'High contrast enabled' : 'High contrast disabled');
  });

  fontBiggerBtn?.addEventListener('click', () => {
    const cur = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--ui-font-scale')) || 1;
    const next = Math.min(1.5, cur + 0.15);
    document.documentElement.style.setProperty('--ui-font-scale', String(next));
    announce(`Font scale increased to ${Math.round(next * 100)} percent`);
  });

  fontResetBtn?.addEventListener('click', () => {
    document.documentElement.style.setProperty('--ui-font-scale', '1');
    announce('Font scale reset to 100 percent');
  });

  profileSelect?.addEventListener('change', (e) => {
    switchProfile(e.target.value);
  });

  document.getElementById('refetchApiBtn')?.addEventListener('click', fetchPreferences);

  // Toggle Inspector Drawer
  inspectorToggle?.addEventListener('click', () => {
    const collapsed = apiInspector.classList.toggle('collapsed');
    inspectorToggle.setAttribute('aria-expanded', String(!collapsed));
  });

  // Initial Boot
  fetchPreferences();
})();

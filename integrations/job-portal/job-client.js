/**
 * EthioCareers Inclusive Employment Portal - LearnBridge REST API Integration Client
 * Demonstrates a non-LMS enterprise application consuming and writing to LearnBridge API.
 */
(() => {
  'use strict';

  const API_BASE = window.location.origin;
  const API_KEY = 'lb_live_ethiojobs_45c82e01f';
  const USER_ID = 'ethio-applicant-42';

  let currentPrefs = null;
  let synth = window.speechSynthesis;

  // DOM Elements
  const jobList = document.getElementById('jobList');
  const searchInput = document.getElementById('jobSearchInput');
  const highContrastToggle = document.getElementById('prefHighContrast');
  const fontScaleSelect = document.getElementById('prefFontScale');
  const speechRateSelect = document.getElementById('prefSpeechRate');
  const reduceMotionToggle = document.getElementById('prefReduceMotion');
  const settingsModal = document.getElementById('settingsModal');
  const openSettingsBtn = document.getElementById('openSettingsBtn');
  const closeSettingsBtn = document.getElementById('closeSettingsBtn');
  const savePrefsBtn = document.getElementById('savePrefsBtn');
  const applicantBadge = document.getElementById('applicantBadge');
  const ariaLive = document.getElementById('jobAriaLive');

  // Inspector Elements
  const apiInspector = document.getElementById('apiInspector');
  const inspectorToggle = document.getElementById('inspectorToggle');
  const inspectorEndpoint = document.getElementById('inspectorEndpoint');
  const inspectorStatus = document.getElementById('inspectorStatus');
  const inspectorLatency = document.getElementById('inspectorLatency');
  const inspectorPayload = document.getElementById('inspectorPayload');

  function announce(text) {
    if (ariaLive) ariaLive.textContent = text;
  }

  // Update live inspector panel
  function updateInspector(endpoint, statusText, statusCode, latencyMs, payload) {
    if (inspectorEndpoint) inspectorEndpoint.textContent = endpoint;
    if (inspectorStatus) {
      inspectorStatus.textContent = `${statusCode} ${statusText}`;
      inspectorStatus.style.color = (statusCode >= 200 && statusCode < 300) ? '#4ade80' : '#f87171';
    }
    if (inspectorLatency) inspectorLatency.textContent = `${latencyMs} ms`;
    if (inspectorPayload) inspectorPayload.textContent = JSON.stringify(payload, null, 2);
  }

  // Apply preferences to portal UI
  function applyPreferences(prefs) {
    currentPrefs = prefs;

    // High Contrast
    if (prefs.highContrast) {
      document.body.classList.add('high-contrast');
      if (highContrastToggle) highContrastToggle.checked = true;
    } else {
      document.body.classList.remove('high-contrast');
      if (highContrastToggle) highContrastToggle.checked = false;
    }

    // Font Scaling
    const scale = prefs.fontSizeMultiplier || (prefs.fontSize === 'large' ? 1.25 : 1);
    document.documentElement.style.setProperty('--app-font-scale', String(scale));
    if (fontScaleSelect) fontScaleSelect.value = String(scale);

    // Reduce Motion
    if (prefs.reduceMotion) {
      document.body.classList.add('reduce-motion');
      if (reduceMotionToggle) reduceMotionToggle.checked = true;
    } else {
      document.body.classList.remove('reduce-motion');
      if (reduceMotionToggle) reduceMotionToggle.checked = false;
    }

    if (applicantBadge) {
      applicantBadge.textContent = prefs.profileId || 'custom';
    }

    announce(`EthioCareers accessibility profile updated to: ${prefs.profileId || 'custom'}`);
  }

  // Fetch preferences from API
  async function fetchApplicantPreferences() {
    const endpoint = `GET /api/v1/accessibility/preferences?userId=${USER_ID}`;
    const url = `${API_BASE}/api/v1/accessibility/preferences?userId=${USER_ID}`;
    const start = performance.now();

    try {
      const res = await fetch(url, {
        headers: {
          'x-api-key': API_KEY,
          'Accept': 'application/json'
        }
      });
      const latency = Math.round(performance.now() - start);
      const json = await res.json();

      updateInspector(endpoint, res.statusText, res.status, latency, json);

      if (json.success && json.data) {
        applyPreferences(json.data);
      }
    } catch (err) {
      console.error('[EthioCareers] API fetch failed:', err);
      updateInspector(endpoint, 'Error', 500, Math.round(performance.now() - start), { error: err.message });
    }
  }

  // Save updated preferences back to LearnBridge API (PATCH)
  async function savePreferencesToApi(newPrefs) {
    const endpoint = `PATCH /api/v1/accessibility/preferences/me`;
    const url = `${API_BASE}/api/v1/accessibility/preferences/me`;
    const start = performance.now();

    try {
      const res = await fetch(url, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': API_KEY
        },
        body: JSON.stringify(newPrefs)
      });
      const latency = Math.round(performance.now() - start);
      const json = await res.json();

      updateInspector(endpoint, res.statusText, res.status, latency, json);

      if (json.success && json.data) {
        applyPreferences(json.data);
        announce('Preferences saved to LearnBridge cloud profile.');
      }
    } catch (err) {
      console.error('[EthioCareers] API PATCH failed:', err);
      updateInspector(endpoint, 'Error', 500, Math.round(performance.now() - start), { error: err.message });
    }
  }

  // Text-To-Speech (Web Speech API) for job descriptions
  function speakText(text, btn) {
    if (!synth) {
      alert('Speech synthesis is not supported in this browser.');
      return;
    }

    if (synth.speaking) {
      synth.cancel();
      document.querySelectorAll('.tts-btn').forEach(b => {
        b.classList.remove('speaking');
        b.textContent = '🔊 Listen';
      });
      if (btn.classList.contains('speaking')) return;
    }

    const utterance = new SpeechSynthesisUtterance(text);
    const rate = parseFloat(speechRateSelect ? speechRateSelect.value : 1.0);
    utterance.rate = rate;

    btn.classList.add('speaking');
    btn.textContent = '⏹ Stop';

    utterance.onend = () => {
      btn.classList.remove('speaking');
      btn.textContent = '🔊 Listen';
    };
    utterance.onerror = () => {
      btn.classList.remove('speaking');
      btn.textContent = '🔊 Listen';
    };

    synth.speak(utterance);
  }

  // Event Listeners
  openSettingsBtn?.addEventListener('click', () => {
    if (settingsModal) settingsModal.hidden = false;
  });

  closeSettingsBtn?.addEventListener('click', () => {
    if (settingsModal) settingsModal.hidden = true;
  });

  savePrefsBtn?.addEventListener('click', () => {
    const updated = {
      ...currentPrefs,
      highContrast: Boolean(highContrastToggle?.checked),
      fontSizeMultiplier: parseFloat(fontScaleSelect?.value || '1'),
      reduceMotion: Boolean(reduceMotionToggle?.checked),
      userId: USER_ID
    };
    savePreferencesToApi(updated);
    if (settingsModal) settingsModal.hidden = true;
  });

  // Attach TTS to job cards
  document.querySelectorAll('.tts-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const card = btn.closest('.job-card');
      const title = card.querySelector('h2')?.textContent || '';
      const company = card.querySelector('.job-company')?.textContent || '';
      const desc = card.querySelector('.job-desc')?.textContent || '';
      const fullText = `Position: ${title} at ${company}. Description: ${desc}`;
      speakText(fullText, btn);
    });
  });

  // Filter chips
  document.querySelectorAll('.filter-chip').forEach(chip => {
    chip.addEventListener('click', () => {
      document.querySelectorAll('.filter-chip').forEach(c => c.classList.remove('active'));
      chip.classList.add('active');
      const filter = chip.dataset.filter;
      document.querySelectorAll('.job-card').forEach(card => {
        if (filter === 'all') {
          card.hidden = false;
        } else {
          card.hidden = !card.dataset.tags.includes(filter);
        }
      });
      announce(`Filtered jobs by ${chip.textContent}`);
    });
  });

  // Search filter
  searchInput?.addEventListener('input', (e) => {
    const q = e.target.value.toLowerCase();
    document.querySelectorAll('.job-card').forEach(card => {
      const match = card.textContent.toLowerCase().includes(q);
      card.hidden = !match;
    });
  });

  // Inspector toggle
  inspectorToggle?.addEventListener('click', () => {
    const collapsed = apiInspector.classList.toggle('collapsed');
    inspectorToggle.setAttribute('aria-expanded', String(!collapsed));
  });

  document.getElementById('refetchJobApiBtn')?.addEventListener('click', fetchApplicantPreferences);

  // Initial fetch
  fetchApplicantPreferences();
})();

/**
 * LearnBridge Employment — Universal Accessibility Engine & Universal Access Gateway
 * Features:
 * - 2-Step Onboarding Gateway (Language check & Disabilities / Accessibility profile)
 * - Automatic 10-second countdown fallback to Blind-accessible mode with Space to pause
 * - Real-time Web Speech TTS for Blind Mode Tab/Keyboard Navigation
 * - Harmonic Web Audio API Earcon synthesizer
 * - Visual toast announcer and dockable Ethiopian Sign Language (ETSL) window
 * - High Contrast WCAG AAA tokens & focus management
 */

class AccessibilityManager {
  constructor() {
    this.currentMode = 'standard'; // 'standard' | 'blind' | 'deaf'
    this.highContrast = false;
    this.ttsEnabled = true;
    this.voiceActive = false;
    this.recognition = null;
    this.audioCtx = null;
    this.synth = window.speechSynthesis || null;
    this.currentLanguage = localStorage.getItem('lb_emp_lang') || 'en';

    // Gateway state
    this.gatewayDialogOpen = false;
    this.gatewayCurrentStep = 1;
    this.gatewayCountdownRemaining = 10.0;
    this.gatewayInterval = null;
    this.gatewayActive = false;

    // High-definition neural audio & anti-echo state (adopted from ALX Website)
    this.isSpeaking = false;
    this.lastSpeakingEndedTime = 0;
    this.lastSpokenText = '';
    this.speakingWatchdog = null;
    this.fetchAbortController = null;
    this.currentAudio = null;
    this.speakSeq = 0;
    this.lastCommand = '';
    this.lastCommandTime = 0;
    this.lastSuccessfulCommandTime = 0;
  }

  init() {
    this.cacheDOMElements();
    this.bindA11yEvents();
    this.bindTabNavigationSpeech();
    this.setupSpeechRecognition();
    this.initGateway();

    // Check saved mode or launch Gateway on first load (interoperable with Player)
    const savedMode = localStorage.getItem('lb_emp_mode') || localStorage.getItem('learnbridge_user_profile');
    const savedLang = localStorage.getItem('lb_emp_lang') || localStorage.getItem('learnbridge_lang');
    const onboardingDone = localStorage.getItem('lb_emp_onboarding_done') || localStorage.getItem('learnbridge_gateway_done');

    if (savedMode) {
      this.setMode(savedMode, false);
    }
    if (savedLang) {
      this.currentLanguage = savedLang;
      if (window.app && typeof window.app.loadLanguage === 'function') {
        window.app.loadLanguage(savedLang);
      }
    }

    if (!onboardingDone && !savedMode) {
      // Automatic first-load onboarding check for language and disability preferences
      setTimeout(() => {
        this.openGateway(true);
      }, 500);
    }
  }

  cacheDOMElements() {
    this.livePolite = document.getElementById('sr-announcer-polite');
    this.liveAssertive = document.getElementById('sr-announcer-assertive');
    this.visualToast = document.getElementById('visual-event-toast');
    this.toastText = document.getElementById('visual-toast-text');
    this.signWindow = document.getElementById('etsl-dock-window');

    // Gateway elements
    this.gatewayDialog = document.getElementById('gateway-dialog');
    this.gatewayStep1 = document.getElementById('gateway-step-lang');
    this.gatewayStep2 = document.getElementById('gateway-step-a11y');
    this.gatewayCountdownLabel = document.getElementById('gateway-countdown-label');
    this.gatewayCountdownSeconds = document.getElementById('gateway-countdown-seconds');
    this.gatewayProgressBar = document.getElementById('gateway-progress-bar');
    this.btnGatewayPause = document.getElementById('btn-gateway-pause');
    this.btnGatewayBack = document.getElementById('btn-gateway-back');
  }

  bindA11yEvents() {
    // Mode switcher buttons
    document.querySelectorAll('.a11y-mode-pill').forEach(btn => {
      btn.addEventListener('click', () => {
        const mode = btn.dataset.mode;
        this.setMode(mode, true);
      });
    });

    // High Contrast toggle
    const contrastBtn = document.getElementById('btn-toggle-contrast');
    if (contrastBtn) {
      contrastBtn.addEventListener('click', () => this.toggleHighContrast());
    }

    // Header Preferences / Profile button to re-open Gateway anytime
    const openGatewayBtn = document.getElementById('btn-open-gateway');
    if (openGatewayBtn) {
      openGatewayBtn.addEventListener('click', () => {
        this.openGateway(false);
      });
    }
  }

  // -------------------------------------------------------------
  // BLIND MODE TAB & FOCUS NAVIGATION TTS READOUT
  // -------------------------------------------------------------
  bindTabNavigationSpeech() {
    document.addEventListener('focusin', (e) => {
      if (this.currentMode !== 'blind' || !this.ttsEnabled) return;
      const el = e.target;
      if (!el || el === document.body || el === document.documentElement) return;

      // Don't announce if element is inside an inactive/hidden container
      if (el.closest('[hidden]') || el.closest('[style*="display: none"]')) return;

      const text = this.buildElementSpeechText(el);
      if (text) {
        // Prevent repeating exact same text within 300ms
        const now = Date.now();
        if (text === this.lastSpokenText && (now - this.lastSpokenTime) < 400) return;
        this.lastSpokenText = text;
        this.lastSpokenTime = now;

        this.speak(text, this.getSpeechLang());
      }
    });
  }

  buildElementSpeechText(el) {
    // 0. Swipe Card item
    if (el.classList.contains('swipe-card')) {
      const title = el.querySelector('.swipe-card-title')?.innerText || '';
      const employer = el.querySelector('.swipe-card-employer')?.innerText || '';
      const score = el.querySelector('.match-score-pill')?.innerText || '';
      return `Swipeable job opportunity: ${title} at ${employer}. ${score}. Press Right Arrow on keyboard to apply with CV, Left Arrow to pass.`;
    }

    // 1. Job Card item
    if (el.classList.contains('job-card')) {
      const title = el.querySelector('.job-card-title')?.innerText || '';
      const employer = el.querySelector('.job-employer-name')?.innerText || '';
      const location = el.querySelector('.job-location')?.innerText || '';
      const salary = el.querySelector('.job-salary')?.innerText || '';
      return `Job Opportunity: ${title} at ${employer}. Location: ${location}. Compensation: ${salary}. Press Enter to view full details.`;
    }

    // 2. Navigation Link
    if (el.classList.contains('nav-link') || el.classList.contains('rail-button')) {
      const name = el.getAttribute('aria-label') || el.innerText || '';
      const isCurrent = el.classList.contains('active') || el.getAttribute('aria-current') === 'page';
      return `Navigation: ${name}. ${isCurrent ? 'Current page.' : 'Press Enter to open.'}`;
    }

    // 3. Form Inputs
    const tagName = el.tagName.toLowerCase();
    if (tagName === 'input') {
      const type = el.type ? el.type.toLowerCase() : 'text';
      const label = this._getAssociatedLabel(el);

      if (type === 'checkbox') {
        const state = el.checked ? 'Checked' : 'Not checked';
        return `Checkbox: ${label}. ${state}. Press Space to toggle.`;
      }
      if (type === 'radio') {
        const state = el.checked ? 'Selected' : 'Not selected';
        return `Radio button: ${label}. ${state}.`;
      }
      const val = el.value ? `Current text: ${el.value}` : 'Empty';
      return `Text field: ${label}. ${val}.`;
    }

    if (tagName === 'select') {
      const label = this._getAssociatedLabel(el);
      const selected = el.options && el.selectedIndex >= 0 ? el.options[el.selectedIndex].text : '';
      return `Dropdown selection: ${label}. Currently chosen: ${selected}. Use arrow keys to change.`;
    }

    if (tagName === 'textarea') {
      const label = this._getAssociatedLabel(el);
      const val = el.value ? `Current length: ${el.value.length} characters.` : 'Empty.';
      return `Multi-line text area: ${label}. ${val}`;
    }

    // 4. Buttons
    if (tagName === 'button') {
      const name = el.getAttribute('aria-label') || el.innerText || el.title || 'Button';
      const pressed = el.getAttribute('aria-pressed');
      const pressedText = pressed === 'true' ? 'Currently active.' : (pressed === 'false' ? 'Currently inactive.' : '');
      return `Button: ${name}. ${pressedText}`;
    }

    // 5. Links
    if (tagName === 'a') {
      const name = el.getAttribute('aria-label') || el.innerText || el.title || 'Link';
      return `Link: ${name}.`;
    }

    // 6. Tabs
    if (el.getAttribute('role') === 'tab') {
      const name = el.getAttribute('aria-label') || el.innerText || '';
      const selected = el.getAttribute('aria-selected') === 'true' || el.classList.contains('active');
      return `Tab: ${name}. ${selected ? 'Selected tab.' : 'Press Space or Enter to select.'}`;
    }

    // 7. Progress Bars
    if (el.getAttribute('role') === 'progressbar') {
      const label = el.getAttribute('aria-label') || 'Progress';
      const val = el.getAttribute('aria-valuenow') || '';
      return `Progress bar: ${label}. ${val} percent.`;
    }

    // 8. General focusable elements
    const ariaLabel = el.getAttribute('aria-label');
    if (ariaLabel) return ariaLabel;

    const inner = el.innerText ? el.innerText.trim() : '';
    if (inner && inner.length < 140) return inner;

    return null;
  }

  _getAssociatedLabel(el) {
    if (el.getAttribute('aria-label')) return el.getAttribute('aria-label');
    if (el.id) {
      const labelEl = document.querySelector(`label[for="${el.id}"]`);
      if (labelEl) return labelEl.innerText.trim();
    }
    const parentLabel = el.closest('label');
    if (parentLabel) return parentLabel.innerText.trim();
    if (el.placeholder) return el.placeholder;
    if (el.name) return el.name;
    return 'Field';
  }

  // -------------------------------------------------------------
  // UNIVERSAL ACCESS GATEWAY (ONBOARDING)
  // -------------------------------------------------------------
  initGateway() {
    if (!this.gatewayDialog) return;

    // Step 1: Language buttons
    this.gatewayDialog.querySelectorAll('.gateway-lang-choice').forEach(btn => {
      btn.addEventListener('click', () => {
        const lang = btn.dataset.lang;
        this.selectGatewayLanguage(lang);
      });
    });

    // Step 2: Disability Profile buttons
    this.gatewayDialog.querySelectorAll('.gateway-profile-card').forEach(btn => {
      btn.addEventListener('click', () => {
        const profile = btn.dataset.profile;
        this.applyTailoredProfile(profile, true);
      });
    });

    // Pause / Resume Countdown Timer
    if (this.btnGatewayPause) {
      this.btnGatewayPause.addEventListener('click', () => this.pauseGatewayTimer());
    }

    // Back to Language Selection
    if (this.btnGatewayBack) {
      this.btnGatewayBack.addEventListener('click', () => this.enterGatewayStep1());
    }

    // Keyboard Shortcuts for Gateway (E, A, O, T, S, B, D, Space)
    window.addEventListener('keydown', (e) => this.handleGatewayKeydown(e));
  }

  openGateway(isFirstLaunch = false) {
    if (!this.gatewayDialog) return;
    this.gatewayDialogOpen = true;
    this.gatewayDialog.hidden = false;
    this.gatewayDialog.style.display = '';

    try {
      if (typeof this.gatewayDialog.showModal === 'function' && !this.gatewayDialog.open) {
        this.gatewayDialog.showModal();
      }
    } catch (_) {}

    this.playEarcon('rising');
    this.enterGatewayStep1();
  }

  closeGateway() {
    this.gatewayDialogOpen = false;
    clearInterval(this.gatewayInterval);
    this.gatewayActive = false;

    if (this.gatewayDialog) {
      try {
        if (typeof this.gatewayDialog.close === 'function' && this.gatewayDialog.open) {
          this.gatewayDialog.close();
        }
      } catch (_) {}
      this.gatewayDialog.hidden = true;
      this.gatewayDialog.style.display = 'none';
    }
  }

  enterGatewayStep1() {
    this.gatewayCurrentStep = 1;
    clearInterval(this.gatewayInterval);
    this.gatewayActive = false;

    if (this.gatewayStep1) this.gatewayStep1.hidden = false;
    if (this.gatewayStep2) this.gatewayStep2.hidden = true;
    if (this.btnGatewayBack) this.btnGatewayBack.hidden = true;

    // Voice instruction out loud
    const prompt = "Welcome to LearnBridge Employment. Please choose your language. Press E for English, A for Amharic, O for Afaan Oromoo, T for Tigrinya, or S for Somali. Or select any button on screen.";
    this.announceLive(prompt, true);
    this.speak(prompt, 'en-US');

    // Focus first language button
    setTimeout(() => {
      const firstBtn = this.gatewayDialog?.querySelector('.gateway-lang-choice');
      if (firstBtn) firstBtn.focus();
    }, 150);
  }

  enterGatewayStep2() {
    this.gatewayCurrentStep = 2;
    if (this.gatewayStep1) this.gatewayStep1.hidden = true;
    if (this.gatewayStep2) this.gatewayStep2.hidden = false;
    if (this.btnGatewayBack) this.btnGatewayBack.hidden = false;

    this.gatewayCountdownRemaining = 10.0;
    this.gatewayActive = true;

    if (this.gatewayProgressBar) {
      this.gatewayProgressBar.style.width = '100%';
      this.gatewayProgressBar.style.background = 'var(--status-emerald-text)';
    }
    if (this.gatewayCountdownSeconds) {
      this.gatewayCountdownSeconds.textContent = '10';
    }

    const step2Prompts = {
      en: "Step 2: Understanding your preferences. If you are blind or have vision difficulties, press B or hold on for 10 seconds. If you are deaf or have hearing difficulties, press D. If you want the standard view, press S. Press Space to pause timer.",
      am: "ደረጃ 2፡ የእርስዎን ምርጫዎች መረዳት። ማየት የተሳናቸው ከሆኑ B ይጫኑ ወይም 10 ሰከንዶች ይጠብቁ። መስማት የተሳናቸው ከሆኑ D ይጫኑ። መደበኛ እይታ ከፈለጉ S ይጫኑ።",
      om: "Tarkaanfii 2ffaa: Yoo qaro-dhabeessa taatan B dhiibaa ykn sekondii 10 eegaa. Yoo dhageettii hin qabne taatan D dhiibaa. Haala idileef S dhiibaa.",
      ti: "ደረጃ 2፡ ዓይነ-ስዉር እንተኾይንኩም B ጽዓኑ ወይ 10 ካልኢት ተጸበዩ። ጸማም እንተኾይንኩም D ጽዓኑ። ልሙድ S ጽዓኑ።",
      so: "Tallaabada 2aad: Haddii aad tahay indhool riix B ama sug 10 ilbiriqsi. Haddii aad tahay dhegoole riix D. Caadiga riix S."
    };

    const promptText = step2Prompts[this.currentLanguage] || step2Prompts.en;
    this.announceLive(promptText, true);
    this.speak(promptText, this.getSpeechLang());

    // Focus the Blind option card by default
    setTimeout(() => {
      const blindBtn = this.gatewayDialog?.querySelector('[data-profile="blind"]');
      if (blindBtn) blindBtn.focus();
    }, 150);

    // 10-Second Fallback Countdown
    const stepMs = 100;
    clearInterval(this.gatewayInterval);
    this.gatewayInterval = setInterval(() => {
      if (!this.gatewayActive) return;
      this.gatewayCountdownRemaining = Math.max(0, this.gatewayCountdownRemaining - (stepMs / 1000));

      if (this.gatewayCountdownSeconds) {
        this.gatewayCountdownSeconds.textContent = String(Math.ceil(this.gatewayCountdownRemaining));
      }
      if (this.gatewayProgressBar) {
        const pct = (this.gatewayCountdownRemaining / 10.0) * 100;
        this.gatewayProgressBar.style.width = `${pct}%`;
      }
      if (this.gatewayCountdownRemaining <= 0) {
        clearInterval(this.gatewayInterval);
        this.gatewayActive = false;
        // Automatic 10-Second Fallback -> Defaults to Vision-Assisted (Blind) mode!
        this.applyTailoredProfile('blind', true);
      }
    }, stepMs);
  }

  pauseGatewayTimer() {
    this.gatewayActive = !this.gatewayActive;
    if (this.btnGatewayPause) {
      this.btnGatewayPause.textContent = this.gatewayActive ? 'Pause Timer (Space)' : 'Resume Timer (Space)';
    }
    if (this.gatewayCountdownLabel) {
      this.gatewayCountdownLabel.innerHTML = this.gatewayActive
        ? '<span>Activating Blind-Accessible Mode in </span><strong id="gateway-countdown-seconds">' + Math.ceil(this.gatewayCountdownRemaining) + '</strong><span>s. Press Space to pause.</span>'
        : '<span>Timer paused. Choose your accessibility experience below or press B, D, or S.</span>';
    }
    const msg = this.gatewayActive ? "Countdown resumed." : "Countdown paused. Select your option with B, D, or S.";
    this.speak(msg, this.getSpeechLang());
  }

  selectGatewayLanguage(langCode) {
    this.currentLanguage = langCode;
    localStorage.setItem('lb_emp_lang', langCode);
    localStorage.setItem('learnbridge_lang', langCode);

    if (window.app && typeof window.app.loadLanguage === 'function') {
      window.app.loadLanguage(langCode);
    }

    const confirmations = {
      en: "Language set to English.",
      am: "ቋንቋ ወደ አማርኛ ተቀይሯል።",
      om: "Afaan gara Afaan Oromootti jijjiirameera.",
      ti: "ቋንቋ ናብ ትግርኛ ተቐይሩ ኣሎ።",
      so: "Luuqadda waxaa loo beddelay Af-Soomaali."
    };
    this.speak(confirmations[langCode] || `Language set to ${langCode}.`, this.getSpeechLang());

    setTimeout(() => {
      this.enterGatewayStep2();
    }, 600);
  }

  applyTailoredProfile(profile, notify = true) {
    this.setMode(profile, notify);
    localStorage.setItem('lb_emp_mode', profile);
    localStorage.setItem('learnbridge_user_profile', profile);
    localStorage.setItem('lb_emp_onboarding_done', 'true');
    localStorage.setItem('learnbridge_gateway_done', 'true');
    this.closeGateway();

    if (profile === 'blind') {
      const blindWelcome = "Blind-accessible mode active. As you navigate using the Tab key, every highlighted option and field will be read aloud. Use Tab and Shift-Tab to explore jobs.";
      this.announceLive(blindWelcome, true);
      this.speak(blindWelcome, this.getSpeechLang());
      this.showVisualToast("Blind-Accessible Mode Active: Spoken Tab guidance enabled.");
    } else if (profile === 'deaf') {
      const deafWelcome = "Deaf-accessible mode active. Visual alerts, captions, and high contrast guidance enabled.";
      this.showVisualToast(deafWelcome);
      this.announceLive(deafWelcome, false);
    } else {
      this.showVisualToast("Standard Mode Active.");
    }
  }

  handleGatewayKeydown(e) {
    if (!this.gatewayDialogOpen) return;

    const key = (e.key || '').toLowerCase();
    const code = (e.code || '').toLowerCase();

    // Prevent scrolling on Space when inside Gateway
    if ((e.key === ' ' || code === 'space') && this.gatewayCurrentStep === 2) {
      e.preventDefault();
      this.pauseGatewayTimer();
      return;
    }

    if (this.gatewayCurrentStep === 1) {
      // Step 1: Language shortcuts
      if (key === 'e' || code === 'keye') {
        e.preventDefault();
        this.selectGatewayLanguage('en');
      } else if (key === 'a' || code === 'keya') {
        e.preventDefault();
        this.selectGatewayLanguage('am');
      } else if (key === 'o' || code === 'keyo') {
        e.preventDefault();
        this.selectGatewayLanguage('om');
      } else if (key === 't' || code === 'keyt') {
        e.preventDefault();
        this.selectGatewayLanguage('ti');
      } else if (key === 's' || code === 'keys') {
        e.preventDefault();
        this.selectGatewayLanguage('so');
      }
    } else if (this.gatewayCurrentStep === 2) {
      // Step 2: Disability shortcuts
      if (key === 'b' || code === 'keyb') {
        e.preventDefault();
        this.applyTailoredProfile('blind', true);
      } else if (key === 'd' || code === 'keyd') {
        e.preventDefault();
        this.applyTailoredProfile('deaf', true);
      } else if (key === 's' || code === 'keys') {
        e.preventDefault();
        this.applyTailoredProfile('standard', true);
      }
    }
  }

  // -------------------------------------------------------------
  // MODE CONTROLLER
  // -------------------------------------------------------------
  setMode(mode, notify = true) {
    this.currentMode = mode;
    localStorage.setItem('lb_emp_mode', mode);

    // Update active pill UI
    document.querySelectorAll('.a11y-mode-pill').forEach(p => {
      const isActive = p.dataset.mode === mode;
      p.classList.toggle('active', isActive);
      p.setAttribute('aria-pressed', isActive ? 'true' : 'false');
    });

    if (mode === 'blind') {
      this.ttsEnabled = true;
      document.body.classList.add('mode-blind');
      document.body.classList.remove('mode-deaf');
      if (this.signWindow) this.signWindow.style.display = 'none';

      if (notify) {
        this.playEarcon('rising');
      }
    } else if (mode === 'deaf') {
      this.ttsEnabled = false;
      document.body.classList.add('mode-deaf');
      document.body.classList.remove('mode-blind');
      if (this.signWindow) this.signWindow.style.display = 'flex';

      if (notify) {
        this.playEarcon('chime');
      }
    } else {
      // Standard mode
      this.ttsEnabled = false;
      document.body.classList.remove('mode-blind', 'mode-deaf');
      if (this.signWindow) this.signWindow.style.display = 'none';
    }
  }

  toggleHighContrast() {
    this.highContrast = !this.highContrast;
    document.body.classList.toggle('high-contrast', this.highContrast);
    const label = this.highContrast ? "High contrast enabled" : "Standard contrast restored";
    this.announceLive(label, false);
    this.showVisualToast(label);
    this.playEarcon(this.highContrast ? 'rising' : 'falling');
  }

  announceLive(message, assertive = false) {
    const region = assertive ? this.liveAssertive : this.livePolite;
    if (region) {
      region.textContent = '';
      setTimeout(() => {
        region.textContent = message;
      }, 50);
    }
  }

  showVisualToast(message, duration = 4000) {
    if (!this.visualToast || !this.toastText) return;
    this.toastText.textContent = message;
    this.visualToast.classList.add('visible');
    this.visualToast.removeAttribute('aria-hidden');

    if (this._toastTimer) clearTimeout(this._toastTimer);
    this._toastTimer = setTimeout(() => {
      this.visualToast.classList.remove('visible');
      this.visualToast.setAttribute('aria-hidden', 'true');
    }, duration);
  }

  getSpeechLang() {
    if (this.currentLanguage === 'am') return 'am';
    if (this.currentLanguage === 'om') return 'om';
    if (this.currentLanguage === 'ti') return 'ti';
    return 'en';
  }

  playChime(type = 'success') {
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;
      if (!this.audioCtx) this.audioCtx = new AudioCtx();
      if (this.audioCtx.state === 'suspended') this.audioCtx.resume();

      const now = this.audioCtx.currentTime;
      const osc = this.audioCtx.createOscillator();
      const gain = this.audioCtx.createGain();
      osc.connect(gain);
      gain.connect(this.audioCtx.destination);

      if (type === 'success' || type === 'rising') {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(523.25, now);
        osc.frequency.exponentialRampToValueAtTime(783.99, now + 0.12);
        gain.gain.setValueAtTime(0.18, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
        osc.start(now);
        osc.stop(now + 0.35);
      } else if (type === 'falling') {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(783.99, now);
        osc.frequency.exponentialRampToValueAtTime(523.25, now + 0.15);
        gain.gain.setValueAtTime(0.15, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.28);
        osc.start(now);
        osc.stop(now + 0.28);
      } else {
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(440, now);
        osc.frequency.exponentialRampToValueAtTime(659.25, now + 0.15);
        gain.gain.setValueAtTime(0.15, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.28);
        osc.start(now);
        osc.stop(now + 0.28);
      }
    } catch (_) {}
  }

  playEarcon(type = 'chime') {
    this.playChime(type);
  }

  stopSpeech() {
    this.speakSeq++;
    if (this.speakingWatchdog) {
      clearTimeout(this.speakingWatchdog);
      this.speakingWatchdog = null;
    }
    if (this.fetchAbortController) {
      try { this.fetchAbortController.abort(); } catch (_) {}
      this.fetchAbortController = null;
    }
    if (this.currentAudio) {
      try {
        this.currentAudio.pause();
        this.currentAudio.currentTime = 0;
        this.currentAudio = null;
      } catch (_) {}
    }
    if (this.synth) {
      try { this.synth.cancel(); } catch (_) {}
    }
    this.isSpeaking = false;
    this.lastSpeakingEndedTime = Date.now();
    this.updateVoiceStatusUI(this.isListeningActive, false);
  }

  async speak(text, lang = null) {
    if (!text || !text.trim()) return;

    const targetLang = (lang || this.getSpeechLang() || 'en').slice(0, 2);

    this.stopSpeech();
    const currentSeq = ++this.speakSeq;
    this.isSpeaking = true;
    this.currentSpokenText = text.toLowerCase().trim();
    this.lastSpokenText = this.currentSpokenText;
    this.updateVoiceStatusUI(true, true);

    // Watchdog to auto-release speaking lock after 7 seconds max
    clearTimeout(this.speakingWatchdog);
    this.speakingWatchdog = setTimeout(() => {
      if (currentSeq === this.speakSeq) {
        this.isSpeaking = false;
        this.currentSpokenText = '';
        this.lastSpeakingEndedTime = Date.now();
        this.updateVoiceStatusUI(this.isListeningActive, false);
      }
    }, 7000);

    try {
      this.fetchAbortController = new AbortController();
      const response = await fetch('/api/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: text.trim(), lang: targetLang }),
        signal: this.fetchAbortController.signal
      });

      if (currentSeq !== this.speakSeq) return;
      const data = await response.json();
      if (currentSeq !== this.speakSeq) return;

      if (data && data.success && data.audioUrl) {
        const audio = new Audio(data.audioUrl);
        this.currentAudio = audio;
        audio.onended = () => {
          if (currentSeq === this.speakSeq) {
            clearTimeout(this.speakingWatchdog);
            this.isSpeaking = false;
            this.currentSpokenText = '';
            this.lastSpeakingEndedTime = Date.now();
            this.updateVoiceStatusUI(this.isListeningActive, false);
          }
        };
        audio.onerror = () => {
          if (currentSeq === this.speakSeq) {
            this.fallbackSpeak(text, targetLang, currentSeq);
          }
        };
        try {
          await audio.play();
          return;
        } catch (_) {
          this.fallbackSpeak(text, targetLang, currentSeq);
          return;
        }
      }
    } catch (err) {
      if (err.name === 'AbortError') return;
      console.warn("[A11yManager] Neural TTS fetch error, falling back:", err);
    }

    if (currentSeq === this.speakSeq) {
      this.fallbackSpeak(text, targetLang, currentSeq);
    }
  }

  fallbackSpeak(text, lang, expectedSeq) {
    if (expectedSeq && expectedSeq !== this.speakSeq) return;
    if (!this.synth) {
      this.isSpeaking = false;
      this.updateVoiceStatusUI(this.isListeningActive, false);
      return;
    }
    try {
      this.synth.cancel();
      const utter = new SpeechSynthesisUtterance(text);
      utter.rate = 1.05;
      utter.pitch = 1.0;
      utter.lang = lang === 'am' ? 'am-ET' : lang === 'ti' ? 'ti-ET' : lang === 'om' ? 'om-ET' : 'en-US';

      utter.onend = () => {
        if (!expectedSeq || expectedSeq === this.speakSeq) {
          clearTimeout(this.speakingWatchdog);
          this.isSpeaking = false;
          this.lastSpeakingEndedTime = Date.now();
          this.updateVoiceStatusUI(this.isListeningActive, false);
        }
      };
      utter.onerror = () => {
        if (!expectedSeq || expectedSeq === this.speakSeq) {
          clearTimeout(this.speakingWatchdog);
          this.isSpeaking = false;
          this.lastSpeakingEndedTime = Date.now();
          this.updateVoiceStatusUI(this.isListeningActive, false);
        }
      };
      this.synth.speak(utter);
    } catch (_) {
      this.isSpeaking = false;
      this.updateVoiceStatusUI(this.isListeningActive, false);
    }
  }

  setupSpeechRecognition() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      console.warn("[A11yManager] SpeechRecognition not available in this environment.");
      return;
    }

    try {
      this.recognition = new SpeechRecognition();
      this.recognition.continuous = true;
      this.recognition.interimResults = true;
      this.recognition.lang = this.getSpeechLang(this.currentLanguage || 'en');
      this.isListeningActive = true;

      this.recognition.onstart = () => {
        this.voiceActive = true;
        this.updateVoiceStatusUI(true, this.isSpeaking);
      };

      this.recognition.onend = () => {
        this.voiceActive = false;
        if (this.isListeningActive) {
          try {
            this.recognition.start();
          } catch (_) {
            this.updateVoiceStatusUI(false, this.isSpeaking);
          }
        } else {
          this.updateVoiceStatusUI(false, this.isSpeaking);
        }
      };

      this.recognition.onerror = (e) => {
        console.warn("[A11yManager] Voice recognition error:", e.error);
        if (e.error === 'not-allowed') {
          this.isListeningActive = false;
          this.updateVoiceStatusUI(false, false);
          this.showVisualToast("Microphone access denied. Please click the microphone icon in your browser address bar to allow.");
        }
      };

      this.recognition.onresult = (event) => {
        // Allow instant barge-in for commands like apply, reject, pass, stop, profile in all languages
        if (this.isSpeaking) {
          let hasCommand = false;
          for (let i = event.resultIndex; i < event.results.length; ++i) {
            const tr = (event.results[i][0]?.transcript || '').toLowerCase();
            if (tr.includes('apply') || tr.includes('reject') || tr.includes('pass') || tr.includes('stop') ||
                tr.includes('dashboard') || tr.includes('profile') || tr.includes('settings') || tr.includes('archive') ||
                // Amharic (አማርኛ)
                tr.includes('አመልክት') || tr.includes('አመልክቺ') || tr.includes('ማመልከቻ') || tr.includes('ውድቅ') ||
                tr.includes('ቀጣይ') || tr.includes('እለፍ') || tr.includes('ለፍ') || tr.includes('ተው') ||
                tr.includes('ፕሮፋይል') || tr.includes('አርካይቭ') || tr.includes('ተመለስ') || tr.includes('ዝም') ||
                tr.includes('amelkit') || tr.includes('widik') || tr.includes('ilef') ||
                // Afaan Oromoo
                tr.includes('iyyadhu') || tr.includes('didi') || tr.includes('didii') || tr.includes('darbi') ||
                tr.includes('dhaabi') || tr.includes('piroofaayilii') || tr.includes('arkaa') ||
                // Tigrinya (ትግርኛ)
                tr.includes('ኣመልክት') || tr.includes('ንጸግ') || tr.includes('ሕለፍ') || tr.includes('መለለዪ') ||
                tr.includes('nitseg') || tr.includes('hilef')) {
              hasCommand = true;
              break;
            }
          }
          if (hasCommand) {
            this.stopSpeech();
          } else {
            return;
          }
        } else if (Date.now() - this.lastSpeakingEndedTime < 200) {
          return;
        }

        for (let i = event.resultIndex; i < event.results.length; ++i) {
          const res = event.results[i];
          const transcript = (res[0]?.transcript || '').trim();
          if (!transcript) continue;

          // Strict echo rejection against last spoken system message
          if (this.lastSpokenText && transcript.length > 2) {
            const cleanT = transcript.toLowerCase();
            const cleanS = this.lastSpokenText.toLowerCase();
            if (cleanS.includes(cleanT) || (cleanT.length > 6 && cleanS.slice(0, 30).includes(cleanT.slice(0, 10)))) {
              continue;
            }
          }

          if (window.app && typeof window.app.handleVoiceCommand === 'function') {
            const handled = window.app.handleVoiceCommand(transcript);
            if (handled) {
              this.playChime('success');
              break;
            }
          }
        }
      };

      // Auto-start microphone by default on load or first interaction
      this.startMicDefault();
    } catch (err) {
      console.warn("[A11yManager] Failed to init SpeechRecognition:", err);
    }
  }

  startMicDefault() {
    this.isListeningActive = true;
    try {
      this.recognition.start();
      this.updateVoiceStatusUI(true, this.isSpeaking);
    } catch (_) {
      // Browser requires user gesture to start microphone: hook first user interaction
      const startOnGesture = () => {
        if (this.isListeningActive && !this.voiceActive && this.recognition) {
          try {
            this.recognition.start();
            this.updateVoiceStatusUI(true, this.isSpeaking);
          } catch (_) {}
        }
      };
      window.addEventListener('click', startOnGesture, { once: true });
      window.addEventListener('keydown', startOnGesture, { once: true });
      window.addEventListener('pointerdown', startOnGesture, { once: true });
    }
  }

  toggleVoiceListening() {
    if (!this.recognition) {
      this.showVisualToast("Speech recognition not supported in this browser. Please use M, Left Arrow, and Right Arrow.");
      return;
    }

    if (this.voiceActive || this.isListeningActive) {
      this.isListeningActive = false;
      try { this.recognition.stop(); } catch (_) {}
      this.updateVoiceStatusUI(false, this.isSpeaking);
      this.playChime('neutral');
      this.showVisualToast("Microphone muted (Press V to resume).");
    } else {
      this.isListeningActive = true;
      try {
        this.recognition.lang = this.getSpeechLang(this.currentLanguage || 'en');
        this.recognition.start();
        this.playChime('success');
        this.updateVoiceStatusUI(true, this.isSpeaking);
        this.showVisualToast("Listening: Say 'apply', 'pass', 'more', or 'less'");
      } catch (err) {
        console.warn("[A11yManager] Speech start error:", err);
        this.showVisualToast("Please allow microphone access in your browser.");
      }
    }
  }

  updateVoiceStatusUI(isActive, isSpeaking = false) {
    this.voiceActive = isActive;
    const btns = document.querySelectorAll('.btn-deck-mic');
    btns.forEach(btn => {
      const lbl = btn.querySelector('.mic-status-label');
      if (isSpeaking) {
        btn.classList.add('is-speaking');
        btn.classList.remove('is-listening');
        btn.setAttribute('aria-pressed', 'true');
        if (lbl) lbl.textContent = 'Speaking 🔊';
      } else if (isActive) {
        btn.classList.remove('is-speaking');
        btn.classList.add('is-listening');
        btn.setAttribute('aria-pressed', 'true');
        if (lbl) lbl.textContent = 'Mic: Listening (V)';
      } else {
        btn.classList.remove('is-speaking', 'is-listening');
        btn.setAttribute('aria-pressed', 'false');
        if (lbl) lbl.textContent = 'Voice (V)';
      }
    });
  }

  startVoiceSearch(onResultCallback) {
    if (!this.recognition) {
      this.showVisualToast("Voice recognition not supported in this browser. Please use keyboard.");
      return;
    }

    this.recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript;
      if (window.app && typeof window.app.handleVoiceCommand === 'function') {
        const handled = window.app.handleVoiceCommand(transcript);
        if (handled) return;
      }
      if (onResultCallback) onResultCallback(transcript);
    };

    try {
      this.recognition.start();
    } catch (err) {
      console.warn("[A11yManager] Could not start speech recognition:", err.message);
    }
  }
}

window.a11y = new AccessibilityManager();

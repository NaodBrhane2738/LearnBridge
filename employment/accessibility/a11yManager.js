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

    // Speech deduplication tracker
    this.lastSpokenText = '';
    this.lastSpokenTime = 0;
  }

  init() {
    this.cacheDOMElements();
    this.bindA11yEvents();
    this.bindTabNavigationSpeech();
    this.setupSpeechRecognition();
    this.initGateway();

    // Check saved mode or launch Gateway on first load
    const savedMode = localStorage.getItem('lb_emp_mode');
    const onboardingDone = localStorage.getItem('lb_emp_onboarding_done');

    if (savedMode) {
      this.setMode(savedMode, false);
    }

    if (!onboardingDone) {
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
      this.gatewayProgressBar.style.background = '#10B981';
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
    localStorage.setItem('lb_emp_onboarding_done', 'true');
    this.closeGateway();

    if (profile === 'blind') {
      const blindWelcome = "Blind-accessible mode active. As you navigate using the Tab key, every highlighted option and field will be read aloud. Use Tab and Shift-Tab to explore jobs.";
      this.announceLive(blindWelcome, true);
      this.speak(blindWelcome, this.getSpeechLang());
      this.showVisualToast("Blind-Accessible Mode Active: Spoken Tab guidance enabled.");
    } else if (profile === 'deaf') {
      const deafWelcome = "Deaf-accessible mode active. Ethiopian Sign Language video interpreter docked on right.";
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
    if (this.currentLanguage === 'am') return 'am-ET';
    return 'en-US';
  }

  speak(text, lang = null) {
    if (!this.synth) return;
    try {
      this.synth.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 1.05;
      utterance.pitch = 1.0;
      utterance.lang = lang || this.getSpeechLang();

      const voices = this.synth.getVoices();
      const targetLang = utterance.lang.slice(0, 2);
      const matchedVoice = voices.find(v => v.lang.startsWith(targetLang));
      if (matchedVoice) {
        utterance.voice = matchedVoice;
      }

      this.synth.speak(utterance);
    } catch (err) {
      console.warn("[A11yManager] Speech synthesis unavailable:", err.message);
    }
  }

  stopSpeech() {
    if (this.synth) {
      this.synth.cancel();
    }
  }

  playEarcon(type = 'chime') {
    try {
      if (!this.audioCtx) {
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        if (!AudioContext) return;
        this.audioCtx = new AudioContext();
      }

      if (this.audioCtx.state === 'suspended') {
        this.audioCtx.resume();
      }

      const now = this.audioCtx.currentTime;
      const osc = this.audioCtx.createOscillator();
      const gain = this.audioCtx.createGain();
      osc.connect(gain);
      gain.connect(this.audioCtx.destination);

      if (type === 'rising') {
        osc.frequency.setValueAtTime(523.25, now);
        osc.frequency.exponentialRampToValueAtTime(783.99, now + 0.15);
        gain.gain.setValueAtTime(0.12, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
        osc.start(now);
        osc.stop(now + 0.25);
      } else if (type === 'falling') {
        osc.frequency.setValueAtTime(783.99, now);
        osc.frequency.exponentialRampToValueAtTime(523.25, now + 0.15);
        gain.gain.setValueAtTime(0.12, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
        osc.start(now);
        osc.stop(now + 0.25);
      } else {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(659.25, now);
        gain.gain.setValueAtTime(0.1, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
        osc.start(now);
        osc.stop(now + 0.3);
      }
    } catch (_) {}
  }

  setupSpeechRecognition() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) return;

    this.recognition = new SpeechRecognition();
    this.recognition.continuous = false;
    this.recognition.interimResults = false;
    this.recognition.lang = 'en-US';

    this.recognition.onstart = () => {
      this.voiceActive = true;
      const hud = document.getElementById('voice-hud');
      if (hud) hud.classList.add('active');
      this.announceLive("Voice search listening...", false);
    };

    this.recognition.onend = () => {
      this.voiceActive = false;
      const hud = document.getElementById('voice-hud');
      if (hud) hud.classList.remove('active');
    };

    this.recognition.onerror = (e) => {
      console.warn("[A11yManager] Voice recognition error:", e.error);
    };
  }

  startVoiceSearch(onResultCallback) {
    if (!this.recognition) {
      this.showVisualToast("Voice recognition not supported in this browser. Please use keyboard.");
      return;
    }

    this.recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript;
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

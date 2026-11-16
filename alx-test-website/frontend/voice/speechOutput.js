/**
 * LearnBridge Unified Speech Output Coordinator
 * Consolidates all application-generated speech, manages TTS priority queues,
 * enforces half-duplex acoustic muting, and respects Screen Reader Mode.
 */

const SpeechPriority = Object.freeze({
  CRITICAL_ERROR: 1,
  NAVIGATION_FEEDBACK: 2,
  USER_REQUESTED: 3,
  ROUTINE_CONFIRMATION: 4
});

class SpeechOutputCoordinator {
  constructor() {
    this._queue = [];
    this._isSpeaking = false;
    this._isPaused = false;
    this._currentUtterance = null;
    this._currentAudio = null;
    this._lastSpokenText = '';
    this._lastSpeakingEndedTime = 0;
    this._language = 'en';
    this._rate = 1.0;
    this._volume = 1.0;
    this._screenReaderMode = false;
    this._speakSeq = 0;
    this._watchdogTimer = null;
    this._onStateChangeCallbacks = new Set();
  }

  get isSpeaking() {
    return this._isSpeaking;
  }

  get lastSpokenText() {
    return this._lastSpokenText;
  }

  get lastSpeakingEndedTime() {
    return this._lastSpeakingEndedTime;
  }

  get screenReaderMode() {
    return this._screenReaderMode;
  }

  setScreenReaderMode(enabled) {
    this._screenReaderMode = !!enabled;
    if (this._screenReaderMode) {
      this.stop();
      this.announceAriaLive('Screen reader mode enabled. Application speech synthesis suppressed.');
    }
    this._notifyState();
  }

  setLanguage(lang) {
    this._language = lang || 'en';
  }

  setRate(rate) {
    this._rate = Math.max(0.5, Math.min(2.0, Number(rate) || 1.0));
  }

  setVolume(volume) {
    this._volume = Math.max(0.0, Math.min(1.0, Number(volume) || 1.0));
  }

  subscribeState(fn) {
    this._onStateChangeCallbacks.add(fn);
    return () => this._onStateChangeCallbacks.delete(fn);
  }

  _notifyState() {
    const state = {
      isSpeaking: this._isSpeaking,
      isPaused: this._isPaused,
      screenReaderMode: this._screenReaderMode,
      queueLength: this._queue.length
    };
    for (const fn of this._onStateChangeCallbacks) {
      try { fn(state); } catch (_) {}
    }
  }

  announceAriaLive(text, assertive = false) {
    if (typeof document === 'undefined') return;
    const polite = document.getElementById('sr-announcer-polite') || document.getElementById('onboardingAriaLive');
    const assertEl = document.getElementById('sr-announcer-assertive');
    const target = (assertive && assertEl) ? assertEl : (polite || assertEl);

    if (target) {
      target.textContent = '';
      setTimeout(() => {
        target.textContent = text;
      }, 50);
    }
  }

  speak(text, options = {}) {
    if (!text || !text.trim()) return Promise.resolve(false);
    const clean = text.trim();
    const priority = options.priority || SpeechPriority.USER_REQUESTED;
    const assertive = options.assertive || (priority === SpeechPriority.CRITICAL_ERROR);

    // Screen Reader Mode Interception:
    // When Screen Reader Mode is enabled, suppress audio TTS and deliver via ARIA live region
    if (this._screenReaderMode) {
      this.announceAriaLive(clean, assertive);
      this._lastSpokenText = clean;
      this._lastSpeakingEndedTime = Date.now();
      return Promise.resolve(true);
    }

    // Always update ARIA live region regardless of audio TTS for dual accessibility
    this.announceAriaLive(clean, assertive);

    // Priority Handling: Higher priority (lower number) preempts existing lower priority speech
    if (this._isSpeaking && priority === SpeechPriority.CRITICAL_ERROR) {
      this.stop();
    }

    const item = {
      text: clean,
      priority,
      lang: options.lang || this._language,
      rate: options.rate || this._rate,
      volume: options.volume || this._volume,
      resolve: null,
      reject: null
    };

    const promise = new Promise((resolve, reject) => {
      item.resolve = resolve;
      item.reject = reject;
    });

    this._queue.push(item);
    this._queue.sort((a, b) => a.priority - b.priority);

    if (!this._isSpeaking && !this._isPaused) {
      this._processQueue();
    }

    return promise;
  }

  _processQueue() {
    if (this._queue.length === 0) {
      this._isSpeaking = false;
      this._notifyState();
      return;
    }

    const item = this._queue.shift();
    this._isSpeaking = true;
    this._lastSpokenText = item.text;
    const currentSeq = ++this._speakSeq;
    this._notifyState();

    // Signal VoiceController to enter SPEAKING state (Half-Duplex Isolation)
    if (typeof window !== 'undefined' && window.lbVoiceController) {
      window.lbVoiceController.onSpeechStart(item.text);
    }

    // Safety watchdog: speech must not hang forever
    clearTimeout(this._watchdogTimer);
    const estimatedDurationMs = Math.max(2000, (item.text.length * 100));
    this._watchdogTimer = setTimeout(() => {
      if (currentSeq === this._speakSeq && this._isSpeaking) {
        console.warn('[SpeechOutputCoordinator] Speech watchdog fired, resetting output state.');
        this._finishSpeaking(item);
      }
    }, estimatedDurationMs + 3000);

    // Primary: Web Speech API synthesis
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      try {
        window.speechSynthesis.cancel();
        const utter = new SpeechSynthesisUtterance(item.text);
        utter.lang = item.lang === 'am' ? 'am-ET' : item.lang === 'ti' ? 'ti-ET' : item.lang === 'om' ? 'om-ET' : 'en-US';
        utter.rate = item.rate;
        utter.volume = item.volume;

        utter.onend = () => {
          if (currentSeq === this._speakSeq) {
            this._finishSpeaking(item);
          }
        };

        utter.onerror = (e) => {
          console.warn('[SpeechOutputCoordinator] Speech synthesis error:', e.error);
          if (currentSeq === this._speakSeq) {
            this._finishSpeaking(item);
          }
        };

        this._currentUtterance = utter;
        window.speechSynthesis.speak(utter);
        return;
      } catch (err) {
        console.warn('[SpeechOutputCoordinator] Synthesis failed, falling back:', err);
      }
    }

    // Fallback if speechSynthesis is unavailable
    this._finishSpeaking(item);
  }

  _finishSpeaking(item) {
    clearTimeout(this._watchdogTimer);
    this._isSpeaking = false;
    this._currentUtterance = null;
    this._currentAudio = null;
    this._lastSpeakingEndedTime = Date.now();
    this._notifyState();

    // Signal VoiceController that speech ended (Half-Duplex Resume)
    if (typeof window !== 'undefined' && window.lbVoiceController) {
      window.lbVoiceController.onSpeechEnd();
    }

    if (item && item.resolve) {
      item.resolve(true);
    }

    // Process next item in queue
    if (this._queue.length > 0 && !this._isPaused) {
      setTimeout(() => this._processQueue(), 100);
    }
  }

  stop() {
    this._speakSeq++;
    clearTimeout(this._watchdogTimer);
    this._queue = [];

    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      try { window.speechSynthesis.cancel(); } catch (_) {}
    }
    if (this._currentAudio) {
      try {
        this._currentAudio.pause();
        this._currentAudio.src = '';
      } catch (_) {}
    }

    this._isSpeaking = false;
    this._isPaused = false;
    this._currentUtterance = null;
    this._currentAudio = null;
    this._lastSpeakingEndedTime = Date.now();
    this._notifyState();

    if (typeof window !== 'undefined' && window.lbVoiceController) {
      window.lbVoiceController.onSpeechEnd();
    }
  }

  pause() {
    if (this._isSpeaking && !this._isPaused) {
      this._isPaused = true;
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        try { window.speechSynthesis.pause(); } catch (_) {}
      }
      this._notifyState();
    }
  }

  resume() {
    if (this._isPaused) {
      this._isPaused = false;
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        try { window.speechSynthesis.resume(); } catch (_) {}
      }
      if (!this._isSpeaking && this._queue.length > 0) {
        this._processQueue();
      }
      this._notifyState();
    }
  }

  repeat() {
    if (this._lastSpokenText) {
      this.speak(this._lastSpokenText, { priority: SpeechPriority.USER_REQUESTED });
    }
  }
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { SpeechPriority, SpeechOutputCoordinator };
} else if (typeof window !== 'undefined') {
  window.SpeechPriority = SpeechPriority;
  window.SpeechOutputCoordinator = SpeechOutputCoordinator;
}

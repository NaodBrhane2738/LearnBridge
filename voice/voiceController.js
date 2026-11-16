/**
 * LearnBridge Central Voice Controller
 * Authoritative owner of microphone lifecycle, speech recognition sessions,
 * and command routing across LearnBridge LMS and embedded modules.
 */

if (typeof require !== 'undefined') {
  try {
    var { VoiceState, VoiceStateMachine } = require('./stateMachine');
    var { LanguageCapabilityManager } = require('./languageCapabilities');
    var { CommandRegistry } = require('./commandRegistry');
    var { SpeechPriority, SpeechOutputCoordinator } = require('./speechOutput');
  } catch (_) {}
}

class LearnBridgeVoiceController {
  constructor(options = {}) {
    this.stateMachine = new VoiceStateMachine(
      typeof VoiceState !== 'undefined' ? VoiceState.IDLE : 'IDLE'
    );
    this.commandRegistry = options.commandRegistry || new CommandRegistry();
    this.speechOutput = options.speechOutput || new SpeechOutputCoordinator();

    this._mode = 'tap-to-speak'; // 'tap-to-speak' | 'continuous'
    this._language = options.language || 'en';
    this._recognition = null;
    this._continuousTimeoutTimer = null;
    this._mediaStream = null;
    this._listeners = new Set();
    this._lastTranscript = '';
    this._activeSessionId = this.stateMachine.sessionId;

    // Half-duplex tracking
    this._isAcousticMuted = false;
    this._lastSpeakingEndedTime = 0;
    this._recentSpokenEchoes = [];

    this._initDomHooks();
  }

  get state() {
    return this.stateMachine.state;
  }

  get mode() {
    return this._mode;
  }

  get language() {
    return this._language;
  }

  getState() {
    return this.stateMachine.state;
  }

  getCapabilities() {
    if (typeof LanguageCapabilityManager !== 'undefined') {
      return LanguageCapabilityManager.getCapabilities(this._language);
    }
    return { sttSupport: { browserNative: true }, ttsSupport: { browserNative: true } };
  }

  setLanguage(lang) {
    this._language = lang || 'en';
    if (this.speechOutput) {
      this.speechOutput.setLanguage(this._language);
    }
    if (this._recognition) {
      const code = this._getSpeechLangCode(this._language);
      this._recognition.lang = code;
    }
  }

  setMode(mode) {
    if (mode === 'continuous' || mode === 'tap-to-speak') {
      this._mode = mode;
      console.log(`[LearnBridgeVoiceController] Interaction mode set to: ${mode}`);
    }
  }

  setDictationTarget(targetElement) {
    return this.commandRegistry.setDictationTarget(targetElement);
  }

  clearDictationTarget() {
    this.commandRegistry.clearDictationTarget();
  }

  subscribe(fn) {
    this._listeners.add(fn);
    return () => this._listeners.delete(fn);
  }

  _notify(event, data = {}) {
    for (const fn of this._listeners) {
      try { fn(event, data); } catch (_) {}
    }
  }

  _getSpeechLangCode(lang) {
    if (lang === 'am') return 'am-ET';
    if (lang === 'ti') return 'ti-ET';
    if (lang === 'om') return 'om-ET';
    return 'en-US';
  }

  // -------------------------------------------------------------
  // MICROPHONE LIFECYCLE (NON-AUTOPLAY, EXPLICIT TAP-TO-SPEAK)
  // -------------------------------------------------------------

  startListening() {
    // Check half-duplex mute: cannot start if system is actively speaking
    if (this.speechOutput && this.speechOutput.isSpeaking) {
      console.log('[LearnBridgeVoiceController] Refusing to start listening: Assistant is currently speaking.');
      return false;
    }

    const SpeechRecognition = typeof window !== 'undefined' ?
      (window.SpeechRecognition || window.webkitSpeechRecognition) : null;

    if (!SpeechRecognition) {
      this.stateMachine.transition(VoiceState.UNSUPPORTED, { reason: 'NO_SPEECH_API' });
      this._notify('unsupported', { message: 'Speech recognition is not supported in this browser. Please use Chrome or Edge.' });
      return false;
    }

    if (this.stateMachine.state === VoiceState.LISTENING) {
      return true;
    }

    // Rotate session to invalidate any obsolete async callbacks
    this._activeSessionId = this.stateMachine.rotateSession();
    const currentSession = this._activeSessionId;

    this.stateMachine.transition(VoiceState.REQUESTING_PERMISSION, { sessionId: currentSession });
    this._notify('requesting_permission');

    try {
      this._cleanupRecognition();

      const rec = new SpeechRecognition();
      rec.continuous = (this._mode === 'continuous');
      rec.interimResults = true;
      rec.maxAlternatives = 2;
      rec.lang = this._getSpeechLangCode(this._language);

      rec.onstart = () => {
        if (currentSession !== this._activeSessionId) return;
        this.stateMachine.transition(VoiceState.LISTENING, { sessionId: currentSession });
        this._notify('listening', { mode: this._mode, lang: this._language });

        if (this._mode === 'continuous') {
          this._startContinuousTimeout();
        }
      };

      rec.onresult = (event) => {
        if (currentSession !== this._activeSessionId) return;
        this._handleRecognitionResult(event, currentSession);
      };

      rec.onerror = (event) => {
        if (currentSession !== this._activeSessionId) return;
        this._handleRecognitionError(event);
      };

      rec.onend = () => {
        if (currentSession !== this._activeSessionId) return;
        this._handleRecognitionEnd(currentSession);
      };

      this._recognition = rec;
      this.stateMachine.transition(VoiceState.INITIALIZING, { sessionId: currentSession });
      rec.start();
      return true;
    } catch (err) {
      console.warn('[LearnBridgeVoiceController] Start error:', err);
      this.stateMachine.transition(VoiceState.ERROR, { error: err.message });
      this._notify('error', { error: err.message });
      return false;
    }
  }

  stopListening() {
    this._clearContinuousTimeout();
    this._activeSessionId = this.stateMachine.rotateSession();

    if (this._recognition) {
      try {
        this._recognition.stop();
      } catch (_) {}
    }

    if (this.stateMachine.canTransitionTo(VoiceState.IDLE)) {
      this.stateMachine.transition(VoiceState.IDLE);
    }
    this._notify('idle');
  }

  abortListening() {
    this._clearContinuousTimeout();
    this._activeSessionId = this.stateMachine.rotateSession();

    if (this._recognition) {
      try {
        this._recognition.abort();
      } catch (_) {}
      this._cleanupRecognition();
    }

    if (this.stateMachine.canTransitionTo(VoiceState.IDLE)) {
      this.stateMachine.transition(VoiceState.IDLE);
    }
    this._notify('idle');
  }

  pauseListening() {
    if (this.stateMachine.state === VoiceState.LISTENING) {
      if (this._recognition) {
        try { this._recognition.stop(); } catch (_) {}
      }
      this.stateMachine.transition(VoiceState.PAUSED);
      this._notify('paused');
    }
  }

  resumeListening() {
    if (this.stateMachine.state === VoiceState.PAUSED) {
      this.startListening();
    }
  }

  // -------------------------------------------------------------
  // HALF-DUPLEX ACOUSTIC ISOLATION & ECHO REJECTION
  // -------------------------------------------------------------

  onSpeechStart(spokenText) {
    this._isAcousticMuted = true;
    if (spokenText) {
      this._recentSpokenEchoes.push(spokenText.toLowerCase().trim());
      if (this._recentSpokenEchoes.length > 5) this._recentSpokenEchoes.shift();
    }

    // If currently listening, pause recognition while speech is active
    if (this.stateMachine.state === VoiceState.LISTENING) {
      this.stateMachine.transition(VoiceState.SPEAKING);
      this._notify('speaking', { text: spokenText });
    }
  }

  onSpeechEnd() {
    this._isAcousticMuted = false;
    this._lastSpeakingEndedTime = Date.now();

    if (this.stateMachine.state === VoiceState.SPEAKING) {
      if (this._mode === 'continuous') {
        // Controlled resume after TTS finishes (300ms acoustic grace window)
        setTimeout(() => {
          if (!this._isAcousticMuted && this.stateMachine.state === VoiceState.SPEAKING) {
            this.stateMachine.transition(VoiceState.LISTENING);
            this._notify('listening');
          }
        }, 350);
      } else {
        this.stateMachine.transition(VoiceState.IDLE);
        this._notify('idle');
      }
    }
  }

  _isAcousticEcho(rawTranscript) {
    if (!rawTranscript) return true;
    const clean = rawTranscript.toLowerCase().trim();

    // 1. Time fence: reject transcripts received while assistant was speaking or within 350ms of ending
    const now = Date.now();
    if (this._isAcousticMuted || (now - this._lastSpeakingEndedTime) < 350) {
      // Allow instant 'stop' barge-in to cancel speech
      if (/^(stop|quiet|silence|ዝም|ቆም)/i.test(clean)) {
        if (this.speechOutput) this.speechOutput.stop();
        return true;
      }
      console.log(`[LearnBridgeVoiceController] Dropped acoustic self-trigger transcript during TTS: "${clean}"`);
      return true;
    }

    // 2. Lexical fence: compare against recent spoken assistant outputs
    for (const echo of this._recentSpokenEchoes) {
      if (echo.includes(clean) || (clean.length > 6 && echo.includes(clean.slice(0, 10)))) {
        console.log(`[LearnBridgeVoiceController] Dropped lexical echo match: "${clean}" matched "${echo.slice(0, 20)}..."`);
        return true;
      }
    }

    return false;
  }

  // -------------------------------------------------------------
  // TRANSCRIPT & COMMAND HANDLING
  // -------------------------------------------------------------

  _handleRecognitionResult(event, sessionId) {
    if (sessionId !== this._activeSessionId) return;

    let interimText = '';
    let finalUtterance = '';

    for (let i = event.resultIndex; i < event.results.length; ++i) {
      const res = event.results[i];
      if (!res || !res[0]) continue;
      if (res.isFinal) {
        finalUtterance += res[0].transcript + ' ';
      } else {
        interimText += res[0].transcript + ' ';
      }
    }

    const transcript = (finalUtterance || interimText).trim();
    if (!transcript) return;

    // Feedback event for live HUD / UI
    this._notify('transcript', {
      transcript,
      isFinal: !!finalUtterance.trim()
    });

    // Check Acoustic Echo Gate
    if (this._isAcousticEcho(transcript)) {
      return;
    }

    // ONLY execute on FINAL recognition results to eliminate interim false triggers
    if (finalUtterance.trim()) {
      this.stateMachine.transition(VoiceState.PROCESSING, { utterance: finalUtterance.trim() });
      this._notify('processing', { utterance: finalUtterance.trim() });

      const execResult = this.commandRegistry.execute(finalUtterance.trim());
      this._notify('command_executed', execResult);

      if (execResult.message && this.speechOutput) {
        this.speechOutput.speak(execResult.message, {
          priority: execResult.requiresConfirmation ? SpeechPriority.NAVIGATION_FEEDBACK : SpeechPriority.USER_REQUESTED
        });
      }

      // If tap-to-speak mode, close session after final execution
      if (this._mode === 'tap-to-speak') {
        this.stopListening();
      } else if (this.stateMachine.state === VoiceState.PROCESSING) {
        this.stateMachine.transition(VoiceState.LISTENING);
      }
    }
  }

  _handleRecognitionError(event) {
    console.warn('[LearnBridgeVoiceController] Recognition error event:', event.error);

    if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
      this._cleanupRecognition();
      this.stateMachine.transition(VoiceState.ERROR, { reason: 'PERMISSION_DENIED' });
      this._notify('permission_denied', {
        message: 'Microphone permission was denied. Click the microphone icon to grant access.'
      });
      return;
    }

    if (event.error === 'no-speech') {
      // Quiet timeout in tap-to-speak mode: transition to idle
      if (this._mode === 'tap-to-speak') {
        this.stopListening();
      }
      return;
    }

    this.stateMachine.transition(VoiceState.ERROR, { error: event.error });
    this._notify('error', { error: event.error });
  }

  _handleRecognitionEnd(sessionId) {
    if (sessionId !== this._activeSessionId) return;

    if (this._mode === 'continuous' && this.stateMachine.state === VoiceState.LISTENING && !this._isAcousticMuted) {
      // Controlled continuous restart with safe 600ms backoff
      setTimeout(() => {
        if (this._mode === 'continuous' && this.stateMachine.state === VoiceState.LISTENING && !this._isAcousticMuted) {
          try {
            if (this._recognition) this._recognition.start();
          } catch (_) {}
        }
      }, 600);
    } else if (this.stateMachine.state !== VoiceState.SPEAKING) {
      this.stateMachine.transition(VoiceState.IDLE);
      this._notify('idle');
    }
  }

  _startContinuousTimeout() {
    this._clearContinuousTimeout();
    // 60-second safety timeout on continuous listening to release microphone tracks
    this._continuousTimeoutTimer = setTimeout(() => {
      console.log('[LearnBridgeVoiceController] Continuous listening session timed out (60s).');
      if (this.speechOutput) {
        this.speechOutput.speak('Voice session paused to save power. Tap the microphone to listen again.');
      }
      this.stopListening();
    }, 60000);
  }

  _clearContinuousTimeout() {
    if (this._continuousTimeoutTimer) {
      clearTimeout(this._continuousTimeoutTimer);
      this._continuousTimeoutTimer = null;
    }
  }

  _cleanupRecognition() {
    if (this._recognition) {
      this._recognition.onstart = null;
      this._recognition.onresult = null;
      this._recognition.onerror = null;
      this._recognition.onend = null;
      try { this._recognition.abort(); } catch (_) {}
      this._recognition = null;
    }
  }

  _initDomHooks() {
    if (typeof window === 'undefined') return;

    // Keyboard trigger: Press 'v' or 'Alt+V' to toggle listening
    window.addEventListener('keydown', (e) => {
      // Do not trigger if typing inside a form field unless it is an explicit modifier shortcut
      const tag = (e.target && e.target.tagName) ? e.target.tagName.toLowerCase() : '';
      if ((tag === 'input' || tag === 'textarea') && !e.altKey) return;

      if ((e.key === 'v' || e.key === 'V') && !e.ctrlKey && !e.metaKey) {
        e.preventDefault();
        if (this.stateMachine.state === VoiceState.LISTENING) {
          this.stopListening();
        } else {
          this.startListening();
        }
      }
    });
  }

  destroy() {
    this.stopListening();
    this._cleanupRecognition();
    this.stateMachine.reset();
    this._listeners.clear();
  }
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { LearnBridgeVoiceController };
} else if (typeof window !== 'undefined') {
  window.LearnBridgeVoiceController = LearnBridgeVoiceController;
}

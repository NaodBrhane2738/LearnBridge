/**
 * LearnBridge Honest Language Capabilities Registry
 * Documents genuine browser and platform speech recognition & synthesis capabilities
 * per WCAG 2.2 and Digital Bridge Technical Guide Section 9 ("Built for Ethiopia").
 */

const LANGUAGE_CAPABILITIES = Object.freeze({
  en: {
    code: 'en-US',
    label: 'English',
    nativeLabel: 'English',
    sttSupport: {
      browserNative: true, // Chromium webkitSpeechRecognition has full en-US
      offlineAvailable: false,
      fidelityTier: 'tier-1-full'
    },
    ttsSupport: {
      browserNative: true, // Almost all OS have English TTS
      neuralBackend: true,
      audioRecordedFallback: true
    },
    dictationSupported: true
  },
  am: {
    code: 'am-ET',
    label: 'Amharic',
    nativeLabel: 'አማርኛ',
    sttSupport: {
      browserNative: true, // Supported in Chrome/Chromium when connected to internet
      offlineAvailable: false,
      fidelityTier: 'tier-2-cloud-dependent',
      notes: 'Requires active internet on Chrome for Cloud STT. Audio note fallback provided for offline.'
    },
    ttsSupport: {
      browserNative: false, // Rare on Android/Windows default installs
      neuralBackend: true, // Edge TTS / Python server fallback
      audioRecordedFallback: true // Pre-recorded UI prompts
    },
    dictationSupported: true
  },
  om: {
    code: 'om-ET',
    label: 'Afaan Oromoo',
    nativeLabel: 'Afaan Oromoo',
    sttSupport: {
      browserNative: false, // Chromium does not have an official om-ET speech recognition model
      fidelityTier: 'tier-3-intent-keyword-fallback',
      notes: 'Browser SpeechRecognition lacks native Afaan Oromoo model. Latin-script acoustic matching & keyword aliases used; audio note fallback available.'
    },
    ttsSupport: {
      browserNative: false,
      neuralBackend: false, // Edge TTS lacks om-ET neural voice
      audioRecordedFallback: true // Curated Ethiopian prompt fallbacks
    },
    dictationSupported: false
  },
  ti: {
    code: 'ti-ET',
    label: 'Tigrinya',
    nativeLabel: 'ትግርኛ',
    sttSupport: {
      browserNative: false, // Chromium lacks official ti-ET model
      fidelityTier: 'tier-3-intent-keyword-fallback',
      notes: 'Native browser speech recognition unavailable. Ge\'ez keyword intent recognition mapped; audio note fallback available.'
    },
    ttsSupport: {
      browserNative: false,
      neuralBackend: false,
      audioRecordedFallback: true
    },
    dictationSupported: false
  },
  so: {
    code: 'so-SO',
    label: 'Somali',
    nativeLabel: 'Af-Soomaali',
    sttSupport: {
      browserNative: true, // somali supported in some webkit speech models
      fidelityTier: 'tier-2-cloud-dependent'
    },
    ttsSupport: {
      browserNative: false,
      neuralBackend: true,
      audioRecordedFallback: true
    },
    dictationSupported: true
  }
});

class LanguageCapabilityManager {
  static getCapabilities(langCode = 'en') {
    const norm = (langCode || 'en').toLowerCase().split('-')[0];
    return LANGUAGE_CAPABILITIES[norm] || LANGUAGE_CAPABILITIES.en;
  }

  static isSTTSupported(langCode = 'en') {
    const cap = this.getCapabilities(langCode);
    return cap.sttSupport.browserNative;
  }

  static isTTSSupported(langCode = 'en') {
    const cap = this.getCapabilities(langCode);
    return cap.ttsSupport.browserNative || cap.ttsSupport.neuralBackend || cap.ttsSupport.audioRecordedFallback;
  }

  static getSupportedLanguages() {
    return Object.keys(LANGUAGE_CAPABILITIES).map(key => ({
      key,
      ...LANGUAGE_CAPABILITIES[key]
    }));
  }

  static getVoiceCodeForSpeech(langCode = 'en') {
    const cap = this.getCapabilities(langCode);
    return cap.code;
  }
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { LANGUAGE_CAPABILITIES, LanguageCapabilityManager };
} else if (typeof window !== 'undefined') {
  window.LANGUAGE_CAPABILITIES = LANGUAGE_CAPABILITIES;
  window.LanguageCapabilityManager = LanguageCapabilityManager;
}

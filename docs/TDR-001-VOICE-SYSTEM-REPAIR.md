# Technical Decision Record (TDR) 001: LearnBridge Voice Architecture Repair
**Status:** Approved  
**Date:** November 16, 2026  
**Author:** Principal Software Architect & Senior Speech Interface Engineer  
**Context:** Technical Revalidation of LB-AUDIT-VOICE-2026-V1 & Architectural Plan  

---

## 1. Technical Revalidation of Previous Audit Findings

Before writing code, each finding from the preliminary audit was empirically tested against the actual codebase and browser implementations:

### A. Correction: Web Audio `GainNode` Cannot Control Native Browser `SpeechRecognition`
- **Audit Claim:** The audit suggested placing a Web Audio API `GainNode` set to `0.0` on the microphone stream to prevent speech recognition from hearing speaker output.
- **Empirical Reality:** The W3C Web Speech API specification (`webkitSpeechRecognition`) does **not** accept a custom `MediaStream` or Web Audio `AudioNode` input. It interfaces directly with the browser's native audio capture subsystem.
- **Decision:** Acoustic isolation must be achieved through **strict state-machine half-duplex fencing**:
  1. The instant `speechOutput.speak()` is called, `voiceController` enters the `SPEAKING` state.
  2. Any audio or transcript event generated with a timestamp within the speech duration plus an acoustic decay buffer (400ms) is immediately dropped.
  3. Session identifiers (`sessionId`) are rotated on every listening session to invalidate stale callbacks.

### B. Accurate Browser Compatibility & Recognition Providers
- **Audit Claim:** Recommended immediate integration of client-side Vosk or Whisper WASM.
- **Empirical Reality:** Bundling a 40MB–150MB WASM model on a 3G mobile connection in Ethiopia violates Section 3 and Section 9 of the Digital Bridge Hackathon Technical Guide (*"Aim for under 500 KB on first load... host page is already heavy on 3G"*).
- **Decision:**
  - Build a modular **`SpeechRecognitionProvider`** interface.
  - Implement a hardened `BrowserSpeechRecognitionProvider` for Chromium environments.
  - Implement a `MockSpeechRecognitionProvider` for deterministic headless and automated CI/CD testing.
  - Provide clear, accessible user messaging and keyboard fallbacks when running on unsupported browsers (Firefox/Safari) rather than failing silently or crashing.

### C. Language Capabilities Honesty
- **Audit Finding Confirmed:** Browser Web Speech API (`webkitSpeechRecognition`) supports `en-US` and `am-ET` (cloud-assisted in Chrome). However, `om-ET` (Afaan Oromoo) and `ti-ET` (Tigrinya) are not natively recognized by browser vendors.
- **Decision:**
  - Create a formal `LanguageCapabilitiesRegistry`.
  - Disclose actual support per language:
    - English: Full STT & TTS.
    - Amharic: Cloud STT (Chrome/Edge), Local/Neural TTS.
    - Afaan Oromoo: Voice note fallback (`MediaRecorder`) as specified in Hackathon Guide §5; do not substitute Somali neural voice without disclosure.
    - Tigrinya: Voice note fallback; do not disguise Amharic voice as native Tigrinya.

### D. Multi-Engine Fragmentation & Iframe Muting
- **Audit Finding Confirmed:** Parent LMS (`alx-test-website`) and embedded Job Portal (`employment/`) both ran independent `webkitSpeechRecognition` instances, fighting for microphone access.
- **Decision:**
  - Only the top-level parent window (`window.top`) will own microphone capture.
  - The embedded Job Portal iframe detects `window.self !== window.top` and completely silences its own microphone capture.
  - Communication is routed through `LearnBridgeVoiceBridge` using structured `postMessage` with origin and allowlist validation.

### E. Consequential Operations & Accidental Login
- **Audit Finding Confirmed:** Spoken prompt *"Say 'Log in'"* triggered auto-login because the speech parser loosely checked `text.includes('login')` and immediately called `performLoginWithCredentials()`.
- **Decision:**
  - All consequential actions (login, applying for a job, deleting data) require explicit confirmation (`CONFIRM_ACTION` / `CANCEL_ACTION`).
  - Spoken words like "login" can navigate to the login page or focus inputs, but will **never** submit authentication without separate user verification.

---

## 2. Target Component Architecture

```
                    ┌───────────────────────────────────┐
                    │    LearnBridgeVoiceController     │
                    │  (State Machine, Mic Lifecycle)   │
                    └─────────────────┬─────────────────┘
                                      │
              ┌───────────────────────┴───────────────────────┐
              ▼                                               ▼
┌───────────────────────────┐                   ┌───────────────────────────┐
│ LearnBridgeCommandRegistry│                   │  LearnBridgeSpeechOutput  │
│(Intent Matcher, Confirms, │                   │ (Priority Queue, Half-    │
│ Form Dictation)           │                   │  Duplex Fencing, ARIA)    │
└─────────────┬─────────────┘                   └─────────────▲─────────────┘
              │                                               │
              ▼                                               │
┌───────────────────────────┐                                 │
│  LearnBridgeVoiceBridge   │─────────────────────────────────┘
│  (Cross-Frame postMessage)│
└───────────────────────────┘
```

Ready for implementation.

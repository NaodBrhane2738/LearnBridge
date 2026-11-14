# LearnBridge — ALX Savanna Integration Guide

## 1. Executive Summary for Platform Engineers

LearnBridge was engineered specifically to integrate into **ALX Savanna** (and related ALX learning platforms) without framework lock-in.

Because LearnBridge components are built upon standard **W3C Custom Elements v1 and Shadow DOM**, the ALX Savanna team does **not** need to install React, Vue, or build-step dependencies to use them. Whether Savanna is rendered via Next.js, standard SSR Django/Rails templates, or a client-side SPA, LearnBridge components drop in as native HTML tags.

A standalone demonstration sandbox is available for live testing at:
`http://127.0.0.1:4173/savanna-embed-demo.html`

---

## 2. Quick-Start Integration (3 Steps)

### Step 1: Include the Master Distribution Bundle
In Savanna's master layout template or module entrypoint:
```html
<script type="module" src="https://cdn.alx-ethiopia.org/learnbridge/dist/learnbridge.js"></script>
```

### Step 2: Place Components in Your Lesson Layout
```html
<div class="savanna-lesson-container">
  <!-- 1. The Accessible Player -->
  <learnbridge-player 
    id="savannaPlayer"
    src="/media/lessons/inclusive-design.mp4"
    audio-description="/media/lessons/inclusive-design-ad.mp3"
    captions-en="/media/lessons/captions-en.vtt"
    captions-am="/media/lessons/captions-am.vtt"
    poster="/media/lessons/poster.jpg">
  </learnbridge-player>

  <!-- 2. The Synchronized Transcript -->
  <learnbridge-transcript 
    id="savannaTranscript"
    language="en">
  </learnbridge-transcript>

  <!-- 3. Accessible Opportunity Cards -->
  <learnbridge-job-card
    role-title="Junior Accessibility QA Engineer"
    organization="Ethio Telecom & ALX Partners"
    location="Addis Ababa, Ethiopia (Hybrid)"
    salary-estimate="ETB 18,000 - 24,000 / month"
    summary-text="Help test and verify accessible software for millions of learners across Ethiopia. Requires familiarity with WCAG 2.2 and screen readers."
    audio-summary="This opportunity is for a Junior Accessibility QA Engineer with Ethio Telecom and ALX Partners in Addis Ababa. You will test inclusive software with screen readers.">
  </learnbridge-job-card>

  <!-- 4. Verified Credential Badge -->
  <learnbridge-certificate
    recipient="Abebe Bikila"
    course-title="Inclusive Design & Accessible Learning Systems"
    completion-date="November 2026"
    cert-id="ALX-LB-2026-9481">
  </learnbridge-certificate>
</div>
```

### Step 3: Wire Timeline & Language Synchronization (Optional 5-Line Glue)
To synchronize playback between `<learnbridge-player>` and `<learnbridge-transcript>`:
```javascript
const player = document.querySelector('#savannaPlayer');
const transcript = document.querySelector('#savannaTranscript');

// Sync transcript when video plays
player.addEventListener('timeupdate', (e) => {
  transcript.setTime(e.detail.time);
});

// Seek player when user clicks a transcript line
transcript.addEventListener('lb-seek-request', (e) => {
  player.currentTime = e.detail.time;
});

// Sync caption language when user toggles transcript between EN / አማ
transcript.addEventListener('lb-language-change', (e) => {
  player.setCaptionLanguage(e.detail.language);
});
```

---

## 3. Web Component API Reference

### `<learnbridge-player>`
- **Attributes:**
  - `src` (String): URL of the video file.
  - `audio-description` (String): URL of the secondary audio description MP3.
  - `captions-en` (String): URL of the English WebVTT track.
  - `captions-am` (String): URL of the Amharic WebVTT track.
  - `poster` (String): URL of the video poster thumbnail.
- **Methods:**
  - `play()`: Promise resolving when playback starts.
  - `pause()`: Pauses primary video and audio description.
  - `seek(seconds)`: Seeks to a specific timestamp.
  - `setCaptionLanguage('en' | 'am')`: Switches active captions.
  - `setHighContrast(Boolean)`: Toggles solid black-and-yellow caption styling.
  - `setCaptionScale(Number)`: Scales caption font size (1.0 to 1.5).
- **Events Dispatched:**
  - `timeupdate` (`e.detail: { time, duration }`): Real-time playback timestamp.
  - `play`, `pause`, `ended`: Standard media events.

### `<learnbridge-transcript>`
- **Attributes:**
  - `language` (`'en'` | `'am'`): Active display language.
  - `current-time` (Number): Current media timestamp in seconds.
- **Properties:**
  - `segments` (Array): Array of cue objects `[{ start, end, en, am }]`.
- **Methods:**
  - `setTime(seconds)`: Highlights the active cue and auto-scrolls into view.
  - `setLanguage('en' | 'am')`: Updates text language and toggle button state.
  - `filter(query)`: Searches through cues and updates screen-reader match count.
- **Events Dispatched:**
  - `lb-seek-request` (`e.detail: { time, index, segment }`): Emitted when a cue is clicked or activated via Enter/Space.
  - `lb-language-change` (`e.detail: { language }`): Emitted when the user toggles between English and Amharic.

### `<learnbridge-interpreter>`
- **Attributes:**
  - `visible` (Boolean): Viewport visibility.
  - `position` (`'top-right'` | `'bottom-right'` | `'bottom-left'` | `'top-left'`): Active corner dock.
- **Methods:**
  - `dock(position)`: Relocates viewport to one of four corners without dragging.
  - `cyclePosition()`: Steps to the next available corner.
  - `setScale(factor)`: Adjusts window scaling (1.0x, 1.25x, 1.5x).
- **Events Dispatched:**
  - `lb-dock-change` (`e.detail: { position }`): Emitted on relocation.

---

## 4. Host Platform Security & Sandboxing

1. **Content Security Policy (CSP):**
   - LearnBridge components execute safely within strict CSP environments.
   - Required directives: `script-src 'self' 'unsafe-inline' (or nonce)`, `media-src 'self' blob: data:`, `style-src 'self' 'unsafe-inline'`.
2. **Local Storage Scoping:**
   - Saved notes and bookmarks use a namespaced key (`learnbridge-*`) so they never conflict with Savanna platform session cookies or storage.
3. **Clipboard API Safety:**
   - Credential code copying utilizes `navigator.clipboard.writeText()` with a fallback to `document.execCommand('copy')` if running in constrained iframe contexts.

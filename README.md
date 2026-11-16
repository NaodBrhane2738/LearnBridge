# LearnBridge — Accessible Learning Without Barriers

[![Live Vercel Deployment](https://img.shields.io/badge/Live%20Deployment-learn--bridge--786j.vercel.app-blue?style=for-the-badge&logo=vercel)](https://learn-bridge-786j.vercel.app/)
[![WCAG 2.2 AA Verified](https://img.shields.io/badge/Accessibility-WCAG%202.2%20AA%20Verified-brightgreen)](#accessibility-audit--qa-status)
[![Axe-Core Violations](https://img.shields.io/badge/Axe--Core%20Violations-0-success)](#automated-testing-results)
[![Browsers Supported](https://img.shields.io/badge/Browsers-Chromium%20%7C%20Firefox%20%7C%20WebKit-blue)](#automated-testing-results)
[![Platform Embed](https://img.shields.io/badge/Platform-ALX%20Savanna%20Ready-emerald)](#savanna-platform-integration)

> 🚀 **Live Production Link:** [https://learn-bridge-786j.vercel.app/](https://learn-bridge-786j.vercel.app/)

**LearnBridge** is an accessibility-first educational learning media and content platform developed for the **ALX Ethiopia Digital Bridge Hackathon (Track 2: Accessible Learning Media)**. 

Designed to seamlessly extend the existing **ALX Savanna** web platform, LearnBridge eliminates structural barriers that exclude learners—specifically supporting Deaf and hard-of-hearing learners, blind and low-vision learners, motor-impaired learners, and learners facing unstable internet connectivity across Ethiopia.

---

## 🌟 Key Features

1. **Cinematic Glassmorphism for Accessibility:**
   - Designed to match the living-room reference composition (`assets/living-room-bg.webp`) with deep emerald glass panels (`#0b3e3b`), luminous seafoam (`#85d7bb`), and chartreuse accents (`#c5f18e`).
   - High-contrast visual backings guarantee text contrast exceeding 12:1, far above WCAG AA requirements.
2. **Framework-Free Web Components (Custom Elements v1 & Shadow DOM):**
   - Packaged and exported via `dist/learnbridge.js` with zero dependencies on React, Vue, or bundlers.
   - Drop-in embeddable directly into ALX Savanna templates.
3. **Dual-Track Bilingual Captions (English / Amharic):**
   - Real-time WebVTT caption engine with in-app High-Contrast Mode (solid `#000000` with `#ffff00` text) and dynamic font scaling (100% to 150%).
4. **Synchronized Secondary Audio Description:**
   - Dedicated narrative audio track (`media/audio-description.mp3`) describing on-screen diagrams, synchronized frame-by-frame with the primary video.
5. **Interactive Synchronized Transcript:**
   - Bilingual transcript with click-to-seek, keyboard activation, and real-time search with screen-reader match announcements (`aria-live="polite"`).
6. **Non-Drag Ethiopian Sign Language (ESL) Viewport:**
   - Dedicated picture-in-picture viewport featuring 4-corner non-drag repositioning buttons (`top-right`, `bottom-right`, `bottom-left`, `top-left`) and 3-step scaling, fully adhering to WCAG 2.2 Guideline 2.5.7.
7. **Accessible Career & Opportunity Cards:**
   - Integrated Web Speech API audio summary synthesis allowing learners to hear job details read aloud.
8. **Simulated Cryptographic Certificate Verification:**
   - Credential verification modal displaying SHA-256 integrity hash, verifiable course data, and one-click code copying via Clipboard API.
9. **Offline Learning Pack & Service Worker:**
   - Dual-cache Service Worker (`sw.js`) pre-caching application shell and caching full lesson packages on-demand for offline study in low-connectivity areas.

---

## 🚀 Quick Start: Running Locally

Because LearnBridge utilizes Service Workers and ES Module Web Components, serve the directory over localhost:

### Windows PowerShell / Terminal:
```powershell
Set-Location "D:\LearnBridge"
python -m http.server 4173 --bind 127.0.0.1
```

Open your browser to:
- **Main Experience:** `http://127.0.0.1:4173/index.html`
- **Savanna Integration Sandbox:** `http://127.0.0.1:4173/savanna-embed-demo.html`
- **Player Lab:** `http://127.0.0.1:4173/player-lab.html`

---

## 🧩 Web Components Architecture

LearnBridge exports standard Custom Elements from `dist/learnbridge.js`:

| Custom Element | Tag Name | Documentation |
|---|---|---|
| `LearnBridgePlayer` | `<learnbridge-player>` | Accessible video engine with dual captions & AD sync |
| `LearnBridgeTranscript` | `<learnbridge-transcript>` | Bilingual searchable transcript with click-to-seek |
| `LearnBridgeInterpreter` | `<learnbridge-interpreter>` | Non-drag 4-corner docking ESL viewport |
| `LearnBridgeJobCard` | `<learnbridge-job-card>` | Career card with Web Speech API audio summaries |
| `LearnBridgeCertificate` | `<learnbridge-certificate>` | Verified credential card with modal verification dialog |
| `LearnBridgeResourceList` | `<learnbridge-resource-list>` | Tagged accessible documents with in-app modal preview |

### Embedding in ALX Savanna:
```html
<script type="module" src="./dist/learnbridge.js"></script>

<learnbridge-player 
  src="./media/sample-lesson.mp4" 
  audio-description="./media/audio-description.mp3"
  captions-en="./media/captions-en.vtt" 
  captions-am="./media/captions-am.vtt">
</learnbridge-player>

<learnbridge-transcript language="en"></learnbridge-transcript>
```

---

## ♿ Keyboard Navigation & Shortcuts

| Key | Action |
|---|---|
| `Space` or `K` | Toggle Play / Pause |
| `ArrowLeft` / `ArrowRight` | Seek backward / forward 5 seconds |
| `J` / `L` | Seek backward / forward 10 seconds |
| `C` | Toggle Bilingual Captions (English / Amharic) |
| `D` | Toggle Synchronized Audio Description |
| `H` | Toggle Ethiopian Sign Language window |
| `M` | Toggle Mute |
| `F` | Toggle Fullscreen |
| `/` | Quick-focus Transcript Search Input |
| `Tab` / `Shift + Tab` | Navigate interactive controls with high-contrast focus rings |

---

## 🧪 Automated Testing & QA Results

LearnBridge features a comprehensive automated testing suite built with **Playwright Test** and **@axe-core/playwright**:

```powershell
$env:PLAYWRIGHT_BROWSERS_PATH = "D:\LearnBridge\tools\playwright-browsers"
Push-Location "D:\LearnBridge\qa-toolkit"
& "D:\LearnBridge\tools\nodejs\npx.cmd" playwright test learnbridge-qa.spec.js --reporter=list
```

### Verified Test Matrix:
- **39 / 39 Automated Tests Passing** across **Chromium**, **Mozilla Firefox**, and **WebKit** (Apple Safari).
- **0 Critical / Serious Axe-Core Violations** against WCAG 2.0, 2.1, and 2.2 AA rulesets.
- Full verification of all 19 functional user journeys defined in the Master Product Brief.

---

## 📚 Documentation Suite

Full technical guides are available in `docs/`:

1. [Architecture & Component Model](docs/ARCHITECTURE.md)
2. [Design System & Tokens](docs/DESIGN-SYSTEM.md)
3. [ALX Savanna Integration Guide](docs/SAVANNA-INTEGRATION.md)
4. [Accessibility & Testing Guide](docs/ACCESSIBILITY.md)
5. [Media Assets & Sign Language Guide](docs/MEDIA-ASSETS.md)
6. [Automated QA Report](docs/QA-REPORT.md)

---

## ⚖️ Ethical Notice: Ethiopian Sign Language Footage

In strict compliance with accessibility ethics, **no fake, AI-synthesized, or generic non-Ethiopian sign language footage is used**. The interpreter window currently displays a clear, honest disclaimer explaining that certified Ethiopian Sign Language interpreters will be recorded for production deployment. Step-by-step instructions for recording and dropping in production ESL footage are detailed in [docs/MEDIA-ASSETS.md](docs/MEDIA-ASSETS.md).

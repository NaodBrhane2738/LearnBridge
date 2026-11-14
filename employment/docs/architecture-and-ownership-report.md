# LearnBridge Employment — Architecture and Ownership Report
**Phase 0 Output**
**Author:** Employment Platform Lead (Senior Full-Stack & Accessibility Architect)
**Date:** November 14, 2026

---

## 1. Executive Summary & Repository Context

LearnBridge is an accessibility-first educational and career enablement ecosystem built for Ethiopian learners, job seekers, and recruiters, with extension to international remote opportunities.

In accordance with the Master Implementation Directive:
- **Parallel Workstream Isolation:** A parallel developer is working on the **Learning Platform** (media player, video engine, transcript, notes, speech recognition, and course curriculum in the root directory).
- **Exclusive Ownership:** We are exclusively responsible for the **Employment / Job Finder Platform**.
- **Non-Destructive Guarantee:** Zero modification to Learning files (`index.html`, `js/*`, `css/*`, `assets/*`). Zero breaking changes to shared infrastructure.
- **Dedicated Directory:** All Employment code, UI, API services, data stores, tests, accessibility modules, and localization assets reside within the isolated `employment/` directory.

---

## 2. Git Status & Worktree Isolation Verification

1. **Repository Root:** `D:\CODING\Savannah's`
2. **Current Branch on Root:** `main` (clean, up to date with `origin/main`).
3. **Dedicated Worktree Created:**
   - **Path:** `D:\CODING\Savannah-Employment`
   - **Branch:** `feat/employment-platform`
   - **Base:** `main` (commit `04d2497`)
4. **Shared Directory Protection:** The root repository branch remains untouched on `main`, ensuring no interference with the parallel developer's active branch or working tree.
5. **Existing Employment Assets:** Prior to this work, no native Employment files existed in `D:\CODING\Savannah's`. Early demo exploration evidence files (`evidence/` and `e2e-summary.json`) were preserved and inspected for context.

---

## 3. Ownership Manifest

### Owned Exclusively by the Employment Platform Team:
- `employment/components/` — Modular accessible UI components (JobCard, FilterDrawer, TTSController, SignLanguageOverlay, ApplicationWizard, CVParserReviewModal, QuickApplyDialog, EmployerPostingForm, ATSApplicantRow, AdminVerificationCard).
- `employment/pages/` — Modular view controllers (DashboardPage, SearchPage, JobDetailPage, CandidateProfilePage, ApplicationsTrackerPage, EmployerDashboardPage, AdminVerificationPage).
- `employment/layouts/` — Shell, Navigation Header, Accessibility Toolbar, Skip Links, ARIA Live Announcers.
- `employment/services/` — Business logic (JobSearchEngine, RecommendationsEngine, CVParserService, ExternalJobAdapter, DeduplicationService, AccommodationsMatcher, ApplicationService, EmployerVerificationService).
- `employment/api/` — API routes, schemas, and Express routers (`employment/api/routes.js`, `employment/api/openapi.json`).
- `employment/data/` — Seed data stores (curated Ethiopian & international jobs, verified employers, sign language assets, taxonomy).
- `employment/accessibility/` — Experience controllers (BlindModeController, DeafModeController, StandardModeController, WebSpeechTTS, VoiceAccessManager, FocusManager).
- `employment/localization/` — 5-language dictionaries (`en.json`, `am.json`, `om.json`, `ti.json`, `so.json`).
- `employment/tests/` — Automated test suite (`api.test.js`, `search.test.js`, `accessibility.test.js`, `cv-parser.test.js`).
- `employment/docs/` — Documentation (`architecture-and-ownership-report.md`, `integration-requirements.md`, `user-guide.md`).
- `employment/index.html` — The standalone, complete Employment Platform application.

### NOT Owned (Unmodified and Preserved):
- `index.html` (Learning Media Player application)
- `js/app.js`, `js/audio-engine.js`, `js/braille-engine.js`, `js/course-data.js`, `js/descriptions.js`, `js/notes.js`, `js/profile-selector.js`, `js/sign-language.js`, `js/speech-engine.js`, `js/switch-access.js`, `js/transcript.js`, `js/video-engine.js`, `js/voice-access.js`
- `css/player.css`, `css/theme.css`, `css/accessibility.css`
- `assets/*`
- Root package manifests (`package.json`, `package-lock.json`)

---

## 4. Architectural Design & Afriwork Inspiration

Afriwork (`https://afriworket.com/jobs`) provides the conceptual benchmark for Ethiopian job discovery: rapid keyword search, location filtering (Addis Ababa + regional capitals), telegram/quick contact integration, transparent compensation, and category taxonomy.

LearnBridge Employment elevates this foundation into an ultra-accessible, international-grade recruitment platform:
1. **Three Interaction Modes:** Blind-accessible (screen-reader semantic HTML, contextual guided Web Speech TTS, voice dictation, audio job summaries), Deaf-accessible (visual-first, video ETSL sign language overlay, synchronized captions, visible event banners), and Standard Mode.
2. **Ethical Accessibility Separation:** Private interface settings (TTS volume, font sizes) are strictly kept private; only candidate-authored workplace accommodation requests are optionally shared with employers.
3. **Inclusive Matching:** Accommodation requirements are never used to disqualify or penalize candidates. Missing accommodation data is clearly labeled "To Be Confirmed" rather than "Inaccessible".
4. **Multi-Source Job Pipeline:** Supports employer postings, verified admin postings, and authorized third-party job API adapters with automated deduplication and expiry detection.
5. **5 Ethiopian Priority Languages:** English, Amharic (አማርኛ), Afaan Oromo, Tigrinya (ትግርኛ), and Somali (Af-Soomaali).

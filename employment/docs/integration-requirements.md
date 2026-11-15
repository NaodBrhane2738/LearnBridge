# LearnBridge Employment — Integration Requirements & Shared Contracts
**Module:** `employment/`
**Target Audience:** Project Coordinator, Learning Platform Lead, Shared Architecture Team
**Document Status:** Official Proposal (Zero Direct Changes Made to Global Files)

---

## 1. Executive Summary

This document specifies the integration requirements, shared contracts, and non-invasive mount points between the **LearnBridge Employment Platform** and the core **LearnBridge Shared Infrastructure**.

To safeguard the parallel work of the Learning Platform developer, **zero shared files have been directly modified**. All proposed touchpoints are encapsulated below with explicit code snippets, schema definitions, and migration paths so the project coordinator can merge them cleanly.

---

## 2. Navigation & Shell Integration

### Current State
The shared application shell in `index.html` features a floating left dock (`.dock-floating-nav`) with buttons:
- Home (`#btn-dock-home`)
- Courses & Media (`#btn-dock-courses`)
- Saved & Favorites (`#btn-dock-favorites`)
- Watch History (`#btn-dock-history`)
- Settings & Preferences (`#btn-settings`)

### Proposed Navigation Touchpoint
Add an Employment/Careers navigation trigger between Watch History and Settings:

```html
<!-- Proposed addition to .dock-floating-nav in index.html -->
<a href="employment/index.html" class="dock-btn" id="btn-dock-employment" aria-label="Careers & Job Finder (LearnBridge Employment)" title="Careers & Jobs">
  <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
    <rect x="2" y="7" width="20" height="14" rx="2" ry="2"/>
    <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/>
  </svg>
</a>
```

This can be opened in-frame as a view swap or linked directly to `employment/index.html`.

---

## 3. Required Route Registration (Express API Server)

### Current State
The backend server (`server/server.js`) mounts core routes under `/api/v1/`:
- `/api/v1/health`
- `/api/v1/localization`
- `/api/v1/accessibility`
- `/api/v1/integrations`

### Proposed Server Integration
The Employment router is fully self-contained in `employment/api/routes.js`. To mount it, the coordinator needs only to add a single line to `server/server.js`:

```javascript
// In server/server.js
const employmentRouter = require('../employment/api/routes');
app.use('/api/v1/employment', employmentRouter);
```

All Employment endpoints will be served cleanly under `/api/v1/employment/*` with zero namespace clashes.

---

## 4. Accessibility Profile Fields Consumed & Separated

### Consumed Global Interface Preferences (Read-Only)
The Employment platform respects user interface preferences saved globally:
- `preferredLanguage`: `'en' | 'am' | 'om' | 'ti' | 'so'`
- `highContrast`: `boolean`
- `fontSizeMultiplier`: `number` (e.g. `1.0`, `1.25`)
- `screenReaderMode`: `boolean`
- `signLanguageWindow`: `boolean`
- `reduceMotion`: `boolean`

### STRICT DATA SEPARATION: Interface Preferences vs. Accommodations
1. **Private Interface Preferences:** Stored in the candidate's private session (`localStorage.getItem('lb_a11y_prefs')` or `GET /api/v1/accessibility/preferences`).
   **CRITICAL RULE:** These settings are NEVER exposed to employers or recruiters, and never serialized into candidate applications.
2. **Employer-Facing Accommodations Object:** A separate, voluntary, candidate-authored profile object:
   ```json
   {
     "shareAccommodationsWithEmployers": true,
     "preferredInterviewFormat": "video_with_interpreter", // or 'remote_text', 'phone', 'standard'
     "accommodationsRequested": [
       "Ethiopian Sign Language (ETSL) interpreter for interview",
       "Screen-reader compatible digital assessment forms",
       "Captions for virtual onboarding sessions"
     ],
     "assistiveTechnologyUsed": [
       "NVDA screen reader",
       "High-contrast display"
     ],
     "candidateNotes": "Candidate can review, edit, or withdraw these shared notes at any time prior to or following application submission."
   }
   ```

---

## 5. Localization Interface Consumed

### Unified 5-Language Dictionary Format
Employment localization strings follow the exact JSON key-value format established by LearnBridge:
- Languages: English (`en`), Amharic (`am`), Afaan Oromoo (`om`), Tigrinya (`ti`), Somali (`so`).
- Employment translation dictionaries are maintained in `employment/localization/*.json`.
- The coordinator can either keep them modularly in `employment/localization/` or merge the `"employment"` namespace into `server/data/translations.json`:
  ```json
  {
    "en": {
      "employment": { ... }
    },
    "am": {
      "employment": { ... }
    }
  }
  ```

---

## 6. Authentication Assumptions & Security Isolation

1. **Candidate Identity:** Uses session bearer token or `x-candidate-id` header (default fallback to active user `ethio-candidate-01`).
2. **Employer Identity:** Authenticated via `x-employer-id` and role verification (`role: 'employer' | 'admin'`).
3. **Admin Identity:** Authenticated via `x-admin-token` for vacancy verification, scam moderation, and employer vetting.
4. **Data Isolation:** Candidates can only access and modify their own applications, resumes, and saved jobs. Employers can only view applications submitted to vacancies they own.

---

## 7. Database Integration Dependencies & Schemas

The Employment platform uses a cleanly abstracted repository pattern (`employment/services/db.js`):
- In development/standalone mode: File-backed persistent JSON store under `employment/data/` (or in-memory cache with disk sync).
- In production/monolith mode: Can map directly to Prisma, Mongoose, or PostgreSQL models.

### Employment Schemas:
1. `JobVacancy`: id, title, employerId, employerName, verifiedEmployer, location, region, isRemote, remoteEligibility, employmentType, experienceLevel, salaryMin, salaryMax, currency, salaryDisclosed, description, responsibilities, requirements, skills, education, languages, deadline, workplaceAccommodations, source, originalUrl, isExpired, createdAt.
2. `CandidateProfile`: id, userId, fullName, email, phone, location, summary, skills, experience, education, languages, resumes, savedJobIds, alerts, accommodationsProfile.
3. `JobApplication`: id, jobId, candidateId, candidateName, candidateEmail, resumeId, coverNote, employerAnswers, accommodationsSnapshot, status ('applied' | 'reviewing' | 'shortlisted' | 'interview' | 'offer' | 'rejected' | 'withdrawn'), timeline, createdAt, updatedAt.
4. `EmployerProfile`: id, companyName, registrationNumber, website, industry, location, verificationStatus ('pending' | 'verified' | 'rejected' | 'suspended'), verificationEvidence, contactEmail, createdAt.
5. `JobReport`: id, jobId, reportedBy, reason, details, status ('pending' | 'resolved' | 'dismissed'), createdAt.
6. `SignLanguageResource`: id, languageCode ('etsl' | 'asl_variant'), title, targetJobCategory, videoUrl, transcript, verifiedBy, status ('official' | 'demo' | 'placeholder').

---

## 8. Summary of Zero-Touch Compliance

| Shared Subsystem | Status | Action Required from Coordinator |
|---|---|---|
| `index.html` (Learning App) | UNTOUCHED | Add optional dock icon or header link to `employment/index.html` |
| `js/*` (Learning Engines) | UNTOUCHED | None. Complete isolation maintained. |
| `css/*` (Learning Styles) | UNTOUCHED | None. Employment maintains scoped design system. |
| `server/server.js` | UNTOUCHED | Add `app.use('/api/v1/employment', employmentRouter)` |
| `package.json` | UNTOUCHED | Zero new mandatory dependencies required (runs on built-in Node.js / Express). |

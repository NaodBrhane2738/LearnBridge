# LearnBridge — Technical Architecture & Component Model

## 1. System Overview

**LearnBridge** is an accessibility-first educational learning media platform designed to extend the existing **ALX Savanna** web platform. It delivers an inclusive, barrier-free learning experience tailored for diverse learning modalities—particularly Deaf and hard-of-hearing learners, blind and low-vision learners, motor-impaired learners, and learners operating in bandwidth-constrained environments in Ethiopia.

Rather than relying on heavy monolithic client frameworks (such as React, Vue, or Angular), LearnBridge is engineered as a collection of **standards-based, dependency-free Web Components (Custom Elements v1 with Shadow DOM encapsulation)**. This guarantees:
1. **Zero-friction embedding:** Can be embedded into any host platform (Savanna, Next.js, Django, WordPress, or vanilla HTML) with a single `<script type="module">` tag.
2. **Style isolation:** Shadow DOM boundaries prevent host CSS leakage into media controls, captions, or assistive viewports, while exposing CSS custom properties for brand theming.
3. **Progressive enhancement:** Core semantic media controls function even if JavaScript is partially restricted or offline.

---

## 2. Component Inventory & Exports

The library is distributed via `D:\LearnBridge\dist\learnbridge.js`, which exports all registered Custom Elements:

| Custom Element | Tag Name | Shadow DOM | Primary Responsibilities |
|---|---|---|---|
| `LearnBridgePlayer` | `<learnbridge-player>` | Open | Main media canvas, Video.js 10 foundation, dual-track captions, secondary audio description sync, and embedded interpreter viewport. |
| `LearnBridgeTranscript` | `<learnbridge-transcript>` | Open | Synchronized bilingual transcript (EN/AM), real-time search with match announcement (`aria-live="polite"`), and click-to-seek navigation. |
| `LearnBridgeInterpreter` | `<learnbridge-interpreter>` | Open | Floating Ethiopian Sign Language viewport with 4-corner non-drag keyboard repositioning (`top-right`, `bottom-right`, `bottom-left`, `top-left`) and 3-step scaling. |
| `LearnBridgeJobCard` | `<learnbridge-job-card>` | Open | Accessible career opportunity presentation with Web Speech API audio summary synthesis, bookmarking, and requirements checklist. |
| `LearnBridgeCertificate` | `<learnbridge-certificate>` | Open | Verified credential badge, simulated cryptographic SHA-256 verification modal, and one-click copyable verification code with clipboard API. |
| `LearnBridgeResourceList` | `<learnbridge-resource-list>` | Open | Categorized accessible learning documents, screen-reader download metadata, and in-app modal preview with diagram text alternatives. |

---

## 3. Component Interaction & Event Bus Contract

Components communicate through standard DOM Custom Events with `bubbles: true` and `composed: true` (crossing Shadow DOM boundaries):

```
+-----------------------------------------------------------------------------------+
|                                Host Page / Shell                                  |
|                                                                                   |
|   +--------------------------+                   +----------------------------+   |
|   |   <learnbridge-player>   |                   |  <learnbridge-transcript>  |   |
|   |                          |                   |                            |   |
|   |   - Video.js 10 Engine   |                   |   - Synchronized Cues      |   |
|   |   - Audio Description    |                   |   - Bilingual (EN/AM)      |   |
|   |   - Captions Overlay     |                   |   - Live Text Search       |   |
|   +------------+-------------+                   +-------------+--------------+   |
|                |                                               |                  |
|                |  timeupdate (e.detail.time)                   |                  |
|                +---------------------------------------------->+                  |
|                |                                               |                  |
|                |  lb-seek-request { time: 8.3 }                |                  |
|                +<----------------------------------------------+                  |
|                |                                                                  |
|                |                                 +----------------------------+   |
|                |                                 | <learnbridge-interpreter>  |   |
|                |                                 |                            |   |
|                |  lb-dock-change { position }    |   - Floating Viewport      |   |
|                +<--------------------------------+   - 4 Discrete Corners     |   |
|                                                  |   - Non-Drag Re-docking    |   |
|                                                  +----------------------------+   |
+-----------------------------------------------------------------------------------+
```

### Event Specification Table

| Event Name | Dispatcher | Detail Payload | Description |
|---|---|---|---|
| `lb-seek-request` | `<learnbridge-transcript>`, chapter rows | `{ time: Number, index: Number, segment: Object }` | Requests the media player to seek to a specific timestamp. |
| `lb-language-change` | `<learnbridge-transcript>`, settings dialog | `{ language: 'en' \| 'am' }` | Synchronizes active caption track and transcript language across components. |
| `lb-dock-change` | `<learnbridge-interpreter>` | `{ position: 'top-right' \| 'bottom-right' \| 'bottom-left' \| 'top-left' }` | Notifies container of interpreter position change to avoid obscuring critical content. |
| `lb-audio-summary-start` | `<learnbridge-job-card>` | `{ role: String, text: String }` | Dispatched when Web Speech API begins synthesizing the job summary. |
| `lb-audio-summary-stop` | `<learnbridge-job-card>` | `{ role: String }` | Dispatched when speech synthesis completes or is paused. |
| `lb-save-toggle` | `<learnbridge-job-card>` | `{ saved: Boolean, roleTitle: String }` | Emitted when user bookmarks or removes a career opportunity. |
| `lb-verify-request` | `<learnbridge-certificate>` | `{ certId: String, recipient: String }` | Triggers simulated credential verification modal and cryptographic audit hash. |

---

## 4. Media Synchronization & Dual-Track Audio Architecture

LearnBridge couples multiple media tracks without requiring expensive server-side transcoding:

1. **Primary Video Track:** Standards-compliant MP4/H.264 video with AAC stereo audio.
2. **Synchronized Secondary Audio Description (`./media/audio-description.mp3`):**
   - Implemented via a synchronized secondary `Audio` instance.
   - When the user activates Audio Description (key `D` or AD button), the secondary track aligns its `currentTime` with the primary video and locks play/pause state.
   - Volume and mute states are bound proportionally to prevent speech masking.
3. **Bilingual Dual WebVTT Captions (`captions-en.vtt`, `captions-am.vtt`):**
   - High-contrast, scalable text overlay rendered directly into the DOM above the video stage.
   - Fully decoupled from native browser caption styling so users can dynamically scale captions up to 150% and activate high-contrast yellow-on-black rendering without breaking presentation.
4. **Ethiopian Sign Language Viewport:**
   - Dedicated picture-in-picture viewport rendered within the video container or popped out.
   - Includes discrete, non-drag repositioning buttons for motor accessibility (WCAG 2.2 Guideline 2.5.7 Dragging Movements).

---

## 5. Offline Caching & Progressive Web App Strategy

LearnBridge implements offline resilience using a Service Worker (`sw.js`) utilizing the standard **Cache API**:

- **Shell Cache (`learnbridge-shell-v4`):**
  - Pre-caches core HTML, styles, icons, fonts, and Web Component scripts during installation.
  - Strategy: *Cache First with Network Revalidation*. If connectivity drops, all interface chrome, dialogs, transcripts, and document previews remain fully interactive.
- **Media Cache (`learnbridge-media-v4`):**
  - On-demand caching for media assets (`sample-lesson.mp4`, `audio-description.mp3`, `captions-en.vtt`, `captions-am.vtt`, and `learnbridge-lesson-pack.zip`).
  - Triggered explicitly when the user clicks **"Download Lesson Pack"** on the offline study card.
- **Online/Offline Network Detection:**
  - `navigator.onLine` and `window.addEventListener('online'/'offline')` update the live network status pill in the floating header (`aria-live="polite"`).

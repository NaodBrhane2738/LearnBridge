# LearnBridge — Media Assets & Ethiopian Sign Language Replacement Guide

## 1. Asset Inventory & Technical Specifications

All media fixtures utilized by LearnBridge are stored locally in `D:\LearnBridge\media/`:

| Asset File | Format / Codec | Dimensions / Bitrate | File Size | Functional Purpose |
|---|---|---|---|---|
| `sample-lesson.mp4` | MP4 (H.264 / AAC) | 1280 × 720 @ 30fps, ~280 kbps | ~628 KB | Primary instructional demonstration video ("Design for every mind: Inclusive educational experiences"). |
| `audio-description.mp3` | MP3 (MPEG Audio Layer 3) | 44.1 kHz Mono, 128 kbps | ~180 KB | Synchronized secondary descriptive narration describing on-screen visual diagrams for blind learners. |
| `captions-en.vtt` | WebVTT (UTF-8) | Text cues with timestamp millisecond accuracy | 347 B | English closed caption subtitle track. |
| `captions-am.vtt` | WebVTT (UTF-8) | Text cues in Ethiopic / Amharic script | 484 B | Amharic closed caption subtitle track (አማርኛ ንዑስ ጽሑፎች). |
| `transcript.json` | JSON (UTF-8) | Structured cues: `[{ start, end, en, am }]` | 824 B | Synchronized bilingual transcript source for `<learnbridge-transcript>`. |
| `poster.jpg` | JPEG | 1280 × 720 @ 80% quality | ~60 KB | High-resolution video poster fallback and pre-roll display. |
| `living-room-bg.webp` | WebP | 2560 × 1440 compressed | ~240 KB | Ambient interior photographic background providing warm Ethiopian context. |
| `learnbridge-lesson-pack.zip` | ZIP Archive | Offline bundle containing lesson HTML, transcript, captions, and media | ~841 KB | Offline resource package cached via Service Worker and downloadable on-demand. |

---

## 2. Ethiopian Sign Language (ESL) Integration Architecture

### Strict Ethical Constraint
Per project specifications, **no simulated, AI-generated, or fake sign language footage is permitted**. Sign language is a living, grammatically distinct human language.

Currently, the `<learnbridge-interpreter>` component displays an honest, dignified placeholder message:
> *"Authorized Ethiopian Sign Language footage will appear here."*
> *"This viewport demonstrates accessible non-drag repositioning and resizing. Real footage recorded with certified Ethiopian Sign Language interpreters will replace this placeholder in production."*

---

## 3. Step-by-Step Procedure for Recording & Integrating Production ESL Footage

When production recordings with certified Ethiopian Sign Language interpreters are complete:

### Step 1: Video Capture Guidelines
1. **Interpreter Framing:** Medium shot (waist up) with clear visibility of hands, chest, and facial expressions (grammatical non-manual markers).
2. **Lighting & Contrast:** Uniform front lighting against a solid, neutral dark green or dark blue backdrop with no shadows or glare.
3. **Format & Framerate:** 1080p or 720p @ **60fps** (60 frames per second is strongly recommended for sign language to eliminate motion blur during rapid finger-spelling).

### Step 2: Media Preparation & Compression
Compress the recorded footage using FFmpeg (available in `D:\LearnBridge\tools` or system PATH):
```powershell
ffmpeg -i esl-interpreter-raw.mov -c:v libx264 -preset slow -crf 22 -c:a none -movflags +faststart esl-interpreter-lesson-04.mp4
```

### Step 3: Component Hookup
In `components/learnbridge-interpreter.js`:
1. Replace the inner placeholder markup with the video element:
```html
<video id="interpreterVideo" class="interpreter-video" playsinline muted preload="auto">
  <source src="./media/esl-interpreter-lesson-04.mp4" type="video/mp4">
</video>
```
2. Bind playback state to the primary media player:
```javascript
const player = document.querySelector('learnbridge-player') || document.querySelector('#lessonVideo');
const interpreter = document.querySelector('learnbridge-interpreter');
const eslVideo = interpreter.shadowRoot.querySelector('#interpreterVideo');

player.addEventListener('timeupdate', () => {
  if (Math.abs(eslVideo.currentTime - player.currentTime) > 0.3) {
    eslVideo.currentTime = player.currentTime;
  }
});

player.addEventListener('play', () => eslVideo.play());
player.addEventListener('pause', () => eslVideo.pause());
```

---

## 4. Subtitle Edit Caption Workflow (English & Amharic)

To edit or generate new synchronized WebVTT cues:
1. Open **Subtitle Edit** (pre-downloaded setup available at `D:\LearnBridge\tools\downloads\SubtitleEdit-Windows-x64-Setup.exe`).
2. Load `D:\LearnBridge\media\sample-lesson.mp4`.
3. Open `captions-en.vtt` or `captions-am.vtt`.
4. Use the waveform visualizer to adjust cue start/end boundaries with millisecond precision.
5. For Amharic, ensure font encoding is set to UTF-8 and use the Ethiopic keyboard layout or translation assistant.
6. Export as **WebVTT (*.vtt)**.

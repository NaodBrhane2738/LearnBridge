/**
 * LearnBridge — Core Video Player Web Component
 * <learnbridge-player>
 *
 * Encapsulates the accessible video playback stage, dual-track captions
 * (English and Amharic), secondary audio-description track synchronization,
 * customizable high-contrast caption rendering, and Ethiopian Sign Language
 * interpreter viewport management.
 */

import './learnbridge-interpreter.js';

class LearnBridgePlayer extends HTMLElement {
  static get observedAttributes() {
    return [
      'src', 'poster', 'captions-en', 'captions-am', 'audio-desc',
      'language', 'captions-enabled', 'ad-enabled', 'interpreter-enabled',
      'high-contrast', 'caption-size'
    ];
  }

  constructor() {
    super();
    this.attachShadow({ mode: 'open' });

    this._src = './media/sample-lesson.mp4';
    this._poster = './media/poster.jpg';
    this._captionsEn = './media/captions-en.vtt';
    this._captionsAm = './media/captions-am.vtt';
    this._audioDescSrc = './media/audio-description.mp3';

    this._language = 'en';
    this._captionsEnabled = false;
    this._adEnabled = false;
    this._interpreterEnabled = false;
    this._highContrast = false;
    this._captionSize = 100;

    this._cues = [];
    this._audioDesc = new Audio();
    this._audioDesc.preload = 'auto';
  }

  connectedCallback() {
    this.readAttributes();
    this.render();
    this.bindEvents();
    this.loadCaptions();
  }

  readAttributes() {
    if (this.hasAttribute('src')) this._src = this.getAttribute('src');
    if (this.hasAttribute('poster')) this._poster = this.getAttribute('poster');
    if (this.hasAttribute('captions-en')) this._captionsEn = this.getAttribute('captions-en');
    if (this.hasAttribute('captions-am')) this._captionsAm = this.getAttribute('captions-am');
    if (this.hasAttribute('audio-desc')) this._audioDescSrc = this.getAttribute('audio-desc');
    if (this.hasAttribute('language')) this._language = this.getAttribute('language');
    if (this.hasAttribute('captions-enabled')) this._captionsEnabled = this.getAttribute('captions-enabled') === 'true';
    if (this.hasAttribute('ad-enabled')) this._adEnabled = this.getAttribute('ad-enabled') === 'true';
    if (this.hasAttribute('interpreter-enabled')) this._interpreterEnabled = this.getAttribute('interpreter-enabled') === 'true';
    if (this.hasAttribute('high-contrast')) this._highContrast = this.getAttribute('high-contrast') === 'true';
    if (this.hasAttribute('caption-size')) this._captionSize = parseInt(this.getAttribute('caption-size'), 10) || 100;

    this._audioDesc.src = this._audioDescSrc;
  }

  attributeChangedCallback(name, oldValue, newValue) {
    if (oldValue === newValue) return;
    if (name === 'language') {
      this._language = newValue === 'am' ? 'am' : 'en';
      this.updateCaptionTrack();
    } else if (name === 'captions-enabled') {
      this._captionsEnabled = newValue === 'true';
      this.updateCaptionVisibility();
    } else if (name === 'ad-enabled') {
      this._adEnabled = newValue === 'true';
      this.syncAudioDescription();
    } else if (name === 'interpreter-enabled') {
      this._interpreterEnabled = newValue === 'true';
      const interp = this.shadowRoot.querySelector('learnbridge-interpreter');
      if (interp) interp.visible = this._interpreterEnabled;
    } else if (name === 'high-contrast') {
      this._highContrast = newValue === 'true';
      this.updateCaptionStyle();
    } else if (name === 'caption-size') {
      this._captionSize = parseInt(newValue, 10) || 100;
      this.updateCaptionStyle();
    }
  }

  get video() {
    return this.shadowRoot.querySelector('video');
  }

  get currentTime() {
    return this.video ? this.video.currentTime : 0;
  }

  get duration() {
    return this.video ? (this.video.duration || 18) : 18;
  }

  get paused() {
    return this.video ? this.video.paused : true;
  }

  async play() {
    if (!this.video) return;
    try {
      await this.video.play();
      if (this._adEnabled && this._audioDesc) {
        this._audioDesc.currentTime = this.video.currentTime;
        await this._audioDesc.play().catch(() => {});
      }
      this.updatePlayState();
    } catch (e) {
      console.warn('[LearnBridgePlayer] Playback was prevented:', e);
    }
  }

  pause() {
    if (!this.video) return;
    this.video.pause();
    if (this._audioDesc) this._audioDesc.pause();
    this.updatePlayState();
  }

  togglePlay() {
    if (this.paused) this.play();
    else this.pause();
  }

  seek(seconds) {
    if (!this.video) return;
    const target = Math.max(0, Math.min(this.duration, seconds));
    this.video.currentTime = target;
    if (this._adEnabled && this._audioDesc) {
      this._audioDesc.currentTime = target;
    }
    this.updateTimeDisplay();
  }

  setLanguage(lang) {
    this._language = lang === 'am' ? 'am' : 'en';
    this.setAttribute('language', this._language);
    this.updateCaptionTrack();
    this.dispatchEvent(new CustomEvent('lb-caption-change', {
      detail: { enabled: this._captionsEnabled, language: this._language },
      bubbles: true,
      composed: true
    }));
  }

  toggleCaptions(forcedState) {
    this._captionsEnabled = typeof forcedState === 'boolean' ? forcedState : !this._captionsEnabled;
    this.setAttribute('captions-enabled', String(this._captionsEnabled));
    const btn = this.shadowRoot.querySelector('#captionsBtn');
    if (btn) btn.setAttribute('aria-pressed', String(this._captionsEnabled));
    this.updateCaptionVisibility();
    this.dispatchEvent(new CustomEvent('lb-caption-change', {
      detail: { enabled: this._captionsEnabled, language: this._language },
      bubbles: true,
      composed: true
    }));
  }

  toggleAudioDescription(forcedState) {
    this._adEnabled = typeof forcedState === 'boolean' ? forcedState : !this._adEnabled;
    this.setAttribute('ad-enabled', String(this._adEnabled));
    const btn = this.shadowRoot.querySelector('#adBtn');
    if (btn) btn.setAttribute('aria-pressed', String(this._adEnabled));
    this.syncAudioDescription();
    this.dispatchEvent(new CustomEvent('lb-ad-change', {
      detail: { enabled: this._adEnabled },
      bubbles: true,
      composed: true
    }));
  }

  toggleInterpreter(forcedState) {
    this._interpreterEnabled = typeof forcedState === 'boolean' ? forcedState : !this._interpreterEnabled;
    this.setAttribute('interpreter-enabled', String(this._interpreterEnabled));
    const btn = this.shadowRoot.querySelector('#interpBtn');
    if (btn) btn.setAttribute('aria-pressed', String(this._interpreterEnabled));
    const interp = this.shadowRoot.querySelector('learnbridge-interpreter');
    if (interp) interp.visible = this._interpreterEnabled;
    this.dispatchEvent(new CustomEvent('lb-interpreter-change', {
      detail: { visible: this._interpreterEnabled },
      bubbles: true,
      composed: true
    }));
  }

  syncAudioDescription() {
    if (!this._audioDesc || !this.video) return;
    if (this._adEnabled) {
      this._audioDesc.currentTime = this.video.currentTime;
      if (!this.video.paused && !this.video.ended) {
        this._audioDesc.play().catch(() => {});
      }
    } else {
      this._audioDesc.pause();
    }
  }

  async loadCaptions() {
    // Load VTT cues into internal array for overlay rendering
    this._cues = [
      { start: 0.6, end: 4.3, en: 'Good design starts by removing barriers.', am: 'ጥሩ ንድፍ መሰናክሎችን በማስወገድ ይጀምራል።' },
      { start: 4.3, end: 8.3, en: 'A learning experience should be perceivable and operable.', am: 'የትምህርት ልምድ ሊታይ፣ ሊሰማ እና ሊጠቀምበት የሚቻል መሆን አለበት።' },
      { start: 8.3, end: 12.4, en: 'It should be understandable and robust.', am: 'ግልጽ እና የታመነ መሆን አለበት።' },
      { start: 12.4, end: 17.7, en: 'Accessibility is not an extra layer. It is the foundation of the experience.', am: 'ተደራሽነት ተጨማሪ ነገር አይደለም። የተሞክሮው መሠረት ነው።' }
    ];
  }

  updateCaptionTrack() {
    const overlay = this.shadowRoot.querySelector('#captionOverlay');
    if (overlay) {
      overlay.setAttribute('lang', this._language);
    }
    this.updateActiveCueText();
  }

  updateCaptionVisibility() {
    const overlay = this.shadowRoot.querySelector('#captionOverlay');
    if (overlay) {
      overlay.hidden = !this._captionsEnabled;
    }
    if (this.video && this.video.textTracks) {
      for (let i = 0; i < this.video.textTracks.length; i++) {
        const track = this.video.textTracks[i];
        if (track.language === this._language && this._captionsEnabled) {
          track.mode = 'showing';
        } else {
          track.mode = 'hidden';
        }
      }
    }
  }

  updateActiveCueText() {
    const overlay = this.shadowRoot.querySelector('#captionOverlay');
    if (!overlay || !this._captionsEnabled) return;
    const time = this.currentTime;
    const activeCue = this._cues.find(c => time >= c.start && time < c.end);
    if (activeCue) {
      const text = this._language === 'am' ? activeCue.am : activeCue.en;
      overlay.textContent = text;
      overlay.classList.add('has-text');
    } else {
      overlay.textContent = '';
      overlay.classList.remove('has-text');
    }
  }

  updateCaptionStyle() {
    const overlay = this.shadowRoot.querySelector('#captionOverlay');
    if (!overlay) return;
    overlay.classList.toggle('high-contrast', this._highContrast);
    overlay.style.setProperty('--caption-size', `${this._captionSize}%`);
  }

  formatTime(value) {
    if (!Number.isFinite(value) || value < 0) return '00:00';
    const s = Math.floor(value);
    const m = Math.floor(s / 60);
    const rem = s % 60;
    return `${String(m).padStart(2, '0')}:${String(rem).padStart(2, '0')}`;
  }

  updatePlayState() {
    const playing = !this.paused;
    const stage = this.shadowRoot.querySelector('.stage');
    const playBtn = this.shadowRoot.querySelector('#playBtn');
    const bigPlayBtn = this.shadowRoot.querySelector('#bigPlayBtn');

    if (stage) stage.classList.toggle('playing', playing);
    if (playBtn) {
      playBtn.setAttribute('aria-label', playing ? 'Pause lesson (Space)' : 'Play lesson (Space)');
      playBtn.innerHTML = playing 
        ? `<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="5" width="4" height="14" rx="1"/><rect x="14" y="5" width="4" height="14" rx="1"/></svg>`
        : `<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="m8 5 11 7-11 7z"/></svg>`;
    }
    if (bigPlayBtn) {
      bigPlayBtn.setAttribute('aria-label', playing ? 'Pause lesson' : 'Play lesson');
    }

    this.dispatchEvent(new CustomEvent(playing ? 'lb-play' : 'lb-pause', {
      detail: { currentTime: this.currentTime },
      bubbles: true,
      composed: true
    }));
  }

  updateTimeDisplay() {
    const timeEl = this.shadowRoot.querySelector('#timeCurrent');
    const durEl = this.shadowRoot.querySelector('#timeDuration');
    const seek = this.shadowRoot.querySelector('#seekBar');

    const curr = this.currentTime;
    const dur = this.duration;

    if (timeEl) timeEl.textContent = this.formatTime(curr);
    if (durEl) durEl.textContent = this.formatTime(dur);

    if (seek) {
      seek.value = curr;
      seek.max = dur;
      seek.setAttribute('aria-valuenow', curr.toFixed(1));
      seek.setAttribute('aria-valuetext', `${this.formatTime(curr)} of ${this.formatTime(dur)}`);
    }

    this.updateActiveCueText();

    this.dispatchEvent(new CustomEvent('lb-timeupdate', {
      detail: { currentTime: curr, duration: dur },
      bubbles: true,
      composed: true
    }));
  }

  bindEvents() {
    const root = this.shadowRoot;
    const vid = this.video;
    const playBtn = root.querySelector('#playBtn');
    const bigPlayBtn = root.querySelector('#bigPlayBtn');
    const backBtn = root.querySelector('#backBtn');
    const seekBar = root.querySelector('#seekBar');
    const volumeBar = root.querySelector('#volumeBar');
    const captionsBtn = root.querySelector('#captionsBtn');
    const adBtn = root.querySelector('#adBtn');
    const interpBtn = root.querySelector('#interpBtn');
    const fullscreenBtn = root.querySelector('#fullscreenBtn');
    const stage = root.querySelector('.stage');

    if (vid) {
      vid.addEventListener('timeupdate', () => this.updateTimeDisplay());
      vid.addEventListener('play', () => this.updatePlayState());
      vid.addEventListener('pause', () => this.updatePlayState());
      vid.addEventListener('ended', () => {
        this.updatePlayState();
        this.dispatchEvent(new CustomEvent('lb-ended', { bubbles: true, composed: true }));
      });
      vid.addEventListener('click', () => this.togglePlay());
    }

    if (playBtn) playBtn.addEventListener('click', () => this.togglePlay());
    if (bigPlayBtn) bigPlayBtn.addEventListener('click', () => this.togglePlay());

    if (backBtn) {
      backBtn.addEventListener('click', () => {
        this.seek(this.currentTime - 10);
      });
    }

    if (seekBar) {
      seekBar.addEventListener('input', (e) => {
        const val = parseFloat(e.target.value);
        this.seek(val);
      });
    }

    if (volumeBar) {
      volumeBar.addEventListener('input', (e) => {
        const val = parseFloat(e.target.value);
        if (this.video) this.video.volume = val;
        if (this._audioDesc) this._audioDesc.volume = val;
      });
    }

    if (captionsBtn) {
      captionsBtn.addEventListener('click', () => this.toggleCaptions());
    }

    if (adBtn) {
      adBtn.addEventListener('click', () => this.toggleAudioDescription());
    }

    if (interpBtn) {
      interpBtn.addEventListener('click', () => this.toggleInterpreter());
    }

    if (fullscreenBtn) {
      fullscreenBtn.addEventListener('click', () => {
        if (!document.fullscreenElement) {
          if (stage.requestFullscreen) stage.requestFullscreen();
        } else {
          if (document.exitFullscreen) document.exitFullscreen();
        }
      });
    }

    // Keyboard navigation within the player stage
    if (stage) {
      stage.addEventListener('keydown', (e) => {
        if (e.target.tagName === 'INPUT' && e.target.type === 'range') return;
        switch (e.key) {
          case ' ':
          case 'k':
          case 'K':
            e.preventDefault();
            this.togglePlay();
            break;
          case 'ArrowLeft':
            e.preventDefault();
            this.seek(this.currentTime - 5);
            break;
          case 'ArrowRight':
            e.preventDefault();
            this.seek(this.currentTime + 5);
            break;
          case 'j':
          case 'J':
            e.preventDefault();
            this.seek(this.currentTime - 10);
            break;
          case 'l':
          case 'L':
            e.preventDefault();
            this.seek(this.currentTime + 10);
            break;
          case 'c':
          case 'C':
            e.preventDefault();
            this.toggleCaptions();
            break;
          case 'd':
          case 'D':
            e.preventDefault();
            this.toggleAudioDescription();
            break;
          case 'h':
          case 'H':
            e.preventDefault();
            this.toggleInterpreter();
            break;
          case 'f':
          case 'F':
            e.preventDefault();
            if (fullscreenBtn) fullscreenBtn.click();
            break;
        }
      });
    }
  }

  render() {
    this.shadowRoot.innerHTML = `
      <style>
        :host {
          display: block;
          position: relative;
          width: 100%;
          font-family: inherit;
          --accent: #c5f18e;
          --seafoam: #85d7bb;
          --glass-surface: rgba(13, 27, 24, 0.78);
          --border-line: rgba(221, 243, 230, 0.14);
        }

        .stage {
          position: relative;
          width: 100%;
          aspect-ratio: 16 / 9;
          background: #000000;
          border-radius: 20px;
          overflow: hidden;
          border: 1px solid var(--border-line);
          box-shadow: 0 25px 70px rgba(0, 0, 0, 0.6);
          outline: none;
        }

        .stage:focus-visible {
          border-color: var(--accent);
          outline: 3px solid var(--accent);
          outline-offset: 2px;
        }

        video {
          width: 100%;
          height: 100%;
          object-fit: cover;
          display: block;
          cursor: pointer;
        }

        .video-vignette {
          position: absolute;
          inset: 0;
          pointer-events: none;
          background: radial-gradient(circle at center, transparent 40%, rgba(0,0,0,0.5) 100%);
        }

        /* Top Overlay Bar */
        .top-bar {
          position: absolute;
          top: 14px;
          left: 14px;
          right: 14px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          z-index: 10;
          pointer-events: none;
        }

        .pill {
          display: inline-flex;
          align-items: center;
          gap: 7px;
          background: rgba(0, 0, 0, 0.55);
          backdrop-filter: blur(12px);
          -webkit-backdrop-filter: blur(12px);
          border: 1px solid rgba(255, 255, 255, 0.12);
          border-radius: 999px;
          padding: 6px 14px;
          font-size: 11px;
          font-weight: 700;
          letter-spacing: 0.8px;
          color: #d8ede0;
          text-transform: uppercase;
        }

        .pill-dot {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: var(--accent);
        }

        .top-action {
          pointer-events: auto;
          background: rgba(0, 0, 0, 0.55);
          border: 1px solid rgba(255, 255, 255, 0.12);
          color: #ffffff;
          border-radius: 999px;
          width: 36px;
          height: 36px;
          display: grid;
          place-items: center;
          cursor: pointer;
          backdrop-filter: blur(12px);
          transition: background 0.15s, border-color 0.15s;
        }

        .top-action:hover, .top-action:focus-visible {
          background: rgba(197, 241, 142, 0.2);
          border-color: var(--accent);
          outline: none;
        }

        /* Center Big Play Button */
        .big-play {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          width: 80px;
          height: 80px;
          border-radius: 50%;
          background: rgba(13, 27, 24, 0.85);
          border: 2px solid var(--accent);
          color: var(--accent);
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          backdrop-filter: blur(16px);
          box-shadow: 0 10px 30px rgba(0, 0, 0, 0.5), 0 0 25px rgba(197, 241, 142, 0.25);
          transition: transform 0.2s cubic-bezier(0.16, 1, 0.3, 1), background 0.2s;
          z-index: 5;
        }

        .stage.playing .big-play {
          opacity: 0;
          pointer-events: none;
          transform: translate(-50%, -50%) scale(0.8);
        }

        .big-play:hover, .big-play:focus-visible {
          transform: translate(-50%, -50%) scale(1.08);
          background: var(--accent);
          color: #071410;
          outline: none;
        }

        .big-play small {
          font-size: 8px;
          font-weight: 800;
          letter-spacing: 1px;
          margin-top: 2px;
        }

        /* Captions Overlay */
        .caption-overlay {
          position: absolute;
          bottom: 74px;
          left: 50%;
          transform: translateX(-50%);
          max-width: 82%;
          text-align: center;
          color: #ffffff;
          font-size: calc(18px * (var(--caption-size, 100) / 100));
          font-weight: 500;
          line-height: 1.45;
          text-shadow: 0 2px 4px rgba(0, 0, 0, 0.9), 0 0 12px rgba(0, 0, 0, 0.7);
          pointer-events: none;
          z-index: 12;
          transition: font-size 0.2s;
        }

        .caption-overlay.has-text {
          padding: 6px 14px;
          border-radius: 8px;
          background: rgba(0, 0, 0, 0.65);
        }

        .caption-overlay.high-contrast.has-text {
          background: #000000 !important;
          color: #ffff00 !important;
          border: 2px solid #ffffff !important;
          text-shadow: none !important;
        }

        .caption-overlay[hidden] {
          display: none !important;
        }

        /* Bottom Controls Bar */
        .bottom-glass {
          position: absolute;
          bottom: 0;
          left: 0;
          right: 0;
          padding: 8px 16px 12px;
          background: linear-gradient(to top, rgba(5, 12, 10, 0.94) 0%, rgba(5, 12, 10, 0.65) 75%, transparent 100%);
          z-index: 14;
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        /* Seek bar */
        .seek-wrap {
          position: relative;
          width: 100%;
          display: flex;
          align-items: center;
        }

        .seek-bar {
          width: 100%;
          height: 6px;
          -webkit-appearance: none;
          appearance: none;
          background: rgba(255, 255, 255, 0.2);
          border-radius: 4px;
          outline: none;
          cursor: pointer;
          transition: height 0.15s;
        }

        .seek-bar:hover, .seek-bar:focus-visible {
          height: 8px;
        }

        .seek-bar::-webkit-slider-thumb {
          -webkit-appearance: none;
          width: 14px;
          height: 14px;
          border-radius: 50%;
          background: var(--accent);
          cursor: pointer;
          box-shadow: 0 0 8px rgba(197, 241, 142, 0.6);
        }

        .seek-bar::-moz-range-thumb {
          width: 14px;
          height: 14px;
          border-radius: 50%;
          background: var(--accent);
          cursor: pointer;
          border: none;
        }

        /* Controls row */
        .control-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 8px;
        }

        .control-group {
          display: flex;
          align-items: center;
          gap: 6px;
        }

        .ctrl-btn {
          min-width: 36px;
          height: 36px;
          padding: 0 8px;
          border-radius: 10px;
          border: 1px solid rgba(255, 255, 255, 0.1);
          background: rgba(255, 255, 255, 0.05);
          color: #dcece1;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          font-size: 11px;
          font-weight: 700;
          font-family: inherit;
          gap: 4px;
          transition: background 0.15s, border-color 0.15s, color 0.15s;
        }

        .ctrl-btn:hover, .ctrl-btn:focus-visible {
          background: rgba(197, 241, 142, 0.15);
          border-color: var(--accent);
          color: #ffffff;
          outline: none;
        }

        .ctrl-btn:focus-visible {
          outline: 2px solid var(--accent);
          outline-offset: 1px;
        }

        .ctrl-btn[aria-pressed="true"] {
          background: var(--accent);
          color: #081713;
          border-color: var(--accent);
        }

        .ctrl-btn.primary {
          background: var(--accent);
          color: #071611;
          border-color: var(--accent);
        }

        .ctrl-btn.primary:hover {
          background: #d4f8a8;
        }

        .time-readout {
          font-size: 12px;
          font-variant-numeric: tabular-nums;
          color: #bad3c3;
          font-weight: 600;
          margin-left: 6px;
        }

        .time-readout strong {
          color: #ffffff;
        }

        .vol-slider {
          width: 60px;
          height: 5px;
          -webkit-appearance: none;
          appearance: none;
          background: rgba(255, 255, 255, 0.25);
          border-radius: 3px;
          outline: none;
          cursor: pointer;
        }

        .vol-slider::-webkit-slider-thumb {
          -webkit-appearance: none;
          width: 12px;
          height: 12px;
          border-radius: 50%;
          background: var(--accent);
          cursor: pointer;
        }

        @media (max-width: 640px) {
          .vol-slider { display: none; }
          .time-readout { font-size: 10px; }
          .ctrl-btn { min-width: 32px; height: 32px; padding: 0 5px; font-size: 10px; }
        }
      </style>

      <div class="stage" tabindex="0" role="region" aria-label="LearnBridge video player stage">
        <video playsinline preload="metadata" poster="${this._poster}">
          <source src="${this._src}" type="video/mp4">
          <track kind="captions" src="${this._captionsEn}" srclang="en" label="English">
          <track kind="captions" src="${this._captionsAm}" srclang="am" label="አማርኛ">
          Your browser does not support HTML5 video.
        </video>

        <div class="video-vignette" aria-hidden="true"></div>

        <div class="top-bar">
          <span class="pill"><span class="pill-dot"></span> NOW LEARNING · LESSON 04.02</span>
          <button class="top-action" id="fullscreenBtn" aria-label="Enter fullscreen (F)" title="Fullscreen (F)">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M8 3H3v5M16 3h5v5M3 16v5h5M21 16v5h-5"/></svg>
          </button>
        </div>

        <button class="big-play" id="bigPlayBtn" aria-label="Play lesson (Space)">
          <svg width="30" height="30" viewBox="0 0 24 24" fill="currentColor"><path d="m8 5 11 7-11 7z"/></svg>
          <small>PLAY</small>
        </button>

        <!-- Dynamic High-Contrast Accessible Caption Overlay -->
        <div class="caption-overlay" id="captionOverlay" hidden lang="${this._language}" aria-live="off"></div>

        <!-- Integrated Ethiopian Sign Language Interpreter Overlay -->
        <learnbridge-interpreter ${this._interpreterEnabled ? 'visible' : ''}></learnbridge-interpreter>

        <!-- Bottom Controls Glass -->
        <div class="bottom-glass">
          <div class="seek-wrap">
            <input class="seek-bar" id="seekBar" type="range" min="0" max="18" value="0" step="0.1" 
                   aria-label="Seek through lesson timeline" 
                   aria-valuemin="0" aria-valuemax="18" aria-valuenow="0" aria-valuetext="00:00 of 00:18">
          </div>

          <div class="control-row">
            <div class="control-group">
              <button class="ctrl-btn primary" id="playBtn" aria-label="Play lesson (Space)">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="m8 5 11 7-11 7z"/></svg>
              </button>
              <button class="ctrl-btn" id="backBtn" aria-label="Replay 10 seconds (J)">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 12a8 8 0 1 0 2.3-5.6L4 8.8M4 4v5h5"/><path d="M12 8v4l3 2"/></svg>
                <span>10</span>
              </button>
              <span class="time-readout">
                <strong id="timeCurrent">00:00</strong> / <span id="timeDuration">00:18</span>
              </span>
            </div>

            <div class="control-group">
              <label style="display:flex;align-items:center;gap:4px;cursor:pointer;" aria-label="Adjust volume">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 10v4h4l5 4V6l-5 4zM17 9a5 5 0 0 1 0 6"/></svg>
                <input class="vol-slider" id="volumeBar" type="range" min="0" max="1" value="0.85" step="0.05" aria-label="Volume level">
              </label>

              <button class="ctrl-btn" id="captionsBtn" aria-label="Toggle captions (C)" aria-pressed="${this._captionsEnabled}">
                <span>CC</span>
              </button>
              <button class="ctrl-btn" id="adBtn" aria-label="Toggle audio description (D)" aria-pressed="${this._adEnabled}">
                <span>AD</span>
              </button>
              <button class="ctrl-btn" id="interpBtn" aria-label="Toggle sign language interpreter (H)" aria-pressed="${this._interpreterEnabled}">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 11V6a2 2 0 0 0-2-2v0a2 2 0 0 0-2 2v0"/><path d="M14 10V4a2 2 0 0 0-2-2v0a2 2 0 0 0-2 2v2"/><path d="M10 10.5V6a2 2 0 0 0-2-2v0a2 2 0 0 0-2 2v8"/><path d="M18 8a2 2 0 1 1 4 0v6a8 8 0 0 1-8 8h-2c-2.8 0-4.5-.86-5.99-2.34l-3.6-3.6a2 2 0 0 1 2.83-2.82L7 15"/></svg>
              </button>
            </div>
          </div>
        </div>
      </div>
    `;

    this.updateCaptionVisibility();
    this.updateCaptionStyle();
  }
}

if (!customElements.get('learnbridge-player')) {
  customElements.define('learnbridge-player', LearnBridgePlayer);
}

export default LearnBridgePlayer;

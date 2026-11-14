/**
 * LearnBridge — Synchronized Transcript Web Component
 * <learnbridge-transcript>
 *
 * Provides a bilingual (English / Amharic) synchronized interactive transcript.
 * Cues track current media playback, support click/keyboard seeking,
 * and provide real-time search with accessible screen-reader feedback.
 */

class LearnBridgeTranscript extends HTMLElement {
  static get observedAttributes() {
    return ['src', 'language', 'current-time'];
  }

  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this._segments = [];
    this._language = 'en';
    this._currentTime = 0;
    this._activeIndex = -1;
    this._searchQuery = '';
    this._userIsInteracting = false;
  }

  connectedCallback() {
    this._language = this.getAttribute('language') || 'en';
    this.render();
    const src = this.getAttribute('src');
    if (src) {
      this.loadTranscript(src);
    } else {
      // Default fallback segments if not loaded via src
      this.segments = [
        { start: 0.6, end: 4.3, en: 'Good design starts by removing barriers.', am: 'ጥሩ ንድፍ መሰናክሎችን በማስወገድ ይጀምራል።' },
        { start: 4.3, end: 8.3, en: 'A learning experience should be perceivable and operable.', am: 'የትምህርት ልምድ ሊታይ፣ ሊሰማ እና ሊጠቀምበት የሚቻል መሆን አለበት።' },
        { start: 8.3, end: 12.4, en: 'It should be understandable and robust.', am: 'ግልጽ እና የታመነ መሆን አለበት።' },
        { start: 12.4, end: 17.7, en: 'Accessibility is not an extra layer. It is the foundation of the experience.', am: 'ተደራሽነት ተጨማሪ ነገር አይደለም። የተሞክሮው መሠረት ነው።' }
      ];
    }
  }

  attributeChangedCallback(name, oldValue, newValue) {
    if (oldValue === newValue) return;
    if (name === 'src' && newValue) {
      this.loadTranscript(newValue);
    } else if (name === 'language' && newValue) {
      this.setLanguage(newValue, false);
    } else if (name === 'current-time' && newValue !== null) {
      this.setTime(parseFloat(newValue) || 0);
    }
  }

  get segments() {
    return this._segments;
  }

  set segments(data) {
    this._segments = Array.isArray(data) ? data : [];
    this.renderCues();
  }

  get language() {
    return this._language;
  }

  set language(lang) {
    this.setLanguage(lang, true);
  }

  async loadTranscript(url) {
    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      this.segments = data.segments || [];
    } catch (err) {
      console.warn('[LearnBridgeTranscript] Failed to load transcript JSON:', err);
    }
  }

  formatTime(seconds) {
    if (!Number.isFinite(seconds) || seconds < 0) return '00:00';
    const s = Math.floor(seconds);
    const m = Math.floor(s / 60);
    const rem = s % 60;
    return `${String(m).padStart(2, '0')}:${String(rem).padStart(2, '0')}`;
  }

  setTime(time) {
    this._currentTime = time;
    const index = this._segments.findIndex(seg => time >= seg.start && time < seg.end);
    if (index !== this._activeIndex) {
      this._activeIndex = index;
      this.updateActiveCue();
    }
  }

  setLanguage(lang, emit = true) {
    const nextLang = lang === 'am' ? 'am' : 'en';
    const changed = this._language !== nextLang;
    this._language = nextLang;
    if (this.getAttribute('language') !== this._language) {
      this.setAttribute('language', this._language);
    }
    const enBtn = this.shadowRoot.querySelector('#langEn');
    const amBtn = this.shadowRoot.querySelector('#langAm');
    if (enBtn && amBtn) {
      enBtn.classList.toggle('selected', this._language === 'en');
      enBtn.setAttribute('aria-pressed', String(this._language === 'en'));
      amBtn.classList.toggle('selected', this._language === 'am');
      amBtn.setAttribute('aria-pressed', String(this._language === 'am'));
    }
    this.renderCues();
    if (emit && changed) {
      this.dispatchEvent(new CustomEvent('lb-language-change', {
        detail: { language: this._language },
        bubbles: true,
        composed: true
      }));
    }
  }

  updateActiveCue() {
    const list = this.shadowRoot.querySelectorAll('.transcript-line');
    list.forEach((el, idx) => {
      const isActive = idx === this._activeIndex;
      el.classList.toggle('active', isActive);
      el.setAttribute('aria-current', isActive ? 'true' : 'false');
      if (isActive && !this._userIsInteracting) {
        el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }
    });
  }

  filter(query) {
    this._searchQuery = query || '';
    const input = this.shadowRoot.querySelector('#searchInput');
    if (input) input.value = this._searchQuery;
    const clearBtn = this.shadowRoot.querySelector('#clearSearch');
    if (clearBtn) clearBtn.hidden = !this._searchQuery;
    this.renderCues();
  }

  renderCues() {
    const container = this.shadowRoot.querySelector('#cuesContainer');
    const status = this.shadowRoot.querySelector('#searchStatus');
    if (!container) return;

    const query = this._searchQuery.trim().toLowerCase();
    const lang = this._language;

    const filtered = this._segments.map((seg, originalIndex) => ({
      ...seg,
      originalIndex,
      text: lang === 'am' ? (seg.am || seg.en) : (seg.en || seg.am)
    })).filter(seg => !query || seg.text.toLowerCase().includes(query));

    if (status) {
      if (query) {
        status.textContent = `${filtered.length} matching transcript line${filtered.length === 1 ? '' : 's'}.`;
      } else {
        status.textContent = '';
      }
    }

    if (filtered.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <p>No matching lines found for "${this.escapeHtml(query)}".</p>
        </div>
      `;
      return;
    }

    container.innerHTML = filtered.map(item => {
      const isActive = item.originalIndex === this._activeIndex;
      const formattedTime = this.formatTime(item.start);
      return `
        <button class="transcript-line ${isActive ? 'active' : ''}" 
                data-start="${item.start}" 
                data-index="${item.originalIndex}"
                aria-current="${isActive ? 'true' : 'false'}"
                type="button">
          <span class="cue-time">${formattedTime}</span>
          <span class="cue-text">${this.highlightMatch(item.text, query)}</span>
          <span class="cue-icon" aria-hidden="true">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="m8 5 11 7-11 7z"/></svg>
          </span>
        </button>
      `;
    }).join('');

    // Re-bind cue click listeners
    container.querySelectorAll('.transcript-line').forEach(btn => {
      btn.addEventListener('click', () => {
        const startTime = parseFloat(btn.dataset.start);
        this.dispatchEvent(new CustomEvent('lb-seek-request', {
          detail: { time: startTime },
          bubbles: true,
          composed: true
        }));
      });
    });
  }

  highlightMatch(text, query) {
    if (!query) return this.escapeHtml(text);
    const escaped = this.escapeHtml(text);
    const regex = new RegExp(`(${this.escapeRegex(query)})`, 'gi');
    return escaped.replace(regex, '<mark>$1</mark>');
  }

  escapeHtml(str) {
    return String(str || '').replace(/[&<>"']/g, m => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    })[m]);
  }

  escapeRegex(str) {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  bindEvents() {
    const root = this.shadowRoot;
    const searchInput = root.querySelector('#searchInput');
    const clearSearch = root.querySelector('#clearSearch');
    const langEn = root.querySelector('#langEn');
    const langAm = root.querySelector('#langAm');
    const container = root.querySelector('#cuesContainer');

    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        this._searchQuery = e.target.value;
        if (clearSearch) clearSearch.hidden = !this._searchQuery;
        this.renderCues();
      });
    }

    if (clearSearch) {
      clearSearch.addEventListener('click', () => {
        if (searchInput) {
          searchInput.value = '';
          searchInput.focus();
        }
        this._searchQuery = '';
        clearSearch.hidden = true;
        this.renderCues();
      });
    }

    if (langEn) {
      langEn.addEventListener('click', () => this.setLanguage('en'));
    }
    if (langAm) {
      langAm.addEventListener('click', () => this.setLanguage('am'));
    }

    if (container) {
      container.addEventListener('mouseenter', () => { this._userIsInteracting = true; });
      container.addEventListener('mouseleave', () => { this._userIsInteracting = false; });
      container.addEventListener('touchstart', () => { this._userIsInteracting = true; }, { passive: true });
      container.addEventListener('touchend', () => {
        setTimeout(() => { this._userIsInteracting = false; }, 2000);
      });
    }
  }

  render() {
    this.shadowRoot.innerHTML = `
      <style>
        :host {
          display: flex;
          flex-direction: column;
          height: 100%;
          min-height: 240px;
          color: #e6f0e9;
          font-family: inherit;
          --accent: #c5f18e;
          --line: rgba(255, 255, 255, 0.09);
        }

        .header-bar {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 8px;
          margin-bottom: 12px;
          padding-bottom: 8px;
          border-bottom: 1px solid var(--line);
        }

        .search-wrap {
          position: relative;
          flex: 1;
          display: flex;
          align-items: center;
        }

        .search-icon {
          position: absolute;
          left: 10px;
          color: #8da495;
          pointer-events: none;
        }

        .search-input {
          width: 100%;
          min-height: 36px;
          padding: 6px 30px 6px 32px;
          border-radius: 9px;
          border: 1px solid var(--line);
          background: rgba(255, 255, 255, 0.05);
          color: #ffffff;
          font-size: 13px;
          font-family: inherit;
          outline: none;
          transition: border-color 0.15s, background 0.15s;
        }

        .search-input:focus-visible {
          border-color: var(--accent);
          background: rgba(255, 255, 255, 0.08);
          outline: 2px solid var(--accent);
        }

        .clear-btn {
          position: absolute;
          right: 8px;
          background: transparent;
          border: none;
          color: #a4baa9;
          cursor: pointer;
          font-size: 14px;
          padding: 2px;
        }

        .lang-switch {
          display: flex;
          border: 1px solid var(--line);
          border-radius: 9px;
          overflow: hidden;
          background: rgba(0, 0, 0, 0.2);
        }

        .lang-btn {
          background: transparent;
          border: none;
          color: #9cb5a4;
          font-size: 11px;
          font-weight: 700;
          padding: 6px 10px;
          cursor: pointer;
          transition: background 0.15s, color 0.15s;
        }

        .lang-btn.selected {
          background: var(--accent);
          color: #0d2822;
        }

        .cues-container {
          flex: 1;
          overflow-y: auto;
          display: flex;
          flex-direction: column;
          gap: 6px;
          padding-right: 4px;
          max-height: 380px;
        }

        .transcript-line {
          display: grid;
          grid-template-columns: 46px 1fr 20px;
          align-items: baseline;
          gap: 8px;
          padding: 10px 12px;
          border-radius: 10px;
          border: 1px solid transparent;
          background: rgba(255, 255, 255, 0.025);
          color: #d8e8dc;
          text-align: left;
          cursor: pointer;
          font-family: inherit;
          font-size: 13px;
          line-height: 1.5;
          transition: background 0.15s, border-color 0.15s, transform 0.15s;
        }

        .transcript-line:hover {
          background: rgba(197, 241, 142, 0.07);
          border-color: rgba(197, 241, 142, 0.2);
          transform: translateX(2px);
        }

        .transcript-line.active {
          background: rgba(197, 241, 142, 0.12);
          border-color: rgba(197, 241, 142, 0.35);
          color: #ffffff;
          font-weight: 500;
        }

        .transcript-line:focus-visible {
          outline: 2px solid var(--accent);
          outline-offset: 1px;
        }

        .cue-time {
          font-size: 11px;
          font-variant-numeric: tabular-nums;
          color: var(--accent);
          font-weight: 600;
        }

        .cue-icon {
          color: var(--accent);
          opacity: 0;
          transition: opacity 0.15s;
        }

        .transcript-line:hover .cue-icon,
        .transcript-line.active .cue-icon {
          opacity: 1;
        }

        mark {
          background: rgba(197, 241, 142, 0.35);
          color: #ffffff;
          border-radius: 2px;
          padding: 0 2px;
        }

        .empty-state {
          padding: 24px;
          text-align: center;
          color: #8da495;
          font-size: 13px;
        }

        .sr-status {
          position: absolute;
          width: 1px;
          height: 1px;
          padding: 0;
          margin: -1px;
          overflow: hidden;
          clip: rect(0, 0, 0, 0);
          border: 0;
        }
      </style>

      <div class="header-bar">
        <div class="search-wrap">
          <span class="search-icon" aria-hidden="true">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
          </span>
          <input class="search-input" id="searchInput" type="search" placeholder="Search transcript..." aria-label="Search transcript cues">
          <button class="clear-btn" id="clearSearch" hidden aria-label="Clear transcript search">✕</button>
        </div>

        <div class="lang-switch" role="group" aria-label="Transcript language">
          <button class="lang-btn selected" id="langEn" aria-pressed="true" type="button">EN</button>
          <button class="lang-btn" id="langAm" aria-pressed="false" type="button">አማ</button>
        </div>
      </div>

      <div class="sr-status" id="searchStatus" aria-live="polite"></div>

      <div class="cues-container" id="cuesContainer" role="region" aria-label="Synchronized transcript segments"></div>
    `;

    this.bindEvents();
    this.renderCues();
  }
}

if (!customElements.get('learnbridge-transcript')) {
  customElements.define('learnbridge-transcript', LearnBridgeTranscript);
}

export default LearnBridgeTranscript;

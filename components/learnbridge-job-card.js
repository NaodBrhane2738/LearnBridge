/**
 * LearnBridge — Accessible Career & Job Card Web Component
 * <learnbridge-job-card>
 *
 * Provides inclusive career opportunity cards for Ethiopian tech learners.
 * Features:
 * - Structured metadata hierarchy (Role, Organization, Location, Accommodation)
 * - Accessible Web Speech API Audio Summary with voice detection & playback toggle
 * - Screen-reader status announcement
 * - Bookmarking action with user feedback
 */

class LearnBridgeJobCard extends HTMLElement {
  static get observedAttributes() {
    return ['role-title', 'organization', 'location', 'level', 'description', 'saved'];
  }

  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this._speaking = false;
    this._saved = false;
  }

  connectedCallback() {
    this.render();
    this.bindEvents();
  }

  get saved() {
    return this.getAttribute('saved') === 'true';
  }

  set saved(val) {
    if (val) this.setAttribute('saved', 'true');
    else this.removeAttribute('saved');
  }

  attributeChangedCallback(name, oldValue, newValue) {
    if (oldValue === newValue) return;
    if (name === 'saved') {
      const btn = this.shadowRoot.querySelector('#saveBtn');
      if (btn) {
        const isSaved = newValue === 'true';
        btn.textContent = isSaved ? 'Saved' : 'Save role';
        btn.classList.toggle('saved', isSaved);
        btn.setAttribute('aria-pressed', String(isSaved));
      }
    }
  }

  toggleSpeech() {
    const status = this.shadowRoot.querySelector('#audioStatus');
    const listenBtn = this.shadowRoot.querySelector('#listenBtn');

    if (!('speechSynthesis' in window)) {
      if (status) status.textContent = 'Speech synthesis is not supported on this browser. Please read the description below.';
      return;
    }

    if (this._speaking) {
      window.speechSynthesis.cancel();
      this._speaking = false;
      if (listenBtn) {
        listenBtn.setAttribute('aria-pressed', 'false');
        listenBtn.classList.remove('playing');
        listenBtn.querySelector('.btn-label').textContent = 'Listen to summary';
      }
      if (status) status.textContent = 'Audio summary stopped.';
      return;
    }

    const title = this.getAttribute('role-title') || 'Junior Accessibility Engineer';
    const org = this.getAttribute('organization') || 'ALX Ethiopia Digital Bridge Partner';
    const loc = this.getAttribute('location') || 'Addis Ababa, Hybrid';
    const desc = this.getAttribute('description') || 'Build inclusive digital products with a product team that values different perspectives.';

    const textToSpeak = `${title} at ${org}, located in ${loc}. Role summary: ${desc}`;
    const utterance = new SpeechSynthesisUtterance(textToSpeak);
    utterance.rate = 0.95;

    // Check for an English or regional voice
    const voices = window.speechSynthesis.getVoices();
    const preferredVoice = voices.find(v => v.lang.startsWith('en') || v.lang.startsWith('am'));
    if (preferredVoice) utterance.voice = preferredVoice;

    utterance.onstart = () => {
      this._speaking = true;
      if (listenBtn) {
        listenBtn.setAttribute('aria-pressed', 'true');
        listenBtn.classList.add('playing');
        listenBtn.querySelector('.btn-label').textContent = 'Stop summary';
      }
      if (status) status.textContent = 'Playing audio summary...';
    };

    utterance.onend = utterance.onerror = () => {
      this._speaking = false;
      if (listenBtn) {
        listenBtn.setAttribute('aria-pressed', 'false');
        listenBtn.classList.remove('playing');
        listenBtn.querySelector('.btn-label').textContent = 'Listen to summary';
      }
      if (status) status.textContent = 'Audio summary finished.';
    };

    window.speechSynthesis.cancel(); // clear queue
    window.speechSynthesis.speak(utterance);
  }

  toggleSave() {
    this.saved = !this.saved;
    this.dispatchEvent(new CustomEvent('lb-job-saved', {
      detail: { saved: this.saved, role: this.getAttribute('role-title') },
      bubbles: true,
      composed: true
    }));
  }

  bindEvents() {
    const root = this.shadowRoot;
    const listenBtn = root.querySelector('#listenBtn');
    const saveBtn = root.querySelector('#saveBtn');

    if (listenBtn) listenBtn.addEventListener('click', () => this.toggleSpeech());
    if (saveBtn) saveBtn.addEventListener('click', () => this.toggleSave());
  }

  render() {
    const title = this.getAttribute('role-title') || 'Junior Accessibility Engineer';
    const org = this.getAttribute('organization') || 'Digital Bridge Inclusive Tech';
    const location = this.getAttribute('location') || 'Addis Ababa · Hybrid';
    const level = this.getAttribute('level') || 'Entry level';
    const desc = this.getAttribute('description') || 'Build inclusive digital products with an engineering team that values different accessibility perspectives.';
    const isSaved = this.saved;

    this.shadowRoot.innerHTML = `
      <style>
        :host {
          display: block;
          font-family: inherit;
          --accent: #c5f18e;
          --seafoam: #85d7bb;
          --line: rgba(221, 243, 230, 0.12);
        }

        .card {
          display: grid;
          grid-template-columns: 88px 1fr auto;
          align-items: center;
          gap: 20px;
          padding: 22px 24px;
          border-radius: 20px;
          border: 1px solid var(--line);
          background: rgba(14, 30, 26, 0.75);
          backdrop-filter: blur(20px) saturate(140%);
          -webkit-backdrop-filter: blur(20px) saturate(140%);
          box-shadow: 0 15px 35px rgba(0, 0, 0, 0.35);
          color: #e6f0e9;
          transition: border-color 0.2s, transform 0.2s;
        }

        .card:hover {
          border-color: rgba(197, 241, 142, 0.3);
        }

        .visual-badge {
          width: 88px;
          height: 88px;
          border-radius: 16px;
          background: linear-gradient(145deg, rgba(197, 241, 142, 0.12), rgba(133, 215, 187, 0.05));
          border: 1px solid rgba(197, 241, 142, 0.2);
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          color: var(--accent);
          text-align: center;
        }

        .badge-kicker {
          font-size: 8px;
          font-weight: 800;
          letter-spacing: 0.8px;
          text-transform: uppercase;
          margin-top: 4px;
        }

        .details {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .overline {
          font-size: 10px;
          font-weight: 700;
          letter-spacing: 1px;
          text-transform: uppercase;
          color: var(--seafoam);
          display: flex;
          align-items: center;
          gap: 6px;
        }

        .match-chip {
          background: rgba(197, 241, 142, 0.18);
          color: var(--accent);
          padding: 1px 6px;
          border-radius: 4px;
          font-size: 9px;
        }

        h3 {
          margin: 0;
          font-size: 18px;
          font-weight: 700;
          color: #ffffff;
        }

        p {
          margin: 0;
          font-size: 13px;
          color: #9cb5a5;
          line-height: 1.5;
        }

        .tags {
          display: flex;
          flex-wrap: wrap;
          gap: 6px;
          margin-top: 6px;
        }

        .tag {
          font-size: 11px;
          font-weight: 600;
          color: #d1e5d7;
          background: rgba(255, 255, 255, 0.06);
          border: 1px solid rgba(255, 255, 255, 0.08);
          padding: 3px 8px;
          border-radius: 6px;
        }

        .actions {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .action-btn {
          min-height: 38px;
          padding: 0 14px;
          border-radius: 10px;
          font-family: inherit;
          font-size: 12px;
          font-weight: 700;
          cursor: pointer;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
          transition: background 0.15s, border-color 0.15s, color 0.15s;
        }

        .listen-btn {
          background: rgba(255, 255, 255, 0.06);
          border: 1px solid rgba(255, 255, 255, 0.12);
          color: #e5f2e8;
        }

        .listen-btn:hover, .listen-btn:focus-visible {
          background: rgba(197, 241, 142, 0.15);
          border-color: var(--accent);
          color: #ffffff;
          outline: none;
        }

        .listen-btn.playing {
          background: var(--accent);
          color: #0d2822;
          border-color: var(--accent);
        }

        .save-btn {
          background: transparent;
          border: 1px solid rgba(255, 255, 255, 0.15);
          color: #c0d8c7;
        }

        .save-btn:hover, .save-btn:focus-visible {
          background: rgba(255, 255, 255, 0.1);
          color: #ffffff;
          outline: 2px solid var(--accent);
        }

        .save-btn.saved {
          border-color: var(--seafoam);
          color: var(--seafoam);
          background: rgba(133, 215, 187, 0.1);
        }

        .sr-only {
          position: absolute;
          width: 1px;
          height: 1px;
          padding: 0;
          margin: -1px;
          overflow: hidden;
          clip: rect(0, 0, 0, 0);
          border: 0;
        }

        @media (max-width: 720px) {
          .card {
            grid-template-columns: 1fr;
            text-align: left;
          }
          .visual-badge {
            display: none;
          }
          .actions {
            flex-direction: row;
          }
        }
      </style>

      <article class="card" role="region" aria-label="Career opportunity: ${title}">
        <div class="visual-badge" aria-hidden="true">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="7" width="18" height="14" rx="2"/><path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M3 12h18M10 12v2h4v-2"/></svg>
          <span class="badge-kicker">CAREER</span>
        </div>

        <div class="details">
          <div class="overline">
            <span>${org}</span>
            <span class="match-chip">DEMO MATCH</span>
          </div>
          <h3>${title}</h3>
          <p>${desc}</p>
          <div class="tags">
            <span class="tag">${location}</span>
            <span class="tag">${level}</span>
            <span class="tag">Accommodation-friendly</span>
          </div>
        </div>

        <div class="actions">
          <button class="action-btn listen-btn" id="listenBtn" type="button" aria-pressed="false">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 13v-1a9 9 0 0 1 18 0v1M3 13h4v7H5a2 2 0 0 1-2-2zM21 13h-4v7h2a2 2 0 0 0 2-2z"/></svg>
            <span class="btn-label">Listen to summary</span>
          </button>
          <button class="action-btn save-btn ${isSaved ? 'saved' : ''}" id="saveBtn" type="button" aria-pressed="${isSaved}">
            ${isSaved ? 'Saved' : 'Save role'}
          </button>
        </div>

        <div class="sr-only" id="audioStatus" aria-live="polite"></div>
      </article>
    `;
  }
}

if (!customElements.get('learnbridge-job-card')) {
  customElements.define('learnbridge-job-card', LearnBridgeJobCard);
}

export default LearnBridgeJobCard;

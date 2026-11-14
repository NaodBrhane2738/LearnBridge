/**
 * LearnBridge — Ethiopian Sign Language Interpreter Web Component
 * <learnbridge-interpreter>
 *
 * Provides a floating, keyboard-operable Ethiopian Sign Language (ESL)
 * viewport overlay. Complies with WCAG 2.2 pointer accessibility:
 * all movement and sizing can be performed via buttons and keyboard shortcuts,
 * never requiring drag-and-drop alone.
 *
 * Includes an authentic disclaimer: clearly identifies placeholder status until
 * official Ethiopian Sign Language video footage is supplied.
 */

class LearnBridgeInterpreter extends HTMLElement {
  static get observedAttributes() {
    return ['visible', 'position', 'scale'];
  }

  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this._positions = ['top-right', 'bottom-right', 'bottom-left', 'top-left'];
    this._positionIndex = 1; // default bottom-right
    this._scale = 1.0;
  }

  connectedCallback() {
    this.render();
    this.bindEvents();
  }

  attributeChangedCallback(name, oldValue, newValue) {
    if (oldValue === newValue) return;
    if (name === 'visible') {
      const isVisible = newValue === 'true' || newValue === '';
      const win = this.shadowRoot.querySelector('.interpreter-window');
      if (win) win.hidden = !isVisible;
    } else if (name === 'position') {
      this.updatePositionClass(newValue);
    } else if (name === 'scale') {
      this._scale = parseFloat(newValue) || 1.0;
      this.updateScale();
    }
  }

  get visible() {
    return this.getAttribute('visible') === 'true';
  }

  set visible(val) {
    if (val) this.setAttribute('visible', 'true');
    else this.removeAttribute('visible');
  }

  get position() {
    return this.getAttribute('position') || 'bottom-right';
  }

  set position(val) {
    this.setAttribute('position', val);
  }

  cyclePosition(direction = 1) {
    this._positionIndex = (this._positionIndex + direction + this._positions.length) % this._positions.length;
    const nextPos = this._positions[this._positionIndex];
    this.position = nextPos;
    this.dispatchEvent(new CustomEvent('lb-interpreter-repositioned', {
      detail: { position: nextPos },
      bubbles: true,
      composed: true
    }));
  }

  dock(pos) {
    if (this._positions.includes(pos)) {
      this._positionIndex = this._positions.indexOf(pos);
      this.position = pos;
      this.updatePositionClass(pos);
      this.dispatchEvent(new CustomEvent('lb-interpreter-repositioned', {
        detail: { position: pos },
        bubbles: true,
        composed: true
      }));
    }
  }

  changeScale(delta) {
    this._scale = Math.min(1.4, Math.max(0.7, +(this._scale + delta).toFixed(2)));
    this.setAttribute('scale', this._scale.toString());
    this.dispatchEvent(new CustomEvent('lb-interpreter-resized', {
      detail: { scale: this._scale },
      bubbles: true,
      composed: true
    }));
  }

  updatePositionClass(pos) {
    const win = this.shadowRoot.querySelector('.interpreter-window');
    if (!win) return;
    win.classList.remove('pos-top-right', 'pos-bottom-right', 'pos-bottom-left', 'pos-top-left');
    win.classList.add(`pos-${pos}`);
  }

  updateScale() {
    const win = this.shadowRoot.querySelector('.interpreter-window');
    if (!win) return;
    win.style.setProperty('--interpreter-scale', this._scale);
  }

  bindEvents() {
    const root = this.shadowRoot;
    const closeBtn = root.querySelector('#hideBtn');
    const movePrevBtn = root.querySelector('#movePrevBtn');
    const moveNextBtn = root.querySelector('#moveNextBtn');
    const shrinkBtn = root.querySelector('#shrinkBtn');
    const growBtn = root.querySelector('#growBtn');

    if (closeBtn) {
      closeBtn.addEventListener('click', () => {
        this.visible = false;
        this.dispatchEvent(new CustomEvent('lb-interpreter-toggle', {
          detail: { visible: false },
          bubbles: true,
          composed: true
        }));
      });
    }

    if (movePrevBtn) {
      movePrevBtn.addEventListener('click', () => this.cyclePosition(-1));
    }
    if (moveNextBtn) {
      moveNextBtn.addEventListener('click', () => this.cyclePosition(1));
    }
    if (shrinkBtn) {
      shrinkBtn.addEventListener('click', () => this.changeScale(-0.1));
    }
    if (growBtn) {
      growBtn.addEventListener('click', () => this.changeScale(0.1));
    }
  }

  render() {
    const isVisible = this.visible;
    const currentPos = this.position;

    this.shadowRoot.innerHTML = `
      <style>
        :host {
          display: block;
          position: absolute;
          inset: 0;
          pointer-events: none;
          z-index: 15;
          --accent: #c5f18e;
          --seafoam: #85d7bb;
          --dark-surface: rgba(11, 26, 22, 0.88);
          --border-line: rgba(133, 215, 187, 0.22);
        }

        .interpreter-window {
          position: absolute;
          width: calc(230px * var(--interpreter-scale, 1));
          border-radius: 16px;
          border: 1px solid var(--border-line);
          background: var(--dark-surface);
          backdrop-filter: blur(20px) saturate(140%);
          -webkit-backdrop-filter: blur(20px) saturate(140%);
          box-shadow: 0 16px 40px rgba(0, 0, 0, 0.5), inset 0 1px 0 rgba(255, 255, 255, 0.1);
          color: #f0f6f2;
          overflow: hidden;
          pointer-events: auto;
          transition: transform 0.25s cubic-bezier(0.16, 1, 0.3, 1),
                      width 0.2s ease,
                      opacity 0.2s ease;
          display: flex;
          flex-direction: column;
        }

        .interpreter-window[hidden] {
          display: none !important;
        }

        /* Viewport corner positioning without mouse dragging */
        .pos-bottom-right {
          right: 18px;
          bottom: 74px;
        }
        .pos-top-right {
          right: 18px;
          top: 54px;
        }
        .pos-top-left {
          left: 18px;
          top: 54px;
        }
        .pos-bottom-left {
          left: 18px;
          bottom: 74px;
        }

        .interpreter-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 8px 12px;
          border-bottom: 1px solid rgba(255, 255, 255, 0.08);
          background: rgba(0, 0, 0, 0.25);
        }

        .tag {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 10px;
          font-weight: 700;
          letter-spacing: 0.8px;
          text-transform: uppercase;
          color: var(--accent);
        }

        .live-dot {
          width: 7px;
          height: 7px;
          border-radius: 50%;
          background: var(--accent);
          box-shadow: 0 0 8px var(--accent);
          animation: pulse 2s infinite ease-in-out;
        }

        @keyframes pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.4; transform: scale(0.85); }
        }

        .close-btn {
          background: transparent;
          border: none;
          color: #a2b7aa;
          cursor: pointer;
          width: 24px;
          height: 24px;
          border-radius: 6px;
          display: grid;
          place-items: center;
          padding: 0;
          transition: background 0.15s, color 0.15s;
        }
        .close-btn:hover, .close-btn:focus-visible {
          background: rgba(255, 255, 255, 0.1);
          color: #ffffff;
          outline: 2px solid var(--accent);
        }

        .video-canvas {
          aspect-ratio: 4 / 3;
          background: #06110f;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 16px;
          text-align: center;
          position: relative;
        }

        .ring-avatar {
          width: 52px;
          height: 52px;
          border-radius: 50%;
          border: 1px dashed var(--seafoam);
          background: rgba(133, 215, 187, 0.08);
          display: grid;
          place-items: center;
          color: var(--seafoam);
          margin-bottom: 8px;
        }

        .copy strong {
          display: block;
          font-size: 11px;
          font-weight: 600;
          color: #e5f2e8;
          margin-bottom: 3px;
        }

        .copy small {
          display: block;
          font-size: 10px;
          color: #92a89a;
          line-height: 1.4;
        }

        .nav-toolbar {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 6px 8px;
          background: rgba(0, 0, 0, 0.35);
          border-top: 1px solid rgba(255, 255, 255, 0.06);
          gap: 4px;
        }

        .tool-btn {
          background: rgba(255, 255, 255, 0.06);
          border: 1px solid rgba(255, 255, 255, 0.1);
          color: #d2e4d7;
          border-radius: 6px;
          font-size: 11px;
          font-weight: 600;
          padding: 4px 8px;
          cursor: pointer;
          min-height: 28px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          transition: background 0.15s, border-color 0.15s;
        }

        .tool-btn:hover, .tool-btn:focus-visible {
          background: rgba(197, 241, 142, 0.15);
          border-color: var(--accent);
          color: #ffffff;
          outline: none;
        }

        .tool-btn:focus-visible {
          outline: 2px solid var(--accent);
          outline-offset: 1px;
        }

        @media (max-width: 640px) {
          .interpreter-window {
            width: 170px;
            right: 8px !important;
            bottom: 60px !important;
            left: auto !important;
            top: auto !important;
          }
        }
      </style>

      <div class="interpreter-window pos-${currentPos}" ${isVisible ? '' : 'hidden'} role="region" aria-label="Ethiopian Sign Language interpreter window">
        <div class="interpreter-header">
          <span class="tag"><span class="live-dot" aria-hidden="true"></span> EthSL Interpreter</span>
          <button class="close-btn" id="hideBtn" aria-label="Hide Ethiopian Sign Language interpreter window" title="Hide (H)">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>

        <div class="video-canvas">
          <div class="ring-avatar" aria-hidden="true">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 11V6a2 2 0 0 0-2-2v0a2 2 0 0 0-2 2v0"/><path d="M14 10V4a2 2 0 0 0-2-2v0a2 2 0 0 0-2 2v2"/><path d="M10 10.5V6a2 2 0 0 0-2-2v0a2 2 0 0 0-2 2v8"/><path d="M18 8a2 2 0 1 1 4 0v6a8 8 0 0 1-8 8h-2c-2.8 0-4.5-.86-5.99-2.34l-3.6-3.6a2 2 0 0 1 2.83-2.82L7 15"/></svg>
          </div>
          <div class="copy">
            <strong>ESL Interpreter Feed</strong>
            <small>Authorized Ethiopian Sign Language video will render here.</small>
          </div>
        </div>

        <div class="nav-toolbar" aria-label="Interpreter position and zoom controls">
          <button class="tool-btn" id="movePrevBtn" aria-label="Move interpreter position previous">◂ Move</button>
          <button class="tool-btn" id="moveNextBtn" aria-label="Move interpreter position next">Move ▸</button>
          <button class="tool-btn" id="shrinkBtn" aria-label="Shrink interpreter window" title="Smaller">−</button>
          <button class="tool-btn" id="growBtn" aria-label="Enlarge interpreter window" title="Larger">+</button>
        </div>
      </div>
    `;

    this.updateScale();
  }
}

if (!customElements.get('learnbridge-interpreter')) {
  customElements.define('learnbridge-interpreter', LearnBridgeInterpreter);
}

export default LearnBridgeInterpreter;

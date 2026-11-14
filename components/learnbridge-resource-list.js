/**
 * LearnBridge — Accessible Documents & Resources Web Component
 * <learnbridge-resource-list>
 *
 * Provides a categorized view of course learning resources:
 * - Structured Accessible HTML alternatives with semantic headings
 * - Tagged PDF references with explicit accessibility audit notes
 * - Detailed context-aware Image Descriptions for diagrams/charts
 * - One-click in-app modal preview for HTML documents
 */

class LearnBridgeResourceList extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
  }

  connectedCallback() {
    this.render();
    this.bindEvents();
  }

  openDocModal(docId) {
    const dialog = this.shadowRoot.querySelector('#docDialog');
    const content = this.shadowRoot.querySelector('#docContent');
    const title = this.shadowRoot.querySelector('#docModalTitle');

    if (docId === 'doc-foundations') {
      title.textContent = 'Inclusive Design Foundations (Accessible HTML Format)';
      content.innerHTML = `
        <article class="doc-body" tabindex="0">
          <h3>1. Perceivable Information</h3>
          <p>Information and user interface components must be presentable to users in ways they can perceive. This means users must be able to comprehend the information being depicted (it can't be invisible to all of their senses).</p>
          <ul>
            <li><strong>Text Alternatives:</strong> Provide text alternatives for any non-text content so that it can be changed into other forms people need, such as large print, braille, speech, symbols or simpler language.</li>
            <li><strong>Time-based Media:</strong> Provide alternatives for time-based media (captions, audio descriptions, sign language).</li>
          </ul>

          <h3>2. Operable User Interface</h3>
          <p>User interface components and navigation must be operable. This means that users must be able to operate the interface (the interface cannot require interaction that a user cannot perform).</p>
          <ul>
            <li><strong>Keyboard Accessible:</strong> Make all functionality available from a keyboard.</li>
            <li><strong>Enough Time:</strong> Provide users enough time to read and use content.</li>
            <li><strong>Navigable:</strong> Provide ways to help users navigate, find content, and determine where they are.</li>
          </ul>

          <h3>3. Context-Aware Image Description</h3>
          <figure style="margin: 16px 0; border: 1px solid var(--line); border-radius: 8px; padding: 12px; background: rgba(0,0,0,0.2);">
            <div style="font-weight:600; color:var(--accent); font-size:12px; margin-bottom:4px;">Diagram 1.1: Multi-Modal Learning Pipeline</div>
            <p style="font-size:12px; line-height:1.5; color:#c7dbc9; margin:0;">
              <strong>Full Visual Description:</strong> A flowchart diagram showing an educational video source splitting into three parallel accessible tracks: Track 1 routes spoken English to English & Amharic WebVTT caption cues; Track 2 routes visual lesson actions to an Audio Description narration audio stream; Track 3 routes lesson dialogue to an Ethiopian Sign Language viewport docked over the video canvas.
            </p>
          </figure>
        </article>
      `;
    }

    if (dialog && typeof dialog.showModal === 'function') {
      dialog.showModal();
    }
  }

  bindEvents() {
    const root = this.shadowRoot;
    const previewBtns = root.querySelectorAll('.preview-btn');
    const dialog = root.querySelector('#docDialog');
    const closeBtn = root.querySelector('#closeDocBtn');

    previewBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        this.openDocModal(btn.dataset.docId);
      });
    });

    if (closeBtn && dialog) {
      closeBtn.addEventListener('click', () => dialog.close());
      dialog.addEventListener('click', (e) => {
        if (e.target === dialog) dialog.close();
      });
    }
  }

  render() {
    this.shadowRoot.innerHTML = `
      <style>
        :host {
          display: block;
          font-family: inherit;
          --accent: #c5f18e;
          --seafoam: #85d7bb;
          --line: rgba(221, 243, 230, 0.12);
        }

        .resource-grid {
          display: flex;
          flex-direction: column;
          gap: 10px;
        }

        .resource-card {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 14px;
          padding: 12px 14px;
          border-radius: 12px;
          border: 1px solid var(--line);
          background: rgba(255, 255, 255, 0.03);
          color: #e6f0ea;
          transition: background 0.15s, border-color 0.15s;
        }

        .resource-card:hover {
          background: rgba(197, 241, 142, 0.06);
          border-color: rgba(197, 241, 142, 0.25);
        }

        .resource-left {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .format-badge {
          width: 36px;
          height: 36px;
          border-radius: 8px;
          background: rgba(133, 215, 187, 0.1);
          border: 1px solid rgba(133, 215, 187, 0.2);
          display: grid;
          place-items: center;
          color: var(--seafoam);
          font-size: 10px;
          font-weight: 800;
          letter-spacing: 0.5px;
        }

        .format-badge.html {
          color: var(--accent);
          border-color: rgba(197, 241, 142, 0.3);
          background: rgba(197, 241, 142, 0.1);
        }

        .info strong {
          display: block;
          font-size: 13px;
          font-weight: 600;
          color: #ffffff;
        }

        .info small {
          display: block;
          font-size: 11px;
          color: #9cb5a5;
        }

        .actions {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .btn-link {
          background: rgba(255, 255, 255, 0.06);
          border: 1px solid rgba(255, 255, 255, 0.12);
          color: #d8ede0;
          border-radius: 8px;
          padding: 6px 12px;
          font-size: 11px;
          font-weight: 700;
          cursor: pointer;
          text-decoration: none;
          display: inline-flex;
          align-items: center;
          gap: 4px;
          transition: background 0.15s, color 0.15s;
        }

        .btn-link:hover, .btn-link:focus-visible {
          background: var(--accent);
          color: #0d2822;
          outline: none;
        }

        .btn-link:focus-visible {
          outline: 2px solid var(--accent);
        }

        /* Modal dialog */
        dialog {
          border: 1px solid var(--line);
          border-radius: 20px;
          background: rgba(9, 23, 20, 0.96);
          color: #ffffff;
          padding: 24px;
          max-width: 620px;
          width: 92%;
          box-shadow: 0 30px 80px rgba(0, 0, 0, 0.85);
          backdrop-filter: blur(24px);
        }

        dialog::backdrop {
          background: rgba(0, 0, 0, 0.75);
        }

        .dialog-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          border-bottom: 1px solid var(--line);
          padding-bottom: 12px;
          margin-bottom: 14px;
        }

        .dialog-header h4 {
          margin: 0;
          font-size: 16px;
          font-weight: 700;
          color: var(--accent);
        }

        .close-btn {
          background: transparent;
          border: none;
          color: #a4bea9;
          font-size: 18px;
          cursor: pointer;
        }

        .doc-body {
          max-height: 400px;
          overflow-y: auto;
          padding-right: 6px;
          font-size: 13px;
          line-height: 1.6;
          color: #d8ede0;
          outline: none;
        }

        .doc-body h3 {
          color: #ffffff;
          margin: 14px 0 6px;
          font-size: 14px;
        }

        .doc-body ul {
          margin: 6px 0 12px 18px;
          padding: 0;
        }

        .doc-body li {
          margin-bottom: 4px;
        }
      </style>

      <div class="resource-grid" role="list" aria-label="Course learning materials">
        <!-- Resource 1: Accessible HTML Document -->
        <div class="resource-card" role="listitem">
          <div class="resource-left">
            <div class="format-badge html" aria-hidden="true">HTML</div>
            <div class="info">
              <strong>Inclusive Design Foundations</strong>
              <small>Semantic HTML · Screen reader optimized · 12 KB</small>
            </div>
          </div>
          <div class="actions">
            <button class="btn-link preview-btn" data-doc-id="doc-foundations" aria-label="Preview Inclusive Design Foundations accessible document in browser">Read</button>
            <a class="btn-link" href="./media/transcript.json" download aria-label="Download Inclusive Design Foundations transcript">Download</a>
          </div>
        </div>

        <!-- Resource 2: English WebVTT Captions -->
        <div class="resource-card" role="listitem">
          <div class="resource-left">
            <div class="format-badge" aria-hidden="true">VTT</div>
            <div class="info">
              <strong>English Video Captions</strong>
              <small>WebVTT · WCAG 2.2 AA compliant timing · 1 KB</small>
            </div>
          </div>
          <div class="actions">
            <a class="btn-link" href="./media/captions-en.vtt" download aria-label="Download English WebVTT captions">Download</a>
          </div>
        </div>

        <!-- Resource 3: Amharic WebVTT Captions -->
        <div class="resource-card" role="listitem">
          <div class="resource-left">
            <div class="format-badge" aria-hidden="true">VTT</div>
            <div class="info">
              <strong>Amharic Video Captions (አማርኛ)</strong>
              <small>WebVTT · Ge'ez Unicode Noto Sans · 1 KB</small>
            </div>
          </div>
          <div class="actions">
            <a class="btn-link" href="./media/captions-am.vtt" download aria-label="Download Amharic WebVTT captions">Download</a>
          </div>
        </div>

        <!-- Resource 4: Complete Offline Lesson Pack -->
        <div class="resource-card" role="listitem">
          <div class="resource-left">
            <div class="format-badge" aria-hidden="true">ZIP</div>
            <div class="info">
              <strong>Complete Lesson Offline Bundle</strong>
              <small>ZIP Archive · Video, Audio Description, Captions · 841 KB</small>
            </div>
          </div>
          <div class="actions">
            <a class="btn-link" href="./media/learnbridge-lesson-pack.zip" download aria-label="Download complete lesson pack for offline learning">Download Pack</a>
          </div>
        </div>
      </div>

      <dialog id="docDialog" aria-labelledby="docModalTitle">
        <div class="dialog-header">
          <h4 id="docModalTitle">Accessible Document Preview</h4>
          <button class="close-btn" id="closeDocBtn" aria-label="Close document preview">✕</button>
        </div>
        <div id="docContent"></div>
      </dialog>
    `;

    this.bindEvents();
  }
}

if (!customElements.get('learnbridge-resource-list')) {
  customElements.define('learnbridge-resource-list', LearnBridgeResourceList);
}

export default LearnBridgeResourceList;

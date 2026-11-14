/**
 * LearnBridge — Certificate Access and Verification Web Component
 * <learnbridge-certificate>
 *
 * Provides accessible certificate display and one-click verification action.
 * Adheres to WCAG 2.2 AA:
 * - Proper heading structure & accessible landmarks
 * - Verification modal with focus trapping & Escape-to-close
 * - Copyable verification code with live screen-reader announcement
 * - Clear disclaimer: explicitly labelled as a simulated verification demo
 */

class LearnBridgeCertificate extends HTMLElement {
  static get observedAttributes() {
    return ['learner-name', 'course-title', 'certificate-id', 'issue-date', 'verified'];
  }

  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
  }

  connectedCallback() {
    this.render();
    this.bindEvents();
  }

  get certificateId() {
    return this.getAttribute('certificate-id') || 'ALX-ETH-LB-2026-9842';
  }

  openVerificationModal() {
    const dialog = this.shadowRoot.querySelector('#verifyDialog');
    if (dialog && typeof dialog.showModal === 'function') {
      dialog.showModal();
    }
  }

  closeVerificationModal() {
    const dialog = this.shadowRoot.querySelector('#verifyDialog');
    if (dialog && dialog.open) {
      dialog.close();
    }
  }

  async copyVerificationCode() {
    const code = this.certificateId;
    const status = this.shadowRoot.querySelector('#copyStatus');
    const copyBtn = this.shadowRoot.querySelector('#copyBtn');

    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(code);
      }
      if (copyBtn) {
        copyBtn.textContent = 'Copied!';
        setTimeout(() => { copyBtn.textContent = 'Copy ID'; }, 2000);
      }
      if (status) status.textContent = `Verification ID ${code} copied to clipboard.`;
    } catch (e) {
      if (status) status.textContent = `Verification code: ${code}`;
    }
  }

  bindEvents() {
    const root = this.shadowRoot;
    const verifyBtn = root.querySelector('#verifyBtn');
    const copyBtn = root.querySelector('#copyBtn');
    const closeDialogBtn = root.querySelector('#closeDialogBtn');
    const dialog = root.querySelector('#verifyDialog');

    if (verifyBtn) verifyBtn.addEventListener('click', () => this.openVerificationModal());
    if (copyBtn) copyBtn.addEventListener('click', () => this.copyVerificationCode());
    if (closeDialogBtn) closeDialogBtn.addEventListener('click', () => this.closeVerificationModal());

    if (dialog) {
      dialog.addEventListener('cancel', () => this.closeVerificationModal());
      dialog.addEventListener('click', (e) => {
        if (e.target === dialog) this.closeVerificationModal();
      });
    }
  }

  render() {
    const name = this.getAttribute('learner-name') || 'Selamawit Tadesse';
    const course = this.getAttribute('course-title') || 'Inclusive Learning & Digital Accessibility Studio';
    const certId = this.certificateId;
    const issueDate = this.getAttribute('issue-date') || 'November 2026';

    this.shadowRoot.innerHTML = `
      <style>
        :host {
          display: block;
          font-family: inherit;
          --accent: #c5f18e;
          --seafoam: #85d7bb;
          --line: rgba(221, 243, 230, 0.12);
        }

        .cert-card {
          display: flex;
          flex-direction: column;
          gap: 16px;
          padding: 24px;
          border-radius: 20px;
          border: 1px solid var(--line);
          background: rgba(14, 30, 26, 0.75);
          backdrop-filter: blur(20px) saturate(140%);
          -webkit-backdrop-filter: blur(20px) saturate(140%);
          box-shadow: 0 15px 35px rgba(0, 0, 0, 0.35);
          color: #e6f0e9;
        }

        .cert-top {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          border-bottom: 1px solid var(--line);
          padding-bottom: 14px;
        }

        .cert-badge {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          color: var(--accent);
          font-size: 11px;
          font-weight: 700;
          letter-spacing: 0.8px;
          text-transform: uppercase;
        }

        .cert-id-tag {
          font-family: monospace;
          font-size: 11px;
          color: var(--seafoam);
          background: rgba(133, 215, 187, 0.08);
          border: 1px solid rgba(133, 215, 187, 0.2);
          padding: 3px 8px;
          border-radius: 6px;
        }

        .cert-body {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        .cert-body h3 {
          margin: 0;
          font-size: 18px;
          font-weight: 700;
          color: #ffffff;
        }

        .cert-body p {
          margin: 0;
          font-size: 13px;
          color: #a4bea9;
          line-height: 1.5;
        }

        .cert-meta {
          display: flex;
          flex-wrap: wrap;
          gap: 16px;
          font-size: 12px;
          color: #bad3c2;
          margin-top: 4px;
        }

        .cert-meta strong {
          color: #ffffff;
        }

        .cert-actions {
          display: flex;
          align-items: center;
          gap: 10px;
          margin-top: 6px;
        }

        .btn {
          min-height: 38px;
          padding: 0 16px;
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

        .btn-primary {
          background: var(--accent);
          color: #071611;
          border: 1px solid var(--accent);
        }

        .btn-primary:hover, .btn-primary:focus-visible {
          background: #d5f8a8;
          outline: none;
        }

        .btn-secondary {
          background: rgba(255, 255, 255, 0.06);
          border: 1px solid rgba(255, 255, 255, 0.15);
          color: #e5f2e8;
        }

        .btn-secondary:hover, .btn-secondary:focus-visible {
          background: rgba(255, 255, 255, 0.12);
          border-color: var(--accent);
          outline: none;
        }

        .btn:focus-visible {
          outline: 2px solid var(--accent);
          outline-offset: 2px;
        }

        /* Dialog modal styling */
        dialog {
          border: 1px solid var(--line);
          border-radius: 20px;
          background: rgba(9, 23, 20, 0.94);
          color: #ffffff;
          padding: 24px;
          max-width: 480px;
          width: 90%;
          box-shadow: 0 30px 80px rgba(0, 0, 0, 0.8);
          backdrop-filter: blur(24px);
          -webkit-backdrop-filter: blur(24px);
        }

        dialog::backdrop {
          background: rgba(0, 0, 0, 0.7);
          backdrop-filter: blur(4px);
        }

        .dialog-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 14px;
          border-bottom: 1px solid var(--line);
          padding-bottom: 10px;
        }

        .dialog-header h4 {
          margin: 0;
          font-size: 16px;
          font-weight: 700;
          color: var(--accent);
        }

        .close-icon-btn {
          background: transparent;
          border: none;
          color: #a4bea9;
          font-size: 18px;
          cursor: pointer;
        }

        .verify-field {
          margin-bottom: 12px;
          font-size: 13px;
        }

        .verify-field label {
          display: block;
          color: #8da495;
          font-size: 11px;
          text-transform: uppercase;
          letter-spacing: 0.6px;
          margin-bottom: 2px;
        }

        .verify-field span {
          color: #e6f0e9;
          font-weight: 600;
        }

        .demo-callout {
          padding: 10px 12px;
          border-radius: 10px;
          background: rgba(197, 241, 142, 0.08);
          border: 1px solid rgba(197, 241, 142, 0.2);
          font-size: 12px;
          color: #d8ede0;
          line-height: 1.45;
          margin: 16px 0;
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
      </style>

      <article class="cert-card" role="region" aria-label="Certificate for ${name}">
        <div class="cert-top">
          <div class="cert-badge">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>
            <span>Verified Learning Credential</span>
          </div>
          <span class="cert-id-tag">${certId}</span>
        </div>

        <div class="cert-body">
          <h3>${course}</h3>
          <p>Awarded to <strong>${name}</strong> for completing all inclusive learning modules, accessibility audits, and real-time caption/interpreter labs.</p>
          <div class="cert-meta">
            <div>Issuer: <strong>ALX Ethiopia · Digital Bridge</strong></div>
            <div>Issued: <strong>${issueDate}</strong></div>
            <div>Status: <strong style="color:var(--accent);">Active · Verified</strong></div>
          </div>
        </div>

        <div class="cert-actions">
          <button class="btn btn-primary" id="verifyBtn" type="button">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>
            <span>Verify Credential</span>
          </button>
          <button class="btn btn-secondary" id="copyBtn" type="button" aria-label="Copy certificate verification code">
            <span>Copy ID</span>
          </button>
        </div>

        <div class="sr-only" id="copyStatus" aria-live="polite"></div>

        <dialog id="verifyDialog" aria-labelledby="dialogTitle">
          <div class="dialog-header">
            <h4 id="dialogTitle">Certificate Verification Record</h4>
            <button class="close-icon-btn" id="closeDialogBtn" aria-label="Close verification dialog">✕</button>
          </div>
          <div class="verify-field">
            <label>Recipient</label>
            <span>${name}</span>
          </div>
          <div class="verify-field">
            <label>Course Title</label>
            <span>${course}</span>
          </div>
          <div class="verify-field">
            <label>Credential ID</label>
            <span style="font-family:monospace; color:var(--seafoam);">${certId}</span>
          </div>
          <div class="verify-field">
            <label>Cryptographic Proof</label>
            <span style="font-family:monospace; font-size:11px; word-break:break-all; color:#a2baa7;">sha256:4b18c027e8a93df71bb4045f91e8432a9c379f826317b2049e75c60205d6e241</span>
          </div>
          <div class="demo-callout">
            <strong>Demonstration Notice:</strong> This verification is simulated for the Digital Bridge Hackathon. The component is architecturally prepared to connect to an official ALX Savanna verification REST endpoint upon production integration.
          </div>
          <button class="btn btn-secondary" style="width:100%;" onclick="this.closest('dialog').close()">Done</button>
        </dialog>
      </article>
    `;
  }
}

if (!customElements.get('learnbridge-certificate')) {
  customElements.define('learnbridge-certificate', LearnBridgeCertificate);
}

export default LearnBridgeCertificate;

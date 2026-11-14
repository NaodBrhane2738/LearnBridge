/**
 * LearnBridge Employment — Administration, Trust & Compliance Manager
 * Vets employer trade registrations, resolves scam reports, and controls external adapters.
 */

class AdminManager {
  constructor() {
    this.pendingEmployers = [];
    this.reports = [];
    this.providers = [];
  }

  async init() {
    this.bindEvents();
  }

  bindEvents() {
    const syncBtn = document.getElementById('btn-admin-sync-feeds');
    if (syncBtn) {
      syncBtn.addEventListener('click', () => this.runExternalSync());
    }
  }

  async loadAdminData() {
    try {
      // 1. Pending verification queue
      const empRes = await fetch('/api/v1/employment/admin/verification-queue');
      const empJson = await empRes.json();
      if (empJson.success) {
        this.pendingEmployers = empJson.data;
        this.renderVerificationQueue();
      }

      // 2. Scam / Fraud reports
      const repRes = await fetch('/api/v1/employment/admin/reports');
      const repJson = await repRes.json();
      if (repJson.success) {
        this.reports = repJson.data;
        this.renderReportsList();
      }

      // 3. Registered External Providers
      const provRes = await fetch('/api/v1/employment/external/providers');
      const provJson = await provRes.json();
      if (provJson.success) {
        this.providers = provJson.data;
        this.renderProvidersList();
      }
    } catch (err) {
      console.error("[AdminManager] Error loading admin data:", err);
    }
  }

  renderVerificationQueue() {
    const container = document.getElementById('admin-employer-queue');
    if (!container) return;

    if (this.pendingEmployers.length === 0) {
      container.innerHTML = `
        <div class="empty-state-box" style="padding: 24px;">
          <p style="color: var(--text-secondary);">No employers awaiting verification. All registrations vetted.</p>
        </div>
      `;
      return;
    }

    container.innerHTML = this.pendingEmployers.map(emp => `
      <div class="job-card" style="padding: 16px; margin-bottom: 12px;">
        <div style="display: flex; justify-content: space-between; align-items: flex-start; gap: 12px;">
          <div>
            <h4 style="font-weight: 700; font-size: 1.1rem;">${emp.name}</h4>
            <div style="font-size: 0.875rem; color: var(--text-secondary); margin-top: 2px;">
              Trade Reg: <code>${emp.registrationNumber}</code> · Industry: ${emp.industry} · Location: ${emp.location}
            </div>
            <div style="font-size: 0.8125rem; color: var(--text-muted); margin-top: 4px;">Contact: ${emp.contactEmail}</div>
          </div>
          <div style="display: flex; gap: 8px;">
            <button type="button" class="btn btn-sm btn-primary btn-verify-action" data-id="${emp.id}" data-action="approve">
              Approve & Badge
            </button>
            <button type="button" class="btn btn-sm btn-outline btn-verify-action" data-id="${emp.id}" data-action="reject">
              Reject
            </button>
          </div>
        </div>
      </div>
    `).join('');

    container.querySelectorAll('.btn-verify-action').forEach(btn => {
      btn.addEventListener('click', () => {
        this.submitVerification(btn.dataset.id, btn.dataset.action);
      });
    });
  }

  renderReportsList() {
    const container = document.getElementById('admin-reports-list');
    if (!container) return;

    if (this.reports.length === 0) {
      container.innerHTML = `<p style="color: var(--text-secondary);">No active moderation reports.</p>`;
      return;
    }

    container.innerHTML = this.reports.map(rep => `
      <div class="job-card" style="padding: 14px; margin-bottom: 10px;">
        <div style="display: flex; justify-content: space-between;">
          <strong style="color: var(--accent-rose);">Flagged Reason: ${rep.reason}</strong>
          <span class="badge ${rep.status === 'resolved' ? 'badge-verified' : 'badge-expired'}">${rep.status}</span>
        </div>
        <p style="font-size: 0.875rem; color: var(--text-secondary); margin-top: 4px;">
          Job: <strong>${rep.jobTitle || rep.jobId}</strong> (${rep.employerName || 'Employer'})
        </p>
        <p style="font-size: 0.8125rem; color: var(--text-muted); margin-top: 2px;">"${rep.details}"</p>
      </div>
    `).join('');
  }

  renderProvidersList() {
    const container = document.getElementById('admin-providers-list');
    if (!container) return;

    container.innerHTML = this.providers.map(p => `
      <div class="job-card" style="padding: 12px; margin-bottom: 8px;">
        <div style="display: flex; justify-content: space-between; align-items: center;">
          <div>
            <strong>${p.providerName}</strong>
            <span style="font-size: 0.8125rem; color: var(--text-muted); margin-left: 8px;">ID: ${p.providerId}</span>
          </div>
          <span class="badge badge-verified">${p.agreementStatus}</span>
        </div>
      </div>
    `).join('');
  }

  async submitVerification(employerId, action) {
    try {
      const response = await fetch(`/api/v1/employment/admin/verify-employer/${employerId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action })
      });
      const json = await response.json();
      if (json.success) {
        if (window.a11y) {
          window.a11y.showVisualToast(`Employer ${action === 'approve' ? 'approved & verified' : 'rejected'}`);
          window.a11y.announceLive(`Employer ${action === 'approve' ? 'verified' : 'rejected'}.`, false);
        }
        this.loadAdminData();
      }
    } catch (err) {
      console.error("[AdminManager] Verification error:", err);
    }
  }

  async runExternalSync() {
    const btn = document.getElementById('btn-admin-sync-feeds');
    if (btn) btn.disabled = true;

    if (window.a11y) {
      window.a11y.announceLive("Synchronizing external feeds with deduplication...", false);
    }

    try {
      const response = await fetch('/api/v1/employment/external/sync', { method: 'POST' });
      const json = await response.json();

      if (json.success) {
        const stats = json.data;
        const msg = `Sync complete: ${stats.importedCount} new, ${stats.duplicateSkippedCount} duplicates skipped, ${stats.expiredCount} expired flagged.`;
        if (window.a11y) {
          window.a11y.showVisualToast(msg);
          window.a11y.announceLive(msg, true);
          window.a11y.playEarcon('rising');
        }
      }
    } catch (err) {
      console.error("[AdminManager] Sync error:", err);
    } finally {
      if (btn) btn.disabled = false;
    }
  }
}

window.adminManager = new AdminManager();

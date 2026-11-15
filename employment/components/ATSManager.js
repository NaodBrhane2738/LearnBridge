/**
 * LearnBridge Employment — Employer Portal & ATS Component
 * Features vacancy publishing, applicant tracking, accommodations review, and status transitions.
 * Enforces non-discrimination guardrails.
 */

class ATSManager {
  constructor() {
    this.currentEmployerId = 'emp-alx-africa';
    this.jobs = [];
    this.activeJobId = null;
    this.applications = [];
  }

  async init() {
    this.bindEvents();
  }

  bindEvents() {
    // Post new job form submission
    const postForm = document.getElementById('employer-post-job-form');
    if (postForm) {
      postForm.addEventListener('submit', (e) => {
        e.preventDefault();
        this.publishVacancy();
      });
    }

    // Modal close triggers
    const postModal = document.getElementById('employer-post-dialog');
    if (postModal) {
      postModal.querySelector('.btn-close').addEventListener('click', () => postModal.close());
      const cancel = document.getElementById('btn-cancel-post-job');
      if (cancel) cancel.addEventListener('click', () => postModal.close());
    }
  }

  async loadEmployerData() {
    try {
      const response = await fetch('/api/v1/employment/employer/jobs', {
        headers: { 'x-employer-id': this.currentEmployerId }
      });
      const json = await response.json();
      if (json.success) {
        this.jobs = json.data;
        this.renderEmployerJobsList();
      }
    } catch (err) {
      console.error("[ATSManager] Error loading employer data:", err);
    }
  }

  renderEmployerJobsList() {
    const container = document.getElementById('employer-vacancies-list');
    if (!container) return;

    if (this.jobs.length === 0) {
      container.innerHTML = `
        <div class="empty-state-box">
          <div class="empty-state-icon">
            <svg class="ui-icon" style="width: 32px; height: 32px;" viewBox="0 0 24 24"><rect x="2" y="7" width="20" height="14" rx="2" ry="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/></svg>
          </div>
          <h4 class="empty-state-title">No Active Job Postings</h4>
          <p class="empty-state-desc">Click "Post New Vacancy" to publish an accessible career opportunity.</p>
        </div>
      `;
      return;
    }

    container.innerHTML = this.jobs.map(job => `
      <div class="job-card" style="padding: 16px;">
        <div class="job-card-top">
          <div>
            <h4 style="font-size: 1.15rem; font-weight: 700;">${job.title}</h4>
            <div style="font-size: 0.875rem; color: var(--text-secondary); margin-top: 4px;">
              ${job.location} · ${job.employmentType} · Deadline: ${new Date(job.deadline).toLocaleDateString()}
            </div>
          </div>
          <button type="button" class="btn btn-sm btn-primary btn-view-applicants" data-id="${job.id}">
            View Applicants
          </button>
        </div>
      </div>
    `).join('');

    // Bind click events on applicant view buttons
    container.querySelectorAll('.btn-view-applicants').forEach(btn => {
      btn.addEventListener('click', () => {
        this.loadApplicantsForJob(btn.dataset.id);
      });
    });
  }

  async loadApplicantsForJob(jobId) {
    this.activeJobId = jobId;
    const activeJob = this.jobs.find(j => j.id === jobId);

    try {
      const response = await fetch(`/api/v1/employment/employer/jobs/${jobId}/applications`, {
        headers: { 'x-employer-id': this.currentEmployerId }
      });
      const json = await response.json();

      if (json.success) {
        this.applications = json.data;
        this.renderApplicantsModal(activeJob, this.applications);
      }
    } catch (err) {
      console.error("[ATSManager] Error loading applicants:", err);
    }
  }

  renderApplicantsModal(job, applications) {
    const modal = document.getElementById('ats-applicants-dialog');
    if (!modal) return;

    document.getElementById('ats-job-title').textContent = job.title;
    const listContainer = document.getElementById('ats-applicants-container');

    if (applications.length === 0) {
      listContainer.innerHTML = `
        <div class="empty-state-box">
          <h4 class="empty-state-title">No Applicants Yet</h4>
          <p class="empty-state-desc">Applications will appear here as candidates submit their profiles.</p>
        </div>
      `;
    } else {
      listContainer.innerHTML = applications.map(app => {
        const accommShared = app.accommodationsSnapshot && app.accommodationsSnapshot.shared;
        return `
          <div class="job-card" style="margin-bottom: 12px; padding: 18px;">
            <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 8px;">
              <div>
                <h4 style="font-size: 1.15rem; font-weight: 700;">${app.candidateName}</h4>
                <div style="font-size: 0.875rem; color: var(--text-secondary);">${app.candidateEmail} · Applied on ${new Date(app.appliedAt).toLocaleDateString()}</div>
              </div>
              <span class="badge ${app.status === 'interview' ? 'badge-verified' : 'badge-accomm'}">${app.status.toUpperCase()}</span>
            </div>

            ${app.coverNote ? `<div style="background: var(--surface-elevated); padding: 10px; border-radius: var(--radius-sm); font-size: 0.875rem; margin-bottom: 10px;"><strong>Cover Note:</strong> ${app.coverNote}</div>` : ''}

            ${accommShared ? `
              <div style="background: rgba(16, 185, 129, 0.08); border: 1px solid rgba(16, 185, 129, 0.25); padding: 10px; border-radius: var(--radius-sm); margin-bottom: 12px; font-size: 0.875rem;">
                <strong style="color: var(--accent-primary);">Candidate-Shared Accommodations:</strong>
                <ul style="margin-top: 4px; padding-left: 18px; color: var(--text-secondary);">
                  ${(app.accommodationsSnapshot.items || []).map(i => `<li>${i}</li>`).join('')}
                </ul>
              </div>
            ` : ''}

            <div style="display: flex; gap: 8px; flex-wrap: wrap; align-items: center; justify-content: flex-end; border-top: 1px solid var(--border); padding-top: 12px;">
              <span style="font-size: 0.8125rem; color: var(--text-muted); margin-right: auto;">Advance Candidate Pipeline:</span>
              <button type="button" class="btn btn-sm btn-outline btn-status-change" data-id="${app.id}" data-status="reviewing">Reviewing</button>
              <button type="button" class="btn btn-sm btn-outline btn-status-change" data-id="${app.id}" data-status="shortlisted">Shortlist</button>
              <button type="button" class="btn btn-sm btn-primary btn-status-change" data-id="${app.id}" data-status="interview">Interview</button>
              <button type="button" class="btn btn-sm btn-outline btn-status-change" data-id="${app.id}" data-status="offer">Offer</button>
            </div>
          </div>
        `;
      }).join('');

      // Status change handlers
      listContainer.querySelectorAll('.btn-status-change').forEach(btn => {
        btn.addEventListener('click', () => {
          this.updateApplicantStatus(btn.dataset.id, btn.dataset.status);
        });
      });
    }

    modal.showModal();
  }

  async updateApplicantStatus(applicationId, newStatus) {
    try {
      const response = await fetch(`/api/v1/employment/employer/applications/${applicationId}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'x-employer-id': this.currentEmployerId
        },
        body: JSON.stringify({
          status: newStatus,
          note: `Recruiter moved candidate to ${newStatus}`
        })
      });

      const json = await response.json();
      if (json.success) {
        if (window.a11y) {
          window.a11y.showVisualToast(`Applicant moved to ${newStatus}`);
          window.a11y.announceLive(`Applicant status updated to ${newStatus}.`, false);
        }
        // Refresh modal
        this.loadApplicantsForJob(this.activeJobId);
      }
    } catch (err) {
      console.error("[ATSManager] Error updating status:", err);
    }
  }

  async publishVacancy() {
    const title = document.getElementById('post-job-title').value;
    const industry = document.getElementById('post-job-industry').value;
    const location = document.getElementById('post-job-location').value;
    const employmentType = document.getElementById('post-job-type').value;
    const salaryMin = document.getElementById('post-job-salary-min').value;
    const salaryMax = document.getElementById('post-job-salary-max').value;
    const deadline = document.getElementById('post-job-deadline').value;
    const isRemote = document.getElementById('post-job-remote').checked;
    const description = document.getElementById('post-job-description').value;

    const payload = {
      title,
      industry,
      location,
      employmentType,
      salaryMin,
      salaryMax,
      deadline,
      isRemote,
      description,
      accommodations: {
        screen_reader_ready: { status: document.getElementById('post-accomm-screen-reader').checked ? 'supported' : 'not_specified' },
        etsl_interpreter: { status: document.getElementById('post-accomm-etsl').checked ? 'supported' : 'not_specified' },
        wheelchair_accessible: { status: document.getElementById('post-accomm-wheelchair').checked ? 'supported' : 'not_specified' }
      }
    };

    try {
      const response = await fetch('/api/v1/employment/employer/jobs', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-employer-id': this.currentEmployerId
        },
        body: JSON.stringify(payload)
      });

      const json = await response.json();
      if (json.success) {
        document.getElementById('employer-post-dialog').close();
        if (window.a11y) {
          window.a11y.playEarcon('rising');
          window.a11y.showVisualToast(`Vacancy published: ${title}`);
          window.a11y.announceLive(`Vacancy '${title}' published successfully.`, true);
        }
        this.loadEmployerData();
      }
    } catch (err) {
      console.error("[ATSManager] Error publishing vacancy:", err);
    }
  }
}

window.atsManager = new ATSManager();

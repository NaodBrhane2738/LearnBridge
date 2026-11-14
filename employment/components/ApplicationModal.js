/**
 * LearnBridge Employment — Accessible Application Modal & External Disclosure
 * Handles internal candidate applications, preview, and transparent external routing.
 */

class ApplicationModal {
  constructor() {
    this.activeJob = null;
    this.candidate = null;
    this.dialog = null;
    this.externalDialog = null;
  }

  init() {
    this.dialog = document.getElementById('application-dialog');
    this.externalDialog = document.getElementById('external-apply-dialog');
    this.bindEvents();
  }

  bindEvents() {
    if (this.dialog) {
      this.dialog.querySelector('.btn-close').addEventListener('click', () => this.dialog.close());
      const cancelBtn = document.getElementById('btn-cancel-apply');
      if (cancelBtn) cancelBtn.addEventListener('click', () => this.dialog.close());

      const form = document.getElementById('job-application-form');
      if (form) {
        form.addEventListener('submit', (e) => {
          e.preventDefault();
          this.submitApplication();
        });
      }
    }

    if (this.externalDialog) {
      this.externalDialog.querySelector('.btn-close').addEventListener('click', () => this.externalDialog.close());
      const cancelExt = document.getElementById('btn-cancel-external');
      if (cancelExt) cancelExt.addEventListener('click', () => this.externalDialog.close());

      const proceedBtn = document.getElementById('btn-proceed-external');
      if (proceedBtn) {
        proceedBtn.addEventListener('click', () => {
          const targetUrl = proceedBtn.dataset.url;
          if (targetUrl) {
            window.open(targetUrl, '_blank', 'noopener,noreferrer');
          }
          this.externalDialog.close();
        });
      }
    }
  }

  open(job, candidate) {
    this.activeJob = job;
    this.candidate = candidate;

    if (job.applicationMethod === 'external') {
      this.openExternalDisclosure(job);
      return;
    }

    // Populate Dialog
    document.getElementById('apply-modal-job-title').textContent = job.title;
    document.getElementById('apply-modal-employer').textContent = `${job.employerName} · ${job.location}`;

    // Populate Resumes
    const resumeSelect = document.getElementById('apply-resume-select');
    if (resumeSelect) {
      resumeSelect.innerHTML = '';
      const resumes = candidate.resumes || [];
      if (resumes.length === 0) {
        resumeSelect.innerHTML = `<option value="">No CV uploaded. Current profile details will be submitted.</option>`;
      } else {
        resumes.forEach(r => {
          resumeSelect.innerHTML += `<option value="${r.id}" ${r.isPrimary ? 'selected' : ''}>${r.fileName} (${r.fileSize})</option>`;
        });
      }
    }

    // Accommodations profile checkbox state
    const accommCheckbox = document.getElementById('apply-share-accomm');
    const accommPreview = document.getElementById('apply-accomm-preview-box');
    if (accommCheckbox && accommPreview) {
      const accommProfile = candidate.accommodationsProfile;
      if (accommProfile && accommProfile.accommodationsRequested && accommProfile.accommodationsRequested.length > 0) {
        accommPreview.style.display = 'block';
        accommPreview.innerHTML = `
          <strong>Candidate-Authored Accommodations to be shared:</strong>
          <ul style="margin-top: 4px; padding-left: 20px;">
            ${accommProfile.accommodationsRequested.map(a => `<li>${a}</li>`).join('')}
          </ul>
        `;
        accommCheckbox.checked = accommProfile.shareWithEmployers;
      } else {
        accommPreview.style.display = 'none';
        accommCheckbox.checked = false;
      }
    }

    // Reset error banner
    const errBox = document.getElementById('apply-error-banner');
    if (errBox) errBox.style.display = 'none';

    this.dialog.showModal();
    if (window.a11y) {
      window.a11y.announceLive(`Application dialog opened for ${job.title}. Select your CV and confirm details.`, true);
      window.a11y.speak(`Apply for ${job.title} at ${job.employerName}. Review your CV and optional accommodations.`);
    }
  }

  openExternalDisclosure(job) {
    document.getElementById('ext-modal-title').textContent = job.title;
    document.getElementById('ext-modal-provider').textContent = job.originalProvider || "Authorized External Partner";
    document.getElementById('ext-modal-destination').textContent = job.externalUrl || "External Career Portal";

    const proceedBtn = document.getElementById('btn-proceed-external');
    if (proceedBtn) {
      proceedBtn.dataset.url = job.externalUrl || '#';
    }

    this.externalDialog.showModal();
    if (window.a11y) {
      window.a11y.announceLive(`Notice: You are leaving LearnBridge to apply on ${job.originalProvider || 'external site'}.`, true);
    }
  }

  async submitApplication() {
    if (!this.activeJob || !this.candidate) return;

    const coverNote = document.getElementById('apply-cover-note').value;
    const shareAccommodations = document.getElementById('apply-share-accomm').checked;
    const resumeId = document.getElementById('apply-resume-select').value;

    const payload = {
      jobId: this.activeJob.id,
      coverNote,
      shareAccommodations,
      resumeId
    };

    try {
      const response = await fetch('/api/v1/employment/applications', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-candidate-id': this.candidate.id
        },
        body: JSON.stringify(payload)
      });

      const json = await response.json();

      if (!response.ok) {
        const errBox = document.getElementById('apply-error-banner');
        if (errBox) {
          errBox.textContent = json.error ? json.error.message : "Error submitting application.";
          errBox.style.display = 'block';
        }
        if (window.a11y) {
          window.a11y.announceLive(`Application failed: ${json.error?.message}`, true);
          window.a11y.playEarcon('falling');
        }
        return;
      }

      // Successful submission
      this.dialog.close();
      if (window.a11y) {
        window.a11y.playEarcon('rising');
        window.a11y.showVisualToast(`Application submitted for ${this.activeJob.title}!`);
        window.a11y.announceLive(`Application successfully submitted for ${this.activeJob.title}. Tracking is active on your dashboard.`, true);
        window.a11y.speak(`Congratulations. Your application for ${this.activeJob.title} has been submitted.`);
      }

      // Refresh applications view if on applications page or dashboard
      if (window.refreshAppState) {
        window.refreshAppState();
      }
    } catch (err) {
      console.error("[ApplicationModal] Error:", err);
    }
  }
}

window.applicationModal = new ApplicationModal();

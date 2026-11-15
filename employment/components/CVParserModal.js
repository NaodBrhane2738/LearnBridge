/**
 * LearnBridge Employment — Accessible CV Parsing & Review Modal
 * Provides document upload, field extraction review, manual fallback, and explicit confirmation.
 * Strictly adheres to project rule: Zero unconfirmed saves.
 */

class CVParserModal {
  constructor() {
    this.dialog = null;
    this.extractedDraft = null;
    this.candidate = null;
  }

  init() {
    this.dialog = document.getElementById('cv-parser-dialog');
    this.bindEvents();
  }

  bindEvents() {
    if (!this.dialog) return;

    this.dialog.querySelector('.btn-close').addEventListener('click', () => this.dialog.close());
    const cancelBtn = document.getElementById('btn-cancel-cv-review');
    if (cancelBtn) cancelBtn.addEventListener('click', () => this.dialog.close());

    // File input change
    const fileInput = document.getElementById('cv-file-picker');
    if (fileInput) {
      fileInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) this.processFile(file);
      });
    }

    // Manual paste button
    const parseBtn = document.getElementById('btn-parse-pasted-text');
    if (parseBtn) {
      parseBtn.addEventListener('click', () => {
        const text = document.getElementById('cv-pasted-text').value;
        if (text) this.sendTextForParsing(text, "Pasted_Resume_Text.txt");
      });
    }

    // Confirm & Save button
    const confirmBtn = document.getElementById('btn-confirm-save-cv');
    if (confirmBtn) {
      confirmBtn.addEventListener('click', () => this.saveConfirmedCV());
    }
  }

  open(candidate) {
    this.candidate = candidate;
    this.resetState();
    this.dialog.showModal();
    if (window.a11y) {
      window.a11y.announceLive("CV upload dialog opened. Select a file or paste text to extract profile details.", true);
    }
  }

  resetState() {
    document.getElementById('cv-upload-step').style.display = 'block';
    document.getElementById('cv-review-step').style.display = 'none';
    document.getElementById('cv-pasted-text').value = '';
    const err = document.getElementById('cv-error-banner');
    if (err) err.style.display = 'none';
  }

  processFile(file) {
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target.result;
      this.sendTextForParsing(text, file.name, file.size);
    };
    reader.onerror = () => {
      this.showError("Could not read uploaded file.");
    };
    reader.readAsText(file);
  }

  async sendTextForParsing(cvText, fileName = "Resume.pdf", fileSize = 150000) {
    try {
      if (window.a11y) window.a11y.announceLive("Extracting fields from CV...", false);

      const response = await fetch('/api/v1/employment/candidate/me/parse-cv', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cvText, fileName, fileSize })
      });

      const json = await response.json();
      if (!response.ok) {
        this.showError(json.error ? json.error.message : "Parsing failed.");
        return;
      }

      this.extractedDraft = json.data;
      this.renderReviewStep(this.extractedDraft);
    } catch (err) {
      this.showError("Network error during parsing: " + err.message);
    }
  }

  renderReviewStep(draft) {
    document.getElementById('cv-upload-step').style.display = 'none';
    document.getElementById('cv-review-step').style.display = 'block';

    const data = draft.extractedData || {};
    document.getElementById('review-full-name').value = data.fullName || '';
    document.getElementById('review-email').value = data.email || '';
    document.getElementById('review-phone').value = data.phone || '';
    document.getElementById('review-skills').value = (data.skills || []).join(', ');

    const eduBox = document.getElementById('review-edu-list');
    if (eduBox) {
      eduBox.innerHTML = '';
      (data.education || []).forEach(edu => {
        eduBox.innerHTML += `<li>${edu.degree} (${edu.graduationYear || 'Year unspecified'})</li>`;
      });
      if (!data.education || data.education.length === 0) {
        eduBox.innerHTML = `<li><em>No formal degree extracted. You can add this in your candidate profile.</em></li>`;
      }
    }

    if (window.a11y) {
      window.a11y.announceLive("Extraction complete. Review and edit extracted fields before confirming.", true);
      window.a11y.speak("Extraction complete. Please verify your name, email, and skills before saving.");
    }
  }

  async saveConfirmedCV() {
    if (!this.candidate) return;

    const confirmedName = document.getElementById('review-full-name').value;
    const confirmedEmail = document.getElementById('review-email').value;
    const confirmedPhone = document.getElementById('review-phone').value;
    const confirmedSkills = document.getElementById('review-skills').value.split(',').map(s => s.trim()).filter(Boolean);

    try {
      const response = await fetch('/api/v1/employment/candidate/me/resumes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-candidate-id': this.candidate.id
        },
        body: JSON.stringify({
          fileName: this.extractedDraft.fileName,
          fileSize: this.extractedDraft.fileSize,
          confirmedSkills,
          confirmedEducation: this.extractedDraft.extractedData.education,
          confirmedExperience: this.extractedDraft.extractedData.experience
        })
      });

      // Also update candidate personal fields
      await fetch('/api/v1/employment/candidate/me', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'x-candidate-id': this.candidate.id
        },
        body: JSON.stringify({
          fullName: confirmedName || this.candidate.fullName,
          email: confirmedEmail || this.candidate.email,
          phone: confirmedPhone || this.candidate.phone,
          profileCompletion: 95
        })
      });

      this.dialog.close();
      if (window.a11y) {
        window.a11y.playEarcon('rising');
        window.a11y.showVisualToast("CV successfully verified and saved to profile!");
        window.a11y.announceLive("CV verified and saved to profile. Profile completion updated to 95%.", true);
        window.a11y.speak("Your CV and profile fields have been saved.");
      }

      if (window.refreshAppState) {
        window.refreshAppState();
      }
    } catch (err) {
      this.showError("Error saving confirmed CV: " + err.message);
    }
  }

  showError(msg) {
    const errBox = document.getElementById('cv-error-banner');
    if (errBox) {
      errBox.textContent = msg;
      errBox.style.display = 'block';
    }
    if (window.a11y) {
      window.a11y.announceLive(`Error: ${msg}`, true);
      window.a11y.playEarcon('falling');
    }
  }
}

window.cvParserModal = new CVParserModal();

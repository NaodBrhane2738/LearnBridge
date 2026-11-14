/**
 * LearnBridge Employment — Main Client Application Coordinator
 * Powers routing, search & filtering, dashboard, detail view, ATS, and 5-language localization.
 */

class EmploymentApp {
  constructor() {
    this.currentRoute = 'dashboard';
    this.currentCandidate = null;
    this.allJobs = [];
    this.savedJobIds = new Set();
    this.activeSearchFilters = {
      q: '',
      industry: 'all',
      location: 'all',
      remoteType: 'all',
      employmentType: 'all',
      experienceLevel: 'all',
      accommodation: 'all',
      verifiedOnly: false,
      sortBy: 'newest',
      page: 1,
      limit: 10
    };
    this.activeSpeechJobId = null;
    this.translations = {};
    this.currentLang = 'en';
  }

  async init() {
    // 1. Initialize Accessibility Engine
    if (window.a11y) {
      window.a11y.init();
    }

    // 2. Load Localization Dictionary
    await this.loadLanguage(localStorage.getItem('lb_emp_lang') || 'en');

    // 3. Load Candidate & Data
    await this.loadInitialData();

    // 4. Initialize Subcomponents
    if (window.applicationModal) window.applicationModal.init();
    if (window.cvParserModal) window.cvParserModal.init();
    if (window.signLanguagePlayer) await window.signLanguagePlayer.init();
    if (window.atsManager) await window.atsManager.init();
    if (window.adminManager) await window.adminManager.init();

    // 5. Setup Routing & Events
    this.bindGlobalEvents();
    this.handleRoute();
    window.addEventListener('hashchange', () => this.handleRoute());

    window.refreshAppState = () => this.refreshData();
  }

  async loadInitialData() {
    try {
      // Load Candidate Profile
      const candRes = await fetch('/api/v1/employment/candidate/me', {
        headers: { 'x-candidate-id': 'ethio-candidate-01' }
      });
      const candJson = await candRes.json();
      if (candJson.success) {
        this.currentCandidate = candJson.data;
        this.savedJobIds = new Set(this.currentCandidate.savedJobIds || []);
      }

      // Initial Jobs Load
      await this.executeSearch();
    } catch (err) {
      console.warn("[EmploymentApp] Falling back to client-side data:", err.message);
    }
  }

  async refreshData() {
    await this.loadInitialData();
    this.renderCurrentView();
  }

  // -------------------------------------------------------------
  // LOCALIZATION SYSTEM (5 Languages)
  // -------------------------------------------------------------
  async loadLanguage(langCode) {
    this.currentLang = langCode;
    localStorage.setItem('lb_emp_lang', langCode);
    document.documentElement.lang = langCode;

    try {
      const response = await fetch(`localization/${langCode}.json`);
      if (response.ok) {
        this.translations = await response.json();
        this.applyTranslations();
      }
    } catch (err) {
      console.warn(`[EmploymentApp] Error loading ${langCode}.json:`, err);
    }

    // Update active language selector button
    document.querySelectorAll('.lang-btn, .lang-choice-btn').forEach(btn => {
      const isActive = btn.dataset.lang === langCode;
      btn.classList.toggle('active', isActive);
      btn.setAttribute('aria-pressed', isActive ? 'true' : 'false');
    });
  }

  applyTranslations() {
    document.querySelectorAll('[data-i18n]').forEach(el => {
      const key = el.getAttribute('data-i18n');
      const text = this._getTranslationKey(key);
      if (text) {
        if (el.tagName === 'INPUT' && el.type === 'text') {
          el.placeholder = text;
        } else {
          el.textContent = text;
        }
      }
    });
  }

  _getTranslationKey(dotPath) {
    const parts = dotPath.split('.');
    let cur = this.translations;
    for (const p of parts) {
      if (!cur || typeof cur !== 'object') return null;
      cur = cur[p];
    }
    return typeof cur === 'string' ? cur : null;
  }

  // -------------------------------------------------------------
  // ROUTING SYSTEM
  // -------------------------------------------------------------
  handleRoute() {
    const hash = window.location.hash.slice(1) || 'dashboard';
    const parts = hash.split('/');
    const mainView = parts[0];

    this.currentRoute = mainView;

    // Update nav links & floating dock buttons
    document.querySelectorAll('.nav-link, .dock-btn').forEach(link => {
      const href = link.getAttribute('href');
      const isActive = href === `#${mainView}`;
      link.classList.toggle('active', isActive);
      link.setAttribute('aria-current', isActive ? 'page' : 'false');
    });

    // Toggle View Containers
    document.querySelectorAll('.page-view').forEach(view => {
      view.style.display = 'none';
    });

    if (mainView === 'job' && parts[1]) {
      this.renderJobDetailView(parts[1]);
    } else if (mainView === 'search') {
      this.renderSearchView();
    } else if (mainView === 'profile') {
      this.renderProfileView();
    } else if (mainView === 'employer') {
      this.renderEmployerView();
    } else if (mainView === 'admin') {
      this.renderAdminView();
    } else if (mainView === 'saved') {
      this.renderSavedJobsView();
    } else if (mainView === 'applications') {
      this.renderApplicationsView();
    } else {
      this.renderDashboardView();
    }

    window.scrollTo(0, 0);
  }

  // -------------------------------------------------------------
  // VIEW RENDERERS
  // -------------------------------------------------------------

  // 1. Personalized Dashboard
  async renderDashboardView() {
    const view = document.getElementById('view-dashboard');
    if (!view) return;
    view.style.display = 'block';

    const cand = this.currentCandidate || { fullName: 'Candidate', profileCompletion: 75 };
    document.getElementById('dash-cand-name').textContent = cand.fullName;
    document.getElementById('dash-profile-num').textContent = `${cand.profileCompletion || 75}%`;
    document.getElementById('dash-profile-bar').style.width = `${cand.profileCompletion || 75}%`;

    // Active applications count
    try {
      const appRes = await fetch('/api/v1/employment/applications', {
        headers: { 'x-candidate-id': cand.id || 'ethio-candidate-01' }
      });
      const appJson = await appRes.json();
      const apps = appJson.success ? appJson.data : [];
      document.getElementById('dash-apps-num').textContent = apps.length;

      // Saved count
      document.getElementById('dash-saved-num').textContent = this.savedJobIds.size;

      // Recommendations with explainability
      const recRes = await fetch(`/api/v1/employment/jobs/recommendations?candidateId=${cand.id || 'ethio-candidate-01'}`);
      const recJson = await recRes.json();
      const recs = recJson.success ? recJson.data : [];
      this.renderRecommendations(recs);

      // Recent listings
      const recentJobs = this.allJobs.slice(0, 4);
      this.renderRecentJobs(recentJobs);
    } catch (err) {
      console.error("[Dashboard] Error:", err);
    }

    if (window.a11y) {
      window.a11y.announceLive(`Personalized dashboard loaded for ${cand.fullName}.`, false);
    }
  }

  renderRecommendations(recs) {
    const container = document.getElementById('dash-recommendations-list');
    if (!container) return;

    if (recs.length === 0) {
      container.innerHTML = `<p style="color: var(--text-secondary);">No active recommendations found.</p>`;
      return;
    }

    container.innerHTML = recs.map(r => `
      <div class="subcard-tile" style="margin-bottom: 16px;">
        <div style="display: flex; justify-content: space-between; align-items: flex-start; gap: 12px; margin-bottom: 10px;">
          <div>
            <h4 style="font-size: 1.15rem; font-weight: 700; line-height: 1.3;">
              <a href="#job/${r.job.id}" style="color: #FFFFFF; text-decoration: none;">${r.job.title}</a>
            </h4>
            <div style="color: var(--text-secondary); font-size: 0.85rem; margin-top: 2px;">${r.job.employerName} · ${r.job.location}</div>
          </div>
          <span class="badge badge-verified" style="font-size: 0.82rem; padding: 4px 10px;">
            <svg class="ui-icon" style="width: 13px; height: 13px;" viewBox="0 0 24 24"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
            ${r.matchScore}% Match
          </span>
        </div>
        <div style="background: rgba(16, 185, 129, 0.12); border: 1px solid rgba(16, 185, 129, 0.28); padding: 9px 13px; border-radius: var(--radius-subcard); font-size: 0.8125rem; color: #FFFFFF; margin-bottom: 12px;">
          <strong style="color: var(--accent-mint);">Why recommended:</strong> ${r.explanation.summary}
        </div>
        <div style="display: flex; justify-content: space-between; align-items: center;">
          <span style="font-weight: 600; color: var(--accent-mint); font-size: 0.9rem;">
            ${r.job.salaryDisclosed ? `${r.job.salaryMin.toLocaleString()} ${r.job.currency}` : 'Competitive'}
          </span>
          <a href="#job/${r.job.id}" class="btn btn-sm btn-secondary">Review & Apply →</a>
        </div>
      </div>
    `).join('');
  }

  renderRecentJobs(jobs) {
    const container = document.getElementById('dash-recent-jobs-list');
    if (!container) return;
    container.innerHTML = jobs.map(j => window.JobCardComponent.render(j, this.savedJobIds.has(j.id))).join('');
    this.bindJobCardActions(container);
  }

  // 2. Search & Filtering View
  renderSearchView() {
    const view = document.getElementById('view-search');
    if (!view) return;
    view.style.display = 'block';

    const container = document.getElementById('search-results-list');
    if (!container) return;

    if (this.allJobs.length === 0) {
      container.innerHTML = `
        <div class="empty-state-box">
          <div class="empty-state-icon">🔍</div>
          <h4 class="empty-state-title">No Matching Opportunities</h4>
          <p class="empty-state-desc">Try clearing some filters or searching with different keywords.</p>
        </div>
      `;
      document.getElementById('search-results-count').textContent = '0 opportunities found';
      return;
    }

    document.getElementById('search-results-count').textContent = `${this.allJobs.length} opportunities found`;
    container.innerHTML = this.allJobs.map(j => window.JobCardComponent.render(j, this.savedJobIds.has(j.id))).join('');
    this.bindJobCardActions(container);

    if (window.a11y) {
      window.a11y.announceLive(`${this.allJobs.length} opportunities match your search filters.`, false);
    }
  }

  // 3. Job Detail View
  async renderJobDetailView(jobId) {
    const view = document.getElementById('view-job-detail');
    if (!view) return;
    view.style.display = 'block';

    try {
      const response = await fetch(`/api/v1/employment/jobs/${jobId}`);
      const json = await response.json();

      if (!json.success || !json.data) {
        view.innerHTML = `<div class="empty-state-box"><h4 class="empty-state-title">Job Not Found</h4></div>`;
        return;
      }

      const job = json.data;
      const isSaved = this.savedJobIds.has(job.id);

      // Populate Detail View
      document.getElementById('detail-title').textContent = job.title;
      document.getElementById('detail-employer').textContent = job.employerName;
      document.getElementById('detail-location').textContent = job.location;
      document.getElementById('detail-description').textContent = job.description;

      // Responsibilities
      const respBox = document.getElementById('detail-responsibilities');
      respBox.innerHTML = (job.responsibilities || []).map(r => `<li>${escapeHTML(r)}</li>`).join('');

      // Requirements
      const reqBox = document.getElementById('detail-requirements');
      reqBox.innerHTML = (job.requirements || []).map(r => `<li>${escapeHTML(r)}</li>`).join('');

      // Skills
      const skillsBox = document.getElementById('detail-skills');
      skillsBox.innerHTML = (job.skills || []).map(s => `<span class="meta-pill">${escapeHTML(s)}</span>`).join(' ');

      // Compensation
      const compBox = document.getElementById('detail-compensation');
      compBox.innerHTML = `
        <div style="font-size: 1.15rem; font-weight: 700; color: var(--accent-primary);">
          ${job.salaryDisclosed ? `${job.salaryMin.toLocaleString()} - ${job.salaryMax.toLocaleString()} ${job.currency} (${job.salaryPeriod || 'Monthly'})` : 'Compensation Disclosed Upon Interview'}
        </div>
        <p style="color: var(--text-secondary); margin-top: 4px; font-size: 0.875rem;">
          Employment Type: <strong>${job.employmentType}</strong> · Arrangement: <strong>${job.workArrangement || 'Standard'}</strong>
        </p>
      `;

      // Accommodations Matrix
      const accommBox = document.getElementById('detail-accommodations-matrix');
      accommBox.innerHTML = '';
      if (job.accommodations) {
        Object.keys(job.accommodations).forEach(k => {
          const item = job.accommodations[k];
          accommBox.innerHTML += `
            <div class="accomm-row">
              <span class="accomm-status-badge status-${item.status.replace(/_/g, '-')}">${item.status.replace(/_/g, ' ')}</span>
              <div>
                <strong style="font-size: 0.875rem;">${k.replace(/_/g, ' ').toUpperCase()}</strong>
                <p style="font-size: 0.8125rem; color: var(--text-secondary); margin-top: 2px;">${item.details || 'Standard support.'}</p>
              </div>
            </div>
          `;
        });
      }

      // Sidebar Action
      const actionBox = document.getElementById('detail-sidebar-actions');
      actionBox.innerHTML = `
        <div style="display: flex; flex-direction: column; gap: 10px;">
          ${job.isExpired
            ? `<button class="btn btn-secondary" disabled>Applications Closed</button>`
            : job.applicationMethod === 'external'
              ? `<button class="btn btn-primary btn-apply-external" data-id="${job.id}" data-url="${job.externalUrl || ''}">Apply on Partner Site ↗</button>`
              : `<button class="btn btn-primary btn-open-apply-modal" data-id="${job.id}">Submit Application</button>`
          }
          <button class="btn btn-outline btn-save-job" data-id="${job.id}">
            ${isSaved ? '★ Saved to Favorites' : '☆ Save Vacancy'}
          </button>
          <button class="btn btn-outline btn-listen-summary" data-id="${job.id}">
            🔊 Listen to Spoken Summary
          </button>
          <button class="btn btn-outline" id="btn-open-report-dialog" style="color: var(--accent-rose); border-color: rgba(244,63,94,0.3);">
            🚩 Report this Vacancy
          </button>
        </div>
      `;

      this.bindJobCardActions(actionBox);

      // Report trigger
      const reportBtn = document.getElementById('btn-open-report-dialog');
      if (reportBtn) {
        reportBtn.addEventListener('click', () => {
          this.openReportDialog(job);
        });
      }

      if (window.a11y) {
        window.a11y.announceLive(`Viewing job details for ${job.title} at ${job.employerName}.`, false);
        if (window.a11y.currentMode === 'blind') {
          window.a11y.speak(job.audioSummaryText || `Now viewing ${job.title} at ${job.employerName}.`);
        }
      }
    } catch (err) {
      console.error("[JobDetail] Error:", err);
    }
  }

  // 4. Candidate Profile View
  renderProfileView() {
    const view = document.getElementById('view-profile');
    if (!view) return;
    view.style.display = 'block';

    const cand = this.currentCandidate || {};
    document.getElementById('prof-name-input').value = cand.fullName || '';
    document.getElementById('prof-email-input').value = cand.email || '';
    document.getElementById('prof-phone-input').value = cand.phone || '';
    document.getElementById('prof-location-input').value = cand.location || '';
    document.getElementById('prof-summary-input').value = cand.summary || '';
    document.getElementById('prof-skills-input').value = (cand.skills || []).join(', ');

    // Accommodations profile
    const accomm = cand.accommodationsProfile || {};
    const accommCheckbox = document.getElementById('prof-share-accomm-toggle');
    if (accommCheckbox) accommCheckbox.checked = accomm.shareWithEmployers || false;

    const accommNotes = document.getElementById('prof-accomm-notes');
    if (accommNotes) accommNotes.value = accomm.candidateNotes || '';

    // CV Upload trigger
    const uploadCvBtn = document.getElementById('btn-trigger-cv-modal');
    if (uploadCvBtn) {
      uploadCvBtn.onclick = () => {
        if (window.cvParserModal) window.cvParserModal.open(this.currentCandidate);
      };
    }
  }

  // 5. Saved Jobs View
  renderSavedJobsView() {
    const view = document.getElementById('view-saved');
    if (!view) return;
    view.style.display = 'block';

    const container = document.getElementById('saved-jobs-container');
    if (!container) return;

    const savedJobs = this.allJobs.filter(j => this.savedJobIds.has(j.id));
    if (savedJobs.length === 0) {
      container.innerHTML = `
        <div class="empty-state-box">
          <div class="empty-state-icon">⭐</div>
          <h4 class="empty-state-title">No Saved Opportunities Yet</h4>
          <p class="empty-state-desc">Bookmark jobs from the search or dashboard to review them here anytime.</p>
          <a href="#search" class="btn btn-primary" style="margin-top: 12px;">Browse Open Vacancies</a>
        </div>
      `;
      return;
    }

    container.innerHTML = savedJobs.map(j => window.JobCardComponent.render(j, true)).join('');
    this.bindJobCardActions(container);
  }

  // 6. Applications View
  async renderApplicationsView() {
    const view = document.getElementById('view-applications');
    if (!view) return;
    view.style.display = 'block';

    const container = document.getElementById('candidate-applications-container');
    if (!container) return;

    try {
      const response = await fetch('/api/v1/employment/applications', {
        headers: { 'x-candidate-id': this.currentCandidate?.id || 'ethio-candidate-01' }
      });
      const json = await response.json();
      const apps = json.success ? json.data : [];

      if (apps.length === 0) {
        container.innerHTML = `
          <div class="empty-state-box">
            <div class="empty-state-icon">📄</div>
            <h4 class="empty-state-title">No Applications Submitted Yet</h4>
            <p class="empty-state-desc">When you apply for vacancies, your real-time review status, interviews, and recruiter messages will appear here.</p>
            <a href="#search" class="btn btn-primary" style="margin-top: 12px;">Explore Jobs & Apply</a>
          </div>
        `;
        return;
      }

      container.innerHTML = apps.map(app => `
        <div class="job-card" style="padding: 20px; margin-bottom: 16px;">
          <div style="display: flex; justify-content: space-between; align-items: flex-start; gap: 12px;">
            <div>
              <h3 style="font-size: 1.25rem; font-weight: 700;">${app.jobTitle}</h3>
              <div style="color: var(--text-secondary); font-size: 0.9rem; margin-top: 4px;">
                ${app.employerName} · Applied on ${new Date(app.appliedAt).toLocaleDateString()}
              </div>
            </div>
            <span class="badge ${app.status === 'interview' ? 'badge-verified' : 'badge-accomm'}" style="font-size: 0.875rem; padding: 4px 10px;">
              ${app.status.toUpperCase()}
            </span>
          </div>

          <div style="margin-top: 16px; border-top: 1px solid var(--border); padding-top: 12px;">
            <strong style="font-size: 0.875rem; color: var(--text-secondary);">Application Timeline:</strong>
            <ul style="margin-top: 6px; padding-left: 20px; font-size: 0.8125rem; color: var(--text-muted); display: flex; flex-direction: column; gap: 4px;">
              ${(app.timeline || []).map(t => `<li><strong>${new Date(t.date).toLocaleDateString()}</strong>: ${t.note}</li>`).join('')}
            </ul>
          </div>

          ${app.messages && app.messages.length > 0 ? `
            <div style="margin-top: 12px; background: var(--surface-elevated); padding: 12px; border-radius: var(--radius-sm); border: 1px solid var(--border);">
              <strong style="color: var(--accent-primary); font-size: 0.875rem;">Recruiter Message:</strong>
              <p style="font-size: 0.875rem; margin-top: 4px; color: var(--text-main);">${app.messages[app.messages.length - 1].text}</p>
            </div>
          ` : ''}
        </div>
      `).join('');
    } catch (err) {
      console.error("[ApplicationsView] Error:", err);
    }
  }

  // 7. Employer View
  renderEmployerView() {
    const view = document.getElementById('view-employer');
    if (!view) return;
    view.style.display = 'block';
    if (window.atsManager) {
      window.atsManager.loadEmployerData();
    }
  }

  // 8. Admin View
  renderAdminView() {
    const view = document.getElementById('view-admin');
    if (!view) return;
    view.style.display = 'block';
    if (window.adminManager) {
      window.adminManager.loadAdminData();
    }
  }

  // -------------------------------------------------------------
  // ACTIONS BINDINGS
  // -------------------------------------------------------------
  bindGlobalEvents() {
    // Search input on hero banner
    const heroInput = document.getElementById('hero-search-input');
    const heroBtn = document.getElementById('btn-hero-search');
    if (heroBtn && heroInput) {
      const doSearch = () => {
        this.activeSearchFilters.q = heroInput.value;
        window.location.hash = '#search';
        this.executeSearch();
      };
      heroBtn.addEventListener('click', doSearch);
      heroInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') doSearch();
      });
    }

    // Voice search button
    const voiceSearchBtn = document.getElementById('btn-voice-search');
    if (voiceSearchBtn) {
      voiceSearchBtn.addEventListener('click', () => {
        if (window.a11y) {
          window.a11y.startVoiceSearch((transcript) => {
            if (heroInput) heroInput.value = transcript;
            this.activeSearchFilters.q = transcript;
            window.location.hash = '#search';
            this.executeSearch();
            if (window.a11y) {
              window.a11y.announceLive(`Voice search query applied: ${transcript}`, true);
              window.a11y.playEarcon('rising');
            }
          });
        }
      });
    }

    // Language buttons triggers
    document.querySelectorAll('.lang-choice-btn, .lang-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        this.loadLanguage(btn.dataset.lang);
      });
    });

    // Profile save trigger
    const saveProfBtn = document.getElementById('btn-save-candidate-profile');
    if (saveProfBtn) {
      saveProfBtn.addEventListener('click', () => this.saveCandidateProfile());
    }

    // Search filters form change
    const filterPanel = document.getElementById('search-filter-panel');
    if (filterPanel) {
      filterPanel.addEventListener('change', () => this.handleFilterChange());
    }

    const clearFiltersBtn = document.getElementById('btn-clear-filters');
    if (clearFiltersBtn) {
      clearFiltersBtn.addEventListener('click', () => {
        document.getElementById('filter-industry').value = 'all';
        document.getElementById('filter-location').value = 'all';
        document.getElementById('filter-type').value = 'all';
        document.getElementById('filter-remote').value = 'all';
        document.getElementById('filter-accomm').value = 'all';
        document.getElementById('filter-verified-only').checked = false;
        document.getElementById('filter-search-input').value = '';
        this.activeSearchFilters = {
          q: '',
          industry: 'all',
          location: 'all',
          remoteType: 'all',
          employmentType: 'all',
          experienceLevel: 'all',
          accommodation: 'all',
          verifiedOnly: false,
          sortBy: 'newest',
          page: 1,
          limit: 10
        };
        this.executeSearch();
      });
    }

    // Post job modal trigger on employer portal
    const postModalTrigger = document.getElementById('btn-open-post-job-modal');
    if (postModalTrigger) {
      postModalTrigger.addEventListener('click', () => {
        document.getElementById('employer-post-dialog').showModal();
      });
    }
  }

  handleFilterChange() {
    this.activeSearchFilters.industry = document.getElementById('filter-industry')?.value || 'all';
    this.activeSearchFilters.location = document.getElementById('filter-location')?.value || 'all';
    this.activeSearchFilters.employmentType = document.getElementById('filter-type')?.value || 'all';
    this.activeSearchFilters.remoteType = document.getElementById('filter-remote')?.value || 'all';
    this.activeSearchFilters.accommodation = document.getElementById('filter-accomm')?.value || 'all';
    this.activeSearchFilters.verifiedOnly = document.getElementById('filter-verified-only')?.checked || false;
    this.activeSearchFilters.sortBy = document.getElementById('filter-sort-by')?.value || 'newest';
    this.activeSearchFilters.q = document.getElementById('filter-search-input')?.value || '';

    this.executeSearch();
  }

  async executeSearch() {
    const params = new URLSearchParams();
    Object.keys(this.activeSearchFilters).forEach(k => {
      const v = this.activeSearchFilters[k];
      if (v !== '' && v !== 'all' && v !== false) {
        params.set(k, v);
      }
    });

    try {
      const response = await fetch(`/api/v1/employment/jobs?${params.toString()}`);
      const json = await response.json();
      if (json.success) {
        this.allJobs = json.data;
        if (this.currentRoute === 'search') {
          this.renderSearchView();
        }
      }
    } catch (err) {
      console.warn("[EmploymentApp] Search API error:", err);
    }
  }

  bindJobCardActions(scopeEl) {
    // 1. Save Job Bookmark
    scopeEl.querySelectorAll('.btn-save-job').forEach(btn => {
      btn.onclick = async (e) => {
        e.preventDefault();
        const jobId = btn.dataset.id;
        await this.toggleSaveJob(jobId, btn);
      };
    });

    // 2. Open Internal Apply Modal
    scopeEl.querySelectorAll('.btn-open-apply-modal').forEach(btn => {
      btn.onclick = (e) => {
        e.preventDefault();
        const jobId = btn.dataset.id;
        const job = this.allJobs.find(j => j.id === jobId);
        if (job && window.applicationModal) {
          window.applicationModal.open(job, this.currentCandidate);
        }
      };
    });

    // 3. Open External Destination Modal
    scopeEl.querySelectorAll('.btn-apply-external').forEach(btn => {
      btn.onclick = (e) => {
        e.preventDefault();
        const jobId = btn.dataset.id;
        const job = this.allJobs.find(j => j.id === jobId);
        if (job && window.applicationModal) {
          window.applicationModal.openExternalDisclosure(job);
        }
      };
    });

    // 4. Audio Summary Play/Stop
    scopeEl.querySelectorAll('.btn-listen-summary').forEach(btn => {
      btn.onclick = (e) => {
        e.preventDefault();
        const jobId = btn.dataset.id;
        this.toggleAudioSummary(jobId, btn);
      };
    });
  }

  async toggleSaveJob(jobId, btn) {
    const isSaved = this.savedJobIds.has(jobId);
    const method = isSaved ? 'DELETE' : 'POST';
    const endpoint = isSaved 
      ? `/api/v1/employment/candidate/me/saved-jobs/${jobId}` 
      : `/api/v1/employment/candidate/me/saved-jobs`;

    try {
      const response = await fetch(endpoint, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'x-candidate-id': this.currentCandidate?.id || 'ethio-candidate-01'
        },
        body: isSaved ? null : JSON.stringify({ jobId })
      });

      const json = await response.json();
      if (json.success) {
        if (isSaved) {
          this.savedJobIds.delete(jobId);
          btn.innerHTML = '☆ Save';
          btn.classList.remove('btn-secondary', 'active');
          btn.classList.add('btn-outline');
          if (window.a11y) {
            window.a11y.showVisualToast("Job removed from saved jobs.");
            window.a11y.announceLive("Job removed from favorites.", false);
            window.a11y.playEarcon('falling');
          }
        } else {
          this.savedJobIds.add(jobId);
          btn.innerHTML = '★ Saved';
          btn.classList.remove('btn-outline');
          btn.classList.add('btn-secondary', 'active');
          if (window.a11y) {
            window.a11y.showVisualToast("Job bookmarked to saved jobs!");
            window.a11y.announceLive("Job saved to your favorites.", false);
            window.a11y.playEarcon('rising');
          }
        }
      }
    } catch (err) {
      console.error("[EmploymentApp] Toggle save error:", err);
    }
  }

  toggleAudioSummary(jobId, btn) {
    if (this.activeSpeechJobId === jobId) {
      if (window.a11y) window.a11y.stopSpeech();
      this.activeSpeechJobId = null;
      btn.innerHTML = '🔊 Listen';
      return;
    }

    const job = this.allJobs.find(j => j.id === jobId);
    if (!job) return;

    if (window.a11y) {
      const textToSpeak = job.audioSummaryText || `${job.title} at ${job.employerName}. Location: ${job.location}.`;
      window.a11y.speak(textToSpeak);
      this.activeSpeechJobId = jobId;
      btn.innerHTML = '⏹ Stop Audio';

      // Reset button text after speech completes
      setTimeout(() => {
        if (this.activeSpeechJobId === jobId) {
          btn.innerHTML = '🔊 Listen';
          this.activeSpeechJobId = null;
        }
      }, 14000);
    }
  }

  async saveCandidateProfile() {
    const fullName = document.getElementById('prof-name-input').value;
    const email = document.getElementById('prof-email-input').value;
    const phone = document.getElementById('prof-phone-input').value;
    const location = document.getElementById('prof-location-input').value;
    const summary = document.getElementById('prof-summary-input').value;
    const skills = document.getElementById('prof-skills-input').value.split(',').map(s => s.trim()).filter(Boolean);

    const shareAccommodations = document.getElementById('prof-share-accomm-toggle').checked;
    const candidateNotes = document.getElementById('prof-accomm-notes').value;

    const payload = {
      fullName,
      email,
      phone,
      location,
      summary,
      skills,
      accommodationsProfile: {
        shareWithEmployers: shareAccommodations,
        candidateNotes,
        accommodationsRequested: this.currentCandidate?.accommodationsProfile?.accommodationsRequested || []
      }
    };

    try {
      const response = await fetch('/api/v1/employment/candidate/me', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'x-candidate-id': this.currentCandidate?.id || 'ethio-candidate-01'
        },
        body: JSON.stringify(payload)
      });

      const json = await response.json();
      if (json.success) {
        this.currentCandidate = json.data;
        if (window.a11y) {
          window.a11y.playEarcon('rising');
          window.a11y.showVisualToast("Candidate profile updated successfully!");
          window.a11y.announceLive("Profile changes saved.", true);
        }
      }
    } catch (err) {
      console.error("[ProfileView] Save error:", err);
    }
  }

  openReportDialog(job) {
    const dialog = document.getElementById('report-dialog');
    if (!dialog) return;

    document.getElementById('report-job-title').textContent = job.title;
    document.getElementById('report-employer').textContent = job.employerName;

    const form = document.getElementById('report-job-form');
    form.onsubmit = async (e) => {
      e.preventDefault();
      const reason = document.getElementById('report-reason-select').value;
      const details = document.getElementById('report-details-input').value;

      try {
        await fetch(`/api/v1/employment/jobs/${job.id}/report`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ reason, details })
        });
        dialog.close();
        if (window.a11y) {
          window.a11y.showVisualToast("Report submitted. LearnBridge moderation team will review.");
          window.a11y.announceLive("Report received.", false);
        }
      } catch (err) {
        console.error("Report error:", err);
      }
    };

    dialog.showModal();
  }
}

document.addEventListener('DOMContentLoaded', () => {
  window.app = new EmploymentApp();
  window.app.init();
});

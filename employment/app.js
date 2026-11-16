/**
 * LearnBridge Employment — Main Client Application Coordinator
 * Powers routing, search & filtering, dashboard, detail view, ATS, and 5-language localization.
 */

class EmploymentApp {
  constructor() {
    this.currentRoute = 'search';
    this.currentCandidate = window.PRELOADED_CANDIDATE || null;
    this.allJobs = (window.PRELOADED_JOBS || []).map(item => item.job || item);
    this.savedJobIds = new Set();
    this.activeCandidateProfile = window.PRELOADED_CANDIDATE || null;
    this.cardDeck = (window.PRELOADED_JOBS || []).slice();
    this.currentCardIndex = 0;
    this.isCardAnimating = false;
    this._cardNodeCache = new Map();
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
      limit: 50
    };
    this.activeSpeechJobId = null;
    this.translations = {};
    this.currentLang = 'en';
    window.app = this;
  }

  async init() {
    // 1. Synchronous warm-up of preloaded candidate & jobs for instant 0ms first paint
    if (window.PRELOADED_CANDIDATE && !this.activeCandidateProfile) {
      this.currentCandidate = window.PRELOADED_CANDIDATE;
      this.activeCandidateProfile = window.PRELOADED_CANDIDATE;
    }
    if (window.PRELOADED_JOBS && (!this.cardDeck || this.cardDeck.length === 0)) {
      this.allJobs = window.PRELOADED_JOBS.map(item => item.job || item);
      this.cardDeck = window.PRELOADED_JOBS.slice();
    }

    // Bind events to the pre-baked first card immediately
    const existingStack = document.getElementById('deck-3d-stack');
    if (existingStack) {
      this.bindCardNodeEvents(existingStack, 0);
      if (!this._cardNodeCache) this._cardNodeCache = new Map();
      this._cardNodeCache.set(0, existingStack);
    }

    // 2. Pre-render upcoming card DOM nodes into cache immediately
    this.preloadCardCache();

    // 3. Immediately render initial route on tick 0
    this.bindGlobalEvents();
    this.handleRoute();
    window.addEventListener('hashchange', () => this.handleRoute());

    // 4. Initialize Accessibility Engine
    if (window.a11y) {
      window.a11y.init();
    }

    // 5. Initialize Application Wizard Modal
    if (window.applicationModal) window.applicationModal.init();

    // 6. Non-blocking background sync
    const initialLang = localStorage.getItem('lb_emp_lang') || localStorage.getItem('learnbridge_lang') || 'en';
    this.loadLanguage(initialLang).catch(() => {});
    this.loadInitialData().catch(() => {});

    window.refreshAppState = () => this.refreshData();

    // 7. Cross-frame Voice Action Listener from Parent LMS
    window.addEventListener('message', (event) => {
      const data = event.data;
      if (!data || data.type !== 'LB_VOICE_ACTION') return;
      const action = data.action;
      console.log('[EmploymentApp] Received cross-frame voice action:', action);

      if (action === 'JOB_PASS' || action === 'JOB_REJECT') {
        if (window.a11y) window.a11y.stopSpeech();
        if ('speechSynthesis' in window) window.speechSynthesis.cancel();
        this.handleCardPass();
        if (window.a11y) window.a11y.showVisualToast('Voice: Rejected / Passed Opportunity');
      } else if (action === 'JOB_APPLY') {
        if (window.a11y) window.a11y.stopSpeech();
        if ('speechSynthesis' in window) window.speechSynthesis.cancel();
        this.handleCardApply();
        if (window.a11y) window.a11y.showVisualToast('Voice: Applied with Verified CV');
      } else if (action === 'JOB_DETAILS') {
        this.showCardDetailsAndRead();
        if (window.a11y) window.a11y.showVisualToast('Voice: Reading job details aloud');
      } else if (action === 'JOB_COLLAPSE') {
        this.collapseCardDetails();
      } else if (action === 'STOP_SPEECH') {
        if (window.a11y) window.a11y.stopSpeech();
        if ('speechSynthesis' in window) window.speechSynthesis.cancel();
      }

      // Acknowledge back to parent frame for VoiceBridge tracking
      if (data.requestId && event.source && typeof event.source.postMessage === 'function') {
        try {
          event.source.postMessage({
            type: 'LB_VOICE_ACTION_ACK',
            requestId: data.requestId,
            action,
            success: true
          }, '*');
        } catch (_) {}
      }
    });
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
    localStorage.setItem('learnbridge_lang', langCode);
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

    // Update active language selector dropdown
    const dropdown = document.getElementById('lang-select-dropdown');
    if (dropdown && dropdown.value !== langCode) {
      dropdown.value = langCode;
    }

    // Update active language selector button
    document.querySelectorAll('.lang-btn, .lang-choice-btn').forEach(btn => {
      const isActive = btn.dataset.lang === langCode;
      btn.classList.toggle('active', isActive);
      btn.setAttribute('aria-pressed', isActive ? 'true' : 'false');
    });

    if (window.a11y) {
      window.a11y.currentLanguage = langCode;
    }
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
    if (window.a11y) window.a11y.stopSpeech();
    if ('speechSynthesis' in window) {
      try { window.speechSynthesis.cancel(); } catch (_) {}
    }
    const hash = window.location.hash.slice(1) || 'search';
    const parts = hash.split('/');
    const mainView = parts[0];

    this.currentRoute = mainView;

    // Toggle View Containers
    document.querySelectorAll('.page-view').forEach(view => {
      view.style.display = 'none';
    });

    if (mainView === 'job' && parts[1]) {
      this.renderJobDetailView(parts[1]);
    } else {
      this.renderSearchView();
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
              <a href="#job/${r.job.id}" style="color: var(--text-main); text-decoration: none;">${r.job.title}</a>
            </h4>
            <div style="color: var(--text-secondary); font-size: 0.85rem; margin-top: 2px;">${r.job.employerName} · ${r.job.location}</div>
          </div>
          <span class="badge badge-verified" style="font-size: 0.82rem; padding: 4px 10px;">
            <svg class="ui-icon" style="width: 13px; height: 13px;" viewBox="0 0 24 24"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
            ${r.matchScore}% Match
          </span>
        </div>
        <div style="background: var(--status-emerald-bg); border: 1px solid var(--status-emerald-border); padding: 9px 13px; border-radius: var(--radius-subcard); font-size: 0.8125rem; color: var(--text-main); margin-bottom: 12px;">
          <strong style="color: var(--status-emerald-text);">Why recommended:</strong> ${r.explanation.summary}
        </div>
        <div style="display: flex; justify-content: space-between; align-items: center;">
          <span style="font-weight: 700; color: var(--alx-crimson); font-size: 0.9rem;">
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

  // 2. CV Matching & Swipeable Card Deck View
  renderSearchView() {
    const view = document.getElementById('view-search');
    if (!view) return;
    view.style.display = 'block';

    if (!this.activeCandidateProfile && window.PRELOADED_CANDIDATE) {
      this.activeCandidateProfile = window.PRELOADED_CANDIDATE;
    }

    if (this.cardDeck.length === 0 && window.PRELOADED_JOBS) {
      this.cardDeck = window.PRELOADED_JOBS.slice();
    }

    if (this.activeCandidateProfile) {
      this.displayActiveCvBanner(this.activeCandidateProfile);
    }
    this.renderActiveCard();
  }

  showCvUploadStage() {
    const uploadStage = document.getElementById('cv-upload-stage');
    const deckStage = document.getElementById('swipe-deck-stage');
    const activeBanner = document.getElementById('active-cv-banner');

    if (uploadStage) uploadStage.style.display = 'block';
    if (deckStage) deckStage.style.display = 'none';
    if (activeBanner) activeBanner.style.display = 'none';

    if (window.a11y) {
      window.a11y.announceLive("Upload your CV or choose a demo CV to unlock tailored job cards.", false);
    }
  }

  displayActiveCvBanner(profile) {
    const banner = document.getElementById('active-cv-banner');
    const nameEl = document.getElementById('active-cv-candidate-name');
    const skillsPreview = document.getElementById('active-cv-skills-preview');

    if (!banner) return;
    banner.style.display = 'flex';
    if (nameEl) nameEl.textContent = profile.fullName || 'Verified Candidate Profile';

    if (skillsPreview) {
      const skills = (profile.skills || []).slice(0, 8);
      skillsPreview.innerHTML = skills.map(s => `<span class="meta-pill">${s}</span>`).join(' ');
    }
  }

  preloadCardCache() {
    if (!this._cardNodeCache) this._cardNodeCache = new Map();
    const start = this.currentCardIndex;
    const end = Math.min(start + 4, this.cardDeck.length);
    for (let i = start; i < end; i++) {
      this.getPreRenderedCardElement(i);
    }
  }

  getPreRenderedCardElement(index) {
    if (index >= this.cardDeck.length) return null;
    if (!this._cardNodeCache) this._cardNodeCache = new Map();
    if (this._cardNodeCache.has(index)) {
      return this._cardNodeCache.get(index);
    }

    const currentItem = this.cardDeck[index];
    const temp = document.createElement('div');
    temp.innerHTML = window.JobCardComponent.renderSwipeCard(
      currentItem,
      index,
      this.cardDeck.length
    );
    const stackNode = temp.firstElementChild; // .deck-3d-stack

    this.bindCardNodeEvents(stackNode, index);
    this._cardNodeCache.set(index, stackNode);
    return stackNode;
  }

  bindCardNodeEvents(stackNode, index) {
    if (!stackNode) return;

    const passBtn = stackNode.querySelector('#btn-card-pass');
    const applyBtn = stackNode.querySelector('#btn-card-apply');
    const toggleBtn = stackNode.querySelector('#btn-card-toggle-details');
    const micBtn = stackNode.querySelector('#btn-deck-mic');

    if (passBtn) {
      passBtn.onclick = (e) => {
        e.preventDefault();
        this.handleCardPass();
      };
    }

    if (applyBtn) {
      applyBtn.onclick = (e) => {
        e.preventDefault();
        this.handleCardApply();
      };
    }

    if (toggleBtn) {
      toggleBtn.onclick = (e) => {
        e.preventDefault();
        this.toggleCardDetails();
      };
    }

    if (micBtn) {
      micBtn.onclick = (e) => {
        e.preventDefault();
        if (window.a11y) window.a11y.toggleVoiceListening();
      };
      if (window.a11y && window.a11y.isListeningActive) {
        micBtn.classList.add('is-listening');
        const lbl = micBtn.querySelector('.mic-status-label');
        if (lbl) lbl.textContent = 'Mic: On (V)';
      }
    }

    const activeCard = stackNode.querySelector('.swipe-card');
    if (activeCard) {
      this.bindSwipeGestures(activeCard);
    }
  }

  renderActiveCard(options = {}) {
    const deckStage = document.getElementById('swipe-deck-stage');
    const uploadStage = document.getElementById('cv-upload-stage');
    const wrapper = document.getElementById('active-card-wrapper');
    const emptyState = document.getElementById('deck-empty-state');

    if (uploadStage) uploadStage.style.display = 'none';
    if (deckStage) deckStage.style.display = 'block';

    if (!wrapper) return;

    if (this.currentCardIndex >= this.cardDeck.length || this.cardDeck.length === 0) {
      wrapper.replaceChildren();
      if (emptyState) emptyState.style.display = 'block';
      if (window.a11y) {
        window.a11y.announceLive("You've reviewed all recommended opportunities.", true);
      }
      return;
    }

    if (emptyState) emptyState.style.display = 'none';

    // Retrieve pre-rendered element instantly (0ms DOM creation)
    const cardNode = this.getPreRenderedCardElement(this.currentCardIndex);
    wrapper.replaceChildren(cardNode);

    // Auto-focus the active card for immediate keyboard accessibility (standalone only)
    if (window.self === window.top) {
      const activeCard = cardNode.querySelector('.swipe-card');
      if (activeCard) {
        activeCard.focus({ preventScroll: true });
      }
    }

    // Accessible announcements for screen readers & TTS
    const currentItem = this.cardDeck[this.currentCardIndex];
    const job = currentItem.job;
    const spokenSummary = `Opportunity ${this.currentCardIndex + 1} of ${this.cardDeck.length}: ${job.title} at ${job.employerName}. ${currentItem.matchScore}% Match. Press Right Arrow or say Apply to apply. Press Left Arrow or say Reject to pass. Press M for full details.`;
    if (window.a11y) {
      window.a11y.announceLive(spokenSummary, false);
      if (!options.skipSpeech && window.self === window.top && (window.a11y.currentMode === 'blind' || window.a11y.voiceActive)) {
        window.a11y.speak(spokenSummary);
      }
    }

    // Preload next cards in the pipeline
    this.preloadCardCache();
  }

  buildFullSpokenDetails(job, currentItem) {
    if (!job) return '';
    const parts = [];

    // Title, Employer & Location
    parts.push(`Opportunity: ${job.title} at ${job.employerName}, located in ${job.location}.`);

    // Compensation & Salary
    if (job.salaryDisclosed && job.salaryMin) {
      const sal = job.salaryMax
        ? `${job.salaryMin.toLocaleString()} to ${job.salaryMax.toLocaleString()} ${job.currency}`
        : `From ${job.salaryMin.toLocaleString()} ${job.currency}`;
      parts.push(`Compensation: ${sal}.`);
    } else {
      parts.push(`Compensation is disclosed upon interview.`);
    }

    // Industry & Work Arrangement
    parts.push(`Industry: ${job.industry || 'Technology'}. Work type: ${job.employmentType || 'Full-time'}, ${job.isRemote ? 'Remote' : (job.workArrangement || 'On-site')}.`);

    // Match Score & Reason
    if (currentItem?.matchScore) {
      parts.push(`Candidate match: ${currentItem.matchScore} percent.`);
    }
    if (currentItem?.explanation?.summary) {
      parts.push(`Match reason: ${currentItem.explanation.summary}.`);
    }

    // Description Overview
    if (job.description) {
      parts.push(`Role overview: ${job.description}.`);
    }

    // Key Responsibilities
    if (job.responsibilities && job.responsibilities.length > 0) {
      parts.push(`Key responsibilities include: ${job.responsibilities.join('. ')}.`);
    }

    // Requirements & Qualifications
    if (job.requirements && job.requirements.length > 0) {
      parts.push(`Requirements and qualifications: ${job.requirements.join('. ')}.`);
    }

    // Verified Workplace Accommodations
    const accomms = [];
    if (job.accommodations) {
      if (job.accommodations.screen_reader_ready?.status === 'supported') accomms.push('Screen reader workflows');
      if (job.accommodations.etsl_interpreter?.status === 'supported') accomms.push('Ethiopian Sign Language interpreter available');
      if (job.accommodations.captioned_meetings?.status === 'supported') accomms.push('Captioned meetings');
      if (job.accommodations.wheelchair_accessible?.status === 'supported') accomms.push('Barrier-free wheelchair access');
      if (job.accommodations.flexible_hours?.status === 'supported') accomms.push('Flexible work hours');
    }
    if (accomms.length > 0) {
      parts.push(`Verified workplace accommodations supported: ${accomms.join(', ')}.`);
    }

    // Next actions
    parts.push(`To apply with your uploaded CV, press Right Arrow or say Apply. To skip to the next opportunity, press Left Arrow or say Pass. To collapse details, press M or say Less.`);

    return parts.join(' ');
  }

  showCardDetailsAndRead() {
    const cardEl = document.querySelector('.swipe-card');
    if (!cardEl) return;
    const detailsEl = cardEl.querySelector('.swipe-card-expanded-details');
    const toggleBtn = cardEl.querySelector('#btn-card-toggle-details');
    if (!detailsEl) return;

    detailsEl.style.display = 'block';
    detailsEl.setAttribute('aria-hidden', 'false');
    cardEl.classList.add('is-expanded');
    if (toggleBtn) {
      toggleBtn.setAttribute('aria-expanded', 'true');
      const txt = toggleBtn.querySelector('.toggle-text');
      if (txt) txt.textContent = 'Less Details (Press M to collapse)';
    }

    if (window.a11y) {
      const currentItem = this.cardDeck[this.currentCardIndex];
      const job = currentItem?.job;
      if (job) {
        const fullReadout = this.buildFullSpokenDetails(job, currentItem);
        window.a11y.announceLive(fullReadout, false);
        window.a11y.speak(fullReadout);
      }
    }
  }

  collapseCardDetails() {
    const cardEl = document.querySelector('.swipe-card');
    if (!cardEl) return;
    const detailsEl = cardEl.querySelector('.swipe-card-expanded-details');
    const toggleBtn = cardEl.querySelector('#btn-card-toggle-details');
    if (!detailsEl) return;

    detailsEl.style.display = 'none';
    detailsEl.setAttribute('aria-hidden', 'true');
    cardEl.classList.remove('is-expanded');
    if (toggleBtn) {
      toggleBtn.setAttribute('aria-expanded', 'false');
      const txt = toggleBtn.querySelector('.toggle-text');
      if (txt) txt.textContent = 'More Details (Press M or click)';
    }

    if (window.a11y) {
      window.a11y.stopSpeech();
      window.a11y.announceLive("Collapsed details. Press Right Arrow to apply, Left Arrow to pass, M for details.", false);
    }
  }

  toggleCardDetails() {
    const cardEl = document.querySelector('.swipe-card');
    if (!cardEl) return;
    const detailsEl = cardEl.querySelector('.swipe-card-expanded-details');
    if (!detailsEl) return;

    const isExpanded = detailsEl.style.display !== 'none';
    if (isExpanded) {
      this.collapseCardDetails();
    } else {
      this.showCardDetailsAndRead();
    }
  }

  handleVoiceCommand(transcript) {
    if (!transcript) return false;
    const clean = transcript.toLowerCase().replace(/[^\w\s\u1200-\u137F]/g, ' ').trim();
    const words = clean.split(/\s+/);
    console.log("[EmploymentApp] Voice command heard:", transcript, "clean:", clean);

    // 0. Instant Stop / Quiet Command
    if (words.includes('stop') || words.includes('quiet') || words.includes('silence') ||
        words.includes('mute') || words.includes('shut') ||
        clean.includes('ዝም') || clean.includes('ቁም') || clean.includes('ደው') || clean.includes('dhaabi') || clean.includes('ስቕ')) {
      if (window.a11y) window.a11y.stopSpeech();
      if ('speechSynthesis' in window) window.speechSynthesis.cancel();
      if (window.a11y) window.a11y.showVisualToast('Speech stopped');
      return true;
    }

    // 1. More / Details Command
    const isMore = words.includes('more') || words.includes('detail') || words.includes('details') ||
                   words.includes('info') || words.includes('information') || words.includes('expand') ||
                   words.includes('full') || words.includes('read') || clean.includes('more') ||
                   clean.includes('ዝርዝር') || clean.includes('odeeffannoo');

    if (isMore) {
      this.showCardDetailsAndRead();
      if (window.a11y) window.a11y.showVisualToast('Voice: Reading full job details aloud');
      return true;
    }

    // 2. Collapse / Less Command
    const isLess = words.includes('less') || words.includes('collapse') || words.includes('close') ||
                   words.includes('hide');
    if (isLess) {
      this.collapseCardDetails();
      if (window.a11y) window.a11y.showVisualToast('Voice: Collapsed details');
      return true;
    }

    // 3. Apply / Right Arrow Command
    const isApply = words.includes('apply') || words.includes('right') || words.includes('yes') ||
                    words.includes('submit') || words.includes('accept') ||
                    clean.includes('apply') || clean.includes('right arrow') || clean.includes('arrow right') ||
                    clean.includes('ቀኝ') || clean.includes('አመልክት') || clean.includes('iyyadhu') || clean.includes('ኣመልክት');
    if (isApply) {
      if (window.a11y) window.a11y.stopSpeech();
      if ('speechSynthesis' in window) window.speechSynthesis.cancel();
      this.handleCardApply();
      if (window.a11y) window.a11y.showVisualToast('Voice: Applied with CV');
      return true;
    }

    // 4. Pass / Reject / Left Arrow Command
    const isPass = words.includes('pass') || words.includes('reject') || words.includes('skip') ||
                   words.includes('left') || words.includes('no') || words.includes('next') ||
                   words.includes('dislike') || words.includes('decline') ||
                   clean.includes('pass') || clean.includes('reject') || clean.includes('skip') ||
                   clean.includes('left arrow') || clean.includes('arrow left') || clean.includes('ግራ') ||
                   clean.includes('next job') || clean.includes('pass job') || clean.includes('reject job') ||
                   clean.includes('ውድቅ') || clean.includes('ቀጣይ') || clean.includes('እለፍ') ||
                   clean.includes('ተው') || clean.includes('didi') || clean.includes('darbi') ||
                   clean.includes('ንጸግ') || clean.includes('ሕለፍ');
    if (isPass) {
      if (window.a11y) window.a11y.stopSpeech();
      if ('speechSynthesis' in window) window.speechSynthesis.cancel();
      this.handleCardPass();
      if (window.a11y) window.a11y.showVisualToast('Voice: Rejected / Passed Opportunity');
      return true;
    }

    return false;
  }

  bindSwipeGestures(cardEl) {
    if (!cardEl) return;

    let startX = 0;
    let startY = 0;
    let currentX = 0;
    let currentY = 0;
    let isDragging = false;
    const threshold = 75; // px distance to trigger swipe

    const onPointerDown = (e) => {
      // Don't drag if interacting with interactive controls inside
      if (e.target.closest('button, a, input, select, textarea, kbd')) return;
      if (this.isCardAnimating) return;

      isDragging = true;
      startX = e.clientX;
      startY = e.clientY;
      currentX = startX;
      currentY = startY;

      cardEl.style.transition = 'none';
      if (cardEl.setPointerCapture) {
        try { cardEl.setPointerCapture(e.pointerId); } catch (_) {}
      }
    };

    const onPointerMove = (e) => {
      if (!isDragging) return;

      currentX = e.clientX;
      currentY = e.clientY;

      const deltaX = currentX - startX;
      const deltaY = currentY - startY;

      // Dynamic tilt and resistance
      const rot = Math.max(-16, Math.min(16, deltaX * 0.06));
      cardEl.style.transform = `translate(${deltaX}px, ${deltaY * 0.25}px) rotate(${rot}deg)`;
    };

    const onPointerUp = (e) => {
      if (!isDragging) return;
      isDragging = false;

      const deltaX = currentX - startX;
      if (cardEl.releasePointerCapture) {
        try { cardEl.releasePointerCapture(e.pointerId); } catch (_) {}
      }

      // Restore transition
      cardEl.style.transition = 'transform 0.24s cubic-bezier(0.2, 0.8, 0.2, 1), opacity 0.24s ease';

      if (deltaX > threshold) {
        // Swiped Right -> Apply
        this.handleCardApply();
      } else if (deltaX < -threshold) {
        // Swiped Left -> Pass
        this.handleCardPass();
      } else {
        // Snap back to neutral stacked position
        cardEl.style.transform = '';
      }
    };

    const onPointerCancel = () => {
      if (!isDragging) return;
      isDragging = false;
      cardEl.style.transition = 'transform 0.24s ease';
      cardEl.style.transform = '';
    };

    cardEl.addEventListener('pointerdown', onPointerDown);
    cardEl.addEventListener('pointermove', onPointerMove);
    cardEl.addEventListener('pointerup', onPointerUp);
    cardEl.addEventListener('pointercancel', onPointerCancel);
  }

  async handleCardApply() {
    if (this.isCardAnimating || this.currentCardIndex >= this.cardDeck.length) return;
    this.isCardAnimating = true;
    if (window.a11y) window.a11y.stopSpeech();

    const currentItem = this.cardDeck[this.currentCardIndex];
    const job = currentItem.job;

    // Trigger visual swipe right animation & 3D stack lift
    const cardEl = document.querySelector('.swipe-card');
    const stackEl = document.getElementById('deck-3d-stack');
    if (cardEl) {
      cardEl.style.transform = '';
      cardEl.style.transition = '';
      cardEl.classList.add('anim-swipe-right');
    }
    if (stackEl) {
      stackEl.classList.add('deck-animating');
    }

    // Submit Application automatically using the uploaded CV
    try {
      const applyPayload = {
        jobId: job.id,
        resumeId: 'uploaded-cv',
        coverNote: `Direct application submitted via LearnBridge CV Smart Match (${currentItem.matchScore}% match).`,
        shareAccommodations: true
      };

      await fetch('/api/v1/employment/applications', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-candidate-id': this.currentCandidate?.id || 'ethio-candidate-01'
        },
        body: JSON.stringify(applyPayload)
      });
    } catch (err) {
      console.warn("[EmploymentApp] Direct apply error:", err);
    }

    // Calculate next opportunity preview for spoken feedback to blind users
    const nextIndex = this.currentCardIndex + 1;
    const nextItem = nextIndex < this.cardDeck.length ? this.cardDeck[nextIndex] : null;
    const isAm = window.a11y && window.a11y.currentLanguage === 'am';

    let spokenAction = '';
    if (isAm) {
      spokenAction = nextItem
        ? `አመልክተዋል: ${job.title} በ ${job.employerName}። ቀጣይ ዕድል ${nextIndex + 1} ከ ${this.cardDeck.length}: ${nextItem.job.title} በ ${nextItem.job.employerName}። ለማመልከት የቀኝ ቀስት ወይም Apply፣ ውድቅ ለማድረግ የግራ ቀስት ወይም Reject ይበሉ።`
        : `አመልክተዋል: ${job.title} በ ${job.employerName}። ሁሉንም ዕድሎች ተመልክተዋል!`;
    } else {
      spokenAction = nextItem
        ? `Applied: ${job.title} at ${job.employerName}. Next opportunity ${nextIndex + 1} of ${this.cardDeck.length}: ${nextItem.job.title} at ${nextItem.job.employerName}, ${nextItem.matchScore} percent match. Press Right Arrow or say Apply to apply. Press Left Arrow or say Reject to pass.`
        : `Applied: ${job.title} at ${job.employerName}. You have reviewed all recommended opportunities!`;
    }

    // Audio & Toast Feedback
    const successMsg = `Applied for ${job.title} at ${job.employerName}!`;
    if (window.a11y) {
      window.a11y.playEarcon('chime');
      window.a11y.showVisualToast(successMsg, 2500);
      window.a11y.announceLive(spokenAction, true);
      window.a11y.speak(spokenAction);
    }

    setTimeout(() => {
      this.currentCardIndex++;
      this.isCardAnimating = false;
      this.renderActiveCard({ skipSpeech: true });
    }, 110);
  }

  handleCardPass() {
    if (this.isCardAnimating) return;
    if (window.a11y) window.a11y.stopSpeech();
    if ('speechSynthesis' in window) {
      try { window.speechSynthesis.cancel(); } catch (_) {}
    }

    const detailView = document.getElementById('view-job-detail');
    if (detailView && detailView.style.display !== 'none') {
      window.location.hash = '#search';
      this.handleRoute();
      if (this.currentCardIndex < this.cardDeck.length) {
        this.currentCardIndex++;
        this.renderActiveCard();
      }
      return;
    }

    if (this.currentCardIndex >= this.cardDeck.length) return;
    this.isCardAnimating = true;

    const currentItem = this.cardDeck[this.currentCardIndex];
    const job = currentItem ? currentItem.job : null;

    // Trigger visual swipe left animation & 3D stack lift
    const cardEl = document.querySelector('.swipe-card');
    const stackEl = document.getElementById('deck-3d-stack');
    if (cardEl) {
      cardEl.style.transform = '';
      cardEl.style.transition = '';
      cardEl.classList.add('anim-swipe-left');
    }
    if (stackEl) {
      stackEl.classList.add('deck-animating');
    }

    const title = job ? job.title : 'Opportunity';
    const nextIndex = this.currentCardIndex + 1;
    const nextItem = nextIndex < this.cardDeck.length ? this.cardDeck[nextIndex] : null;
    const isAm = window.a11y && window.a11y.currentLanguage === 'am';

    let spokenAction = '';
    if (isAm) {
      spokenAction = nextItem
        ? `ውድቅ ተደርጓል: ${title}። ቀጣይ ዕድል ${nextIndex + 1} ከ ${this.cardDeck.length}: ${nextItem.job.title} በ ${nextItem.job.employerName}። ለማመልከት የቀኝ ቀስት ወይም Apply፣ ውድቅ ለማድረግ የግራ ቀስት ወይም Reject ይበሉ።`
        : `ውድቅ ተደርጓል: ${title}። ሁሉንም ዕድሎች ተመልክተዋል!`;
    } else {
      spokenAction = nextItem
        ? `Rejected: ${title}. Next opportunity ${nextIndex + 1} of ${this.cardDeck.length}: ${nextItem.job.title} at ${nextItem.job.employerName}, ${nextItem.matchScore} percent match. Press Right Arrow or say Apply to apply. Press Left Arrow or say Reject to pass.`
        : `Rejected: ${title}. You have reviewed all recommended opportunities!`;
    }

    const passMsg = `Passed / Rejected: ${title}`;
    if (window.a11y) {
      window.a11y.showVisualToast(passMsg, 1800);
      window.a11y.announceLive(spokenAction, true);
      window.a11y.playEarcon('falling');
      window.a11y.speak(spokenAction);
    }

    setTimeout(() => {
      this.currentCardIndex++;
      this.isCardAnimating = false;
      this.renderActiveCard({ skipSpeech: true });
    }, 110);
  }

  async processCvText(cvText, fileName = 'uploaded-cv.txt') {
    const statusEl = document.getElementById('cv-upload-status');
    if (statusEl) {
      statusEl.style.display = 'block';
      statusEl.textContent = 'Parsing skills and generating tailored matches...';
    }

    try {
      const res = await fetch('/api/v1/employment/candidate/me/parse-cv', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cvText, fileName, fileSize: cvText.length })
      });
      const json = await res.json();
      if (json.success && json.data) {
        this.activeCandidateProfile = json.data;
        localStorage.setItem('lb_active_cv', JSON.stringify(json.data));
        if (statusEl) statusEl.style.display = 'none';
        this.displayActiveCvBanner(json.data);
        await this.loadRecommendationsForCandidate(json.data);
        if (window.a11y) {
          window.a11y.playEarcon('rising');
          window.a11y.showVisualToast(`CV loaded for ${json.data.fullName || 'Candidate'}. Tailored matches ready!`);
        }
      } else {
        throw new Error(json.error || 'Failed to parse CV');
      }
    } catch (err) {
      if (statusEl) {
        statusEl.textContent = 'Error parsing CV: ' + err.message;
      }
    }
  }

  async loadDemoCv(demoPath) {
    try {
      const res = await fetch(demoPath);
      const text = await res.text();
      await this.processCvText(text, demoPath.split('/').pop());
    } catch (err) {
      console.error("[EmploymentApp] Error loading demo CV:", err);
    }
  }

  handleFileUploaded(file) {
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target.result;
      this.processCvText(text, file.name);
    };
    reader.readAsText(file);
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
      this.currentActiveJob = job;
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
            <svg class="ui-icon" style="width: 14px; height: 14px;" viewBox="0 0 24 24"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
            ${isSaved ? 'Saved to Favorites' : 'Save Vacancy'}
          </button>
          <button class="btn btn-outline btn-listen-summary" data-id="${job.id}">
            <svg class="ui-icon" style="width: 14px; height: 14px;" viewBox="0 0 24 24"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"/></svg>
            Listen to Spoken Summary
          </button>
          <button class="btn btn-outline" id="btn-open-report-dialog" style="color: var(--status-rose-text); border-color: var(--status-rose-border);">
            <svg class="ui-icon" style="width: 14px; height: 14px;" viewBox="0 0 24 24"><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/><line x1="4" y1="22" x2="4" y2="15"/></svg>
            Report this Vacancy
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

    // Language selector dropdown
    const langSelect = document.getElementById('lang-select-dropdown');
    if (langSelect) {
      langSelect.addEventListener('change', (e) => {
        this.loadLanguage(e.target.value);
      });
    }

    // Language buttons triggers (fallback / gateway)
    document.querySelectorAll('.lang-choice-btn, .lang-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        this.loadLanguage(btn.dataset.lang);
      });
    });

    // Demo CV quick-select buttons
    const btnDemoSwe = document.getElementById('btn-demo-swe');
    if (btnDemoSwe) {
      btnDemoSwe.addEventListener('click', () => {
        this.loadDemoCv('demo/demo-cv-software-engineer.txt');
      });
    }

    const btnDemoQa = document.getElementById('btn-demo-qa');
    if (btnDemoQa) {
      btnDemoQa.addEventListener('click', () => {
        this.loadDemoCv('demo/demo-cv-accessibility-qa.txt');
      });
    }

    // CV Dropzone & File Input
    const dropzone = document.getElementById('cv-dropzone');
    const fileInput = document.getElementById('cv-file-input');

    if (dropzone && fileInput) {
      dropzone.addEventListener('click', () => fileInput.click());
      dropzone.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          fileInput.click();
        }
      });

      dropzone.addEventListener('dragover', (e) => {
        e.preventDefault();
        dropzone.classList.add('dragover');
      });
      dropzone.addEventListener('dragleave', () => dropzone.classList.remove('dragover'));
      dropzone.addEventListener('drop', (e) => {
        e.preventDefault();
        dropzone.classList.remove('dragover');
        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
          this.handleFileUploaded(e.dataTransfer.files[0]);
        }
      });

      fileInput.addEventListener('change', () => {
        if (fileInput.files && fileInput.files[0]) {
          this.handleFileUploaded(fileInput.files[0]);
        }
      });
    }

    // Re-upload CV and Restart Deck buttons
    const btnReupload = document.getElementById('btn-reupload-cv');
    if (btnReupload) {
      btnReupload.addEventListener('click', () => {
        localStorage.removeItem('lb_active_cv');
        this.activeCandidateProfile = null;
        this.cardDeck = [];
        this.showCvUploadStage();
      });
    }

    const btnEmptyChange = document.getElementById('btn-empty-change-cv');
    if (btnEmptyChange) {
      btnEmptyChange.addEventListener('click', () => {
        localStorage.removeItem('lb_active_cv');
        this.activeCandidateProfile = null;
        this.cardDeck = [];
        this.showCvUploadStage();
      });
    }

    const btnRestartDeck = document.getElementById('btn-restart-deck');
    if (btnRestartDeck) {
      btnRestartDeck.addEventListener('click', () => {
        this.currentCardIndex = 0;
        this.renderActiveCard();
      });
    }

    // Swipeable Card Keyboard Navigation: Left = Pass, Right = Apply
    window.addEventListener('keydown', (e) => {
      if (e.target && e.target.matches && e.target.matches('input, textarea, select')) return;
      if (document.querySelector('dialog[open]') || document.querySelector('.modal-overlay.active')) return;

      const deckStage = document.getElementById('swipe-deck-stage');
      if (!deckStage || deckStage.style.display === 'none') return;
      if (!this.cardDeck || this.cardDeck.length === 0 || this.currentCardIndex >= this.cardDeck.length) return;

      const isRight = e.key === 'ArrowRight' || e.code === 'ArrowRight' || e.key === 'Right' || e.keyCode === 39;
      const isLeft = e.key === 'ArrowLeft' || e.code === 'ArrowLeft' || e.key === 'Left' || e.keyCode === 37;
      const isMore = e.key === 'm' || e.key === 'M' || e.code === 'KeyM';
      const isVoice = e.key === 'v' || e.key === 'V' || e.code === 'KeyV';

      if (isMore) {
        e.preventDefault();
        e.stopPropagation();
        this.toggleCardDetails();
      } else if (isVoice) {
        e.preventDefault();
        e.stopPropagation();
        if (window.a11y) window.a11y.toggleVoiceListening();
      } else if (isRight) {
        e.preventDefault();
        e.stopPropagation();
        this.handleCardApply();
      } else if (isLeft) {
        e.preventDefault();
        e.stopPropagation();
        this.handleCardPass();
      }
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
        const job = this.allJobs.find(j => j.id === jobId) || this.currentActiveJob || { id: jobId, title: document.getElementById('detail-title')?.textContent, employerName: document.getElementById('detail-employer')?.textContent, location: document.getElementById('detail-location')?.textContent };
        if (job && window.applicationModal) {
          window.applicationModal.open(job, this.currentCandidate || {});
        }
      };
    });

    // 3. Open External Destination Modal
    scopeEl.querySelectorAll('.btn-apply-external').forEach(btn => {
      btn.onclick = (e) => {
        e.preventDefault();
        const jobId = btn.dataset.id;
        const job = this.allJobs.find(j => j.id === jobId) || this.currentActiveJob;
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

/**
 * ALX Learning LMS & Cloned Landing Navigation Engine
 */

(function () {
  'use strict';

  // State
  const state = {
    isAuthenticated: false,
    isDemoMode: false,
    activeTab: 'home', // 'home' | 'access-learning' | 'planning' | 'projects' | 'quizzes' | 'courses' | 'concepts' | 'vod' | 'profile'
    isSidebarCollapsed: false
  };

  // DOM Elements
  const pageLogin = document.getElementById('page-login');
  const pageLearning = document.getElementById('page-learning');
  const loginForm = document.getElementById('login-form');
  const emailInput = document.getElementById('email');
  const passwordInput = document.getElementById('password');
  const btnTogglePassword = document.getElementById('btn-toggle-password');
  const userAvatarBtn = document.getElementById('user-avatar-btn');
  const btnSignout = document.getElementById('btn-signout');
  const btnHamburger = document.getElementById('btn-hamburger');
  const sidebar = document.getElementById('lms-sidebar');
  const navLinks = document.querySelectorAll('.nav-link');
  const tabPanes = document.querySelectorAll('.tab-pane');

  // ==========================================================
  // 1. ROUTING & PAGE SWITCHING (AUTHENTICATION BOUNDARY)
  // ==========================================================
  function stopAllSpeech(reason = 'generic') {
    if (typeof window === 'undefined') return;
    try {
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
    } catch (_) {}
    try {
      if (window.voiceNav) {
        window.voiceNav.stopSpeaking();
        if (typeof window.voiceNav.clearWelcomeTimer === 'function') {
          window.voiceNav.clearWelcomeTimer();
        }
      }
    } catch (_) {}
    try {
      if (window.lbSpeechOutput) {
        window.lbSpeechOutput.stop();
      }
    } catch (_) {}
    try {
      if (window.a11y) {
        window.a11y.stopSpeech();
      }
    } catch (_) {}
    try {
      document.querySelectorAll('audio').forEach(a => {
        try { a.pause(); a.currentTime = 0; } catch (_) {}
      });
    } catch (_) {}
    try {
      const iframe = document.getElementById('jobPortalIframe');
      if (iframe && iframe.contentWindow) {
        iframe.contentWindow.postMessage({ type: 'LB_VOICE_ACTION', action: 'STOP_SPEECH' }, '*');
      }
    } catch (_) {}
    try {
      const speechTextEl = document.getElementById('voiceAssistantSpeechText');
      if (speechTextEl) {
        speechTextEl.style.display = 'none';
        speechTextEl.textContent = '';
      }
      const botRing = document.getElementById('botVoiceRing');
      if (botRing) botRing.classList.remove('pulse');
    } catch (_) {}
  }
  window.stopAllSpeech = stopAllSpeech;

  function handleRoute() {
    stopAllSpeech('route_change');
    const rawHash = window.location.hash.replace('#', '').toLowerCase();
    const hasValidToken = !!sessionStorage.getItem('lb_auth_token');
    const isGuestDemo = state.isDemoMode || sessionStorage.getItem('lb_demo_mode') === 'true';
    
    // Strict Authentication Boundary:
    // Unauthenticated visitors cannot access LMS routes (#home, #learning, etc.)
    if (!hasValidToken && !isGuestDemo) {
      state.isAuthenticated = false;
      state.isDemoMode = false;
      if (rawHash !== 'login') {
        window.location.hash = '#login';
      }
      showPage('login');
      return;
    }

    if (rawHash === 'login') {
      signOut();
      return;
    }

    if (isGuestDemo) {
      state.isDemoMode = true;
      state.isAuthenticated = false;
      const demoBanner = document.getElementById('demoSandboxBanner');
      if (demoBanner) demoBanner.hidden = false;
    } else {
      state.isAuthenticated = true;
      state.isDemoMode = false;
    }

    showPage('learning');
    const targetTab = rawHash || 'home';
    switchTab(targetTab);

    if (state.isAuthenticated && (targetTab === 'home' || !targetTab)) {
      if (window.voiceNav) {
        window.voiceNav.announceDashboardWelcome();
      }
    }
  }

  function showPage(pageName) {
    stopAllSpeech('page_change');
    if (pageName === 'login') {
      pageLogin.classList.add('active');
      pageLearning.classList.remove('active');
      document.title = 'Sign In | ALX Learning';
    } else {
      pageLogin.classList.remove('active');
      pageLearning.classList.add('active');
      document.title = state.isDemoMode ? 'ALX Learning (Guest Demo Sandbox)' : 'ALX Learning';
    }
  }

  // Direct, popup-blocker-free redirection to Job Portal
  function openJobPortalStandalone() {
    window.location.assign('/job-portal/');
  }
  window.openJobPortalStandalone = openJobPortalStandalone;

  // ==========================================================
  // 2. LMS SIDEBAR TAB SWITCHING (ALL 9 MOCKUPS)
  // ==========================================================
  function switchTab(tabId) {
    stopAllSpeech('tab_change');
    state.activeTab = tabId;

    // Update active nav-link
    const allNavLinks = document.querySelectorAll('.nav-link');
    allNavLinks.forEach((link) => {
      const linkTab = link.getAttribute('data-tab');
      if (linkTab === tabId) {
        link.classList.add('active');
      } else {
        link.classList.remove('active');
      }
    });

    // Update active tab-pane
    const allTabPanes = document.querySelectorAll('.tab-pane');
    let matched = false;
    allTabPanes.forEach((pane) => {
      if (pane.id === `tab-${tabId}`) {
        pane.classList.add('active');
        matched = true;
      } else {
        pane.classList.remove('active');
      }
    });

    // Fallback to home if tabId does not match
    if (!matched) {
      const homePane = document.getElementById('tab-home');
      if (homePane) homePane.classList.add('active');
      const homeLink = document.querySelector('[data-tab="home"]');
      if (homeLink) homeLink.classList.add('active');
    }

    if (tabId === 'jobs') {
      openJobPortalStandalone();
      const homePane = document.getElementById('tab-home');
      if (homePane) homePane.classList.add('active');
      const homeLink = document.querySelector('[data-tab="home"]');
      if (homeLink) homeLink.classList.add('active');
      document.title = 'ALX Learning';
      return;
    } else {
      document.title = 'ALX Learning';
    }

    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  // ==========================================================
  // 3. AUTHENTICATION, ACCOUNT SELECTION & SOCIAL LOGIN
  // ==========================================================
  const AVAILABLE_ACCOUNTS = [
    {
      index: 1,
      name: 'Abenezer Habtamu',
      email: 'abenezer@alx.app',
      role: 'Software Engineering Learner',
      tag: 'Learner',
      avatar: 'AH'
    },
    {
      index: 2,
      name: 'ALX Software Engineer',
      email: 'dev@alx.app',
      role: 'Staff / Mentor (Dev)',
      tag: 'Staff / Dev',
      avatar: 'DEV'
    },
    {
      index: 3,
      name: 'Guest Learner',
      email: 'learner@alx.app',
      role: 'Demo Access Candidate',
      tag: 'Demo Access',
      avatar: 'GL'
    }
  ];

  function updateUserProfileUi(user) {
    if (!user) return;
    state.currentUser = user;

    if (userAvatarBtn) {
      userAvatarBtn.textContent = user.avatar || 'AH';
      userAvatarBtn.title = `${user.name} (${user.email}) - Click to sign out`;
    }

    const greetingEl = document.querySelector('.greeting-title');
    if (greetingEl) {
      const firstName = user.name.split(' ')[0] || user.name;
      const greetingMap = {
        en: `Good evening, ${firstName} 👋`,
        am: `እንደምን አመሹ፣ ${firstName} 👋`,
        om: `Akkam bultani, ${firstName} 👋`,
        ti: `ከመይ ኣምሲኹም፣ ${firstName} 👋`
      };
      greetingEl.innerHTML = `${greetingMap[currentLang] || greetingMap.en}`;
    }

    const profileH2 = document.querySelector('.profile-header-info h2');
    if (profileH2) profileH2.textContent = user.name;
    const profileRoleP = document.querySelector('.profile-header-info p');
    if (profileRoleP) profileRoleP.textContent = `${user.role || 'Software Engineering Fellow'} • Cohort 2026`;
    const profileEmailDiv = document.querySelector('.profile-header-info div');
    if (profileEmailDiv) profileEmailDiv.textContent = user.email;
  }

  function selectAndLoginAccount(index) {
    if (state.isAuthenticated) return;
    state.isAuthenticating = true;

    // Immediately stop any speaking and clear welcome timer
    if (voiceNav) {
      voiceNav.stopSpeaking();
      if (typeof voiceNav.clearWelcomeTimer === 'function') {
        voiceNav.clearWelcomeTimer();
      }
    }

    const acct = AVAILABLE_ACCOUNTS.find(a => a.index === Number(index)) || AVAILABLE_ACCOUNTS[0];

    document.querySelectorAll('.account-card').forEach(c => c.classList.remove('active'));
    const targetCard = document.getElementById(`accountCard${acct.index}`);
    if (targetCard) targetCard.classList.add('active');

    if (emailInput) emailInput.value = acct.email;
    if (passwordInput) passwordInput.value = 'password123';

    const submitBtn = document.getElementById('btn-login-submit');
    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.textContent = `Signing in as ${acct.name}...`;
    }

    setTimeout(() => {
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Sign in';
      }
      state.isAuthenticating = false;
      state.isAuthenticated = true;
      updateUserProfileUi(acct);
      window.location.hash = '#home';
      showPage('learning');
      switchTab('home');

      if (voiceNav) {
        voiceNav.stopSpeaking();
        if (typeof voiceNav.clearWelcomeTimer === 'function') {
          voiceNav.clearWelcomeTimer();
        }
        voiceNav.playChime('success');
      }
    }, 200);
  }

  function authenticateWithProvider(providerName) {
    if (state.isAuthenticating || state.isAuthenticated) return;
    state.isAuthenticating = true;

    const providerProfiles = {
      Google: {
        index: 4,
        name: 'Abenezer Habtamu (Google)',
        email: 'abenezer.google@alx.app',
        role: 'Verified Google OAuth User',
        avatar: 'G'
      },
      LinkedIn: {
        index: 5,
        name: 'Abenezer Habtamu (LinkedIn)',
        email: 'abenezer.linkedin@alx.app',
        role: 'ALX Software Engineer (LinkedIn Pro)',
        avatar: 'in'
      },
      Facebook: {
        index: 6,
        name: 'Abenezer Habtamu (Facebook)',
        email: 'abenezer.meta@alx.app',
        role: 'Meta Verified Developer',
        avatar: 'FB'
      }
    };

    const profile = providerProfiles[providerName] || providerProfiles.Google;

    const btn = document.getElementById(providerName === 'Google' ? 'btnGoogleAuth' : providerName === 'LinkedIn' ? 'btnLinkedinAuth' : 'btnFacebookAuth');
    if (btn) btn.style.opacity = '0.6';

    setTimeout(() => {
      if (btn) btn.style.opacity = '1';
      state.isAuthenticating = false;
      state.isAuthenticated = true;
      updateUserProfileUi(profile);
      window.location.hash = '#home';
      showPage('learning');
      switchTab('home');

      if (voiceNav) {
        voiceNav.playChime('success');
      }
    }, 350);
  }

  // Account Card Click and Keyboard Enter listeners
  AVAILABLE_ACCOUNTS.forEach(acct => {
    const card = document.getElementById(`accountCard${acct.index}`);
    if (card) {
      card.addEventListener('click', () => selectAndLoginAccount(acct.index));
      card.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          selectAndLoginAccount(acct.index);
        }
      });
    }
  });

  // Social Auth Click Listeners
  const btnGoogleAuth = document.getElementById('btnGoogleAuth');
  if (btnGoogleAuth) {
    btnGoogleAuth.addEventListener('click', () => authenticateWithProvider('Google'));
  }
  const btnLinkedinAuth = document.getElementById('btnLinkedinAuth');
  if (btnLinkedinAuth) {
    btnLinkedinAuth.addEventListener('click', () => authenticateWithProvider('LinkedIn'));
  }
  const btnFacebookAuth = document.getElementById('btnFacebookAuth');
  if (btnFacebookAuth) {
    btnFacebookAuth.addEventListener('click', () => authenticateWithProvider('Facebook'));
  }

  if (btnTogglePassword && passwordInput) {
    btnTogglePassword.addEventListener('click', () => {
      const isPassword = passwordInput.getAttribute('type') === 'password';
      passwordInput.setAttribute('type', isPassword ? 'text' : 'password');
      btnTogglePassword.setAttribute('aria-label', isPassword ? 'Hide password' : 'Show password');
    });
  }

  async function performLoginWithCredentials(email, password) {
    if (state.isAuthenticating) return;
    state.isAuthenticating = true;

    const alertBox = document.getElementById('loginAlertBox');
    const submitBtn = document.getElementById('btn-login-submit');

    if (alertBox) {
      alertBox.hidden = true;
      alertBox.textContent = '';
    }

    if (!email || !password) {
      if (alertBox) {
        alertBox.textContent = 'Please enter both your email address and password.';
        alertBox.hidden = false;
      }
      state.isAuthenticating = false;
      if (emailInput && !email) emailInput.focus();
      else if (passwordInput && !password) passwordInput.focus();
      return;
    }

    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.textContent = 'Verifying credentials...';
    }

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), password })
      });
      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Authentication failed. Please check credentials.');
      }

      // Establish real verified session with server token
      sessionStorage.setItem('lb_auth_token', data.token);
      sessionStorage.setItem('lb_auth_user', JSON.stringify(data.user));
      sessionStorage.removeItem('lb_demo_mode');

      state.isAuthenticated = true;
      state.isDemoMode = false;

      updateUserProfileUi(data.user);
      const demoBanner = document.getElementById('demoSandboxBanner');
      if (demoBanner) demoBanner.hidden = true;

      window.location.hash = '#home';
      showPage('learning');
      switchTab('home');

      if (window.lbSpeechOutput) {
        window.lbSpeechOutput.speak(`Welcome back, ${data.user.name}. Your learning dashboard is active.`);
      }
    } catch (err) {
      if (alertBox) {
        alertBox.textContent = err.message || 'Authentication error. Please try again.';
        alertBox.hidden = false;
      }
      if (window.lbSpeechOutput) {
        window.lbSpeechOutput.speak('Authentication failed. ' + err.message);
      }
    } finally {
      state.isAuthenticating = false;
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Sign In with Credentials';
      }
    }
  }

  // ISOLATED GUEST DEMO MODE (Zero Private Learner Exposure)
  function enterGuestDemoMode() {
    state.isDemoMode = true;
    state.isAuthenticated = false; // Strictly marked as unauthenticated observer
    sessionStorage.removeItem('lb_auth_token');
    sessionStorage.setItem('lb_demo_mode', 'true');

    const demoUser = {
      id: 'usr_guest_demo',
      name: 'Guest Observer',
      email: 'guest@learnbridge.demo',
      role: 'Guest Observer (Sandbox Mode)',
      avatar: 'GO',
      isDemo: true
    };
    updateUserProfileUi(demoUser);

    const demoBanner = document.getElementById('demoSandboxBanner');
    if (demoBanner) demoBanner.hidden = false;

    window.location.hash = '#home';
    showPage('learning');
    switchTab('home');

    if (window.lbSpeechOutput) {
      window.lbSpeechOutput.speak('Entered Guest Demo Mode. Operating in read-only sandbox with synthetic curriculum.');
    }
  }

  function exitDemoMode() {
    state.isDemoMode = false;
    state.isAuthenticated = false;
    sessionStorage.removeItem('lb_demo_mode');
    sessionStorage.removeItem('lb_auth_token');
    sessionStorage.removeItem('lb_auth_user');

    const demoBanner = document.getElementById('demoSandboxBanner');
    if (demoBanner) demoBanner.hidden = true;

    window.location.hash = '#login';
    showPage('login');

    if (window.lbSpeechOutput) {
      window.lbSpeechOutput.speak('Exited demo sandbox. Returned to sign in.');
    }
  }

  function signOut() {
    const token = sessionStorage.getItem('lb_auth_token');
    if (token) {
      fetch('/api/auth/logout', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      }).catch(() => {});
    }
    state.isAuthenticated = false;
    state.isDemoMode = false;
    sessionStorage.clear();

    const demoBanner = document.getElementById('demoSandboxBanner');
    if (demoBanner) demoBanner.hidden = true;

    window.location.hash = '#login';
    showPage('login');
  }

  function performDirectLogin() {
    state.isAuthenticated = true;
    state.isDemoMode = false;
    const token = 'lb_sess_' + Math.random().toString(36).substring(2, 15);
    sessionStorage.setItem('lb_auth_token', token);
    sessionStorage.removeItem('lb_demo_mode');

    const activeUser = {
      id: 'usr_abenezer_2026',
      name: 'Abenezer Haile',
      email: 'abenezer@learnbridge.et',
      role: 'Software Engineering Learner',
      program: 'ALX Software Engineering Capstone'
    };
    sessionStorage.setItem('lb_user_profile', JSON.stringify(activeUser));

    const demoBanner = document.getElementById('demoSandboxBanner');
    if (demoBanner) demoBanner.hidden = true;

    showPage('learning');
    window.location.hash = '#home';
    switchTab('home');

    if (window.voiceNav) {
      window.voiceNav.announceDashboardWelcome();
    }
  }

  const btnLoginSubmit = document.getElementById('btn-login-submit');
  if (btnLoginSubmit) {
    btnLoginSubmit.addEventListener('click', (e) => {
      e.preventDefault();
      performDirectLogin();
    });
  }

  if (loginForm) {
    loginForm.addEventListener('submit', (e) => {
      e.preventDefault();
      performDirectLogin();
    });
  }

  const btnExploreDemo = document.getElementById('btnExploreDemoMode');
  if (btnExploreDemo) {
    btnExploreDemo.addEventListener('click', (e) => {
      e.preventDefault();
      enterGuestDemoMode();
    });
  }

  const btnExitDemo = document.getElementById('btnExitDemoMode');
  if (btnExitDemo) {
    btnExitDemo.addEventListener('click', (e) => {
      e.preventDefault();
      exitDemoMode();
    });
  }

  if (btnSignout) {
    btnSignout.addEventListener('click', (e) => {
      e.preventDefault();
      signOut();
    });
  }

  // ==========================================================
  // 4. SIDEBAR NAVIGATION CLICKS
  // ==========================================================
  navLinks.forEach((link) => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      const targetTab = link.getAttribute('data-tab');
      window.location.hash = `#${targetTab}`;
      switchTab(targetTab);
    });
  });

  // Direct Job Portal Integration Buttons (Opens standalone in new page/tab)
  const btnOpenDashJob = document.getElementById('btnOpenDashboardJobPortal');
  if (btnOpenDashJob) {
    btnOpenDashJob.addEventListener('click', (e) => {
      e.preventDefault();
      openJobPortalStandalone();
    });
  }

  const btnReloadJobFrame = document.getElementById('btnReloadJobPortalFrame');
  if (btnReloadJobFrame) {
    btnReloadJobFrame.addEventListener('click', (e) => {
      e.preventDefault();
      openJobPortalStandalone();
    });
  }

  const btnHeaderJob = document.getElementById('btnJobPortal');
  if (btnHeaderJob) {
    btnHeaderJob.addEventListener('click', (e) => {
      // Default behavior opens /job-portal in a new tab via target="_blank"
      e.stopPropagation();
    });
  }

  // Avatar / Signout Click
  function handleSignOut() {
    if (confirm('Do you want to log out and return to the landing page?')) {
      state.isAuthenticated = false;
      window.location.hash = '#login';
      showPage('login');
    }
  }

  if (userAvatarBtn) {
    userAvatarBtn.addEventListener('click', handleSignOut);
  }

  if (btnSignout) {
    btnSignout.addEventListener('click', handleSignOut);
  }

  // Hamburger Toggle for Sidebar
  if (btnHamburger && sidebar) {
    btnHamburger.addEventListener('click', () => {
      state.isSidebarCollapsed = !state.isSidebarCollapsed;
      sidebar.style.display = state.isSidebarCollapsed ? 'none' : 'flex';
    });
  }

  // 12-Week Pill Click Interaction
  const weekPills = document.querySelectorAll('.week-pill');
  weekPills.forEach((pill) => {
    pill.addEventListener('click', () => {
      weekPills.forEach(p => p.classList.remove('active'));
      pill.classList.add('active');
    });
  });

  // ==========================================================
  // 5. COURSE SYLLABUS & LESSON VIDEO WORKSPACE ENGINE
  // ==========================================================
  const learningSprintsView = document.getElementById('learningSprintsView');
  const learningCourseView = document.getElementById('learningCourseView');
  const btnContinueSprint = document.getElementById('btnContinueSprint');
  const btnBackToSprints = document.getElementById('btnBackToSprints');
  const courseLessonVideo = document.getElementById('courseLessonVideo');
  const btnToggleVideoVoice = document.getElementById('btnToggleVideoVoice');
  const btnCompleteModule = document.getElementById('btnCompleteModule');
  const moduleCountLabel = document.getElementById('moduleCountLabel');
  const moduleStatusBadge = document.getElementById('moduleStatusBadge');
  const sprintProgressFill = document.getElementById('sprintProgressFill');
  const syllabusCounter = document.getElementById('syllabusCounter');
  const topSyllabusProgressFill = document.getElementById('topSyllabusProgressFill');
  const topSyllabusPct = document.getElementById('topSyllabusPct');
  const btnSyllabusPrev = document.getElementById('btnSyllabusPrev');
  const btnSyllabusNext = document.getElementById('btnSyllabusNext');
  const syllabusModuleList = document.getElementById('syllabusModuleList');
  const moduleItem8 = document.getElementById('moduleItem8');
  const mod8Status = document.getElementById('mod8Status');

  let isModule8Completed = false;

  function openCourseWorkspace() {
    if (learningSprintsView) learningSprintsView.hidden = true;
    if (learningCourseView) learningCourseView.hidden = false;
    window.scrollTo({ top: 0, behavior: 'smooth' });
    // Smoothly scroll the module track to show active module 8 if needed
    if (syllabusModuleList && moduleItem8) {
      setTimeout(() => {
        moduleItem8.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
      }, 250);
    }
  }

  function closeCourseWorkspace() {
    if (courseLessonVideo && !courseLessonVideo.paused) {
      courseLessonVideo.pause();
    }
    if (learningCourseView) learningCourseView.hidden = true;
    if (learningSprintsView) learningSprintsView.hidden = false;
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function toggleLessonVideo() {
    togglePlayVideo();
  }

  function completeModule8() {
    isModule8Completed = true;
    if (moduleCountLabel) moduleCountLabel.textContent = '8 of 8 Completed';
    if (moduleStatusBadge) {
      moduleStatusBadge.textContent = '✓ Validated';
      moduleStatusBadge.style.background = '#ecfdf5';
      moduleStatusBadge.style.color = '#059669';
      moduleStatusBadge.style.borderColor = '#a7f3d0';
    }
    if (sprintProgressFill) {
      sprintProgressFill.style.width = '100%';
    }
    if (syllabusCounter) {
      syllabusCounter.innerHTML = '<span class="badge-pulse-dot" style="background:#059669;"></span> 8 of 8 Completed (Validated)';
    }
    if (topSyllabusProgressFill) {
      topSyllabusProgressFill.style.width = '100%';
    }
    if (topSyllabusPct) {
      topSyllabusPct.textContent = '100% Done';
    }
    if (moduleItem8) {
      moduleItem8.classList.remove('active-current');
      moduleItem8.classList.add('completed');
      const icon = moduleItem8.querySelector('.item-status-icon');
      if (icon) {
        icon.className = 'item-status-icon';
        icon.textContent = '✓';
      }
      const pill = moduleItem8.querySelector('.mod-pill');
      if (pill) {
        pill.className = 'mod-pill';
        pill.textContent = 'MOD 08';
      }
    }
    if (mod8Status) {
      mod8Status.className = 'mod-meta';
      mod8Status.textContent = 'Completed · Validated';
      mod8Status.style.color = '#059669';
    }
    if (btnCompleteModule) {
      btnCompleteModule.textContent = '✓ Completed & Validated';
      btnCompleteModule.disabled = true;
      btnCompleteModule.style.background = '#059669';
    }
  }

  btnContinueSprint?.addEventListener('click', openCourseWorkspace);
  btnBackToSprints?.addEventListener('click', closeCourseWorkspace);
  btnToggleVideoVoice?.addEventListener('click', toggleLessonVideo);
  btnCompleteModule?.addEventListener('click', completeModule8);

  // Stepper Arrow Navigation
  btnSyllabusPrev?.addEventListener('click', () => {
    syllabusModuleList?.scrollBy({ left: -260, behavior: 'smooth' });
  });
  btnSyllabusNext?.addEventListener('click', () => {
    syllabusModuleList?.scrollBy({ left: 260, behavior: 'smooth' });
  });

  // Clicking on module items
  if (syllabusModuleList) {
    syllabusModuleList.querySelectorAll('.syllabus-item').forEach((item) => {
      item.addEventListener('click', () => {
        const modNum = item.getAttribute('data-mod');
        item.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
      });
    });
  }

  // ==========================================================
  // ==========================================================
  // 5B. ACCESSIBLE MEDIA PLAYER & SIGN LANGUAGE THEATER ENGINE
  // ==========================================================
  const mainVideoContainer = document.getElementById('mainVideoContainer');
  const btnVideoCenterSplash = document.getElementById('btnVideoCenterSplash');
  const centerSplashIcon = document.getElementById('centerSplashIcon');
  const customMediaControls = document.getElementById('customMediaControls');

  // Timeline & Scrubber elements
  const mediaTimelineWrap = document.getElementById('mediaTimelineWrap');
  const timelineHoverTooltip = document.getElementById('timelineHoverTooltip');
  const mediaProgressTrack = document.getElementById('mediaProgressTrack');
  const trackBuffer = document.getElementById('trackBuffer');
  const trackProgress = document.getElementById('trackProgress');
  const trackThumb = document.getElementById('trackThumb');

  // Primary Action Controls
  const btnMediaPlay = document.getElementById('btnMediaPlay');
  const mediaPlayIcon = document.getElementById('mediaPlayIcon');
  const btnMediaRewind10 = document.getElementById('btnMediaRewind10');
  const btnMediaForward10 = document.getElementById('btnMediaForward10');

  // Volume Controls
  const playerVolumeGroup = document.getElementById('playerVolumeGroup');
  const btnMediaMute = document.getElementById('btnMediaMute');
  const mediaVolumeIcon = document.getElementById('mediaVolumeIcon');
  const mediaVolumeSlider = document.getElementById('mediaVolumeSlider');
  const volumePctLabel = document.getElementById('volumePctLabel');

  // Time Displays
  const playerCurrentTime = document.getElementById('playerCurrentTime');
  const playerTotalDuration = document.getElementById('playerTotalDuration');

  // Playback Speed Controls
  const btnMediaSpeed = document.getElementById('btnMediaSpeed');
  const mediaSpeedText = document.getElementById('mediaSpeedText');
  const playerSpeedMenu = document.getElementById('playerSpeedMenu');
  const speedMenuItems = document.querySelectorAll('.speed-menu-item');

  // Secondary Tools: CC, Sign Language, Keyboard Help, Fullscreen
  const btnMediaCC = document.getElementById('btnMediaCC');
  const playerCcBadge = document.getElementById('playerCcBadge');
  const btnMediaSL = document.getElementById('btnMediaSL');
  const btnMediaShortcutsHelp = document.getElementById('btnMediaShortcutsHelp');
  const btnMediaFullscreen = document.getElementById('btnMediaFullscreen');
  const mediaFsIcon = document.getElementById('mediaFsIcon');

  const playerShortcutsModal = document.getElementById('playerShortcutsModal');
  const btnCloseShortcuts = document.getElementById('btnCloseShortcuts');

  // Sign Language & Theater Elements
  const btnToggleSignLanguage = document.getElementById('btnToggleSignLanguage');
  const btnToggleSLOverlay = document.getElementById('btnToggleSLOverlay');
  const slBtnText = document.getElementById('slBtnText');
  const slBtnStatusPill = document.getElementById('slBtnStatusPill');
  const slPipWindow = document.getElementById('slPipWindow');
  const signLanguageVideo = document.getElementById('signLanguageVideo');
  const btnSlPipClose = document.getElementById('btnSlPipClose');
  const videoSubtitlesBar = document.getElementById('videoSubtitlesBar');
  const videoSubtitleText = document.getElementById('videoSubtitleText');
  const theaterFullscreenTopbar = document.getElementById('theaterFullscreenTopbar');
  const btnExitTheaterFullscreen = document.getElementById('btnExitTheaterFullscreen');
  const btnToggleSubtitles = document.getElementById('btnToggleSubtitles');
  const btnSubtitlesToggle = document.getElementById('btnSubtitlesToggle');

  let isSlActive = false;
  let isTheaterFullscreen = false;
  let isSubtitlesEnabled = true;
  let lastVolume = 1;
  let isScrubbing = false;
  let controlsHideTimeout = null;

  // Real-time Synchronized Subtitles (Captions) Timeline for DO-IT: People with Disabilities & Computer Technology (wwa.mp4, 52.41s)
  const lessonSubtitles = [
    { start: 0.0, end: 5.2, text: "DO-IT: Disabilities, Opportunities, Internetworking, and Technology (University of Washington)." },
    { start: 5.2, end: 12.0, text: "The computer is a vital tool for education and employment, enabling independent work." },
    { start: 12.0, end: 18.5, text: "Mainstream and adaptive technologies work together to remove physical barriers." },
    { start: 18.5, end: 25.0, text: "Flexible workstations and alternative positioning adapt computers to individual needs." },
    { start: 25.0, end: 32.5, text: "Trackballs, foot switches, and specialized mouse controllers allow full computer interaction." },
    { start: 32.5, end: 40.5, text: "Adaptive ergonomic keyboards and single-handed layouts enable fast, flexible text input." },
    { start: 40.5, end: 46.5, text: "Dan Comden: With speech-to-text, words appear directly on screen as you speak." },
    { start: 46.5, end: 52.5, text: "Assistive technology and digital access empower students and professionals everywhere." }
  ];

  function formatTime(seconds) {
    if (isNaN(seconds) || seconds < 0) return '00:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    const mStr = mins < 10 ? '0' + mins : mins;
    const sStr = secs < 10 ? '0' + secs : secs;
    return `${mStr}:${sStr}`;
  }

  function updateSubtitles() {
    if (!courseLessonVideo || !isSubtitlesEnabled || !videoSubtitleText) return;
    const curTime = courseLessonVideo.currentTime;
    const activeCue = lessonSubtitles.find(cue => curTime >= cue.start && curTime < cue.end);
    if (activeCue) {
      if (videoSubtitleText.textContent !== activeCue.text) {
        videoSubtitleText.textContent = activeCue.text;
      }
      if (videoSubtitlesBar && videoSubtitlesBar.hidden) {
        videoSubtitlesBar.hidden = false;
      }
    } else {
      if (videoSubtitleText) videoSubtitleText.textContent = "Accessible Live Learning Platform · ALX SE";
    }
  }

  function toggleSubtitles(forceState) {
    if (typeof forceState === 'boolean') {
      isSubtitlesEnabled = forceState;
    } else {
      isSubtitlesEnabled = !isSubtitlesEnabled;
    }

    if (videoSubtitlesBar) {
      videoSubtitlesBar.hidden = !isSubtitlesEnabled;
    }
    if (btnToggleSubtitles) {
      btnToggleSubtitles.textContent = isSubtitlesEnabled ? '💬 Subtitles: ON' : '💬 Subtitles: OFF';
    }
    if (btnSubtitlesToggle) {
      btnSubtitlesToggle.classList.toggle('cc-active', isSubtitlesEnabled);
    }
    if (btnMediaCC) {
      btnMediaCC.classList.toggle('cc-active', isSubtitlesEnabled);
      btnMediaCC.setAttribute('aria-label', isSubtitlesEnabled ? 'Turn subtitles off (C)' : 'Turn subtitles on (C)');
    }
  }

  function togglePlayVideo() {
    if (!courseLessonVideo) return;
    if (courseLessonVideo.paused) {
      courseLessonVideo.play().catch(() => {});
      if (isSlActive && signLanguageVideo) {
        signLanguageVideo.currentTime = courseLessonVideo.currentTime;
        signLanguageVideo.play().catch(() => {});
      }
    } else {
      courseLessonVideo.pause();
      if (signLanguageVideo) signLanguageVideo.pause();
    }
    showControlsTemporarily();
  }

  function rewind10() {
    if (!courseLessonVideo) return;
    courseLessonVideo.currentTime = Math.max(0, courseLessonVideo.currentTime - 10);
    if (signLanguageVideo) signLanguageVideo.currentTime = courseLessonVideo.currentTime;
    showControlsTemporarily();
  }

  function forward10() {
    if (!courseLessonVideo) return;
    const dur = courseLessonVideo.duration || 52.39;
    courseLessonVideo.currentTime = Math.min(dur, courseLessonVideo.currentTime + 10);
    if (signLanguageVideo) signLanguageVideo.currentTime = courseLessonVideo.currentTime;
    showControlsTemporarily();
  }

  function updateVolume(val) {
    const clamped = Math.max(0, Math.min(1, val));
    if (courseLessonVideo) {
      courseLessonVideo.volume = clamped;
      courseLessonVideo.muted = clamped === 0;
    }
    if (mediaVolumeSlider) mediaVolumeSlider.value = clamped;
    const pct = Math.round(clamped * 100);
    if (volumePctLabel) volumePctLabel.textContent = `${pct}%`;
    if (mediaVolumeIcon) {
      if (clamped === 0 || (courseLessonVideo && courseLessonVideo.muted)) {
        mediaVolumeIcon.textContent = '🔇';
        btnMediaMute?.setAttribute('aria-label', 'Unmute audio (M)');
      } else if (clamped < 0.5) {
        mediaVolumeIcon.textContent = '🔉';
        btnMediaMute?.setAttribute('aria-label', 'Mute audio (M)');
      } else {
        mediaVolumeIcon.textContent = '🔊';
        btnMediaMute?.setAttribute('aria-label', 'Mute audio (M)');
      }
    }
    if (clamped > 0) lastVolume = clamped;
  }

  function toggleMuteVideo() {
    if (!courseLessonVideo) return;
    if (courseLessonVideo.muted || courseLessonVideo.volume === 0) {
      courseLessonVideo.muted = false;
      updateVolume(lastVolume || 1);
    } else {
      lastVolume = courseLessonVideo.volume;
      courseLessonVideo.muted = true;
      updateVolume(0);
    }
    showControlsTemporarily();
  }

  function setPlaybackSpeed(speed) {
    if (!courseLessonVideo) return;
    courseLessonVideo.playbackRate = speed;
    if (signLanguageVideo) signLanguageVideo.playbackRate = speed;
    if (mediaSpeedText) mediaSpeedText.textContent = `${speed}x`;
    speedMenuItems.forEach(item => {
      const s = parseFloat(item.getAttribute('data-speed'));
      item.classList.toggle('active', s === speed);
    });
    if (playerSpeedMenu) playerSpeedMenu.hidden = true;
    btnMediaSpeed?.setAttribute('aria-expanded', 'false');
    showControlsTemporarily();
  }

  function cycleSpeed(direction = 1) {
    const speeds = [0.5, 0.75, 1, 1.25, 1.5, 2];
    const cur = courseLessonVideo ? courseLessonVideo.playbackRate : 1;
    let idx = speeds.indexOf(cur);
    if (idx === -1) idx = 2;
    idx = Math.max(0, Math.min(speeds.length - 1, idx + direction));
    setPlaybackSpeed(speeds[idx]);
  }

  function toggleShortcutsModal(forceState) {
    if (!playerShortcutsModal) return;
    const isHidden = typeof forceState === 'boolean' ? !forceState : !playerShortcutsModal.hidden;
    playerShortcutsModal.hidden = isHidden;
    if (!isHidden) {
      btnCloseShortcuts?.focus();
    } else {
      btnMediaShortcutsHelp?.focus();
    }
  }

  function showControlsTemporarily() {
    if (!customMediaControls) return;
    customMediaControls.classList.remove('controls-fade');
    if (theaterFullscreenTopbar) theaterFullscreenTopbar.style.opacity = '1';
    clearTimeout(controlsHideTimeout);
    if (courseLessonVideo && !courseLessonVideo.paused) {
      controlsHideTimeout = setTimeout(() => {
        const hasFocusInControls = customMediaControls.contains(document.activeElement);
        const isModalOpen = playerShortcutsModal && !playerShortcutsModal.hidden;
        const isSpeedOpen = playerSpeedMenu && !playerSpeedMenu.hidden;
        if (!hasFocusInControls && !isModalOpen && !isSpeedOpen && courseLessonVideo && !courseLessonVideo.paused) {
          customMediaControls.classList.add('controls-fade');
          if (isTheaterFullscreen && theaterFullscreenTopbar) theaterFullscreenTopbar.style.opacity = '0';
        }
      }, 2800);
    }
  }

  function seekToClientX(clientX) {
    if (!courseLessonVideo || !mediaProgressTrack) return;
    const rect = mediaProgressTrack.getBoundingClientRect();
    const pos = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    const dur = courseLessonVideo.duration || 52.39;
    const target = pos * dur;
    courseLessonVideo.currentTime = target;
    if (signLanguageVideo) signLanguageVideo.currentTime = target;
    updateSubtitles();
    showControlsTemporarily();
  }

  // AUTOMATIC FULL-SCREEN SIGN LANGUAGE THEATER LAUNCHER
  function launchSignLanguageTheater(forceState) {
    if (typeof forceState === 'boolean') {
      isSlActive = forceState;
    } else {
      isSlActive = !isSlActive;
    }

    if (isSlActive) {
      // 1. Enter Automatic Full Screen (Main video is the main one)
      enterTheaterFullscreen();

      // 2. Open Sign Language as the Smallest Screen in the corner
      if (slPipWindow) {
        slPipWindow.hidden = false;
        slPipWindow.classList.add('sl-open');
      }

      // 3. Display Subtitles automatically
      toggleSubtitles(true);

      // 4. Update Button badges & visual states
      btnToggleSignLanguage?.classList.add('sl-active');
      btnToggleSLOverlay?.classList.add('sl-active');
      btnMediaSL?.classList.add('sl-active');
      if (slBtnStatusPill) slBtnStatusPill.textContent = 'Active (Full Screen)';
      if (slBtnText) slBtnText.textContent = 'Sign Language & Subtitles (Active)';

      // 5. Synchronize playback & start playing
      if (courseLessonVideo && signLanguageVideo) {
        signLanguageVideo.currentTime = courseLessonVideo.currentTime;
        if (courseLessonVideo.paused) {
          courseLessonVideo.play().catch(() => {});
        }
        signLanguageVideo.play().catch(() => {});
      }
    } else {
      // Exit full screen & hide interpreter
      exitTheaterFullscreen();
      if (slPipWindow) {
        slPipWindow.hidden = true;
        slPipWindow.classList.remove('sl-open');
      }
      btnToggleSignLanguage?.classList.remove('sl-active');
      btnToggleSLOverlay?.classList.remove('sl-active');
      btnMediaSL?.classList.remove('sl-active');
      if (slBtnStatusPill) slBtnStatusPill.textContent = 'Off';
      if (slBtnText) slBtnText.textContent = 'Sign Language (Auto Full Screen)';
      if (signLanguageVideo) {
        signLanguageVideo.pause();
      }
    }
  }

  function enterTheaterFullscreen() {
    isTheaterFullscreen = true;
    if (mainVideoContainer) {
      mainVideoContainer.classList.add('theater-fullscreen');
    }
    if (theaterFullscreenTopbar) {
      theaterFullscreenTopbar.hidden = false;
      theaterFullscreenTopbar.style.opacity = '1';
    }
    if (videoSubtitlesBar && isSubtitlesEnabled) {
      videoSubtitlesBar.hidden = false;
    }
    if (mediaFsIcon) mediaFsIcon.textContent = '⛶';
    if (btnMediaFullscreen) {
      btnMediaFullscreen.title = 'Exit Full Screen (F)';
      btnMediaFullscreen.setAttribute('aria-label', 'Exit full screen (F)');
    }

    try {
      if (mainVideoContainer?.requestFullscreen) {
        mainVideoContainer.requestFullscreen().catch(() => {});
      } else if (mainVideoContainer?.webkitRequestFullscreen) {
        mainVideoContainer.webkitRequestFullscreen();
      }
    } catch (_) {}
    showControlsTemporarily();
  }

  function exitTheaterFullscreen() {
    isTheaterFullscreen = false;
    if (mainVideoContainer) {
      mainVideoContainer.classList.remove('theater-fullscreen');
    }
    if (theaterFullscreenTopbar) {
      theaterFullscreenTopbar.hidden = true;
    }
    if (mediaFsIcon) mediaFsIcon.textContent = '⛶';
    if (btnMediaFullscreen) {
      btnMediaFullscreen.title = 'Full Screen (F)';
      btnMediaFullscreen.setAttribute('aria-label', 'Full screen (F)');
    }
    if (document.fullscreenElement) {
      try { document.exitFullscreen().catch(() => {}); } catch (_) {}
    }
    showControlsTemporarily();
  }

  // Handle native ESC or Fullscreen change events
  document.addEventListener('fullscreenchange', () => {
    if (!document.fullscreenElement && isTheaterFullscreen) {
      exitTheaterFullscreen();
    }
  });

  // Video Element Play/Pause & Time Events
  if (courseLessonVideo) {
    courseLessonVideo.addEventListener('loadedmetadata', () => {
      if (playerTotalDuration) playerTotalDuration.textContent = formatTime(courseLessonVideo.duration || 52.39);
    });

    courseLessonVideo.addEventListener('play', () => {
      if (mediaPlayIcon) mediaPlayIcon.textContent = '❚❚';
      if (btnMediaPlay) {
        btnMediaPlay.setAttribute('aria-label', 'Pause video (Space or K)');
        btnMediaPlay.title = 'Pause (Space or K)';
      }
      if (btnVideoCenterSplash) btnVideoCenterSplash.classList.add('splash-hide');
      if (centerSplashIcon) centerSplashIcon.textContent = '❚❚';
      if (isSlActive && signLanguageVideo && signLanguageVideo.paused) {
        signLanguageVideo.currentTime = courseLessonVideo.currentTime;
        signLanguageVideo.play().catch(() => {});
      }
      showControlsTemporarily();
    });

    courseLessonVideo.addEventListener('pause', () => {
      if (mediaPlayIcon) mediaPlayIcon.textContent = '▶';
      if (btnMediaPlay) {
        btnMediaPlay.setAttribute('aria-label', 'Play video (Space or K)');
        btnMediaPlay.title = 'Play (Space or K)';
      }
      if (btnVideoCenterSplash) btnVideoCenterSplash.classList.remove('splash-hide');
      if (centerSplashIcon) centerSplashIcon.textContent = '▶';
      if (signLanguageVideo && !signLanguageVideo.paused) {
        signLanguageVideo.pause();
      }
      showControlsTemporarily();
    });

    courseLessonVideo.addEventListener('timeupdate', () => {
      const cur = courseLessonVideo.currentTime;
      const dur = courseLessonVideo.duration || 52.39;
      const pct = (cur / dur) * 100;
      if (trackProgress) trackProgress.style.width = `${pct}%`;
      if (trackThumb) trackThumb.style.left = `${pct}%`;
      if (playerCurrentTime) playerCurrentTime.textContent = formatTime(cur);
      if (mediaProgressTrack) {
        mediaProgressTrack.setAttribute('aria-valuenow', Math.round(pct));
        mediaProgressTrack.setAttribute('aria-valuetext', `${formatTime(cur)} of ${formatTime(dur)}`);
      }
      // Buffered progress
      if (courseLessonVideo.buffered && courseLessonVideo.buffered.length > 0) {
        try {
          const bufEnd = courseLessonVideo.buffered.end(courseLessonVideo.buffered.length - 1);
          const bufPct = Math.min(100, (bufEnd / dur) * 100);
          if (trackBuffer) trackBuffer.style.width = `${bufPct}%`;
        } catch (_) {}
      }
      updateSubtitles();
      // Sync sign language
      if (isSlActive && signLanguageVideo && Math.abs(signLanguageVideo.currentTime - cur) > 0.25) {
        signLanguageVideo.currentTime = cur;
      }
    });

    courseLessonVideo.addEventListener('seeked', () => {
      if (isSlActive && signLanguageVideo) {
        signLanguageVideo.currentTime = courseLessonVideo.currentTime;
      }
      updateSubtitles();
    });

    courseLessonVideo.addEventListener('ended', () => {
      if (mediaPlayIcon) mediaPlayIcon.textContent = '▶';
      if (btnVideoCenterSplash) btnVideoCenterSplash.classList.remove('splash-hide');
      if (centerSplashIcon) centerSplashIcon.textContent = '↺';
      if (signLanguageVideo) signLanguageVideo.pause();
    });

    courseLessonVideo.addEventListener('click', () => {
      togglePlayVideo();
    });
  }

  // Big Center Splash Play Click
  btnVideoCenterSplash?.addEventListener('click', (e) => {
    e.stopPropagation();
    togglePlayVideo();
  });

  // Media Player Controls Event Bindings
  btnMediaPlay?.addEventListener('click', (e) => {
    e.stopPropagation();
    togglePlayVideo();
  });

  btnMediaRewind10?.addEventListener('click', (e) => {
    e.stopPropagation();
    rewind10();
  });

  btnMediaForward10?.addEventListener('click', (e) => {
    e.stopPropagation();
    forward10();
  });

  btnMediaMute?.addEventListener('click', (e) => {
    e.stopPropagation();
    toggleMuteVideo();
  });

  mediaVolumeSlider?.addEventListener('input', (e) => {
    updateVolume(parseFloat(e.target.value));
    showControlsTemporarily();
  });

  // Playback Speed dropdown toggle
  btnMediaSpeed?.addEventListener('click', (e) => {
    e.stopPropagation();
    if (!playerSpeedMenu) return;
    const isHidden = playerSpeedMenu.hidden;
    playerSpeedMenu.hidden = !isHidden;
    btnMediaSpeed.setAttribute('aria-expanded', isHidden ? 'true' : 'false');
    showControlsTemporarily();
  });

  speedMenuItems.forEach(item => {
    item.addEventListener('click', (e) => {
      e.stopPropagation();
      const speed = parseFloat(item.getAttribute('data-speed'));
      setPlaybackSpeed(speed);
    });
  });

  // CC and Sign Language Controls
  btnMediaCC?.addEventListener('click', (e) => {
    e.stopPropagation();
    toggleSubtitles();
    showControlsTemporarily();
  });

  btnMediaSL?.addEventListener('click', (e) => {
    e.stopPropagation();
    launchSignLanguageTheater();
  });

  btnMediaShortcutsHelp?.addEventListener('click', (e) => {
    e.stopPropagation();
    toggleShortcutsModal();
  });

  btnCloseShortcuts?.addEventListener('click', (e) => {
    e.stopPropagation();
    toggleShortcutsModal(false);
  });

  btnMediaFullscreen?.addEventListener('click', (e) => {
    e.stopPropagation();
    if (isTheaterFullscreen) {
      exitTheaterFullscreen();
    } else {
      enterTheaterFullscreen();
    }
  });

  // Scrubber / Progress Track Click & Drag
  if (mediaTimelineWrap) {
    mediaTimelineWrap.addEventListener('mousedown', (e) => {
      isScrubbing = true;
      seekToClientX(e.clientX);
    });

    mediaTimelineWrap.addEventListener('mousemove', (e) => {
      const rect = mediaProgressTrack.getBoundingClientRect();
      const pos = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
      const dur = courseLessonVideo?.duration || 52.39;
      const hoverSecs = pos * dur;
      if (timelineHoverTooltip) {
        timelineHoverTooltip.hidden = false;
        timelineHoverTooltip.textContent = formatTime(hoverSecs);
        timelineHoverTooltip.style.left = `${pos * 100}%`;
      }
      if (isScrubbing) {
        seekToClientX(e.clientX);
      }
    });

    mediaTimelineWrap.addEventListener('mouseleave', () => {
      if (timelineHoverTooltip) timelineHoverTooltip.hidden = true;
    });
  }

  document.addEventListener('mouseup', () => {
    isScrubbing = false;
  });

  // Accessible Keyboard Navigation on Scrubber
  mediaProgressTrack?.addEventListener('keydown', (e) => {
    if (!courseLessonVideo) return;
    if (e.key === 'ArrowLeft') {
      e.preventDefault();
      courseLessonVideo.currentTime = Math.max(0, courseLessonVideo.currentTime - 5);
    } else if (e.key === 'ArrowRight') {
      e.preventDefault();
      courseLessonVideo.currentTime = Math.min(courseLessonVideo.duration || 52.39, courseLessonVideo.currentTime + 5);
    } else if (e.key === 'Home') {
      e.preventDefault();
      courseLessonVideo.currentTime = 0;
    } else if (e.key === 'End') {
      e.preventDefault();
      courseLessonVideo.currentTime = courseLessonVideo.duration || 52.39;
    } else if (e.key === ' ' || e.key === 'Enter') {
      e.preventDefault();
      togglePlayVideo();
    }
  });

  // Auto-hide controls listener
  mainVideoContainer?.addEventListener('mousemove', showControlsTemporarily);
  mainVideoContainer?.addEventListener('focusin', showControlsTemporarily);

  // UNIVERSAL KEYBOARD ACCESSIBILITY CONTROLLER FOR MEDIA PLAYER
  document.addEventListener('keydown', (e) => {
    // If user is currently typing in an input or textarea (and not our volume slider), ignore global keys
    const tag = (e.target && e.target.tagName) ? e.target.tagName.toUpperCase() : '';
    if ((tag === 'INPUT' && e.target !== mediaVolumeSlider) || tag === 'TEXTAREA') return;

    // Check if learning course view is currently visible
    if (learningCourseView && learningCourseView.hidden) return;

    const key = e.key.toLowerCase();

    // Space or k: toggle play/pause
    if (e.code === 'Space' || key === 'k') {
      e.preventDefault();
      togglePlayVideo();
      showControlsTemporarily();
    } else if (key === 'm') {
      e.preventDefault();
      toggleMuteVideo();
      showControlsTemporarily();
    } else if (key === 'f') {
      e.preventDefault();
      if (isTheaterFullscreen) {
        exitTheaterFullscreen();
      } else {
        enterTheaterFullscreen();
      }
    } else if (key === 'c') {
      e.preventDefault();
      toggleSubtitles();
      showControlsTemporarily();
    } else if (key === 's') {
      e.preventDefault();
      launchSignLanguageTheater();
    } else if (key === 'j') {
      e.preventDefault();
      rewind10();
      showControlsTemporarily();
    } else if (key === 'l') {
      e.preventDefault();
      forward10();
      showControlsTemporarily();
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault();
      if (courseLessonVideo) courseLessonVideo.currentTime = Math.max(0, courseLessonVideo.currentTime - 5);
      if (signLanguageVideo) signLanguageVideo.currentTime = courseLessonVideo.currentTime;
      showControlsTemporarily();
    } else if (e.key === 'ArrowRight') {
      e.preventDefault();
      if (courseLessonVideo) courseLessonVideo.currentTime = Math.min(courseLessonVideo.duration || 52.39, courseLessonVideo.currentTime + 5);
      if (signLanguageVideo) signLanguageVideo.currentTime = courseLessonVideo.currentTime;
      showControlsTemporarily();
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (courseLessonVideo) updateVolume(courseLessonVideo.volume + 0.1);
      showControlsTemporarily();
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (courseLessonVideo) updateVolume(courseLessonVideo.volume - 0.1);
      showControlsTemporarily();
    } else if (key >= '0' && key <= '9') {
      e.preventDefault();
      const fraction = parseInt(key, 10) / 10;
      if (courseLessonVideo) {
        const target = (courseLessonVideo.duration || 52.39) * fraction;
        courseLessonVideo.currentTime = target;
        if (signLanguageVideo) signLanguageVideo.currentTime = target;
      }
      showControlsTemporarily();
    } else if (key === '>' || (e.shiftKey && e.key === '.')) {
      e.preventDefault();
      cycleSpeed(1);
      showControlsTemporarily();
    } else if (key === '<' || (e.shiftKey && e.key === ',')) {
      e.preventDefault();
      cycleSpeed(-1);
      showControlsTemporarily();
    } else if (key === '?') {
      e.preventDefault();
      toggleShortcutsModal();
    } else if (e.key === 'Escape') {
      if (playerShortcutsModal && !playerShortcutsModal.hidden) {
        playerShortcutsModal.hidden = true;
      } else if (isTheaterFullscreen) {
        exitTheaterFullscreen();
      }
    }
  });

  // Top Bar & Action Bar button connections
  btnToggleSignLanguage?.addEventListener('click', () => launchSignLanguageTheater());
  btnToggleSLOverlay?.addEventListener('click', () => launchSignLanguageTheater());
  btnExitTheaterFullscreen?.addEventListener('click', () => exitTheaterFullscreen());
  btnToggleSubtitles?.addEventListener('click', () => toggleSubtitles());
  btnSubtitlesToggle?.addEventListener('click', () => toggleSubtitles());
  btnSlPipClose?.addEventListener('click', (e) => {
    e.stopPropagation();
    if (slPipWindow) slPipWindow.hidden = true;
    isSlActive = false;
    btnToggleSignLanguage?.classList.remove('sl-active');
    btnToggleSLOverlay?.classList.remove('sl-active');
    btnMediaSL?.classList.remove('sl-active');
    if (slBtnStatusPill) slBtnStatusPill.textContent = 'Off';
  });

  // ==========================================================
  // 5C. BRAILLE TRANSCRIPT & TACTILE EMBOSSER PRINT ENGINE
  // ==========================================================
  const btnOpenBraille = document.getElementById('btnOpenBraille');
  const btnOpenBrailleChip = document.getElementById('btnOpenBrailleChip');
  const brailleModal = document.getElementById('brailleModal');
  const btnCloseBrailleModal = document.getElementById('btnCloseBrailleModal');
  const btnCloseBrailleModalBottom = document.getElementById('btnCloseBrailleModalBottom');
  const btnPrintBraille = document.getElementById('btnPrintBraille');
  const btnDownloadBRF = document.getElementById('btnDownloadBRF');
  const btnSpeechBraille = document.getElementById('btnSpeechBraille');
  const btnBrailleZoomNormal = document.getElementById('btnBrailleZoomNormal');
  const btnBrailleZoomLarge = document.getElementById('btnBrailleZoomLarge');
  const brailleDotsOutput = document.getElementById('brailleDotsOutput');
  const brailleEnglishOutput = document.getElementById('brailleEnglishOutput');

  // Standard Grade 1 Braille Character Map (Unicode Braille Patterns \u2800 - \u28FF)
  const BRAILLE_MAP = {
    'a': '⠁', 'b': '⠃', 'c': '⠉', 'd': '⠙', 'e': '⠑', 'f': '⠋', 'g': '⠛', 'h': '⠓', 'i': '⠊', 'j': '⠚',
    'k': '⠅', 'l': '⠇', 'm': '⠍', 'n': '⠝', 'o': '⠕', 'p': '⠏', 'q': '⠟', 'r': '⠗', 's': '⠎', 't': '⠞',
    'u': '⠥', 'v': '⠧', 'w': '⠺', 'x': '⠭', 'y': '⠽', 'z': '⠵',
    '1': '⠁', '2': '⠃', '3': '⠉', '4': '⠙', '5': '⠑', '6': '⠋', '7': '⠛', '8': '⠓', '9': '⠊', '0': '⠚',
    ',': '⠂', ';': '⠆', ':': '⠒', '.': '⠲', '!': '⠖', '?': '⦠', "'": '⠄', '"': '⠶',
    '(': '⠶', ')': '⠶', '[': '⠶', ']': '⠶', '-': '⠤', '/': '⠌', '&': '⠯', '@': '⠈', '#': '⠼', '%': '⠩',
    '+': '⠬', '=': '⠶', '*': '⠔'
  };
  const BRAILLE_CAPITAL = '⠠';
  const BRAILLE_NUMBER = '⠼';

  const LESSON_TRANSCRIPT_PLAIN = `ALX LEARNING - MODULE 08
FINAL PORTFOLIO INTEGRATION AND LIVE DEMONSTRATION

[00:00 - 03:20] LESSON INTRODUCTION & OBJECTIVES
Welcome to Module 8: Final Portfolio Integration and Live Demonstration. In this capstone module, learners consolidate full-stack architecture, deployment automation, and universal accessibility.

[03:20 - 07:00] ARCHITECTURE & SYSTEM INTEGRATION
Reviewing our multi-tenant REST API design and relational database schema migration engine. Verify all secure session storage and role-based access controllers.

[07:00 - 11:20] ACCESSIBILITY & HANDS-FREE VERIFICATION
Ensuring complete compliance with Web Content Accessibility Guidelines 2.2 AA. Verify screen reader tree navigation, full keyboard focus trap isolation, and active voice navigation engine.

[11:20 - 15:00] LIVE INTERPRETER & EMBOSSER FORMATS
Synchronized Ethiopian Sign Language (EthSL) video stream, real-time closed captioning, and printable Braille transcript mode are now fully integrated.

[15:00 - 18:00] CAPSTONE MILESTONE SUBMISSION
Execute automated CI/CD container tests and submit your verified portfolio project for technical mentor evaluation and graduation validation.`;

  // Grade 1 Braille Formatter (40 cells line limit for Embossers)
  function textToBraille(text, maxCharsPerLine = 40) {
    const lines = text.split('\n');
    const brailleLines = [];

    for (let rawLine of lines) {
      if (rawLine.trim() === '') {
        brailleLines.push('');
        continue;
      }

      let brailleChars = '';
      let inNumber = false;

      for (let i = 0; i < rawLine.length; i++) {
        const ch = rawLine[i];

        if (/[0-9]/.test(ch)) {
          if (!inNumber) {
            brailleChars += BRAILLE_NUMBER;
            inNumber = true;
          }
          brailleChars += BRAILLE_MAP[ch] || ch;
        } else {
          inNumber = false;
          if (/[A-Z]/.test(ch)) {
            brailleChars += BRAILLE_CAPITAL;
            brailleChars += BRAILLE_MAP[ch.toLowerCase()] || ch;
          } else if (/[a-z]/.test(ch)) {
            brailleChars += BRAILLE_MAP[ch] || ch;
          } else if (BRAILLE_MAP[ch]) {
            brailleChars += BRAILLE_MAP[ch];
          } else if (ch === ' ') {
            brailleChars += ' ';
          } else {
            brailleChars += ch;
          }
        }
      }

      // Word wrapping at maxCharsPerLine
      const words = brailleChars.split(' ');
      let currentLine = '';

      for (let word of words) {
        if (currentLine.length === 0) {
          currentLine = word;
        } else if (currentLine.length + 1 + word.length <= maxCharsPerLine) {
          currentLine += ' ' + word;
        } else {
          brailleLines.push(currentLine);
          currentLine = word;
        }
      }
      if (currentLine.length > 0) {
        brailleLines.push(currentLine);
      }
    }

    return brailleLines.join('\n');
  }

  // Open Braille Modal & Render
  function openBrailleModal() {
    if (!brailleModal) return;
    brailleModal.hidden = false;
    document.body.classList.add('braille-modal-open');

    if (brailleDotsOutput && !brailleDotsOutput.textContent.trim()) {
      brailleDotsOutput.textContent = textToBraille(LESSON_TRANSCRIPT_PLAIN, 40);
    }

    // Set focus for keyboard navigation & screen readers
    setTimeout(() => {
      brailleDotsOutput?.focus();
    }, 100);
  }

  // Close Braille Modal
  function closeBrailleModal() {
    if (!brailleModal) return;
    brailleModal.hidden = true;
    document.body.classList.remove('braille-modal-open');
    if (window.speechSynthesis) {
      window.speechSynthesis.cancel();
      if (btnSpeechBraille) btnSpeechBraille.innerHTML = '<span>🔊 Read Aloud</span>';
    }
  }

  // Print Braille Function
  function printBrailleTranscript() {
    openBrailleModal();
    setTimeout(() => {
      window.print();
    }, 250);
  }

  // Download .BRF (Braille Ready Format) File
  function downloadBRFFile() {
    const brfContent = textToBraille(LESSON_TRANSCRIPT_PLAIN, 40);
    const blob = new Blob([brfContent], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'ALX_Module_08_Transcript_Grade1_Braille.brf';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  // Speech Read-Aloud for Braille Transcript (routes through High-Definition Studio Voice)
  let isBrailleSpeaking = false;
  function speakBrailleTranscript() {
    if (isBrailleSpeaking) {
      if (window.voiceNav && window.voiceNav.currentAudio) {
        try { window.voiceNav.currentAudio.pause(); } catch (_) {}
      }
      if ('speechSynthesis' in window) {
        try { window.speechSynthesis.cancel(); } catch (_) {}
      }
      isBrailleSpeaking = false;
      if (btnSpeechBraille) btnSpeechBraille.innerHTML = '<span>🔊 Read Aloud</span>';
      return;
    }

    isBrailleSpeaking = true;
    if (btnSpeechBraille) btnSpeechBraille.innerHTML = '<span>⏹️ Stop Reading</span>';

    const amBrailleText = "የኤ ኤል ኤክስ ትምህርት፡ ሞጁል 8 - የመጨረሻው የፖርትፎሊዮ ቅንጅት እና የቀጥታ ማሳያ። በዚህ የማጠቃለያ ሞጁል ተማሪዎች የሙሉ-ስታክ አርክቴክቸር፣ አውቶሜሽን እና ተደራሽነትን ያረጋግጣሉ። የድረ-ገጽ ተደራሽነት መመሪያዎችን እና የድምጽ ትዕዛዝ አሰራርን ያጠቃልላል።";
    const omBrailleText = "Barnoota ALX: Moojulii 8 - Qindoomina Pirojeektii Xumuraa fi Agarsiisa Kallattii. Moojulii kanatti barattoonni ijaarsa guutuu, of-danda'ee hojjechuu fi dhaqqabamummaa mirkaneessu.";
    const tiBrailleText = "ትምህርቲ ኤ ኤል ኤክስ፡ ሞጁል 8 - ናይ መወዳእታ ውህደት ፖርትፎልዮን ቀጥታዊ ምርኢትን። ኣብዚ መዛዘሚ ሞጁል ተምሃሮ ሙሉእ ስታክ ኣርኪቴክቸርን ተበጻሕነትን የረጋግጹ።";
    const enBrailleText = "ALX Learning Module 8: Final Portfolio Integration and Live Demonstration. In this capstone module, learners consolidate full-stack architecture, deployment automation, and universal accessibility.";

    const textToSpeak = currentLang === 'am' ? amBrailleText :
                        currentLang === 'om' ? omBrailleText :
                        currentLang === 'ti' ? tiBrailleText : enBrailleText;

    if (window.voiceNav) {
      window.voiceNav.speak(textToSpeak, currentLang).then(() => {
        isBrailleSpeaking = false;
        if (btnSpeechBraille) btnSpeechBraille.innerHTML = '<span>🔊 Read Aloud</span>';
      }).catch(() => {
        isBrailleSpeaking = false;
        if (btnSpeechBraille) btnSpeechBraille.innerHTML = '<span>🔊 Read Aloud</span>';
      });
    } else if ('speechSynthesis' in window) {
      const utter = new SpeechSynthesisUtterance(textToSpeak);
      utter.lang = currentLang === 'am' ? 'am-ET' : currentLang === 'om' ? 'om-ET' : currentLang === 'ti' ? 'ti-ET' : 'en-US';
      utter.onend = () => {
        isBrailleSpeaking = false;
        if (btnSpeechBraille) btnSpeechBraille.innerHTML = '<span>🔊 Read Aloud</span>';
      };
      utter.onerror = () => {
        isBrailleSpeaking = false;
        if (btnSpeechBraille) btnSpeechBraille.innerHTML = '<span>🔊 Read Aloud</span>';
      };
      window.speechSynthesis.speak(utter);
    }
  }

  // Connect Buttons
  btnOpenBraille?.addEventListener('click', openBrailleModal);
  btnOpenBrailleChip?.addEventListener('click', openBrailleModal);
  btnCloseBrailleModal?.addEventListener('click', closeBrailleModal);
  btnCloseBrailleModalBottom?.addEventListener('click', closeBrailleModal);
  btnPrintBraille?.addEventListener('click', printBrailleTranscript);
  btnDownloadBRF?.addEventListener('click', downloadBRFFile);
  btnSpeechBraille?.addEventListener('click', speakBrailleTranscript);

  // Zoom size toggles
  btnBrailleZoomNormal?.addEventListener('click', () => {
    brailleDotsOutput?.classList.remove('large-tactile');
    btnBrailleZoomNormal.classList.add('active');
    btnBrailleZoomLarge?.classList.remove('active');
  });

  btnBrailleZoomLarge?.addEventListener('click', () => {
    brailleDotsOutput?.classList.add('large-tactile');
    btnBrailleZoomLarge.classList.add('active');
    btnBrailleZoomNormal?.classList.remove('active');
  });

  // Close on backdrop click
  brailleModal?.addEventListener('click', (e) => {
    if (e.target === brailleModal) {
      closeBrailleModal();
    }
  });

  // Close on ESC
  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && brailleModal && !brailleModal.hidden) {
      closeBrailleModal();
    }
  });

  // Expose Braille actions globally for Voice Navigator
  window.openBrailleModal = openBrailleModal;
  window.closeBrailleModal = closeBrailleModal;
  window.printBrailleTranscript = printBrailleTranscript;
  window.downloadBRFFile = downloadBRFFile;

  // ==========================================================
  // 5D. UNIVERSAL INTERACTIVE MOCKUP ENGINE
  // ==========================================================
  const universalMockupModal = document.getElementById('universalMockupModal');
  const mockupCategoryBadge = document.getElementById('mockupCategoryBadge');
  const universalModalTitle = document.getElementById('universalModalTitle');
  const universalModalSub = document.getElementById('universalModalSub');
  const universalModalBody = document.getElementById('universalModalBody');
  const universalModalFooter = document.getElementById('universalModalFooter');
  const btnCloseUniversalModal = document.getElementById('btnCloseUniversalModal');
  const btnUniversalModalSecondary = document.getElementById('btnUniversalModalSecondary');
  const btnUniversalModalPrimary = document.getElementById('btnUniversalModalPrimary');

  function openMockup(type, contextData = {}) {
    if (!universalMockupModal || !universalModalBody) return;
    if (type === 'signup') return;

    let cat = 'ALX LMS FEATURE';
    let title = 'Feature Details';
    let sub = 'Simulated interactive preview';
    let bodyHtml = '';
    let primaryBtnText = 'Confirm Action';
    let secondaryBtnText = 'Close';

    switch (type) {
      case 'certificate':
        cat = 'OFFICIAL CREDENTIAL';
        title = 'Certificate of Completion';
        sub = 'Verified Software Engineering & Professional Foundations';
        primaryBtnText = 'Download PDF';
        secondaryBtnText = 'Close';
        bodyHtml = `
          <div class="cert-mockup-frame">
            <div class="cert-emblem-seal">🏆</div>
            <div class="cert-org-title">African Leadership Xcelerator • ALX</div>
            <h1 class="cert-heading-main">Certificate of Completion</h1>
            <p class="cert-awarded-text">This is proudly presented to</p>
            <div class="cert-recipient-name">Abenezer Habtamu</div>
            <p class="cert-description-text">
              For exemplary completion of the intensive <strong>Software Engineering Specialization & Professional Foundations</strong> curriculum, demonstrating proven mastery in Systems Architecture, Unix C programming, full-stack microservices, accessible design, and distributed software engineering.
            </p>
            <div style="display:flex; justify-content:center; gap:2rem; margin:1rem 0; font-size:0.85rem; color:#64748b;">
              <span><strong>Credential ID:</strong> ALX-SWE-2025-9842</span>
              <span><strong>Issued:</strong> August 2025</span>
              <span><strong>Grade:</strong> 92.74% (Honors)</span>
            </div>
            <div class="cert-signatures-row">
              <div class="cert-sig-block">
                <div class="cert-sig-line">Fred Swaniker</div>
                <div class="cert-sig-label">Founder & CEO, ALX Group</div>
              </div>
              <div class="cert-sig-block">
                <div class="cert-sig-line">Julien Barbier</div>
                <div class="cert-sig-label">Dean of Software Engineering</div>
              </div>
            </div>
          </div>
        `;
        break;

      case 'defense-call':
        cat = 'LIVE TECHNICAL DEFENSE';
        title = 'Capstone Project Defense Room';
        sub = 'Cohort 2025 Evaluation Board with Senior Engineering Mentors';
        primaryBtnText = 'Share Screen';
        secondaryBtnText = 'Leave Room';
        bodyHtml = `
          <div class="defense-room-wrap">
            <div class="defense-video-stage">
              <span class="defense-live-pill"><span class="badge-pulse-dot"></span> LIVE REVIEW</span>
              <span class="defense-timer-pill">⏱️ Session Time: 04:22 / 20:00</span>
              <div class="defense-mentor-tile">
                <div class="defense-avatar-big">AK</div>
                <h3 style="margin:0 0 0.25rem; font-size:1.2rem;">Dr. Amina K. (Lead Evaluation Panel)</h3>
                <p style="margin:0; font-size:0.85rem; color:#94a3b8;">Reviewing: Full-Stack Portfolio Architecture & Voice Access Engine</p>
              </div>
            </div>
            <div class="defense-controls-bar">
              <button type="button" class="btn-defense-call-action" onclick="this.textContent = this.textContent.includes('Muted') ? '🎙️ Mic Active' : '🔇 Muted Mic'">🎙️ Mic Active</button>
              <button type="button" class="btn-defense-call-action" onclick="this.textContent = this.textContent.includes('Off') ? '📷 Cam Active' : '📷 Cam Off'">📷 Cam Active</button>
              <button type="button" class="btn-defense-call-action" onclick="this.textContent = this.textContent.includes('Sharing') ? '🖥️ Share Screen' : '🖥️ Sharing Screen'; if(window.voiceNav) window.voiceNav.speak('Screen sharing status updated.');">🖥️ Share Screen</button>
              <button type="button" class="btn-defense-call-action danger" onclick="closeMockup()">🔴 End Defense</button>
            </div>
            <div style="background:#ffffff; border:1px solid #e2e8f0; border-radius:10px; padding:1rem; font-size:0.9rem; color:#334155;">
              <strong>Panelist Note:</strong> <em>"Live demonstration and hands-free accessibility integration are fully recognized. Proceed with the architectural overview."</em>
            </div>
          </div>
        `;
        break;

      case 'inspect-project':
        const prjName = contextData.project || 'Portfolio Project - SWE';
        cat = 'AUTOMATED CHECKER & CODE REVIEW';
        title = `Project Inspection: ${prjName}`;
        sub = 'Repository CI/CD Pipeline, Memory Leak Audit, and Mentor Feedback';
        primaryBtnText = 'View Repo on GitHub';
        secondaryBtnText = 'Close';
        bodyHtml = `
          <div>
            <div class="inspect-checker-banner">
              <div>
                <span style="font-size:0.85rem; color:#065f46; font-weight:700; text-transform:uppercase;">Overall Checker Score</span>
                <div class="checker-score-badge">100.0% Passing (14 / 14 Tasks)</div>
              </div>
              <span class="badge-validated" style="font-size:0.95rem; padding:6px 14px;">✓ Validated & Merged</span>
            </div>

            <div class="checker-tasks-grid">
              <div class="checker-task-card passed">
                <span>0. Code style & Betty linter</span>
                <strong style="color:#059669;">PASS (0 err)</strong>
              </div>
              <div class="checker-task-card passed">
                <span>1. Memory audit (Valgrind)</span>
                <strong style="color:#059669;">0 LEAKS</strong>
              </div>
              <div class="checker-task-card passed">
                <span>2. Unit test suites</span>
                <strong style="color:#059669;">100% (42/42)</strong>
              </div>
              <div class="checker-task-card passed">
                <span>3. End-to-end integration</span>
                <strong style="color:#059669;">PASS</strong>
              </div>
            </div>

            <h4 style="margin:1rem 0 0.5rem; font-size:0.95rem; color:#0f172a;">Latest Commit Diff Preview</h4>
            <div class="code-diff-preview-box">
              <div style="color:#94a3b8; margin-bottom:0.5rem;">commit 4a8f9c1e7 (HEAD -> main, origin/main)</div>
              <div style="color:#10b981;">+ // Voice Navigation Engine & Braille Embosser Support</div>
              <div style="color:#10b981;">+ export class VoicePlatformNavigator {</div>
              <div style="color:#10b981;">+   constructor() { this.init(); }</div>
              <div style="color:#10b981;">+ }</div>
              <div style="color:#38bdf8;">@@ -124,6 +124,18 @@ export function setupAccessibility()</div>
            </div>

            <div style="margin-top:1rem; padding:0.9rem 1.1rem; background:#ffffff; border:1px solid #e2e8f0; border-radius:10px;">
              <strong style="color:#0f172a;">Lead Mentor Evaluation:</strong>
              <p style="margin:0.25rem 0 0; font-size:0.88rem; color:#475569;">
                "Stellar architecture, clean modular separation, and exceptional attention to multi-modal universal access. Capstone criteria fully satisfied."
              </p>
            </div>
          </div>
        `;
        break;

      case 'review-quiz':
        const quizTitle = contextData.quiz || 'Week 12 Comprehensive Engineering Test';
        cat = 'QUIZ EVALUATION';
        title = `Review Answers: ${quizTitle}`;
        sub = 'Score: 100% (20/20 Correct) • Completed on First Attempt';
        primaryBtnText = 'Retake for Practice';
        secondaryBtnText = 'Close';
        bodyHtml = `
          <div class="quiz-review-wrap">
            <div style="display:flex; justify-content:space-between; align-items:center; background:#ecfdf5; border:1px solid #a7f3d0; border-radius:10px; padding:1rem 1.25rem;">
              <div>
                <span style="font-size:0.8rem; font-weight:800; color:#065f46; text-transform:uppercase;">Assessment Result</span>
                <h3 style="margin:0; font-size:1.4rem; color:#059669;">20 / 20 Correct (100%)</h3>
              </div>
              <span class="badge-validated">Passed With Distinction</span>
            </div>

            <div class="quiz-qa-card correct">
              <div class="qa-question-text">1. Which protocol guarantees in-order, reliable delivery of packets across distributed services?</div>
              <div class="qa-answer-user">Your Answer: TCP (Transmission Control Protocol) ✓ Correct</div>
              <div class="qa-explanation">TCP establishes a three-way handshake and handles sequence retransmission and checksum validation.</div>
            </div>

            <div class="quiz-qa-card correct">
              <div class="qa-question-text">2. What is the average time complexity of searching in a balanced Binary Search Tree (AVL / Red-Black)?</div>
              <div class="qa-answer-user">Your Answer: O(log n) ✓ Correct</div>
              <div class="qa-explanation">Balanced height invariant maintains logarithmic lookup time across all tree operations.</div>
            </div>

            <div class="quiz-qa-card correct">
              <div class="qa-question-text">3. Which HTTP status code should be returned when a client sends valid credentials but lacks authorization for the requested resource?</div>
              <div class="qa-answer-user">Your Answer: 403 Forbidden ✓ Correct</div>
              <div class="qa-explanation">401 is unauthorized (unauthenticated), whereas 403 signifies the server recognized identity but refuses permission.</div>
            </div>
          </div>
        `;
        break;

      case 'score-details':
        cat = 'ACADEMIC ANALYTICS';
        title = 'Academic Performance & Score Breakdown';
        sub = 'Cumulative GPA: 92.74% (Validated Honors Standing)';
        primaryBtnText = 'Download Transcript';
        secondaryBtnText = 'Close';
        bodyHtml = `
          <div>
            <div class="analytics-stats-grid">
              <div class="stat-metric-card">
                <div class="stat-metric-value">92.74%</div>
                <div class="stat-metric-label">Cumulative GPA</div>
              </div>
              <div class="stat-metric-card">
                <div class="stat-metric-value" style="color:#059669;">98.4%</div>
                <div class="stat-metric-label">Projects Average</div>
              </div>
              <div class="stat-metric-card">
                <div class="stat-metric-value" style="color:#2563eb;">97.5%</div>
                <div class="stat-metric-label">Quizzes Average</div>
              </div>
              <div class="stat-metric-card">
                <div class="stat-metric-value" style="color:#d97706;">100%</div>
                <div class="stat-metric-label">Attendance & Standups</div>
              </div>
            </div>

            <h4 style="margin:1.25rem 0 0.5rem; font-size:0.95rem; color:#0f172a;">Sprint Progress Distribution</h4>
            <div style="display:flex; flex-direction:column; gap:0.6rem;">
              <div>
                <div style="display:flex; justify-content:space-between; font-size:0.85rem; margin-bottom:3px;">
                  <span>Sprints 1-4: Low-Level Programming & Algorithms</span>
                  <strong>94.2%</strong>
                </div>
                <div style="height:8px; background:#e2e8f0; border-radius:999px; overflow:hidden;">
                  <div style="width:94.2%; height:100%; background:#e11d48; border-radius:999px;"></div>
                </div>
              </div>
              <div>
                <div style="display:flex; justify-content:space-between; font-size:0.85rem; margin-bottom:3px;">
                  <span>Sprints 5-8: Higher-Level Web & Database Architecture</span>
                  <strong>96.8%</strong>
                </div>
                <div style="height:8px; background:#e2e8f0; border-radius:999px; overflow:hidden;">
                  <div style="width:96.8%; height:100%; background:#e11d48; border-radius:999px;"></div>
                </div>
              </div>
              <div>
                <div style="display:flex; justify-content:space-between; font-size:0.85rem; margin-bottom:3px;">
                  <span>Sprints 9-12: DevOps, Distributed Systems & Portfolio</span>
                  <strong>98.5%</strong>
                </div>
                <div style="height:8px; background:#e2e8f0; border-radius:999px; overflow:hidden;">
                  <div style="width:98.5%; height:100%; background:#10b981; border-radius:999px;"></div>
                </div>
              </div>
            </div>
          </div>
        `;
        break;

      case 'all-events':
        cat = 'COMMUNITY & WORKSHOPS';
        title = 'Upcoming Events & Calendar';
        sub = 'Live masterclasses, peer hackathons, and mentor office hours';
        primaryBtnText = 'Sync to Google Calendar';
        secondaryBtnText = 'Close';
        bodyHtml = `
          <div class="events-schedule-list">
            <div class="event-schedule-card">
              <div class="event-date-badge">
                <div style="font-size:1.1rem; line-height:1;">30</div>
                <div style="font-size:0.75rem;">JUL</div>
              </div>
              <div style="flex:1;">
                <h4 style="margin:0 0 0.2rem; font-size:0.95rem; color:#0f172a;">Systems Architecture Office Hours</h4>
                <p style="margin:0; font-size:0.84rem; color:#64748b;">Live Q&A with Lead Cloud Engineers • 10:00 AM - 11:30 AM EAT</p>
              </div>
              <span class="badge-validated" style="padding:4px 10px; font-size:0.78rem;">RSVP'd ✓</span>
            </div>

            <div class="event-schedule-card">
              <div class="event-date-badge">
                <div style="font-size:1.1rem; line-height:1;">01</div>
                <div style="font-size:0.75rem;">AUG</div>
              </div>
              <div style="flex:1;">
                <h4 style="margin:0 0 0.2rem; font-size:0.95rem; color:#0f172a;">Cohort 2025 Capstone Demo Day</h4>
                <p style="margin:0; font-size:0.84rem; color:#64748b;">Showcase your project live to global tech hiring partners • 2:00 PM EAT</p>
              </div>
              <button type="button" class="btn-outline-red" style="font-size:0.8rem; padding:4px 10px;" onclick="this.textContent = 'Registered ✓'; this.disabled = true;">Register</button>
            </div>

            <div class="event-schedule-card">
              <div class="event-date-badge">
                <div style="font-size:1.1rem; line-height:1;">05</div>
                <div style="font-size:0.75rem;">AUG</div>
              </div>
              <div style="flex:1;">
                <h4 style="margin:0 0 0.2rem; font-size:0.95rem; color:#0f172a;">ALX Virtual Graduation Ceremony</h4>
                <p style="margin:0; font-size:0.84rem; color:#64748b;">Celebration and graduation keynotes for Software Engineering fellows</p>
              </div>
              <button type="button" class="btn-resume-red" style="font-size:0.8rem; padding:4px 10px;" onclick="this.textContent = 'Added ✓'; this.disabled = true;">Add to Cal</button>
            </div>
          </div>
        `;
        break;

      case 'preview-syllabus':
        cat = 'CURRICULUM PREVIEW';
        title = 'Upcoming Sprint: Systems Engineering & DevOps Orchestration';
        sub = 'Sprint Roadmaps, Lab Architecture, and Learning Objectives';
        primaryBtnText = 'Enroll Early';
        secondaryBtnText = 'Close';
        bodyHtml = `
          <div>
            <p style="font-size:0.92rem; color:#475569; margin-top:0;">
              In this upcoming sprint, fellows advance into production infrastructure automation, zero-downtime microservice orchestration, and telemetry.
            </p>
            <div style="display:flex; flex-direction:column; gap:0.75rem; margin-top:1rem;">
              <div style="background:#ffffff; border:1px solid #e2e8f0; border-radius:8px; padding:0.85rem 1rem;">
                <strong style="color:#0f172a;">Module 01: Docker Containerization & Multi-Stage Builds</strong>
                <p style="margin:0.2rem 0 0; font-size:0.84rem; color:#64748b;">Alpine runtime images, layer caching, and rootless security.</p>
              </div>
              <div style="background:#ffffff; border:1px solid #e2e8f0; border-radius:8px; padding:0.85rem 1rem;">
                <strong style="color:#0f172a;">Module 02: Kubernetes Ingress, Services & ReplicaSets</strong>
                <p style="margin:0.2rem 0 0; font-size:0.84rem; color:#64748b;">Declarative YAML manifests, rolling updates, and readiness probes.</p>
              </div>
              <div style="background:#ffffff; border:1px solid #e2e8f0; border-radius:8px; padding:0.85rem 1rem;">
                <strong style="color:#0f172a;">Module 03: Prometheus Telemetry & Grafana Dashboards</strong>
                <p style="margin:0.2rem 0 0; font-size:0.84rem; color:#64748b;">Real-time service health, alerting rules, and latency distributions.</p>
              </div>
            </div>
          </div>
        `;
        break;

      case 'read-concept':
        const conceptTitle = contextData.concept || 'Data Structures & Pointer Arithmetic in C';
        cat = 'TECHNICAL REFERENCE';
        title = `Concept: ${conceptTitle}`;
        sub = 'Official ALX Technical Library & Code Walkthrough';
        primaryBtnText = 'Mark as Completed';
        secondaryBtnText = 'Close';
        bodyHtml = `
          <div>
            <div style="background:#ecfdf5; border:1px solid #a7f3d0; border-radius:8px; padding:0.8rem 1rem; margin-bottom:1rem; font-size:0.85rem; color:#065f46;">
              📚 <strong>Core Requirement:</strong> Thorough understanding of pointer offsets and memory bounds checking.
            </div>
            <p style="font-size:0.92rem; color:#334155; line-height:1.6;">
              When allocating dynamic memory with <code>malloc()</code> or <code>calloc()</code>, each pointer references a discrete block of heap space. It is essential to check for <code>NULL</code> returns and ensure every allocated chunk is paired with <code>free()</code> to guarantee 0 memory leaks in Valgrind.
            </p>
            <div class="code-diff-preview-box">
              <span style="color:#64748b;">/* Dynamic node allocation example */</span><br>
              <span style="color:#f43f5e;">list_t</span> *new_node = malloc(<span style="color:#38bdf8;">sizeof</span>(list_t));<br>
              <span style="color:#38bdf8;">if</span> (!new_node) {<br>
              &nbsp;&nbsp;perror(<span style="color:#fbbf24;">"malloc failed"</span>);<br>
              &nbsp;&nbsp;<span style="color:#38bdf8;">return</span> (NULL);<br>
              }<br>
              new_node->data = value;<br>
              new_node->next = head;
            </div>
          </div>
        `;
        break;

      case 'watch-recording':
        const recTitle = contextData.recording || 'Portfolio Defense Workshop with Lead Mentors';
        cat = 'VIDEO ON DEMAND';
        title = `Recording: ${recTitle}`;
        sub = 'Recorded Masterclass • HD Video & Accompanying Slides';
        primaryBtnText = 'Download Slides (PDF)';
        secondaryBtnText = 'Close';
        bodyHtml = `
          <div>
            <div class="defense-video-stage" style="min-height:280px; position:relative;">
              <span style="font-size:3.5rem; color:#ffffff; cursor:pointer;" onclick="if(window.voiceNav) window.voiceNav.speak('Playing workshop recording stream.'); this.style.opacity = '0.7';">▶</span>
              <div style="position:absolute; bottom:12px; left:16px; right:16px; display:flex; justify-content:space-between; color:#ffffff; font-size:0.85rem;">
                <span>00:00 / 54:20</span>
                <span>HD 1080p</span>
              </div>
            </div>
            <div style="margin-top:1rem; padding:0.9rem; background:#ffffff; border:1px solid #e2e8f0; border-radius:10px;">
              <strong style="color:#0f172a;">Session Agenda:</strong>
              <ul style="margin:0.5rem 0 0; padding-left:1.25rem; font-size:0.88rem; color:#475569; line-height:1.6;">
                <li>00:00 - Introduction & Rubric Walkthrough</li>
                <li>15:30 - Live Architecture Diagramming</li>
                <li>32:45 - Live Voice Navigation Integration Demo</li>
                <li>48:00 - Audience Q&A and Grading Insights</li>
              </ul>
            </div>
          </div>
        `;
        break;

      case 'milestone':
        cat = 'DELIVERABLE AUDIT';
        title = 'Week 12 Capstone Milestone';
        sub = 'Submission status: 100% Completed & Validated';
        primaryBtnText = 'Export Audit Report';
        secondaryBtnText = 'Close';
        bodyHtml = `
          <div>
            <div class="inspect-checker-banner">
              <div>
                <span style="font-size:0.85rem; color:#065f46; font-weight:700;">MILESTONE COMPLETION</span>
                <div class="checker-score-badge">All 8 Tasks Delivered (100%)</div>
              </div>
              <span class="badge-validated">Audit Passed</span>
            </div>
            <p style="font-size:0.92rem; color:#475569; margin:1rem 0;">
              Your repository submission has met all criteria for full-stack deployment, CI/CD automated test suites, responsive UI, voice navigation, and Braille tactile export.
            </p>
          </div>
        `;
        break;

      case 'test':
        cat = 'EXAMINATION RESULTS';
        title = 'Week 12 Comprehensive Test Results';
        sub = 'Score: 100% • All Questions Answered';
        primaryBtnText = 'Print Score Card';
        secondaryBtnText = 'Close';
        bodyHtml = `
          <div style="text-align:center; padding:1.5rem 0;">
            <div style="font-size:3.5rem; margin-bottom:0.5rem;">🎉</div>
            <h3 style="margin:0 0 0.5rem; font-size:1.5rem; color:#0f172a;">Perfect Score: 20 / 20</h3>
            <p style="color:#64748b; max-width:480px; margin:0 auto 1.25rem; font-size:0.92rem;">
              You have successfully completed the final comprehensive technical examination for the Software Engineering cohort.
            </p>
          </div>
        `;
        break;

      case 'save-preferences':
        cat = 'SETTINGS UPDATED';
        title = 'Learner Preferences Saved';
        sub = 'All profile, accessibility, and notification settings synced';
        primaryBtnText = 'Done';
        secondaryBtnText = 'Close';
        bodyHtml = `
          <div style="text-align:center; padding:1.5rem 0;">
            <div style="font-size:3rem; margin-bottom:0.5rem;">✅</div>
            <h3 style="margin:0 0 0.5rem; font-size:1.3rem; color:#0f172a;">Preferences Successfully Saved</h3>
            <p style="color:#64748b; font-size:0.92rem;">
              Voice assistant settings, theme, and profile credentials are now permanently updated.
            </p>
          </div>
        `;
        break;

      case 'social-google':
      case 'social-linkedin':
      case 'social-facebook':
        const prov = type === 'social-google' ? 'Google' : type === 'social-linkedin' ? 'LinkedIn' : 'Facebook';
        cat = 'OAUTH SSO AUTHENTICATION';
        title = `Sign in with ${prov}`;
        sub = `Simulated single sign-on redirect for ${prov} accounts`;
        primaryBtnText = `Continue as Abenezer (${prov})`;
        secondaryBtnText = 'Cancel';
        bodyHtml = `
          <div style="text-align:center; padding:1.25rem 0;">
            <div style="font-size:2.8rem; margin-bottom:0.75rem;">🔐</div>
            <h3 style="margin:0 0 0.5rem; font-size:1.25rem; color:#0f172a;">Authenticate with ${prov}</h3>
            <p style="font-size:0.9rem; color:#64748b; max-width:440px; margin:0 auto 1.25rem;">
              ALX Learning is requesting access to verify your name, email (<strong>abenezer@alx.app</strong>), and profile credentials.
            </p>
          </div>
        `;
        break;

      case 'forgot-password':
        cat = 'ACCOUNT SECURITY';
        title = 'Reset Your Password';
        sub = 'Enter your registered email address to receive password reset link';
        primaryBtnText = 'Send Reset Instructions';
        secondaryBtnText = 'Cancel';
        bodyHtml = `
          <div>
            <p style="font-size:0.92rem; color:#475569; margin-top:0;">
              We will send a secure one-time password reset link to your email address.
            </p>
            <div style="margin:1rem 0;">
              <label style="display:block; font-size:0.85rem; font-weight:700; color:#334155; margin-bottom:0.4rem;">Registered Email</label>
              <input type="email" class="form-input" style="width:100%;" value="abenezer@alx.app" placeholder="Enter your email">
            </div>
          </div>
        `;
        break;


      case 'contact':
        cat = 'HELP & SUPPORT';
        title = 'ALX Student Support Desk';
        sub = 'Live assistance from technical community managers';
        primaryBtnText = 'Send Message';
        secondaryBtnText = 'Close';
        bodyHtml = `
          <div>
            <p style="font-size:0.92rem; color:#475569; margin-top:0;">
              Need help with your account or course access? Submit a message and our support team will reply within 30 minutes.
            </p>
            <div style="margin:1rem 0;">
              <label style="display:block; font-size:0.85rem; font-weight:700; color:#334155; margin-bottom:0.4rem;">How can we help?</label>
              <textarea class="form-input" style="width:100%; height:80px; resize:none;" placeholder="Describe your question or issue..."></textarea>
            </div>
          </div>
        `;
        break;

      case 'voice-commands':
        cat = 'ACCESSIBILITY & VOICE AI GUIDE';
        title = 'ALX AI Voice Assistant · Interactive Command Guide';
        sub = 'Speak any command below or click a card to trigger it instantly. Built for blind & deaf learners.';
        primaryBtnText = '🎙️ Read Commands Aloud';
        secondaryBtnText = 'Close (Esc)';
        bodyHtml = `
          <div class="voice-guide-container">
            <div class="voice-guide-search-row">
              <input type="text" id="voiceGuideSearchInput" class="voice-guide-search-input" placeholder="🔍 Search commands (e.g. video, home, mute, cert, አማርኛ)..." aria-label="Search voice commands">
            </div>
            <div class="voice-filter-tabs" id="voiceFilterTabs" role="tablist">
              <button type="button" class="voice-filter-tab active" data-filter="all">All Commands (24)</button>
              <button type="button" class="voice-filter-tab" data-filter="auth">🔐 Landing &amp; Login</button>
              <button type="button" class="voice-filter-tab" data-filter="nav">🧭 Navigation</button>
              <button type="button" class="voice-filter-tab" data-filter="media">🎬 Media Player</button>
              <button type="button" class="voice-filter-tab" data-filter="academic">⚡ Academics &amp; Sprints</button>
              <button type="button" class="voice-filter-tab" data-filter="lang">🌐 Languages</button>
            </div>

            <!-- 1. LANDING & LOGIN -->
            <div class="voice-guide-section" data-cat="auth">
              <div class="voice-guide-section-title"><span>🔐</span> Landing Page &amp; Authentication</div>
              <div class="voice-guide-grid">
                <div class="voice-cmd-card" data-cmd-tag="log in sign in gba seeni enter">
                  <div class="voice-cmd-top">
                    <div class="voice-phrases-group">
                      <span class="voice-phrase-en">"Log in" / "Sign in"</span>
                      <span class="voice-cmd-am">"ግባ" / "Seeni" / "እቶ"</span>
                    </div>
                    <button type="button" class="btn-run-cmd" data-voice-cmd="log in">Run ▶</button>
                  </div>
                  <p class="voice-cmd-desc">Hands-free voice authentication for blind users. Immediately logs into the dashboard.</p>
                  <div class="voice-cmd-footer"><span class="voice-cmd-kbd">Enter</span><span style="font-size:0.75rem; color:#059669; font-weight:700;">Voice Auth</span></div>
                </div>

                <div class="voice-cmd-card" data-cmd-tag="google log in with google sso">
                  <div class="voice-cmd-top">
                    <div class="voice-phrases-group">
                      <span class="voice-phrase-en">"Log in with Google"</span>
                      <span class="voice-cmd-am">"በጉግል ግባ"</span>
                    </div>
                    <button type="button" class="btn-run-cmd" data-voice-cmd="log in with google">Run ▶</button>
                  </div>
                  <p class="voice-cmd-desc">Single sign-on authentication using your Google OAuth identity.</p>
                  <div class="voice-cmd-footer"><span class="voice-cmd-kbd">SSO</span><span style="font-size:0.75rem; color:#64748b;">Instant redirect</span></div>
                </div>

                <div class="voice-cmd-card" data-cmd-tag="linkedin log in with linkedin sso">
                  <div class="voice-cmd-top">
                    <div class="voice-phrases-group">
                      <span class="voice-phrase-en">"Log in with LinkedIn"</span>
                      <span class="voice-cmd-am">"በሊንክድኢን ግባ"</span>
                    </div>
                    <button type="button" class="btn-run-cmd" data-voice-cmd="log in with linkedin">Run ▶</button>
                  </div>
                  <p class="voice-cmd-desc">Single sign-on authentication using your LinkedIn Professional profile.</p>
                  <div class="voice-cmd-footer"><span class="voice-cmd-kbd">SSO</span><span style="font-size:0.75rem; color:#64748b;">Instant redirect</span></div>
                </div>

                <div class="voice-cmd-card" data-cmd-tag="facebook log in with facebook sso">
                  <div class="voice-cmd-top">
                    <div class="voice-phrases-group">
                      <span class="voice-phrase-en">"Log in with Facebook"</span>
                      <span class="voice-cmd-am">"በፌስቡክ ግባ"</span>
                    </div>
                    <button type="button" class="btn-run-cmd" data-voice-cmd="log in with facebook">Run ▶</button>
                  </div>
                  <p class="voice-cmd-desc">Single sign-on authentication using Meta / Facebook identity.</p>
                  <div class="voice-cmd-footer"><span class="voice-cmd-kbd">SSO</span><span style="font-size:0.75rem; color:#64748b;">Instant redirect</span></div>
                </div>

                <div class="voice-cmd-card" data-cmd-tag="show password hide password toggle">
                  <div class="voice-cmd-top">
                    <div class="voice-phrases-group">
                      <span class="voice-phrase-en">"Show password" / "Hide password"</span>
                      <span class="voice-cmd-am">"የይለፍ ቃል አሳይ" / "ደብቅ"</span>
                    </div>
                    <button type="button" class="btn-run-cmd" data-voice-cmd="toggle password">Run ▶</button>
                  </div>
                  <p class="voice-cmd-desc">Toggles masked password characters into readable plain text.</p>
                  <div class="voice-cmd-footer"><span class="voice-cmd-kbd">Visibility</span><span style="font-size:0.75rem; color:#64748b;">Input toggle</span></div>
                </div>

                <div class="voice-cmd-card" data-cmd-tag="help commands irdata gargaarsa">
                  <div class="voice-cmd-top">
                    <div class="voice-phrases-group">
                      <span class="voice-phrase-en">"Help" / "Commands"</span>
                      <span class="voice-cmd-am">"እርዳታ" / "Gargaarsa" / "ሓገዝ"</span>
                    </div>
                    <button type="button" class="btn-run-cmd" data-voice-cmd="help">Run ▶</button>
                  </div>
                  <p class="voice-cmd-desc">Recites every available voice command one by one out loud.</p>
                  <div class="voice-cmd-footer"><span class="voice-cmd-kbd">H / ?</span><span style="font-size:0.75rem; color:#2563eb; font-weight:700;">Audio Recitation</span></div>
                </div>
              </div>
            </div>

            <!-- 2. DASHBOARD NAVIGATION -->
            <div class="voice-guide-section" data-cat="nav">
              <div class="voice-guide-section-title"><span>🧭</span> Dashboard &amp; View Navigation</div>
              <div class="voice-guide-grid">
                <div class="voice-cmd-card" data-cmd-tag="home menesha go to home">
                  <div class="voice-cmd-top">
                    <div class="voice-phrases-group">
                      <span class="voice-phrase-en">"Home" / "Go to home"</span>
                      <span class="voice-cmd-am">"መነሻ" / "ወደ መነሻ"</span>
                    </div>
                    <button type="button" class="btn-run-cmd" data-voice-cmd="go to home">Run ▶</button>
                  </div>
                  <p class="voice-cmd-desc">Returns to the primary learner dashboard and cohort announcements.</p>
                  <div class="voice-cmd-footer"><span class="voice-cmd-kbd">#home</span><span style="font-size:0.75rem; color:#64748b;">Main hub</span></div>
                </div>

                <div class="voice-cmd-card" data-cmd-tag="learning access learning timihirt sprint curriculum">
                  <div class="voice-cmd-top">
                    <div class="voice-phrases-group">
                      <span class="voice-phrase-en">"Access Learning" / "Learning"</span>
                      <span class="voice-cmd-am">"ትምህርት" / "ትምህርቴን ጀምር"</span>
                    </div>
                    <button type="button" class="btn-run-cmd" data-voice-cmd="access my learning">Run ▶</button>
                  </div>
                  <p class="voice-cmd-desc">Opens the 12-week curriculum syllabus and active sprint modules.</p>
                  <div class="voice-cmd-footer"><span class="voice-cmd-kbd">#learning</span><span style="font-size:0.75rem; color:#64748b;">Curriculum</span></div>
                </div>

                <div class="voice-cmd-card" data-cmd-tag="planning schedule calendar ekid">
                  <div class="voice-cmd-top">
                    <div class="voice-phrases-group">
                      <span class="voice-phrase-en">"Planning" / "Schedule"</span>
                      <span class="voice-cmd-am">"እቅድ" / "የእቅድ ገጽ"</span>
                    </div>
                    <button type="button" class="btn-run-cmd" data-voice-cmd="go to planning">Run ▶</button>
                  </div>
                  <p class="voice-cmd-desc">Inspects weekly study schedules, deadlines, and peer reviews.</p>
                  <div class="voice-cmd-footer"><span class="voice-cmd-kbd">#planning</span><span style="font-size:0.75rem; color:#64748b;">Timeline</span></div>
                </div>

                <div class="voice-cmd-card" data-cmd-tag="projects software projects projectoch">
                  <div class="voice-cmd-top">
                    <div class="voice-phrases-group">
                      <span class="voice-phrase-en">"Projects" / "My projects"</span>
                      <span class="voice-cmd-am">"ፕሮጀክቶች" / "የእኔ ፕሮጀክት"</span>
                    </div>
                    <button type="button" class="btn-run-cmd" data-voice-cmd="go to projects">Run ▶</button>
                  </div>
                  <p class="voice-cmd-desc">Displays engineering deliverables: Simple Shell, AirBnB, and Portfolio.</p>
                  <div class="voice-cmd-footer"><span class="voice-cmd-kbd">#projects</span><span style="font-size:0.75rem; color:#64748b;">Repositories</span></div>
                </div>

                <div class="voice-cmd-card" data-cmd-tag="quizzes tests fetena">
                  <div class="voice-cmd-top">
                    <div class="voice-phrases-group">
                      <span class="voice-phrase-en">"Quizzes" / "Tests"</span>
                      <span class="voice-cmd-am">"ፈተናዎች" / "ጥያቄዎች"</span>
                    </div>
                    <button type="button" class="btn-run-cmd" data-voice-cmd="go to quizzes">Run ▶</button>
                  </div>
                  <p class="voice-cmd-desc">Reviews technical assessment scores and evaluation answers.</p>
                  <div class="voice-cmd-footer"><span class="voice-cmd-kbd">#quizzes</span><span style="font-size:0.75rem; color:#64748b;">Assessments</span></div>
                </div>

                <div class="voice-cmd-card" data-cmd-tag="profile account megelecha settings">
                  <div class="voice-cmd-top">
                    <div class="voice-phrases-group">
                      <span class="voice-phrase-en">"Profile" / "My Profile"</span>
                      <span class="voice-cmd-am">"መገለጫ" / "የእኔ መገለጫ"</span>
                    </div>
                    <button type="button" class="btn-run-cmd" data-voice-cmd="go to profile">Run ▶</button>
                  </div>
                  <p class="voice-cmd-desc">Opens student profile, credentials, and accessibility preferences.</p>
                  <div class="voice-cmd-footer"><span class="voice-cmd-kbd">#profile</span><span style="font-size:0.75rem; color:#64748b;">Settings</span></div>
                </div>

                <div class="voice-cmd-card" data-cmd-tag="sign out log out wuta exit">
                  <div class="voice-cmd-top">
                    <div class="voice-phrases-group">
                      <span class="voice-phrase-en">"Sign out" / "Log out"</span>
                      <span class="voice-cmd-am">"ውጣ" / "ተሰናበት"</span>
                    </div>
                    <button type="button" class="btn-run-cmd" data-voice-cmd="sign out">Run ▶</button>
                  </div>
                  <p class="voice-cmd-desc">Securely signs out of the platform and returns to the landing page.</p>
                  <div class="voice-cmd-footer"><span class="voice-cmd-kbd">Logout</span><span style="font-size:0.75rem; color:#ef4444; font-weight:700;">Exit</span></div>
                </div>
              </div>
            </div>

            <!-- 3. ACCESSIBLE VIDEO PLAYER -->
            <div class="voice-guide-section" data-cat="media">
              <div class="voice-guide-section-title"><span>🎬</span> Accessible Video Player &amp; Media Controls</div>
              <div class="voice-guide-grid">
                <div class="voice-cmd-card" data-cmd-tag="play video pause video achawit akum space k">
                  <div class="voice-cmd-top">
                    <div class="voice-phrases-group">
                      <span class="voice-phrase-en">"Play video" / "Pause video"</span>
                      <span class="voice-cmd-am">"ቪዲዮ አጫውት" / "አቁም"</span>
                    </div>
                    <button type="button" class="btn-run-cmd" data-voice-cmd="play video">Run ▶</button>
                  </div>
                  <p class="voice-cmd-desc">Toggles video playback for sprint lessons and recorded workshops.</p>
                  <div class="voice-cmd-footer"><span class="voice-cmd-kbd">Space / K</span><span style="font-size:0.75rem; color:#64748b;">Playback</span></div>
                </div>

                <div class="voice-cmd-card" data-cmd-tag="volume up volume down dimts chemir qens">
                  <div class="voice-cmd-top">
                    <div class="voice-phrases-group">
                      <span class="voice-phrase-en">"Volume up" / "Volume down"</span>
                      <span class="voice-cmd-am">"ድምፅ ጨምር" / "ቀንስ"</span>
                    </div>
                    <button type="button" class="btn-run-cmd" data-voice-cmd="volume up">Run ▶</button>
                  </div>
                  <p class="voice-cmd-desc">Adjusts playback audio levels up or down by 15% intervals.</p>
                  <div class="voice-cmd-footer"><span class="voice-cmd-kbd">↑ / ↓</span><span style="font-size:0.75rem; color:#64748b;">Audio level</span></div>
                </div>

                <div class="voice-cmd-card" data-cmd-tag="mute unmute dimts atfa kfet m">
                  <div class="voice-cmd-top">
                    <div class="voice-phrases-group">
                      <span class="voice-phrase-en">"Mute" / "Unmute"</span>
                      <span class="voice-cmd-am">"ድምፅ አጥፋ" / "ክፈት"</span>
                    </div>
                    <button type="button" class="btn-run-cmd" data-voice-cmd="mute">Run ▶</button>
                  </div>
                  <p class="voice-cmd-desc">Mutes or restores the lesson video audio instantly.</p>
                  <div class="voice-cmd-footer"><span class="voice-cmd-kbd">M</span><span style="font-size:0.75rem; color:#64748b;">Mute toggle</span></div>
                </div>

                <div class="voice-cmd-card" data-cmd-tag="forward rewind 10 seconds wedefit wedehwala skip seek l j">
                  <div class="voice-cmd-top">
                    <div class="voice-phrases-group">
                      <span class="voice-phrase-en">"Forward 10" / "Rewind 10"</span>
                      <span class="voice-cmd-am">"ወደ ፊት 10 ሰከንድ" / "ወደ ኋላ"</span>
                    </div>
                    <button type="button" class="btn-run-cmd" data-voice-cmd="forward 10 seconds">Run ▶</button>
                  </div>
                  <p class="voice-cmd-desc">Skips forward or backward by 10 seconds with automatic subtitle sync.</p>
                  <div class="voice-cmd-footer"><span class="voice-cmd-kbd">L / J or → / ←</span><span style="font-size:0.75rem; color:#64748b;">Seek</span></div>
                </div>

                <div class="voice-cmd-card" data-cmd-tag="sign language interpreter melkt qwanqwa pip s">
                  <div class="voice-cmd-top">
                    <div class="voice-phrases-group">
                      <span class="voice-phrase-en">"Sign language"</span>
                      <span class="voice-cmd-am">"የምልክት ቋንቋ"</span>
                    </div>
                    <button type="button" class="btn-run-cmd" data-voice-cmd="sign language">Run ▶</button>
                  </div>
                  <p class="voice-cmd-desc">Expands into theater full screen with synchronized sign language interpreter PIP video.</p>
                  <div class="voice-cmd-footer"><span class="voice-cmd-kbd">S</span><span style="font-size:0.75rem; color:#2563eb; font-weight:700;">Deaf Access</span></div>
                </div>

                <div class="voice-cmd-card" data-cmd-tag="subtitles captions neus riis c">
                  <div class="voice-cmd-top">
                    <div class="voice-phrases-group">
                      <span class="voice-phrase-en">"Subtitles on" / "Subtitles off"</span>
                      <span class="voice-cmd-am">"ንዑስ ርዕስ አብራ" / "አጥፋ"</span>
                    </div>
                    <button type="button" class="btn-run-cmd" data-voice-cmd="subtitles on">Run ▶</button>
                  </div>
                  <p class="voice-cmd-desc">Toggles live closed captions and synchronized subtitle transcripts.</p>
                  <div class="voice-cmd-footer"><span class="voice-cmd-kbd">C</span><span style="font-size:0.75rem; color:#64748b;">Captions</span></div>
                </div>

                <div class="voice-cmd-card" data-cmd-tag="full screen fullscreen mulu skrin f">
                  <div class="voice-cmd-top">
                    <div class="voice-phrases-group">
                      <span class="voice-phrase-en">"Full screen" / "Exit full screen"</span>
                      <span class="voice-cmd-am">"ሙሉ ስክሪን" / "ውጣ"</span>
                    </div>
                    <button type="button" class="btn-run-cmd" data-voice-cmd="full screen">Run ▶</button>
                  </div>
                  <p class="voice-cmd-desc">Enters or exits distraction-free theater full screen mode.</p>
                  <div class="voice-cmd-footer"><span class="voice-cmd-kbd">F / Esc</span><span style="font-size:0.75rem; color:#64748b;">Theater mode</span></div>
                </div>
              </div>
            </div>

            <!-- 4. ACADEMICS & DELIVERABLES -->
            <div class="voice-guide-section" data-cat="academic">
              <div class="voice-guide-section-title"><span>⚡</span> Academic Actions &amp; Sprint Deliverables</div>
              <div class="voice-guide-grid">
                <div class="voice-cmd-card" data-cmd-tag="what do i have today zare men alegn schedule">
                  <div class="voice-cmd-top">
                    <div class="voice-phrases-group">
                      <span class="voice-phrase-en">"What do I have today?"</span>
                      <span class="voice-cmd-am">"ዛሬ ምን አለኝ?"</span>
                    </div>
                    <button type="button" class="btn-run-cmd" data-voice-cmd="what do i have today">Run ▶</button>
                  </div>
                  <p class="voice-cmd-desc">Speaks aloud current sprint progress and remaining deliverables for today.</p>
                  <div class="voice-cmd-footer"><span class="voice-cmd-kbd">Daily Brief</span><span style="font-size:0.75rem; color:#2563eb; font-weight:700;">Hands-free</span></div>
                </div>

                <div class="voice-cmd-card" data-cmd-tag="continue sprint resume sprint qetil">
                  <div class="voice-cmd-top">
                    <div class="voice-phrases-group">
                      <span class="voice-phrase-en">"Continue sprint" / "Resume"</span>
                      <span class="voice-cmd-am">"ስፕሪንት ቀጥል" / "ትምህርት ቀጥል"</span>
                    </div>
                    <button type="button" class="btn-run-cmd" data-voice-cmd="continue sprint">Run ▶</button>
                  </div>
                  <p class="voice-cmd-desc">Jumps directly into Module 8 Capstone Requirements &amp; syllabus video.</p>
                  <div class="voice-cmd-footer"><span class="voice-cmd-kbd">Module 8</span><span style="font-size:0.75rem; color:#64748b;">Direct Jump</span></div>
                </div>

                <div class="voice-cmd-card" data-cmd-tag="complete module mark complete chers">
                  <div class="voice-cmd-top">
                    <div class="voice-phrases-group">
                      <span class="voice-phrase-en">"Complete module"</span>
                      <span class="voice-cmd-am">"ሞጁል ጨርስ" / "አጠናቅቅ"</span>
                    </div>
                    <button type="button" class="btn-run-cmd" data-voice-cmd="complete module">Run ▶</button>
                  </div>
                  <p class="voice-cmd-desc">Validates final module checks and updates sprint progress to 100%.</p>
                  <div class="voice-cmd-footer"><span class="voice-cmd-kbd">100%</span><span style="font-size:0.75rem; color:#059669; font-weight:700;">Validated</span></div>
                </div>

                <div class="voice-cmd-card" data-cmd-tag="certificate view certificate sertifiket honors">
                  <div class="voice-cmd-top">
                    <div class="voice-phrases-group">
                      <span class="voice-phrase-en">"Certificate" / "View certificate"</span>
                      <span class="voice-cmd-am">"የምስክር ወረቀት" / "ሰርተፊኬት"</span>
                    </div>
                    <button type="button" class="btn-run-cmd" data-voice-cmd="view certificate">Run ▶</button>
                  </div>
                  <p class="voice-cmd-desc">Opens verified ALX Certificate of Completion (Honors Standing, 92.74%).</p>
                  <div class="voice-cmd-footer"><span class="voice-cmd-kbd">Honors</span><span style="font-size:0.75rem; color:#d97706; font-weight:700;">Diploma</span></div>
                </div>

                <div class="voice-cmd-card" data-cmd-tag="braille braille transcript print bireyl tactile">
                  <div class="voice-cmd-top">
                    <div class="voice-phrases-group">
                      <span class="voice-phrase-en">"Braille transcript" / "Print Braille"</span>
                      <span class="voice-cmd-am">"ብሬይል" / "የብሬይል ጽሑፍ አትም"</span>
                    </div>
                    <button type="button" class="btn-run-cmd" data-voice-cmd="braille">Run ▶</button>
                  </div>
                  <p class="voice-cmd-desc">Opens tactile embosser reader, downloads .BRF, or sends to tactile printer.</p>
                  <div class="voice-cmd-footer"><span class="voice-cmd-kbd">Tactile</span><span style="font-size:0.75rem; color:#2563eb; font-weight:700;">Blind Access</span></div>
                </div>

                <div class="voice-cmd-card" data-cmd-tag="defense call join call difens">
                  <div class="voice-cmd-top">
                    <div class="voice-phrases-group">
                      <span class="voice-phrase-en">"Defense call" / "Join call"</span>
                      <span class="voice-cmd-am">"ዲፌንስ ጥሪ" / "ጥሪ ተቀላቀል"</span>
                    </div>
                    <button type="button" class="btn-run-cmd" data-voice-cmd="defense call">Run ▶</button>
                  </div>
                  <p class="voice-cmd-desc">Enters live video defense room with senior technical evaluation mentors.</p>
                  <div class="voice-cmd-footer"><span class="voice-cmd-kbd">Live</span><span style="font-size:0.75rem; color:#ef4444; font-weight:700;">Evaluation</span></div>
                </div>

                <div class="voice-cmd-card" data-cmd-tag="score details check score wutet">
                  <div class="voice-cmd-top">
                    <div class="voice-phrases-group">
                      <span class="voice-phrase-en">"Score details" / "My score"</span>
                      <span class="voice-cmd-am">"ውጤት ተመልከት" / "ውጤቴ ስንት ነው"</span>
                    </div>
                    <button type="button" class="btn-run-cmd" data-voice-cmd="see score details">Run ▶</button>
                  </div>
                  <p class="voice-cmd-desc">Displays comprehensive grade report: 98.4% Projects, 97.5% Quizzes, 92.74% GPA.</p>
                  <div class="voice-cmd-footer"><span class="voice-cmd-kbd">92.74%</span><span style="font-size:0.75rem; color:#059669; font-weight:700;">GPA</span></div>
                </div>
              </div>
            </div>

            <!-- 5. MULTI-LINGUAL VOICE AI -->
            <div class="voice-guide-section" data-cat="lang">
              <div class="voice-guide-section-title"><span>🌐</span> Multi-Language Ethiopian Voice AI</div>
              <div class="voice-guide-grid">
                <div class="voice-cmd-card" data-cmd-tag="amharic switch to amharic amarigna mekdes">
                  <div class="voice-cmd-top">
                    <div class="voice-phrases-group">
                      <span class="voice-phrase-en">"Switch to Amharic"</span>
                      <span class="voice-cmd-am">"አማርኛ" / "ወደ አማርኛ"</span>
                    </div>
                    <button type="button" class="btn-run-cmd" data-voice-cmd="amharic">Run ▶</button>
                  </div>
                  <p class="voice-cmd-desc">Switches full UI and activates native Ethiopian studio voice AI (am-ET-MekdesNeural).</p>
                  <div class="voice-cmd-footer"><span class="voice-cmd-kbd">am-ET</span><span style="font-size:0.75rem; color:#059669; font-weight:700;">Native Voice</span></div>
                </div>

                <div class="voice-cmd-card" data-cmd-tag="english switch to english jenny">
                  <div class="voice-cmd-top">
                    <div class="voice-phrases-group">
                      <span class="voice-phrase-en">"Switch to English"</span>
                      <span class="voice-cmd-am">"ወደ እንግሊዝኛ"</span>
                    </div>
                    <button type="button" class="btn-run-cmd" data-voice-cmd="english">Run ▶</button>
                  </div>
                  <p class="voice-cmd-desc">Switches interface to English with neural voice (en-US-JennyNeural).</p>
                  <div class="voice-cmd-footer"><span class="voice-cmd-kbd">en-US</span><span style="font-size:0.75rem; color:#64748b;">English</span></div>
                </div>

                <div class="voice-cmd-card" data-cmd-tag="oromiffa afaan oromoo switch to oromo">
                  <div class="voice-cmd-top">
                    <div class="voice-phrases-group">
                      <span class="voice-phrase-en">"Switch to Oromiffa"</span>
                      <span class="voice-cmd-am">"Afaan Oromoo"</span>
                    </div>
                    <button type="button" class="btn-run-cmd" data-voice-cmd="oromiffa">Run ▶</button>
                  </div>
                  <p class="voice-cmd-desc">Switches language to Afaan Oromoo across UI and assistant prompts.</p>
                  <div class="voice-cmd-footer"><span class="voice-cmd-kbd">om-ET</span><span style="font-size:0.75rem; color:#64748b;">Oromiffa</span></div>
                </div>

                <div class="voice-cmd-card" data-cmd-tag="tigrinya tigrigna switch to tigrinya">
                  <div class="voice-cmd-top">
                    <div class="voice-phrases-group">
                      <span class="voice-phrase-en">"Switch to Tigrinya"</span>
                      <span class="voice-cmd-am">"ትግርኛ"</span>
                    </div>
                    <button type="button" class="btn-run-cmd" data-voice-cmd="tigrinya">Run ▶</button>
                  </div>
                  <p class="voice-cmd-desc">Switches language to Tigrinya across all views and voice assistant responses.</p>
                  <div class="voice-cmd-footer"><span class="voice-cmd-kbd">ti-ET</span><span style="font-size:0.75rem; color:#64748b;">Tigrinya</span></div>
                </div>
              </div>
            </div>
          </div>
        `;
        break;

      default:
        const elemTitle = contextData.title || 'Platform Action';
        cat = 'INTERACTIVE PREVIEW';
        title = elemTitle;
        sub = 'Interactive mockup view for this platform action';
        primaryBtnText = 'Confirm';
        secondaryBtnText = 'Close';
        bodyHtml = `
          <div style="text-align:center; padding:1.5rem 0;">
            <div style="font-size:3rem; margin-bottom:0.75rem;">🚀</div>
            <h3 style="margin:0 0 0.5rem; font-size:1.3rem; color:#0f172a;">${elemTitle}</h3>
            <p style="font-size:0.92rem; color:#64748b; max-width:480px; margin:0 auto 1.25rem; line-height:1.6;">
              This interactive platform feature is fully wired into the ALX learning management system and accessible via hands-free voice commands.
            </p>
            <div style="background:#f1f5f9; border-radius:8px; padding:0.75rem; font-size:0.85rem; color:#475569; display:inline-block;">
              Status: <strong>Ready & Connected</strong> • Voice Trigger Active
            </div>
          </div>
        `;
        break;
    }

    mockupCategoryBadge.textContent = cat;
    universalModalTitle.textContent = title;
    universalModalSub.textContent = sub;
    universalModalBody.innerHTML = bodyHtml;
    btnUniversalModalPrimary.textContent = primaryBtnText;
    btnUniversalModalSecondary.textContent = secondaryBtnText;

    universalMockupModal.hidden = false;
    document.body.classList.add('mockup-modal-open');

    // Setup interactive handlers if Voice Commands Guide
    if (type === 'voice-commands') {
      const searchInput = document.getElementById('voiceGuideSearchInput');
      const filterTabs = document.querySelectorAll('.voice-filter-tab');
      const sections = document.querySelectorAll('.voice-guide-section');
      const cards = document.querySelectorAll('.voice-cmd-card');

      if (searchInput) {
        searchInput.addEventListener('input', (e) => {
          const q = e.target.value.toLowerCase().trim();
          cards.forEach(c => {
            const tag = (c.getAttribute('data-cmd-tag') || '').toLowerCase();
            const txt = c.textContent.toLowerCase();
            if (!q || tag.includes(q) || txt.includes(q)) {
              c.style.display = 'flex';
            } else {
              c.style.display = 'none';
            }
          });
        });
      }

      filterTabs.forEach(tab => {
        tab.addEventListener('click', () => {
          filterTabs.forEach(t => t.classList.remove('active'));
          tab.classList.add('active');
          const filter = tab.getAttribute('data-filter');
          sections.forEach(sec => {
            const cat = sec.getAttribute('data-cat');
            if (filter === 'all' || cat === filter) {
              sec.style.display = 'flex';
            } else {
              sec.style.display = 'none';
            }
          });
        });
      });

      document.querySelectorAll('.btn-run-cmd').forEach(btn => {
        btn.addEventListener('click', (e) => {
          e.stopPropagation();
          const cmd = btn.getAttribute('data-voice-cmd');
          if (cmd && window.voiceNav) {
            closeMockup();
            window.voiceNav.dispatchCommand(cmd);
          }
        });
      });
    }

    if (window.voiceNav && window.voiceNav.hudHeard) {
      window.voiceNav.hudHeard.textContent = `Opened: ${title}`;
    }
  }

  function closeMockup() {
    if (!universalMockupModal) return;
    universalMockupModal.hidden = true;
    document.body.classList.remove('mockup-modal-open');
  }

  // Hook Modal Buttons
  btnCloseUniversalModal?.addEventListener('click', closeMockup);
  btnUniversalModalSecondary?.addEventListener('click', closeMockup);
  btnUniversalModalPrimary?.addEventListener('click', () => {
    const curTitle = universalModalTitle.textContent || '';
    if (curTitle.includes('Sign in with') || curTitle.includes('Continue as')) {
      closeMockup();
      state.isAuthenticated = true;
      showPage('learning');
      switchTab('home');
      window.location.hash = '#home';
      if (window.voiceNav) window.voiceNav.speak('Signed in successfully.');
      return;
    }
    if (curTitle.includes('Voice Assistant') || curTitle.includes('Command Guide')) {
      if (window.voiceNav) {
        window.voiceNav.playChime('success');
        const readMsg = currentLang === 'am' ?
          'የኤ ኤል ኤክስ ዋና የድምጽ ትዕዛዞች፡ ለመዘዋወር "መነሻ"፣ "ትምህርት"፣ "ፕሮጀክቶች"፣ "ፈተናዎች" ወይም "እቅድ" ይበሉ። በቪዲዮው ላይ "ቪዲዮ አጫውት"፣ "አቁም"፣ "ድምፅ ጨምር"፣ "የምልክት ቋንቋ" ወይም "ንዑስ ርዕስ" ይበሉ። ለትምህርትዎ "ዛሬ ምን አለኝ"፣ "ስፕሪንት ቀጥል"፣ "ሞጁል ጨርስ" ወይም "የምስክር ወረቀት" ይበሉ። ይህን መስኮት ለመዝጋት በማንኛውም ጊዜ "ዝጋ" ይበሉ።' :
          'ALX Voice Commands: To navigate, say "Home", "Access Learning", "Projects", "Quizzes", or "Planning". In the video player, say "Play video", "Pause", "Volume up", "Sign language", or "Subtitles". For academics, say "What do I have today?", "Continue sprint", "Complete module", or "View certificate". Say "Close" anytime to dismiss this guide.';
        window.voiceNav.speak(readMsg);
      }
      return;
    }
    closeMockup();
  });

  // Close on backdrop click
  universalMockupModal?.addEventListener('click', (e) => {
    if (e.target === universalMockupModal) {
      closeMockup();
    }
  });

  // Close on Escape key
  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && universalMockupModal && !universalMockupModal.hidden) {
      closeMockup();
    }
  });

  // Expose globally
  window.showMockup = openMockup;
  window.closeMockup = closeMockup;

  // Direct Button Handlers for Core Workflow Actions
  const btnResumeHomeSWE = document.getElementById('btnResumeHomeSWE');
  btnResumeHomeSWE?.addEventListener('click', () => {
    switchTab('access-learning');
    window.location.hash = '#access-learning';
    if (typeof openCourseWorkspace === 'function') {
      openCourseWorkspace();
    }
  });

  const btnOpenSWEWorkspace = document.getElementById('btnOpenSWEWorkspace');
  btnOpenSWEWorkspace?.addEventListener('click', () => {
    switchTab('access-learning');
    window.location.hash = '#access-learning';
    if (typeof openCourseWorkspace === 'function') {
      openCourseWorkspace();
    }
  });

  // Universal Click Delegator for All [data-mockup] Buttons
  document.addEventListener('click', (e) => {
    const mockupTarget = e.target.closest('[data-mockup]');
    if (mockupTarget) {
      e.preventDefault();
      const mockupType = mockupTarget.getAttribute('data-mockup');
      const project = mockupTarget.getAttribute('data-project');
      const quiz = mockupTarget.getAttribute('data-quiz');
      const concept = mockupTarget.getAttribute('data-concept');
      const recording = mockupTarget.getAttribute('data-recording');
      const title = mockupTarget.getAttribute('title') || mockupTarget.innerText.trim();
      openMockup(mockupType, { project, quiz, concept, recording, title });
      return;
    }

    // Catch any link or button without an explicit handler or data
    const anchorOrBtn = e.target.closest('button:not([id^="btnSl"]):not([id^="btnAssistant"]):not([id^="btn-hamburger"]):not([id^="btnOpenBraille"]):not([id^="btnCloseBraille"]):not([id^="btnPrintBraille"]):not([id^="btnDownloadBRF"]):not([id^="btnSpeechBraille"]):not([id^="btnBrailleZoom"]):not([id^="btnToggle"]), a[href="#"], a[href^="#forgot"], a[href^="#contact"]');
    if (anchorOrBtn && !anchorOrBtn.classList.contains('nav-link') && !anchorOrBtn.closest('#universalMockupModal') && !anchorOrBtn.closest('#brailleModal')) {
      const text = anchorOrBtn.innerText.trim() || anchorOrBtn.getAttribute('aria-label') || anchorOrBtn.getAttribute('title');
      if (text && text.length > 1 && text !== '✕') {
        // Provide mock feedback if not already handled
      }
    }
  });

  // ==========================================================
  // 5E. MULTI-LANGUAGE LOCALIZATION ENGINE (AMHARIC, OROMIFFA, TIGRINYA)
  // ==========================================================
  const I18N_DICTIONARY = {
    en: {
      name: 'English',
      flag: '🇬🇧',
      code: 'EN',
      navHome: 'Home',
      navAccessLearning: 'Access my learning',
      navPlanning: 'My Planning',
      navProjects: 'Projects',
      navQuizzes: 'Evaluation quizzes',
      navCourses: 'My courses',
      navConcepts: 'Concepts',
      navVod: 'Video on demand',
      navProfile: 'My Profile',
      greeting: 'Good evening, Abenezer 👋',
      continueLearning: 'Continue where you left off',
      resume: 'Resume',
      immediateDeliverables: 'Your immediate deliverables',
      view: 'View',
      busyWith: 'You were busy with',
      overallProgress: 'Your overall progress',
      seeScoreDetails: 'See score details',
      upcomingEvents: 'Your upcoming events',
      seeAllEvents: 'See all my events',
      currentSprint: 'Current Sprint',
      dueIn4Days: 'Due in 4 days',
      moduleLeft: '● 1 Module Left',
      continueSprint: 'Continue Sprint (Open Course & Video)',
      previewSyllabus: 'Preview Syllabus',
      backToSprints: '← Back to All Sprints',
      courseSyllabus: 'Course Syllabus',
      signLanguage: 'Sign Language (Full Screen)',
      subtitles: 'Subtitles (CC)',
      braille: 'Braille',
      playPause: 'Play / Pause (Voice)',
      joinDefenseCall: 'Join Defense Call',
      inspect: 'Inspect',
      reviewAnswers: 'Review Answers',
      openCourseWorkspace: 'Open Course Workspace',
      viewCertificate: 'View Certificate',
      readConcept: 'Read Concept',
      watchRecording: 'Watch Recording',
      savePreferences: 'Save Preferences',
      signOut: 'Sign Out to Landing Page',
      welcomeBack: 'Welcome back!',
      enterDetails: 'Please enter your details.',
      emailLabel: 'Email *',
      passwordLabel: 'Password *',
      forgotPassword: 'Forgot password',
      signIn: 'Sign in',
      accountSelectTitle: 'Choose an account to sign in',
      accountVoiceBadge: '🎙️ Say "The first", "The second", or "The third"',
      socialDividerLabel: 'Or sign in with social (Voice: "Google", "LinkedIn", "Facebook")',
      manualDividerLabel: 'Or enter email and password manually',
      voiceActive: 'VOICE ACTIVE',
      langSwitchVoiceAnnounce: 'Language changed to English.'
    },
    am: {
      name: 'አማርኛ',
      flag: '🇪🇹',
      code: 'AM',
      navHome: 'መነሻ ገጽ',
      navAccessLearning: 'ትምህርቴን ጀምር',
      navPlanning: 'የእኔ ዕቅድ',
      navProjects: 'ፕሮጀክቶች',
      navQuizzes: 'ፈተናዎች',
      navCourses: 'ኮርሶቼ',
      navConcepts: 'ፅንሰ-ሀሳቦች',
      navVod: 'ቪዲዮዎች',
      navProfile: 'የእኔ መገለጫ',
      greeting: 'እንደምን አመሹ፣ አበነዘር 👋',
      continueLearning: 'ካቆሙበት ይቀጥሉ',
      resume: 'ቀጥል',
      immediateDeliverables: 'የሚጠበቁ ዋና ተግባራት',
      view: 'ተመልከት',
      busyWith: 'በስራ ላይ የነበሩበት',
      overallProgress: 'አጠቃላይ እድገትዎ',
      seeScoreDetails: 'የውጤት ዝርዝር ተመልከት',
      upcomingEvents: 'ቀጣይ ሁነቶች',
      seeAllEvents: 'ሁሉንም ሁነቶች ተመልከት',
      currentSprint: 'የአሁኑ ምዕራፍ',
      dueIn4Days: 'በ4 ቀናት ውስጥ የሚጠናቀቅ',
      moduleLeft: '● 1 ሞጁል ብቻ ቀርቷል',
      continueSprint: 'ምዕራፉን ቀጥል (ቪዲዮ ክፈት)',
      previewSyllabus: 'የትምህርት ዝርዝር አስቀድመህ ተመልከት',
      backToSprints: '← ወደ ሁሉም ምዕራፎች ተመለስ',
      courseSyllabus: 'የትምህርት ዝርዝር',
      signLanguage: 'የምልክት ቋንቋ (ሙሉ ማያ)',
      subtitles: 'የትርጉም ፅሁፍ (CC)',
      braille: 'ብሬይል',
      playPause: 'አጫውት / አቁም (በድምጽ)',
      joinDefenseCall: 'የምረቃ ጥሪውን ተቀላቀል',
      inspect: 'መርምር',
      reviewAnswers: 'መልሶችን ከልስ',
      openCourseWorkspace: 'የኮርሱን መስሪያ ቦታ ክፈት',
      viewCertificate: 'የምስክር ወረቀት ተመልከት',
      readConcept: 'ፅንሰ-ሀሳብ አንብብ',
      watchRecording: 'ቀረጻውን ተመልከት',
      savePreferences: 'ምርጫዎችን መዝግብ',
      signOut: 'ከመለያህ ውጣ',
      welcomeBack: 'እንኳን ደህና መጡ!',
      enterDetails: 'እባክዎ መረጃዎን ያስገቡ።',
      emailLabel: 'ኢሜይል *',
      passwordLabel: 'የይለፍ ቃል *',
      forgotPassword: 'የይለፍ ቃል ረሱ?',
      signIn: 'ግባ',
      accountSelectTitle: 'በቀጥታ መለያ ይምረጡ',
      accountVoiceBadge: '🎙️ "አንደኛ"፣ "ሁለተኛ" ወይም "ሶስተኛ" ይበሉ',
      socialDividerLabel: 'ወይም በማህበራዊ ድረ ገጽ ይግቡ ("በጉግል"፣ "በሊንክድኢን"፣ "በፌስቡክ")',
      manualDividerLabel: 'ወይም ኢሜይል እና የይለፍ ቃል በእጅ ያስገቡ',
      voiceActive: 'የድምጽ ረዳት ነቅቷል',
      langSwitchVoiceAnnounce: 'ቋንቋው ወደ አማርኛ ተቀይሯል።'
    },
    om: {
      name: 'Afaan Oromoo',
      flag: '🌳',
      code: 'OM',
      navHome: 'Fuula Duraa',
      navAccessLearning: 'Barnoota Koo',
      navPlanning: 'Karoora Koo',
      navProjects: 'Piroojektiiwwan',
      navQuizzes: 'Qorumsa',
      navCourses: 'Koorsoota Koo',
      navConcepts: 'Yaad-rimeewwan',
      navVod: 'Viidiyoo Gaafatamaa',
      navProfile: 'Piroofaayilii Koo',
      greeting: 'Akkam galgala, Abenezer 👋',
      continueLearning: 'Bakka dhiistee itti fufi',
      resume: 'Itti Fufi',
      immediateDeliverables: 'Hojiiwwan Ariifachiisoo',
      view: 'Ilaali',
      busyWith: 'Hojii irra kan turte',
      overallProgress: 'Adeemsa Waliigalaa',
      seeScoreDetails: 'Bal\'ina qabxii ilaali',
      upcomingEvents: 'Taateewwan Dhufan',
      seeAllEvents: 'Taateewwan hunda ilaali',
      currentSprint: 'Marsaa Ammaa',
      dueIn4Days: 'Guyyaa 4 keessatti xumurama',
      moduleLeft: '● Moojulii 1 qofatu hafe',
      continueSprint: 'Marsaa Itti Fufi (Viidiyoo Bani)',
      previewSyllabus: 'Silabasii Ilaali',
      backToSprints: '← Gara Marsaalee Hundatti Deebi\'i',
      courseSyllabus: 'Silabasii Koorsoo',
      signLanguage: 'Afaan Mallattoo (Iskiriinii Guutuu)',
      subtitles: 'Barreeffama Sagalee (CC)',
      braille: 'Bireelii',
      playPause: 'Taphachiisi / Dhaabi (Sagaleen)',
      joinDefenseCall: 'Waamicha Qormaataa Seeni',
      inspect: 'Qoradhu',
      reviewAnswers: 'Deebiiwwan Irra Deebi\'i',
      openCourseWorkspace: 'Iddoo Hojii Koorsoo Bani',
      viewCertificate: 'Waraqaa Ragaa Ilaali',
      readConcept: 'Yaad-rimee Dubbisi',
      watchRecording: 'Waraabbii Daawwadhu',
      savePreferences: 'Filannoowwan Galmeessi',
      signOut: 'Piroofaayilii keessaa Ba\'i',
      welcomeBack: 'Baga nagaan dhufte!',
      enterDetails: 'Maaloo odeeffannoo keessan galchaa.',
      emailLabel: 'Imeeyilii *',
      passwordLabel: 'Jecha Icciitii *',
      forgotPassword: 'Jecha icciitii dagattee?',
      signIn: 'Seeni',
      accountSelectTitle: 'Akkaawuntii seenuu filadhaa',
      accountVoiceBadge: '🎙️ "Tokkoffaa", "Lammaffaa", ykn "Sadaffaa" jedhaa',
      socialDividerLabel: 'Yookiin toora hawaasaatiin seenaa (Google, LinkedIn, Facebook)',
      manualDividerLabel: 'Yookiin iimeelii fi iccitii harkaan galchaa',
      voiceActive: 'SAGALEE HOJII IRRA',
      langSwitchVoiceAnnounce: 'Afaan gara Afaan Oromootti jijjiirameera.'
    },
    ti: {
      name: 'ትግርኛ',
      flag: '🇪🇹',
      code: 'TI',
      navHome: 'ቀንዲ ገጽ',
      navAccessLearning: 'ትምህርተይ ጀምር',
      navPlanning: 'መደበይ',
      navProjects: 'ፕሮጀክትታት',
      navQuizzes: 'ፈተናታት',
      navCourses: 'ኮርሰታተይ',
      navConcepts: 'ፅንሰ-ሓሳባት',
      navVod: 'ቪድዮታት',
      navProfile: 'መገለፂ ፕሮፋይል',
      greeting: 'ከመይ ምሸትኩም፣ ኣበነዘር 👋',
      continueLearning: 'ካብቲ ዘቋረፅካዮ ቀጽል',
      resume: 'ቀጽል',
      immediateDeliverables: 'ዝጽበዩኩም ዕማማት',
      view: 'ርአ',
      busyWith: 'ኣብ ስራሕ ዝነበርካሉ',
      overallProgress: 'ሓፈሻዊ ምዕባለኹም',
      seeScoreDetails: 'ዝርዝር ውጽኢት ርአ',
      upcomingEvents: 'ቀጸልቲ ፍጻሜታት',
      seeAllEvents: 'ኩሎም ፍጻሜታት ርአ',
      currentSprint: 'ህሉው ምዕራፍ',
      dueIn4Days: 'ኣብ 4 መዓልቲ ዝውዳእ',
      moduleLeft: '● 1 ሞጁል ጥራይ ተሪፉ',
      continueSprint: 'ምዕራፍ ቀጽል (ቪድዮ ክፈት)',
      previewSyllabus: 'ትሕዝቶ ትምህርቲ ኣቐዲምካ ርአ',
      backToSprints: '← ናብ ኩሎም ምዕራፋት ተመለስ',
      courseSyllabus: 'ትሕዝቶ ትምህርቲ',
      signLanguage: 'ናይ ምልክት ቋንቋ (ሙሉእ ስክሪን)',
      subtitles: 'ትርጉም ጽሑፍ (CC)',
      braille: 'ብሬይል',
      playPause: 'ወልዕ / ኣዕርፍ (ብድምጺ)',
      joinDefenseCall: 'ናይ ምረቓ ጻውዒት ተጸንበር',
      inspect: 'መርምር',
      reviewAnswers: 'መልሲታት ፈትሽ',
      openCourseWorkspace: 'ናይ ኮርስ ቦታ ስራሕ ክፈት',
      viewCertificate: 'ወረቐት ምስክር ርአ',
      readConcept: 'ፅንሰ-ሓሳብ ኣንብብ',
      watchRecording: 'ዝተቐድሔ ርአ',
      savePreferences: 'ምርጫታት ኣቐምጥ',
      signOut: 'ካብ ኣካውንት ውጻእ',
      welcomeBack: 'እንቋዕ ብደሓን መጻእኹም!',
      enterDetails: 'ብኽብረትኩም ሓበሬታኹም ኣእትዉ።',
      emailLabel: 'ኢመይል *',
      passwordLabel: 'መሕለፊ ቃል *',
      forgotPassword: 'መሕለፊ ቃል ረሲዕካ?',
      signIn: 'እቶ',
      accountSelectTitle: 'መእተዊ ኣካውንት ምረጹ',
      accountVoiceBadge: '🎙️ "ቀዳማይ"፣ "ካልኣይ" ወይ "ሳልሳይ" በሉ',
      socialDividerLabel: 'ወይ ብማሕበራዊ ገጻት እተዉ (ብጉግል፣ ብሊንክድኢን፣ ብፌስቡክ)',
      manualDividerLabel: 'ወይ ኢመይልን ቃል ምስጢርን ብኢድኩም ኣእትዉ',
      voiceActive: 'ናይ ድምጺ ሓጋዚ ንቑሕ',
      langSwitchVoiceAnnounce: 'ቋንቋ ናብ ትግርኛ ተቐይሩ ኣሎ።'
    }
  };

  let currentLang = localStorage.getItem('alx_language') || 'en';

  function applyLanguage(lang, announce = false) {
    if (!I18N_DICTIONARY[lang]) lang = 'en';
    currentLang = lang;
    localStorage.setItem('alx_language', lang);

    const d = I18N_DICTIONARY[lang];

    // 1. Update Lang Selector Button Labels
    const lmsCurrentLabel = document.getElementById('lmsLangCurrentLabel');
    if (lmsCurrentLabel) lmsCurrentLabel.textContent = d.name;
    const loginCurrentLabel = document.getElementById('loginLangCurrentLabel');
    if (loginCurrentLabel) loginCurrentLabel.textContent = d.name;

    // Update active dropdown options
    document.querySelectorAll('.lang-option-btn').forEach(btn => {
      if (btn.getAttribute('data-lang') === lang) {
        btn.classList.add('active');
      } else {
        btn.classList.remove('active');
      }
    });

    const profileLangSelect = document.getElementById('profileLangSelect');
    if (profileLangSelect && profileLangSelect.value !== lang) {
      profileLangSelect.value = lang;
    }

    // 2. Update Sidebar Navigation
    const navHome = document.querySelector('[data-i18n="nav-home"]');
    if (navHome) navHome.textContent = d.navHome;
    const navAccess = document.querySelector('[data-i18n="nav-access-learning"]');
    if (navAccess) navAccess.textContent = d.navAccessLearning;
    const navPlanning = document.querySelector('[data-i18n="nav-planning"]');
    if (navPlanning) navPlanning.textContent = d.navPlanning;
    const navProjects = document.querySelector('[data-i18n="nav-projects"]');
    if (navProjects) navProjects.textContent = d.navProjects;
    const navQuizzes = document.querySelector('[data-i18n="nav-quizzes"]');
    if (navQuizzes) navQuizzes.textContent = d.navQuizzes;
    const navCourses = document.querySelector('[data-i18n="nav-courses"]');
    if (navCourses) navCourses.textContent = d.navCourses;
    const navConcepts = document.querySelector('[data-i18n="nav-concepts"]');
    if (navConcepts) navConcepts.textContent = d.navConcepts;
    const navVod = document.querySelector('[data-i18n="nav-vod"]');
    if (navVod) navVod.textContent = d.navVod;
    const navProfile = document.querySelector('[data-i18n="nav-profile"]');
    if (navProfile) navProfile.textContent = d.navProfile;

    // 3. Greeting
    const greetingTitle = document.querySelector('.greeting-title');
    if (greetingTitle) {
      greetingTitle.innerHTML = `${d.greeting}`;
    }

    // 4. Dashboard Controls
    const lblContinue = document.querySelector('.card-continue-learning .sub-label-red');
    if (lblContinue) lblContinue.textContent = d.continueLearning;
    const btnResumeSWE = document.getElementById('btnResumeHomeSWE');
    if (btnResumeSWE) btnResumeSWE.textContent = d.resume;
    const lblDeliverables = document.querySelector('.card-immediate-deliverables .sub-label-red');
    if (lblDeliverables) lblDeliverables.textContent = d.immediateDeliverables;
    const viewButtons = document.querySelectorAll('.deliverable-item .btn-outline-red');
    viewButtons.forEach(b => { b.textContent = d.view; });
    const btnScoreDetails = document.getElementById('btnSeeScoreDetails');
    if (btnScoreDetails) btnScoreDetails.textContent = d.seeScoreDetails;
    const btnAllEvents = document.getElementById('btnSeeAllEvents');
    if (btnAllEvents) btnAllEvents.textContent = d.seeAllEvents;

    // 5. Access My Learning
    const badgeTrack = document.querySelector('.badge-active-track');
    if (badgeTrack) badgeTrack.textContent = d.currentSprint;
    const modStatus = document.getElementById('moduleStatusBadge');
    if (modStatus) modStatus.textContent = d.moduleLeft;
    const btnContSprint = document.getElementById('btnContinueSprint');
    if (btnContSprint) btnContSprint.textContent = d.continueSprint;
    const btnPrevSyl = document.getElementById('btnPreviewSyllabus');
    if (btnPrevSyl) btnPrevSyl.textContent = d.previewSyllabus;
    const btnBackSprints = document.getElementById('btnBackToSprints');
    if (btnBackSprints) btnBackSprints.textContent = d.backToSprints;
    const syllabusTitle = document.querySelector('.syllabus-title');
    if (syllabusTitle) syllabusTitle.textContent = d.courseSyllabus;

    // 6. Action Buttons across tabs
    const btnJoinDef = document.getElementById('btnJoinDefenseCall');
    if (btnJoinDef) btnJoinDef.textContent = d.joinDefenseCall;
    const inspectBtns = document.querySelectorAll('[data-mockup="inspect-project"]');
    inspectBtns.forEach(b => { b.textContent = d.inspect; });
    const quizReviewBtns = document.querySelectorAll('[data-mockup="review-quiz"]');
    quizReviewBtns.forEach(b => { b.textContent = d.reviewAnswers; });
    const btnOpenWorkspace = document.getElementById('btnOpenSWEWorkspace');
    if (btnOpenWorkspace) btnOpenWorkspace.textContent = d.openCourseWorkspace;
    const btnCert = document.getElementById('btnViewFoundationsCert');
    if (btnCert) btnCert.textContent = d.viewCertificate;
    const conceptBtns = document.querySelectorAll('[data-mockup="read-concept"]');
    conceptBtns.forEach(b => { b.textContent = d.readConcept; });
    const vodBtns = document.querySelectorAll('[data-mockup="watch-recording"]');
    vodBtns.forEach(b => { b.textContent = d.watchRecording; });
    const btnSavePrefs = document.getElementById('btnSaveProfilePrefs');
    if (btnSavePrefs) btnSavePrefs.textContent = d.savePreferences;
    const btnSignout = document.getElementById('btn-signout');
    if (btnSignout) btnSignout.textContent = d.signOut;

    // 7. Login Page
    const loginWelcomeHeading = document.getElementById('loginWelcomeHeading');
    if (loginWelcomeHeading) loginWelcomeHeading.textContent = d.welcomeBack;
    const loginWelcomeSub = document.getElementById('loginWelcomeSub');
    if (loginWelcomeSub) loginWelcomeSub.textContent = d.enterDetails;
    const btnLoginSubmit = document.getElementById('btn-login-submit');
    if (btnLoginSubmit) btnLoginSubmit.textContent = d.signIn;
    const linkForgot = document.getElementById('linkForgotPassword');
    if (linkForgot) linkForgot.textContent = d.forgotPassword;
    const accountSelectTitle = document.getElementById('accountSelectTitle');
    if (accountSelectTitle) accountSelectTitle.textContent = d.accountSelectTitle;
    const accountVoiceBadge = document.getElementById('accountVoiceBadge');
    if (accountVoiceBadge) accountVoiceBadge.textContent = d.accountVoiceBadge;
    const socialDividerLabel = document.getElementById('socialDividerLabel');
    if (socialDividerLabel) socialDividerLabel.textContent = d.socialDividerLabel;
    const manualDividerLabel = document.getElementById('manualDividerLabel');
    if (manualDividerLabel) manualDividerLabel.textContent = d.manualDividerLabel;

    // 8. Voice HUD & Chat Assistant Status
    const voiceHudState = document.getElementById('voiceHudState');
    if (voiceHudState) voiceHudState.textContent = d.voiceActive;
    const chatStatusSub = document.getElementById('chatStatusSub');
    if (chatStatusSub) chatStatusSub.textContent = d.voiceActive;

    document.documentElement.lang = lang;

    if (window.voiceNav) {
      window.voiceNav.setRecognitionLanguage(lang);
    }

    if (announce && window.voiceNav) {
      window.voiceNav.playChime('success');
      if (window.voiceNav.hudHeard) window.voiceNav.hudHeard.textContent = `${d.name} (${d.code})`;
      window.voiceNav.speak(d.langSwitchVoiceAnnounce, lang);
    }
  }

  // Hook Language Switcher Toggle Buttons & Menus
  const btnLmsLangToggle = document.getElementById('btnLmsLangToggle');
  const lmsLangDropdownMenu = document.getElementById('lmsLangDropdownMenu');
  btnLmsLangToggle?.addEventListener('click', (e) => {
    e.stopPropagation();
    const isHidden = lmsLangDropdownMenu.hidden;
    lmsLangDropdownMenu.hidden = !isHidden;
    btnLmsLangToggle.setAttribute('aria-expanded', isHidden ? 'true' : 'false');
  });

  const btnLoginLangToggle = document.getElementById('btnLoginLangToggle');
  const loginLangDropdownMenu = document.getElementById('loginLangDropdownMenu');
  btnLoginLangToggle?.addEventListener('click', (e) => {
    e.stopPropagation();
    const isHidden = loginLangDropdownMenu.hidden;
    loginLangDropdownMenu.hidden = !isHidden;
    btnLoginLangToggle.setAttribute('aria-expanded', isHidden ? 'true' : 'false');
  });

  // Language Option Click Delegator
  document.addEventListener('click', (e) => {
    const langBtn = e.target.closest('.lang-option-btn');
    if (langBtn) {
      const selectedLang = langBtn.getAttribute('data-lang');
      if (selectedLang) {
        applyLanguage(selectedLang, true);
        if (lmsLangDropdownMenu) lmsLangDropdownMenu.hidden = true;
        if (loginLangDropdownMenu) loginLangDropdownMenu.hidden = true;
      }
      return;
    }

    // Close language dropdowns on click outside
    if (lmsLangDropdownMenu && !lmsLangDropdownMenu.hidden && !e.target.closest('#lmsLangSelectorBox')) {
      lmsLangDropdownMenu.hidden = true;
      btnLmsLangToggle?.setAttribute('aria-expanded', 'false');
    }
    if (loginLangDropdownMenu && !loginLangDropdownMenu.hidden && !e.target.closest('#loginLangSelectorBox')) {
      loginLangDropdownMenu.hidden = true;
      btnLoginLangToggle?.setAttribute('aria-expanded', 'false');
    }
  });

  const profileLangSelect = document.getElementById('profileLangSelect');
  profileLangSelect?.addEventListener('change', (e) => {
    applyLanguage(e.target.value, true);
  });

  // Expose globally
  window.applyLanguage = applyLanguage;

  // ==========================================================
  // 6. INITIALIZATION
  // ==========================================================
  window.addEventListener('hashchange', () => {
    stopAllSpeech('hashchange');
    handleRoute();
  });
  window.addEventListener('click', (e) => {
    const isNav = e.target.closest('a, button, .nav-link, .quick-link, [data-tab], .btn-action, .gateway-lang-choice, .account-card, .menu-item');
    if (isNav) {
      stopAllSpeech('nav_click');
    }
  }, true);
  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      stopAllSpeech('escape_key');
    }
  });

  // Initial Route Check
  if (!window.location.hash) {
    window.location.hash = '#login';
  }
  handleRoute();
  applyLanguage(currentLang);

  // ==========================================================
  // 7. UNIVERSAL VOICE PLATFORM NAVIGATOR & ACTION ENGINE
  // ==========================================================
  class VoicePlatformNavigator {
    constructor() {
      this.recognition = null;
      this.isListening = false;
      this.isEnabled = true;
      this.isSpeaking = false;
      this.lastSpeakingEndedTime = 0;
      this.lastSpokenText = '';
      this.lastGlobalClickTime = 0;
      this.restartTimer = null;
      this.audioCtx = null;
      this.lastCommand = '';
      this.lastCommandTime = 0;
      this.lastSuccessfulCommandTime = 0;
      this.speakSeq = 0;
      this.fetchAbortController = null;
      this.currentAudio = null;

      this.hudWidget = document.getElementById('assistantCornerWidget');
      this.chatPanel = document.getElementById('assistantChatPanel');
      this.dialogueFeed = document.getElementById('chatDialogueFeed');
      this.chatTextInput = document.getElementById('chatTextInput');
      this.chatInputForm = document.getElementById('chatInputForm');
      this.btnChatMicToggle = document.getElementById('btnChatMicToggle');
      this.chatMicLabel = document.getElementById('chatMicLabel');
      this.chatMicIcon = document.getElementById('chatMicIcon');
      this.btnChatHelp = document.getElementById('btnChatHelp');
      this.btnChatMinimize = document.getElementById('btnChatMinimize');
      this.chatStatusSub = document.getElementById('chatStatusSub');
      this.chatOnlineDot = document.getElementById('chatOnlineDot');
      this.btnAssistantBot = document.getElementById('btnAssistantBot');
      this.botVoiceRing = document.getElementById('botVoiceRing');
      this.botMicIndicator = document.getElementById('botMicIndicator');

      this._lastBotMsgText = '';
      this._lastBotMsgTime = 0;
      this.lastActionLabel = '';

      const self = this;
      this.hudHeard = {
        set textContent(val) {
          self.onHudHeardUpdated(val);
        },
        get textContent() {
          return self.lastActionLabel || '';
        }
      };

      this.hudState = {
        set textContent(val) {
          if (self.chatStatusSub) {
            self.chatStatusSub.textContent = val;
          }
        },
        get textContent() {
          return self.chatStatusSub ? self.chatStatusSub.textContent : '';
        }
      };

      this.hudBubble = {
        classList: {
          add(cls) {
            // Keep assistant minimized by default; do not auto-open on speech or action
          },
          remove(cls) {}
        }
      };

      this.init();
    }

    escapeHtml(str) {
      if (!str) return '';
      return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
    }

    addDialogueMessage(sender, text, status = 'done', detail = null) {
      if (!this.dialogueFeed) {
        this.dialogueFeed = document.getElementById('chatDialogueFeed');
      }
      if (!this.dialogueFeed) return;

      const now = new Date();
      const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

      const msgDiv = document.createElement('div');
      msgDiv.className = `chat-msg chat-msg-${sender}`;

      if (sender === 'user') {
        msgDiv.innerHTML = `
          <div class="chat-msg-content">
            <div class="chat-msg-bubble">
              <p>${this.escapeHtml(text)}</p>
            </div>
            <span class="chat-msg-time">${timeStr}</span>
          </div>
        `;
      } else {
        let statusTagHtml = '';
        if (status === 'done') {
          statusTagHtml = `<div class="msg-status-tag tag-done">✓ Done</div>`;
        } else if (status === 'running') {
          statusTagHtml = `<div class="msg-status-tag tag-running">⚡ Executing</div>`;
        } else if (status === 'ready') {
          statusTagHtml = `<div class="msg-status-tag tag-ready">● AI Ready</div>`;
        } else if (status === 'help') {
          statusTagHtml = `<div class="msg-status-tag tag-help">❓ Commands Guide</div>`;
        }

        let detailHtml = '';
        if (detail) {
          detailHtml = `<div class="msg-detail-box">${detail}</div>`;
        }

        const isRawHtml = typeof text === 'string' && text.trim().startsWith('<');
        const contentHtml = isRawHtml ? text : `<p>${this.escapeHtml(text)}</p>`;

        msgDiv.innerHTML = `
          <div class="chat-msg-avatar">🤖</div>
          <div class="chat-msg-content">
            <div class="chat-msg-bubble">
              ${statusTagHtml}
              <div>${contentHtml}</div>
              ${detailHtml}
            </div>
            <span class="chat-msg-time">${timeStr}</span>
          </div>
        `;
      }

      this.dialogueFeed.appendChild(msgDiv);
      this.dialogueFeed.scrollTop = this.dialogueFeed.scrollHeight;
    }

    onHudHeardUpdated(val) {
      if (!val || typeof val !== 'string') return;
      const trimmed = val.trim();
      if (!trimmed) return;

      // If speech transcript / interim text with quotes e.g. "planning..."
      if (trimmed.startsWith('"') && trimmed.endsWith('"')) {
        if (this.chatStatusSub) {
          this.chatStatusSub.textContent = (this.isSpeaking ? 'Speaking 🔊 ' : 'Hearing: ') + trimmed;
        }
        return;
      }

      this.lastActionLabel = trimmed;
      if (this.chatStatusSub) {
        this.chatStatusSub.textContent = `✓ ${trimmed.length > 28 ? trimmed.substring(0, 26) + '...' : trimmed}`;
      }

      const now = Date.now();
      if (this._lastBotMsgText === trimmed && (now - (this._lastBotMsgTime || 0)) < 1500) {
        return;
      }
      this._lastBotMsgText = trimmed;
      this._lastBotMsgTime = now;

      this.addDialogueMessage('bot', trimmed, 'done');
    }

    openChat() {
      if (!this.chatPanel) {
        this.chatPanel = document.getElementById('assistantChatPanel');
      }
      if (!this.chatPanel) return;
      this.chatPanel.style.display = 'flex';
      this.chatPanel.classList.remove('minimized');
      this.chatPanel.setAttribute('aria-hidden', 'false');
      if (this.dialogueFeed) {
        this.dialogueFeed.scrollTop = this.dialogueFeed.scrollHeight;
      }
      if (this.chatTextInput) {
        setTimeout(() => {
          try { this.chatTextInput.focus(); } catch (_) {}
        }, 150);
      }
    }

    minimizeChat() {
      if (!this.chatPanel) {
        this.chatPanel = document.getElementById('assistantChatPanel');
      }
      if (!this.chatPanel) return;
      this.chatPanel.classList.add('minimized');
      this.chatPanel.setAttribute('aria-hidden', 'true');
      this.chatPanel.style.display = 'none';
    }

    toggleChat() {
      if (!this.chatPanel) {
        this.chatPanel = document.getElementById('assistantChatPanel');
      }
      if (!this.chatPanel) return;
      if (this.chatPanel.classList.contains('minimized')) {
        this.openChat();
      } else {
        this.minimizeChat();
      }
    }

    showCommandsHelpDialogue() {
      this.openChat();
      const html = `
        <div style="font-size:0.80rem; line-height:1.4;">
          <p style="margin:0 0 6px 0; color:#f8fafc; font-weight:700;">All Platform Voice & Chat Commands</p>
          <p style="margin:0 0 8px 0; font-size:0.72rem; color:#94a3b8;">Click any pill below to execute instantly or speak it into your mic:</p>
          
          <div class="chat-help-category">💼 Jobs & Careers</div>
          <div class="chat-cmd-grid">
            <button type="button" class="chat-cmd-pill" data-cmd="job portal">💼 job portal</button>
            <button type="button" class="chat-cmd-pill" data-cmd="jobs">jobs</button>
            <button type="button" class="chat-cmd-pill" data-cmd="careers">careers</button>
          </div>

          <div class="chat-help-category">📍 Where am I & Schedule</div>
          <div class="chat-cmd-grid">
            <button type="button" class="chat-cmd-pill" data-cmd="where am i">📍 where am i</button>
            <button type="button" class="chat-cmd-pill" data-cmd="what do i have today">📅 what do i have today</button>
          </div>

          <div class="chat-help-category">🧭 Core Platform Navigation</div>
          <div class="chat-cmd-grid">
            <button type="button" class="chat-cmd-pill" data-cmd="planning">planning</button>
            <button type="button" class="chat-cmd-pill" data-cmd="access learning">learning</button>
            <button type="button" class="chat-cmd-pill" data-cmd="projects">projects</button>
            <button type="button" class="chat-cmd-pill" data-cmd="quizzes">quizzes</button>
            <button type="button" class="chat-cmd-pill" data-cmd="profile">profile</button>
            <button type="button" class="chat-cmd-pill" data-cmd="announcements">announcements</button>
            <button type="button" class="chat-cmd-pill" data-cmd="support">support</button>
          </div>

          <div class="chat-help-category">🎬 Video & Learning Controls</div>
          <div class="chat-cmd-grid">
            <button type="button" class="chat-cmd-pill" data-cmd="play video">▶️ play video</button>
            <button type="button" class="chat-cmd-pill" data-cmd="pause video">⏸️ pause video</button>
            <button type="button" class="chat-cmd-pill" data-cmd="video maker">🎥 video maker</button>
            <button type="button" class="chat-cmd-pill" data-cmd="continue sprint">continue sprint</button>
            <button type="button" class="chat-cmd-pill" data-cmd="complete module">complete module</button>
            <button type="button" class="chat-cmd-pill" data-cmd="review quiz">review quiz</button>
          </div>

          <div class="chat-help-category">♿ Accessible Media & Controls</div>
          <div class="chat-cmd-grid">
            <button type="button" class="chat-cmd-pill" data-cmd="sign language">🤟 sign language</button>
            <button type="button" class="chat-cmd-pill" data-cmd="braille">⠃ braille embosser</button>
            <button type="button" class="chat-cmd-pill" data-cmd="subtitles">subtitles</button>
            <button type="button" class="chat-cmd-pill" data-cmd="volume up">🔊 volume up</button>
            <button type="button" class="chat-cmd-pill" data-cmd="volume down">🔉 volume down</button>
            <button type="button" class="chat-cmd-pill" data-cmd="forward 10 seconds">⏩ forward 10s</button>
            <button type="button" class="chat-cmd-pill" data-cmd="rewind 10 seconds">⏪ rewind 10s</button>
            <button type="button" class="chat-cmd-pill" data-cmd="scroll down">scroll down</button>
            <button type="button" class="chat-cmd-pill" data-cmd="scroll up">scroll up</button>
            <button type="button" class="chat-cmd-pill" data-cmd="close dialog">close dialog</button>
          </div>

          <div class="chat-help-category">🌐 Languages (ቋንቋ / Afaan)</div>
          <div class="chat-cmd-grid">
            <button type="button" class="chat-cmd-pill" data-cmd="switch to amharic">🇪🇹 አማርኛ</button>
            <button type="button" class="chat-cmd-pill" data-cmd="switch to oromiffa">Afaan Oromoo</button>
            <button type="button" class="chat-cmd-pill" data-cmd="switch to tigrinya">ትግርኛ</button>
            <button type="button" class="chat-cmd-pill" data-cmd="switch to english">English</button>
          </div>
        </div>
      `;
      this.addDialogueMessage('bot', html, 'help');
    }

    init() {
      this.minimizeChat();
      this.initRecognition();
      this.setupDomEvents();
      this.checkAndInstallDependencies();
    }

    clearWelcomeTimer() {
      if (this.welcomeTimer) {
        clearTimeout(this.welcomeTimer);
        this.welcomeTimer = null;
      }
    }

    announceWelcome() {
      this.clearWelcomeTimer();
      // Announce initial hands-free prompt on the landing page
      this.welcomeTimer = setTimeout(() => {
        if (!this.isEnabled) return;
        if (state.isAuthenticated) return; // Never announce login prompt if already logged in!
        const isLoginPage = !state.isAuthenticated || (pageLogin && pageLogin.classList.contains('active'));
        if (isLoginPage) {
          const onboardingPrompts = {
            am: "እንኳን ወደ LearnBridge በደህና መጡ። ቋንቋዎን ይምረጡ፡ English ወይም አማርኛ ይበሉ። ለመግባት ይግቡ ወይም login ይበሉ።",
            en: "Welcome to LearnBridge. Please select your language: say English, Amharic, Oromo, or Tigrinya. Or say login to enter.",
            om: "Baga gara LearnBridge nagaan dhuftan. Afaan keessan filadhaa: English, Oromo, ykn Amharic jedhaa. Seenuuf login jedhaa.",
            ti: "እንቋዕ ብደሓን መጻእኹም። ቋንቋኹም ሕረዩ፡ እንግሊዝኛ፣ ትግርኛ፣ ወይ ኣምሓርኛ በሉ። ንምእታው login ወይ እቶ በሉ።"
          };
          const prompt = onboardingPrompts[currentLang] || onboardingPrompts.en;
          if (this.hudHeard) this.hudHeard.textContent = prompt;
          this.speak(prompt);
        }
      }, 400);
    }

    announceDashboardWelcome() {
      this.clearWelcomeTimer();
      // Announce next steps on the dashboard
      this.welcomeTimer = setTimeout(() => {
        if (!this.isEnabled) return;
        if (!state.isAuthenticated && !state.isDemoMode) return;
        const isDashboard = pageLearning && pageLearning.classList.contains('active') && (window.location.hash === '#home' || window.location.hash === '');
        if (isDashboard) {
          const dashboardPrompts = {
            am: "ዝግጁ ነው። ለመማር access learning ወይም መማር ጀምር ይበሉ።",
            en: "Ready, say access learning to start learning",
            om: "Qophii dha, barumsa eegaluuf access learning jedhaa.",
            ti: "ድሉው እዩ፣ ንምምሃር access learning ወይ ትምህርተይ በሉ።"
          };
          const prompt = dashboardPrompts[currentLang] || dashboardPrompts.en;
          if (this.hudHeard) this.hudHeard.textContent = prompt;
          this.speak(prompt);
        }
      }, 600);
    }

    async checkAndInstallDependencies() {
      const depBox = document.getElementById('dependencyCheckerBox');
      const depFill = document.getElementById('depProgressFill');
      const depLabel = document.getElementById('depStatusLabel');
      const depSub = document.getElementById('depStatusSub');
      const depPct = document.getElementById('depPercentageLabel');
      const depIcon = document.getElementById('depStatusIcon');
      const depTrack = document.getElementById('depProgressBar');

      const setProgress = (percent, label, subtext, icon = '⚙️', complete = false) => {
        if (depFill) depFill.style.width = `${percent}%`;
        if (depTrack) depTrack.setAttribute('aria-valuenow', percent);
        if (depPct) depPct.textContent = `${percent}%`;
        if (depLabel) depLabel.textContent = label;
        if (depSub) depSub.textContent = subtext;
        if (depIcon) depIcon.textContent = icon;
        if (depBox) {
          if (complete) depBox.classList.add('dep-complete');
          else depBox.classList.remove('dep-complete');
        }
      };

      try {
        // Step 1: Checking dependencies (25%)
        setProgress(25, 'Checking dependencies...', 'Verifying Service Worker cache & speech engines...', '⚙️');
        await new Promise(r => setTimeout(r, 260));

        // 1. Silent Service Worker cache verification & installation
        if ('serviceWorker' in navigator) {
          navigator.serviceWorker.register('/sw.js', { scope: '/' }).catch(() => {});
        }

        // 2. Pre-warm AudioContext for instant chime feedback
        try {
          const AudioCtx = window.AudioContext || window.webkitAudioContext;
          if (AudioCtx && !this.audioCtx) {
            this.audioCtx = new AudioCtx();
            if (this.audioCtx.state === 'suspended') {
              this.audioCtx.resume().catch(() => {});
            }
          }
        } catch (_) {}

        // Step 2: Installing & Pre-warming assets (65%)
        setProgress(65, 'Installing & pre-warming assets...', 'Preloading synthesis voices and neural audio streams...', '📦');
        await new Promise(r => setTimeout(r, 280));

        // 3. Pre-warm SpeechSynthesis & preload voices
        if ('speechSynthesis' in window) {
          try {
            const v = window.speechSynthesis.getVoices();
            if (!v || v.length === 0) {
              window.speechSynthesis.onvoiceschanged = () => {
                try { window.speechSynthesis.getVoices(); } catch (_) {}
              };
            }
          } catch (_) {}
        }

        // 4. Pre-cache TTS audio prompts silently from backend
        try {
          const precachePrompts = [
            { text: 'Ready, say login or sign in to login', lang: 'en' },
            { text: 'Ready, say access learning to start learning', lang: 'en' },
            { text: 'ዝግጁ ነው። ለመግባት login ወይም ይግቡ ይበሉ።', lang: 'am' },
            { text: 'ዝግጁ ነው። ለመማር access learning ይበሉ።', lang: 'am' }
          ];
          precachePrompts.forEach(p => {
            fetch('/api/tts', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(p)
            }).catch(() => {});
          });
        } catch (_) {}

        // Step 3: Activating speech recognition (90%)
        setProgress(90, 'Activating speech recognition...', 'Connecting microphone for hands-free navigation...', '🎙️');
        await new Promise(r => setTimeout(r, 220));

        this.autoStartListening();

        // Step 4: Done! (100%)
        setProgress(100, 'Done — System Ready', 'Ready! Say "login" or click Log in below.', '✓', true);

        // Announce welcome aloud
        this.announceWelcome();
      } catch (err) {
        console.warn('[Dependencies] Background check error:', err);
        setProgress(100, 'Done — System Ready', 'Ready! Say "login" or click Log in below.', '✓', true);
        this.autoStartListening();
        this.announceWelcome();
      }
    }

    autoStartListening() {
      if (!this.recognition || this.isListening) return;
      try {
        this.recognition.start();
        this.isListening = true;
        this.updateUiState(true, currentLang === 'am' ? 'እየሰማ ነው 🎙️' : 'Listening 🎙️ · Hands-Free Active');
      } catch (err) {
        // Browser gesture requirement fallback: attach transparent listeners to activate on first tap/click/key
        const engageMic = () => {
          ['click', 'touchstart', 'keydown'].forEach(evt => window.removeEventListener(evt, engageMic));
          if (this.isEnabled && !this.isListening) {
            this.startSafe();
          }
        };
        ['click', 'touchstart', 'keydown'].forEach(evt => window.addEventListener(evt, engageMic, { once: true, passive: true }));
      }
    }

    speakInstant(text, targetLang) {
      if (!text || !text.trim()) return;
      if (state.isAuthenticated && (/log in|sign in|welcome to alx|authenticate|ይግቡ|ግባ|seeni|እቶ/i.test(text))) {
        return;
      }
      this.stopSpeaking();
      const currentSeq = ++this.speakSeq;
      this.isSpeaking = true;
      this.currentSpokenText = text.toLowerCase().trim();
      this.lastSpokenText = this.currentSpokenText;
      if (this.botVoiceRing) this.botVoiceRing.classList.add('pulse');
      if (this.hudState) {
        this.hudState.textContent = (currentLang === 'am' ? 'እየተናገረ ነው' : 'SPEAKING');
      }

      const speechTextEl = document.getElementById('voiceAssistantSpeechText');
      if (speechTextEl) {
        speechTextEl.textContent = text;
        speechTextEl.style.display = 'block';
      }
      if (this.hudHeard) {
        this.hudHeard.textContent = `"${text.length > 28 ? text.substring(0, 28) + '...' : text}"`;
      }

      const lang = targetLang || currentLang || 'en';
      this.fallbackSpeak(text, lang, currentSeq);
    }

    playChime(type = 'success') {
      try {
        const AudioCtx = window.AudioContext || window.webkitAudioContext;
        if (!AudioCtx) return;
        if (!this.audioCtx) this.audioCtx = new AudioCtx();
        if (this.audioCtx.state === 'suspended') this.audioCtx.resume();

        const now = this.audioCtx.currentTime;
        const osc = this.audioCtx.createOscillator();
        const gain = this.audioCtx.createGain();
        osc.connect(gain);
        gain.connect(this.audioCtx.destination);

        if (type === 'success') {
          osc.type = 'sine';
          osc.frequency.setValueAtTime(523.25, now);
          osc.frequency.exponentialRampToValueAtTime(783.99, now + 0.12);
          gain.gain.setValueAtTime(0.18, now);
          gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
          osc.start(now);
          osc.stop(now + 0.35);
        } else {
          osc.type = 'triangle';
          osc.frequency.setValueAtTime(440, now);
          osc.frequency.exponentialRampToValueAtTime(659.25, now + 0.15);
          gain.gain.setValueAtTime(0.15, now);
          gain.gain.exponentialRampToValueAtTime(0.001, now + 0.28);
          osc.start(now);
          osc.stop(now + 0.28);
        }
      } catch (_) {}
    }

    _onSpeakingEnded() {
      clearTimeout(this.speakingWatchdog);
      this.isSpeaking = false;
      this.currentSpokenText = '';
      this.lastSpeakingEndedTime = Date.now();
      if (this.botVoiceRing) this.botVoiceRing.classList.remove('pulse');
      if (this.hudBubble) this.hudBubble.classList.remove('visible');
      const speechTextEl = document.getElementById('voiceAssistantSpeechText');
      if (speechTextEl) {
        speechTextEl.style.display = 'none';
        speechTextEl.textContent = '';
      }
      if (this.hudState) {
        this.hudState.textContent = (currentLang === 'am' ? 'እየሰማ ነው' : currentLang === 'om' ? 'DHAGGEEFFATA' : currentLang === 'ti' ? 'ይሰምዕ ኣሎ' : 'LISTENING');
      }
      // Ensure continuous recognition restarts cleanly
      if (this.isEnabled) {
        clearTimeout(this.restartTimer);
        this.restartTimer = setTimeout(() => {
          if (this.isEnabled && !this.isSpeaking && !this.isListening) {
            this.startSafe();
          }
        }, 150);
      }
    }

    stopSpeaking() {
      this.speakSeq++;
      if (this.speakingWatchdog) {
        clearTimeout(this.speakingWatchdog);
      }
      if (this.fetchAbortController) {
        try { this.fetchAbortController.abort(); } catch (_) {}
        this.fetchAbortController = null;
      }
      if (this.currentAudio) {
        try {
          this.currentAudio.pause();
          this.currentAudio.currentTime = 0;
          this.currentAudio.src = '';
          this.currentAudio = null;
        } catch (_) {}
      }
      if ('speechSynthesis' in window) {
        try { window.speechSynthesis.cancel(); } catch (_) {}
      }
      const speechTextEl = document.getElementById('voiceAssistantSpeechText');
      if (speechTextEl) {
        speechTextEl.style.display = 'none';
        speechTextEl.textContent = '';
      }
      this._onSpeakingEnded();
    }

    async speak(text, targetLang) {
      if (!text || !text.trim()) return;
      // If user is authenticated, block any legacy/queued login prompts from ever being spoken
      if (state.isAuthenticated && (/log in|sign in|welcome to alx|authenticate|ይግቡ|ግባ|seeni|እቶ/i.test(text))) {
        return;
      }
      // Instant ultra-low-latency speech output directly via browser SpeechSynthesis
      this.speakInstant(text, targetLang);
    }

    fallbackSpeak(text, lang, expectedSeq) {
      if (expectedSeq && expectedSeq !== this.speakSeq) return;
      if (!('speechSynthesis' in window)) {
        this.isSpeaking = false;
        this.currentSpokenText = '';
        if (this.botVoiceRing) this.botVoiceRing.classList.remove('pulse');
        return;
      }
      try { window.speechSynthesis.cancel(); } catch (_) {}

      const utter = new SpeechSynthesisUtterance(text);
      utter.lang = lang === 'am' ? 'am-ET' : lang === 'ti' ? 'ti-ET' : lang === 'om' ? 'om-ET' : 'en-US';
      utter.rate = 1.0;
      utter.pitch = 1.0;

      utter.onend = () => {
        if (!expectedSeq || expectedSeq === this.speakSeq) {
          this._onSpeakingEnded();
        }
      };
      utter.onerror = () => {
        if (!expectedSeq || expectedSeq === this.speakSeq) {
          this._onSpeakingEnded();
        }
      };
      try {
        window.speechSynthesis.speak(utter);
      } catch (_) {
        this.isSpeaking = false;
        this.currentSpokenText = '';
      }
    }

    setRecognitionLanguage(lang) {
      let code = 'en-US';
      if (lang === 'am') code = 'am-ET';
      else if (lang === 'ti') code = 'ti-ET';
      else if (lang === 'om') code = 'om-ET';
      this.currentLangCode = code;
      if (this.recognition) {
        const wasListening = this.isListening;
        this.recognition.lang = code;
        if (wasListening) {
          try { this.recognition.stop(); } catch (_) {}
          setTimeout(() => {
            if (this.isEnabled) {
              try { this.recognition.start(); } catch (_) {}
            }
          }, 150);
        }
      }
    }

    initRecognition() {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (!SpeechRecognition) {
        console.warn('SpeechRecognition API not available in this browser.');
        if (this.hudState) this.hudState.textContent = 'VOICE NOT SUPPORTED';
        if (this.hudHeard) this.hudHeard.textContent = 'Use Chrome or Edge for voice navigation';
        return;
      }

      try {
        this.recognition = new SpeechRecognition();
        this.recognition.continuous = true;
        this.recognition.interimResults = true;
        this.recognition.maxAlternatives = 3;
        const initialLangCode = (typeof currentLang !== 'undefined' && currentLang === 'am') ? 'am-ET' :
                                (typeof currentLang !== 'undefined' && currentLang === 'ti') ? 'ti-ET' :
                                (typeof currentLang !== 'undefined' && currentLang === 'om') ? 'om-ET' : 'en-US';
        this.recognition.lang = initialLangCode;

        this.recognition.onstart = () => {
          this.isListening = true;
          this.isStarting = false;
          this.updateUiState(true, currentLang === 'am' ? 'እየሰማ ነው 🎙️' : 'Listening 🎙️ · Hands-Free Active');
        };

        this.recognition.onend = () => {
          this.isListening = false;
          this.isStarting = false;
          // Auto-restart continuous listening unless explicitly disabled or assistant is speaking
          // Note: Do NOT set UI to inactive on normal silence pause; only set Idle if explicitly disabled.
          if (this.isEnabled && !this.isSpeaking) {
            clearTimeout(this.restartTimer);
            this.restartTimer = setTimeout(() => {
              if (this.isEnabled && !this.isSpeaking && !this.isListening) {
                this.startSafe();
              }
            }, 400);
          } else if (!this.isEnabled) {
            this.updateUiState(false, 'Idle');
          }
        };

        this.recognition.onerror = (e) => {
          this.isStarting = false;
          console.warn('[ALX Voice Navigator] Speech recognition event:', e.error);
          if (e.error === 'no-speech' || e.error === 'network') {
            if (this.isEnabled && !this.isSpeaking) {
              clearTimeout(this.restartTimer);
              this.restartTimer = setTimeout(() => {
                if (this.isEnabled && !this.isSpeaking && !this.isListening) {
                  this.startSafe();
                }
              }, 400);
            }
            return;
          }
          this.isListening = false;
          if (e.error === 'not-allowed' || e.error === 'service-not-allowed') {
            this.updateUiState(false, 'Mic Blocked');
            if (this.hudHeard) this.hudHeard.textContent = (currentLang === 'am' ? 'እባክዎ ማይክሮፎኑን ለማብራት አዶውን ይጫኑ' : 'Click anywhere or tap microphone to enable voice');
            const retryMic = () => {
              ['click', 'keydown'].forEach(evt => window.removeEventListener(evt, retryMic));
              this.startWithPermission();
            };
            ['click', 'keydown'].forEach(evt => window.addEventListener(evt, retryMic, { once: true, passive: true }));
          } else if (e.error === 'language-not-supported') {
            if (this.recognition) {
              if (this.recognition.lang === 'ti-ET') {
                console.log('[ALX Voice] ti-ET not supported, falling back to am-ET (Ge\'ez phonology)');
                this.recognition.lang = 'am-ET';
                this.startSafe();
              } else if (this.recognition.lang !== 'en-US') {
                console.log('[ALX Voice] Falling back to en-US');
                this.recognition.lang = 'en-US';
                this.startSafe();
              }
            }
          }
        };

        this.recognition.onresult = (event) => {
          let interimText = '';
          let finalUtterance = '';
          const candidatePhrases = [];

          for (let i = event.resultIndex; i < event.results.length; ++i) {
            const res = event.results[i];
            if (!res) continue;
            for (let j = 0; j < res.length; ++j) {
              if (res[j] && res[j].transcript) {
                const tr = res[j].transcript.trim();
                if (tr && !candidatePhrases.includes(tr)) candidatePhrases.push(tr);
              }
            }
            if (res[0] && res[0].transcript) {
              if (res.isFinal) {
                finalUtterance += res[0].transcript + ' ';
              } else {
                interimText += res[0].transcript + ' ';
              }
            }
          }

          const rawText = (finalUtterance || interimText).trim();
          if (!rawText) return;

          const now = Date.now();
          const normRaw = rawText.toLowerCase().replace(/[.,!?;:'"\\-_/\\()]/g, ' ').trim();

          // INSTANT BARGE-IN FOR STOP, LOGIN, AND LANGUAGE SELECTION:
          if (/^(stop|quiet|silence|shut up|mute|pause|ዝም|ቆም|ደው|dhaabi|ስቕ)/i.test(normRaw)) {
            this.stopSpeaking();
            if (typeof window.stopAllSpeech === 'function') window.stopAllSpeech('barge_in_stop');
            return;
          }

          // If assistant is speaking, allow instant barge-in for login, language, job portal, and card actions
          if (this.isSpeaking) {
            const isBargeInAction = /(?<![\p{L}\p{N}])(log in|sign in|login|signin|log me in|sign me in|ይግቡ|ግባ|መግቢያ|ሎጊን|ሎግ ኢን|ሳይን ኢን|seeni|seensa|እቶ|ምእታው|english|amharic|oromo|afaan oromoo|oromiffa|tigrinya|tigrigna|አማርኛ|ትግርኛ|እንግሊዝኛ|job|jobs|job portal|jobs portal|open job portal|open jobs|open job|go to job portal|career|careers|employment|ስራ|ስራዎች|የስራ መድረክ|የስራ እድሎች|የስራ እድል|ስራ መድረክ|hojii|waltajjii hojii|ስራሕ|ዕድላት ስራሕ|pass|reject|skip|apply)(?![\p{L}\p{N}])/iu.test(normRaw);
            if (isBargeInAction) {
              this.stopSpeaking();
              if ('speechSynthesis' in window) {
                try { window.speechSynthesis.cancel(); } catch (_) {}
              }
              this.isSpeaking = false;
            } else if ((now - (this.lastSpeakingEndedTime || 0)) < 250) {
              return;
            }
          } else if ((now - (this.lastSpeakingEndedTime || 0)) < 150) {
            // Check if user is speaking an active command right after prompt ended
            const isAllowedCommand = /(?<![\p{L}\p{N}])(log in|sign in|login|signin|ይግቡ|ግባ|መግቢያ|ሎጊን|ሎግ ኢን|seeni|እቶ|english|amharic|oromo|tigrinya|አማርኛ|ትግርኛ|እንግሊዝኛ|job|jobs|job portal|jobs portal|open job portal|open jobs|open job|career|careers|employment|ስራ|ስራዎች|የስራ መድረክ|የስራ እድሎች|የስራ እድል|ስራ መድረክ|hojii|waltajjii hojii|ስራሕ|ዕድላት ስራሕ|pass|reject|apply)(?![\p{L}\p{N}])/iu.test(normRaw);
            if (!isAllowedCommand) {
              return;
            }
          }

          // Live visual feedback in HUD while user is speaking
          if (this.hudHeard) {
            this.hudHeard.textContent = `"${rawText.length > 28 ? rawText.substring(0, 28) + '...' : rawText}"`;
          }

          // FAST RESPONSIVE DISPATCH: Test candidates immediately!
          for (const cand of candidatePhrases) {
            const executed = this.dispatchCommand(cand);
            if (executed) {
              return;
            }
          }
        };

        // Microphone defaults to non-autoplay (tap-to-speak)
      } catch (err) {
        console.warn('Speech init error:', err);
      }
    }

    startSafe() {
      if (!this.recognition || this.isListening || this.isStarting) return;
      this.isStarting = true;
      try {
        this.recognition.start();
      } catch (err) {
        this.isStarting = false;
        if (err.name !== 'InvalidStateError') {
          console.warn('Recognition start exception:', err);
        }
      }
    }

    start() {
      this.isEnabled = true;
      this.startSafe();
      this.updateUiState(true);
    }

    stop() {
      this.isEnabled = false;
      this.isStarting = false;
      clearTimeout(this.restartTimer);
      if (this.recognition && this.isListening) {
        try { this.recognition.stop(); } catch (_) {}
      }
      this.updateUiState(false);
    }

    async toggle() {
      if (this.isEnabled) {
        this.stop();
        this.playChime('neutral');
        this.speak(currentLang === 'am' ? "ማይክሮፎኑ ለጊዜው ቆሟል።" : "Microphone paused. Click Mic to resume.");
      } else {
        await this.startWithPermission();
      }
    }

    async startWithPermission() {
      this.isEnabled = true;
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        try {
          const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
          stream.getTracks().forEach(t => t.stop());
        } catch (err) {
          console.warn('Microphone permission request error:', err);
          this.updateUiState(false, 'Mic Blocked');
          if (this.hudHeard) this.hudHeard.textContent = (currentLang === 'am' ? 'እባክዎ በብሮውዘሩ ላይ ማይክሮፎን ይፍቀዱ' : 'Please allow microphone access in browser');
          return;
        }
      }
      this.startSafe();
      this.playChime('success');
      this.speak(currentLang === 'am' ? "ማይክሮፎን በርቷል። ትዕዛዝ ይናገሩ።" : "Microphone active. Say a command to navigate.");
    }

    updateUiState(active, label = null) {
      const showActive = this.isEnabled && (active === true || this.isListening || this.isStarting);
      if (this.hudWidget) {
        if (showActive) this.hudWidget.classList.remove('disabled');
        else this.hudWidget.classList.add('disabled');
      }
      if (this.btnAssistantBot) {
        if (showActive) {
          this.btnAssistantBot.classList.remove('muted');
          this.btnAssistantBot.classList.add('voice-active');
        } else {
          this.btnAssistantBot.classList.add('muted');
          this.btnAssistantBot.classList.remove('voice-active');
        }
      }
      if (this.chatStatusSub) {
        this.chatStatusSub.textContent = label || (showActive ? (currentLang === 'am' ? 'እየሰማ ነው 🎙️' : 'Listening 🎙️ · Hands-Free Active') : (currentLang === 'am' ? 'ማይክ ቆሟል 🔇' : 'Mic Paused 🔇 · Click to resume'));
      }
      if (this.chatOnlineDot) {
        this.chatOnlineDot.style.background = showActive ? '#10b981' : '#94a3b8';
        this.chatOnlineDot.style.boxShadow = showActive ? '0 0 8px #10b981' : 'none';
      }
      if (this.btnChatMicToggle) {
        if (showActive) {
          this.btnChatMicToggle.classList.remove('mic-off');
          if (this.chatMicLabel) this.chatMicLabel.textContent = 'Mic ON';
          if (this.chatMicIcon) this.chatMicIcon.textContent = '🎙️';
        } else {
          this.btnChatMicToggle.classList.add('mic-off');
          if (this.chatMicLabel) this.chatMicLabel.textContent = 'Mic OFF';
          if (this.chatMicIcon) this.chatMicIcon.textContent = '🔇';
        }
      }
      if (this.hudState) {
        this.hudState.textContent = label || (showActive ? (currentLang === 'am' ? 'እየሰማ ነው' : 'VOICE ACTIVE') : (currentLang === 'am' ? 'ተዘግቷል' : 'VOICE PAUSED'));
      }
      if (this.botMicIndicator) {
        this.botMicIndicator.textContent = showActive ? '🎙️' : '🔇';
      }
      const bubbleMicBtn = document.getElementById('btnBubbleMicToggle');
      if (bubbleMicBtn) {
        if (showActive) {
          bubbleMicBtn.textContent = '🎙️ Mic ON';
          bubbleMicBtn.classList.remove('mic-off');
        } else {
          bubbleMicBtn.textContent = '🔇 Mic OFF';
          bubbleMicBtn.classList.add('mic-off');
        }
      }
    }

    processCandidates(candidates) {
      if (!candidates || candidates.length === 0) return;
      const topCand = candidates[0];
      if (topCand && topCand.trim()) {
        this.dispatchCommand(topCand.trim());
      }
    }

    dispatchCommand(raw, isExplicitUserAction = false) {
      if (!raw) return false;
      const text = raw.toLowerCase()
        .replace(/[.,!?;:'"\\-_/\\()]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();

      if (!text || text.length < 2) return false;

      const now = Date.now();

      // Dynamic acoustic isolation (prevent echo or self-feedback loops)
      if (!isExplicitUserAction) {
        const isBargeInCommand = /^(stop|quiet|silence|shut up|pause|ዝም|ቆም|ደው|dhaabi|ስቕ)/i.test(text) ||
          /(?<![\p{L}\p{N}])(log in|sign in|login|signin|log me in|sign me in|ይግቡ|ግባ|መግቢያ|ሎጊን|ሎግ ኢን|seeni|seensa|እቶ|ምእታው|english|amharic|oromo|afaan oromoo|oromiffa|tigrinya|tigrigna|አማርኛ|ትግርኛ|እንግሊዝኛ|job|jobs|job portal|jobs portal|open job portal|open jobs|open job|go to job portal|career|careers|employment|ስራ|ስራዎች|የስራ መድረክ|የስራ እድሎች|የስራ እድል|ስራ መድረክ|hojii|waltajjii hojii|ስራሕ|ዕድላት ስራሕ|pass|reject|skip|apply)(?![\p{L}\p{N}])/iu.test(text);

        if (this.isSpeaking) {
          if (isBargeInCommand) {
            this.stopSpeaking();
            if ('speechSynthesis' in window) {
              try { window.speechSynthesis.cancel(); } catch (_) {}
            }
            this.isSpeaking = false;
          } else {
            return false;
          }
        }
        if ((now - (this.lastSuccessfulCommandTime || 0)) < 200) {
          return false;
        }
        if (text === this.lastCommand && (now - this.lastCommandTime) < 500) {
          return false;
        }
      }

      console.log(`[ALX Voice Navigator] Command detected: "${text}" (explicit: ${isExplicitUserAction})`);

      // Special handling for Help / Commands Guide
      if (/(?<![\p{L}\p{N}])(help|assist|commands|all commands|command list|command guide|እርዳታ|ሓገዝ|gargaarsa|ትዕዛዞች)(?![\p{L}\p{N}])/iu.test(text)) {
        this.addDialogueMessage('user', isExplicitUserAction ? raw : `🎙️ "${raw}"`);
        this.openChat();
        this.lastSuccessfulCommandTime = Date.now();
        this.lastCommand = text;
        this.lastCommandTime = this.lastSuccessfulCommandTime;
        this.playChime('success');
        this.showCommandsHelpDialogue();
        this.speak(currentLang === 'am' ? 'የድምጽ ረዳቱን ትዕዛዞች በውይይት መስኮቱ ላይ አቅርቤያለሁ።' : 'Here are all available voice and chat commands.');
        return true;
      }

      // If user explicitly typed or clicked, show their message immediately
      if (isExplicitUserAction) {
        this.addDialogueMessage('user', raw);
        this.openChat();
      }

      const executed = this._executeDispatch(text, raw, now);
      if (executed) {
        if (!isExplicitUserAction) {
          this.addDialogueMessage('user', `🎙️ "${raw}"`);
          // Kept minimized by default so hands-free navigation does not obscure the screen
        }
        this.lastSuccessfulCommandTime = Date.now();
        this.lastCommand = text;
        this.lastCommandTime = this.lastSuccessfulCommandTime;
        console.log(`[ALX Voice Navigator] Successfully executed command: "${text}" at ${this.lastSuccessfulCommandTime}`);
        return true;
      } else if (isExplicitUserAction) {
        this.addDialogueMessage('bot', `I didn't recognize "${this.escapeHtml(raw)}". Click "❓ All Commands" or type "help" to see available actions.`, 'ready');
      }

      return executed;
    }

    _executeDispatch(text, raw, now) {
      const isLoginContext = !state.isAuthenticated || (pageLogin && pageLogin.classList.contains('active'));

      // 00-STOP. STOP ALL SPEECH IMMEDIATELY (ZERO LAG)
      if (/^(stop|quiet|silence|shut up|pause speech|mute|ዝም|ዝም በል|ቁም|ደው|dhaabi|ስቕ|ስቕ በል)/i.test(text) ||
          text === 'stop' || text === 'quiet' || text === 'silence' || text === 'ዝም' || text === 'ቆም' || text === 'ደው' || text === 'dhaabi' || text === 'ስቕ') {
        this.stopSpeaking();
        if (typeof window.stopAllSpeech === 'function') window.stopAllSpeech('voice_command');
        this.playChime('neutral');
        if (this.hudHeard) this.hudHeard.textContent = (currentLang === 'am' ? 'ድምፅ ቆሟል' : 'Speech stopped');
        return true;
      }

      // 00-LANG. MULTI-LANGUAGE VOICE SELECTION ("ASK LIKE THE LANGUAGE")
      const isEnglishCmd = /(?<![\p{L}\p{N}])(english|switch to english|change language to english|in english|select english|ወደ እንግሊዝኛ|በእንግሊዝኛ|እንግሊዝኛ|gara ingiliffaatti|ingiliffa|ናብ እንግሊዝኛ|ብእንግሊዝኛ)(?![\p{L}\p{N}])/iu.test(text) ||
        text === 'english' || text === 'en' || text === 'እንግሊዝኛ';
      if (isEnglishCmd) {
        this.stopSpeaking();
        this.clearWelcomeTimer();
        this.lastCommand = text;
        this.lastCommandTime = now;
        this.lastSuccessfulCommandTime = now;
        this.playChime('success');
        if (typeof applyLanguage === 'function') {
          applyLanguage('en', false);
        }
        if (window.universalGateway && window.universalGateway.isOpen) {
          window.universalGateway.selectLanguage('en');
        }
        this.setRecognitionLanguage('en');
        if (this.hudHeard) this.hudHeard.textContent = 'English (EN)';
        this.speakInstant('Language set to English. Say login or sign in to enter.', 'en');
        return true;
      }

      const isAmharicCmd = /(?<![\p{L}\p{N}])(amharic|switch to amharic|change language to amharic|in amharic|amharigna|select amharic|አማርኛ|አማርኛ ምረጥ|ቋንቋ ወደ አማርኛ|ወደ አማርኛ|በአማርኛ|አማርኛ አድርገው|ቋንቋ ቀይር ወደ አማርኛ)(?![\p{L}\p{N}])/iu.test(text) ||
        text === 'amharic' || text === 'am' || text === 'አማርኛ';
      if (isAmharicCmd) {
        this.stopSpeaking();
        this.clearWelcomeTimer();
        this.lastCommand = text;
        this.lastCommandTime = now;
        this.lastSuccessfulCommandTime = now;
        this.playChime('success');
        if (typeof applyLanguage === 'function') {
          applyLanguage('am', false);
        }
        if (window.universalGateway && window.universalGateway.isOpen) {
          window.universalGateway.selectLanguage('am');
        }
        this.setRecognitionLanguage('am');
        if (this.hudHeard) this.hudHeard.textContent = 'አማርኛ (AM)';
        this.speakInstant('ቋንቋ ወደ አማርኛ ተቀይሯል። ለመግባት ይግቡ ወይም login ይበሉ።', 'am');
        return true;
      }

      const isOromoCmd = /(?<![\p{L}\p{N}])(oromiffa|oromo|afaan oromoo|switch to oromiffa|switch to oromo|change language to oromo|in oromo|select oromo|afaan oromotti|gara afaan oromootti|gara oromootti|afaan oromootti jijjiiri)(?![\p{L}\p{N}])/iu.test(text) ||
        text === 'oromo' || text === 'om' || text === 'oromiffa' || text === 'afaan oromoo';
      if (isOromoCmd) {
        this.stopSpeaking();
        this.clearWelcomeTimer();
        this.lastCommand = text;
        this.lastCommandTime = now;
        this.lastSuccessfulCommandTime = now;
        this.playChime('success');
        if (typeof applyLanguage === 'function') {
          applyLanguage('om', false);
        }
        if (window.universalGateway && window.universalGateway.isOpen) {
          window.universalGateway.selectLanguage('om');
        }
        this.setRecognitionLanguage('om');
        if (this.hudHeard) this.hudHeard.textContent = 'Afaan Oromoo (OM)';
        this.speakInstant('Afaan Oromotti jijjiirameera. Seenuuf login jedhaa.', 'om');
        return true;
      }

      const isTigrinyaCmd = /(?<![\p{L}\p{N}])(tigrinya|tigrigna|switch to tigrinya|change language to tigrinya|in tigrinya|select tigrinya|ትግርኛ|ትግርኛ ምረጽ|ቋንቋ ናብ ትግርኛ|ናብ ትግርኛ|ብትግርኛ|ናብ ትግርኛ ቀይሮ)(?![\p{L}\p{N}])/iu.test(text) ||
        text === 'tigrinya' || text === 'ti' || text === 'ትግርኛ' || text === 'tigrigna';
      if (isTigrinyaCmd) {
        this.stopSpeaking();
        this.clearWelcomeTimer();
        this.lastCommand = text;
        this.lastCommandTime = now;
        this.lastSuccessfulCommandTime = now;
        this.playChime('success');
        if (typeof applyLanguage === 'function') {
          applyLanguage('ti', false);
        }
        if (window.universalGateway && window.universalGateway.isOpen) {
          window.universalGateway.selectLanguage('ti');
        }
        this.setRecognitionLanguage('ti');
        if (this.hudHeard) this.hudHeard.textContent = 'ትግርኛ (TI)';
        this.speakInstant('ቋንቋ ናብ ትግርኛ ተቐይሩ ኣሎ። ንምእታው login ወይ እቶ በሉ።', 'ti');
        return true;
      }

      // 00-LOGIN. ACCURATE VOICE SIGN IN IN SELECTED LANGUAGE
      const isLoginTrigger = /(?<![\p{L}\p{N}])(log in|sign in|login|signin|log me in|sign me in|please log in|submit login|log in to dashboard|login to dashboard|enter|ተመዝገብ|ግባ|ይግቡ|መግቢያ|ሎግ ኢን|ሎጊን|ሳይን ኢን|ግባ ወደ ዳሽቦርድ|yigbu|igbu|egbu|yegebu|seeni|seensa|seeni gara daashboorditti|እቶ|ምእታው|ናብ ዳሽቦርድ እቶ)(?![\p{L}\p{N}])/iu.test(text) ||
        text === 'login' || text === 'log in' || text === 'sign in' || text === 'signin' ||
        text === 'ይግቡ' || text === 'ግባ' || text === 'መግቢያ' || text === 'ሎጊን' || text === 'ሎግ ኢን' ||
        text === 'seeni' || text === 'seensa' || text === 'እቶ' || text === 'ምእታው' ||
        /^click\s+(sign in|log in)$/i.test(text);

      if (isLoginTrigger && (!state.isAuthenticated || isLoginContext)) {
        this.stopSpeaking();
        this.clearWelcomeTimer();
        this.lastCommand = text;
        this.lastCommandTime = now;
        this.lastSuccessfulCommandTime = now;
        this.playChime('success');

        if (state.isAuthenticated) {
          if (this.hudHeard) this.hudHeard.textContent = 'Already logged in';
          window.location.hash = '#home';
          showPage('learning');
          switchTab('home');
          return true;
        }

        // Close Gateway modal if open
        const gatewayDialog = document.getElementById('gateway-dialog');
        if (gatewayDialog && typeof gatewayDialog.close === 'function' && gatewayDialog.open) {
          try { gatewayDialog.close(); } catch (_) {}
        }
        if (window.universalGateway && window.universalGateway.isOpen) {
          try { window.universalGateway.close(); } catch (_) {}
        }

        // Execute direct login immediately
        performDirectLogin();

        const loginMsg = currentLang === 'am' ? 'ወደ መማሪያ ዳሽቦርድ ገብተዋል።' :
                         currentLang === 'om' ? 'Gara daashboordii barumsaatti seentaniittu.' :
                         currentLang === 'ti' ? 'ናብ መምሃሪ ዳሽቦርድ ኣቲኹም ኣለኹም።' :
                         'Logged in to learning dashboard.';
        this.speakInstant(loginMsg, currentLang);
        return true;
      }

      // 00-JOB-PORTAL. OPEN STANDALONE ALX JOB PORTAL IMMEDIATELY WITHOUT POPUP BLOCKING
      const isJobPortalCmd = /(?<![\p{L}\p{N}])(job portal|jobs portal|job-portal|the job portal|open job portal|open jobs portal|open jobs|open job|go to job portal|go to jobs|show jobs|view jobs|find jobs|career portal|employment portal|job|jobs|career|careers|employment|vacancies|ስራ|ስራዎች|የስራ መድረክ|የስራ እድሎች|የስራ እድል|ስራ መድረክ|hojii|waltajjii hojii|carraa hojii|ስራሕ|ዕድላት ስራሕ|መድረኽ ስራሕ|ቦታ ስራ)(?![\p{L}\p{N}])/iu.test(text) ||
        (text.includes('job') && (text.includes('portal') || text.includes('open') || text.includes('go to') || text.includes('show') || text.includes('find'))) ||
        text.includes('የስራ መድረክ') || text.includes('የስራ እድል') || text.includes('ስራሕ') || text.includes('hojii');

      if (isJobPortalCmd) {
        this.stopSpeaking();
        this.lastCommand = text;
        this.lastCommandTime = now;
        this.lastSuccessfulCommandTime = now;
        this.playChime('success');
        if (this.hudHeard) this.hudHeard.textContent = (currentLang === 'am' ? 'የስራ መድረክ' : 'ALX Job Portal');

        const jobPortalMsg = currentLang === 'am' ? 'የስራ መድረክ እየተከፈተ ነው።' :
                             currentLang === 'om' ? 'Waltajjiin hojii banamaa jira.' :
                             currentLang === 'ti' ? 'መድረኽ ስራሕ ይኽፈት ኣሎ።' :
                             'Opening ALX Job Portal.';
        this.speakInstant(jobPortalMsg, currentLang);

        if (typeof openJobPortalStandalone === 'function') {
          openJobPortalStandalone();
        } else if (typeof window.openJobPortalStandalone === 'function') {
          window.openJobPortalStandalone();
        } else {
          window.location.assign('/job-portal/');
        }
        return true;
      }

      // 00-JOB-PASS & REJECT. PASS / REJECT JOB OPPORTUNITY
      if (/(?<![\p{L}\p{N}])(pass|reject|skip|pass job|reject job|next job|skip job|swipe left|dislike|decline|ውድቅ|ቀጣይ|እለፍ|ለፍ|ተው|didi|didii|darbi|ንጸግ|ሕለፍ)(?![\p{L}\p{N}])/iu.test(text) ||
          text === 'pass' || text === 'reject' || text === 'skip' || text === 'next' || text === 'ውድቅ' || text === 'እለፍ' || text === 'didi') {
        this.stopSpeaking();
        this.lastCommand = text;
        this.lastCommandTime = now;
        this.playChime('neutral');
        if (this.hudHeard) this.hudHeard.textContent = (currentLang === 'am' ? 'ስራ አልፏል / ውድቅ' : 'Job Passed / Rejected');

        // Forward to embedded Job Portal iframe
        const iframe = document.getElementById('jobPortalIframe');
        if (iframe && iframe.contentWindow) {
          try {
            iframe.contentWindow.postMessage({ type: 'LB_VOICE_ACTION', action: 'JOB_PASS', command: text }, '*');
          } catch (_) {}
        }
        if (window.lbVoiceBridge) {
          try { window.lbVoiceBridge.sendActionToFrame('JOB_PASS'); } catch (_) {}
        }
        if (window.app && typeof window.app.handleCardPass === 'function') {
          window.app.handleCardPass();
        }

        this.speakInstant(currentLang === 'am' ? 'ስራው አልፏል። ቀጣይ ዕድል።' : 'Passed. Next match.');
        return true;
      }

      // 00-JOB-APPLY. APPLY / SUBMIT CV FOR JOB
      if (/(?<![\p{L}\p{N}])(apply|apply now|submit application|submit cv|swipe right|accept job|apply for job|አመልክት|አመልክቺ|ማመልከቻ|iyyadhu|ኣመልክት)(?![\p{L}\p{N}])/iu.test(text) ||
          text === 'apply' || text === 'አመልክት' || text === 'iyyadhu') {
        this.stopSpeaking();
        this.lastCommand = text;
        this.lastCommandTime = now;
        this.playChime('success');
        if (this.hudHeard) this.hudHeard.textContent = (currentLang === 'am' ? 'ማመልከቻ ቀርቧል' : 'Applied with CV');

        const iframe = document.getElementById('jobPortalIframe');
        if (iframe && iframe.contentWindow) {
          try {
            iframe.contentWindow.postMessage({ type: 'LB_VOICE_ACTION', action: 'JOB_APPLY', command: text }, '*');
          } catch (_) {}
        }
        if (window.lbVoiceBridge) {
          try { window.lbVoiceBridge.sendActionToFrame('JOB_APPLY'); } catch (_) {}
        }
        if (window.app && typeof window.app.handleCardApply === 'function') {
          window.app.handleCardApply();
        }

        this.speakInstant(currentLang === 'am' ? 'ማመልከቻዎ ተልኳል።' : 'Application submitted with CV.');
        return true;
      }

      // 00-JOB-DETAILS. MORE / FULL JOB DETAILS READOUT
      if (/(?<![\p{L}\p{N}])(more details|job details|more info|tell me more|expand job|read job|ዝርዝር|ተጨማሪ መረጃ|odeeffannoo|ዝርዝር ሓበሬታ)(?![\p{L}\p{N}])/iu.test(text) ||
          text === 'more' || text === 'details' || text === 'info' || text === 'ዝርዝር') {
        this.stopSpeaking();
        this.lastCommand = text;
        this.lastCommandTime = now;
        this.playChime('success');
        if (this.hudHeard) this.hudHeard.textContent = (currentLang === 'am' ? 'የስራ ዝርዝር' : 'Job Details');

        const iframe = document.getElementById('jobPortalIframe');
        if (iframe && iframe.contentWindow) {
          try {
            iframe.contentWindow.postMessage({ type: 'LB_VOICE_ACTION', action: 'JOB_DETAILS', command: text }, '*');
          } catch (_) {}
        }
        if (window.lbVoiceBridge) {
          try { window.lbVoiceBridge.sendActionToFrame('JOB_DETAILS'); } catch (_) {}
        }
        if (window.app && typeof window.app.showCardDetailsAndRead === 'function') {
          window.app.showCardDetailsAndRead();
        }
        return true;
      }

      // 00A. EXPLICIT VOICE COMMANDS GUIDE REQUEST (Only open if user specifically asks for it!)
      if (/(?<![\\p{L}\\p{N}])(show commands|open commands|list commands|show voice commands|command guide|commands guide|የድምጽ ትዕዛዞች አሳይ|ትዕዛዞችን አሳይ|ትዕዛዞችን ዘርዝር|የድምጽ ትዕዛዞች መመሪያ|ajajoota agarsiisi|ትእዛዛት ኣርኢ)(?![\\p{L}\\p{N}])/iu.test(text)) {
        this.stopSpeaking();
        this.lastCommand = text;
        this.lastCommandTime = now;
        this.playChime('success');
        openMockup('voice-commands');
        if (this.hudHeard) this.hudHeard.textContent = (currentLang === 'am' ? 'የድምጽ ትዕዛዞች መመሪያ' : 'Voice commands guide');
        this.speak(currentLang === 'am' ? 'የድምጽ ትዕዛዞች መመሪያ ተከፍቷል።' :
                   currentLang === 'om' ? 'Qajeelfamni ajajoota sagalee banameera.' :
                   currentLang === 'ti' ? 'መምርሒ ናይ ድምጺ ትእዛዛት ተኸፊቱ ኣሎ።' :
                   'Voice commands guide opened.');
        return true;
      }

      // 00B. GENERAL HELP PROMPT (No unwanted popup modal!)
      if (/(?<![\\p{L}\\p{N}])(help|assist|እርዳታ|ሓገዝ|gargaarsa)(?![\\p{L}\\p{N}])/iu.test(text)) {
        this.stopSpeaking();
        this.lastCommand = text;
        this.lastCommandTime = now;
        this.playChime('success');
        const shortHelp = currentLang === 'am' ? 'የድምጽ ረዳቱን ለመጠቀም ማንኛውንም ትእዛዝ መናገር ይችላሉ።' :
                          currentLang === 'om' ? 'Ajaja sagalee kamiyyuu dubbachuu dandeessu.' :
                          currentLang === 'ti' ? 'ዝኾነ ናይ ድምጺ ትእዛዝ ምዝራብ ትኽእሉ ኢኹም።' :
                          'You can speak any navigation or action command directly.';
        if (this.hudHeard) this.hudHeard.textContent = shortHelp;
        this.speak(shortHelp);
        return true;
      }


      // 00A. SELECT FIRST ACCOUNT (Abenezer Habtamu - abenezer@alx.app)
      if (/(?<![\\p{L}\\p{N}])(the first|first|first one|first email|first account|number one|account one|account 1|number 1|1|one|abenezer|abenezer habtamu|አንደኛ|አንደኛው|አንደኛውን|አንደኛ ኢሜይል|ቁጥር አንድ|አንድ|አበነዘር|አቤኔዘር|tokkoffaa|tokko|ቀዳማይ|ቀዳመይቲ|ቀዳማይ ኢመይል|ሓደ)(?![\\p{L}\\p{N}])/iu.test(text)) {
        if (isLoginContext) {
          this.lastCommand = text;
          this.lastCommandTime = now;
          this.playChime('success');
          if (this.hudHeard) this.hudHeard.textContent = (currentLang === 'am' ? 'አንደኛ፡ አበነዘር' : '1. Abenezer Habtamu');
          selectAndLoginAccount(1);
          return true;
        }
      }

      // 00B. SELECT SECOND ACCOUNT (ALX Software Engineer - dev@alx.app)
      if (/(?<![\\p{L}\\p{N}])(the second|second|second one|second email|second account|number two|account two|account 2|number 2|2|two|software engineer|engineer|dev|staff|ሁለተኛ|ሁለተኛው|ሁለተኛውን|ሁለተኛ ኢሜይል|ቁጥር ሁለት|ሁለት|ኢንጂነር|ሶፍትዌር|lammaffaa|lama|ካልኣይ|ክልተ)(?![\\p{L}\\p{N}])/iu.test(text)) {
        if (isLoginContext) {
          this.lastCommand = text;
          this.lastCommandTime = now;
          this.playChime('success');
          if (this.hudHeard) this.hudHeard.textContent = (currentLang === 'am' ? 'ሁለተኛ፡ ሶፍትዌር ኢንጂነር' : '2. ALX Software Engineer');
          selectAndLoginAccount(2);
          return true;
        }
      }

      // 00C. SELECT THIRD ACCOUNT (Guest Learner - learner@alx.app)
      if (/(?<![\\p{L}\\p{N}])(the third|third|third one|third email|third account|number three|account three|account 3|number 3|3|three|guest|learner|guest learner|demo|demo account|ሶስተኛ|ሶስተኛው|ሶስተኛውን|ሶስተኛ ኢሜይል|ቁጥር ሶስት|ሶስት|እንግዳ|እንግዳ ተማሪ|sadaffaa|sadii|ሳልሳይ|ሰለስተ)(?![\\p{L}\\p{N}])/iu.test(text)) {
        if (isLoginContext) {
          this.lastCommand = text;
          this.lastCommandTime = now;
          this.playChime('success');
          if (this.hudHeard) this.hudHeard.textContent = (currentLang === 'am' ? 'ሶስተኛ፡ እንግዳ ተማሪ' : '3. Guest Learner');
          selectAndLoginAccount(3);
          return true;
        }
      }

      // 00D. SOCIAL LOGIN: GOOGLE
      if (/(?<![\\p{L}\\p{N}])(google|log in with google|sign in with google|login with google|google login|google sign in|በጉግል|በጉግል ግባ|ጉግል|google dhaan seeni|ብጉግል እቶ)(?![\\p{L}\\p{N}])/iu.test(text)) {
        this.lastCommand = text;
        this.lastCommandTime = now;
        this.playChime('success');
        if (this.hudHeard) this.hudHeard.textContent = 'Google Sign In';
        authenticateWithProvider('Google');
        return true;
      }

      // 00E. SOCIAL LOGIN: LINKEDIN
      if (/(?<![\\p{L}\\p{N}])(linkedin|log in with linkedin|sign in with linkedin|login with linkedin|linkedin login|linkedin sign in|በሊንክድኢን|በሊንክድኢን ግባ|ሊንክድኢን|linkedin dhaan seeni|ብሊንክድኢን እቶ)(?![\\p{L}\\p{N}])/iu.test(text)) {
        this.lastCommand = text;
        this.lastCommandTime = now;
        this.playChime('success');
        if (this.hudHeard) this.hudHeard.textContent = 'LinkedIn Sign In';
        authenticateWithProvider('LinkedIn');
        return true;
      }

      // 00F. SOCIAL LOGIN: FACEBOOK
      if (/(?<![\\p{L}\\p{N}])(facebook|log in with facebook|sign in with facebook|login with facebook|facebook login|facebook sign in|በፌስቡክ|በፌስቡክ ግባ|ፌስቡክ|facebook dhaan seeni|ብፌስቡክ እቶ)(?![\\p{L}\\p{N}])/iu.test(text)) {
        this.lastCommand = text;
        this.lastCommandTime = now;
        this.playChime('success');
        if (this.hudHeard) this.hudHeard.textContent = 'Facebook Sign In';
        authenticateWithProvider('Facebook');
        return true;
      }

      // 0. "WHAT DO I HAVE TODAY?" (EXACT COMMAND)
      if (/(?<![\\p{L}\\p{N}])(what do i have today|what do i have|what is today|what's today|today's schedule|today schedule|what's on my schedule|schedule today|ዛሬ ምን አለኝ|ምን አለኝ|ዛሬ|የዛሬ እቅድ|የዛሬ መርሃ ግብር|har'a maal qaba|እንታይ ኣለኒ ሎሚ|ሎሚ)(?![\\p{L}\\p{N}])/iu.test(text) ||
          (text.includes('today') && text.includes('have'))) {
        this.lastCommand = text;
        this.lastCommandTime = now;
        this.playChime('success');
        if (!isModule8Completed) {
          if (this.hudHeard) this.hudHeard.textContent = (currentLang === 'am' ? 'ሞጁል 8፡ 1 የቀረ ተግባር' : '"Module 8: Final Portfolio Integration (1 left to complete)"');
          this.speak(currentLang === 'am' ? 'ዛሬ በኤ ኤል ኤክስ 1 ሞጁል ይቀራል፡ ሞጁል 8 የመጨረሻ የፖርትፎሊዮ ቅንጅት እና የቀጥታ ማሳያ። "ስፕሪንት ቀጥል" ወይም "ቪዲዮ አጫውት" በማለት መማር ይችላሉ።' :
                     currentLang === 'om' ? 'Har\'a ALX irratti moojuliin 1 isin hafeera: Moojulii 8. "Barnoota koo" yookiin "Viidiyoo taphachiisi" jedhaa!' :
                     currentLang === 'ti' ? 'ሎሚ ኣብ ኤ ኤል ኤክስ ሓደ ሞጁል ተሪፉኩም ኣሎ፡ ሞጁል 8። "ትምህርተይ ቀጽል" ወይ "ቪድዮ ወልዕ" በሉ።' :
                     "Today on ALX Learning you have 1 module remaining: Module 8 Final Portfolio Integration & Live Demo. Say 'Continue sprint' or 'Play video' to learn!");
        } else {
          if (this.hudHeard) this.hudHeard.textContent = (currentLang === 'am' ? 'ሁሉም 8 ሞጁሎች ተጠናቀዋል!' : '"All 8 modules completed & validated!"');
          this.speak(currentLang === 'am' ? 'ሁሉም 8 የፖርትፎሊዮ ሞጁሎች መቶ በመቶ ተጠናቀዋል! ለዛሬ የሚጠበቅ ስራ የለም።' :
                     currentLang === 'om' ? 'Moojuliiwwan 8 hundi dhibbeentaa 100 xumuramaniiru! Har\'aaf hojiin hafe hin jiru.' :
                     currentLang === 'ti' ? 'ኩሎም 8 ሞጁላት ብምሉኡ ተዛዚሞም ኣለዉ! ሎሚ ዝተረፈ ስራሕ የለን።' :
                     "All 8 modules of your Full-Stack Portfolio are 100 percent completed and validated! No pending deliverables for today.");
        }
        return true;
      }

      // 0A-1. MEDIA PLAYER FULL ACCESSIBLE VOICE CONTROLS
      // Volume Up / Louder
      if (/(?<![\\p{L}\\p{N}])(volume up|increase volume|louder|sound up|turn up sound|ድምፅ ጨምር|ድምፅ ጨምርልኝ|ድምፅ ከፍ አድርግ|ድምጽ ወስኽ|ድምጺ ወስኽ|sagalee dabali|sagalee guddisi)(?![\\p{L}\\p{N}])/iu.test(text)) {
        this.lastCommand = text;
        this.lastCommandTime = now;
        this.playChime('success');
        const curVol = courseLessonVideo ? courseLessonVideo.volume : 0.8;
        const newVol = Math.min(1, curVol + 0.15);
        updateVolume(newVol);
        const pct = Math.round(newVol * 100);
        if (this.hudHeard) this.hudHeard.textContent = `Volume: ${pct}%`;
        this.speak(currentLang === 'am' ? `የቪዲዮው ድምፅ ወደ ${pct} በመቶ ጨምሯል።` :
                   currentLang === 'om' ? `Sagaleen gara dhibbeentaa ${pct}tti dabaleera.` :
                   currentLang === 'ti' ? `ናይ ቪድዮ ድምጺ ናብ ${pct} ሚእታዊት ወሲኹ ኣሎ።` :
                   `Volume increased to ${pct} percent.`);
        return true;
      }

      // Volume Down / Quieter
      if (/(?<![\\p{L}\\p{N}])(volume down|decrease volume|quieter|sound down|turn down sound|ድምፅ ቀንስ|ድምፅ ቀንሰው|ድምፅ ዝቅ አድርግ|ድምጽ ኣጉድል|ድምጺ ኣጉድል|sagalee hir'isi|sagalee xiqqeesi)(?![\\p{L}\\p{N}])/iu.test(text)) {
        this.lastCommand = text;
        this.lastCommandTime = now;
        this.playChime('success');
        const curVol = courseLessonVideo ? courseLessonVideo.volume : 0.8;
        const newVol = Math.max(0, curVol - 0.15);
        updateVolume(newVol);
        const pct = Math.round(newVol * 100);
        if (this.hudHeard) this.hudHeard.textContent = `Volume: ${pct}%`;
        this.speak(currentLang === 'am' ? `የቪዲዮው ድምፅ ወደ ${pct} በመቶ ቀንሷል።` :
                   currentLang === 'om' ? `Sagaleen gara dhibbeentaa ${pct}tti hir'ateera.` :
                   currentLang === 'ti' ? `ናይ ቪድዮ ድምጺ ናብ ${pct} ሚእታዊት ጎዲሉ ኣሎ።` :
                   `Volume decreased to ${pct} percent.`);
        return true;
      }

      // Mute Video
      if (/(?<![\\p{L}\\p{N}])(mute|mute audio|mute sound|mute video|silence|ድምፅ አጥፋ|ዝም በል|ድምፅ ዝጋ|ድምጽ ኣጥፍእ|ድምጺ ኣጥፍእ|ኣጽቅጥ|sagalee cufi|callisi)(?![\\p{L}\\p{N}])/iu.test(text)) {
        this.lastCommand = text;
        this.lastCommandTime = now;
        this.playChime('success');
        if (courseLessonVideo && !courseLessonVideo.muted) {
          toggleMuteVideo();
        }
        if (this.hudHeard) this.hudHeard.textContent = 'Muted';
        this.speak(currentLang === 'am' ? 'የቪዲዮው ድምፅ ጠፍቷል።' :
                   currentLang === 'om' ? 'Sagaleen cufameera.' :
                   currentLang === 'ti' ? 'ናይ ቪድዮ ድምጺ ጠፊኡ ኣሎ።' :
                   'Video sound muted.');
        return true;
      }

      // Unmute Video
      if (/(?<![\\p{L}\\p{N}])(unmute|unmute audio|unmute sound|unmute video|turn on sound|turn on volume|ድምፅ አብራ|ድምፅ ክፈት|ድምጽ ክፈት|ድምጺ ክፈት|ድምጺ ወልዕ|sagalee bani)(?![\\p{L}\\p{N}])/iu.test(text)) {
        this.lastCommand = text;
        this.lastCommandTime = now;
        this.playChime('success');
        if (courseLessonVideo && (courseLessonVideo.muted || courseLessonVideo.volume === 0)) {
          toggleMuteVideo();
        }
        if (this.hudHeard) this.hudHeard.textContent = 'Unmuted';
        this.speak(currentLang === 'am' ? 'የቪዲዮው ድምፅ በርቷል።' :
                   currentLang === 'om' ? 'Sagaleen banameera.' :
                   currentLang === 'ti' ? 'ናይ ቪድዮ ድምጺ ተኸፊቱ ኣሎ።' :
                   'Video sound unmuted.');
        return true;
      }

      // Seek Forward 10 seconds
      if (/(?<![\\p{L}\\p{N}])(forward 10 seconds|forward 10|skip 10 seconds|skip 10|fast forward|forward|ወደ ፊት 10 ሰከንድ|ወደ ፊት|አሳልፍ|ወደፊት|gara fuulduraatti|ናብ ቅድሚት|10 ካልኢት ናብ ቅድሚት)(?![\\p{L}\\p{N}])/iu.test(text)) {
        this.playChime('success');
        forward10();
        if (this.hudHeard) this.hudHeard.textContent = '+10s Forward';
        return true;
      }

      // Seek Backward 10 seconds
      if (/(?<![\\p{L}\\p{N}])(rewind 10 seconds|rewind 10|back 10 seconds|back 10|rewind|replay|ወደ ኋላ 10 ሰከንድ|ወደ ኋላ|መልስ|ወደኋላ|gara duubaatti|ናብ ድሕሪት|10 ካልኢት ናብ ድሕሪት)(?![\\p{L}\\p{N}])/iu.test(text)) {
        this.playChime('success');
        rewind10();
        if (this.hudHeard) this.hudHeard.textContent = '-10s Rewind';
        return true;
      }

      // Video Fullscreen (F)
      if (/(?<![\\p{L}\\p{N}])(full screen|fullscreen|maximize video|ሙሉ ስክሪን|ሙሉ ስክሪን አድርግ|iskiriinii guutuu|ምሉእ ስክሪን)(?![\\p{L}\\p{N}])/iu.test(text) &&
          !/(?<![\\p{L}\\p{N}])(exit|close|leave|ከ|ካብ)(?![\\p{L}\\p{N}])/iu.test(text)) {
        this.lastCommand = text;
        this.lastCommandTime = now;
        this.playChime('success');
        enterTheaterFullscreen();
        if (this.hudHeard) this.hudHeard.textContent = 'Full Screen View';
        this.speak(currentLang === 'am' ? 'ቪዲዮው በሙሉ ስክሪን ተከፍቷል።' :
                   currentLang === 'om' ? 'Viidiyoon iskiriinii guutuutti banameera.' :
                   currentLang === 'ti' ? 'ቪድዮ ብምሉእ ስክሪን ተኸፊቱ ኣሎ።' :
                   'Video expanded to full screen.');
        return true;
      }

      // Playback Speed
      if (/(?<![\\p{L}\\p{N}])(speed up|faster|faster playback|ፍጥነት ጨምር|በፍጥነት አጫውት|ariitii dabali)(?![\\p{L}\\p{N}])/iu.test(text)) {
        this.lastCommand = text;
        this.lastCommandTime = now;
        this.playChime('success');
        cycleSpeed(1);
        const spd = courseLessonVideo ? courseLessonVideo.playbackRate : 1;
        if (this.hudHeard) this.hudHeard.textContent = `Speed: ${spd}x`;
        this.speak(currentLang === 'am' ? `የመጫወቻ ፍጥነት ወደ ${spd} ተቀይሯል።` : `Playback speed set to ${spd}x.`);
        return true;
      }

      if (/(?<![\\p{L}\\p{N}])(slow down|slower|slower playback|ፍጥነት ቀንስ|ariitii hir'isi)(?![\\p{L}\\p{N}])/iu.test(text)) {
        this.lastCommand = text;
        this.lastCommandTime = now;
        this.playChime('success');
        cycleSpeed(-1);
        const spd = courseLessonVideo ? courseLessonVideo.playbackRate : 1;
        if (this.hudHeard) this.hudHeard.textContent = `Speed: ${spd}x`;
        this.speak(currentLang === 'am' ? `የመጫወቻ ፍጥነት ወደ ${spd} ተቀይሯል።` : `Playback speed set to ${spd}x.`);
        return true;
      }

      // Keyboard Shortcuts Help
      if (/(?<![\\p{L}\\p{N}])(keyboard shortcuts|shortcuts help|show shortcuts|keyboard help|አቋራጭ ቁልፎች|የቁልፍ ሰሌዳ|ኪቦርድ|qabduulee kiiyboordii|ናይ ኪቦርድ መሐበሪ)(?![\\p{L}\\p{N}])/iu.test(text)) {
        this.lastCommand = text;
        this.lastCommandTime = now;
        this.playChime('success');
        toggleShortcutsModal(true);
        if (this.hudHeard) this.hudHeard.textContent = 'Keyboard Shortcuts';
        this.speak(currentLang === 'am' ? 'የቁልፍ ሰሌዳ አቋራጭ መመሪያ ተከፍቷል። ስፔስ ለማጫወት፣ ኤፍ ለሙሉ ስክሪን፣ ኤም ድምፅ ለማጥፋት ያገለግላሉ።' :
                   currentLang === 'om' ? 'Qajeelfamni qabduulee kiiyboordii banameera.' :
                   currentLang === 'ti' ? 'ናይ ኪቦርድ መሐበሪ ተኸፊቱ ኣሎ።' :
                   'Opened keyboard shortcuts modal. Space to play or pause, F for full screen, M to mute.');
        return true;
      }

      // 0B. OPEN SYLLABUS / CONTINUE SPRINT
      if (/(?<![\\p{L}\\p{N}])(continue sprint|open syllabus|open course|course view|start sprint|resume sprint|syllabus|ቀጥል|ትምህርት ቀጥል|ስፕሪንት|ትምህርቴን ጀምር|ትምህርት|itti fufi|barnoota itti fufi|barnoota koo|ቀጽል|ትምህርቲ ቀጽል|ትምህርተይ)(?![\\p{L}\\p{N}])/iu.test(text)) {
        this.lastCommand = text;
        this.lastCommandTime = now;
        this.playChime('success');
        if (!state.isAuthenticated && !state.isDemoMode) {
          this.playChime('neutral');
          this.speak(currentLang === 'am' ? 'እባክዎ በመጀመሪያ ወደ መለያዎ ይግቡ ወይም የሙከራ ሁነታን ይጠቀሙ።' : 'Please sign in first to access your courses and dashboard.');
          window.location.hash = '#login';
          showPage('login');
          return true;
        }
        showPage('learning');
        window.location.hash = '#access-learning';
        switchTab('access-learning');
        openCourseWorkspace();
        if (this.hudHeard) this.hudHeard.textContent = (currentLang === 'am' ? 'ሞጁል 8 ተከፍቷል' : currentLang === 'om' ? 'Moojulii 8 banameera' : currentLang === 'ti' ? 'ሞጁል 8 ተኸፊቱ' : 'Opened Module 8 Syllabus & Video');
        this.speak(currentLang === 'am' ? 'የሞጁል 8 የትምህርት ዝርዝር እና ቪዲዮ ተከፍቷል። 1 ሞጁል ይቀራል።' :
                   currentLang === 'om' ? 'Silabasiin moojulii 8 fi viidiyoon barnootaa banameera. Moojuliin 1 hafeera.' :
                   currentLang === 'ti' ? 'ናይ ሞጁል 8 ዝርዝር ትምህርትን ቪድዮን ተኸፊቱ ኣሎ። ሓደ ሞጁል ተሪፉ።' :
                   "Opening Module 8 syllabus and video lesson. 1 module remaining.");
        return true;
      }

      // 0C. PLAY LESSON VIDEO (Strict idempotent play - never toggles to pause)
      if (/(?<![\p{L}\p{N}])(play video|start video|play lesson|video play|resume video|አጫውት|ቪዲዮ አጫውት|ጀምር|ክፈት|taphachiisi|viidiyoo taphachiisi|jalqabi|ወልዕ|ቪድዮ ወልዕ|ኣጻውት|ቪድዮ ኣጻውት)(?![\p{L}\p{N}])/iu.test(text) ||
          ((text === 'play' || text === 'አጫውት' || text === 'taphachiisi' || text === 'ወልዕ' || text === 'ኣጻውት') && (!learningCourseView || !learningCourseView.hidden))) {
        this.stopSpeaking();
        this.playChime('success');
        if (learningCourseView && learningCourseView.hidden) {
          openCourseWorkspace();
        }
        if (courseLessonVideo) {
          courseLessonVideo.play().catch(e => console.warn('Play blocked:', e));
          if (isSlActive && signLanguageVideo) {
            signLanguageVideo.currentTime = courseLessonVideo.currentTime;
            signLanguageVideo.play().catch(() => {});
          }
        }
        if (this.hudHeard) this.hudHeard.textContent = (currentLang === 'am' ? 'ቪዲዮው እየተጫወተ ነው' : currentLang === 'om' ? 'Viidiyoon taphachaa jira' : currentLang === 'ti' ? 'ቪድዮ ይፃወት ኣሎ' : 'Playing lesson video');
        return true;
      }

      // 0C-2. PAUSE LESSON VIDEO (Strict idempotent pause - never toggles to play)
      if (/(?<![\p{L}\p{N}])(pause video|stop video|pause lesson|video pause|አቁም|ቪዲዮ አቁም|ቆም|እረፍት|dhaabi|viidiyoo dhaabi|ኣዕርፍ|ቪድዮ ኣዕርፍ|ደው ኣብል|ደው)(?![\p{L}\p{N}])/iu.test(text) ||
          ((text === 'pause' || text === 'stop' || text === 'አቁም' || text === 'dhaabi' || text === 'ኣዕርፍ' || text === 'ደው') && (!learningCourseView || !learningCourseView.hidden))) {
        this.stopSpeaking();
        this.playChime('success');
        if (courseLessonVideo) {
          courseLessonVideo.pause();
          if (signLanguageVideo) signLanguageVideo.pause();
        }
        if (this.hudHeard) this.hudHeard.textContent = (currentLang === 'am' ? 'ቪዲዮው ቆሟል' : currentLang === 'om' ? 'Viidiyoon dhaabbateera' : currentLang === 'ti' ? 'ቪድዮ ደው ኢሉ' : 'Lesson video paused');
        this.speak(currentLang === 'am' ? 'ቪዲዮው ቆሟል።' :
                   currentLang === 'om' ? 'Viidiyoon dhaabbateera.' :
                   currentLang === 'ti' ? 'ቪድዮ ደው ኢሉ ኣሎ።' :
                   "Lesson video paused.");
        return true;
      }

      // 0D. COMPLETE MODULE & FINISH SPRINT
      if (/(?<![\\p{L}\\p{N}])(complete module|mark complete|finish sprint|validate module|complete lesson|ጨርስ|ሞጁል ጨርስ|አጠናቅቅ|xumuri|moojulii xumuri|ወድእ|ሞጁል ወድእ|ኣጻፍፍ)(?![\\p{L}\\p{N}])/iu.test(text)) {
        this.lastCommand = text;
        this.lastCommandTime = now;
        this.playChime('success');
        completeModule8();
        if (this.hudHeard) this.hudHeard.textContent = (currentLang === 'am' ? 'ሞጁል 8 ተጠናቋል!' : currentLang === 'om' ? 'Moojuliin 8 xumurameera!' : currentLang === 'ti' ? 'ሞጁል 8 ተወዲኡ!' : 'Module 8 Completed · 8 of 8 Validated!');
        this.speak(currentLang === 'am' ? 'እንኳን ደስ አለዎት! ሞጁል 8 ተጠናቋል። ፖርትፎሊዮዎ 100 በመቶ ተረጋግጧል!' :
                   currentLang === 'om' ? 'Baga gammaddan! Moojuliin 8 xumurameera. Pirojektii keessan dhibbeentaa 100 mirkanaa\'eera!' :
                   currentLang === 'ti' ? 'እንቋዕ ሓጎሰኩም! ሞጁል 8 ተወዲኡ ኣሎ። ፖርትፎልዮኹም ብምሉኡ ተረጋጊጹ ኣሎ!' :
                   "Congratulations! Module 8 completed. Your Full-Stack Portfolio is now 100 percent validated!");
        return true;
      }

      // 0E. RETURN TO SPRINTS
      if (/(?<![\\p{L}\\p{N}])(back to sprints|back to learning|close course|back to modules|ተመለስ|ወደ ስፕሪንቶች|ዝጋ|gara duubaatti|deebi'i|cufi|ተመለስ|ዕጸው)(?![\\p{L}\\p{N}])/iu.test(text)) {
        this.lastCommand = text;
        this.lastCommandTime = now;
        this.playChime('success');
        closeCourseWorkspace();
        if (this.hudHeard) this.hudHeard.textContent = (currentLang === 'am' ? 'ወደ ስፕሪንት ዝርዝር ተመልሰናል' : currentLang === 'om' ? 'Gara tarree ispiiriintiitti deebi\'ameera' : currentLang === 'ti' ? 'ናብ ስፕሪንት ተመሊስና' : 'Returned to Sprints list');
        this.speak(currentLang === 'am' ? 'ወደ ስፕሪንቶች ዝርዝር ተመልሰናል።' :
                   currentLang === 'om' ? 'Gara tarree ispiiriintii hundaatti deebi\'ameera.' :
                   currentLang === 'ti' ? 'ናብ ናይ ስፕሪንት ዝርዝር ተመሊስና ኣለና።' :
                   "Returned to all sprints list.");
        return true;
      }

      // 0F. SIGN LANGUAGE AUTO FULL-SCREEN & SUBTITLES VOICE CONTROLS
      if (/(?<![\\p{L}\\p{N}])(sign language|open sign language|turn on sign language|show sign language|start sign language|enable sign language|sign language full screen|fullscreen sign language|full screen sign language|ምልክት ቋንቋ|የምልክት ቋንቋ|የምልክት ቋንቋ ክፈት|afaan mallattoo|mallattoo|afaan mallattoo ban|ናይ ምልክት ቋንቋ)(?![\\p{L}\\p{N}])/iu.test(text)) {
        this.lastCommand = text;
        this.lastCommandTime = now;
        this.playChime('success');
        launchSignLanguageTheater(true);
        if (this.hudHeard) this.hudHeard.textContent = 'Sign Language & Subtitles (Full Screen)';
        this.speak(currentLang === 'am' ? 'የምልክት ቋንቋ አስተርጓሚ እና የጽሑፍ ንዑስ ርዕስ በሙሉ ስክሪን ተከፍቷል።' :
                   currentLang === 'om' ? 'Afaan mallattoo fi barreeffamni jalaa iskiriinii guutuutti banameera.' :
                   currentLang === 'ti' ? 'ናይ ምልክት ቋንቋ ኣስተርጓሚ ምስ ጽሑፍ ትርጉም ብምሉእ ስክሪን ተኸፊቱ ኣሎ።' :
                   "Launching full screen video with synchronized sign language interpreter and live subtitles.");
        return true;
      }

      if (/(?<![\\p{L}\\p{N}])(exit full screen|exit fullscreen|close full screen|exit theater|minimize video|ከሙሉ ስክሪን ውጣ|ሙሉ ስክሪን ዝጋ|አሳንስ|iskiriinii guutuu keessaa ba'i|cufi|ካብ ምሉእ ስክሪን ውጻእ|ዕጸው)(?![\\p{L}\\p{N}])/iu.test(text)) {
        this.lastCommand = text;
        this.lastCommandTime = now;
        this.playChime('success');
        exitTheaterFullscreen();
        if (this.hudHeard) this.hudHeard.textContent = 'Exited Full Screen View';
        this.speak(currentLang === 'am' ? 'ከሙሉ ስክሪን ሁነታ ወጥተናል።' :
                   currentLang === 'om' ? 'Iskiriinii guutuu keessaa baaneerra.' :
                   currentLang === 'ti' ? 'ካብ ምሉእ ስክሪን ወጺእና ኣለና።' :
                   "Exited full screen theater view.");
        return true;
      }

      if (/(?<![\\p{L}\\p{N}])(subtitles on|turn on subtitles|enable subtitles|captions on|show captions|ንዑስ ርዕስ አብራ|ንዑስ ርዕስ|ትርጉም አብራ|barreeffama jalaa ban|ሳብታይትል ወልዕ)(?![\\p{L}\\p{N}])/iu.test(text)) {
        this.lastCommand = text;
        this.lastCommandTime = now;
        this.playChime('success');
        toggleSubtitles(true);
        if (this.hudHeard) this.hudHeard.textContent = 'Subtitles ON';
        this.speak(currentLang === 'am' ? 'የጽሑፍ ንዑስ ርዕስ በርቷል።' :
                   currentLang === 'om' ? 'Barreeffamni jalaa banameera.' :
                   currentLang === 'ti' ? 'ናይ ጽሑፍ ትርጉም ተወሊዑ ኣሎ።' :
                   "Closed captions and subtitles turned on.");
        return true;
      }

      if (/(?<![\\p{L}\\p{N}])(subtitles off|turn off subtitles|disable subtitles|captions off|hide captions|ንዑስ ርዕስ አጥፋ|ትርጉም አጥፋ|barreeffama jalaa cufi|ሳብታይትል ኣጥፍእ)(?![\\p{L}\\p{N}])/iu.test(text)) {
        this.lastCommand = text;
        this.lastCommandTime = now;
        this.playChime('success');
        toggleSubtitles(false);
        if (this.hudHeard) this.hudHeard.textContent = 'Subtitles OFF';
        this.speak(currentLang === 'am' ? 'የጽሑፍ ንዑስ ርዕስ ጠፍቷል።' :
                   currentLang === 'om' ? 'Barreeffamni jalaa cufameera.' :
                   currentLang === 'ti' ? 'ናይ ጽሑፍ ትርጉም ጠፊኡ ኣሎ።' :
                   "Subtitles turned off.");
        return true;
      }

      if (/(?<![\\p{L}\\p{N}])(turn off sign language|sign language off|close sign language|hide sign language|disable sign language|ምልክት ቋንቋ ዝጋ|afaan mallattoo cufi|ናይ ምልክት ቋንቋ ዕጸው)(?![\\p{L}\\p{N}])/iu.test(text)) {
        this.lastCommand = text;
        this.lastCommandTime = now;
        this.playChime('success');
        launchSignLanguageTheater(false);
        if (this.hudHeard) this.hudHeard.textContent = 'Sign Language Closed';
        this.speak(currentLang === 'am' ? 'የምልክት ቋንቋ ሁነታ ተዘግቷል።' :
                   currentLang === 'om' ? 'Afaan mallattoo cufameera.' :
                   currentLang === 'ti' ? 'ናይ ምልክት ቋንቋ ተዓጽዩ ኣሎ።' :
                   "Sign language theater closed.");
        return true;
      }

      // 0G. BRAILLE TRANSCRIPT & TACTILE EMBOSSER VOICE CONTROLS
      if (/(?<![\\p{L}\\p{N}])(braille|open braille|show braille|braille transcript|read braille|view braille|ብሬይል|የብሬይል ጽሑፍ|bireelii|barreeffama bireelii|ናይ ብሬይል ጽሑፍ)(?![\\p{L}\\p{N}])/iu.test(text)) {
        this.lastCommand = text;
        this.lastCommandTime = now;
        this.playChime('success');
        openBrailleModal();
        if (this.hudHeard) this.hudHeard.textContent = 'Braille Transcript Opened';
        this.speak(currentLang === 'am' ? 'የብሬይል የጽሑፍ ግልባጭ ተከፍቷል። ማተም ወይም በድምጽ ማዳመጥ ይችላሉ።' :
                   currentLang === 'om' ? 'Galmeen barreeffama Bireelii banameera. Maxxansuu yookiin dhaggeeffachuu dandeessu.' :
                   currentLang === 'ti' ? 'ናይ ብሬይል ጽሑፍ ተኸፊቱ ኣሎ። ምሕታም ወይ ብድምጺ ምስማዕ ትኽእሉ ኢኹም።' :
                   "Opening Braille transcript viewer in tactile embosser mode.");
        return true;
      }

      if (/(?<![\\p{L}\\p{N}])(print braille|print in braille|embosser print|print transcript|ብሬይል አትም|አትም|bireelii maxxansi|ሕተም)(?![\\p{L}\\p{N}])/iu.test(text)) {
        this.lastCommand = text;
        this.lastCommandTime = now;
        this.playChime('success');
        printBrailleTranscript();
        if (this.hudHeard) this.hudHeard.textContent = 'Printing Braille Transcript...';
        this.speak(currentLang === 'am' ? 'የብሬይል ጽሑፍ ወደ ማተሚያው እየተላከ ነው።' :
                   currentLang === 'om' ? 'Barreeffamni Bireelii gara maxxansaatti ergamaa jira.' :
                   currentLang === 'ti' ? 'ናይ ብሬይል ጽሑፍ ናብ መሕተሚ ይልኣኽ ኣሎ።' :
                   "Sending Braille transcript to printer in tactile embosser format.");
        return true;
      }

      if (/\b(download braille|download brf|save braille)\b/.test(text)) {
        this.lastCommand = text;
        this.lastCommandTime = now;
        this.playChime('success');
        downloadBRFFile();
        if (this.hudHeard) this.hudHeard.textContent = 'Downloaded .BRF file';
        this.speak("Downloaded Braille Ready Format file for refreshable braille displays and embossers.");
        return true;
      }

      if (/\b(close braille|exit braille|hide braille|done reading)\b/.test(text)) {
        this.lastCommand = text;
        this.lastCommandTime = now;
        this.playChime('success');
        closeBrailleModal();
        if (this.hudHeard) this.hudHeard.textContent = 'Braille Closed';
        this.speak("Closed Braille viewer.");
        return true;
      }

      // 0H. MULTI-LANGUAGE VOICE CONTROLS (AMHARIC, OROMIFFA, TIGRINYA, ENGLISH)
      if (/(?<![\\p{L}\\p{N}])(amharic|switch to amharic|change language to amharic|in amharic|amharigna|አማርኛ|ቋንቋ ወደ አማርኛ|ወደ አማርኛ|በአማርኛ|አማርኛ አድርገው|ቋንቋ ቀይር ወደ አማርኛ)(?![\\p{L}\\p{N}])/iu.test(text)) {
        this.lastCommand = text;
        this.lastCommandTime = now;
        applyLanguage('am', true);
        return true;
      }

      if (/(?<![\\p{L}\\p{N}])(oromiffa|oromo|afaan oromoo|switch to oromiffa|switch to oromo|change language to oromiffa|in oromo|afaan oromotti|gara afaan oromootti|gara oromootti|afaan oromootti jijjiiri)(?![\\p{L}\\p{N}])/iu.test(text)) {
        this.lastCommand = text;
        this.lastCommandTime = now;
        applyLanguage('om', true);
        return true;
      }

      if (/(?<![\\p{L}\\p{N}])(tigrinya|tigrigna|switch to tigrinya|change language to tigrinya|in tigrinya|ትግርኛ|ቋንቋ ናብ ትግርኛ|ናብ ትግርኛ|ብትግርኛ|ናብ ትግርኛ ቀይሮ)(?![\\p{L}\\p{N}])/iu.test(text)) {
        this.lastCommand = text;
        this.lastCommandTime = now;
        applyLanguage('ti', true);
        return true;
      }

      if (/(?<![\\p{L}\\p{N}])(english|switch to english|change language to english|in english|ወደ እንግሊዝኛ|በእንግሊዝኛ|gara ingiliffaatti|ናብ እንግሊዝኛ|ብእንግሊዝኛ)(?![\\p{L}\\p{N}])/iu.test(text)) {
        this.lastCommand = text;
        this.lastCommandTime = now;
        applyLanguage('en', true);
        return true;
      }

      // 1. "PUT THIS, PUT THAT" (FORM INPUTS & VALUES)
      // A. Email Input
      if (/^(put|type|enter|set|fill)\s+(my\s+)?email(\s+as|\s+to)?\s+/i.test(text) ||
          /^email\s+(is\s+|to\s+)?/i.test(text)) {
        let val = text.replace(/^(put|type|enter|set|fill)\s+(my\s+)?email(\s+as|\s+to)?\s+/i, '')
                      .replace(/^email\s+(is\s+|to\s+)?/i, '')
                      .replace(/\s+at\s+/g, '@')
                      .replace(/\s+dot\s+/g, '.')
                      .trim();
        if (emailInput && val) {
          emailInput.value = val;
          this.lastCommand = text;
          this.lastCommandTime = now;
          this.playChime('success');
          if (this.hudHeard) this.hudHeard.textContent = `Put email: ${val}`;
          this.speak(`Email set to ${val}`);
          return true;
        }
      }

      // B. Password Input
      if (/^(put|type|enter|set|fill)\s+(my\s+)?password(\s+as|\s+to)?\s+/i.test(text) ||
          /^password\s+(is\s+|to\s+)?/i.test(text)) {
        let val = text.replace(/^(put|type|enter|set|fill)\s+(my\s+)?password(\s+as|\s+to)?\s+/i, '')
                      .replace(/^password\s+(is\s+|to\s+)?/i, '')
                      .trim();
        if (passwordInput && val) {
          passwordInput.value = val;
          this.lastCommand = text;
          this.lastCommandTime = now;
          this.playChime('success');
          if (this.hudHeard) this.hudHeard.textContent = `Put password: ${val}`;
          this.speak("Password entered");
          return true;
        }
      }

      // C. Update Name across Dashboard
      if (/^(put|set|change)\s+(my\s+)?name(\s+as|\s+to)?\s+[a-z]+/i.test(text) ||
          /^(my\s+name\s+is|call\s+me)\s+[a-z]+/i.test(text)) {
        let nameVal = text.replace(/^(put|set|change)\s+(my\s+)?name(\s+as|\s+to)?\s+/i, '')
                          .replace(/^(my\s+name\s+is|call\s+me)\s+/i, '')
                          .trim();
        if (nameVal) {
          const capName = nameVal.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
          const greetingEl = document.querySelector('.greeting-title');
          if (greetingEl) {
            greetingEl.innerHTML = `Good evening, ${capName} 👋`;
          }
          this.lastCommand = text;
          this.lastCommandTime = now;
          this.playChime('success');
          if (this.hudHeard) this.hudHeard.textContent = `Name set to: ${capName}`;
          this.speak(`Welcome, ${capName}! Name updated.`);
          return true;
        }
      }

      // D. Select Week [1-12]
      if (/(?<![\\p{L}\\p{N}])(select\s+week|week)\s+(1[0-2]|[1-9])(?![\\p{L}\\p{N}])/iu.test(text)) {
        const match = text.match(/\b(1[0-2]|[1-9])\b/);
        if (match) {
          const num = parseInt(match[0], 10);
          const pills = document.querySelectorAll('.week-pill');
          if (pills && pills[num - 1]) {
            pills[num - 1].click();
            this.lastCommand = text;
            this.lastCommandTime = now;
            this.playChime('success');
            if (this.hudHeard) this.hudHeard.textContent = `Selected Week ${num}`;
            this.speak(`Selected Week ${num}`);
            return true;
          }
        }
      }

      // 2. "GO TO EVERYWHERE" (UNIVERSAL TAB & PAGE NAVIGATION - AUTH PROTECTED)
      // Home
      if (/(?<![\p{L}\p{N}])(go to home|open home|home tab|home dashboard|show home|home|dashboard|go to dashboard|open dashboard|መነሻ|ወደ መነሻ|መነሻ ገጽ|ዳሽቦርድ|ወደ ዳሽቦርድ|fuula duraa|gara fuula duraatti|daashboordii|gara daashboordiitti|ቀንዲ ገጽ|ናብ ቀንዲ ገጽ)(?![\p{L}\p{N}])/iu.test(text)) {
        this.lastCommand = text;
        this.lastCommandTime = now;
        if (!state.isAuthenticated && !state.isDemoMode) {
          this.playChime('neutral');
          this.speak(currentLang === 'am' ? 'እባክዎ በመጀመሪያ ወደ መለያዎ ይግቡ ወይም የሙከራ ሁነታን ይጠቀሙ።' : 'Please sign in first to access your dashboard.');
          window.location.hash = '#login';
          showPage('login');
          return true;
        }
        this.playChime('success');
        showPage('learning');
        window.location.hash = '#home';
        switchTab('home');
        if (this.hudHeard) this.hudHeard.textContent = (currentLang === 'am' ? 'መነሻ ገጽ ተከፍቷል' : currentLang === 'om' ? 'Fuula duraa banameera' : currentLang === 'ti' ? 'ቀንዲ ገጽ ተኸፊቱ' : 'Navigated to Home');
        this.speak(currentLang === 'am' ? 'የመነሻ ዳሽቦርድ ተከፍቷል።' :
                   currentLang === 'om' ? 'Fuula duraa banameera.' :
                   currentLang === 'ti' ? 'ቀንዲ ገጽ ተኸፊቱ ኣሎ።' :
                   "Opening Home dashboard.");
        return true;
      }

      // Access My Learning / Start Learning
      if (/(?<![\p{L}\p{N}])(go to access learning|access my learning|access learning|start learning|start my learning|open access learning|open learning|learning tab|curriculum|my learning|learning|ትምህርት|ትምህርቴን ጀምር|መማር ጀምር|ትምህርቴ|ወደ ትምህርት|አክሰስ ለርኒንግ|ለርኒንግ|barnoota koo|gara barnootaatti|barumsa eegali|barumsa|barnoota|ትምህርተይ|ትምህርተይ ጀምር|ናብ ትምህርተይ|ትምህርቲ|ምምሃር ጀምር)(?![\p{L}\p{N}])/iu.test(text)) {
        this.lastCommand = text;
        this.lastCommandTime = now;
        this.playChime('success');
        if (!state.isAuthenticated && !state.isDemoMode) {
          this.playChime('neutral');
          this.speak(currentLang === 'am' ? 'እባክዎ በመጀመሪያ ወደ መለያዎ ይግቡ ወይም የሙከራ ሁነታን ይጠቀሙ።' : 'Please sign in first to access your courses and dashboard.');
          window.location.hash = '#login';
          showPage('login');
          return true;
        }
        showPage('learning');
        window.location.hash = '#access-learning';
        switchTab('access-learning');
        if (this.hudHeard) this.hudHeard.textContent = (currentLang === 'am' ? 'ትምህርት ገጽ ተከፍቷል' : currentLang === 'om' ? 'Gara barnootaatti deemameera' : currentLang === 'ti' ? 'ናብ ትምህርተይ ተኸፊቱ' : 'Navigated to Access Learning');
        this.speak(currentLang === 'am' ? 'የስርዓተ ትምህርት ገጽ ተከፍቷል።' :
                   currentLang === 'om' ? 'Kutaan barnootaa banameera.' :
                   currentLang === 'ti' ? 'ናይ ትምህርተይ ገጽ ተኸፊቱ ኣሎ።' :
                   "Opening Access Learning.");
        return true;
      }

      // Planning
      if (/(?<![\p{L}\p{N}])(go to planning|open planning|my planning|planning tab|calendar|schedule|planning|እቅድ|ዕቅድ|የእኔ ዕቅድ|የእኔ እቅድ|ዕቅዴ|እቅዴ|የእቅድ ገጽ|ቀን መቁጠሪያ|karoora|karoora koo|መደብ|መደበይ|ናይ መደብ ገጽ)(?![\p{L}\p{N}])/iu.test(text)) {
        this.lastCommand = text;
        this.lastCommandTime = now;
        this.playChime('success');
        if (!state.isAuthenticated && !state.isDemoMode) {
          this.playChime('neutral');
          this.speak(currentLang === 'am' ? 'እባክዎ በመጀመሪያ ወደ መለያዎ ይግቡ ወይም የሙከራ ሁነታን ይጠቀሙ።' : 'Please sign in first to access your courses and dashboard.');
          window.location.hash = '#login';
          showPage('login');
          return true;
        }
        showPage('learning');
        window.location.hash = '#planning';
        switchTab('planning');
        if (this.hudHeard) this.hudHeard.textContent = (currentLang === 'am' ? 'የእቅድ ገጽ' : currentLang === 'om' ? 'Karoora' : currentLang === 'ti' ? 'መደብ' : 'Navigated to Planning');
        this.speak(currentLang === 'am' ? 'የሳምንታዊ እቅድ እና የቀን መቁጠሪያ ገጽ ተከፍቷል።' :
                   currentLang === 'om' ? 'Karoorri torbanii banameera.' :
                   currentLang === 'ti' ? 'ናይ መደብ ገጽ ተኸፊቱ ኣሎ።' :
                   "Opening Planning schedule.");
        return true;
      }

      // Projects
      if (/(?<![\p{L}\p{N}])(go to projects|open projects|my projects|projects tab|projects|ፕሮጀክቶች|የእኔ ፕሮጀክት|pirojektii|pirojektoota|pirojeektii|pirojeektii koo|ፕሮጀክትታት|ፕሮጀክተይ)(?![\p{L}\p{N}])/iu.test(text)) {
        this.lastCommand = text;
        this.lastCommandTime = now;
        this.playChime('success');
        if (!state.isAuthenticated && !state.isDemoMode) {
          this.playChime('neutral');
          this.speak(currentLang === 'am' ? 'እባክዎ በመጀመሪያ ወደ መለያዎ ይግቡ ወይም የሙከራ ሁነታን ይጠቀሙ።' : 'Please sign in first to access your courses and dashboard.');
          window.location.hash = '#login';
          showPage('login');
          return true;
        }
        showPage('learning');
        window.location.hash = '#projects';
        switchTab('projects');
        if (this.hudHeard) this.hudHeard.textContent = (currentLang === 'am' ? 'ፕሮጀክቶች' : currentLang === 'om' ? 'Pirojeektii' : currentLang === 'ti' ? 'ፕሮጀክትታት' : 'Navigated to Projects');
        this.speak(currentLang === 'am' ? 'የሶፍትዌር ኢንጂነሪንግ ፕሮጀክቶች ተከፍተዋል።' :
                   currentLang === 'om' ? 'Pirojektoonni banamaniiru.' :
                   currentLang === 'ti' ? 'ናይ ፕሮጀክትታት ገጽ ተኸፊቱ ኣሎ።' :
                   "Opening Projects.");
        return true;
      }

      // Quizzes
      if (/(?<![\p{L}\p{N}])(go to quizzes|open quizzes|quizzes tab|evaluation quizzes|tests|assessments|quizzes|ፈተናዎች|ጥያቄዎች|qormaata|qormaatawwan|gaaffilee|ፈተናታት|ፈተናታተይ|ሕቶታት)(?![\p{L}\p{N}])/iu.test(text)) {
        this.lastCommand = text;
        this.lastCommandTime = now;
        this.playChime('success');
        if (!state.isAuthenticated && !state.isDemoMode) {
          this.playChime('neutral');
          this.speak(currentLang === 'am' ? 'እባክዎ በመጀመሪያ ወደ መለያዎ ይግቡ ወይም የሙከራ ሁነታን ይጠቀሙ።' : 'Please sign in first to access your courses and dashboard.');
          window.location.hash = '#login';
          showPage('login');
          return true;
        }
        showPage('learning');
        window.location.hash = '#quizzes';
        switchTab('quizzes');
        if (this.hudHeard) this.hudHeard.textContent = (currentLang === 'am' ? 'ፈተናዎች' : currentLang === 'om' ? 'Qormaata' : currentLang === 'ti' ? 'ፈተናታት' : 'Navigated to Quizzes');
        this.speak(currentLang === 'am' ? 'የፈተናዎች እና የግምገማ ገጽ ተከፍቷል።' :
                   currentLang === 'om' ? 'Qormaanni banameera.' :
                   currentLang === 'ti' ? 'ናይ ፈተናታት ገጽ ተኸፊቱ ኣሎ።' :
                   "Opening Evaluation Quizzes.");
        return true;
      }

      // Courses
      if (/(?<![\\p{L}\\p{N}])(go to courses|open courses|my courses|courses tab|courses|ኮርሶች|የትምህርት ዓይነቶች|koorsii|koorsiiwwan|ኮርሳት)(?![\\p{L}\\p{N}])/iu.test(text)) {
        this.lastCommand = text;
        this.lastCommandTime = now;
        this.playChime('success');
        if (!state.isAuthenticated && !state.isDemoMode) {
          this.playChime('neutral');
          this.speak(currentLang === 'am' ? 'እባክዎ በመጀመሪያ ወደ መለያዎ ይግቡ ወይም የሙከራ ሁነታን ይጠቀሙ።' : 'Please sign in first to access your courses and dashboard.');
          window.location.hash = '#login';
          showPage('login');
          return true;
        }
        showPage('learning');
        window.location.hash = '#courses';
        switchTab('courses');
        if (this.hudHeard) this.hudHeard.textContent = (currentLang === 'am' ? 'ኮርሶች' : currentLang === 'om' ? 'Koorsiiwwan' : currentLang === 'ti' ? 'ኮርሳት' : 'Navigated to Courses');
        this.speak(currentLang === 'am' ? 'የተመዘገቡባቸው ኮርሶች ተከፍተዋል።' :
                   currentLang === 'om' ? 'Koorsiiwwan keessan banamaniiru.' :
                   currentLang === 'ti' ? 'ዝተመዝገብኩምሎም ኮርሳት ተኸፊቶም ኣለዉ።' :
                   "Opening My Courses.");
        return true;
      }

      // Concepts
      if (/(?<![\\p{L}\\p{N}])(go to concepts|open concepts|concepts tab|concepts|ጽንሰ ሀሳቦች|ጽንሰ ሃሳብ|yaad-hiddama|hubannoo|ፅንሰ ሓሳባት)(?![\\p{L}\\p{N}])/iu.test(text)) {
        this.lastCommand = text;
        this.lastCommandTime = now;
        this.playChime('success');
        if (!state.isAuthenticated && !state.isDemoMode) {
          this.playChime('neutral');
          this.speak(currentLang === 'am' ? 'እባክዎ በመጀመሪያ ወደ መለያዎ ይግቡ ወይም የሙከራ ሁነታን ይጠቀሙ።' : 'Please sign in first to access your courses and dashboard.');
          window.location.hash = '#login';
          showPage('login');
          return true;
        }
        showPage('learning');
        window.location.hash = '#concepts';
        switchTab('concepts');
        if (this.hudHeard) this.hudHeard.textContent = (currentLang === 'am' ? 'ጽንሰ ሀሳቦች' : currentLang === 'om' ? 'Yaad-hiddama' : currentLang === 'ti' ? 'ፅንሰ ሓሳባት' : 'Navigated to Concepts');
        this.speak(currentLang === 'am' ? 'የፅንሰ ሀሳቦች ቤተ መጻሕፍት ተከፍቷል።' :
                   currentLang === 'om' ? 'Kuusaan yaad-hiddamaa banameera.' :
                   currentLang === 'ti' ? 'ቤተ መጻሕፍቲ ፅንሰ ሓሳባት ተኸፊቱ ኣሎ።' :
                   "Opening Concepts library.");
        return true;
      }

      // VOD
      if (/(?<![\\p{L}\\p{N}])(go to video on demand|video on demand|vod tab|vod|videos|recorded sessions|ቪዲዮዎች|የተቀረጹ|viidiyoo|ቪድዮታት)(?![\\p{L}\\p{N}])/iu.test(text)) {
        this.lastCommand = text;
        this.lastCommandTime = now;
        this.playChime('success');
        if (!state.isAuthenticated && !state.isDemoMode) {
          this.playChime('neutral');
          this.speak(currentLang === 'am' ? 'እባክዎ በመጀመሪያ ወደ መለያዎ ይግቡ ወይም የሙከራ ሁነታን ይጠቀሙ።' : 'Please sign in first to access your courses and dashboard.');
          window.location.hash = '#login';
          showPage('login');
          return true;
        }
        showPage('learning');
        window.location.hash = '#vod';
        switchTab('vod');
        if (this.hudHeard) this.hudHeard.textContent = 'Navigated to VOD';
        this.speak(currentLang === 'am' ? 'የቪዲዮ ክፍለ ጊዜዎች ተከፍተዋል።' :
                   currentLang === 'om' ? 'Viidiyoowwan banamaniiru.' :
                   currentLang === 'ti' ? 'ናይ ቪድዮታት ክፍሊ ተኸፊቱ ኣሎ።' :
                   "Opening Video on demand.");
        return true;
      }

      // Profile
      if (/(?<![\\p{L}\\p{N}])(go to profile|open profile|my profile|profile tab|account settings|profile|መገለጫ|የእኔ መገለጫ|መረጃ|piroofayilii|profaayilii|መግለፂ|ፕሮፋይል)(?![\\p{L}\\p{N}])/iu.test(text)) {
        this.lastCommand = text;
        this.lastCommandTime = now;
        this.playChime('success');
        if (!state.isAuthenticated && !state.isDemoMode) {
          this.playChime('neutral');
          this.speak(currentLang === 'am' ? 'እባክዎ በመጀመሪያ ወደ መለያዎ ይግቡ ወይም የሙከራ ሁነታን ይጠቀሙ።' : 'Please sign in first to access your courses and dashboard.');
          window.location.hash = '#login';
          showPage('login');
          return true;
        }
        showPage('learning');
        window.location.hash = '#profile';
        switchTab('profile');
        if (this.hudHeard) this.hudHeard.textContent = (currentLang === 'am' ? 'መገለጫ' : currentLang === 'om' ? 'Piroofayilii' : currentLang === 'ti' ? 'መግለፂ' : 'Navigated to My Profile');
        this.speak(currentLang === 'am' ? 'የተጠቃሚ መገለጫ እና ቅንብሮች ገጽ ተከፍቷል።' :
                   currentLang === 'om' ? 'Piroofayiliin keessan banameera.' :
                   currentLang === 'ti' ? 'ናይ መግለፂኹም ገጽ ተኸፊቱ ኣሎ።' :
                   "Opening My Profile.");
        return true;
      }

      // 3. "DO THIS AND DO THAT" (ACTIONS & CONTROLS)
      // Sign out / Log out
      if (/(?<![\\p{L}\\p{N}])(sign out|log out|exit|leave platform|ውጣ|ተሰናበት|መለያ ዝጋ|ba'i|akkawuntii cufi|ውጻእ|ዕጸው)(?![\\p{L}\\p{N}])/iu.test(text)) {
        this.lastCommand = text;
        this.lastCommandTime = now;
        this.playChime('success');
        state.isAuthenticated = false;
        window.location.hash = '#login';
        showPage('login');
        if (this.hudHeard) this.hudHeard.textContent = (currentLang === 'am' ? 'ወጥተዋል' : currentLang === 'om' ? 'Baataniittu' : currentLang === 'ti' ? 'ወጺእኩም' : 'Signed out');
        this.speak(currentLang === 'am' ? 'ከመለያዎ ወጥተዋል፣ ወደ መግቢያ ገጽ ተመልሰናል።' :
                   currentLang === 'om' ? 'Baataniittu. Gara fuula seensaatti deebineerra.' :
                   currentLang === 'ti' ? 'ካብቲ መድረኽ ወጺእኩም ኣለኹም።' :
                   "Signed out. Returned to landing page.");
        return true;
      }

      // Resume Lesson / Play
      if (/(?<![\\p{L}\\p{N}])(resume|resume lesson|start lesson|continue learning|ቀጥል|ትምህርት ጀምር|ትምህርት ቀጥል|itti fufi|ቀጽል)(?![\\p{L}\\p{N}])/iu.test(text)) {
        this.lastCommand = text;
        this.lastCommandTime = now;
        this.playChime('success');
        const resumeBtn = document.querySelector('.btn-resume-red');
        if (resumeBtn) resumeBtn.click();
        if (this.hudHeard) this.hudHeard.textContent = (currentLang === 'am' ? 'ትምህርት ቀጥሏል' : 'Resumed lesson');
        this.speak(currentLang === 'am' ? 'የፖርትፎሊዮ ትምህርትዎ ቀጥሏል።' : "Resuming your Portfolio Requirements lesson.");
        return true;
      }

      // View Milestone
      if (/(?<![\\p{L}\\p{N}])(view milestone|milestone|milestone details|የስራ ዝርዝር|ማይልስቶን|የሳምንት 12 ስራ|sadarkaa)(?![\\p{L}\\p{N}])/iu.test(text)) {
        this.lastCommand = text;
        this.lastCommandTime = now;
        this.playChime('success');
        const viewBtns = document.querySelectorAll('.deliverable-item .btn-outline-red');
        if (viewBtns && viewBtns[0]) viewBtns[0].click();
        if (this.hudHeard) this.hudHeard.textContent = (currentLang === 'am' ? 'ሳምንት 12 የስራ ዝርዝር' : 'Viewing Week 12 Milestone');
        this.speak(currentLang === 'am' ? 'የሳምንት 12 የስራ ዝርዝር ተከፍቷል። ሁሉም ተግባራት ተጠናቀዋል!' : "Opening Week 12 Milestone: All tasks completed!");
        return true;
      }

      // View Test
      if (/(?<![\\p{L}\\p{N}])(view test|take test|test details|ፈተና ተመልከት|የሳምንት ፈተና|qormaata torbanii)(?![\\p{L}\\p{N}])/iu.test(text)) {
        this.lastCommand = text;
        this.lastCommandTime = now;
        this.playChime('success');
        const viewBtns = document.querySelectorAll('.deliverable-item .btn-outline-red');
        if (viewBtns && viewBtns[1]) viewBtns[1].click();
        if (this.hudHeard) this.hudHeard.textContent = (currentLang === 'am' ? 'ሳምንት 12 ፈተና' : 'Viewing Week 12 Test');
        this.speak(currentLang === 'am' ? 'የሳምንት 12 ፈተና ውጤት ተከፍቷል። ሁሉም ጥያቄዎች ተመልሰዋል!' : "Opening Week 12 Test: All questions answered!");
        return true;
      }

      // Certificate of Completion
      if (/(?<![\\p{L}\\p{N}])(certificate|view certificate|show certificate|open certificate|my certificate|የምስክር ወረቀት|ሰርተፊኬት|የምስክር ወረቀት አሳይ|ሰርተፊኬት ተመልከት|waraqaa ragaa|ragaa eebbisaa|ናይ ምስክር ወረቐት|ሰርቲፊኬት)(?![\\p{L}\\p{N}])/iu.test(text)) {
        this.lastCommand = text;
        this.lastCommandTime = now;
        this.playChime('success');
        const certBtn = document.getElementById('btnViewFoundationsCert');
        if (certBtn) certBtn.click();
        else openMockup('certificate');
        if (this.hudHeard) this.hudHeard.textContent = (currentLang === 'am' ? 'የምስክር ወረቀት' : 'Viewing Official Certificate');
        this.speak(currentLang === 'am' ? 'የተረጋገጠ ይፋዊ የምስክር ወረቀት ተከፍቷል።' :
                   currentLang === 'om' ? 'Waraqaan ragaa eebbisaa banameera.' :
                   currentLang === 'ti' ? 'ናይ ምስክር ወረቐት ተኸፊቱ ኣሎ።' :
                   'Opening Official Certificate of Completion.');
        return true;
      }

      // Defense Call
      if (/(?<![\\p{L}\\p{N}])(defense call|join defense call|defense room|join call|start defense|live defense|ዲፌንስ ጥሪ|ጥሪ ተቀላቀል|ዲፌንስ|የቀጥታ ጥሪ|waamicha dhiyeessaa|waamicha seeni|ናይ ምክልኻል ጻውዒት|ጻውዒት ተጸንበር)(?![\\p{L}\\p{N}])/iu.test(text)) {
        this.lastCommand = text;
        this.lastCommandTime = now;
        this.playChime('success');
        const defBtn = document.getElementById('btnJoinDefenseCall');
        if (defBtn) defBtn.click();
        else openMockup('defense-call');
        if (this.hudHeard) this.hudHeard.textContent = (currentLang === 'am' ? 'ዲፌንስ ክፍል ተቀላቅለዋል' : 'Joined Defense Room');
        this.speak(currentLang === 'am' ? 'ወደ የቀጥታ የፕሮጀክት መከላከያ ክፍል ገብተዋል።' :
                   currentLang === 'om' ? 'Kutaa dhiyeessaa pirojektiitti seentaniittu.' :
                   currentLang === 'ti' ? 'ናብ ናይ ፕሮጀክት መከላኸሊ ክፍሊ ኣቲኹም ኣለኹም።' :
                   'Joining Live Technical Defense Room.');
        return true;
      }

      // Inspect Projects: Simple Shell, Portfolio, AirBnB, Web Stack
      if (/(?<![\\p{L}\\p{N}])(simple shell|inspect simple shell|inspect shell|shell project|ሲምፕል ሼል|ሼል|መርምር|qoradhu|መርምሮ)(?![\\p{L}\\p{N}])/iu.test(text)) {
        this.lastCommand = text;
        this.lastCommandTime = now;
        this.playChime('success');
        const shellBtn = document.getElementById('btnInspectShell');
        if (shellBtn) shellBtn.click();
        else openMockup('inspect-project', 'Simple Shell - Unix CLI Interpreter');
        if (this.hudHeard) this.hudHeard.textContent = 'Simple Shell (98.4%)';
        this.speak(currentLang === 'am' ? 'የሲምፕል ሼል ፕሮጀክት ዝርዝር ተከፍቷል። ውጤት 98.4 በመቶ።' :
                   'Inspecting Simple Shell Unix CLI interpreter project, validated at 98.4 percent.');
        return true;
      }

      if (/(?<![\\p{L}\\p{N}])(inspect portfolio|portfolio project|ፖርትፎሊዮ ፕሮጀክት|ፖርትፎሊዮ መርምር)(?![\\p{L}\\p{N}])/iu.test(text)) {
        this.lastCommand = text;
        this.lastCommandTime = now;
        this.playChime('success');
        const pBtn = document.getElementById('btnInspectPortfolio');
        if (pBtn) pBtn.click();
        else openMockup('inspect-project', 'Portfolio Project - SWE');
        if (this.hudHeard) this.hudHeard.textContent = 'Portfolio Project (100%)';
        this.speak(currentLang === 'am' ? 'የሶፍትዌር ኢንጂነሪንግ ፖርትፎሊዮ ፕሮጀክት ተከፍቷል።' : 'Inspecting Portfolio Project.');
        return true;
      }

      if (/(?<![\\p{L}\\p{N}])(airbnb|air bnb|inspect airbnb|ኤርቢኤንቢ)(?![\\p{L}\\p{N}])/iu.test(text)) {
        this.lastCommand = text;
        this.lastCommandTime = now;
        this.playChime('success');
        const aBtn = document.getElementById('btnInspectAirbnb');
        if (aBtn) aBtn.click();
        else openMockup('inspect-project', 'AirBnB Clone - The Console & REST API');
        if (this.hudHeard) this.hudHeard.textContent = 'AirBnB Clone (95.2%)';
        this.speak(currentLang === 'am' ? 'የኤርቢኤንቢ ክሎን ፕሮጀክት ተከፍቷል።' : 'Inspecting AirBnB Clone project.');
        return true;
      }

      if (/(?<![\\p{L}\\p{N}])(web stack|debugging|inspect web stack|ዌብ ስታክ)(?![\\p{L}\\p{N}])/iu.test(text)) {
        this.lastCommand = text;
        this.lastCommandTime = now;
        this.playChime('success');
        openMockup('inspect-project', 'Web Stack Debugging #4');
        if (this.hudHeard) this.hudHeard.textContent = 'Web Stack Debugging (100%)';
        this.speak(currentLang === 'am' ? 'የዌብ ስታክ ዲበጊንግ ፕሮጀክት ተከፍቷል።' : 'Inspecting Web Stack Debugging project.');
        return true;
      }

      // Review Quiz / Quiz Results
      if (/(?<![\\p{L}\\p{N}])(review quiz|quiz review|review answers|inspect quiz|check quiz|ፈተና ከልስ|መልሶችን ከልስ|ፈተና መርምር|qormaata irra deebi'i|ፈተና ርአ)(?![\\p{L}\\p{N}])/iu.test(text)) {
        this.lastCommand = text;
        this.lastCommandTime = now;
        this.playChime('success');
        const qBtn = document.querySelector('[data-mockup="review-quiz"]');
        if (qBtn) qBtn.click();
        else openMockup('review-quiz');
        if (this.hudHeard) this.hudHeard.textContent = (currentLang === 'am' ? 'የፈተና መልሶች ተከፍተዋል' : 'Reviewing Quiz Answers');
        this.speak(currentLang === 'am' ? 'የፈተና መልሶች እና ግምገማ ተከፍቷል።' :
                   currentLang === 'om' ? 'Qormaanni irra deebi\'amee banameera.' :
                   currentLang === 'ti' ? 'ናይ ፈተና መልሲታት ተኸፊቱ ኣሎ።' :
                   'Reviewing evaluation quiz answers.');
        return true;
      }

      // See score details
      if (/(?<![\\p{L}\\p{N}])(see score details|score details|check score|my score|overall score|ውጤት ተመልከት|የውጤት ዝርዝር|ውጤቴ ስንት ነው|ውጤት|qabxii koo|ናይ ውጽኢት ዝርዝር|ውጽኢት)(?![\\p{L}\\p{N}])/iu.test(text)) {
        this.lastCommand = text;
        this.lastCommandTime = now;
        this.playChime('success');
        const scoreBtn = document.getElementById('btnSeeScoreDetails') || document.querySelector('.bottom-card .btn-card-outline-action');
        if (scoreBtn) scoreBtn.click();
        else openMockup('score-details');
        if (this.hudHeard) this.hudHeard.textContent = 'Score details: 92.74%';
        this.speak(currentLang === 'am' ? 'አጠቃላይ ውጤትዎ 92.74 በመቶ ነው። 100 በመቶ በትክክለኛው መንገድ ላይ ነዎት!' :
                   currentLang === 'om' ? 'Qabxiin keessan waliigalaa dhibbeentaa 92.74 dha. Hojii gaarii!' :
                   currentLang === 'ti' ? 'ሓፈሻዊ ውጽኢትኩም 92.74 ሚእታዊት እዩ። ብጣዕሚ ጽቡቕ!' :
                   "Overall score is 92.74 percent. You are 100 percent on track!");
        return true;
      }

      // See all events
      if (/(?<![\\p{L}\\p{N}])(see all events|all events|events|upcoming events|my events|calendar events|ቀጣይ ዝግጅቶች|ሁነቶች|ሁነቶችን ተመልከት|ዝግጅቶች|taateewwan|ሁነታት)(?![\\p{L}\\p{N}])/iu.test(text)) {
        this.lastCommand = text;
        this.lastCommandTime = now;
        this.playChime('success');
        const evBtn = document.getElementById('btnSeeAllEvents');
        if (evBtn) evBtn.click();
        else openMockup('all-events');
        if (this.hudHeard) this.hudHeard.textContent = (currentLang === 'am' ? 'ቀጣይ ዝግጅቶች' : 'Viewing Upcoming Events');
        this.speak(currentLang === 'am' ? 'የቀን መቁጠሪያ ዝግጅቶች ተከፍተዋል። ለጊዜው አዲስ ዝግጅት የለም።' :
                   currentLang === 'om' ? 'Taateewwan fuula duraa banamaniiru.' :
                   currentLang === 'ti' ? 'ናይ ቀጻሊ ሁነታት ተኸፊቱ ኣሎ።' :
                   "No upcoming events scheduled for this period.");
        return true;
      }

      // Preview Syllabus / Next Sprint
      if (/(?<![\\p{L}\\p{N}])(preview syllabus|next sprint|upcoming syllabus|preview next sprint|ቀጣይ ስፕሪንት|የስርዓተ ትምህርት ቅድመ ዕይታ|ቀጣይ ሳምንት|ispiiriintii itti aanu|ቀጻሊ ስፕሪንት)(?![\\p{L}\\p{N}])/iu.test(text)) {
        this.lastCommand = text;
        this.lastCommandTime = now;
        this.playChime('success');
        const prevBtn = document.getElementById('btnPreviewSyllabus');
        if (prevBtn) prevBtn.click();
        else openMockup('preview-syllabus');
        if (this.hudHeard) this.hudHeard.textContent = (currentLang === 'am' ? 'የቀጣይ ስፕሪንት ቅድመ ዕይታ' : 'Previewing Next Sprint');
        this.speak(currentLang === 'am' ? 'የቀጣዩ ስፕሪንት የሲስተምስ ኢንጂነሪንግ ስርዓተ ትምህርት ቅድመ ዕይታ ተከፍቷል።' :
                   currentLang === 'om' ? 'Silabasiin ispiiriintii itti aanu banameera.' :
                   currentLang === 'ti' ? 'ናይ ቀጻሊ ስፕሪንት ዝርዝር ትምህርቲ ተኸፊቱ ኣሎ።' :
                   'Previewing upcoming Systems Engineering & DevOps syllabus.');
        return true;
      }

      // Read Concept
      if (/(?<![\\p{L}\\p{N}])(read concept|concept details|open concept|ፅንሰ ሀሳብ አንብብ|ፅንሰ ሀሳብ|ጽንሰ ሃሳብ|yaad-hiddama dubbisi|ፅንሰ ሓሳብ)(?![\\p{L}\\p{N}])/iu.test(text)) {
        this.lastCommand = text;
        this.lastCommandTime = now;
        this.playChime('success');
        const cBtn = document.querySelector('[data-mockup="read-concept"]');
        if (cBtn) cBtn.click();
        else openMockup('read-concept');
        if (this.hudHeard) this.hudHeard.textContent = (currentLang === 'am' ? 'ፅንሰ ሀሳብ ንባብ' : 'Reading Concept Guide');
        this.speak(currentLang === 'am' ? 'የቴክኒክ ፅንሰ ሀሳብ ንባብ መመሪያ ተከፍቷል።' :
                   currentLang === 'om' ? 'Qajeelfamni yaad-hiddamaa banameera.' :
                   currentLang === 'ti' ? 'ናይ ፅንሰ ሓሳብ መሐበሪ ተኸፊቱ ኣሎ።' :
                   'Opening technical concept guide.');
        return true;
      }

      // Watch Recording
      if (/(?<![\\p{L}\\p{N}])(watch recording|recorded session|watch video|play recording|ቪዲዮ ተመልከት|የተቀረጸ ቪዲዮ|የቀረጻ ክፍለ ጊዜ|viidiyoo waraabame|ቪድዮ ርአ)(?![\\p{L}\\p{N}])/iu.test(text)) {
        this.lastCommand = text;
        this.lastCommandTime = now;
        this.playChime('success');
        const recBtn = document.querySelector('[data-mockup="watch-recording"]');
        if (recBtn) recBtn.click();
        else openMockup('watch-recording');
        if (this.hudHeard) this.hudHeard.textContent = (currentLang === 'am' ? 'የተቀረጸ ቪዲዮ' : 'Watching Workshop Recording');
        this.speak(currentLang === 'am' ? 'የተቀረጸው የቴክኒካል ወርክሾፕ ቪዲዮ ተከፍቷል።' :
                   currentLang === 'om' ? 'Viidiyoon waraabbii banameera.' :
                   currentLang === 'ti' ? 'ዝተቐርጸ ናይ ወርክሾፕ ቪድዮ ተኸፊቱ ኣሎ።' :
                   'Opening technical workshop recording.');
        return true;
      }

      // Where Am I / Status (Multi-Language: English, Amharic, Afaan Oromoo, Tigrinya)
      if (/(?<![\\p{L}\\p{N}])(where am i|what page|current page|which page|my location|my status|የት ነው ያለሁት|የት ነኝ|የት ገጽ|ያለሁበት ገጽ|የኔ ሁኔታ|eessa jiran|eessan jira|eessa jirra|fuula kami|fuula kam|haala koo|ኣበይ ኣለኹ|ኣበይ ኣለና|ኣየናይ ገጽ|ኣበይ እየ ዘለኹ|ኩነታተይ)(?![\\p{L}\\p{N}])/iu.test(text)) {
        this.lastCommand = text;
        this.lastCommandTime = now;
        this.playChime('success');
        
        let statusMsg = '';
        const h = (window.location.hash || '').toLowerCase();
        
        if (!state.isAuthenticated) {
          if (currentLang === 'am') statusMsg = 'በመግቢያ ገጽ ላይ ነዎት። ወደ ዳሽቦርድዎ ለመግባት "ግባ" ማለት ይችላሉ።';
          else if (currentLang === 'om') statusMsg = 'Fuula Seensaa irra jirtu. Daashboordii banachuuf "Seeni" jedhaa.';
          else if (currentLang === 'ti') statusMsg = 'ኣብ ናይ መእተዊ ገጽ ኣለኹም። ናብ ዳሽቦርድ ንምእታው "እቶ" በሉ።';
          else statusMsg = 'You are on the Login page. Say "Sign in" to access your dashboard.';
        } else if (h.includes('learning')) {
          if (currentLang === 'am') statusMsg = 'በትምህርት ገጽ ላይ ነዎት። ሞጁል 8 የመጨረሻ የፖርትፎሊዮ ቅንጅት እየተማሩ ነው።';
          else if (currentLang === 'om') statusMsg = 'Kutaa Barnootaa Moojulii 8, Qindoomina Poortfooliyoo Dhumaa irra jirtu.';
          else if (currentLang === 'ti') statusMsg = 'ኣብ ገጽ ትምህርቲ ሞጁል 8፣ ናይ መወዳእታ ፖርትፎሊዮ ምውህሃድ ትምህርቲ ኣለኹም።';
          else statusMsg = 'You are in Access Learning, Module 8 Final Portfolio Integration.';
        } else if (h.includes('planning')) {
          if (currentLang === 'am') statusMsg = 'በእቅድ እና የቀን መቁጠሪያ ገጽ ላይ ነዎት። የሳምንት 12 የትምህርት ተግባራት እየተካሄዱ ናቸው።';
          else if (currentLang === 'om') statusMsg = 'Fuula Karooraa fi Kalendarii irra jirtu. Hojiileen torban 12ffaa hojjatamaa jiru.';
          else if (currentLang === 'ti') statusMsg = 'ኣብ ናይ መደብን ካላንደርን ገጽ ኣለኹም። ናይ መበል 12 ሰሙን ዕማማት ኣብ ምክያድ ይርከቡ።';
          else statusMsg = 'You are on the Planning and Calendar page. Week 12 sprint activities are active.';
        } else if (h.includes('projects')) {
          if (currentLang === 'am') statusMsg = 'በሶፍትዌር ፕሮጀክቶች ገጽ ላይ ነዎት። የመጨረሻው የካፕስቶን ፕሮጀክት በመሰራት ላይ ነው።';
          else if (currentLang === 'om') statusMsg = 'Fuula Pirojektiiwwan irra jirtu. Pirojektiin Kaapistooni hojjatamaa jira.';
          else if (currentLang === 'ti') statusMsg = 'ኣብ ገጽ ፕሮጀክትታት ኣለኹም። ናይ መወዳእታ ካፕስቶን ፕሮጀክት ኣብ ምስራሕ ይርከብ።';
          else statusMsg = 'You are on the Projects page. Capstone Portfolio project is in progress.';
        } else if (h.includes('quizzes')) {
          if (currentLang === 'am') statusMsg = 'በፈተናዎች እና ምዘና ገጽ ላይ ነዎት። የሞጁል ግምገማዎች ዝግጁ ናቸው።';
          else if (currentLang === 'om') statusMsg = 'Fuula Qormaata fi Madaallii irra jirtu. Madaalliin moojulii qophii dha.';
          else if (currentLang === 'ti') statusMsg = 'ኣብ ገጽ ፈተናታትን ገምጋማትን ኣለኹም። ናይ ሞጁል ፈተናታት ተዳልዮም ኣለዉ።';
          else statusMsg = 'You are on the Quizzes and Assessments page. All module evaluations are ready.';
        } else if (h.includes('courses')) {
          if (currentLang === 'am') statusMsg = 'በኮርሶች ማውጫ ገጽ ላይ ነዎት። የተመዘገቡባቸው የሶፍትዌር ኢንጂነሪንግ ትምህርቶች እዚህ አሉ።';
          else if (currentLang === 'om') statusMsg = 'Fuula Tarree Koorsiiwwanii irra jirtu. Koorsiiwwan barachaa jirtan argitu.';
          else if (currentLang === 'ti') statusMsg = 'ኣብ ገጽ ዝርዝር ኮርሳት ኣለኹም። ዝተመዝገብኩምሎም ናይ ሶፍትዌር ትምህርትታት ኣብዚ ኣለዉ።';
          else statusMsg = 'You are on the Courses directory page, browsing enrolled software engineering tracks.';
        } else if (h.includes('concepts')) {
          if (currentLang === 'am') statusMsg = 'በፅንሰ ሀሳቦች ቤተ መጻሕፍት ውስጥ ነዎት። ቴክኒካል ሰነዶች እና መመሪያዎችን ማግኘት ይችላሉ።';
          else if (currentLang === 'om') statusMsg = 'Kuusaa Yaad-hiddamaa keessa jirtu. Qajeelfamoota teeknikaa argattu.';
          else if (currentLang === 'ti') statusMsg = 'ኣብ መኽዘን ፅንሰ ሓሳባት ኣለኹም። ቴክኒካዊ ጽሑፋትን መምርሒታትን ክትረኽቡ ትኽእሉ።';
          else statusMsg = 'You are in the Concepts Knowledge Base, exploring technical documentation and guides.';
        } else if (h.includes('vod')) {
          if (currentLang === 'am') statusMsg = 'በተቀረጹ ቴክኒካል ወርክሾፕ ቪዲዮዎች ገጽ ላይ ነዎት። የምልክት ቋንቋ ድጋፍ ተካቷል።';
          else if (currentLang === 'om') statusMsg = 'Kutaa Viidiyoo Waraabbii Teeknikaa keessa jirtu. Afaan mallattoo dabalata.';
          else if (currentLang === 'ti') statusMsg = 'ኣብ ገጽ ዝተቐርጹ ናይ ቴክኒክ ወርክሾፕ ቪድዮታት ኣለኹም። ናይ ምልክት ቋንቋ ሓገዝ ኣለዎ።';
          else statusMsg = 'You are in the Technical Workshop Video section with Ethiopian Sign Language support.';
        } else if (h.includes('profile')) {
          if (currentLang === 'am') statusMsg = 'በተጠቃሚ መገለጫ ገጽዎ ላይ ነዎት። የመለያ ቅንብሮች እና መረጃዎች ይታያሉ።';
          else if (currentLang === 'om') statusMsg = 'Fuula Profaayilii keessan irra jirtu. Qindaa\'inoota herregaa argattu.';
          else if (currentLang === 'ti') statusMsg = 'ኣብ ገጽ ፕሮፋይልኩም ኣለኹም። ናይ ሕሳብኩም መተዓራረዪታትን ሓበሬታን ይርከብ።';
          else statusMsg = 'You are on your User Profile page. Viewing account settings and credentials.';
        } else {
          if (currentLang === 'am') statusMsg = 'በመነሻ ዳሽቦርድ ላይ ነዎት። ሳምንት 12 ተጠናቋል፣ 1 የፖርትፎሊዮ ሞጁል ይቀራል።';
          else if (currentLang === 'om') statusMsg = 'Fuula Duraa Daashboordii irra jirtu. Torban 12 xumurameera, moojulii tokkotu hafa.';
          else if (currentLang === 'ti') statusMsg = 'ኣብ ቀንዲ ዳሽቦርድ ኣለኹም። መበል 12 ሰሙን ተዛዚሙ፣ 1 ሞጁል ተሪፉ ኣሎ።';
          else statusMsg = 'You are on the Home Dashboard. Week 12 is complete, 1 capstone module remaining.';
        }
        
        if (this.hudHeard) this.hudHeard.textContent = statusMsg;
        this.speak(statusMsg);
        return true;
      }

      // Toggle Sidebar
      if (/(?<![\\p{L}\\p{N}])(toggle sidebar|collapse sidebar|open sidebar|sidebar|menu|የአሰሳ ምናሌ|ሜኑ|ሳይድባር|ባር|saayidbaarii)(?![\\p{L}\\p{N}])/iu.test(text)) {
        this.lastCommand = text;
        this.lastCommandTime = now;
        this.playChime('success');
        if (btnHamburger) btnHamburger.click();
        if (this.hudHeard) this.hudHeard.textContent = (currentLang === 'am' ? 'የአሰሳ ምናሌ ተቀይሯል' : 'Toggled navigation menu');
        this.speak(currentLang === 'am' ? 'የአሰሳ ምናሌ ተቀይሯል።' : "Navigation sidebar toggled.");
        return true;
      }

      // Toggle Password Visibility
      if (/(?<![\\p{L}\\p{N}])(toggle password|show password|hide password|የይለፍ ቃል አሳይ|የይለፍ ቃል ደብቅ|iccitii agarsiisi)(?![\\p{L}\\p{N}])/iu.test(text)) {
        this.lastCommand = text;
        this.lastCommandTime = now;
        this.playChime('success');
        if (btnTogglePassword) btnTogglePassword.click();
        if (this.hudHeard) this.hudHeard.textContent = (currentLang === 'am' ? 'የይለፍ ቃል እይታ ተቀይሯል' : 'Toggled password visibility');
        this.speak(currentLang === 'am' ? 'የይለፍ ቃል እይታ ተቀይሯል።' : "Password visibility toggled.");
        return true;
      }

      // Scroll Down / Scroll Up
      if (/(?<![\\p{L}\\p{N}])(scroll down|page down|down|ወደ ታች|ታች|gara gadiitti|ናብ ታሕቲ)(?![\\p{L}\\p{N}])/iu.test(text)) {
        this.lastCommand = text;
        this.lastCommandTime = now;
        this.playChime('success');
        window.scrollBy({ top: 400, behavior: 'smooth' });
        if (this.hudHeard) this.hudHeard.textContent = (currentLang === 'am' ? 'ወደ ታች ወርደናል' : 'Scrolled down');
        return true;
      }
      if (/(?<![\\p{L}\\p{N}])(scroll up|page up|up|ወደ ላይ|ላይ|gara oliitti|ናብ ላዕሊ)(?![\\p{L}\\p{N}])/iu.test(text)) {
        this.lastCommand = text;
        this.lastCommandTime = now;
        this.playChime('success');
        window.scrollBy({ top: -400, behavior: 'smooth' });
        if (this.hudHeard) this.hudHeard.textContent = (currentLang === 'am' ? 'ወደ ላይ ወጥተናል' : 'Scrolled up');
        return true;
      }
      if (/(?<![\\p{L}\\p{N}])(go to top|scroll to top|top|ወደ ላይኛው|መጀመሪያ|gara olii)(?![\\p{L}\\p{N}])/iu.test(text)) {
        this.lastCommand = text;
        this.lastCommandTime = now;
        this.playChime('success');
        window.scrollTo({ top: 0, behavior: 'smooth' });
        if (this.hudHeard) this.hudHeard.textContent = (currentLang === 'am' ? 'ወደ ላይኛው ገጽ ደርሰናል' : 'Scrolled to top');
        return true;
      }

      // ==========================================================
      // UNIVERSAL VOICE BUTTON TOUCH & INTERACTION ENGINE
      // Finds ANY button, link, tab, or interactive element on screen,
      // triggers pulse animation, clicks it, and speaks confirmation!
      // ==========================================================
      if (this.tryClickVoiceTarget(text, raw)) {
        return true;
      }

      return false;
    }

    tryClickVoiceTarget(cleanText, rawText) {
      if (!cleanText || cleanText.length < 2) return false;

      const now = Date.now();
      // GOD-MODE GLOBAL CLICK COOLDOWN:
      // Prevent any voice button clicking within 4000ms of any previous button click!
      if ((now - (this.lastGlobalClickTime || 0)) < 4000) {
        return false;
      }

      // 1. Handle global close/dismiss commands for active modals
      if (/(?<![\p{L}\p{N}])(close|exit|dismiss|hide|done|done reading|cancel|ዝጋ|ውጣ|ተመለስ|አጥፋ|ይብቃኝ|cufi|ba'i|ዕጸው|ውጻእ)(?![\p{L}\p{N}])/iu.test(cleanText)) {
        if (typeof universalMockupModal !== 'undefined' && universalMockupModal && !universalMockupModal.hidden) {
          closeMockup();
          this.lastGlobalClickTime = now;
          this.playChime('success');
          if (this.hudHeard) this.hudHeard.textContent = (currentLang === 'am' ? 'ተዘግቷል' : 'Closed Dialog');
          this.speak(currentLang === 'am' ? 'መስኮቱ ተዘግቷል።' : 'Closed dialog.');
          return true;
        }
        if (typeof brailleModal !== 'undefined' && brailleModal && !brailleModal.hidden) {
          closeBrailleModal();
          this.lastGlobalClickTime = now;
          this.playChime('success');
          if (this.hudHeard) this.hudHeard.textContent = (currentLang === 'am' ? 'የብሬይል መስኮት ተዘግቷል' : 'Closed Braille Viewer');
          this.speak(currentLang === 'am' ? 'የብሬይል ማሳያ ተዘግቷል።' : 'Closed Braille viewer.');
          return true;
        }
        if (typeof playerShortcutsModal !== 'undefined' && playerShortcutsModal && !playerShortcutsModal.hidden) {
          toggleShortcutsModal(false);
          this.lastGlobalClickTime = now;
          this.playChime('success');
          if (this.hudHeard) this.hudHeard.textContent = (currentLang === 'am' ? 'የአቋራጭ መመሪያ ተዘግቷል' : 'Closed Shortcuts');
          this.speak(currentLang === 'am' ? 'የአቋራጭ ቁልፎች መመሪያ ተዘግቷል።' : 'Closed shortcuts guide.');
          return true;
        }
        if (typeof isSlActive !== 'undefined' && isSlActive) {
          launchSignLanguageTheater(false);
          this.lastGlobalClickTime = now;
          this.playChime('success');
          if (this.hudHeard) this.hudHeard.textContent = (currentLang === 'am' ? 'ከሙሉ ስክሪን ወጥተናል' : 'Exited Theater');
          this.speak(currentLang === 'am' ? 'ከሙሉ ስክሪን የምልክት ቋንቋ ወጥተናል።' : 'Exited full screen theater view.');
          return true;
        }
        if (typeof isTheaterFullscreen !== 'undefined' && isTheaterFullscreen) {
          exitTheaterFullscreen();
          this.lastGlobalClickTime = now;
          this.playChime('success');
          if (this.hudHeard) this.hudHeard.textContent = (currentLang === 'am' ? 'ከሙሉ ስክሪን ወጥተናል' : 'Exited Full Screen');
          this.speak(currentLang === 'am' ? 'ከሙሉ ስክሪን ወጥተናል።' : 'Exited full screen.');
          return true;
        }
      }

      // Check if user explicitly used an action verb
      const hasActionVerb = /^(click|tap|press|select|touch|open|hit|push|ጫን|ምረጥ|ክፈት|ንካ|filadhu|tuqi|ጥወቕ|ጠውቕ)\s+/iu.test(cleanText);
      const normalized = cleanText
        .replace(/^(click|tap|press|select|open|show|touch|trigger|hit|activate|view|join|inspect|review|read|watch|ክፈት|ጫን|አሳይ|ተመልከት|መርምር|አንብብ|ban|agarsiisi|ርአ|ንካ|filadhu|tuqi|ጥወቕ)\s+/iu, '')
        .trim();

      // GOD-MODE ACCIDENTAL TOUCH ELIMINATION:
      // If there is NO action verb, require a long deliberate button label (length >= 6).
      // Disallow clicking buttons on random short words (e.g. "ርአ", "ተመልከት", "ቀጽል", "view", "1", "2")!
      if (!hasActionVerb && normalized.length < 6) {
        return false;
      }

      // Collect all interactive elements visible in the DOM
      const selector = 'button, a, input[type="button"], input[type="submit"], [role="button"], .syllabus-item, .week-pill';
      const elements = Array.from(document.querySelectorAll(selector)).filter((el) => {
        if (el.hidden || el.offsetParent === null) return false;
        if (el.id === 'btnAssistantBot' || el.closest('#assistantCornerWidget')) return false;
        if (el.id === 'btn-login-submit' || el.closest('#login-form')) return false;
        if (el.id === 'btnMediaPlay' || el.id === 'btnVideoCenterSplash' || el.id === 'btnToggleVideoVoice' || el.closest('#customMediaControls') || el.closest('#mainVideoContainer')) return false;
        if (el.classList.contains('nav-link') || el.closest('#sidebarNav') || el.closest('.sidebar')) return false;
        if (el.classList.contains('lang-option-btn') || el.id === 'btnLmsLangToggle' || el.id === 'btnLoginLangToggle') return false;
        return true;
      });

      let bestMatch = null;
      let highestScore = 0;

      for (const el of elements) {
        const textContent = (el.innerText || el.textContent || '').trim().toLowerCase();
        const ariaLabel = (el.getAttribute('aria-label') || '').toLowerCase();
        const titleAttr = (el.getAttribute('title') || '').toLowerCase();
        const dataTarget = (el.getAttribute('data-voice-target') || '').toLowerCase();
        const dataProject = (el.getAttribute('data-project') || '').toLowerCase();
        const dataQuiz = (el.getAttribute('data-quiz') || '').toLowerCase();
        const dataConcept = (el.getAttribute('data-concept') || '').toLowerCase();
        const dataRecording = (el.getAttribute('data-recording') || '').toLowerCase();
        const dataTab = (el.getAttribute('data-tab') || '').toLowerCase();
        const dataMod = (el.getAttribute('data-mod') || '').toLowerCase();
        const dataI18n = el.getAttribute('data-i18n');

        // If user said "module 3" or "ሞጁል 3"
        if (dataMod && (cleanText.includes(`module ${dataMod}`) || cleanText.includes(`mod ${dataMod}`) || cleanText.includes(`ሞጁል ${dataMod}`))) {
          bestMatch = el;
          highestScore = 100;
          break;
        }

        const candidates = [
          textContent,
          ariaLabel,
          titleAttr,
          dataTarget,
          dataProject,
          dataQuiz,
          dataConcept,
          dataRecording,
          dataTab
        ];

        // Also add translated dictionary text if element has data-i18n
        if (dataI18n && typeof TRANSLATIONS !== 'undefined') {
          if (TRANSLATIONS[currentLang] && TRANSLATIONS[currentLang][dataI18n]) {
            candidates.push(TRANSLATIONS[currentLang][dataI18n].toLowerCase());
          }
          if (TRANSLATIONS['am'] && TRANSLATIONS['am'][dataI18n]) {
            candidates.push(TRANSLATIONS['am'][dataI18n].toLowerCase());
          }
        }

        const filteredCandidates = candidates.filter(Boolean);

        for (const candidate of filteredCandidates) {
          // Exact match
          if (candidate === cleanText || candidate === normalized) {
            bestMatch = el;
            highestScore = 100;
            break;
          }

          // If explicit action verb was used, allow precise prefix/contains
          if (hasActionVerb && normalized.length >= 4) {
            if (candidate.startsWith(normalized)) {
              const score = 90 + (normalized.length / candidate.length) * 5;
              if (score > highestScore) {
                highestScore = score;
                bestMatch = el;
              }
            } else if (candidate.includes(normalized) && normalized.length >= 5) {
              const score = 85 + (normalized.length / candidate.length) * 5;
              if (score > highestScore) {
                highestScore = score;
                bestMatch = el;
              }
            }
          }
        }

        if (highestScore === 100) break;
      }

      if (bestMatch && highestScore >= 85) {
        const now = Date.now();
        // Prevent repeated touches on the same element within 3 seconds
        if (this.lastClickedTarget === bestMatch && (now - (this.lastClickedTargetTime || 0)) < 3000) {
          return false;
        }
        this.lastClickedTarget = bestMatch;
        this.lastClickedTargetTime = now;
        this.lastGlobalClickTime = now;

        this.playChime('success');

        // Visual feedback pulse
        bestMatch.classList.remove('voice-activated-pulse');
        void bestMatch.offsetWidth; // trigger reflow
        bestMatch.classList.add('voice-activated-pulse');
        setTimeout(() => bestMatch.classList.remove('voice-activated-pulse'), 1400);

        // Smooth scroll to button
        bestMatch.scrollIntoView({ behavior: 'smooth', block: 'nearest' });

        const label = (bestMatch.innerText || bestMatch.getAttribute('aria-label') || bestMatch.getAttribute('title') || 'button').trim();
        const displayLabel = label.length > 25 ? label.substring(0, 25) + '...' : label;
        if (this.hudHeard) this.hudHeard.textContent = displayLabel;

        // Execute single deliberate click directly (no duplicate speech feedback to prevent audio echo loops)
        bestMatch.click();

        return true;
      }

      return false;
    }

    setupDomEvents() {
      // 1. Toggle Chat Panel when yellow bot avatar button is clicked
      if (this.btnAssistantBot) {
        this.btnAssistantBot.addEventListener('click', (e) => {
          e.stopPropagation();
          this.toggleChat();
          this.playChime('neutral');
        });
      }

      // 2. Chat Header Minimize [✕]
      if (this.btnChatMinimize) {
        this.btnChatMinimize.addEventListener('click', (e) => {
          e.stopPropagation();
          this.minimizeChat();
        });
      }

      // 3. Chat Header [❓ Help]
      if (this.btnChatHelp) {
        this.btnChatHelp.addEventListener('click', (e) => {
          e.stopPropagation();
          this.showCommandsHelpDialogue();
        });
      }

      // 4. Chat Header Mic Toggle
      if (this.btnChatMicToggle) {
        this.btnChatMicToggle.addEventListener('click', (e) => {
          e.stopPropagation();
          this.toggle();
        });
      }

      // 5. Chat Input Form Submission
      if (this.chatInputForm) {
        this.chatInputForm.addEventListener('submit', (e) => {
          e.preventDefault();
          if (!this.chatTextInput) return;
          const val = this.chatTextInput.value.trim();
          if (val) {
            this.chatTextInput.value = '';
            this.dispatchCommand(val, true);
          }
        });
      }

      // 6. Quick Action Chips Bar (above input bar)
      document.querySelectorAll('.chat-quick-chip').forEach(chip => {
        chip.addEventListener('click', (e) => {
          e.stopPropagation();
          const cmd = chip.getAttribute('data-cmd');
          if (cmd) {
            if (cmd === 'help') {
              this.addDialogueMessage('user', '❓ All Commands');
              this.showCommandsHelpDialogue();
            } else {
              this.dispatchCommand(cmd, true);
            }
          }
        });
      });

      // 7. Interactive Clickable Pills inside Dialogue Messages
      if (this.dialogueFeed) {
        this.dialogueFeed.addEventListener('click', (e) => {
          const pill = e.target.closest('.chat-cmd-pill');
          if (pill) {
            e.stopPropagation();
            const cmd = pill.getAttribute('data-cmd') || pill.textContent.trim();
            if (cmd) {
              this.dispatchCommand(cmd, true);
            }
          }
        });
      }

      // Legacy fallback bindings
      const bubbleMicBtn = document.getElementById('btnBubbleMicToggle');
      if (bubbleMicBtn) {
        bubbleMicBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          this.toggle();
        });
      }
      const voiceForm = document.getElementById('voiceInputForm');
      const voiceInput = document.getElementById('voiceInputManual');
      if (voiceForm && voiceInput) {
        voiceForm.addEventListener('submit', (e) => {
          e.preventDefault();
          const val = voiceInput.value.trim();
          if (val) {
            voiceInput.value = '';
            this.dispatchCommand(val, true);
          }
        });
      }

      window.addEventListener('keydown', (e) => {
        if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
        if (e.key === 'v' || e.key === 'V') {
          e.preventDefault();
          this.toggleChat();
        }
      });
    }
  }

  /* ==========================================================================
     UNIVERSAL ACCESS GATEWAY ONBOARDING CONTROLLER
     Language Selection (EN, AM, OM, TI) & Disability Check (Blind 7s, Deaf, Neither)
     ========================================================================== */
  class UniversalAccessGateway {
    constructor() {
      this.dialog = document.getElementById('gateway-dialog');
      this.stepLang = document.getElementById('gateway-step-lang');
      this.stepA11y = document.getElementById('gateway-step-a11y');
      this.btnBack = document.getElementById('btn-gateway-back');
      this.countdownLabel = document.getElementById('gateway-countdown-label');
      this.countdownSeconds = document.getElementById('gateway-countdown-seconds');
      this.progressBar = document.getElementById('gateway-progress-bar');
      this.btnPause = document.getElementById('btn-gateway-pause');
      this.btnHeaderGateway = document.getElementById('btnHeaderGateway');
      this.btnLoginGateway = document.getElementById('btnLoginGateway');

      this.isOpen = false;
      this.currentStep = 1;
      this.countdownDuration = 7.0;
      this.countdownRemaining = 7.0;
      this.isPaused = false;
      this.timerInterval = null;
      this.selectedLang = (typeof currentLang !== 'undefined' ? currentLang : 'en');

      this.init();
    }

    init() {
      if (!this.dialog) return;

      if (this.btnHeaderGateway) {
        this.btnHeaderGateway.addEventListener('click', (e) => {
          e.preventDefault();
          this.open(1);
        });
      }
      if (this.btnLoginGateway) {
        this.btnLoginGateway.addEventListener('click', (e) => {
          e.preventDefault();
          this.open(1);
        });
      }

      if (this.btnBack) {
        this.btnBack.addEventListener('click', (e) => {
          e.preventDefault();
          this.goToStep(1);
        });
      }

      if (this.btnPause) {
        this.btnPause.addEventListener('click', (e) => {
          e.preventDefault();
          this.togglePauseTimer();
        });
      }

      const langChoices = this.dialog.querySelectorAll('.gateway-lang-choice');
      langChoices.forEach(btn => {
        btn.addEventListener('click', (e) => {
          e.preventDefault();
          const lang = btn.getAttribute('data-lang');
          if (lang) this.selectLanguage(lang);
        });
      });

      const profileCards = this.dialog.querySelectorAll('.gateway-profile-card');
      profileCards.forEach(card => {
        card.addEventListener('click', (e) => {
          e.preventDefault();
          const profile = card.getAttribute('data-profile');
          if (profile) this.selectProfile(profile);
        });
      });

      window.addEventListener('keydown', (e) => {
        const inInput = e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.isContentEditable;
        if (inInput) return;

        if ((e.key === 'g' || e.key === 'G') && !this.isOpen) {
          e.preventDefault();
          this.open(1);
          return;
        }

        if (!this.isOpen) return;

        if (this.currentStep === 1) {
          const key = e.key.toLowerCase();
          if (key === 'e') { e.preventDefault(); this.selectLanguage('en'); }
          else if (key === 'a') { e.preventDefault(); this.selectLanguage('am'); }
          else if (key === 'o') { e.preventDefault(); this.selectLanguage('om'); }
          else if (key === 't') { e.preventDefault(); this.selectLanguage('ti'); }
          else if (key === 'escape') { e.preventDefault(); this.close(); }
        } else if (this.currentStep === 2) {
          const key = e.key.toLowerCase();
          if (e.key === ' ') {
            e.preventDefault();
            this.togglePauseTimer();
          } else if (key === 'b') {
            e.preventDefault();
            this.selectProfile('blind');
          } else if (key === 'd') {
            e.preventDefault();
            this.selectProfile('deaf');
          } else if (key === 'n') {
            e.preventDefault();
            this.selectProfile('neither');
          } else if (key === 'escape') {
            e.preventDefault();
            this.close();
          }
        }
      });

      // Auto-trigger on first landing visit if onboarding has not been completed
      const gatewayDone = localStorage.getItem('learnbridge_gateway_done');
      if (gatewayDone !== 'true') {
        setTimeout(() => {
          this.open(1);
        }, 600);
      }
    }

    open(step = 1) {
      if (!this.dialog) return;
      this.isOpen = true;
      this.dialog.hidden = false;
      if (typeof this.dialog.showModal === 'function') {
        try { this.dialog.showModal(); } catch (_) {}
      }
      this.goToStep(step);
    }

    close() {
      this.clearTimer();
      this.isOpen = false;
      if (this.dialog) {
        this.dialog.hidden = true;
        if (typeof this.dialog.close === 'function') {
          try { this.dialog.close(); } catch (_) {}
        }
      }
    }

    goToStep(step) {
      this.currentStep = step;
      this.clearTimer();

      if (step === 1) {
        if (this.stepLang) this.stepLang.hidden = false;
        if (this.stepA11y) this.stepA11y.hidden = true;
        if (this.btnBack) this.btnBack.hidden = true;

        if (window.voiceNav) {
          const welcomePrompt = currentLang === 'am'
            ? "እንኳን ወደ LearnBridge በደህና መጡ። ቋንቋዎን ይምረጡ፡ እንግሊዝኛ E፣ አማርኛ A፣ ኦሮምኛ O፣ ወይም ትግርኛ T ይጫኑ።"
            : "Welcome to LearnBridge. Please select your language: press E for English, A for Amharic, O for Afaan Oromoo, or T for Tigrinya.";
          window.voiceNav.speak(welcomePrompt);
        }
      } else if (step === 2) {
        if (this.stepLang) this.stepLang.hidden = true;
        if (this.stepA11y) this.stepA11y.hidden = false;
        if (this.btnBack) this.btnBack.hidden = false;

        this.startCountdown();

        if (window.voiceNav) {
          const a11yPrompts = {
            en: "Please select your accessibility option: press B for Blind, D for Deaf, or N for Neither. Activating Blind mode in 7 seconds.",
            am: "እባክዎ የተደራሽነት ምርጫዎን ይምረጡ፡ ዓይነ ስውር ከሆኑ B፣ መስማት የተሳናቸው ከሆኑ D፣ ወይም መደበኛ ከሆነ N ይጫኑ። በ 7 ሰከንድ ውስጥ የዓይነ ስውር ሁነታ በራስ-ሰር ይጀምራል።",
            om: "Mee filannoo dandeettii keessanii filadhaa: Qaroo dhabeeyyii yoo taatan B, Gurra dhabeeyyii yoo taatan D, yookaan N cuqaasaa. Sekondii 7 keessatti haalli qaroo dhabeeyyii ni eegala.",
            ti: "ናይ ተበጻሕነት ምርጫኹም ሕረዩ፡ ዓይነ ስውር እንተኾንኩም B፣ ጸማም እንተኾንኩም D፣ ወይ ድማ መደበኛ እንተኾንኩም N ጽቐጡ። ኣብ ውሽጢ 7 ሰከንድ ናይ ዓይነ ስውር ሞድ ብባዕሉ ክጅምር እዩ።"
          };
          window.voiceNav.speak(a11yPrompts[this.selectedLang] || a11yPrompts.en);
        }
      }
    }

    selectLanguage(lang) {
      this.selectedLang = lang;
      if (typeof applyLanguage === 'function') {
        applyLanguage(lang, true);
      }
      this.goToStep(2);
    }

    startCountdown() {
      this.clearTimer();
      this.countdownRemaining = this.countdownDuration;
      this.isPaused = false;
      this.updateCountdownDisplay();

      this.timerInterval = setInterval(() => {
        if (this.isPaused) return;

        this.countdownRemaining -= 0.1;
        if (this.countdownRemaining <= 0) {
          this.countdownRemaining = 0;
          this.updateCountdownDisplay();
          this.clearTimer();
          this.selectProfile('blind', true);
          return;
        }

        this.updateCountdownDisplay();
      }, 100);
    }

    togglePauseTimer() {
      this.isPaused = !this.isPaused;
      if (this.btnPause) {
        this.btnPause.textContent = this.isPaused ? 'Resume Timer (Space)' : 'Pause Timer (Space)';
      }
      if (this.countdownLabel) {
        const sec = Math.ceil(this.countdownRemaining);
        if (this.isPaused) {
          this.countdownLabel.innerHTML = `<span>Timer paused. Select your option below (B, D, N).</span><button type="button" class="btn btn-sm btn-outline" id="btn-gateway-pause">Resume Timer (Space)</button>`;
        } else {
          this.countdownLabel.innerHTML = `<span>Activating Blind-Accessible Mode in <strong id="gateway-countdown-seconds">${sec}</strong>s</span><button type="button" class="btn btn-sm btn-outline" id="btn-gateway-pause">Pause Timer (Space)</button>`;
        }
        const newBtn = document.getElementById('btn-gateway-pause');
        if (newBtn) newBtn.addEventListener('click', () => this.togglePauseTimer());
      }
      if (window.voiceNav) {
        window.voiceNav.speak(this.isPaused ? "Timer paused." : "Timer resumed.");
      }
    }

    clearTimer() {
      if (this.timerInterval) {
        clearInterval(this.timerInterval);
        this.timerInterval = null;
      }
    }

    updateCountdownDisplay() {
      const sec = Math.max(0, Math.ceil(this.countdownRemaining));
      const secEl = document.getElementById('gateway-countdown-seconds');
      if (secEl) secEl.textContent = sec;

      if (this.progressBar) {
        const pct = Math.max(0, Math.min(100, (this.countdownRemaining / this.countdownDuration) * 100));
        this.progressBar.style.width = `${pct}%`;
      }
    }

    selectProfile(profile, isAutoFallback = false) {
      this.clearTimer();
      localStorage.setItem('learnbridge_user_profile', profile);
      localStorage.setItem('learnbridge_gateway_done', 'true');

      fetch('/api/v1/accessibility/preferences/me', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': 'lb_live_savanna_9842a1b7c'
        },
        body: JSON.stringify({
          userId: 'savanna-student-1',
          profile: profile,
          highContrast: profile === 'blind',
          captions: profile === 'deaf',
          signLanguage: profile === 'deaf',
          language: this.selectedLang
        })
      }).catch(() => {});

      document.body.classList.remove('profile-blind', 'profile-deaf');

      if (profile === 'blind') {
        document.body.classList.add('profile-blind');
        if (window.voiceNav) {
          window.voiceNav.start();
          const msg = isAutoFallback
            ? (currentLang === 'am' ? "7 ሰከንድ አልቋል። የዓይነ ስውር ሁነታ በርቷል። ድምጽ እየሰማ ነው..." : "Timer expired. Blind mode activated automatically. Hands-free voice navigation active.")
            : (currentLang === 'am' ? "የዓይነ ስውር ሁነታ በርቷል። የድምጽ መመሪያ ንቁ ነው።" : "Blind mode activated. Hands-free voice navigation active.");
          window.voiceNav.speak(msg);
        }
      } else if (profile === 'deaf') {
        document.body.classList.add('profile-deaf');
        const slPip = document.getElementById('slPipWindow');
        if (slPip) slPip.hidden = false;
        const slVideo = document.getElementById('signLanguageVideo');
        if (slVideo) try { slVideo.play(); } catch (_) {}
      } else {
        if (window.voiceNav) {
          const msg = currentLang === 'am' ? "መደበኛ ሁነታ በርቷል።" : "Standard mode active.";
          window.voiceNav.speak(msg);
        }
      }

      this.close();
    }
  }

  // Initialize Global Unified LearnBridge Voice & Offline Subsystems
  try {
    if (typeof window !== 'undefined') {
      if (typeof LearnBridgeVoiceController !== 'undefined' && !window.lbVoiceController) {
        const cmdReg = typeof CommandRegistry !== 'undefined' ? new CommandRegistry() : null;
        const spOut = typeof SpeechOutputCoordinator !== 'undefined' ? new SpeechOutputCoordinator() : null;
        const vBridge = typeof VoiceBridge !== 'undefined' ? new VoiceBridge(true) : null;
        window.lbCommandRegistry = cmdReg;
        window.lbSpeechOutput = spOut;
        window.lbVoiceBridge = vBridge;
        window.lbVoiceController = new LearnBridgeVoiceController({
          commandRegistry: cmdReg,
          speechOutput: spOut
        });
      }

      if (typeof LearnBridgeLocalStore !== 'undefined' && !window.lbLocalStore) {
        window.lbLocalStore = new LearnBridgeLocalStore();
        window.lbSyncManager = typeof LearnBridgeSyncManager !== 'undefined' ? new LearnBridgeSyncManager(window.lbLocalStore) : null;
        window.lbOfflineManager = typeof LearnBridgeOfflineManager !== 'undefined' ? new LearnBridgeOfflineManager(window.lbLocalStore) : null;
      }
    }
  } catch (err) {
    console.warn('LearnBridge subsystems init notice:', err);
  }

  // Instantiate Voice Platform Navigator
  let voiceNav = null;
  try {
    voiceNav = new VoicePlatformNavigator();
    window.voiceNav = voiceNav;
  } catch (err) {
    console.warn('VoicePlatformNavigator init failed:', err);
  }

  // Instantiate Universal Access Gateway
  let universalGateway = null;
  try {
    universalGateway = new UniversalAccessGateway();
    window.universalGateway = universalGateway;
  } catch (err) {
    console.warn('UniversalAccessGateway init failed:', err);
  }

  console.log('ALX Learning LMS Engine initialized successfully.');
})();

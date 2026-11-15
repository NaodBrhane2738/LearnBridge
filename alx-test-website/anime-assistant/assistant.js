/**
 * Full Animated Character Guide Module
 * Uses the Ethiopian Banknote Boy as an interactive, fully animated guide.
 * When 15 seconds of inactivity elapses, the character glides up to the corner,
 * points directly at the Special Care button, and provides voice guidance.
 */

(function () {
  'use strict';

  const state = {
    isSoundMuted: false,
    inactivitySeconds: 15,
    timerInterval: null,
    countdownRemaining: 15,
    isPointingAtTarget: false,
    isBlindGuideActive: false
  };

  // 1. Text-To-Speech SpeechSynthesis Helper
  function speak(text, priority = false) {
    if (state.isSoundMuted || !('speechSynthesis' in window)) return;
    if (priority) {
      window.speechSynthesis.cancel();
    }
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 1.0;
    utterance.pitch = 1.08;
    utterance.volume = 1.0;
    window.speechSynthesis.speak(utterance);
  }

  // 2. Play Audio Chime (Web Audio API)
  function playChime(freq = 659.25) {
    if (state.isSoundMuted) return;
    try {
      const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, audioCtx.currentTime);
      gain.gain.setValueAtTime(0.18, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.6);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.6);
    } catch (e) {
      // AudioContext policy
    }
  }

  // 3. Inject DOM Elements
  function injectElements() {
    // Remove any legacy topbar if present
    const legacyTopbar = document.getElementById('special-care-topbar');
    if (legacyTopbar) legacyTopbar.remove();

    // A. Small, Compact Corner Button (Top-Right)
    if (!document.getElementById('corner-special-care-wrapper')) {
      const cornerWrapper = document.createElement('div');
      cornerWrapper.id = 'corner-special-care-wrapper';
      cornerWrapper.className = 'corner-special-care-wrapper';
      cornerWrapper.innerHTML = `
        <button type="button" id="btn-corner-special-care" class="btn-corner-special-care" aria-label="Special Care & Accessibility options">
          <span class="care-icon" aria-hidden="true">🧏 ♿</span>
          <span class="care-label">Special Care</span>
        </button>
      `;
      document.body.appendChild(cornerWrapper);
    }

    // B. The Full Animated Guy
    if (!document.getElementById('full-character-guide')) {
      const actor = document.createElement('aside');
      actor.id = 'full-character-guide';
      actor.className = 'character-guide-actor';
      actor.setAttribute('aria-label', 'Interactive ALX Accessibility Guide');
      actor.innerHTML = `
        <!-- Speech Bubble -->
        <div class="character-speech-bubble" id="char-speech-bubble" role="region" aria-live="polite">
          <div class="bubble-header">
            <span class="assistant-tag">ALX Guide</span>
            <button type="button" id="btn-mute-char" class="bubble-mute-btn" title="Toggle guide voice">🔊</button>
          </div>
          <div class="bubble-body" id="char-bubble-text">
            "👋 Hi! If you are <strong>blind</strong>, wait <strong>15 seconds</strong> without touching the keyboard and I will guide you! Or touch the <strong>Special Care</strong> button if you need assistance!"
          </div>
          <div class="timer-bar-track" title="Countdown to automatic guide animation">
            <div class="timer-bar-fill" id="char-timer-bar"></div>
          </div>
        </div>

        <!-- The Animated Guy Puppet -->
        <div class="character-puppet" id="character-puppet-body" title="Click me to guide you!">
          <!-- Laser beam when pointing -->
          <div class="pointer-laser" id="pointer-laser"></div>

          <!-- Right Arm that points -->
          <div class="puppet-arm-right" id="puppet-pointing-arm">
            <div class="pointing-hand" aria-hidden="true">👉</div>
          </div>

          <!-- Head with Banknote Boy Portrait -->
          <div class="puppet-head-wrapper">
            <img src="assets/guide-avatar.png" alt="ALX Guide character" class="puppet-face-img">
            <div class="puppet-expression" id="puppet-expression" aria-hidden="true">✨</div>
          </div>

          <!-- Torso / Suit -->
          <div class="puppet-torso">
            <div class="torso-suit">
              <span class="suit-logo">alx</span>
            </div>
          </div>

          <!-- Left Arm waving -->
          <div class="puppet-arm-left" aria-hidden="true">✋</div>

          <!-- Bottom Hover Aura -->
          <div class="puppet-hover-aura"></div>
        </div>
      `;
      document.body.appendChild(actor);
    }

    // C. Special Care Modal
    if (!document.getElementById('special-care-modal')) {
      const modal = document.createElement('div');
      modal.id = 'special-care-modal';
      modal.className = 'special-care-modal';
      modal.setAttribute('role', 'dialog');
      modal.setAttribute('aria-modal', 'true');
      modal.setAttribute('aria-labelledby', 'care-modal-title');
      modal.innerHTML = `
        <div class="special-care-modal-box">
          <header class="modal-header">
            <h2 id="care-modal-title">
              <span aria-hidden="true">🧏 ♿</span>
              Special Care &amp; Inclusive Accommodations
            </h2>
            <button type="button" id="btn-close-care-modal" class="modal-close-btn" aria-label="Close dialog">✕</button>
          </header>
          
          <div class="modal-body">
            <!-- Deaf Support -->
            <div class="care-option-card">
              <div class="care-option-icon" aria-hidden="true">🧏</div>
              <div class="care-option-content">
                <h3>Deaf &amp; Hard-of-Hearing Assistance</h3>
                <p>Enables full visual guidance, Ethiopian Sign Language (ESL) cues, synchronized captions, and high-contrast screen notifications.</p>
                <button type="button" class="btn-activate-care" onclick="activateDeafSupport()">
                  <span>Enable Hearing Support</span>
                </button>
              </div>
            </div>

            <!-- Blind Audio Guide -->
            <div class="care-option-card">
              <div class="care-option-icon" aria-hidden="true">🦯</div>
              <div class="care-option-content">
                <h3>Blind &amp; Low-Vision Audio Tour</h3>
                <p>Spoken step-by-step form walkthrough with automated field announcements upon keyboard navigation.</p>
                <button type="button" class="btn-activate-care" onclick="activateBlindGuide()">
                  <span>Start Audio Guided Flow</span>
                </button>
              </div>
            </div>

            <!-- High Contrast -->
            <div class="care-option-card">
              <div class="care-option-icon" aria-hidden="true">🎨</div>
              <div class="care-option-content">
                <h3>High Contrast &amp; Large Text</h3>
                <p>Maximizes contrast to 14:1, boosts font sizes by 130%, and displays thick high-visibility focus rings.</p>
                <button type="button" class="btn-activate-care" onclick="toggleHighContrast()">
                  <span>Toggle High Contrast</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      `;
      document.body.appendChild(modal);
    }
  }

  // 4. Inactivity Timer (15 Seconds)
  function startTimer() {
    clearInterval(state.timerInterval);
    state.countdownRemaining = state.inactivitySeconds;
    updateTimerUI();

    state.timerInterval = setInterval(() => {
      state.countdownRemaining -= 1;
      updateTimerUI();

      if (state.countdownRemaining <= 0) {
        clearInterval(state.timerInterval);
        trigger15SecondGuideAnimation();
      }
    }, 1000);
  }

  function resetTimer() {
    // If the guy is currently pointing at the top button, user activity gently brings him back
    if (state.isPointingAtTarget) {
      returnActorToHome();
    }
    startTimer();
  }

  function updateTimerUI() {
    const fill = document.getElementById('char-timer-bar');
    if (fill) {
      const pct = ((state.inactivitySeconds - state.countdownRemaining) / state.inactivitySeconds) * 100;
      fill.style.width = `${pct}%`;
    }
  }

  // 5. The 15-Second Action: Fly up and point to Special Care button!
  function trigger15SecondGuideAnimation() {
    state.isPointingAtTarget = true;
    const actor = document.getElementById('full-character-guide');
    const bubbleText = document.getElementById('char-bubble-text');
    const cornerBtn = document.getElementById('btn-corner-special-care');
    const expression = document.getElementById('puppet-expression');

    if (!actor) return;

    playChime(659.25);
    if (expression) expression.textContent = '💡';

    // Step A: Fly smoothly to top-right corner
    actor.classList.add('flying-to-target');

    setTimeout(() => {
      // Step B: Enter pointing mode with animated finger & laser
      actor.classList.add('pointing-mode');
      if (cornerBtn) cornerBtn.classList.add('highlight-pulse');

      if (bubbleText) {
        bubbleText.innerHTML = `
          <strong>👆 Need Special Care?</strong><br>
          If you have a <strong>hearing problem</strong> or need accommodations, touch or click this <strong>Special Care</strong> button right here!
        `;
      }

      // Speak loudly and clearly
      speak(
        "If you have a hearing problem or need accommodations, touch or click the Special Care button right here!",
        true
      );

      // Step C: After 6 seconds, transition to blind guidance if no click
      setTimeout(() => {
        if (state.isPointingAtTarget) {
          if (bubbleText) {
            bubbleText.innerHTML = `
              <strong>🦯 Blind Audio Guide Active!</strong><br>
              Press <strong>Tab</strong> on your keyboard to enter your email.
            `;
          }
          speak(
            "And if you are blind and need help signing in, press Tab now to focus on the Email input field.",
            false
          );
          state.isBlindGuideActive = true;
          setupInputAudioGuides();
        }
      }, 5000);

    }, 1200);
  }

  // Return the guy back down to his home corner
  function returnActorToHome() {
    state.isPointingAtTarget = false;
    const actor = document.getElementById('full-character-guide');
    const cornerBtn = document.getElementById('btn-corner-special-care');
    const expression = document.getElementById('puppet-expression');
    const bubbleText = document.getElementById('char-bubble-text');

    if (actor) {
      actor.classList.remove('flying-to-target', 'pointing-mode');
    }
    if (cornerBtn) {
      cornerBtn.classList.remove('highlight-pulse');
    }
    if (expression) {
      expression.textContent = '😊';
    }
    if (bubbleText) {
      bubbleText.innerHTML = `
        "👋 Welcome! Need assistance? Wait <strong>15 seconds</strong> or click the <strong>Special Care</strong> button anytime!"
      `;
    }
  }

  // Hook input focus for blind audio guides
  function setupInputAudioGuides() {
    const emailInput = document.getElementById('email');
    const passwordInput = document.getElementById('password');
    const loginForm = document.getElementById('login-form');
    const submitBtn = loginForm ? loginForm.querySelector('.btn-signin') : null;

    if (emailInput && !emailInput.dataset.hooked) {
      emailInput.dataset.hooked = 'true';
      emailInput.addEventListener('focus', () => {
        if (!state.isBlindGuideActive) return;
        playChime(523.25);
        speak("Email address field. Type your email. Then press Tab for password.");
      });
    }

    if (passwordInput && !passwordInput.dataset.hooked) {
      passwordInput.dataset.hooked = 'true';
      passwordInput.addEventListener('focus', () => {
        if (!state.isBlindGuideActive) return;
        playChime(587.33);
        speak("Password field. Type your password. Then press Tab for the Sign in button.");
      });
    }

    if (submitBtn && !submitBtn.dataset.hooked) {
      submitBtn.dataset.hooked = 'true';
      submitBtn.addEventListener('focus', () => {
        if (!state.isBlindGuideActive) return;
        playChime(659.25);
        speak("Sign In button. Press Enter or Space to submit.");
      });
    }
  }

  // Modal Handlers
  function openCareModal() {
    const modal = document.getElementById('special-care-modal');
    if (modal) {
      modal.classList.add('active');
      modal.setAttribute('aria-hidden', 'false');
      speak("Special care and accessibility dialog opened. Choose hearing support, blind audio guide, or high contrast mode.");
    }
  }

  function closeCareModal() {
    const modal = document.getElementById('special-care-modal');
    if (modal) {
      modal.classList.remove('active');
      modal.setAttribute('aria-hidden', 'true');
    }
  }

  window.activateDeafSupport = function () {
    closeCareModal();
    alert("🧏 Deaf & Hard-of-Hearing mode enabled! Visual subtitle banners, ESL prompts, and visual flash notifications are now active.");
    document.body.classList.add('deaf-mode-active');
  };

  window.activateBlindGuide = function () {
    closeCareModal();
    trigger15SecondGuideAnimation();
  };

  window.toggleHighContrast = function () {
    closeCareModal();
    document.body.classList.toggle('high-contrast-mode');
    alert("🎨 High-contrast mode toggled!");
  };

  // Initialization
  function init() {
    injectElements();

    // Corner button click opens modal
    const cornerBtn = document.getElementById('btn-corner-special-care');
    if (cornerBtn) {
      cornerBtn.addEventListener('click', openCareModal);
    }

    // Modal close
    const btnCloseModal = document.getElementById('btn-close-care-modal');
    if (btnCloseModal) {
      btnCloseModal.addEventListener('click', closeCareModal);
    }

    // Mute button
    const btnMute = document.getElementById('btn-mute-char');
    if (btnMute) {
      btnMute.addEventListener('click', (e) => {
        e.stopPropagation();
        state.isSoundMuted = !state.isSoundMuted;
        btnMute.textContent = state.isSoundMuted ? '🔇' : '🔊';
        if (state.isSoundMuted) {
          window.speechSynthesis.cancel();
        } else {
          speak("Voice enabled.");
        }
      });
    }

    // Clicking puppet directly triggers the pointer animation!
    const puppetBody = document.getElementById('character-puppet-body');
    if (puppetBody) {
      puppetBody.addEventListener('click', () => {
        trigger15SecondGuideAnimation();
      });
    }

    // User activity resets timer
    ['mousemove', 'keydown', 'touchstart'].forEach((evt) => {
      window.addEventListener(evt, resetTimer, { passive: true });
    });

    // Start 15s timer
    startTimer();

    // Initial greeting
    setTimeout(() => {
      speak(
        "Welcome to ALX. If you are blind, wait 15 seconds without touching the keyboard and I will guide you. Or click the Special Care button if you need accommodations."
      );
    }, 1000);

    console.log('Full Animated Character Guide initialized.');
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();

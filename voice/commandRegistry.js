/**
 * LearnBridge Unified Command Registry
 * Deterministic intent mapping, context validation, confirmation gating,
 * and security fences against accidental login and unauthorized execution.
 */

class CommandRegistry {
  constructor() {
    this._commands = new Map();
    this._pendingConfirmation = null;
    this._dictationTarget = null;
    this._contextProvider = () => ({ isAuthenticated: false, activeTab: 'home', language: 'en' });
    this.registerDefaultIntents();
  }

  setContextProvider(fn) {
    if (typeof fn === 'function') {
      this._contextProvider = fn;
    }
  }

  setDictationTarget(element) {
    if (element && (element.type === 'password' || element.getAttribute('type') === 'password')) {
      console.warn('[CommandRegistry] Security fence: Passwords cannot be dictated by voice.');
      this._dictationTarget = null;
      return false;
    }
    this._dictationTarget = element || null;
    return true;
  }

  clearDictationTarget() {
    this._dictationTarget = null;
  }

  get isDictationActive() {
    return !!this._dictationTarget;
  }

  registerCommand(intentName, config) {
    if (!intentName || !config) return;
    this._commands.set(intentName, {
      intent: intentName,
      phrases: config.phrases || [],
      handler: config.handler || (() => {}),
      description: config.description || '',
      category: config.category || 'general',
      isConsequential: !!config.isConsequential,
      requiresAuth: !!config.requiresAuth,
      confirmationPrompt: config.confirmationPrompt || null
    });
  }

  registerDefaultIntents() {
    // 1. Navigation Intents
    this.registerCommand('NAVIGATE_HOME', {
      category: 'navigation',
      description: 'Navigate to dashboard home',
      phrases: ['home', 'dashboard', 'go home', 'open dashboard', 'ዋና ገጽ', 'ዳሽቦርድ', 'manaa', 'ቤት'],
      handler: (ctx) => {
        if (typeof window !== 'undefined' && window.location) window.location.hash = '#home';
        return { success: true, message: 'Navigated to Home Dashboard' };
      }
    });

    this.registerCommand('NAVIGATE_LEARNING', {
      category: 'navigation',
      description: 'Open learning modules',
      phrases: ['learning', 'access learning', 'lessons', 'modules', 'ትምህርት', 'ትምህርቶች', 'barumsa', 'ትምህርቲ'],
      handler: (ctx) => {
        if (typeof window !== 'undefined' && window.location) window.location.hash = '#access-learning';
        return { success: true, message: 'Opened Learning Modules' };
      }
    });

    this.registerCommand('NAVIGATE_PLANNING', {
      category: 'navigation',
      description: 'Open planning and calendar',
      phrases: ['planning', 'calendar', 'schedule', 'እቅድ', 'ቀን መቁጠሪያ', 'karoora', 'መደብ'],
      handler: (ctx) => {
        if (typeof window !== 'undefined' && window.location) window.location.hash = '#planning';
        return { success: true, message: 'Opened Planning Calendar' };
      }
    });

    this.registerCommand('NAVIGATE_PROJECTS', {
      category: 'navigation',
      description: 'Open projects view',
      phrases: ['projects', 'assignments', 'tasks', 'ፕሮጀክቶች', 'ስራዎች', 'pirojektii', 'ፕሮጀክትታት'],
      handler: (ctx) => {
        if (typeof window !== 'undefined' && window.location) window.location.hash = '#projects';
        return { success: true, message: 'Opened Projects' };
      }
    });

    this.registerCommand('NAVIGATE_QUIZZES', {
      category: 'navigation',
      description: 'Open quizzes',
      phrases: ['quizzes', 'tests', 'exams', 'ፈተናዎች', 'ጥያቄዎች', 'qormaata', 'ፈተናታት'],
      handler: (ctx) => {
        if (typeof window !== 'undefined' && window.location) window.location.hash = '#quizzes';
        return { success: true, message: 'Opened Quizzes' };
      }
    });

    this.registerCommand('NAVIGATE_COURSES', {
      category: 'navigation',
      description: 'Open all courses',
      phrases: ['courses', 'curriculum', 'ኮርሶች', 'koursii', 'ኮርሳት'],
      handler: (ctx) => {
        if (typeof window !== 'undefined' && window.location) window.location.hash = '#courses';
        return { success: true, message: 'Opened Courses' };
      }
    });

    this.registerCommand('NAVIGATE_PROFILE', {
      category: 'navigation',
      description: 'Open learner profile',
      phrases: ['profile', 'my profile', 'settings', 'account', 'መለያ', 'ፕሮፋይል', 'ቅንብሮች', 'piroofaayilii', 'መለለዪ'],
      handler: (ctx) => {
        if (typeof window !== 'undefined' && window.location) window.location.hash = '#profile';
        return { success: true, message: 'Opened Profile & Settings' };
      }
    });

    this.registerCommand('NAVIGATE_JOBS', {
      category: 'navigation',
      description: 'Open ALX Job Portal and Employment Platform',
      phrases: ['jobs', 'job portal', 'careers', 'employment', 'vacancies', 'ስራ', 'የስራ እድል', 'የስራ በር', 'hojii', 'ስራሕ'],
      handler: (ctx) => {
        if (typeof window !== 'undefined' && typeof window.openJobPortalStandalone === 'function') {
          window.openJobPortalStandalone();
        } else if (typeof window !== 'undefined' && window.location) {
          window.location.hash = '#jobs';
        }
        return { success: true, message: 'Opened ALX Job Portal & Employment Platform' };
      }
    });

    // CRITICAL SECURITY INTENT: NAVIGATE_LOGIN
    // Navigates to login page safely, but NEVER executes authentication!
    this.registerCommand('NAVIGATE_LOGIN', {
      category: 'security',
      description: 'Navigate to login screen without authenticating',
      phrases: ['log in', 'login', 'sign in', 'signin', 'logout', 'log out', 'sign out', 'ይግቡ', 'መግቢያ', 'seenaa', 'እቶ'],
      handler: (ctx) => {
        if (typeof window !== 'undefined' && window.location) window.location.hash = '#login';
        return {
          success: true,
          message: 'Navigated to sign in screen. Please select a profile or submit credentials directly.',
          securityFence: 'AUTO_LOGIN_BLOCKED'
        };
      }
    });

    // 2. Information & Query Intents
    this.registerCommand('WHERE_AM_I', {
      category: 'query',
      description: 'Identify current location and tab',
      phrases: ['where am i', 'current page', 'current tab', 'what page is this', 'የት ነኝ', 'የቱ ጋር ነኝ', 'eessa jiran', 'ኣበይ ኣለኹ'],
      handler: (ctx) => {
        const hash = (window.location ? window.location.hash : '').replace('#', '') || 'home';
        return { success: true, message: `You are currently on the ${hash} section of the ALX platform.` };
      }
    });

    this.registerCommand('WHAT_DO_I_HAVE_TODAY', {
      category: 'query',
      description: 'Announce daily schedule and deliverables',
      phrases: ['what do i have today', 'today schedule', 'my schedule', 'ዛሬ ምን አለኝ', 'ዛሬ ያለኝ ፕሮግራም', 'har\'a maaltu jira', 'ሎሚ እንታይ ኣለኒ'],
      handler: (ctx) => {
        return { success: true, message: 'Today you have Sprint 2 Professional Foundations milestone due at 5:00 PM.' };
      }
    });

    // 3. Media Controls
    this.registerCommand('PLAY_VIDEO', {
      category: 'media',
      description: 'Play active video',
      phrases: ['play video', 'play lesson', 'play', 'resume video', 'አጫውት', 'ቪዲዮ ጀምር', 'taphisi', 'ስራሕ'],
      handler: (ctx) => {
        const vid = document.querySelector('video');
        if (vid) {
          vid.play().catch(() => {});
          return { success: true, message: 'Playing video' };
        }
        return { success: false, message: 'No active video found on this page.' };
      }
    });

    this.registerCommand('PAUSE_VIDEO', {
      category: 'media',
      description: 'Pause active video',
      phrases: ['pause video', 'pause lesson', 'pause', 'አቁም', 'ቪዲዮ አቁም', 'dhaabi', 'ኣዕርፍ'],
      handler: (ctx) => {
        const vid = document.querySelector('video');
        if (vid) {
          vid.pause();
          return { success: true, message: 'Paused video' };
        }
        return { success: false, message: 'No active video found on this page.' };
      }
    });

    // 4. Job Operations (With Half-Duplex Confirmation Gate for Apply)
    this.registerCommand('EMPLOYMENT_APPLY', {
      category: 'employment',
      description: 'Apply for the current job opening',
      isConsequential: true,
      confirmationPrompt: 'Are you sure you want to submit your verified 1-click application for this position? Say "Confirm" or "Yes" to submit.',
      phrases: ['apply', 'apply now', 'submit application', 'submit cv', 'right arrow', 'arrow right', 'right', 'swipe right', 'አመልክት', 'አመልክቺ', 'ማመልከቻ', 'iyyadhu', 'ኣመልክት'],
      handler: (ctx) => {
        if (typeof window !== 'undefined' && window.app && typeof window.app.handleCardApply === 'function') {
          window.app.handleCardApply();
          return { success: true, message: 'Application submitted successfully.' };
        }
        const bridge = typeof window !== 'undefined' ? window.lbVoiceBridge : null;
        if (bridge) {
          bridge.sendActionToFrame('JOB_APPLY');
          return { success: true, message: 'Application submitted successfully.' };
        }
        return { success: true, message: 'Application request recorded.' };
      }
    });

    this.registerCommand('EMPLOYMENT_PASS', {
      category: 'employment',
      description: 'Pass current job opening',
      phrases: ['pass', 'pass job', 'next job', 'skip', 'skip job', 'swipe left', 'left arrow', 'arrow left', 'ቀጣይ', 'እለፍ', 'ለፍ', 'ተው', 'didi', 'didii', 'darbi', 'ሕለፍ'],
      handler: (ctx) => {
        const bridge = typeof window !== 'undefined' ? window.lbVoiceBridge : null;
        if (bridge) {
          bridge.sendActionToFrame('JOB_PASS');
        }
        if (typeof window !== 'undefined' && window.app && typeof window.app.handleCardPass === 'function') {
          window.app.handleCardPass();
          return { success: true, message: 'Job passed. Moving to next position.' };
        }
        return { success: true, message: 'Job passed. Moving to next position.' };
      }
    });

    this.registerCommand('EMPLOYMENT_REJECT', {
      category: 'employment',
      description: 'Reject current job opening',
      phrases: ['reject', 'reject job', 'dislike', 'decline', 'not interested', 'left arrow', 'arrow left', 'swipe left', 'ውድቅ', 'ውድቅ አድርግ', 'ንጸግ'],
      handler: (ctx) => {
        const bridge = typeof window !== 'undefined' ? window.lbVoiceBridge : null;
        if (bridge) {
          bridge.sendActionToFrame('JOB_REJECT');
        }
        if (typeof window !== 'undefined' && window.app && typeof window.app.handleCardPass === 'function') {
          window.app.handleCardPass();
          return { success: true, message: 'Job rejected. Moving to next position.' };
        }
        return { success: true, message: 'Job rejected. Moving to next position.' };
      }
    });

    this.registerCommand('EMPLOYMENT_DETAILS', {
      category: 'employment',
      description: 'View full job description and requirements',
      phrases: ['more info', 'job details', 'details', 'tell me more', 'ዝርዝር', 'ተጨማሪ መረጃ', 'odeeffannoo', 'ዝርዝር ሓበሬታ'],
      handler: (ctx) => {
        const bridge = typeof window !== 'undefined' ? window.lbVoiceBridge : null;
        if (bridge) {
          bridge.sendActionToFrame('JOB_DETAILS');
          return { success: true, message: 'Displaying job details.' };
        }
        return { success: true, message: 'Displaying job details.' };
      }
    });

    // 5. Language Switching
    this.registerCommand('SWITCH_LANGUAGE_AM', {
      category: 'language',
      description: 'Switch language to Amharic',
      phrases: ['switch to amharic', 'amharic', 'change language amharic', 'አማርኛ', 'ቋንቋ አማርኛ አድርግ'],
      handler: (ctx) => {
        if (typeof window !== 'undefined' && window.applyLanguage) window.applyLanguage('am');
        return { success: true, message: 'ቋንቋ ወደ አማርኛ ተቀይሯል።' };
      }
    });

    this.registerCommand('SWITCH_LANGUAGE_OM', {
      category: 'language',
      description: 'Switch language to Afaan Oromoo',
      phrases: ['switch to oromiffa', 'oromiffa', 'afaan oromoo', 'oromo', 'gara afaan oromootti jijjiiri'],
      handler: (ctx) => {
        if (typeof window !== 'undefined' && window.applyLanguage) window.applyLanguage('om');
        return { success: true, message: 'Afaan gara Afaan Oromootti jijjiirameera.' };
      }
    });

    this.registerCommand('SWITCH_LANGUAGE_TI', {
      category: 'language',
      description: 'Switch language to Tigrinya',
      phrases: ['switch to tigrinya', 'tigrinya', 'ትግርኛ', 'ቋንቋ ናብ ትግርኛ ቀይር'],
      handler: (ctx) => {
        if (typeof window !== 'undefined' && window.applyLanguage) window.applyLanguage('ti');
        return { success: true, message: 'ቋንቋ ናብ ትግርኛ ተቐይሩ ኣሎ።' };
      }
    });

    this.registerCommand('SWITCH_LANGUAGE_EN', {
      category: 'language',
      description: 'Switch language to English',
      phrases: ['switch to english', 'english', 'change to english'],
      handler: (ctx) => {
        if (typeof window !== 'undefined' && window.applyLanguage) window.applyLanguage('en');
        return { success: true, message: 'Language switched to English.' };
      }
    });

    // 6. Universal Help & Confirmation
    this.registerCommand('OPEN_HELP', {
      category: 'system',
      description: 'Display all available commands',
      phrases: ['help', 'commands', 'what can i say', 'show help', 'እርዳታ', 'ትእዛዞች', 'gargaarsa', 'ሓገዝ'],
      handler: (ctx) => {
        return {
          success: true,
          action: 'SHOW_HELP',
          message: 'Showing all available voice and dialogue commands.'
        };
      }
    });

    this.registerCommand('STOP_SPEECH', {
      category: 'system',
      description: 'Stop speech output immediately',
      phrases: ['stop', 'shut up', 'quiet', 'silence', 'pause speech', 'mute', 'ዝም', 'ዝም በል', 'ቁም', 'ደው', 'dhaabi', 'ስቕ በል', 'ስቕ'],
      handler: (ctx) => {
        if (typeof window !== 'undefined') {
          if (typeof window.stopAllSpeech === 'function') {
            window.stopAllSpeech('voice_command');
          } else {
            if (window.lbSpeechOutput) window.lbSpeechOutput.stop();
            if (window.voiceNav) window.voiceNav.stopSpeaking();
            if ('speechSynthesis' in window) window.speechSynthesis.cancel();
          }
        }
        return { success: true, message: 'Speech stopped.' };
      }
    });

    this.registerCommand('CONFIRM_ACTION', {
      category: 'system',
      description: 'Confirm a pending consequential action',
      phrases: ['confirm', 'yes', 'proceed', 'approve', 'አረጋግጥ', 'አዎ', 'ቀጥል', 'eeyyee', 'እወ'],
      handler: (ctx) => {
        if (this._pendingConfirmation) {
          const target = this._pendingConfirmation;
          this._pendingConfirmation = null;
          return target.handler(ctx);
        }
        return { success: false, message: 'There is no pending action to confirm.' };
      }
    });

    this.registerCommand('CANCEL_ACTION', {
      category: 'system',
      description: 'Cancel a pending consequential action',
      phrases: ['cancel', 'no', 'abort', 'ተመለስ', 'አይ', 'ሰርዝ', 'lakki', 'ይቕረ'],
      handler: (ctx) => {
        if (this._pendingConfirmation) {
          this._pendingConfirmation = null;
          return { success: true, message: 'Action cancelled.' };
        }
        return { success: true, message: 'Cancelled.' };
      }
    });
  }

  normalize(text) {
    if (!text || typeof text !== 'string') return '';
    return text.toLowerCase()
      .replace(/[.,!?;:'"\\-_/\\()]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  interpret(rawUtterance) {
    const text = this.normalize(rawUtterance);
    if (!text) return null;

    // 1. Form Dictation Interception
    if (this._dictationTarget) {
      return {
        isDictation: true,
        text: rawUtterance.trim(),
        target: this._dictationTarget
      };
    }

    // 2. Pending Confirmation Match
    if (this._pendingConfirmation) {
      if (['yes', 'confirm', 'proceed', 'approve', 'አዎ', 'አረጋግጥ', 'ቀጥል', 'eeyyee', 'እወ'].some(w => text.includes(w))) {
        return { intent: 'CONFIRM_ACTION', command: this._commands.get('CONFIRM_ACTION') };
      }
      if (['no', 'cancel', 'abort', 'አይ', 'ተመለስ', 'ሰርዝ', 'lakki', 'ይቕረ'].some(w => text.includes(w))) {
        return { intent: 'CANCEL_ACTION', command: this._commands.get('CANCEL_ACTION') };
      }
    }

    // 3. Exact & Keyword Matching Across Registered Intents
    for (const [intentName, cmd] of this._commands.entries()) {
      for (const phrase of cmd.phrases) {
        const normPhrase = this.normalize(phrase);
        if (text === normPhrase || text.startsWith(normPhrase + ' ') || text.endsWith(' ' + normPhrase) || text.includes(` ${normPhrase} `)) {
          return { intent: intentName, command: cmd };
        }
      }
    }

    return null;
  }

  execute(rawUtterance) {
    const interpretation = this.interpret(rawUtterance);
    if (!interpretation) {
      return {
        executed: false,
        intent: 'UNKNOWN',
        message: 'I didn\'t understand that command. You can say "Help" to hear the available commands.'
      };
    }

    // Form Dictation Insertion
    if (interpretation.isDictation) {
      const el = interpretation.target;
      try {
        if (typeof el.value === 'string') {
          const cur = el.value ? el.value + ' ' : '';
          el.value = cur + interpretation.text;
          el.dispatchEvent(new Event('input', { bubbles: true }));
          el.dispatchEvent(new Event('change', { bubbles: true }));
          return { executed: true, intent: 'DICTATE_FIELD', message: `Dictated: "${interpretation.text}"` };
        }
      } catch (err) {
        console.warn('[CommandRegistry] Dictation failed:', err);
      }
    }

    const { intent, command } = interpretation;

    // Consequential Confirmation Gate
    if (command.isConsequential && intent !== 'CONFIRM_ACTION') {
      this._pendingConfirmation = command;
      return {
        executed: false,
        requiresConfirmation: true,
        intent,
        message: command.confirmationPrompt || 'This action requires confirmation. Say "Confirm" to proceed or "Cancel" to abort.'
      };
    }

    // Execute with Context
    const ctx = this._contextProvider();
    const result = command.handler(ctx);
    return {
      executed: true,
      intent,
      ...result
    };
  }
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { CommandRegistry };
} else if (typeof window !== 'undefined') {
  window.CommandRegistry = CommandRegistry;
}

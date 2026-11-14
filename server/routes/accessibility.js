const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const { optionalAuth, requireAuth } = require('../middleware/auth');

const profilesPath = path.join(__dirname, '..', 'data', 'profiles.json');
const prefsStorePath = path.join(__dirname, '..', 'data', 'preferences-store.json');

function loadProfiles() {
  const raw = fs.readFileSync(profilesPath, 'utf8');
  return JSON.parse(raw).profiles || [];
}

function loadPreferencesStore() {
  try {
    if (fs.existsSync(prefsStorePath)) {
      return JSON.parse(fs.readFileSync(prefsStorePath, 'utf8'));
    }
  } catch (_) {}
  return {};
}

function savePreferencesStore(data) {
  try {
    fs.writeFileSync(prefsStorePath, JSON.stringify(data, null, 2), 'utf8');
  } catch (_) {}
}

const defaultPreferences = {
  language: 'en',
  profileId: 'default',
  high_contrast: false,
  highContrast: false,
  reduce_transparency: false,
  captions: false,
  captionsEnabled: false,
  caption_language: 'en',
  audio_descriptions: false,
  sign_language: false,
  signLanguageEnabled: false,
  sign_language_position: 'bottom-right',
  sign_language_scale: 1.0,
  font_scale: 1.0,
  fontSizeMultiplier: 1.0,
  reduced_motion: false,
  reduceMotion: false,
  screen_reader_optimized: false,
  speech_synthesis: false,
  simplified_interface: false,
  keyboard_only: false,
  tts_feedback: false,
  updatedAt: new Date().toISOString()
};

router.use(optionalAuth);

// 1. Get all profiles
router.get('/profiles', (req, res) => {
  const profiles = loadProfiles().map(p => ({
    ...p,
    targetAudience: p.category || p.name,
    defaults: p.settings || {}
  }));
  res.json({
    success: true,
    data: {
      count: profiles.length,
      profiles: profiles
    },
    meta: {
      version: 'v1',
      requestId: req.id
    }
  });
});

// 2. Get single profile by ID
router.get('/profiles/:profileId', (req, res, next) => {
  const pid = (req.params.profileId || '').toLowerCase().trim();
  const profiles = loadProfiles();
  const match = profiles.find(p => p.id === pid);

  if (!match) {
    const err = new Error(`Accessibility profile '${pid}' was not found.`);
    err.status = 404;
    err.code = 'PROFILE_NOT_FOUND';
    err.details = { availableProfiles: profiles.map(p => p.id) };
    return next(err);
  }

  const safeProfile = {
    ...match,
    targetAudience: match.category || match.name,
    defaults: match.settings || {}
  };

  res.json({
    success: true,
    data: safeProfile,
    meta: {
      version: 'v1',
      requestId: req.id
    }
  });
});

// 3. Helper to resolve user key
function resolveUserKey(req) {
  const tenantPrefix = req.tenant ? `${req.tenant.id}:` : 'public:';
  const userId = req.query.userId || req.headers['x-user-id'] || 'session-default';
  return `${tenantPrefix}${userId}`;
}

function normalizePrefs(raw) {
  return {
    ...defaultPreferences,
    ...raw,
    highContrast: raw.highContrast !== undefined ? Boolean(raw.highContrast) : Boolean(raw.high_contrast),
    high_contrast: raw.highContrast !== undefined ? Boolean(raw.highContrast) : Boolean(raw.high_contrast),
    captionsEnabled: raw.captionsEnabled !== undefined ? Boolean(raw.captionsEnabled) : Boolean(raw.captions),
    captions: raw.captionsEnabled !== undefined ? Boolean(raw.captionsEnabled) : Boolean(raw.captions),
    fontSizeMultiplier: parseFloat(raw.fontSizeMultiplier || raw.font_scale || 1.0),
    font_scale: parseFloat(raw.fontSizeMultiplier || raw.font_scale || 1.0),
    reduceMotion: raw.reduceMotion !== undefined ? Boolean(raw.reduceMotion) : Boolean(raw.reduced_motion),
    reduced_motion: raw.reduceMotion !== undefined ? Boolean(raw.reduceMotion) : Boolean(raw.reduced_motion),
    signLanguageEnabled: raw.signLanguageEnabled !== undefined ? Boolean(raw.signLanguageEnabled) : Boolean(raw.sign_language),
    sign_language: raw.signLanguageEnabled !== undefined ? Boolean(raw.signLanguageEnabled) : Boolean(raw.sign_language),
    updatedAt: new Date().toISOString()
  };
}

// 4. Get preferences (current / query)
router.get('/preferences', (req, res) => {
  const store = loadPreferencesStore();
  const key = resolveUserKey(req);
  const userPrefs = normalizePrefs(store[key] || {});

  res.json({
    success: true,
    data: {
      userId: req.query.userId || 'session-default',
      ...userPrefs,
      preferences: userPrefs,
      tenantId: req.tenant ? req.tenant.id : 'public'
    },
    meta: {
      version: 'v1',
      requestId: req.id
    }
  });
});

router.get('/preferences/me', (req, res) => {
  const store = loadPreferencesStore();
  const key = resolveUserKey(req);
  const userPrefs = normalizePrefs(store[key] || {});

  res.json({
    success: true,
    data: {
      userId: req.query.userId || 'session-default',
      ...userPrefs,
      preferences: userPrefs,
      tenantId: req.tenant ? req.tenant.id : 'public'
    },
    meta: {
      version: 'v1',
      requestId: req.id
    }
  });
});

// 5. Validation helper
function validatePreferences(input) {
  const errors = [];
  if (typeof input !== 'object' || input === null) {
    errors.push('Body must be a valid JSON object.');
    return errors;
  }
  if (input.font_scale !== undefined || input.fontSizeMultiplier !== undefined) {
    const fs = parseFloat(input.font_scale || input.fontSizeMultiplier);
    if (isNaN(fs) || fs < 0.6 || fs > 2.5) {
      errors.push('font_scale must be a float between 0.6 and 2.5.');
    }
  }
  if (input.language !== undefined) {
    if (!['en', 'am', 'om', 'ti', 'so'].includes(input.language)) {
      errors.push("language must be one of: 'en', 'am', 'om', 'ti', 'so'.");
    }
  }
  if (input.profileId !== undefined) {
    const validProfiles = ['screen_reader', 'low_vision', 'deaf_hard_of_hearing', 'motor_accessible', 'cognitive_accessible', 'custom', 'default'];
    if (!validProfiles.includes(input.profileId)) {
      errors.push(`profileId must be one of: ${validProfiles.join(', ')}.`);
    }
  }
  return errors;
}

// 6. Set preferences (POST)
router.post('/preferences', (req, res, next) => {
  const validationErrors = validatePreferences(req.body);
  if (validationErrors.length > 0) {
    const err = new Error('Invalid preferences payload provided.');
    err.status = 400;
    err.code = 'INVALID_PARAMETERS';
    err.details = validationErrors;
    return next(err);
  }

  const store = loadPreferencesStore();
  const rawUserId = req.body.userId || req.query.userId || 'session-default';
  const tenantPrefix = req.tenant ? `${req.tenant.id}:` : 'public:';
  const key = `${tenantPrefix}${rawUserId}`;
  const current = store[key] || {};

  let profileSettings = {};
  if (req.body.profileId) {
    const profiles = loadProfiles();
    const match = profiles.find(p => p.id === req.body.profileId);
    if (match) profileSettings = match.settings;
  }

  const updated = normalizePrefs({
    ...current,
    ...profileSettings,
    ...req.body
  });

  store[key] = updated;
  savePreferencesStore(store);

  res.status(200).json({
    success: true,
    data: {
      userId: rawUserId,
      ...updated,
      preferences: updated,
      tenantId: req.tenant ? req.tenant.id : 'public'
    },
    meta: {
      version: 'v1',
      requestId: req.id
    }
  });
});

// 7. Partial update (PATCH) - Requires authentication
router.patch('/preferences/me', requireAuth, (req, res, next) => {
  const validationErrors = validatePreferences(req.body);
  if (validationErrors.length > 0) {
    const err = new Error('Invalid preferences payload provided.');
    err.status = 400;
    err.code = 'INVALID_PARAMETERS';
    err.details = validationErrors;
    return next(err);
  }

  const store = loadPreferencesStore();
  const rawUserId = req.body.userId || req.query.userId || (req.tenant ? req.tenant.id : 'session-default');
  const tenantPrefix = `${req.tenant.id}:`;
  const key = `${tenantPrefix}${rawUserId}`;
  const current = store[key] || {};

  const updated = normalizePrefs({
    ...current,
    ...req.body
  });

  store[key] = updated;
  savePreferencesStore(store);

  res.status(200).json({
    success: true,
    data: {
      userId: rawUserId,
      ...updated,
      preferences: updated,
      tenantId: req.tenant.id
    },
    meta: {
      version: 'v1',
      requestId: req.id
    }
  });
});

module.exports = router;

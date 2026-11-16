const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const os = require('os');
const crypto = require('crypto');
const { spawn } = require('child_process');

const logger = require('./middleware/logger');
const rateLimiter = require('./middleware/rateLimit');
const errorHandler = require('./middleware/errorHandler');

const healthRouter = require('./routes/health');
const localizationRouter = require('./routes/localization');
const accessibilityRouter = require('./routes/accessibility');
const integrationsRouter = require('./routes/integrations');
const docsRouter = require('./routes/docs');
const employmentRouter = require('../employment/api/routes');

const app = express();
const ROOT_DIR = path.join(__dirname, '..');

// 1. Core Middleware
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-api-key', 'x-user-id', 'x-candidate-id', 'x-idempotency-key', 'X-Idempotency-Key']
}));
app.use(express.json());
app.use(logger);

// Idempotency Tracking Middleware (Stores processed operation identifiers & prevents duplicate execution)
const processedIdempotencyKeys = new Map();

app.use((req, res, next) => {
  const idempotencyKey = req.headers['x-idempotency-key'] || req.headers['x-idempotency-key'];
  if (req.method === 'POST' && idempotencyKey) {
    if (processedIdempotencyKeys.has(idempotencyKey)) {
      const cached = processedIdempotencyKeys.get(idempotencyKey);
      console.log(`[Idempotency] Duplicate request prevented for key: ${idempotencyKey}`);
      return res.status(cached.status || 200).json({
        ...cached.body,
        idempotentReplay: true,
        originalTimestamp: cached.timestamp
      });
    }

    const originalJson = res.json.bind(res);
    res.json = (body) => {
      if (res.statusCode >= 200 && res.statusCode < 300) {
        processedIdempotencyKeys.set(idempotencyKey, {
          status: res.statusCode,
          body,
          timestamp: Date.now()
        });
        if (processedIdempotencyKeys.size > 5000) {
          const oldestKey = processedIdempotencyKeys.keys().next().value;
          processedIdempotencyKeys.delete(oldestKey);
        }
      }
      return originalJson(body);
    };
  }
  next();
});

// 2. API v1 Core REST Routes
app.use('/api/v1', rateLimiter);
app.use('/api/v1', healthRouter);
app.use('/api/v1/localization', localizationRouter);
app.use('/api/v1/accessibility', accessibilityRouter);
app.use('/api/v1/integrations', integrationsRouter);
app.use('/api/v1/employment', employmentRouter);
app.use('/api/v1', docsRouter);

// 3. ALX Platform Mock Data & Auth Routes
const userState = {
  id: 'usr_abenezer_01',
  name: 'Abenezer',
  fullName: 'Abenezer Habtamu',
  email: 'abenezer@alx.app',
  points: 1140,
  avatar: 'AH',
  role: 'Software Engineering Learner'
};

const programsData = {
  completed: [
    {
      id: 'prog_foundations',
      title: 'Professional Foundations',
      status: 'Completed',
      description: 'Learn key leadership and professional skills that will help you navigate and succeed in the workplace.',
      icon: 'assets/foundations-icon.png',
      completionDate: '2026-09-15',
      certificateUrl: '/certificates/prof-foundations.pdf'
    }
  ],
  recommended: [
    {
      id: 'prog_founder',
      title: 'Founder Academy',
      presenter: 'Deborah Falope',
      role: 'Co-Founder & Lead',
      description: 'This program is best suited for aspiring founders who do not have an idea, founder...',
      image: 'assets/founder-academy.jpg',
      badge: 'alx ventures',
      modulesCount: 8,
      duration: '6 Weeks'
    },
    {
      id: 'prog_freelancer',
      title: 'Freelancer Academy',
      presenter: 'Ruke Ejegreh',
      role: 'Co-Founder & CEO',
      description: 'This program was created for talented, skilled individuals who want to learn how to...',
      image: 'assets/freelancer-academy.jpg',
      badge: 'alx ventures',
      modulesCount: 6,
      duration: '4 Weeks'
    },
    {
      id: 'prog_data_analytics',
      title: 'Data Analytics',
      presenter: 'ALX Faculty',
      role: 'Data Science Division',
      description: 'Gain Critical Professional Skills and Learn to Analyse Data Like a Pro. You will focus your...',
      image: 'assets/data-analytics.jpg',
      badge: 'alx tech',
      modulesCount: 12,
      duration: '10 Weeks'
    }
  ]
};

const pluginEvents = [];

// ALX Health Check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'LearnBridge Universal Accessibility Platform & ALX Backend',
    timestamp: new Date().toISOString()
  });
});

// Active cryptographic sessions: token -> { user, expiresAt }
const activeSessions = new Map();

// Session Authentication Verification Middleware
function requireAuth(req, res, next) {
  const authHeader = req.headers['authorization'];
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      error: 'UNAUTHORIZED',
      message: 'Authentication required. Please provide a valid Bearer token.'
    });
  }

  const token = authHeader.split(' ')[1];
  const session = activeSessions.get(token);
  if (!session || session.expiresAt < Date.now()) {
    if (session) activeSessions.delete(token);
    return res.status(401).json({
      error: 'SESSION_EXPIRED',
      message: 'Your session has expired. Please log in again.'
    });
  }

  req.user = session.user;
  req.sessionToken = token;
  next();
}

// ALX Authentication / Login
app.post('/api/auth/login', (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required.' });
  }

  if (typeof email !== 'string' || !email.includes('@') || !email.includes('.')) {
    return res.status(400).json({ error: 'Please enter a valid email address.' });
  }

  if (typeof password !== 'string' || password.length < 6) {
    return res.status(400).json({ error: 'Password must be at least 6 characters.' });
  }

  // Issue real cryptographically random session token
  const token = 'lb_sess_' + crypto.randomBytes(24).toString('hex');
  const user = {
    id: 'usr_' + crypto.randomBytes(8).toString('hex'),
    name: email.split('@')[0].replace(/[._-]/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
    email: email.trim().toLowerCase(),
    role: 'Software Engineering Learner',
    avatar: email.substring(0, 2).toUpperCase()
  };

  const expiresAt = Date.now() + (24 * 60 * 60 * 1000); // 24-hour session
  activeSessions.set(token, { user, expiresAt });

  return res.json({
    success: true,
    token,
    user,
    expiresAt
  });
});

// Verify Session Token Endpoint
app.get('/api/auth/verify', (req, res) => {
  const authHeader = req.headers['authorization'];
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ authenticated: false, reason: 'NO_TOKEN' });
  }
  const token = authHeader.split(' ')[1];
  const session = activeSessions.get(token);
  if (!session || session.expiresAt < Date.now()) {
    if (session) activeSessions.delete(token);
    return res.status(401).json({ authenticated: false, reason: 'EXPIRED_OR_INVALID' });
  }
  return res.json({
    authenticated: true,
    user: session.user,
    expiresAt: session.expiresAt
  });
});

// Logout Endpoint
app.post('/api/auth/logout', (req, res) => {
  const authHeader = req.headers['authorization'];
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.split(' ')[1];
    activeSessions.delete(token);
  }
  return res.json({ success: true, message: 'Logged out successfully.' });
});

// Social Authentication
app.post('/api/auth/social', (req, res) => {
  const { provider } = req.body;
  const prov = provider || 'Google';
  const token = 'lb_sess_soc_' + crypto.randomBytes(24).toString('hex');
  const user = {
    id: 'usr_' + crypto.randomBytes(8).toString('hex'),
    name: `Learner (${prov})`,
    email: `learner.${prov.toLowerCase()}@alx.app`,
    role: `${prov} Single Sign-On Verified`,
    avatar: prov.substring(0, 2).toUpperCase()
  };
  const expiresAt = Date.now() + (24 * 60 * 60 * 1000);
  activeSessions.set(token, { user, expiresAt });

  return res.json({
    success: true,
    provider: prov,
    token,
    user,
    expiresAt
  });
});

// Protected User Profile Endpoint (Requires valid Bearer token)
app.get('/api/user/profile', requireAuth, (req, res) => {
  res.json(req.user);
});

// Dedicated Offline Synchronization Endpoint (Handles queued offline operations with Idempotency)
app.post('/api/sync', (req, res) => {
  const { operationId, type, payload } = req.body || {};
  const key = req.headers['x-idempotency-key'] || operationId;

  console.log(`[SyncEngine] Processing offline operation [${type}] with key: ${key}`);

  if (type === 'QUIZ_SUBMIT') {
    return res.json({ success: true, operation: 'QUIZ_SUBMIT', recorded: true, score: 100 });
  }
  if (type === 'DRAFT_SAVE') {
    return res.json({ success: true, operation: 'DRAFT_SAVE', saved: true });
  }
  if (type === 'PROGRESS_UPDATE') {
    return res.json({ success: true, operation: 'PROGRESS_UPDATE', synced: true });
  }
  if (type === 'JOB_APPLY') {
    return res.json({ success: true, operation: 'JOB_APPLY', applied: true });
  }

  return res.json({
    success: true,
    operation: type || 'GENERIC_SYNC',
    acknowledged: true,
    timestamp: Date.now()
  });
});

// Programs Data
app.get('/api/programs', (req, res) => {
  res.json(programsData);
});

// Vid Maker Plugin Integration
app.get('/api/plugin/vid-maker/config', (req, res) => {
  res.json({
    pluginId: 'vid-maker-v1',
    pluginName: 'Vid Maker AI Slide-to-Video Engine',
    version: '1.2.0',
    enabled: true,
    apiEndpoint: `/api/plugin/vid-maker/generate`,
    presets: [
      { id: '1080p_landscape', name: '16:9 Landscape (YouTube/LMS)' },
      { id: '1080p_portrait', name: '9:16 Portrait (Reels/Shorts)' },
      { id: 'square', name: '1:1 Square (Social)' }
    ],
    sampleSlides: [
      { id: 1, title: 'Introduction to Leadership', durationSec: 5, notes: 'Welcome to Professional Foundations.' },
      { id: 2, title: 'Core Competencies', durationSec: 8, notes: 'Critical thinking, communication, and adaptability.' },
      { id: 3, title: 'Final Summary', durationSec: 6, notes: 'Wrap-up and next steps.' }
    ]
  });
});

app.post('/api/plugin/vid-maker/events', (req, res) => {
  const event = {
    id: 'evt_' + Date.now(),
    receivedAt: new Date().toISOString(),
    payload: req.body
  };
  pluginEvents.unshift(event);
  if (pluginEvents.length > 50) pluginEvents.pop();
  res.json({ success: true, eventId: event.id });
});

app.post('/api/plugin/vid-maker/generate', (req, res) => {
  const { programId, slides, voicePreset } = req.body;
  const jobId = 'vid_job_' + Math.random().toString(36).substring(2, 9);
  res.json({
    success: true,
    jobId,
    status: 'processing',
    estimatedSeconds: 3,
    programId: programId || 'prog_foundations',
    message: 'Video rendering queued successfully via Vid Maker plugin backend.'
  });
});

// TTS Endpoint with graceful fallback
let AUDIO_CACHE_DIR = path.join(ROOT_DIR, 'alx-test-website', 'frontend', 'assets', 'audio_cache');
try {
  if (!fs.existsSync(AUDIO_CACHE_DIR)) {
    fs.mkdirSync(AUDIO_CACHE_DIR, { recursive: true });
  }
} catch (_) {
  AUDIO_CACHE_DIR = path.join(os.tmpdir(), 'audio_cache');
  try {
    if (!fs.existsSync(AUDIO_CACHE_DIR)) fs.mkdirSync(AUDIO_CACHE_DIR, { recursive: true });
  } catch (_) {}
}

app.post('/api/tts', (req, res) => {
  const { text, lang = 'en', voice } = req.body;
  if (!text || !text.trim()) {
    return res.status(400).json({ error: 'Text is required' });
  }

  const cleanText = text.trim();
  const hash = crypto.createHash('md5').update(`${lang}_${cleanText}_${voice || ''}`).digest('hex');
  const cacheFileName = `${lang}_${hash}.mp3`;
  const cacheFilePath = path.join(AUDIO_CACHE_DIR, cacheFileName);
  const audioPublicUrl = `/alx/assets/audio_cache/${cacheFileName}`;

  if (fs.existsSync(cacheFilePath)) {
    try {
      const stat = fs.statSync(cacheFilePath);
      if (stat.size > 200) {
        return res.json({ success: true, audioUrl: audioPublicUrl, cached: true });
      }
      fs.unlinkSync(cacheFilePath);
    } catch (_) {}
  }

  const scriptPath = path.join(ROOT_DIR, 'alx-test-website', 'backend', 'tts_engine.py');
  if (!fs.existsSync(scriptPath)) {
    return res.json({ success: false, fallback: true, message: 'Python TTS script not found, using browser speech synthesis' });
  }

  try {
    const payload = JSON.stringify({
      text: cleanText,
      lang,
      outputPath: cacheFilePath,
      voice
    });

    const py = spawn('python', [scriptPath, '--stdin']);
    let stderrData = '';
    let handled = false;

    py.on('error', () => {
      if (!handled) {
        handled = true;
        return res.json({ success: false, fallback: true, message: 'Python not available in runtime environment' });
      }
    });

    py.stderr.on('data', chunk => {
      stderrData += chunk.toString();
    });

    py.on('close', code => {
      if (handled) return;
      handled = true;
      if (code !== 0 || !fs.existsSync(cacheFilePath)) {
        if (fs.existsSync(cacheFilePath)) {
          try { fs.unlinkSync(cacheFilePath); } catch (_) {}
        }
        return res.json({ success: false, fallback: true, error: stderrData });
      }
      try {
        const stat = fs.statSync(cacheFilePath);
        if (stat.size <= 200) {
          fs.unlinkSync(cacheFilePath);
          return res.json({ success: false, fallback: true, error: 'Empty audio output' });
        }
      } catch (_) {}
      return res.json({ success: true, audioUrl: audioPublicUrl, cached: false });
    });

    py.stdin.write(payload, 'utf8');
    py.stdin.end();
  } catch (_) {
    return res.json({ success: false, fallback: true });
  }
});

// 4. Static Files & Demonstrations Serving
app.use('/assets/audio_cache', express.static(AUDIO_CACHE_DIR));
app.use('/job-portal', express.static(path.join(ROOT_DIR, 'employment')));
app.use('/employment', express.static(path.join(ROOT_DIR, 'employment')));
app.use('/alx', express.static(path.join(ROOT_DIR, 'alx-test-website', 'frontend')));
app.use('/alx-test-website', express.static(path.join(ROOT_DIR, 'alx-test-website', 'frontend')));
app.use('/anime-assistant', express.static(path.join(ROOT_DIR, 'alx-test-website', 'anime-assistant')));
app.use('/studio', express.static(path.join(ROOT_DIR, 'studio')));

app.use(express.static(ROOT_DIR, {
  extensions: ['html', 'htm'],
  setHeaders: (res, filePath) => {
    if (filePath.endsWith('.vtt')) {
      res.setHeader('Content-Type', 'text/vtt; charset=utf-8');
    } else if (filePath.endsWith('.json')) {
      res.setHeader('Content-Type', 'application/json; charset=utf-8');
    } else if (filePath.endsWith('.wasm')) {
      res.setHeader('Content-Type', 'application/wasm');
    }
  }
}));

// 5. Fallback for unmatched API routes
app.use('/api', (req, res, next) => {
  const err = new Error(`Cannot ${req.method} ${req.url}. Resource not found.`);
  err.status = 404;
  err.code = 'ENDPOINT_NOT_FOUND';
  next(err);
});

// 6. Global Error Handler
app.use(errorHandler);

// 7. Startup if executed directly
const PORT = process.env.PORT || 4173;
const HOST = process.env.HOST || '0.0.0.0';

if (require.main === module) {
  app.listen(PORT, HOST, () => {
    console.log(`=======================================================`);
    console.log(` LearnBridge Universal Accessibility REST API Engine`);
    console.log(` Status: Running at http://${HOST}:${PORT}`);
    console.log(` REST API: /api/v1/health`);
    console.log(` OpenAPI Docs: /api/v1/docs`);
    console.log(` Default UI (ALX Platform): /`);
    console.log(` 3D Job Portal: /job-portal/`);
    console.log(` Studio UI: /studio/`);
    console.log(`=======================================================`);
  });
}

module.exports = app;

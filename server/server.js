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
  allowedHeaders: ['Content-Type', 'Authorization', 'x-api-key', 'x-user-id', 'x-candidate-id']
}));
app.use(express.json());
app.use(logger);

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

// ALX Authentication / Login
app.post('/api/auth/login', (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }

  const displayName = email.includes('@') ? email.split('@')[0] : 'Abenezer';
  return res.json({
    success: true,
    token: 'jwt_mock_token_alx_' + Date.now(),
    user: {
      ...userState,
      name: displayName.charAt(0).toUpperCase() + displayName.slice(1),
      email: email
    }
  });
});

// Social Authentication
app.post('/api/auth/social', (req, res) => {
  const { provider } = req.body;
  const prov = provider || 'Google';
  return res.json({
    success: true,
    provider: prov,
    token: 'jwt_social_alx_' + Date.now(),
    user: {
      ...userState,
      name: `Abenezer Habtamu (${prov})`,
      email: `abenezer.${prov.toLowerCase()}@alx.app`,
      role: `${prov} Single Sign-On Verified`
    }
  });
});

// User Profile
app.get('/api/user/profile', (req, res) => {
  res.json(userState);
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
    return res.json({ success: true, audioUrl: audioPublicUrl, cached: true });
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
        return res.json({ success: false, fallback: true, error: stderrData });
      }
      return res.json({ success: true, audioUrl: audioPublicUrl, cached: false });
    });

    py.stdin.write(payload, 'utf8');
    py.stdin.end();
  } catch (_) {
    return res.json({ success: false, fallback: true });
  }
});

// 4. Static Files & Demonstrations Serving
app.use('/job-portal', express.static(path.join(ROOT_DIR, 'employment')));
app.use('/employment', express.static(path.join(ROOT_DIR, 'employment')));
app.use('/alx', express.static(path.join(ROOT_DIR, 'alx-test-website', 'frontend')));
app.use('/alx-test-website', express.static(path.join(ROOT_DIR, 'alx-test-website', 'frontend')));
app.use('/anime-assistant', express.static(path.join(ROOT_DIR, 'alx-test-website', 'anime-assistant')));

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
    console.log(` ALX Learning LMS: /alx/`);
    console.log(` 3D Job Portal: /job-portal/`);
    console.log(` Studio UI: /index.html`);
    console.log(`=======================================================`);
  });
}

module.exports = app;

const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 5000;
const HOST = process.env.HOST || '127.0.0.1';

// Middlewares
app.use(cors());
app.use(express.json());

// Serve Frontend Static Files
const FRONTEND_DIR = path.join(__dirname, '..', 'frontend');
app.use(express.static(FRONTEND_DIR));

// Serve Standalone Anime Assistant Module
const ASSISTANT_DIR = path.join(__dirname, '..', 'anime-assistant');
app.use('/anime-assistant', express.static(ASSISTANT_DIR));

// Mock User & Programs Database
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

// Plugin Hook Event Log Store
const pluginEvents = [];

// REST API Endpoints
// Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'ALX Test Website Backend',
    port: PORT,
    timestamp: new Date().toISOString()
  });
});

// Authentication / Login
app.post('/api/auth/login', (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }

  // Allow test credentials
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

// Social Authentication (Google, LinkedIn, Facebook)
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

// User profile & points
app.get('/api/user/profile', (req, res) => {
  res.json(userState);
});

// Programs (Completed & Recommended)
app.get('/api/programs', (req, res) => {
  res.json(programsData);
});

// Vid Maker Plugin Integration API: Get Config & Slide Metadata
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

// Vid Maker Plugin: Webhook/Event Receiver
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

// Vid Maker Plugin: Trigger mock video generation job
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

// ==========================================================
// HIGH-DEFINITION NATURAL HUMAN NEURAL TTS SYNTHESIS & CACHE
// Microsoft Edge Neural Voices: Amharic (Ameha/Mekdes), Tigrinya, Afaan Oromoo (Rafiki), English (Jenny)
// ==========================================================
const crypto = require('crypto');
const fs = require('fs');
const { spawn } = require('child_process');

const AUDIO_CACHE_DIR = path.join(__dirname, '..', 'frontend', 'assets', 'audio_cache');
if (!fs.existsSync(AUDIO_CACHE_DIR)) {
  fs.mkdirSync(AUDIO_CACHE_DIR, { recursive: true });
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
  const audioPublicUrl = `/assets/audio_cache/${cacheFileName}`;

  if (fs.existsSync(cacheFilePath)) {
    return res.json({ success: true, audioUrl: audioPublicUrl, cached: true });
  }

  const scriptPath = path.join(__dirname, 'tts_engine.py');
  const payload = JSON.stringify({
    text: cleanText,
    lang,
    outputPath: cacheFilePath,
    voice
  });

  const py = spawn('python', [scriptPath, '--stdin']);
  let stderrData = '';
  
  py.stderr.on('data', chunk => {
    stderrData += chunk.toString();
  });

  py.on('close', code => {
    if (code !== 0 || !fs.existsSync(cacheFilePath)) {
      console.warn('TTS synth error (exit code ' + code + '):', stderrData);
      return res.status(500).json({ error: 'TTS synthesis error', fallback: true });
    }
    return res.json({ success: true, audioUrl: audioPublicUrl, cached: false });
  });

  py.stdin.write(payload, 'utf8');
  py.stdin.end();
});

// Start Server
app.listen(PORT, HOST, () => {
  console.log(`=======================================================`);
  console.log(` 🚀 ALX Test Website & Vid Maker Host Backend`);
  console.log(` URL: http://${HOST}:${PORT}`);
  console.log(` Login Page: http://${HOST}:${PORT}/#login`);
  console.log(` eHub Dashboard: http://${HOST}:${PORT}/#ehub`);
  console.log(` API Endpoint: http://${HOST}:${PORT}/api/health`);
  console.log(`=======================================================`);
});

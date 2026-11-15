/**
 * LearnBridge Employment — Standalone Server Runner
 * Mounts the isolated Employment REST API and serves the Employment frontend.
 */

const express = require('express');
const path = require('path');
const cors = require('cors');
const crypto = require('crypto');
const fs = require('fs');
const { spawn } = require('child_process');

const employmentRoutes = require('./api/routes');

const app = express();
const PORT = process.env.PORT || 4174;

app.use(cors());
app.use(express.json());

// Audio cache for high-definition studio neural TTS
const AUDIO_CACHE_DIR = path.join(__dirname, 'assets', 'audio_cache');
if (!fs.existsSync(AUDIO_CACHE_DIR)) {
  fs.mkdirSync(AUDIO_CACHE_DIR, { recursive: true });
}
app.use('/assets/audio_cache', express.static(AUDIO_CACHE_DIR));

// High-definition natural neural TTS endpoint (adopted from ALX Website)
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

// Mount isolated employment API
app.use('/api/v1/employment', employmentRoutes);

// Serve employment static assets and parent learning module
app.use('/employment', express.static(path.resolve(__dirname)));
app.use('/learning', express.static(path.resolve(__dirname, '..')));
app.use('/', express.static(path.resolve(__dirname)));

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`[LearnBridge Employment] Running on http://127.0.0.1:${PORT}`);
    console.log(`[LearnBridge Employment] API Explorer: http://127.0.0.1:${PORT}/api/v1/employment/jobs`);
    console.log(`[LearnBridge Employment] Neural TTS: http://127.0.0.1:${PORT}/api/tts`);
  });
}

module.exports = app;

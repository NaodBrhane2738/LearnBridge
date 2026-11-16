/**
 * LearnBridge Employment — Standalone Server Runner
 * Mounts the isolated Employment REST API and serves the Employment frontend.
 */

const express = require('express');
const path = require('path');
const cors = require('cors');

const employmentRoutes = require('./api/routes');

const app = express();
const PORT = process.env.PORT || 4174;

app.use(cors());
app.use(express.json());

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
  });
}

module.exports = app;

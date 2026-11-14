const express = require('express');
const cors = require('cors');
const path = require('path');
const logger = require('./middleware/logger');
const rateLimiter = require('./middleware/rateLimit');
const errorHandler = require('./middleware/errorHandler');

const healthRouter = require('./routes/health');
const localizationRouter = require('./routes/localization');
const accessibilityRouter = require('./routes/accessibility');
const integrationsRouter = require('./routes/integrations');
const docsRouter = require('./routes/docs');

const app = express();
const ROOT_DIR = path.join(__dirname, '..');

// 1. Core Middleware
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-api-key', 'x-user-id']
}));
app.use(express.json());
app.use(logger);

// 2. API v1 Routes
app.use('/api/v1', rateLimiter);
app.use('/api/v1', healthRouter);
app.use('/api/v1/localization', localizationRouter);
app.use('/api/v1/accessibility', accessibilityRouter);
app.use('/api/v1/integrations', integrationsRouter);
app.use('/api/v1', docsRouter);

// 3. Static Files Serving (Frontend & Demonstrations)
app.use(express.static(ROOT_DIR, {
  extensions: ['html', 'htm'],
  setHeaders: (res, filePath) => {
    if (filePath.endsWith('.vtt')) {
      res.setHeader('Content-Type', 'text/vtt; charset=utf-8');
    } else if (filePath.endsWith('.json')) {
      res.setHeader('Content-Type', 'application/json; charset=utf-8');
    }
  }
}));

// 4. Fallback for unmatched API routes
app.use('/api', (req, res, next) => {
  const err = new Error(`Cannot ${req.method} ${req.url}. Resource not found.`);
  err.status = 404;
  err.code = 'ENDPOINT_NOT_FOUND';
  next(err);
});

// 5. Global Error Handler
app.use(errorHandler);

// 6. Startup if executed directly
const PORT = process.env.PORT || 4173;
const HOST = process.env.HOST || '127.0.0.1';

if (require.main === module) {
  app.listen(PORT, HOST, () => {
    console.log(`=======================================================`);
    console.log(` LearnBridge Universal Accessibility REST API Engine`);
    console.log(` Status: Running at http://${HOST}:${PORT}`);
    console.log(` REST API: http://${HOST}:${PORT}/api/v1/health`);
    console.log(` OpenAPI Docs: http://${HOST}:${PORT}/api/v1/docs`);
    console.log(` Savanna LMS Demo: http://${HOST}:${PORT}/integrations/savanna-lms/`);
    console.log(` Job Portal Demo: http://${HOST}:${PORT}/integrations/job-portal/`);
    console.log(` Studio UI: http://${HOST}:${PORT}/index.html`);
    console.log(`=======================================================`);
  });
}

module.exports = app;

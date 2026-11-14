const fs = require('fs');
const path = require('path');

const integrationsPath = path.join(__dirname, '..', 'data', 'integrations.json');

function getIntegrations() {
  try {
    const raw = fs.readFileSync(integrationsPath, 'utf8');
    return JSON.parse(raw).tenants || [];
  } catch (_) {
    return [];
  }
}

function optionalAuth(req, res, next) {
  const apiKey = req.headers['x-api-key'] || (req.headers.authorization && req.headers.authorization.replace(/^Bearer\s+/i, ''));
  if (apiKey) {
    const tenants = getIntegrations();
    const match = tenants.find(t => t.apiKey === apiKey && t.enabled);
    if (match) {
      req.tenant = match;
    }
  }
  next();
}

function requireAuth(req, res, next) {
  const apiKey = req.headers['x-api-key'] || (req.headers.authorization && req.headers.authorization.replace(/^Bearer\s+/i, ''));
  if (!apiKey) {
    const err = new Error('Authentication required. Missing x-api-key header or Bearer token.');
    err.status = 401;
    err.code = 'UNAUTHORIZED';
    return next(err);
  }

  const tenants = getIntegrations();
  const match = tenants.find(t => t.apiKey === apiKey && t.enabled);
  if (!match) {
    const err = new Error('Invalid or revoked API key provided.');
    err.status = 403;
    err.code = 'FORBIDDEN';
    return next(err);
  }

  req.tenant = match;
  next();
}

module.exports = {
  optionalAuth,
  requireAuth
};

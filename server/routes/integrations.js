const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { requireAuth, optionalAuth } = require('../middleware/auth');

const integrationsPath = path.join(__dirname, '..', 'data', 'integrations.json');

function loadIntegrations() {
  try {
    const raw = fs.readFileSync(integrationsPath, 'utf8');
    return JSON.parse(raw).tenants || [];
  } catch (_) {
    return [];
  }
}

function saveIntegrations(tenants) {
  try {
    fs.writeFileSync(integrationsPath, JSON.stringify({ tenants }, null, 2), 'utf8');
  } catch (_) {}
}

// 1. List integrations (Public list of registered platform names & IDs)
router.get('/', optionalAuth, (req, res) => {
  const tenants = loadIntegrations();
  const safeList = tenants.map(t => ({
    id: t.id,
    name: t.name,
    enabled: t.enabled,
    supportedFeatures: t.supportedFeatures,
    // Only disclose API key if caller is the owner tenant
    ...(req.tenant && req.tenant.id === t.id ? { apiKey: t.apiKey } : {})
  }));

  res.json({
    success: true,
    data: {
      count: safeList.length,
      integrations: safeList
    },
    meta: {
      version: 'v1',
      requestId: req.id
    }
  });
});

// 2. Get specific integration by ID
router.get('/:integrationId', optionalAuth, (req, res, next) => {
  const iid = (req.params.integrationId || '').toLowerCase().trim();
  const tenants = loadIntegrations();
  const match = tenants.find(t => t.id === iid);

  if (!match) {
    const err = new Error(`Integration '${iid}' not found.`);
    err.status = 404;
    err.code = 'INTEGRATION_NOT_FOUND';
    return next(err);
  }

  // Cross-tenant data isolation: cannot see secret API keys of other tenants
  const isOwner = req.tenant && req.tenant.id === match.id;
  const safeData = {
    id: match.id,
    name: match.name,
    enabled: match.enabled,
    supportedFeatures: match.supportedFeatures,
    rateLimitPerMin: match.rateLimitPerMin,
    createdAt: match.createdAt,
    ...(isOwner ? { apiKey: match.apiKey, allowedOrigins: match.allowedOrigins } : {})
  };

  res.json({
    success: true,
    data: safeData,
    meta: {
      version: 'v1',
      requestId: req.id
    }
  });
});

// 3. Register a new integration / organization
router.post('/', (req, res, next) => {
  const { name, id, allowedOrigins, supportedFeatures } = req.body || {};

  if (!name || typeof name !== 'string' || name.trim().length < 3) {
    const err = new Error('Organization name is required and must be at least 3 characters.');
    err.status = 400;
    err.code = 'INVALID_PARAMETERS';
    return next(err);
  }

  const tenants = loadIntegrations();
  const tenantId = (id && typeof id === 'string') ? id.toLowerCase().replace(/[^a-z0-9_-]/g, '') : name.toLowerCase().replace(/[^a-z0-9]/g, '-').slice(0, 30);

  if (tenants.some(t => t.id === tenantId)) {
    const err = new Error(`An integration with identifier '${tenantId}' already exists.`);
    err.status = 409;
    err.code = 'TENANT_EXISTS';
    return next(err);
  }

  const generatedApiKey = `lb_live_${tenantId.replace(/-/g, '')}_${crypto.randomBytes(6).toString('hex')}`;
  const newTenant = {
    id: tenantId,
    name: name.trim(),
    apiKey: generatedApiKey,
    allowedOrigins: Array.isArray(allowedOrigins) ? allowedOrigins : ['*'],
    rateLimitPerMin: 300,
    enabled: true,
    createdAt: new Date().toISOString(),
    supportedFeatures: Array.isArray(supportedFeatures) ? supportedFeatures : ['high_contrast', 'captions', 'transcripts']
  };

  tenants.push(newTenant);
  saveIntegrations(tenants);

  res.status(201).json({
    success: true,
    data: {
      id: newTenant.id,
      name: newTenant.name,
      apiKey: newTenant.apiKey,
      rateLimitPerMin: newTenant.rateLimitPerMin,
      message: 'Integration registered successfully. Store your API key securely; it will not be shown in full again.'
    },
    meta: {
      version: 'v1',
      requestId: req.id
    }
  });
});

module.exports = router;

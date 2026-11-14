const windowMs = 60 * 1000; // 1 minute window
const defaultLimit = 150;
const clients = new Map();

function rateLimiter(req, res, next) {
  const identifier = (req.tenant && req.tenant.id) || req.ip || req.socket.remoteAddress || 'anonymous';
  const now = Date.now();
  const limit = (req.tenant && req.tenant.rateLimitPerMin) || defaultLimit;

  let record = clients.get(identifier);
  if (!record || now - record.startTime > windowMs) {
    record = { count: 1, startTime: now };
    clients.set(identifier, record);
  } else {
    record.count++;
  }

  const remaining = Math.max(0, limit - record.count);
  const resetSeconds = Math.ceil((record.startTime + windowMs - now) / 1000);

  res.setHeader('X-RateLimit-Limit', limit);
  res.setHeader('X-RateLimit-Remaining', remaining);
  res.setHeader('X-RateLimit-Reset', resetSeconds);

  if (record.count > limit) {
    const err = new Error(`Rate limit exceeded. Maximum ${limit} requests per minute.`);
    err.status = 429;
    err.code = 'RATE_LIMITED';
    err.details = { retryAfterSeconds: resetSeconds };
    return next(err);
  }

  next();
}

module.exports = rateLimiter;

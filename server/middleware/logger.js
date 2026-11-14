let counter = 1000;

function logger(req, res, next) {
  const reqId = `lb-req-${Date.now()}-${++counter}`;
  req.id = reqId;
  res.setHeader('X-Request-Id', reqId);
  const start = Date.now();

  res.on('finish', () => {
    const duration = Date.now() - start;
    if (process.env.NODE_ENV !== 'test') {
      console.log(`[LearnBridge API] ${req.method} ${req.originalUrl || req.url} ${res.statusCode} (${duration}ms) [${reqId}]`);
    }
  });

  next();
}

module.exports = logger;

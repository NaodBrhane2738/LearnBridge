function errorHandler(err, req, res, next) {
  const statusCode = err.status || err.statusCode || 500;
  const errorCode = err.code || (statusCode === 400 ? 'INVALID_PARAMETERS' : statusCode === 401 ? 'UNAUTHORIZED' : statusCode === 403 ? 'FORBIDDEN' : statusCode === 404 ? 'NOT_FOUND' : statusCode === 429 ? 'RATE_LIMITED' : 'INTERNAL_ERROR');

  const responseBody = {
    success: false,
    error: {
      code: errorCode,
      message: err.message || 'An unexpected error occurred processing your request.',
      ...(err.details ? { details: err.details } : {})
    },
    meta: {
      version: 'v1',
      requestId: req.id || `lb-req-${Date.now()}`
    }
  };

  if (statusCode === 500 && process.env.NODE_ENV !== 'test') {
    console.error(`[LearnBridge API Error] ${req.method} ${req.url}:`, err);
  }

  res.status(statusCode).json(responseBody);
}

module.exports = errorHandler;

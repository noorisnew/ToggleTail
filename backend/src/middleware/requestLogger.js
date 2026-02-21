/**
 * Request logging middleware for ToggleTail API
 */

const logger = require('./logger');

const requestLogger = (req, res, next) => {
  const startTime = Date.now();
  
  // Log incoming request
  logger.request(req);

  // Capture response finish
  res.on('finish', () => {
    const duration = Date.now() - startTime;
    logger.response(req, res, duration);
  });

  next();
};

module.exports = requestLogger;

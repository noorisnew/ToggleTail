/**
 * Centralized logging utility for ToggleTail API
 */

const LOG_LEVELS = {
  ERROR: 0,
  WARN: 1,
  INFO: 2,
  DEBUG: 3,
};

const currentLevel = process.env.LOG_LEVEL 
  ? LOG_LEVELS[process.env.LOG_LEVEL.toUpperCase()] ?? LOG_LEVELS.INFO
  : LOG_LEVELS.INFO;

const formatTimestamp = () => new Date().toISOString();

const formatMessage = (level, message, meta = {}) => {
  const timestamp = formatTimestamp();
  const metaStr = Object.keys(meta).length > 0 ? ` ${JSON.stringify(meta)}` : '';
  return `[${timestamp}] [${level}] ${message}${metaStr}`;
};

const logger = {
  error: (message, meta = {}) => {
    if (currentLevel >= LOG_LEVELS.ERROR) {
      console.error(formatMessage('ERROR', message, meta));
    }
  },

  warn: (message, meta = {}) => {
    if (currentLevel >= LOG_LEVELS.WARN) {
      console.warn(formatMessage('WARN', message, meta));
    }
  },

  info: (message, meta = {}) => {
    if (currentLevel >= LOG_LEVELS.INFO) {
      console.log(formatMessage('INFO', message, meta));
    }
  },

  debug: (message, meta = {}) => {
    if (currentLevel >= LOG_LEVELS.DEBUG) {
      console.log(formatMessage('DEBUG', message, meta));
    }
  },

  // Log HTTP request details
  request: (req) => {
    const meta = {
      method: req.method,
      url: req.originalUrl,
      ip: req.ip,
      userAgent: req.get('User-Agent')?.substring(0, 50),
    };
    logger.info(`→ ${req.method} ${req.originalUrl}`, meta);
  },

  // Log HTTP response details
  response: (req, res, duration) => {
    const meta = {
      method: req.method,
      url: req.originalUrl,
      status: res.statusCode,
      duration: `${duration}ms`,
    };
    const level = res.statusCode >= 400 ? 'warn' : 'info';
    logger[level](`← ${res.statusCode} ${req.method} ${req.originalUrl} (${duration}ms)`, meta);
  },
};

module.exports = logger;

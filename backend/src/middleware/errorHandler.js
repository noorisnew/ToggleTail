/**
 * Centralized error handling middleware for ToggleTail API
 */

const logger = require('./logger');

// Custom API error class
class ApiError extends Error {
  constructor(statusCode, message, isOperational = true) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    this.timestamp = new Date().toISOString();
    Error.captureStackTrace(this, this.constructor);
  }

  static badRequest(message = 'Bad Request') {
    return new ApiError(400, message);
  }

  static unauthorized(message = 'Unauthorized') {
    return new ApiError(401, message);
  }

  static forbidden(message = 'Forbidden') {
    return new ApiError(403, message);
  }

  static notFound(message = 'Not Found') {
    return new ApiError(404, message);
  }

  static conflict(message = 'Conflict') {
    return new ApiError(409, message);
  }

  static internal(message = 'Internal Server Error') {
    return new ApiError(500, message, false);
  }
}

// 404 handler for unknown routes
const notFoundHandler = (req, res, next) => {
  next(ApiError.notFound(`Route ${req.method} ${req.originalUrl} not found`));
};

// Global error handler
const errorHandler = (err, req, res, next) => {
  // Default to 500 if no status code
  const statusCode = err.statusCode || 500;
  const isOperational = err.isOperational ?? false;

  // Log error details
  logger.error(`${err.message}`, {
    statusCode,
    isOperational,
    method: req.method,
    url: req.originalUrl,
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
  });

  // Send error response
  res.status(statusCode).json({
    success: false,
    error: {
      message: isOperational ? err.message : 'Something went wrong',
      statusCode,
      ...(process.env.NODE_ENV === 'development' && {
        stack: err.stack,
        details: err.details,
      }),
    },
  });
};

// Async handler wrapper to catch errors in async route handlers
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

module.exports = {
  ApiError,
  notFoundHandler,
  errorHandler,
  asyncHandler,
};

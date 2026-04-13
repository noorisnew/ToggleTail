/**
 * dbRequired middleware
 *
 * Rejects requests with a clean 503 when MySQL (Prisma) is not connected.
 * Add to any route group that cannot function without the database.
 *
 * Usage in index.js:
 *   app.use('/api/children', dbRequired, childrenRoutes);
 */

const dbState = require('../lib/dbState');

const dbRequired = (req, res, next) => {
  if (!dbState.isConnected) {
    return res.status(503).json({
      error: 'Database unavailable',
      message: 'This feature requires a database connection. The server is running in offline mode.',
      retryAfter: 30,
    });
  }
  next();
};

module.exports = dbRequired;

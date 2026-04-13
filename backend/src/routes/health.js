/**
 * Health Route — /api/health
 * Migrated from Mongoose to Prisma (MySQL).
 */

const express = require('express');
const dbState = require('../lib/dbState');

const router = express.Router();

/**
 * GET /api/health
 * Returns API status and database connection state.
 */
router.get('/', (req, res) => {
  res.json({
    status:    'ok',
    message:   'ToggleTail API is running',
    timestamp: new Date().toISOString(),
    version:   '1.0.0',
    database: {
      type:      'MySQL',
      connected: dbState.isConnected,
      status:    dbState.isConnected ? 'connected' : 'disconnected',
      purpose:   'Anonymous analytics only — user data stored locally on device',
    },
  });
});

module.exports = router;

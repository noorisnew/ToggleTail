const express = require('express');
const mongoose = require('mongoose');
const router = express.Router();

/**
 * GET /api/health
 * Health check endpoint with database status
 */
router.get('/', (req, res) => {
  const dbState = mongoose.connection.readyState;
  const dbStatus = {
    0: 'disconnected',
    1: 'connected',
    2: 'connecting',
    3: 'disconnecting',
  };

  res.json({
    status: 'ok',
    message: 'ToggleTail API is running',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    database: {
      status: dbStatus[dbState] || 'unknown',
      connected: dbState === 1,
      purpose: 'Anonymous analytics only - user data stored locally on device',
    },
  });
});

module.exports = router;

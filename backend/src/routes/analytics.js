const express = require('express');
const mongoose = require('mongoose');
const { DailyStats, FeatureFlag, VoiceCache } = require('../models/Analytics');

const router = express.Router();

/**
 * Helper: Get today's date string (YYYY-MM-DD)
 */
const getTodayKey = () => {
  return new Date().toISOString().split('T')[0];
};

/**
 * Helper: Check if MongoDB is connected
 */
const isDbConnected = () => {
  return mongoose.connection.readyState === 1;
};

/**
 * POST /api/analytics/event
 * Record an anonymous event (no user data)
 * 
 * Body: { event: 'story_generated' | 'story_opened' | 'tts_request' | 'app_session', platform?: 'web' | 'ios' | 'android', readingLevel?: 'beginner' | 'intermediate' | 'advanced' }
 */
router.post('/event', async (req, res) => {
  // If DB not connected, acknowledge but don't fail
  if (!isDbConnected()) {
    return res.json({ 
      success: true, 
      recorded: false,
      message: 'Analytics skipped (offline mode)',
    });
  }

  try {
    const { event, platform, readingLevel } = req.body;
    const dateKey = getTodayKey();

    // Build update object based on event type
    const update = { $inc: {} };
    
    switch (event) {
      case 'story_generated':
        update.$inc.storiesGenerated = 1;
        break;
      case 'story_opened':
        update.$inc.storiesOpened = 1;
        break;
      case 'tts_request':
        update.$inc.ttsRequests = 1;
        break;
      case 'app_session':
        update.$inc.appSessions = 1;
        break;
      default:
        return res.status(400).json({ error: 'Invalid event type' });
    }

    // Track platform if provided (anonymous)
    if (platform && ['web', 'ios', 'android'].includes(platform)) {
      update.$inc[`platforms.${platform}`] = 1;
    }

    // Track reading level if provided (anonymous)
    if (readingLevel && ['beginner', 'intermediate', 'advanced'].includes(readingLevel.toLowerCase())) {
      update.$inc[`readingLevels.${readingLevel.toLowerCase()}`] = 1;
    }

    // Upsert the daily stats document
    await DailyStats.findOneAndUpdate(
      { date: dateKey },
      update,
      { upsert: true, new: true }
    );

    res.json({ success: true, recorded: true });
  } catch (error) {
    console.error('Analytics event error:', error.message);
    // Don't fail the request - analytics are non-critical
    res.json({ success: true, recorded: false, error: 'Analytics temporarily unavailable' });
  }
});

/**
 * GET /api/analytics/stats
 * Get aggregate statistics (for research/admin)
 * Query params: ?days=7 (default 30)
 */
router.get('/stats', async (req, res) => {
  if (!isDbConnected()) {
    return res.json({ 
      connected: false,
      message: 'Database not connected - running in offline mode',
      stats: null,
    });
  }

  try {
    const days = Math.min(parseInt(req.query.days) || 30, 90);
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    const startKey = startDate.toISOString().split('T')[0];

    const stats = await DailyStats.find({ date: { $gte: startKey } })
      .sort({ date: -1 })
      .lean();

    // Aggregate totals
    const totals = stats.reduce((acc, day) => ({
      storiesGenerated: acc.storiesGenerated + (day.storiesGenerated || 0),
      storiesOpened: acc.storiesOpened + (day.storiesOpened || 0),
      ttsRequests: acc.ttsRequests + (day.ttsRequests || 0),
      appSessions: acc.appSessions + (day.appSessions || 0),
    }), { storiesGenerated: 0, storiesOpened: 0, ttsRequests: 0, appSessions: 0 });

    res.json({
      connected: true,
      period: { days, from: startKey, to: getTodayKey() },
      totals,
      daily: stats,
    });
  } catch (error) {
    console.error('Analytics stats error:', error.message);
    res.status(500).json({ error: 'Could not retrieve stats' });
  }
});

/**
 * GET /api/analytics/features
 * Get feature flags for the app
 */
router.get('/features', async (req, res) => {
  if (!isDbConnected()) {
    // Return default flags when offline
    return res.json({
      connected: false,
      flags: {
        aiStoriesEnabled: true,
        ttsEnabled: true,
        offlineModeEnabled: true,
      },
    });
  }

  try {
    const flags = await FeatureFlag.find({}).lean();
    const flagMap = flags.reduce((acc, f) => {
      acc[f.name] = f.enabled;
      return acc;
    }, {});

    res.json({ connected: true, flags: flagMap });
  } catch (error) {
    console.error('Feature flags error:', error.message);
    res.json({
      connected: false,
      flags: {
        aiStoriesEnabled: true,
        ttsEnabled: true,
        offlineModeEnabled: true,
      },
    });
  }
});

/**
 * POST /api/analytics/features
 * Update a feature flag (admin only in production)
 */
router.post('/features', async (req, res) => {
  if (!isDbConnected()) {
    return res.status(503).json({ error: 'Database not connected' });
  }

  try {
    const { name, enabled, description } = req.body;
    
    if (!name) {
      return res.status(400).json({ error: 'Flag name required' });
    }

    const flag = await FeatureFlag.findOneAndUpdate(
      { name },
      { enabled: !!enabled, description: description || '', updatedAt: new Date() },
      { upsert: true, new: true }
    );

    res.json({ success: true, flag });
  } catch (error) {
    console.error('Feature flag update error:', error.message);
    res.status(500).json({ error: 'Could not update feature flag' });
  }
});

module.exports = router;

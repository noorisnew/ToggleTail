/**
 * Analytics Routes — /api/analytics
 * Migrated from Mongoose to Prisma (MySQL).
 *
 * Nested MongoDB fields (platforms.web, readingLevels.beginner) are now flat
 * columns in the daily_stats table (platform_web, reading_level_beginner).
 */

const express = require('express');
const prisma  = require('../lib/prisma');
const dbState = require('../lib/dbState');

const router = express.Router();

const getTodayKey    = () => new Date().toISOString().split('T')[0];
const isDbConnected  = () => dbState.isConnected;

/**
 * Map incoming event + optional sub-fields to Prisma increment objects.
 * Returns an object suitable for use as the `data` argument in upsert.
 */
const buildIncrementData = (event, platform, readingLevel) => {
  const data = {};

  switch (event) {
    case 'story_generated': data.storiesGenerated  = { increment: 1 }; break;
    case 'story_opened':    data.storiesOpened     = { increment: 1 }; break;
    case 'tts_request':     data.ttsRequests       = { increment: 1 }; break;
    case 'app_session':     data.appSessions       = { increment: 1 }; break;
    default: return null; // invalid event
  }

  if (platform === 'web')     data.platformWeb     = { increment: 1 };
  if (platform === 'ios')     data.platformIos     = { increment: 1 };
  if (platform === 'android') data.platformAndroid = { increment: 1 };

  const level = readingLevel?.toLowerCase();
  if (level === 'beginner')     data.readingLevelBeginner     = { increment: 1 };
  if (level === 'intermediate') data.readingLevelIntermediate = { increment: 1 };
  if (level === 'advanced')     data.readingLevelAdvanced     = { increment: 1 };

  return data;
};

// ─── POST /api/analytics/event ────────────────────────────────────────────────
router.post('/event', async (req, res) => {
  if (!isDbConnected()) {
    // Acknowledge but don't fail — analytics are non-critical
    return res.json({ success: true, recorded: false, message: 'Analytics skipped (offline mode)' });
  }

  try {
    const { event, platform, readingLevel } = req.body;
    const date = getTodayKey();

    const incrementData = buildIncrementData(event, platform, readingLevel);
    if (!incrementData) {
      return res.status(400).json({ error: 'Invalid event type' });
    }

    // Build a create-data object with the same fields set to 1 (for initial insert)
    const createData = { date };
    for (const [key] of Object.entries(incrementData)) {
      createData[key] = 1;
    }

    await prisma.dailyStat.upsert({
      where:  { date },
      create: createData,
      update: incrementData,
    });

    res.json({ success: true, recorded: true });
  } catch (error) {
    console.error('Analytics event error:', error.message);
    // Non-critical — return success anyway
    res.json({ success: true, recorded: false, error: 'Analytics temporarily unavailable' });
  }
});

// ─── GET /api/analytics/stats ─────────────────────────────────────────────────
router.get('/stats', async (req, res) => {
  if (!isDbConnected()) {
    return res.json({ connected: false, message: 'Database not connected — running in offline mode', stats: null });
  }

  try {
    const days      = Math.min(parseInt(req.query.days, 10) || 30, 90);
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    const startKey  = startDate.toISOString().split('T')[0];

    const stats = await prisma.dailyStat.findMany({
      where:   { date: { gte: startKey } },
      orderBy: { date: 'desc' },
    });

    const totals = stats.reduce(
      (acc, day) => ({
        storiesGenerated: acc.storiesGenerated + (day.storiesGenerated || 0),
        storiesOpened:    acc.storiesOpened    + (day.storiesOpened    || 0),
        ttsRequests:      acc.ttsRequests      + (day.ttsRequests      || 0),
        appSessions:      acc.appSessions      + (day.appSessions      || 0),
      }),
      { storiesGenerated: 0, storiesOpened: 0, ttsRequests: 0, appSessions: 0 },
    );

    res.json({ connected: true, period: { days, from: startKey, to: getTodayKey() }, totals, daily: stats });
  } catch (error) {
    console.error('Analytics stats error:', error.message);
    res.status(500).json({ error: 'Could not retrieve stats' });
  }
});

// ─── GET /api/analytics/features ─────────────────────────────────────────────
router.get('/features', async (req, res) => {
  const defaults = { aiStoriesEnabled: true, ttsEnabled: true, offlineModeEnabled: true };

  if (!isDbConnected()) {
    return res.json({ connected: false, flags: defaults });
  }

  try {
    const flags    = await prisma.featureFlag.findMany();
    const flagMap  = flags.reduce((acc, f) => { acc[f.name] = f.enabled; return acc; }, {});
    res.json({ connected: true, flags: { ...defaults, ...flagMap } });
  } catch (error) {
    console.error('Feature flags error:', error.message);
    res.json({ connected: false, flags: defaults });
  }
});

// ─── POST /api/analytics/features ────────────────────────────────────────────
router.post('/features', async (req, res) => {
  if (!isDbConnected()) {
    return res.status(503).json({ error: 'Database not connected' });
  }

  try {
    const { name, enabled, description } = req.body;
    if (!name) return res.status(400).json({ error: 'Flag name required' });

    const flag = await prisma.featureFlag.upsert({
      where:  { name },
      create: { name, enabled: !!enabled, description: description || '' },
      update: { enabled: !!enabled, description: description || '' },
    });

    res.json({ success: true, flag });
  } catch (error) {
    console.error('Feature flag update error:', error.message);
    res.status(500).json({ error: 'Could not update feature flag' });
  }
});

module.exports = router;

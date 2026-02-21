const express = require('express');
const Child = require('../models/Child');
const Story = require('../models/Story');
const Approval = require('../models/Approval');
const PlaybackSession = require('../models/PlaybackSession');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

/**
 * GET /api/sync/pull
 * Pull all data updated since a given timestamp
 * Used by client to sync cloud → local
 */
router.get('/pull', requireAuth, async (req, res) => {
  try {
    const { since } = req.query;
    const sinceDate = since ? new Date(since) : new Date(0);

    // Get all children for this parent (updated since timestamp)
    const children = await Child.find({
      parentId: req.parentId,
      updatedAt: { $gt: sinceDate },
    });

    // Get all child IDs
    const allChildren = await Child.find({ parentId: req.parentId }).select('_id');
    const childIds = allChildren.map(c => c._id);

    // Get approvals updated since timestamp
    const approvals = await Approval.find({
      childId: { $in: childIds },
      updatedAt: { $gt: sinceDate },
    }).populate('storyId', 'title category coverUrl');

    // Get stories created by this parent (updated since timestamp)
    const parentStories = await Story.find({
      createdByParentId: req.parentId,
      updatedAt: { $gt: sinceDate },
    });

    // Get playback sessions for all children
    const sessions = await PlaybackSession.find({
      childId: { $in: childIds },
      updatedAt: { $gt: sinceDate },
    });

    // Get current server time for next sync
    const serverTime = new Date().toISOString();

    res.json({
      success: true,
      serverTime,
      data: {
        children,
        approvals,
        parentStories,
        sessions,
      },
      counts: {
        children: children.length,
        approvals: approvals.length,
        parentStories: parentStories.length,
        sessions: sessions.length,
      },
    });
  } catch (error) {
    console.error('Sync pull error:', error.message);
    res.status(500).json({ error: 'Sync failed' });
  }
});

/**
 * POST /api/sync/push
 * Push offline changes from client to cloud
 * Cloud is the source of truth - uses "last write wins"
 */
router.post('/push', requireAuth, async (req, res) => {
  try {
    const { actions = [] } = req.body;

    if (!Array.isArray(actions)) {
      return res.status(400).json({ error: 'actions must be an array' });
    }

    const results = [];

    for (const action of actions) {
      const { type, payload, timestamp } = action;
      const actionTime = new Date(timestamp);

      try {
        switch (type) {
          // Child Profile Actions
          case 'UPDATE_CHILD': {
            const child = await Child.findOne({
              _id: payload.childId,
              parentId: req.parentId,
            });
            if (child && child.updatedAt < actionTime) {
              Object.assign(child, payload.updates);
              await child.save();
              results.push({ type, success: true, id: payload.childId });
            } else {
              results.push({ type, success: false, reason: 'stale' });
            }
            break;
          }

          // Approval Actions
          case 'APPROVE_STORY': {
            const child = await Child.findOne({
              _id: payload.childId,
              parentId: req.parentId,
            });
            if (!child) {
              results.push({ type, success: false, reason: 'child_not_found' });
              break;
            }

            const existing = await Approval.findOne({
              childId: payload.childId,
              storyId: payload.storyId,
            });

            if (!existing || existing.updatedAt < actionTime) {
              await Approval.findOneAndUpdate(
                { childId: payload.childId, storyId: payload.storyId },
                {
                  isApproved: payload.isApproved,
                  allowedModes: payload.allowedModes || ['nativeTTS', 'readAlone'],
                  approvedByParentId: req.parentId,
                  updatedAt: actionTime,
                },
                { upsert: true }
              );
              results.push({ type, success: true });
            } else {
              results.push({ type, success: false, reason: 'stale' });
            }
            break;
          }

          case 'TOGGLE_FAVORITE': {
            const approval = await Approval.findById(payload.approvalId);
            if (approval && approval.updatedAt < actionTime) {
              approval.isFavorite = payload.isFavorite;
              approval.updatedAt = actionTime;
              await approval.save();
              results.push({ type, success: true });
            } else {
              results.push({ type, success: false, reason: 'stale' });
            }
            break;
          }

          // Playback/Progress Actions
          case 'UPDATE_PROGRESS': {
            const child = await Child.findOne({
              _id: payload.childId,
              parentId: req.parentId,
            });
            if (!child) {
              results.push({ type, success: false, reason: 'child_not_found' });
              break;
            }

            const session = await PlaybackSession.findOneAndUpdate(
              { childId: payload.childId, storyId: payload.storyId },
              {
                lastPageIndex: payload.lastPageIndex,
                lastPositionSec: payload.lastPositionSec || 0,
                totalListenTimeSec: payload.totalListenTimeSec || 0,
                lastMode: payload.lastMode || 'readAlone',
                $inc: { sessionCount: 1 },
                updatedAt: actionTime,
              },
              { upsert: true, new: true }
            );
            results.push({ type, success: true, sessionId: session._id });
            break;
          }

          // Story Creation (offline-created stories)
          case 'CREATE_STORY': {
            const story = new Story({
              ...payload,
              sourceType: payload.sourceType || 'parentCreated',
              createdByParentId: req.parentId,
            });
            await story.save();
            results.push({ type, success: true, storyId: story._id });
            break;
          }

          default:
            results.push({ type, success: false, reason: 'unknown_action' });
        }
      } catch (actionError) {
        console.error(`Sync action ${type} error:`, actionError.message);
        results.push({ type, success: false, reason: actionError.message });
      }
    }

    res.json({
      success: true,
      results,
      serverTime: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Sync push error:', error.message);
    res.status(500).json({ error: 'Sync failed' });
  }
});

/**
 * GET /api/sync/status
 * Get sync status and server time
 */
router.get('/status', requireAuth, async (req, res) => {
  try {
    const allChildren = await Child.find({ parentId: req.parentId }).select('_id');
    const childIds = allChildren.map(c => c._id);

    // Get counts
    const counts = {
      children: allChildren.length,
      approvals: await Approval.countDocuments({ childId: { $in: childIds } }),
      stories: await Story.countDocuments({ createdByParentId: req.parentId }),
      sessions: await PlaybackSession.countDocuments({ childId: { $in: childIds } }),
    };

    // Get latest update times
    const latestChild = await Child.findOne({ parentId: req.parentId }).sort({ updatedAt: -1 });
    const latestApproval = await Approval.findOne({ childId: { $in: childIds } }).sort({ updatedAt: -1 });
    const latestStory = await Story.findOne({ createdByParentId: req.parentId }).sort({ updatedAt: -1 });

    res.json({
      success: true,
      serverTime: new Date().toISOString(),
      counts,
      lastUpdated: {
        children: latestChild?.updatedAt || null,
        approvals: latestApproval?.updatedAt || null,
        stories: latestStory?.updatedAt || null,
      },
    });
  } catch (error) {
    console.error('Sync status error:', error.message);
    res.status(500).json({ error: 'Could not get sync status' });
  }
});

module.exports = router;

/**
 * Sync Routes — /api/sync
 * Migrated from Mongoose to Prisma (MySQL).
 *
 * The sync endpoints use a "last-write-wins" strategy for offline changes.
 * All child-ownership checks are performed before applying any mutation.
 */

const express  = require('express');
const prisma   = require('../lib/prisma');
const { computeAgeBand } = require('../lib/parentHelpers');
const { requireAuth }    = require('../middleware/auth');

const router = express.Router();

// ─── GET /api/sync/pull ───────────────────────────────────────────────────────
router.get('/pull', requireAuth, async (req, res) => {
  try {
    const sinceDate = req.query.since ? new Date(req.query.since) : new Date(0);

    // Children updated since the last pull
    const children = await prisma.child.findMany({
      where:   { parentId: req.parentId, updatedAt: { gt: sinceDate } },
      include: { interests: true },
    });

    // All child IDs for this parent (needed for approvals / sessions filter)
    const allChildren = await prisma.child.findMany({
      where:  { parentId: req.parentId },
      select: { id: true },
    });
    const childIds = allChildren.map((c) => c.id);

    const [approvals, parentStories, sessions] = await Promise.all([
      prisma.approval.findMany({
        where:   { childId: { in: childIds }, updatedAt: { gt: sinceDate } },
        include: { allowedModes: true, story: { select: { id: true, title: true, category: true, coverUrl: true } } },
      }),
      prisma.story.findMany({
        where:   { createdByParentId: req.parentId, updatedAt: { gt: sinceDate } },
        include: { pages: true },
      }),
      prisma.playbackSession.findMany({
        where: { childId: { in: childIds }, updatedAt: { gt: sinceDate } },
      }),
    ]);

    res.json({
      success:    true,
      serverTime: new Date().toISOString(),
      data:       { children, approvals, parentStories, sessions },
      counts:     { children: children.length, approvals: approvals.length, parentStories: parentStories.length, sessions: sessions.length },
    });
  } catch (error) {
    console.error('Sync pull error:', error.message);
    res.status(500).json({ error: 'Sync failed' });
  }
});

// ─── POST /api/sync/push ──────────────────────────────────────────────────────
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

          // ── Update child profile ─────────────────────────────────────────
          case 'UPDATE_CHILD': {
            const child = await prisma.child.findFirst({
              where: { id: parseInt(payload.childId, 10), parentId: req.parentId },
            });
            if (!child || child.updatedAt >= actionTime) {
              results.push({ type, success: false, reason: 'stale' });
              break;
            }

            const updates = { ...payload.updates };
            if (updates.age !== undefined) {
              updates.ageBand = computeAgeBand(updates.age);
            }

            // Handle interests separately
            if (updates.interests !== undefined) {
              await prisma.childInterest.deleteMany({ where: { childId: child.id } });
              updates.interests = { create: updates.interests.map((i) => ({ interest: i })) };
            }

            await prisma.child.update({ where: { id: child.id }, data: updates });
            results.push({ type, success: true, id: payload.childId });
            break;
          }

          // ── Approve / unapprove a story ──────────────────────────────────
          case 'APPROVE_STORY': {
            const child = await prisma.child.findFirst({
              where: { id: parseInt(payload.childId, 10), parentId: req.parentId },
            });
            if (!child) { results.push({ type, success: false, reason: 'child_not_found' }); break; }

            const existing = await prisma.approval.findFirst({
              where: { childId: child.id, storyId: parseInt(payload.storyId, 10) },
            });

            if (existing && existing.updatedAt >= actionTime) {
              results.push({ type, success: false, reason: 'stale' });
              break;
            }

            const modes = payload.allowedModes || ['nativeTTS', 'readAlone'];

            await prisma.$transaction(async (tx) => {
              const approval = await tx.approval.upsert({
                where:  { childId_storyId: { childId: child.id, storyId: parseInt(payload.storyId, 10) } },
                create: { childId: child.id, storyId: parseInt(payload.storyId, 10), isApproved: payload.isApproved, approvedByParentId: req.parentId },
                update: { isApproved: payload.isApproved, approvedByParentId: req.parentId },
              });
              await tx.approvalMode.deleteMany({ where: { approvalId: approval.id } });
              await tx.approvalMode.createMany({ data: modes.map((mode) => ({ approvalId: approval.id, mode })) });
            });

            results.push({ type, success: true });
            break;
          }

          // ── Toggle favorite ──────────────────────────────────────────────
          case 'TOGGLE_FAVORITE': {
            const approval = await prisma.approval.findUnique({
              where: { id: parseInt(payload.approvalId, 10) },
            });
            if (!approval || approval.updatedAt >= actionTime) {
              results.push({ type, success: false, reason: 'stale' });
              break;
            }
            await prisma.approval.update({
              where: { id: approval.id },
              data:  { isFavorite: payload.isFavorite },
            });
            results.push({ type, success: true });
            break;
          }

          // ── Update reading / listening progress ──────────────────────────
          case 'UPDATE_PROGRESS': {
            const child = await prisma.child.findFirst({
              where: { id: parseInt(payload.childId, 10), parentId: req.parentId },
            });
            if (!child) { results.push({ type, success: false, reason: 'child_not_found' }); break; }

            const storyId   = parseInt(payload.storyId, 10);
            const pageIndex = payload.lastPageIndex || 0;
            const total     = payload.totalPages    || 1;

            // Determine completion
            const isCompleted  = pageIndex >= total - 1;
            const completedAt  = isCompleted ? new Date() : undefined;

            const session = await prisma.playbackSession.upsert({
              where:  { childId_storyId: { childId: child.id, storyId } },
              create: {
                childId:    child.id,
                storyId,
                lastPageIndex:    pageIndex,
                totalPages:       total,
                lastPositionSec:  payload.lastPositionSec    || 0,
                totalListenTimeSec: payload.totalListenTimeSec || 0,
                lastMode:         payload.lastMode || 'readAlone',
                isCompleted,
                ...(completedAt && { completedAt }),
              },
              update: {
                lastPageIndex:    pageIndex,
                totalPages:       total,
                lastPositionSec:  payload.lastPositionSec    || 0,
                totalListenTimeSec: payload.totalListenTimeSec || 0,
                lastMode:         payload.lastMode || 'readAlone',
                sessionCount:     { increment: 1 },
                isCompleted,
                ...(completedAt && { completedAt }),
              },
            });

            results.push({ type, success: true, sessionId: session.id });
            break;
          }

          // ── Create an offline-authored story ─────────────────────────────
          case 'CREATE_STORY': {
            const text = payload.text || '';
            const words = text.split(/\s+/).filter(Boolean).length;
            const pages = text.split('\n\n').map((p) => p.trim()).filter(Boolean);

            const story = await prisma.story.create({
              data: {
                ...payload,
                sourceType:        payload.sourceType || 'parentCreated',
                createdByParentId: req.parentId,
                wordCount:         words,
                pages: {
                  create: pages.map((content, pageIndex) => ({ pageIndex, content })),
                },
              },
            });
            results.push({ type, success: true, storyId: story.id });
            break;
          }

          default:
            results.push({ type, success: false, reason: 'unknown_action' });
        }
      } catch (actionErr) {
        console.error(`Sync action ${type} error:`, actionErr.message);
        results.push({ type, success: false, reason: actionErr.message });
      }
    }

    res.json({ success: true, results, serverTime: new Date().toISOString() });
  } catch (error) {
    console.error('Sync push error:', error.message);
    res.status(500).json({ error: 'Sync failed' });
  }
});

// ─── GET /api/sync/status ─────────────────────────────────────────────────────
router.get('/status', requireAuth, async (req, res) => {
  try {
    const allChildren = await prisma.child.findMany({
      where:  { parentId: req.parentId },
      select: { id: true },
    });
    const childIds = allChildren.map((c) => c.id);

    const [approvalCount, storyCount, sessionCount] = await Promise.all([
      prisma.approval.count({ where: { childId: { in: childIds } } }),
      prisma.story.count({ where: { createdByParentId: req.parentId } }),
      prisma.playbackSession.count({ where: { childId: { in: childIds } } }),
    ]);

    const [latestChild, latestApproval, latestStory] = await Promise.all([
      prisma.child.findFirst({ where: { parentId: req.parentId }, orderBy: { updatedAt: 'desc' } }),
      prisma.approval.findFirst({ where: { childId: { in: childIds } }, orderBy: { updatedAt: 'desc' } }),
      prisma.story.findFirst({ where: { createdByParentId: req.parentId }, orderBy: { updatedAt: 'desc' } }),
    ]);

    res.json({
      success:    true,
      serverTime: new Date().toISOString(),
      counts:     { children: allChildren.length, approvals: approvalCount, stories: storyCount, sessions: sessionCount },
      lastUpdated: {
        children:  latestChild?.updatedAt   || null,
        approvals: latestApproval?.updatedAt || null,
        stories:   latestStory?.updatedAt    || null,
      },
    });
  } catch (error) {
    console.error('Sync status error:', error.message);
    res.status(500).json({ error: 'Could not get sync status' });
  }
});

module.exports = router;

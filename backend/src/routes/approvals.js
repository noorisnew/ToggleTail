/**
 * Approvals Routes — /api/approvals
 * Migrated from Mongoose to Prisma (MySQL).
 *
 * allowedModes is stored in the approval_modes junction table.
 * All mode writes use a delete-then-create pattern inside a transaction.
 */

const express = require('express');
const prisma  = require('../lib/prisma');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

const DEFAULT_MODES = ['nativeTTS', 'readAlone'];

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Shape a Prisma approval record into the API response format. */
const formatApproval = (approval) => {
  if (!approval) return null;
  const { allowedModes, ...rest } = approval;
  return {
    ...rest,
    allowedModes: allowedModes ? allowedModes.map((m) => m.mode) : [],
  };
};

/**
 * Upsert an approval and atomically replace its allowed modes.
 * Returns the updated approval with modes included.
 */
const upsertApproval = async (childId, storyId, isApproved, allowedModes, approvedByParentId) => {
  return prisma.$transaction(async (tx) => {
    // Upsert the approval row
    const approval = await tx.approval.upsert({
      where:  { childId_storyId: { childId, storyId } },
      create: { childId, storyId, isApproved, approvedByParentId },
      update: { isApproved, approvedByParentId },
    });

    // Replace allowed modes (delete all then re-create)
    await tx.approvalMode.deleteMany({ where: { approvalId: approval.id } });
    await tx.approvalMode.createMany({
      data: allowedModes.map((mode) => ({ approvalId: approval.id, mode })),
    });

    // Re-fetch with modes attached
    return tx.approval.findUnique({
      where:   { id: approval.id },
      include: { allowedModes: true },
    });
  });
};

// ─── POST /api/approvals ──────────────────────────────────────────────────────
router.post('/', requireAuth, async (req, res) => {
  try {
    const {
      childId,
      storyId,
      isApproved   = true,
      allowedModes = DEFAULT_MODES,
    } = req.body;

    if (!childId || !storyId) {
      return res.status(400).json({ error: 'childId and storyId are required' });
    }

    // Verify the child belongs to this parent
    const child = await prisma.child.findFirst({
      where: { id: parseInt(childId, 10), parentId: req.parentId },
    });
    if (!child) {
      return res.status(404).json({ error: 'Child not found' });
    }

    // Verify the story exists
    const story = await prisma.story.findUnique({
      where: { id: parseInt(storyId, 10) },
    });
    if (!story) {
      return res.status(404).json({ error: 'Story not found' });
    }

    const approval = await upsertApproval(
      child.id, story.id, isApproved, allowedModes, req.parentId,
    );

    res.json({ success: true, approval: formatApproval(approval) });
  } catch (error) {
    console.error('Create approval error:', error.message);
    res.status(500).json({ error: 'Could not update approval' });
  }
});

// ─── GET /api/approvals ───────────────────────────────────────────────────────
router.get('/', requireAuth, async (req, res) => {
  try {
    const { childId, isApproved } = req.query;

    let childIdFilter;

    if (childId) {
      const child = await prisma.child.findFirst({
        where: { id: parseInt(childId, 10), parentId: req.parentId },
      });
      if (!child) return res.status(404).json({ error: 'Child not found' });
      childIdFilter = child.id;
    } else {
      // All children belonging to this parent
      const children = await prisma.child.findMany({
        where:  { parentId: req.parentId },
        select: { id: true },
      });
      childIdFilter = { in: children.map((c) => c.id) };
    }

    const where = { childId: childIdFilter };
    if (isApproved !== undefined) where.isApproved = isApproved === 'true';

    const approvals = await prisma.approval.findMany({
      where,
      include: {
        allowedModes: true,
        story: { select: { id: true, title: true, category: true, coverUrl: true, readingLevel: true } },
      },
      orderBy: { updatedAt: 'desc' },
    });

    res.json({ success: true, approvals: approvals.map(formatApproval) });
  } catch (error) {
    console.error('Get approvals error:', error.message);
    res.status(500).json({ error: 'Could not fetch approvals' });
  }
});

// ─── GET /api/approvals/child/:childId ────────────────────────────────────────
router.get('/child/:childId', requireAuth, async (req, res) => {
  try {
    const child = await prisma.child.findFirst({
      where: { id: parseInt(req.params.childId, 10), parentId: req.parentId },
    });
    if (!child) return res.status(404).json({ error: 'Child not found' });

    const approvals = await prisma.approval.findMany({
      where:   { childId: child.id, isApproved: true },
      include: { allowedModes: true, story: true },
      orderBy: { updatedAt: 'desc' },
    });

    // Return stories with their approval metadata embedded
    const stories = approvals
      .filter((a) => a.story)
      .map((a) => ({
        ...a.story,
        approvalId:   a.id,
        allowedModes: a.allowedModes.map((m) => m.mode),
        isFavorite:   a.isFavorite,
      }));

    res.json({ success: true, stories });
  } catch (error) {
    console.error('Get child approvals error:', error.message);
    res.status(500).json({ error: 'Could not fetch approved stories' });
  }
});

// ─── PATCH /api/approvals/:id/favorite ───────────────────────────────────────
router.patch('/:id/favorite', requireAuth, async (req, res) => {
  try {
    const approval = await prisma.approval.findUnique({
      where:   { id: parseInt(req.params.id, 10) },
      include: { allowedModes: true },
    });
    if (!approval) return res.status(404).json({ error: 'Approval not found' });

    // Confirm the child belongs to this parent
    const child = await prisma.child.findFirst({
      where: { id: approval.childId, parentId: req.parentId },
    });
    if (!child) return res.status(403).json({ error: 'Not authorized' });

    const isFavorite = req.body.isFavorite !== undefined
      ? req.body.isFavorite
      : !approval.isFavorite;

    const updated = await prisma.approval.update({
      where:   { id: approval.id },
      data:    { isFavorite },
      include: { allowedModes: true },
    });

    res.json({ success: true, approval: formatApproval(updated) });
  } catch (error) {
    console.error('Toggle favorite error:', error.message);
    res.status(500).json({ error: 'Could not update favorite status' });
  }
});

// ─── DELETE /api/approvals/:id ────────────────────────────────────────────────
router.delete('/:id', requireAuth, async (req, res) => {
  try {
    const approval = await prisma.approval.findUnique({
      where: { id: parseInt(req.params.id, 10) },
    });
    if (!approval) return res.status(404).json({ error: 'Approval not found' });

    const child = await prisma.child.findFirst({
      where: { id: approval.childId, parentId: req.parentId },
    });
    if (!child) return res.status(403).json({ error: 'Not authorized' });

    // Cascade deletes approval_modes automatically (FK ON DELETE CASCADE)
    await prisma.approval.delete({ where: { id: approval.id } });

    res.json({ success: true, message: 'Approval deleted' });
  } catch (error) {
    console.error('Delete approval error:', error.message);
    res.status(500).json({ error: 'Could not delete approval' });
  }
});

// ─── POST /api/approvals/bulk ─────────────────────────────────────────────────
router.post('/bulk', requireAuth, async (req, res) => {
  try {
    const { childId, storyIds, isApproved = true, allowedModes } = req.body;

    if (!childId || !storyIds || !Array.isArray(storyIds)) {
      return res.status(400).json({ error: 'childId and storyIds array are required' });
    }

    const child = await prisma.child.findFirst({
      where: { id: parseInt(childId, 10), parentId: req.parentId },
    });
    if (!child) return res.status(404).json({ error: 'Child not found' });

    const modes = allowedModes || DEFAULT_MODES;

    const results = await Promise.all(
      storyIds.map(async (storyId) => {
        try {
          const approval = await upsertApproval(
            child.id, parseInt(storyId, 10), isApproved, modes, req.parentId,
          );
          return { storyId, success: true, approval: formatApproval(approval) };
        } catch (e) {
          return { storyId, success: false, error: e.message };
        }
      }),
    );

    res.json({ success: true, results });
  } catch (error) {
    console.error('Bulk approval error:', error.message);
    res.status(500).json({ error: 'Could not process bulk approval' });
  }
});

module.exports = router;

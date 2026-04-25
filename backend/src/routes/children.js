/**
 * Children Routes — /api/children
 * Migrated from Mongoose to Prisma (MySQL).
 *
 * Interests are stored in a separate child_interests table.
 * The ageBand is computed from age before every write.
 */

const express = require('express');
const prisma  = require('../lib/prisma');
const { computeAgeBand } = require('../lib/parentHelpers');
const { requireAuth }    = require('../middleware/auth');

const router = express.Router();

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Fetch a child by id, verify it belongs to the requesting parent,
 * and include its interests array.
 */
const findChildForParent = (id, parentId) =>
  prisma.child.findFirst({
    where: { id: parseInt(id, 10), parentId },
    include: { interests: true },
  });

/**
 * Shape a Prisma child record into the API response object,
 * flattening the interests relation into a plain string array.
 */
const formatChild = (child) => {
  if (!child) return null;
  const { interests, ...rest } = child;
  return {
    ...rest,
    interests: interests.map((i) => i.interest),
  };
};

// ─── POST /api/children ───────────────────────────────────────────────────────
router.post('/', requireAuth, async (req, res) => {
  try {
    const { name, age, readingLevel, interests = [], avatar } = req.body;

    if (!name || age === undefined) {
      return res.status(400).json({ error: 'Name and age are required' });
    }
    if (age < 1 || age > 12) {
      return res.status(400).json({ error: 'Age must be between 1 and 12' });
    }
    if (name.trim().length > 30) {
      return res.status(400).json({ error: 'Name must be 30 characters or fewer' });
    }

    const child = await prisma.child.create({
      data: {
        parentId:     req.parentId,
        name:         name.trim(),
        age,
        ageBand:      computeAgeBand(age),
        readingLevel: readingLevel || 'Beginner',
        avatar:       avatar || 'Dino',
        // Create all interests in the same transaction
        interests: {
          create: interests.map((interest) => ({ interest })),
        },
      },
      include: { interests: true },
    });

    res.status(201).json({ success: true, child: formatChild(child) });
  } catch (error) {
    console.error('Create child error:', error.message);
    res.status(500).json({ error: 'Could not create child profile' });
  }
});

// ─── GET /api/children ────────────────────────────────────────────────────────
router.get('/', requireAuth, async (req, res) => {
  try {
    const children = await prisma.child.findMany({
      where:   { parentId: req.parentId },
      include: { interests: true },
      orderBy: { createdAt: 'desc' },
    });

    res.json({ success: true, children: children.map(formatChild) });
  } catch (error) {
    console.error('Get children error:', error.message);
    res.status(500).json({ error: 'Could not fetch children' });
  }
});

// ─── GET /api/children/:id ────────────────────────────────────────────────────
router.get('/:id', requireAuth, async (req, res) => {
  try {
    const child = await findChildForParent(req.params.id, req.parentId);
    if (!child) {
      return res.status(404).json({ error: 'Child not found' });
    }

    res.json({ success: true, child: formatChild(child) });
  } catch (error) {
    console.error('Get child error:', error.message);
    res.status(500).json({ error: 'Could not fetch child' });
  }
});

// ─── PATCH /api/children/:id ──────────────────────────────────────────────────
router.patch('/:id', requireAuth, async (req, res) => {
  try {
    const { name, age, readingLevel, interests, avatar } = req.body;

    const existing = await findChildForParent(req.params.id, req.parentId);
    if (!existing) {
      return res.status(404).json({ error: 'Child not found' });
    }

    if (age !== undefined && (age < 1 || age > 12)) {
      return res.status(400).json({ error: 'Age must be between 1 and 12' });
    }
    if (name !== undefined && name.trim().length > 30) {
      return res.status(400).json({ error: 'Name must be 30 characters or fewer' });
    }

    const newAge     = age !== undefined ? age : existing.age;
    const updateData = {
      ...(name         && { name: name.trim() }),
      ...(age          !== undefined && { age, ageBand: computeAgeBand(age) }),
      ...(readingLevel && { readingLevel }),
      ...(avatar       && { avatar }),
    };

    // If interests are being updated, delete all old ones and re-create
    if (interests !== undefined) {
      await prisma.childInterest.deleteMany({ where: { childId: existing.id } });
      updateData.interests = { create: interests.map((i) => ({ interest: i })) };
    }

    const updated = await prisma.child.update({
      where:   { id: existing.id },
      data:    updateData,
      include: { interests: true },
    });

    res.json({ success: true, child: formatChild(updated) });
  } catch (error) {
    console.error('Update child error:', error.message);
    res.status(500).json({ error: 'Could not update child' });
  }
});

// ─── DELETE /api/children/:id ─────────────────────────────────────────────────
router.delete('/:id', requireAuth, async (req, res) => {
  try {
    const existing = await findChildForParent(req.params.id, req.parentId);
    if (!existing) {
      return res.status(404).json({ error: 'Child not found' });
    }

    await prisma.child.delete({ where: { id: existing.id } });

    res.json({ success: true, message: 'Child profile deleted' });
  } catch (error) {
    console.error('Delete child error:', error.message);
    res.status(500).json({ error: 'Could not delete child' });
  }
});

module.exports = router;

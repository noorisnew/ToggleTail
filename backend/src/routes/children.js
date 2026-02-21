const express = require('express');
const Child = require('../models/Child');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

/**
 * POST /api/children
 * Create a new child profile
 */
router.post('/', requireAuth, async (req, res) => {
  try {
    const { name, age, readingLevel, interests, avatar } = req.body;

    // Validate required fields
    if (!name || !age) {
      return res.status(400).json({ error: 'Name and age are required' });
    }

    if (age < 2 || age > 12) {
      return res.status(400).json({ error: 'Age must be between 2 and 12' });
    }

    // Create child
    const child = new Child({
      parentId: req.parentId,
      name: name.trim(),
      age,
      readingLevel: readingLevel || 'Beginner',
      interests: interests || [],
      avatar: avatar || 'Dino',
    });

    await child.save();

    res.status(201).json({
      success: true,
      child,
    });
  } catch (error) {
    console.error('Create child error:', error.message);
    res.status(500).json({ error: 'Could not create child profile' });
  }
});

/**
 * GET /api/children
 * Get all children for authenticated parent
 */
router.get('/', requireAuth, async (req, res) => {
  try {
    const children = await Child.find({ parentId: req.parentId })
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      children,
    });
  } catch (error) {
    console.error('Get children error:', error.message);
    res.status(500).json({ error: 'Could not fetch children' });
  }
});

/**
 * GET /api/children/:id
 * Get a specific child profile
 */
router.get('/:id', requireAuth, async (req, res) => {
  try {
    const child = await Child.findOne({
      _id: req.params.id,
      parentId: req.parentId,
    });

    if (!child) {
      return res.status(404).json({ error: 'Child not found' });
    }

    res.json({
      success: true,
      child,
    });
  } catch (error) {
    console.error('Get child error:', error.message);
    res.status(500).json({ error: 'Could not fetch child' });
  }
});

/**
 * PATCH /api/children/:id
 * Update a child profile
 */
router.patch('/:id', requireAuth, async (req, res) => {
  try {
    const { name, age, readingLevel, interests, avatar } = req.body;

    const child = await Child.findOne({
      _id: req.params.id,
      parentId: req.parentId,
    });

    if (!child) {
      return res.status(404).json({ error: 'Child not found' });
    }

    // Update fields if provided
    if (name) child.name = name.trim();
    if (age !== undefined) {
      if (age < 2 || age > 12) {
        return res.status(400).json({ error: 'Age must be between 2 and 12' });
      }
      child.age = age;
    }
    if (readingLevel) child.readingLevel = readingLevel;
    if (interests) child.interests = interests;
    if (avatar) child.avatar = avatar;

    await child.save();

    res.json({
      success: true,
      child,
    });
  } catch (error) {
    console.error('Update child error:', error.message);
    res.status(500).json({ error: 'Could not update child' });
  }
});

/**
 * DELETE /api/children/:id
 * Delete a child profile
 */
router.delete('/:id', requireAuth, async (req, res) => {
  try {
    const result = await Child.deleteOne({
      _id: req.params.id,
      parentId: req.parentId,
    });

    if (result.deletedCount === 0) {
      return res.status(404).json({ error: 'Child not found' });
    }

    res.json({
      success: true,
      message: 'Child profile deleted',
    });
  } catch (error) {
    console.error('Delete child error:', error.message);
    res.status(500).json({ error: 'Could not delete child' });
  }
});

module.exports = router;

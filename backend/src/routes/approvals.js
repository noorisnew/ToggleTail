const express = require('express');
const Approval = require('../models/Approval');
const Child = require('../models/Child');
const Story = require('../models/Story');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

/**
 * POST /api/approvals
 * Approve or unapprove a story for a child
 */
router.post('/', requireAuth, async (req, res) => {
  try {
    const { 
      childId, 
      storyId, 
      isApproved = true,
      allowedModes = ['nativeTTS', 'readAlone'],
    } = req.body;

    if (!childId || !storyId) {
      return res.status(400).json({ error: 'childId and storyId are required' });
    }

    // Verify the child belongs to this parent
    const child = await Child.findOne({ _id: childId, parentId: req.parentId });
    if (!child) {
      return res.status(404).json({ error: 'Child not found' });
    }

    // Verify the story exists
    const story = await Story.findById(storyId);
    if (!story) {
      return res.status(404).json({ error: 'Story not found' });
    }

    // Upsert the approval
    const approval = await Approval.findOneAndUpdate(
      { childId, storyId },
      {
        isApproved,
        allowedModes,
        approvedByParentId: req.parentId,
        updatedAt: new Date(),
      },
      { upsert: true, new: true }
    );

    res.json({
      success: true,
      approval,
    });
  } catch (error) {
    console.error('Create approval error:', error.message);
    res.status(500).json({ error: 'Could not update approval' });
  }
});

/**
 * GET /api/approvals
 * Get approvals for a child or all children of the parent
 */
router.get('/', requireAuth, async (req, res) => {
  try {
    const { childId, isApproved } = req.query;

    // Build query
    let query = {};

    if (childId) {
      // Verify child belongs to parent
      const child = await Child.findOne({ _id: childId, parentId: req.parentId });
      if (!child) {
        return res.status(404).json({ error: 'Child not found' });
      }
      query.childId = childId;
    } else {
      // Get all children for this parent
      const children = await Child.find({ parentId: req.parentId }).select('_id');
      query.childId = { $in: children.map(c => c._id) };
    }

    if (isApproved !== undefined) {
      query.isApproved = isApproved === 'true';
    }

    const approvals = await Approval.find(query)
      .populate('storyId', 'title category coverUrl readingLevel')
      .sort({ updatedAt: -1 });

    res.json({
      success: true,
      approvals,
    });
  } catch (error) {
    console.error('Get approvals error:', error.message);
    res.status(500).json({ error: 'Could not fetch approvals' });
  }
});

/**
 * GET /api/approvals/child/:childId
 * Get approved stories for a specific child (for child's view)
 */
router.get('/child/:childId', requireAuth, async (req, res) => {
  try {
    const { childId } = req.params;

    // Verify child belongs to parent
    const child = await Child.findOne({ _id: childId, parentId: req.parentId });
    if (!child) {
      return res.status(404).json({ error: 'Child not found' });
    }

    const approvals = await Approval.find({ 
      childId, 
      isApproved: true,
    })
      .populate('storyId')
      .sort({ updatedAt: -1 });

    // Extract stories with approval info
    const stories = approvals
      .filter(a => a.storyId) // Filter out any with deleted stories
      .map(a => ({
        ...a.storyId.toObject(),
        approvalId: a._id,
        allowedModes: a.allowedModes,
        isFavorite: a.isFavorite,
      }));

    res.json({
      success: true,
      stories,
    });
  } catch (error) {
    console.error('Get child approvals error:', error.message);
    res.status(500).json({ error: 'Could not fetch approved stories' });
  }
});

/**
 * PATCH /api/approvals/:id/favorite
 * Toggle favorite status for an approval
 */
router.patch('/:id/favorite', requireAuth, async (req, res) => {
  try {
    const { isFavorite } = req.body;

    const approval = await Approval.findById(req.params.id);
    if (!approval) {
      return res.status(404).json({ error: 'Approval not found' });
    }

    // Verify parent owns this child
    const child = await Child.findOne({ 
      _id: approval.childId, 
      parentId: req.parentId,
    });
    if (!child) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    approval.isFavorite = isFavorite !== undefined ? isFavorite : !approval.isFavorite;
    await approval.save();

    res.json({
      success: true,
      approval,
    });
  } catch (error) {
    console.error('Toggle favorite error:', error.message);
    res.status(500).json({ error: 'Could not update favorite status' });
  }
});

/**
 * DELETE /api/approvals/:id
 * Delete an approval (removes story access for child)
 */
router.delete('/:id', requireAuth, async (req, res) => {
  try {
    const approval = await Approval.findById(req.params.id);
    if (!approval) {
      return res.status(404).json({ error: 'Approval not found' });
    }

    // Verify parent owns this child
    const child = await Child.findOne({ 
      _id: approval.childId, 
      parentId: req.parentId,
    });
    if (!child) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    await approval.deleteOne();

    res.json({
      success: true,
      message: 'Approval deleted',
    });
  } catch (error) {
    console.error('Delete approval error:', error.message);
    res.status(500).json({ error: 'Could not delete approval' });
  }
});

/**
 * POST /api/approvals/bulk
 * Approve multiple stories for a child at once
 */
router.post('/bulk', requireAuth, async (req, res) => {
  try {
    const { childId, storyIds, isApproved = true, allowedModes } = req.body;

    if (!childId || !storyIds || !Array.isArray(storyIds)) {
      return res.status(400).json({ error: 'childId and storyIds array are required' });
    }

    // Verify child belongs to parent
    const child = await Child.findOne({ _id: childId, parentId: req.parentId });
    if (!child) {
      return res.status(404).json({ error: 'Child not found' });
    }

    const results = await Promise.all(
      storyIds.map(async (storyId) => {
        try {
          const approval = await Approval.findOneAndUpdate(
            { childId, storyId },
            {
              isApproved,
              allowedModes: allowedModes || ['nativeTTS', 'readAlone'],
              approvedByParentId: req.parentId,
              updatedAt: new Date(),
            },
            { upsert: true, new: true }
          );
          return { storyId, success: true, approval };
        } catch (e) {
          return { storyId, success: false, error: e.message };
        }
      })
    );

    res.json({
      success: true,
      results,
    });
  } catch (error) {
    console.error('Bulk approval error:', error.message);
    res.status(500).json({ error: 'Could not process bulk approval' });
  }
});

module.exports = router;

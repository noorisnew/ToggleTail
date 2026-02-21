const mongoose = require('mongoose');

/**
 * Approval Schema
 * Tracks which stories are approved for which children
 * This is per-child because a parent might approve different stories for different children
 */
const ApprovalSchema = new mongoose.Schema({
  childId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Child',
    required: true,
  },
  storyId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Story',
    required: true,
  },
  // Approval status
  isApproved: {
    type: Boolean,
    default: false,
  },
  // Which narration modes are allowed for this story+child
  allowedModes: [{
    type: String,
    enum: ['nativeTTS', 'aiTTS', 'elevenlabs', 'readAlone'],
    default: ['nativeTTS', 'readAlone'],
  }],
  // Parent who approved/unapproved
  approvedByParentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Parent',
    required: true,
  },
  // Favorite status (child can mark favorites)
  isFavorite: {
    type: Boolean,
    default: false,
  },
  // Timestamps
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
});

// Pre-save
ApprovalSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

// Compound unique index: one approval record per child+story
ApprovalSchema.index({ childId: 1, storyId: 1 }, { unique: true });
ApprovalSchema.index({ childId: 1, isApproved: 1 });
ApprovalSchema.index({ updatedAt: -1 });

const Approval = mongoose.model('Approval', ApprovalSchema);

module.exports = Approval;

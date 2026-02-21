const mongoose = require('mongoose');

/**
 * PlaybackSession Schema
 * Tracks reading/listening progress per child per story
 * Used for "continue reading" feature and analytics
 */
const PlaybackSessionSchema = new mongoose.Schema({
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
  // Reading progress
  lastPageIndex: {
    type: Number,
    default: 0,
  },
  totalPages: {
    type: Number,
    default: 1,
  },
  // Audio position (if listening)
  lastPositionSec: {
    type: Number,
    default: 0,
  },
  // Cumulative stats
  totalListenTimeSec: {
    type: Number,
    default: 0,
  },
  totalReadTimeSec: {
    type: Number,
    default: 0,
  },
  // Session count
  sessionCount: {
    type: Number,
    default: 1,
  },
  // Completion tracking
  isCompleted: {
    type: Boolean,
    default: false,
  },
  completedAt: {
    type: Date,
    default: null,
  },
  // Mode used
  lastMode: {
    type: String,
    enum: ['readToMe', 'helpMeRead', 'readAlone'],
    default: 'readAlone',
  },
  // Timestamps
  startedAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
});

// Pre-save
PlaybackSessionSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  
  // Check if completed
  if (this.lastPageIndex >= this.totalPages - 1 && !this.isCompleted) {
    this.isCompleted = true;
    this.completedAt = new Date();
  }
  
  next();
});

// Compound unique index: one session per child+story
PlaybackSessionSchema.index({ childId: 1, storyId: 1 }, { unique: true });
PlaybackSessionSchema.index({ childId: 1, updatedAt: -1 });

const PlaybackSession = mongoose.model('PlaybackSession', PlaybackSessionSchema);

module.exports = PlaybackSession;

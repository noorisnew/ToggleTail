const mongoose = require('mongoose');

/**
 * Narration Schema
 * Stores metadata about generated audio narrations
 * Audio files themselves are stored locally on device or in object storage
 */
const NarrationSchema = new mongoose.Schema({
  storyId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Story',
    required: true,
  },
  // Which page this narration is for (null = full story)
  pageIndex: {
    type: Number,
    default: null,
  },
  // Narration mode/provider
  mode: {
    type: String,
    enum: ['nativeTTS', 'aiTTS', 'elevenlabs'],
    required: true,
  },
  // Voice identifier
  voiceId: {
    type: String,
    required: true,
  },
  voiceName: {
    type: String,
    default: null,
  },
  // Audio location
  // If using cloud storage: full URL
  // If local only: store key for device to generate/cache
  audioUrl: {
    type: String,
    default: null,
  },
  audioKey: {
    type: String,
    default: null,
  },
  // Audio metadata
  durationSec: {
    type: Number,
    default: 0,
  },
  // Checksum for cache validation
  checksum: {
    type: String,
    default: null,
  },
  // File size in bytes
  fileSizeBytes: {
    type: Number,
    default: 0,
  },
  // Timestamps
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

// Index for efficient lookups
NarrationSchema.index({ storyId: 1, mode: 1, voiceId: 1 });
NarrationSchema.index({ storyId: 1, pageIndex: 1 });

const Narration = mongoose.model('Narration', NarrationSchema);

module.exports = Narration;

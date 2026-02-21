const mongoose = require('mongoose');

/**
 * Anonymous Analytics Schema
 * 
 * PRIVACY NOTE: This collection stores ONLY anonymous aggregate counts.
 * No child names, ages, story content, or personally identifiable information.
 * All user data remains in local device storage (AsyncStorage).
 */
const DailyStatsSchema = new mongoose.Schema({
  // Date key (YYYY-MM-DD format for aggregation)
  date: {
    type: String,
    required: true,
  },
  
  // Anonymous event counts (no user identifiers)
  storiesGenerated: {
    type: Number,
    default: 0,
  },
  storiesOpened: {
    type: Number,
    default: 0,
  },
  ttsRequests: {
    type: Number,
    default: 0,
  },
  appSessions: {
    type: Number,
    default: 0,
  },
  
  // Platform breakdown (anonymous)
  platforms: {
    web: { type: Number, default: 0 },
    ios: { type: Number, default: 0 },
    android: { type: Number, default: 0 },
  },
  
  // Reading level distribution (anonymous counts)
  readingLevels: {
    beginner: { type: Number, default: 0 },
    intermediate: { type: Number, default: 0 },
    advanced: { type: Number, default: 0 },
  },
}, {
  timestamps: true,
});

// Compound index for efficient date queries
DailyStatsSchema.index({ date: 1 }, { unique: true });

/**
 * Feature Flags Schema
 * System configuration stored in DB for easy updates
 */
const FeatureFlagSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true,
  },
  enabled: {
    type: Boolean,
    default: false,
  },
  description: {
    type: String,
    default: '',
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
});

/**
 * Voice Cache Schema
 * Caches available TTS voices to reduce API calls
 */
const VoiceCacheSchema = new mongoose.Schema({
  provider: {
    type: String,
    required: true,
    enum: ['elevenlabs', 'system'],
  },
  voices: [{
    id: String,
    name: String,
    language: String,
    gender: String,
  }],
  cachedAt: {
    type: Date,
    default: Date.now,
  },
  expiresAt: {
    type: Date,
    required: true,
  },
});

// Models
const DailyStats = mongoose.model('DailyStats', DailyStatsSchema);
const FeatureFlag = mongoose.model('FeatureFlag', FeatureFlagSchema);
const VoiceCache = mongoose.model('VoiceCache', VoiceCacheSchema);

module.exports = {
  DailyStats,
  FeatureFlag,
  VoiceCache,
};

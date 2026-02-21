const mongoose = require('mongoose');

/**
 * Story Schema
 * Stores story content from library, parent-created, or AI-generated sources
 */
const StorySchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true,
    maxlength: 200,
  },
  // Story content - can be single text or paginated
  text: {
    type: String,
    required: true,
  },
  // Pre-split pages for reading view (optional, computed from text)
  pages: [{
    type: String,
  }],
  // Categorization
  category: {
    type: String,
    enum: [
      'Super Heroes',
      'Dragons & Magic',
      'Fairy Tales',
      'Mystery & Puzzles',
      'Dinosaurs',
      'Ocean Adventures',
      'Cute Animals',
      'Space & Robots',
      'General',
    ],
    default: 'General',
  },
  ageBand: {
    type: String,
    enum: ['2-4', '4-6', '6-8', '8-10', '10-12', 'all'],
    default: 'all',
  },
  readingLevel: {
    type: String,
    enum: ['Beginner', 'Intermediate', 'Advanced'],
    default: 'Beginner',
  },
  language: {
    type: String,
    default: 'en',
  },
  // Source tracking
  sourceType: {
    type: String,
    enum: ['library', 'parentCreated', 'aiGenerated'],
    required: true,
  },
  provider: {
    type: String,
    enum: ['internal', 'storyweaver', 'StoryWeaver', 'gutenberg', 'openai', 'groq'],
    default: 'internal',
  },
  providerStoryId: {
    type: String,
    default: null,
  },
  // External ID from provider (e.g., StoryWeaver story ID)
  externalId: {
    type: String,
    default: null,
  },
  // License information (important for library stories)
  license: {
    type: String,
    default: 'CC-BY-4.0',
  },
  // Author and illustrator for attribution
  author: {
    type: String,
    default: null,
  },
  illustrator: {
    type: String,
    default: null,
  },
  // Full attribution text
  attribution: {
    type: String,
    default: null,
  },
  // Source URL for library stories
  sourceUrl: {
    type: String,
    default: null,
  },

  // Creator tracking
  createdByParentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Parent',
    default: null,
  },
  // For parent-created stories, track which child it was made for
  createdForChildId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Child',
    default: null,
  },
  // Cover image URL (optional)
  coverUrl: {
    type: String,
    default: null,
  },
  // Word count for filtering
  wordCount: {
    type: Number,
    default: 0,
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

// Pre-save: compute pages and word count
StorySchema.pre('save', function(next) {
  this.updatedAt = new Date();
  
  // Compute word count
  this.wordCount = this.text.split(/\s+/).filter(w => w.length > 0).length;
  
  // Split text into pages if not already provided
  if (!this.pages || this.pages.length === 0) {
    this.pages = this.text.split('\n\n').filter(p => p.trim());
    if (this.pages.length === 0) {
      this.pages = [this.text];
    }
  }
  
  next();
});

// Indexes for efficient queries
StorySchema.index({ sourceType: 1, ageBand: 1, readingLevel: 1 });
StorySchema.index({ createdByParentId: 1 });
StorySchema.index({ category: 1 });
StorySchema.index({ updatedAt: -1 });
StorySchema.index({ provider: 1, externalId: 1 }, { sparse: true });

const Story = mongoose.model('Story', StorySchema);

module.exports = Story;

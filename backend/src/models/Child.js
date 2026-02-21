const mongoose = require('mongoose');

/**
 * Child Schema
 * Stores child profile information linked to a parent
 */
const ChildSchema = new mongoose.Schema({
  parentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Parent',
    required: true,
    index: true,
  },
  name: {
    type: String,
    required: true,
    trim: true,
    maxlength: 50,
  },
  age: {
    type: Number,
    required: true,
    min: 2,
    max: 12,
  },
  // Age band for content filtering (computed from age)
  ageBand: {
    type: String,
    enum: ['2-4', '4-6', '6-8', '8-10', '10-12'],
    default: '6-8',
  },
  readingLevel: {
    type: String,
    enum: ['Beginner', 'Intermediate', 'Advanced'],
    default: 'Beginner',
  },
  interests: [{
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
    ],
  }],
  avatar: {
    type: String,
    enum: ['Lion', 'Bear', 'Bunny', 'Panda', 'Fox', 'Koala', 'Unicorn', 'Frog', 'Owl', 'Octopus', 'Dino', 'Cat'],
    default: 'Dino',
  },
  // For sync purposes
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
});

// Auto-calculate ageBand from age
ChildSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  
  // Calculate age band
  if (this.age <= 4) this.ageBand = '2-4';
  else if (this.age <= 6) this.ageBand = '4-6';
  else if (this.age <= 8) this.ageBand = '6-8';
  else if (this.age <= 10) this.ageBand = '8-10';
  else this.ageBand = '10-12';
  
  next();
});

// Index for efficient queries
ChildSchema.index({ parentId: 1, createdAt: -1 });

const Child = mongoose.model('Child', ChildSchema);

module.exports = Child;

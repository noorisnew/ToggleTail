const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

/**
 * Parent Schema
 * Stores parent account information for authentication
 */
const ParentSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
  },
  passwordHash: {
    type: String,
    required: true,
  },
  // Local PIN for quick access (optional, stored hashed)
  pinHash: {
    type: String,
    default: null,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
});

// Hash password before saving
ParentSchema.pre('save', async function(next) {
  if (!this.isModified('passwordHash')) return next();
  // Note: passwordHash should already be hashed when set via setPassword()
  this.updatedAt = new Date();
  next();
});

// Instance method to set password
ParentSchema.methods.setPassword = async function(password) {
  const salt = await bcrypt.genSalt(10);
  this.passwordHash = await bcrypt.hash(password, salt);
};

// Instance method to verify password
ParentSchema.methods.verifyPassword = async function(password) {
  return bcrypt.compare(password, this.passwordHash);
};

// Instance method to set PIN
ParentSchema.methods.setPin = async function(pin) {
  const salt = await bcrypt.genSalt(10);
  this.pinHash = await bcrypt.hash(pin, salt);
};

// Instance method to verify PIN
ParentSchema.methods.verifyPin = async function(pin) {
  if (!this.pinHash) return false;
  return bcrypt.compare(pin, this.pinHash);
};

// Remove sensitive fields when converting to JSON
ParentSchema.methods.toJSON = function() {
  const obj = this.toObject();
  delete obj.passwordHash;
  delete obj.pinHash;
  return obj;
};

const Parent = mongoose.model('Parent', ParentSchema);

module.exports = Parent;

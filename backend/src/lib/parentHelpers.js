/**
 * Parent helper functions
 *
 * Replaces the instance methods that existed on the Mongoose Parent model
 * (setPassword, verifyPassword, setPin, verifyPin, toJSON).
 * With Prisma there are no model instances, so these are plain functions.
 */

const bcrypt = require('bcryptjs');

const SALT_ROUNDS = 10;

/**
 * Hash a plain-text password.
 * @param {string} password
 * @returns {Promise<string>} BCrypt hash
 */
const hashPassword = async (password) => {
  const salt = await bcrypt.genSalt(SALT_ROUNDS);
  return bcrypt.hash(password, salt);
};

/**
 * Verify a plain-text password against its stored BCrypt hash.
 * @param {string} password
 * @param {string} hash
 * @returns {Promise<boolean>}
 */
const verifyPassword = async (password, hash) => {
  return bcrypt.compare(password, hash);
};

/**
 * Hash a plain-text PIN.
 * @param {string} pin
 * @returns {Promise<string>} BCrypt hash
 */
const hashPin = async (pin) => {
  const salt = await bcrypt.genSalt(SALT_ROUNDS);
  return bcrypt.hash(pin, salt);
};

/**
 * Verify a plain-text PIN against its stored BCrypt hash.
 * Returns false if no hash is stored (PIN not set).
 * @param {string} pin
 * @param {string|null} hash
 * @returns {Promise<boolean>}
 */
const verifyPin = async (pin, hash) => {
  if (!hash) return false;
  return bcrypt.compare(pin, hash);
};

/**
 * Strip sensitive fields from a parent record before sending to the client.
 * @param {object} parent  Raw Prisma parent object
 * @returns {object}       Safe parent object (no passwordHash / pinHash)
 */
const toSafeParent = (parent) => {
  if (!parent) return null;
  const { passwordHash, pinHash, ...safe } = parent;
  return safe;
};

/**
 * Compute the age band string from a numeric age.
 * @param {number} age  2-12
 * @returns {string}
 */
const computeAgeBand = (age) => {
  if (age <= 4)  return '2-4';
  if (age <= 6)  return '4-6';
  if (age <= 8)  return '6-8';
  if (age <= 10) return '8-10';
  return '10-12';
};

module.exports = { hashPassword, verifyPassword, hashPin, verifyPin, toSafeParent, computeAgeBand };

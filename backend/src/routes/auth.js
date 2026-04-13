/**
 * Auth Routes — /api/auth
 * Migrated from Mongoose to Prisma (MySQL).
 */

const express = require('express');
const prisma  = require('../lib/prisma');
const { hashPassword, verifyPassword, hashPin, verifyPin, toSafeParent } = require('../lib/parentHelpers');
const { generateToken, requireAuth } = require('../middleware/auth');

const router = express.Router();

/**
 * POST /api/auth/register
 * Create a new parent account.
 */
router.post('/register', async (req, res) => {
  try {
    const { email, password, pin } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }
    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }

    // Check for duplicate email
    const existing = await prisma.parent.findUnique({
      where: { email: email.toLowerCase() },
    });
    if (existing) {
      return res.status(400).json({ error: 'Email already registered' });
    }

    const passwordHash = await hashPassword(password);
    const pinHash      = pin && pin.length >= 4 ? await hashPin(pin) : null;

    const parent = await prisma.parent.create({
      data: {
        email: email.toLowerCase().trim(),
        passwordHash,
        pinHash,
      },
    });

    const token = generateToken(parent.id);

    res.status(201).json({
      success: true,
      message: 'Account created successfully',
      token,
      parent: toSafeParent(parent),
    });
  } catch (error) {
    console.error('Register error:', error.message);
    res.status(500).json({ error: 'Could not create account' });
  }
});

/**
 * POST /api/auth/login
 * Login with email and password.
 */
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const parent = await prisma.parent.findUnique({
      where: { email: email.toLowerCase() },
    });
    if (!parent) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const isValid = await verifyPassword(password, parent.passwordHash);
    if (!isValid) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const token = generateToken(parent.id);

    res.json({
      success: true,
      message: 'Login successful',
      token,
      parent: toSafeParent(parent),
    });
  } catch (error) {
    console.error('Login error:', error.message);
    res.status(500).json({ error: 'Login failed' });
  }
});

/**
 * POST /api/auth/pin
 * Quick login with PIN (requires parentId in body).
 */
router.post('/pin', async (req, res) => {
  try {
    const { parentId, pin } = req.body;

    if (!parentId || !pin) {
      return res.status(400).json({ error: 'Parent ID and PIN are required' });
    }

    const parent = await prisma.parent.findUnique({
      where: { id: parseInt(parentId, 10) },
    });
    if (!parent) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const isValid = await verifyPin(pin, parent.pinHash);
    if (!isValid) {
      return res.status(401).json({ error: 'Invalid PIN' });
    }

    const token = generateToken(parent.id);

    res.json({
      success: true,
      token,
      parent: toSafeParent(parent),
    });
  } catch (error) {
    console.error('PIN login error:', error.message);
    res.status(500).json({ error: 'PIN login failed' });
  }
});

/**
 * GET /api/auth/me
 * Return the currently authenticated parent.
 */
router.get('/me', requireAuth, async (req, res) => {
  res.json({
    success: true,
    parent: toSafeParent(req.parent),
  });
});

/**
 * PATCH /api/auth/pin
 * Update the PIN for the authenticated parent.
 */
router.patch('/pin', requireAuth, async (req, res) => {
  try {
    const { pin } = req.body;

    if (!pin || pin.length < 4) {
      return res.status(400).json({ error: 'PIN must be at least 4 characters' });
    }

    const pinHash = await hashPin(pin);

    await prisma.parent.update({
      where: { id: req.parentId },
      data:  { pinHash },
    });

    res.json({ success: true, message: 'PIN updated successfully' });
  } catch (error) {
    console.error('Update PIN error:', error.message);
    res.status(500).json({ error: 'Could not update PIN' });
  }
});

/**
 * PATCH /api/auth/password
 * Update the password for the authenticated parent.
 */
router.patch('/password', requireAuth, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: 'Current and new password are required' });
    }
    if (newPassword.length < 6) {
      return res.status(400).json({ error: 'New password must be at least 6 characters' });
    }

    const isValid = await verifyPassword(currentPassword, req.parent.passwordHash);
    if (!isValid) {
      return res.status(401).json({ error: 'Current password is incorrect' });
    }

    const passwordHash = await hashPassword(newPassword);

    await prisma.parent.update({
      where: { id: req.parentId },
      data:  { passwordHash },
    });

    res.json({ success: true, message: 'Password updated successfully' });
  } catch (error) {
    console.error('Update password error:', error.message);
    res.status(500).json({ error: 'Could not update password' });
  }
});

module.exports = router;

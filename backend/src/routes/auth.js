const express = require('express');
const Parent = require('../models/Parent');
const { generateToken, requireAuth } = require('../middleware/auth');

const router = express.Router();

/**
 * POST /api/auth/register
 * Register a new parent account
 */
router.post('/register', async (req, res) => {
  try {
    const { email, password, pin } = req.body;

    // Validate input
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }

    // Check if email already exists
    const existingParent = await Parent.findOne({ email: email.toLowerCase() });
    if (existingParent) {
      return res.status(400).json({ error: 'Email already registered' });
    }

    // Create new parent
    const parent = new Parent({ email: email.toLowerCase() });
    await parent.setPassword(password);
    
    // Set PIN if provided
    if (pin && pin.length >= 4) {
      await parent.setPin(pin);
    }

    await parent.save();

    // Generate token
    const token = generateToken(parent._id);

    res.status(201).json({
      success: true,
      message: 'Account created successfully',
      token,
      parent: parent.toJSON(),
    });
  } catch (error) {
    console.error('Register error:', error.message);
    res.status(500).json({ error: 'Could not create account' });
  }
});

/**
 * POST /api/auth/login
 * Login with email and password
 */
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    // Find parent
    const parent = await Parent.findOne({ email: email.toLowerCase() });
    if (!parent) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    // Verify password
    const isValid = await parent.verifyPassword(password);
    if (!isValid) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    // Generate token
    const token = generateToken(parent._id);

    res.json({
      success: true,
      message: 'Login successful',
      token,
      parent: parent.toJSON(),
    });
  } catch (error) {
    console.error('Login error:', error.message);
    res.status(500).json({ error: 'Login failed' });
  }
});

/**
 * POST /api/auth/pin
 * Quick login with PIN (requires parentId)
 */
router.post('/pin', async (req, res) => {
  try {
    const { parentId, pin } = req.body;

    if (!parentId || !pin) {
      return res.status(400).json({ error: 'Parent ID and PIN are required' });
    }

    const parent = await Parent.findById(parentId);
    if (!parent) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const isValid = await parent.verifyPin(pin);
    if (!isValid) {
      return res.status(401).json({ error: 'Invalid PIN' });
    }

    const token = generateToken(parent._id);

    res.json({
      success: true,
      token,
      parent: parent.toJSON(),
    });
  } catch (error) {
    console.error('PIN login error:', error.message);
    res.status(500).json({ error: 'PIN login failed' });
  }
});

/**
 * GET /api/auth/me
 * Get current authenticated parent
 */
router.get('/me', requireAuth, async (req, res) => {
  res.json({
    success: true,
    parent: req.parent.toJSON(),
  });
});

/**
 * PATCH /api/auth/pin
 * Update PIN for authenticated parent
 */
router.patch('/pin', requireAuth, async (req, res) => {
  try {
    const { pin } = req.body;

    if (!pin || pin.length < 4) {
      return res.status(400).json({ error: 'PIN must be at least 4 characters' });
    }

    await req.parent.setPin(pin);
    await req.parent.save();

    res.json({
      success: true,
      message: 'PIN updated successfully',
    });
  } catch (error) {
    console.error('Update PIN error:', error.message);
    res.status(500).json({ error: 'Could not update PIN' });
  }
});

/**
 * PATCH /api/auth/password
 * Update password for authenticated parent
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

    // Verify current password
    const isValid = await req.parent.verifyPassword(currentPassword);
    if (!isValid) {
      return res.status(401).json({ error: 'Current password is incorrect' });
    }

    await req.parent.setPassword(newPassword);
    await req.parent.save();

    res.json({
      success: true,
      message: 'Password updated successfully',
    });
  } catch (error) {
    console.error('Update password error:', error.message);
    res.status(500).json({ error: 'Could not update password' });
  }
});

module.exports = router;

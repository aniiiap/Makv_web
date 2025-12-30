const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const User = require('../models/User');
const Client = require('../models/Client');
const { auth, JWT_SECRET } = require('../middleware/auth');
const jwt = require('jsonwebtoken');

// @route   POST /api/auth/register
// @desc    Register a new master/admin user
// @access  Public (for initial setup, can be restricted later)
router.post('/register', [
  body('email').isEmail().normalizeEmail(),
  body('password').isLength({ min: 6 }),
  body('name').notEmpty().trim(),
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const { email, password, name } = req.body;

    // Check if user already exists
    let user = await User.findOne({ email });
    if (user) {
      return res.status(400).json({ success: false, message: 'User already exists' });
    }

    // Create new master user
    user = new User({
      email,
      password,
      name,
      role: 'master',
    });

    await user.save();

    // Generate JWT token
    const token = jwt.sign(
      { id: user._id, role: user.role },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.status(201).json({
      success: true,
      message: 'Master user registered successfully',
      token,
      user: {
        id: user._id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
    });
  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @route   POST /api/auth/login
// @desc    Login user (master or client)
// @access  Public
router.post('/login', [
  body('email').isEmail().normalizeEmail(),
  body('password').notEmpty(),
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const { email, password } = req.body;

    // Find user
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ success: false, message: 'Invalid credentials' });
    }

    // Check password
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(400).json({ success: false, message: 'Invalid credentials' });
    }

    // Generate JWT token
    const token = jwt.sign(
      { id: user._id, role: user.role },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      success: true,
      message: 'Login successful',
      token,
      user: {
        id: user._id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @route   GET /api/auth/me
// @desc    Get current user
// @access  Private
router.get('/me', auth, async (req, res) => {
  try {
    res.json({
      success: true,
      user: {
        id: req.user._id,
        email: req.user.email,
        name: req.user.name,
        role: req.user.role,
      },
    });
  } catch (error) {
    console.error('Get me error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @route   POST /api/auth/client-login
// @desc    Client login using PAN and Mobile number
// @access  Public
router.post('/client-login', [
  body('pan').notEmpty().withMessage('PAN is required'),
  body('mobile').notEmpty().withMessage('Mobile number is required'),
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const { pan, mobile } = req.body;

    // Normalize PAN (uppercase, remove spaces and special characters)
    const normalizedPan = pan.toUpperCase().replace(/[^A-Z0-9]/g, '').trim();
    
    // Normalize mobile (remove spaces, +, -, parentheses, keep only digits)
    const normalizedMobile = mobile.replace(/[^\d]/g, '');
    // Extract last 10 digits (in case country code is included)
    const mobileLast10 = normalizedMobile.slice(-10);

    if (!normalizedPan || normalizedPan.length !== 10) {
      return res.status(400).json({ success: false, message: 'Invalid PAN format' });
    }

    if (!mobileLast10 || mobileLast10.length !== 10) {
      return res.status(400).json({ success: false, message: 'Invalid mobile number' });
    }

    // Find client by PAN (stored as uppercase) and mobile (exact match on normalized phone)
    const client = await Client.findOne({
      pan: normalizedPan,
      phone: mobileLast10, // Phone is normalized to last 10 digits in pre-save hook
    });

    if (!client) {
      return res.status(400).json({ success: false, message: 'Invalid PAN or Mobile number' });
    }

    // Check if client has a user account (if not, create one automatically)
    let user = null;
    if (client.userId) {
      user = await User.findById(client.userId);
    }

    // If no user account exists, create one automatically (no password needed for PAN+Mobile auth)
    if (!user) {
      // Generate a secure random password (not used for PAN+Mobile auth, but required by User model)
      const crypto = require('crypto');
      const randomPassword = crypto.randomBytes(16).toString('hex');
      
      user = new User({
        email: client.email || `${normalizedPan.toLowerCase()}@client.makv.com`, // Use PAN-based email if no email
        password: randomPassword, // Random password (not used for PAN+Mobile auth)
        name: client.name,
        role: 'client',
      });

      await user.save();

      // Link client to user
      client.userId = user._id;
      await client.save();
    }

    // Generate JWT token
    const token = jwt.sign(
      { id: user._id, role: user.role },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      success: true,
      message: 'Login successful',
      token,
      user: {
        id: user._id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
    });
  } catch (error) {
    console.error('Client login error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router;

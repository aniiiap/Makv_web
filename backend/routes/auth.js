const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const User = require('../models/User');
const Client = require('../models/Client');
const Otp = require('../models/Otp');
const { auth, JWT_SECRET } = require('../middleware/auth');
const jwt = require('jsonwebtoken');
const { Resend } = require('resend');

// Configure Resend client using API key
// Make sure to set RESEND_API_KEY and RESEND_FROM_EMAIL in Render
let resend;
try {
  if (process.env.RESEND_API_KEY && process.env.RESEND_API_KEY.startsWith('re_')) {
    resend = new Resend(process.env.RESEND_API_KEY);
  } else {
    console.warn('RESEND_API_KEY is missing or invalid. Auth emails (OTP) will not be sent.');
  }
} catch (error) {
  console.error('Error initializing Resend in auth.js:', error);
}

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

// Helper function to send OTP to client's email using Resend
const sendOtpEmail = async (toEmail, otp, clientName) => {
  if (!resend) {
    console.warn('Resend client not initialized. OTP email skipped.');
    return;
  }
  const fromEmail = process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev';

  const subject = 'Your MAKV & Associates Client Portal OTP';
  const text =
    `Dear ${clientName || 'Client'},\n\n` +
    `Your one-time password (OTP) for logging into the MAKV & Associates client portal is: ${otp}\n\n` +
    `This OTP is valid for 5 minutes and can be used only once.\n` +
    `If you did not request this, please ignore this email.\n\n` +
    `Best regards,\n` +
    `M A K V & Associates\n`;

  await resend.emails.send({
    from: `M A K V & Associates <${fromEmail}>`,
    to: [toEmail],
    subject,
    text,
  });
};

// @route   POST /api/auth/client-send-otp
// @desc    Send OTP to client's registered email (after validating PAN + Mobile)
// @access  Public
router.post('/client-send-otp', [
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

    // Find client by PAN and mobile
    const client = await Client.findOne({
      pan: normalizedPan,
      phone: mobileLast10,
    });

    if (!client) {
      // Don't reveal if PAN or mobile is wrong (security best practice)
      return res.status(400).json({ success: false, message: 'Invalid PAN or Mobile number' });
    }

    if (!client.email) {
      return res.status(400).json({
        success: false,
        message: 'No email address found for this client. Please contact the office.',
      });
    }

    // Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    // Delete any existing OTPs for this mobile+pan combination
    await Otp.deleteMany({ mobile: mobileLast10, pan: normalizedPan });

    // Save OTP to database (expires in 5 minutes)
    const otpRecord = new Otp({
      mobile: mobileLast10,
      pan: normalizedPan,
      otp: otp,
      expiresAt: new Date(Date.now() + 5 * 60 * 1000), // 5 minutes
    });

    await otpRecord.save();

    // Send OTP via email using Resend
    try {
      await sendOtpEmail(client.email, otp, client.name);
      res.json({
        success: true,
        message: 'OTP sent successfully to your registered email address',
      });
    } catch (emailError) {
      console.error('Error sending OTP email:', emailError);
      return res.status(500).json({
        success: false,
        message: 'Failed to send OTP email. Please try again later.',
      });
    }
  } catch (error) {
    console.error('Send OTP error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @route   POST /api/auth/client-verify-otp
// @desc    Verify OTP and login client
// @access  Public
router.post('/client-verify-otp', [
  body('pan').notEmpty().withMessage('PAN is required'),
  body('mobile').notEmpty().withMessage('Mobile number is required'),
  body('otp').notEmpty().withMessage('OTP is required'),
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const { pan, mobile, otp } = req.body;

    // Normalize PAN and mobile
    const normalizedPan = pan.toUpperCase().replace(/[^A-Z0-9]/g, '').trim();
    const normalizedMobile = mobile.replace(/[^\d]/g, '');
    const mobileLast10 = normalizedMobile.slice(-10);

    if (!normalizedPan || normalizedPan.length !== 10) {
      return res.status(400).json({ success: false, message: 'Invalid PAN format' });
    }

    if (!mobileLast10 || mobileLast10.length !== 10) {
      return res.status(400).json({ success: false, message: 'Invalid mobile number' });
    }

    // Find OTP record
    const otpRecord = await Otp.findOne({
      mobile: mobileLast10,
      pan: normalizedPan,
      otp: otp,
      verified: false,
    });

    if (!otpRecord) {
      return res.status(400).json({ success: false, message: 'Invalid or expired OTP' });
    }

    // Check if OTP is expired
    if (new Date() > otpRecord.expiresAt) {
      await Otp.deleteOne({ _id: otpRecord._id });
      return res.status(400).json({ success: false, message: 'OTP has expired. Please request a new one.' });
    }

    // Check attempts (max 5 attempts)
    if (otpRecord.attempts >= 5) {
      await Otp.deleteOne({ _id: otpRecord._id });
      return res.status(400).json({ success: false, message: 'Too many attempts. Please request a new OTP.' });
    }

    // Mark OTP as verified
    otpRecord.verified = true;
    await otpRecord.save();

    // Find client
    const client = await Client.findOne({
      pan: normalizedPan,
      phone: mobileLast10,
    });

    if (!client) {
      return res.status(400).json({ success: false, message: 'Client not found' });
    }

    // Check if client has a user account (if not, create one automatically)
    let user = null;
    if (client.userId) {
      user = await User.findById(client.userId);
    }

    // If no user account exists, create one automatically
    if (!user) {
      const crypto = require('crypto');
      const randomPassword = crypto.randomBytes(16).toString('hex');

      user = new User({
        email: client.email || `${normalizedPan.toLowerCase()}@client.makv.com`,
        password: randomPassword,
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

    // Delete OTP record after successful verification
    await Otp.deleteOne({ _id: otpRecord._id });

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
    console.error('Verify OTP error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router;

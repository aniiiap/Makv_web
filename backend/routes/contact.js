const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const nodemailer = require('nodemailer');
const Contact = require('../models/Contact');

// Configure email transporter using environment variables
// Make sure to set these in Render:
// SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, CONTACT_TO_EMAIL
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT) || 587,
  secure: process.env.SMTP_SECURE === 'true', // true for 465, false for 587
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

// @route   POST /api/contact
// @desc    Submit contact form
// @access  Public
router.post(
  '/',
  [
    body('name').trim().notEmpty().withMessage('Name is required'),
    body('email').isEmail().withMessage('Please provide a valid email'),
    body('phone').trim().notEmpty().withMessage('Phone number is required'),
    body('message').trim().notEmpty().withMessage('Message is required'),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { name, email, phone, message, service } = req.body;

      const contact = new Contact({
        name,
        email,
        phone,
        message,
        service,
      });

      await contact.save();

      // Prepare email details
      const toEmail = process.env.CONTACT_TO_EMAIL || 'webmakv@gmail.com';

      // Email to you (admin)
      const adminMailOptions = {
        from: `"MAKV Website" <${process.env.SMTP_FROM || process.env.SMTP_USER}>`,
        to: toEmail,
        subject: `New contact form submission from ${name}`,
        text: `You have received a new contact form submission:\n\n` +
          `Name: ${name}\n` +
          `Email: ${email}\n` +
          `Phone: ${phone}\n` +
          `Service Interested In: ${service || 'Not specified'}\n\n` +
          `Message:\n${message}\n`,
      };

      // Thank-you email to the user
      const userMailOptions = {
        from: `"MAKV & Associates" <${process.env.SMTP_FROM || process.env.SMTP_USER}>`,
        to: email,
        subject: 'Thank you for contacting M A K V & Associates',
        text:
          `Dear ${name},\n\n` +
          `Thank you for reaching out to M A K V & Associates.\n\n` +
          `We have received your message and will get back to you as soon as possible.\n\n` +
          `For your reference, here are the details you submitted:\n` +
          `Phone: ${phone}\n` +
          `Service Interested In: ${service || 'Not specified'}\n` +
          `Message:\n${message}\n\n` +
          `Best regards,\n` +
          `M A K V & Associates\n`,
      };

      // Send emails (don't block response if email fails)
      try {
        await transporter.sendMail(adminMailOptions);
        await transporter.sendMail(userMailOptions);
      } catch (emailError) {
        console.error('Error sending contact emails:', emailError);
        // Do not return an error to the user; just log it
      }

      res.status(201).json({
        success: true,
        message: 'Thank you for contacting us! We will get back to you soon.',
        data: contact,
      });
    } catch (error) {
      console.error('Contact form error:', error);
      res.status(500).json({
        success: false,
        message: 'Server error. Please try again later.',
      });
    }
  }
);

// @route   GET /api/contact
// @desc    Get all contact submissions (for admin)
// @access  Public (should be protected in production)
router.get('/', async (req, res) => {
  try {
    const contacts = await Contact.find().sort({ createdAt: -1 });
    res.json({ success: true, data: contacts });
  } catch (error) {
    console.error('Get contacts error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

module.exports = router;


const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const { Resend } = require('resend');
const Contact = require('../models/Contact');

// Configure Resend client using API key
// Make sure to set RESEND_API_KEY and RESEND_FROM_EMAIL in Render
let resend;
try {
  if (process.env.RESEND_API_KEY && process.env.RESEND_API_KEY.startsWith('re_')) {
    resend = new Resend(process.env.RESEND_API_KEY);
  } else {
    console.warn('RESEND_API_KEY is missing or invalid. Contact emails will not be sent.');
  }
} catch (error) {
  console.error('Error initializing Resend:', error);
}

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
      const fromEmail = process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev';

      // Send emails via Resend (don't block response if email fails)
      try {
        if (!resend) {
          throw new Error('Resend client not initialized');
        }

        // Email to you (admin)
        await resend.emails.send({
          from: `MAKV Website <${fromEmail}>`,
          to: [toEmail],
          subject: `New contact form submission from ${name}`,
          text:
            `You have received a new contact form submission:\n\n` +
            `Name: ${name}\n` +
            `Email: ${email}\n` +
            `Phone: ${phone}\n` +
            `Service Interested In: ${service || 'Not specified'}\n\n` +
            `Message:\n${message}\n`,
        });

        // Thank-you email to the user
        await resend.emails.send({
          from: `M A K V & Associates <${fromEmail}>`,
          to: [email],
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
        });
      } catch (emailError) {
        console.error('Error sending contact emails via Resend:', emailError);
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


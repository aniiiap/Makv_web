const express = require('express');
const { protect } = require('../middleware/taskManager.auth');

const router = express.Router();

// Placeholder for future user routes
router.get('/profile', protect, (req, res) => {
  res.json({
    success: true,
    user: req.user,
  });
});

module.exports = router;


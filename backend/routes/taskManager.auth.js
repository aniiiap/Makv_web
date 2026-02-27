const express = require('express');
const {
  register,
  login,
  googleAuth,
  getMe,
  forgotPassword,
  resetPassword,
  changePasswordFirstLogin,
} = require('../controllers/taskManager.auth.controller');
const { protect } = require('../middleware/taskManager.auth');

const router = express.Router();

router.post('/register', register);
router.post('/login', login);
router.post('/google', googleAuth);
router.get('/me', protect, getMe);
router.post('/forgotpassword', forgotPassword);
router.put('/resetpassword/:resettoken', resetPassword);
router.post('/change-password-first-login', protect, changePasswordFirstLogin);

module.exports = router;


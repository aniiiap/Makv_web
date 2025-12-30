const jwt = require('jsonwebtoken');
const User = require('../models/User');

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

// Verify JWT token middleware
const auth = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');

    if (!token) {
      return res.status(401).json({ success: false, message: 'No token, authorization denied' });
    }

    const decoded = jwt.verify(token, JWT_SECRET);
    const user = await User.findById(decoded.id).select('-password');

    if (!user) {
      return res.status(401).json({ success: false, message: 'Token is not valid' });
    }

    req.user = user;
    next();
  } catch (error) {
    res.status(401).json({ success: false, message: 'Token is not valid' });
  }
};

// Middleware to check if user is master/admin
const isMaster = (req, res, next) => {
  if (req.user.role !== 'master') {
    return res.status(403).json({ success: false, message: 'Access denied. Master privileges required.' });
  }
  next();
};

// Middleware to check if user is client
const isClient = (req, res, next) => {
  if (req.user.role !== 'client') {
    return res.status(403).json({ success: false, message: 'Access denied. Client privileges required.' });
  }
  next();
};

module.exports = { auth, isMaster, isClient, JWT_SECRET };

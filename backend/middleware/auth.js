const jwt = require('jsonwebtoken');
const User = require('../models/User');

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

// Verify JWT token middleware
const auth = async (req, res, next) => {
  try {
    // Try multiple ways to get the token
    // Express normalizes headers to lowercase, so check 'authorization' first
    let authHeader = req.headers['authorization'] || req.headers['Authorization'] || req.get('authorization') || req.get('Authorization');
    
    let token = null;
    if (authHeader) {
      // Remove 'Bearer ' prefix if present (case insensitive)
      token = authHeader.replace(/^Bearer\s+/i, '').trim();
    }
    
    // Also check for token in query string (fallback)
    if (!token && req.query.token) {
      token = req.query.token;
    }

    if (!token) {
      console.log('❌ Auth middleware - No token found');
      console.log('Request path:', req.path);
      console.log('Request method:', req.method);
      console.log('All headers:', JSON.stringify(req.headers, null, 2));
      return res.status(401).json({ success: false, message: 'No token, authorization denied' });
    }

    // Verify token
    const decoded = jwt.verify(token, JWT_SECRET);
    const user = await User.findById(decoded.id).select('-password');

    if (!user) {
      console.log('❌ Auth middleware - User not found for token');
      return res.status(401).json({ success: false, message: 'Token is not valid' });
    }

    console.log('✅ Auth successful - User:', user.email, 'Role:', user.role);
    req.user = user;
    next();
  } catch (error) {
    console.error('❌ Auth middleware error:', error.message);
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ success: false, message: 'Invalid token' });
    }
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ success: false, message: 'Token expired' });
    }
    res.status(401).json({ success: false, message: 'Token is not valid', error: error.message });
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

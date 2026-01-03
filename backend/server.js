const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config();

const app = express();

// Middleware
// CORS configuration - secure for production
const isDevelopment = process.env.NODE_ENV !== 'production';

// Build allowed origins list based on environment
const allowedOrigins = [];

// In production, only allow production domains
if (isDevelopment) {
  // Development: allow localhost
  allowedOrigins.push(
    'http://localhost:3000',
    'http://localhost:5173' // Vite default port
  );
} else {
  // Production: only allow production domains
  // Get from environment variable (comma-separated for multiple domains)
  const productionOrigins = process.env.FRONTEND_URL 
    ? process.env.FRONTEND_URL.split(',').map(url => url.trim())
    : ['https://www.makv.in', 'https://makv.in'];
  
  allowedOrigins.push(...productionOrigins);
}

// Log allowed origins in development for debugging
if (isDevelopment) {
  console.log('CORS allowed origins:', allowedOrigins);
}

app.use(cors({
  origin: function (origin, callback) {
    if (!origin) {
      return callback(null, true);
    }
    
    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      // Log blocked origins for security monitoring
      console.warn('CORS blocked origin:', origin, '| Allowed:', allowedOrigins);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  allowedHeaders: ['Content-Type', 'Authorization'],
  exposedHeaders: ['Content-Type', 'Authorization'],
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// MongoDB Connection
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/ca-website';

mongoose.connect(MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => console.log('MongoDB Connected'))
.catch(err => console.error('MongoDB connection error:', err));

// Serve uploaded files statically
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Routes
app.use('/api/contact', require('./routes/contact'));
app.use('/api/services', require('./routes/services'));
app.use('/api/auth', require('./routes/auth'));
app.use('/api/clients', require('./routes/clients'));
app.use('/api/documents', require('./routes/documents'));

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', message: 'Server is running' });
});

const PORT = process.env.PORT || 5004;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});


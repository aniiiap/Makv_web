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

// Always include standard production domains to be safe
const mandatoryOrigins = ['https://www.makv.in', 'https://makv.in'];
allowedOrigins.push(...mandatoryOrigins);

// Include standard development domains
const devOrigins = ['http://localhost:3000', 'http://localhost:5173'];
if (isDevelopment) {
  allowedOrigins.push(...devOrigins);
} else {
  // If we are definitely in production but Node env might be weird, 
  // keeping localhost might be okay, but let's strictly follow the existing logic while ensuring prod domains are ALWAYS present.
  // Wait, if isDevelopment is true because NODE_ENV is missing on Render, 
  // allowing devOrigins is harmless, but we MUST ensure mandatoryOrigins were pushed (which we just did above).
}

// Get from environment variable (comma-separated for multiple domains)
if (process.env.FRONTEND_URL) {
  const productionOrigins = process.env.FRONTEND_URL.split(',').map(url => url.trim());
  productionOrigins.forEach(origin => {
    if (origin && !allowedOrigins.includes(origin)) {
      allowedOrigins.push(origin);
    }
  });
}

app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl)
    if (!origin) return callback(null, true);

    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      // Log blocked origins for security monitoring
      console.warn('CORS blocked origin:', origin, '| Allowed:', allowedOrigins);
      // Return false instead of an error to let cors middleware handle it gracefully
      callback(null, false);
    }
  },
  credentials: true,
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
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

// TaskFlow (Task Manager) Routes - Another dashboard of makv
app.use('/api/taskflow/auth', require('./routes/taskManager.auth'));
app.use('/api/taskflow/tasks', require('./routes/taskManager.task.routes'));
app.use('/api/taskflow/teams', require('./routes/taskManager.team.routes'));
app.use('/api/taskflow/notifications', require('./routes/taskManager.notification.routes'));
app.use('/api/taskflow/users', require('./routes/taskManager.user.routes'));
app.use('/api/taskflow/bills', require('./routes/billRoutes'));
app.use('/api/taskflow/admin', require('./routes/taskManager.admin.routes'));
app.use('/api/taskflow/clients', require('./routes/taskManager.client.routes'));

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', message: 'Server is running' });
});

const PORT = process.env.PORT || 5004;

// Initialize Socket.IO for real-time notifications
let server;
try {
  const http = require('http');
  const { Server } = require('socket.io');
  const { initializeSocket } = require('./socket/taskManager.socket');

  server = http.createServer(app);
  const io = new Server(server, {
    cors: {
      origin: allowedOrigins,
      credentials: true,
    },
  });

  initializeSocket(io);
  console.log('Socket.IO initialized for TaskFlow');

  server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
} catch (error) {
  console.warn('Socket.IO initialization failed, running without real-time features:', error.message);
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);

  });
}

// Global Error Handler
app.use((err, req, res, next) => {
  console.error('❌ Server Error:', err);

  // Specific handling for Multer errors
  if (err.name === 'MulterError') {
    return res.status(400).json({
      success: false,
      message: `File upload error: ${err.message}`,
    });
  }

  // Handle generic errors
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal Server Error',
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
  });
});


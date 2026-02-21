const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const dns = require('dns');

// Use Google's DNS to bypass network DNS blocking
dns.setServers(['8.8.8.8', '8.8.4.4']);

// Import middleware
const logger = require('./middleware/logger');
const requestLogger = require('./middleware/requestLogger');
const { notFoundHandler, errorHandler } = require('./middleware/errorHandler');

// Import routes
const storyRoutes = require('./routes/stories');
const ttsRoutes = require('./routes/tts');
const healthRoutes = require('./routes/health');
const analyticsRoutes = require('./routes/analytics');
const authRoutes = require('./routes/auth');
const childrenRoutes = require('./routes/children');
const approvalsRoutes = require('./routes/approvals');
const syncRoutes = require('./routes/sync');

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());
app.use(requestLogger);

// Routes
app.use('/api/stories', storyRoutes);
app.use('/api/tts', ttsRoutes);
app.use('/api/health', healthRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/children', childrenRoutes);
app.use('/api/approvals', approvalsRoutes);
app.use('/api/sync', syncRoutes);

// Error handling (must be last)
app.use(notFoundHandler);
app.use(errorHandler);

// MongoDB Connection
const connectDB = async () => {
  try {
    if (process.env.MONGODB_URI) {
      await mongoose.connect(process.env.MONGODB_URI);
      logger.info('Connected to MongoDB');
    } else {
      logger.warn('No MONGODB_URI - running without database');
    }
  } catch (error) {
    logger.error('MongoDB connection error', { message: error.message });
    logger.warn('Continuing without database...');
  }
};

// Start server
const startServer = async () => {
  await connectDB();
  
  app.listen(PORT, () => {
    logger.info(`ToggleTail API running on http://localhost:${PORT}`);
    logger.info('API Endpoints: /api/stories, /api/auth, /api/children, /api/tts, /api/analytics');
  });
};

startServer();

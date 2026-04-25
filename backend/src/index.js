const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const express = require('express');
const cors    = require('cors');

const prisma   = require('./lib/prisma');
const dbState  = require('./lib/dbState');
const logger   = require('./middleware/logger');
const requestLogger           = require('./middleware/requestLogger');
const { notFoundHandler, errorHandler } = require('./middleware/errorHandler');

// Import routes
const storyRoutes    = require('./routes/stories');
const ttsRoutes      = require('./routes/tts');
const healthRoutes   = require('./routes/health');
const analyticsRoutes= require('./routes/analytics');
const authRoutes     = require('./routes/auth');
const childrenRoutes = require('./routes/children');
const approvalsRoutes= require('./routes/approvals');
const syncRoutes     = require('./routes/sync');
const dbRequired     = require('./middleware/dbRequired');

const app  = express();
const PORT = process.env.PORT || 3001;

// ─── CORS ──────────────────────────────────────────────────────────────────────
// Allow all origins in development so that Expo web (port 8081), the Android
// emulator, and physical devices can all reach the API without CORS errors.
// In production, restrict to FRONTEND_URL via the environment variable.
const corsOptions = process.env.NODE_ENV === 'production'
  ? {
      origin: [process.env.FRONTEND_URL].filter(Boolean),
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization'],
      credentials: true,
    }
  : true; // open in development

app.use(cors(corsOptions));
app.use(express.json({ limit: '10mb' }));
app.use(requestLogger);

// ─── Root route ───────────────────────────────────────────────────────────────
// Friendly landing response so hitting the bare domain doesn't look broken.
app.get('/', (_req, res) => {
  res.json({
    success: true,
    name: 'ToggleTail API',
    status: 'ok',
    endpoints: [
      '/api/health',
      '/api/stories',
      '/api/tts',
      '/api/analytics',
      '/api/auth',
      '/api/children',
      '/api/approvals',
      '/api/sync',
    ],
  });
});

// ─── Routes ───────────────────────────────────────────────────────────────────
// Story generation and TTS are stateless — work without a DB connection.
app.use('/api/stories',   storyRoutes);
app.use('/api/tts',       ttsRoutes);
app.use('/api/health',    healthRoutes);
// Analytics degrade gracefully (isConnected check inside the route).
app.use('/api/analytics', analyticsRoutes);
// These routes require a live DB connection — dbRequired returns 503 when down.
app.use('/api/auth',      dbRequired, authRoutes);
app.use('/api/children',  dbRequired, childrenRoutes);
app.use('/api/approvals', dbRequired, approvalsRoutes);
app.use('/api/sync',      dbRequired, syncRoutes);

// Error handling (must be registered last)
app.use(notFoundHandler);
app.use(errorHandler);

// ─── MySQL / Prisma connection ─────────────────────────────────────────────────
const connectDB = async () => {
  if (!process.env.DATABASE_URL) {
    logger.warn('⚠️  DATABASE_URL not set — running without database');
    logger.warn('   Auth, children, approvals and sync endpoints will return 503');
    logger.warn('   Story generation and TTS still work without a database');
    return;
  }

  try {
    await prisma.$connect();
    dbState.isConnected = true;
    logger.info('✅ MySQL connected via Prisma');
  } catch (error) {
    dbState.isConnected = false;
    logger.error('❌ MySQL connection failed — running in degraded mode', {
      message: error.message,
    });
    logger.warn('   Retrying in background every 30 s...');

    // Retry connection every 30 seconds
    const retryInterval = setInterval(async () => {
      try {
        await prisma.$connect();
        dbState.isConnected = true;
        logger.info('✅ MySQL reconnected');
        clearInterval(retryInterval);
      } catch {
        // Still unavailable — keep retrying silently
      }
    }, 30_000);
  }
};

// ─── Start server ──────────────────────────────────────────────────────────────
const startServer = async () => {
  await connectDB();

  app.listen(PORT, () => {
    const dbStatus = dbState.isConnected ? '✅ connected' : '⚠️  unavailable';
    logger.info(`🚀 ToggleTail API running on http://localhost:${PORT}`);
    logger.info(`   MySQL     : ${dbStatus}`);
    logger.info(`   OpenAI    : ${process.env.OPENAI_API_KEY     ? '✅ configured' : '⚠️  not configured'}`);
    logger.info(`   ElevenLabs: ${process.env.ELEVENLABS_API_KEY ? '✅ configured' : '⚠️  not configured'}`);
    logger.info('   Routes    : /api/stories /api/auth /api/children /api/tts /api/health /api/analytics');
  });
};

startServer();

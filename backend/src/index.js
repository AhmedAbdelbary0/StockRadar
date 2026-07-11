require('dotenv').config();

const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const cookieParser = require('cookie-parser');
const logger = require('./utils/logger');
const { initializeDatabase } = require('./db/pool');

const authRoutes = require('./routes/auth');
const inventoryRoutes = require('./routes/inventory');
const salesRoutes = require('./routes/sales');
const analyticsRoutes = require('./routes/analytics');
const mitigationRoutes = require('./routes/mitigation');

const app = express();
const PORT = parseInt(process.env.PORT, 10) || 5000;

// ---------------------------------------------------------------------------
// Middleware
// ---------------------------------------------------------------------------
const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost',
  process.env.FRONTEND_URL
].filter(Boolean);

app.use(cors({
  origin: allowedOrigins,
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  credentials: true,
}));

app.use(express.json({ limit: '1mb' }));
app.use(cookieParser());

// HTTP request logging via Morgan piped into Winston
app.use(morgan('combined', {
  stream: { write: (message) => logger.info(message.trim()) },
}));

// ---------------------------------------------------------------------------
// Health Check
// ---------------------------------------------------------------------------
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', service: 'warehouse-backend', uptime: process.uptime() });
});

// ---------------------------------------------------------------------------
// API Routes
// ---------------------------------------------------------------------------
app.use('/api/auth', authRoutes);
app.use('/api/inventory', inventoryRoutes);
app.use('/api/sales', salesRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/mitigation', mitigationRoutes);

// ---------------------------------------------------------------------------
// 404 Catch-All
// ---------------------------------------------------------------------------
app.use((req, res) => {
  res.status(404).json({ success: false, error: `Route ${req.method} ${req.originalUrl} not found` });
});

// ---------------------------------------------------------------------------
// Global Error Handler
// ---------------------------------------------------------------------------
app.use((err, req, res, _next) => {
  logger.error('Unhandled error', { error: err.message, stack: err.stack });
  res.status(500).json({ success: false, error: 'An unexpected internal error occurred' });
});

// ---------------------------------------------------------------------------
// Server Startup
// ---------------------------------------------------------------------------
async function start() {
  try {
    // Validate required secrets before accepting any connections
    if (!process.env.JWT_SECRET) {
      throw new Error('JWT_SECRET environment variable must be set');
    }
    if (!process.env.INTERNAL_SECRET) {
      logger.warn('INTERNAL_SECRET is not set — AI worker internal validation will be disabled');
    }

    await initializeDatabase();
    logger.info('Database initialized');

    app.listen(PORT, '0.0.0.0', () => {
      logger.info(`Warehouse backend listening on port ${PORT}`);
    });
  } catch (err) {
    logger.error('Failed to start server', { error: err.message });
    process.exit(1);
  }
}

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM received — shutting down gracefully');
  process.exit(0);
});

process.on('SIGINT', () => {
  logger.info('SIGINT received — shutting down gracefully');
  process.exit(0);
});

start();

const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const dotenv = require('dotenv');
const connectDB = require('./config/db');

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Connect to MongoDB
connectDB().catch((err) => {
  console.error('[Server Init Warning] Database not connected yet. Waiting or reconnecting...');
});

// Middleware
app.use(
  cors({
    origin: process.env.CLIENT_URL || 'http://localhost:5173',
    credentials: true,
  })
);
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

if (process.env.NODE_ENV !== 'test') {
  app.use(morgan('dev'));
}

// Routes
app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/menus', require('./routes/menuRoutes'));
app.use('/api/inventory', require('./routes/inventoryRoutes'));
app.use('/api/movements', require('./routes/movementRoutes'));
app.use('/api/staff', require('./routes/staffRoutes'));
app.use('/api/audit-logs', require('./routes/auditRoutes'));

// Health check and system info endpoint
app.get('/api/health', (req, res) => {
  const mongoose = require('mongoose');
  const dbStatus = mongoose.connection.readyState === 1 ? 'connected' : 'disconnected';

  res.json({
    status: 'ok',
    institution: 'Rashtrotthana Parishath',
    application: 'RP Canteen Web Service',
    database: {
      status: dbStatus,
      name: mongoose.connection.name || 'rp_canteen',
    },
    timestamp: new Date().toISOString(),
  });
});

// 404 handler for API routes
app.use('/api/*', (req, res) => {
  res.status(404).json({
    success: false,
    message: `API endpoint not found: ${req.method} ${req.originalUrl}`,
  });
});

// Central error handling middleware
app.use((err, req, res, next) => {
  console.error('[Unhandled Error]:', err);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'An unexpected internal server error occurred.',
    error: process.env.NODE_ENV === 'development' ? err.stack : undefined,
  });
});

// Start Express server
const server = app.listen(PORT, () => {
  console.log(`================================================================`);
  console.log(`RP Canteen API Server running on port ${PORT}`);
  console.log(`Institution: Rashtrotthana Parishath`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`Health check: http://localhost:${PORT}/api/health`);
  console.log(`================================================================`);
});

module.exports = app;

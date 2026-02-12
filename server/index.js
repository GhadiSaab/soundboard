require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const soundsRouter = require('./routes/sounds');
const settingsRouter = require('./routes/settings');
const errorHandler = require('./middleware/errorHandler');

// Initialize database (this creates tables and default settings)
require('./db');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files from public directory
app.use(express.static(path.join(__dirname, '../public')));

// API Routes
app.use('/api/sounds', soundsRouter);
app.use('/api/settings', settingsRouter);

// Root endpoint
app.get('/api', (req, res) => {
  res.json({
    success: true,
    message: 'Raspberry Pi Sound Board API',
    version: '1.0.0',
    endpoints: {
      sounds: '/api/sounds',
      settings: '/api/settings'
    }
  });
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    status: 'healthy',
    timestamp: new Date().toISOString()
  });
});

// Error handling middleware (must be last)
app.use(errorHandler);

// Start server
app.listen(PORT, '0.0.0.0', () => {
  console.log(`
╔═══════════════════════════════════════════════════════════╗
║                                                           ║
║   🎵  Raspberry Pi Sound Board Server                    ║
║                                                           ║
║   Status: Running                                         ║
║   Port: ${PORT}                                             ║
║   Access: http://localhost:${PORT}                          ║
║                                                           ║
║   API Endpoints:                                          ║
║   - GET    /api/sounds                                    ║
║   - POST   /api/sounds/upload                             ║
║   - POST   /api/sounds/:id/play                           ║
║   - DELETE /api/sounds/:id                                ║
║   - GET    /api/settings                                  ║
║   - PUT    /api/settings/:key                             ║
║                                                           ║
╚═══════════════════════════════════════════════════════════╝
  `);
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\nShutting down gracefully...');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\nShutting down gracefully...');
  process.exit(0);
});

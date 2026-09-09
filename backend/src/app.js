const express = require('express');
const cors = require('cors');
const pool = require('./config/db');

// Import routes
const healthRoutes = require('./routes/health.routes');
const spillsRoutes = require('./routes/spills.routes');
const detectionRoutes = require('./routes/detection.routes');
const driftRoutes = require('./routes/drift.routes');
const vesselsRoutes = require('./routes/vessels.routes');
const reportsRoutes = require('./routes/reports.routes');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// API Routes
app.use('/api/incidents', require('./routes/incidents.routes'));
app.use('/api/health', healthRoutes);
app.use('/api/spills', spillsRoutes);
app.use('/api/detection', detectionRoutes);
app.use('/api/drift', driftRoutes);
app.use('/api/vessels', vesselsRoutes);
app.use('/api/reports', reportsRoutes);

// Basic error handling middleware
app.use((err, req, res, next) => {
  const status = Number.isInteger(err.status) && err.status >= 400 && err.status <= 599 ? err.status : 500;
  console.error(`[api] request failed (${status})`);
  res.status(status).json({
    error: status < 500 || status === 503 || status === 504
      ? err.message : 'Internal Server Error'
  });
});

module.exports = app;

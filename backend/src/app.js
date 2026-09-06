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
app.use('/api/health', healthRoutes);
app.use('/api/spills', spillsRoutes);
app.use('/api/detection', detectionRoutes);
app.use('/api/drift', driftRoutes);
app.use('/api/vessels', vesselsRoutes);
app.use('/api/reports', reportsRoutes);

// Basic error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Internal Server Error' });
});

module.exports = app;

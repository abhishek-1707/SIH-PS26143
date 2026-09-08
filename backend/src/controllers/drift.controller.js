const pool = require('../config/db');
const { parseSpillDbId, formatSpillId } = require('./spills.controller');

const getDriftData = async (req, res) => {
  try {
    const { spillId } = req.params;
    const dbId = parseSpillDbId(spillId);
    if (!dbId) {
      return res.status(404).json({ error: 'Invalid spill ID' });
    }

    const result = await pool.query(`
      SELECT 
        id,
        timestamp,
        direction,
        ST_X(geom) as lon,
        ST_Y(geom) as lat
      FROM drift_predictions
      WHERE spill_id = $1
      ORDER BY timestamp DESC;
    `, [dbId]);

    const formattedId = formatSpillId(dbId);

    if (result.rows.length === 0) {
      return res.status(200).json({
        spillId: formattedId,
        backward: null,
        forward: null
      });
    }

    const backwardRows = result.rows.filter(r => (r.direction || 'backward') === 'backward');
    const originRow = backwardRows[backwardRows.length - 1];

    const backwardTrajectory = backwardRows.map(r => ({
      latitude: Number(r.lat),
      longitude: Number(r.lon),
      timestamp: r.timestamp instanceof Date ? r.timestamp.toISOString() : String(r.timestamp)
    }));

    const driftResponse = {
      spillId: formattedId,
      backward: {
        probableOrigin: originRow ? {
          latitude: Number(originRow.lat),
          longitude: Number(originRow.lon)
        } : null,
        trajectory: backwardTrajectory
      },
      forward: {
        trajectory: []
      }
    };

    res.status(200).json(driftResponse);
  } catch (error) {
    console.error('Error fetching drift data from database:', error);
    res.status(500).json({ error: 'Failed to fetch drift data' });
  }
};

module.exports = {
  getDriftData
};

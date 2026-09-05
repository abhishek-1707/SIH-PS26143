const getDriftData = async (req, res) => {
  try {
    const { spillId } = req.params;
    
    const mockDrift = {
      spillId: spillId,
      backward: {
        probableOrigin: {
          latitude: 15.180,
          longitude: 72.390
        },
        trajectory: [
          { latitude: 15.234, longitude: 72.451, timestamp: "2026-09-04T05:30:00Z" },
          { latitude: 15.210, longitude: 72.420, timestamp: "2026-09-04T03:00:00Z" },
          { latitude: 15.180, longitude: 72.390, timestamp: "2026-09-04T00:30:00Z" }
        ]
      },
      forward: {
        trajectory: [
          { latitude: 15.234, longitude: 72.451, timestamp: "2026-09-04T05:30:00Z" },
          { latitude: 15.260, longitude: 72.480, timestamp: "2026-09-04T08:00:00Z" },
          { latitude: 15.290, longitude: 72.520, timestamp: "2026-09-04T12:00:00Z" }
        ]
      }
    };

    res.status(200).json(mockDrift);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch drift data' });
  }
};

module.exports = {
  getDriftData
};

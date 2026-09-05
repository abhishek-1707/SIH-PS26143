const getVessels = async (req, res) => {
  try {
    const mockVessels = [
      { id: "V-1", name: "MV Ocean Star", mmsi: "123456789" },
      { id: "V-2", name: "Evergreen", mmsi: "987654321" }
    ];
    res.status(200).json(mockVessels);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch vessels' });
  }
};

const getVesselById = async (req, res) => {
  try {
    const vessel = { id: req.params.id, name: "MV Ocean Star", mmsi: "123456789", type: "Cargo" };
    res.status(200).json(vessel);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch vessel details' });
  }
};

const getVesselsBySpill = async (req, res) => {
  try {
    const { spillId } = req.params;
    // Mock candidate vessels associated with a spill
    const candidates = [
      {
        vessel: "MV Ocean Star",
        mmsi: "123456789",
        imo: "IMO12345",
        distanceKm: 4.2,
        trajectoryScore: 92,
        timeScore: 89,
        behaviorScore: 78,
        responsibilityScore: 91
      },
      {
        vessel: "Global Freighter",
        mmsi: "111222333",
        imo: "IMO67890",
        distanceKm: 12.5,
        trajectoryScore: 45,
        timeScore: 60,
        behaviorScore: 85,
        responsibilityScore: 35
      }
    ];
    res.status(200).json(candidates);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch candidate vessels' });
  }
};

module.exports = {
  getVessels,
  getVesselById,
  getVesselsBySpill
};

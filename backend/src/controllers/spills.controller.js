// Mock data for initial frontend development
const mockSpills = [
  {
    id: "SP-001",
    location: { latitude: 15.234, longitude: 72.451 },
    areaKm2: 12.4,
    confidence: 94,
    estimatedAge: { min: 6, max: 9, unit: "hours" },
    detectedAt: "2026-09-04T05:30:00Z",
    status: "active",
    satelliteSource: "Sentinel-1"
  },
  {
    id: "SP-002",
    location: { latitude: 16.512, longitude: 73.120 },
    areaKm2: 3.1,
    confidence: 82,
    estimatedAge: { min: 2, max: 4, unit: "hours" },
    detectedAt: "2026-09-03T11:15:00Z",
    status: "monitored",
    satelliteSource: "Sentinel-2"
  },
  {
    id: "SP-003",
    location: { latitude: 14.890, longitude: 71.990 },
    areaKm2: 25.6,
    confidence: 98,
    estimatedAge: { min: 12, max: 18, unit: "hours" },
    detectedAt: "2026-09-02T08:45:00Z",
    status: "cleanup",
    satelliteSource: "Sentinel-1"
  }
];

const getAllSpills = async (req, res) => {
  try {
    res.status(200).json(mockSpills);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch spills' });
  }
};

const getSpillById = async (req, res) => {
  try {
    const spill = mockSpills.find(s => s.id === req.params.id);
    if (!spill) {
      return res.status(404).json({ error: 'Spill not found' });
    }
    res.status(200).json(spill);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch spill' });
  }
};

module.exports = {
  getAllSpills,
  getSpillById
};

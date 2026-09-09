import { apiClient } from "./client";

export interface Position {
  lat: number;
  lon: number;
  timestamp: string;
  hours: number;
  uncertaintyKm: number;
}
export interface AISPosition {
  latitude: number;
  longitude: number;
  timestamp: string;
  speed: number;
  course: number;
}
export interface Anomaly {
  mmsi: string;
  start: AISPosition;
  end: AISPosition;
  durationHours: number;
  estimatedPosition: { lat: number; lon: number };
  label: string;
  anomalyScore: number;
}
export interface Candidate {
  mmsi: string;
  name: string;
  type: string;
  rank: number;
  score: number;
  confidence: string;
  closestDistanceKm: number;
  timeDifferenceHours: number;
  aisContinuity: number;
  continuityStatus: string;
  evidence: string;
  features: Record<string, number>;
  track: AISPosition[];
  trackSegments: AISPosition[][];
  anomalies: Anomaly[];
}
export interface Detection {
  geometry: { type: "Polygon"; coordinates: [number, number][][] };
  metrics: {
    areaKm2: number;
    perimeterM: number;
    lengthM: number;
    widthM: number;
    centroid: { lat: number; lon: number };
  };
  confidence: number;
  confidenceMeaning: string;
  geometryMethod: string;
}
export interface IncidentSummary {
  id: string;
  acquiredAt: string;
  detectedAt: string;
  status: string;
  forecastHours: number;
}
export interface IncidentReport {
  id: string;
  detectedAt: string;
  status: string;
  scene: {
    id: string;
    acquiredAt: string;
    source: string;
    width: number;
    height: number;
    bbox: [number, number, number, number];
    pixels: (number | null)[][];
    polarization: string | string[];
    resolution_m: number[];
  };
  mask: number[][];
  detections: Detection[];
  spill?: Detection;
  age?: {
    minHours: number;
    maxHours: number;
    estimatedHours: number;
    confidence: string;
    method: string;
    caveat: string;
  };
  origin?: Position & { releaseWindow: { start: string; end: string } };
  backward: Position[];
  forward: Position[];
  forecastHours: number;
  candidates: Candidate[];
  anomalies: Anomaly[];
  leadingCandidate: string | null;
  environment: Record<string, number | string>;
  stages: string[];
  provenance: Record<string, string>;
  uncertainty: string[];
  disclaimer: string;
  persistence: { local: string; database: string };
  scoring: { weights: Record<string, number>; note: string };
}
export const listIncidents = () => apiClient<IncidentSummary[]>("/api/incidents");
export const getIncident = (id: string) =>
  apiClient<IncidentReport>(`/api/incidents/${encodeURIComponent(id)}`);
export const analyzeIncident = (forecastHours: number) =>
  apiClient<IncidentReport>("/api/incidents/analyze", {
    method: "POST",
    body: JSON.stringify({ sceneId: "demo-arabian-sea", forecastHours }),
  });

import { apiClient } from "./client";
export type AnalysisMode = "DEMO" | "REAL" | "UPLOAD";
export type AnalysisOutcome = "SPILL_DETECTED" | "NO_SPILL_DETECTED" | "ANALYSIS_INCONCLUSIVE";

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
  mode?: AnalysisMode;
  id: string;
  acquiredAt: string;
  detectedAt: string;
  status: string;
  outcome?: AnalysisOutcome;
  forecastHours: number;
}
export interface IncidentReport {
  mode?: AnalysisMode;
  outcome?: AnalysisOutcome;
  outcomeMessage?: string;
  outcomeReason?: string;
  availability?: string;
  processedAt?: string;
  evidenceProvenance?: Record<string, { kind: string; reason: string }>;
  hindcastHours?: number;
  stageStatus?: Record<string, { status: string; kind: string; reason: string }>;
  detector?: {
    name: string;
    status: string;
    checkpointSha256?: string | null;
    version?: string;
    quality?: Record<string, number | string>;
  };
  id: string;
  detectedAt: string;
  status: string;
  scene: {
    id: string;
    acquiredAt: string;
    source: string;
    width: number;
    height: number;
    bbox: [number, number, number, number] | null;
    pixels: (number | null)[][];
    polarization: string | string[];
    resolution_m: number[];
    nativeWidth?: number;
    nativeHeight?: number;
    assetSha256?: Record<string, string>;
    jointValidFraction?: number;
  };
  mask: number[][];
  detections: Detection[];
  spill?: Detection | null;
  age?: {
    minHours: number;
    maxHours: number;
    estimatedHours: number;
    confidence: string;
    method: string;
    caveat: string;
  } | null;
  origin?: (Position & { releaseWindow: { start: string; end: string } }) | null;
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
export interface AnalysisRequest {
  mode: "DEMO" | "REAL";
  sceneId: string;
  forecastHours: number;
  hindcastHours?: number;
  detector?: "hybrid" | "classical";
  onDemand?: boolean;
}
export interface IncidentScene {
  id: string;
  name: string;
  mode: "DEMO" | "REAL";
  source: string;
}
export const listIncidentScenes = () => apiClient<IncidentScene[]>("/api/incidents/scenes");
export const analyzeIncident = (request: number | AnalysisRequest) =>
  apiClient<IncidentReport>("/api/incidents/analyze", {
    method: "POST",
    body: JSON.stringify(
      typeof request === "number"
        ? { sceneId: "demo-arabian-sea", forecastHours: request }
        : request,
    ),
  });

export async function uploadSAR(
  vv: File,
  vh: File,
  acquiredAt: string,
  rasterUnits: string,
  sarAttested: boolean,
  forecastHours = 24,
  hindcastHours = 6,
) {
  if (vv.size > 8 * 1024 * 1024 || vh.size > 8 * 1024 * 1024)
    throw new Error(
      "UPLOAD ERROR: each polarization must be at most 8 MiB. Crop before uploading.",
    );
  return apiClient<IncidentReport>("/api/incidents/upload", {
    method: "POST",
    headers: {
      "Content-Type": "application/octet-stream",
      "X-OSIS-SAR-Metadata": encodeURIComponent(
        JSON.stringify({
          vvBytes: vv.size,
          vvName: vv.name,
          vhName: vh.name,
          acquiredAt,
          rasterUnits,
          sarAttested,
          forecastHours,
          hindcastHours,
        }),
      ),
    },
    body: new Blob([vv, vh]),
  });
}

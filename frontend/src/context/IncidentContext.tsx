import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useMemo,
  type ReactNode,
} from "react";
import { useLocation, useNavigate } from "@tanstack/react-router";
import {
  useSpills,
  useSpillInvestigation,
  type Spill,
  type CandidateVessel,
  type AttributionScore,
} from "../api/spills";
import {
  getIncidentInvestigation,
  spillPolygon,
  type IncidentInvestigationData,
  type ProbableOrigin,
  type Vessel,
  type Suspect,
} from "../data/mock";

const STORAGE_KEY = "osis_selected_incident";
export const DEFAULT_INCIDENT_ID = "SP-001";

interface IncidentContextType {
  selectedIncidentId: string;
  setSelectedIncidentId: (id: string) => void;
  selectedSpill: Spill | undefined;
  spills: Spill[] | undefined;
  isLoading: boolean;
  isError: boolean;
  refetch: () => void;
  investigation: IncidentInvestigationData | undefined;
  isInvestigationLoading: boolean;
  isInvestigationError: boolean;
}

const IncidentContext = createContext<IncidentContextType | null>(null);

function getInitialIncidentId(): string {
  if (typeof window !== "undefined") {
    try {
      const urlParam = new URLSearchParams(window.location.search).get("incident");
      if (urlParam) return urlParam;
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) return stored;
    } catch {
      // ignore storage/search parse failures
    }
  }
  return DEFAULT_INCIDENT_ID;
}

export interface IncidentSearch {
  incident?: string;
}

export function validateIncidentSearch(search: Record<string, unknown>): IncidentSearch {
  const incident = typeof search["incident"] === "string" ? search["incident"] : undefined;
  return incident ? { incident } : {};
}

export function IncidentProvider({ children }: { children: ReactNode }) {
  const location = useLocation();
  const searchIncident = (location.search as Record<string, unknown>)?.[
    "incident"
  ] as string | undefined;

  const [selectedIncidentId, setSelectedIncidentIdState] = useState<string>(() => {
    if (searchIncident) return searchIncident;
    if (typeof window !== "undefined") {
      try {
        const urlParam = new URLSearchParams(window.location.search).get("incident");
        if (urlParam) return urlParam;
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) return stored;
      } catch {
        // ignore storage/search parse failures
      }
    }
    return DEFAULT_INCIDENT_ID;
  });

  const navigate = useNavigate();
  const { data: spills, isLoading, isError, refetch } = useSpills();
  const {
    data: dbInvestigation,
    isLoading: isInvestigationLoading,
    isError: isInvestigationError,
    refetch: refetchInvestigation,
  } = useSpillInvestigation(selectedIncidentId);

  // Keep state in sync with URL search parameter whenever location.search changes
  useEffect(() => {
    let incidentInUrl: string | null = null;
    if (location.search && typeof location.search === "object") {
      incidentInUrl = ((location.search as Record<string, unknown>)["incident"] as string) || null;
    }
    if (!incidentInUrl && typeof window !== "undefined") {
      incidentInUrl = new URLSearchParams(window.location.search).get("incident");
    }

    if (incidentInUrl && incidentInUrl !== selectedIncidentId) {
      setSelectedIncidentIdState(incidentInUrl);
      try {
        localStorage.setItem(STORAGE_KEY, incidentInUrl);
      } catch {
        // ignore
      }
    }
  }, [location.search, selectedIncidentId]);

  const setSelectedIncidentId = useCallback(
    (id: string) => {
      setSelectedIncidentIdState(id);
      if (typeof window !== "undefined") {
        try {
          localStorage.setItem(STORAGE_KEY, id);
        } catch {
          // ignore
        }
      }
      (navigate as any)({
        search: (prev: unknown) => ({
          ...(typeof prev === "object" && prev ? prev : {}),
          incident: id,
        }),
        replace: true,
      });
    },
    [navigate]
  );

  // Derive active spill from backend data, defaulting to SP-001
  const selectedSpill = useMemo(() => {
    if (!spills || spills.length === 0) return undefined;
    const base = (
      spills.find((s) => s.id === selectedIncidentId) ??
      spills.find((s) => s.id === DEFAULT_INCIDENT_ID) ??
      spills.find((s) => s.status === "active") ??
      spills[0]
    );
    if (!base) return undefined;
    if (dbInvestigation?.spill && dbInvestigation.spill.id === base.id) {
      return { ...base, ...dbInvestigation.spill };
    }
    return base;
  }, [spills, selectedIncidentId, dbInvestigation]);

  // If backend loads and has an active spill that matches the default or selection,
  // ensure selectedIncidentId is kept aligned
  useEffect(() => {
    if (selectedSpill && selectedSpill.id !== selectedIncidentId && !selectedIncidentId) {
      setSelectedIncidentIdState(selectedSpill.id);
    }
  }, [selectedSpill, selectedIncidentId]);

  const investigation = useMemo<IncidentInvestigationData | undefined>(() => {
    if (dbInvestigation) {
      const origin: ProbableOrigin | undefined = dbInvestigation.origin
        ? {
            lat: dbInvestigation.origin.latitude,
            lon: dbInvestigation.origin.longitude,
            windowStart: dbInvestigation.origin.releaseWindow?.start || "",
            windowEnd: dbInvestigation.origin.releaseWindow?.end || "",
            radiusKm: dbInvestigation.origin.uncertaintyKm || 3.2,
          }
        : undefined;

      const polygon =
        dbInvestigation.spill?.polygon && dbInvestigation.spill.polygon.length > 0
          ? dbInvestigation.spill.polygon
          : selectedIncidentId === "SP-001"
            ? spillPolygon
            : undefined;

      const drift =
        dbInvestigation.driftPath && dbInvestigation.driftPath.length > 0
          ? dbInvestigation.driftPath
          : undefined;

      const vList: Vessel[] | undefined =
        dbInvestigation.vessels && dbInvestigation.vessels.length > 0
          ? dbInvestigation.vessels.map((v: CandidateVessel) => ({
              id: v.id,
              name: v.name,
              mmsi: v.mmsi,
              type: v.type,
              flag: v.flag,
              speedKn: v.speedKn,
              headingDeg: v.headingDeg,
              lastSeen: v.lastSeen,
              aisGapMin: v.aisGapMin,
              track: v.track,
            }))
          : undefined;

      const sList: Suspect[] | undefined =
        dbInvestigation.attribution && dbInvestigation.attribution.length > 0
          ? dbInvestigation.attribution.map((a: AttributionScore) => ({
              vesselId: a.vesselId,
              rank: a.rank,
              suspicion: a.suspicion,
              proximity: a.proximity,
              temporal: a.temporal,
              aisGap: a.aisGap,
              vesselType: a.vesselType,
              summary: a.summary,
            }))
          : undefined;

      return {
        spillId: dbInvestigation.id || selectedIncidentId,
        spillPolygon: polygon,
        driftPath: drift,
        probableOrigin: origin,
        vessels: vList,
        suspects: sList,
      };
    }

    // Fallback to mock investigation dataset only if API data hasn't loaded
    return getIncidentInvestigation(selectedIncidentId);
  }, [dbInvestigation, selectedIncidentId]);

  const value = useMemo<IncidentContextType>(
    () => ({
      selectedIncidentId,
      setSelectedIncidentId,
      selectedSpill,
      spills,
      isLoading,
      isError,
      refetch: () => {
        refetch();
        refetchInvestigation();
      },
      investigation,
      isInvestigationLoading,
      isInvestigationError,
    }),
    [
      selectedIncidentId,
      setSelectedIncidentId,
      selectedSpill,
      spills,
      isLoading,
      isError,
      refetch,
      refetchInvestigation,
      investigation,
      isInvestigationLoading,
      isInvestigationError,
    ]
  );

  return <IncidentContext.Provider value={value}>{children}</IncidentContext.Provider>;
}

export function useIncident(): IncidentContextType {
  const context = useContext(IncidentContext);
  if (!context) {
    throw new Error("useIncident must be used within an IncidentProvider");
  }
  return context;
}

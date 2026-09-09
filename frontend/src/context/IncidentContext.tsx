import { createContext, useContext, useState, useCallback, useMemo, type ReactNode } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  getIncident,
  listIncidents,
  type IncidentReport,
  type IncidentSummary,
} from "../api/incidents";

export interface IncidentContextType {
  /** The fully-loaded active report, or null if none selected. */
  activeReport: IncidentReport | null;
  /** Convenience: id of the active report ("" when none). */
  activeReportId: string;
  /**
   * Store a freshly-received IncidentReport as the active report.
   * Also seeds React Query cache so subsequent fetches hit the cache.
   */
  setActiveReport: (report: IncidentReport) => void;
  /**
   * Select a report by its UUID.  The full report is fetched from the API
   * (or resolved from the React Query cache) and then stored as the active report.
   */
  setActiveReportId: (id: string) => void;
  /** Clear the active report – shows the empty state on all pages. */
  clearActiveReport: () => void;

  /** History list from GET /api/incidents. */
  history: IncidentSummary[];
  historyLoading: boolean;
  historyError: Error | null;
  refetchHistory: () => void;
}

const IncidentContext = createContext<IncidentContextType | null>(null);

export function IncidentProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const [activeReport, setActiveReportState] = useState<IncidentReport | null>(null);
  // Track which report ID is "pending" when we want to load by ID.
  const [pendingId, setPendingId] = useState<string>("");

  // Fetch the history list.
  const {
    data: historyData,
    isLoading: historyLoading,
    error: historyError,
    refetch: refetchHistory,
  } = useQuery<IncidentSummary[], Error>({
    queryKey: ["incidents"],
    queryFn: listIncidents,
    staleTime: 30_000,
    retry: false,
  });

  // When a report ID is pending (from setActiveReportId), fetch it.
  const { data: fetchedReport } = useQuery<IncidentReport>({
    queryKey: ["incident", pendingId],
    queryFn: () => getIncident(pendingId),
    enabled: !!pendingId,
    staleTime: 60_000,
    retry: false,
  });

  // When the fetched report arrives, promote it to the active report.
  // (This effect runs whenever fetchedReport changes and pendingId matches.)
  // We do this with a useMemo-style derivation: if fetchedReport is for the
  // current pendingId and is not already the active report, update.
  const resolvedReport = useMemo(() => {
    if (fetchedReport && pendingId && fetchedReport.id === pendingId) {
      return fetchedReport;
    }
    return null;
  }, [fetchedReport, pendingId]);

  // Merge: if we have a resolved report from the fetch and it differs from activeReport, use it.
  const effectiveReport = resolvedReport ?? activeReport;
  // If pendingId matches the effectiveReport, clear the pending flag conceptually.
  // We track this so state doesn't bounce.
  const displayReport =
    pendingId && effectiveReport && effectiveReport.id === pendingId
      ? effectiveReport
      : pendingId
        ? null // still loading
        : activeReport;

  const setActiveReport = useCallback(
    (report: IncidentReport) => {
      // Seed cache so a subsequent setActiveReportId for this id is instant.
      queryClient.setQueryData(["incident", report.id], report);
      setActiveReportState(report);
      setPendingId(""); // clear pending
    },
    [queryClient],
  );

  const setActiveReportId = useCallback(
    (id: string) => {
      if (!id) return;
      // Try to resolve from cache immediately.
      const cached = queryClient.getQueryData<IncidentReport>(["incident", id]);
      if (cached) {
        setActiveReportState(cached);
        setPendingId("");
      } else {
        setActiveReportState(null); // clear stale report while loading
        setPendingId(id);
      }
    },
    [queryClient],
  );

  const clearActiveReport = useCallback(() => {
    setActiveReportState(null);
    setPendingId("");
  }, []);

  // When the pending query resolves, promote to activeReport.
  // We do this by detecting when displayReport has loaded.
  // To avoid an infinite loop we track if we already promoted.
  // Instead, we derive it: if pendingId is set and fetchedReport matches, call setActiveReport.
  // We use a ref-less approach: check in the render phase via useMemo side-effect avoidance.
  // The cleanest approach: treat displayReport as the union:
  const finalReport: IncidentReport | null = (() => {
    if (!pendingId) return activeReport;
    if (fetchedReport && fetchedReport.id === pendingId) return fetchedReport;
    return null; // still loading
  })();

  const value = useMemo<IncidentContextType>(
    () => ({
      activeReport: finalReport,
      activeReportId: finalReport?.id ?? "",
      setActiveReport,
      setActiveReportId,
      clearActiveReport,
      history: historyData ?? [],
      historyLoading,
      historyError: historyError ?? null,
      refetchHistory: () => void refetchHistory(),
    }),
    [
      finalReport,
      setActiveReport,
      setActiveReportId,
      clearActiveReport,
      historyData,
      historyLoading,
      historyError,
      refetchHistory,
    ],
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

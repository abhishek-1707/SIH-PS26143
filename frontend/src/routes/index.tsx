import { createFileRoute, Link } from "@tanstack/react-router";
import { useIncident } from "../context/IncidentContext";
import { getIncidentLabel } from "../api/incidents";
import { OceanMap, Marker, MapGeoJSON, MapPolyline, MapCircle } from "../components/OceanMap";

import { KeyVal, OutcomeBadge, Panel, Stat } from "../components/ui-kit";
import {
  Radar,
  Compass,
  Ship,
  Users,
  ArrowRight,
  CheckCircle2,
  AlertTriangle,
  HelpCircle,
  Loader2,
  Layers,
  MapPin,
  Clock,
  Target,
  Activity,
  LayoutDashboard,
} from "lucide-react";

export const Route = createFileRoute("/")(
  {
    head: () => ({
      meta: [
        {
          title:
            "O.S.I.S. — Oil Spill Identification & Source Attribution System",
        },
        {
          name: "description",
          content:
            "Operational satellite radar spill detection, Lagrangian hydrodynamic drift backtracking, and AIS vessel correlation for maritime surveillance.",
        },
      ],
    }),
    component: OverviewDashboard,
  },
);

const utc = (iso: string) => {
  if (!iso) return "N/A";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  return `${d.toISOString().slice(0, 10)} ${d.toISOString().slice(11, 16)} UTC`;
};

function OverviewDashboard() {
  const { activeReport, autoLoading, historyLoading } = useIncident();

  // Loading state
  if (autoLoading || historyLoading) {
    return (
      <div className="mx-auto max-w-5xl py-16 text-center space-y-6">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded border border-border bg-secondary">
          <Loader2 className="h-8 w-8 animate-spin text-[var(--accent-blue)]" />
        </div>
        <div>
          <h1 className="text-xl font-semibold text-foreground font-mono">
            O.S.I.S.
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Loading incident data…
          </p>
        </div>
      </div>
    );
  }

  // No report loaded — prompt to analyze
  if (!activeReport) {
    return (
      <div className="mx-auto max-w-4xl py-12 space-y-8">
        <div className="text-center space-y-3">
          <h1 className="text-3xl font-bold tracking-tight text-foreground">
            O.S.I.S.
          </h1>
          <p className="text-base text-muted-foreground">
            Oil Spill Identification &amp; Source Attribution System
          </p>
          <p className="text-xs text-muted-foreground max-w-lg mx-auto">
            Autonomous pipeline integrating Sentinel-1 SAR detection,
            Lagrangian drift backtracking, and AIS vessel correlation to detect
            marine spills, locate origins, and identify candidate sources.
          </p>
          <Link
            to="/analysis"
            className="inline-flex items-center gap-2 rounded bg-primary px-5 py-2.5 text-xs font-mono font-semibold text-primary-foreground mt-4"
          >
            Launch Investigation
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </div>
    );
  }

  const report = activeReport;
  const { spill, origin, candidates, anomalies, outcome, backward, forward } =
    report;
  const topCandidate = candidates[0] ?? null;
  const incidentLabel = getIncidentLabel(report);
  const isSpillDetected = outcome === "SPILL_DETECTED" && !!spill;
  const isNoSpill = outcome === "NO_SPILL_DETECTED";
  const isDemo = report.mode === "DEMO" || !report.mode;

  const hasPolygon = !!spill?.geometry;
  const driftPath = backward ?? [];
  const hasDrift = driftPath.length > 0;

  const mapCenter: [number, number] = spill
    ? [spill.metrics.centroid.lat, spill.metrics.centroid.lon]
    : origin
      ? [origin.lat, origin.lon]
      : report.scene.bbox
        ? [
            (report.scene.bbox[1] + report.scene.bbox[3]) / 2,
            (report.scene.bbox[0] + report.scene.bbox[2]) / 2,
          ]
        : [15.25, 72.45];


  // Pipeline stages: Detection -> Drift -> AIS Correlation -> Attribution
  const pipelineSteps = [
    {
      stage: "Detection",
      label: "Satellite Spill Detection",
      icon: Radar,
      status: spill ? ("completed" as const) : isNoSpill ? ("completed" as const) : ("inconclusive" as const),
      statusBadge: spill ? "Completed" : isNoSpill ? "Clean (Completed)" : "Inconclusive",
      result: spill
        ? `Candidate spill identified (${spill.metrics.areaKm2} km², ${(spill.confidence * 100).toFixed(0)}% confidence)`
        : isNoSpill
          ? "No dark-slick detected above backscatter threshold"
          : "SAR imagery classification inconclusive",
    },
    {
      stage: "Drift",
      label: "Hydrodynamic Drift & Origin",
      icon: Compass,
      status: origin
        ? ("completed" as const)
        : hasDrift
          ? ("completed" as const)
          : isNoSpill
            ? ("not_assessed" as const)
            : ("unavailable" as const),
      statusBadge: origin ? "Completed" : hasDrift ? "Completed" : isNoSpill ? "Not Assessed" : "Unavailable",
      result: origin
        ? `Origin region computed at ${origin.lat.toFixed(3)}°N, ${origin.lon.toFixed(3)}°E (±${origin.uncertaintyKm} km)`
        : hasDrift
          ? `Drift trajectory computed (${driftPath.length} steps)`
          : isNoSpill
            ? "Drift analysis skipped — clean sea surface"
            : "Hydrodynamic advection data unavailable",
    },
    {
      stage: "AIS Correlation",
      label: "Spatiotemporal AIS Correlation",
      icon: Ship,
      status: candidates.length > 0
        ? ("completed" as const)
        : isNoSpill
          ? ("not_assessed" as const)
          : ("incomplete" as const),
      statusBadge: candidates.length > 0 ? "Completed" : isNoSpill ? "Not Assessed" : "No Candidates",
      result:
        candidates.length > 0
          ? `${candidates.length} candidate vessel${candidates.length !== 1 ? "s" : ""} correlated with release corridor`
          : isNoSpill
            ? "Vessel correlation skipped — clean sea surface"
            : "No compatible vessels found within spatio-temporal window",
    },
    {
      stage: "Attribution",
      label: "Source Attribution & Ranking",
      icon: Users,
      status: topCandidate
        ? ("completed" as const)
        : isNoSpill
          ? ("not_assessed" as const)
          : ("inconclusive" as const),
      statusBadge: topCandidate ? "Completed" : isNoSpill ? "Not Assessed" : "Inconclusive",
      result: topCandidate
        ? `Leading source candidate: ${topCandidate.name} (Score: ${topCandidate.score}/100)`
        : isNoSpill
          ? "Attribution not required"
          : "Source attribution inconclusive from current evidence",
    },
  ];

  return (
    <div className="space-y-6">
      {/* 1. OPERATIONAL OVERVIEW HEADER & SUMMARY */}
      <div className="space-y-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-mono text-[var(--accent-blue)] uppercase tracking-wider mb-1">
            <LayoutDashboard className="h-3.5 w-3.5" />
            <span>Maritime Intelligence &middot; Situational Awareness</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            Operational Overview
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5 max-w-2xl">
            {isSpillDetected
              ? `Active oil slick detected in Sentinel-1 SAR imagery with ${report.forecastHours}h hydrodynamic drift analysis and AIS vessel correlation.`
              : isNoSpill
                ? "Sentinel-1 SAR scene analyzed with verified clean surface conditions. No oil slick detected above threshold."
                : "Sentinel-1 SAR acquisition analyzed with inconclusive classification due to environmental backscatter characteristics."}
          </p>
        </div>

        {/* Incident Summary Card */}
        <div className="rounded border border-border bg-card p-5 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2.5 mb-1">
                <h2 className="text-lg font-bold tracking-tight text-foreground font-mono">
                  {incidentLabel}
                </h2>
                {isDemo && (
                  <span className="rounded border border-amber-500/30 bg-amber-500/10 px-1.5 py-0.5 text-[9px] font-mono font-semibold uppercase text-amber-300">
                    Synthetic Demo
                  </span>
                )}
              </div>
              <div className="flex flex-wrap items-center gap-3 text-xs font-mono text-muted-foreground">
                <span className="flex items-center gap-1">
                  <MapPin className="h-3 w-3" />
                  {spill
                    ? `${spill.metrics.centroid.lat.toFixed(3)}°N, ${spill.metrics.centroid.lon.toFixed(3)}°E`
                    : report.scene.bbox
                      ? `${((report.scene.bbox[1] + report.scene.bbox[3]) / 2).toFixed(3)}°N, ${((report.scene.bbox[0] + report.scene.bbox[2]) / 2).toFixed(3)}°E`
                      : "Location unavailable"}
                </span>
                <span className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {utc(report.scene.acquiredAt)}
                </span>
                <span>
                  Source: <strong className="text-foreground">{report.scene.source}</strong>
                </span>
                {report.scene.polarization && (
                  <span>
                    Pol: <strong className="text-foreground">{String(report.scene.polarization)}</strong>
                  </span>
                )}
              </div>
            </div>
            <OutcomeBadge outcome={outcome ?? report.status} />
          </div>

          {/* KPI Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            <div className="rounded border border-border bg-secondary/40 p-3 space-y-1">
              <span className="text-[10px] uppercase text-muted-foreground tracking-wider font-mono block">
                Spill Area
              </span>
              <span className="text-base font-bold text-foreground tabular-nums font-mono">
                {spill ? `${spill.metrics.areaKm2} km²` : isNoSpill ? "No spill detected" : "Inconclusive"}
              </span>
              <span className="text-[9px] text-muted-foreground block font-mono">
                {spill ? `${spill.metrics.lengthM.toFixed(0)}m × ${spill.metrics.widthM.toFixed(0)}m` : "SAR segmentation"}
              </span>
            </div>
            <div className="rounded border border-border bg-secondary/40 p-3 space-y-1">
              <span className="text-[10px] uppercase text-muted-foreground tracking-wider font-mono block">
                Estimated Age
              </span>
              <span className="text-base font-bold text-foreground tabular-nums font-mono">
                {report.age
                  ? `${report.age.minHours}–${report.age.maxHours}h`
                  : isNoSpill
                    ? "Not applicable"
                    : "Not assessed"}
              </span>
              <span className="text-[9px] text-muted-foreground block font-mono">
                {report.age ? `${report.age.confidence} confidence` : "Morphological window"}
              </span>
            </div>
            <div className="rounded border border-border bg-secondary/40 p-3 space-y-1">
              <span className="text-[10px] uppercase text-muted-foreground tracking-wider font-mono block">
                Confidence
              </span>
              <span className="text-base font-bold text-foreground tabular-nums font-mono">
                {spill
                  ? `${(spill.confidence * 100).toFixed(0)}%`
                  : isNoSpill
                    ? "High (Clean)"
                    : "Inconclusive"}
              </span>
              <span className="text-[9px] text-muted-foreground block font-mono">
                {spill?.confidenceMeaning ?? "Classification quality"}
              </span>
            </div>
            <div className="rounded border border-border bg-secondary/40 p-3 space-y-1">
              <span className="text-[10px] uppercase text-muted-foreground tracking-wider font-mono block">
                Estimated Origin
              </span>
              <span className="text-xs font-bold text-foreground font-mono truncate block">
                {origin
                  ? `${origin.lat.toFixed(3)}°N, ${origin.lon.toFixed(3)}°E`
                  : isNoSpill
                    ? "Not applicable"
                    : "Unavailable"}
              </span>
              <span className="text-[9px] text-muted-foreground block font-mono">
                {origin ? `Sensitivity: ±${origin.uncertaintyKm} km` : "Backtracked origin"}
              </span>
            </div>
            <div className="rounded border border-border bg-secondary/40 p-3 space-y-1">
              <span className="text-[10px] uppercase text-muted-foreground tracking-wider font-mono block">
                Candidate Vessels
              </span>
              <span className="text-base font-bold text-[var(--accent-blue)] tabular-nums font-mono">
                {candidates.length > 0
                  ? `${candidates.length} correlated`
                  : isNoSpill
                    ? "Not applicable"
                    : "None identified"}
              </span>
              <span className="text-[9px] text-muted-foreground block truncate font-mono">
                {topCandidate ? `Top: ${topCandidate.name}` : "AIS spatiotemporal"}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 2. MAIN MAP */}
      <Panel
        title="Incident Map"
        action={
          <div className="flex items-center gap-2 text-xs font-mono text-muted-foreground">
            <span>
              {spill
                ? `${spill.metrics.centroid.lat.toFixed(2)}°N, ${spill.metrics.centroid.lon.toFixed(2)}°E`
                : "Arabian Sea Sector"}
            </span>
          </div>
        }
      >
        <OceanMap
          height={440}
          initialCenter={mapCenter}
          initialZoom={1.4}
          legend={
            <div className="space-y-1.5 text-xs">
              <div className="font-semibold text-foreground border-b border-border/50 pb-1">
                MAP LAYERS
              </div>
              {hasPolygon && (
                <div className="flex items-center gap-2">
                  <span className="inline-block h-2 w-2 rounded bg-[var(--accent-blue)]" />
                  <span>Detected Spill</span>
                </div>
              )}
              {origin && (
                <div className="flex items-center gap-2">
                  <span className="inline-block h-2 w-2 rounded-full bg-amber-400" />
                  <span>Estimated Origin</span>
                </div>
              )}
              {hasDrift && (
                <div className="flex items-center gap-2">
                  <span className="inline-block w-3 border-t-2 border-dashed border-amber-400" />
                  <span>Drift Path</span>
                </div>
              )}
              {candidates.length > 0 && (
                <div className="flex items-center gap-2">
                  <span className="inline-block h-2 w-2 rounded-full bg-[var(--accent-blue)]" />
                  <span>Vessel Positions ({candidates.length})</span>
                </div>
              )}
            </div>
          }
        >
          {/* Spill polygon via Leaflet GeoJSON */}
          {hasPolygon && spill?.geometry && (
            <MapGeoJSON
              data={spill.geometry}
              style={{
                color: "#38bdf8",
                fillColor: "#38bdf8",
                fillOpacity: 0.25,
                weight: 2,
              }}
            />
          )}
          {/* Drift path via Leaflet Polyline */}
          {hasDrift && (
            <MapPolyline
              positions={driftPath.map((p) => [p.lat, p.lon])}
              pathOptions={{
                color: "var(--accent-amber)",
                dashArray: "6 5",
                weight: 2,
              }}
            />
          )}
          {/* Origin marker & uncertainty circle */}
          {origin && (
            <>
              <Marker
                lat={origin.lat}
                lon={origin.lon}
                color="var(--accent-amber)"
                label="Estimated Origin"
              />
              <MapCircle
                center={[origin.lat, origin.lon]}
                radius={(origin.uncertaintyKm || 5) * 1000}
                pathOptions={{
                  color: "var(--accent-amber)",
                  fillColor: "var(--accent-amber)",
                  fillOpacity: 0.08,
                  dashArray: "4 4",
                  weight: 1.5,
                }}
              />
            </>
          )}
          {/* Spill centroid */}
          {spill && (
            <Marker
              lat={spill.metrics.centroid.lat}
              lon={spill.metrics.centroid.lon}
              label="Detected Spill"
              pulse
            />
          )}
          {/* Vessel positions & tracks */}
          {candidates.map((c) => {
            const last = c.track[c.track.length - 1];
            if (!last) return null;
            return (
              <div key={c.mmsi}>
                <MapPolyline
                  positions={c.track.map((p) => [p.latitude, p.longitude])}
                  pathOptions={{
                    color: "#64748b",
                    weight: 1.5,
                    opacity: 0.6,
                  }}
                />
                <Marker
                  lat={last.latitude}
                  lon={last.longitude}
                  color="#94a3b8"
                  label={`${c.name} (${c.score}/100)`}
                />
              </div>
            );
          })}
        </OceanMap>
      </Panel>

      {/* 3. PIPELINE STATUS */}
      <div className="rounded border border-border bg-card p-5">
        <h2 className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground font-mono mb-4">
          What O.S.I.S. Found
        </h2>
        <div className="space-y-0">
          {pipelineSteps.map((step, i) => {
            const Icon = step.icon;
            const isCompleted = step.status === "completed";
            const isUnavailable = step.status === "unavailable";
            const isInconclusive = step.status === "inconclusive";
            const isIncomplete = step.status === "incomplete";

            const statusColor = isCompleted
              ? "text-emerald-400 border-emerald-500/30 bg-emerald-500/10"
              : isUnavailable
                ? "text-amber-400 border-amber-500/30 bg-amber-500/10"
                : isInconclusive
                  ? "text-amber-400 border-amber-500/30 bg-amber-500/10"
                  : isIncomplete
                    ? "text-muted-foreground border-border bg-secondary/50"
                    : "text-muted-foreground border-border bg-secondary/40";

            const statusIcon = isCompleted ? (
              <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
            ) : isUnavailable || isInconclusive ? (
              <AlertTriangle className="h-4 w-4 text-amber-400 shrink-0" />
            ) : (
              <HelpCircle className="h-4 w-4 text-muted-foreground shrink-0" />
            );

            return (
              <div key={step.stage}>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 py-3 border-b border-border/50 last:border-b-0">
                  <div className="flex items-center gap-3">
                    {statusIcon}
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold text-foreground">
                          {step.label}
                        </span>
                        <span className={`rounded px-1.5 py-0.2 text-[9px] font-mono uppercase tracking-wider border ${statusColor}`}>
                          {step.statusBadge}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {step.result}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 4. QUICK NAVIGATION CARDS */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Link
          to="/satellite"
          className="rounded border border-border bg-card p-4 space-y-2 hover:border-[var(--primary)]/50 transition-colors group"
        >
          <div className="flex items-center justify-between">
            <Radar className="h-4 w-4 text-[var(--accent-blue)]" />
            <ArrowRight className="h-3 w-3 text-muted-foreground group-hover:text-foreground transition-colors" />
          </div>
          <h3 className="text-sm font-semibold text-foreground">Detection</h3>
          <p className="text-[11px] text-muted-foreground">
            SAR imagery analysis &amp; spill geometry
          </p>
        </Link>
        <Link
          to="/backtracking"
          className="rounded border border-border bg-card p-4 space-y-2 hover:border-[var(--primary)]/50 transition-colors group"
        >
          <div className="flex items-center justify-between">
            <Compass className="h-4 w-4 text-amber-400" />
            <ArrowRight className="h-3 w-3 text-muted-foreground group-hover:text-foreground transition-colors" />
          </div>
          <h3 className="text-sm font-semibold text-foreground">Drift Analysis</h3>
          <p className="text-[11px] text-muted-foreground">
            Backward origin estimation &amp; forward prediction
          </p>
        </Link>
        <Link
          to="/ais"
          className="rounded border border-border bg-card p-4 space-y-2 hover:border-[var(--primary)]/50 transition-colors group"
        >
          <div className="flex items-center justify-between">
            <Ship className="h-4 w-4 text-[var(--accent-blue)]" />
            <ArrowRight className="h-3 w-3 text-muted-foreground group-hover:text-foreground transition-colors" />
          </div>
          <h3 className="text-sm font-semibold text-foreground">
            Vessel Attribution
          </h3>
          <p className="text-[11px] text-muted-foreground">
            AIS correlation &amp; candidate ranking
          </p>
        </Link>
        <Link
          to="/analysis"
          className="rounded border border-border bg-card p-4 space-y-2 hover:border-[var(--primary)]/50 transition-colors group"
        >
          <div className="flex items-center justify-between">
            <Layers className="h-4 w-4 text-emerald-400" />
            <ArrowRight className="h-3 w-3 text-muted-foreground group-hover:text-foreground transition-colors" />
          </div>
          <h3 className="text-sm font-semibold text-foreground">
            Full Investigation
          </h3>
          <p className="text-[11px] text-muted-foreground">
            Complete evidence report &amp; technical details
          </p>
        </Link>
      </div>
    </div>
  );
}

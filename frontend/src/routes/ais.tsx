import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Marker, OceanMap, pathFrom } from "../components/OceanMap";
import { KeyVal, Modal, Panel, StatusDot } from "../components/ui-kit";
import { useIncident } from "../context/IncidentContext";

export const Route = createFileRoute("/ais")({
  head: () => ({
    meta: [
      { title: "AIS Vessel Analysis — Oil Spill Correlation" },
      {
        name: "description",
        content:
          "Correlate AIS vessel tracks with the backtracked origin cell of detected oil spills and inspect candidate vessels.",
      },
      { property: "og:title", content: "AIS Vessel Analysis — Oil Spill Correlation" },
      {
        property: "og:description",
        content:
          "Candidate vessel tracks, reporting gaps and selection details on an interactive map.",
      },
    ],
  }),
  component: AisPage,
});

const utc = (iso: string) => {
  const d = new Date(iso);
  return `${d.toISOString().slice(0, 10)} ${d.toISOString().slice(11, 16)} UTC`;
};

function AisPage() {
  const { activeReport } = useIncident();
  const [selectedMmsi, setSelectedMmsi] = useState<string | null>(null);
  const [open, setOpen] = useState(false);

  if (!activeReport) {
    return (
      <div className="space-y-5">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">AIS vessel analysis</h1>
          <p className="text-sm text-muted-foreground">
            Candidate vessel tracks and AIS correlation
          </p>
        </div>
        <Panel className="flex flex-col items-center justify-center p-12 text-center">
          <p className="text-sm font-medium text-foreground">No active incident analysis</p>
          <p className="mt-2 text-sm text-muted-foreground">
            Run an analysis from{" "}
            <Link to="/analysis" className="text-primary underline">
              Analyze Incident
            </Link>{" "}
            or open a saved report.
          </p>
        </Panel>
      </div>
    );
  }

  const report = activeReport;
  const { candidates, anomalies, origin, spill, outcome } = report;
  const noSpill = outcome === "NO_SPILL_DETECTED" || outcome === "ANALYSIS_INCONCLUSIVE" || !spill;
  const hasVessels = candidates.length > 0;
  const hasAnomalies = anomalies.length > 0;

  const selected = candidates.find((c) => c.mmsi === selectedMmsi) ?? candidates[0] ?? null;
  const effectiveMmsi = selected?.mmsi ?? null;

  const select = (mmsi: string) => {
    setSelectedMmsi(mmsi);
    setOpen(true);
  };

  // Map center: prefer spill centroid, then origin.
  const mapCenter: [number, number] = spill
    ? [spill.metrics.centroid.lon, spill.metrics.centroid.lat]
    : origin
      ? [origin.lon, origin.lat]
      : report.scene.bbox
        ? [
            (report.scene.bbox[0] + report.scene.bbox[2]) / 2,
            (report.scene.bbox[1] + report.scene.bbox[3]) / 2,
          ]
        : [72.45, 15.25];

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">AIS vessel analysis</h1>
          <p className="text-sm text-muted-foreground">
            {report.mode} report · {candidates.length} candidate vessel(s) within the drift envelope
          </p>
        </div>
        <StatusDot label={`${outcome ?? report.status} correlation`} />
      </div>

      {noSpill && (
        <div className="rounded border border-amber-400/40 bg-card/70 p-4 text-sm">
          <strong>{outcome ?? report.status}</strong>
          <p className="mt-1">
            AIS vessel correlation is not performed when no oil spill is detected.
          </p>
        </div>
      )}

      {!noSpill && !hasVessels && (
        <div className="rounded border border-border bg-card/40 p-4 text-sm text-muted-foreground">
          {report.stageStatus?.["ais"]?.status === "unavailable"
            ? `AIS data unavailable: ${report.stageStatus["ais"].reason}`
            : "No candidate vessels met the spatial and temporal criteria for this incident."}
        </div>
      )}

      <div className="grid gap-5 lg:grid-cols-[1fr_320px]">
        <Panel title="AIS tracks">
          <OceanMap
            height={490}
            initialCenter={mapCenter}
            legend={
              <div>
                {hasVessels
                  ? `${candidates.length} candidate vessel(s) · track history · dashed = gap`
                  : noSpill
                    ? "No spill detected — vessel correlation not performed"
                    : "No candidate vessel tracks found for this incident"}
                <div className="mt-1">
                  {hasVessels ? "Click a vessel marker to open its record" : ""}
                </div>
              </div>
            }
          >
            {/* Spill centroid */}
            {spill && (
              <Marker
                lon={spill.metrics.centroid.lon}
                lat={spill.metrics.centroid.lat}
                label="Detected slick"
                pulse
              />
            )}
            {/* Origin cell */}
            {origin && (
              <Marker
                lon={origin.lon}
                lat={origin.lat}
                color="var(--accent-amber)"
                label="Modeled origin"
              />
            )}
            {/* Candidate vessel tracks */}
            {hasVessels &&
              candidates.map((c) => {
                const active = c.mmsi === effectiveMmsi;
                // Use trackSegments if available, otherwise fall back to track.
                const segments: { longitude: number; latitude: number }[][] =
                  c.trackSegments && c.trackSegments.length > 0 ? c.trackSegments : [c.track];
                const last = c.track[c.track.length - 1];
                const hasAnomalyForVessel = anomalies.some((a) => a.mmsi === c.mmsi);
                return (
                  <g key={c.mmsi}>
                    {segments.map((seg, j) => (
                      <path
                        key={j}
                        d={pathFrom(seg.map((p) => [p.longitude, p.latitude]))}
                        fill="none"
                        stroke={active ? "var(--accent-cyan)" : "var(--accent-blue)"}
                        strokeWidth={active ? 2 : 1.2}
                        strokeDasharray={hasAnomalyForVessel ? "7 5" : undefined}
                        opacity={active ? 1 : 0.45}
                      />
                    ))}
                    {/* AIS gap lines */}
                    {anomalies
                      .filter((a) => a.mmsi === c.mmsi)
                      .map((a, i) => (
                        <path
                          key={`gap-${i}`}
                          d={pathFrom([
                            [a.start.longitude, a.start.latitude],
                            [a.end.longitude, a.end.latitude],
                          ])}
                          stroke="#f87171"
                          strokeWidth={2}
                          strokeDasharray="3 5"
                          fill="none"
                        >
                          <title>{`${a.durationHours} h unobserved corridor · ${a.label}`}</title>
                        </path>
                      ))}
                    {last && (
                      <Marker
                        lon={last.longitude}
                        lat={last.latitude}
                        color={active ? "var(--accent-cyan)" : "var(--accent-blue)"}
                        active={active}
                        label={c.name}
                        onClick={() => select(c.mmsi)}
                      />
                    )}
                  </g>
                );
              })}
          </OceanMap>
          {!hasVessels && !noSpill && (
            <div className="mt-4 rounded-md border border-border bg-secondary/30 p-4 text-center">
              <div className="text-sm font-medium text-foreground">No candidate vessels</div>
              <p className="mt-1 text-[11px] text-muted-foreground">
                {report.stageStatus?.["ais"]?.reason ??
                  "No AIS-correlated vessels met the spatial/temporal criteria."}
              </p>
            </div>
          )}
        </Panel>

        <Panel title="Candidate vessels">
          {hasVessels ? (
            <>
              <ul className="space-y-2">
                {candidates.map((c) => {
                  const active = c.mmsi === effectiveMmsi;
                  const gapCount = anomalies.filter((a) => a.mmsi === c.mmsi).length;
                  return (
                    <li key={c.mmsi}>
                      <button
                        type="button"
                        onClick={() => select(c.mmsi)}
                        className={`w-full rounded-md border px-3 py-2.5 text-left transition-colors ${
                          active
                            ? "border-[var(--accent-cyan)]/60 bg-secondary"
                            : "border-border hover:border-primary/50 hover:bg-secondary/50"
                        }`}
                      >
                        <div className="flex items-baseline justify-between gap-2">
                          <span className="text-[13px] font-medium">
                            #{c.rank} {c.name}
                          </span>
                          <span className="text-[10px] tabular-nums text-muted-foreground">
                            {c.score} / 100
                          </span>
                        </div>
                        <div className="text-[11px] text-muted-foreground">
                          {c.type} · MMSI {c.mmsi}
                          {gapCount > 0 ? ` · ${gapCount} AIS gap(s)` : ""}
                        </div>
                      </button>
                    </li>
                  );
                })}
              </ul>
              {selected && (
                <button
                  type="button"
                  onClick={() => setOpen(true)}
                  className="mt-4 w-full rounded-md bg-primary px-3 py-2 text-xs font-medium text-primary-foreground transition-opacity hover:opacity-90"
                >
                  Open {selected.name}
                </button>
              )}
            </>
          ) : (
            <div className="py-8 text-center text-xs text-muted-foreground">
              {noSpill
                ? "Vessel correlation not performed — no spill detected."
                : "No candidate vessels identified for this analysis."}
            </div>
          )}
        </Panel>
      </div>

      {/* AIS anomalies table */}
      {hasAnomalies && (
        <Panel title="AIS discontinuities · not proof of disabling">
          {anomalies.map((a, i) => (
            <div key={i} className="border-t border-border/50 py-2 text-sm">
              <strong className="font-mono">{a.mmsi}</strong> · {a.durationHours} h unobserved
              <p className="text-xs text-muted-foreground">
                {utc(a.start.timestamp)} → {utc(a.end.timestamp)} · {a.label}
              </p>
              <p className="text-xs text-muted-foreground">Relevance index: {a.anomalyScore}</p>
            </div>
          ))}
        </Panel>
      )}

      {/* Selected vessel modal */}
      {selected && (
        <Modal
          open={open}
          onClose={() => setOpen(false)}
          title={selected.name}
          subtitle={`MMSI ${selected.mmsi} · ${selected.type}`}
        >
          <KeyVal k="Rank" v={`#${selected.rank}`} />
          <KeyVal k="Score" v={`${selected.score} / 100`} />
          <KeyVal k="Confidence" v={selected.confidence} />
          <KeyVal k="Closest distance" v={`${selected.closestDistanceKm} km to origin`} />
          <KeyVal k="Time overlap" v={`${selected.timeDifferenceHours} h`} />
          <KeyVal k="AIS continuity" v={`${(selected.aisContinuity * 100).toFixed(0)}%`} />
          <KeyVal k="AIS gaps" v={selected.anomalies.length} />
          <KeyVal k="Track points" v={selected.track.length} />
          {selected.track.length > 0 && (
            <KeyVal
              k="Last position"
              v={`${selected.track[selected.track.length - 1]!.latitude.toFixed(4)}° N, ${selected.track[selected.track.length - 1]!.longitude.toFixed(4)}° E`}
            />
          )}
          <p className="mt-4 text-[13px] leading-6 text-muted-foreground">{selected.evidence}</p>
          <p className="mt-3 text-[11px] text-muted-foreground">
            Vessel compatibility score — not legal attribution or confirmed identity.
          </p>
        </Modal>
      )}
    </div>
  );
}

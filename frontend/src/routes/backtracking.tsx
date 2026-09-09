import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Marker, OceanMap, pathFrom } from "../components/OceanMap";
import { KeyVal, Panel, Stat, StatusDot } from "../components/ui-kit";
import { useIncident } from "../context/IncidentContext";

export const Route = createFileRoute("/backtracking")({
  head: () => ({
    meta: [
      { title: "Drift Backtracking — Oil Spill Drift Model" },
      {
        name: "description",
        content:
          "Reverse-drift model for detected oil spills with a time slider from detection back to the probable release point.",
      },
      { property: "og:title", content: "Drift Backtracking — Oil Spill Drift Model" },
      {
        property: "og:description",
        content: "Scrub the drift timeline to see the backtracked slick position and origin cell.",
      },
    ],
  }),
  component: BacktrackingPage,
});

const utc = (iso: string) => {
  const d = new Date(iso);
  return `${d.toISOString().slice(0, 10)} ${d.toISOString().slice(11, 16)} UTC`;
};

function BacktrackingPage() {
  const { activeReport } = useIncident();
  const [sliderIndex, setSliderIndex] = useState(0);

  if (!activeReport) {
    return (
      <div className="space-y-5">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Drift backtracking</h1>
          <p className="text-sm text-muted-foreground">
            Reverse Lagrangian advection · modeled origin hindcast
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
  const { origin, backward, outcome, spill } = report;
  const noSpill = outcome === "NO_SPILL_DETECTED" || outcome === "ANALYSIS_INCONCLUSIVE" || !spill;

  // `backward` is an array of Position (lat, lon, hours, timestamp, uncertaintyKm).
  // hours < 0 means it's a hindcast step (negative = before image time).
  // We reverse it so index 0 = image time, last = furthest back.
  const driftPath = [...(backward ?? [])].reverse();
  const hasDrift = driftPath.length > 0;
  const MAX_IDX = hasDrift ? driftPath.length - 1 : 0;
  const point = hasDrift ? driftPath[Math.min(sliderIndex, MAX_IDX)] : null;
  const visible = hasDrift ? driftPath.slice(0, sliderIndex + 1) : [];

  // Map center: prefer spill centroid, then origin, then scene bbox center.
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
          <h1 className="text-xl font-semibold tracking-tight">Drift backtracking</h1>
          <p className="text-sm text-muted-foreground">
            {report.mode} report · Reverse Lagrangian advection · modeled release origin
          </p>
        </div>
        <StatusDot label={outcome ?? report.status} />
      </div>

      {noSpill && (
        <div className="rounded border border-amber-400/40 bg-card/70 p-4 text-sm">
          <strong>{outcome ?? report.status}</strong>
          <p className="mt-1">
            {noSpill
              ? "Drift backtracking is not applicable when no oil spill is detected."
              : "Backtracking unavailable for this analysis."}
          </p>
          {report.outcomeReason && (
            <p className="mt-1 text-xs text-muted-foreground">{report.outcomeReason}</p>
          )}
        </div>
      )}

      <div className="grid gap-5 lg:grid-cols-[1fr_320px]">
        <Panel title="Reverse drift model">
          <OceanMap
            height={470}
            initialCenter={mapCenter}
            legend={
              <div className="space-y-1">
                {hasDrift && (
                  <div>
                    <span className="mr-2 inline-block h-2 w-2 rounded-full bg-[var(--accent-cyan)]" />
                    Detected slick (t=0)
                  </div>
                )}
                {origin && (
                  <div>
                    <span className="mr-2 inline-block h-2 w-2 rounded-full bg-[var(--accent-amber)]" />
                    Modeled origin
                  </div>
                )}
              </div>
            }
          >
            {/* Full drift path (faint) */}
            {hasDrift && (
              <>
                <path
                  d={pathFrom(driftPath.map((p) => [p.lon, p.lat]))}
                  fill="none"
                  stroke="var(--map-label)"
                  strokeWidth={1}
                  strokeDasharray="4 6"
                  opacity={0.35}
                />
                {/* Active portion up to slider */}
                <path
                  d={pathFrom(visible.map((p) => [p.lon, p.lat]))}
                  fill="none"
                  stroke="var(--accent-amber)"
                  strokeWidth={2}
                  strokeLinecap="round"
                />
              </>
            )}
            {/* Image-time slick position */}
            {spill && (
              <Marker
                lon={spill.metrics.centroid.lon}
                lat={spill.metrics.centroid.lat}
                label="Detected slick (t=0)"
                pulse
              />
            )}
            {/* Modeled origin */}
            {origin && (
              <Marker
                lon={origin.lon}
                lat={origin.lat}
                color="var(--accent-amber)"
                label="Modeled origin"
              />
            )}
            {/* Slider point */}
            {point && (
              <Marker lon={point.lon} lat={point.lat} color="var(--accent-blue)" pulse active />
            )}
          </OceanMap>

          {hasDrift ? (
            <div className="mt-5">
              <div className="flex items-baseline justify-between text-[11px]">
                <span className="uppercase tracking-[0.16em] text-muted-foreground">
                  Backtrack time
                </span>
                <span className="tabular-nums text-foreground">
                  {point
                    ? `t ${point.hours.toFixed(0)}h · ${utc(point.timestamp)}`
                    : "t = 0 (image time)"}
                </span>
              </div>
              <input
                type="range"
                className="om-range mt-3"
                min={0}
                max={MAX_IDX}
                step={1}
                value={sliderIndex}
                aria-label="Backtrack time in hours"
                style={{ ["--fill" as string]: `${(sliderIndex / (MAX_IDX || 1)) * 100}%` }}
                onChange={(e) => setSliderIndex(Number(e.target.value))}
              />
              <div className="mt-2 flex justify-between text-[10px] text-muted-foreground">
                <span>t = 0 (image time)</span>
                {driftPath[MAX_IDX] && (
                  <span>t {driftPath[MAX_IDX].hours.toFixed(0)}h (modeled origin)</span>
                )}
              </div>
              <div className="mt-3 flex gap-2">
                <button
                  type="button"
                  onClick={() => setSliderIndex(0)}
                  className="rounded-md border border-border px-3 py-1.5 text-[11px] transition-colors hover:border-primary/60 hover:text-primary"
                >
                  Jump to detection
                </button>
                <button
                  type="button"
                  onClick={() => setSliderIndex(MAX_IDX)}
                  className="rounded-md border border-border px-3 py-1.5 text-[11px] transition-colors hover:border-primary/60 hover:text-primary"
                >
                  Jump to origin
                </button>
              </div>
              <p className="mt-3 text-[11px] text-muted-foreground">
                Sensitivity radius ±{point?.uncertaintyKm ?? "—"} km at selected time. Modeled
                trajectory — not a navigational track.
              </p>
            </div>
          ) : (
            <div className="mt-5 rounded-md border border-border bg-secondary/30 p-4 text-center">
              <div className="text-sm font-medium text-foreground">
                {noSpill
                  ? "Drift backtracking not applicable"
                  : "Backtracked trajectory unavailable"}
              </div>
              <p className="mt-1 text-[11px] text-muted-foreground">
                {noSpill
                  ? "No oil spill was detected in this scene — drift backtracking was not computed."
                  : "The hindcast drift path was not computed for this report. Run a DEMO or REAL analysis to generate a drift trajectory."}
              </p>
            </div>
          )}
        </Panel>

        <div className="space-y-5">
          <Panel title="Position at selected time">
            {point ? (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <Stat label="Latitude" value={point.lat.toFixed(4)} />
                  <Stat label="Longitude" value={point.lon.toFixed(4)} />
                  <Stat label="Hours back" value={Math.abs(point.hours).toFixed(0)} />
                  <Stat label="Sensitivity" value={`±${point.uncertaintyKm} km`} />
                </div>
                <p className="mt-3 text-[12px] text-muted-foreground">{utc(point.timestamp)}</p>
                <p className="mt-1 text-[11px] text-muted-foreground">
                  Sensitivity ±{point.uncertaintyKm} km is a modeled range, not a calibrated
                  uncertainty.
                </p>
              </>
            ) : (
              <div className="py-4 text-center text-xs text-muted-foreground">
                {noSpill
                  ? "No drift trajectory — no spill detected."
                  : "No backtracked trajectory available."}
              </div>
            )}
          </Panel>

          <Panel title="Modeled origin">
            {origin ? (
              <>
                <KeyVal
                  k="Position"
                  v={`${origin.lat.toFixed(5)}° N, ${origin.lon.toFixed(5)}° E`}
                />
                <KeyVal k="Sensitivity radius" v={`${origin.uncertaintyKm} km`} />
                <KeyVal k="Window start" v={utc(origin.releaseWindow.start)} />
                <KeyVal k="Window end" v={utc(origin.releaseWindow.end)} />
                <KeyVal k="Hindcast steps" v={`${driftPath.length} hourly`} />
                <p className="mt-2 text-[11px] text-muted-foreground">
                  Release window is an analyst-selected hindcast scenario. Not a measured spill age.
                </p>
              </>
            ) : (
              <div className="py-4 text-center text-xs text-muted-foreground">
                {noSpill
                  ? "Origin not modeled — no spill detected."
                  : "Origin release cell has not been estimated for this report."}
              </div>
            )}
          </Panel>
        </div>
      </div>
    </div>
  );
}

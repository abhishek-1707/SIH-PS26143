import { createFileRoute, Link } from "@tanstack/react-router";
import { OceanMap, pathFrom, project } from "../components/OceanMap";
import { KeyVal, Panel, Stat, StatusDot } from "../components/ui-kit";
import { useIncident } from "../context/IncidentContext";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Overview — Oil Spill Detection & Vessel Attribution" },
      {
        name: "description",
        content:
          "Live overview of active oil spills in the Arabian Sea with probable origin and top suspect vessel.",
      },
      { property: "og:title", content: "Overview — Oil Spill Detection Console" },
      {
        property: "og:description",
        content: "Active spill summary, probable release origin and leading suspect vessel.",
      },
    ],
  }),
  component: OverviewPage,
});

const utc = (iso: string) => {
  const d = new Date(iso);
  return `${d.toISOString().slice(0, 10)} ${d.toISOString().slice(11, 16)} UTC`;
};

function OverviewPage() {
  const { activeReport } = useIncident();

  if (!activeReport) {
    return (
      <div className="space-y-5">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Operations overview</h1>
          <p className="text-sm text-muted-foreground">
            Arabian Sea sector · no active incident analysis
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
  const { spill, origin, candidates, anomalies, outcome } = report;
  const topCandidate = candidates[0] ?? null;
  const noSpill = outcome === "NO_SPILL_DETECTED" || outcome === "ANALYSIS_INCONCLUSIVE" || !spill;

  // Build spill polygon path from the detection geometry.
  const spillCoords: [number, number][] =
    spill?.geometry.coordinates[0]?.map(([lon, lat]) => [lon, lat]) ?? [];
  const hasPolygon = spillCoords.length > 0;
  const spillD = hasPolygon
    ? spillCoords
        .map(([lon, lat], i) => `${i ? "L" : "M"}${project(lon, lat).join(" ")}`)
        .join(" ") + " Z"
    : "";

  // Drift path (hindcast backward trajectory).
  const driftPath = report.backward ?? [];
  const hasDrift = driftPath.length > 0;

  // Map center: prefer spill centroid, then origin, then scene center.
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
          <h1 className="text-xl font-semibold tracking-tight">Operations overview</h1>
          <p className="text-sm text-muted-foreground">
            {report.mode} analysis · report {report.id.slice(0, 12)} · {report.status}
          </p>
        </div>
        <StatusDot label={`${report.outcome ?? report.status}`} />
      </div>

      {noSpill && (
        <div className="rounded border border-amber-400/40 bg-card/70 p-4 text-sm">
          <strong>{outcome ?? report.status}</strong>
          {report.outcomeMessage && <p className="mt-1">{report.outcomeMessage}</p>}
          {report.outcomeReason && (
            <p className="mt-1 text-xs text-muted-foreground">{report.outcomeReason}</p>
          )}
        </div>
      )}

      <Panel className="overflow-hidden">
        <OceanMap
          height={430}
          initialCenter={mapCenter}
          legend={
            <div className="space-y-1">
              {hasPolygon && (
                <div>
                  <span className="mr-2 inline-block h-2 w-2 rounded-full bg-[var(--accent-cyan)]" />
                  Detected slick
                </div>
              )}
              {origin && (
                <div>
                  <span className="mr-2 inline-block h-2 w-2 rounded-full bg-[var(--accent-amber)]" />
                  Modeled origin
                </div>
              )}
              {candidates.length > 0 && (
                <div>
                  <span className="mr-2 inline-block h-2 w-2 rounded-full bg-[var(--accent-blue)]" />
                  Candidate vessels
                </div>
              )}
            </div>
          }
        >
          {hasPolygon && (
            <path
              d={spillD}
              fill="var(--accent-cyan)"
              fillOpacity={0.16}
              stroke="var(--accent-cyan)"
              strokeWidth={1.6}
            />
          )}
          {hasDrift && (
            <path
              d={pathFrom(driftPath.map((p) => [p.lon, p.lat]))}
              fill="none"
              stroke="var(--accent-amber)"
              strokeWidth={1.4}
              strokeDasharray="6 5"
              opacity={0.8}
            />
          )}
          {origin &&
            (() => {
              const [ox, oy] = project(origin.lon, origin.lat);
              return (
                <g>
                  <circle cx={ox} cy={oy} r={6} fill="var(--accent-amber)" opacity={0.8} />
                  <text x={ox + 8} y={oy + 4} fontSize={10} fill="var(--accent-amber)">
                    Modeled origin
                  </text>
                </g>
              );
            })()}
          {candidates.map((c, i) => {
            const colors = ["var(--accent-blue)", "var(--accent-cyan)", "#a78bfa"];
            const last = c.track[c.track.length - 1];
            if (!last) return null;
            const [x, y] = project(last.longitude, last.latitude);
            return (
              <g key={c.mmsi}>
                <path
                  d={pathFrom(c.track.map((p) => [p.longitude, p.latitude]))}
                  fill="none"
                  stroke={colors[i % colors.length]}
                  strokeWidth={1}
                  opacity={0.5}
                />
                <circle cx={x} cy={y} r={4} fill={colors[i % colors.length]} opacity={0.8}>
                  <title>
                    {c.name} · MMSI {c.mmsi}
                  </title>
                </circle>
              </g>
            );
          })}
        </OceanMap>
        <p className="mt-3 text-[11px] text-muted-foreground">
          {candidates.length > 0
            ? `${candidates.length} candidate vessel(s) identified. Click Suspects tab for attribution detail.`
            : noSpill
              ? "No spill detected — vessel attribution not performed."
              : "Vessel correlation pending or unavailable for this analysis."}
        </p>
      </Panel>

      <div className="grid gap-5 lg:grid-cols-3">
        <Panel title="Detection summary">
          {spill ? (
            <div className="grid grid-cols-2 gap-4">
              <Stat label="Area" value={`${spill.metrics.areaKm2} km²`} hint="SAR derived" />
              <Stat
                label="Confidence"
                value={`${(spill.confidence * 100).toFixed(1)} / 100`}
                hint="Dark-slick index"
              />
              {report.age && (
                <Stat
                  label="Estimated age"
                  value={`${report.age.minHours}–${report.age.maxHours} h`}
                  hint={report.age.confidence}
                />
              )}
              <Stat label="Mode" value={report.mode ?? "DEMO"} hint={report.status} />
            </div>
          ) : (
            <div className="py-4 text-center">
              <p className="text-sm font-medium">{outcome ?? report.status}</p>
              <p className="mt-1 text-xs text-muted-foreground">
                {report.outcomeMessage ?? "No spill candidate detected in this scene."}
              </p>
            </div>
          )}
          <p className="mt-3 text-[11px] text-muted-foreground">
            Scene: {report.scene.source} · acquired {utc(report.scene.acquiredAt)}
          </p>
        </Panel>

        <Panel title="Modeled origin">
          {origin ? (
            <>
              <KeyVal k="Position" v={`${origin.lat.toFixed(5)}° N, ${origin.lon.toFixed(5)}° E`} />
              <KeyVal k="Uncertainty" v={`${origin.uncertaintyKm} km radius`} />
              <KeyVal
                k="Release window"
                v={`${utc(origin.releaseWindow.start).slice(11)} – ${utc(origin.releaseWindow.end).slice(11)}`}
              />
              <p className="mt-2 text-[11px] text-muted-foreground">
                Sensitivity radius, not a calibrated uncertainty. Hindcast model only.
              </p>
            </>
          ) : (
            <div className="py-6 text-center">
              <div className="text-sm font-medium text-foreground">
                {noSpill ? "No spill — origin not modeled" : "Modeled origin unavailable"}
              </div>
              <p className="mt-1 text-[11px] text-muted-foreground">
                {noSpill
                  ? "Drift backtracking is not performed when no spill is detected."
                  : "Origin hindcast was not computed for this report."}
              </p>
            </div>
          )}
          <Link
            to="/backtracking"
            className="mt-4 inline-flex rounded-md border border-border px-3 py-1.5 text-xs transition-colors hover:border-primary/60 hover:text-primary"
          >
            Open drift backtracking
          </Link>
        </Panel>

        <Panel title="Top suspect vessel">
          {topCandidate ? (
            <>
              <div className="text-base font-medium">{topCandidate.name}</div>
              <div className="text-[11px] text-muted-foreground">
                {topCandidate.type} · MMSI {topCandidate.mmsi}
              </div>
              <div className="mt-3 text-3xl font-semibold tabular-nums text-[var(--accent-cyan)]">
                {topCandidate.score}
                <span className="ml-1 text-sm text-muted-foreground">/ 100</span>
              </div>
              <p className="mt-2 text-xs text-muted-foreground">
                Compatibility score — not legal attribution. {topCandidate.confidence} confidence.
              </p>
              <Link
                to="/suspects"
                className="mt-4 inline-flex rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground transition-opacity hover:opacity-90"
              >
                View attribution
              </Link>
            </>
          ) : (
            <>
              <div className="py-6 text-center">
                <div className="text-sm font-medium text-foreground">
                  {noSpill ? "No attribution generated" : "No candidate vessels identified"}
                </div>
                <p className="mt-1 text-[11px] text-muted-foreground">
                  {noSpill
                    ? "Vessel correlation is not performed when no spill is detected."
                    : "No AIS-correlated vessels met the spatial/temporal criteria."}
                </p>
              </div>
              <Link
                to="/suspects"
                className="mt-4 inline-flex rounded-md border border-border px-3 py-1.5 text-xs transition-colors hover:border-primary/60 hover:text-primary"
              >
                Open suspect ranking
              </Link>
            </>
          )}
        </Panel>
      </div>

      {/* AIS anomalies summary */}
      {anomalies.length > 0 && (
        <Panel title="AIS discontinuities detected">
          <p className="mb-2 text-xs text-muted-foreground">
            Unobserved intervals in candidate tracks — not proof of intentional disabling.
          </p>
          {anomalies.slice(0, 3).map((a, i) => (
            <div key={i} className="border-t border-border/50 py-1.5 text-xs">
              <span className="font-mono">{a.mmsi}</span> · {a.durationHours} h unobserved ·{" "}
              {a.label}
            </div>
          ))}
          {anomalies.length > 3 && (
            <p className="mt-1 text-[11px] text-muted-foreground">
              + {anomalies.length - 3} more — see AIS tab for full list.
            </p>
          )}
        </Panel>
      )}
    </div>
  );
}

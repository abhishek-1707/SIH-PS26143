import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { fetchSpills } from "../api/spills";
import { Marker, OceanMap, pathFrom } from "../components/OceanMap";
import { KeyVal, Panel, Stat, StatusDot } from "../components/ui-kit";
import { useIncident, validateIncidentSearch } from "../context/IncidentContext";
import { formatUtc } from "../data/mock";

export const Route = createFileRoute("/backtracking")({
  validateSearch: validateIncidentSearch,
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
  loader: async () => {
    try {
      return await fetchSpills();
    } catch {
      return undefined;
    }
  },
  component: BacktrackingPage,
});

function BacktrackingPage() {
  const {
    selectedIncidentId,
    setSelectedIncidentId,
    selectedSpill,
    spills,
    isLoading,
    isError,
    refetch,
    investigation,
  } = useIncident();
  const [hours, setHours] = useState(0);

  const spill = selectedSpill;
  const hasDrift = Boolean(investigation?.driftPath && investigation.driftPath.length > 0);
  const hasProbableOrigin = Boolean(investigation?.probableOrigin);
  const driftPath = hasDrift ? investigation!.driftPath! : [];
  const probableOrigin = hasProbableOrigin ? investigation!.probableOrigin! : null;
  const MAX_H = hasDrift ? driftPath[driftPath.length - 1]!.hoursAgo : 0;
  const idx = hasDrift ? Math.min(Math.round(hours), driftPath.length - 1) : 0;
  const point = hasDrift ? driftPath[idx]! : null;
  const visible = hasDrift ? driftPath.slice(0, idx + 1) : [];

  if (isLoading) {
    return (
      <div className="space-y-5">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Drift backtracking</h1>
          <p className="text-sm text-muted-foreground">
            Reverse Lagrangian advection · surface current 0.34 m/s bearing 246° · 3% wind leeway
          </p>
        </div>
        <Panel className="flex items-center justify-center p-12 text-center">
          <p className="text-sm text-muted-foreground">Loading spill data...</p>
        </Panel>
      </div>
    );
  }

  if (isError || !spill) {
    return (
      <div className="space-y-5">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Drift backtracking</h1>
          <p className="text-sm text-muted-foreground">
            Reverse Lagrangian advection · surface current 0.34 m/s bearing 246° · 3% wind leeway
          </p>
        </div>
        <Panel className="flex flex-col items-center justify-center p-12 text-center">
          <p className="text-sm text-muted-foreground">
            Unable to load spill data. Make sure the backend is running.
          </p>
          <button
            type="button"
            onClick={() => refetch()}
            className="mt-4 rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground transition-opacity hover:opacity-90"
          >
            Retry
          </button>
        </Panel>
      </div>
    );
  }

  const detectedMs = new Date(spill.detectedAt).getTime();
  const stamp = new Date(detectedMs - hours * 3600_000).toISOString();

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Drift backtracking</h1>
          <p className="text-sm text-muted-foreground">
            Incident {spill.id} · Reverse Lagrangian advection · surface current 0.34 m/s bearing
            246° · 3% wind leeway
          </p>
        </div>
        <div className="flex items-center gap-2">
          {spills && spills.length > 1 && (
            <div className="flex items-center gap-1" title="Select incident">
              {spills.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => setSelectedIncidentId(s.id)}
                  className={`rounded px-1.5 py-0.5 text-[10px] font-mono transition-colors ${
                    s.id === spill.id
                      ? "border border-[var(--accent-cyan)]/50 bg-[var(--accent-cyan)]/20 text-[var(--accent-cyan)]"
                      : "border border-transparent text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {s.id}
                </button>
              ))}
            </div>
          )}
          <StatusDot label={`${spill.id} ${spill.status}`} />
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-[1fr_320px]">
        <Panel title="Reverse drift model">
          <OceanMap
            height={470}
            initialCenter={[spill.location.longitude, spill.location.latitude]}
            legend={
              <div className="space-y-1">
                <div>
                  <span className="mr-2 inline-block h-2 w-2 rounded-full bg-[var(--accent-cyan)]" />
                  Detected slick ({spill.id}, t=0)
                </div>
                {hasProbableOrigin && (
                  <div>
                    <span className="mr-2 inline-block h-2 w-2 rounded-full bg-[var(--accent-amber)]" />
                    Probable origin (t−9h)
                  </div>
                )}
              </div>
            }
          >
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
                <path
                  d={pathFrom(visible.map((p) => [p.lon, p.lat]))}
                  fill="none"
                  stroke="var(--accent-amber)"
                  strokeWidth={2}
                  strokeLinecap="round"
                />
              </>
            )}
            <Marker
              lon={spill.location.longitude}
              lat={spill.location.latitude}
              label={`Detected slick (${spill.id})`}
            />
            {probableOrigin && (
              <Marker
                lon={probableOrigin.lon}
                lat={probableOrigin.lat}
                color="var(--accent-amber)"
                label="Probable origin"
              />
            )}
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
                  t − {hours.toFixed(0)} h · {formatUtc(stamp)}
                </span>
              </div>
              <input
                type="range"
                className="om-range mt-3"
                min={0}
                max={MAX_H}
                step={1}
                value={hours}
                aria-label="Backtrack time in hours"
                style={{ ["--fill" as string]: `${(hours / (MAX_H || 1)) * 100}%` }}
                onChange={(e) => setHours(Number(e.target.value))}
              />
              <div className="mt-2 flex justify-between text-[10px] text-muted-foreground">
                <span>t − 0 h (detection)</span>
                <span>t − {MAX_H} h (origin)</span>
              </div>
              <div className="mt-3 flex gap-2">
                <button
                  type="button"
                  onClick={() => setHours(0)}
                  className="rounded-md border border-border px-3 py-1.5 text-[11px] transition-colors hover:border-primary/60 hover:text-primary"
                >
                  Jump to detection
                </button>
                <button
                  type="button"
                  onClick={() => setHours(MAX_H)}
                  className="rounded-md border border-border px-3 py-1.5 text-[11px] transition-colors hover:border-primary/60 hover:text-primary"
                >
                  Jump to origin
                </button>
              </div>
            </div>
          ) : (
            <div className="mt-5 rounded-md border border-border bg-secondary/30 p-4 text-center">
              <div className="text-sm font-medium text-foreground">
                Investigation data unavailable
              </div>
              <p className="mt-1 text-[11px] text-muted-foreground">
                Reverse Lagrangian drift backtracking has not been computed for incident {spill.id}.
                Select SP-001 to review demonstration drift model.
              </p>
            </div>
          )}
        </Panel>

        <div className="space-y-5">
          <Panel title="Position at selected time">
            {point ? (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <Stat label="Latitude" value={point.lat.toFixed(3)} />
                  <Stat label="Longitude" value={point.lon.toFixed(3)} />
                </div>
                <p className="mt-3 text-[12px] text-muted-foreground">{point.label}</p>
              </>
            ) : (
              <div className="py-4 text-center text-xs text-muted-foreground">
                No backtracked trajectory points for {spill.id}.
              </div>
            )}
          </Panel>

          <Panel title="Probable origin">
            {probableOrigin ? (
              <>
                <KeyVal k="Position" v={`${probableOrigin.lat}, ${probableOrigin.lon}`} />
                <KeyVal k="Radius" v={`${probableOrigin.radiusKm} km`} />
                <KeyVal k="Window start" v={formatUtc(probableOrigin.windowStart)} />
                <KeyVal k="Window end" v={formatUtc(probableOrigin.windowEnd)} />
                <KeyVal k="Model steps" v={`${driftPath.length} hourly`} />
              </>
            ) : (
              <div className="py-4 text-center text-xs text-muted-foreground">
                Origin release cell has not been estimated for {spill.id}.
              </div>
            )}
          </Panel>
        </div>
      </div>
    </div>
  );
}

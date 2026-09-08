import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { fetchSpills } from "../api/spills";
import { Marker, OceanMap, pathFrom } from "../components/OceanMap";
import { KeyVal, Modal, Panel, StatusDot } from "../components/ui-kit";
import { useIncident, validateIncidentSearch } from "../context/IncidentContext";
import { formatUtc } from "../data/mock";

export const Route = createFileRoute("/ais")({
  validateSearch: validateIncidentSearch,
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
        content: "Candidate vessel tracks, reporting gaps and selection details on an interactive map.",
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
  component: AisPage,
});

function AisPage() {
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
  const spill = selectedSpill;
  const hasVessels = Boolean(investigation?.vessels && investigation.vessels.length > 0);
  const vessels = hasVessels ? investigation!.vessels! : [];
  const hasProbableOrigin = Boolean(investigation?.probableOrigin);
  const probableOrigin = hasProbableOrigin ? investigation!.probableOrigin! : null;
  const suspects = investigation?.suspects ?? [];

  const [selectedId, setSelectedId] = useState<string | null>(vessels[0]?.id ?? null);
  const [open, setOpen] = useState(false);
  const selected = vessels.find((v) => v.id === selectedId) ?? vessels[0] ?? null;
  const score = selected ? suspects.find((s) => s.vesselId === selected.id) : null;

  const select = (id: string) => {
    setSelectedId(id);
    setOpen(true);
  };

  if (isLoading) {
    return (
      <div className="space-y-5">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">AIS vessel analysis</h1>
          <p className="text-sm text-muted-foreground">
            {vessels.length} candidate vessels within the drift envelope during the release window
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
          <h1 className="text-xl font-semibold tracking-tight">AIS vessel analysis</h1>
          <p className="text-sm text-muted-foreground">
            {vessels.length} candidate vessels within the drift envelope during the release window
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

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">AIS vessel analysis</h1>
          <p className="text-sm text-muted-foreground">
            Incident {spill.id} · {vessels.length} candidate vessels within the drift envelope during the release window
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
          <StatusDot label={`${spill.id} correlation`} />
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-[1fr_320px]">
        <Panel title="AIS tracks">
          <OceanMap
            height={490}
            initialCenter={[spill.location.longitude, spill.location.latitude]}
            legend={
              <div>
                {hasVessels
                  ? "Track history 12 h · dashed segments indicate reporting gaps"
                  : `Candidate vessel tracks for ${spill.id}`}
                <div className="mt-1">
                  {hasVessels ? "Click a vessel marker to open its record" : "Detected spill centroid"}
                </div>
              </div>
            }
          >
            <Marker lon={spill.location.longitude} lat={spill.location.latitude} label={spill.id} pulse />
            {probableOrigin && (
              <Marker
                lon={probableOrigin.lon}
                lat={probableOrigin.lat}
                color="var(--accent-amber)"
                label="Origin cell"
              />
            )}
            {hasVessels &&
              vessels.map((v) => {
                const last = v.track[v.track.length - 1]!;
                const active = v.id === selectedId;
                return (
                  <g key={v.id}>
                    <path
                      d={pathFrom(v.track)}
                      fill="none"
                      stroke={active ? "var(--accent-cyan)" : "var(--accent-blue)"}
                      strokeWidth={active ? 2 : 1.2}
                      strokeDasharray={v.aisGapMin > 30 ? "7 5" : undefined}
                      opacity={active ? 1 : 0.45}
                    />
                    <Marker
                      lon={last[0]}
                      lat={last[1]}
                      color={active ? "var(--accent-cyan)" : "var(--accent-blue)"}
                      active={active}
                      label={v.name}
                      onClick={() => select(v.id)}
                    />
                  </g>
                );
              })}
          </OceanMap>
          {!hasVessels && (
            <div className="mt-4 rounded-md border border-border bg-secondary/30 p-4 text-center">
              <div className="text-sm font-medium text-foreground">Investigation data unavailable</div>
              <p className="mt-1 text-[11px] text-muted-foreground">
                No candidate AIS tracks or vessel correlations found for incident {spill.id}. Select SP-001 to review demonstration AIS correlation.
              </p>
            </div>
          )}
        </Panel>

        <Panel title="Candidate vessels">
          {hasVessels && selected ? (
            <>
              <ul className="space-y-2">
                {vessels.map((v) => {
                  const active = v.id === selectedId;
                  return (
                    <li key={v.id}>
                      <button
                        type="button"
                        onClick={() => select(v.id)}
                        className={`w-full rounded-md border px-3 py-2.5 text-left transition-colors ${
                          active
                            ? "border-[var(--accent-cyan)]/60 bg-secondary"
                            : "border-border hover:border-primary/50 hover:bg-secondary/50"
                        }`}
                      >
                        <div className="flex items-baseline justify-between gap-2">
                          <span className="text-[13px] font-medium">{v.name}</span>
                          <span className="text-[10px] tabular-nums text-muted-foreground">
                            {v.speedKn} kn
                          </span>
                        </div>
                        <div className="text-[11px] text-muted-foreground">
                          {v.type} · gap {v.aisGapMin} min
                        </div>
                      </button>
                    </li>
                  );
                })}
              </ul>
              <button
                type="button"
                onClick={() => setOpen(true)}
                className="mt-4 w-full rounded-md bg-primary px-3 py-2 text-xs font-medium text-primary-foreground transition-opacity hover:opacity-90"
              >
                Open {selected.name}
              </button>
            </>
          ) : (
            <div className="py-8 text-center text-xs text-muted-foreground">
              No candidate vessels correlated with {spill.id}.
            </div>
          )}
        </Panel>
      </div>

      {selected && (
        <Modal
          open={open}
          onClose={() => setOpen(false)}
          title={selected.name}
          subtitle={`MMSI ${selected.mmsi} · ${selected.flag}`}
        >
          <KeyVal k="Type" v={selected.type} />
          <KeyVal k="Speed" v={`${selected.speedKn} kn`} />
          <KeyVal k="Heading" v={`${selected.headingDeg}°`} />
          <KeyVal k="Last AIS report" v={formatUtc(selected.lastSeen)} />
          <KeyVal k="Reporting gap" v={`${selected.aisGapMin} min`} />
          <KeyVal k="Track points" v={selected.track.length} />
          {score && <KeyVal k="Suspicion score" v={score.suspicion} />}
          {score && <p className="mt-4 text-[13px] leading-6 text-muted-foreground">{score.summary}</p>}
        </Modal>
      )}
    </div>
  );
}

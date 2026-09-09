import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { KeyVal, Meter, Modal, Panel, StatusDot } from "../components/ui-kit";
import { useIncident, validateIncidentSearch } from "../context/IncidentContext";
import { formatUtc, vesselById } from "../data/mock";

export const Route = createFileRoute("/suspects")({
  validateSearch: validateIncidentSearch,
  head: () => ({
    meta: [
      { title: "Suspect Ranking — Vessel Attribution" },
      {
        name: "description",
        content:
          "Ranked suspect vessels scored on proximity, temporal overlap, AIS gaps and vessel type.",
      },
      { property: "og:title", content: "Suspect Ranking — Vessel Attribution" },
      {
        property: "og:description",
        content: "Weighted suspicion scores with per-vessel attribution detail panels.",
      },
    ],
  }),
  component: SuspectsPage,
});

type SortKey = "suspicion" | "proximity" | "temporal" | "aisGap" | "vesselType";

const SORTS: { key: SortKey; label: string }[] = [
  { key: "suspicion", label: "Suspicion" },
  { key: "proximity", label: "Proximity" },
  { key: "temporal", label: "Temporal" },
  { key: "aisGap", label: "AIS gap" },
  { key: "vesselType", label: "Vessel type" },
];

function SuspectsPage() {
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
  const currentIncidentId = selectedSpill?.id ?? selectedIncidentId;
  const hasSuspects = Boolean(investigation?.suspects && investigation.suspects.length > 0);
  const suspects = hasSuspects ? investigation!.suspects! : [];
  const vessels = investigation?.vessels ?? [];
  const [sort, setSort] = useState<SortKey>("suspicion");
  const [openId, setOpenId] = useState<string | null>(null);
  const ordered = [...suspects].sort((a, b) => b[sort] - a[sort]);
  const active = openId ? (suspects.find((s) => s.vesselId === openId) ?? null) : null;
  const activeVessel = openId
    ? (vessels.find((ves) => ves.id === openId) ?? vesselById(openId))
    : null;

  if (isLoading) {
    return (
      <div className="space-y-5">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Suspect ranking</h1>
          <p className="text-sm text-muted-foreground">
            Incident {currentIncidentId} · Loading suspect candidates...
          </p>
        </div>
        <Panel className="flex items-center justify-center p-12 text-center">
          <p className="text-sm text-muted-foreground">Loading suspect ranking data...</p>
        </Panel>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="space-y-5">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Suspect ranking</h1>
          <p className="text-sm text-muted-foreground">
            Incident {currentIncidentId} · Unable to load incident data
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
          <h1 className="text-xl font-semibold tracking-tight">Suspect ranking</h1>
          <p className="text-sm text-muted-foreground">
            Incident {currentIncidentId} · Weighted attribution across proximity, temporal overlap,
            AIS gap and vessel type
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {spills && spills.length > 1 && (
            <div className="flex items-center gap-1" title="Select incident">
              {spills.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => setSelectedIncidentId(s.id)}
                  className={`rounded px-1.5 py-0.5 text-[10px] font-mono transition-colors ${
                    s.id === currentIncidentId
                      ? "border border-[var(--accent-cyan)]/50 bg-[var(--accent-cyan)]/20 text-[var(--accent-cyan)]"
                      : "border border-transparent text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {s.id}
                </button>
              ))}
            </div>
          )}
          <StatusDot label={`${currentIncidentId} attribution`} />
          {hasSuspects && (
            <div className="flex flex-wrap gap-1">
              {SORTS.map((s) => (
                <button
                  key={s.key}
                  type="button"
                  onClick={() => setSort(s.key)}
                  className={`rounded-md border px-2.5 py-1 text-[11px] transition-colors ${
                    sort === s.key
                      ? "border-[var(--accent-cyan)]/60 text-[var(--accent-cyan)]"
                      : "border-border text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {s.label}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {hasSuspects ? (
        <div className="space-y-3">
          {ordered.map((s, i) => {
            const v = vesselById(s.vesselId);
            return (
              <button
                key={s.vesselId}
                type="button"
                onClick={() => setOpenId(s.vesselId)}
                className="block w-full rounded-lg border border-border bg-card/60 px-4 py-3.5 text-left transition-colors hover:border-primary/50 hover:bg-card"
              >
                <div className="grid gap-4 md:grid-cols-[auto_1fr_auto] md:items-center">
                  <div className="flex items-center gap-3">
                    <span className="w-8 text-lg font-semibold tabular-nums text-muted-foreground">
                      {i + 1}
                    </span>
                    <div>
                      <div className="text-[14px] font-medium">{v.name}</div>
                      <div className="text-[11px] text-muted-foreground">
                        {v.type} · MMSI {v.mmsi} · gap {v.aisGapMin} min
                      </div>
                    </div>
                  </div>
                  <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
                    <Meter label="Proximity" value={s.proximity} />
                    <Meter label="Temporal" value={s.temporal} />
                    <Meter label="AIS gap" value={s.aisGap} />
                    <Meter label="Vessel type" value={s.vesselType} />
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-semibold tabular-nums text-[var(--accent-cyan)]">
                      {s.suspicion}
                    </div>
                    <div className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
                      suspicion
                    </div>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      ) : (
        <Panel className="p-12 text-center">
          <div className="text-base font-medium text-foreground">
            Investigation data unavailable
          </div>
          <p className="mt-2 text-sm text-muted-foreground">
            No candidate vessels or suspicion scores have been attributed for incident{" "}
            {currentIncidentId}. Select SP-001 to view demonstration suspect attribution.
          </p>
        </Panel>
      )}

      <Panel title="Scoring method">
        <p className="text-[13px] leading-6 text-muted-foreground">
          Suspicion is a weighted blend of spatial proximity to the backtracked origin cell (35%),
          temporal overlap with the estimated release window (30%), unexplained AIS reporting gaps
          (20%) and discharge capability by vessel type (15%).
        </p>
      </Panel>

      <Modal
        open={Boolean(active)}
        onClose={() => setOpenId(null)}
        title={activeVessel?.name ?? ""}
        subtitle={active ? `Rank #${active.rank} · suspicion ${active.suspicion}` : undefined}
      >
        {active && activeVessel && (
          <>
            <p className="text-muted-foreground">{active.summary}</p>
            <div className="mt-4 space-y-3">
              <Meter label="Proximity" value={active.proximity} />
              <Meter label="Temporal" value={active.temporal} />
              <Meter label="AIS gap" value={active.aisGap} />
              <Meter label="Vessel type" value={active.vesselType} />
            </div>
            <div className="mt-4">
              <KeyVal k="MMSI" v={activeVessel.mmsi} />
              <KeyVal k="Flag" v={activeVessel.flag} />
              <KeyVal k="Speed" v={`${activeVessel.speedKn} kn`} />
              <KeyVal k="Heading" v={`${activeVessel.headingDeg}°`} />
              <KeyVal k="Last AIS report" v={formatUtc(activeVessel.lastSeen)} />
            </div>
          </>
        )}
      </Modal>
    </div>
  );
}

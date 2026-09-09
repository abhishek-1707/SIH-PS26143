import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { KeyVal, Meter, Modal, Panel, StatusDot } from "../components/ui-kit";
import { useIncident } from "../context/IncidentContext";

export const Route = createFileRoute("/suspects")({
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

const utc = (iso: string) => {
  const d = new Date(iso);
  return `${d.toISOString().slice(0, 10)} ${d.toISOString().slice(11, 16)} UTC`;
};

type SortKey = "score" | "closestDistanceKm" | "timeDifferenceHours" | "aisContinuity";

const SORTS: { key: SortKey; label: string }[] = [
  { key: "score", label: "Score" },
  { key: "closestDistanceKm", label: "Proximity" },
  { key: "timeDifferenceHours", label: "Temporal" },
  { key: "aisContinuity", label: "AIS continuity" },
];

function SuspectsPage() {
  const { activeReport } = useIncident();
  const [sort, setSort] = useState<SortKey>("score");
  const [openMmsi, setOpenMmsi] = useState<string | null>(null);

  if (!activeReport) {
    return (
      <div className="space-y-5">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Suspect ranking</h1>
          <p className="text-sm text-muted-foreground">Evidence-weighted vessel attribution</p>
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
  const { candidates, outcome, spill } = report;
  const noSpill = outcome === "NO_SPILL_DETECTED" || outcome === "ANALYSIS_INCONCLUSIVE" || !spill;
  const hasCandidates = candidates.length > 0;

  // Sort candidates. Higher score = more suspicious; lower distance = closer.
  const sorted = [...candidates].sort((a, b) => {
    if (sort === "score") return b.score - a.score;
    if (sort === "closestDistanceKm") return a.closestDistanceKm - b.closestDistanceKm;
    if (sort === "timeDifferenceHours") return a.timeDifferenceHours - b.timeDifferenceHours;
    if (sort === "aisContinuity") return b.aisContinuity - a.aisContinuity;
    return 0;
  });

  const activeCandidate = openMmsi ? (candidates.find((c) => c.mmsi === openMmsi) ?? null) : null;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Suspect ranking</h1>
          <p className="text-sm text-muted-foreground">
            {report.mode} report · Weighted attribution across proximity, temporal overlap, AIS gap
            and vessel type
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <StatusDot label={`${outcome ?? report.status} attribution`} />
          {hasCandidates && (
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

      {noSpill && (
        <div className="rounded border border-amber-400/40 bg-card/70 p-4 text-sm">
          <strong>{outcome ?? report.status}</strong>
          <p className="mt-1">No spill was detected — vessel attribution is not generated.</p>
          {report.outcomeReason && (
            <p className="mt-1 text-xs text-muted-foreground">{report.outcomeReason}</p>
          )}
        </div>
      )}

      {hasCandidates ? (
        <div className="space-y-3">
          {sorted.map((c, i) => {
            // Score as percentage (0–100). closestDistanceKm lower = better, so we invert for meter.
            const proximityScore = Math.max(0, Math.min(100, 100 - c.closestDistanceKm * 5));
            const temporalScore = Math.max(0, Math.min(100, 100 - c.timeDifferenceHours * 10));
            const continuityScore = Math.round(c.aisContinuity * 100);
            const gapScore = Math.max(0, Math.min(100, (1 - c.aisContinuity) * 100));
            // Use features if available for sub-scores; fall back to derived values.
            const features = c.features ?? {};
            const proximityMeter =
              "proximity" in features ? features["proximity"]! * 100 : proximityScore;
            const temporalMeter =
              "temporal" in features ? features["temporal"]! * 100 : temporalScore;
            const aisGapMeter = "ais_gap" in features ? features["ais_gap"]! * 100 : gapScore;
            const vesselTypeMeter = "vessel_type" in features ? features["vessel_type"]! * 100 : 50;

            return (
              <button
                key={c.mmsi}
                type="button"
                onClick={() => setOpenMmsi(c.mmsi)}
                className="block w-full rounded-lg border border-border bg-card/60 px-4 py-3.5 text-left transition-colors hover:border-primary/50 hover:bg-card"
              >
                <div className="grid gap-4 md:grid-cols-[auto_1fr_auto] md:items-center">
                  <div className="flex items-center gap-3">
                    <span className="w-8 text-lg font-semibold tabular-nums text-muted-foreground">
                      {i + 1}
                    </span>
                    <div>
                      <div className="text-[14px] font-medium">{c.name}</div>
                      <div className="text-[11px] text-muted-foreground">
                        {c.type} · MMSI {c.mmsi} · {c.anomalies.length} AIS gap(s)
                      </div>
                    </div>
                  </div>
                  <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
                    <Meter label="Proximity" value={proximityMeter} />
                    <Meter label="Temporal" value={temporalMeter} />
                    <Meter label="AIS gap" value={aisGapMeter} />
                    <Meter label="Vessel type" value={vesselTypeMeter} />
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-semibold tabular-nums text-[var(--accent-cyan)]">
                      {c.score}
                    </div>
                    <div className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
                      / 100
                    </div>
                    <div className="text-[11px] text-muted-foreground">{c.confidence}</div>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      ) : (
        <Panel className="p-12 text-center">
          <div className="text-base font-medium text-foreground">
            {noSpill ? "No attribution generated" : "No candidate vessels identified"}
          </div>
          <p className="mt-2 text-sm text-muted-foreground">
            {noSpill
              ? "No oil spill was detected in this scene — vessel attribution is not performed."
              : report.stageStatus?.["ais"]?.status === "unavailable"
                ? `AIS data unavailable: ${report.stageStatus["ais"].reason}. No attribution generated.`
                : "No AIS-correlated vessels met the spatial and temporal criteria for this incident."}
          </p>
        </Panel>
      )}

      <Panel title="Scoring method">
        <p className="text-[13px] leading-6 text-muted-foreground">{report.scoring.note}</p>
        <p className="mt-2 text-[11px] text-muted-foreground">
          Candidate ranking is evidence-based compatibility, not legal attribution. AIS gaps are
          observational discontinuities, not proof of intentional transponder disabling. Proximity
          and temporal scores are modeled estimates with documented uncertainty.
        </p>
      </Panel>

      <Modal
        open={Boolean(activeCandidate)}
        onClose={() => setOpenMmsi(null)}
        title={activeCandidate?.name ?? ""}
        subtitle={
          activeCandidate
            ? `Rank #${activeCandidate.rank} · ${activeCandidate.score} / 100 · ${activeCandidate.confidence} confidence`
            : undefined
        }
      >
        {activeCandidate && (
          <>
            <p className="text-muted-foreground">{activeCandidate.evidence}</p>
            <div className="mt-4 space-y-3">
              {Object.entries(activeCandidate.features).map(([k, v]) => (
                <Meter key={k} label={k.replaceAll("_", " ")} value={Math.round(v * 100)} />
              ))}
            </div>
            <div className="mt-4">
              <KeyVal k="MMSI" v={activeCandidate.mmsi} />
              <KeyVal k="Type" v={activeCandidate.type} />
              <KeyVal k="Score" v={`${activeCandidate.score} / 100`} />
              <KeyVal k="Confidence" v={activeCandidate.confidence} />
              <KeyVal k="Closest distance" v={`${activeCandidate.closestDistanceKm} km`} />
              <KeyVal k="Time overlap" v={`${activeCandidate.timeDifferenceHours} h`} />
              <KeyVal
                k="AIS continuity"
                v={`${(activeCandidate.aisContinuity * 100).toFixed(0)}%`}
              />
              <KeyVal k="Status" v={activeCandidate.continuityStatus} />
              {activeCandidate.track.length > 0 && (
                <KeyVal
                  k="Last seen"
                  v={utc(activeCandidate.track[activeCandidate.track.length - 1]!.timestamp)}
                />
              )}
            </div>
            {activeCandidate.anomalies.length > 0 && (
              <div className="mt-4">
                <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground mb-2">
                  AIS discontinuities · not proof of disabling
                </p>
                {activeCandidate.anomalies.map((a, i) => (
                  <div key={i} className="border-t border-border/50 py-1.5 text-xs">
                    {a.durationHours} h unobserved · {a.label} · relevance {a.anomalyScore}
                  </div>
                ))}
              </div>
            )}
            <p className="mt-4 text-[11px] text-muted-foreground">
              Compatibility score — not legal attribution or confirmed identity. All outputs are
              analytical, not legal proof.
            </p>
          </>
        )}
      </Modal>
    </div>
  );
}

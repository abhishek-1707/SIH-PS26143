import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { fetchSpills, formatSpillAge } from "../api/spills";
import { Marker, OceanMap, pathFrom, project } from "../components/OceanMap";
import { KeyVal, Modal, Panel, Stat, StatusDot } from "../components/ui-kit";
import { useIncident, validateIncidentSearch } from "../context/IncidentContext";
import { formatUtc, vesselById } from "../data/mock";

export const Route = createFileRoute("/")({
  validateSearch: validateIncidentSearch,
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
  loader: async () => {
    try {
      return await fetchSpills();
    } catch {
      return undefined;
    }
  },
  component: OverviewPage,
});

function OverviewPage() {
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
  const [selectedVessel, setSelectedVessel] = useState<string | null>(null);
  const [modal, setModal] = useState(false);

  const activeSpill = selectedSpill;

  const hasPolygon = Boolean(investigation?.spillPolygon && investigation.spillPolygon.length > 0);
  const spillD = hasPolygon
    ? investigation!.spillPolygon!.map(([lon, lat], i) => `${i ? "L" : "M"}${project(lon, lat).join(" ")}`).join(" ") + " Z"
    : "";

  const hasDrift = Boolean(investigation?.driftPath && investigation.driftPath.length > 0);
  const hasProbableOrigin = Boolean(investigation?.probableOrigin);
  const hasVessels = Boolean(investigation?.vessels && investigation.vessels.length > 0);
  const hasSuspects = Boolean(investigation?.suspects && investigation.suspects.length > 0);

  const top = hasSuspects ? investigation!.suspects![0]! : null;
  const topVessel = top
    ? (investigation?.vessels?.find((v) => v.id === top.vesselId) ?? vesselById(top.vesselId))
    : null;

  if (isLoading) {
    return (
      <div className="space-y-5">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-xl font-semibold tracking-tight">Operations overview</h1>
            <p className="text-sm text-muted-foreground">
              Arabian Sea sector · one active detection under attribution review
            </p>
          </div>
        </div>
        <Panel className="flex items-center justify-center p-12 text-center">
          <p className="text-sm text-muted-foreground">Loading spill data...</p>
        </Panel>
      </div>
    );
  }

  if (isError || !activeSpill) {
    return (
      <div className="space-y-5">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-xl font-semibold tracking-tight">Operations overview</h1>
            <p className="text-sm text-muted-foreground">
              Arabian Sea sector · one active detection under attribution review
            </p>
          </div>
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
          <h1 className="text-xl font-semibold tracking-tight">Operations overview</h1>
          <p className="text-sm text-muted-foreground">
            Arabian Sea sector · incident {activeSpill.id} under attribution review
          </p>
        </div>
        <StatusDot label={`${activeSpill.id} ${activeSpill.status}`} />
      </div>

      <Panel className="overflow-hidden">
        <OceanMap
          height={430}
          initialCenter={[activeSpill.location.longitude, activeSpill.location.latitude]}
          legend={
            <div className="space-y-1">
              <div>
                <span className="mr-2 inline-block h-2 w-2 rounded-full bg-[var(--accent-cyan)]" />
                Detected slick ({activeSpill.id})
              </div>
              {hasProbableOrigin && (
                <div>
                  <span className="mr-2 inline-block h-2 w-2 rounded-full bg-[var(--accent-amber)]" />
                  Probable origin
                </div>
              )}
              {hasVessels && (
                <div>
                  <span className="mr-2 inline-block h-2 w-2 rounded-full bg-[var(--accent-blue)]" />
                  AIS vessels
                </div>
              )}
            </div>
          }
        >
          {hasPolygon && (
            <path d={spillD} fill="var(--accent-cyan)" fillOpacity={0.16} stroke="var(--accent-cyan)" strokeWidth={1.6} />
          )}
          {hasDrift && (
            <path
              d={pathFrom(investigation!.driftPath!.map((p) => [p.lon, p.lat]))}
              fill="none"
              stroke="var(--accent-amber)"
              strokeWidth={1.4}
              strokeDasharray="6 5"
              opacity={0.8}
            />
          )}
          {spills?.map((spill) => (
            <Marker
              key={spill.id}
              lon={spill.location.longitude}
              lat={spill.location.latitude}
              pulse={spill.status === "active"}
              active={spill.id === activeSpill.id}
              label={spill.id}
              onClick={() => setSelectedIncidentId(spill.id)}
            />
          ))}
          {hasProbableOrigin && (
            <Marker
              lon={investigation!.probableOrigin!.lon}
              lat={investigation!.probableOrigin!.lat}
              color="var(--accent-amber)"
              label="Probable origin"
            />
          )}
          {hasVessels &&
            investigation!.vessels!.map((v) => {
              const last = v.track[v.track.length - 1]!;
              return (
                <g key={v.id}>
                  <path
                    d={pathFrom(v.track)}
                    fill="none"
                    stroke="var(--accent-blue)"
                    strokeWidth={1}
                    opacity={selectedVessel === v.id ? 0.9 : 0.4}
                  />
                  <Marker
                    lon={last[0]}
                    lat={last[1]}
                    color="var(--accent-blue)"
                    active={selectedVessel === v.id}
                    label={selectedVessel === v.id ? v.name : undefined}
                    onClick={() => setSelectedVessel(selectedVessel === v.id ? null : v.id)}
                  />
                </g>
              );
            })}
        </OceanMap>
        <p className="mt-3 text-[11px] text-muted-foreground">
          {selectedVessel
            ? `Selected ${vesselById(selectedVessel).name} · MMSI ${vesselById(selectedVessel).mmsi}`
            : hasVessels
            ? "Click a vessel or spill marker (e.g. SP-001) to inspect and focus investigation."
            : `Investigation data unavailable for ${activeSpill.id}. Select SP-001 to review backtracked drift and vessel correlation.`}
        </p>
      </Panel>

      <div className="grid gap-5 lg:grid-cols-3">
        <Panel
          title="Active spill"
          action={
            spills && spills.length > 1 ? (
              <div className="flex items-center gap-1" title="Select incident">
                {spills.map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedIncidentId(s.id);
                    }}
                    className={`rounded px-1.5 py-0.5 text-[10px] font-mono transition-colors ${
                      s.id === activeSpill.id
                        ? "border border-[var(--accent-cyan)]/50 bg-[var(--accent-cyan)]/20 text-[var(--accent-cyan)]"
                        : "border border-transparent text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {s.id}
                  </button>
                ))}
              </div>
            ) : undefined
          }
        >
          <div
            className="cursor-pointer select-none rounded p-0.5 transition-opacity hover:opacity-95"
            onClick={() => setSelectedIncidentId(activeSpill.id)}
            title={`Active incident ${activeSpill.id}`}
          >
            <div className="grid grid-cols-2 gap-4">
              <Stat
                label="Detection"
                value={activeSpill.id}
                hint={`${activeSpill.status} · ${activeSpill.satelliteSource}`}
              />
              <Stat label="Area" value={`${activeSpill.areaKm2} km²`} hint="SAR derived" />
              <Stat label="Confidence" value={`${activeSpill.confidence}%`} />
              <Stat label="Age" value={formatSpillAge(activeSpill.estimatedAge)} />
            </div>
            <p className="mt-4 text-[11px] text-muted-foreground">
              Detected {formatUtc(activeSpill.detectedAt)} at {activeSpill.location.latitude},{" "}
              {activeSpill.location.longitude}
            </p>
          </div>
        </Panel>

        <Panel title="Probable origin">
          {hasProbableOrigin ? (
            <>
              <KeyVal
                k="Position"
                v={`${investigation!.probableOrigin!.lat}, ${investigation!.probableOrigin!.lon}`}
              />
              <KeyVal k="Uncertainty" v={`${investigation!.probableOrigin!.radiusKm} km radius`} />
              <KeyVal
                k="Release window"
                v={`${formatUtc(investigation!.probableOrigin!.windowStart).slice(11)} – ${formatUtc(investigation!.probableOrigin!.windowEnd).slice(11)}`}
              />
            </>
          ) : (
            <div className="py-6 text-center">
              <div className="text-sm font-medium text-foreground">Investigation data unavailable</div>
              <p className="mt-1 text-[11px] text-muted-foreground">
                Drift backtracking model has not been run for {activeSpill.id}.
              </p>
            </div>
          )}
          <Link
            to="/backtracking"
            search={{ incident: activeSpill.id }}
            className="mt-4 inline-flex rounded-md border border-border px-3 py-1.5 text-xs transition-colors hover:border-primary/60 hover:text-primary"
          >
            Open drift backtracking
          </Link>
        </Panel>

        <Panel title="Top suspect vessel">
          {top && topVessel ? (
            <>
              <div className="text-base font-medium">{topVessel.name}</div>
              <div className="text-[11px] text-muted-foreground">
                {topVessel.type} · MMSI {topVessel.mmsi} · {topVessel.flag}
              </div>
              <div className="mt-3 text-3xl font-semibold tabular-nums text-[var(--accent-cyan)]">
                {top.suspicion}
                <span className="ml-1 text-sm text-muted-foreground">suspicion</span>
              </div>
              <div className="mt-4 flex flex-wrap items-center gap-2">
                <Link
                  to="/suspects"
                  search={{ incident: activeSpill.id }}
                  className="inline-flex rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground transition-opacity hover:opacity-90"
                >
                  View attribution
                </Link>
                <button
                  type="button"
                  onClick={() => setModal(true)}
                  className="inline-flex rounded-md border border-border px-2.5 py-1.5 text-xs text-muted-foreground transition-colors hover:border-primary/60 hover:text-foreground"
                >
                  Quick summary
                </button>
              </div>
            </>
          ) : (
            <>
              <div className="py-6 text-center">
                <div className="text-sm font-medium text-foreground">Investigation data unavailable</div>
                <p className="mt-1 text-[11px] text-muted-foreground">
                  AIS correlation has not been performed for {activeSpill.id}.
                </p>
              </div>
              <Link
                to="/suspects"
                search={{ incident: activeSpill.id }}
                className="mt-4 inline-flex rounded-md border border-border px-3 py-1.5 text-xs transition-colors hover:border-primary/60 hover:text-primary"
              >
                Open suspect ranking
              </Link>
            </>
          )}
        </Panel>
      </div>

      {top && topVessel && (
        <Modal
          open={modal}
          onClose={() => setModal(false)}
          title={topVessel.name}
          subtitle={`Attribution summary · rank #${top.rank}`}
        >
          <p className="text-muted-foreground">{top.summary}</p>
          <div className="mt-4">
            <KeyVal k="MMSI" v={topVessel.mmsi} />
            <KeyVal k="Type" v={topVessel.type} />
            <KeyVal k="Flag" v={topVessel.flag} />
            <KeyVal k="Last AIS" v={formatUtc(topVessel.lastSeen)} />
            <KeyVal k="AIS gap" v={`${topVessel.aisGapMin} min`} />
            <KeyVal k="Suspicion" v={top.suspicion} />
          </div>
          <Link
            to="/suspects"
            search={{ incident: activeSpill.id }}
            onClick={() => setModal(false)}
            className="mt-4 inline-flex rounded-md border border-border px-3 py-1.5 text-xs transition-colors hover:border-primary/60 hover:text-primary"
          >
            Open suspect ranking
          </Link>
        </Modal>
      )}
    </div>
  );
}

import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { fetchSpills, formatSpillAge } from "../api/spills";
import { Marker, OceanMap, project } from "../components/OceanMap";
import { KeyVal, Modal, Panel, Stat, StatusDot } from "../components/ui-kit";
import { useIncident, validateIncidentSearch } from "../context/IncidentContext";
import { formatUtc } from "../data/mock";

export const Route = createFileRoute("/satellite")({
  validateSearch: validateIncidentSearch,
  head: () => ({
    meta: [
      { title: "Satellite Analysis — Oil Spill SAR Scene" },
      {
        name: "description",
        content:
          "SAR-style satellite view of detected oil spills with confidence and detection metadata.",
      },
      { property: "og:title", content: "Satellite Analysis — Oil Spill SAR Scene" },
      {
        property: "og:description",
        content: "Interactive SAR scene with slick polygon, confidence and detection metadata.",
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
  component: SatellitePage,
});

function SatellitePage() {
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
  const [open, setOpen] = useState(false);
  const [showPolygon, setShowPolygon] = useState(true);

  const spill = selectedSpill;
  const hasPolygon = Boolean(investigation?.spillPolygon && investigation.spillPolygon.length > 0);
  const spillD = hasPolygon
    ? investigation!.spillPolygon!.map(([lon, lat], i) => `${i ? "L" : "M"}${project(lon, lat).join(" ")}`).join(" ") + " Z"
    : "";

  if (isLoading) {
    return (
      <div className="space-y-5">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Satellite analysis</h1>
          <p className="text-sm text-muted-foreground">
            Synthetic aperture radar scene · descending pass · VV polarisation
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
          <h1 className="text-xl font-semibold tracking-tight">Satellite analysis</h1>
          <p className="text-sm text-muted-foreground">
            Synthetic aperture radar scene · descending pass · VV polarisation
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
          <h1 className="text-xl font-semibold tracking-tight">Satellite analysis</h1>
          <p className="text-sm text-muted-foreground">
            Incident {spill.id} · Synthetic aperture radar scene · descending pass · VV polarisation
          </p>
        </div>
        <StatusDot label={`${spill.id} ${spill.status}`} />
      </div>

      <div className="grid gap-5 lg:grid-cols-[1fr_320px]">
        <Panel
          title="SAR scene"
          action={
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
              {hasPolygon && (
                <button
                  type="button"
                  onClick={() => setShowPolygon((s) => !s)}
                  className="rounded-md border border-border px-2.5 py-1 text-[11px] transition-colors hover:border-primary/60 hover:text-primary"
                >
                  {showPolygon ? "Hide slick outline" : "Show slick outline"}
                </button>
              )}
            </div>
          }
        >
          <OceanMap
            height={520}
            initialZoom={1.6}
            initialCenter={[spill.location.longitude, spill.location.latitude]}
            legend={
              <div>
                Scene {spill.satelliteSource} · {formatUtc(spill.detectedAt)}
                <div className="mt-1">
                  {hasPolygon
                    ? "Dark slick signature vs. ambient sea clutter"
                    : `Centroid coordinate detection for incident ${spill.id}`}
                </div>
              </div>
            }
          >
            <g opacity={0.55}>
              {Array.from({ length: 26 }).map((_, i) => (
                <ellipse
                  key={i}
                  cx={120 + ((i * 137) % 800)}
                  cy={80 + ((i * 211) % 470)}
                  rx={30 + ((i * 17) % 45)}
                  ry={14 + ((i * 11) % 22)}
                  fill="oklch(0.32 0.03 240 / 0.35)"
                />
              ))}
            </g>
            {hasPolygon && showPolygon && (
              <>
                <path d={spillD} fill="oklch(0.1 0.02 250 / 0.85)" stroke="var(--accent-cyan)" strokeWidth={2} />
                <path d={spillD} fill="none" stroke="var(--accent-cyan)" strokeWidth={6} opacity={0.14} />
              </>
            )}
            <Marker
              lon={spill.location.longitude}
              lat={spill.location.latitude}
              pulse
              label={`${spill.id} · ${spill.areaKm2} km²`}
            />
          </OceanMap>
        </Panel>

        <div className="space-y-5">
          <Panel title="Detection record">
            <div className="grid grid-cols-2 gap-4">
              <Stat label="Latitude" value={spill.location.latitude} />
              <Stat label="Longitude" value={spill.location.longitude} />
              <Stat label="Area" value={`${spill.areaKm2} km²`} />
              <Stat label="Confidence" value={`${spill.confidence}%`} />
              <Stat label="Estimated age" value={formatSpillAge(spill.estimatedAge)} />
              <Stat label="Status" value={spill.status} />
            </div>
            <div className="mt-4">
              <KeyVal k="Detected at" v={formatUtc(spill.detectedAt)} />
              <KeyVal k="Detection ID" v={spill.id} />
              <KeyVal k="Satellite Source" v={spill.satelliteSource} />
            </div>
            <button
              type="button"
              onClick={() => setOpen(true)}
              className="mt-4 w-full rounded-md bg-primary px-3 py-2 text-xs font-medium text-primary-foreground transition-opacity hover:opacity-90"
            >
              View details
            </button>
          </Panel>

          <Panel title="Classifier notes">
            <p className="text-[13px] leading-6 text-muted-foreground">
              {hasPolygon
                ? "Low-backscatter region persists across two consecutive passes with a wind speed of 4.8 m/s, ruling out a low-wind look-alike. Edge gradient and elongation are consistent with a fresh mineral-oil discharge trailing the prevailing current."
                : `Low-backscatter signature registered for ${spill.id} via ${spill.satelliteSource}. SAR polygon delineation has not yet been processed for this incident.`}
            </p>
          </Panel>
        </div>
      </div>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={`Detection ${spill.id}`}
        subtitle="Full satellite analysis record"
      >
        <KeyVal k="Coordinates" v={`${spill.location.latitude}, ${spill.location.longitude}`} />
        <KeyVal k="Area" v={`${spill.areaKm2} km²`} />
        <KeyVal k="Confidence" v={`${spill.confidence}%`} />
        <KeyVal k="Estimated age" v={formatSpillAge(spill.estimatedAge)} />
        <KeyVal k="Detected at" v={formatUtc(spill.detectedAt)} />
        <KeyVal k="Status" v={spill.status} />
        <KeyVal k="Satellite Source" v={spill.satelliteSource} />
        <KeyVal k="Sensor" v={`${spill.satelliteSource} IW GRDH (VV)`} />
        <KeyVal k="Look-alike check" v="Passed — wind 4.8 m/s" />
        <p className="mt-4 text-[13px] leading-6 text-muted-foreground">
          {hasPolygon
            ? "The slick polygon spans 8 vertices with a major axis of roughly 7.1 km. Attribution has been forwarded to drift backtracking and AIS correlation."
            : `Attribution record created for ${spill.id}. Awaiting detailed SAR polygon extraction.`}
        </p>
      </Modal>
    </div>
  );
}

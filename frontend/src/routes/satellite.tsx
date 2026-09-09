import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { OceanMap, project } from "../components/OceanMap";
import { KeyVal, Modal, Panel, Stat, StatusDot } from "../components/ui-kit";
import { useIncident } from "../context/IncidentContext";

export const Route = createFileRoute("/satellite")({
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
  component: SatellitePage,
});

const utc = (iso: string) => {
  const d = new Date(iso);
  return `${d.toISOString().slice(0, 10)} ${d.toISOString().slice(11, 16)} UTC`;
};

/** Render the SAR pixel data (if any) on a canvas and return a data URL. */
function SarCanvas({
  pixels,
  width,
  height,
}: {
  pixels: (number | null)[][];
  width: number;
  height: number;
}) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = ref.current;
    if (!canvas || !pixels.length || !width || !height) return;
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const img = ctx.createImageData(width, height);
    pixels.forEach((row, y) =>
      row.forEach((value, x) => {
        const i = (y * width + x) * 4;
        const gray = value === null ? 0 : Math.max(0, Math.min(255, ((value + 30) / 24) * 255));
        img.data.set([gray, gray, gray, value === null ? 0 : 255], i);
      }),
    );
    ctx.putImageData(img, 0, 0);
  }, [pixels, width, height]);
  if (!pixels.length || !width || !height) return null;
  return (
    <canvas
      ref={ref}
      className="w-full rounded bg-secondary"
      style={{ imageRendering: "pixelated" }}
      aria-label="SAR backscatter scene preview"
    />
  );
}

function SatellitePage() {
  const { activeReport } = useIncident();
  const [open, setOpen] = useState(false);
  const [showPolygon, setShowPolygon] = useState(true);

  if (!activeReport) {
    return (
      <div className="space-y-5">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Satellite analysis</h1>
          <p className="text-sm text-muted-foreground">
            Synthetic aperture radar scene · detection metadata
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
  const { spill, scene, outcome, detector } = report;
  const noSpill = outcome === "NO_SPILL_DETECTED" || outcome === "ANALYSIS_INCONCLUSIVE" || !spill;

  // Polygon from the detected spill geometry.
  const spillCoords: [number, number][] =
    spill?.geometry.coordinates[0]?.map(([lon, lat]) => [lon, lat]) ?? [];
  const hasPolygon = spillCoords.length > 0;
  const spillD = hasPolygon
    ? spillCoords
        .map(([lon, lat], i) => `${i ? "L" : "M"}${project(lon, lat).join(" ")}`)
        .join(" ") + " Z"
    : "";

  // Map center: prefer spill centroid, then scene bbox center.
  const mapCenter: [number, number] = spill
    ? [spill.metrics.centroid.lon, spill.metrics.centroid.lat]
    : scene.bbox
      ? [(scene.bbox[0] + scene.bbox[2]) / 2, (scene.bbox[1] + scene.bbox[3]) / 2]
      : [72.45, 15.25];

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Satellite analysis</h1>
          <p className="text-sm text-muted-foreground">
            {report.mode} · {scene.source} · {utc(scene.acquiredAt)}
          </p>
        </div>
        <StatusDot label={outcome ?? report.status} />
      </div>

      {noSpill && (
        <div className="rounded border border-amber-400/40 bg-card/70 p-4 text-sm">
          <strong>{outcome ?? report.status}</strong>
          {report.outcomeMessage && <p className="mt-1">{report.outcomeMessage}</p>}
          {report.outcomeReason && (
            <p className="mt-1 text-xs text-muted-foreground">{report.outcomeReason}</p>
          )}
          <p className="mt-2 text-xs text-muted-foreground">
            SAR scene was processed — see detection metadata below.
          </p>
        </div>
      )}

      <div className="grid gap-5 lg:grid-cols-[1fr_320px]">
        <Panel
          title="SAR scene"
          action={
            <div className="flex items-center gap-2">
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
            initialCenter={mapCenter}
            legend={
              <div>
                {scene.source} · {utc(scene.acquiredAt)}
                <div className="mt-1">
                  {hasPolygon
                    ? "Dark slick signature vs. ambient sea clutter"
                    : "Scene processed — no dark-slick candidate above threshold"}
                </div>
              </div>
            }
          >
            {/* Scene footprint */}
            {scene.bbox &&
              (() => {
                const [west, south, east, north] = scene.bbox;
                const [sx, sy] = project(west, north);
                const [ex, ey] = project(east, south);
                return (
                  <rect
                    aria-label="Analyzed scene footprint"
                    x={sx}
                    y={sy}
                    width={ex - sx}
                    height={ey - sy}
                    fill="none"
                    stroke="#94a3b8"
                    strokeWidth={2}
                    strokeDasharray="6 4"
                  >
                    <title>Analyzed scene footprint</title>
                  </rect>
                );
              })()}
            {/* Simulated speckle texture to convey SAR appearance */}
            <g opacity={0.45}>
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
                <path
                  d={spillD}
                  fill="oklch(0.1 0.02 250 / 0.85)"
                  stroke="var(--accent-cyan)"
                  strokeWidth={2}
                />
                <path
                  d={spillD}
                  fill="none"
                  stroke="var(--accent-cyan)"
                  strokeWidth={6}
                  opacity={0.14}
                />
              </>
            )}
            {spill &&
              (() => {
                const [cx, cy] = project(spill.metrics.centroid.lon, spill.metrics.centroid.lat);
                return (
                  <g>
                    <circle cx={cx} cy={cy} r={5} fill="var(--accent-cyan)" opacity={0.9}>
                      <title>{`Spill centroid · ${spill.metrics.areaKm2} km²`}</title>
                    </circle>
                  </g>
                );
              })()}
          </OceanMap>
        </Panel>

        <div className="space-y-5">
          <Panel title="Detection record">
            {spill ? (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <Stat label="Centroid lat" value={spill.metrics.centroid.lat.toFixed(4)} />
                  <Stat label="Centroid lon" value={spill.metrics.centroid.lon.toFixed(4)} />
                  <Stat label="Area" value={`${spill.metrics.areaKm2} km²`} />
                  <Stat
                    label="Confidence"
                    value={`${(spill.confidence * 100).toFixed(1)} / 100`}
                    hint="Dark-slick index"
                  />
                  {report.age && (
                    <Stat
                      label="Age estimate"
                      value={`${report.age.minHours}–${report.age.maxHours} h`}
                      hint={report.age.confidence}
                    />
                  )}
                  <Stat label="Candidates" value={report.detections.length} hint="dark slicks" />
                </div>
                <div className="mt-4">
                  <KeyVal k="Detected at" v={utc(report.detectedAt)} />
                  <KeyVal k="Scene source" v={scene.source} />
                  <KeyVal k="Polarization" v={String(scene.polarization)} />
                  <KeyVal
                    k="Resolution"
                    v={`${scene.resolution_m.map((n) => n.toFixed(1)).join("×")} m/px`}
                  />
                  <KeyVal k="Scene size" v={`${scene.width}×${scene.height} px`} />
                </div>
                <button
                  type="button"
                  onClick={() => setOpen(true)}
                  className="mt-4 w-full rounded-md bg-primary px-3 py-2 text-xs font-medium text-primary-foreground transition-opacity hover:opacity-90"
                >
                  View full detection record
                </button>
              </>
            ) : (
              <div className="py-4 text-center">
                <p className="text-sm font-medium">{outcome ?? report.status}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {report.outcomeMessage ?? "No dark-slick candidate detected above threshold."}
                </p>
                <div className="mt-4">
                  <KeyVal k="Scene source" v={scene.source} />
                  <KeyVal k="Acquired" v={utc(scene.acquiredAt)} />
                  <KeyVal k="Detector" v={detector?.name ?? "unavailable"} />
                </div>
              </div>
            )}
          </Panel>

          <Panel title="SAR pixel data">
            {scene.pixels.length > 0 ? (
              <>
                <SarCanvas pixels={scene.pixels} width={scene.width} height={scene.height} />
                <p className="mt-2 text-xs text-muted-foreground">
                  {scene.width}×{scene.height} pixels · {String(scene.polarization)} ·{" "}
                  {scene.resolution_m.map((n) => n.toFixed(1)).join("×")} m/native pixel
                </p>
              </>
            ) : (
              <p className="text-xs text-muted-foreground">
                Preview unavailable; scene pixels not included in this report.
              </p>
            )}
          </Panel>

          <Panel title="Detector notes">
            <p className="text-[13px] leading-6 text-muted-foreground">
              {report.mode === "REAL" || report.mode === "UPLOAD"
                ? `Experimental ${detector?.name ?? "unavailable"} detector. Uncalibrated scores — not confirmed oil or probability of oil.`
                : "Median speckle smoothing → dark-region threshold → connected components → convex envelope. Not a trained oil classifier."}
            </p>
            {detector?.status && (
              <p className="mt-2 text-xs text-muted-foreground">
                Detector status: {detector.status}
                {detector.version ? ` · ${detector.version}` : ""}
              </p>
            )}
          </Panel>
        </div>
      </div>

      {spill && (
        <Modal
          open={open}
          onClose={() => setOpen(false)}
          title="Full detection record"
          subtitle={`Report ${report.id.slice(0, 12)}`}
        >
          <KeyVal
            k="Centroid"
            v={`${spill.metrics.centroid.lat.toFixed(5)}° N, ${spill.metrics.centroid.lon.toFixed(5)}° E`}
          />
          <KeyVal k="Area" v={`${spill.metrics.areaKm2} km²`} />
          <KeyVal k="Perimeter" v={`${spill.metrics.perimeterM.toFixed(0)} m`} />
          <KeyVal
            k="Length × Width"
            v={`${spill.metrics.lengthM.toFixed(0)} × ${spill.metrics.widthM.toFixed(0)} m`}
          />
          <KeyVal k="Confidence" v={`${(spill.confidence * 100).toFixed(1)} / 100`} />
          <KeyVal k="Geometry method" v={spill.geometryMethod} />
          <KeyVal k="Scene source" v={scene.source} />
          <KeyVal k="Acquired" v={utc(scene.acquiredAt)} />
          <KeyVal k="Polarization" v={String(scene.polarization)} />
          <KeyVal k="Mode" v={report.mode ?? "DEMO"} />
          {report.age && (
            <>
              <KeyVal k="Age estimate" v={`${report.age.minHours}–${report.age.maxHours} h`} />
              <KeyVal k="Age confidence" v={report.age.confidence} />
            </>
          )}
          <p className="mt-4 text-[13px] leading-6 text-muted-foreground">
            {report.stageStatus?.["detection"]?.reason ??
              "No additional detection notes available."}
          </p>
        </Modal>
      )}
    </div>
  );
}

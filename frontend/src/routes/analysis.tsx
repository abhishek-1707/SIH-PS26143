import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { OceanMap, pathFrom, project } from "../components/OceanMap";
import { SARUpload } from "../components/SARUpload";
import { useIncident } from "../context/IncidentContext";
import {
  analyzeIncident,
  getIncident,
  listIncidentScenes,
  type IncidentReport,
  type Position,
} from "../api/incidents";

export const Route = createFileRoute("/analysis")({ component: AnalysisPage });
const colors = ["#22d3ee", "#a78bfa", "#fbbf24"];
const layers = ["SAR", "Spills", "Origin", "Hindcast", "Forecast", "Vessels", "AIS gaps"] as const;
type Layer = (typeof layers)[number];
const button =
  "rounded border border-border px-3 py-2 text-sm hover:border-primary disabled:opacity-40";
const panel = "rounded-lg border border-border bg-card/70 p-4";
const pointsPath = (points: Position[]) => pathFrom(points.map((p) => [p.lon, p.lat]));
const utc = (time: string) => time.replace("T", " ").replace("Z", " UTC");

function Raster({ report, onImage }: { report: IncidentReport; onImage: (url: string) => void }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const { width, height, pixels } = report.scene;
    if (!width || !height || !pixels.length) return;
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const image = ctx.createImageData(width, height);
    pixels.forEach((row, y) =>
      row.forEach((value, x) => {
        const i = (y * width + x) * 4;
        const gray = value === null ? 0 : Math.max(0, Math.min(255, ((value + 30) / 24) * 255));
        image.data.set([gray, gray, gray, value === null ? 0 : 255], i);
      }),
    );
    ctx.putImageData(image, 0, 0);
    onImage(canvas.toDataURL());
  }, [report, onImage]);
  return (
    <canvas
      ref={ref}
      className="w-full rounded bg-secondary"
      style={{ imageRendering: "pixelated" }}
      aria-label={`${report.mode === "UPLOAD" ? "User-provided" : report.mode === "REAL" ? "Archived real" : "Synthetic"} SAR backscatter preview`}
    />
  );
}

export function ReportView({ report }: { report: IncidentReport }) {
  const [enabled, setEnabled] = useState<Layer[]>([...layers]);
  const [image, setImage] = useState("");
  const [selected, setSelected] = useState(report.leadingCandidate);
  const has = (layer: Layer) => enabled.includes(layer);
  const { spill, origin, age } = report;
  const candidate = report.candidates.find((c) => c.mmsi === selected);
  const [west, south, east, north] = report.scene.bbox ?? [72.3, 15.1, 72.6, 15.4];
  const [sx, sy] = project(west, north);
  const [ex, ey] = project(east, south);
  const [ox, oy] = origin ? project(origin.lon, origin.lat) : [0, 0];
  const [cx, cy] = spill ? project(spill.metrics.centroid.lon, spill.metrics.centroid.lat) : [0, 0];
  const exportReport = () => {
    const url = URL.createObjectURL(
      new Blob([JSON.stringify(report, null, 2)], { type: "application/json" }),
    );
    const link = document.createElement("a");
    link.href = url;
    link.download = `osis-${report.id}.json`;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">
            {report.mode ?? "DEMO"} · {report.status} incident report
          </h2>
          <p className="text-xs text-muted-foreground break-all">
            {report.id} · image {utc(report.scene.acquiredAt)}
          </p>
        </div>
        <button className={button} onClick={exportReport}>
          Download report JSON
        </button>
      </div>
      <p className="rounded border border-amber-400/40 p-3 text-sm text-amber-200">
        {report.disclaimer}
      </p>
      <section className={panel} role="status" aria-label="Analysis outcome">
        <h3 className="font-semibold">
          {report.outcome ?? (spill ? "SPILL_DETECTED" : "ANALYSIS_INCONCLUSIVE")}
        </h3>
        <p>{report.outcomeMessage}</p>
        <p>{report.outcomeReason}</p>
        {report.availability === "REAL_DATA_UNAVAILABLE" && (
          <p>
            REAL_DATA_UNAVAILABLE · Use DEMO, upload compatible SAR, or configure the required
            real-data access.
          </p>
        )}
        <p className="text-xs">
          Processing timestamp: {utc(report.processedAt ?? report.detectedAt)} · Source:{" "}
          {report.scene.source}
        </p>
        <p className="text-xs">
          {report.scene.bbox
            ? `Analyzed bounds: ${report.scene.bbox.join(", ")}`
            : "Scene location unavailable. Map is contextual only; no analyzed footprint claimed."}
        </p>
        <p className="text-xs">
          Detector: {report.detector?.name ?? "unavailable"} ·{" "}
          {report.detector?.version ?? "version unavailable"} · {report.detector?.status}
        </p>
        {report.detector?.quality && (
          <pre className="overflow-auto text-xs">
            {JSON.stringify(report.detector.quality, null, 2)}
          </pre>
        )}
      </section>
      {report.stageStatus && (
        <section className={panel} aria-label="Evidence availability">
          <h3 className="mb-2 font-medium">Evidence availability · no synthetic substitution</h3>
          {Object.entries(report.stageStatus).map(([name, stage]) => (
            <p key={name} className="mb-2 text-xs">
              <strong>
                {name}: {stage.status} · {stage.kind}
              </strong>{" "}
              — {stage.reason}
            </p>
          ))}
          <p className="text-sm">
            {report.mode === "DEMO"
              ? "Synthetic exercise; no real observations claimed."
              : `Hindcast scenario: ${report.hindcastHours}h before image time; AIS search ±1h. Not measured spill age.`}
          </p>
        </section>
      )}
      <div className="grid gap-3 sm:grid-cols-4">
        <div className={panel}>
          <p className="text-xs text-muted-foreground">Detected envelope</p>
          <strong>{spill ? `${spill.metrics.areaKm2} km²` : "Unavailable"}</strong>
          <p className="text-xs">{report.detections.length} dark slick candidates</p>
        </div>
        <div className={panel}>
          <p className="text-xs text-muted-foreground">Estimated age</p>
          <strong>{age ? `${age.minHours}–${age.maxHours} hours` : "Unavailable"}</strong>
          <p className="text-xs">
            {age ? `${age.confidence} confidence` : "Single image cannot date release"}
          </p>
        </div>
        <div className={panel}>
          <p className="text-xs text-muted-foreground">Dark-slick index (not oil probability)</p>
          <strong>{spill ? `${(spill.confidence * 100).toFixed(1)} / 100` : "Unavailable"}</strong>
        </div>
        <div className={panel}>
          <p className="text-xs text-muted-foreground">Leading candidate</p>
          <strong>{report.candidates[0]?.name ?? "None"}</strong>
          <p className="text-xs">Compatibility, not legal responsibility</p>
        </div>
      </div>
      <section className={panel}>
        <h3 className="mb-3 font-medium">Incident map · drag to pan, scroll or buttons to zoom</h3>
        <div className="mb-3 flex flex-wrap gap-4">
          {layers.map((layer) => (
            <label className="text-xs" key={layer}>
              <input
                type="checkbox"
                checked={has(layer)}
                onChange={() =>
                  setEnabled((current) =>
                    current.includes(layer)
                      ? current.filter((l) => l !== layer)
                      : [...current, layer],
                  )
                }
              />{" "}
              {layer}
            </label>
          ))}
        </div>
        <OceanMap
          key={report.id}
          height={510}
          initialZoom={1.4}
          initialCenter={
            report.mode !== "DEMO" ? [(west + east) / 2, (south + north) / 2] : undefined
          }
          legend={
            <span>
              Orange: hindcast · cyan: forecast · pink: detection · dashed red: unobserved AIS gap
            </span>
          }
        >
          <defs>
            <marker
              id="forecast-arrow"
              markerWidth="6"
              markerHeight="6"
              refX="5"
              refY="3"
              orient="auto"
            >
              <path d="M0,0 L6,3 L0,6" fill="#22d3ee" />
            </marker>
          </defs>
          {report.scene.bbox && (
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
          )}
          {has("SAR") && image && (
            <image href={image} x={sx} y={sy} width={ex - sx} height={ey - sy} opacity={0.8} />
          )}
          {has("Spills") &&
            report.detections.map((d, i) => (
              <path
                key={i}
                d={`${pathFrom(d.geometry.coordinates[0] ?? [])} Z`}
                fill="#fb718566"
                stroke="#fb7185"
                strokeWidth={2}
              >
                <title>{`Candidate ${i + 1}: ${d.metrics.areaKm2} km²`}</title>
              </path>
            ))}
          {has("Origin") && origin && (
            <g>
              <ellipse
                cx={ox}
                cy={oy}
                rx={(origin.uncertaintyKm / 111.32 / Math.cos((origin.lat * Math.PI) / 180)) * 1500}
                ry={(origin.uncertaintyKm / 111.32) * 1500}
                fill="#fbbf2420"
                stroke="#fbbf24"
                strokeDasharray="5 4"
              />
              <circle cx={ox} cy={oy} r={5} fill="#fbbf24" />
              <text x={ox + 9} y={oy - 10} fontSize={11} fill="#fbbf24">
                Modeled origin
              </text>
            </g>
          )}
          {has("Hindcast") && (
            <path
              d={pointsPath(report.backward)}
              fill="none"
              stroke="#fb923c"
              strokeWidth={3}
              strokeDasharray="7 3"
            />
          )}
          {has("Forecast") && (
            <path
              d={pointsPath(report.forward)}
              fill="none"
              stroke="#22d3ee"
              strokeWidth={2}
              markerEnd="url(#forecast-arrow)"
            />
          )}
          {[
            ...(has("Hindcast") ? report.backward : []),
            ...(has("Forecast") ? report.forward.filter((_, i) => i % 6 === 0) : []),
          ].map((p, i) => {
            const [x, y] = project(p.lon, p.lat);
            return (
              <circle key={i} cx={x} cy={y} r={3} fill={p.hours < 0 ? "#fb923c" : "#22d3ee"}>
                <title>
                  {`${utc(p.timestamp)} · ${p.hours}h · sensitivity ±${p.uncertaintyKm}km`}
                </title>
              </circle>
            );
          })}
          {has("Vessels") &&
            report.candidates.map((c, i) => (
              <g key={c.mmsi} onClick={() => setSelected(c.mmsi)} style={{ cursor: "pointer" }}>
                {c.trackSegments.map((segment, j) => (
                  <path
                    key={j}
                    d={pathFrom(segment.map((p) => [p.longitude, p.latitude]))}
                    fill="none"
                    stroke={colors[i % colors.length]}
                    strokeWidth={selected === c.mmsi ? 4 : 2}
                    opacity={0.8}
                  />
                ))}
                {c.track.map((p, j) => {
                  const [x, y] = project(p.longitude, p.latitude);
                  return (
                    <circle key={j} cx={x} cy={y} r={3} fill={colors[i % colors.length]}>
                      <title>{`${c.name} · ${utc(p.timestamp)} · ${p.speed.toFixed(1)} kn`}</title>
                    </circle>
                  );
                })}
              </g>
            ))}
          {has("AIS gaps") &&
            report.anomalies.map((a, i) => (
              <path
                key={i}
                d={pathFrom([
                  [a.start.longitude, a.start.latitude],
                  [a.end.longitude, a.end.latitude],
                ])}
                stroke="#f87171"
                strokeWidth={3}
                strokeDasharray="3 5"
                fill="none"
              >
                <title>{`${a.durationHours} h unobserved corridor · ${a.label}`}</title>
              </path>
            ))}
          {spill && (
            <g>
              <circle cx={cx} cy={cy} r={4} fill="#fff" />
              <text x={cx + 8} y={cy + 14} fill="#fff" fontSize={11}>
                Image-time candidate
              </text>
            </g>
          )}
        </OceanMap>
        <p className="mt-2 text-xs text-muted-foreground">
          Regional schematic coordinate map, not navigational cartography. Modeled trajectories
          start at image time, not wall-clock time. Gap corridors are hypotheses, never observed
          tracks.
        </p>
      </section>
      <div className="grid gap-4 md:grid-cols-3">
        <section className={panel}>
          <h3 className="mb-2 font-medium">
            SAR input ·{" "}
            {report.mode === "UPLOAD"
              ? "user-provided"
              : report.mode === "REAL"
                ? "real archived / on demand"
                : "synthetic"}
          </h3>
          {report.scene.pixels.length ? (
            <Raster report={report} onImage={setImage} />
          ) : (
            <p>Preview unavailable; see detection stage.</p>
          )}
          <p className="mt-2 text-xs">
            {report.scene.width}×{report.scene.height} pixels · {String(report.scene.polarization)}{" "}
            · {report.scene.resolution_m.map((n) => n.toFixed(1)).join("×")} m/native pixel
            {report.scene.nativeWidth &&
              ` · native ${report.scene.nativeWidth}×${report.scene.nativeHeight}; display subsampled 4×`}
          </p>
          <p className="mt-2 text-xs text-muted-foreground">
            {report.mode === "REAL" || report.mode === "UPLOAD"
              ? `Experimental ${report.detector?.name ?? "unavailable"} detector. Uncalibrated scores, not confirmed oil or probability of oil.`
              : "Median speckle smoothing → dark-region threshold → connected components → convex envelope. Not a trained oil classifier."}
          </p>
        </section>
        <section className={panel}>
          <h3 className="mb-2 font-medium">Characterization &amp; age</h3>
          {spill && (
            <p className="text-sm">
              Perimeter: {spill.metrics.perimeterM.toFixed(0)} m<br />
              Length × width: {spill.metrics.lengthM.toFixed(0)} × {spill.metrics.widthM.toFixed(0)}{" "}
              m
            </p>
          )}
          <p className="mt-2 text-xs">{spill?.geometryMethod ?? "Characterization unavailable"}</p>
          <p className="mt-2 text-xs">
            {age?.method.replaceAll("_", " ") ?? "Spill age unavailable"}
          </p>
          <p className="mt-2 text-xs text-muted-foreground">
            {age?.caveat ??
              "Hindcast duration is an analyst-selected scenario, not an age estimate."}
          </p>
        </section>
        <section className={panel}>
          <h3 className="mb-2 font-medium">Origin &amp; environment</h3>
          {origin ? (
            <>
              <p className="text-sm">
                {origin.lat.toFixed(5)}° N, {origin.lon.toFixed(5)}° E
              </p>
              <p className="text-xs">
                {utc(origin.releaseWindow.start)} → {utc(origin.releaseWindow.end)}
              </p>
              <p className="my-2 text-xs">
                Origin sensitivity radius: {origin.uncertaintyKm} km · forecast{" "}
                {report.forecastHours}h
              </p>
            </>
          ) : (
            <p className="text-sm">Modeled origin unavailable. No release location inferred.</p>
          )}
          {Object.entries(report.environment).map(([k, v]) => (
            <p className="text-xs break-words" key={k}>
              {k}: {String(v)}
            </p>
          ))}
        </section>
      </div>
      <section className={panel}>
        <h3 className="mb-3 font-medium">Vessel compatibility ranking</h3>
        <p className="mb-3 text-xs text-muted-foreground">{report.scoring.note}</p>
        {report.candidates.length === 0 ? (
          <p>
            {report.stageStatus?.["ais"]?.status === "unavailable"
              ? `AIS unavailable: ${report.stageStatus["ais"].reason}. No attribution generated.`
              : "No observed vessel fixes met spatial/temporal criteria."}
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr>
                  <th>Candidate</th>
                  <th>Score / 100</th>
                  <th>Origin km</th>
                  <th>Time Δ h</th>
                  <th>Confidence</th>
                  <th>AIS gaps</th>
                </tr>
              </thead>
              <tbody>
                {report.candidates.map((c) => (
                  <tr key={c.mmsi} className="border-t border-border">
                    <td className="py-3">
                      <button
                        className="text-primary text-left"
                        onClick={() => setSelected(c.mmsi)}
                      >
                        #{c.rank} {c.name}
                        <span className="block text-xs">
                          {c.mmsi} · {c.type}
                        </span>
                      </button>
                    </td>
                    <td>{c.score}</td>
                    <td>{c.closestDistanceKm}</td>
                    <td>{c.timeDifferenceHours}</td>
                    <td>{c.confidence}</td>
                    <td>{c.anomalies.length}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {candidate && (
          <div className="mt-3 rounded border border-primary/40 p-3">
            <h4>{candidate.name} · evidence</h4>
            <p className="my-2 text-sm">{candidate.evidence}</p>
            <p className="text-xs">
              AIS continuity: {(candidate.aisContinuity * 100).toFixed(0)}% ·{" "}
              {candidate.continuityStatus}
            </p>
            {Object.entries(candidate.features).map(([k, v]) => (
              <div key={k} className="mt-2 text-xs">
                {k.replaceAll("_", " ")}: {(v * 100).toFixed(1)} / 100 · weight{" "}
                {((report.scoring.weights[k] ?? 0) * 100).toFixed(1)}%
                <progress className="block w-full" value={v} max={1} />
              </div>
            ))}
          </div>
        )}
      </section>
      <section className={panel}>
        <h3 className="mb-2 font-medium">AIS discontinuities · not proof of disabling</h3>
        {report.anomalies.length ? (
          report.anomalies.map((a, i) => (
            <div className="border-t border-border py-2 text-sm" key={i}>
              <strong>
                {a.mmsi}: {a.durationHours} hours
              </strong>
              <p>
                {utc(a.start.timestamp)} → {utc(a.end.timestamp)}
              </p>
              <p className="text-xs">
                {a.label} · relevance index {a.anomalyScore}
              </p>
            </div>
          ))
        ) : (
          <p className="text-sm">
            {report.stageStatus?.["ais"]?.status === "unavailable"
              ? "AIS discontinuities not evaluated: compatible tracks unavailable."
              : "No qualifying discontinuities in available candidate tracks."}
          </p>
        )}
      </section>
      {report.evidenceProvenance && (
        <section className={panel} aria-label="Result provenance">
          <h3 className="font-medium">Evidence provenance</h3>
          {Object.entries(report.evidenceProvenance).map(([name, evidence]) => (
            <p key={name} className="text-xs">
              <strong>
                {name}: {evidence.kind}
              </strong>{" "}
              — {evidence.reason}
            </p>
          ))}
        </section>
      )}
      <details className={panel}>
        <summary className="cursor-pointer">
          Pipeline audit trail, provenance &amp; limitations
        </summary>
        <ol className="my-3 flex flex-wrap gap-2">
          {report.stages.map((s, i) => (
            <li className="rounded bg-secondary px-2 py-1 text-xs" key={s}>
              {i + 1}. {s.replaceAll("_", " ")} ✓
            </li>
          ))}
        </ol>
        {Object.entries(report.provenance).map(([k, v]) => (
          <p className="text-xs" key={k}>
            {k}: {v}
          </p>
        ))}
        {report.mode !== "DEMO" && (
          <pre className="mt-3 overflow-auto whitespace-pre-wrap break-all text-xs">
            {JSON.stringify(
              {
                assets: report.scene.assetSha256,
                jointValidFraction: report.scene.jointValidFraction,
                detector: report.detector,
                environment: report.environment,
              },
              null,
              2,
            )}
          </pre>
        )}
        <p className="my-2 text-xs">
          Storage: {report.persistence.local} · database: {report.persistence.database}
        </p>
        <ul className="list-disc pl-5 text-sm">
          {report.uncertainty.map((text) => (
            <li key={text}>{text}</li>
          ))}
        </ul>
      </details>
    </div>
  );
}

function AnalysisPage() {
  const client = useQueryClient();
  const {
    setActiveReport,
    clearActiveReport,
    activeReport,
    activeReportId,
    history,
    historyLoading,
  } = useIncident();
  const [horizon, setHorizon] = useState(24);
  const [sceneId, setSceneId] = useState("demo-arabian-sea");
  const [onDemand, setOnDemand] = useState(false);
  const [hindcastHours, setHindcastHours] = useState(6);
  const [detector, setDetector] = useState<"hybrid" | "classical">("hybrid");
  const scenes = useQuery({
    queryKey: ["incident-scenes"],
    queryFn: listIncidentScenes,
    retry: false,
  });
  const mode =
    sceneId === "upload" ? "UPLOAD" : (scenes.data?.find((s) => s.id === sceneId)?.mode ?? "DEMO");
  const [seconds, setSeconds] = useState(0);

  // Track a pending saved-report fetch (for when we select from dropdown by id).
  const [pendingSavedId, setPendingSavedId] = useState("");
  const savedFetch = useQuery({
    queryKey: ["incident", pendingSavedId],
    queryFn: () => getIncident(pendingSavedId),
    enabled: !!pendingSavedId,
    retry: false,
  });

  // When a saved report arrives from the fetch, store it as the active report.
  useEffect(() => {
    if (savedFetch.data && savedFetch.data.id === pendingSavedId) {
      setActiveReport(savedFetch.data);
      setPendingSavedId(""); // clear after promotion
    }
  }, [savedFetch.data, pendingSavedId, setActiveReport]);

  // The saved-reports select value is the activeReportId (or "" if none).
  // We track a local "selectedSavedValue" to mirror the dropdown accurately.
  const [savedDropdownValue, setSavedDropdownValue] = useState("");
  // Sync dropdown when active report changes externally (e.g. after analyze).
  useEffect(() => {
    setSavedDropdownValue(activeReportId);
  }, [activeReportId]);

  const analysis = useMutation({
    mutationFn: analyzeIncident,
    onSuccess: (r) => {
      client.setQueryData(["incident", r.id], r);
      setActiveReport(r);
      void client.invalidateQueries({ queryKey: ["incidents"] });
    },
  });

  useEffect(() => {
    if (!analysis.isPending) return;
    const timer = setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => clearInterval(timer);
  }, [analysis.isPending]);

  // Separate errors: mutation/fetch errors are shown distinctly from scene/history load errors.
  const analysisError = analysis.error;
  const savedFetchError = savedFetch.isError && pendingSavedId ? savedFetch.error : null;
  const scenesError = scenes.isError ? scenes.error : null;

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-semibold">O.S.I.S. · Source attribution</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Scene → detection → age → origin hindcast → forecast → historical AIS → evidence-ranked
          candidates
        </p>
      </div>
      <section className={`${panel} flex flex-wrap items-end gap-4`}>
        {/* INPUT SCENE — choosing this does NOT load or change the current report */}
        <label className="text-xs">
          Input scene
          <p className="text-[10px] text-muted-foreground mb-1">
            Choose the SAR / demo scene to analyze
          </p>
          <select
            value={sceneId}
            onChange={(e) => setSceneId(e.target.value)}
            className="mt-1 block rounded bg-secondary p-2 text-sm"
            aria-label="Scene"
          >
            <option value="demo-arabian-sea">DEMO · Arabian Sea synthetic exercise</option>
            <option value="demo-no-spill">DEMO · No spill exercise</option>
            <option value="demo-inconclusive">DEMO · Inconclusive exercise</option>
            {scenes.data
              ?.filter((s) => s.mode === "REAL")
              .map((s) => (
                <option key={s.id} value={s.id}>
                  REAL · {s.name}
                </option>
              ))}
            <option value="upload">UPLOAD · calibrated SAR subset (512×512 GeoTIFF)</option>
          </select>
        </label>
        {mode !== "DEMO" && (
          <>
            {mode === "REAL" && (
              <>
                <label className="text-xs">
                  <input
                    type="checkbox"
                    checked={onDemand}
                    onChange={(e) => setOnDemand(e.target.checked)}
                  />{" "}
                  Fetch CDSE subset on demand (otherwise use archived local SAR)
                </label>
                <label className="text-xs">
                  Experimental detector
                  <select
                    value={detector}
                    onChange={(e) => setDetector(e.target.value as "hybrid" | "classical")}
                    className="mt-1 block rounded bg-secondary p-2 text-sm"
                  >
                    <option value="hybrid">Hybrid (checkpoint required)</option>
                    <option value="classical">Classical</option>
                  </select>
                </label>
              </>
            )}
            <label className="text-xs">
              Hindcast scenario hours (NOT age)
              <input
                type="number"
                min={1}
                max={48}
                step={1}
                value={hindcastHours}
                onChange={(e) => setHindcastHours(Number(e.target.value))}
                className="mt-1 block w-28 rounded bg-secondary p-2 text-sm"
              />
            </label>
          </>
        )}
        <label className="text-xs">
          Forecast horizon
          <select
            value={horizon}
            onChange={(e) => setHorizon(Number(e.target.value))}
            className="mt-1 block rounded bg-secondary p-2 text-sm"
          >
            {[24, 48, 72].map((h) => (
              <option key={h} value={h}>
                {h} hours
              </option>
            ))}
          </select>
        </label>
        {sceneId !== "upload" && (
          <button
            className={`${button} bg-primary text-primary-foreground`}
            disabled={analysis.isPending}
            onClick={() => {
              setSeconds(0);
              analysis.mutate(
                mode === "REAL"
                  ? { mode, sceneId, forecastHours: horizon, hindcastHours, detector, onDemand }
                  : { mode: "DEMO", sceneId, forecastHours: horizon },
              );
            }}
          >
            {" "}
            {analysis.isPending ? "Analyzing…" : `Analyze ${mode} pipeline`}{" "}
          </button>
        )}

        {/* OUTPUT REPORT — selecting this loads a previously generated report */}
        <label className="text-xs">
          Saved reports
          <p className="text-[10px] text-muted-foreground mb-1">
            Open a previously generated incident report
          </p>
          <select
            disabled={analysis.isPending}
            className="mt-1 block max-w-xs rounded bg-secondary p-2 text-sm"
            value={savedDropdownValue}
            onChange={(e) => {
              analysis.reset();
              const newId = e.target.value;
              setSavedDropdownValue(newId);
              if (!newId) {
                clearActiveReport();
                setPendingSavedId("");
              } else {
                // Check React Query cache first, else trigger fetch.
                const cached = client.getQueryData<typeof activeReport>(["incident", newId]);
                if (cached) {
                  setActiveReport(cached);
                } else {
                  setPendingSavedId(newId);
                }
              }
            }}
          >
            <option value="">Select report</option>
            {history.map((r) => (
              <option value={r.id} key={r.id}>
                {r.mode ?? "DEMO"} · {r.status} · {r.detectedAt.slice(0, 19)} · {r.id.slice(0, 8)}
              </option>
            ))}
          </select>
        </label>
      </section>
      <p className="text-sm font-medium">
        Next analysis mode: {mode}. Saved reports retain their original mode and evidence.
      </p>
      {analysis.isPending && (
        <div role="status" className={panel}>
          Computing scientific pipeline on backend · {seconds}s elapsed. Stages will be confirmed
          after completion; no simulated progress percentages.
        </div>
      )}
      {(analysisError || savedFetchError) && (
        <div role="alert" className="rounded border border-red-400 p-3 text-sm">
          {(analysisError || savedFetchError)?.message}
          <p>
            Ensure the backend is running on the configured VITE_API_URL. No mock result has been
            substituted.
          </p>
          <button
            className={button}
            onClick={() => {
              analysis.reset();
              setPendingSavedId("");
              clearActiveReport();
            }}
          >
            Retry loading data
          </button>
        </div>
      )}
      {scenesError && (
        <div className="rounded border border-yellow-600/40 p-2 text-xs text-yellow-300">
          Scene list unavailable — backend may be offline. DEMO options remain available above.
        </div>
      )}
      {(savedFetch.isFetching || historyLoading) && !analysis.isPending && (
        <p role="status">Loading saved incident…</p>
      )}
      {sceneId === "upload" && (
        <SARUpload
          disabled={analysis.isPending}
          forecastHours={horizon}
          hindcastHours={hindcastHours}
          onSuccess={(r) => {
            client.setQueryData(["incident", r.id], r);
            setActiveReport(r);
            void client.invalidateQueries({ queryKey: ["incidents"] });
          }}
        />
      )}
      {!activeReport && !analysis.isPending && sceneId !== "upload" && (
        <p className="py-10 text-center text-muted-foreground">
          DEMO is deterministic and uses fictional vessels. REAL uses trusted archived SAR and
          reports partial evidence when matching environmental fields or historical AIS are
          unavailable.
          <br />
          Select a scene above and click Analyze, or choose a saved report to view it here and on
          all tabs.
        </p>
      )}
      {activeReport && <ReportView key={activeReport.id} report={activeReport} />}
    </div>
  );
}

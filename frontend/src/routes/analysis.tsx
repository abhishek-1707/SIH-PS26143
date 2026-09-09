import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { OceanMap, pathFrom, project } from "../components/OceanMap";
import {
  analyzeIncident,
  getIncident,
  listIncidents,
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
      aria-label="Synthetic SAR backscatter raster"
    />
  );
}

function ReportView({ report }: { report: IncidentReport }) {
  const [enabled, setEnabled] = useState<Layer[]>([...layers]);
  const [image, setImage] = useState("");
  const [selected, setSelected] = useState(report.leadingCandidate);
  const has = (layer: Layer) => enabled.includes(layer);
  if (!report.spill || !report.origin || !report.age) {
    return <div className={panel}>No slick candidates detected. No attribution was generated.</div>;
  }
  const { spill, origin, age } = report;
  const candidate = report.candidates.find((c) => c.mmsi === selected);
  const [west, south, east, north] = report.scene.bbox;
  const [sx, sy] = project(west, north);
  const [ex, ey] = project(east, south);
  const [ox, oy] = project(origin.lon, origin.lat);
  const [cx, cy] = project(spill.metrics.centroid.lon, spill.metrics.centroid.lat);
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
          <h2 className="text-lg font-semibold">Computed incident report</h2>
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
      <div className="grid gap-3 sm:grid-cols-4">
        <div className={panel}>
          <p className="text-xs text-muted-foreground">Detected envelope</p>
          <strong>{spill.metrics.areaKm2} km²</strong>
          <p className="text-xs">{report.detections.length} dark slick candidates</p>
        </div>
        <div className={panel}>
          <p className="text-xs text-muted-foreground">Estimated age</p>
          <strong>
            {age.minHours}–{age.maxHours} hours
          </strong>
          <p className="text-xs">{age.confidence} confidence</p>
        </div>
        <div className={panel}>
          <p className="text-xs text-muted-foreground">Dark-slick index (not oil probability)</p>
          <strong>{(spill.confidence * 100).toFixed(1)} / 100</strong>
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
                <title>
                  Candidate {i + 1}: {d.metrics.areaKm2} km²
                </title>
              </path>
            ))}
          {has("Origin") && (
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
                  {utc(p.timestamp)} · {p.hours}h · sensitivity ±{p.uncertaintyKm}km
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
                      <title>
                        {c.name} · {utc(p.timestamp)} · {p.speed.toFixed(1)} kn
                      </title>
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
                <title>
                  {a.durationHours} h unobserved corridor · {a.label}
                </title>
              </path>
            ))}
          <circle cx={cx} cy={cy} r={4} fill="#fff" />
          <text x={cx + 8} y={cy + 14} fill="#fff" fontSize={11}>
            Image-time detection
          </text>
        </OceanMap>
        <p className="mt-2 text-xs text-muted-foreground">
          Regional schematic coordinate map, not navigational cartography. Modeled trajectories
          start at image time, not wall-clock time. Gap corridors are hypotheses, never observed
          tracks.
        </p>
      </section>
      <div className="grid gap-4 md:grid-cols-3">
        <section className={panel}>
          <h3 className="mb-2 font-medium">SAR input · synthetic</h3>
          <Raster report={report} onImage={setImage} />
          <p className="mt-2 text-xs">
            {report.scene.width}×{report.scene.height} pixels · {String(report.scene.polarization)}{" "}
            · {report.scene.resolution_m.map((n) => n.toFixed(0)).join("×")} m/pixel
          </p>
          <p className="mt-2 text-xs text-muted-foreground">
            Median speckle smoothing → dark-region threshold → connected components → convex
            envelope. Not a trained oil classifier.
          </p>
        </section>
        <section className={panel}>
          <h3 className="mb-2 font-medium">Characterization & age</h3>
          <p className="text-sm">
            Perimeter: {spill.metrics.perimeterM.toFixed(0)} m<br />
            Length × width: {spill.metrics.lengthM.toFixed(0)} × {spill.metrics.widthM.toFixed(0)} m
          </p>
          <p className="mt-2 text-xs">{spill.geometryMethod}</p>
          <p className="mt-2 text-xs">{age.method.replaceAll("_", " ")}</p>
          <p className="mt-2 text-xs text-muted-foreground">{age.caveat}</p>
        </section>
        <section className={panel}>
          <h3 className="mb-2 font-medium">Origin & environment</h3>
          <p className="text-sm">
            {origin.lat.toFixed(5)}° N, {origin.lon.toFixed(5)}° E
          </p>
          <p className="text-xs">
            {utc(origin.releaseWindow.start)} → {utc(origin.releaseWindow.end)}
          </p>
          <p className="my-2 text-xs">
            Origin sensitivity radius: {origin.uncertaintyKm} km · forecast {report.forecastHours}h
          </p>
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
          <p>No observed vessel fixes met spatial/temporal criteria.</p>
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
          <p className="text-sm">No qualifying discontinuities in available candidate tracks.</p>
        )}
      </section>
      <details className={panel}>
        <summary className="cursor-pointer">Pipeline audit trail, provenance & limitations</summary>
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
  const [horizon, setHorizon] = useState(24);
  const [id, setId] = useState("");
  const [seconds, setSeconds] = useState(0);
  const history = useQuery({ queryKey: ["incidents"], queryFn: listIncidents, retry: false });
  const saved = useQuery({
    queryKey: ["incident", id],
    queryFn: () => getIncident(id),
    enabled: !!id,
    retry: false,
  });
  const analysis = useMutation({
    mutationFn: analyzeIncident,
    onSuccess: (r) => {
      client.setQueryData(["incident", r.id], r);
      setId(r.id);
      void client.invalidateQueries({ queryKey: ["incidents"] });
    },
  });
  useEffect(() => {
    if (!analysis.isPending) return;
    const timer = setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => clearInterval(timer);
  }, [analysis.isPending]);
  const error = analysis.error || saved.error || history.error;
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
        <label className="text-xs">
          Available scene
          <select className="mt-1 block rounded bg-secondary p-2 text-sm" aria-label="Scene">
            <option>Arabian Sea · synthetic SAR exercise</option>
          </select>
        </label>
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
        <button
          className={`${button} bg-primary text-primary-foreground`}
          disabled={analysis.isPending}
          onClick={() => {
            setSeconds(0);
            analysis.mutate(horizon);
          }}
        >
          {" "}
          {analysis.isPending ? "Analyzing…" : "Analyze complete pipeline"}{" "}
        </button>
        <label className="text-xs">
          Saved reports
          <select
            disabled={analysis.isPending}
            className="mt-1 block max-w-xs rounded bg-secondary p-2 text-sm"
            value={id}
            onChange={(e) => {
              analysis.reset();
              setId(e.target.value);
            }}
          >
            <option value="">Select report</option>
            {history.data?.map((r) => (
              <option value={r.id} key={r.id}>
                {r.detectedAt.slice(0, 19)} · {r.forecastHours}h · {r.id.slice(0, 8)}
              </option>
            ))}
          </select>
        </label>
      </section>
      {analysis.isPending && (
        <div role="status" className={panel}>
          Computing scientific pipeline on backend · {seconds}s elapsed. Stages will be confirmed
          after completion; no simulated progress percentages.
        </div>
      )}
      {error && (
        <div role="alert" className="rounded border border-red-400 p-3 text-sm">
          {error.message}
          <p>
            Ensure the backend is running on the configured VITE_API_URL. No mock result has been
            substituted.
          </p>
        </div>
      )}
      {saved.isFetching && <p role="status">Loading saved incident…</p>}
      {!id && !analysis.isPending && (
        <p className="py-10 text-center text-muted-foreground">
          Select the synthetic scene and analyze. No credentials or database are required. All
          vessel identities are fictional.
        </p>
      )}
      {saved.data && <ReportView key={saved.data.id} report={saved.data} />}
    </div>
  );
}

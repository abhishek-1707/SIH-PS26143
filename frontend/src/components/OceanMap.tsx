import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";

export const VIEW_W = 1000;
export const VIEW_H = 620;

const LON0 = 72.45;
const LAT0 = 15.25;
const SCALE = 1500;

export function project(lon: number, lat: number): [number, number] {
  return [VIEW_W / 2 + (lon - LON0) * SCALE, VIEW_H / 2 - (lat - LAT0) * SCALE];
}

export function pathFrom(points: [number, number][]) {
  return points
    .map(([lon, lat], i) => {
      const [x, y] = project(lon, lat);
      return `${i === 0 ? "M" : "L"}${x.toFixed(1)} ${y.toFixed(1)}`;
    })
    .join(" ");
}

const MIN_Z = 0.6;
const MAX_Z = 6;
const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));

type Props = {
  children: ReactNode;
  height?: number | undefined;
  initialZoom?: number | undefined;
  initialCenter?: [number, number] | undefined;
  legend?: ReactNode | undefined;
};

export function OceanMap({
  children,
  height = 460,
  initialZoom = 1,
  initialCenter,
  legend,
}: Props) {
  const [zoom, setZoom] = useState(initialZoom);
  const initialOffset = (() => {
    if (!initialCenter) return { x: 0, y: 0 };
    const [cx, cy] = project(initialCenter[0], initialCenter[1]);
    return {
      x: VIEW_W / 2 - cx * initialZoom,
      y: VIEW_H / 2 - cy * initialZoom,
    };
  })();
  const [offset, setOffset] = useState(initialOffset);
  const [dragging, setDragging] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{ x: number; y: number; ox: number; oy: number } | null>(null);
  const stateRef = useRef({ zoom, offset });
  stateRef.current = { zoom, offset };

  const zoomAt = useCallback((next: number, px: number, py: number) => {
    const { zoom: z, offset: o } = stateRef.current;
    const nz = clamp(next, MIN_Z, MAX_Z);
    const k = nz / z;
    setZoom(nz);
    setOffset({ x: px - (px - o.x) * k, y: py - (py - o.y) * k });
  }, []);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const rect = el.getBoundingClientRect();
      const sx = VIEW_W / rect.width;
      const sy = VIEW_H / rect.height;
      const dy = e.deltaY * (e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? 100 : 1);
      zoomAt(
        stateRef.current.zoom * Math.exp(-dy * 0.0018),
        (e.clientX - rect.left) * sx,
        (e.clientY - rect.top) * sy,
      );
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, [zoomAt]);

  const onPointerDown = (e: React.PointerEvent) => {
    if (e.button !== 0) return;
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    dragRef.current = { x: e.clientX, y: e.clientY, ox: offset.x, oy: offset.y };
    setDragging(true);
  };
  const onPointerMove = (e: React.PointerEvent) => {
    const d = dragRef.current;
    const el = containerRef.current;
    if (!d || !el) return;
    const rect = el.getBoundingClientRect();
    setOffset({
      x: d.ox + (e.clientX - d.x) * (VIEW_W / rect.width),
      y: d.oy + (e.clientY - d.y) * (VIEW_H / rect.height),
    });
  };
  const endDrag = () => {
    dragRef.current = null;
    setDragging(false);
  };

  const btn =
    "h-7 w-7 rounded border border-border bg-card text-foreground font-mono text-xs transition-colors hover:bg-secondary flex items-center justify-center shadow-xs";

  // Coordinates for graticule labels around LON0/LAT0
  const lons = [72.1, 72.2, 72.3, 72.4, 72.5, 72.6, 72.7, 72.8];
  const lats = [14.9, 15.0, 15.1, 15.2, 15.3, 15.4, 15.5, 15.6];

  return (
    <div className="relative overflow-hidden rounded border border-border bg-[var(--map-bg)]">
      {/* Top and side tactical coordinate indicators */}
      <div
        ref={containerRef}
        style={{ height }}
        className={dragging ? "cursor-grabbing touch-none" : "cursor-grab touch-none"}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
      >
        <svg
          viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
          preserveAspectRatio="xMidYMid slice"
          className="h-full w-full select-none"
        >
          <defs>
            <pattern id="om-grid" width="50" height="50" patternUnits="userSpaceOnUse">
              <path d="M50 0H0V50" fill="none" stroke="var(--map-grid)" strokeWidth="0.75" />
            </pattern>
            <radialGradient id="om-glow" cx="50%" cy="45%" r="60%">
              <stop offset="0%" stopColor="var(--map-glow)" stopOpacity="0.45" />
              <stop offset="100%" stopColor="var(--map-glow)" stopOpacity="0" />
            </radialGradient>
          </defs>
          <rect width={VIEW_W} height={VIEW_H} fill="var(--map-bg)" />
          <rect width={VIEW_W} height={VIEW_H} fill="url(#om-glow)" />

          <g transform={`translate(${offset.x} ${offset.y}) scale(${zoom})`}>
            <rect
              x={-2500}
              y={-2500}
              width={6000}
              height={6000}
              fill="url(#om-grid)"
              opacity={0.6}
            />

            {/* Hydrodynamic swell lines */}
            <g className="om-swell">
              {Array.from({ length: 16 }).map((_, i) => (
                <path
                  key={i}
                  d={`M-1000 ${-300 + i * 85} Q -500 ${-330 + i * 85} 0 ${-300 + i * 85} T 700 ${-300 + i * 85} T 1600 ${-300 + i * 85}`}
                  fill="none"
                  stroke="var(--map-swell)"
                  strokeWidth={0.8 / zoom}
                />
              ))}
            </g>

            {/* Geographical coordinate graticule reference ticks */}
            <g opacity={0.35}>
              {lons.map((lon) => {
                const [x] = project(lon, LAT0);
                return (
                  <g key={`lon-${lon}`}>
                    <line
                      x1={x}
                      y1={-2000}
                      x2={x}
                      y2={2000}
                      stroke="var(--map-label)"
                      strokeWidth={0.5 / zoom}
                      strokeDasharray="3 6"
                    />
                    <text
                      x={x + 3}
                      y={VIEW_H - 12}
                      fontSize={9 / zoom}
                      fill="var(--map-label)"
                      fontFamily="monospace"
                    >
                      {lon.toFixed(1)}°E
                    </text>
                  </g>
                );
              })}
              {lats.map((lat) => {
                const [, y] = project(LON0, lat);
                return (
                  <g key={`lat-${lat}`}>
                    <line
                      x1={-2000}
                      y1={y}
                      x2={3000}
                      y2={y}
                      stroke="var(--map-label)"
                      strokeWidth={0.5 / zoom}
                      strokeDasharray="3 6"
                    />
                    <text
                      x={12}
                      y={y - 3}
                      fontSize={9 / zoom}
                      fill="var(--map-label)"
                      fontFamily="monospace"
                    >
                      {lat.toFixed(1)}°N
                    </text>
                  </g>
                );
              })}
            </g>

            {/* Actual dynamic children: spill polygons, tracks, markers */}
            {children}
          </g>
        </svg>
      </div>

      {/* UI Overlays: Controls, Legend, Status */}
      <div className="pointer-events-none absolute inset-0 flex flex-col justify-between p-3">
        <div className="flex items-start justify-between gap-3">
          {legend ? (
            <div className="pointer-events-auto rounded border border-border bg-card px-3 py-2 text-[11px] leading-relaxed text-muted-foreground shadow-xs font-mono">
              {legend}
            </div>
          ) : (
            <span />
          )}

          {/* Navigation and Zoom buttons */}
          <div className="pointer-events-auto flex flex-col gap-1.5">
            <button
              type="button"
              aria-label="Zoom in"
              className={btn}
              onClick={() => zoomAt(stateRef.current.zoom * 1.35, VIEW_W / 2, VIEW_H / 2)}
              title="Zoom In"
            >
              +
            </button>
            <button
              type="button"
              aria-label="Zoom out"
              className={btn}
              onClick={() => zoomAt(stateRef.current.zoom / 1.35, VIEW_W / 2, VIEW_H / 2)}
              title="Zoom Out"
            >
              −
            </button>
            <button
              type="button"
              aria-label="Reset view"
              className={btn}
              onClick={() => {
                setZoom(initialZoom);
                setOffset(initialOffset);
              }}
              title="Reset View"
            >
              ⤾
            </button>
          </div>
        </div>

        <div className="flex items-end justify-between text-[11px] text-muted-foreground font-mono">
          <span className="rounded bg-card/95 px-2 py-0.5 border border-border">
            Arabian Sea Sector &middot; Drag to pan &middot; Scroll to zoom
          </span>
          <span className="rounded bg-card/95 px-2 py-0.5 tabular-nums border border-border text-[var(--accent-blue)]">
            MAG {zoom.toFixed(2)}&times;
          </span>
        </div>
      </div>
    </div>
  );
}

export function Marker({
  lon,
  lat,
  color = "var(--accent-blue)",
  label,
  active,
  onClick,
  pulse,
}: {
  lon: number;
  lat: number;
  color?: string | undefined;
  label?: string | undefined;
  active?: boolean | undefined;
  onClick?: (() => void) | undefined;
  pulse?: boolean | undefined;
}) {
  const [x, y] = project(lon, lat);
  return (
    <g
      transform={`translate(${x} ${y})`}
      onPointerDown={(e) => e.stopPropagation()}
      onClick={onClick}
      style={{ cursor: onClick ? "pointer" : "default" }}
    >
      {pulse && <circle r={16} fill={color} opacity={0.16} className="om-pulse" />}
      <circle r={active ? 8 : 5} fill={color} opacity={active ? 1 : 0.9} />
      <circle
        r={active ? 14 : 9}
        fill="none"
        stroke={color}
        strokeWidth={active ? 1.8 : 1}
        opacity={0.8}
      />
      {label && (
        <text
          x={14}
          y={4}
          fontSize={11}
          fill="var(--map-label)"
          className="pointer-events-none select-none font-mono font-medium"
        >
          {label}
        </text>
      )}
    </g>
  );
}

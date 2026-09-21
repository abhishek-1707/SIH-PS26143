import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, Radar, Navigation, Ship, Target } from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      {
        title: "O.S.I.S. — Oil Spill Identification & Source Attribution System",
      },
      {
        name: "description",
        content:
          "Satellite SAR oil spill detection with hydrodynamic Lagrangian drift backtracking and AIS vessel attribution for maritime intelligence.",
      },
    ],
  }),
  component: LandingPage,
});

/* ── Pipeline steps for the four-step section ── */
const PIPELINE = [
  {
    num: "01",
    title: "DETECTION",
    desc: "Sentinel-1 SAR identifies anomalous surface signatures consistent with hydrocarbon slicks through deep-learning segmentation.",
    accent: "var(--accent-blue)",
    icon: Radar,
  },
  {
    num: "02",
    title: "DRIFT BACKTRACKING",
    desc: "Ocean-current and wind modelling via Lagrangian advection estimates where the spill originated hours before detection.",
    accent: "var(--accent-amber)",
    icon: Navigation,
  },
  {
    num: "03",
    title: "AIS CORRELATION",
    desc: "Vessel tracks are evaluated against the computed release corridor to identify ships present during the estimated discharge window.",
    accent: "var(--accent-emerald)",
    icon: Ship,
  },
  {
    num: "04",
    title: "SOURCE ATTRIBUTION",
    desc: "Evidence is combined into an explainable investigation dossier ranking candidate vessels by multi-factor proximity scoring.",
    accent: "var(--accent-rose)",
    icon: Target,
  },
] as const;

function LandingPage() {
  return (
    <div
      style={{
        /* full-bleed — override the root layout padding */
        margin: "0 -20px",
        width: "calc(100% + 40px)",
      }}
    >
      {/* ════════════════════════════════════════════════════════════
          OCEAN CURRENT BACKGROUND OVERLAY
         ════════════════════════════════════════════════════════════ */}
      <div
        aria-hidden="true"
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: -1,
          pointerEvents: 'none',
          overflow: 'hidden',
        }}
      >
        {/* Depth layering gradients */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background: 'radial-gradient(ellipse 100% 50% at 60% 30%, rgba(5,32,52,0.4) 0%, transparent 70%)',
          }}
        />
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background: 'radial-gradient(ellipse 80% 40% at 30% 75%, rgba(3,20,35,0.5) 0%, transparent 65%)',
          }}
        />

        {/* Flowing current lines */}
        <svg
          className="landing-currents-svg"
          viewBox="0 0 2800 1000"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          preserveAspectRatio="none"
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '200%',
            height: '100%',
          }}
        >
          {/* Layer 1: Deep background currents — very faint */}
          <path d="M0,82 C200,62 400,102 620,78 C840,54 1060,105 1280,82 C1500,59 1720,105 1940,80 C2160,55 2380,102 2600,78 C2800,60 2800,82 2800,82" stroke="rgba(29,42,54,0.4)" strokeWidth="0.7" />
          <path d="M0,188 C260,158 480,222 740,185 C1000,148 1220,225 1480,188 C1740,151 1960,222 2220,185 C2480,148 2700,218 2800,188" stroke="rgba(29,42,54,0.3)" strokeWidth="1" />
          <path d="M0,285 C320,268 640,305 960,282 C1280,259 1600,308 1920,285 C2240,262 2560,305 2800,285" stroke="rgba(29,42,54,0.2)" strokeWidth="0.6" />

          {/* Layer 2: Mid-depth currents — slightly visible */}
          <path d="M0,375 C180,342 420,412 660,370 C900,328 1140,418 1380,378 C1620,338 1860,415 2100,372 C2340,329 2580,410 2800,375" stroke="rgba(29,42,54,0.45)" strokeWidth="1.1" />
          <path d="M0,462 C280,432 540,498 800,458 C1060,418 1320,502 1580,462 C1840,422 2100,500 2360,460 C2620,420 2800,490 2800,462" stroke="rgba(29,42,54,0.35)" strokeWidth="0.8" />

          {/* Layer 3: Surface currents — with subtle cyan */}
          <path d="M0,555 C220,515 460,598 700,548 C940,498 1180,600 1420,552 C1660,504 1900,598 2140,548 C2380,498 2620,592 2800,555" stroke="rgba(25,181,230,0.055)" strokeWidth="1.3" />
          <path d="M0,648 C340,625 680,678 1020,645 C1360,612 1700,682 2040,648 C2380,614 2720,675 2800,648" stroke="rgba(29,42,54,0.3)" strokeWidth="0.7" />

          {/* Layer 4: Deep undertow — faint cyan accent */}
          <path d="M0,738 C240,710 480,770 720,735 C960,700 1200,775 1440,738 C1680,701 1920,775 2160,738 C2400,701 2640,770 2800,738" stroke="rgba(25,181,230,0.04)" strokeWidth="0.9" />
          <path d="M0,828 C300,812 600,848 900,825 C1200,802 1500,850 1800,828 C2100,806 2400,848 2800,828" stroke="rgba(29,42,54,0.22)" strokeWidth="0.6" />
          <path d="M0,920 C260,905 520,938 780,918 C1040,898 1300,942 1560,920 C1820,898 2080,940 2340,918 C2600,896 2800,935 2800,920" stroke="rgba(29,42,54,0.15)" strokeWidth="0.5" />
        </svg>
      </div>

      {/* ════════════════════════════════════════════════════════════
          HERO SECTION
         ════════════════════════════════════════════════════════════ */}
      <section
        style={{
          minHeight: "min(92vh, 860px)",
          display: "flex",
          alignItems: "center",
          position: "relative",
          overflow: "hidden",
        }}
      >
        {/* Subtle radial vignette */}
        <div
          aria-hidden="true"
          style={{
            position: "absolute",
            inset: 0,
            background:
              "radial-gradient(ellipse 70% 60% at 70% 45%, rgba(25,181,230,0.04) 0%, transparent 70%)",
            pointerEvents: "none",
          }}
        />

        <div
          style={{
            maxWidth: 1200,
            width: "100%",
            margin: "0 auto",
            padding: "80px 32px 64px",
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 64,
            alignItems: "center",
          }}
          className="landing-hero-grid"
        >
          {/* ── Left column: Text + CTAs ── */}
          <div style={{ maxWidth: 560 }}>
            {/* Eyebrow */}
            <div
              className="font-mono"
              style={{
                fontSize: 11,
                letterSpacing: "0.16em",
                color: "var(--primary)",
                marginBottom: 28,
                textTransform: "uppercase",
              }}
            >
              Maritime Intelligence · Oil Spill Response
            </div>

            {/* Headline */}
            <h1
              className="font-mono"
              style={{
                fontSize: "clamp(2.2rem, 5vw, 3.6rem)",
                fontWeight: 800,
                lineHeight: 1.08,
                color: "var(--foreground)",
                letterSpacing: "-0.02em",
                margin: 0,
              }}
            >
              DETECT.
              <br />
              TRACE.
              <br />
              ATTRIBUTE.
            </h1>

            {/* Sub-copy */}
            <p
              style={{
                fontSize: 15,
                lineHeight: 1.7,
                color: "var(--muted-foreground)",
                marginTop: 28,
                maxWidth: 480,
              }}
            >
              Satellite SAR, ocean-drift modelling and AIS vessel intelligence
              unified for oil-spill investigation.
            </p>

            {/* CTA row */}
            <div
              style={{
                display: "flex",
                gap: 14,
                marginTop: 40,
                flexWrap: "wrap",
              }}
            >
              <Link
                to="/overview"
                className="font-mono"
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 10,
                  background: "var(--primary)",
                  color: "var(--primary-foreground)",
                  padding: "13px 28px",
                  borderRadius: 6,
                  fontSize: 12,
                  fontWeight: 700,
                  letterSpacing: "0.08em",
                  textDecoration: "none",
                  transition: "opacity 0.15s",
                  border: "none",
                }}
                id="cta-explore"
              >
                EXPLORE O.S.I.S.
                <ArrowRight style={{ width: 15, height: 15 }} />
              </Link>

              <a
                href="#how-it-works"
                className="font-mono"
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 8,
                  background: "transparent",
                  color: "var(--foreground)",
                  padding: "13px 28px",
                  borderRadius: 6,
                  fontSize: 12,
                  fontWeight: 600,
                  letterSpacing: "0.08em",
                  textDecoration: "none",
                  border: "1px solid var(--border)",
                  transition: "border-color 0.15s, color 0.15s",
                }}
                id="cta-how"
              >
                HOW IT WORKS
              </a>
            </div>

            {/* Badge row */}
            <div
              className="font-mono"
              style={{
                display: "flex",
                gap: 20,
                marginTop: 48,
                fontSize: 10,
                letterSpacing: "0.1em",
                color: "var(--muted-foreground)",
                textTransform: "uppercase",
              }}
            >
              <span>SIH PS26143</span>
              <span style={{ opacity: 0.3 }}>·</span>
              <span>Sentinel-1 SAR</span>
              <span style={{ opacity: 0.3 }}>·</span>
              <span>INCOIS HyCOM</span>
            </div>
          </div>

          {/* ── Right column: O.S.I.S. Intelligence Visualization ── */}
          <div
            style={{
              position: "relative",
              width: "100%",
              aspectRatio: "1 / 0.9",
              borderRadius: 10,
              border: "1px solid var(--border)",
              background: "#0A1018",
              overflow: "hidden",
            }}
            className="landing-hero-visual"
          >
            {/* Ocean grid background */}
            <div
              aria-hidden="true"
              style={{
                position: "absolute",
                inset: 0,
                backgroundImage:
                  "linear-gradient(to right, rgba(29,42,54,0.12) 1px, transparent 1px), linear-gradient(to bottom, rgba(29,42,54,0.12) 1px, transparent 1px)",
                backgroundSize: "32px 32px",
              }}
            />

            {/* SVG intelligence scene */}
            <svg
              viewBox="0 0 500 450"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              style={{
                position: "absolute",
                inset: 0,
                width: "100%",
                height: "100%",
              }}
              aria-hidden="true"
            >
              <defs>
                {/* Spill fill gradient */}
                <radialGradient id="spillGrad" cx="0.5" cy="0.5" r="0.5">
                  <stop offset="0%" stopColor="#FF4D6D" stopOpacity="0.3" />
                  <stop offset="100%" stopColor="#FF4D6D" stopOpacity="0.06" />
                </radialGradient>
                {/* Origin uncertainty */}
                <radialGradient id="originGrad" cx="0.5" cy="0.5" r="0.5">
                  <stop offset="0%" stopColor="#F5B82E" stopOpacity="0.15" />
                  <stop offset="100%" stopColor="#F5B82E" stopOpacity="0" />
                </radialGradient>
                {/* Pulse animation for spill */}
                <filter id="spillGlow">
                  <feGaussianBlur in="SourceGraphic" stdDeviation="3" />
                </filter>
              </defs>

              {/* ── Coastline contour (top-right, subtle) ── */}
              <path
                d="M 500 0 L 500 85 Q 465 90, 440 105 Q 410 125, 395 115 Q 375 100, 360 110 Q 340 125, 330 118 Q 310 105, 295 115 Q 275 130, 260 125 L 260 0 Z"
                fill="#111A24"
                stroke="#1D2A36"
                strokeWidth="1"
                opacity="0.6"
              />
              {/* Coastline edge highlight */}
              <path
                d="M 500 85 Q 465 90, 440 105 Q 410 125, 395 115 Q 375 100, 360 110 Q 340 125, 330 118 Q 310 105, 295 115 Q 275 130, 260 125"
                fill="none"
                stroke="#1D2A36"
                strokeWidth="1.5"
                opacity="0.8"
              />

              {/* ── Lat/Lon reference lines ── */}
              <line x1="0" y1="200" x2="500" y2="200" stroke="#1D2A36" strokeWidth="0.5" strokeDasharray="4 8" opacity="0.4" />
              <line x1="250" y1="0" x2="250" y2="450" stroke="#1D2A36" strokeWidth="0.5" strokeDasharray="4 8" opacity="0.4" />

              {/* ════════════════════════════════════════
                  LAYER 1: VESSEL TRAJECTORIES (background)
                 ════════════════════════════════════════ */}

              {/* Vessel 1 trajectory: NW heading */}
              <polyline
                points="125,148 140,155 158,160 175,162 188,158"
                fill="none"
                stroke="#19B5E6"
                strokeWidth="0.8"
                strokeDasharray="3 4"
                opacity="0.25"
              />
              {/* Vessel 2 trajectory: ENE heading past spill */}
              <polyline
                points="80,235 110,228 145,220 180,215 210,218 240,225"
                fill="none"
                stroke="#19B5E6"
                strokeWidth="0.8"
                strokeDasharray="3 4"
                opacity="0.25"
              />
              {/* Vessel 3 trajectory: SE heading */}
              <polyline
                points="220,160 230,175 235,195 232,210"
                fill="none"
                stroke="#19B5E6"
                strokeWidth="0.8"
                strokeDasharray="3 4"
                opacity="0.2"
              />

              {/* ════════════════════════════════════════
                  LAYER 2: DRIFT TRAJECTORY (origin → spill)
                 ════════════════════════════════════════ */}

              {/* Backward drift path — curved, dashed */}
              <path
                d="M 195,210 Q 220,240 240,265 Q 265,295 280,320 Q 290,340 305,355"
                fill="none"
                stroke="#F5B82E"
                strokeWidth="1.8"
                strokeDasharray="6 5"
                opacity="0.7"
                className="landing-drift-path"
              />
              {/* Drift direction arrows along path */}
              <polygon points="260,282 265,275 270,283" fill="#F5B82E" opacity="0.45" />
              <polygon points="290,335 294,327 299,336" fill="#F5B82E" opacity="0.35" />

              {/* ════════════════════════════════════════
                  LAYER 3: ESTIMATED ORIGIN
                 ════════════════════════════════════════ */}

              {/* Origin uncertainty radius */}
              <circle cx="195" cy="210" r="28" fill="url(#originGrad)" />
              <circle cx="195" cy="210" r="28" fill="none" stroke="#F5B82E" strokeWidth="0.8" strokeDasharray="3 3" opacity="0.4" />

              {/* Origin point */}
              <circle cx="195" cy="210" r="4" fill="#F5B82E" />
              <circle cx="195" cy="210" r="7" fill="none" stroke="#F5B82E" strokeWidth="1" opacity="0.5" />

              {/* ════════════════════════════════════════
                  LAYER 4: OIL SPILL DETECTION REGION
                 ════════════════════════════════════════ */}

              {/* Spill polygon — irregular shape */}
              <path
                d="M 290,340 Q 300,330 320,335 Q 340,340 350,355 Q 358,370 352,385 Q 342,400 325,405 Q 305,408 290,400 Q 275,390 272,375 Q 270,360 278,348 Z"
                fill="url(#spillGrad)"
                stroke="#FF4D6D"
                strokeWidth="1.5"
                opacity="0.85"
              />
              {/* Inner spill concentration */}
              <path
                d="M 305,355 Q 315,348 325,355 Q 335,365 330,378 Q 322,388 310,385 Q 298,380 300,368 Z"
                fill="#FF4D6D"
                fillOpacity="0.18"
                stroke="none"
              />
              {/* Spill pulse ring */}
              <circle cx="315" cy="370" r="18" fill="none" stroke="#FF4D6D" strokeWidth="0.8" opacity="0.35" className="landing-spill-pulse" />

              {/* ════════════════════════════════════════
                  LAYER 5: VESSEL MARKERS
                 ════════════════════════════════════════ */}

              {/* Vessel 1 — primary suspect, near origin */}
              <g>
                {/* Ship icon — small triangle */}
                <polygon points="188,158 184,165 192,165" fill="#19B5E6" opacity="0.85" />
                <circle cx="188" cy="161" r="8" fill="none" stroke="#19B5E6" strokeWidth="0.7" opacity="0.3" />
              </g>

              {/* Vessel 2 — secondary, passes nearby */}
              <g>
                <polygon points="240,225 236,232 244,232" fill="#19B5E6" opacity="0.6" />
                <circle cx="240" cy="228" r="7" fill="none" stroke="#19B5E6" strokeWidth="0.6" opacity="0.2" />
              </g>

              {/* Vessel 3 — further away, weaker signal */}
              <g>
                <polygon points="232,210 228,217 236,217" fill="#19B5E6" opacity="0.4" />
              </g>

              {/* ════════════════════════════════════════
                  LABELS (SVG text — positioned carefully)
                 ════════════════════════════════════════ */}

              {/* SAR DETECTION label — near spill */}
              <g>
                <rect x="340" y="343" width="86" height="18" rx="3" fill="#0A1018" fillOpacity="0.85" stroke="#FF4D6D" strokeWidth="0.6" opacity="0.8" />
                <text x="383" y="355" textAnchor="middle" fill="#FF4D6D" fontSize="8" fontFamily="ui-monospace, SFMono-Regular, monospace" letterSpacing="0.1em" opacity="0.9">
                  SAR DETECTION
                </text>
              </g>

              {/* EST. ORIGIN label */}
              <g>
                <rect x="130" y="188" width="54" height="16" rx="3" fill="#0A1018" fillOpacity="0.85" stroke="#F5B82E" strokeWidth="0.5" opacity="0.7" />
                <text x="157" y="199" textAnchor="middle" fill="#F5B82E" fontSize="7" fontFamily="ui-monospace, SFMono-Regular, monospace" letterSpacing="0.1em" opacity="0.85">
                  EST. ORIGIN
                </text>
              </g>

              {/* DRIFT BACKTRACK label — along path */}
              <g>
                <text x="228" y="290" fill="#F5B82E" fontSize="7" fontFamily="ui-monospace, SFMono-Regular, monospace" letterSpacing="0.08em" opacity="0.5" transform="rotate(-52, 228, 290)">
                  DRIFT BACKTRACK
                </text>
              </g>

              {/* AIS CORRELATION label — near vessels cluster */}
              <g>
                <rect x="100" y="135" width="80" height="16" rx="3" fill="#0A1018" fillOpacity="0.8" stroke="#19B5E6" strokeWidth="0.5" opacity="0.6" />
                <text x="140" y="146" textAnchor="middle" fill="#19B5E6" fontSize="7" fontFamily="ui-monospace, SFMono-Regular, monospace" letterSpacing="0.1em" opacity="0.7">
                  AIS CORRELATION
                </text>
              </g>

              {/* Vessel IDs */}
              <text x="197" y="155" fill="#19B5E6" fontSize="6.5" fontFamily="ui-monospace, SFMono-Regular, monospace" opacity="0.5">V-01</text>
              <text x="248" y="224" fill="#19B5E6" fontSize="6.5" fontFamily="ui-monospace, SFMono-Regular, monospace" opacity="0.4">V-02</text>
              <text x="240" y="209" fill="#19B5E6" fontSize="6.5" fontFamily="ui-monospace, SFMono-Regular, monospace" opacity="0.3">V-03</text>
            </svg>

            {/* ── Corner metadata overlays (HTML for crisp rendering) ── */}

            {/* Top-left: System label */}
            <span
              className="font-mono"
              style={{
                position: "absolute",
                top: 14,
                left: 14,
                fontSize: 9,
                color: "var(--muted-foreground)",
                letterSpacing: "0.12em",
                opacity: 0.55,
                textTransform: "uppercase",
              }}
            >
              Sentinel-1 SAR
            </span>

            {/* Top-right: Status indicator */}
            <span
              className="font-mono"
              style={{
                position: "absolute",
                top: 14,
                right: 14,
                fontSize: 9,
                letterSpacing: "0.1em",
                display: "flex",
                alignItems: "center",
                gap: 6,
                textTransform: "uppercase",
              }}
            >
              <span
                className="om-pulse-dot"
                style={{
                  width: 5,
                  height: 5,
                  borderRadius: "50%",
                  background: "#2ECF8B",
                  display: "inline-block",
                }}
              />
              <span style={{ color: "#2ECF8B", opacity: 0.8 }}>Analysis Active</span>
            </span>

            {/* Bottom-left: Coordinates */}
            <span
              className="font-mono"
              style={{
                position: "absolute",
                bottom: 12,
                left: 14,
                fontSize: 9,
                color: "var(--muted-foreground)",
                letterSpacing: "0.06em",
                opacity: 0.5,
              }}
            >
              15.25°N &nbsp;72.45°E
            </span>

            {/* Bottom-right: Sector label */}
            <span
              className="font-mono"
              style={{
                position: "absolute",
                bottom: 12,
                right: 14,
                fontSize: 9,
                color: "var(--muted-foreground)",
                letterSpacing: "0.08em",
                opacity: 0.45,
                textTransform: "uppercase",
              }}
            >
              Arabian Sea Sector
            </span>
          </div>
        </div>
      </section>

      {/* ════════════════════════════════════════════════════════════
          HOW IT WORKS — Four-Step Pipeline
         ════════════════════════════════════════════════════════════ */}
      <section
        id="how-it-works"
        style={{
          borderTop: "1px solid var(--border)",
          padding: "80px 32px",
        }}
      >
        <div style={{ maxWidth: 1200, margin: "0 auto" }}>
          {/* Section header */}
          <div style={{ marginBottom: 56, maxWidth: 520 }}>
            <div
              className="font-mono"
              style={{
                fontSize: 11,
                letterSpacing: "0.16em",
                color: "var(--primary)",
                marginBottom: 16,
                textTransform: "uppercase",
              }}
            >
              How It Works
            </div>
            <h2
              style={{
                fontSize: "clamp(1.4rem, 3vw, 2rem)",
                fontWeight: 700,
                color: "var(--foreground)",
                lineHeight: 1.2,
                margin: 0,
              }}
            >
              End-to-End Oil Spill Intelligence Pipeline
            </h2>
            <p
              style={{
                fontSize: 14,
                lineHeight: 1.7,
                color: "var(--muted-foreground)",
                marginTop: 16,
              }}
            >
              From satellite acquisition to actionable attribution — four
              autonomous stages, one unified report.
            </p>
          </div>

          {/* Pipeline grid */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(4, 1fr)",
              gap: 20,
            }}
            className="landing-pipeline-grid"
          >
            {PIPELINE.map((step) => {
              const Icon = step.icon;
              return (
                <div
                  key={step.num}
                  style={{
                    padding: "28px 28px 28px",
                    borderRadius: 8,
                    border: "1px solid var(--border)",
                    borderTop: `2px solid ${step.accent}`,
                    background: "var(--card)",
                    position: "relative",
                    transition: "border-color 0.2s",
                  }}
                  className="landing-pipeline-card"
                >
                  {/* Step number */}
                  <div
                    className="font-mono"
                    style={{
                      fontSize: 32,
                      fontWeight: 800,
                      color: step.accent,
                      opacity: 0.12,
                      position: "absolute",
                      top: 18,
                      right: 20,
                      lineHeight: 1,
                    }}
                  >
                    {step.num}
                  </div>

                  <div
                    style={{
                      width: 40,
                      height: 40,
                      borderRadius: 8,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      background: `color-mix(in srgb, ${step.accent} 10%, transparent)`,
                      marginBottom: 20,
                    }}
                  >
                    <Icon
                      style={{
                        width: 20,
                        height: 20,
                        color: step.accent,
                      }}
                    />
                  </div>

                  <h3
                    className="font-mono"
                    style={{
                      fontSize: 13,
                      fontWeight: 700,
                      color: "var(--foreground)",
                      letterSpacing: "0.06em",
                      marginBottom: 12,
                      textTransform: "uppercase",
                    }}
                  >
                    {step.title}
                  </h3>
                  <p
                    style={{
                      fontSize: 13,
                      lineHeight: 1.65,
                      color: "var(--muted-foreground)",
                      margin: 0,
                    }}
                  >
                    {step.desc}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ════════════════════════════════════════════════════════════
          FINAL CTA
         ════════════════════════════════════════════════════════════ */}
      <section
        style={{
          borderTop: "1px solid var(--border)",
          padding: "72px 32px",
          textAlign: "center",
        }}
      >
        <div style={{ maxWidth: 560, margin: "0 auto" }}>
          <h2
            className="font-mono"
            style={{
              fontSize: "clamp(1.2rem, 2.5vw, 1.6rem)",
              fontWeight: 700,
              color: "var(--foreground)",
              lineHeight: 1.25,
              letterSpacing: "0.02em",
              margin: 0,
            }}
          >
            Ready to investigate?
          </h2>
          <p
            style={{
              fontSize: 14,
              lineHeight: 1.7,
              color: "var(--muted-foreground)",
              marginTop: 14,
            }}
          >
            Access the full operational dashboard with live incident data,
            SAR detection, drift analysis, and vessel attribution.
          </p>
          <Link
            to="/overview"
            className="font-mono"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 10,
              background: "var(--primary)",
              color: "var(--primary-foreground)",
              padding: "14px 32px",
              borderRadius: 6,
              fontSize: 12,
              fontWeight: 700,
              letterSpacing: "0.08em",
              textDecoration: "none",
              marginTop: 32,
              border: "none",
              transition: "opacity 0.15s",
            }}
            id="cta-dashboard"
          >
            OPEN OPERATIONAL DASHBOARD
            <ArrowRight style={{ width: 15, height: 15 }} />
          </Link>
        </div>
      </section>

      {/* ════════════════════════════════════════════════════════════
          LANDING FOOTER
         ════════════════════════════════════════════════════════════ */}
      <footer
        className="font-mono"
        style={{
          borderTop: "1px solid var(--border)",
          padding: "24px 32px",
          textAlign: "center",
          fontSize: 11,
          color: "var(--muted-foreground)",
          letterSpacing: "0.04em",
        }}
      >
        <span style={{ opacity: 0.7 }}>O.S.I.S.</span>
        <span style={{ opacity: 0.3, margin: "0 8px" }}>·</span>
        <span>SIH PS26143</span>
        <span style={{ opacity: 0.3, margin: "0 8px" }}>·</span>
        <span style={{ opacity: 0.6 }}>
          Oil Spill Identification &amp; Source Attribution System
        </span>
      </footer>

      {/* ── Responsive overrides (injected as a style tag for self-containment) ── */}
      <style>{`
        /* Default: two-column hero on desktop */
        .landing-hero-grid {
          grid-template-columns: 1fr 1fr !important;
        }
        .landing-pipeline-grid {
          grid-template-columns: repeat(4, 1fr) !important;
        }

        /* Hero visual minimum height */
        .landing-hero-visual {
          min-height: 380px;
        }

        /* Tablet */
        @media (max-width: 960px) {
          .landing-hero-grid {
            grid-template-columns: 1fr !important;
            gap: 48px !important;
            padding-top: 56px !important;
            padding-bottom: 48px !important;
          }
          .landing-hero-visual {
            max-width: 520px;
            margin: 0 auto;
          }
          .landing-pipeline-grid {
            grid-template-columns: repeat(2, 1fr) !important;
          }
        }

        /* Mobile */
        @media (max-width: 600px) {
          .landing-pipeline-grid {
            grid-template-columns: 1fr !important;
          }
          .landing-hero-visual {
            min-height: 300px;
          }
        }

        /* Hover states */
        #cta-explore:hover {
          opacity: 0.9;
        }
        #cta-how:hover {
          border-color: var(--primary) !important;
          color: var(--primary) !important;
        }
        .landing-pipeline-card:hover {
          border-color: rgba(25, 181, 230, 0.25) !important;
        }
        #cta-dashboard:hover {
          opacity: 0.9;
        }

        /* Subtle spill pulse animation */
        .landing-spill-pulse {
          animation: landing-spill-pulse-k 3s ease-in-out infinite;
        }
        @keyframes landing-spill-pulse-k {
          0%, 100% { opacity: 0.35; r: 18; }
          50% { opacity: 0.12; r: 24; }
        }

        /* Subtle drift path animation */
        .landing-drift-path {
          animation: landing-drift-k 4s linear infinite;
        }
        @keyframes landing-drift-k {
          from { stroke-dashoffset: 0; }
          to { stroke-dashoffset: -22; }
        }

        /* Ocean current lines — very slow horizontal drift */
        .landing-currents-svg {
          animation: landing-currents-flow 90s linear infinite;
        }
        @keyframes landing-currents-flow {
          from { transform: translateX(0); }
          to { transform: translateX(-50%); }
        }

        @media (prefers-reduced-motion: reduce) {
          .landing-currents-svg {
            animation: none;
          }
        }
      `}</style>
    </div>
  );
}

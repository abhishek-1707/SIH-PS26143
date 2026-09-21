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
    desc: "Sentinel-1 SAR imagery is processed through deep-learning segmentation to identify dark-slick anomalies on the ocean surface.",
    accent: "var(--accent-blue)",
    icon: Radar,
  },
  {
    num: "02",
    title: "DRIFT BACKTRACKING",
    desc: "Lagrangian particle advection driven by INCOIS HyCOM ocean currents and ERA5 wind fields traces the slick backward to its probable release point.",
    accent: "var(--accent-amber)",
    icon: Navigation,
  },
  {
    num: "03",
    title: "AIS CORRELATION",
    desc: "Spatiotemporal querying of AIS vessel traffic identifies ships whose tracks intersect the computed origin corridor within the estimated time window.",
    accent: "var(--accent-emerald)",
    icon: Ship,
  },
  {
    num: "04",
    title: "SOURCE ATTRIBUTION",
    desc: "Multi-factor scoring ranks candidate vessels by proximity, heading, speed profile, vessel type, and historical behavior to produce an evidence-based attribution report.",
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

          {/* ── Right column: Visual placeholder ── */}
          <div
            style={{
              position: "relative",
              width: "100%",
              aspectRatio: "1 / 0.85",
              borderRadius: 10,
              border: "1px solid var(--border)",
              background: "var(--card)",
              overflow: "hidden",
            }}
          >
            {/* Grid overlay */}
            <div
              aria-hidden="true"
              style={{
                position: "absolute",
                inset: 0,
                backgroundImage:
                  "linear-gradient(to right, rgba(29,42,54,0.18) 1px, transparent 1px), linear-gradient(to bottom, rgba(29,42,54,0.18) 1px, transparent 1px)",
                backgroundSize: "40px 40px",
              }}
            />

            {/* Concentric rings — radar motif */}
            {[120, 200, 280].map((r) => (
              <div
                key={r}
                aria-hidden="true"
                style={{
                  position: "absolute",
                  top: "50%",
                  left: "50%",
                  width: r,
                  height: r,
                  borderRadius: "50%",
                  border: "1px solid rgba(25,181,230,0.08)",
                  transform: "translate(-50%, -50%)",
                }}
              />
            ))}

            {/* Center dot */}
            <div
              aria-hidden="true"
              style={{
                position: "absolute",
                top: "50%",
                left: "50%",
                width: 8,
                height: 8,
                borderRadius: "50%",
                background: "var(--primary)",
                transform: "translate(-50%, -50%)",
                boxShadow: "0 0 20px rgba(25,181,230,0.3)",
              }}
            />

            {/* Crosshair lines */}
            <div
              aria-hidden="true"
              style={{
                position: "absolute",
                top: "50%",
                left: 0,
                right: 0,
                height: 1,
                background: "rgba(25,181,230,0.06)",
              }}
            />
            <div
              aria-hidden="true"
              style={{
                position: "absolute",
                left: "50%",
                top: 0,
                bottom: 0,
                width: 1,
                background: "rgba(25,181,230,0.06)",
              }}
            />

            {/* Corner labels */}
            <span
              className="font-mono"
              style={{
                position: "absolute",
                top: 16,
                left: 16,
                fontSize: 9,
                color: "var(--muted-foreground)",
                letterSpacing: "0.12em",
                opacity: 0.6,
                textTransform: "uppercase",
              }}
            >
              SAR Intelligence Feed
            </span>
            <span
              className="font-mono om-pulse-dot"
              style={{
                position: "absolute",
                top: 16,
                right: 16,
                fontSize: 9,
                color: "var(--primary)",
                letterSpacing: "0.12em",
                display: "flex",
                alignItems: "center",
                gap: 6,
              }}
            >
              <span
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: "50%",
                  background: "var(--primary)",
                  display: "inline-block",
                }}
              />
              ACTIVE
            </span>

            {/* Simulated data points */}
            {[
              { x: "28%", y: "35%", size: 5, opacity: 0.5 },
              { x: "65%", y: "58%", size: 4, opacity: 0.35 },
              { x: "42%", y: "72%", size: 6, opacity: 0.45 },
              { x: "75%", y: "30%", size: 3, opacity: 0.3 },
              { x: "55%", y: "45%", size: 5, opacity: 0.4 },
            ].map((pt, i) => (
              <div
                key={i}
                aria-hidden="true"
                style={{
                  position: "absolute",
                  left: pt.x,
                  top: pt.y,
                  width: pt.size,
                  height: pt.size,
                  borderRadius: "50%",
                  background: "var(--primary)",
                  opacity: pt.opacity,
                }}
              />
            ))}

            {/* Bottom status bar */}
            <div
              className="font-mono"
              style={{
                position: "absolute",
                bottom: 0,
                left: 0,
                right: 0,
                padding: "10px 16px",
                background:
                  "linear-gradient(to top, rgba(7,11,16,0.85), transparent)",
                display: "flex",
                justifyContent: "space-between",
                fontSize: 9,
                color: "var(--muted-foreground)",
                letterSpacing: "0.08em",
                textTransform: "uppercase",
              }}
            >
              <span>Arabian Sea Sector</span>
              <span>72.45°E 15.25°N</span>
            </div>
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
                    padding: 28,
                    borderRadius: 8,
                    border: "1px solid var(--border)",
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
                      opacity: 0.15,
                      position: "absolute",
                      top: 20,
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

        /* Tablet */
        @media (max-width: 960px) {
          .landing-hero-grid {
            grid-template-columns: 1fr !important;
            gap: 48px !important;
            padding-top: 56px !important;
            padding-bottom: 48px !important;
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
      `}</style>
    </div>
  );
}

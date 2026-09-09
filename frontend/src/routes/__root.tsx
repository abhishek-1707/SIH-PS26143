import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";

import appCss from "../styles.css?url";
import { reportLovableError } from "../lib/lovable-error-reporting";
import { IncidentProvider, useIncident } from "../context/IncidentContext";

const NAV = [
  { to: "/analysis", label: "Analyze incident" },
  { to: "/", label: "Overview" },
  { to: "/satellite", label: "Satellite" },
  { to: "/backtracking", label: "Backtracking" },
  { to: "/ais", label: "AIS" },
  { to: "/suspects", label: "Suspects" },
] as const;

function NotFoundComponent() {
  return (
    <div className="flex min-h-[70vh] items-center justify-center px-4">
      <div className="max-w-md text-center">
        <h1 className="text-6xl font-semibold text-foreground">404</h1>
        <p className="mt-3 text-sm text-muted-foreground">
          No such station in this monitoring console.
        </p>
        <Link
          to="/"
          className="mt-6 inline-flex rounded-md border border-border px-4 py-2 text-sm text-foreground transition-colors hover:border-primary/60"
        >
          Back to Overview
        </Link>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();
  useEffect(() => {
    reportLovableError(error, { boundary: "tanstack_root_error_component" });
  }, [error]);

  return (
    <div className="flex min-h-[70vh] items-center justify-center px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold text-foreground">This page didn't load</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Something went wrong while rendering the console.
        </p>
        <button
          onClick={() => {
            router.invalidate();
            reset();
          }}
          className="mt-6 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
        >
          Try again
        </button>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  validateSearch: (search: Record<string, unknown>): { incident?: string } =>
    typeof search["incident"] === "string" ? { incident: search["incident"] } : {},
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "Oil Spill Detection & Vessel Attribution — SIH PS26143" },
      {
        name: "description",
        content:
          "Satellite oil spill detection with drift backtracking and AIS vessel attribution.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "icon", href: "/favicon.ico", type: "image/x-icon" },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();

  return (
    <QueryClientProvider client={queryClient}>
      <IncidentProvider>
        <RootLayout />
      </IncidentProvider>
    </QueryClientProvider>
  );
}

function RootLayout() {
  const { selectedIncidentId } = useIncident();

  return (
    <>
      <div className="om-stars" aria-hidden="true" />
      <div className="relative min-h-screen">
        <header className="sticky top-0 z-40 border-b border-border/70 bg-background/80 backdrop-blur">
          <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-x-8 gap-y-3 px-5 py-3">
            <div className="min-w-0">
              <div className="text-[13px] font-semibold tracking-tight text-foreground">
                Oil Spill Detection &amp; Vessel Attribution
              </div>
              <div className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
                SIH PS26143 · AIS correlation console
              </div>
            </div>
            <nav className="flex flex-wrap items-center gap-1">
              {NAV.map((n) => (
                <Link
                  key={n.to}
                  to={n.to}
                  search={{ incident: selectedIncidentId }}
                  activeOptions={{ exact: n.to === "/" }}
                  className="rounded-md px-3 py-1.5 text-[13px] text-muted-foreground transition-colors hover:text-foreground data-[status=active]:bg-secondary data-[status=active]:text-foreground"
                >
                  {n.label}
                </Link>
              ))}
            </nav>
          </div>
        </header>
        <main className="mx-auto max-w-7xl px-5 py-6">
          <div className="mb-4 rounded border border-primary/30 bg-card/70 p-3 text-xs">
            <Link to="/analysis" className="font-semibold text-primary">
              Open the end-to-end O.S.I.S. analysis →
            </Link>
            <span className="ml-2 text-muted-foreground">
              The other tabs preserve the legacy demonstration views; their fixture values are not
              this incident report.
            </span>
          </div>
          <Outlet />
        </main>
        <footer className="mx-auto max-w-7xl px-5 pb-8 text-[11px] text-muted-foreground">
          Research console · DEMO is synthetic; REAL/UPLOAD reports label source inputs, inferred
          candidates, modeled scenarios and unavailable evidence
        </footer>
      </div>
    </>
  );
}

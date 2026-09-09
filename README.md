# O.S.I.S.
## Oil Spill Identification & Source Attribution System

SIH 2026 prototype: available SAR imagery → slick characterization → release-window inference → origin hindcast → forward drift → historical AIS correlation → evidence-ranked vessel candidates.

**Use `/analysis` for the complete, backend-computed demonstration.** Its imagery, environmental conditions, historical observations and vessel identities are explicitly synthetic. It is not a live pollution surveillance service or a finding of legal responsibility.

## Quick start

Prerequisites: Node.js 22.12+ (or a compatible newer release), npm, Python 3.10+ on PATH. The deterministic pipeline uses Python's standard library and existing geometry/RK4 code; no pip installation or external account is required.

Run from the repository root:

```sh
npm --prefix backend ci
npm --prefix frontend ci
```

Start these in **two terminals**:

```sh
npm --prefix backend start
```

```sh
npm --prefix frontend run dev -- --host 127.0.0.1 --port 3000
```

Open **http://localhost:3000/analysis**. Backend defaults to http://localhost:5000.

1. Select the synthetic Arabian Sea exercise.
2. Choose a 24, 48 or 72 hour forecast.
3. Click **Analyze complete pipeline**.
4. Toggle SAR, slick polygons, origin uncertainty, hindcast, forecast, vessel tracks and AIS gaps.
5. Select a candidate to inspect weighted evidence.
6. Download the JSON report. Saved reports can be reopened after restarting the backend.

The map retains the project's SVG visualization and needs no external tiles. The dashboard links to this workflow. Other pages preserve the earlier research/demo interface and label fixture content; they are not substitutes for the computed incident report.

### Configuration

Defaults work without `.env`. Examples are in `backend/.env.example` and `frontend/.env.example`. **Do not overwrite an existing `.env` or commit credentials.**

| Variable | Default | Purpose |
| --- | --- | --- |
| `PORT` | `5000` | Express port |
| `PYTHON_PATH` | `python` | Interpreter executable, not a shell command |
| `OSIS_REPORT_DIR` | `backend/data/incidents` | Writable local JSON archive |
| `OSIS_PERSIST_POSTGRES` | disabled | Set exactly `true` to mirror new reports to PostGIS |
| `DATABASE_URL` | none | PostgreSQL connection string, required only for DB operations/legacy APIs |
| `OSIS_TEST_DATABASE` | disabled | Opt-in DB test; set in shell before starting the test |
| `VITE_API_URL` | `http://localhost:5000` | Browser-accessible API origin; restart/rebuild frontend after changing |

Local JSON is the incident API's read store; PostGIS is an optional mirror. Database outages are explicitly reported as `unavailable_local_fallback`. A writable report directory and working Python interpreter are required. `/api/health` is **liveness**, not database/scientific-provider readiness.

## Optional database setup

Use a PostgreSQL database with PostGIS available, and a role allowed to create the extension (or ask the database administrator to provision PostGIS). Configure `DATABASE_URL`, then:

```sh
npm --prefix backend run migrate
```

This applies **`002_incidents.sql`**, an additive, repeatable migration independent of the old integer-ID spill schema. It creates `osis_incidents`, spatial indexes and views for characterization, origins, drift, candidates, AIS positions and anomalies. It does not delete old tables or seed fictional identities into legacy vessel tables.

`001_hindcast_schema.sql` is preserved for the earlier application and depends on its existing schema. For a database that already has those legacy tables:

```sh
npm --prefix backend run migrate -- 001_hindcast_schema.sql
```

Do not run the old `seed.js` as part of the new demo setup. The new demo needs neither legacy seeding nor migration 001.

After migration, set `OSIS_PERSIST_POSTGRES=true` and restart the backend to mirror new incident reports. Existing local archives are not automatically backfilled.

## API

| Method | Path | Result |
| --- | --- | --- |
| GET | `/api/health` | API liveness |
| GET | `/api/incidents/scenes` | Available explicitly labeled demo scenes |
| POST | `/api/incidents/analyze` | Complete computed and archived incident |
| GET | `/api/incidents` | Saved incident summaries |
| GET | `/api/incidents/:id` | Full report |
| GET | `/api/incidents/:id/spill` | Detections, primary slick, raster, mask and age |
| GET | `/api/incidents/:id/origin` | Modeled origin and backward trajectory |
| GET | `/api/incidents/:id/drift` | Backward/forward trajectories and environment |
| GET | `/api/incidents/:id/vessels` | Candidates, anomalies and scoring configuration |
| GET | `/api/incidents/:id/vessels/:mmsi` | Incident-specific vessel evidence |
| GET | `/api/incidents/:id/report` | Downloadable JSON report |

Analysis body:

```json
{"sceneId":"demo-arabian-sea","forecastHours":24}
```

Both fields are optional with the values above as defaults. Other scene IDs, extra fields, string horizons and unsupported horizons are rejected. Processing is bounded to two simultaneous analyses, 60 seconds and 8 MiB of subprocess output. Errors include 400 validation, 404 missing incident, 429 capacity, 503 missing Python and 504 timeout. The frontend does not silently replace failed analysis with fabricated results.

Example using Node (shell-independent, backend must be running):

```sh
node -e "fetch('http://localhost:5000/api/incidents/analyze',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({forecastHours:24})}).then(async r=>{if(!r.ok)throw new Error(await r.text());const x=await r.json();console.log({id:x.id,age:x.age,origin:x.origin,leadingCandidate:x.leadingCandidate})}).catch(e=>{console.error(e);process.exitCode=1})"
```

Legacy `/api/spills`, `/api/detection`, `/api/drift`, `/api/vessels` and `/api/reports` routes remain available with their original data/provider requirements.

## Tests and build

```sh
npm --prefix backend test
npm --prefix backend run test:legacy
npm --prefix frontend run lint
npm --prefix frontend run build
node frontend/node_modules/typescript/bin/tsc --project frontend/tsconfig.json --noEmit
```

The standard backend suite contains ten Python scientific tests and an HTTP end-to-end suite. The PostGIS suite is intentionally skipped unless enabled, and applies migration 002 twice plus evidence round-trips **inside a rolled-back transaction**.

Enable the optional test without editing `.env`:

```sh
node -e "const r=require('node:child_process').spawnSync(process.execPath,['--test','backend/tests/database.test.js'],{stdio:'inherit',env:{...process.env,OSIS_TEST_DATABASE:'true'}});process.exit(r.status??1)"
```

Production build retains the existing TanStack/Nitro Cloudflare target. Use the development server for the local judging demo; deployment requires configuring the public backend URL and appropriate hosting/security.

## Scientific scope and limitations

- The new scene provider produces seeded SAR-like dB values, not a downloaded Sentinel-1 acquisition.
- Median filtering and adaptive dark-region thresholding are a **baseline**, not a trained oil classifier. Two connected slick-like formations are detected; attribution runs on the largest.
- Convex pixel envelopes may overestimate slick area. Geometry is computed in metric space using existing utilities.
- The 6–9 hour age range comes from synthetic clear/positive observations and assumes detectability approximates release; it is not morphology-based precise dating.
- Hindcast and forecast reuse RK4 point advection with currents plus wind leeway. Constant fixtures omit diffusion, weathering, coast interaction and wave transport.
- Uncertainty radii are sensitivity envelopes, not calibrated confidence intervals.
- Vessel scores are transparent, uncalibrated compatibility indices. Spatial/time proximity dominates; speed/heading features check AIS consistency.
- AIS discontinuities reduce confidence and are not proof that a transponder was deliberately disabled. Interpolated gap hypotheses are never treated as observations.
- Identifying wholly unobserved non-AIS vessels requires additional sensor evidence and is not implemented.
- Existing Sentinel/CDSE, environmental and trained-model experiments are preserved but are not automatically connected to the synthetic incident endpoint.

See [technical architecture and repository audit](docs/ARCHITECTURE.md) for module responsibilities, real-data seams and production upgrades.
# Vector session handoff

**Status:** User-accepted live dashboard with a keyed CARTO basemap (FR-13) and a
fit-to-screen layout (FR-14), both pushed to `origin/main` and green in CI. The Compose
stack is stopped, not removed, as of the 2026-11-17 wrap (see Final closeout state).

**Last updated:** 2026-11-17 PST

## Cross-tool session contract completed

- `AGENTS.md` is the tool-neutral instruction source Codex discovers natively.
- `CLAUDE.md` imports it for Claude Code and points to canonical requirements, design, and
  this handoff.
- `.claude/commands/session-start.md` and `session-wrap.md` are Claude conveniences that
  execute the same mandatory protocols as Codex.
- Startup requires both instruction files, requirements/design/contracts/workflow/current
  handoff, live Git/service/source state, user-change preservation, and approval review.
- Wrap requires full applicable QA and failure evidence, requirements/design/ADR/contracts/
  runbook/PLAN/HANDOFF maintenance, cross-tool instruction/link synchronization, secret/
  personal-data/diff review, and detailed commit/push only when requested.
- `docs/requirements.md` now defines functional/non-functional requirements, honest
  delivery/privacy/performance constraints, acceptance evidence, and traceability.
  `docs/design.md` defines topology, event/transaction/offset order, failure/degradation,
  geospatial/provider, evolution, security/privacy, and observability rules.
  `docs/engineering-workflow.md` defines ready/done gates and the documentation map.
- README, architecture, decisions, and PLAN link or record this engineering baseline.

## 2026-11-17 basemap key change (FR-13)

CARTO stopped serving keyless raster tiles on 2026-09-25; the map showed gray
"API KEY REQUIRED" tiles (HTTP 200, so status checks cannot detect it). The web app now
builds the CARTO Dark Matter raster style in `apps/web/app/basemap.ts` with
`NEXT_PUBLIC_CARTO_API_KEY`. The key is a free non-commercial CARTO key, browser-visible
by design, kept in the git-ignored `.env`. Next.js inlines it at build time, so the
`Dockerfile` takes it as a build arg and only the `web` service passes it in
`docker-compose.yml`. After changing the key, rebuild: `docker compose up -d --build web`.
A missing key logs a console warning and shows placeholder tiles; ingestion, state, and
live updates are unaffected. See the ADR in `docs/decisions.md`.

Observed: keyed CARTO tile request returned a real 512x512 tile; headless-browser load of
`http://localhost:3100` made 8 CARTO tile requests, all HTTP 200, with no missing-key
warning and real place labels visible. The key literal is present once in the web bundle
and only in the web image history. Not verified: CARTO's long-term free-tier terms.

## 2026-11-17 fit-to-screen layout (FR-14)

Maximizing the browser used to leave a page-level vertical scrollbar: the map row was
sized `calc(100vh - 210px)` with a 540px minimum, but the header, metrics bar, and padding
need more than 210px (82px overflow at 1366x768). `apps/web/app/styles.css` now makes
`main` a full-height flex column (`100dvh`, 480px minimum) where the map row takes the
remaining space, the event feed scrolls inside its panel, and the title shrinks on short
windows (`min(6vw, 9vh)`). At 760px and narrower the stacked, scrolling layout is kept.

Observed with a headless browser against the rebuilt Compose stack (page scroll height
minus window height): 1366x768, 1920x1080, 1280x720, 1536x864, 1024x700, and 1366x560 all
0px; 390x844 scrolls by design (146px). Tradeoff: the map is shorter than before at a
given window size because the page now fits (558px to 487px at 1366x768). No automated
layout test exists (the repo has no browser test harness); the measurement above is
manual evidence, not a regression test.

## GIS Day 2026 presentation materials (outside this repo)

Vector is being presented in a virtual GIS Day poster session on 2026-11-18, for a
general audience with basic GIS knowledge. The presentation materials (a 7-slide talk deck, a
one-slide 16:9 poster, a timed ~7:30 script, a QR code to this public repo, a
plain-language technology summary, and their build scripts) are kept outside this repo in
private local storage at the user's request and are intentionally not committed; their
location is deliberately not recorded in this public file. They say plainly that the load
test and the outage/crash drills are not yet demonstrated; keep any future material honest
and do not add performance or exactly-once claims.

## Current accepted application

When started, the app at `http://localhost:3100` connects to LA Metro's official bus
WebSocket. Selecting a bus zooms to it, loads/draws its official directional pattern, and
labels the direction/destination. Home restores the LA extent; selected buses are followed
only after leaving the viewport.

The visible, toggleable **Route colors** legend is static and correctly explains the
deterministic seven-color route palette, selection ring, and matching route line. Colors
are not official agency symbology and can repeat. The visible device collection/event feed
refresh in five-second batches, while selected-bus details and off-screen follow remain
immediate. The user reported no more critiques on 2026-08-13; preserve these accepted
behaviors and the at-least-once guarantee unless a new request changes them.

## Latest verification

Observed at the 2026-11-17 wrap, on `main` at `742e27e` (the later wrap commit is
documentation only):

```text
Prettier format check       passed
ESLint                      passed
workspace TypeScript        passed
Vitest                      18 passed (5 files)
production workspace build  passed
git diff --check            passed
GitHub Actions CI           run 44209820908 passed on 742e27e
Docker Compose smoke        all eight services up; Postgres/Redis/Redpanda healthy
GET /health                 database=true, broker=true
GET http://localhost:3100   HTTP 200
WebSocket /live             subscribed; received a device_state_updated (LA Metro source,
                            numeric longitude/latitude)
GET /api/v1/devices/nearby  2000 devices returned (the requested limit); all source
                            la-metro-bus-gtfs-realtime
GET /metrics (ingestion)    HTTP 200
LA Metro source totals      received 1,368,002, accepted 1,054,097, rejected 400 (the
                            rejected count was constant across the session)
```

Not run: k6 load, Redis-outage drill, crash-before-offset redelivery drill. No latency,
lag, or throughput figure has been measured; none may be claimed.

Verified finding, not fixed (no change was requested): `apps/websocket-gateway/src/index.ts`
registers an `onClose` hook (stops the heartbeat, disconnects the Redis subscriber) at
line 73 but never installs `SIGTERM`/`SIGINT` handlers that call `app.close()`, unlike
`apps/ingestion-api/src/server.ts:5-8`. `docker compose stop` therefore ends the gateway
through pnpm with `Command failed with signal "SIGTERM"` and exit code 1, without draining
clients or closing Redis; the same exit 1 was seen at the 2026-08-13 stop. The other seven
services exit 0. This conflicts with the graceful-shutdown rule in `AGENTS.md` and NFR-05.
Proposed fix, awaiting approval: add the same signal handlers (call `app.close()`, then
exit 0) with a requirement/test update per `docs/engineering-workflow.md`.

Observations for a future requirement, not defects verified here: `location_events` held
1,368,415 rows (database 835 MB) after the stack ran about 46 minutes this session on top
of August data, i.e. an observed average of roughly 370 accepted events per second (arithmetic from the
source logs, not a benchmark) with no retention policy, so a
long-running stack grows without bound (NFR-05 lists retention as a bound to define).
Dashboard hydration requests `limit=2000` while `device_state` held 2,036 devices;
newer positions still arrive over WebSocket and the UI keeps only route-assigned buses.

## Final closeout state (2026-11-17)

At wrap the user had not asked to keep a demo stack running, and the database grows
continuously while ingesting, so the session-started stack was stopped with
`docker compose stop`. Containers, images, and the `pg-data` volume are retained. Live
ingestion is off and `localhost:3100/4100/4101` are unavailable. No broker topic, database
row, or volume was deleted. Restore with `docker compose up -d` (add `--build web` after
changing `NEXT_PUBLIC_CARTO_API_KEY`); allow a minute or two before buses fill the map.
`.idea/`, `.vscode/`, and `.env.*` (except `.env.example`) are now gitignored.

At the user's explicit request, overriding the usual never-force-push rule for this one
case, `main` was force-pushed on 2026-11-17 to remove one wrap commit that contained a
local filesystem path; its hash is intentionally not recorded here. Commit author email
addresses were reviewed and deliberately left unchanged at the user's direction.

## Next session

Execute `AGENTS.md` mandatory startup (Claude Code may use `/session-start`). The expected
starting condition is no running Docker containers; inspect state first and start only
services needed for an approved task. If the user wants a live demo for GIS Day, start the
stack about 30 minutes before the talk and stop it afterward. Consider a debrief on the
2026-11-18 talk, whether a retention or hydration-limit requirement is worth adding, and
the proposed WebSocket gateway graceful-shutdown fix described above.
The only known proposed evidence work is the
Redis outage demonstration, crash-before-offset redelivery demonstration, configurable
k6 runs with actual latency/lag/error results, and a live dashboard screenshot/GIF. Run it
only after explicit approval, protect the demo data/stack, and never invent exactly-once
or performance claims.

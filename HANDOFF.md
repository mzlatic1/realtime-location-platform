# Vector session handoff

**Status:** User-accepted live dashboard; cross-tool documentation and agent workflow are
complete, final wrap-up is complete, and all Docker containers are intentionally stopped.

**Last updated:** 2026-08-13 PDT

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

Observed after the cross-tool documentation change:

```text
Prettier format check       passed
ESLint                      passed
workspace TypeScript        passed
Vitest                      12 passed
production workspace build passed
git diff --check            passed
Docker Compose smoke        all eight services up; Postgres/Redis/Redpanda healthy
GET /health                 database=true, broker=true
GET http://localhost:3100   HTTP 200
GitHub Actions CI           run 31775461933 passed
```

## Final closeout state

On 2026-08-13, the user requested a complete shutdown and wrap-up. All 17 running Docker
containers on the host were stopped successfully, including the Vector web/API/WebSocket,
LA Metro source, processor, PostgreSQL, Redis, and Redpanda services. `docker ps` returned
no running containers afterward. Containers and persistent volumes were retained, so a
future approved session can restore the stack with `docker compose up -d` (or
`docker compose up --build` when rebuilding is required). Live ingestion is stopped and
the dashboard/API/WebSocket URLs are not currently available.

No runtime code, broker, database, or application data changed during closeout. The final
documentation-only wrap records shutdown and preserves the prior live-smoke evidence.

## Next session

Execute `AGENTS.md` mandatory startup (Claude Code may use `/session-start`). The only
expected starting condition is no running Docker containers; inspect state first and start
only services needed for an approved task. The only known proposed evidence work is the
Redis outage demonstration, crash-before-offset redelivery demonstration, configurable
k6 runs with actual latency/lag/error results, and a live dashboard screenshot/GIF. Run it
only after explicit approval, protect the demo data/stack, and never invent exactly-once
or performance claims.

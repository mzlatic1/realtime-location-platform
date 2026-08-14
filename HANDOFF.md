# Vector session handoff

**Status:** User-accepted live dashboard; cross-tool documentation/agent workflow complete
and ready for a future Codex or Claude Code session.

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

The app at `http://localhost:3100` is running against LA Metro's official bus WebSocket.
Selecting a bus zooms to it, loads/draws its official directional pattern, and labels the
direction/destination. Home restores the LA extent; selected buses are followed only after
leaving the viewport.

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
Docker Compose              all eight services up; Postgres/Redis/Redpanda healthy
GET /health                 database=true, broker=true
GET http://localhost:3100   HTTP 200
```

The requested live demo stack and LA Metro source remain running. No runtime code, broker,
or database behavior changed in this final documentation session.

## Next session

Execute `AGENTS.md` mandatory startup (Claude Code may use `/session-start`). The only
known proposed evidence work is the Redis outage demonstration, crash-before-offset
redelivery demonstration, configurable k6 runs with actual latency/lag/error results, and
a live dashboard screenshot/GIF. Run it only after explicit approval, protect the demo
data/stack, and never invent exactly-once or performance claims.

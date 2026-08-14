# Vector — shared agent instructions

This is the repository-level source of truth for Codex, Claude Code, and other coding
agents. Codex discovers `AGENTS.md`; Claude Code loads `CLAUDE.md`, which imports it.
Keep durable, tool-neutral rules here so both CLIs execute one engineering contract.

## Mandatory session start

Before editing, installing, starting/stopping services, or acting on a prior handoff:

1. Read `AGENTS.md` and `CLAUDE.md`; confirm Claude still imports this file.
2. Read, in order: `README.md`, `docs/requirements.md`, `docs/design.md`,
   `docs/architecture.md`, `docs/event-contracts.md`, `docs/delivery-semantics.md`,
   `docs/consistency.md`, `docs/failure-modes.md`, `docs/engineering-workflow.md`,
   `PLAN.md`, and `HANDOFF.md`.
3. Inspect `git status --short --branch`, `git log -5 --oneline`, and `git remote -v`.
   Preserve unexpected/user changes. Never reset, overwrite, stage, or commit them.
4. Inspect `docker compose ps` and ports 3100, 4100, and 4101 before starting another
   stack. Do not stop a process unless ownership is clear. Preserve a stack the user asked
   to keep available across sessions.
5. Check only for required environment files/key names; never display secret values.
6. Reconcile `HANDOFF.md` with live Git, API, broker, processor, WebSocket, and source
   state. Treat its future work as proposed unless currently approved.
7. Summarize verified state, deviations, and the requested task before implementation.

Claude Code may invoke `/session-start`; Codex executes the same protocol here.

## Product and distributed-systems invariants

- Vector is an at-least-once real-time location platform, never an exactly-once claim.
- A 202 response means broker acceptance only, not downstream persistence or display.
- PostgreSQL/PostGIS is durable truth. Redis and WebSockets are disposable/eventual
  projections; Redis loss must not stop durable processing.
- `event_id` makes history insertion idempotent. Current state advances only by the
  documented `(sequence_number, event_time, event_id)` comparison. Late events remain in
  history but cannot move current state backward.
- Commit database state before committing the broker offset. A crash between them must
  redeliver safely. Do not weaken uniqueness or offset ordering to hide duplicates.
- Device ID partitioning preserves ordinary per-device order. Retries and DLQ are bounded;
  replay uses the normal validated/idempotent path.
- WebSocket delivery is non-durable and bounded. Reconnect repairs state with REST truth
  then resubscription, not an invented replay guarantee.
- WGS84 geometry uses longitude/X then latitude/Y. Validate coordinates, CRS, axis order,
  bounds, optional accuracy/speed/heading, and geofence predicate semantics explicitly.
- Default live data is the official LA Metro vehicle-position stream. Preserve provider,
  route/trip/direction metadata, licensing/attribution, and deterministic IDs. Tests use
  fixtures, never the live stream.
- Route colors are a deterministic visual palette, not official agency symbology. The UI
  must not imply otherwise. Visible collection/feed refresh may batch every five seconds,
  while selected-bus context/follow remains immediate as documented.
- Do not add personal tracking, identity/account linkage, or production retention without
  an approved privacy, consent, authorization, deletion, and security design.

## Required engineering workflow

Follow `docs/engineering-workflow.md` for every change:

1. Express the approved request as a requirements delta and observable acceptance criteria.
2. Update `docs/requirements.md` before or with behavior changes.
3. Update `docs/design.md`, event/delivery/consistency/failure/privacy docs, or an ADR
   before code when contracts, ordering, truth, topics, state, retry/DLQ, geofencing,
   providers, batching, dependencies, or failure semantics change.
4. Implement the smallest coherent slice with strict TypeScript, explicit errors, bounded
   resources, graceful shutdown, and injectable external boundaries.
5. Add deterministic regression tests. Unit/contract tests must not contact live LA Metro,
   Redpanda, Redis, PostgreSQL, or external networks.
6. Update user/operator docs, PLAN, and HANDOFF in the same change.
7. Run and report only verification actually observed.

Full application gate:

```bash
pnpm format:check
pnpm lint
pnpm typecheck
pnpm test
pnpm build
git diff --check
```

Run relevant Compose health/API/WebSocket/source smoke checks for runtime changes. For
delivery or reliability changes, demonstrate duplicate, late-event, dependency-loss, or
crash/redelivery behavior as appropriate. Load tests must record actual environment,
workload, lag, latency, error, and recovery results; configured k6 thresholds are not
measured achievements.

## Working and Git practices

- Make only explicitly requested/approved changes. Recommendations are not approval.
- Do not delegate or spawn subagents unless the user explicitly asks.
- Never expose or commit secrets, `.env`, personal location data, broker volumes, database
  dumps, build output, caches, benchmark artifacts, or private screenshots.
- Use versioned contracts, parameterized SQL, bounded queues/batches/subscriptions, and
  structured logs/metrics without credentials or full sensitive payloads.
- Commit and push only when requested. Stage and review only intended files. Never
  force-push, rewrite history, or touch an organization remote.

## Mandatory session wrap

When asked to wrap, finish, close out, or prepare for compaction:

1. Inventory diffs, topic/data artifacts, and session-started processes. Stop only
   session-owned ephemeral work; preserve a requested running demo stack and record it.
2. Run the final applicable verification and repeat formatter/documentation review until
   a no-change pass. Never report an unrun reliability or performance demonstration.
3. Update affected requirements, design/ADR, event/delivery/consistency/failure/privacy,
   README, and PLAN. Update `HANDOFF.md` with completed work, actual checks/results,
   service/source state, blockers, and explicit next steps.
4. Review both `AGENTS.md` and `CLAUDE.md`. If agent behavior changed, update this shared
   source and Claude routing in the same change. Verify both Claude commands and all
   startup/wrap document links resolve; avoid duplicate durable rules.
5. Inspect diff/status/staged content for secrets, personal data, generated artifacts,
   unsupported claims, stale TODOs, or unrelated changes.
6. If commit/push was requested, create a detailed commit covering behavior, guarantees,
   validation, and recommended next steps; push to the personal upstream and verify
   synchronization. Otherwise leave changes uncommitted and report them.
7. Report commit/push status, actual checks, running-service state, blockers, and the exact
   next approved or proposed action. Do not create an empty commit.

Claude Code may invoke `/session-wrap`; Codex follows the same section. The protocol does
not authorize destructive broker/database actions or external writes.

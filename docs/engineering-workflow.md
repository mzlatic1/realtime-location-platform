# Engineering and agent workflow

This workflow is tool-neutral. Codex reads `AGENTS.md`; Claude Code imports it through
`CLAUDE.md` and may use repository slash commands. Wrappers never override shared
delivery, correctness, privacy, validation, or Git rules.

## Session lifecycle

### Start

Execute `AGENTS.md` **Mandatory session start** and establish Git plus live service/source
state before editing. Claude may use `/session-start`; Codex follows `AGENTS.md`. Both
validate both instruction files and links. A proposed failure/load test or destructive
broker/database operation remains unapproved until the user says otherwise.

### Definition of ready

- User approval, requirement IDs, acceptance criteria, exclusions, workload, and affected
  components are explicit.
- Contract/version, ordering/idempotency, transaction/offset, topics/retention, spatial,
  security/privacy, resource bounds, degradation, observability, migration, and rollback
  impacts were assessed.
- Deterministic tests and required integration/failure/UI/load evidence are identified.

### Implement

1. Update requirements, then design/ADR and relevant contracts before code when needed.
2. Add deterministic fixtures/tests for normal, invalid, duplicate, stale/late, ordering,
   dependency-failure, retry/DLQ, reconnect, and boundary cases relevant to the change.
3. Implement a small strict-TypeScript slice with validated inputs, bounded resources,
   explicit outcomes, injectable I/O, and graceful shutdown.
4. Run focused tests and inspect metrics/logs plus broker/database/cache/UI behavior.
5. Demonstrate failure/load only in an approved environment; capture actual workload,
   latency/lag/error/recovery, and limitations.
6. Update README, contracts/runbooks, requirements/design, PLAN, and HANDOFF with code.
7. Run the complete quality gate and relevant Compose/API/WebSocket/source smoke checks.

### Definition of done

- Acceptance criteria trace to deterministic tests or recorded controlled evidence.
- Delivery guarantee, 202 boundary, identity/order, transaction/offset, retries/DLQ,
  projection fallback, reconnect, shutdown, and rollback remain explicit where relevant.
- CRS, axis, units, coordinate bounds, geofence boundary, provider attribution,
  privacy/security, accessibility, and resource bounds were reviewed.
- Format, lint, typecheck, tests, build, and `git diff --check` pass.
- No secret, personal data, volume/dump, generated artifact, unsupported exactly-once or
  performance claim, stale TODO, or unrelated user change is included.
- Requirements, design/ADR, contracts/runbooks, PLAN, and HANDOFF match the live system.

### Wrap

Execute `AGENTS.md` **Mandatory session wrap**. Claude may use `/session-wrap`; Codex uses
the same section. Update HANDOFF for material code, guarantee, service, source, validation,
decision, blocker, or next-step changes. If agent behavior changes, update/review both
`AGENTS.md` and `CLAUDE.md` and both Claude commands in one change.

## Documentation change map

| Change                             | Required documentation/evidence                                            |
| ---------------------------------- | -------------------------------------------------------------------------- |
| User/API behavior                  | requirements, README/OpenAPI, tests, HANDOFF                               |
| Event field/version                | requirements, design, `event-contracts.md`, dual-read/migration tests      |
| Ordering/transaction/offset/replay | design, delivery/consistency docs, failure tests/demo, ADR                 |
| Topic/retry/DLQ/retention          | design, delivery/failure/scaling docs, operations and replay evidence      |
| Redis/WebSocket/UI projection      | requirements, design, consistency/failure docs, reconnect/fallback tests   |
| Provider/route/geospatial          | requirements, design, attribution/privacy, fixtures and spatial validation |
| Privacy/auth/retention/deletion    | requirements, design, `privacy.md`, threat/operations review               |
| Performance/reliability claim      | exact workload/environment and latency/lag/error/recovery evidence         |
| Agent/session workflow             | `AGENTS.md`, `CLAUDE.md`, both `.claude/commands/*`, this file             |

## Git and review

Use focused commits with detailed bodies covering changed guarantees, tests/demonstrations,
operational impact, and next steps. Stage only intended files and inspect the staged diff.
Never force-push or write to an organization remote. Reviewers trace requirement to design
and evidence and challenge exactly-once wording, failure windows, unbounded resources,
privacy assumptions, unsafe replay, and unsupported performance claims.

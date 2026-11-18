# Decisions

- Redpanda/Kafka decouples bursts, replay, and consumers at real operational cost.
- `device_id` partitioning preserves normal per-device order but hot devices can skew.
- PostgreSQL history and current projection serve different append/query patterns.
- Redis is never truth; rebuildability beats fragile cache durability.
- At-least-once plus application idempotency exposes real failure boundaries.
- WebSockets optimize freshness, not durable delivery; reconnect always resynchronizes REST.

## ADR — Keyed CARTO raster basemap

CARTO stopped serving keyless raster tiles on 2026-09-25 (observed: HTTP 200 placeholder
image; keyless vector tiles were near-empty). Decision: keep the visually accepted Dark
Matter raster basemap and add a free non-commercial CARTO key (5M requests/month at the
time of writing) passed as a web build argument. Alternatives: switch to vector styles
(also moving to keys, and would change map layering), or OpenStreetMap's public tiles
(usage policy discourages application use). Tradeoffs: one more third-party dependency
and key to rotate; a missing key degrades the basemap only, never ingestion, state, or
live updates. Rollback: revert to a keyless provider by changing `basemap.ts` only.

## ADR — One cross-tool engineering contract

`AGENTS.md` is the tool-neutral repository instruction source and `CLAUDE.md` imports it;
requirements, design, workflow, and current handoff are separate tracked documents. Codex
and Claude Code therefore use identical startup, implementation, validation, and wrap
rules without duplicated guidance drifting. Tool-specific commands only route into the
shared protocol.

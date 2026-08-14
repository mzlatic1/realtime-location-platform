# Decisions

- Redpanda/Kafka decouples bursts, replay, and consumers at real operational cost.
- `device_id` partitioning preserves normal per-device order but hot devices can skew.
- PostgreSQL history and current projection serve different append/query patterns.
- Redis is never truth; rebuildability beats fragile cache durability.
- At-least-once plus application idempotency exposes real failure boundaries.
- WebSockets optimize freshness, not durable delivery; reconnect always resynchronizes REST.

## ADR — One cross-tool engineering contract

`AGENTS.md` is the tool-neutral repository instruction source and `CLAUDE.md` imports it;
requirements, design, workflow, and current handoff are separate tracked documents. Codex
and Claude Code therefore use identical startup, implementation, validation, and wrap
rules without duplicated guidance drifting. Tool-specific commands only route into the
shared protocol.

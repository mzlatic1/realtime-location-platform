# Decisions

- Redpanda/Kafka decouples bursts, replay, and consumers at real operational cost.
- `device_id` partitioning preserves normal per-device order but hot devices can skew.
- PostgreSQL history and current projection serve different append/query patterns.
- Redis is never truth; rebuildability beats fragile cache durability.
- At-least-once plus application idempotency exposes real failure boundaries.
- WebSockets optimize freshness, not durable delivery; reconnect always resynchronizes REST.

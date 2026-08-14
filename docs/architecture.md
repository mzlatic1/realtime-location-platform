# Architecture

This compact view is governed by [`requirements.md`](requirements.md) and the evolution
rules in [`design.md`](design.md). Changes to event contracts, ordering, transactions,
offsets, topics, truth/projection boundaries, or failure guarantees must update those
documents and add an ADR in `decisions.md` for a durable tradeoff.

The ingestion API validates/version-checks and publishes by `device_id`; it does not block
on durable projections. Redpanda absorbs bursts/replay. The processor transaction inserts
history, conditionally advances current state, and emits unique geofence transitions.
Redis and WebSockets are replaceable projections. Service boundaries reflect different
scaling/failure modes while one monorepo keeps the versioned contract shared.

The database transaction completes before the broker offset is committed, intentionally
allowing safe redelivery. UI state always rehydrates from REST truth after reconnect. New
functionality must define resource bounds, privacy/security, observability, migration,
failure/recovery, and evidence under the shared engineering workflow.

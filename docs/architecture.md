# Architecture

The ingestion API validates/version-checks and publishes by `device_id`; it does not block
on durable projections. Redpanda absorbs bursts/replay. The processor transaction inserts
history, conditionally advances current state, and emits unique geofence transitions.
Redis and WebSockets are replaceable projections. Service boundaries reflect different
scaling/failure modes while one monorepo keeps the versioned contract shared.

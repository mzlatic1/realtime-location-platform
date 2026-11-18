# System design and evolution standard

This is the Vector design baseline. `architecture.md` is the compact view;
`decisions.md` records durable tradeoffs. Future functionality that changes a load-bearing
rule must update this baseline or add an ADR before implementation.

## Components and ownership

- **Source adapters/simulator** normalize trusted provider or deterministic synthetic data
  into the same versioned event contract. They do not write database/cache state directly.
- **Ingestion API** authenticates, validates, rate/batch bounds, and publishes by device ID.
  Its 202 response ends at broker acceptance.
- **Redpanda** buffers/replays raw events and stores processed/geofence/DLQ streams.
- **Processor** owns the database transaction, event idempotency, monotonic current-state
  rule, geofence transition state, outcome classification, and post-commit offset order.
- **PostgreSQL/PostGIS** is durable history/current/geofence truth.
- **Redis** is a disposable current-state projection and pub/sub transport.
- **WebSocket gateway** provides bounded ephemeral fanout. It offers no durable replay.
- **Web UI** hydrates REST truth, subscribes for freshness, batches broad repaint/feed work,
  and owns presentation/selection—not authoritative state.

## Event and processing flow

1. Validate version, UUID, identity, offset-aware timestamps, nonnegative sequence,
   WGS84 coordinates, optional bounded measures, source, batch/rate/API key.
2. Publish keyed by `device_id`; acknowledge only broker acceptance.
3. In one database transaction, insert history by unique `event_id`, compare the current
   ordering tuple, update current state only when newer, and insert unique geofence
   transitions. Classify duplicate/stale/applied outcomes.
4. Commit the database transaction, then update Redis/publish derived messages, then commit
   the consumer offset according to documented delivery semantics. Projection failure must
   not roll back durable truth.
5. REST reads Redis when healthy and PostgreSQL on miss/failure. WebSockets fan out bounded
   live updates; reconnect performs REST resynchronization.

## Delivery, identity, and failure invariants

At-least-once delivery plus `event_id` uniqueness makes redelivery safe but does not make
external side effects exactly once. `(sequence_number,event_time,event_id)` defines a
total current-state order. Geofence transition identity makes replay safe. Database commit
before broker offset commit intentionally permits duplicates after crash; idempotency
absorbs them. Retry budgets distinguish transient from permanent failure and DLQ replay
re-enters the ordinary validated path.

Redis outage removes cache/fanout freshness while durable processing and PostgreSQL reads
continue. WebSocket slow consumers are bounded/disconnected rather than allowed unbounded
memory. Broker/PostgreSQL loss fails or backs up visibly; no component invents accepted or
persisted state. Shutdown stops intake, drains within a bound, and leaves uncommitted work
for redelivery.

## Geospatial and provider correctness

All version-1 locations are WGS84. Geometry construction is longitude/X then latitude/Y;
heading/speed/accuracy units remain explicit. Geofence predicates use indexed bbox
prefilters and a documented boundary rule. Any distance/area/buffer feature must select a
projected CRS or geodesic method rather than degree arithmetic.

LA Metro provider timestamps derive deterministic per-vehicle sequence/event IDs and
provider metadata is retained. Route shapes/patterns are fetched through a bounded,
validated server-side adapter; clients cannot nominate arbitrary upstream URLs. Provider
schema drift produces observable rejection/failure and fixture updates, never silent
field invention. Palette colors communicate route distinction only, not authority.

The basemap is CARTO Dark Matter raster tiles (OpenStreetMap data) from the documented
`basemaps.cartocdn.com/rastertiles/dark_all` endpoint with a free key. Since 2026-09-25
CARTO answers keyless raster requests with HTTP 200 gray "API KEY REQUIRED" tiles, so
status codes cannot detect the failure; the UI warns in the console when the key is
absent. Next.js inlines `NEXT_PUBLIC_*` at build time, so the key is a Docker build
argument for the web image, not a runtime variable. The key is a browser-visible usage
identifier, not a secret, but it is still kept in `.env` and out of Git. Tile requests
disclose the viewer's IP address and viewport to CARTO; no vehicle or device data is sent.

## Contract and topology evolution

- Additive compatible event metadata may pass through; required/type/semantic breaks use
  a new event version and documented dual-reader/migration/rollback plan.
- New topics/consumers define keying, retention, replay, retry/DLQ, ownership, metrics,
  and deployment order before creation.
- New database state defines uniqueness, transaction boundary, migration/backfill,
  retention/deletion, and projection rebuild behavior.
- New projections must be disposable from PostgreSQL/broker truth and bound queues.
- Change five-second UI batching only with a measured UX/performance requirement and tests
  protecting selected-device immediacy and reconnect correctness.

## Security, privacy, accessibility, and observability

Keep credentials outside Git, validate ingress, use parameterized SQL, minimize payload
logs, and expose only intended ports. Personal location deployment requires identity
authorization, consent, precision/retention limits, deletion across history/cache/archive,
access audits, encryption, incident response, and legal review. UI controls need labels,
keyboard operation, focus/contrast, and textual meaning beyond color.

Metrics/logs distinguish accepted, processed, applied, stale, duplicate, retry, DLQ, lag,
dependency health, fanout drop/disconnect, REST fallback, and source adapter health. Do not
log secrets or full raw payloads by default.

## Design checklist for future functionality

```text
Problem and linked requirement IDs
In scope / out of scope
Contract/version and topology changes
Identity, ordering, transaction, offset, replay, and retention semantics
CRS, axis, units, geometry and boundary semantics
Failure, retry, DLQ, backpressure, degradation, shutdown, and rollback
Security/privacy/authorization/accessibility impact
Metrics, test, failure-demo, and load-evidence plan
Deployment/migration order and alternatives/ADR
```

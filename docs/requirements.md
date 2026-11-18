# Product and engineering requirements

This is the requirements baseline for Vector. The README explains the current demo; this
file defines the functional and quality contracts future functionality must preserve. A
change is incomplete until requirements, design, contracts, code, tests/demonstrations,
operator/user documentation, and handoff state agree.

## Product boundary

Vector accepts validated location events, buffers them durably, materializes idempotent
history/current/geofence state, serves REST truth, and fans out a bounded live projection.
The portfolio demo uses official LA Metro vehicle positions or an explicit deterministic
simulator. It is not an exactly-once system, identity platform, surveillance product, or
production privacy/compliance certification.

## Functional requirements

| ID    | Requirement                                                                                                                                                                                                        | Acceptance evidence                                 |
| ----- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------- |
| FR-01 | Validate versioned single/batch events and return 202 only after broker acceptance.                                                                                                                                | API/contract tests and OpenAPI.                     |
| FR-02 | Partition raw events by device identity and consume with at-least-once delivery.                                                                                                                                   | Broker configuration and controlled smoke.          |
| FR-03 | Insert one history row per `event_id` and classify redelivery as duplicate without corrupting state.                                                                                                               | Duplicate tests and crash/redelivery demonstration. |
| FR-04 | Advance current state only by `(sequence_number,event_time,event_id)` order; persist late events without moving state backward.                                                                                    | Monotonic/late-event tests.                         |
| FR-05 | Evaluate indexed geofences with deterministic boundary semantics and unique transition identity.                                                                                                                   | Geofence and replay tests.                          |
| FR-06 | Retry transient processing failures within bounds, route exhausted/permanent failures to DLQ, and replay through the normal validated path.                                                                        | Retry/DLQ tests and CLI smoke.                      |
| FR-07 | Serve current state from Redis when available and fall back to PostgreSQL truth when Redis is unavailable.                                                                                                         | Fallback tests/outage demonstration.                |
| FR-08 | Bound WebSocket subscriptions/queues/heartbeats; reconnecting clients fetch REST truth then resubscribe.                                                                                                           | Gateway tests and reconnect smoke.                  |
| FR-09 | Normalize official LA Metro messages into deterministic version-1 events while preserving route/trip/direction/provider metadata.                                                                                  | Fixture adapter tests and controlled live smoke.    |
| FR-10 | Display current buses on an interactive map, zoom/select equivalently, draw official directional stop patterns, label direction/destination, follow selected off-screen movement, and restore LA extent with Home. | UI tests/reviewed smoke.                            |
| FR-11 | Batch visible device/feed refresh every five seconds while keeping selected-bus detail/off-screen follow immediate.                                                                                                | Timer/state tests and UI smoke.                     |
| FR-12 | Explain route palette honestly as non-official, possibly repeating visual line differentiation and preserve text/shape selection cues.                                                                             | Rendered UI assertions and accessibility review.    |
| FR-13 | Render the dark basemap from CARTO raster tiles authenticated by a free key supplied at web build time (`NEXT_PUBLIC_CARTO_API_KEY`), keep OSM/CARTO attribution visible, and warn when the key is missing.        | Basemap unit tests, keyed tile check, reviewed UI.  |

## Non-functional requirements

| ID     | Requirement                                                                                                                                                      |
| ------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| NFR-01 | Delivery claims remain at least once; docs, API, metrics, and UI never imply end-to-end exactly once.                                                            |
| NFR-02 | PostgreSQL/PostGIS is truth; Redis/WebSockets can be rebuilt and cannot be required for durable correctness.                                                     |
| NFR-03 | Event identity, ordering, database transaction, offset commit, geofence transition, and replay semantics remain deterministic/idempotent.                        |
| NFR-04 | Coordinates use explicit WGS84 longitude/X and latitude/Y; validate bounds, units, geometry, and geofence predicate semantics.                                   |
| NFR-05 | Bound request size/rate, batches, retries, queues, subscriptions, heartbeats, timeouts, retention, and shutdown drain time.                                      |
| NFR-06 | Version contracts compatibly; breaking semantic/type changes require a new event version and dual-read migration.                                                |
| NFR-07 | Protect API keys/secrets, parameterize SQL, validate provider data, and avoid logging credentials or complete sensitive payloads.                                |
| NFR-08 | TypeScript stays strict; formatting, lint, typecheck, deterministic tests, build, and diff checks pass.                                                          |
| NFR-09 | Metrics/logs expose acceptance, processing outcome, duplicates/stale/DLQ, lag, dependency health, fanout drops, reconnects, and bounded-resource pressure.       |
| NFR-10 | Performance/reliability claims include actual workload, environment, duration, latency/lag/error/recovery results, and limitations.                              |
| NFR-11 | Real personal/location use requires approved consent, purpose, authorization, retention/deletion, audit, encryption, and jurisdictional review before ingestion. |
| NFR-12 | UI controls are keyboard accessible, visibly focused, contrast-safe, and never rely on color alone.                                                              |

## Change requirements

Every feature or material fix must:

1. Add/update requirement IDs, observable acceptance criteria, and exclusions.
2. Review compatibility, identity/order/idempotency, topic/partition/offset behavior,
   transaction boundaries, geospatial semantics, privacy/security, bounded resources,
   availability/degradation, observability, migration, and rollback.
3. Update `docs/design.md` before code for contract, state, topic, dependency, provider,
   retry/DLQ, geofence, batching, or failure changes; record durable tradeoffs in an ADR.
4. Define deterministic unit/contract tests and controlled integration, failure, UI, or
   load evidence. Never make routine tests depend on the live provider.
5. Implement the smallest approved slice and preserve honest guarantees.
6. Follow `docs/engineering-workflow.md`, update affected docs/HANDOFF, and record only
   evidence actually observed.

## Traceability template

```text
Requirement IDs and acceptance criteria:
In scope / out of scope:
Contract/version compatibility:
Identity/order/transaction/offset semantics:
CRS/axis/units/geofence semantics:
Failure/retry/DLQ/degradation/rollback:
Security/privacy/retention/accessibility:
Observability and bounded resources:
Tests, demonstrations, and measured evidence:
Design/ADR and documentation files:
```

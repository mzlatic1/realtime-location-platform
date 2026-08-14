# Vector — Real-Time Location Event Platform

An executable distributed-systems portfolio story: simulated devices enter through a
bounded Fastify API, Redpanda buffers at-least-once delivery, an idempotent processor
maintains PostGIS history/current state, Redis accelerates/fans out live state, and a
MapLibre dashboard resynchronizes through REST after WebSocket reconnects.

```mermaid
flowchart LR
 Sim[Deterministic simulator]-->API[Ingestion API]-->Raw[Redpanda location.raw]
 Raw-->P[Processor]-->PG[(PostGIS truth)]
 P-->R[(Redis projection)]-->WS[Bounded WebSockets]-->UI[Next.js dashboard]
 P-->Done[processed / geofence topics]
 P-->DLQ[location.dlq]
```

## Run

```bash
corepack enable && pnpm install
cp .env.example .env
docker compose up --build
```

Dashboard: `http://localhost:3100`; OpenAPI: `http://localhost:4100/docs`.
Producer calls need `x-api-key: local-demo-key`. The 202 response acknowledges broker
acceptance, not downstream completion.

The default Compose stack connects to LA Metro's official rail vehicle-position
WebSocket, normalizes each GTFS-realtime-shaped message, batches it through the public
ingestion contract, and displays the processed positions. Provider timestamps become
per-vehicle sequence numbers and deterministic event UUIDs make redelivery idempotent.
The deterministic simulator remains available as an explicit offline/failure-test source:

```bash
pnpm simulate -- --devices 1000 --hz 0.2 --duplicates 0.01 --late 0.02 --seed 42
```

## Guarantees

Delivery is **at least once**, not exactly once. `event_id` prevents duplicate history;
the `(sequence_number,event_time,event_id)` comparison prevents delayed events moving
current state backward; transition uniqueness makes replay safe. PostgreSQL is truth.
Redis loss removes live fanout/cache but durable processing continues. WebSocket clients
fetch REST truth then resubscribe after reconnect.

## Verify and demonstrate failure

```bash
pnpm lint && pnpm typecheck && pnpm test && pnpm build
k6 run load-tests/ingestion.js
docker compose stop redis                 # simulator continues; REST falls back to PG
docker compose start redis                # next update/read repopulates projection
pnpm dlq:list
pnpm dlq:replay -- --event-id <uuid>
```

Then force a processor restart immediately after a DB commit (debug breakpoint or SIGKILL
before offset commit): Redpanda redelivers and the primary-key insert classifies the event
as duplicate. Inspect processor metrics/logs and consumer lag with `rpk`. No representative
load result or screenshot is committed yet; do not present the configurable k6 threshold
as a measured achievement.

## Intentional scope

No real personal location data, identity platform, Kubernetes, magical exactly-once claim,
or unbounded retry/fanout. See the consistency, failure, privacy, and scaling documents.

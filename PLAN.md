# Delivery plan

- [x] Milestone 0 — monorepo, shared contracts, PostGIS/Redis/Redpanda Compose, CI
- [x] Milestone 1 — validated single/batch ingestion and deterministic simulator
- [x] Milestone 2 — idempotent history and monotonic state projection
- [x] Milestone 3 — disposable Redis projection with PostgreSQL fallback
- [x] Milestone 4 — indexed geofences and transition state machine
- [x] Milestone 5 — bounded WebSocket subscriptions, heartbeat, live messages
- [x] Milestone 6 — responsive live MapLibre dashboard
- [x] Milestone 7 — bounded retry/DLQ tools, graceful shutdown, replay-safe logic
- [x] Milestone 8 — Prometheus metrics and configurable k6 scenarios
- [ ] Milestone 9 — capture representative load results, failure demo output, screenshot/GIF

The final operational evidence is never fabricated; run it against the complete local
stack on the target machine and record the result.

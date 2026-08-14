# Consistency

PostgreSQL is truth; Redis/WebSockets are eventual projections. Ten seconds of lag means
the dashboard may show old state while accepted events wait. Three identical events yield
one history row. Event 103 advances state; later 102 is stored but stale. DB commit plus
pre-offset crash safely replays. Redis loss falls back to Postgres and durable writes
continue. A WebSocket miss is repaired by REST fetch plus resubscription, not replay.

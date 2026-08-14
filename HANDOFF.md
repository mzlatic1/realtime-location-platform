# Post-compact handoff

The app at `http://localhost:3100` is running against LA Metro's official bus WebSocket.
Direction IDs now survive ingestion, selecting a numbered bus loads its official
directional stop pattern/overview, draws the route, and shows labels such as
`Metro 487 · Eastbound to Sierra Madre Villa Station`. Home restores the LA extent and a
selected bus is followed only after it leaves the visible bounds. The verified local route
response for line 487 contained 42 ordered points. After `/compact`, first have the user
review a live bus popup, line shape, Home, and follow behavior. If accepted, execute the
Redis outage and crash-before-offset demonstrations, run configurable k6 workloads, record
actual latency/lag/error results, and capture the live dashboard. Preserve at-least-once
claims and do not invent exactly-once or performance evidence.

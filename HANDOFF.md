# Post-compact handoff

The app at `http://localhost:3100` is running from rebuilt production containers against
LA Metro's official bus WebSocket. Selecting a live bus loads its official directional
stop pattern/overview, draws the direction line, and shows labels such as `Metro 487 ·
Eastbound to Sierra Madre Villa Station`. Home restores the LA extent, and a selected bus
is followed only after a later live position leaves the visible bounds.

The latest critique added:

- point-marker clicks now fly to the selected bus at zoom 15 before opening its live
  context;
- a visible-by-default, toggleable **Bus authorities** legend; and
- authority-based marker and selected-route colors sourced from `metadata.agency_id`.
  The current official feed reports `LACMTA`, displayed as **LA Metro**, and unknown future
  authorities have an explicit neutral fallback.

Verification completed: Prettier, ESLint, all workspace TypeScript checks, 12 unit tests,
and the production monorepo Docker build passed. The rebuilt stack is running and a live
API check returned 1,415 LA Metro devices with `agency_id: LACMTA` at verification time.

First after the next `/compact`, have the user click a numbered bus and confirm zoom,
popup/route context, the authority legend toggle, Home, and off-screen follow behavior. If
accepted, execute the Redis outage and crash-before-offset demonstrations, run
configurable k6 workloads, record actual latency/lag/error results, and capture the live
dashboard. Preserve at-least-once claims and do not invent exactly-once or performance
evidence.

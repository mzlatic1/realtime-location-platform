# Post-compact handoff

The app at `http://localhost:3100` is running from rebuilt production containers against
LA Metro's official bus WebSocket. Selecting a live bus loads its official directional
stop pattern/overview, draws the direction line, and shows labels such as `Metro 487 ·
Eastbound to Sierra Madre Villa Station`. Home restores the LA extent, and a selected bus
is followed only after a later live position leaves the visible bounds.

The current interactions include:

- point-marker clicks now fly to the selected bus at zoom 15 before opening its live
  context;
- a visible-by-default, toggleable **Bus authorities** legend.

The latest correction restored the original deterministic per-line color palette for
markers and selected route shapes. The legend now explains that colors distinguish lines,
while its values identify the actual authority from `metadata.agency_id`; selecting a bus
adds an exact color/value row such as **LA Metro (LACMTA) · line 151**. `LBT` is mapped to
**Long Beach Transit (LBT)** if that agency ID is present, but the current feed reports
only `LACMTA`, so it must not label a Metro line as Long Beach Transit. Actual LBT vehicles
would require adding an official Long Beach Transit feed rather than changing symbology.

Verification completed: Prettier, ESLint, all workspace TypeScript checks, 12 unit tests,
and the production monorepo Docker build passed. The rebuilt stack is running and a live
API check returned 1,415 LA Metro devices with `agency_id: LACMTA` at verification time.

First after the next `/compact`, have the user click differently colored numbered buses
and confirm the selected line's color is repeated beside its real authority value in the
legend. Also confirm zoom, popup/route context, Home, and off-screen follow behavior. If
accepted, execute the Redis outage and crash-before-offset demonstrations, run
configurable k6 workloads, record actual latency/lag/error results, and capture the live
dashboard. Preserve at-least-once claims and do not invent exactly-once or performance
evidence.

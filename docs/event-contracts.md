# Event contract

Version 1 requires unique UUID `event_id`, device identity, offset-aware event/received
times, nonnegative monotonic sequence, valid WGS84 coordinates, and source. Optional
accuracy/speed/heading are bounded. Unknown compatible metadata survives. Breaking
semantic/type changes require event version 2 and a dual-reading migration.

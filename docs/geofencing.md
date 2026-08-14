# Geofencing

Geofences are valid WGS84 Polygon/MultiPolygon values normalized to MultiPolygon. GiST bbox
candidates precede exact `ST_Covers`, so boundary points are inside. Prior inside fences
are also considered to generate EXIT after leaving a bbox. Overlaps act independently.
Stale events never mutate current geofence state. First outside observation emits nothing;
first inside emits ENTER.

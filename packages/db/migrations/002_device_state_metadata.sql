ALTER TABLE device_state ADD COLUMN IF NOT EXISTS source text;
ALTER TABLE device_state
  ADD COLUMN IF NOT EXISTS metadata jsonb NOT NULL DEFAULT '{}';

UPDATE device_state AS state
SET source = event.source,
    metadata = event.metadata
FROM location_events AS event
WHERE event.event_id = state.last_event_id
  AND (state.source IS NULL OR state.metadata = '{}'::jsonb);

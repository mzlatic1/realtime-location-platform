CREATE EXTENSION IF NOT EXISTS postgis;
CREATE TABLE IF NOT EXISTS location_events(
 event_id uuid PRIMARY KEY,device_id text NOT NULL,event_time timestamptz NOT NULL,received_time timestamptz NOT NULL,sequence_number bigint NOT NULL,
 latitude double precision NOT NULL CHECK(latitude BETWEEN -90 AND 90),longitude double precision NOT NULL CHECK(longitude BETWEEN -180 AND 180),
 geom geography(Point,4326) NOT NULL,accuracy_m double precision,speed_mps double precision,heading_deg double precision,source text NOT NULL,metadata jsonb NOT NULL DEFAULT '{}',processed_at timestamptz NOT NULL DEFAULT now());
CREATE INDEX IF NOT EXISTS location_events_device_time ON location_events(device_id,event_time DESC,event_id);
CREATE INDEX IF NOT EXISTS location_events_time ON location_events(event_time DESC);
CREATE TABLE IF NOT EXISTS device_state(device_id text PRIMARY KEY,last_event_id uuid NOT NULL,last_sequence_number bigint NOT NULL,last_event_time timestamptz NOT NULL,
 latitude double precision NOT NULL,longitude double precision NOT NULL,geom geography(Point,4326) NOT NULL,speed_mps double precision,heading_deg double precision,updated_at timestamptz NOT NULL DEFAULT now());
CREATE INDEX IF NOT EXISTS device_state_geom_gist ON device_state USING gist(geom);
CREATE TABLE IF NOT EXISTS geofences(geofence_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),name text NOT NULL,geom geometry(MultiPolygon,4326) NOT NULL,active boolean NOT NULL DEFAULT true,created_at timestamptz NOT NULL DEFAULT now(),updated_at timestamptz NOT NULL DEFAULT now());
CREATE INDEX IF NOT EXISTS geofences_geom_gist ON geofences USING gist(geom) WHERE active;
CREATE TABLE IF NOT EXISTS device_geofence_state(device_id text NOT NULL,geofence_id uuid NOT NULL REFERENCES geofences ON DELETE CASCADE,is_inside boolean NOT NULL,last_transition_at timestamptz,last_event_id uuid NOT NULL,PRIMARY KEY(device_id,geofence_id));
CREATE TABLE IF NOT EXISTS geofence_events(transition_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),device_id text NOT NULL,geofence_id uuid NOT NULL REFERENCES geofences ON DELETE CASCADE,event_id uuid NOT NULL,transition text NOT NULL CHECK(transition IN('ENTER','EXIT')),event_time timestamptz NOT NULL,created_at timestamptz NOT NULL DEFAULT now(),UNIQUE(device_id,geofence_id,event_id,transition));

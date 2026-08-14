import pg from 'pg';
import type { DeviceState, LocationEvent } from '@realtime/contracts';
const { Pool } = pg;
export class LocationDatabase {
  readonly pool;
  constructor(url = process.env.DATABASE_URL) {
    this.pool = new Pool({
      connectionString: url,
      max: 20,
      statement_timeout: 3000,
    });
  }
  async ping() {
    return (await this.pool.query('SELECT 1')).rowCount === 1;
  }
  async close() {
    await this.pool.end();
  }
  async process(event: LocationEvent): Promise<{
    duplicate: boolean;
    stale: boolean;
    state?: DeviceState;
    transitions: Array<Record<string, unknown>>;
  }> {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      const inserted = await client.query(
        `INSERT INTO location_events(event_id,device_id,event_time,received_time,sequence_number,latitude,longitude,geom,accuracy_m,speed_mps,heading_deg,source,metadata) VALUES($1,$2,$3,$4,$5,$6,$7,ST_SetSRID(ST_MakePoint($7,$6),4326)::geography,$8,$9,$10,$11,$12) ON CONFLICT(event_id) DO NOTHING RETURNING event_id`,
        [
          event.event_id,
          event.device_id,
          event.event_time,
          event.received_time,
          event.sequence_number,
          event.latitude,
          event.longitude,
          event.accuracy_m ?? null,
          event.speed_mps ?? null,
          event.heading_deg ?? null,
          event.source,
          event.metadata,
        ],
      );
      if (inserted.rowCount === 0) {
        await client.query('ROLLBACK');
        return { duplicate: true, stale: false, transitions: [] };
      }
      const updated = await client.query(
        `INSERT INTO device_state(device_id,last_event_id,last_sequence_number,last_event_time,latitude,longitude,geom,speed_mps,heading_deg,source,metadata) VALUES($1,$2,$3,$4,$5,$6,ST_SetSRID(ST_MakePoint($6,$5),4326)::geography,$7,$8,$9,$10) ON CONFLICT(device_id) DO UPDATE SET last_event_id=excluded.last_event_id,last_sequence_number=excluded.last_sequence_number,last_event_time=excluded.last_event_time,latitude=excluded.latitude,longitude=excluded.longitude,geom=excluded.geom,speed_mps=excluded.speed_mps,heading_deg=excluded.heading_deg,source=excluded.source,metadata=excluded.metadata,updated_at=now() WHERE (excluded.last_sequence_number,excluded.last_event_time,excluded.last_event_id)>(device_state.last_sequence_number,device_state.last_event_time,device_state.last_event_id) RETURNING *`,
        [
          event.device_id,
          event.event_id,
          event.sequence_number,
          event.event_time,
          event.latitude,
          event.longitude,
          event.speed_mps ?? null,
          event.heading_deg ?? null,
          event.source,
          event.metadata,
        ],
      );
      if (updated.rowCount === 0) {
        await client.query('COMMIT');
        return { duplicate: false, stale: true, transitions: [] };
      }
      const fences = await client.query(
        `SELECT g.geofence_id,ST_Covers(g.geom,ST_SetSRID(ST_MakePoint($2,$1),4326)) inside FROM geofences g WHERE g.active AND (g.geom && ST_SetSRID(ST_MakePoint($2,$1),4326) OR EXISTS(SELECT 1 FROM device_geofence_state s WHERE s.device_id=$3 AND s.geofence_id=g.geofence_id AND s.is_inside))`,
        [event.latitude, event.longitude, event.device_id],
      );
      const transitions = [];
      for (const fence of fences.rows) {
        const previous = await client.query(
          'SELECT is_inside FROM device_geofence_state WHERE device_id=$1 AND geofence_id=$2 FOR UPDATE',
          [event.device_id, fence.geofence_id],
        );
        const was = previous.rows[0]?.is_inside as boolean | undefined;
        const next = Boolean(fence.inside);
        if (was !== next && (was !== undefined || next)) {
          const kind = next ? 'ENTER' : 'EXIT';
          const created = await client.query(
            `INSERT INTO geofence_events(device_id,geofence_id,event_id,transition,event_time) VALUES($1,$2,$3,$4,$5) ON CONFLICT DO NOTHING RETURNING *`,
            [
              event.device_id,
              fence.geofence_id,
              event.event_id,
              kind,
              event.event_time,
            ],
          );
          if (created.rows[0]) transitions.push(created.rows[0]);
        }
        await client.query(
          `INSERT INTO device_geofence_state(device_id,geofence_id,is_inside,last_transition_at,last_event_id) VALUES($1,$2,$3,$4,$5) ON CONFLICT(device_id,geofence_id) DO UPDATE SET is_inside=excluded.is_inside,last_transition_at=excluded.last_transition_at,last_event_id=excluded.last_event_id`,
          [
            event.device_id,
            fence.geofence_id,
            next,
            was === next ? null : event.event_time,
            event.event_id,
          ],
        );
      }
      await client.query('COMMIT');
      const row = updated.rows[0];
      return {
        duplicate: false,
        stale: false,
        state: {
          device_id: row.device_id,
          last_event_id: row.last_event_id,
          last_sequence_number: Number(row.last_sequence_number),
          last_event_time: new Date(row.last_event_time).toISOString(),
          latitude: Number(row.latitude),
          longitude: Number(row.longitude),
          speed_mps: row.speed_mps === null ? undefined : Number(row.speed_mps),
          heading_deg:
            row.heading_deg === null ? undefined : Number(row.heading_deg),
          source: row.source ?? undefined,
          metadata: row.metadata ?? {},
          updated_at: new Date(row.updated_at).toISOString(),
        },
        transitions,
      };
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }
  async device(id: string) {
    const r = await this.pool.query(
      'SELECT * FROM device_state WHERE device_id=$1',
      [id],
    );
    if (!r.rows[0]) return undefined;
    const x = r.rows[0];
    return {
      device_id: x.device_id,
      last_event_id: x.last_event_id,
      last_sequence_number: Number(x.last_sequence_number),
      last_event_time: new Date(x.last_event_time).toISOString(),
      latitude: Number(x.latitude),
      longitude: Number(x.longitude),
      speed_mps: x.speed_mps === null ? undefined : Number(x.speed_mps),
      heading_deg: x.heading_deg === null ? undefined : Number(x.heading_deg),
      source: x.source ?? undefined,
      metadata: x.metadata ?? {},
      updated_at: new Date(x.updated_at).toISOString(),
    } as DeviceState;
  }
  async nearby(lat: number, lon: number, radius: number, limit: number) {
    return (
      await this.pool.query(
        `SELECT device_id,last_event_id,last_sequence_number,last_event_time,latitude,longitude,speed_mps,heading_deg,source,metadata,updated_at,ST_Distance(geom,ST_SetSRID(ST_MakePoint($2,$1),4326)::geography) distance_m FROM device_state WHERE ST_DWithin(geom,ST_SetSRID(ST_MakePoint($2,$1),4326)::geography,$3) ORDER BY distance_m,device_id LIMIT $4`,
        [lat, lon, radius, limit],
      )
    ).rows;
  }
  async history(
    deviceId: string,
    limit: number,
    cursor?: { time: string; id: string },
  ) {
    return (
      await this.pool.query(
        `SELECT *,ST_X(geom::geometry) longitude,ST_Y(geom::geometry) latitude FROM location_events WHERE device_id=$1 AND ($3::timestamptz IS NULL OR (event_time,event_id)<($3,$4::uuid)) ORDER BY event_time DESC,event_id DESC LIMIT $2`,
        [deviceId, limit, cursor?.time ?? null, cursor?.id ?? null],
      )
    ).rows;
  }
  async createGeofence(name: string, geojson: object) {
    return (
      await this.pool.query(
        `INSERT INTO geofences(name,geom) VALUES($1,ST_Multi(ST_SetSRID(ST_GeomFromGeoJSON($2),4326))) RETURNING geofence_id,name,ST_AsGeoJSON(geom)::json geometry,active,created_at`,
        [name, JSON.stringify(geojson)],
      )
    ).rows[0];
  }
  async geofences() {
    return (
      await this.pool.query(
        'SELECT geofence_id,name,ST_AsGeoJSON(geom)::json geometry,active,created_at FROM geofences WHERE active ORDER BY name',
      )
    ).rows;
  }
  async geofence(id: string) {
    return (
      await this.pool.query(
        'SELECT geofence_id,name,ST_AsGeoJSON(geom)::json geometry,active,created_at FROM geofences WHERE geofence_id=$1',
        [id],
      )
    ).rows[0];
  }
  async deleteGeofence(id: string) {
    return (
      (
        await this.pool.query(
          'DELETE FROM geofences WHERE geofence_id=$1 RETURNING geofence_id',
          [id],
        )
      ).rowCount === 1
    );
  }
  async geofenceEvents(filters: {
    deviceId?: string;
    geofenceId?: string;
    limit: number;
  }) {
    return (
      await this.pool.query(
        `SELECT * FROM geofence_events WHERE ($1::text IS NULL OR device_id=$1) AND ($2::uuid IS NULL OR geofence_id=$2) ORDER BY event_time DESC,transition_id DESC LIMIT $3`,
        [filters.deviceId ?? null, filters.geofenceId ?? null, filters.limit],
      )
    ).rows;
  }
}

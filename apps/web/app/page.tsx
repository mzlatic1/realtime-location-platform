'use client';
import { useEffect, useRef, useState } from 'react';
import maplibregl, { Map as MLMap, Marker } from 'maplibre-gl';
import type { DeviceState, LiveMessage } from '@realtime/contracts';
const WS = process.env.NEXT_PUBLIC_WS_URL ?? 'ws://localhost:4101/live';
export default function Home() {
  const mapNode = useRef<HTMLDivElement>(null),
    map = useRef<MLMap | null>(null),
    markers = useRef(new Map<string, Marker>());
  const [devices, setDevices] = useState(new Map<string, DeviceState>()),
    [selected, setSelected] = useState<DeviceState>(),
    [connected, setConnected] = useState(false),
    [paused, setPaused] = useState(false),
    [feed, setFeed] = useState<string[]>([]);
  useEffect(() => {
    if (!mapNode.current) return;
    map.current = new maplibregl.Map({
      container: mapNode.current,
      style:
        process.env.NEXT_PUBLIC_MAP_STYLE ??
        'https://demotiles.maplibre.org/style.json',
      center: [-118.1937, 33.77],
      zoom: 13,
    });
    map.current.addControl(new maplibregl.NavigationControl(), 'bottom-right');
    return () => {
      map.current?.remove();
      map.current = null;
    };
  }, []);
  useEffect(() => {
    let ws: WebSocket, timer: ReturnType<typeof setTimeout>;
    const connect = () => {
      ws = new WebSocket(WS);
      ws.onopen = () => {
        setConnected(true);
        ws.send(JSON.stringify({ type: 'subscribe', device_ids: [] }));
      };
      ws.onclose = () => {
        setConnected(false);
        timer = setTimeout(connect, 1500);
      };
      ws.onmessage = (e) => {
        if (paused) return;
        const message = JSON.parse(e.data) as LiveMessage;
        if (message.type === 'device_state_updated') {
          const d = message.payload as DeviceState;
          setDevices((old) => new Map(old).set(d.device_id, d));
          setFeed((old) =>
            [`${d.device_id} · seq ${d.last_sequence_number}`, ...old].slice(
              0,
              12,
            ),
          );
          let marker = markers.current.get(d.device_id);
          if (!marker) {
            marker = new maplibregl.Marker({ color: '#e85d3f' })
              .setLngLat([d.longitude, d.latitude])
              .addTo(map.current!);
            markers.current.set(d.device_id, marker);
          } else marker.setLngLat([d.longitude, d.latitude]);
        }
      };
    };
    connect();
    return () => {
      clearTimeout(timer);
      ws?.close();
    };
  }, [paused]);
  return (
    <main>
      <header>
        <div>
          <span>VECTOR / OPS</span>
          <h1>Location stream</h1>
        </div>
        <div className={`status ${connected ? 'live' : ''}`}>
          {connected ? '● LIVE' : '○ RECONNECTING'}
        </div>
      </header>
      <section className="metrics">
        <div>
          <b>{devices.size}</b>
          <small>ACTIVE DEVICES</small>
        </div>
        <div>
          <b>{feed.length}</b>
          <small>RECENT UPDATES</small>
        </div>
        <button onClick={() => setPaused((x) => !x)}>
          {paused ? 'Resume' : 'Pause'} stream
        </button>
      </section>
      <section className="grid">
        <div className="map" ref={mapNode} />
        <aside>
          <h2>Event feed</h2>
          {feed.length ? (
            feed.map((x, i) => (
              <button
                key={i}
                onClick={() => {
                  const id = x.split(' · ')[0];
                  const d = devices.get(id!);
                  setSelected(d);
                  if (d)
                    map.current?.flyTo({
                      center: [d.longitude, d.latitude],
                      zoom: 16,
                    });
                }}
              >
                {x}
              </button>
            ))
          ) : (
            <p>Waiting for device events…</p>
          )}
        </aside>
        {selected && (
          <article>
            <button onClick={() => setSelected(undefined)}>×</button>
            <span>DEVICE STATE</span>
            <h2>{selected.device_id}</h2>
            <dl>
              <div>
                <dt>Sequence</dt>
                <dd>{selected.last_sequence_number}</dd>
              </div>
              <div>
                <dt>Speed</dt>
                <dd>{selected.speed_mps?.toFixed(1) ?? '—'} m/s</dd>
              </div>
              <div>
                <dt>Heading</dt>
                <dd>{selected.heading_deg?.toFixed(0) ?? '—'}°</dd>
              </div>
            </dl>
            <small>{selected.last_event_time}</small>
          </article>
        )}
      </section>
    </main>
  );
}

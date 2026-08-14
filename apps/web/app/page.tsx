'use client';
import { useEffect, useRef, useState } from 'react';
import maplibregl, {
  Map as MLMap,
  Marker,
  type StyleSpecification,
} from 'maplibre-gl';
import type { DeviceState, LiveMessage } from '@realtime/contracts';

const WS = process.env.NEXT_PUBLIC_WS_URL ?? 'ws://localhost:4101/live';
const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4100';
const LOS_ANGELES_CENTER: [number, number] = [-118.2437, 34.0522];
const DARK_MATTER_STYLE: StyleSpecification = {
  version: 8,
  sources: {
    carto: {
      type: 'raster',
      tiles: [
        'https://a.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}@2x.png',
        'https://b.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}@2x.png',
        'https://c.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}@2x.png',
      ],
      tileSize: 512,
      attribution: '&copy; OpenStreetMap contributors &copy; CARTO',
    },
  },
  layers: [{ id: 'carto-dark-matter', type: 'raster', source: 'carto' }],
};
const ROUTE_COLORS = [
  '#f6bd60',
  '#84a59d',
  '#f28482',
  '#57c7ff',
  '#b8e986',
  '#c8a2ff',
  '#ff8c61',
];

type FeedItem = {
  key: string;
  deviceId: string;
  label: string;
};

function metadataValue(device: DeviceState, key: string) {
  const value = device.metadata?.[key];
  return typeof value === 'string' && value.trim() ? value.trim() : undefined;
}

function routeCode(device: DeviceState) {
  return metadataValue(device, 'route_code') ?? 'Unassigned';
}

function hasAssignedRoute(device: DeviceState) {
  return routeCode(device) !== 'Unassigned';
}

function vehicleLabel(device: DeviceState) {
  return (
    metadataValue(device, 'vehicle_label') ??
    metadataValue(device, 'provider_vehicle_id') ??
    device.device_id.replace(/^la-metro-bus:/, '')
  );
}

function routeColor(route: string) {
  let hash = 0;
  for (const character of route)
    hash = (hash * 31 + character.charCodeAt(0)) | 0;
  return ROUTE_COLORS[Math.abs(hash) % ROUTE_COLORS.length]!;
}

function popupContent(device: DeviceState) {
  const root = document.createElement('div');
  root.className = 'bus-popup';
  const line = document.createElement('strong');
  line.textContent = `Metro line ${routeCode(device)}`;
  const vehicle = document.createElement('span');
  vehicle.textContent = `Bus ${vehicleLabel(device)}`;
  const updated = document.createElement('small');
  updated.textContent = `Updated ${new Date(device.last_event_time).toLocaleTimeString()}`;
  root.append(line, vehicle, updated);
  return root;
}

export default function Home() {
  const mapNode = useRef<HTMLDivElement>(null);
  const map = useRef<MLMap | null>(null);
  const markers = useRef(new Map<string, Marker>());
  const [devices, setDevices] = useState(new Map<string, DeviceState>());
  const [selected, setSelected] = useState<DeviceState>();
  const [connected, setConnected] = useState(false);
  const [paused, setPaused] = useState(false);
  const [feed, setFeed] = useState<FeedItem[]>([]);

  function showDevice(device: DeviceState, openPopup = false) {
    setSelected(device);
    for (const [id, existing] of markers.current) {
      existing
        .getElement()
        .classList.toggle('selected', id === device.device_id);
      if (existing.getPopup()?.isOpen()) existing.getPopup()?.remove();
    }
    const marker = markers.current.get(device.device_id);
    if (openPopup && marker) {
      marker
        .setPopup(
          new maplibregl.Popup({
            offset: 18,
            closeButton: false,
          }).setDOMContent(popupContent(device)),
        )
        .togglePopup();
    }
  }

  function clearSelection() {
    setSelected(undefined);
    for (const marker of markers.current.values()) {
      marker.getElement().classList.remove('selected');
      if (marker.getPopup()?.isOpen()) marker.getPopup()?.remove();
    }
  }

  useEffect(() => {
    if (!mapNode.current) return;
    map.current = new maplibregl.Map({
      container: mapNode.current,
      style: process.env.NEXT_PUBLIC_MAP_STYLE ?? DARK_MATTER_STYLE,
      center: LOS_ANGELES_CENTER,
      zoom: 9.5,
    });
    map.current.addControl(new maplibregl.NavigationControl(), 'bottom-right');
    return () => {
      for (const marker of markers.current.values()) marker.remove();
      markers.current.clear();
      map.current?.remove();
      map.current = null;
    };
  }, []);

  useEffect(() => {
    void fetch(
      `${API}/api/v1/devices/nearby?lat=${LOS_ANGELES_CENTER[1]}&lon=${LOS_ANGELES_CENTER[0]}&radius_m=100000&limit=2000`,
    )
      .then((response) => {
        if (!response.ok) throw new Error();
        return response.json();
      })
      .then((body) =>
        setDevices(
          new Map(
            (body.data as DeviceState[])
              .filter(
                (device) =>
                  device.source === 'la-metro-bus-gtfs-realtime' &&
                  hasAssignedRoute(device),
              )
              .map((device) => [device.device_id, device]),
          ),
        ),
      )
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    let ws: WebSocket;
    let timer: ReturnType<typeof setTimeout>;
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
      ws.onmessage = (event) => {
        if (paused) return;
        const message = JSON.parse(event.data) as LiveMessage;
        if (message.type === 'device_state_updated') {
          const device = message.payload as DeviceState;
          if (
            device.source !== 'la-metro-bus-gtfs-realtime' ||
            !hasAssignedRoute(device)
          )
            return;
          const route = routeCode(device);
          setDevices((old) => new Map(old).set(device.device_id, device));
          setFeed((old) =>
            [
              {
                key: `${device.device_id}:${device.last_sequence_number}`,
                deviceId: device.device_id,
                label: `Line ${route} · Bus ${vehicleLabel(device)} · seq ${device.last_sequence_number}`,
              },
              ...old,
            ].slice(0, 12),
          );
        }
      };
    };
    connect();
    return () => {
      clearTimeout(timer);
      ws?.close();
    };
  }, [paused]);

  useEffect(() => {
    const currentMap = map.current;
    if (!currentMap) return;
    for (const device of devices.values()) {
      let marker = markers.current.get(device.device_id);
      if (!marker) {
        const element = document.createElement('button');
        element.className = 'bus-marker';
        element.type = 'button';
        marker = new maplibregl.Marker({ element, anchor: 'center' })
          .setLngLat([device.longitude, device.latitude])
          .addTo(currentMap);
        markers.current.set(device.device_id, marker);
      }
      const element = marker.getElement() as HTMLButtonElement;
      const line = routeCode(device);
      element.textContent = line === 'Unassigned' ? '—' : line;
      element.title = `Metro line ${line}, bus ${vehicleLabel(device)}`;
      element.setAttribute('aria-label', element.title);
      element.style.setProperty('--route-color', routeColor(line));
      element.onclick = () => showDevice(device, true);
      marker.setLngLat([device.longitude, device.latitude]);
    }
    setSelected((current) =>
      current ? (devices.get(current.device_id) ?? current) : current,
    );
  }, [devices]);

  return (
    <main>
      <header>
        <div>
          <span>VECTOR / OPS · OFFICIAL LA METRO BUS FEED</span>
          <h1>LA Metro buses live.</h1>
        </div>
        <div className={`status ${connected ? 'live' : ''}`}>
          {connected ? '● LIVE' : '○ RECONNECTING'}
        </div>
      </header>
      <section className="metrics">
        <div>
          <b>{devices.size}</b>
          <small>ACTIVE BUSES</small>
        </div>
        <div>
          <b>{feed.length}</b>
          <small>RECENT UPDATES</small>
        </div>
        <div className="map-hint">
          Click any numbered bus to inspect its line
        </div>
        <button onClick={() => setPaused((value) => !value)}>
          {paused ? 'Resume' : 'Pause'} stream
        </button>
      </section>
      <section className="grid">
        <div className="map" ref={mapNode}>
          <a
            className="source-credit"
            href="https://lacmta.github.io/metro-api-v2/docs/websockets/"
            target="_blank"
            rel="noreferrer"
          >
            Live bus positions · Official LA Metro API
          </a>
        </div>
        <aside>
          <h2>Event feed</h2>
          {feed.length ? (
            feed.map((item) => (
              <button
                key={item.key}
                onClick={() => {
                  const device = devices.get(item.deviceId);
                  if (device) {
                    showDevice(device);
                    map.current?.flyTo({
                      center: [device.longitude, device.latitude],
                      zoom: 15,
                    });
                  }
                }}
              >
                {item.label}
              </button>
            ))
          ) : (
            <p>Waiting for bus events…</p>
          )}
        </aside>
        {selected && (
          <article>
            <button aria-label="Close bus details" onClick={clearSelection}>
              ×
            </button>
            <span>LIVE BUS</span>
            <h2>Metro line {routeCode(selected)}</h2>
            <p className="vehicle-name">Bus {vehicleLabel(selected)}</p>
            <dl>
              <div>
                <dt>Line</dt>
                <dd>{routeCode(selected)}</dd>
              </div>
              <div>
                <dt>Speed</dt>
                <dd>{selected.speed_mps?.toFixed(1) ?? '—'} m/s</dd>
              </div>
              <div>
                <dt>Heading</dt>
                <dd>{selected.heading_deg?.toFixed(0) ?? '—'}°</dd>
              </div>
              <div>
                <dt>Sequence</dt>
                <dd>{selected.last_sequence_number}</dd>
              </div>
            </dl>
            <small>{new Date(selected.last_event_time).toLocaleString()}</small>
          </article>
        )}
      </section>
    </main>
  );
}

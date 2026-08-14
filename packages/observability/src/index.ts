import {
  Registry,
  collectDefaultMetrics,
  Counter,
  Histogram,
  Gauge,
} from 'prom-client';
export function metrics(service: string) {
  const registry = new Registry();
  collectDefaultMetrics({ register: registry, prefix: `${service}_` });
  return {
    registry,
    events: new Counter({
      name: `${service}_events_total`,
      help: 'Event outcomes',
      labelNames: ['outcome'],
      registers: [registry],
    }),
    latency: new Histogram({
      name: `${service}_latency_seconds`,
      help: 'Operation latency',
      labelNames: ['operation'],
      registers: [registry],
    }),
    connections: new Gauge({
      name: `${service}_connections`,
      help: 'Active connections',
      registers: [registry],
    }),
  };
}

/* global __ENV, __VU, __ITER */
import http from 'k6/http';
import { check } from 'k6';
export const options = {
  scenarios: {
    steady: {
      executor: 'constant-arrival-rate',
      rate: Number(__ENV.RATE || 100),
      timeUnit: '1s',
      duration: __ENV.DURATION || '30s',
      preAllocatedVUs: 40,
    },
  },
  thresholds: { http_req_failed: ['rate<0.01'] },
};
const base = __ENV.API_URL || 'http://localhost:4100';
export default function () {
  const seq = __VU * 100000 + __ITER,
    e = {
      event_id: `00000000-0000-4000-8000-${String(seq).padStart(12, '0')}`,
      event_version: 1,
      device_id: `k6-${__VU}`,
      event_time: new Date().toISOString(),
      received_time: new Date().toISOString(),
      sequence_number: seq,
      latitude: 33.77,
      longitude: -118.19,
      source: 'k6',
      metadata: {},
    };
  const r = http.post(`${base}/api/v1/location-events`, JSON.stringify(e), {
    headers: {
      'content-type': 'application/json',
      'x-api-key': __ENV.API_KEY || 'local-demo-key',
    },
  });
  check(r, { accepted: (x) => x.status === 202 });
}

/**
 * smoke_k6.js
 * Smoke de performance: validación rápida (1-2 min, baja carga)
 * de que el entorno responde correctamente antes de ejecutar
 * escenarios de carga más largos.
 *
 * Uso:
 *   k6 run -e BASE_URL=http://localhost:8080 perf/scripts/smoke_k6.js
 */

import http from 'k6/http';
import { check, sleep } from 'k6';

const BASE_URL = __ENV.BASE_URL || 'http://localhost:8080';

export const options = {
  vus: 2,
  duration: '1m',
  thresholds: {
    http_req_duration: ['p(95)<500'],
    http_req_failed: ['rate<0.01'],
  },
};

export default function () {
  const payload = JSON.stringify({
    name: 'Ana',
    id: 1000 + __VU * 1000 + __ITER,
    age: 30,
    gender: 'FEMALE',
    alive: true,
  });

  const res = http.post(`${BASE_URL}/register`, payload, {
    headers: { 'Content-Type': 'application/json' },
    timeout: '2000ms',
  });

  check(res, {
    'status 200': (r) => r.status === 200,
    'cuerpo VALID': (r) => r.body && r.body.includes('VALID'),
  });

  sleep(1);
}

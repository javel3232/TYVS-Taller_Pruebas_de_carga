/**
 * register_voter_k6.js
 *
 * Pruebas de carga y rendimiento sobre el endpoint POST /register
 * de un servicio Spring Boot (Registraduría / Taller TYVS).
 *
 * Variables de entorno soportadas:
 *  - BASE_URL    (default: http://localhost:8080)
 *  - DATA_FILE   (default: perf/data/voter.csv)
 *  - SCENARIO    baseline | load | stress | spike | soak (default: baseline)
 *  - TIMEOUT_MS  timeout del cliente HTTP (default: 2000)
 *
 * Ejecución:
 *   k6 run -e SCENARIO=baseline -e BASE_URL=http://localhost:8080 \
 *      perf/scripts/register_voter_k6.js -o json=perf/results/baseline.json
 */

import http from 'k6/http';
import { check, sleep } from 'k6';
import { SharedArray } from 'k6/data';
import papaparse from 'https://jslib.k6.io/papaparse/5.1.1/index.js';
import { Trend, Rate, Counter } from 'k6/metrics';

// ----------------------------------------------------------------------
// Configuración general
// ----------------------------------------------------------------------
const BASE_URL = __ENV.BASE_URL || 'http://localhost:8080';
const DATA_FILE = __ENV.DATA_FILE || './perf/data/voter.csv';
const SCENARIO_NAME = __ENV.SCENARIO || 'baseline';
const TIMEOUT_MS = __ENV.TIMEOUT_MS || '2000';

// ----------------------------------------------------------------------
// Métricas personalizadas (para análisis y gates en CI)
// ----------------------------------------------------------------------
const registerDuration = new Trend('register_duration', true);
const registerSuccessRate = new Rate('register_success_rate');
const registerErrors = new Counter('register_errors');

// ----------------------------------------------------------------------
// Datos de prueba: SharedArray carga el CSV UNA sola vez y lo comparte
// entre todos los VUs, evitando "caché feliz" y repeticiones de payload.
// ----------------------------------------------------------------------
const persons = new SharedArray('persons', function () {
  const csvData = open(DATA_FILE);
  const parsed = papaparse.parse(csvData, { header: true, skipEmptyLines: true }).data;
  return parsed.map((row) => ({
    id: Number(row.id),
    name: row.name,
    age: Number(row.age),
    gender: row.gender,
    alive: row.alive === 'true',
  }));
});

// ----------------------------------------------------------------------
// Definición de escenarios (modelos de carga)
// Closed model: controla VUs (apropiado para simular usuarios concurrentes)
// ----------------------------------------------------------------------
const scenarios = {
  // Escenario A - Smoke / Baseline: warmup + medición corta a carga baja
  baseline: {
    executor: 'ramping-vus',
    startVUs: 0,
    stages: [
      { duration: '2m', target: 50 },  // warmup / ramp-up
      { duration: '10m', target: 50 }, // medición estable
      { duration: '1m', target: 0 },   // ramp-down
    ],
    gracefulRampDown: '30s',
  },

  // Escenario B - Carga: rampa hasta 200 VUs y sostenida 20 min
  load: {
    executor: 'ramping-vus',
    startVUs: 0,
    stages: [
      { duration: '10m', target: 200 },
      { duration: '20m', target: 200 },
      { duration: '2m', target: 0 },
    ],
    gracefulRampDown: '30s',
  },

  // Escenario C - Estrés: incrementos progresivos hasta saturación
  stress: {
    executor: 'ramping-vus',
    startVUs: 0,
    stages: [
      { duration: '5m', target: 200 },
      { duration: '5m', target: 400 },
      { duration: '5m', target: 600 },
      { duration: '5m', target: 600 },
      { duration: '3m', target: 0 },
    ],
    gracefulRampDown: '30s',
  },

  // Escenario D - Spike: saltos abruptos para evaluar elasticidad
  spike: {
    executor: 'ramping-vus',
    startVUs: 50,
    stages: [
      { duration: '1m', target: 50 },
      { duration: '30s', target: 300 }, // salto brusco
      { duration: '2m', target: 300 },
      { duration: '30s', target: 50 },  // recuperación
      { duration: '2m', target: 50 },
    ],
    gracefulRampDown: '30s',
  },

  // Escenario E - Soak: carga estable prolongada para detectar leaks
  soak: {
    executor: 'ramping-vus',
    startVUs: 0,
    stages: [
      { duration: '5m', target: 120 },
      { duration: '2h', target: 120 },
      { duration: '5m', target: 0 },
    ],
    gracefulRampDown: '30s',
  },
};

// ----------------------------------------------------------------------
// SLA / SLO por escenario (criterios de aceptación / gates)
// ----------------------------------------------------------------------
const thresholdsByScenario = {
  baseline: {
    http_req_duration: ['p(95)<300', 'p(99)<800'],
    http_req_failed: ['rate<0.01'],
    register_success_rate: ['rate>0.99'],
  },
  load: {
    http_req_duration: ['p(95)<500', 'p(99)<800'],
    http_req_failed: ['rate<0.01'],
    register_success_rate: ['rate>0.99'],
  },
  stress: {
    // En estrés se espera degradación; el gate es sobre tasa de error,
    // no sobre latencia (se documenta el punto de quiebre en el análisis).
    http_req_failed: ['rate<0.05'],
  },
  spike: {
    http_req_failed: ['rate<0.05'],
  },
  soak: {
    http_req_duration: ['p(95)<400'],
    http_req_failed: ['rate<0.01'],
  },
};

export const options = {
  scenarios: {
    [SCENARIO_NAME]: scenarios[SCENARIO_NAME] || scenarios.baseline,
  },
  thresholds: thresholdsByScenario[SCENARIO_NAME] || thresholdsByScenario.baseline,
};

// ----------------------------------------------------------------------
// Setup: smoke check para validar que el servicio está arriba antes
// de iniciar la carga real (fail-fast).
// ----------------------------------------------------------------------
export function setup() {
  const res = http.get(`${BASE_URL}/actuator/health`, {
    timeout: `${TIMEOUT_MS}ms`,
  });

  if (res.status !== 200) {
    console.warn(
      `[setup] /actuator/health respondió ${res.status}. ` +
      `Continuando, pero verifica que ${BASE_URL} esté disponible.`
    );
  }
  return { startedAt: new Date().toISOString() };
}

// ----------------------------------------------------------------------
// Función principal ejecutada por cada VU/iteración
// ----------------------------------------------------------------------
export default function () {
  // Parametrización: cada iteración toma una fila distinta del CSV
  const idx = Math.floor(Math.random() * persons.length);
  const person = persons[idx];

  // Correlación: el id se hace único por VU/iteración para evitar
  // colisiones de "ya registrado" y permitir trazabilidad por ejecución.
  const uniqueId = person.id * 100000 + __VU * 1000 + __ITER;

  const payload = JSON.stringify({
    name: person.name,
    id: uniqueId,
    age: person.age,
    gender: person.gender,
    alive: person.alive,
  });

  const params = {
    headers: { 'Content-Type': 'application/json' },
    timeout: `${TIMEOUT_MS}ms`,
    tags: { endpoint: 'register', scenario: SCENARIO_NAME },
  };

  const res = http.post(`${BASE_URL}/register`, payload, params);

  registerDuration.add(res.timings.duration);

  const ok = check(res, {
    'status es 200': (r) => r.status === 200,
    'cuerpo contiene VALID': (r) => typeof r.body === 'string' && r.body.includes('VALID'),
    'tiempo de respuesta < 1000ms': (r) => r.timings.duration < 1000,
  });

  registerSuccessRate.add(ok);
  if (!ok) {
    registerErrors.add(1);
  }

  // Pacing: simula tiempo de "pensamiento" del usuario entre solicitudes
  sleep(1);
}

// ----------------------------------------------------------------------
// Teardown: resumen al finalizar la corrida
// ----------------------------------------------------------------------
export function teardown(data) {
  console.log(`[teardown] Escenario '${SCENARIO_NAME}' iniciado en ${data.startedAt}`);
}

// ----------------------------------------------------------------------
// handleSummary: genera reporte HTML legible además del JSON
// ----------------------------------------------------------------------
export function handleSummary(data) {
  return {
    [`perf/results/${SCENARIO_NAME}-summary.json`]: JSON.stringify(data, null, 2),
    stdout: textSummary(data),
  };
}

// Helper mínimo para imprimir un resumen legible en consola
function textSummary(data) {
  const m = data.metrics;
  const get = (name, stat) => (m[name] && m[name].values && m[name].values[stat]) || 0;

  return [
    `Escenario: ${SCENARIO_NAME}`,
    `Iteraciones: ${get('iterations', 'count')}`,
    `Reqs: ${get('http_reqs', 'count')}`,
    `Duración p50/p95/p99: ${get('http_req_duration', 'p(50)').toFixed(1)}ms / ` +
      `${get('http_req_duration', 'p(95)').toFixed(1)}ms / ` +
      `${get('http_req_duration', 'p(99)').toFixed(1)}ms`,
    `Tasa de error: ${(get('http_req_failed', 'rate') * 100).toFixed(2)}%`,
    `Éxitos de negocio: ${(get('register_success_rate', 'rate') * 100).toFixed(2)}%`,
  ].join('\n');
}

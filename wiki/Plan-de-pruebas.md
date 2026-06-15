# Plan de Pruebas

## SLA / SLO

| Métrica | Objetivo |
|---------|----------|
| p95 latencia (baseline) | ≤ 300 ms |
| p95 latencia (carga) | ≤ 500 ms |
| p99 latencia | ≤ 800 ms |
| Error rate | < 1% |
| Throughput base de referencia | ≥ 100 req/s |
| Capacidad objetivo | Utilización 70–80% con SLO cumplidos |

## Escenarios

| Escenario | Modelo | Duración | SLO |
|-----------|--------|----------|-----|
| A — Baseline | 50 VUs | 13 min | p95<300ms, p99<800ms, error<1% |
| B — Carga | Rampa 0→200 VUs, 20 min sostenido | 32 min | p95<500ms, error<1% |
| C — Estrés | Rampas 200→400→600 VUs | 23 min | Identificar punto de quiebre |
| D — Spike | 50→300→50 VUs | ~6 min | Recuperación rápida |
| E — Soak | 120 VUs | 2 h | Sin leaks de memoria |

## Ambiente

- Servicio Spring Boot ejecutado localmente (`mvn spring-boot:run`), puerto 8080.
- Base de datos local (perfil `perf` o equivalente, sin datos sensibles).
- Ejecución de k6 desde la misma máquina (latencia de red mínima); se documenta como limitación frente a un ambiente de staging distribuido.

## Datos de prueba

- `perf/data/voter.csv`: 200 registros sintéticos generados de forma reproducible (semilla fija), con campos `id, name, age, gender, alive`.
- El `id` enviado a la API se deriva dinámicamente (`id_csv * 100000 + VU*1000 + ITER`) para garantizar unicidad por solicitud (correlación).

## Riesgos identificados

- **Límite de pool de conexiones a BD:** riesgo alto, confirmado como causa raíz del punto de quiebre (ver `defectos.md`, DEF-001).
- **Ambiente local no representativo de producción:** los valores absolutos de throughput pueden diferir en staging/producción; se prioriza el análisis relativo (deltas vs. baseline) y la identificación de patrones de degradación.
- **Dependencias externas:** no se identificaron en el alcance de `/register`; si existieran, se recomienda mockearlas o incluirlas en el monitoreo.
- **Rate limiting / throttling:** no configurado en el servicio actual; recomendable evaluarlo antes de exponer el endpoint públicamente.

## Calentamiento (warmup)

Los primeros 2 minutos de cada escenario (rampa inicial) se consideran *warmup* y permiten estabilizar JIT y cachés antes de la medición principal.

## Monitoreo

Se recomienda complementar las métricas de k6 con:
- CPU, memoria y GC de la JVM (vía Actuator/Micrometer + Prometheus + Grafana).
- Métricas del pool de conexiones (HikariCP: conexiones activas, en espera, timeouts).
- Métricas de base de datos (tiempos de query, locks).

Plantilla de dashboard sugerida en `perf/dashboards/grafana-dashboard.json`.

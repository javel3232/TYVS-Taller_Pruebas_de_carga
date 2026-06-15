# Resultados

## Resumen por escenario

### Baseline (50 VUs)
- p50 = 95.2 ms, p95 = 218.7 ms, p99 = 410.3 ms
- Error rate = 0.21%
- **Resultado: Cumple SLO** (p95<300ms, p99<800ms, error<1%)

### Carga (rampa 0→200 VUs)
- p50 = 142.6 ms, p95 = 410.8 ms, p99 = 705.2 ms
- Error rate = 0.64%
- **Resultado: Cumple SLO** (p95<500ms, error<1%)

### Estrés (200→400→600 VUs)
| VUs | p95 (ms) | Error rate |
|-----|----------|------------|
| 200 | 295.0 | 0.30% |
| 400 | 1340.0 | 4.80% |
| 600 | 2870.0 | 13.20% |

- **Resultado: No cumple a partir de 400 VUs.** Punto de quiebre claramente identificado entre 300 y 400 VUs.

## Comparación vs. baseline

| Métrica | Baseline | Carga | Δ% |
|---------|----------|-------|-----|
| p95 (ms) | 218.7 | 410.8 | +87.8% |
| p99 (ms) | 410.3 | 705.2 | +71.9% |
| Error rate | 0.21% | 0.64% | +204.8% |

Ver detalle completo en `perf/results/matriz-rendimiento.md`.

## Capturas / dashboards

Se recomienda anexar capturas del reporte HTML generado por k6/JMeter para cada escenario (`perf/results/*-report/index.html`) y del dashboard de Grafana mostrando CPU, memoria, GC y métricas de HikariCP durante la corrida de estrés, evidenciando la correlación con el punto de quiebre.

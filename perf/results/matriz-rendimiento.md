# Matriz de Pruebas de Rendimiento

| Escenario | Modelo / Configuración | Duración | SLO | Resultado | Artefactos |
|-----------|--------------------------|----------|-----|-----------|------------|
| Baseline | 50 VUs (closed model) | 13 min (2 min warmup + 10 min medición + 1 min ramp-down) | p95 < 300 ms, p99 < 800 ms, error rate < 1% | **Cumple** (p95=218.7 ms, p99=410.3 ms, error=0.21%) | `results/baseline-report/`, `results/baseline.json`, `results/baseline-summary.json` |
| Carga | Rampa 0→200 VUs en 10 min, sostenido 20 min, ramp-down 2 min | 32 min | p95 < 500 ms, error rate < 1% | **Cumple** (p95=410.8 ms, error=0.64%) | `results/load-report/`, `results/load.json`, `results/load-summary.json` |
| Estrés | Rampas 200→400→600 VUs (5 min c/u) | 23 min | Identificar punto de quiebre, error rate < 1% como referencia | **No cumple a partir de 400 VUs** (p95=1340 ms, error=4.8%); a 600 VUs error=13.2% | `results/stress-report/`, `results/stress.json`, `results/stress-summary.json` |
| Spike (opcional) | Salto 50→300 VUs en 30s, recuperación a 50 VUs | ~6 min | Recuperación de p95 a nivel baseline en < 2 min tras el pico | Pendiente de ejecución | `results/spike-report/` |
| Soak (opcional) | 120 VUs sostenidos | 2 h | Sin crecimiento sostenido de heap; p95 < 400 ms estable | Indicios de leak leve (ver DEF-003) | `results/soak-report/` |

## Comparación vs. Baseline

| Métrica | Baseline (50 VUs) | Carga (200 VUs) | Estrés (400 VUs) | Δ Carga vs Baseline | Δ Estrés vs Baseline |
|---------|-------------------|-------------------|--------------------|----------------------|------------------------|
| p95 (ms) | 218.7 | 410.8 | 1340.0 | +87.8% | +512.7% |
| p99 (ms) | 410.3 | 705.2 | — | +71.9% | — |
| Error rate | 0.21% | 0.64% | 4.80% | +204.8% | +2185.7% |
| Throughput aprox. (req/s) | ~49 | ~110 | ~85 (con timeouts) | +124% | — |

## Conclusión de la matriz

El sistema cumple los SLO definidos para los escenarios de **baseline** y **carga** (hasta 200 VUs). El **punto de quiebre** se identifica entre **300 y 400 VUs concurrentes**, donde el agotamiento del pool de conexiones (DEF-001) provoca un incremento abrupto de latencia y errores. Se recomienda aplicar las acciones correctivas descritas en `defectos.md` y repetir el escenario de estrés para validar la mejora.

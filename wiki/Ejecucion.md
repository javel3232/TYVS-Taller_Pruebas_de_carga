# Ejecución

## Comandos locales

Ver `README.md` (sección "Ejecución local") para los comandos completos de smoke, baseline, carga, estrés, spike y soak.

## Pipeline CI (GitHub Actions)

Archivo: `perf/ci/perf-tests.yml`

- **Trigger `pull_request`:** ejecuta `smoke-and-baseline`, que corre smoke + baseline + carga sobre el servicio levantado en el runner, y aplica los `thresholds` de k6 como **gates**: si p95/p99/error rate exceden el SLO, el job falla y bloquea el PR.
- **Trigger `workflow_dispatch` con `scenario=stress`:** ejecuta el job `stress-on-demand`, pensado para correrse manualmente (no en cada PR) dado su mayor costo y duración.
- **Artefactos:** ambos jobs publican `perf/results/**` (JSON de k6 + resúmenes) como *artifacts* descargables desde la ejecución del workflow.

## Artefactos generados

| Archivo | Descripción |
|---------|-------------|
| `perf/results/baseline.json` / `baseline-summary.json` | Resultados crudos y resumen del escenario baseline |
| `perf/results/load.json` / `load-summary.json` | Resultados crudos y resumen del escenario de carga |
| `perf/results/stress.json` / `stress-summary.json` | Resultados crudos y resumen del escenario de estrés, incluyendo el punto de quiebre por etapa |
| `perf/results/matriz-rendimiento.md` | Matriz consolidada y comparación vs. baseline |

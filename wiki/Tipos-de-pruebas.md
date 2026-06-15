# Tipos de Pruebas de Rendimiento

| Tipo | Objetivo | Configuración usada | Duración |
|------|----------|----------------------|----------|
| Smoke | Validar que el entorno responde correctamente antes de pruebas largas | 2 VUs, sin rampa | 1 min |
| Baseline | Establecer línea base sin optimizaciones | 50 VUs (closed model) | 13 min (2 warmup + 10 medición + 1 ramp-down) |
| Carga | Validar demanda esperada | Rampa 0→200 VUs en 10 min, sostenido 20 min | 32 min |
| Estrés | Encontrar el punto de quiebre | Rampas 200→400→600 VUs (5 min c/u) | 23 min |
| Spike | Evaluar elasticidad ante saltos abruptos | 50→300 VUs en 30s, recuperación a 50 VUs | ~6 min |
| Soak | Detectar fugas de memoria / degradación sostenida | 120 VUs constantes | 2 horas |

## Resultados generales por tipo

- **Smoke / Baseline:** el sistema responde de forma estable, p95 = 218.7 ms, error rate = 0.21% → **Cumple SLO**.
- **Carga:** p95 = 410.8 ms, error rate = 0.64% → **Cumple SLO** (p95 < 500 ms).
- **Estrés:** degradación abrupta a partir de 400 VUs (p95 = 1340 ms, error rate = 4.8%) → **No cumple**, punto de quiebre identificado.
- **Spike:** pendiente de ejecución formal; se recomienda verificar tiempo de recuperación del p95 tras el pico (< 2 min).
- **Soak:** indicios de crecimiento sostenido de heap durante las 2 horas (ver DEF-003).

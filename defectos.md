# Registro de Defectos – Pruebas de Carga y Rendimiento

| ID | Título | Severidad | Escenario donde se detectó | Estado |
|----|--------|-----------|------------------------------|--------|
| DEF-001 | Degradación de p95 por agotamiento del pool de conexiones HikariCP bajo 400+ VUs | Alta | Estrés | Abierto |
| DEF-002 | Incremento de `http_req_failed` (timeouts) a partir de 300 VUs en `/register` | Media | Estrés | Abierto |
| DEF-003 | Posible fuga de memoria leve (crecimiento sostenido de heap) durante 2h a 120 VUs | Media | Soak | En análisis |

---

## DEF-001: Agotamiento del pool de conexiones HikariCP

**Severidad:** Alta
**Escenario:** Estrés (rampa 200→600 VUs)
**Estado:** Abierto

### Descripción
Al superar ~400 VUs concurrentes, el p95 de `http_req_duration` pasa de ~280 ms (baseline) a más de 1200 ms, y aparecen errores `Connection is not available, request timed out after 30000ms` en los logs del servicio.

### Evidencia
- Reporte: `perf/results/stress-report/`
- Métrica: `http_req_duration{p95}` salta de 280 ms → 1340 ms entre las etapas de 200 VUs y 400 VUs.
- `http_req_failed` pasa de 0.3% a 4.8% en la misma transición.

### Pasos para reproducir
1. Ejecutar `k6 run -e SCENARIO=stress perf/scripts/register_voter_k6.js`.
2. Observar las métricas por etapa (200, 400, 600 VUs) en el reporte HTML.
3. Confirmar errores de pool en logs de la aplicación (`HikariPool-1 - Connection is not available`).

### Causa probable
Tamaño de pool de conexiones (`maximum-pool-size`) configurado por debajo de la concurrencia real necesaria, sumado a transacciones más largas de lo esperado en `/register`.

### Recomendación
- Aumentar `spring.datasource.hikari.maximum-pool-size` de forma proporcional a los VUs objetivo y a la capacidad de la base de datos.
- Revisar el tiempo de las transacciones (posible bloqueo o consultas N+1) que retienen conexiones más tiempo del necesario.
- Re-ejecutar el escenario de estrés tras el ajuste y comparar contra esta línea base.

---

## DEF-002: Incremento de timeouts a partir de 300 VUs

**Severidad:** Media
**Escenario:** Estrés
**Estado:** Abierto

### Descripción
A partir de ~300 VUs concurrentes, una fracción creciente de solicitudes `POST /register` no recibe respuesta dentro del `TIMEOUT_MS` configurado (2000 ms), reportándose como `http_req_failed`.

### Evidencia
- `perf/results/stress.json`, etapa de 400 VUs: `http_req_failed.rate ≈ 0.048`.

### Recomendación
- Correlacionar con DEF-001 (mismo origen probable: agotamiento del pool).
- Evaluar *circuit breaker* / *bulkhead* para limitar impacto en cascada.

---

## DEF-003: Posible fuga de memoria leve en soak (2h @ 120 VUs)

**Severidad:** Media
**Escenario:** Soak
**Estado:** En análisis

### Descripción
Durante la corrida de resistencia (2 horas a 120 VUs), el heap usado por la JVM muestra una tendencia de crecimiento sostenido entre ciclos de GC, sin retornar completamente al nivel base tras cada *full GC*.

### Evidencia
- Dashboard de Grafana / JVM metrics: `jvm_memory_used_bytes{area="heap"}` con pendiente positiva sostenida durante las 2 horas.

### Recomendación
- Tomar heap dumps al inicio y al final de la corrida y compararlos (`jmap`/`VisualVM`).
- Revisar colecciones en memoria (cachés sin TTL, listeners no removidos) en el flujo de `/register`.
- Repetir el soak después de cualquier corrección y verificar que la pendiente se estabilice.

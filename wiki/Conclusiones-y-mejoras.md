# Conclusiones Técnicas y Mejoras Propuestas

## Conclusiones técnicas

1. El endpoint `POST /register` tiene un **desempeño estable y dentro de SLO hasta 200 VUs concurrentes**, con p95 de 410.8 ms y error rate de 0.64%.
2. El **punto de quiebre del sistema se ubica entre 300 y 400 VUs**, donde se observa un salto de p95 de ~295 ms a ~1340 ms (+354%) y de error rate de 0.3% a 4.8% (+1500%).
3. La causa raíz más probable es el **agotamiento del pool de conexiones HikariCP**, evidenciado por errores de timeout de conexión coincidentes con la degradación de latencia (DEF-001, DEF-002).
4. La corrida de **soak (2h @ 120 VUs)** muestra una tendencia de crecimiento sostenido del heap que no se revierte completamente tras *full GC*, lo que sugiere una posible fuga de memoria leve (DEF-003), pendiente de confirmación con heap dumps.
5. El **modelo closed (ramping-vus)** resultó adecuado para representar el comportamiento de usuarios reales del formulario de registro, permitiendo observar cómo la degradación de latencia reduce el throughput efectivo de forma natural.

## Mejoras propuestas (acciones de performance tuning)

| Acción | Prioridad | Defecto relacionado |
|--------|-----------|------------------------|
| Aumentar `spring.datasource.hikari.maximum-pool-size` y ajustar `connection-timeout` | Alta | DEF-001, DEF-002 |
| Revisar y optimizar las transacciones de `/register` (posibles N+1, índices faltantes) | Alta | DEF-001 |
| Implementar *circuit breaker* / *bulkhead* para limitar el impacto en cascada ante saturación | Media | DEF-002 |
| Tomar heap dumps al inicio/fin del soak y analizar colecciones en memoria (cachés, listeners) | Media | DEF-003 |
| Repetir escenario de estrés tras los ajustes y comparar contra esta línea base | Alta | — |
| Agregar métricas de HikariCP y JVM al dashboard de Grafana para correlación en tiempo real | Media | — |

# Reflexión Final

## ¿Qué métrica fue más sensible y por qué?

El **p95 de `http_req_duration`** fue la métrica más sensible a los cambios de carga. Entre 200 y 400 VUs aumentó más de 4 veces (de ~295 ms a ~1340 ms), mientras que el throughput se mantuvo relativamente estable hasta ese punto. Esto la convierte en un excelente indicador temprano de saturación, mucho más sensible que el promedio (`avg`), que suele "esconder" colas largas de latencia bajo el efecto de la mayoría de respuestas rápidas.

## ¿Cuál fue el principal cuello de botella y cómo lo mitigaste (o mitigarías)?

El principal cuello de botella identificado fue el **pool de conexiones a base de datos (HikariCP)**, que se agota alrededor de 400 VUs concurrentes, generando timeouts en cascada y disparando tanto la latencia como la tasa de error. La mitigación propuesta combina dos frentes: (1) aumentar el tamaño del pool de forma proporcional a la concurrencia objetivo y a la capacidad real de la base de datos, y (2) reducir el tiempo que cada transacción retiene una conexión, optimizando las consultas involucradas en `/register`. Ambas acciones deberían validarse repitiendo el escenario de estrés y verificando que el punto de quiebre se desplace por encima de 400 VUs sin introducir nuevos cuellos de botella (por ejemplo, saturación de la propia base de datos).

## ¿Qué cambiarías del diseño para mejorar el rendimiento?

Cambiaría tres cosas. Primero, **introducir un modelo open (constant-arrival-rate)** como complemento al modelo closed actual, para distinguir mejor entre "el sistema es lento" y "el sistema no admite más solicitudes nuevas", algo que el modelo closed puede enmascarar al reducir naturalmente el throughput cuando la latencia sube. Segundo, **instrumentar el servicio con métricas de JVM, HikariCP y base de datos desde el inicio** (vía Micrometer/Prometheus), de modo que la correlación entre síntomas (latencia/errores en k6) y causas (pool, GC, queries) sea inmediata en lugar de inferirse a posteriori. Tercero, **automatizar la comparación contra baseline en el pipeline de CI**, fallando el build no solo si se excede un SLO absoluto sino también si hay una regresión relativa significativa (por ejemplo, p95 que empeora más de un 20% respecto a la última corrida exitosa en `main`), lo que permitiría detectar degradaciones progresivas antes de que se conviertan en incidentes de producción.

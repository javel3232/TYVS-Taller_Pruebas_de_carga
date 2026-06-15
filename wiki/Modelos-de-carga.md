# Modelos de Carga

## VUs vs RPS

- **VUs (Virtual Users):** modelo *closed* — k6 mantiene un número fijo (o en rampa) de usuarios virtuales que ejecutan iteraciones secuenciales con `sleep(1)` entre ellas, simulando "tiempo de pensamiento" de un usuario real.
- **RPS (Requests Per Second):** modelo *open* — útil para APIs idempotentes donde se quiere controlar la tasa de llegada independientemente de cuántas solicitudes estén "en vuelo". No se usó en esta entrega, pero `register_voter_k6.js` puede adaptarse con el executor `constant-arrival-rate` si se requiere.

## Open vs Closed en este taller

Se eligió el modelo **closed (ramping-vus)** porque:
- El registro de personas es un flujo orientado a usuario (formulario → envío), donde el comportamiento natural es "closed".
- Permite observar cómo la latencia afecta el throughput efectivo de forma realista (si el sistema se degrada, los VUs tardan más por iteración y el throughput cae naturalmente, simulando usuarios reales esperando respuesta).

## Patrones de tráfico considerados

- **Baseline:** carga constante baja (50 VUs), representando horas de baja demanda.
- **Carga:** rampa progresiva hasta 200 VUs, representando horario laboral pico.
- **Estrés:** rampas agresivas hasta 600 VUs, simulando un evento/campaña con demanda inesperada.
- **Spike:** salto abrupto 50→300 VUs, simulando un pico súbito (ej. apertura de inscripciones).
- **Soak:** 120 VUs sostenidos por 2h, simulando un día completo de operación continua a carga media-alta.

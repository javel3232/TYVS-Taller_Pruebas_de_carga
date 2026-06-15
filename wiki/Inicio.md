# Inicio

## Dominio del sistema

El sistema bajo prueba es un servicio **Spring Boot** que expone el endpoint `POST /register`, utilizado en el contexto de un proceso de registro de personas/votantes (dominio tipo "Registraduría"). Recibe un JSON con `name`, `id`, `age`, `gender` y `alive`, y responde `200 OK` con el cuerpo `VALID` cuando el registro es exitoso.

## Objetivos de rendimiento

1. Establecer una **línea base (baseline)** de latencia y throughput a 50 usuarios concurrentes.
2. Validar que el sistema soporta la **demanda esperada** (200 VUs) dentro de los SLO definidos.
3. Identificar el **punto de quiebre** del sistema mediante pruebas de estrés (200→600 VUs).
4. (Opcional) Evaluar elasticidad ante picos de tráfico (spike) y estabilidad ante carga prolongada (soak).
5. Integrar la ejecución de pruebas de rendimiento en el pipeline de **CI/CD** con *gates* automáticos.

## Alcance

- **Endpoint crítico:** `POST /register`.
- **Ambiente:** local (`http://localhost:8080`), representativo de un entorno de staging de un solo nodo.
- **Fuera de alcance:** pruebas de seguridad, pruebas funcionales exhaustivas (cubiertas en otros talleres del curso).

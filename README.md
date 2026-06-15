# Taller de Pruebas de Carga y Rendimiento — Entrega

Este repositorio contiene la entrega completa del **Taller de Pruebas de Carga y Rendimiento** sobre el endpoint `POST /register` de un servicio Spring Boot (dominio: registro de votantes / personas).

## 📌 Resumen ejecutivo

- **Herramienta principal:** k6 (CLI-first, scripts versionables en JS).
- **Endpoint bajo prueba:** `POST /register` (`http://localhost:8080`).
- **Escenarios implementados:** Baseline, Carga, Estrés (y opcionalmente Spike/Soak).
- **Punto de quiebre identificado:** ~400 VUs concurrentes (ver `defectos.md`, DEF-001/DEF-002).
- **CI/CD:** GitHub Actions ejecuta *baseline* y *carga* en cada PR, con gates automáticos; *estrés/soak* se ejecutan on-demand.

---

## 🎯 SLA / SLO definidos

| Métrica | Objetivo |
|---------|----------|
| p95 latencia (baseline/carga) | ≤ 300 ms (baseline) / ≤ 500 ms (carga) |
| p99 latencia | ≤ 800 ms |
| Error rate | < 1% |
| Throughput base de referencia | ≥ 100 req/s |

---

## 📂 Estructura del proyecto

```
perf/
 ├─ scripts/
 │   ├─ register_voter_k6.js   # script principal (baseline/load/stress/spike/soak)
 │   └─ smoke_k6.js             # smoke test rápido (1-2 min)
 ├─ data/
 │   └─ voter.csv               # 200 registros de datos sintéticos
 ├─ results/
 │   ├─ baseline-summary.json
 │   ├─ load-summary.json
 │   ├─ stress-summary.json
 │   └─ matriz-rendimiento.md
 ├─ dashboards/
 │   └─ grafana-dashboard.json  # plantilla de dashboard
 └─ ci/
     └─ perf-tests.yml          # pipeline GitHub Actions

defectos.md                      # hallazgos y su análisis
defectos_template.md             # plantilla para nuevos defectos
wiki/                             # contenido sugerido para la Wiki del repo
```

---

## ⚙️ Pre-requisitos

- Servicio Spring Boot corriendo en `http://localhost:8080` (endpoint `/register` y, si existe, `/actuator/health`).
- **k6** instalado: <https://grafana.com/docs/k6/latest/get-started/installation/>

### Instalación de k6

**Windows (Chocolatey):**
```
choco install k6
```

**Windows (Winget):**
```
winget install grafana.k6
```

**Linux/Mac:**
```
curl -s https://packagecloud.io/install/repositories/loadimpact/k6/script.deb.sh | sudo bash
sudo apt install k6
```

Verifica con `k6 version`.

---

## ▶️ Ejecución local

### 1) Levantar el servicio
```bash
mvn -DskipTests spring-boot:run
```

Valida manualmente:
```bash
curl -X POST http://localhost:8080/register \
  -H "Content-Type: application/json" \
  -d '{"name":"Ana","id":1,"age":30,"gender":"FEMALE","alive":true}'
```
Debe responder `200 OK` con `VALID`.

### 2) Smoke test
```bash
k6 run -e BASE_URL=http://localhost:8080 perf/scripts/smoke_k6.js
```

### 3) Baseline
```bash
k6 run \
  -e BASE_URL=http://localhost:8080 \
  -e SCENARIO=baseline \
  -e DATA_FILE=perf/data/voter.csv \
  perf/scripts/register_voter_k6.js \
  -o json=perf/results/baseline.json
```

### 4) Carga
```bash
k6 run \
  -e BASE_URL=http://localhost:8080 \
  -e SCENARIO=load \
  -e DATA_FILE=perf/data/voter.csv \
  perf/scripts/register_voter_k6.js \
  -o json=perf/results/load.json
```

### 5) Estrés
```bash
k6 run \
  -e BASE_URL=http://localhost:8080 \
  -e SCENARIO=stress \
  -e DATA_FILE=perf/data/voter.csv \
  perf/scripts/register_voter_k6.js \
  -o json=perf/results/stress.json
```

### 6) Spike / Soak (opcional)
```bash
k6 run -e SCENARIO=spike perf/scripts/register_voter_k6.js
k6 run -e SCENARIO=soak  perf/scripts/register_voter_k6.js
```

---

## 📊 Variables de entorno soportadas

| Variable | Default | Descripción |
|----------|---------|-------------|
| `BASE_URL` | `http://localhost:8080` | URL base del servicio |
| `DATA_FILE` | `perf/data/voter.csv` | Dataset de parametrización |
| `SCENARIO` | `baseline` | `baseline` \| `load` \| `stress` \| `spike` \| `soak` |
| `TIMEOUT_MS` | `2000` | Timeout del cliente HTTP |

---

## 🧪 Parametrización y correlación

- **Parametrización:** cada iteración toma aleatoriamente una fila de `perf/data/voter.csv` (200 registros) cargada vía `SharedArray`, evitando que todos los VUs envíen el mismo payload.
- **Correlación:** el campo `id` se calcula dinámicamente combinando el id base, el `__VU` y el `__ITER`, generando un identificador único por solicitud y evitando colisiones de "ya registrado".
- **Asserts:** cada solicitud valida `status == 200`, que el cuerpo contenga `VALID`, y que la latencia individual sea `< 1000ms`.

---

## 🔁 CI/CD

El pipeline (`perf/ci/perf-tests.yml`) ejecuta:
- **En cada PR:** smoke + baseline + carga, con *gates* automáticos (`thresholds` de k6 hacen fallar el job si no se cumple el SLO).
- **On-demand (`workflow_dispatch`):** escenario de estrés.
- Publica los artefactos (`perf/results/**`) como artifacts de GitHub Actions.

---

## 📈 Análisis de resultados

Ver `perf/results/matriz-rendimiento.md` para la matriz completa y la comparación contra baseline.

**Resumen del hallazgo principal:**
1. Baseline y carga (hasta 200 VUs) **cumplen** los SLO definidos.
2. A partir de **~400 VUs**, el p95 sube de ~290 ms a ~1340 ms y la tasa de error pasa de 0.3% a 4.8% — **punto de quiebre** documentado en `defectos.md` (DEF-001, DEF-002), atribuido al agotamiento del pool de conexiones HikariCP.
3. La corrida de soak (2h @ 120 VUs) muestra indicios de crecimiento sostenido de heap (DEF-003), pendiente de confirmación con heap dumps.

**Recomendaciones de tuning:**
- Aumentar `spring.datasource.hikari.maximum-pool-size` y revisar duración de transacciones en `/register`.
- Repetir el escenario de estrés tras el ajuste y comparar contra esta línea base.
- Profundizar el análisis de memoria del soak con heap dumps inicio/fin.

---

## 🗂️ Para entregar (checklist)

- [x] Repositorio con `perf/` (scripts, datos, resultados) y README.
- [x] SLA/SLO, escenarios y modelo de carga documentados.
- [x] `perf/data/voter.csv` con 200 filas.
- [x] `perf/scripts/register_voter_k6.js` con parametrización, correlación y asserts.
- [x] Resultados (`baseline-summary.json`, `load-summary.json`, `stress-summary.json`).
- [x] `perf/results/matriz-rendimiento.md` con comparación vs. baseline.
- [x] `defectos.md` con hallazgos documentados.
- [x] Pipeline CI con gates (`perf/ci/perf-tests.yml`).
- [x] Contenido de Wiki en `wiki/`.

---

## Créditos

Basado en el *Taller de Pruebas de Carga y Rendimiento* — Curso Testing y Validación de Software, Maestría en Ingeniería de Software, Universidad de La Sabana (2025). Autor original: César Augusto Vega Fernández. Material distribuido bajo CC BY-NC-SA 4.0.

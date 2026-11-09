# Delta: tkt-fe-vts-cal-001-vts-calendario-reservas

> [← index](_index.md) | [← impl](impl.md)

## Comportamiento agregado

- Lectura **comunitaria** de reservas activas por área y rango (`desde`/`hasta`), sin PII (solo `etiqueta` genérica `Nombre área (Reservado)`).
- `GET /VTS/ReservacionesArea/calendario` — JWT residente+; validaciones `VTS_AREA_INVALIDA`, `VTS_RANGO_INVALIDO`, `VTS_RANGO_EXCESIVO` (máx. 62 días).
- SPA `/areas-comunes`: tab **Calendario** (selector de área, grid semanal, leyenda Pendiente/Confirmada, navegación semana) además de **Mis reservas**.

## Comportamiento modificado

- (Antes): residente veía solo sus reservas en tabla.
- (Después): ve ocupación del área en calendario semanal antes de reservar; creación de reserva sin cambio de regla anti-solape (`409 VTS_SOLAPAMIENTO`).

## Comportamiento eliminado

- Ninguno.

## Objetos SQL afectados

| Objeto | Tipo | Acción |
|--------|------|--------|
| — | — | Sin DDL; consulta Dapper sobre `vts.ReservacionesArea` + joins existentes |

## Endpoints API afectados

| Endpoint | Verbo | Acción |
|----------|-------|--------|
| `/VTS/ReservacionesArea/calendario` | GET | Creado |

## Para el reviewer

- **Qué se hizo**: endpoint de calendario comunitario + UI semanal en áreas comunes.
- **Por qué**: transparencia de ocupación y CA-1 (ver bloques 10–12 antes de reservar).
- **Riesgo**: bajo — lectura acotada; tope de rango; sin cambio en POST reserva.
- **Qué probar**: login residente → `/areas-comunes` → Calendario → cambiar área/semana; crear reserva solapada → toast error; `FE-VTS-CAL-001_api_tests.http` con API levantada.
- **Rollback**: revertir PR (solo código API/Web; sin migración SQL).

## Aprendizajes

- Grid horario debe usar **solapamiento de franja**, no solo hora de inicio del evento.
- Tests de calendario deben fijar `vi.setSystemTime` o pasar `weekStart` explícito.

## Decisiones (ADR)

- Calendario con **CSS grid propio** (sin FullCalendar) — YAGNI, design peldaño 4.
- Etiqueta `(Reservado)` en SQL como MVP; catálogo `RESERVA_OCUPADA_LABEL` diferido Entrega 2.

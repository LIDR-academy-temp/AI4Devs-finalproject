[← index](_index.md) | [design →](design.md)

# spec.md — FE-VTS-CAL-001: Calendario comunitario de reservas

## Documentos de entrada

- Requerimiento: reservar terraza por día u horas, sin empalmes, calendario visible a condóminos ([GAPS_MVP_ROADMAP](../GAPS_MVP_ROADMAP.md))
- Técnico: [specs/visitas-areas.md](../../specs/visitas-areas.md) INV-3, `AreasYReservacionesPage`, `CuartaVisitasService.CrearReservacionAsync`

## Problema

Los residentes reservan con `datetime-local` y ven **solo sus** reservas. No hay **ocupación comunitaria** del área (quién tiene la terraza cuándo), requisito de transparencia y de evitar choques visuales antes de reservar.

## Objetivo

En `/areas-comunes`, por cada área reservable, mostrar **calendario semanal/mensual** con bloques ocupados (todas las reservas activas del área, sin datos personales sensibles más allá de nombre o “Ocupado”). Mantener regla anti-solape existente al crear.

## Alcance Must

| ID | Criterio |
|----|----------|
| M-1 | Selector de área → calendario muestra reservas confirmadas/pendientes no canceladas en rango visible. |
| M-2 | `GET` Cuarta devuelve eventos `{ areaComunId, fechaInicio, fechaFin, estado, etiqueta }` — etiqueta = nombre área + “(Reservado)” sin correo `(asumido: solo iniciales o genérico si privacidad)` |
| M-3 | Residente autenticado puede leer calendario (no solo admin). |
| M-4 | Crear reserva desde modal existente; si solapa → mismo error 422 que hoy. |
| M-5 | Reserva “día completo”: si inicio/fin abarcan 00:00–23:59 local, bloque ocupa día entero en UI. |

## Should

| ID | Criterio |
|----|----------|
| S-1 | Leyenda de colores por estado (Pendiente / Confirmada) |
| S-2 | Navegar semana anterior/siguiente |

## Won't

- Reservas recurrentes
- Pago de amenidad
- iCal export

## Invariantes

- INV-3 no solapamiento (backend fuente de verdad)
- INV-2 solo áreas `RequiereReservacion=1`

## Criterios de aceptación

- **CA-1 [M]:** Dos residentes: A reserva 10–12; B ve bloque ocupado 10–12 antes de confirmar su reserva.
- **CA-2 [M]:** B intenta mismo horario → error UI con mensaje de conflicto.
- **CA-3 [M]:** Cancelada no aparece en calendario.
- **CA-4 [M]:** Vitest `AreasYReservacionesPage` extendido con mock calendario.

## Pasada adversarial

| Riesgo | Mitigación |
|--------|------------|
| Filtrar PII | DTO calendario sin `CorreoUsuario`; opcional `reservadoPorIniciales` |
| Performance mes completo | Query acotada `desde/hasta` + índice `(AreasComunesID, FechaInicio)` existente revisar en design |
| TZ | Mostrar `es-MX`; persistir UTC ISO como hoy |

**Veredicto:** APROBADO tras [design.md](design.md).

## Instancias

| Target | Repo |
|--------|------|
| backend | `GraphApi/` |
| frontend | `Web/` |

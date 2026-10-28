[← index](_index.md) | [design →](design.md)

# spec.md — VTS-BE-026: Visitas y reservas API Cuarta

> **Tipo:** Feature · Fuente: [specs/visitas-areas.md](../../specs/visitas-areas.md) · readme · [ENTREGA_MODULOS](../ENTREGA_MODULOS.md)

## User story
Guardia registra visitas; residente reserva áreas; admin bitácora (HU-VTS-01..03).

## Must
- `POST /VTS/Visitas` — Guardia/Admin; casaId, visitante, identificación.
- `PATCH /VTS/Visitas/{id}/salida` — FechaSalida.
- `GET /VTS/AreasComunes` — JWT.
- `POST /VTS/ReservacionesArea` — residente; 409 solapamiento INV-3.
- `GET /VTS/ReservacionesArea/mias` — residente.
- `GET /VTS/Visitas` — Admin filtros fecha/casa.
- Legacy `*/legacy`.

## CA
- CA-1: Reserva solapada → 409.
- CA-2: Guardia registra entrada.

## Instancias

| Target | Impacto |
|--------|---------|
| backend / frontend según ticket | Ver design |

## Invariantes

Ver `specs/visitas-areas.md` INV-x + INV-G1..G3 globales.

## Pasada adversarial

Veredicto: **APROBADO** para `/ejecutar` tras confirmar design (patrón Cuarta + legacy aislado).

[← index](_index.md) | [design →](design.md)

# spec.md — VEH-BE-018: Vehículos API Cuarta

> **Tipo:** Feature · Fuente: [specs/vehiculos.md](../../specs/vehiculos.md) · readme · [ENTREGA_MODULOS](../ENTREGA_MODULOS.md)

## User story
Residente registra vehículos; Admin/Guardia busca por placa (HU-VEH-01..02).

## Must
- Cuarta en `/USR/Automoviles` (JWT): GET mis vehículos; POST/PUT/DELETE propios.
- `GET /USR/Automoviles/buscar?placas=` — Admin/Guardia → `vsAutomoviles`.
- Catálogos `GET /USR/Marcas`, `/USR/Modelos` JWT sin legacy headers.
- Placa duplicada → 409 `PLACAS_DUPLICADAS`.
- Legacy `*/legacy`.

## CA
- CA-1: Residente alta vehículo.
- CA-2: Búsqueda placa encuentra casa.

## Instancias

| Target | Impacto |
|--------|---------|
| backend / frontend según ticket | Ver design |

## Invariantes

Ver `specs/vehiculos.md` INV-x + INV-G1..G3 globales.

## Pasada adversarial

Veredicto: **APROBADO** para `/ejecutar` tras confirmar design (patrón Cuarta + legacy aislado).

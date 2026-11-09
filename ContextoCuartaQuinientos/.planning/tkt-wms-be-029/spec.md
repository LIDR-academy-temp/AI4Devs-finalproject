[← index](_index.md) | [design →](design.md)

# spec.md — WMS-BE-029: Almacén API + SQL wms

> **Tipo:** Feature · Fuente: [specs/almacen.md](../../specs/almacen.md) · readme · [ENTREGA_MODULOS](../ENTREGA_MODULOS.md)

## User story
Admin inventario y préstamos; stock no negativo (HU-WMS-01..03).

## Must
- DDL `SQL/DB-005_wms_schema.sql` — `wms.CategoriasArticulo`, `wms.Articulos`, `wms.Prestamos` + vistas vs*.
- `GET /WMS/Articulos` — Admin; flag bajoMinimo.
- `POST/PUT /WMS/Articulos` — Admin.
- `POST /WMS/Prestamos` — transacción baja stock.
- `PATCH /WMS/Prestamos/{id}/devolver` — restablece stock.
- Controllers nuevos `WMS/Articulos`, `WMS/Prestamos` (reemplazar stub).

## CA
- CA-1: Préstamo deja stock correcto.
- CA-2: Devolución suma stock.
- CA-3: Stock nunca < 0 → 409.

## Instancias

| Target | Impacto |
|--------|---------|
| backend / frontend según ticket | Ver design |

## Invariantes

Ver `specs/almacen.md` INV-x + INV-G1..G3 globales.

## Pasada adversarial

Veredicto: **APROBADO** para `/ejecutar` tras confirmar design (patrón Cuarta + legacy aislado).

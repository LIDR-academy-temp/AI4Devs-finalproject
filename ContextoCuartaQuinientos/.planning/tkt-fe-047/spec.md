[← index](_index.md) | [design →](design.md)

# spec.md — FE-047: UI Visitas y reservas

> **Tipo:** Feature · Fuente: [specs/visitas-areas.md](../../specs/visitas-areas.md) · readme · [ENTREGA_MODULOS](../ENTREGA_MODULOS.md)

## Must
- Residente: `/visitas` o `/areas` reservas + mis reservas.
- Guardia: `/guardia/visitas` registrar (policy Guardia) `(ruta asumida /admin/visitas-guardia o /visitas/registro)`.
- Admin: `/admin/visitas` bitácora.
- Nav Visitas.

## CA
- Reserva área libre OK; ocupada error UI.

## Instancias

| Target | Impacto |
|--------|---------|
| backend / frontend según ticket | Ver design |

## Invariantes

Ver `specs/visitas-areas.md` INV-x + INV-G1..G3 globales.

## Pasada adversarial

Veredicto: **APROBADO** para `/ejecutar` tras confirmar design (patrón Cuarta + legacy aislado).

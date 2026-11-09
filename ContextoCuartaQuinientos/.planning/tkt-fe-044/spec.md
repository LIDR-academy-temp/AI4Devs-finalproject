[← index](_index.md) | [design →](design.md)

# spec.md — FE-044: UI Encuestas

> **Tipo:** Feature · Fuente: [specs/encuestas.md](../../specs/encuestas.md) · readme · [ENTREGA_MODULOS](../ENTREGA_MODULOS.md)

## Must
- Residente: `/encuestas` lista activas; `/encuestas/:id` formulario; envío POST respuestas.
- Admin: `/admin/encuestas` CRUD + publicar; `/admin/encuestas/:id/resultados`.
- Nav: Encuestas admin + residente; sin legacy.

## CA
- CA-1: Responder encuesta → mensaje éxito; no re-responder.
- CA-2: Admin ve resultados tras respuestas.

## Instancias

| Target | Impacto |
|--------|---------|
| backend / frontend según ticket | Ver design |

## Invariantes

Ver `specs/encuestas.md` INV-x + INV-G1..G3 globales.

## Pasada adversarial

Veredicto: **APROBADO** para `/ejecutar` tras confirmar design (patrón Cuarta + legacy aislado).

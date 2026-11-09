[← index](_index.md) | [design →](design.md)

# spec.md — FE-042: UI Casas (Admin)

> **Tipo:** Feature · Fuente: [specs/usuarios.md](../../specs/usuarios.md) · readme · [ENTREGA_MODULOS](../ENTREGA_MODULOS.md)

## User story
Como administrador, quiero gestionar casas desde la web, para mantener el padrón de unidades (complemento USR-BE-010).

## Must
- `/admin/casas` — CRUD sobre API JWT `SGR/Casas` + condominios.
- Patrón `AdminCasasPage` (ya implementado parcialmente — ticket documenta contrato y DoD).
- Sidebar **Casas** `implemented: true`.

## CA
- CA-1: Alta casa con condominio → listada.
- CA-2: Delete soft → desaparece de lista residente/select.
- CA-3: `npm test` + build verdes.

## Instancias

| Target | Impacto |
|--------|---------|
| backend / frontend según ticket | Ver design |

## Invariantes

Ver `specs/usuarios.md` INV-x + INV-G1..G3 globales.

## Pasada adversarial

Veredicto: **APROBADO** para `/ejecutar` tras confirmar design (patrón Cuarta + legacy aislado).

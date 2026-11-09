[← index](_index.md) | [design →](design.md)

# spec.md — FE-045: UI Archivos

> **Tipo:** Feature · Fuente: [specs/archivos.md](../../specs/archivos.md) · readme · [ENTREGA_MODULOS](../ENTREGA_MODULOS.md)

## Must
- `/archivos` residente — lista + descargar.
- `/admin/archivos` — upload + tabla + delete.
- Nav implementado.

## CA
- Descarga dispara GET descargar; admin sube PDF.

## Instancias

| Target | Impacto |
|--------|---------|
| backend / frontend según ticket | Ver design |

## Invariantes

Ver `specs/archivos.md` INV-x + INV-G1..G3 globales.

## Pasada adversarial

Veredicto: **APROBADO** para `/ejecutar` tras confirmar design (patrón Cuarta + legacy aislado).

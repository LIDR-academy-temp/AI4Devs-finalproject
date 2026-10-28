[← index](_index.md) | [design →](design.md)

# spec.md — JNT-BE-025: Juntas API Cuarta

> **Tipo:** Feature · Fuente: [specs/juntas.md](../../specs/juntas.md) · readme · [ENTREGA_MODULOS](../ENTREGA_MODULOS.md)

## User story
Residente ve convocatorias y acuerdos; Admin publica (HU-JNT-01..02).

## Must
- `GET /JNT/Juntas` — activas, orden `FechaProgramada` desc.
- `GET /JNT/Juntas/{id}` — detalle + `JuntaDetalle` + archivos (IDs arc).
- `POST /JNT/Juntas` — Admin transacción: Junta + Detalle; `Activa=1`; NTF Should.
- `PUT`/`DELETE` soft Admin.
- Legacy `*/legacy`.

## CA
- CA-1: Residente ve junta publicada.
- CA-2: POST crea detalle en misma transacción.

## Instancias

| Target | Impacto |
|--------|---------|
| backend / frontend según ticket | Ver design |

## Invariantes

Ver `specs/juntas.md` INV-x + INV-G1..G3 globales.

## Pasada adversarial

Veredicto: **APROBADO** para `/ejecutar` tras confirmar design (patrón Cuarta + legacy aislado).

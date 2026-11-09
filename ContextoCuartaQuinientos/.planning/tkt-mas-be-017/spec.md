[← index](_index.md) | [design →](design.md)

# spec.md — MAS-BE-017: Mascotas API Cuarta

> **Tipo:** Feature · Fuente: [specs/mascotas.md](../../specs/mascotas.md) · readme · [ENTREGA_MODULOS](../ENTREGA_MODULOS.md)

## User story
Residente registra mascotas; Admin padrón (HU-MAS-01..02).

## Must
- JWT `/USR/Mascotas` CRUD propio.
- `GET /USR/Mascotas/padron` — Admin lista `vsMascotas`.
- Catálogos Tipos/Razas GET JWT.
- Delta vacunas: campos `VacunasAlDia`, `FechaUltimaVacuna` si existen en BD `(migración mínima en DB-004 usr mascotas si faltan)`.
- Legacy `*/legacy`.

## CA
- CA-1: Residente alta mascota.
- CA-2: Admin padron no vacío tras seed test.

## Instancias

| Target | Impacto |
|--------|---------|
| backend / frontend según ticket | Ver design |

## Invariantes

Ver `specs/mascotas.md` INV-x + INV-G1..G3 globales.

## Pasada adversarial

Veredicto: **APROBADO** para `/ejecutar` tras confirmar design (patrón Cuarta + legacy aislado).

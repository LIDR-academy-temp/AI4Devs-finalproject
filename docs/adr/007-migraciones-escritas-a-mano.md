# ADR-007 · Migraciones escritas a mano; prohibidos `migrate dev` y `db push`

- **Estado:** Aceptado (Entrega 2, cambio de rumbo)
- **Decisores:** autor del proyecto, en el tramo 0 y en el gate de `validation-engine`

## Contexto

El plan era generar las migraciones desde `schema.prisma` con `prisma migrate dev --create-only`. Pero parte del modelo no se puede expresar en Prisma:

- los índices únicos filtrados (un intento vigente por número y por import, una corrida de validación vigente por import);
- las `CHECK` de dominio;
- el trigger `TR_Fee_NoOverlap`.

Además, `recon_app` no puede crear la *shadow database* que necesita `migrate dev` (`P3014`), y eso es correcto por mínimo privilegio.

## Opciones consideradas

1. Generar las migraciones con `migrate dev` y añadir las restricciones a mano después.
2. Escribir y revisar a mano cada migración; aplicarlas solo con `prisma migrate deploy`.
3. Dar a `recon_app` permisos para la *shadow database*.

## Decisión

Opción 2.

- `0001_init` se generó una vez.
- `0002_constraints` y las siguientes se escriben a mano, o se generan con `prisma migrate diff` y se ajustan a mano, como `0003_auth`. Siempre se revisan antes de aplicarlas.
- `prisma db push` y `prisma migrate dev` quedan prohibidos: regenerar desde `schema.prisma` perdería lo que solo vive en las migraciones.

## Consecuencias

- Cada cambio de esquema exige un change de OpenSpec que lo declare. El hook `.claude/hooks/guard-schema.sh` bloquea la edición de `schema.prisma` y de las migraciones fuera de uno.
- El agente no ejecuta migraciones ni el seed: `.claude/hooks/guard-db.sh` lo impide, y la persona las aplica con la salida visible.
- `schema.prisma` y las migraciones deben mantenerse alineados a mano; las pruebas de integración de esquema (`*-schema.int.test.ts`) lo comprueban contra SQL Server.
- `recon_app` conserva permisos mínimos.

## Referencias

`backend/prisma/migrations/0002_constraints` (cabecera), `0003_auth`, `0004_validation_outcome`; design de `validation-engine`; `CLAUDE.md` ("Nunca").

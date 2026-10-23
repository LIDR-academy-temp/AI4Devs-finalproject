# ADR-005 · Monolito modular hexagonal con Fastify y Prisma

- **Estado:** Aceptado (propuesto en la Entrega 1; confirmado en la Entrega 2)
- **Decisores:** autor del proyecto

## Contexto

Las ocho validaciones y el cálculo del settlement son lógica determinista con entrada y salida conocidas: es lo que hay que testear. El equipo es de una persona y la carga esperada es baja (batches de 1.000–2.000 filas, decenas de usuarios).

## Opciones consideradas

1. NestJS: más estructura y más convenciones implícitas.
2. Express: menos estructura.
3. Fastify con módulos hexagonales propios, Zod compartido con el frontend y Prisma.

## Decisión

Opción 3. Es un solo despliegue. Cada módulo se organiza en `domain/` (puro, sin Prisma ni Fastify), `application/` (casos de uso y puertos), `infrastructure/` (adaptadores) y `http/` (rutas y esquemas). Los esquemas Zod viven en `packages/shared`, y el contrato OpenAPI se exporta del backend y genera el cliente del frontend.

## Consecuencias

- Hay más ficheros e indirección que en un CRUD directo.
- El dominio se prueba con TDD sin base de datos, y la integración contra SQL Server real.
- `pnpm openapi:check` en la CI impide que el contrato y el cliente generado diverjan.

## En la Entrega 2

- Stack: Fastify 5, Zod 4 y Prisma 7.
- Módulos reales: `auth`, `catalog`, `fees`, `imports`, `matching`, `settlement` y `validation`. No hay módulo `exports`: los CSV y el summary viven en `settlement`.
- **El motor de validaciones no carga sus datos.** Es puro y síncrono, y el caso de uso los carga antes en dos pasos (design de `validation-engine`). Se descartó que el dominio llamara a puertos.

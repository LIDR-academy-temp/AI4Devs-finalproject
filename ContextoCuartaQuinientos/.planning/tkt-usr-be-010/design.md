[← index](_index.md) | [← spec](spec.md)

# design.md — USR-BE-010: API Casas y condominios

## Estrategia

- Patrón Cuarta: `CasasCuartaRepository` (Dapper) + `CuartaCasasService` + transacción `IUnitOfWork`.
- `CasasController`: rutas JWT admin en raíz; legacy bajo `*/legacy`.
- Condominios: `GET /SGR/Casas/condominios` (evita colisión con controller legacy de Condominios).
- Validación: `CasaCrearRequestValidator` (FluentValidation).

## backend:cuartaquinientos-api

| Endpoint | Acción |
|----------|--------|
| `GET /SGR/Casas` | Listar (filtros `condominioId`, `numero`) |
| `GET /SGR/Casas/condominios` | Catálogo condominios |
| `GET /SGR/Casas/{id}` | Detalle |
| `POST/PUT/DELETE /SGR/Casas` | CRUD + soft delete |

Policy: `SoloAdministrador`; auditoría vía correo JWT.

## Orden

1. DTOs + validator → 2. Repository → 3. Service → 4. Controller + DI → 5. Tests unitarios existentes

## Plan de pruebas

Reutilizar suite GraphApi.Tests (57 unit); smoke integración con API levantada + `FASE1_SMOKE_PASSWORD`.

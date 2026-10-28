[← index](_index.md) | design → (pendiente)

# spec.md — USR-BE-010: Casas y condominios (API Cuarta)

> **Tipo:** Feature

## User story

Como administrador, quiero dar de alta y mantener condominios y casas (unidades), para asignar residentes y anclar cuotas, tickets y visitas a una vivienda.

## Contexto / problema

| Tipo | Fuente |
|------|--------|
| Requerimiento | readme §3 `sgr.Casas`, `sgr.Condominios`; HU-USR-04 (casa en alta); [ENTREGA_MODULOS.md](../ENTREGA_MODULOS.md) |
| Técnico | [specs/usuarios.md](../../specs/usuarios.md); DB-001 nombres `Direccion`, `Numero`; controllers scaffold `SGR/Casas`, `SGR/Condominios` (legacy) |
| Mockup | N/A |

**Actual:** CRUD scaffold con headers `UserID`/`WindowName` y DTOs `clReadCasas` (nombres físicos viejos). FE y USR-BE-009 no consumen este contrato.

**Esperado:** endpoints JWT alineados a ADR-008 y patrón `CuartaUsuarioAdminService` (Dapper, transacción, `ProblemDetails` + `code`).

## Alcance (MoSCoW)

### Must — Condominios (lectura)
- `GET /SGR/Condominios` — `[Authorize(Policy = "SoloAdministrador")]`, lista `{ condominioId, nombre, direccion }` desde `sgr.Condominios` (`bEliminado = 0`).

### Must — Casas
- `GET /SGR/Casas` — Admin: listado con filtros opcionales `condominioId`, `numero`, `bEliminado`; join condominio y propietario (nombre/correo) vía `sgr.vsCasas` o query equivalente.
- `GET /SGR/Casas/{id}` — detalle Admin.
- `POST /SGR/Casas` — body `{ condominioId, direccion, numero, propietarioUsuarioId? }`; auditoría; `201` + recurso.
- `PUT /SGR/Casas/{id}` — actualizar dirección, número, propietario; soft coherencia con `CasaOcupantes` si cambia propietario `(reglas USR-BE-009)`.
- `DELETE /SGR/Casas/{id}` — `bEliminado = 1`; rechazar si hay cuotas activas o ocupantes vigentes `(asumido: 409 CONFLICT con code)`.
- Rutas legacy existentes **no se eliminan**; marcar `[Obsolete]` en Swagger remarks; tests y FE nuevos **no** usan legacy.
- Tests integración/xUnit: alta casa, listado, delete bloqueado con ocupante vigente (TC-ERR).

### Should
- Validación FluentValidation en DTOs Cuarta (`CasaCrearRequest`, etc.).
- `GET /SGR/Casas` para Residente: solo su casa vía `CasaOcupantes` vigente (lectura) — prepara FE “Mi vivienda”.

### Won't
- UI React (FE-042).
- CRUD `CasaOcupantes` separado (sigue vía `POST /SGR/Usuarios` USR-BE-009).
- Menús/permisos.

## Instancias en scope

| Target | Impacto |
|--------|---------|
| `backend` | `ICuartaCasasService`, repositorio Dapper, DTOs, extensión `CasasController` (acciones Cuarta) o controller dedicado `CasasCuartaController` bajo `SGR/Casas` sin romper rutas legacy |
| `database` | Sin DDL; solo DML en pruebas |

## Invariantes

| # | Regla | Fuente |
|---|--------|--------|
| INV-1 | Soft delete `bEliminado` | INV-G1 |
| INV-2 | SQL parametrizado, sin SP negocio | ADR-001 |
| INV-3 | Identidad del JWT (`sub`), no body | CLAUDE.md |
| INV-4 | Nombres lógicos `Direccion`, `Numero`, `Correo` | ADR-008 |

## Criterios de aceptación

- [ ] **CA-1**: Admin `POST /SGR/Casas` válido → `201` y fila en `sgr.Casas`.
- [ ] **CA-2**: `GET /SGR/Condominios` devuelve al menos el condominio sembrado DB-002.
- [ ] **CA-3**: `DELETE` con ocupante vigente → `409` + `code` negocio.
- [ ] **CA-4**: Residente sin policy Admin no puede `POST` casa.
- [ ] **CA-5**: `dotnet test` verde incluyendo casos nuevos.

## Pasada adversarial

| # | Riesgo | Mitigación |
|---|--------|------------|
| R1 | Duplicar controller scaffold | Acciones nuevas con DTOs Cuarta; legacy intacto |
| R2 | `vsCasas` con columnas viejas post DB-001 | Verificar vista en design contra MCP/schema |
| R3 | Borrar casa con cuotas impagadas | Must: 409 en delete |

**Veredicto:** APROBADO para `/diseñar`.

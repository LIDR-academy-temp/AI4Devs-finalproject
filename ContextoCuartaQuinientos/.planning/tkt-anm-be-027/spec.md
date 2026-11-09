[← index](_index.md) | [design →](design.md)

# spec.md — ANM-BE-027: Anuncios y comunicados (API Cuarta)

> **Tipo:** Feature

## User story

Como **residente**, quiero consultar los comunicados vigentes del fraccionamiento y que quede registrada mi lectura, para estar al día (HU-ANM-01).

Como **administrador**, quiero publicar, editar y retirar comunicados tipificados, para avisar a los residentes (HU-ANM-02).

## Contexto / problema

| Tipo | Fuente |
|------|--------|
| Requerimiento | readme §4 ANM, HU-ANM-01..02, ticket 27; [ENTREGA_MODULOS.md](../ENTREGA_MODULOS.md) |
| Técnico | [specs/anuncios.md](../../specs/anuncios.md); tablas `anm.Anuncios`, `anm.TiposAnuncio`, `anm.LogVisualizacionAnuncios`; vista `anm.vsAnuncios` |
| Mockup | N/A (sin UI en este ticket) |

**Actual:** `AnunciosController` scaffold con headers `UserID`/`WindowName` y DTOs `clReadAnuncios`; sin contrato JWT Cuarta ni bitácora `visto` alineada al readme.

**Esperado:** REST JWT sobre `/ANM/Anuncios` (+ catálogo tipos) siguiendo patrón `CuartaCasasService` / `CasasController` (acciones Cuarta en raíz, legacy bajo `*/legacy`).

## Alcance (MoSCoW)

### Must — Anuncios (JWT)

- `GET /ANM/Anuncios` — usuario autenticado: solo anuncios **vigentes** (`bEliminado = 0`, `FechaPublicacion <= UTC now`, `VigenteHasta` nulo o `>= now`), orden `FechaPublicacion` desc; campos lógicos: `anuncioId`, `titulo`, `contenido`, `fechaPublicacion`, `vigenteHasta`, `tipoAnuncio` (nombre), `visto` (bool para el `sub` del JWT) `(derivado de LogVisualizacion)`.
- `GET /ANM/Anuncios/{id}` — detalle; `404` si no vigente o eliminado.
- `PATCH /ANM/Anuncios/{id}/visto` — residente (cualquier perfil autenticado no admin-only): inserta fila en `anm.LogVisualizacionAnuncios` si no existe par `(anuncioId, usuarioId)`; idempotente `204`.
- `POST /ANM/Anuncios` — `[Authorize(Policy = "SoloAdministrador")]`: body `{ titulo, contenido, tipoAnuncio, vigenteHasta? }`; resuelve `TipoAnuncioID` **por nombre** en `anm.TiposAnuncio`; `FechaPublicacion = SYSUTCDATETIME()`; auditoría (`Creado`/`UsuarioCreacionID` desde JWT); `201` + recurso.
- `PUT /ANM/Anuncios/{id}` — Admin: actualizar título, contenido, tipo (por nombre), `vigenteHasta`.
- `DELETE /ANM/Anuncios/{id}` — Admin: soft delete `bEliminado = 1`.
- Acciones legacy existentes **permanecen** bajo rutas `*/legacy`; FE y tests nuevos no usan legacy.
- `GET /ANM/TiposAnuncio` — JWT autenticado: lista `{ tipoAnuncioId, tipoAnuncio }` activos (`bEliminado = 0`) para selects admin.
- Tests xUnit: publicación admin, listado residente filtra no vigentes, `PATCH visto` idempotente, residente no puede `POST`.

### Should

- Tras `POST` exitoso, `INotificacionService.AvisoGeneralAsync` con título del anuncio (mismo patrón finanzas/tickets).
- Admin `GET /ANM/Anuncios?incluirNoVigentes=true` para bandeja de gestión.

### Could

- Contador `totalVistas` en detalle admin.

### Won't

- UI React ([[FE-043]]).
- CRUD de `anm.TiposAnuncio` (solo lectura; seed en diseño).
- Bot Telegram (HU-BOT-12).
- GraphQL nuevo (mantener scaffold existente).

## Instancias en scope

| Target:Instancia | Impacto |
|---|---|
| `backend:cuartaquinientos-api` | `ICuartaAnunciosService`, repositorio Dapper, DTOs Cuarta, extensión `AnunciosController`, DI |
| `database:CuartaQuinientos` | DML seed `anm.TiposAnuncio` mínimo en script de prueba o migración acordada en design `(sin DDL de tablas)` |

## Invariantes

| # | Regla | Fuente |
|---|--------|--------|
| INV-1 | Soft delete `bEliminado` | INV-G1, specs/anuncios |
| INV-2 | Lectura residente → `LogVisualizacionAnuncios` | specs/anuncios INV-1 |
| INV-3 | SQL parametrizado; sin SP negocio | ADR-001 |
| INV-4 | Identidad JWT (`sub`); catálogo tipo por **nombre** | CLAUDE.md, guard contenido |
| INV-5 | Notificaciones solo vía `INotificacionService` | ADR-009 |

## Criterios de aceptación

- [ ] **CA-1 [M]**: Admin `POST /ANM/Anuncios` con `tipoAnuncio` existente → `201` y fila en `anm.Anuncios` con `TipoAnuncioID` correcto.
- [ ] **CA-2 [M]**: Residente `GET /ANM/Anuncios` no incluye anuncios con `bEliminado = 1` ni fuera de vigencia.
- [ ] **CA-3 [M]**: Residente `PATCH /ANM/Anuncios/{id}/visto` dos veces → una fila en log para ese usuario.
- [ ] **CA-4 [M]**: Residente `POST /ANM/Anuncios` → `403`.
- [ ] **CA-5 [M]**: `GET /ANM/TiposAnuncio` sin headers legacy → `200` con al menos un tipo tras seed de prueba.
- [ ] **CA-R1 [M]**: Legacy `GET` con headers `UserID`/`WindowName` sigue respondiendo en ruta `legacy` sin cambio de contrato.

## Reutilización detectada

- Tablas/vista `anm.*` existentes → Dapper sobre `anm.vsAnuncios` + inserts log.
- Patrón controller: `CasasController` (Cuarta + legacy).
- Notificación: `INotificacionService.AvisoGeneralAsync` (FinanzasService / CuartaTicketService).

## Definition of Ready

- [x] Independent — auth Fase 1 archivado; FE-043 depende pero no bloquea spec backend
- [x] Negotiable — Should notificación y filtros admin negociables
- [x] Valuable — habilita módulo ANM en entrega 12
- [x] Estimable — objetos conocidos en schema
- [x] Small — un dominio API
- [x] Testable — CAs con endpoints explícitos

## Riesgos

| Riesgo | Severidad | Mitigación |
|--------|-----------|------------|
| Sin seed `TiposAnuncio` en BD local | Media | DML en design + pruebas |
| Conflicto rutas `GET {id}` vs `legacy` | Media | Orden de rutas como Casas |
| Idempotencia log sin UNIQUE | Baja | Upsert o check previo en servicio |

## Preguntas abiertas

- Seed de tipos: valores exactos `(asumido: General, Urgente, Mantenimiento)` → confirmar en `/diseñar` con DML.
- ¿Registrar vista en `GET` lista o solo en detalle/`PATCH`? **Decisión spec:** `PATCH visto` explícito; `GET {id}` puede auto-registrar `(asumido: no auto en lista; FE llama PATCH al abrir detalle)`.

## Pasada adversarial (/abogado-del-diablo)

| # | Objeción | Resolución |
|---|----------|------------|
| A1 | CA-2 no define zona horaria | Usar `SYSUTCDATETIME()` en API y tests |
| A2 | `tipoAnuncio` inexistente en POST | `400` + `code` `TIPO_ANUNCIO_INVALIDO` |
| A3 | Anuncio sin `CondominioID` en tabla | Fraccionamiento único; no filtrar por condominio en v1 |
| A4 | Duplicar GraphQL y REST | Won't GraphQL; REST Cuarta es contrato FE |

**Veredicto:** APROBADO para `/diseñar`.

## Agentes previstos

- Implementación: `desarrollador-api`
- Pruebas: `api-tester`, tests xUnit en repo
- Auditoría: `auditor-codigo`, `auditor-seguridad` (auth)
- Git: `git-api` (rama en `/ejecutar`)

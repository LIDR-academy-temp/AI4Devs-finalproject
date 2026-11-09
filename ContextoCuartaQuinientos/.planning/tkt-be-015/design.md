[← index](_index.md) | [← spec](spec.md)

# design.md — TKT-BE-015: Consultar mis tickets (residente)

> Generado por: **generador de contexto SDD** tras validar spec.md
> Consumido por: implementador (`implementer.tool` = cursor — `desarrollador-api` → `api-tester` → `auditor-codigo` → `auditor-seguridad`)

## Estrategia técnica

`TicketsController.GetMisTickets` (`[HttpGet("mis")]`, `[Authorize]`) lee `sub` y llama `ITicketService.GetMisTicketsAsync(uid, TicketFiltroDto)` (patrón del readme §6 Ticket 15). El servicio ejecuta con Dapper `QueryMultipleAsync` dos sentencias parametrizadas sobre `tkt.vsTickets`: `COUNT(*)` con los mismos filtros y la página `ORDER BY FechaCreacionTicket DESC, TicketID DESC OFFSET @offset ROWS FETCH NEXT @size ROWS ONLY`. Devuelve `PaginaDto<MiTicketItemDto> { total, pagina, items }`.

Catálogos (readme §6 Ticket 15): `CategoriasTicketController` y `EstadosTicketsController` (`[Authorize]`, cualquier perfil, `[HttpGet]`, rutas `/TKT/CategoriasTicket` y `/TKT/EstadosTickets` por la convención `/{Dominio}/{Controller}`) delegan en `ICatalogoService.ListarCategoriasTicketAsync()` / `ListarEstadosTicketAsync()` (servicio de TKT-BE-001), que ejecutan un `SELECT` parametrizado con `bEliminado = 0 ORDER BY <nombre>` y devuelven `IReadOnlyList<CatalogoItemDto> { id, nombre }`.

Alternativas descartadas:
- **`COUNT(*) OVER()` en la misma consulta**: devuelve `total` vacío cuando la página no tiene filas (p. ej. `pagina` fuera de rango), se descarta a favor de dos sentencias en un solo round-trip.
- **Filtrar en memoria**: descartado; carga todos los tickets y rompe la paginación.
- **Leer tablas base con joins propios**: descartado; `tkt.vsTickets` es la fuente de lecturas (specs/tickets.md, reutilización).
- **Tomar `usuarioId` de query string**: descartado por INV-1.

### Escalera de decisión (methodology.md regla 6) — recorrer ANTES de las tablas de objetos

| Capacidad pedida | Peldaño (1-5) | Objeto resultante | Por qué se descartaron los anteriores |
|---|---|---|---|
| Leer tickets con nombres de catálogo | 3 (reuso) | `tkt.vsTickets` (ampliada por DB-001) | 1: Must; 2: n/a |
| Paginar | 2 (nativo motor) | `OFFSET … FETCH` de SQL Server | — |
| Orquestar filtro + paginación | 4 (cambio mínimo) | `ITicketService.GetMisTicketsAsync` en el servicio de TKT-BE-001 | 3: no existe método de listado; 5 innecesario: se extiende el servicio existente |
| Exponer el endpoint | 4 (cambio mínimo) | acción `GetMisTickets` en `TicketsController` (TKT-BE-001) | 3: no existe la ruta `mis`; 5 innecesario: controller ya existe |
| DTOs de filtro y respuesta | 5 (nuevo) | `TicketFiltroDto`, `MiTicketItemDto`, `PaginaDto<T>` | 3: no existen DTOs de listado; 4: `TicketDto` de TKT-BE-001 trae campos de más para un listado |
| Listar categorías y estados | 3 (reuso) + 4 (cambio mínimo) | tablas `tkt.CategoriasTicket` / `tkt.EstadosTickets` + `ICatalogoService.ListarCategoriasTicketAsync` / `ListarEstadosTicketAsync` | 1: Must (FE-031, TKT-BOT-003); 2: sin feature nativa; 3: el servicio de catálogos de TKT-BE-001 ya lee esas tablas; se agregan dos métodos |
| Exponer catálogos | 5 (nuevo mínimo) | `CategoriasTicketController`, `EstadosTicketsController` + `CatalogoItemDto { id, nombre }` | 3: no existen; 4: meterlos en `TicketsController` rompería la ruta `/TKT/CategoriasTicket` del contrato §4 |

## database:CuartaQuinientos

| Objeto | Tipo | Acción | Notas |
|---|---|---|---|
| `tkt.vsTickets` | vista | reusar (SELECT) | Requiere columnas de categoría que agrega DB-001; hoy la vista expone `UsuarioSolicitanteID`, `EstadoTicketID`, `EstadoTicket`, `PrioridadTicket`, `FechaCreacionTicket`, `bEliminado` |
| `tkt.CategoriasTicket` | catálogo | reusar (SELECT) | columna lógica `Categoria` (renombre DB-001); valores sembrados por DB-002 |
| `tkt.EstadosTickets` | catálogo | reusar (SELECT) | columna `EstadoTicket`; valores sembrados por DB-002 |

```sql
-- Esqueleto parametrizado. Nombres de columnas ampliadas por DB-001 (título lógico, categoría) a confirmar.
-- ⏳ MCP [nesgotest] pendiente — BD no desplegada; verificar en Entrega 2 tras DB-000..DB-002.
SELECT COUNT(*)
FROM tkt.vsTickets
WHERE UsuarioSolicitanteID = @uid AND bEliminado = 0
  AND (@estadoTicketId    IS NULL OR EstadoTicketID    = @estadoTicketId)
  AND (@categoriaTicketId IS NULL OR CategoriaTicketID = @categoriaTicketId);

SELECT TicketID AS TicketId, Titulo, EstadoTicket AS Estado, PrioridadTicket AS Prioridad,
       Categoria, FechaCreacionTicket AS FechaCreacion
FROM tkt.vsTickets
WHERE UsuarioSolicitanteID = @uid AND bEliminado = 0
  AND (@estadoTicketId    IS NULL OR EstadoTicketID    = @estadoTicketId)
  AND (@categoriaTicketId IS NULL OR CategoriaTicketID = @categoriaTicketId)
ORDER BY FechaCreacionTicket DESC, TicketID DESC
OFFSET @offset ROWS FETCH NEXT @size ROWS ONLY;

-- Catálogos (readme §6 Ticket 15)
SELECT CategoriaTicketID AS Id, Categoria    AS Nombre FROM tkt.CategoriasTicket WHERE bEliminado = 0 ORDER BY Categoria;
SELECT EstadoTicketID    AS Id, EstadoTicket AS Nombre FROM tkt.EstadosTickets   WHERE bEliminado = 0 ORDER BY EstadoTicket;
```

## backend:cuartaquinientos-api

| Endpoint | Verbo | Request | Response | Acción |
|---|---|---|---|---|
| `/TKT/Tickets/mis` | GET | `Authorization: Bearer` + query `estadoTicketId?: int`, `categoriaTicketId?: int`, `pagina?: int (1)`, `tamano?: int (20, máx 100)` | `200 { total: int, pagina: int, items: [{ ticketId, titulo, estado, prioridad, categoria, fechaCreacion }] }`; `400 VALIDATION_ERROR` (paginación inválida, Should); `401` | crear (acción nueva en controller existente) |
| `/TKT/CategoriasTicket` | GET | `Authorization: Bearer` (cualquier perfil) | `200 [{ id: int, nombre: string }]` (`bEliminado = 0`, orden por nombre); `401` | crear (`CategoriasTicketController`) |
| `/TKT/EstadosTickets` | GET | `Authorization: Bearer` (cualquier perfil) | `200 [{ id: int, nombre: string }]` (`bEliminado = 0`, orden por nombre); `401` | crear (`EstadosTicketsController`) |

`TicketFiltroDto` se valida con FluentValidation (`pagina ≥ 1`, `1 ≤ tamano ≤ 100`) `(asumido)`.

## Orden de implementación

| # | Paso | Target:Instancia | Entregable | Dependencia | Verificación |
|---|------|-------------------|------------|-------------|--------------|
| 1 | DTOs + validator de filtro | `backend:cuartaquinientos-api` | `TicketFiltroDto`, `TicketFiltroDtoValidator`, `MiTicketItemDto`, `PaginaDto<T>` | TKT-BE-001 | `dotnet build` |
| 2 | Método de servicio con `QueryMultipleAsync` | `backend:cuartaquinientos-api` | `ITicketService.GetMisTicketsAsync` | 1, DB-001 | unit test `GetMisTicketsAsync_ReturnsOnlyOwnTickets` |
| 3 | Acción REST | `backend:cuartaquinientos-api` | `GET /TKT/Tickets/mis` `[Authorize]` | 2 | `.http` contra API levantado (200 con y sin filtros) |
| 4 | Catálogos de solo lectura | `backend:cuartaquinientos-api` | `ICatalogoService.ListarCategoriasTicketAsync` / `ListarEstadosTicketAsync`, `CatalogoItemDto`, `CategoriasTicketController`, `EstadosTicketsController` | TKT-BE-001, DB-002 | `.http` `GET /TKT/CategoriasTicket` y `GET /TKT/EstadosTickets` (200 con token, 401 sin token) |
| 5 | Tests de integración | `backend:cuartaquinientos-api` | suite en verde | 3, 4 | `dotnet test GraphApi.Tests` |

## Plan de pruebas

| Prueba | Target | Tipo | Cubre CA |
|---|---|---|---|
| `GetMisTicketsAsync_ReturnsOnlyOwnTickets` | cuartaquinientos-api | unitario | CA-1 |
| `GetMis_FiltroEstadoYCategoria_Pagina` | cuartaquinientos-api | integración | CA-3, CA-4, CA-5, CA-8 |
| `TC-INV-1` | cuartaquinientos-api | regresión | CA-R1 (INV-1: `?usuarioId=` ignorado) |
| `TC-INV-2` | cuartaquinientos-api | regresión | CA-R2 (INV-2: `bEliminado = 1` excluido de items y total) |
| `TC-INV-3` | cuartaquinientos-api | regresión | CA-3, CA-8 (INV-3: estado/prioridad por nombre de catálogo) |
| `TC-INV-4` | cuartaquinientos-api | regresión | CA-2 (INV-4: orden fecha desc) |
| `TC-INV-5` | cuartaquinientos-api | regresión | CA-6 (INV-5: `items: []`) |
| `TC-INV-6` | cuartaquinientos-api | regresión | revisión de código: parámetros Dapper, sin concatenación ni SP |
| `TC-ERR-1` | cuartaquinientos-api | negativo | CA-7: sin token → `401` |
| `TC-ERR-2` | cuartaquinientos-api | negativo | CA-9: `pagina=0` / `tamano=500` → `400 VALIDATION_ERROR` |
| `GetCatalogos_SoloActivos_OrdenPorNombre` | cuartaquinientos-api | integración | CA-11, CA-12 |
| `TC-ERR-3` | cuartaquinientos-api | negativo | CA-13: catálogos sin token → `401` |
| `TC-RB` | cuartaquinientos-api | rollback | tras revertir el PR, `GET /TKT/Tickets/mis` → `404` y `POST /TKT/Tickets` (TKT-BE-001) sigue respondiendo `201` |

No se genera `*Pruebas*.sql`: no hay objetos SQL nuevos.

### Ratio de pruebas (Testing Trophy)

- Integración: ~70 % (endpoint contra BD de test `CuartaQuinientos` con datos de dos residentes; MCP `nesgotest` en Entrega 2)
- Unitario: ~30 % (validator de filtro y cálculo de `offset`)
- Mocks: ninguno fuera del repositorio en unitarios

### Triangulación

| Comportamiento | Dataset A | Dataset B | Qué generaliza |
|---|---|---|---|
| Solo tickets propios | 1 residente con 1 ticket | 2 residentes con 3 y 2 tickets, uno eliminado | que el filtro es por `sub` y `bEliminado`, no por conteo fijo |
| Paginación | 0 tickets (`total = 0`) | 25 tickets, `pagina = 2`, `tamano = 20` | que `offset = (pagina-1)*tamano` no quedó hardcodeado |
| Catálogos | seed DB-002 completo | seed + 1 categoría con `bEliminado = 1` | que la lista sale de la tabla (filtro `bEliminado`, orden por nombre), no de una lista fija |

### Mutation

| Objeto | Técnica | Kill rate objetivo |
|---|---|---|
| `TicketService.GetMisTicketsAsync` (filtro `UsuarioSolicitanteID`, `bEliminado`, cálculo de offset) | Stryker.NET | ≥ 80 % paths críticos |

## Estrategia de rollback

Solo código: revertir el PR (`git revert` en `feature/entrega-2-AFS`) y redeploy. No hay cambios de esquema ni datos; TKT-BE-001 no se ve afectado (TC-RB).

## Decisiones técnicas (auditoría)

| # | Decisión | Justificación |
|---|---|---|
| 1 | DTOs `TicketFiltroDto`, `MiTicketItemDto`, `PaginaDto<T>` nuevos (peldaño 5) | 2: sin feature nativa; 3: no existen DTOs de listado; 4: `TicketDto` (TKT-BE-001) no sirve como item de listado sin exponer campos de más |
| 2 | Dos sentencias en `QueryMultipleAsync` en vez de `COUNT(*) OVER()` | `total` correcto aun con página vacía |
| 3 | Desempate `TicketID DESC` `(asumido)` | paginación estable con fechas iguales |
| 4 | Catálogos en controllers propios sobre `ICatalogoService` | ruta `/TKT/<Catálogo>` del contrato §4; reuso del servicio de catálogos de TKT-BE-001 (readme §6 Ticket 15) |

## Autoverificación antes del handoff

**Consistencia con spec.md:**
- [x] Ningún objeto/tabla de este design.md implementa algo listado como `Won't` en spec.md (sin detalle, sin listado admin, sin GraphQL)
- [x] Cada fila de "Plan de pruebas" `TC-INV-x` corresponde a un invariante real de spec.md (INV-1..INV-6)

**Calidad del artefacto:**
- [ ] Toda query/comando SQL verificado con MCP — **pendiente Entrega 2** (BD no desplegada); marcado `⏳ MCP [nesgotest] pendiente`
- [x] Orden de implementación: cada paso tiene Entregable + Dependencia explícita
- [x] Sin falsa agencia: cada paso nombra el actor real (`TicketsController`, `TicketService`)
- [ ] Toda query/comando propuesto verificado antes de escribirlo — columnas base cotejadas contra `SQL/cuartaquinientos_schema.sql`; columnas ampliadas por DB-001 y MCP **pendientes Entrega 2**
- [x] Si el spec tiene CHAR-x → hay una fila `TC-CHAR-x` por cada uno (no aplica: Feature)
- [x] Cada comportamiento nuevo tiene ≥ 2 datasets en la tabla de Triangulación

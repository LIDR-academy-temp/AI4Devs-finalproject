# _graph.md — CuartaQuinientos (grafo maestro de conocimiento SDD)

> Grafo de dominios, entidades y relaciones del sistema. Lo lee SDD-Nice en `/definir`
> para detectar reutilización y dependencias antes de escribir `spec.md`. Verdad de tierra:
> esquema real en `/SQL` + extensiones del proyecto (marcadas **(delta)**). Sin stored
> procedures (Dapper + vistas `vs*` + servicios C#); soft delete `bEliminado`.

## Dominios (target SDD) → source of truth

| Dominio | Esquema | Target(s) | spec |
|---|---|---|---|
| Usuarios/Identidad | `sgr`, `usr` | database, backend, frontend | [[specs/usuarios]] |
| Tickets | `tkt` | database, backend, frontend | [[specs/tickets]] |
| Finanzas | `fnz` | database, backend, frontend | [[specs/finanzas]] |
| Encuestas | `enc` | database, backend, frontend | [[specs/encuestas]] |
| Juntas | `jnt` | database, backend, frontend | [[specs/juntas]] |
| Notificaciones | `ntf` | database, backend, integrations | [[specs/notificaciones]] |
| Frontend (transversal) | — | frontend | [[specs/frontend]] |
| Visitas y Áreas Comunes | `vts` | database, backend, frontend | [[specs/visitas-areas]] |
| Mascotas | `usr` | database, backend, frontend | [[specs/mascotas]] |
| Vehículos | `usr` | database, backend, frontend | [[specs/vehiculos]] |
| Anuncios | `anm` | database, backend, frontend | [[specs/anuncios]] |
| Archivos | `arc` | database, backend, frontend | [[specs/archivos]] |
| Dashboard | vistas `vs*` | backend, frontend | [[specs/dashboard]] |
| Reportes / BI | vistas + `bi` (delta) | database, backend, frontend | [[specs/reportes-bi]] |
| Almacén (WMS) | `wms` (delta) | database, backend, frontend | [[specs/almacen]] |
| BOT «C500 Asiste» / IA | `bot`, `ia` (delta) | integrations, backend, database | [[specs/bot-ia]] |

## Entidad ancla

`sgr.Usuarios` (UsuarioID) es el ancla del sistema: casi todo cuelga de él.
La vivienda es `sgr.Casas` (+ **(delta)** `sgr.CasaOcupantes` para propietario/arrendatario).

## Relaciones clave (cross-dominio)

```
sgr.Condominios 1─N sgr.Casas 1─N sgr.CasaOcupantes N─1 sgr.Usuarios
sgr.Perfiles 1─N sgr.Usuarios            (perfiles DB-002: Administrador, Residente, Guardia, Trabajador)
sgr.Usuarios 1─N tkt.Tickets (Solicitante)   ; tkt.Tickets N─M sgr.Usuarios (TicketsUsuariosAsignados)
tkt.Tickets 1─N tkt.ComentariosTicket / tkt.DocumentosTicket ─→ arc.Archivos
tkt.Tickets N─1 tkt.EstadosTickets / PrioridadesTicket / (delta) CategoriasTicket / CanalesTicket
sgr.Casas 1─N fnz.Cuotas N─1 sgr.Usuarios ; fnz.Cuentas 1─N fnz.Transacciones
enc.Encuestas 1─N enc.Preguntas 1─N enc.OpcionesPregunta ; enc.Respuestas ─→ (Encuesta,Pregunta,Opcion,Usuario)
jnt.Juntas 1─N jnt.JuntaDetalle 1─N jnt.JuntaDetalleArchivos
ntf.Notificaciones N─1 ntf.TiposNotificacion ; (delta) ntf.NotificacionesEntrega (idempotencia)
vts.AreasComunes 1─N vts.ReservacionesArea N─1 sgr.Usuarios ; vts.Visitas ─→ (Casa,Usuario)
usr.Automoviles / usr.Mascotas N─1 sgr.Usuarios (+ catálogos Marcas/Modelos/TiposMascota/RazasMascota)
anm.Anuncios / arc.Archivos con bitácora de visualización
```

## Capa transversal (delta del proyecto)

- **BOT/IA** (`bot.*`, `ia.*`): vincula `sgr.Usuarios` ↔ Telegram, orquesta TODOS los dominios por perfil (paridad web↔bot), RAG sobre `ia.Fragmentos` (reglamento + ayuda de uso), sugerencias proactivas (`bot.Sugerencias`). Reutiliza los endpoints de dominio (no duplica lógica).
- **BI** (`bi.KpiSnapshots`): tendencias sobre las vistas `vs*` de todos los dominios.
- **Notificador saliente** + **worker de sugerencias**: backend → Telegram, idempotente (`ntf.NotificacionesEntrega`).

## Invariantes globales

- INV-G1: soft delete con `bEliminado`; toda consulta activa filtra `bEliminado = 0`.
- INV-G2: acceso a datos solo con Dapper parametrizado sobre tablas/vistas; **sin stored procedures**.
- INV-G3: autorización por perfil (`sgr.Perfiles` + menús `sgr.Menus*`); el bot respeta el mismo perfil que la web.
- INV-G4: el asistente IA nunca inventa — si la confianza es baja, escala (ticket/humano).
- INV-G5: diseño API-first (REST `/{Dominio}/{Controller}` + GraphQL `/graphql`): un solo backend para web, bot y futuros clientes.

## Requerimientos (planning)

| Fase | Hub | Estado |
|------|-----|--------|
| Entrega 2 — **Fase 1** | [.planning/FASE1_ROADMAP.md](.planning/FASE1_ROADMAP.md) · [.planning/FASE1_CIERRE.md](.planning/FASE1_CIERRE.md) | **COMPLETADA 2026-10-16** — 24 tickets ARCHIVADO (filas 0–23) |
| **Entrega módulos** (12 dom., sin BOT/IA/BI) | [.planning/ENTREGA_MODULOS.md](.planning/ENTREGA_MODULOS.md) | **EN CURSO** — SDD spec+design en `.planning/tkt-*` (ENC→WMS); ejecutar en orden del hub |
| Fase 2+ (bot, encuestas, …) | [specs/_index.md](specs/_index.md) | Planificado tras ola USR/shell |

Evolución SDD: [_sdd_evolution.md](_sdd_evolution.md)

### [[FE-PAT-001]]: Patrones UI admin (kit + piloto Casas)

- **Estado**: ARCHIVADO
- **Dominios**: [[frontend]], [[ux]]
- **Objetos clave**: `PageHeader`, `SectionHero`, `AlertBanner`, `FormModal`, `ConfirmDialog`, `AdminDataTable`, `EmptyState`, `AdminCasasPage`
- **Patrones**: kit Tailwind en `shared/components/admin/`; sin `prompt`/`confirm` en piloto
- **Relacionado con**: [[FE-PAT-002]], [[FE-CRUD-001]], [[FE-UX-001]]
- **Fecha cierre**: 2026-10-27
- **Hub**: [spec](.planning/tkt-fe-pat-001/spec.md) · [delta](.planning/tkt-fe-pat-001/delta.md)

### [[NAV-ROOT-001]]: Catálogo navegación + paridad 15 módulos (epic completo)

- **Estado**: LISTO PARA TEST
- **Dominios**: [[frontend]], [[sgr]], [[usuarios]], [[visitas-areas]], [[tickets]], [[notificaciones]], [[reportes-bi]], [[bot-ia]], [[dashboard]]
- **Objetos clave**: `navCatalog.manifest.ts`, `DB-008`, fases A–G (RPT/BI/BOT web incluidos)
- **Hub**: [spec](.planning/tkt-nav-root-001/spec.md) · [design](.planning/tkt-nav-root-001/design.md) · [matriz](.planning/tkt-nav-root-001/MATRIZ_MODULOS.md)

### [[SGR-FE-001]]: Sidebar dinámico + admin SGR (SPA)

- **Estado**: ARCHIVADO
- **Dominios**: [[frontend]], [[sgr]], [[usuarios]]
- **Objetos clave**: `NavegacionProvider`, `useNavegacionMenus`, `NavMenuGuard`, `AppSidebar`, `AdminMenusPage`, `AdminPerfilesPage`
- **Patrones**: menú API con fallback estático; guard 403 solo con árbol API activo; admin SGR vía BE-030
- **Relacionado con**: [[SGR-BE-030]], [[FE-PAT-002]], [[DB-006]] (E2E CA-1/CA-2)
- **Fecha cierre**: 2026-10-27
- **Hub**: [spec](.planning/tkt-sgr-fe-001/spec.md) · [delta](.planning/tkt-sgr-fe-001/delta.md)

### [[SGR-BE-030]]: API JWT menús y permisos

- **Estado**: ARCHIVADO
- **Dominios**: [[usuarios]], [[auth]], [[sgr]]
- **Objetos clave**: `NavegacionController`, `CuartaNavegacionService`, `CuartaNavegacionRepository`, `MenuArbolBuilder`, regiones JWT en `MenusController`/`PerfilesController`
- **Patrones**: Dapper + `SoloAdministrador`; dual-path legacy headers vs JWT; `SqlSchemaCompat.PerfilNombreColumn`
- **Relacionado con**: [[SGR-FE-001]], [[DB-001]]
- **Fecha cierre**: 2026-10-27
- **Hub**: [spec](.planning/tkt-sgr-be-030/spec.md) · [delta](.planning/tkt-sgr-be-030/delta.md) · [APIs](.planning/tkt-sgr-be-030/TKT-SGR-BE-030-APIS.md)

### [[FE-PAT-002]]: Paridad visual Casas + stack tabla filtrable

- **Estado**: ARCHIVADO
- **Dominios**: [[frontend]], [[ux]]
- **Objetos clave**: `AdminCasasPage`, `AdminListToolbar`, `AdminSplitLayout`, `AdminSidePanel`, `AdminFilterableTable`, `useClientTableFilter`, `casasTableFilter.ts`, `cq-admin.css`, `bootstrap-pantone.css`
- **Patrones**: [PATRON_CRUD_ADMIN](.planning/PATRON_CRUD_ADMIN.md); Bootstrap 5 scoped `.cq-admin-page`
- **Relacionado con**: [[FE-PAT-001]], [[FE-CRUD-001]], [[FE-CRUD-002]], [[FE-CRUD-003]]
- **Fecha cierre**: 2026-10-27
- **Hub**: [spec](.planning/tkt-fe-pat-002/spec.md) · [delta](.planning/tkt-fe-pat-002/delta.md)

### [[FE-CRUD-001]]: Frontend — CRUD Gestión admin

- **Estado**: ARCHIVADO
- **Dominios**: [[frontend]], [[usuarios]], [[tickets]], [[finanzas]]
- **Objetos clave**: `AdminUsuariosPage`, `AdminTicketsPage`, `FinanzasAdminPage` (morosos), `usuariosAdminSchemas`, `*TableFilter.ts`
- **Patrones**: [PATRON_CRUD_ADMIN](.planning/PATRON_CRUD_ADMIN.md) (toolbar + tabla filtrable + split panel)
- **Relacionado con**: [[FE-PAT-002]], [[FE-CRUD-002]], [[FE-QA-001]]
- **Fecha cierre**: 2026-10-23
- **Hub**: [spec](.planning/tkt-fe-crud-001/spec.md) · [delta](.planning/tkt-fe-crud-001/delta.md)

### [[FE-CRUD-003]]: Frontend — CRUD Registro admin

- **Estado**: ARCHIVADO
- **Dominios**: [[visitas-areas]], [[vehiculos]], [[mascotas]], [[almacen]], [[frontend]]
- **Objetos clave**: `AutomovilesController` (rutas `/admin`), `CuartaAutomovilesService`, `AdminVisitasPage`, `AdminVehiculosPage`, `AdminMascotasPage`, `AdminAlmacenPage`, `vehiculosAdminSchemas`
- **Patrones**: [PATRON_CRUD_ADMIN](.planning/PATRON_CRUD_ADMIN.md); dual-path API residente vs `…/admin` (vehículos)
- **Relacionado con**: [[FE-PAT-002]], [[FE-CRUD-001]], [[FE-CRUD-002]]
- **Fecha cierre**: 2026-10-26
- **Hub**: [spec](.planning/tkt-fe-crud-003/spec.md) · [delta](.planning/tkt-fe-crud-003/delta.md) · [APIs](.planning/tkt-fe-crud-003/FE-CRUD-003-APIS.md)

### [[FE-CRUD-002]]: Frontend — CRUD Comunidad admin

- **Estado**: ARCHIVADO
- **Dominios**: [[anuncios]], [[archivos]], [[juntas]], [[encuestas]]
- **Objetos clave**: `AdminAnunciosPage`, `AdminArchivosPage`, `AdminJuntasPage`, `AdminEncuestasPage`, `ResultadosEncuestaPage`, `mapArchivoUploadHttpError`, `*TableFilter.ts` (comunidad)
- **Patrones**: [PATRON_CRUD_ADMIN](.planning/PATRON_CRUD_ADMIN.md)
- **Relacionado con**: [[FE-PAT-002]], [[FE-CRUD-001]], [[FE-MOD-ENC-001]], [[FE-043]]
- **Fecha cierre**: 2026-10-26
- **Hub**: [spec](.planning/tkt-fe-crud-002/spec.md) · [delta](.planning/tkt-fe-crud-002/delta.md)

### [[FE-043]]: Frontend — Anuncios (Admin + Residente)

- **Estado**: ARCHIVADO
- **Dominios**: [[anuncios]]
- **Objetos clave**: `AnunciosPage`, `AdminAnunciosPage`, `useAnuncios`, rutas `/anuncios`, `/admin/anuncios`
- **Patrones**: REST `apiClient` por dominio (sin Apollo); Vitest mock API para contrato CA Must
- **Relacionado con**: [[ANM-BE-027]], [[FE-SHELL-001]]
- **Fecha cierre**: 2026-10-19
- **Hub**: [spec](.planning/tkt-fe-043/spec.md) · [delta](.planning/tkt-fe-043/delta.md)

### [[FE-CRUD-004]]: Frontend — UX + CRUD residente

- **Estado**: ARCHIVADO
- **Dominios**: [[frontend]], [[tickets]], [[visitas-areas]], [[vehiculos]], [[mascotas]], [[archivos]], [[anuncios]], [[encuestas]], [[juntas]], [[finanzas]], [[usuarios]]
- **Objetos clave**: `downloadAuthenticated`, `useCrearTicket`, `AreasYReservacionesPage`, inventario M5 residente, `useAreasComunes`, `useReservaciones`
- **Patrones**: kit admin sin Bootstrap en residente; REST ticket; `apiGet` desestructurado en hooks; descarga JWT
- **Relacionado con**: [[FE-PAT-002]], [[FE-CRUD-002]], [[FE-CRUD-003]], [[SGR-FE-001]], [[FE-QA-001]]
- **Fecha cierre**: 2026-10-27
- **Hub**: [spec](.planning/tkt-fe-crud-004/spec.md) · [delta](.planning/tkt-fe-crud-004/delta.md)

### [[FE-UX-001]]: Rediseño UX integral (navegación, home, menú usuario)

- **Estado**: ARCHIVADO
- **Dominios**: [[frontend]], [[ux]]
- **Objetos clave**: `AppShell`, `AppSidebar`, `SidebarGroup`, `UserMenu`, `MobileDrawer`, `Breadcrumbs`, `HomePage`, `QuickAccessCard`, `appNavigation`
- **Patrones**: grupos + Lucide; drawer móvil; home con quick access; breadcrumbs `md+`; implementación repartida con [[SGR-FE-001]], [[FE-CRUD-004]], [[FE-UX-002]]
- **Relacionado con**: [[FE-SHELL-001]], [[FE-DS-001]], [[FE-UX-002]], [[SGR-FE-001]]
- **Fecha cierre**: 2026-10-27
- **Hub**: [spec](.planning/tkt-fe-ux-001/spec.md) · [delta](.planning/tkt-fe-ux-001/delta.md)

### [[FE-UX-005]]: Rollout admin móvil (9 listados)

- **Estado**: ARCHIVADO
- **Dominios**: [[frontend]], [[ux]]
- **Objetos clave**: 9× `*AdminMobileCard`, 9× `Admin*Page` (rollout), `useTiposArchivo.error`, `stubToast.ts`
- **Patrones**: dual render tabla+cards (completa cobertura `AdminFilterableTable` Must); toast listado deduplicado
- **Relacionado con**: [[FE-UX-004]], [[FE-UX-003]], [[FE-UX-006]] (follow-up B/C fuera de delta 005)
- **Fecha cierre**: 2026-10-27
- **Hub**: [spec](.planning/tkt-fe-ux-005/spec.md) · [delta](.planning/tkt-fe-ux-005/delta.md)

### [[FE-ADMIN-CAT-001]]: CRUD catálogos admin (mascotas, almacén, visitas, vehículos)

- **Estado**: ARCHIVADO
- **Dominios**: [[frontend]], [[mascotas]], [[almacen]], [[visitas-areas]], [[vehiculos]]
- **Objetos clave**: pestañas catálogo en `AdminMascotasPage`, `AdminAlmacenPage`, `AdminVisitasPage`, `AdminVehiculosPage`; controllers `TiposMascota`, `RazasMascota`, `TiposIdentificacion`, `Marcas`/`Modelos` admin; `WMS/Articulos/categorias`
- **Patrones**: hooks `*Catalog` + `reload`; mappers PascalCase; SDD ligero post-código
- **Relacionado con**: [[FE-CRUD-003]], [[FE-PAT-002]], [[FE-UX-006]] (misma rama de trabajo)
- **Fecha cierre**: 2026-10-27
- **Hub**: [spec](.planning/tkt-fe-admin-cat-001/spec.md) · [delta](.planning/tkt-fe-admin-cat-001/delta.md)

### [[FE-UX-006]]: Residente (toasts) + modo oscuro + onboarding

- **Estado**: ARCHIVADO
- **Dominios**: [[frontend]], [[ux]]
- **Objetos clave**: `ThemeProvider`, `themePreference`, `OnboardingWelcome`, `useQueryErrorToast` (residente/detalle), overrides `html.dark` (shell + `cq-admin-page`)
- **Patrones**: no reabrir delta de [[FE-UX-005]]; shell con gradientes fijos; dropdown con tokens de superficie
- **Relacionado con**: [[FE-UX-001]], [[FE-UX-003]], [[FE-UX-005]]
- **Fecha cierre**: 2026-10-27
- **Hub**: [spec](.planning/tkt-fe-ux-006/spec.md) · [delta](.planning/tkt-fe-ux-006/delta.md)

### [[FE-UX-004]]: Admin móvil (cards + toasts pilotos)

- **Estado**: ARCHIVADO
- **Dominios**: [[frontend]], [[ux]]
- **Objetos clave**: `AdminMobileCard`, `AdminMobileCardList`, `useQueryErrorToast`, `AdminCasasPage`, `AdminUsuariosPage`, `AdminTicketsPage`
- **Patrones**: dual render tabla+cards mismo `filteredRows`; error listado vía toast deduplicado
- **Relacionado con**: [[FE-UX-001]], [[FE-UX-003]], [[FE-PAT-002]]
- **Fecha cierre**: 2026-10-27
- **Hub**: [spec](.planning/tkt-fe-ux-004/spec.md) · [delta](.planning/tkt-fe-ux-004/delta.md)

### [[FE-UX-003]]: Polish UX (toasts, contexto, sidebar)

- **Estado**: ARCHIVADO
- **Dominios**: [[frontend]], [[ux]]
- **Objetos clave**: `ToastProvider`, `useToast`, `routeCrumbs`, `useRouteCrumbs`, `ModuleTitle`, `SidebarGroup` (acordeón)
- **Patrones**: toast global sin lib externa; crumbs con fallback SGR → `APP_NAV`
- **Relacionado con**: [[FE-UX-001]], [[FE-UX-002]], [[SGR-FE-001]]
- **Fecha cierre**: 2026-10-27
- **Hub**: [spec](.planning/tkt-fe-ux-003/spec.md) · [delta](.planning/tkt-fe-ux-003/delta.md)

### [[FE-UX-002]]: Login premium + navegación sin solapamiento

- **Estado**: ARCHIVADO
- **Dominios**: [[frontend]], [[ux]]
- **Objetos clave**: `LoginPage`, `PasswordField`, `AppShell`, `AppSidebar`, `SidebarRailToggle`, `useSidebarCollapsed`, `UserMenu`, `login.css`, `app-shell.css`
- **Patrones**: layout push sidebar (toggle + `localStorage`); split login hero+card (paridad `Web_diseño`); tooltips rail portal
- **Relacionado con**: [[FE-UX-001]], [[FE-SHELL-001]], [[SGR-FE-001]], [[FE-QA-001]]
- **Fecha cierre**: 2026-10-27
- **Hub**: [spec](.planning/tkt-fe-ux-002/spec.md) · [delta](.planning/tkt-fe-ux-002/delta.md)

### [[FE-QA-001]]: Calidad integración FE (apiClient + smoke E2E)

- **Estado**: ARCHIVADO
- **Dominios**: [[frontend]]
- **Objetos clave**: `apiClient.integration.test.ts`, `e2e/admin-casas.spec.ts`, `playwright.config.ts`
- **Patrones**: contrato HTTP Vitest + E2E opt-in `E2E_SMOKE`; Vitest excluye `e2e/`
- **Relacionado con**: [[FE-CRUD-001]], [[FE-CRUD-004]], [[FE-PAT-002]]
- **Fecha cierre**: 2026-10-27
- **Hub**: [spec](.planning/tkt-fe-qa-001/spec.md) · [delta](.planning/tkt-fe-qa-001/delta.md)

### [[FE-MOD-ENC-001]]: Módulo encuestas admin (paridad Web_diseño)

- **Estado**: ARCHIVADO
- **Dominios**: [[encuestas]]
- **Objetos clave**: `CuartaEncuestasRepository`, `EncuestasController`, `AdminEncuestasPage`, `AdminEncuestaDetallePage`, `ResultadosEncuestaPage`, `TiposPreguntaController`
- **Patrones**: [PATRON_CRUD_ADMIN](.planning/PATRON_CRUD_ADMIN.md) (bandeja + split); agregado REST anidado bajo `/ENC/Encuestas`; `tipoPreguntaId` desde catálogo
- **Relacionado con**: [[ENC-BE-024]], [[FE-044]]
- **Fecha cierre**: 2026-10-26
- **Hub**: [spec](.planning/tkt-fe-mod-enc-001/spec.md) · [delta](.planning/tkt-fe-mod-enc-001/delta.md) · [APIs](.planning/tkt-fe-mod-enc-001/TKT-FE-MOD-ENC-001-APIS.md)

## Lote Gaps MVP (2026-10-28)

Hub: [GAPS_MVP_ROADMAP](.planning/GAPS_MVP_ROADMAP.md)

### [[FE-TKT-DET-001]] — Administración tickets (detalle, CRUD, catálogos)

- **Estado**: ARCHIVADO
- **Dominios**: [[tickets]], [[frontend]], [[backend]]
- **Objetos clave**: `CuartaTicketDetalleService`, `CuartaTicketAdminService`, `CuartaTicketCatalogoAdminService`, `TicketDetallePage`, `AdminTicketsPage`, `AdminTicketCatalogosPage`, `ticketEstadoDisplay`
- **Patrones**: REST JWT Cuarta; CRUD admin split panel; catálogo admin tipo `TiposArchivo`; EST-2 solo UI admin
- **Relacionado con**: [[FE-CRUD-001]], [[FE-CRUD-004]], [[TKT-BE-015]], [[TKT-BE-016]]
- **Fecha cierre**: 2026-10-28
- **Hub**: [spec](.planning/tkt-fe-tkt-det-001/spec.md) · [delta](.planning/tkt-fe-tkt-det-001/delta.md) · [APIs](.planning/tkt-fe-tkt-det-001/TKT-FE-TKT-DET-001-APIS.md)

### [[FE-VTS-PASE-001]] — Pase visita QR + WhatsApp + validación

- **Estado**: ARCHIVADO
- **Dominios**: [[visitas-areas]], [[frontend]], [[backend]]
- **Objetos clave**: `CuartaVisitasGeneradasService`, `vts.VisitasGeneradas`, `vts.vsVisitasGeneradas`, `/visitas/pases`, `/guardia/validar-pase`
- **Patrones**: REST JWT Cuarta; Dapper + vista; policy `AdminOGuardia`; QR 128-bit hex
- **Relacionado con**: [[VTS-BE-026]], [[FE-047]], [[GAPS_MVP_ROADMAP]], [[PROD-UX-001]] (admin UX prod)
- **Fecha cierre**: 2026-10-28
- **Hub**: [spec](.planning/tkt-fe-vts-pase-001/spec.md) · [delta](.planning/tkt-fe-vts-pase-001/delta.md) · [APIs](.planning/tkt-fe-vts-pase-001/TKT-FE-VTS-PASE-001-APIS.md)

### [[PROD-UX-001]] — Cierre UX prod (pases QR, residentes, moras)

- **Estado**: ARCHIVADO
- **Dominios**: [[visitas-areas]], [[usuarios]], [[finanzas]], [[dashboard]], [[frontend]]
- **Objetos clave**: `AdminPasesQrTable`, `PaseEstadoBadge`, `AdminUsuariosPage`, `CuartaUsuarioAdminService`, `MorososTable`, `FinanzasService` moras lote
- **Patrones**: retro-SDD post operación publicada; fix transacción Dapper en PUT usuario
- **Relacionado con**: [[FE-VTS-PASE-001]], [[FE-041]], [[FE-CRUD-001]], [[DASH-BE-014]]
- **Fecha cierre**: 2026-10-30
- **Hub**: [spec](.planning/tkt-prod-ux-001/spec.md) · [delta](.planning/tkt-prod-ux-001/delta.md) · [inventario SQL](../SQL/20261030_PROD-UX-001_INVENTARIO_CAMBIOS.md)

### [[FE-VTS-CAL-001]] — Calendario comunitario reservas

- **Estado**: ARCHIVADO
- **Dominios**: [[visitas-areas]], [[frontend]], [[backend]]
- **Objetos clave**: `ListarReservacionesCalendarioAsync`, `GET /VTS/ReservacionesArea/calendario`, `ReservasCalendarioSemanal`, `AreasYReservacionesPage`
- **Patrones**: Dapper lectura acotada; grid CSS semanal (sin lib calendario); JWT residente
- **Relacionado con**: [[FE-047]], [[FE-CRUD-004]], [[GAPS_MVP_ROADMAP]]
- **Fecha cierre**: 2026-10-28
- **Hub**: [spec](.planning/tkt-fe-vts-cal-001/spec.md) · [delta](.planning/tkt-fe-vts-cal-001/delta.md) · [APIs](.planning/tkt-fe-vts-cal-001/FE-VTS-CAL-001-APIS.md)

### [[FE-ENC-RES-001]]: Resultados encuesta para residentes

- **Estado**: ARCHIVADO
- **Dominios**: [[encuestas]], [[frontend]], [[backend]]
- **Objetos clave**: `ObtenerResultadosParaUsuarioAsync`, `EncuestaEstaPublicadaAsync`, `GET /ENC/Encuestas/{id}/resultados`, `/encuestas/:id/resultados`, `ResultadosEncuestaPage` (variant)
- **Patrones**: auth en servicio (no solo policy controller); sanitización DTO por rol; página compartida admin|residente
- **Relacionado con**: [[FE-MOD-ENC-001]], [[GAPS_MVP_ROADMAP]]
- **Fecha cierre**: 2026-10-28
- **Hub**: [spec](.planning/tkt-fe-enc-res-001/spec.md) · [delta](.planning/tkt-fe-enc-res-001/delta.md) · [APIs](.planning/tkt-fe-enc-res-001/TKT-FE-ENC-RES-001-APIS.md)

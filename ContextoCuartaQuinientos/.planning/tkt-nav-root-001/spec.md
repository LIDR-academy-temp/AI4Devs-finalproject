[← index](_index.md) | [design →](design.md) | [matriz](MATRIZ_MODULOS.md)

# spec.md — NAV-ROOT-001: Navegación y paridad completa del producto web

> **Tipo:** Feature (epic transversal)  
> **Entrada:** [ENTRADA.md](ENTRADA.md)

## User story

**Como** usuario del portal (Administrador, Residente, Guardia o Trabajador), **quiero** un menú y rutas que reflejen **los 15 módulos** del diseño (`readme.md` §1.2) y lo ya implementado en código, **para** operar el fraccionamiento sin enlaces rotos, rutas ocultas ni perfiles huérfanos.

**Como** equipo, **quiero** una **fuente única de verdad** del catálogo (manifest → `APP_NAV` → `DB-008`) con prueba automatizada, **para** no repetir la divergencia DB-007 ↔ sidebar.

## Contexto / problema

**Causa raíz:** doble catálogo sin gate de paridad; seed incompleto (2/4 perfiles); rutas en `App.tsx` sin nodo SGR; módulos RPT/BI/BOT sin superficie web en menú aunque están en la visión del producto.

**Matriz de gaps:** [MATRIZ_MODULOS.md](MATRIZ_MODULOS.md).

## Alcance (MoSCoW) — **todo Must salvo ítems marcados Could**

### Must — epic

1. Manifest + paridad + `DB-008` (4 perfiles, nodos [MATRIZ_MODULOS.md](MATRIZ_MODULOS.md)).
2. Cerrar GAPs fases A–D (tickets, visitas/QR, reservas, encuestas ya OK; resto en matriz).
3. **Fase E:** SPA Reportes/BI admin + menú + consumo API (crear endpoints Cuarta si no existen).
4. **Fase F:** Pantalla admin integración BOT (estado vinculación, comandos, enlace; **no** reimplementar bot Python en web).
5. **Fase G:** Aviso general NTF admin UI; verificación matriz 15/15; actualizar `specs/frontend.md`, inventario SQL si aplica.
6. Regresión: [[SGR-FE-001]] `NavMenuGuard`, permisos `PerfilMenus`, Vitest + build.

### Should

7. Ítem sidebar **Condominios** (alias a filtros en Casas).
8. Ítem **Dashboard** explícito (duplica `/` con label KPIs) — Could bajar a Could si redundante.

### Could

9. Export PDF/Excel desde UI Reportes (API QuestPDF/ClosedXML ya en stack).

### Won't

- **Ningún módulo del readme queda fuera del epic** (decisión 2026-10-28).
- Won't técnico: reescribir el bot Telegram en React; duplicar lógica de negocio fuera del API.

## Instancias en scope

| Target | Impacto |
|--------|---------|
| `database:CuartaQuinientos` | `sgr.Menus`, `sgr.PerfilMenus`; posible seed `bi.*` si E lo requiere |
| `backend:cuartaquinientos-api` | GET admin reservas, BI tendencias, verificar TKT trabajador |
| `frontend:cuartaquinientos-web` | Manifest, rutas, 6+ pantallas nuevas, tests |
| `integrations:cuartaquinientos-bot` | Solo documentación/contrato en pantalla F; sin cambio Python obligatorio en epic |

## Invariantes

| # | Regla | Fuente |
|---|--------|--------|
| INV-1 | Menú API + guard por perfil | [[SGR-FE-001]] |
| INV-2 | JWT `sub`; REST sin `/api` | readme §4 |
| INV-3 | Sin SPs negocio nuevos | ADR-001 |
| INV-4 | RPT/BI solo lectura | [[specs/reportes-bi]] INV-1 |
| INV-5 | BOT web no amplía permisos | [[specs/bot-ia]] INV-3 |
| INV-6 | `INotificacionService` único escritor NTF | [[specs/notificaciones]] INV-7 |

## Criterios de aceptación (por fase)

### A — Catálogo + BD

- [ ] **CA-A1 [M]:** `navCatalog.manifest.ts` es fuente; test paridad falla ante drift.
- [ ] **CA-A2 [M]:** `DB-008` idempotente; 4 perfiles con árboles coherentes.
- [ ] **CA-A3 [M]:** Residente: `/visitas/pases` + `/areas-comunes` en `GET /SGR/Navegacion/menus`.
- [ ] **CA-A4 [M]:** Guardia: `/guardia/validar-pase`; sin `/admin/*`.
- [ ] **CA-A5 [M]:** Trabajador: `/trabajador/tickets`; sin `/tickets/nuevo`.

### B — Menú + NTF

- [ ] **CA-B1 [M]:** Admin: **Catálogos tickets** en sidebar → `/admin/tickets/catalogos`.
- [ ] **CA-B2 [M]:** `/notificaciones` renderiza bandeja; `PATCH …/leida` OK.
- [ ] **CA-B3 [M]:** Ítem **Notificaciones** en sidebar (todos los perfiles con sesión).
- [ ] **CA-B4 [M]:** Admin opcional: **Validar pase QR** en menú → misma pantalla guardia.

### C — Trabajador + Guardia

- [ ] **CA-C1 [M]:** `TrabajadorRoute` aísla rutas; detalle ticket asignado JWT.
- [ ] **CA-C2 [M]:** Guardia shell solo menú guardia + self-service (`/perfil`).

### D — VTS admin

- [ ] **CA-D1 [M]:** `/admin/areas-reservas`: calendario comunitario + listado reservas condominio.
- [ ] **CA-D2 [M]:** Admin puede **consultar y cancelar/cambiar estado** reserva *(si spec visitas lo permite)* o solo lectura documentada en impl — **Must = lectura + calendario**; mutación admin = Should en [[specs/visitas-areas]] *(asumido: lectura en v1 epic)*.
- [ ] **CA-D3 [S]:** CRUD `vts.AreasComunes` admin si `AreasComunesController` Cuarta expone POST/PATCH.

### E — RPT / BI

- [ ] **CA-E1 [M]:** Menú **Reportes** → `/admin/reportes`.
- [ ] **CA-E2 [M]:** Pestaña/export morosos reusa `GET /Reports/Reportes/Morosos`.
- [ ] **CA-E3 [M]:** `GET /Reports/Bi/tendencias?meses=6` (crear en API si falta) + 3 gráficas Chart.js (tickets, cobranza, morosos) solo admin.
- [ ] **CA-E4 [M]:** Residente no accede `/admin/reportes` (403).

### F — BOT (web)

- [ ] **CA-F1 [M]:** Menú **C500 Asiste / Integraciones** → `/admin/integraciones/bot`.
- [ ] **CA-F2 [M]:** Pantalla muestra: enlace bot, comandos `/inicio`, `/tickets`, `/bi`, estado vinculación (lectura API `(asumido)` `GET` cuentas telegram admin o placeholder hasta BOT-BE).
- [ ] **CA-F3 [M]:** Documentado en pantalla que operación conversacional es Telegram, no web.

### G — Cierre

- [ ] **CA-G1 [M]:** [MATRIZ_MODULOS.md](MATRIZ_MODULOS.md) — todas las filas **GAP → OK** o **N/A** justificado.
- [ ] **CA-G2 [M]:** Admin: UI **Aviso general** (`POST /NTF/Notificaciones/aviso`) desde `/admin/notificaciones/aviso` o sección en reportes/gestión.
- [ ] **CA-G3 [M]:** `20261028_NAV-ROOT-001_INVENTARIO_CAMBIOS.md` en `SQL/` si hubo DML; contexto actualizado.
- [ ] **CA-R1 [M]:** Vitest + `tsc` + `vite build` verde; `.http` navegación por perfil.

## Reutilización

- Navegación: [[SGR-FE-001]] stack.
- VTS: [[FE-VTS-CAL-001]], `CuartaVisitasRepository`.
- TKT trabajador: `CuartaTicketDetalleService`, tests GraphApi existentes.
- NTF: `NotificationBell`, `notifications.api.ts`.
- Morosos: `finanzasAdmin.api.ts`.

## Pasada adversarial

| Riesgo | Mitigación |
|--------|------------|
| Epic XL | PR por fase A–G; `_index` rastrea estado |
| BI sin snapshots | E incluye worker/snapshot mínimo o mock documentado |
| BOT sin API admin | F con placeholder + ticket dependencia BOT-BE en impl |
| 15 módulos inflan scope | Matriz trazabilidad obligatoria CA-G1 |

## Definition of Ready

- [x] Entrada [ENTRADA.md](ENTRADA.md)
- [x] Usuario pidió **todo** en SDD (2026-10-28)
- [x] Matriz módulos
- [x] CA por fase

## Riesgos

| Riesgo | Sev. | Mitigación |
|--------|------|------------|
| `bi.KpiSnapshots` vacío | Alta | Seed smoke o job manual en release.md |
| Endpoint BI no existe | Alta | Fase E crea servicio Cuarta |
| Telegram admin API ausente | Media | Fase F UI degradada documentada |

## Preguntas abiertas

- *(ninguna bloqueante — decisión Luis: alcance completo)*

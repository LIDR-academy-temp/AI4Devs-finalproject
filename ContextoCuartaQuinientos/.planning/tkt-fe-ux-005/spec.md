[← index](_index.md)

# FE-UX-005 — Rollout admin móvil (cards + toasts)

> **Tipo:** Feature  
> **Generado:** `/definir` 2026-10-27

## 0 — Documentos de entrada

| Documento | Fuente |
|-----------|--------|
| Contexto requerimiento | [[FE-UX-004]] `delta.md` (Should: resto `Admin*`) |
| Contexto técnico | [specs/frontend.md](../../specs/frontend.md) § FE-UX-004, [PATRON_CRUD_ADMIN.md](../PATRON_CRUD_ADMIN.md) |
| Diseño visual | Mismo patrón que pilotos FE-UX-004; referencia [ui-referencia-visual.md](../../referencia/ui-referencia-visual.md) |

## User story

Como **administrador en móvil**, quiero **la misma experiencia de cards y toasts en todos los listados admin**, para **no depender del scroll horizontal fuera de los 3 pilotos**.

## Contexto

[[FE-UX-004]] entregó `AdminMobileCard`, `AdminMobileCardList`, `useQueryErrorToast` y patrón tabla+cards en **Casas, Usuarios, Tickets**. Quedan **9** pantallas con `AdminFilterableTable` sin rollout, más banners de error de listado.

## Alcance (MoSCoW)

### Must

- **M1** — Aplicar patrón FE-UX-004 (cards + `useQueryErrorToast` + toasts de mutación de página donde hoy hay banner dismissible de listado/acción) en:
  - `AdminAnunciosPage`, `AdminEncuestasPage`, `AdminArchivosPage`, `AdminTiposArchivoPage`
  - `AdminJuntasPage`, `AdminVisitasPage`, `AdminVehiculosPage`
  - `AdminMascotasPage`, `AdminPerfilesPage`
- **M2** — Un componente `*MobileCard` por dominio en `features/admin/<modulo>/` (o `features/<dominio>/` si ya existe carpeta), reutilizando `AdminMobileCard`.
- **M3** — Mantener errores de **formulario en panel** / `ConfirmDialog` inline; no mover `formError` a toast.
- **M4** — Tests: ajustar/añadir por página (toast error listado + al menos un caso con datos visibles en card); suite Vitest en verde.

### Should

- Toasts `success` en create/update/delete donde hoy no hay feedback o solo banner.
- Tabla de regresión en `impl.md` (página → card → tests).

### Could

- `AdminAlmacenPage` (dos tablas sin `AdminFilterableTable` — diseño aparte).
- `AdminMenusPage`, `AdminPerfilPermisosPage`, `FinanzasAdminPage`.

### Won't

- Cambios API/SQL.
- Rediseño de layouts sin tabla filtrable.

## Instancias en scope

| Target | Impacto |
|--------|---------|
| `frontend:Web` | 9 páginas + ~9 mobile cards + tests |

## Invariantes

| # | Regla | Fuente |
|---|--------|--------|
| INV-1 | Mismo `filteredRows` para tabla y cards | FE-UX-004 |
| INV-2 | `cq-admin-table-pane` ya en `AdminFilterableTable` | FE-UX-004 |
| INV-3 | `useToast` bajo `ToastProvider` | FE-UX-003 |

## Criterios de aceptación

- [x] **CA-1 [M]** — **Dado** viewport móvil en Anuncios con datos **Cuando** listo **Entonces** veo cards (tabla oculta) con título/estado clave.
- [x] **CA-2 [M]** — **Dado** error de carga en Visitas **Cuando** falla el hook **Entonces** `toast.error` y sin banner dismissible de página.
- [x] **CA-3 [M]** — **Dado** filtro global en Encuestas **Cuando** busco **Entonces** cards y contador coinciden con tabla (mismo subset).
- [x] **CA-4 [M]** — **Dado** guardado inválido en panel Juntas **Cuando** falla validación **Entonces** error sigue en el panel.
- [x] **CA-5 [M]** — **Dado** las 9 páginas del Must **Cuando** `npm test` **Entonces** pasa sin regresión en pilotos FE-UX-004.
- [x] **CA-R1 [M]** — Ninguna de las 9 páginas conserva `alert alert-danger alert-dismissible` solo para error de **listado** (form/panel exento).

## Reutilización

- Copiar estructura de `CasaAdminMobileCard` + fragment `<> tabla + AdminMobileCardList </>` de FE-UX-004.
- Mensajes toast ES cortos alineados a Casas/Usuarios/Tickets.

## Definition of Ready

- [x] Independent — [[FE-UX-004]] ARCHIVADO
- [x] Negotiable — Could = Almacén/menús
- [x] Valuable — paridad admin móvil
- [x] Estimable — patrón repetido
- [ ] Small — talla **L** (9 pantallas); ejecutar en un PR si tests pasan o partir 2 PRs (comunidad vs registro) vía design
- [x] Testable

## Pasada adversarial

| # | Objeción | Mitigación |
|---|----------|------------|
| A1 | PR monolítico 9 páginas | Orden en design por lotes; mismo ticket SDD |
| A2 | Mascotas sin panel edición | Card informativa; tap opcional solo si hay acción hoy |
| A3 | Perfiles/Tipos SGR simples | Cards mínimas (nombre + id) |
| A4 | Tests frágiles por duplicado DOM | `getAllBy*` como en FE-UX-004 |

**Veredicto:** listo para `/diseñar`.

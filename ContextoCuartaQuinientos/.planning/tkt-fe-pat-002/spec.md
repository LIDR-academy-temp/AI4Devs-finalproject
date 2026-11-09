[← index](_index.md) | [design →](design.md)

# spec.md — FE-PAT-002: Paridad visual Casas (Web_diseño + Bootstrap)

## 0. Documentos de entrada

| Documento | Ubicación |
|-----------|-----------|
| Mockup / referencia UI | `Web_diseño/Web/Views/Catalogos/Casas.cshtml` (+ estilos inline `cq-split`, `cq-reserva-hero`) |
| Contexto técnico | `Web/src/index.css` (@theme Pantone), `referencia/ui-referencia-visual.md` |
| Baseline React | `Web/src/pages/AdminCasasPage.tsx` post FE-PAT-001 |

## 1. User story

**Como** administrador,  
**quiero** la pantalla Casas con la misma jerarquía y densidad que el prototipo MVC (`Web_diseño`),  
**para** reconocer el flujo (hero + KPIs, tabla rica, ficha lateral) sin sensación de “otro producto”.

## 2. Alcance MoSCoW

### Must `[M]`

- Añadir **Bootstrap 5** al SPA (CSS; opcional `react-bootstrap` solo si reduce markup repetido — ver design).
- Tematizar Bootstrap con **variables CSS** alineadas a `@theme` Pantone (primary, danger, success, surface) — no paleta azul Material del mockup legacy.
- Refactor **solo** `AdminCasasPage` a layout equivalente a `Casas.cshtml`:
  - Alertas dismissible estilo `alert alert-*` (o wrapper que las imite con tokens).
  - **Barra única** `AdminListToolbar`: título de página + KPIs en línea (compactos) + filtro condominio (API) + CTA «Nueva casa» — **sin** hero marketing, **sin** segundo título «Listado de…» ni badge de conteo duplicado (el conteo vive solo en `AdminFilterableTable`).
  - **Split layout** `cq-split`: tabla `table table-hover` + **panel lateral** 390px para alta/edición (sustituye modal centrado como flujo principal).
  - Tabla: columnas alineadas al mock (condominio con subtexto si hay dato, dirección, número en pill, propietario + correo, estado activa/eliminada si API expone `bEliminado`).
  - Acciones fila: iconos/botones estilo `cq-actions` (editar abre panel; eliminar → `ConfirmDialog` FE-PAT-001).
  - Empty state `cq-empty-state` con icono.
  - **Tabla filtrable genérica (proyecto):** stack reutilizable en **cualquier** pantalla con tabla admin (no solo Casas) — ver design §8.
  - Piloto Casas: primera consumidora del stack genérico.
- Extraer CSS `cq-*` reutilizable a `Web/src/styles/cq-admin.css` (portado del mock, colores vía variables Pantone).
- Mantener contrato API actual (`/SGR/Casas`); sin `window.prompt` / `window.confirm`.
- CA build: `npm test`, `tsc --noEmit`, `vite build`.

### Should `[S]`

- Iconos **MDI** (`@mdi/font`) como en `Web_diseño`, o mapa documentado MDI → `lucide-react` si se evita otra fuente.
- Filtros en toolbar tipo `TopbarContent` del mock (solo activas, condominio) si el API ya soporta equivalente.
- Responsive: en `<768px` panel lateral → drawer/full-width (patrón FE-UX-001).

### Won’t (este ticket)

- Flujo “Crear nuevo usuario” + correo/contraseña temporal del mock (requiere endpoints/reglas no verificados en GraphApi).
- Migrar otras pantallas admin.
- Sustituir Tailwind global del portal por Bootstrap en todo el SPA (solo scope `.cq-admin` o página Casas).

## 3. Criterios de aceptación

| ID | Criterio |
|----|----------|
| CA-1 | Side-by-side con `Casas.cshtml`: hero + KPI + split tabla/panel reconocibles (checklist design §4). |
| CA-2 | `bootstrap` en `package.json`; estilos cargados sin romper shell existente (sidebar/login siguen Tailwind). |
| CA-3 | Variables Bootstrap (`--bs-primary`, etc.) mapeadas a tokens Pantone de `index.css`. |
| CA-4 | Edición/alta en panel lateral; fila activa resaltada (`cq-row-active`). |
| CA-5 | Tests Vitest: panel abre/cierra, POST/PUT desde panel, delete con confirm. |
| CA-6 | `npm test` + `tsc` + `vite build` verdes. |
| CA-7 | Filtros en encabezados de tabla Casas (Condominio, Dirección, Núm., Propietario, Estado) + búsqueda global; contador “N de M” al filtrar. |
| CA-8 | Tabla filtrable **genérica** en `shared/`: `AdminFilterableTable` + `useClientTableFilter` + `filterClientTableRows`; Casas solo define columnas/accessors en `features/admin/casas/casasTableFilter.ts`. |
| CA-9 | UX listado: una sola barra superior (`AdminListToolbar`); prohibido apilar `h1` + hero + `card-title` + conteo repetido (design §9). |

## 4. Invariantes

- INV-PAT2-1: No cambiar contratos REST de Casas.
- INV-PAT2-2: Paleta de producto sigue siendo Pantone (`index.css`); Bootstrap es **implementación**, no nueva marca azul `#1976d2` hardcodeada en JSX.
- INV-PAT2-3: Reutilizar `ConfirmDialog` / validación RHF+Zod de FE-PAT-001 dentro del panel.
- INV-PAT2-4: Lógica de filtrado **no** duplicada por CRUD; cada dominio aporta `TableFilterColumn[]` + `TableFilterAccessors<T>` (o archivo `*TableFilter.ts` en su feature).

## 5. Relación con FE-PAT-001

| Entregable FE-PAT-001 | En FE-PAT-002 |
|----------------------|---------------|
| `FormModal` centrado | Panel lateral como UX principal; modal solo si fallback móvil |
| `PageHeader` / `SectionHero` Tailwind | Sustituidos o compuestos por hero/card Bootstrap en piloto Casas |
| `AdminDataTable` | Listas simples sin filtros por columna; **tablas admin con filtros** → `AdminFilterableTable` (CA-8) |

No se revierte FE-PAT-001 en git sin `/completar` de fase 1; esta fase **sustituye presentación** del piloto Casas.

## 6. Pasada adversarial (resumen)

- Riesgo: Bootstrap + Tailwind chocan → **mitigación:** scope `.cq-admin-page` + orden de imports (design §2).
- Riesgo: bundle pesado → **mitigación:** import modular `bootstrap/dist/css/bootstrap.min.css` + un solo CSS cq; no Admin Pro completo.
- Riesgo: copiar flujos de usuario no soportados por API → **mitigación:** Won’t explícito §2.

**Veredicto:** APROBADO para `/diseñar` → aceptación diseño → `/ejecutar`.

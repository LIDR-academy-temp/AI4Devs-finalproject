[← index](_index.md) | [spec](spec.md)

# design.md — FE-UX-005: Rollout admin móvil

## Estrategia técnica

**Decisión:** replicar el patrón validado en [[FE-UX-004]] sin cambiar kit compartido (salvo fixes puntuales). Por página: quitar banner listado → `useQueryErrorToast`; envolver tabla + `AdminMobileCardList` en `<>…</>`; mapper `*MobileCard.tsx` en la carpeta `features` del dominio.

**No crear** abstracción genérica de página — el copy-paste controlado mantiene acciones distintas (Link en Perfiles, Salida en Visitas, etc.).

### Escalera de decisión

| Capacidad | Peldaño | Objeto |
|-----------|---------|--------|
| Rollout UI | 3 | Reuso `AdminMobileCard*` + `useQueryErrorToast` |
| Nuevos componentes shared | — | Ninguno esperado |

## frontend:Web

### Inventario por pantalla

| Página | Split | Acción card (`onActivate`) | Error listado hoy | Toast mutación (Should) |
|--------|-------|---------------------------|-------------------|-------------------------|
| `AdminAnunciosPage` | Sí | `openEdit(a)` | dismissible | create/update/delete |
| `AdminEncuestasPage` | Sí | `openEdit(e)` | dismissible | publish/delete |
| `AdminArchivosPage` | Sí | `openEdit(a)` | dismissible | upload/update/delete |
| `AdminTiposArchivoPage` | Sí | `openEdit(t)` | (revisar; si hay banner listado) | create/update |
| `AdminJuntasPage` | Sí | `openEdit(j)` | dismissible | save/toggle/delete |
| `AdminVisitasPage` | Sí (alta) | Sin edit fila; card muestra datos + botón **Salida** si aplica | dismissible | salida/registro éxito |
| `AdminVehiculosPage` | Sí | `openEdit(v)` | `error` + `searchError` → **un** toast (combinar mensajes o dos hooks) | save/delete |
| `AdminMascotasPage` | No | Sin `onActivate` (solo lectura) | dismissible | N/A |
| `AdminPerfilesPage` | No | `navigate` / `Link` a permisos en card (botón secundario) | `alert` estático | N/A |

### Archivos nuevos (por dominio)

| Archivo | Campos card (orientativo) |
|---------|---------------------------|
| `features/admin/anuncios/AnuncioAdminMobileCard.tsx` | título, vigencia/estado, tipo |
| `features/admin/encuestas/EncuestaAdminMobileCard.tsx` | título, estado publicación, fechas |
| `features/admin/archivos/ArchivoAdminMobileCard.tsx` | nombre, tipo, fecha |
| `features/admin/archivos/TipoArchivoAdminMobileCard.tsx` | nombre, extensión |
| `features/admin/juntas/JuntaAdminMobileCard.tsx` | título, fecha, activa |
| `features/admin/visitas/VisitaAdminMobileCard.tsx` | visitante, casa, entrada; CTA salida |
| `features/admin/vehiculos/VehiculoAdminMobileCard.tsx` | placas, marca/modelo, propietario |
| `features/admin/mascotas/MascotaAdminMobileCard.tsx` | nombre mascota, dueño, vacunas |
| `features/navegacion/PerfilAdminMobileCard.tsx` | nombre, admin badge, link permisos |

### Archivos modificados

- 9× `Admin*Page.tsx` (lista arriba)
- Tests existentes: `AdminAnunciosPage.test.tsx`, `AdminEncuestasPage.test.tsx`, `AdminArchivosPage.test.tsx`, `AdminJuntasPage.test.tsx`, `AdminVisitasPage.test.tsx`, `AdminVehiculosPage.test.tsx`, `AdminMascotasPage.test.tsx`
- **Crear:** `AdminPerfilesPage.test.tsx` (mínimo: carga + toast error)
- **Opcional:** `AdminTiposArchivoPage.test.tsx` si no existe — smoke toast

### Reglas toast (igual FE-UX-004)

| Origen | Tratamiento |
|--------|-------------|
| Error hook listado | `useQueryErrorToast` |
| `formError`, `deleteError`, `publishError`, etc. en panel/dialog | alert inline |
| Éxito mutación página | `toast.success` (Should; mensajes ES cortos) |

**Vehículos:** `useQueryErrorToast(error)` y `useQueryErrorToast(searchError)` o un `useMemo` de mensaje único.

**Perfiles:** reemplazar `alert` estático por `useQueryErrorToast(error)`.

## database / backend / integrations

No aplica.

## Contenido configurable

No aplica.

## Valores nuevos y sus consumidores

No aplica.

## Orden de implementación

| # | Lote | Páginas | Verificación |
|---|------|---------|--------------|
| 1 | Comunidad | Anuncios, Encuestas, Juntas | `npm test` páginas del lote |
| 2 | Registro | Archivos, TiposArchivo, Vehículos, Visitas | idem |
| 3 | Catálogo / lectura | Mascotas, Perfiles | idem + nuevo test Perfiles |
| 4 | Cierre | — | `tsc`, `npm test` completo, `vite build` |

**Rama:** `feature/fe-ux-005-admin-mobile-rollout`

## Plan de pruebas (Vitest)

| ID | Tipo | Caso | Expected |
|----|------|------|----------|
| TC-HP-1 | Happy | Anuncios lista | Card/list data visible (`getAllBy*` si duplicado) |
| TC-HP-2 | Happy | Perfiles | Link/botón permisos en card |
| TC-ERR-1 | Error | Mascotas error API | `toast.error`; sin banner dismissible listado |
| TC-ERR-2 | Error | Visitas error carga | toast; sin banner página |
| TC-R-1 | Regresión | Casas/Tickets (FE-UX-004) | Tests pilotos sin cambio de comportamiento |
| TC-R-2 | Regresión | Suite global | 214+ tests pass |

**T-SQL:** N/A.

## Riesgos

| Riesgo | Mitigación |
|--------|------------|
| PR grande | Lotes en un commit o commits por lote; un solo ticket SDD |
| Visitas sin `openEdit` | Card + botón Salida explícito (no `onActivate` confuso) |
| Duplicado DOM en tests | Patrón `getAllBy*` de FE-UX-004 |

## Rollback

Revertir `Web/` del rollout.

## Agentes

- `/ejecutar`: `desarrollador-react`, `git-frontend` Modo 1
- `/revisar`: `frontend-tester` si faltan tests, `auditor-codigo`

## Pre-mortem

1. Olvidar fragment `<> tabla + list </>` → error compile.
2. Toast en `formError` → viola CA-4 → checklist por archivo.
3. Perfiles sin test → crear mínimo en lote 3.

## Pasada adversarial (design)

| # | Objeción | Respuesta |
|---|----------|-----------|
| D1 | 9 mappers = mantenimiento | Aceptado; dominio explícito mejor que mega-config |
| D2 | TiposArchivo poco usado | Incluido en Must por spec; test ligero |
| D3 | Visitas card no abre panel | Panel es alta nueva, no edición fila — diseño coherente |

**Veredicto:** ejecutable.

## Lectura en frío

- **SCORE: 8/10**
- **AMBIGÜEDADES:** mensajes `toast.success` exactos por pantalla — usar plantilla FE-UX-004.

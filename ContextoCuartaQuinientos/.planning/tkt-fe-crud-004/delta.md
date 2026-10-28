# Delta: tkt-fe-crud-004 — Residente UX

> [← index](_index.md) | [← impl](impl.md)

## Comportamiento agregado

- Helper `downloadAuthenticated` (JWT + refresh 401 + `credentials: 'include'`) para blobs en rutas residente.
- Schemas Zod residente: `reservasSchemas`, `vehiculoResidenteSchemas`, `mascotaResidenteSchemas`.
- Kit admin (`PageHeader`, `AlertBanner`, `EmptyState`, `FormModal`, `ConfirmDialog`) en inventario M5 residente sin Bootstrap.
- Tests Vitest: `TC-RES-1`, `useVisitasHooks.test.ts`, ampliación archivos/tickets/reservas.

## Comportamiento modificado

- **(Antes):** `useCrearTicket` vía GraphQL (`tickets.gql.ts`); `ArchivosPage` leía token de `localStorage`; hooks visitas asignaban el objeto `{ data, status }` entero al estado; vehículos/mascotas usaban `confirm`/`alert`.
- **(Después):** `POST /TKT/Tickets` con `apiPost` + `problem`; descarga vía `downloadAuthenticated`; `useAreasComunes` / `useReservaciones` / `useMascotas` desestructuran `apiGet`; CRUD propio con `ConfirmDialog` y errores API; `PerfilPage` carga con loading y auth por defecto de `apiClient`.

## Comportamiento eliminado

- `Web/src/features/tickets/tickets.gql.ts` (creación de ticket residente ya no usa GraphQL en la SPA).

## Objetos SQL afectados

| Objeto | Tipo | Acción |
|--------|------|--------|
| — | — | Sin cambios |

## Endpoints API afectados

| Endpoint | Verbo | Acción |
|----------|-------|--------|
| — | — | Sin cambios (solo consumo existente) |

## Para el reviewer

- **Qué se hizo:** Unificación UX/auth residente (M1–M5): REST tickets, descargas autenticadas, formularios Zod y kit UI en rutas `/tickets`, `/areas-comunes`, registro personal y comunidad lectura.
- **Por qué:** [[FE-CRUD-004]] — cerrar oleada CRUD residente del roadmap.
- **Riesgo:** Bajo — solo SPA; bug hooks visitas corregido en `/revisar`.
- **Qué probar:** Crear ticket → lista; reservar área (éxito y 409); descargar archivo; CRUD vehículo/mascota; `npm test` 188/188.
- **Rollback:** Revertir commit Web; no hay DDL.

## Aprendizajes

| target | aprendizaje |
|--------|-------------|
| frontend | Siempre desestructurar `apiGet`/`apiPost`; tests de página que mockean hooks no detectan asignación incorrecta del objeto respuesta — añadir tests de hook. |
| frontend | Descargas binarias: `downloadAuthenticated` + Bearer; prohibido `localStorage` para token. |
| frontend | Residente reutiliza kit `shared/components/admin` + Tailwind; admin mantiene Bootstrap scoped (split de shells). |

## Decisiones (ADR)

### ADR-FE-004-01 — Creación ticket residente solo REST

- **target:** frontend
- **Contexto:** GraphQL duplicaba contrato ya expuesto en `POST /TKT/Tickets`.
- **Decisión:** `useCrearTicket` llama REST; eliminar `tickets.gql.ts` en scope residente.
- **Consecuencias:** `specs/tickets.md` actualizado; GraphQL puede quedar para otros clientes.

### ADR-FE-004-02 — Patrón residente sin Bootstrap

- **target:** frontend
- **Contexto:** M4 exige paridad de componentes sin importar Bootstrap en rutas residente.
- **Decisión:** Mismo kit admin (modales/banners) con Tailwind en páginas `/mis-*`, `/anuncios`, etc.
- **Consecuencias:** Documentado en `specs/frontend.md` § Residente.

# Proposal — web-shell

Issue: #3 · T1 · Scaffold del frontend, pantalla Login y pantalla Accounts · Historia HU0 · Tramo 1 · Depende de #1 (`auth-login`) y #2 (`catalog-read`), ambos archivados.

## Why

El API ya autentica (`/api/v1/auth/*`) y sirve el catálogo con alcance por merchant (`/api/v1/merchants`, `/providers/*`, `/accounts/*`, `/channels*`), pero `frontend/` está vacío: nadie puede entrar a la aplicación ni ver una cuenta sin `curl`. Todas las pantallas de los tramos 2–4 (Upload, Column Mapping, Analysis, Settlement Review) necesitan antes el mismo armazón: workspace de Vite en el monorepo, cliente HTTP con el JWT y el refresh, sesión, layout con navegación filtrada por permisos y una forma fija de escribir pantallas y sus tests. Este change lo construye una vez y lo estrena con las dos pantallas del issue: **Login** y **Accounts**.

## Secciones del README que implementa

- **§1.3 Mapa de pantallas**: Login; Dashboard solo como armazón (barra lateral y migas, sin widgets); Administration › Accounts en lectura. Nombres de pantalla y de menú en inglés, tal como aparecen en la tabla.
- **§2.2 Frontend**: SPA React 19 + Vite, estado de servidor en TanStack Query, shadcn/ui sobre Tailwind, React Hook Form con los esquemas Zod de `@recon/shared`.
- **§2.3 Estructura**: `frontend/src/{app,features,components/ui,lib/api}`; organización por *feature* con componentes, consultas y tests juntos; cliente tipado generado desde el contrato OpenAPI (`docs/openapi.yaml`).
- **§2.5 Seguridad**: JWT de acceso corto con refresh; permisos y alcance resueltos en el backend, el frontend solo oculta lo que el rol no puede usar.
- **§4.4 Inventario**: consume `POST /auth/login|refresh|logout`, `GET /auth/me`, `GET /merchants`, `GET /merchants/{id}/providers`, `GET /providers/{id}`, `GET /accounts/{id}/channels`, `GET /channels?unassigned=true`. Ningún endpoint nuevo.

## What Changes

- **Workspace `frontend/` (`@recon/frontend`)** en el monorepo pnpm: Vite + React 19 + TypeScript, Tailwind y shadcn/ui, TanStack Query, router (D3), React Hook Form. `pnpm dev` levanta API y UI en paralelo; `pnpm lint`, `pnpm typecheck` y `pnpm test` lo incluyen; Biome compartido con las mismas reglas que el backend (`noConsole` incluido).
- **Contrato OpenAPI versionado** en `docs/openapi.yaml`, exportado desde la app Fastify con un script del backend (`pnpm openapi:export`); el frontend genera de él sus tipos (`openapi-typescript`) y usa `openapi-fetch` como cliente. CI comprueba que el contrato versionado coincide con el que sirve el backend.
- **Cliente HTTP con sesión**: inyecta `Authorization: Bearer`, ante un `401` renueva el par una sola vez (refresh de un solo vuelo, aunque fallen varias peticiones a la vez) y repite la petición; si el refresh falla, cierra la sesión y lleva a Login con la ruta de vuelta. Almacenamiento de tokens según D1.
- **Pantalla Login**: formulario con validación `LoginRequest` de `@recon/shared`, error genérico único para cualquier `401`, error de red diferenciado, redirección a la ruta pedida.
- **Layout autenticado**: barra lateral con el mapa del producto de §1.3, filtrada por los permisos del rol (las entradas aún no construidas se muestran deshabilitadas, D5), migas de pan, identidad (nombre, rol, merchants visibles) y Sign out. Guarda de ruta por sesión y por permiso.
- **Pantalla Accounts** (`/accounts?merchantId=&providerId=`): merchant → proveedor → cuentas del proveedor con política de reserva, tope, estado y sus canales marcando cuál es principal y cuál histórico (con la cuenta principal actual); aviso ámbar con los canales *not assigned yet* del proveedor (`RAM-07` en Provider A, `RAM-13` en Provider B).
- **Textos de UI en inglés**, en un módulo `strings.ts` por pantalla y uno para el layout.
- **Tests de componentes** con Vitest + Testing Library + MSW (fixtures del mundo del seed); CI construye y testea el frontend.

## Capabilities

### New Capabilities

- `web-shell`: comportamiento de la aplicación web común a todas las pantallas: sesión en el navegador (login, almacenamiento y renovación de tokens, expiración, logout), guarda de rutas por sesión y por permiso, layout con navegación filtrada por permisos e identidad del usuario. Las pantallas de dominio no van aquí, sino en la capability de su dominio (D4).

### Modified Capabilities

- `accounts`: se añade el requisito de la **pantalla Accounts** (selección merchant → proveedor, cuentas con canales principal/histórico, aviso de canales sin asignar, alcance visible). Los requisitos de API existentes no cambian y ya tienen todos al menos un escenario.

## Escenarios de aceptación (del issue #3)

1. Sin sesión, cualquier ruta lleva a Login; con credenciales del seed (`analyst` / `SEED_PASSWORD`) entro y veo mi nombre y rol.
2. Con `viewer` no veo las entradas de menú del flujo de importación y settlement (grupo Reconciliation) ni Payments (interpretación a confirmar, D5).
3. En Accounts, al elegir un proveedor veo sus cuentas, sus canales y el aviso de canales sin cuenta (`RAM-07`, `RAM-13`).
4. La UI está en inglés y los textos viven en un módulo de strings por pantalla.

La versión normativa está en `specs/web-shell/spec.md` y `specs/accounts/spec.md`.

## Fuera de alcance

Crear o editar cuentas (botón **New account**, tramo 5); **Account Detail** y **Merchants & Providers** (pasan a la Entrega 3, tramo 5; ver D9); widgets del Dashboard (`GET /dashboard` no existe); columnas **Fees** y **Last batch** del prototipo de Accounts (sus endpoints son de tramos posteriores); cookies httpOnly para el refresh (requiere cambiar el contrato de `auth`); E2E con Playwright; internacionalización (solo inglés); diseño visual final.

## Impact

- **Código nuevo**: `frontend/` completo; `backend/scripts/export-openapi.ts` y script `openapi:export`; `docs/openapi.yaml`.
- **Código modificado**: `biome.json` (overrides de `frontend/src`, exclusión del fichero de tipos generado), `.github/workflows/ci.yml` (build del frontend y comprobación del contrato), `pnpm-lock.yaml`, `frontend/.env.example` nuevo. `pnpm-workspace.yaml` ya incluye `frontend`.
- **API y base de datos**: sin cambios. Sin migraciones. Sin `@fastify/cors` (D2).
- **Dependencias nuevas** (solo en `frontend`): react, react-dom, vite, @vitejs/plugin-react, tailwindcss + @tailwindcss/vite, shadcn/ui (Radix, class-variance-authority, clsx, tailwind-merge, lucide-react), @tanstack/react-query, router (D3), react-hook-form, @hookform/resolvers, openapi-fetch, openapi-typescript (dev), vitest, jsdom, @testing-library/react, @testing-library/user-event, @testing-library/jest-dom, msw.
- **Siguientes tramos**: T2–T4 añaden pantallas como nuevas carpetas en `features/` y nuevas rutas; reutilizan cliente, sesión, guardas, layout y helpers de test sin tocarlos.

# Tasks — web-shell

Rama: `feat/web-shell` (ya creada). Sin migraciones ni cambios de esquema ni de API. Referencias: `specs/web-shell/spec.md` y `specs/accounts/spec.md` (qué), `design.md` D1–D12 (cómo). D1–D6 y D9 aprobadas; si D6 (exportar contrato o generar cliente) se atasca, parar y proponer la alternativa sin aplicarla. En los grupos con tests, el test se escribe y se ve fallar (rojo) antes del código; en verde, se rompe el código a propósito una vez para comprobar que el test lo detecta, y se restaura.

## 1. Contrato OpenAPI versionado (backend)

- [x] 1.1 Test (rojo) `backend/src/openapi/export-openapi.test.ts`: `buildOpenApiDocument()` devuelve un YAML que contiene `/api/v1/auth/login`, `/api/v1/auth/me`, `/api/v1/providers/{providerId}` y el esquema `bearerAuth`, sin conectar a la base (cliente Prisma de relleno); verificar que `pnpm --filter @recon/backend test` falla por módulo inexistente
- [x] 1.2 Implementar `backend/src/openapi/export-openapi.ts` (`buildApp()` con Prisma de relleno y `JWT_SECRET` de exportación no secreto, `app.swagger({ yaml: true })`) y `backend/scripts/export-openapi.ts` que escribe `docs/openapi.yaml`; scripts `openapi:export` en backend y raíz; verificar 1.1 en verde, que `pnpm openapi:export` genera el fichero y que ejecutarlo dos veces no produce diff
- [x] 1.3 Commit: `test(backend): exportación del contrato OpenAPI` y después `feat(backend): exportar el contrato OpenAPI a docs/openapi.yaml`

## 2. Scaffold del workspace `frontend`

- [x] 2.1 Crear `frontend/` como `@recon/frontend` (Vite + React 19 + TypeScript estricto, alias `@/`), con dependencias de la sección Impact del proposal y `@recon/shared: workspace:*`; scripts `dev`, `build`, `preview`, `typecheck`, `test`, `api:generate`; verificar `pnpm install` y `pnpm --filter @recon/frontend build` en verde
- [x] 2.2 Configurar Tailwind (`@tailwindcss/vite`) e inicializar shadcn/ui (`components.json`, `components/ui` con button, input, label, select, card, badge, alert, table, skeleton); formatear con Biome; verificar que una página de prueba con `Button` compila y `pnpm lint` pasa
- [x] 2.3 `vite.config.ts` con proxy `/api` → `API_PROXY_TARGET` (por defecto `http://localhost:3000`) (D2); `frontend/.env.example` con `VITE_API_URL=` (origen; vacío = mismo origen) y `API_PROXY_TARGET`, comentarios en inglés; verificar con la API levantada que `curl http://localhost:5173/api/v1/health` responde a través del proxy
- [x] 2.4 `api:generate` con `openapi-typescript ../docs/openapi.yaml -o src/lib/api/schema.gen.ts`; script raíz `openapi:check` que regenera contrato y tipos y hace `git diff --exit-code docs/openapi.yaml frontend/src/lib/api/schema.gen.ts`; verificar que `pnpm openapi:check` pasa sin cambios
- [x] 2.5 `biome.json`: override `frontend/src/**` con `noConsole: error` y exclusión de `frontend/src/lib/api/schema.gen.ts` (D12); verificar `pnpm lint` y `pnpm typecheck` en verde
- [x] 2.6 Infra de tests: Vitest con `jsdom`, `test/setup.ts` (jest-dom, MSW `onUnhandledRequest: 'error'`, limpieza de `sessionStorage`), `test/msw/fixtures.ts` con el mundo del seed tipado con los tipos generados (merchants 1–2, proveedores 101/102/201, las cinco cuentas con UUID fijos, canales y filas `AccountChannel`, unassigned 1007 y 1013, los cuatro usuarios de `/auth/me`), `test/msw/handlers.ts` (el helper `test/render.tsx` se crea en 4.3, cuando existe el router); un test humo que importa `LoginRequest` de `@recon/shared` y lo valida (comprueba la resolución `.js` → `.ts` del riesgo de design); verificar `pnpm test` en verde desde la raíz
- [x] 2.7 Verificar `pnpm dev` desde la raíz: levanta API (3000) y UI (5173) en paralelo
- [x] 2.8 Commit: `chore(frontend): scaffold del workspace con Vite, Tailwind, shadcn/ui y Vitest`

## 3. Sesión y cliente HTTP con refresh

- [x] 3.1 Test (rojo) `lib/session/*.test.ts` con MSW: el access token se envía como `Bearer`; un `401` provoca un refresh y una repetición con el token nuevo; tres peticiones con `401` simultáneo producen exactamente un `POST /auth/refresh` y las tres se repiten; refresh `401` → `session.expire()` llamado una vez y tokens borrados; la repetición con `401` no vuelve a refrescar (sin bucle); el refresh vive en `sessionStorage` y el access token no; `logout()` llama a `/auth/logout`, limpia aunque responda error de red; las rutas `/auth/*` no pasan por `authFetch`
- [x] 3.2 Commit: `test(frontend): sesión, refresh de un solo vuelo y expiración`
- [x] 3.3 Implementar `lib/session/session.ts`, `lib/session/auth-fetch.ts` y `lib/api/client.ts` (D1, D7); verificar 3.1 en verde y romper a propósito la promesa compartida del refresh para ver fallar el caso de tres peticiones; restaurar
- [x] 3.4 Commit: `feat(frontend): cliente HTTP con JWT, refresh y expiración de sesión`

## 4. Router, guardas y pantalla Login

- [x] 4.1 Test (rojo) `features/auth/LoginPage.test.tsx` y `app/guards.test.tsx` sobre la app completa en memoria: sin sesión, `/accounts?merchantId=1&providerId=101` muestra Login con `redirect` y MSW no recibe rutas protegidas; login de `analyst` llega a Dashboard; login desde la ruta pedida vuelve a ella; `redirect=//evil.example` se ignora; User name vacío → mensaje junto al campo, foco y cero peticiones; botón deshabilitado durante el envío; `401` → `Invalid user name or password`, Password vacío y User name conservado; `500` y error de red → `Cannot reach the server. Try again in a moment.`; con refresh en `sessionStorage`, recargar `/accounts` no muestra Login; `/login` con sesión → Dashboard; expiración → Login con `Your session has expired. Please sign in again.` y vuelta a la ruta tras entrar; una ruta de prueba que requiere `settlement.process` muestra `You don't have access to this page` a `viewer` sin llamar a sus endpoints y la pantalla a `analyst`
- [x] 4.2 Commit: `test(frontend): pantalla Login y guardas de sesión y permiso`
- [x] 4.3 Implementar `app/router.tsx` (TanStack Router en código, D3: raíz con arranque de sesión, ruta pública `/login` con `validateSearch` de `redirect` y `reason`, layout autenticado con `beforeLoad`, `requires` por ruta), `app/App.tsx` (proveedores y redirección al expirar), `test/render.tsx`, `AppLayout` mínimo con la guarda de permiso, las páginas `Dashboard`, `NotFound` y `Forbidden` (adelantadas del grupo 5 porque las guardas las necesitan) y `features/auth/{LoginPage.tsx,strings.ts}` con React Hook Form + `zodResolver(LoginRequest)`; verificar 4.1 en verde y romper a propósito la comprobación de permiso para ver fallar el caso de `viewer`; restaurar
- [x] 4.4 Commit: `feat(frontend): pantalla Login, router y guardas de ruta`

## 5. Layout, navegación por permisos y Dashboard

- [x] 5.1 Test (rojo) `app/layout/*.test.tsx`: `viewer` no ve el grupo Reconciliation ni Payments, Users & Roles ni Audit Log y ve Dashboard y Accounts como enlaces; `analyst` ve New Reconciliation e In Progress deshabilitadas (`aria-disabled`, sin cambio de ruta al pulsar) y no ve Payments; `admin` ve todas las entradas MVP de §1.3 y solo Dashboard y Accounts son enlaces; cabecera con `Analyst` · `analyst` · `Merchant A, Merchant B` y `Admin` · `admin` · `All merchants`; migas `Dashboard › Administration › Accounts`; `/does-not-exist` → `Page not found` con enlace a Dashboard; **Sign out** llama a `/auth/logout`, lleva a Login y Atrás no muestra datos
- [x] 5.2 Commit: `test(frontend): navegación filtrada por permisos, identidad y cierre de sesión`
- [ ] 5.3 Implementar `app/layout/{nav-config.ts,Sidebar.tsx,Header.tsx,Breadcrumbs.tsx,AppLayout.tsx,strings.ts}` con la tabla de D5 (las páginas del armazón ya existen desde 4.3) y la ruta `/accounts` con `crumbs` y una `AccountsPage` con solo su título, que el grupo 6 completa; verificar 5.1 en verde y romper a propósito el filtro por permiso de `nav-config` para ver fallar el caso `viewer`; restaurar
- [ ] 5.4 Commit: `feat(frontend): layout con navegación por permisos, migas y Dashboard vacío`

## 6. Pantalla Accounts

- [ ] 6.1 Test (rojo) `lib/format.test.ts`: `formatDecimal("50000.0000")` = `"50,000.0000"`, `"0.0000"` = `"0.0000"`, `"1234567.5"` = `"1,234,567.5"`, `"-1500.25"` = `"-1,500.25"`; implementado sobre el string, sin pasar por `Number` (el `none` de un tope `null` lo pone la pantalla desde `strings.ts`)
- [ ] 6.2 Test (rojo) `features/accounts/AccountsPage.test.tsx` con los escenarios de `specs/accounts`: `viewer` → solo Merchant A preseleccionado, Provider A y Provider B; `analyst` elige Merchant B → Provider C preseleccionado; enlace directo `?merchantId=1&providerId=102` de `admin`; `viewer` con `?merchantId=2&providerId=201` → `This merchant or provider is not available.` sin datos de Provider C; Provider A → `ProviderA-EUR`, `ProviderA-USD` en orden, `hold_until_term`, tope `50,000.0000` y `none`, `active`; Provider B → `ProviderB-Main` con `release_on_chargeback`; canales `primary` RAM-01/RAM-02 en ProviderA-USD y RAM-03 en ProviderA-EUR; con la fila histórica de RAM-01 en ProviderA-EUR → `primary in ProviderA-USD`; aviso ámbar con RAM-07 (Provider A) y RAM-13 (Provider B), ninguno en Provider C; proveedor sin cuentas → `This provider has no accounts yet.`; `500` → `Could not load accounts.` y **Retry** carga; al cambiar de proveedor con respuesta pendiente no se muestran datos del anterior
- [ ] 6.3 Commit: `test(frontend): pantalla Accounts con canales y aviso de canales sin asignar`
- [ ] 6.4 Implementar `lib/format.ts`, `features/accounts/{queries.ts,AccountsPage.tsx,strings.ts}` (D8: `validateSearch` con `IntId`, `useQueries` por cuenta, unassigned filtrado por `providerId`) y la ruta `/accounts` enlazada desde el menú; verificar 6.1 y 6.2 en verde y romper a propósito el filtro por `providerId` del aviso para ver fallar el caso de Provider B; restaurar
- [ ] 6.5 Commit: `feat(frontend): pantalla Accounts con selección merchant → proveedor y canales`

## 7. CI, prueba manual y documentación

- [ ] 7.1 `.github/workflows/ci.yml`, job `check`: después de `pnpm test`, `pnpm openapi:check` y `pnpm --filter @recon/frontend build`; verificar en el PR que el job `check` queda en verde
- [ ] 7.2 Prueba manual contra la API real: con la base levantada y sembrada (si hace falta, la persona ejecuta `! pnpm db:seed` dentro de la sesión), `pnpm dev`, entrar como `viewer`, `analyst` y `admin`, recorrer Login, menú, Accounts (Provider A con RAM-07, Provider B con RAM-13), F5 en Accounts, Sign out, y expiración (sustituir en DevTools el refresh de `sessionStorage` por uno ya usado y recargar → Login con el aviso); anotar el resultado en el PR
- [ ] 7.3 Capturas de Login y Accounts (Provider A) a 1280 px en `docs/wireframes/impl/` y una línea en `docs/wireframes/README.md` que las enlace; actualizar `prompts.md` con el registro de este change
- [ ] 7.4 Verificar `pnpm lint && pnpm typecheck && pnpm test && pnpm openapi:check && pnpm --filter @recon/frontend build` en verde y `openspec validate web-shell --type change --strict` sin avisos
- [ ] 7.5 Commit: `ci(frontend): build del frontend y comprobación del contrato OpenAPI` y después `docs(frontend): capturas de Login y Accounts y registro en prompts.md`

## Workflow follow-up

- `/opsx:verify` para contrastar implementación y artifacts.
- PR desde `feat/web-shell` hacia `feature/entrega-2-MVP` con la plantilla, citando §1.3, §2.2, §2.3, §2.5 y §4.4, issue #3.
- `/opsx:archive` tras el merge: crea `openspec/specs/web-shell/spec.md` y añade los requisitos de pantalla a `openspec/specs/accounts/spec.md`.

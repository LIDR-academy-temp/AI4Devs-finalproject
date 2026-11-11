# Design — web-shell

> **Decisiones aprobadas** (2026-10-15): D1–D4 tal como están (⚑); D5 con Settlement List visible para `viewer` y Audit Log → `user.manage` confirmados; D6 aprobada con condición: si exportar el contrato o generar el cliente se atasca, se para y se propone la alternativa (`fetch` con tipos `z.infer`, documentada como desviación del README) sin aplicarla hasta que se apruebe; D9 aprobada, sin issue de seguimiento: Merchants & Providers y Account Detail pasan a la Entrega 3 (tramo 5).

## Context

- `frontend/` está vacío; `pnpm-workspace.yaml` ya lo incluye y la raíz ejecuta `pnpm -r --parallel dev|typecheck|test`, así que un `package.json` con esos scripts basta para que `pnpm dev`, `pnpm typecheck` y `pnpm test` lo recojan. `pnpm lint` es `biome check .` en la raíz.
- API (archivado en `auth-login` y `catalog-read`, ver `openspec/specs/auth` y `openspec/specs/accounts`):
  - `POST /api/v1/auth/login` → `TokenPair { accessToken, refreshToken, expiresIn: 900 }`; `401 invalid_credentials` con mensaje único.
  - `POST /api/v1/auth/refresh` con `{ refreshToken }` en el **cuerpo**; rota el refresh (el usado queda revocado); `401 invalid_token`.
  - `POST /api/v1/auth/logout` con `{ refreshToken }` → `204`, idempotente.
  - `GET /api/v1/auth/me` → `MeResponse { userId, userName, displayName, email, role, permissions[], merchantScope, merchants[] }`.
  - Rutas protegidas → `401 unauthorized` sin token válido. El API no emite cookies ni tiene CORS configurado.
  - Catálogo: `GET /merchants`, `/merchants/{id}/providers`, `/providers/{id}` (con `accounts[]` y `channels[]`), `/accounts/{id}/channels` (`isPrimary`, `primaryAccount`), `/channels?unassigned=true`. No hay listado global de cuentas.
- `@recon/shared` exporta los esquemas Zod (`LoginRequest`, `MeResponse`, `ProviderDetail`, `AccountChannelItem`…), `PermissionCode` y `ROLES`; su `main` es `src/index.ts` (TypeScript fuente, imports con sufijo `.js`).
- El Swagger de Fastify se genera desde esos mismos esquemas y se sirve en `/docs/json`; no existe todavía `docs/openapi.yaml` (README §2.3 lo prevé).
- Seed: usuarios `admin` (all), `analyst` (merchants 1 y 2), `payments` (1 y 2), `viewer` (1); Provider A (101: `ProviderA-EUR`, `ProviderA-USD`; canales RAM-01/02/03/07), Provider B (102: `ProviderB-Main`; RAM-11/12/13), Provider C (201, merchant 2: `ProviderC-Alt`, `ProviderC-USD`); *not assigned yet* = RAM-07 y RAM-13.
- Wireframes (`docs/wireframes/png`): Login, Dashboard (armazón), Accounts. Convención de color: azul = acción, ámbar = advertencia, rojo = bloqueo. Los datos del prototipo son ilustrativos.
- Discrepancia detectada: el prototipo de Login cita un mensaje `User inactive, contact an administrator`; la spec `auth` (requisito "Rechazo genérico de credenciales") lo prohíbe. Manda la spec: un único mensaje.

## Goals / Non-Goals

**Goals:**
- Un armazón que T2–T4 extiendan añadiendo una carpeta en `features/` y una ruta, sin tocar sesión, cliente ni layout.
- La sesión y la renovación de tokens probadas con MSW de punta a punta (sin servidor real), incluidos los casos de carrera.
- Tipos del cliente derivados del contrato que sirve el backend, no escritos a mano.

**Non-Goals:**
- Autorización real en el cliente: el frontend solo oculta; quien decide es el API (README §2.5).
- Cachés persistentes, modo offline, SSR.
- Sistema de diseño propio: shadcn/ui con sus valores por defecto y la convención de color del prototipo.

## Decisions

### D1 ⚑ Dónde viven los tokens (revisada en `apply`: sesión compartida entre pestañas)
**Decisión:** access token **solo en memoria de cada pestaña**; refresh token en **`localStorage`**, compartido por todas las pestañas del origen. La renovación se **serializa entre pestañas con Web Locks** (`navigator.locks`) y el login, el logout y la expiración se **propagan con `BroadcastChannel`**. Sustituye a la versión aprobada antes de `apply` (refresh en `sessionStorage`, una sesión por pestaña), que obligaba a entrar de nuevo en cada pestaña.

Por qué:
- El contrato de `auth` recibe el refresh **en el cuerpo** y no emite cookies; una cookie httpOnly obligaría a cambiar `auth` (cookie `Set-Cookie`, `@fastify/cookie`, protección CSRF, `SameSite`) y su spec. Eso sigue siendo un change de backend propio.
- Memoria para el access token: abre todas las rutas, no queda en disco y dura 15 min. Cada pestaña tiene el suyo.
- `localStorage` para el refresh: una sola sesión para todo el navegador, como espera quien abre Accounts en otra pestaña.
- **Carrera de rotación resuelta con un candado.** El API revoca el refresh usado; si dos pestañas lo usaran a la vez, la segunda perdería la sesión. Por eso toda renovación corre dentro de `navigator.locks.request('recon.refresh', …)`:
  1. La pestaña que obtiene el candado **relee el refresh de `localStorage`** y renueva con el que encuentre: si otra pestaña ya lo rotó, usa el nuevo.
  2. Llama a `POST /auth/refresh`, guarda el refresh nuevo en `localStorage`, se queda con su access token en memoria y suelta el candado.
  3. La siguiente pestaña en la cola repite el paso 1 con el refresh que dejó la anterior.
  Resultado: renovaciones **en serie**, una por pestaña y cada una con el refresh vigente en su turno. El API nunca recibe un refresh ya revocado. Coste asumido: N pestañas que caducan a la vez hacen N llamadas a `/auth/refresh`, a cambio de que **el access token nunca salga de la memoria de su pestaña** (no viaja entre pestañas).
- `BroadcastChannel('recon.session')` se usa **solo para `login`, `logout` y `expire`**: `login` (las pestañas que están en Login entran y van a su ruta de vuelta o a Dashboard; cada una obtiene su access token renovando a través del candado) y `logout` (todas descartan su access token y su caché y van a Login). `expire` (añadido tras la revisión del PR #26, hallazgo 1): la pestaña que no puede renovar borra el refresh compartido y lo anuncia; las demás descartan su access token y su caché y van a Login con el aviso de sesión expirada, cada una con su ruta actual como destino de vuelta, en lugar de esperar a fallar en su siguiente renovación.
- Todos los navegadores soportados (Chrome, Edge, Firefox y Safari recientes) implementan Web Locks y `BroadcastChannel`; no se añade alternativa para los que no.

**Riesgos asumidos:**
- **La sesión sobrevive al cierre del navegador** mientras viva el refresh (**7 días**), porque `localStorage` persiste en disco. En un equipo compartido hay que usar **Sign out**.
- **Sign out corta la sesión en todas las pestañas** a la vez (logout en el API y mensaje `logout`).
- Un XSS podría leer el refresh de `localStorage` (igual que podía con `sessionStorage`). Mitigación: React escapa por defecto, se prohíbe `dangerouslySetInnerHTML` (regla de Biome `security/noDangerouslySetInnerHtml`, ya en `recommended`), ninguna dependencia inyecta HTML, y la rotación hace que un refresh robado y usado invalide el legítimo. La CSP la pone Nginx en el despliegue (fuera de este change).

**Implementación y pruebas:** el módulo de sesión pasa a ser una fábrica (`createSession({ storage, locks, channel })`) con una instancia por defecto para la app, de modo que un test crea dos "pestañas" en el mismo proceso que comparten `localStorage`, el gestor de candados y el canal. **jsdom no implementa `navigator.locks`**: `test/setup.ts` instala un doble en memoria (cola FIFO exclusiva por nombre, la semántica de `request(name, callback)` en modo `exclusive`, el único que usa la app). Si el `BroadcastChannel` de Node no entrega mensajes entre instancias del mismo hilo bajo jsdom, `test/setup.ts` instala también un doble en memoria con la misma API. El test de dos pestañas se rompe a propósito (quitando el candado o la relectura del refresh dentro de él) para comprobar que falla.

Alternativas: (a) ambos tokens en memoria: F5 obliga a volver a entrar; descartada. (b) refresh en `sessionStorage` (versión anterior): sin carrera, pero una sesión por pestaña; sustituida por decisión de producto. (c) refresh en cookie httpOnly + `SameSite=Strict`: la mejor frente a XSS; se deja como endurecimiento futuro con su propio change de `auth` (con ADR cuando se haga). (d) eventos `storage` en vez de `BroadcastChannel`: solo notifican cambios de `localStorage`, no distinguen un login de una renovación; descartada. (e) que la pestaña que renueva publique el access token nuevo para que las demás no llamen al API: una sola llamada, pero el access token saldría de la memoria de su pestaña; descartada a favor de las renovaciones en serie.

### D2 ⚑ CORS en desarrollo
**Propuesta:** **proxy de Vite**. El cliente llama siempre a rutas relativas (`/api/v1/...`); en desarrollo `vite.config.ts` reenvía `/api` a `http://localhost:3000` (configurable con `API_PROXY_TARGET`, variable sin prefijo `VITE_`, por lo que no llega al bundle). `VITE_API_URL` existe (lo pide el issue) y es el **origen** del API, vacío por defecto (mismo origen): las rutas del contrato generado ya incluyen `/api/v1` (ajuste hecho en `apply`, grupo 2).

Por qué: en producción Nginx sirve la SPA y hace proxy de `/api` (README §2.4), es decir, **mismo origen**; con el proxy de Vite el desarrollo reproduce esa topología y CORS no existe en ningún entorno. No se añade `@fastify/cors` ni `CORS_ORIGIN`, que serían superficie de configuración (y de error: `origin: true` por descuido) que producción no necesita.

Alternativa: `@fastify/cors` con `CORS_ORIGIN=http://localhost:5173`; descartada por lo anterior. Sería la opción si la SPA se sirviera desde otro dominio que el API, que no es el caso previsto.

### D3 ⚑ Librería de rutas
**Propuesta:** **TanStack Router**, con árbol de rutas definido en código (sin el plugin de rutas por fichero ni código generado).

Por qué:
- Rutas, `Link` y `navigate` tipados: un enlace a una ruta inexistente o con parámetros mal formados es un error de `tsc`, no un 404 en la demo.
- Parámetros de búsqueda validados con Zod (`validateSearch`): `/accounts?merchantId=&providerId=` hoy, y los filtros de Settlement List o Transaction Search mañana, con el mismo `IntId` de `@recon/shared`.
- `beforeLoad` con contexto tipado (sesión, `queryClient`) resuelve la guarda de sesión y la de permiso en un solo sitio, y se integra con TanStack Query (mismo ecosistema que Query y Table, ya fijados).
- Árbol en código y no por fichero: ~30 rutas en total, sin generador que mantener ni fichero generado que excluir de Biome.

Alternativa: React Router 7 en modo datos (`createBrowserRouter`) — más conocido y con más ejemplos; descartado porque los parámetros de búsqueda no son tipados ni validados y las guardas se repartirían entre `loader` y componentes. Sería la elección si se prioriza familiaridad sobre tipado.

### D4 ⚑ Capability de los escenarios de interfaz
**Propuesta:** **capability nueva `web-shell`** para lo transversal (sesión en el navegador, guardas, layout, navegación por permisos, textos) y **cada pantalla de dominio en la capability de su dominio** (`accounts` en este change; Upload/Column Mapping irán a `import`, Analysis a `validation`, Settlement Review/Summary a `settlement`).

Por qué: quien revise "qué hace `accounts`" encuentra en una sola spec el API y la pantalla que lo usa, y los escenarios de pantalla reutilizan los mismos datos del seed que los de API. La sesión y el layout no tienen dominio propio y no deben ensuciar `auth`, cuyos requisitos son de API. Login se queda en `web-shell` porque su comportamiento (vuelta a la ruta, errores, expiración) es de sesión del navegador; las reglas de credenciales siguen en `auth`.

Alternativas: (a) una capability `frontend`/`ui` con todas las pantallas — cajón de sastre que crecería con cada tramo y separaría cada pantalla de las reglas de negocio que muestra; descartada. (b) Login en `auth` — mezclaría requisitos de API y de navegador en la misma spec; descartada.

### D5 Menú: mapa completo, filtrado por permiso, entradas no construidas deshabilitadas
La barra lateral se define con una única tabla de configuración (grupo, etiqueta, ruta opcional, permiso requerido opcional) con las entradas MVP de README §1.3 (sin las de roadmap). Se filtra por `me.permissions`; las entradas sin ruta todavía se pintan deshabilitadas (`aria-disabled`, etiqueta `Soon`). Así el criterio 2 del issue se comprueba ya en este tramo y T2–T4 solo añaden la ruta a la entrada existente.

Mapa de permisos (derivado de la columna Permiso de README §4.4; confirmado):

| Entrada | Permiso |
|---|---|
| Dashboard, Settlement List, Transaction Search, Missing & Duplicates, Merchants & Providers, Accounts, Channel Assignment, Matching Rules | — (cualquier rol) |
| New Reconciliation, In Progress | `settlement.process` |
| Payments | `payment.process` |
| Unsettled per Channel | `reports.view` |
| Fees | `fee.view` |
| Users & Roles, Audit Log | `user.manage` |

Interpretación del criterio 2 ("`viewer` no ve Import ni Settlement"): se lee como el flujo de importación y settlement (grupo Reconciliation) y Payments. **Settlement List** queda visible para `viewer` porque `GET /settlements` no exige permiso en §4.4. `Audit Log → user.manage` (§4.4 no tiene endpoint de auditoría) queda confirmado.

Alternativa: mostrar solo las entradas construidas (Dashboard y Accounts); descartada porque el filtro por permiso no sería observable hasta T2.

### D6 Cliente HTTP generado desde el contrato
README §2.3 y la Definición de hecho del Ticket 3 piden "cliente generado desde el contrato, sin `fetch` manual". Se cumple así:
- `backend/scripts/export-openapi.ts` (`pnpm openapi:export`): construye la app con `buildApp()` y un cliente Prisma de relleno (sin conectar a la base, como `buildTestApp`), llama a `app.swagger({ yaml: true })` y escribe `docs/openapi.yaml`. Sin servidor ni base de datos.
- `frontend` genera `src/lib/api/schema.gen.ts` con `openapi-typescript` (script `api:generate`) y crea un cliente `openapi-fetch` con esos tipos. El fichero generado se versiona (el build no depende del backend) y se excluye de Biome.
- CI regenera ambos y falla si difieren de lo versionado (`git diff --exit-code docs/openapi.yaml frontend/src/lib/api/schema.gen.ts`).
- Los formularios siguen usando los esquemas Zod de `@recon/shared` (`LoginRequest` con `zodResolver`); los tipos de respuesta salen del contrato, que a su vez sale de esos mismos esquemas.

Alternativa: funciones escritas a mano sobre `fetch` con tipos `z.infer` de `@recon/shared`; más simple hoy, pero contradice el README y duplica rutas y métodos en el cliente. **Plan de contingencia:** si la exportación o la generación se atasca durante `apply`, se para y se propone esta alternativa como desviación documentada del README; no se aplica sin aprobación.

### D7 Sesión y renovación: `fetch` envuelto
- `lib/session/`: estado de sesión (access token en memoria, refresh en `localStorage`, usuario de `/auth/me` en la caché de Query) con suscripción para que el router reaccione a expiración, login y logout de esta u otras pestañas (D1).
- El cliente `openapi-fetch` de las rutas protegidas recibe un `fetch` propio (`authFetch`) que: (1) añade `Authorization`; (2) ante `401` clona la petición, ejecuta un refresh **de un solo vuelo** (una promesa compartida por todas las peticiones de la pestaña que fallen mientras está en curso, ejecutada dentro del candado entre pestañas de D1), guarda el par nuevo y repite **una vez**; (3) si el refresh falla o la repetición vuelve a dar `401`, llama a `session.expire()`, que limpia tokens, lo anuncia a las demás pestañas (D1) y, en cada pestaña, `queryClient.clear()` y navega a `/login?redirect=<ruta actual>&reason=expired`; (4) si al llegar el `401` la sesión ya no existe (Sign out en esta pestaña o en otra mientras la petición estaba en vuelo), devuelve la respuesta sin renovar ni expirar, para que Login no muestre el aviso de sesión expirada (revisión del PR #26, hallazgo 2).
- Las respuestas de `POST /auth/login` y `POST /auth/refresh` se validan con `TokenPair` de `@recon/shared` antes de guardar nada: un login con un par mal formado falla (Login muestra el error de servidor) y una renovación con un par mal formado cuenta como fallida (revisión del PR #26).
- Login, refresh y logout usan un cliente sin `authFetch` (evita bucles).
- Arranque: si hay refresh en `localStorage` y la pestaña no tiene access token, la primera petición protegida (`/auth/me`, en el `beforeLoad` del layout) renueva antes, a través del candado.
- Reintentos de TanStack Query desactivados para `4xx` (el `401` ya lo resuelve `authFetch`; `404` no se reintenta).
- `redirect` solo admite destinos de la propia aplicación, para evitar redirecciones abiertas: se resuelve con `new URL(redirect, location.origin)` como lo haría el navegador (barras invertidas, tabuladores, esquemas) y solo se acepta si conserva el origen; se navega a su ruta, búsqueda y fragmento (revisión del PR #26, hallazgo 3).

### D8 Datos de la pantalla Accounts
No hay `GET /accounts` global, así que la pantalla es dirigida por la selección (también es lo que pide el criterio 3):
1. `GET /merchants` → selector; `GET /merchants/{id}/providers` → selector.
2. Con proveedor: `GET /providers/{id}` (cuentas y canales) y `GET /channels?unassigned=true` (filtrado por `providerId` en el cliente; una sola consulta cacheada para todos los proveedores).
3. Por cuenta, `GET /accounts/{id}/channels` (con `useQueries`; 1–2 cuentas por proveedor en el seed) para principal/histórico y `primaryAccount`.
Claves de Query por recurso (`['providers', id]`, `['accounts', id, 'channels']`…) para que Account Detail (tramo posterior) las reutilice. Un `404` en el enlace directo muestra el mensaje de "no disponible" de la spec. Las columnas Fees y Last batch del prototipo se omiten (sin endpoint).

### D9 Alcance de pantallas
Este change implementa solo lo que pide el issue #3 (Login, armazón de Dashboard, Accounts); el nombre de cuenta no es enlace todavía. Merchants & Providers y Account Detail pasan a la Entrega 3 (tramo 5) y reutilizarán las consultas de D8; `docs/wireframes/README.md` se corrige en consecuencia.

### D10 Estructura y textos
```
frontend/src/
  app/            router.tsx (árbol de rutas), providers.tsx, layout/ (Sidebar, Header, Breadcrumbs, nav-config.ts, strings.ts), pages/ (NotFound, Forbidden, Dashboard)
  features/auth/  LoginPage.tsx, strings.ts, *.test.tsx
  features/accounts/  AccountsPage.tsx, queries.ts, strings.ts, *.test.tsx
  lib/api/        schema.gen.ts (generado), client.ts
  lib/session/    session.ts, auth-fetch.ts, *.test.ts
  lib/format.ts   formatDecimal (agrupa miles sobre el string; nunca Number())
  components/ui/  shadcn/ui
  test/           setup.ts, msw/ (server, handlers, fixtures del seed), render.tsx (router + QueryClient)
```
Un `strings.ts` por pantalla y uno del layout (`as const`). Los tests colocan junto a su pantalla, como el backend.

### D11 Tests
- Vitest con `jsdom`, Testing Library y `user-event`; MSW 2 en modo Node con `onUnhandledRequest: 'error'` (una llamada no prevista falla el test).
- Fixtures en `test/msw/fixtures.ts` con el mundo del seed tipado con los tipos generados, de modo que un cambio de contrato rompe el `typecheck` de los tests.
- Cada test monta la app real (router + QueryClient nuevo por test, sin reintentos) en una ruta inicial; se comprueba lo que ve el usuario y, cuando importa (refresh de un solo vuelo, no llamar al API), las peticiones que recibió MSW.
- Se rompe a propósito una vez cada pieza crítica (single-flight, filtro del menú, guarda) para ver el test fallar.

### D12 Herramientas y CI
- `biome.json`: override para `frontend/src/**` con `noConsole: error` y exclusión de `frontend/src/lib/api/schema.gen.ts`. Los componentes de shadcn se formatean con Biome tras generarlos y se versionan como código propio.
- `.github/workflows/ci.yml`, job `check`: tras `pnpm test`, `pnpm openapi:check` (D6) y `pnpm --filter @recon/frontend build`. Sin job nuevo.
- `frontend/.env.example` con `VITE_API_URL=` (vacío = mismo origen) y `API_PROXY_TARGET=http://localhost:3000`, comentarios en inglés.

## Risks / Trade-offs

- [XSS leería el refresh de `localStorage`] → Sin HTML crudo y rotación de refresh; cookie httpOnly como endurecimiento futuro (D1).
- [La sesión sobrevive al cierre del navegador durante la vida del refresh, 7 días] → Riesgo asumido (D1); Sign out la corta en todas las pestañas.
- [Dos pestañas renuevan a la vez y la rotación revoca el refresh de una] → Candado de Web Locks con relectura del refresh dentro de él: renovaciones en serie, cada una con el refresh vigente (D1); cubierto por un test de dos pestañas.
- [N pestañas que caducan a la vez hacen N llamadas a `/auth/refresh`] → Aceptado: son en serie, baratas y raras (cada 15 min como mucho); a cambio, el access token no sale de su pestaña (D1).
- [Vite y los imports `.js` de `@recon/shared` en TypeScript fuente] → Vite resuelve `.js` a `.ts` en importadores TS; se verifica en la primera tarea con un import real (`LoginRequest`). Si fallara, `resolve.extensionAlias` o un alias al `src/`.
- [Exportar OpenAPI necesita `db:generate` antes, porque `app.ts` importa el cliente Prisma generado] → CI ya ejecuta `pnpm db:generate` antes; el script lo documenta en su error.
- [Deriva entre contrato versionado y backend] → Comprobación en CI (D6).
- [N+1 peticiones en Accounts (una por cuenta)] → Aceptable con 1–2 cuentas por proveedor; si crece, un `include=channels` en `GET /providers/{id}/accounts` en un change de catálogo.
- [El filtrado del menú puede leerse como seguridad] → La spec dice explícitamente que es presentación; el API sigue devolviendo `403`/`404`.

## Migration Plan

Sin migraciones ni cambios de API. El despliegue (imagen Nginx con la SPA) no entra en este change; mientras tanto, `pnpm dev` y `pnpm --filter @recon/frontend preview` con el proxy. Rollback: revertir el PR; el backend no depende del frontend.

## Open Questions

- Texto exacto del estado vacío de Dashboard y de la etiqueta `Soon`: se ajusta en revisión visual sin cambiar specs.
- Resuelta: las capturas finales van a `docs/wireframes/impl/`.

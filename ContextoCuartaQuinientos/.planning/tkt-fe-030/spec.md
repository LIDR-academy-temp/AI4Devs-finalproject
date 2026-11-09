[← index](_index.md) | [design →](design.md)

# spec.md — FE-030: Frontend — login y sesión JWT

> Generado por: **generador de contexto SDD**
> Consumido por: implementador (`implementer.tool` = cursor — agentes `git-frontend`, `desarrollador-react`, `frontend-tester`, `auditor-codigo`, `auditor-seguridad`)
> **Tipo:** Feature

## User story

Como usuario registrado (Administrador, Residente, Guardia o Trabajador), quiero una pantalla de login y una sesión que se renueve sola, para acceder al portal con mi perfil sin exponer mis tokens (HU-USR-01; redirección obligatoria a cambio de contraseña de HU-USR-03).

## Contexto / problema

**Documentos de entrada**

| Tipo | Fuente |
|---|---|
| Requerimiento | [readme.md](../../../README.md) §6 Ticket 30 (FE-030), §5 HU-USR-01 y HU-USR-03, §5 DoD "Feature frontend", §2.5 (sesión en la web) |
| Técnico | `readme.md` §4 Endpoint 1 (`GenerateToken`, `RefreshToken`, `Logout`), [USR-BE-007](../tkt-usr-be-007/_index.md) (contrato backend), [specs/usuarios.md](../../specs/usuarios.md), `scaffolds/web/.env.example` (`VITE_API_URL`, `VITE_GRAPHQL_URL`), SETUP-000 (`Web/` con Vite + TS estricto, Tailwind, Apollo, React Router con `PrivateRoute`, Vitest) |
| Mockup | `readme.md` §1.3 — wireframes conceptuales (Mermaid: Login → Dashboard por perfil) y sistema de diseño (tokens Tailwind, WCAG 2.1 AA) |

**Comportamiento actual:** no existe UI (Entrega 1 = solo documentación); `Web/` lo crea SETUP-000 con un `PrivateRoute` base.

**Comportamiento esperado:** el usuario inicia sesión en `/login`; el access token vive **solo en memoria** (contexto de auth React) y el refresh token solo en la cookie `HttpOnly` que gestiona el API (§2.5); Apollo y `fetch` envían `Authorization: Bearer <token>`; ante `401` se intenta **una vez** `RefreshToken` y, si falla, se limpia la sesión y se vuelve a `/login`; si `requiereCambioPassword = true` se redirige a `/cambiar-password` (pantalla de USR-BE-036) antes del dashboard.

**Requerimientos relacionados** ([_graph.md](../../_graph.md)): bloquea FE-031, FE-032, FE-038, FE-039, FE-040 y USR-BE-036 (`readme.md` §6).

## Alcance (MoSCoW)

### Must — sin esto el requerimiento no cierra
- `LoginPage` en `/login` con formulario correo/contraseña validado con Zod (react-hook-form) antes de enviar.
- `POST /SGR/AuthService/GenerateToken` con `credentials: 'include'` para recibir la cookie de refresh.
- Access token en memoria (`AuthContext` / `useAuth`); refresh token solo en cookie `HttpOnly`; **prohibido** `localStorage` y `sessionStorage` para cualquier token.
- Apollo (`authLink`) y `apiClient` (`fetch`) añaden `Authorization: Bearer <token>`.
- Ante `401` en una petición autenticada: un único reintento tras `POST /SGR/AuthService/RefreshToken`; si el refresh falla → limpiar sesión y redirigir a `/login`.
- Mensajes: "Credenciales inválidas" en `401` del login; "Demasiados intentos, espera un momento" en `429`.
- Estados de UI: carga / error / credenciales inválidas.
- `requiereCambioPassword = true` → redirigir a `/cambiar-password` antes de ver el dashboard.
- Ruta protegida (`PrivateRoute`) redirige a `/login` si no hay token.
- Cerrar sesión llama `POST /SGR/AuthService/Logout` y limpia el contexto.
- `tsc --noEmit` y `vite build` sin errores.

### Should — esperado; negociable vía escalación al usuario si tiempo/riesgo aprieta
- Refresh silencioso al montar la app (una recarga pierde el token en memoria) `(asumido)`.
- Varios `401` simultáneos comparten una sola llamada a `RefreshToken` (evitar rotaciones concurrentes que revoquen el token recién emitido) `(asumido)`.

### Could — solo si sale gratis durante la implementación; jamás bloquea
- Renovación proactiva poco antes de `expira` para evitar el primer `401` `(asumido)`.

### Won't — fuera de alcance explícito
- Pantalla `/cambiar-password` y su lógica (USR-BE-036).
- Registro self-service, recuperación de contraseña por correo, SSO/OAuth, MFA (non-goals USR Fase 1).
- Dashboards por perfil (FE-040); FE-030 solo entrega el layout shell de destino.
- Cambios al contrato del API (USR-BE-007).
- Autorización de negocio en el cliente: el rol se valida en el backend.

## Instancias en scope

| Target:Instancia | Impacto |
|---|---|
| `frontend:cuartaquinientos-web` | Nuevo `features/auth/` (`AuthProvider`, `useAuth`, `LoginPage`, `loginSchema`), `apiClient`, `authLink`/`errorLink` de Apollo, `PrivateRoute` extendido, acción de logout en el layout shell |

## Invariantes — reglas existentes que DEBEN sobrevivir al cambio

| # | Regla existente que NO se toca | Fuente |
|---|---|---|
| INV-1 | El access token vive en memoria; el refresh token viaja solo en cookie `HttpOnly; Secure; SameSite=Strict`; nunca `localStorage` | `readme.md` §2.5 (sesión en la web), `specs/usuarios.md` (Notas) |
| INV-2 | Un usuario con `bActualizarPassword = 1` debe cambiar la contraseña antes de ver el dashboard | `specs/usuarios.md` (INV-4), HU-USR-01 |
| INV-3 | El rol se valida en el backend (claim `perfil`); nada sensible se confía al cliente y la identidad viaja solo en el JWT | `specs/usuarios.md` (INV-5), `readme.md` §5 DoD "Feature frontend", `CLAUDE.md` |

## Propiedades (PBT-x) — invariantes a nivel dato (OPCIONAL)

- PBT-1: Para toda petición saliente de `apiClient` o Apollo con sesión activa, el header `Authorization` es `Bearer <token actual del AuthContext>`.
- PBT-2: Para toda ráfaga de N ≥ 1 respuestas `401` concurrentes, `apiClient` emite exactamente 1 llamada a `POST /SGR/AuthService/RefreshToken` `(asumido — Should)`.
- PBT-3: Para todo estado alcanzable de la app (login, refresh, logout, error), `window.localStorage` y `window.sessionStorage` no contienen ningún token.

## Criterios de aceptación

- [ ] **CA-1 [M]**: validación previa — **Dado** `LoginPage` con correo de formato inválido o campos vacíos **Cuando** el usuario pulsa "Iniciar sesión" **Entonces** `loginSchema` (Zod) muestra el error por campo y `apiClient` no envía `POST /SGR/AuthService/GenerateToken`.
- [ ] **CA-2 [M]**: login exitoso — **Dado** credenciales válidas **Cuando** `LoginPage` envía `POST /SGR/AuthService/GenerateToken` con `credentials: 'include'` y recibe `200` **Entonces** `AuthProvider` guarda en memoria `{ token, expira, perfil, nombre, requiereCambioPassword }` y la app navega al layout shell protegido (`/`) `(asumido destino)`.
- [ ] **CA-3 [M]**: sin almacenamiento web — **Dado** un login exitoso **Cuando** el test inspecciona `window.localStorage`, `window.sessionStorage` y `document.cookie` **Entonces** no contienen el access token ni el refresh token.
- [ ] **CA-4 [M]**: header Bearer — **Dado** una sesión activa **Cuando** `apiClient` o el `authLink` de Apollo emiten una petición a `VITE_API_URL` / `VITE_GRAPHQL_URL` **Entonces** incluyen `Authorization: Bearer <token>`.
- [ ] **CA-5 [M]**: reintento único — **Dado** un access token vencido **Cuando** una petición autenticada recibe `401` **Entonces** `apiClient` / `errorLink` llaman una vez `POST /SGR/AuthService/RefreshToken` (con `credentials: 'include'`), actualizan el token en `AuthProvider` y reintentan la petición original una sola vez.
- [ ] **CA-6 [M]**: refresh fallido — **Dado** que `POST /SGR/AuthService/RefreshToken` responde `401` **Cuando** `apiClient` procesa el fallo **Entonces** `AuthProvider` limpia la sesión, la app navega a `/login` y no se hace un segundo intento de refresh.
- [ ] **CA-7 [M]**: mensajes de error — **Dado** `POST /SGR/AuthService/GenerateToken` responde `401` (o `429`) **Cuando** `LoginPage` procesa la respuesta **Entonces** muestra exactamente "Credenciales inválidas" (o "Demasiados intentos, espera un momento") sin indicar qué campo falló.
- [ ] **CA-8 [M]**: estados de UI — **Dado** `LoginPage` **Cuando** la petición está en curso / falla por red o `5xx` / responde `401` **Entonces** muestra respectivamente estado de carga (botón deshabilitado + indicador), mensaje de error genérico `(asumido texto)` y el mensaje de credenciales inválidas.
- [ ] **CA-9 [M]**: cambio de contraseña obligatorio — **Dado** una respuesta de login con `requiereCambioPassword = true` **Cuando** termina el login o el usuario intenta abrir cualquier ruta protegida **Entonces** `PrivateRoute` redirige a `/cambiar-password` (pantalla de USR-BE-036) antes de mostrar el dashboard.
- [ ] **CA-10 [M]**: ruta protegida — **Dado** que no hay token en `AuthProvider` **Cuando** el usuario abre una ruta envuelta en `PrivateRoute` **Entonces** es redirigido a `/login`.
- [ ] **CA-11 [M]**: logout — **Dado** una sesión activa **Cuando** el usuario pulsa "Cerrar sesión" en el layout shell **Entonces** `useAuth().logout` llama `POST /SGR/AuthService/Logout` con `credentials: 'include'`, limpia `AuthProvider` y navega a `/login`.
- [ ] **CA-12 [M]**: build — **Dado** el código de `Web/` tras el PR **Cuando** se ejecutan `node_modules\.bin\tsc --noEmit` y `node_modules\.bin\vite build --mode development` **Entonces** ambos terminan sin errores.
- [ ] **CA-13 [S]**: refresh silencioso — **Dado** una cookie `rt` válida y la app recién recargada **Cuando** `AuthProvider` se monta **Entonces** llama `POST /SGR/AuthService/RefreshToken` una vez y, si responde `200`, restaura la sesión sin pasar por `/login` `(asumido)`.
- [ ] **CA-14 [S]**: refresh compartido — **Dado** tres peticiones autenticadas que reciben `401` a la vez **Cuando** `apiClient` gestiona los reintentos **Entonces** se emite una sola llamada a `RefreshToken` y las tres se reintentan con el mismo token nuevo `(asumido)`.
- [ ] **CA-R1 [M]**: regresión de INV-1 — **Dado** los flujos de login, refresh (CA-5/CA-13) y logout **Cuando** `frontend-tester` inspecciona el almacenamiento tras cada flujo **Entonces** `localStorage` y `sessionStorage` siguen sin tokens y el refresh token nunca es legible desde JS.
- [ ] **CA-R2 [M]**: regresión de INV-3 — **Dado** una sesión activa **Cuando** `apiClient` envía cualquier petición **Entonces** no agrega `UsuarioID` ni `perfil` al body ni a la query (la identidad viaja solo en `Authorization`) y un `403` del API se muestra como error sin que la UI lo eluda.

## Reutilización detectada (evidencia de la escalera — regla 6)

- `PrivateRoute` de SETUP-000 (`readme.md` §6 Ticket 33) → se extiende (token + `requiereCambioPassword`), no se crea un `ProtectedRoute` paralelo.
- Contrato de USR-BE-007 (`readme.md` §4 Endpoint 1) → se consume tal cual, sin endpoints nuevos.
- Apollo Client (SETUP-000) → `authLink` / `errorLink` nativos de `@apollo/client` en lugar de un interceptor propio.
- Cookie `HttpOnly` gestionada por el navegador → el cliente no maneja el refresh token (peldaño 2, nativo).
- Tokens Tailwind del §1.3 (`tailwind.config.js`) → estilos del formulario sin CSS custom.
- Hook `useAuth` declarado en `sdd.config.yaml` (`frontend.conventions.hooks`) → nombre canónico.

## Definition of Ready

- [x] **I**ndependent — depende de USR-BE-007 (documentado y aceptado en readme §6); se puede desarrollar contra mock del contrato §4
- [x] **N**egotiable — Should/Could recortables vía escalación
- [x] **V**aluable — cada Must entrega login usable del núcleo §5.0
- [x] **E**stimable — 5 h (`readme.md` §6 Ticket 30)
- [x] **S**mall — cada Must cabe en una sesión
- [x] **T**estable — cada Must tiene CA en Given/When/Then

- [x] Todos los Must tienen criterio de aceptación verificable en Given/When/Then
- [x] Ningún Must depende de un dato/objeto no confirmado por MCP ni declarado aquí (sin SQL; contrato declarado en §4 y USR-BE-007)
- [x] Cada Must cabe en una sesión de implementador
- [x] Instancias en scope identificadas (`frontend:cuartaquinientos-web`)
- [x] Sin preguntas abiertas que afecten un Must (P-1..P-3 afectan Should o textos)
- [x] Sin dependencias con requerimientos no archivados (o documentadas y aceptadas)
- [x] Reutilización evaluada (peldaños 2-3) antes de proponer crear
- [x] Toda cita a otro TKT/objeto se releyó una vez más antes de cerrar

## Riesgos

| Riesgo | Severidad | Mitigación |
|---|---|---|
| Recarga de página pierde el token en memoria → usuario expulsado a `/login` | Media | Refresh silencioso al montar (CA-13) `(asumido)` |
| Varios `401` simultáneos disparan rotaciones concurrentes y la segunda revoca el token recién emitido | Alta | Promesa de refresh compartida (CA-14) `(asumido)` |
| Guardar el token en almacenamiento web por comodidad → robo por XSS | Alta | INV-1, CA-3, CA-R1 |
| Cookie `rt` no viaja en desarrollo cross-origin | Media | `credentials: 'include'` + CORS `AllowCredentials` del API (USR-BE-007 P-4) |
| Bucle infinito refresh → 401 → refresh | Media | Reintento único (CA-5, CA-6) |

## Preguntas abiertas

- P-1: Destino tras login exitoso: layout shell `/` hasta que FE-040 entregue dashboards por perfil → **pendiente** `(asumido)`.
- P-2: Texto del error de red / `5xx` en `LoginPage` → **pendiente** `(asumido)`; propuesta: "No se pudo conectar, intenta de nuevo".
- P-3: Refresh silencioso al montar y promesa compartida (Should) → **pendiente** `(asumido)`; no documentados en readme, derivados del poke-holes.

## Quick Checks — antes del handoff al implementador

- [x] Todo CA nombra el actor real (`LoginPage`, `loginSchema`, `AuthProvider`, `apiClient`, `authLink`/`errorLink`, `PrivateRoute`, endpoints `/SGR/AuthService/*`)
- [x] Todo CA tiene criterio medible en Given/When/Then
- [x] Reutilización evaluada (peldaños 2-3 escalera) antes de proponer crear
- [x] Ningún Must depende de objeto no confirmado por MCP o declarado explícitamente
- [x] Contexto/problema: actor real nombrado
- [x] Instancias en scope identificadas para cada Must
- [x] Definition of Ready completa — ítems `(asumido)` listados en Preguntas abiertas
- [x] Tipo ≠ Refactor → CHAR-x no aplica
- [x] Toda propiedad PBT-x es universal sobre el dominio de entrada

[← index](_index.md) | [design →](design.md)

# spec.md — FE-031: Frontend: mis tickets (listar y crear)

> Generado por: **generador de contexto SDD**
> Consumido por: implementador (`implementer.tool` = cursor — agentes `desarrollador-react`, `frontend-tester`, `auditor-codigo`, `git-frontend`)
> **Tipo:** Feature

## User story

Como residente, quiero ver mis tickets y reportar uno nuevo desde la web, para dar seguimiento a mis incidencias.

## Contexto / problema

No existe UI (Entrega 1 = solo documentación; `Web/` se genera en SETUP-000 y FE-030 monta shell, `AuthProvider` en memoria, el cliente REST tipado `Web/src/shared/lib/apiClient.ts` y Apollo Client). Stack acordado: React 18 + Vite + Apollo Client (`sdd.config.yaml`: estado remoto = Apollo `InMemoryCache`); sin TanStack Query. Fuentes: readme §6 Ticket 31 (contrato), §5 HU-TKT-01 y HU-TKT-02, Non-goals TKT, §5.0.1 poke-holes 2 (empty states) y 3 (orden/filtro), §4 Endpoint 2 (mutation `crearTicket`, `CrearTicketInput`, `CrearTicketPayload`, `UserError`), §6 Ticket 2 (TKT-BE-002) y Ticket 15 (`GET /TKT/Tickets/mis`), §1.3 (wireframes, estados con color + etiqueta, WCAG 2.1 AA), §2.2 (React Hook Form + Zod, Vitest + Testing Library, Playwright), §2.5 (token en memoria); [specs/tickets.md](../../specs/tickets.md).

Comportamiento esperado: la página "Mis tickets" consume `GET /TKT/Tickets/mis` (TKT-BE-015) con filtro por estado y muestra el orden que devuelve el API (más reciente primero). La página "Nuevo ticket" envía la mutation GraphQL `crearTicket` (TKT-BE-002; la web **no** usa `POST /TKT/Tickets`, que es del bot) con categoría, título, descripción y prioridad, validando con Zod antes de enviar y mostrando los `UserError` del payload. El rol se valida en el backend; el cliente no envía solicitante ni casa. El select de categoría y el filtro por estado se llenan con `GET /TKT/CategoriasTicket` y `GET /TKT/EstadosTickets`, que provee TKT-BE-015 (readme §6 Ticket 15).

## Alcance (MoSCoW)

### Must — sin esto el requerimiento no cierra
- Listado `GET /TKT/Tickets/mis` (TKT-BE-015) con título, prioridad, estado y fecha; orden del API (más reciente primero); filtro por estado (`estadoTicketId`) con opciones de `GET /TKT/EstadosTickets` (TKT-BE-015).
- Estados de UI: carga, error y vacío con el copy "No has reportado incidencias aún.".
- Formulario "Nuevo ticket" con la mutation `crearTicket` (TKT-BE-002): categoría (requerida, opciones de `GET /TKT/CategoriasTicket`), título (requerido, ≤ 200), descripción (requerida, ≤ 4 000), prioridad (opcional, default Media); validación Zod antes de enviar.
- Botón de envío deshabilitado mientras la petición está en curso (sin doble envío).
- Errores `UserError` de la mutation mostrados en el formulario.
- Tests de componente o E2E mínimo en login + tickets `(Entrega Final)`.

### Should — esperado; negociable vía escalación al usuario si tiempo/riesgo aprieta
- Tras crear, refrescar el listado y volver a "Mis tickets" `(asumido)`.
- Estado del ticket con color + etiqueta (badge) para WCAG 2.1 AA (readme §1.3).
- Mensaje de error con acción "Reintentar" `(asumido)`.

### Could — solo si sale gratis durante la implementación; jamás bloquea
- Controles de paginación (`pagina`/`tamano`, que TKT-BE-015 ya soporta) `(asumido)`.

### Won't — fuera de alcance explícito
- Adjuntos / foto en el ticket (Fase 2, ARC-BE-028; Non-goals TKT).
- Crear vía `POST /TKT/Tickets` (lo usa el bot).
- Detalle del ticket con comentarios y evidencia (HU-TKT-04 [S], fuera del Ticket 31).
- Gestión de administración (FE-038) y calificación (HU-TKT-05).
- Cambios en backend (catálogos, endpoints): este ticket solo consume contratos.

## Instancias en scope

| Target:Instancia | Impacto |
|---|---|
| `frontend:cuartaquinientos-web` | Nuevas páginas `TicketsPage` y `NuevoTicketPage`, componentes `TicketForm`, `TicketsList`, `EstadoTicketBadge`, hooks `useMisTickets`, `useCrearTicket`, `useCatalogosTicket`, operación `tickets.gql` y tipos `src/shared/types/tickets.ts` |

## Invariantes — reglas existentes que DEBEN sobrevivir al cambio

| # | Regla existente que NO se toca | Fuente |
|---|---|---|
| INV-1 | Título máximo 200 caracteres, validado antes del envío | `specs/tickets.md` INV-4; readme §5 HU-TKT-01 |
| INV-2 | El solicitante y la casa nunca se envían desde el cliente (salen del JWT `sub` y de `sgr.CasaOcupantes`) | `specs/tickets.md` INV-7; readme §6 Ticket 2 |
| INV-3 | Desde la web el canal es WEB (default del API) y la prioridad por defecto es Media | `specs/tickets.md` INV-11; readme §4 Endpoint 2 |
| INV-4 | Pulsar "Enviar" dos veces crea un solo ticket | readme §5 HU-TKT-01 |
| INV-5 | El access token vive solo en memoria (nunca `localStorage`/`sessionStorage`) | readme §2.5 "Sesión en la web"; FE-030 |
| INV-6 | Lista vacía explícita y orden fecha descendente sin reordenar en cliente | readme §5.0.1 poke-holes 2 y 3 |
| INV-7 | Nada sensible se confía al cliente: el perfil lo valida el backend | readme §5 DoD "Feature frontend"; §2.5 autorización por perfil |

## Criterios de aceptación

- [ ] **CA-1 [M]**: listado — **Dado** un Residente autenticado con 3 tickets **Cuando** `TicketsPage` carga y `useMisTickets` resuelve `GET /TKT/Tickets/mis` **Entonces** se muestran 3 filas con título, prioridad, estado y fecha, en el mismo orden que `items` (sin ordenar en cliente)
- [ ] **CA-2 [M]**: filtro por estado — **Dado** el listado cargado **Cuando** el residente elige "En seguimiento" en el filtro **Entonces** `useMisTickets` llama `GET /TKT/Tickets/mis?estadoTicketId=<ID de "En seguimiento">` y se muestran solo esos tickets
- [ ] **CA-3 [M]**: vacío — **Dado** que el API responde `items: []` **Cuando** `TicketsPage` renderiza **Entonces** se ve "No has reportado incidencias aún." y un acceso a "Nuevo ticket"
- [ ] **CA-4 [M]**: carga — **Dado** la petición `GET /TKT/Tickets/mis` en curso **Cuando** `TicketsPage` renderiza **Entonces** se muestra un indicador de carga y no la lista ni el vacío
- [ ] **CA-5 [M]**: error — **Dado** que `GET /TKT/Tickets/mis` responde `500` **Cuando** `TicketsPage` renderiza **Entonces** se muestra un mensaje de error (con "Reintentar" `(asumido)` que repite la consulta)
- [ ] **CA-6 [M]**: validación previa — **Dado** `NuevoTicketPage` **Cuando** el residente envía sin categoría, con título vacío o de 201 caracteres, o con descripción vacía o de 4 001 **Entonces** el schema Zod de `TicketForm` muestra el error en el campo y **no** se invoca la mutation `crearTicket`
- [ ] **CA-7 [M]**: alta exitosa — **Dado** un formulario válido con categoría "Agua" y sin prioridad **Cuando** el residente pulsa "Enviar" **Entonces** `useCrearTicket` envía `crearTicket(input: { titulo, descripcion, categoria: "Agua" })` (prioridad Media y canal WEB los pone el API) y, con `ticket` no nulo, se confirma el alta
- [ ] **CA-8 [M]**: sin doble envío — **Dado** la mutation en curso (`loading = true`) **Cuando** el residente pulsa "Enviar" otra vez **Entonces** el botón está deshabilitado y la mutation se llamó exactamente 1 vez
- [ ] **CA-9 [M]**: errores de negocio — **Dado** que `crearTicket` responde `errors: [{ code: "VALIDATION_ERROR", field: "categoria", message }]` **Cuando** `TicketForm` procesa el payload **Entonces** el mensaje aparece en el campo `categoria`; si `field` es nulo (p. ej. `FORBIDDEN`, `INTERNAL_ERROR`) aparece como error general del formulario
- [ ] **CA-10 [M]**: pruebas — **Dado** el repo `Web/` **Cuando** se ejecuta `npm test` **Entonces** pasan los tests de componente (Vitest + Testing Library) de CA-1..CA-9; el E2E mínimo login + tickets (Playwright) se entrega en `(Entrega Final)`
- [ ] **CA-11 [S]**: refresco tras crear — **Dado** un alta exitosa **Cuando** la mutation completa **Entonces** se navega a `/tickets`, `useMisTickets` vuelve a llamar `GET /TKT/Tickets/mis` y el ticket nuevo aparece en primer lugar `(asumido)`
- [ ] **CA-12 [S]**: badge accesible — **Dado** un ticket en cualquier estado **Cuando** se lista **Entonces** `EstadoTicketBadge` muestra color **y** etiqueta de texto del estado
- [ ] **CA-13 [C]**: paginación — **Dado** 25 tickets **Cuando** el residente avanza de página **Entonces** se llama `GET /TKT/Tickets/mis?pagina=2&tamano=20` `(asumido)`
- [ ] **CA-14 [M]**: catálogos — **Dado** que `GET /TKT/CategoriasTicket` responde las 6 categorías y `GET /TKT/EstadosTickets` los 4 estados (`[{ id, nombre }]`) **Cuando** `useCatalogosTicket` resuelve **Entonces** el select de `TicketForm` ofrece exactamente esas categorías y el filtro de `TicketsPage` esos estados, en el orden del API, y al elegir un estado se envía su `id` como `estadoTicketId`
- [ ] **CA-R1 [M]**: regresión de INV-2 — **Dado** cualquier envío de `TicketForm` **Cuando** se inspeccionan las `variables` de la mutation **Entonces** `input` solo contiene `titulo`, `descripcion`, `categoria` y opcionalmente `prioridad`/`canal`; nunca `usuarioSolicitanteId` ni `casaId`
- [ ] **CA-R2 [M]**: regresión de INV-5 — **Dado** el flujo listar + crear completo **Cuando** se inspecciona `window.localStorage` y `window.sessionStorage` **Entonces** no contienen el access token

## Reutilización detectada (evidencia de la escalera — regla 6)

- `Web/src/shared/lib/apiClient.ts` (`fetch`, `credentials: 'include'`, Bearer en memoria, reintento único con `RefreshToken` ante `401`) y Apollo con `authLink`/`errorLink` (FE-030) → se reusan para REST y GraphQL; no se crea otro cliente HTTP ni se agrega TanStack Query.
- `PrivateRoute` (SETUP-000, extendido por FE-030) + layout shell → las rutas nuevas cuelgan del shell existente.
- `GET /TKT/Tickets/mis` (TKT-BE-015) → fuente del listado; no se agrega query GraphQL de listado.
- Mutation `crearTicket` (TKT-BE-002) → única vía de alta desde la web.
- `TicketForm` es el `COMPONENTE_REFERENCIA` declarado en `sdd.config.yaml`; se crea aquí como referencia para los demás formularios.
- Catálogos para el select y el filtro → `GET /TKT/CategoriasTicket` y `GET /TKT/EstadosTickets` de TKT-BE-015 (readme §6 Ticket 15); lista fija de categorías en el cliente evaluada y descartada (duplica el catálogo y el filtro necesita `estadoTicketId`, no nombres).

## Definition of Ready

- [x] **I**ndependent — dependencias FE-030, TKT-BE-002, TKT-BE-015 documentadas en `_index.md`
- [x] **N**egotiable — Should/Could recortables vía escalación
- [x] **V**aluable — el residente lista y crea tickets desde la web
- [x] **E**stimable — 8 h (readme §6)
- [x] **S**mall — dos páginas sobre hooks acotados; cabe en una sesión (si no, dividir listado / formulario)
- [x] **T**estable — cada Must tiene CA en Given/When/Then

- [x] Todos los Must tienen criterio de aceptación verificable en Given/When/Then
- [x] Ningún Must depende de un dato/objeto no confirmado por MCP ni declarado aquí — catálogos `GET /TKT/CategoriasTicket` / `GET /TKT/EstadosTickets` provistos por TKT-BE-015 (dependencia ya declarada)
- [x] Cada Must cabe en una sesión de implementador (regla "Small")
- [x] Instancias en scope identificadas (`target:instancia`)
- [x] Sin preguntas abiertas que afecten un Must
- [x] Sin dependencias con requerimientos no archivados (o documentadas y aceptadas)
- [x] Reutilización evaluada (peldaños 2-3 de la escalera) antes de proponer crear
- [x] Toda cita a otro TKT/objeto se releyó una vez más antes de cerrar

## Riesgos

| Riesgo | Severidad | Mitigación |
|---|---|---|
| Catálogos no disponibles si TKT-BE-015 no está desplegado (select y filtro vacíos) | Media | TKT-BE-015 es dependencia bloqueante; `useCatalogosTicket` muestra estado de error con "Reintentar" |
| Sin caché de cliente para REST (sin TanStack Query): cada montaje repite `GET` | Baja | Volumen bajo (listado paginado, catálogos pequeños); si molesta, memoizar en el hook, sin librería nueva |
| Doble envío por Enter + clic | Media | Botón deshabilitado con `loading` y `handleSubmit` ignorando envíos en curso (CA-8) |
| Divergencia entre límites Zod y FluentValidation | Media | Mismos límites 200 / 4 000 que TKT-BE-001/002; CA-6 y CA-9 |
| Listado desactualizado tras crear | Baja | Navegar a `/tickets` vuelve a montar `useMisTickets` y reconsulta (CA-11) |

## Preguntas abiertas

- ¿Qué ticket implementa `GET /TKT/CategoriasTicket` y `GET /TKT/EstadosTickets`? → **respondida**: TKT-BE-015 (readme §6 Ticket 15, 2026-09-24).
- ¿Librería de datos remotos para REST? → **respondida**: ninguna; `apiClient` de FE-030 + hooks React (stack acordado sin TanStack Query).
- Tras crear, ¿refrescar y volver al listado? → **respondida `(asumido)`**: sí, navegar a `/tickets` (reconsulta al montar).
- Estado de error con "Reintentar" → **respondida `(asumido)`**: sí, `refetch` del hook.
- Rutas `/tickets` y `/tickets/nuevo` → **respondida `(asumido)`**: el readme §1.3 nombra la pantalla "Mis tickets" pero no la ruta.
- Paginación en UI → **respondida `(asumido)`**: Could; el API ya la soporta.

## Quick Checks — antes del handoff al implementador

- [x] Todo CA nombra el actor real (SP/controller/endpoint exacto) — sin "el sistema hace X"
- [x] Todo CA tiene criterio medible en Given/When/Then — sin adjetivos vagos
- [x] Reutilización evaluada (peldaños 2-3 escalera) antes de proponer crear
- [x] Ningún Must depende de objeto no confirmado por MCP o declarado explícitamente — catálogos a cargo de TKT-BE-015
- [x] Contexto/problema: actor real nombrado en la causa raíz — sin falsa agencia
- [x] Instancias en scope identificadas para cada Must (`target:instancia`)
- [x] Definition of Ready completa — ningún ítem con `(asumido)` sin notarlo en Preguntas abiertas
- [x] Si Tipo = Refactor → CHAR-x poblado con baseline capturado por MCP (no aplica: Feature)
- [x] Toda propiedad PBT-x es universal sobre el dominio de entrada (no aplica: sin PBT-x)

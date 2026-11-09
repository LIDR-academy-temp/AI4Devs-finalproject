# specs/bot-ia.md — BOT «C500 Asiste» / IA (source of truth SDD)

> Contexto de dominio SDD-Nice; se lee en /definir antes de spec.md. Solo lo verificado; lo nuevo (delta). Target SDD: integrations + backend + database.

## Propósito

«C500 Asiste» es el **asistente inteligente conversacional** de CuartaQuinientos sobre Telegram. No es un subconjunto de la web: cubre **todo el sistema según el perfil** (residente, trabajador, administrador) en formato de chat y **potenciado con IA**. El residente opera tickets, cuotas, encuestas, juntas, anuncios, mascotas, vehículos, visitas/pases y reservas; el **trabajador** recibe su próxima tarea y sube evidencia; el **administrador administra desde el chat** (pagos, avisos, encuestas, tickets, `/bi`). Encima añade inteligencia: resuelve dudas del **uso del sistema** y del **reglamento** con RAG, sugiere de forma proactiva y automatiza tareas repetitivas. Reutiliza la misma API REST/GraphQL del portal: **no duplica lógica de negocio**.

## Principios de UX

- **Conciso y al punto:** pide únicamente el dato mínimo indispensable; el resto (unidad, solicitante, perfil) lo infiere del contexto del usuario autenticado y del historial, sin volver a preguntar.
- **Botones inline sobre texto libre:** menús y opciones se presentan como botones; el texto libre se reserva para lenguaje natural (Q&A).
- **Una acción por mensaje** y **confirmación de un toque**.
- **Menús por perfil:** residente / trabajador / admin, con comandos como `/inicio`, `/tickets`, `/tarea`, `/cuotas`, `/bi`, `/ayuda`, `/desvincular`.
- **Nunca inventa:** si la confianza es baja o la duda excede lo documentado, lo dice y **escala** (abre ticket / deriva a administración).

## Paridad web ↔ bot

El bot expone **los mismos 15 módulos** que la web, según el perfil — es *la misma funcionalidad, en formato conversacional y potenciada con IA*. Todo lo que se hace en la web se puede hacer en el bot: levantar/atender tickets con evidencia, cuotas y pagos, encuestas, juntas, anuncios, mascotas, vehículos, visitas/pases QR, reservas, archivos, reportes/BI, perfil y administración. La **autorización por perfil es idéntica** a la web (mismos endpoints, mismo middleware que rechaza con 403). El asistente añade valor encima: resuelve dudas de operación y del reglamento, guía paso a paso, sugiere proactivamente y automatiza. Diseño **API-first**: el bot es un cliente más del mismo backend, sin lógica duplicada ni versiones distintas.

## Objetos del dominio (esquemas nuevos)

Todo lo de esta sección es **(delta)**: no existe en la base de referencia. Comparte el patrón de auditoría (`Creado`, `Modificado`, `UsuarioCreacionID`, `UsuarioModificacionID`, `FechaCreacion`, `FechaModificacion`) + `bEliminado` de todas las tablas del sistema.

**`bot.*` — canal Telegram y asistente:**
- `bot.CuentasTelegram (CuentaTelegramID PK, UsuarioID FK→sgr.Usuarios, ChatId BIGINT, FechaVinculacion, Activo)` — vinculación 1:1 usuario↔chat; consultable (reemplaza guardar el chatId sólo en `sgr.Usuarios.Preferencias`). **(delta)**
- `bot.TokensVinculacion (Token PK, UsuarioID FK, FechaExpira, Usado)` — token de un solo uso para vinculación segura. **(delta)**
- `bot.Conversaciones (ConversacionID PK, ChatId, UsuarioID FK, EstadoFlujo, ContextoJSON, FechaInicio, FechaUltimaActividad)` — estado del `ConversationHandler` y contexto del asistente. **(delta)**
- `bot.Mensajes (MensajeID PK, ConversacionID FK, Rol [usuario|bot], Texto, IntentDetectado, FechaHora)` — historial + analítica de intención. **(delta)**
- `bot.Sugerencias (SugerenciaID PK, UsuarioID FK, Tipo [COBRO|RESERVA|ENCUESTA|VACUNAS|DOCUMENTO], PayloadJSON, Estado [PENDIENTE|ENVIADA|ATENDIDA|DESCARTADA], FechaGenerada, FechaAtendida)` — nudges proactivos. **(delta)**

**`ia.*` — base de conocimiento y RAG:**
- `ia.Documentos (DocumentoID PK, Titulo, Fuente [reglamento|faq|aviso|ayuda-sistema], Contenido)` — el `reglamentocuarta500.pdf` **y** la guía de uso del sistema (cómo hacer cada cosa). **(delta)**
- `ia.Fragmentos (FragmentoID PK, DocumentoID FK, Texto, Embedding VARBINARY/JSON)` — chunks + embeddings para RAG. **(delta)**
- `ia.Consultas (ConsultaID PK, UsuarioID FK, Pregunta, Respuesta, FragmentosUsados, Confianza, Escalado BIT, FechaHora)` — bitácora de Q&A (auditoría y mejora continua). **(delta)**

**Ampliaciones a esquemas existentes:**
- `ntf.NotificacionesEntrega (NotificacionEntregaID PK, NotificacionID FK→ntf.Notificaciones, CanalID, Estado [PENDIENTE|ENVIADA|FALLIDA], FechaEnvio, Reintentos)` — idempotencia del notificador saliente. **(delta)**
- `sgr.Usuarios.Preferencias` (JSON existente) — puede guardar `TelegramChatID`; `bot.CuentasTelegram` es la fuente canónica. **(delta)**

## Componentes

- **IAssistantService (backend, IA):** capa inteligente del bot. Delega en un **proveedor LLM configurable** (p. ej. Claude API; claves en variables de entorno) para (1) detección de intención, (2) **Q&A con RAG** sobre `ia.Fragmentos` (reglamento, FAQ y ayuda de uso del sistema) y (3) redacción de resúmenes BI. Registra cada respuesta en `ia.Consultas`. Para **ejecutar** acciones (crear ticket, reservar área, consultar cuotas, registrar pago según perfil) **reutiliza los endpoints de dominio**: no duplica lógica, sólo orquesta. Escala cuando la confianza es baja. **(delta)**
- **Notificador saliente:** servicio dentro del backend (o worker del mismo servicio) que, ante eventos (pago registrado, cambio de estado de ticket, encuesta/aviso publicado), llama a la **Telegram Bot API (`sendMessage`)** para el chat vinculado, registrando la entrega en `ntf.NotificacionesEntrega` para garantizar **idempotencia** y reintentos sin duplicar. **(delta)**
- **Worker de sugerencias proactivas:** job programado que detecta adeudos vencidos (`fnz.Cuotas`), vacunas por renovar (`usr.Mascotas`) y encuestas abiertas (`enc.Encuestas`), genera `bot.Sugerencias` que el notificador envía por Telegram — idempotente y sin repetir lo descartado (sin spam). **(delta)**
- **Bot de Telegram (cliente, Python):** `python-telegram-bot` 21.x (webhook en prod, polling en dev); guarda el JWT del usuario vinculado. Cliente del mismo API REST. **(delta)**

## Invariantes (INV-x)

- **INV-1 — El asistente nunca inventa:** si la confianza es baja o la duda excede lo documentado, lo declara y **escala** (crea ticket / deriva a humano); nunca fabrica respuestas.
- **INV-2 — No duplica lógica:** toda acción se ejecuta reutilizando los endpoints de dominio existentes; el bot y el `IAssistantService` sólo orquestan.
- **INV-3 — Autorización por perfil:** cada acción respeta el mismo perfil y middleware que la web; un residente no puede ejecutar acciones de admin (rechazo por perfil).
- **INV-4 — Vinculación sin credenciales en el chat:** jamás se piden correo/contraseña en Telegram; sólo token de un solo uso con expiración corta.
- **INV-5 — Entrega idempotente:** ninguna notificación saliente se envía dos veces; el estado se rastrea en `ntf.NotificacionesEntrega` (PENDIENTE/ENVIADA/FALLIDA + reintentos).
- **INV-6 — Toda respuesta IA queda auditada:** cada Q&A se registra en `ia.Consultas` (pregunta, respuesta, fragmentos usados, confianza, escalado).
- **INV-7 — Soft delete:** todas las tablas nuevas usan `bEliminado`; sin borrado físico.
- **INV-8 — Sin stored procedures:** acceso a datos con Dapper parametrizado sobre tablas y vistas `vs*`; lógica en servicios C#.

## Historias del dominio

- **HU-BOT-01 [M]** — Vincular cuenta de Telegram por token de un solo uso (deep-link `t.me/<bot>?start=<token>`); token expirado/usado → "Enlace no válido o expirado".
- **HU-BOT-02 [M]** — Abrir ticket desde Telegram: `/tickets` → menú → prioridad/título/descripción → crea ticket (canal TELEGRAM si el delta aplica), responde ID + estado **Nuevo**.
- **HU-BOT-03 [M]** — Consultar estado de cuenta: `/cuotas` → últimas cuotas (período, monto, estado Pagado/Pendiente/Vencida); destaca total adeudado.
- **HU-BOT-04 [M]** — Notificaciones proactivas: pago registrado, cambio de estado de ticket; entrega marcada en `ntf.NotificacionesEntrega`, reintento sin duplicar si falla.
- **HU-BOT-05 [S]** — Desvincular cuenta: `/desvincular` + confirmar → limpia el `TelegramChatID`/vinculación; deja de recibir notificaciones sin borrar la cuenta del portal.
- **HU-BOT-06 [M]** — Q&A con RAG del **reglamento** y del **uso del sistema** (`ia.Documentos` fuentes `reglamento`/`faq`/`ayuda-sistema`); cita la fuente, ofrece atajo a la acción, registra en `ia.Consultas`, escala si la confianza es baja.
- **HU-BOT-07 [S]** — Sugerencias proactivas (cobro de adeudos, vacunas por renovar, encuestas abiertas) con acción a un toque; registradas en `bot.Sugerencias`, sin repetir lo atendido/descartado.
- **HU-BOT-08 [S]** — Reservar la terraza / área común por chat (`vts.AreasComunes` `RequiereReservacion=1` → `vts.ReservacionesArea`); si el horario está ocupado, ofrece alternativas; cita aforo/costo del reglamento.
- **HU-BOT-09 [S]** — El bot cubre **todo el sistema**: mascotas, vehículos, encuestas, anuncios, convocatorias de junta, pase de visita (QR) y perfil, llamando al endpoint de dominio con la misma autorización por perfil.
- **HU-BOT-10 [M]** — Trabajador: `/tarea` → ticket asignado más prioritario (`tkt.TicketsUsuariosAsignados`) → comenzar (**En seguimiento**) → subir foto (`tkt.DocumentosTicket`) → **Resuelto** + notifica al residente + ofrece la siguiente.
- **HU-BOT-11 [M]** — Levantar un ticket en segundos: sólo categoría (botones) + descripción (foto opcional); unidad y solicitante inferidos del perfil.
- **HU-BOT-12 [S]** — Administrador administra desde el chat: registrar pago, publicar aviso/encuesta, asignar/cerrar tickets, `/bi`; rechaza por perfil a residentes.
- **HU-BOT-13 [S]** — Responder encuestas en el chat: presenta pregunta por pregunta con botones (opción múltiple) y registra en `enc.Respuestas`.
- **BI por bot — HU-BI-03 [S]** — `/bi` (Administrador) → resumen ejecutivo redactado por el asistente (IA sobre `bi.KpiSnapshots` + vistas `vs*`), con opción de recibir el PDF; rechaza por perfil a residentes.

## Endpoints

- `POST /BOT/Asistente/Consultar` — Q&A con RAG. Body `{ pregunta, canal? [WEB|TELEGRAM] }`; respuesta `{ respuesta, intent, fuentes[], confianza, escalado, accionSugerida }`. `bearerAuth`. Registra en `ia.Consultas`; escala si la confianza es baja. **(delta)**
- `GET /bot/sugerencias` / `POST /bot/sugerencias` — listar/generar nudges de `bot.Sugerencias`. **(delta)**
- `POST /SGR/Usuarios/telegram/token` — genera el token de un solo uso de vinculación (usuario autenticado en el portal). **(delta)**
- `POST /SGR/Usuarios/telegram/vincular` — valida y consume el token, vincula el `chat_id` en `bot.CuentasTelegram` y devuelve JWT de sesión al bot. **(delta)**

> Convención REST real `/{DOMINIO}/{Controller}` (no `/api/...`). Las **acciones** (crear ticket, reservar área, consultar cuotas, registrar pago) NO tienen endpoints nuevos: el bot llama los de dominio existentes (`/TKT/Tickets`, `/FNZ/Cuotas`, `/VTS/ReservacionesArea`, `/ENC/Respuestas`, etc.).

## Flujo de trabajador

`/tarea` → lee el ticket asignado más prioritario en `tkt.TicketsUsuariosAsignados` (unidad, categoría, descripción, mínimo indispensable) → comenzar: `PATCH /TKT/Tickets/{ticketID}/estado/{nuevoEstadoTicketID}` a **En seguimiento** → subir foto de evidencia → `tkt.DocumentosTicket` → cambio a **Resuelto** → se notifica al residente (notificador saliente) → el bot ofrece la siguiente tarea. Estados reales: **Nuevo, En seguimiento, Resuelto, Cerrado** (catálogo `tkt.EstadosTickets`).

## Reutilización / objetos existentes (escalera)

El bot reutiliza el backend completo sin duplicar lógica:
- **Auth:** `POST /SGR/AuthService/GenerateToken` (mismo JWT que el portal).
- **Tickets:** `/TKT/Tickets`, `PATCH .../estado/...`, `/TKT/DocumentosTicket`, `/TKT/TicketsUsuariosAsignados`; vistas `tkt.vsTickets`, `tkt.vsTicketsUsuariosAsignados`.
- **Finanzas:** `/FNZ/Cuotas` (pago marcado en la Cuota: `Pagado`, `FechaPago`, `ReferenciaPago`), `/FNZ/Transacciones`; vista `fnz.vsTransacciones`.
- **Reservas/visitas:** `/VTS/AreasComunes`, `/VTS/ReservacionesArea`, `/VTS/VisitasGeneradas`; vistas `vts.vsReservacionesArea`, `vts.vsVisitasGeneradas`.
- **Encuestas / anuncios / juntas:** `/ENC/*`, `/ANM/Anuncios`, `/JNT/*`.
- **Mascotas / vehículos / perfil:** `/USR/Mascotas`, `/USR/Automoviles`, `/SGR/Usuarios`; vistas `usr.vsMascotas`, `usr.vsAutomoviles`.
- **BI/reportes:** vistas `vs*` + `Reportes` (QuestPDF/ClosedXML).

## Deltas del proyecto (nuevo)

- Esquemas `bot.*` (CuentasTelegram, TokensVinculacion, Conversaciones, Mensajes, Sugerencias) e `ia.*` (Documentos, Fragmentos, Consultas).
- `ntf.NotificacionesEntrega` (idempotencia del envío a Telegram).
- `IAssistantService` (LLM configurable + RAG), notificador saliente (backend→Telegram Bot API) y worker de sugerencias proactivas.
- Endpoints `/BOT/Asistente/Consultar`, `/bot/sugerencias`, `/SGR/Usuarios/telegram/token`, `/SGR/Usuarios/telegram/vincular`.
- Vinculación segura por token de un solo uso (reemplaza pedir credenciales en el chat).
- BI por bot (`/bi`) alimentado por `bi.KpiSnapshots` + vistas `vs*` (adopción del bot WEB vs TELEGRAM requiere el delta `tkt.Tickets.Canal`/`CanalID`).

## Configuración del proveedor IA (implementación)

- **Ubicación:** backend .NET únicamente — `Assistant` en `appsettings` + env (`Assistant__Provider`, `ANTHROPIC_API_KEY`, `OPENAI_API_KEY`, umbrales).
- **Patrón:** `ILlmProvider` (Anthropic / OpenAI / Azure) registrado en DI; `IAssistantService` depende de la interfaz, no del SDK.
- **Bot Python:** `.env` con `TELEGRAM_TOKEN` y `API_BASE_URL` solamente; inteligencia vía `POST /BOT/Asistente/Consultar`.
- **Detalle y ejemplos:** [referencia/bot-ia-configuracion.md](../referencia/bot-ia-configuracion.md).

## Notas

- **No es un chat:** comandos y flujos guiados no usan LLM; texto libre y `/ayuda` sí, con RAG y escalado.
- **Diseño API-first:** el bot es un cliente más del mismo backend REST/GraphQL; el sistema queda **encaminado a futuros clientes** (p. ej. móvil) sin rehacer el backend. **No se promete una app móvil** — sólo el diseño que la habilitaría más adelante.
- El bot introduce un proceso Python que se despliega y monitorea por separado (webhook en prod, polling en dev).
- Sin stored procedures; auditoría por columnas + `bEliminado` en todo lo nuevo.

> Documento de diseño detallado (origen: README de la Entrega 1). Resumen y punto de entrada: [README](../README.md).

# 6. Tickets de Trabajo

**Prompt 1:** *(Claude · descomposición HU → ticket técnico)*

```
Historia HU-TKT-01: genera ticket backend TKT-BE-001 — servicio C# + Dapper + transacción,
POST /TKT/Tickets, estados desde catálogo, notificación a admins, lectura tkt.vsTickets.
Prohibido: SP prcCreateTicket. AC técnicos verificables para Entrega 2.
```

*Plantilla del Ticket 1 en §6; el humano rechazó el borrador con stored procedure (coherente con ADR-001).*

**Prompt 2:** *(Claude · paralelismo front / GraphQL)*

```
Deriva TKT-BE-002 (GraphQL mutation + [Authorize]) y FE-031 (captura ticket, estados vacío/carga/error)
desde los mismos AC de HU-TKT-01. Dependencias explícitas entre tickets.
```

*Índice 0–40 y criterios de FE-031/FE-030 al final del readme.*

**Prompt 3:** *(Claude · secuenciación por fases)*

```
Ordena tickets en Fase 1 (demo web: auth, ticket, finanzas, dashboard) vs Fase 2–3
(Telegram, ENC, BI, WMS). Buffer ~30% para revisión humana; no marcar todo como sprint 1.
```

*Roadmap §5 (Fases 1–3) y columna «Fase» del índice de tickets.*

> *Registro ampliado:* planificación **DB-000** con `/definir` + `/diseñar` — `prompts.md` §6 **Prompt 4** (no duplicado aquí; el readme evaluable lleva máx. 3 prompts por sección).

> **Respuestas del asistente (§6):** TKT-BE-001 (5 h, servicio+Dapper, SP rechazado); cadena TKT-BE-002/FE-031; fases 0–3 e índice **0–40**; **DB-000** vía SDD (`prompts.md` §6 Prompt 4). Habilitadores 33–40 tras Flujo 6. — [Registro completo](../prompts.md#p6-tickets)

> **Gestión con Spec-Driven Development (SDD).** Cada ticket de esta sección es el **contrato resumido**; su planificación completa vive en [`ContextoCuartaQuinientos/.planning/`](../ContextoCuartaQuinientos/.planning/FASE1_ROADMAP.md), una carpeta por ticket (`tkt-<id>/`) con `_index.md` (estado, dependencias y bitácora), `spec.md` (historia, alcance MoSCoW, invariantes, criterios de aceptación Given/When/Then, Definition of Ready) y `design.md` (estrategia, escalera de decisión, objetos por capa, riesgos y pruebas), generados con las plantillas de `sdd-toolkit/templates/`. El orden de ejecución y el estado de cada ticket están en [`FASE1_ROADMAP.md`](../ContextoCuartaQuinientos/.planning/FASE1_ROADMAP.md); el contexto por dominio en [`ContextoCuartaQuinientos/specs/`](../ContextoCuartaQuinientos/specs/_index.md). Ciclo por ticket: `/definir` → `/diseñar` → `/ejecutar` → `/revisar` → `/completar`.

> **Convención REST (todos los tickets):** rutas `/{Dominio}/{Controller}/...` sin prefijo `/api`, coherente con §4 del diseño. Extensiones de esquema: §3.3; vinculación Telegram en **BOT-BE-004**; el bot se crea en `Bot/` (Entrega 2).

**Índice de tickets (0–40)** — escala única de estimación: **horas ideales** (sin buffer; el roadmap aplica ~30 %).


| #   | ID          | Fase | Historias / foco                     | Capa                |
| --- | ----------- | ---- | ------------------------------------ | ------------------- |
| 33  | SETUP-000   | 0    | Habilitador (scaffolds + CI)         | Transversal         |
| 0   | DB-000      | 0    | Núcleo §5.0 (habilitador)            | Base de datos       |
| 34  | DB-001      | 0    | Alineación físico ↔ modelo (ADR-008) | Base de datos       |
| 35  | DB-002      | 0    | Catálogos + admin inicial            | Base de datos       |
| 1   | TKT-BE-001  | 1    | HU-TKT-01, HU-BOT-02                 | Backend             |
| 2   | TKT-BE-002  | 1    | HU-TKT-01                            | Backend GraphQL     |
| 3   | TKT-BOT-003 | 2    | HU-BOT-02                            | Bot                 |
| 4   | BOT-BE-004  | 2    | HU-BOT-01, HU-BOT-05                 | Backend + `bot.*`   |
| 5   | IA-BE-005   | 3    | HU-BOT-06                            | Backend IA / RAG    |
| 6   | BOT-BE-006  | 2    | HU-BOT-07                            | Backend worker      |
| 7   | USR-BE-007  | 1    | HU-USR-01                            | Backend auth        |
| 8   | USR-BE-008  | 1    | HU-USR-02                            | Backend + FE perfil |
| 9   | USR-BE-009  | 1    | HU-USR-04                            | Backend Admin       |
| 10  | FNZ-BE-010  | 1    | HU-FNZ-01                            | Backend             |
| 11  | FNZ-BE-011  | 1    | HU-FNZ-02                            | Backend             |
| 12  | FNZ-BE-012  | 1    | HU-FNZ-03                            | Backend             |
| 13  | NTF-BE-013  | 1    | HU-NTF-01..03                        | Backend             |
| 14  | DASH-BE-014 | 1    | HU-DASH-01..02                       | Backend             |
| 15  | TKT-BE-015  | 1    | HU-TKT-02                            | Backend             |
| 16  | TKT-BE-016  | 1    | HU-TKT-03                            | Backend             |
| 17  | MAS-BE-017  | 3    | HU-MAS-01..02                        | Backend             |
| 18  | VEH-BE-018  | 3    | HU-VEH-01..02                        | Backend             |
| 19  | BOT-BE-019  | 2    | HU-BOT-03                            | Bot + API           |
| 20  | BOT-BE-020  | 2    | HU-BOT-04                            | Bot + notificador   |
| 21  | BOT-BE-021  | 2    | HU-BOT-10                            | Bot trabajador      |
| 22  | BOT-BE-022  | 2    | HU-BOT-11                            | Bot                 |
| 23  | BI-BE-023   | 3    | HU-BI-01                             | Backend + FE BI     |
| 24  | ENC-BE-024  | 2    | HU-ENC-01..03                        | Backend             |
| 25  | JNT-BE-025  | 3    | HU-JNT-01..02                        | Backend             |
| 26  | VTS-BE-026  | 3    | HU-VTS-01..03                        | Backend             |
| 27  | ANM-BE-027  | 2    | HU-ANM-01..02                        | Backend             |
| 28  | ARC-BE-028  | 2    | HU-ARC-01..02                        | Backend             |
| 29  | WMS-BE-029  | 3    | HU-WMS-01..03                        | Backend + SQL `wms` |
| 30  | FE-030      | 1    | HU-USR-01                            | Frontend            |
| 31  | FE-031      | 1    | HU-TKT-01..02                        | Frontend            |
| 32  | FE-032      | 1    | HU-FNZ-01                            | Frontend            |
| 36  | USR-BE-036  | 1    | HU-USR-03                            | Backend + Frontend  |
| 37  | FNZ-BE-037  | 1    | HU-FNZ-06                            | Backend             |
| 38  | FE-038      | 1    | HU-TKT-03                            | Frontend            |
| 39  | FE-039      | 1    | HU-FNZ-02, 03, 06                    | Frontend            |
| 40  | FE-040      | 1    | HU-DASH-01..02, HU-NTF-01..02        | Frontend            |


**Esfuerzo estimado Fase 0 + Fase 1:** 106 h ideales (tickets 0–2, 7–16, 30–40) → **≈ 138 h con buffer del 30 %**. Fase 2 y Fase 3 se re-estiman al cerrar la Fase 1 con la velocidad real.

### **Ticket 0 — Base de datos: esquema base desplegable e idempotente (solo estructura)**

**ID:** DB-000
**Dominio:** Transversal (16 esquemas: `sgr`, `tkt`, `fnz`, `ntf`, `usr`, `vts`, `enc`, `jnt`, `anm`, `arc`, `api`, `dbo`, `bot`, `ia`, `bi`, `wms`)
**Tipo:** Base de datos (SQL Server / T-SQL)
**Historia:** habilitador de las 5 historias del núcleo §5.0 (HU-USR-01, HU-TKT-01, HU-TKT-03, HU-FNZ-01, HU-FNZ-02)
**Estimación:** 3 horas
**Prioridad:** Alta (bloquea DB-001, DB-002, USR-BE-007 y el resto de la Fase 1)
**SDD:** `ContextoCuartaQuinientos/.planning/tkt-db-000/` (`spec.md` + `design.md`)

**Descripción:** Convertir `SQL/cuartaquinientos_schema.sql` (fuente única del modelo §3 + extensiones §3.3) en un script **solo de estructura** que cualquier integrante del equipo pueda ejecutar con **un solo comando** sobre una BD vacía y **las veces que haga falta**. El proyecto está en construcción: el script **no contiene datos** (sin `INSERT`/`UPDATE`); la carga de catálogos se define en un ticket posterior de Entrega 2. No se agregan tablas ni columnas de negocio; **sí** forman parte del alcance mecánico crear los esquemas faltantes y deduplicar vistas. Los renombres y columnas faltantes del diccionario §3.2 **no** se hacen aquí sino en DB-001, para que este ticket sea puramente mecánico. Se eliminan los `USE [db24572]` fijos, se agregan guardas `IF OBJECT_ID(...) IS NULL` al bloque baseline (las extensiones ya las tienen) y las vistas pasan a `CREATE OR ALTER VIEW`. Además:

- **Esquemas base:** hoy el script solo crea `bot`, `ia`, `bi`, `wms`; se crean al inicio, de forma idempotente (`IF SCHEMA_ID(N'x') IS NULL EXEC (N'CREATE SCHEMA [x]')`), los 11 esquemas base que usa el baseline: `sgr`, `tkt`, `fnz`, `ntf`, `usr`, `vts`, `enc`, `jnt`, `anm`, `arc`, `api` (`dbo` ya existe).
- **Vistas duplicadas:** `usr.vsMascotas` y `usr.vsAutomoviles` están definidas dos veces (bloque `20260425_alter_views_mascotas_automoviles.sql` con `LEFT JOIN`, sin `GO` entre ambas, y bloque `vistas_relacionadas.sql` con `INNER JOIN`). Se conserva **una sola** definición de cada una, la versión `LEFT JOIN` (no pierde filas con FK de catálogo `NULL`), cada vista en su propio batch terminado en `GO`.

**Criterios de aceptación técnicos:**

- [ ] `sqlcmd -S <srv> -d CuartaQuinientos -i SQL/cuartaquinientos_schema.sql` termina sin errores sobre BD vacía; el script no contiene `USE` con nombre de BD fijo y aborta si se ejecuta en `master`/`model`/`msdb`/`tempdb`
- [ ] Segunda ejecución sobre la misma BD: sin errores (idempotente)
- [ ] Inventario post-despliegue: **16 esquemas, 73 tablas, 18 vistas** `vs`*
- [ ] Sobre una BD vacía (solo `dbo`), el script crea los 11 esquemas base antes de la primera tabla; `SELECT name FROM sys.schemas` devuelve los 16 esquemas del dominio y una segunda ejecución no falla por esquema existente
- [ ] El script contiene exactamente **una** sentencia `CREATE OR ALTER VIEW` para `usr.vsMascotas` y una para `usr.vsAutomoviles` (versión `LEFT JOIN`), cada una seguida de `GO`; ninguna vista del script aparece definida dos veces
- [ ] `usr.vsMascotas` devuelve una mascota cuyo `RazaMascotaID` es `NULL` (con `RazaLibre`) y `usr.vsAutomoviles` un vehículo con `ModeloID` `NULL` (con `ModeloLibre`) — caso de prueba en la suite dentro de `BEGIN TRAN … ROLLBACK`
- [ ] **Sin datos:** el script no contiene `INSERT`, `UPDATE`, `MERGE` ni `IDENTITY_INSERT`; tras desplegar, todas las tablas tienen 0 filas
- [ ] Todas las FK habilitadas y ninguna tabla de negocio sin PK
- [ ] Suite `SQL/pruebas/DB-000_PruebasIntegracion.sql` (plantilla SDD, `BEGIN TRAN … ROLLBACK`) con al menos un caso negativo: `INSERT` en `tkt.Tickets` con `UsuarioSolicitanteID` inexistente falla por FK (error 547)
- [ ] Smoke de contrato: `SELECT TOP 0` sobre `tkt.vsTickets` y `sgr.vsUsuarios` sin error
- [ ] **Non-goals:** sin datos ni catálogos cargados, sin stored procedures de negocio (ADR-001), sin EF/migraciones automáticas, sin renombres de columnas (los aplica DB-001)

```sql
-- Patrón de idempotencia aplicado a cada tabla del baseline (ya usado en extensiones §3.3)
IF DB_NAME() IN (N'master', N'model', N'msdb', N'tempdb')
    RAISERROR(N'Ejecutar sobre la BD de CuartaQuinientos (sqlcmd -d), no en una BD de sistema.', 16, 1);
GO
IF SCHEMA_ID(N'tkt') IS NULL EXEC (N'CREATE SCHEMA [tkt]');
GO
IF OBJECT_ID(N'[tkt].[EstadosTickets]', N'U') IS NULL
BEGIN
    CREATE TABLE [tkt].[EstadosTickets] ( /* columnas sin cambios respecto a §3 */ );
END;
GO
-- Sin INSERT: la tabla queda vacía; los catálogos se cargan en un ticket posterior.
```

---



### **Ticket 1 — Backend: crear ticket (repositorio Dapper + servicio + REST)**

**ID:** TKT-BE-001
**Dominio:** TKT — Tickets
**Tipo:** Backend (servicio + acceso a datos + endpoint REST)
**Historia:** HU-TKT-01, HU-BOT-02
**Estimación:** 5 horas
**Prioridad:** Alta
**Bloqueado por:** USR-BE-007, DB-002 (catálogos sembrados), NTF-BE-013 (`INotificacionService`; puede desarrollarse en paralelo con un mock)

**Descripción:** Implementar `ITicketService.CrearTicketAsync` en la capa de **servicios C# + repositorio Dapper** (sin stored procedures) y exponerlo por REST en `POST /TKT/Tickets` (cliente: bot y web). El servicio valida con FluentValidation, comprueba que el perfil sea Residente, resuelve estado inicial ("Nuevo"), prioridad, categoría y canal desde sus catálogos, infiere la casa del solicitante (`sgr.CasaOcupantes` vigente), inserta en `tkt.Tickets` y notifica a los administradores vía `INotificacionService`, todo dentro de **una transacción** (`IDbTransaction`). Devuelve el ticket leído desde `tkt.vsTickets`. El solicitante viene del JWT (`sub`), nunca del input.

**Criterios de aceptación técnicos:**

- [ ] `POST /TKT/Tickets` con `[Authorize(Roles = "Residente")]` → `201 Created` + `Location: /TKT/Tickets/{id}`; errores en `ProblemDetails` (`400 VALIDATION_ERROR`, `403 FORBIDDEN`)
- [ ] Validaciones: `Titulo` requerido ≤ 200; `Descripcion` requerida ≤ 4 000; `Categoria` existente en `tkt.CategoriasTicket`; `Prioridad` válida o default "Media"; `Canal` WEB (default) o TELEGRAM
- [ ] Estado, prioridad, categoría y canal se **resuelven por catálogo** (nada hardcodeado por ID)
- [ ] `UsuarioSolicitanteID` = claim `sub`; `CasaID` = casa vigente del solicitante (null si no tiene)
- [ ] Insert del ticket + notificaciones a administradores activos en **la misma transacción**; si algo falla, rollback completo
- [ ] Consultas **parametrizadas**; auditoría por columnas (`Creado` = correo, `UsuarioCreacionID`, `FechaCreacion`) + `bEliminado = 0`
- [ ] La respuesta se lee desde `tkt.vsTickets` **después** del commit
- [ ] Tests unitarios: éxito, perfil no residente (`FORBIDDEN`, sin insert), categoría inexistente (`VALIDATION_ERROR`); test de integración del endpoint

```csharp
// Services/TicketService.cs — Dapper + vistas + servicios, sin SPs
public async Task<Result<TicketDto>> CrearTicketAsync(CrearTicketInput input, UsuarioActual solicitante)
{
    if (solicitante.Perfil != Perfiles.Residente)
        return Result<TicketDto>.Fail("FORBIDDEN", "Solo un residente puede reportar incidencias.");

    var validacion = await _validator.ValidateAsync(input);                 // FluentValidation
    if (!validacion.IsValid) return Result<TicketDto>.Fail("VALIDATION_ERROR", validacion.Errors);

    using var conn = _connectionFactory.Create();                           // Microsoft.Data.SqlClient
    await conn.OpenAsync();
    int ticketId;
    using (var tx = conn.BeginTransaction())
    {
        try
        {
            var ids = await _catalogos.ResolverTicketAsync(conn, tx,
                estado: "Nuevo", prioridad: input.Prioridad ?? "Media",
                categoria: input.Categoria, canal: input.Canal ?? "WEB");   // lanza ValidationException si no existe
            var casaId = await _ocupantes.CasaVigenteAsync(conn, tx, solicitante.UsuarioId);

            ticketId = await conn.QuerySingleAsync<int>(@"
                INSERT INTO tkt.Tickets (Titulo, Descripcion, UsuarioSolicitanteID, CasaID, PrioridadTicketID,
                       EstadoTicketID, CategoriaTicketID, CanalID, FechaCreacionTicket,
                       Creado, UsuarioCreacionID, FechaCreacion, bEliminado)
                OUTPUT INSERTED.TicketID
                VALUES (@Titulo, @Descripcion, @By, @CasaId, @PrioridadId, @EstadoId, @CategoriaId, @CanalId,
                        SYSUTCDATETIME(), @ByCorreo, @By, SYSUTCDATETIME(), 0)",
                new { input.Titulo, input.Descripcion, By = solicitante.UsuarioId, ByCorreo = solicitante.Correo,
                      CasaId = casaId, ids.PrioridadId, ids.EstadoId, ids.CategoriaId, ids.CanalId }, tx);

            await _notificaciones.NotificarAdministradoresAsync(conn, tx, "TICKET_NUEVO",
                titulo: $"Nuevo ticket #{ticketId}", mensaje: input.Titulo, autor: solicitante);

            tx.Commit();
        }
        catch { tx.Rollback(); throw; }
    }
    var dto = await conn.QuerySingleAsync<TicketDto>(
        "SELECT * FROM tkt.vsTickets WHERE TicketID = @id", new { id = ticketId });
    return Result<TicketDto>.Ok(dto);
}
```

---



### **Ticket 2 — Backend: GraphQL Mutation crearTicket**

**ID:** TKT-BE-002
**Dominio:** TKT — Tickets
**Tipo:** Backend
**Historia:** HU-TKT-01
**Estimación:** 3 horas
**Bloqueado por:** TKT-BE-001

**Descripción:** Implementar el resolver GraphQL `crearTicket` (HotChocolate) que usa la **web**. Construye `UsuarioActual` desde el JWT (`sub`, `correo`, `perfil`) y delega en el mismo `ITicketService.CrearTicketAsync` que usa `POST /TKT/Tickets` (bot), traduciendo `Result` a `CrearTicketPayload` (`ticket` o `errors`). No contiene reglas de negocio propias.

**Criterios de aceptación técnicos:**

- [ ] Mutation con `[Authorize(Roles = new[] { "Residente" })]` (requiere `RoleClaimType = "perfil"`, SETUP-000)
- [ ] `UsuarioSolicitanteID` = claim `sub` del JWT (`UsuarioID`), **nunca** del input — y **no** se confunde con un `ResidenteID` (esa entidad no existe)
- [ ] `PrioridadTicketID` se resuelve por catálogo `tkt.PrioridadesTicket` a partir del nombre (Baja/Media/Alta/Crítica), default "Media"
- [ ] Si el servicio devuelve error (validación/negocio) → `CrearTicketPayload` con `ticket: null` y `errors`
- [ ] Validaciones fail-fast: `titulo` max 200, `descripcion` max 4 000 (columna `NVARCHAR(MAX)`; mismo límite que TKT-BE-001), prioridad válida
- [ ] `canal` por defecto WEB
- [ ] Cubierto por 3 tests de integración: éxito, validación (título > 200), perfil no autorizado

```csharp
[MutationType]
public class TicketMutation
{
    [Authorize(Roles = new[] { "Residente" })]
    public async Task<CrearTicketPayload> CrearTicketAsync(
        CrearTicketInput input,
        [Service] ITicketService ticketService,
        ClaimsPrincipal claimsPrincipal)
    {
        // sub = UsuarioID (no existe ResidenteID)
        var solicitante = UsuarioActual.DesdeClaims(claimsPrincipal);
        var result = await ticketService.CrearTicketAsync(input, solicitante);
        return CrearTicketPayload.Desde(result);
    }
}
```

---



### **Ticket 3 — Bot Telegram: menú /tickets → ver y reportar**

**ID:** TKT-BOT-003
**Dominio:** BOT — Telegram
**Tipo:** Bot / Integración
**Historia:** HU-BOT-02
**Estimación:** 5 horas
**Bloqueado por:** TKT-BE-001 (`POST /TKT/Tickets`), TKT-BE-015 (`GET /TKT/Tickets/mis`), BOT-BE-004 (vinculación y sesión)

**Descripción:** Handler `/tickets` en el bot (Python, `python-telegram-bot` 21). Menú con botones inline "Ver mis tickets" y "Reportar incidencia". Reportar: categoría (botones) → descripción → resumen con Confirmar/Cancelar → `POST /TKT/Tickets` con el JWT del usuario vinculado. Si el chat no está vinculado, lo guía al flujo por token (nunca pide contraseña).

**Criterios de aceptación técnicos:**

- [ ] Obtiene el JWT del chat con `ApiClient.sesion(chat_id)` (`POST /SGR/Usuarios/telegram/sesion`); si responde 404 → "Primero vincula tu cuenta desde el portal."
- [ ] Categorías con `InlineKeyboardMarkup` a partir de `GET /TKT/CategoriasTicket` (cacheadas 10 min)
- [ ] Descripción 5–200 caracteres; el título se deriva de los primeros 60 caracteres
- [ ] Resumen con "✅ Confirmar" / "❌ Cancelar"; al primer toque se editan el mensaje y los botones (sin doble envío)
- [ ] Cuerpo: `{ titulo, descripcion, categoria, canal: "TELEGRAM" }`; en éxito → "✅ Ticket #[ID] creado. Estado: Nuevo."
- [ ] Error del API → "❌ No se pudo crear el ticket. Intenta de nuevo o usa el portal." (se registra el `ProblemDetails` en el log, no se muestra al usuario)
- [ ] `ConversationHandler` con `/cancelar` como *fallback* y *timeout* de 10 min
- [ ] Tests con pytest + `respx`: flujo feliz, no vinculado, cancelar, error 400

```python
# bot/handlers/tickets.py
from telegram import InlineKeyboardButton, InlineKeyboardMarkup, Update
from telegram.ext import CallbackQueryHandler, CommandHandler, ContextTypes, ConversationHandler, MessageHandler, filters

CATEGORIA, DESCRIPCION, CONFIRMACION = range(3)

async def tickets_start(update: Update, context: ContextTypes.DEFAULT_TYPE) -> int:
    api = context.bot_data["api"]
    if not await api.sesion(update.effective_chat.id):
        await update.effective_message.reply_text("Primero vincula tu cuenta desde el portal.")
        return ConversationHandler.END
    categorias = await api.categorias_ticket(update.effective_chat.id)
    botones = [[InlineKeyboardButton(c["nombre"], callback_data=f"cat:{c['nombre']}")] for c in categorias]
    await update.effective_message.reply_text("¿Qué tipo de problema es?", reply_markup=InlineKeyboardMarkup(botones))
    return CATEGORIA

def build_handler() -> ConversationHandler:
    return ConversationHandler(
        entry_points=[CommandHandler("tickets", tickets_start)],
        states={
            CATEGORIA: [CallbackQueryHandler(elegir_categoria, pattern=r"^cat:")],
            DESCRIPCION: [MessageHandler(filters.TEXT & ~filters.COMMAND, recibir_descripcion)],
            CONFIRMACION: [CallbackQueryHandler(confirmar, pattern=r"^(ok|cancel)$")],
        },
        fallbacks=[CommandHandler("cancelar", cancelar)],
        conversation_timeout=600,
    )
```

---



### **Ticket 4 — Backend: vinculación de Telegram por token y sesión del bot (nuevo)**

**ID:** BOT-BE-004
**Dominio:** BOT / SGR
**Tipo:** Backend
**Historia:** HU-BOT-01, HU-BOT-05
**Estimación:** 5 horas
**Prioridad:** Alta (bloquea toda la Fase 2)
**Bloqueado por:** USR-BE-007

**Descripción:** Vinculación segura por token de un solo uso (sin contraseña en el chat) y canje `chat_id` → JWT para el bot (ADR-004, ADR-007). El portal genera el token; el bot lo canjea; el backend guarda el vínculo en `bot.CuentasTelegram` (1:1 con `sgr.Usuarios`).

**Criterios de aceptación técnicos:**

- [ ] `POST /SGR/Usuarios/telegram/token` (JWT del usuario) → token aleatorio de 32 bytes (Base64Url), expira en 10 min; en `bot.TokensVinculacion` se guarda **solo su hash SHA-256**; responde `{ deepLink: "https://t.me/<bot>?start=<token>", expira }`
- [ ] `POST /SGR/Usuarios/telegram/vincular` (encabezado `X-Bot-Secret`) recibe `{ token, chatId }`: valida hash, vigencia y `Usado = 0`; marca `Usado = 1`; crea o reactiva el vínculo; todo en una transacción. Token inválido/expirado/usado → `410 Gone`
- [ ] Un `chatId` ya vinculado a otro usuario → `409 Conflict`
- [ ] `POST /SGR/Usuarios/telegram/sesion` (encabezado `X-Bot-Secret`) recibe `{ chatId }` → JWT del usuario vinculado (mismos claims y vida que la web); `404` si no hay vínculo activo o el usuario está inactivo
- [ ] `DELETE /SGR/Usuarios/telegram` (JWT) desactiva el vínculo (`Activo = 0`); lo usa `/desvincular` y el portal
- [ ] `X-Bot-Secret` se compara en tiempo constante (`CryptographicOperations.FixedTimeEquals`); sin él → `401`
- [ ] La contraseña nunca aparece en la ruta de vinculación; tokens y secretos nunca se registran en logs
- [ ] Tests: vinculación feliz, reuso, expiración, secreto inválido, chat ya vinculado, sesión de usuario desactivado

---



### **Ticket 5 — Backend/IA: asistente RAG (**`IAssistantService`**)**

**ID:** IA-BE-005
**Dominio:** BOT / IA
**Tipo:** Backend + IA
**Historia:** HU-BOT-06
**Estimación:** 8 horas
**Prioridad:** Alta

**Descripción:** Implementar el asistente inteligente. Ingesta el reglamento (`reglamentocuarta500.pdf`) y las FAQ a `ia.Documentos`/`ia.Fragmentos` con embeddings; expone `POST /BOT/Asistente/Consultar` que detecta intención, recupera los fragmentos más relevantes (RAG) y responde con el LLM configurable, citando fuentes. Registra en `ia.Consultas` y **escala** si la confianza es baja.

**Criterios de aceptación técnicos:**

- [ ] Ingesta + chunking del reglamento/FAQ; embeddings almacenados en `ia.Fragmentos`
- [ ] Recuperación top-k por similitud antes de llamar al LLM
- [ ] El prompt incluye las fuentes; la respuesta las cita (`fuentes[]`)
- [ ] Umbral de confianza: por debajo → `escalado = true` (crea ticket / deriva), **no inventa**
- [ ] `ILlmProvider` + sección `Assistant` en `appsettings` (`Provider`, `DefaultModel`, `MinConfidenceToAnswer`, `Rag:TopK`) — ver `readme.md §2.8`
- [ ] Claves LLM solo en variables de entorno del **backend**; el proceso Python **no** referencia SDKs de IA
- [ ] Acciones de dominio (crear ticket, etc.) vía servicios existentes, no SQL ni LLM “alucinando” el INSERT
- [ ] Toda consulta queda en `ia.Consultas` (auditoría)
- [ ] Tests con un set de preguntas de ejemplo (respuesta esperada / debe escalar)

---



### **Ticket 6 — Backend: worker de sugerencias proactivas**

**ID:** BOT-BE-006
**Dominio:** BOT
**Tipo:** Backend (worker programado)
**Historia:** HU-BOT-07
**Estimación:** 5 horas
**Bloqueado por:** BOT-BE-004 (vinculación) + notificador saliente

**Descripción:** Job programado que detecta adeudos vencidos (`fnz.Cuotas` `Pagado=0` y `FechaVencimiento<hoy`), vacunas por renovar (`usr.Mascotas`) y encuestas activas, genera `bot.Sugerencias` y las despacha por el notificador saliente a los usuarios con Telegram vinculado.

**Criterios de aceptación técnicos:**

- [ ] Query de cuotas vencidas por usuario con Telegram vinculado
- [ ] Deduplicación por `(UsuarioID, Tipo, período)` — no repetir la misma sugerencia
- [ ] Ciclo de estado `PENDIENTE → ENVIADA → ATENDIDA | DESCARTADA`; una descartada no se reenvía
- [ ] Frecuencia del job configurable; idempotente ante reejecución
- [ ] Registro de entrega en `ntf.NotificacionesEntrega`
- [ ] Tests: genera sugerencia correcta, respeta descarte, no duplica

---



### **Ticket 7 — Backend: autenticación, JWT y refresh token**

**ID:** USR-BE-007
**Dominio:** USR — Usuarios
**Tipo:** Backend (seguridad / acceso a datos)
**Historia:** HU-USR-01
**Estimación:** 5 horas
**Prioridad:** Alta
**Bloqueado por:** SETUP-000, DB-001, DB-002

**Descripción:** Implementar `POST /SGR/AuthService/GenerateToken`, `RefreshToken` y `Logout`. Valida credenciales contra `sgr.Usuarios` (BCrypt en `PasswordHash`), rechaza usuarios inactivos o eliminados con el **mismo** error genérico, emite un JWT (60 min) con los claims `sub`, `correo`, `nombre`, `perfil`, `bAdministrador`, `condominioId`, `exp`, y un refresh token (14 días) guardado con hash en `sgr.RefreshTokens` y enviado en cookie `HttpOnly`.

**Criterios de aceptación técnicos:**

- [ ] Contraseña validada con `BCrypt.Verify` contra `PasswordHash`; si el usuario no existe se verifica contra un hash ficticio (tiempo de respuesta constante)
- [ ] Credenciales inválidas, `bActivo = 0` o `bEliminado = 1` → `401` con `ProblemDetails` "Credenciales inválidas" (`INVALID_CREDENTIALS`), sin distinguir el motivo
- [ ] JWT HS256 con clave ≥ 32 bytes desde configuración; `perfil` mapeado como `RoleClaimType`; vida configurable (`Jwt:AccessTokenMinutes`, default 60)
- [ ] Respuesta `200`: `{ token, expira, perfil, nombre, requiereCambioPassword }` + cookie de refresh token
- [ ] `RefreshToken` rota el token (revoca el anterior); un refresh revocado o vencido → `401`. `Logout` lo revoca
- [ ] Rate limiting: 5 intentos/min por IP + correo → `429`
- [ ] Cada intento se registra con Serilog (resultado, `UsuarioID` si existe, IP; **nunca** la contraseña ni el token)
- [ ] Tests: login residente, login admin, contraseña incorrecta, usuario inactivo (mismo 401), token expirado rechazado, refresh rotado, 429

```csharp
// Controllers/SGR/AuthServiceController.cs
[HttpPost("GenerateToken")]
[AllowAnonymous]
[EnableRateLimiting("login")]
public async Task<IActionResult> GenerateToken([FromBody] LoginInput input)
{
    var resultado = await _authService.AutenticarAsync(input.Correo, input.Password, HttpContext.Connection.RemoteIpAddress);
    if (!resultado.Success)
        return Problem(title: "Credenciales inválidas", statusCode: 401, extensions: new() { ["code"] = "INVALID_CREDENTIALS" });

    Response.Cookies.Append("rt", resultado.RefreshToken, new CookieOptions
        { HttpOnly = true, Secure = true, SameSite = SameSiteMode.Strict, Expires = resultado.RefreshExpira });

    return Ok(new
    {
        token = resultado.AccessToken,
        expira = resultado.AccessExpira,
        perfil = resultado.Usuario.Perfil,
        nombre = resultado.Usuario.Nombre,
        requiereCambioPassword = resultado.Usuario.bActualizarPassword
    });
}
```

---



### **Ticket 8 — Backend + Frontend: ver y editar perfil del residente**

**ID:** USR-BE-008
**Dominio:** USR — Usuarios
**Tipo:** Backend + Frontend
**Historia:** HU-USR-02
**Estimación:** 3 horas
**Bloqueado por:** USR-BE-007 (JWT requerido)

**Descripción:** Implementar `GET /SGR/Usuarios/{id}` (lectura desde `sgr.vsUsuarios`) y `PUT /SGR/Usuarios/{id}` (actualización de teléfono y correo). El usuario solo puede editar su propio perfil; el Admin puede editar cualquiera. El frontend muestra el formulario de perfil con nombre, unidad (casa), teléfono y correo.

**Criterios de aceptación técnicos:**

- [ ] `GET` devuelve datos desde la vista `sgr.vsUsuarios` (join con `sgr.Casas`, `sgr.Condominios`)
- [ ] `PUT` permite actualizar `Telefono` y `Correo`; el `Nombre` solo lo edita el Admin
- [ ] Correo único: si el nuevo correo ya existe en otro usuario activo → HTTP 409 "El correo ya está en uso"
- [ ] El residente solo accede a su propio `UsuarioID` (claim `sub`); un Admin puede acceder a cualquiera
- [ ] Auditoría: `Modificado`, `UsuarioModificacionID`, `FechaModificacion` actualizados en cada `PUT`
- [ ] Frontend: formulario con validación client-side (correo formato válido, teléfono numérico) antes de enviar
- [ ] Si cambia el `Correo`, los refresh tokens se revocan y el usuario vuelve a iniciar sesión (el correo es su identificador de acceso)
- [ ] Tests: GET propio exitoso, PUT correo duplicado, PUT de otro usuario sin ser Admin (HTTP 403)

---



### **Ticket 9 — Backend: gestión de usuarios y residentes (Admin)**

**ID:** USR-BE-009
**Dominio:** USR — Usuarios
**Tipo:** Backend
**Historia:** HU-USR-04
**Estimación:** 5 horas
**Bloqueado por:** USR-BE-007
**Prioridad:** Alta

**Descripción:** CRUD de usuarios para el Admin: alta de residente (con asignación a casa), edición de datos y desactivación. Al crear un usuario el **servidor** genera una contraseña temporal aleatoria, guarda su hash, activa `bActualizarPassword = 1` y la devuelve **una sola vez** en la respuesta para que el Admin la entregue en persona (Fase 1 sin correo). La asignación a casa crea el registro en `sgr.CasaOcupantes`.

**Criterios de aceptación técnicos:**

- [ ] `POST /SGR/Usuarios` requiere `bAdministrador = 1`; crea el usuario con `bActualizarPassword = 1`; responde `201` con `{ usuarioId, passwordTemporal }` (12 caracteres aleatorios; nunca se registra en logs)
- [ ] Si viene `casaId`: inserta en `sgr.CasaOcupantes` con `TipoResidencia` (`Propietario` si la casa no tiene propietario vigente, si no `Arrendatario`), `FechaInicio = hoy`, `Vigente = 1`; si es propietario actualiza `sgr.Casas.PropietarioUsuarioID`
- [ ] `PUT /SGR/Usuarios/{id}` permite cambiar perfil, casa asignada y datos de contacto
- [ ] `PATCH /SGR/Usuarios/{id}/desactivar` → `bActivo = 0` (reversible con `/activar`); `DELETE /SGR/Usuarios/{id}` → `bEliminado = 1` (baja definitiva). En ambos casos el login queda bloqueado, sus refresh tokens se revocan y su historial (tickets, pagos) queda intacto
- [ ] Un usuario inactivo no aparece en listas de asignación de tickets ni en conteos de residentes activos
- [ ] Correo único validado en alta (`409` si ya existe)
- [ ] Tests: alta con casa (propietario y arrendatario), desactivación con login bloqueado, correo duplicado

```csharp
// Services/UsuarioService.cs (fragmento)
public async Task<Result<UsuarioCreadoDto>> CrearResidenteAsync(CrearUsuarioInput input, UsuarioActual admin)
{
    await _validator.ValidateAndThrowAsync(input);
    if (await _repo.ExisteCorreoAsync(input.Correo))
        return Result<UsuarioCreadoDto>.Fail("CONFLICT", "El correo ya está en uso.");

    var passwordTemporal = _passwordGenerator.Generar(longitud: 12);
    var hash = BCrypt.Net.BCrypt.HashPassword(passwordTemporal);

    using var conn = _connectionFactory.Create();
    await conn.OpenAsync();
    using var tx = conn.BeginTransaction();
    try
    {
        var usuarioId = await conn.QuerySingleAsync<int>(@"
            INSERT INTO sgr.Usuarios (Nombre, Correo, Telefono, PasswordHash, PerfilID,
                bActivo, bActualizarPassword, bEliminado, Creado, UsuarioCreacionID, FechaCreacion)
            OUTPUT INSERTED.UsuarioID
            VALUES (@Nombre, @Correo, @Telefono, @Hash, @PerfilID, 1, 1, 0, @ByCorreo, @By, SYSUTCDATETIME())",
            new { input.Nombre, input.Correo, input.Telefono, Hash = hash, input.PerfilID,
                  ByCorreo = admin.Correo, By = admin.UsuarioId }, tx);

        if (input.CasaID.HasValue)
            await conn.ExecuteAsync(@"
                INSERT INTO sgr.CasaOcupantes (CasaID, UsuarioID, TipoResidencia, FechaInicio, Vigente,
                    Creado, UsuarioCreacionID, FechaCreacion, bEliminado)
                VALUES (@CasaID, @UsuarioID,
                    CASE WHEN EXISTS (SELECT 1 FROM sgr.CasaOcupantes
                                      WHERE CasaID = @CasaID AND TipoResidencia = 'Propietario' AND Vigente = 1 AND bEliminado = 0)
                         THEN 'Arrendatario' ELSE 'Propietario' END,
                    CAST(SYSUTCDATETIME() AS DATE), 1, @ByCorreo, @By, SYSUTCDATETIME(), 0)",
                new { input.CasaID, UsuarioID = usuarioId, ByCorreo = admin.Correo, By = admin.UsuarioId }, tx);

        tx.Commit();
        return Result<UsuarioCreadoDto>.Ok(new(usuarioId, passwordTemporal));
    }
    catch { tx.Rollback(); throw; }
}
```

---



### **Ticket 10 — Backend: consulta de estado de cuenta del residente**

**ID:** FNZ-BE-010
**Dominio:** FNZ — Finanzas
**Tipo:** Backend (acceso a datos)
**Historia:** HU-FNZ-01
**Estimación:** 3 horas
**Bloqueado por:** USR-BE-007

**Descripción:** Implementar `GET /FNZ/Cuotas/mis` (residente, usa `sub`) y `GET /FNZ/Cuotas?usuarioId={id}` (Admin) que devuelven el estado de cuenta desde `fnz.Cuotas`, con clasificación automática de estado: Pagada, Pendiente o Vencida (`Pagado=0` y `FechaVencimiento < hoy`). El residente solo ve sus propias cuotas.

**Criterios de aceptación técnicos:**

- [ ] Query parametrizada sobre `fnz.Cuotas` con join a `sgr.Casas` (dirección/número) y `fnz.Cuentas` (vía `CuentaID`)
- [ ] Clasificación de estado calculada en servicio C# (no en SQL): `Pagado=1` → "Pagada"; `Pagado=0 AND FechaVencimiento >= hoy` → "Pendiente"; `Pagado=0 AND FechaVencimiento < hoy` → "Vencida"
- [ ] El residente usa `/mis` (siempre `UsuarioID = sub`); `?usuarioId=` exige `bAdministrador = 1`
- [ ] "Hoy" se calcula en zona `America/Mexico_City` (una cuota que vence hoy sigue *Pendiente*)
- [ ] La respuesta incluye: `{ cuotas: [...], totalPendiente, totalVencido }` para facilitar el dashboard
- [ ] Cuotas vencidas marcadas con `esVencida: true` para que el frontend las destaque visualmente
- [ ] Tests: residente sin deudas, residente con mezcla de estados, acceso cruzado de residente a cuotas ajenas (HTTP 403)

---



### **Ticket 11 — Backend: registrar pago de cuota (Admin)**

**ID:** FNZ-BE-011
**Dominio:** FNZ — Finanzas
**Tipo:** Backend (acceso a datos + transacción)
**Historia:** HU-FNZ-02
**Estimación:** 4 horas
**Bloqueado por:** FNZ-BE-010, NTF-BE-013
**Prioridad:** Alta

**Descripción:** Implementar `PATCH /FNZ/Cuotas/{cuotaId}/pago`: marca la cuota como pagada (`Pagado = 1`, `FechaPago`, `MontoPagado`, `MetodoPago`, `ReferenciaPago`), registra el abono en `fnz.Transacciones` (tipo "Pago de cuota", `bAbono = 1`) en la cuenta `CuentaID` de la cuota y notifica al residente vía `INotificacionService` (que además encola la entrega Telegram si está vinculado). Todo en una transacción atómica y a prueba de doble registro concurrente.

**Criterios de aceptación técnicos:**

- [ ] Solo accesible con `bAdministrador = 1` (política `SoloAdministrador`)
- [ ] `404` si la cuota no existe; `409` "Cuota ya registrada como pagada" si ya lo estaba **o** si otro administrador la pagó en paralelo (el `UPDATE … WHERE Pagado = 0` debe afectar exactamente 1 fila)
- [ ] `MontoPagado` > 0 e igual a `Monto` de la cuota (`422` si difiere — sin pagos parciales en Fase 1); `ReferenciaPago` requerida; `FechaPago` ≤ hoy
- [ ] En la misma transacción: `UPDATE fnz.Cuotas`, `INSERT fnz.Transacciones` (`Abono = MontoPagado`, `Cargo = 0`, `Motivo = "Pago cuota #id"`), notificación `PAGO_REGISTRADO`
- [ ] Si falla cualquier paso → rollback; un fallo posterior de Telegram **no** afecta el pago (outbox, ADR-009)
- [ ] Auditoría: `Modificado`, `UsuarioModificacionID`, `FechaModificacion` en `fnz.Cuotas`
- [ ] Tests: pago exitoso, ya pagada (409), concurrente (409 en el segundo), monto cero (400), monto distinto (422), inexistente (404)

```csharp
// Services/FinanzasService.cs (fragmento)
public async Task<Result> RegistrarPagoAsync(int cuotaId, RegistrarPagoInput input, UsuarioActual admin)
{
    await _validator.ValidateAndThrowAsync(input);   // MontoPagado > 0, ReferenciaPago no vacía, FechaPago <= hoy

    using var conn = _connectionFactory.Create();
    await conn.OpenAsync();
    using var tx = conn.BeginTransaction();
    try
    {
        var cuota = await conn.QuerySingleOrDefaultAsync<CuotaDto>(
            "SELECT * FROM fnz.Cuotas WITH (UPDLOCK, ROWLOCK) WHERE CuotaID = @CuotaId AND bEliminado = 0",
            new { CuotaId = cuotaId }, tx);
        if (cuota is null) { tx.Rollback(); return Result.Fail("NOT_FOUND", "Cuota no encontrada."); }
        if (cuota.Monto != input.MontoPagado) { tx.Rollback(); return Result.Fail("VALIDATION_ERROR", "El monto debe coincidir con la cuota."); }

        var filas = await conn.ExecuteAsync(@"
            UPDATE fnz.Cuotas
            SET Pagado = 1, FechaPago = @FechaPago, MontoPagado = @MontoPagado, MetodoPago = @MetodoPago,
                ReferenciaPago = @ReferenciaPago, Modificado = @ByCorreo, UsuarioModificacionID = @By,
                FechaModificacion = SYSUTCDATETIME()
            WHERE CuotaID = @CuotaId AND Pagado = 0",
            new { CuotaId = cuotaId, input.FechaPago, input.MontoPagado, input.MetodoPago, input.ReferenciaPago,
                  ByCorreo = admin.Correo, By = admin.UsuarioId }, tx);
        if (filas != 1) { tx.Rollback(); return Result.Fail("CONFLICT", "Cuota ya registrada como pagada."); }

        await conn.ExecuteAsync(@"
            INSERT INTO fnz.Transacciones (CuentaID, UsuarioID, TipoMovimientoID, Cargo, Abono, Motivo,
                Creado, UsuarioCreacionID, FechaCreacion, bEliminado)
            SELECT @CuentaId, @UsuarioId, tm.TipoMovimientoID, 0, @MontoPagado, @Motivo,
                   @ByCorreo, @By, SYSUTCDATETIME(), 0
            FROM fnz.TiposMovimiento tm
            WHERE tm.TipoMovimiento = N'Pago de cuota' AND tm.bAbono = 1 AND tm.bEliminado = 0",
            new { CuentaId = cuota.CuentaID, UsuarioId = cuota.UsuarioID, input.MontoPagado,
                  Motivo = $"Pago cuota #{cuotaId}", ByCorreo = admin.Correo, By = admin.UsuarioId }, tx);

        await _notificaciones.NotificarUsuarioAsync(conn, tx, cuota.UsuarioID, "PAGO_REGISTRADO",
            titulo: "Pago registrado",
            mensaje: $"Pago de ${input.MontoPagado:N2} MXN registrado. Período: {cuota.PeriodoInicio:MMMM yyyy}",
            autor: admin);                               // también encola la entrega Telegram (ntf.NotificacionesEntrega)

        tx.Commit();
        return Result.Ok();
    }
    catch { tx.Rollback(); throw; }
}
```

---



### **Ticket 12 — Backend: reporte de morosos (Admin)**

**ID:** FNZ-BE-012
**Dominio:** FNZ — Finanzas
**Tipo:** Backend (consulta de datos)
**Historia:** HU-FNZ-03
**Estimación:** 2 horas
**Bloqueado por:** FNZ-BE-010

**Descripción:** Implementar `GET /Reports/Reportes/Morosos` que devuelve la lista de residentes con cuotas vencidas (`Pagado=0` y `FechaVencimiento < hoy`) agrupados por usuario y casa, con el total adeudado (consulta sobre `fnz.Cuotas`; expuesto bajo dominio RPT, coherente con §4). Solo accesible para Admin.

**Criterios de aceptación técnicos:**

- [ ] Solo accesible con perfil Admin (`bAdministrador=1`)
- [ ] Query parametrizada sobre `fnz.Cuotas` con join a `sgr.vsUsuarios` y `sgr.Casas`; agrupa por `UsuarioID, CasaID` (usuario y casa, como indica la descripción) sumando `Monto` de cuotas vencidas no pagadas
- [ ] Respuesta: `[{ usuarioId, nombre, casa, cuotasVencidas: N, totalAdeudado }]`
- [ ] Si no hay morosos → lista vacía `[]` (HTTP 200, no 404)
- [ ] Filtro opcional por período (`?mes=9&anio=2026`, misma convención que `/Dashboard/Resumen`) para acotar el reporte a cuotas de ese período
- [ ] Tests: fraccionamiento con morosos mezclados con pagados, todos al corriente (lista vacía), filtro por mes

---



### **Ticket 13 — Backend: servicio de notificaciones in-app**

**ID:** NTF-BE-013
**Dominio:** NTF — Notificaciones
**Tipo:** Backend (acceso a datos)
**Historia:** HU-NTF-01, HU-NTF-02, HU-NTF-03
**Estimación:** 3 horas
**Bloqueado por:** USR-BE-007
**Prioridad:** Alta

**Descripción:** Implementar los tres endpoints del módulo NTF: `GET /NTF/Notificaciones` (bandeja del usuario autenticado), `PATCH /NTF/Notificaciones/{id}/leida` (marcar como leída) y `POST /NTF/Notificaciones/aviso` (Admin: aviso masivo a todos los residentes activos). Las operaciones son sobre `ntf.Notificaciones`; la marca de leído vive en `ntf.NotificacionesVisualizadas` (§3.2) y el conteo de no leídas (notificaciones sin fila en esa tabla) alimenta el badge del frontend.

**Criterios de aceptación técnicos:**

- [ ] `GET` filtra por `UsuarioID = sub` del JWT y `bEliminado=0`; ordena por `FechaCreacionNotificacion DESC`; devuelve también `totalNoLeidas` para el badge
- [ ] `PATCH /{id}/leida` valida que la notificación pertenece al usuario autenticado antes de insertar su fila en `ntf.NotificacionesVisualizadas` (`FechaLectura` = ahora; si ya existe no inserta otra — idempotente) (HTTP 403 si no es suya)
- [ ] `POST /aviso` requiere `bAdministrador=1`; genera un insert por cada residente activo (perfil Residente, `bActivo = 1`) dentro de una única transacción (`INSERT … SELECT`)
- [ ] Expone `INotificacionService` (`NotificarUsuarioAsync`, `NotificarAdministradoresAsync`, `AvisoGeneralAsync`) que reciben la conexión/transacción del llamador: es el **único** punto que inserta en `ntf.Notificaciones` y, para usuarios con `bot.CuentasTelegram.Activo = 1`, encola una fila `PENDIENTE` en `ntf.NotificacionesEntrega` (canal TELEGRAM) — lo consume BOT-BE-020 en Fase 2
- [ ] El `TipoNotificacionID` para aviso general se resuelve por catálogo (`ntf.TiposNotificacion WHERE TipoNotificacion = 'AVISO_GENERAL'` — sembrado en DB-002)
- [ ] Auditoría estándar en cada insert
- [ ] Paginación en `GET`: parámetros `?pagina=1&tamano=20` (default 20)
- [ ] Tests: bandeja propia, marcar leída ajena (403), aviso masivo verifica que todos los residentes activos lo reciben

---



### **Ticket 14 — Backend: Dashboard — KPIs Admin y resumen residente**

**ID:** DASH-BE-014
**Dominio:** Dashboard
**Tipo:** Backend (consultas de lectura sobre vistas)
**Historia:** HU-DASH-01, HU-DASH-02
**Estimación:** 3 horas
**Bloqueado por:** USR-BE-007, FNZ-BE-010, NTF-BE-013
**Prioridad:** Alta

**Descripción:** Implementar `GET /Dashboard/Resumen` que detecta el perfil del usuario autenticado y devuelve el payload correspondiente: KPIs operativos para Admin (`ticketsNuevos`, `ticketsEnSeguimiento`, `morososMes`, `montoCobrado`, `montoPendiente`, `ocupacion`) o resumen personal para el residente (`ticketsActivos`, `estadoCuotaMes`, `notificacionesNoLeidas`, `avisoVencida`). Todas las métricas se calculan con queries sobre las vistas `vs`* existentes; **no hay tablas propias del Dashboard**.

**Criterios de aceptación técnicos:**

- [ ] Un único endpoint detecta el perfil por el claim `bAdministrador`; devuelve `ResumenAdmin` o `ResumenResidente` (campo `tipo`) según §4 Endpoint 3; perfiles Guardia/Trabajador → `403`
- [ ] **Admin — métricas del mes en curso (sin rango configurable en Fase 1):**
  - `ticketsNuevos`: `COUNT` sobre `tkt.vsTickets WHERE EstadoTicket='Nuevo'`
  - `ticketsEnSeguimiento`: `COUNT WHERE EstadoTicket='En seguimiento'`
  - `morososMes`: `COUNT DISTINCT UsuarioID FROM fnz.Cuotas WHERE Pagado=0 AND FechaVencimiento<hoy`
  - `montoCobrado` y `montoPendiente`: suma sobre `fnz.Cuotas` del mes en curso
  - `ocupacion`: casas con al menos un `sgr.CasaOcupantes.Vigente = 1` / total de casas del condominio × 100
  - `ticketsPorCanal`: `{ web, telegram }` agrupando tickets del mes por `CanalID`
- [ ] **Residente:**
  - `ticketsActivos`: tickets con estado ≠ 'Cerrado' del usuario autenticado
  - `estadoCuotaMes`: cuota del período actual con el contrato de §4 (`monto`, `fechaVencimiento`, `estado` ∈ Pagada | Pendiente | Vencida, derivado de `Pagado` y `FechaVencimiento`); `null` si no hay cuota del período
  - `notificacionesNoLeidas`: `COUNT` de notificaciones del usuario sin fila en `ntf.NotificacionesVisualizadas`
  - `avisoVencida`: `true` si hay al menos una cuota vencida (`Pagado=0 AND FechaVencimiento<hoy`)
- [ ] Todas las queries son parametrizadas; ninguna toca tablas propias del Dashboard (solo `vs*` o las tablas base ya usadas en otros módulos)
- [ ] Tests: Admin con datos mixtos (verificar cada KPI), Admin sin datos (ceros), Residente con cuota vencida, Residente al corriente

---



### Ticket 15 — TKT-BE-015: Consultar mis tickets (residente)


| Campo             | Valor                                |
| ----------------- | ------------------------------------ |
| **ID**            | TKT-BE-015                           |
| **Dominio**       | Tickets                              |
| **Tipo**          | Backend + API                        |
| **Historia(s)**   | HU-TKT-02                            |
| **Estimación**    | 5 h                                  |
| **Prioridad**     | Must-have                            |
| **Bloqueado por** | TKT-BE-001 (service base de tickets) |


**Descripción**
Exponer `GET /TKT/Tickets/mis` para el residente autenticado, con filtros opcionales por `estadoTicketId`, `categoriaTicketId` y paginación. La consulta usa `tkt.vsTickets` filtrada por `UsuarioSolicitanteID` (solicitante del ticket, no el usuario de auditoría). Incluye también los catálogos de solo lectura que consumen la web (FE-031) y el bot (TKT-BOT-003): `GET /TKT/CategoriasTicket` y `GET /TKT/EstadosTickets`.

**Criterios de aceptación técnicos**

- [ ] `GET /TKT/Tickets/mis` extrae `UsuarioID` del claim `sub`
- [ ] Acepta query params: `?estadoTicketId=2&categoriaTicketId=1&pagina=1&tamano=20` (IDs de catálogo `tkt.EstadosTickets` / `tkt.CategoriasTicket`)
- [ ] Consulta `SELECT ... FROM tkt.vsTickets WHERE UsuarioSolicitanteID = @uid AND bEliminado = 0 ORDER BY FechaCreacionTicket DESC OFFSET @offset ROWS FETCH NEXT @size ROWS ONLY`
- [ ] Retorna `200 OK` con `{ total, pagina, items: [{ ticketId, titulo, estado, prioridad, categoria, fechaCreacion }] }`
- [ ] Si el residente no tiene tickets retorna `200 OK` con `items: []`
- [ ] `GET /TKT/CategoriasTicket` y `GET /TKT/EstadosTickets` (`[Authorize]`, cualquier perfil) retornan `200 OK` con `[{ id, nombre }]` de los registros con `bEliminado = 0`, ordenados por nombre
- [ ] Test unitario: `GetMisTicketsAsync_ReturnsOnlyOwnTickets`

```csharp
[HttpGet("mis")]
[Authorize]
public async Task<IActionResult> GetMisTickets([FromQuery] TicketFiltroDto filtro)
{
    var uid = int.Parse(User.FindFirst("sub")!.Value);
    var resultado = await _ticketService.GetMisTicketsAsync(uid, filtro);
    return Ok(resultado);
}
```

---



### Ticket 16 — TKT-BE-016: Gestión de tickets por Administrador


| Campo             | Valor         |
| ----------------- | ------------- |
| **ID**            | TKT-BE-016    |
| **Dominio**       | Tickets       |
| **Tipo**          | Backend + API |
| **Historia(s)**   | HU-TKT-03     |
| **Estimación**    | 8 h           |
| **Prioridad**     | Must-have     |
| **Bloqueado por** | TKT-BE-015    |


**Descripción**
Endpoints de administración: listar tickets del condominio (`GET /TKT/Tickets`), cambiar estado (`PATCH /TKT/Tickets/{ticketID}/estado/{estadoId}`) y asignar personal (`POST /TKT/TicketsUsuariosAsignados`). Solo perfiles con `bAdministrador = 1`. Al pasar a **Resuelto** se setea `FechaCierre`; cada cambio de estado puede dejar traza en `tkt.ComentariosTicket` (comentario de sistema).

**Criterios de aceptación técnicos**

- [ ] `GET /TKT/Tickets` filtra por `condominioId` del JWT (vía `tkt.Tickets.CasaID → sgr.Casas.CondominioID`) y acepta `?estadoTicketId=&prioridadTicketId=&pagina=&tamano=`
- [ ] `PATCH /TKT/Tickets/{ticketID}/estado/{estadoId}` valida el catálogo y la **máquina de estados de §3.2** (`422 INVALID_TRANSITION` si no aplica); al pasar a Resuelto registra `FechaCierre`, al reabrir la limpia; inserta comentario de sistema (`EsInterno = 1`) y notifica al solicitante — todo en una transacción
- [ ] Política `AdminOAsignado` en el `PATCH`: el Administrador o el trabajador asignado al ticket (solo transiciones Nuevo → En seguimiento → Resuelto); asignar y listar todo sigue siendo `SoloAdministrador`
- [ ] `POST /TKT/TicketsUsuariosAsignados` crea la fila N:M (`TicketID`, `UsuarioID` del técnico, `Terminado=0`) y notifica al asignado vía `ntf.Notificaciones`
- [ ] Los `PATCH`/`POST` de administración retornan `204 No Content` o `201 Created` según corresponda
- [ ] `[Authorize(Policy = "SoloAdministrador")]` en listar y asignar; `AdminOAsignado` en cambio de estado; solo se puede asignar a usuarios activos con perfil Trabajador (`422` si no)
- [ ] Test: `CambiarEstadoAsync_ActualizaEstadoYFechaCierre` y `AsignarTicket_InsertaTicketsUsuariosAsignados`

```csharp
[HttpPatch("{ticketID}/estado/{estadoId}")]
[Authorize(Policy = "AdminOAsignado")]
public async Task<IActionResult> CambiarEstado(int ticketID, int estadoId)
{
    await _ticketService.CambiarEstadoAsync(ticketID, estadoId, GetUsuarioId());
    return NoContent();
}
```

---



### Ticket 17 — MAS-BE-017: Registrar y consultar mascotas


| Campo             | Valor                 |
| ----------------- | --------------------- |
| **ID**            | MAS-BE-017            |
| **Dominio**       | Mascotas              |
| **Tipo**          | Backend + API         |
| **Historia(s)**   | HU-MAS-01             |
| **Estimación**    | 5 h                   |
| **Prioridad**     | Must-have             |
| **Bloqueado por** | USR-BE-007 (JWT Auth) |


**Descripción**
CRUD básico de mascotas para residentes vía controlador `USR/Mascotas`. `POST /USR/Mascotas` registra en `usr.Mascotas` con catálogos `TipoMascotaID` y `RazaMascotaID` (o `RazaLibre` si no hay catálogo). `GET /USR/Mascotas` lista las del residente. `DELETE /USR/Mascotas/{id}` aplica soft-delete (`bEliminado = 1`).

**Criterios de aceptación técnicos**

- [ ] `POST /USR/Mascotas` valida con FluentValidation: `Nombre` requerido (max 100), `TipoMascotaID` requerido, `RazaMascotaID` o `RazaLibre` (al menos uno)
- [ ] Inserta en `usr.Mascotas` con `UsuarioID` del claim `sub` (sin columna `CasaID` en la tabla)
- [ ] `GET /USR/Mascotas` retorna solo mascotas del residente con `bEliminado = 0` (lectura desde `usr.vsMascotas` si aplica)
- [ ] `DELETE /USR/Mascotas/{id}` verifica que la mascota pertenece al residente antes de borrar
- [ ] Test: `RegistrarMascota_Valida_InsertaCorrectamente` y `EliminarMascota_AjenaNoPermitida`

```csharp
await conn.ExecuteAsync(@"
    INSERT INTO usr.Mascotas (UsuarioID, Nombre, TipoMascotaID, RazaMascotaID, RazaLibre,
        VacunasAlDia, FechaUltimaVacuna, Creado, UsuarioCreacionID, FechaCreacion, bEliminado)
    VALUES (@UsuarioID, @Nombre, @TipoMascotaID, @RazaMascotaID, @RazaLibre,
        @VacunasAlDia, @FechaUltimaVacuna, @ByCorreo, @By, SYSUTCDATETIME(), 0)",
    new { UsuarioID = usuario.UsuarioId, input.Nombre, input.TipoMascotaID, input.RazaMascotaID, input.RazaLibre,
          input.VacunasAlDia, input.FechaUltimaVacuna, ByCorreo = usuario.Correo, By = usuario.UsuarioId });
```

---



### Ticket 18 — VEH-BE-018: Registrar y consultar vehículos


| Campo             | Valor                 |
| ----------------- | --------------------- |
| **ID**            | VEH-BE-018            |
| **Dominio**       | Vehículos             |
| **Tipo**          | Backend + API         |
| **Historia(s)**   | HU-VEH-01             |
| **Estimación**    | 5 h                   |
| **Prioridad**     | Must-have             |
| **Bloqueado por** | USR-BE-007 (JWT Auth) |


**Descripción**
CRUD básico de vehículos para residentes vía `USR/Automoviles`. `POST /USR/Automoviles` registra en `usr.Automoviles` con `MarcaID`, `ModeloID` (catálogos) y `ModeloLibre` opcional. `GET /USR/Automoviles` lista los del residente. `DELETE /USR/Automoviles/{id}` aplica soft-delete. Campo de placa: `Placas` (normalizada).

**Criterios de aceptación técnicos**

- [ ] `POST /USR/Automoviles` valida: `Placas` requerida (max 50), `MarcaID` y `ModeloID` requeridos (o `ModeloLibre` si aplica), `Color` requerido
- [ ] `Placas` se normaliza: `dto.Placas.ToUpperInvariant().Replace(" ", "").Replace("-", "")`
- [ ] Unicidad por condominio: join `usr.Automoviles` → `sgr.Usuarios` → `sgr.CasaOcupantes` → `sgr.Casas` filtrando `Placas` y `CondominioID`; si existe → `409 Conflict`
- [ ] `GET /USR/Automoviles` retorna solo vehículos del residente con `bEliminado = 0`
- [ ] `DELETE /USR/Automoviles/{id}` verifica propiedad antes del soft-delete
- [ ] Test: `RegistrarAutomovil_PlacaDuplicada_Retorna409` y `NormalizaPlacasAntesDePersistir`

```csharp
request.Placas = request.Placas.ToUpperInvariant().Replace(" ", "").Replace("-", "");
var existe = await conn.QuerySingleAsync<int>(@"
    SELECT COUNT(*) FROM usr.Automoviles a
    INNER JOIN sgr.Usuarios u ON u.UsuarioID = a.UsuarioID
    INNER JOIN sgr.CasaOcupantes co ON co.UsuarioID = u.UsuarioID AND co.bEliminado = 0
    INNER JOIN sgr.Casas c ON c.CasaID = co.CasaID
    WHERE a.Placas = @p AND c.CondominioID = @cond AND a.bEliminado = 0",
    new { p = request.Placas, cond = condominioId });
if (existe > 0) throw new ConflictException("Las placas ya están registradas en este condominio");
```

---



### Ticket 19 — BOT-BE-019: Consultar estado de cuenta desde Telegram


| Campo             | Valor                                                            |
| ----------------- | ---------------------------------------------------------------- |
| **ID**            | BOT-BE-019                                                       |
| **Dominio**       | Bot Telegram                                                     |
| **Tipo**          | Bot                                                              |
| **Historia(s)**   | HU-BOT-03                                                        |
| **Estimación**    | 4 h                                                              |
| **Prioridad**     | Must-have                                                        |
| **Bloqueado por** | BOT-BE-004 (vinculación y sesión), FNZ-BE-010 (estado de cuenta) |


**Descripción**
Comando `/cuotas`. El bot obtiene el JWT del chat, llama al **mismo endpoint REST que la web** (`GET /FNZ/Cuotas/mis`) y responde con las últimas cuotas y el total vencido. El bot no consulta la BD ni instancia servicios del backend.

**Criterios de aceptación técnicos**

- [ ] `CommandHandler("cuotas", ...)` registrado en `bot/handlers/cuotas.py`
- [ ] Sin vínculo (sesión 404) → "Tu cuenta no está vinculada. Genera tu enlace en el portal → Perfil → Vincular Telegram."
- [ ] Muestra las últimas 3 cuotas (período, monto, estado Pagada/Pendiente/Vencida) y, si `totalVencido > 0`, lo destaca con botón "¿Cómo pago?"
- [ ] Mensaje con `ParseMode.HTML` escapando datos con `html.escape` (evita errores de formato con caracteres especiales)
- [ ] Montos en MXN con separador de miles
- [ ] Tests (pytest + `respx`): vinculado con vencidas, al corriente, sin vínculo, API caída

```python
# bot/handlers/cuotas.py
import html
from telegram import Update
from telegram.constants import ParseMode
from telegram.ext import ContextTypes

async def cmd_cuotas(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    api = context.bot_data["api"]
    chat_id = update.effective_chat.id
    if not await api.sesion(chat_id):
        await update.effective_message.reply_text(
            "Tu cuenta no está vinculada. Genera tu enlace en el portal → Perfil → Vincular Telegram.")
        return
    estado = await api.get(chat_id, "/FNZ/Cuotas/mis")
    lineas = ["💰 <b>Estado de cuenta</b>"]
    for c in estado["cuotas"][:3]:
        lineas.append(f"• {html.escape(c['periodo'])} — ${c['monto']:,.2f} MXN — {html.escape(c['estado'])}")
    if estado["totalVencido"] > 0:
        lineas.append(f"\n⚠️ Vencido: <b>${estado['totalVencido']:,.2f} MXN</b>")
    await update.effective_message.reply_text("\n".join(lineas), parse_mode=ParseMode.HTML)
```

---



### Ticket 20 — BOT-BE-020: Notificaciones proactivas push a Telegram


| Campo             | Valor                                                                                   |
| ----------------- | --------------------------------------------------------------------------------------- |
| **ID**            | BOT-BE-020                                                                              |
| **Dominio**       | Notificaciones / Bot Telegram                                                           |
| **Tipo**          | Backend (Worker)                                                                        |
| **Historia(s)**   | HU-BOT-04                                                                               |
| **Estimación**    | 8 h                                                                                     |
| **Prioridad**     | Must-have                                                                               |
| **Bloqueado por** | NTF-BE-013 (`INotificacionService` crea las filas de entrega), BOT-BE-004 (vinculación) |


**Descripción**
`BackgroundService` (`TelegramNotificadorWorker`) en el **backend** que procesa el *outbox* `ntf.NotificacionesEntrega` (ADR-009): toma entregas `PENDIENTE` —o `FALLIDA` con `Reintentos < 3`— del canal TELEGRAM, las envía con la Telegram Bot API (`Telegram.Bot`, token en `Telegram:BotToken`) y marca el resultado. El bot Python no participa en el envío.

**Criterios de aceptación técnicos**

- [ ] `TelegramNotificadorWorker : BackgroundService` registrado con `AddHostedService`; intervalo configurable (default 30 s)
- [ ] Selección en lotes de 50 con `WITH (UPDLOCK, READPAST, ROWLOCK)` para que dos instancias no envíen la misma entrega
- [ ] `ChatId` desde `bot.CuentasTelegram WHERE UsuarioID = @uid AND Activo = 1`; si no existe → `FALLIDA`, `MotivoError = 'SIN_VINCULO'`, sin reintento
- [ ] Envío con `ParseMode.Html` y texto escapado
- [ ] Éxito → `Estado = 'ENVIADA'`, `FechaEnvio = SYSUTCDATETIME()`
- [ ] Error transitorio (429/5xx/timeout) → `Estado = 'FALLIDA'`, `Reintentos += 1`, `MotivoError`; reintento con espera exponencial (1, 5, 15 min); tras 3 intentos queda `FALLIDA` definitiva
- [ ] Error permanente (chat bloqueado / `403`) → `FALLIDA` definitiva y vínculo `Activo = 0`
- [ ] El índice único `(NotificacionID, CanalID)` impide encolar dos veces la misma notificación
- [ ] Tests: pendiente → enviada, reintento tras 5xx, chat bloqueado desactiva vínculo, sin vínculo

```csharp
protected override async Task ExecuteAsync(CancellationToken stoppingToken)
{
    while (!stoppingToken.IsCancellationRequested)
    {
        var lote = await _entregas.TomarLotePendienteAsync(canal: "TELEGRAM", tamano: 50, stoppingToken);
        foreach (var e in lote)
        {
            try
            {
                await _botClient.SendMessage(e.ChatId, HtmlEscape(e.Mensaje), parseMode: ParseMode.Html,
                                             cancellationToken: stoppingToken);
                await _entregas.MarcarEnviadaAsync(e.NotificacionEntregaID);
            }
            catch (ApiRequestException ex) when (ex.ErrorCode == 403)
            {
                await _entregas.MarcarFallidaDefinitivaAsync(e.NotificacionEntregaID, "CHAT_BLOQUEADO");
                await _vinculos.DesactivarAsync(e.UsuarioID);
            }
            catch (Exception ex) when (ex is ApiRequestException or HttpRequestException or TaskCanceledException)
            {
                _logger.LogWarning(ex, "Entrega {EntregaId} falló (intento {Intento})", e.NotificacionEntregaID, e.Reintentos + 1);
                await _entregas.MarcarFallidaAsync(e.NotificacionEntregaID, ex.Message);
            }
        }
        await Task.Delay(_opciones.Intervalo, stoppingToken);
    }
}
```

---



### Ticket 21 — BOT-BE-021: Trabajador — próxima tarea y evidencia desde Telegram


| Campo             | Valor                                                                                          |
| ----------------- | ---------------------------------------------------------------------------------------------- |
| **ID**            | BOT-BE-021                                                                                     |
| **Dominio**       | Bot Telegram / Tickets                                                                         |
| **Tipo**          | Bot + Backend                                                                                  |
| **Historia(s)**   | HU-BOT-10                                                                                      |
| **Estimación**    | 8 h                                                                                            |
| **Prioridad**     | Must-have                                                                                      |
| **Bloqueado por** | BOT-BE-004, TKT-BE-016 (transiciones + política `AdminOAsignado`), ARC-BE-028 (`IFileStorage`) |


**Descripción**
Flujo para el perfil **Trabajador**: `/tarea` muestra el ticket asignado más prioritario (`GET /TKT/Tickets/asignados?terminado=false`), botón "▶️ Comenzar" (→ En seguimiento) y, al terminar, el trabajador envía una foto que se sube con `POST /TKT/Tickets/{id}/Documentos`; el ticket pasa a **Resuelto**, se notifica al residente y el bot ofrece la siguiente tarea.

**Criterios de aceptación técnicos**

- [ ] Backend: `GET /TKT/Tickets/asignados` (perfil Trabajador) desde `tkt.vsTicketsUsuariosAsignados`, filtrado por `UsuarioID = sub` y `Terminado = 0`, orden `OrdenPrioridad DESC, FechaCreacionTicket ASC`
- [ ] Backend: `POST /TKT/Tickets/{id}/Documentos` (multipart; solicitante, asignado o admin) guarda en `IFileStorage`, inserta `arc.Archivos` + `tkt.DocumentosTicket` en una transacción; valida tipo y ≤ 5 MB
- [ ] Bot: `/tarea` muestra unidad (casa), categoría y descripción — solo lo mínimo
- [ ] "▶️ Comenzar" → `PATCH /TKT/Tickets/{id}/estado/{EnSeguimiento}`; foto recibida → sube evidencia y `PATCH` a Resuelto; marca `Terminado = 1` en la asignación
- [ ] El estado del flujo vive en `context.user_data` del `ConversationHandler` (no en un diccionario global)
- [ ] Un usuario sin perfil Trabajador que usa `/tarea` → "Este comando es para personal de mantenimiento."
- [ ] Tests: sin tareas, flujo completo con foto, archivo demasiado grande, perfil incorrecto

```python
# bot/handlers/tarea.py
async def cmd_tarea(update: Update, context: ContextTypes.DEFAULT_TYPE) -> int:
    api = context.bot_data["api"]
    chat_id = update.effective_chat.id
    tareas = await api.get(chat_id, "/TKT/Tickets/asignados", params={"terminado": "false"})
    if not tareas:
        await update.effective_message.reply_text("No tienes tareas pendientes. 🎉")
        return ConversationHandler.END
    t = tareas[0]
    context.user_data["ticket_id"] = t["ticketId"]
    texto = f"🔧 Ticket #{t['ticketId']} · {t['casa']} · {t['categoria']}\n{t['descripcion']}"
    botones = InlineKeyboardMarkup([[InlineKeyboardButton("▶️ Comenzar", callback_data="comenzar")]])
    await update.effective_message.reply_text(texto, reply_markup=botones)
    return EN_CURSO
```

---



### Ticket 22 — BOT-BE-022: Levantar ticket en segundos desde el bot


| Campo             | Valor                               |
| ----------------- | ----------------------------------- |
| **ID**            | BOT-BE-022                          |
| **Dominio**       | Bot Telegram                        |
| **Tipo**          | Bot                                 |
| **Historia(s)**   | HU-BOT-11                           |
| **Estimación**    | 4 h                                 |
| **Prioridad**     | Must-have                           |
| **Bloqueado por** | TKT-BOT-003 (flujo base de reporte) |


**Descripción**
Atajo sobre el flujo de TKT-BOT-003: botón «📝 Reportar» fijo en el menú principal (`/inicio`) y comando `/reportar` que entran directo al paso de categoría; la descripción puede ir acompañada de una **foto opcional** que se adjunta al ticket recién creado.

**Criterios de aceptación técnicos**

- [ ] `/reportar` y el botón «📝 Reportar» reutilizan los estados del `ConversationHandler` de TKT-BOT-003 (sin duplicar código)
- [ ] Las 6 categorías del catálogo se muestran en 2 filas de 3 botones
- [ ] Si el usuario envía foto con pie de foto, el pie es la descripción y la foto se sube con `POST /TKT/Tickets/{id}/Documentos` después de crear el ticket
- [ ] Unidad, solicitante y canal se infieren (JWT + `canal: "TELEGRAM"`); el bot no pregunta nada más
- [ ] Máximo 3 interacciones del usuario de principio a fin (categoría → descripción/foto → confirmar)
- [ ] Tests: con foto, sin foto, descripción demasiado larga pide reintento

---



### Ticket 23 — BI-BE-023: Tablero BI con tendencias y KPIs


| Campo             | Valor                                                                       |
| ----------------- | --------------------------------------------------------------------------- |
| **ID**            | BI-BE-023                                                                   |
| **Dominio**       | Business Intelligence                                                       |
| **Tipo**          | Backend + API + Frontend                                                    |
| **Historia(s)**   | HU-BI-01                                                                    |
| **Estimación**    | 13 h                                                                        |
| **Prioridad**     | Must-have                                                                   |
| **Bloqueado por** | DASH-BE-014 (KPIs base), FNZ-BE-012 (morosos), TKT-BE-016 (gestión tickets) |


**Descripción**
Módulo BI completo para el Administrador: `IBiService.GetKpiTendenciasAsync(condominioId, meses)` consulta `bi.KpiSnapshots` para los últimos N meses. `BiSnapshotWorker` persiste KPIs una vez al día (00:05 `America/Mexico_City`) y al arrancar si falta el del día. `GET /Reports/Bi/tendencias?meses=6` expone los datos. Frontend React renderiza 3 gráficas Chart.js con exportación a PNG.

**Criterios de aceptación técnicos**

- [ ] `bi.KpiSnapshots` (con columnas agregadas en DB-001) contiene: `SnapshotID`, `CondominioID`, `Fecha DATE`, `TicketsAbiertos`, `TicketsCerrados`, `TiempoMedioResolucionHoras`, `IngresosMXN`, `EgresosMXN`, `ResidentesMorosos`, `CasasTotales`, `CasasOcupadas`, `TicketsWeb`, `TicketsTelegram`, `FechaCreacion` — cubre todos los KPI de HU-BI-01
- [ ] `BiSnapshotWorker : BackgroundService` ejecuta al iniciar si no existe snapshot del día y cada 24h
- [ ] `GET /Reports/Bi/tendencias?meses=6` retorna array de snapshots ordenado por `Fecha ASC`, protegido por `SoloAdministrador`
- [ ] Frontend renderiza 4 gráficas (Chart.js): "Tickets y tiempo de resolución", "Flujo financiero MXN", "Morosidad % (morosos / casas ocupadas)", "Adopción del bot (web vs Telegram)"
- [ ] Cada gráfica permite exportar a PNG
- [ ] Test: `GetKpiTendencias_RetornaUltimosNMeses` y `BiSnapshotWorker_NoCreaSnapshotDuplicado`

```csharp
var hoy = DateOnly.FromDateTime(DateTime.UtcNow);
var existente = await conn.QuerySingleAsync<int>(
    "SELECT COUNT(*) FROM bi.KpiSnapshots WHERE CondominioID = @c AND Fecha = @f AND bEliminado = 0",
    new { c = condominioId, f = hoy });
if (existente == 0)
{
    var kpi = await _biService.CalcularKpiAsync(condominioId, hoy);
    await conn.ExecuteAsync(
        @"INSERT INTO bi.KpiSnapshots
          (CondominioID, Fecha, TicketsAbiertos, TicketsCerrados, TiempoMedioResolucionHoras,
           IngresosMXN, EgresosMXN, ResidentesMorosos, CasasTotales, CasasOcupadas, TicketsWeb, TicketsTelegram,
           Creado, UsuarioCreacionID, FechaCreacion, bEliminado)
          VALUES (@CondominioID, @Fecha, @TicketsAbiertos, @TicketsCerrados, @TiempoMedioResolucionHoras,
           @IngresosMXN, @EgresosMXN, @ResidentesMorosos, @CasasTotales, @CasasOcupadas, @TicketsWeb, @TicketsTelegram,
           N'sistema', 0, SYSUTCDATETIME(), 0)",
        kpi);   // UsuarioCreacionID = 0 → proceso del sistema
}
```

---



### Ticket 24 — ENC-BE-024: Encuestas (participar y administrar)


| Campo             | Valor         |
| ----------------- | ------------- |
| **ID**            | ENC-BE-024    |
| **Dominio**       | Encuestas     |
| **Tipo**          | Backend + API |
| **Historia(s)**   | HU-ENC-01..03 |
| **Estimación**    | 8 h           |
| **Prioridad**     | Should-have   |
| **Bloqueado por** | USR-BE-007    |


**Descripción**
CRUD y flujos sobre `enc.Encuestas`, `enc.Preguntas`, `enc.OpcionesPregunta`, `enc.Respuestas`: residente responde encuesta activa; Admin crea/publica y consulta resultados agregados. Lecturas vía Dapper; sin SPs.

**Criterios de aceptación técnicos (stub Entrega 2)**

- [ ] `GET /ENC/Encuestas/activas` — encuestas abiertas para el condominio del JWT
- [ ] `POST /ENC/Respuestas` — una respuesta por pregunta/opción; valida que la encuesta siga abierta
- [ ] `POST /ENC/Encuestas` + publicación — solo Admin; seeds de `enc.TiposPregunta`
- [ ] `GET /ENC/Encuestas/{id}/resultados` — agregación por opción (Admin)
- [ ] Tests: residente responde; intento doble en encuesta cerrada → 422

---



### Ticket 25 — JNT-BE-025: Juntas (convocatorias y acuerdos)


| Campo             | Valor                                        |
| ----------------- | -------------------------------------------- |
| **ID**            | JNT-BE-025                                   |
| **Dominio**       | Juntas                                       |
| **Tipo**          | Backend + API                                |
| **Historia(s)**   | HU-JNT-01..02                                |
| **Estimación**    | 5 h                                          |
| **Prioridad**     | Should-have                                  |
| **Bloqueado por** | USR-BE-007, ARC-BE-028 (adjuntos opcionales) |


**Descripción**
Listar juntas publicadas (`jnt.Juntas`, `jnt.JuntaDetalle`); Admin publica convocatoria con detalle y archivos ligados (`jnt.JuntaDetalleArchivos` → `arc.Archivos`).

**Criterios de aceptación técnicos (stub Entrega 2)**

- [ ] `GET /JNT/Juntas` — residente ve convocatorias del condominio; orden por fecha descendente
- [ ] `POST /JNT/Juntas` — Admin; crea junta + detalle en transacción
- [ ] Adjuntos opcionales vía IDs de `arc.Archivos` ya subidos
- [ ] Tests: listado vacío; publicación Admin

---



### Ticket 26 — VTS-BE-026: Visitas, pases y reservas de áreas comunes


| Campo             | Valor                    |
| ----------------- | ------------------------ |
| **ID**            | VTS-BE-026               |
| **Dominio**       | Visitas y áreas comunes  |
| **Tipo**          | Backend + API            |
| **Historia(s)**   | HU-VTS-01..03, HU-BOT-08 |
| **Estimación**    | 8 h                      |
| **Prioridad**     | Should-have              |
| **Bloqueado por** | USR-BE-007               |


**Descripción**
Registro de visitantes (`vts.Visitas`, `vts.VisitasGeneradas`), reservas (`vts.ReservacionesArea` + `vts.vsReservacionesArea`), bitácora de accesos. Validar solapamiento de horario en reservas.

**Criterios de aceptación técnicos (stub Entrega 2)**

- [ ] `POST /VTS/Visitas` — Guardia; asocia visita a casa
- [ ] `POST /VTS/ReservacionesArea` — residente; rechaza horario ocupado con 409
- [ ] `GET /VTS/Visitas` — Admin; filtros por fecha y casa
- [ ] Tests: reserva solapada; visita registrada

---



### Ticket 27 — ANM-BE-027: Anuncios y comunicados


| Campo             | Valor                    |
| ----------------- | ------------------------ |
| **ID**            | ANM-BE-027               |
| **Dominio**       | Anuncios                 |
| **Tipo**          | Backend + API            |
| **Historia(s)**   | HU-ANM-01..02, HU-BOT-12 |
| **Estimación**    | 5 h                      |
| **Prioridad**     | Should-have              |
| **Bloqueado por** | USR-BE-007               |


**Descripción**
Bandeja de anuncios para residentes (`anm.vsAnuncios`); Admin publica con tipo (`anm.TiposAnuncio`); bitácora `anm.LogVisualizacionAnuncios`.

**Criterios de aceptación técnicos (stub Entrega 2)**

- [ ] `GET /ANM/Anuncios` — lista activos del condominio
- [ ] `POST /ANM/Anuncios` — Admin; notificación opcional vía `ntf.Notificaciones`
- [ ] `PATCH /ANM/Anuncios/{id}/visto` — marca visualización del residente
- [ ] Tests: publicación + listado residente

---



### Ticket 28 — ARC-BE-028: Archivos y documentos del fraccionamiento


| Campo             | Valor         |
| ----------------- | ------------- |
| **ID**            | ARC-BE-028    |
| **Dominio**       | Archivos      |
| **Tipo**          | Backend + API |
| **Historia(s)**   | HU-ARC-01..02 |
| **Estimación**    | 5 h           |
| **Prioridad**     | Should-have   |
| **Bloqueado por** | USR-BE-007    |


**Descripción**
Subida/descarga de documentos (`arc.Archivos`, `arc.TiposArchivo`); Admin gestiona; residente descarga; log en `arc.LogVisualizacionArchivos`.

**Criterios de aceptación técnicos (stub Entrega 2)**

- [ ] `GET /ARC/Archivos` — lista por tipo/condominio
- [ ] `POST /ARC/Archivos` — Admin; metadatos + almacenamiento (blob/ruta `(asumido)`)
- [ ] `GET /ARC/Archivos/{id}/descargar` — stream con auth
- [ ] Tests: descarga autorizada; 403 sin permiso

---



### Ticket 29 — WMS-BE-029: Almacén (inventario y préstamos)


| Campo             | Valor                         |
| ----------------- | ----------------------------- |
| **ID**            | WMS-BE-029                    |
| **Dominio**       | Almacén (extensión `wms`)     |
| **Tipo**          | Backend + API + SQL extensión |
| **Historia(s)**   | HU-WMS-01..03                 |
| **Estimación**    | 8 h                           |
| **Prioridad**     | Could-have                    |
| **Bloqueado por** | Esquema `wms` + USR-BE-007    |


**Descripción**
Inventario `wms.Articulos` y préstamos `wms.Prestamos`; stock no negativo; devolución restablece existencias. Depende del esquema `wms` documental.

**Criterios de aceptación técnicos (stub Entrega 2)**

- [ ] `GET /WMS/Articulos` — Admin; destaca bajo mínimo
- [ ] `POST /WMS/Prestamos` — Admin; baja stock en transacción
- [ ] `PATCH /WMS/Prestamos/{id}/devolver` — restablece stock
- [ ] Tests: préstamo deja stock en cero; devolución suma

---



### Ticket 30 — FE-030: Frontend — login y sesión JWT


| Campo             | Valor                      |
| ----------------- | -------------------------- |
| **ID**            | FE-030                     |
| **Dominio**       | USR / SGR                  |
| **Tipo**          | Frontend (React 18 + Vite) |
| **Historia(s)**   | HU-USR-01                  |
| **Estimación**    | 5 h                        |
| **Prioridad**     | Must-have                  |
| **Bloqueado por** | USR-BE-007                 |


**Descripción**
Pantalla de login: `POST /SGR/AuthService/GenerateToken`; access token **en memoria** (contexto de auth) y refresh en cookie `HttpOnly` (§2.5, nunca `localStorage`); Apollo y `fetch` con `Authorization`; ante `401` intenta una vez `RefreshToken` y, si falla, redirige a `/login`; si `requiereCambioPassword` → `/cambiar-password` (USR-BE-036).

**Criterios de aceptación técnicos (stub Entrega 2)**

- [ ] Formulario con validación Zod antes de enviar; mensaje genérico en 401 y "Demasiados intentos" en 429
- [ ] Estados carga / error / credenciales inválidas
- [ ] Ruta protegida redirige a `/login` si no hay token
- [ ] `tsc --noEmit` y `vite build` sin errores

---



### Ticket 31 — FE-031: Frontend — mis tickets (listar y crear)


| Campo             | Valor                          |
| ----------------- | ------------------------------ |
| **ID**            | FE-031                         |
| **Dominio**       | TKT                            |
| **Tipo**          | Frontend                       |
| **Historia(s)**   | HU-TKT-01, HU-TKT-02           |
| **Estimación**    | 8 h                            |
| **Prioridad**     | Must-have                      |
| **Bloqueado por** | FE-030, TKT-BE-002, TKT-BE-015 |


**Descripción**
Vistas residente: listado `GET /TKT/Tickets/mis` con filtros; formulario crear ticket con la mutation `crearTicket` (GraphQL, §4 Endpoint 2) — categoría, título, descripción, prioridad; empty state. Adjuntos en Fase 2.

**Criterios de aceptación técnicos (stub Entrega 2)**

- [ ] Listado ordenado; filtro por estado
- [ ] Crear ticket con validación (categoría requerida, título ≤ 200); botón deshabilitado mientras la petición está en curso (sin doble envío)
- [ ] Empty state "No has reportado incidencias aún."
- [ ] Tests de componente o E2E mínimo en login+tickets `(Entrega Final)`

---



### Ticket 32 — FE-032: Frontend — estado de cuenta y cuotas


| Campo             | Valor              |
| ----------------- | ------------------ |
| **ID**            | FE-032             |
| **Dominio**       | FNZ                |
| **Tipo**          | Frontend           |
| **Historia(s)**   | HU-FNZ-01          |
| **Estimación**    | 5 h                |
| **Prioridad**     | Must-have          |
| **Bloqueado por** | FE-030, FNZ-BE-010 |


**Descripción**
Pantalla "Mi estado de cuenta": tabla de cuotas del residente; resalta vencidas; totales adeudados; consume endpoint de FNZ-BE-010.

**Criterios de aceptación técnicos (stub Entrega 2)**

- [ ] Tabla período / monto / vencimiento / estado
- [ ] Destacar filas vencidas (`Pagado=0` y vencimiento anterior a hoy)
- [ ] Empty state si no hay cuotas
- [ ] Responsive básico (Tailwind)

---



### Ticket 33 — SETUP-000: Scaffolds API + Web + CI


| Campo             | Valor                                  |
| ----------------- | -------------------------------------- |
| **ID**            | SETUP-000                              |
| **Dominio**       | Transversal                            |
| **Tipo**          | Infraestructura / scaffolding          |
| **Historia(s)**   | Habilitador del núcleo §5.0            |
| **Estimación**    | 5 h                                    |
| **Prioridad**     | Must-have (primer ticket de Entrega 2) |
| **Bloqueado por** | —                                      |


**Descripción**
Crear `GraphApi/` (.NET 9), `GraphApi.Tests/` y `Web/` (Vite + React 18 + TS) con la configuración transversal que todos los tickets asumen, y el pipeline de CI.

**Criterios de aceptación técnicos**

- [ ] `GraphApi`: `Program.cs` con autenticación JWT (`RoleClaimType = "perfil"`), políticas `SoloAdministrador` y `AdminOAsignado`, CORS por configuración, Serilog + `CorrelationId`, `ProblemDetails` global, rate limiter `login`, Swagger en desarrollo, HotChocolate en `/graphql`, `/health` con chequeo de BD
- [ ] `IDbConnectionFactory`, `UsuarioActual` (desde claims), `Result<T>` y mapeo `Result` → HTTP (`FORBIDDEN`→403, `NOT_FOUND`→404, `CONFLICT`→409, `VALIDATION_ERROR`→400/422)
- [ ] `GraphApi.Tests`: xUnit + Moq + `WebApplicationFactory`; Testcontainers SQL Server aplicando `SQL/cuartaquinientos_schema.sql` + DB-001 + DB-002
- [ ] `Web`: Vite + TS estricto, Tailwind con tokens del §1.3, Apollo Client, React Router con `PrivateRoute`, Vitest + Testing Library, ESLint
- [ ] `.github/workflows/ci.yml`: build + test de API, lint + test + build de Web, `pytest` del Bot; corre en cada PR
- [ ] `.editorconfig` desde `sdd-toolkit/setup/editorconfig`
- [ ] `dotnet run`, `npm run dev` y `python -m bot.main` arrancan siguiendo §1.4 sin pasos adicionales

---



### Ticket 34 — DB-001: Alinear el esquema físico al modelo del readme


| Campo             | Valor                 |
| ----------------- | --------------------- |
| **ID**            | DB-001                |
| **Dominio**       | Transversal (SQL)     |
| **Tipo**          | Base de datos         |
| **Historia(s)**   | Habilitador (ADR-008) |
| **Estimación**    | 4 h                   |
| **Prioridad**     | Must-have             |
| **Bloqueado por** | DB-000                |


**Descripción**
Script `SQL/DB-001_alineacion_modelo.sql` que aplica **todas** las filas del diccionario lógico ↔ físico de §3.2 (renombres con `sp_rename`, columnas nuevas, FK e índices) y recrea con `CREATE OR ALTER VIEW` las vistas `vs`* que referencian columnas renombradas (incluidas `sgr.vsCasas` y `vts.vsReservacionesArea`). Además redefine las vistas de lectura que consumen los tickets de backend:

- `tkt.vsTickets`**:** agrega `CategoriaTicketID` + `Categoria` (`LEFT JOIN tkt.CategoriasTicket`), `CanalID` + `Canal` (`LEFT JOIN tkt.CanalesTicket`) y `CasaID` (columnas `NULL` en tickets previos a la extensión).
- `sgr.vsUsuarios`**:** agrega la unidad del usuario — `CasaID`, `Numero`, `CondominioID` y `Condominio` (= `sgr.Condominios.Nombre`) — vía `sgr.CasaOcupantes` vigente (`Vigente = 1`, `bEliminado = 0`) → `sgr.Casas` → `sgr.Condominios`, con `LEFT JOIN`/`OUTER APPLY` (una fila por usuario; usuarios sin casa también aparecen). **No** expone `PasswordHash` (hoy expone `PasswordUsuario`); el login lee el hash directamente de `sgr.Usuarios`.
- `tkt.vsTicketsUsuariosAsignados`**:** agrega `PrioridadTicketID`, `PrioridadTicket`, `EstadoTicket`, `CategoriaTicketID`, `CasaID` y `FechaCreacionTicket` y `OrdenPrioridad` (= `tkt.PrioridadesTicket.Orden`) para ordenar "prioridad desc + fecha asc" (BOT-BE-021): `ORDER BY OrdenPrioridad DESC, FechaCreacionTicket ASC`. Nunca se ordena por `PrioridadTicketID`.
- `tkt.PrioridadesTicket`**:** agrega `Orden TINYINT NULL`, puebla por nombre las filas existentes (Baja=1, Media=2, Alta=3, Crítica=4) y crea el índice único filtrado `(Orden) WHERE bEliminado = 0 AND Orden IS NOT NULL`. DB-002 siembra el mismo `Orden` en su `MERGE`; DB-002 no altera el esquema.
- `vts.VisitasGeneradas`**:** elimina `Column_20` y `Column_21` (basura del modelador) solo si no contienen datos; si alguna fila tiene valor, el script aborta con mensaje y no borra.
- `sgr.Usuarios`**:** antes de crear el índice único filtrado sobre `Correo`, elimina el `UNIQUE` heredado sobre el correo (`UQ__Usuarios__60695A19B63DE1D0`; se localiza por `sys.key_constraints` + `sys.index_columns`, no por nombre fijo); si se conservara, un correo dado de baja (`bEliminado = 1`) impediría reutilizarlo.
- `fnz.Cuotas`**:** índice único `(CasaID, PeriodoInicio) WHERE bEliminado = 0 AND CasaID IS NOT NULL` — respalda la idempotencia de HU-FNZ-06 (§3.2).

**Criterios de aceptación técnicos**

- [ ] Idempotente: cada renombre se protege con `IF COL_LENGTH('<tabla>', '<columna_vieja>') IS NOT NULL`; cada columna nueva con `IF COL_LENGTH(...) IS NULL`
- [ ] Tras ejecutarlo, **ningún** nombre físico de la columna "Físico actual" del diccionario sigue existiendo (consulta de verificación sobre `sys.columns` incluida en la suite). **Excepción:** `ntf.NotificacionesEntrega.CanalID` se conserva con el mismo nombre (solo se le agrega FK); la verificación la excluye
- [ ] `tkt.Tickets.FechaCreacion` se agrega `NOT NULL` con `DEFAULT SYSUTCDATETIME()`; índice único filtrado en `sgr.Usuarios(Correo) WHERE bEliminado = 0`; índice único `ntf.NotificacionesEntrega(NotificacionID, CanalID)`
- [ ] Renombres adicionales aplicados: `sgr.Condominios.NombreCondominio`→`Nombre`, `DireccionCondominio`→`Direccion`; `tkt.CategoriasTicket.CategoriaTicket`→`Categoria`; `vts.AreasComunes.AreasComunesID`→`AreaID`, `AreasComunes`→`Nombre`; `vts.ReservacionesArea.AreasComunesID`→`AreaID` (la FK `FK_vts_ReservacionesArea_1` sigue habilitada y apunta a `vts.AreasComunes(AreaID)`)
- [ ] `sgr.Usuarios` ya no tiene ningún `UNIQUE` constraint sobre `Correo`; existe solo el índice único filtrado. Caso de suite: dos usuarios con el mismo correo, uno con `bEliminado = 1` → se permite; ambos con `bEliminado = 0` → falla (error 2601)
- [ ] `fnz.Cuotas`: segunda cuota con el mismo `(CasaID, PeriodoInicio)` y `bEliminado = 0` falla (error 2601); con `bEliminado = 1` en la previa se permite
- [ ] `SELECT TOP 0 CategoriaTicketID, Categoria, CanalID, Canal, CasaID FROM tkt.vsTickets` compila; un ticket con `CategoriaTicketID`/`CanalID`/`CasaID` `NULL` sigue apareciendo en la vista
- [ ] `sgr.vsUsuarios` devuelve `CasaID`, `Numero`, `CondominioID` y `Condominio`; `COL_LENGTH('sgr.vsUsuarios', 'PasswordHash') IS NULL` y `COL_LENGTH('sgr.vsUsuarios', 'PasswordUsuario') IS NULL`; un usuario sin `CasaOcupantes` vigente aparece con columnas de casa `NULL` y sin duplicados
- [ ] `SELECT TOP 0 PrioridadTicketID, PrioridadTicket, OrdenPrioridad, FechaCreacionTicket FROM tkt.vsTicketsUsuariosAsignados` compila
- [ ] `COL_LENGTH('tkt.PrioridadesTicket', 'Orden') IS NOT NULL`; `COL_LENGTH('vts.VisitasGeneradas', 'Column_20') IS NULL` y `COL_LENGTH('vts.VisitasGeneradas', 'Column_21') IS NULL`
- [ ] Las 18 vistas compilan (`SELECT TOP 0` sobre cada una en la suite `SQL/pruebas/DB-001_PruebasIntegracion.sql`)
- [ ] Segunda ejecución sin errores ni cambios

---



### Ticket 35 — DB-002: Catálogos y administrador inicial


| Campo             | Valor                                          |
| ----------------- | ---------------------------------------------- |
| **ID**            | DB-002                                         |
| **Dominio**       | Transversal (SQL)                              |
| **Tipo**          | Base de datos (datos de referencia)            |
| **Historia(s)**   | Habilitador de HU-USR-01, HU-TKT-01, HU-FNZ-02 |
| **Estimación**    | 3 h                                            |
| **Prioridad**     | Must-have                                      |
| **Bloqueado por** | DB-001                                         |


**Descripción**
Script `SQL/DB-002_seeds_catalogos.sql` con `MERGE` idempotente de los catálogos que el código resuelve **por nombre**, más un condominio, un administrador inicial y datos de demostración **opcionales** (solo si se ejecuta con `-v Demo=1`). Sin datos personales reales: el correo y el hash del administrador llegan como variables `sqlcmd`.

**Criterios de aceptación técnicos**

- [ ] `sgr.Perfiles`: Administrador (`bAdministrador = 1`), Residente, Guardia, Trabajador
- [ ] `tkt.EstadosTickets` (Nuevo, En seguimiento, Resuelto, Cerrado), `tkt.PrioridadesTicket` (Baja `Orden=1`, Media `2`, Alta `3`, Crítica `4`), `tkt.CategoriasTicket` (Agua, Electricidad, Jardinería, Seguridad, Limpieza, Otro), `tkt.CanalesTicket` (WEB, TELEGRAM)
- [ ] `ntf.TiposNotificacion` (TICKET_NUEVO, TICKET_ESTADO, TICKET_ASIGNADO, PAGO_REGISTRADO, CUOTA_VENCIDA, ENCUESTA_PUBLICADA, JUNTA_CONVOCADA, RESERVA_CONFIRMADA, AVISO_GENERAL)
- [ ] `fnz.TiposMovimiento` ("Pago de cuota" `bAbono = 1`, "Gasto" `bCargo = 1`) y una cuenta `fnz.Cuentas` "Cuenta de mantenimiento"
- [ ] Administrador inicial con `bActualizarPassword = 1` a partir de `$(AdminCorreo)` y `$(AdminPasswordHash)`; el script falla si no se proporcionan
- [ ] Modo `Demo=1`: 10 casas, 6 residentes, 1 trabajador y cuotas de 3 meses con datos ficticios (dominio `@example.com`), para la demo y los E2E
- [ ] Segunda ejecución: 0 filas nuevas

---



### Ticket 36 — USR-BE-036: Cambio de contraseña (backend + frontend)


| Campo             | Valor              |
| ----------------- | ------------------ |
| **ID**            | USR-BE-036         |
| **Dominio**       | USR — Usuarios     |
| **Tipo**          | Backend + Frontend |
| **Historia(s)**   | HU-USR-03          |
| **Estimación**    | 3 h                |
| **Prioridad**     | Must-have          |
| **Bloqueado por** | USR-BE-007, FE-030 |


**Descripción**
`POST /SGR/AuthService/CambiarPassword` (JWT) y pantalla `/cambiar-password`, a la que FE-030 redirige cuando `requiereCambioPassword = true`.

**Criterios de aceptación técnicos**

- [ ] Verifica la contraseña actual con BCrypt; nueva ≥ 8 caracteres y distinta de la actual (FluentValidation + Zod)
- [ ] Actualiza `PasswordHash`, pone `bActualizarPassword = 0` y revoca los demás refresh tokens del usuario
- [ ] Mientras `requiereCambioPassword = true`, el frontend solo permite la ruta de cambio
- [ ] Tests: cambio exitoso, actual incorrecta (400), nueva igual a la actual (400)

---



### Ticket 37 — FNZ-BE-037: Generar cuotas del período


| Campo             | Valor                                    |
| ----------------- | ---------------------------------------- |
| **ID**            | FNZ-BE-037                               |
| **Dominio**       | FNZ — Finanzas                           |
| **Tipo**          | Backend + API                            |
| **Historia(s)**   | HU-FNZ-06                                |
| **Estimación**    | 3 h                                      |
| **Prioridad**     | Must-have                                |
| **Bloqueado por** | USR-BE-009 (casas con ocupantes), DB-002 |


**Descripción**
`POST /FNZ/Cuotas/generar` (Admin) con `{ anio, mes, monto, fechaVencimiento, cuentaId }`: crea una cuota por casa con ocupante vigente, en una transacción e idempotente por `(CasaID, PeriodoInicio)`.

**Criterios de aceptación técnicos**

- [ ] Responsable de la cuota: propietario vigente que habita la casa o, si no, el arrendatario vigente (`sgr.CasaOcupantes`)
- [ ] `PeriodoInicio` = día 1 del mes, `PeriodoFin` = último día; `INSERT … SELECT … WHERE NOT EXISTS` para no duplicar
- [ ] Respuesta `{ creadas, omitidas }`; `400` si monto ≤ 0 o vencimiento anterior al inicio del período
- [ ] Tests: primera generación, segunda generación del mismo período (0 creadas), casa sin ocupantes omitida

---



### Ticket 38 — FE-038: Frontend — gestión de tickets (Admin)


| Campo             | Valor              |
| ----------------- | ------------------ |
| **ID**            | FE-038             |
| **Dominio**       | TKT                |
| **Tipo**          | Frontend           |
| **Historia(s)**   | HU-TKT-03          |
| **Estimación**    | 6 h                |
| **Prioridad**     | Must-have          |
| **Bloqueado por** | FE-030, TKT-BE-016 |


**Descripción**
Pantalla de administración: tabla de tickets con filtros por estado, prioridad y categoría; detalle con cambio de estado (solo transiciones permitidas por §3.2) y asignación a trabajador.

**Criterios de aceptación técnicos**

- [ ] Tabla paginada consumiendo `GET /TKT/Tickets`; estados con color + etiqueta (WCAG)
- [ ] Botones de transición visibles solo para los estados destino válidos; el `422` del API se muestra como toast
- [ ] Selector de trabajador con usuarios activos de perfil Trabajador
- [ ] Estados vacío / carga / error; tests de componente de la tabla y del cambio de estado

---



### Ticket 39 — FE-039: Frontend — registrar pago y morosos (Admin)


| Campo             | Valor                                      |
| ----------------- | ------------------------------------------ |
| **ID**            | FE-039                                     |
| **Dominio**       | FNZ                                        |
| **Tipo**          | Frontend                                   |
| **Historia(s)**   | HU-FNZ-02, HU-FNZ-03, HU-FNZ-06            |
| **Estimación**    | 6 h                                        |
| **Prioridad**     | Must-have                                  |
| **Bloqueado por** | FE-030, FNZ-BE-011, FNZ-BE-012, FNZ-BE-037 |


**Descripción**
Pantallas de finanzas del administrador: buscar residente/casa y ver sus cuotas, modal "Registrar pago", reporte de morosos del mes y formulario "Generar cuotas del período".

**Criterios de aceptación técnicos**

- [ ] Modal de pago con monto precargado (no editable en Fase 1), fecha, método y referencia; validación Zod
- [ ] `409` → mensaje "Cuota ya registrada como pagada" y refresco de la tabla
- [ ] Morosos con empty state "Sin morosos en el período seleccionado."
- [ ] Generar cuotas muestra el resumen `{ creadas, omitidas }`
- [ ] Tests de componente del modal (éxito, 409, validación)

---



### Ticket 40 — FE-040: Frontend — dashboards y bandeja de notificaciones


| Campo             | Valor                                        |
| ----------------- | -------------------------------------------- |
| **ID**            | FE-040                                       |
| **Dominio**       | Dashboard / NTF                              |
| **Tipo**          | Frontend                                     |
| **Historia(s)**   | HU-DASH-01, HU-DASH-02, HU-NTF-01, HU-NTF-02 |
| **Estimación**    | 6 h                                          |
| **Prioridad**     | Must-have                                    |
| **Bloqueado por** | FE-030, DASH-BE-014, NTF-BE-013              |


**Descripción**
Página de inicio según el campo `tipo` de `GET /Dashboard/Resumen`: tarjetas KPI (admin) o resumen personal con aviso de cuota vencida (residente). Campana con *badge* de no leídas y bandeja con "marcar como leída".

**Criterios de aceptación técnicos**

- [ ] Renderiza `ResumenAdmin` o `ResumenResidente` sin lógica de rol en el cliente (el shape lo decide el API)
- [ ] Badge con `totalNoLeidas`; se actualiza al marcar una notificación como leída
- [ ] Estados vacío / carga / error; tests de componente de ambos dashboards

---

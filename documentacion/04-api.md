> Documento de diseño detallado (origen: README de la Entrega 1). Resumen y punto de entrada: [README](../README.md).

# 4. Especificación de la API

**Prompt 1:** *(Claude · contrato REST auth)*

```
OpenAPI 3.0 YAML para login: POST /SGR/AuthService/GenerateToken; BCrypt en PasswordHash;
JWT HMAC-SHA256 con sub=UsuarioID, claims perfil, bAdministrador, condominioId.
Errores genéricos en login (no revelar si falló correo o contraseña).
```

*Reemplazó borradores con* `POST /api/USR/login`*; contrato alineado a ADR-003 y §4 Endpoint 1.*

**Prompt 2:** *(Claude · GraphQL + REST tickets)*

```
Mutation crearTicket + POST /TKT/Tickets: estados y prioridad desde catálogos tkt.*;
UsuarioSolicitanteID del JWT; canal WEB|TELEGRAM opcional para métricas.
Documenta errores 401/422 y ejemplo desde web y desde bot.
```

*Alimentó el inventario* `/TKT` *y los ejemplos GraphQL de §4; la ejecución real del bot reutiliza REST, no duplica reglas.*

**Prompt 3:** *(Claude · dashboard y asistente)*

```
GET /Dashboard/Resumen (morosos vía fnz.Cuotas, tickets abiertos) y
POST /BOT/Asistente/Consultar (RAG sobre ia.Fragmentos, escalado si confianza baja).
YAML/OpenAPI solo para los endpoints representativos; tabla resumen para el resto.
```

*Definió los 3 endpoints principales de §4 (+1 complementario RAG) y la fila BOT/IA en la tabla de dominios.*

> **Respuestas del asistente (§4):** `GenerateToken` + BCrypt; `POST /TKT/Tickets` / GraphQL sin `usuarioSolicitanteId` en body; `/Dashboard/Resumen` y `/BOT/Asistente/Consultar` con escalado RAG. — `prompts.md` [§4](../prompts.md#p4-api)

> **Endpoints principales (plantilla: máximo 3):** Endpoint 1 (login JWT), Endpoint 2 (crear ticket) y Endpoint 3 (dashboard) cubren el núcleo §5.0. El **Endpoint 4** se incluye como **complementario** (diferenciador IA/RAG, Fase 3) y no forma parte del núcleo evaluable.



### **Inventario de endpoints por dominio (mapa del API)**

> Convención REST acordada: `/{Dominio}/{Controller}` (OpenAPI/Swashbuckle); GraphQL en `/graphql` (HotChocolate).


| Dominio                       | Base                             | Controladores / endpoints clave                                                                                                                                                                                                                                             |
| ----------------------------- | -------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| SGR — auth/identidad/config   | `/SGR`                           | `AuthService/GenerateToken`, `AuthService/RefreshToken`, `AuthService/Logout`, `AuthService/CambiarPassword`, `Usuarios`, `Perfiles`, `Casas`, `Condominios`, `Menus`, `MenusBotones`, `PerfilMenus`, `PerfilMenuBotones`, `RecuperacionPassword`                           |
| TKT — tickets                 | `/TKT`                           | `Tickets` (`POST`, `GET /mis`, `GET` admin, `PATCH /{ticketID}/estado/{estadoId}`, `POST /{ticketID}/Documentos`), `ComentariosTicket`, `DocumentosTicket`, `TicketsUsuariosAsignados`, `EstadosTickets`, `PrioridadesTicket`, `CategoriasTicket`, `CanalesTicket` (nuevos) |
| FNZ — finanzas                | `/FNZ`                           | `Cuotas` (`GET /mis`, `GET ?usuarioId=` admin, `POST /generar`, `PATCH /{cuotaId}/pago`), `Cuentas`, `Transacciones`, `TiposMovimiento`, `DocumentosTransaccion`                                                                                                            |
| ENC — encuestas               | `/ENC`                           | `Encuestas`, `Preguntas`, `OpcionesPregunta`, `Respuestas`, `TiposPregunta`                                                                                                                                                                                                 |
| JNT — juntas                  | `/JNT`                           | `Juntas`, `JuntaDetalle`, `JuntaDetalleArchivos`                                                                                                                                                                                                                            |
| NTF — notificaciones          | `/NTF`                           | `Notificaciones`, `NotificacionesVisualizadas`, `TiposNotificacion`                                                                                                                                                                                                         |
| VTS — visitas y áreas comunes | `/VTS`                           | `Visitas`, `VisitasGeneradas`, `AreasComunes`, `ReservacionesArea`, `ReservacionesEstados`, `TipoIdentificacion`, `LogUsoVisitas`                                                                                                                                           |
| USR — datos del residente     | `/USR`                           | `Automoviles`, `Mascotas`, `Marcas`, `Modelos`, `TiposMascota`, `RazasMascota`, `Parientes`, `Parentescos`                                                                                                                                                                  |
| ANM — anuncios                | `/ANM`                           | `Anuncios`, `TiposAnuncio`, `LogVisualizacionAnuncios`                                                                                                                                                                                                                      |
| ARC — archivos                | `/ARC`                           | `Archivos`, `TiposArchivo`, `LogVisualizacionArchivos`                                                                                                                                                                                                                      |
| Dashboard — KPIs              | `/Dashboard`                     | `Resumen`                                                                                                                                                                                                                                                                   |
| RPT / BI — reportes           | `/Reports`                       | `Reportes/Morosos` (lista morosos; datos `fnz.Cuotas`), reportes financiero/tickets/ocupación + export PDF/Excel; `Bi/tendencias` (KPIs con tendencia vía `bi.KpiSnapshots`)                                                                                                |
| WMS — almacén (nuevo)         | `/WMS`                           | `Articulos`, `Prestamos`                                                                                                                                                                                                                                                    |
| BOT / IA (nuevo)              | `/BOT`, `/SGR/Usuarios/telegram` | `Asistente/Consultar` (RAG), `Sugerencias`; `telegram/token` (portal), `telegram/vincular` y `telegram/sesion` (bot, con `X-Bot-Secret`), `DELETE telegram` (desvincular)                                                                                                   |
| Salud                         | `/health`                        | Estado del API y de la conexión a BD (sin autenticación)                                                                                                                                                                                                                    |


A continuación, cuatro endpoints detallados como ejemplos representativos (login, mutation GraphQL, KPIs y asistente IA); el resto sigue la convención de la tabla. **Contrato vivo:** en Entrega 2 Swashbuckle publica el OpenAPI completo en `/swagger` y HotChocolate el schema en `/graphql`; la herramienta `sdd-toolkit/tools/check_api_drift.py` compara ese contrato contra esta sección para detectar divergencias.

---



### **Endpoint 1 — POST /SGR/AuthService/GenerateToken (REST)**

```yaml
openapi: 3.0.3
info:
  title: CuartaQuinientos API
  version: 1.0.0

paths:
  /SGR/AuthService/GenerateToken:
    post:
      summary: Autenticar usuario
      description: Valida credenciales contra sgr.Usuarios y retorna un JWT con claims de perfil. Usado por el portal web y el bot de Telegram.
      tags: [Autenticación]
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              required: [correo, password]
              properties:
                correo:
                  type: string
                  format: email
                  example: residente@cuartaquinientos.mx
                password:
                  type: string
                  format: password
                  example: "MiPassword123!"
      responses:
        '200':
          description: Login exitoso
          content:
            application/json:
              schema:
                type: object
                properties:
                  token:
                    type: string
                    description: JWT Bearer token
                    example: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
                  perfil:
                    type: string
                    example: Residente
                  nombre:
                    type: string
                    example: Ariel Fonseca
                  expira:
                    type: string
                    format: date-time
                    example: "2026-09-22T06:00:00Z"
                  requiereCambioPassword:
                    type: boolean
                    description: true si bActualizarPassword = 1; el cliente redirige a cambio de contraseña (HU-USR-03)
                    example: false
          headers:
            Set-Cookie:
              description: "refresh token (HttpOnly; Secure; SameSite=Strict; 14 días)"
              schema: { type: string }
        '400':
          description: Datos inválidos (correo con formato incorrecto o campos vacíos)
          content:
            application/problem+json:
              schema: { $ref: '#/components/schemas/ProblemDetails' }
        '401':
          description: Credenciales inválidas (mismo mensaje para usuario inexistente, contraseña incorrecta o cuenta inactiva)
          content:
            application/problem+json:
              schema: { $ref: '#/components/schemas/ProblemDetails' }
              example: { type: "about:blank", title: "Credenciales inválidas", status: 401, code: "INVALID_CREDENTIALS" }
        '429':
          description: Demasiados intentos (5 por minuto por IP + correo)

components:
  schemas:
    ProblemDetails:
      type: object
      properties:
        type:   { type: string }
        title:  { type: string }
        status: { type: integer }
        detail: { type: string }
        code:   { type: string, example: VALIDATION_ERROR }
        errors: { type: object, additionalProperties: { type: array, items: { type: string } } }
```

> Renovación: `POST /SGR/AuthService/RefreshToken` (lee la cookie, rota el refresh token y devuelve un nuevo access token). Cierre de sesión: `POST /SGR/AuthService/Logout` (revoca el refresh token).

> El claim `sub` del JWT es el `UsuarioID` (no un `ResidenteID` — esa entidad no existe). Todo endpoint que necesite identificar al solicitante usa `sub` = `UsuarioID`.



### **Endpoint 2 — GraphQL: Mutation crearTicket**

```graphql
# Schema types
type Ticket {
  id: ID!
  titulo: String!
  descripcion: String!
  estado: String!        # nombre desde tkt.EstadosTickets (Nuevo, En seguimiento, ...)
  prioridad: String!     # nombre desde tkt.PrioridadesTicket (Baja, Media, Alta, Crítica)
  categoria: String!     # nombre desde tkt.CategoriasTicket
  canal: String!         # WEB | TELEGRAM (tkt.CanalesTicket)
  fechaCreacion: DateTime!
  fechaCierre: DateTime
  solicitante: Usuario!
  comentarios: [ComentarioTicket!]!
}

input CrearTicketInput {
  titulo:      String!  # max 200 caracteres
  descripcion: String!  # máx. 4 000 (columna NVARCHAR(MAX))
  categoria:   String!  # catálogo tkt.CategoriasTicket: Agua | Electricidad | Jardinería | Seguridad | Limpieza | Otro (ver §2.5)
  prioridad:   String   # Baja | Media | Alta | Crítica (default Media)
  canal:       String   # WEB (default) | TELEGRAM; se valida contra tkt.CanalesTicket
}

type Mutation {
  crearTicket(input: CrearTicketInput!): CrearTicketPayload!
}

type CrearTicketPayload {
  ticket: Ticket
  errors: [UserError!]
}

type UserError {
  message: String!
  code: String!  # FORBIDDEN | VALIDATION_ERROR | INTERNAL_ERROR
  field: String  # campo del input que falló (si aplica)
}
```

> **Web** usa esta mutation; el **bot** usa el equivalente REST `POST /TKT/Tickets` (mismo cuerpo JSON, respuesta `201 Created` con el ticket o `ProblemDetails`). Ambos delegan en `ITicketService`, así la regla de negocio existe una sola vez. Los adjuntos se suben después con `POST /TKT/Tickets/{ticketId}/Documentos` (multipart, Fase 2).

> **Nota.** Además de estado y prioridad, el diseño **incluye** la categoría como catálogo `tkt.CategoriasTicket` (Agua, Electricidad, Jardinería, Seguridad, Limpieza, Otro) + columna `tkt.Tickets.CategoriaTicketID` (ver §2.5), en vez de dejarla como texto.

**Ejemplo de request y response:**

```json
// POST /graphql — Authorization: Bearer <token>
{
  "query": "mutation($input: CrearTicketInput!) { crearTicket(input: $input) { ticket { id titulo estado canal fechaCreacion } errors { message code } } }",
  "variables": {
    "input": {
      "titulo": "Fuga de agua en calle principal",
      "descripcion": "Fuga visible desde las 8am en esquina norte. Afecta el paso peatonal.",
      "categoria": "Agua",
      "prioridad": "Alta",
      "canal": "WEB"
    }
  }
}

// Response 200
{
  "data": {
    "crearTicket": {
      "ticket": {
        "id": "142",
        "titulo": "Fuga de agua en calle principal",
        "estado": "Nuevo",
        "canal": "WEB",
        "fechaCreacion": "2026-09-21T14:30:00Z"
      },
      "errors": null
    }
  }
}
```



### **Endpoint 3 — GET /Dashboard/Resumen (REST)**

```yaml
  /Dashboard/Resumen:
    get:
      summary: Resumen del tablero según el perfil del usuario autenticado
      description: >
        Administrador (bAdministrador = 1) → KPIs del fraccionamiento del período.
        Residente → resumen personal. Morosos = cuotas con Pagado = 0 y FechaVencimiento < hoy.
        En Fase 1 la UI siempre pide el mes en curso (los parámetros existen para BI/pruebas).
      tags: [Dashboard]
      security:
        - bearerAuth: []
      parameters:
        - name: mes
          in: query
          required: false
          description: Por defecto, mes en curso (America/Mexico_City)
          schema: { type: integer, minimum: 1, maximum: 12 }
          example: 9
        - name: anio
          in: query
          required: false
          schema: { type: integer, minimum: 2024 }
          example: 2026
      responses:
        '200':
          description: Resumen del período
          content:
            application/json:
              schema:
                oneOf:
                  - $ref: '#/components/schemas/ResumenAdmin'
                  - $ref: '#/components/schemas/ResumenResidente'
        '401':
          description: No autenticado
        '403':
          description: Perfil sin tablero (p. ej. Guardia)

components:
  schemas:
    ResumenAdmin:
      type: object
      properties:
        tipo:                 { type: string, enum: [ADMIN] }
        ticketsNuevos:        { type: integer, example: 12 }
        ticketsEnSeguimiento: { type: integer, example: 5 }
        morososMes:           { type: integer, example: 8 }
        montoCobrado:         { type: number, example: 47500.00 }
        montoPendiente:       { type: number, example: 12500.00 }
        ocupacion:            { type: number, example: 87.5, description: "% de casas con al menos un ocupante vigente (sgr.CasaOcupantes)" }
        ticketsPorCanal:
          type: object
          properties:
            web:      { type: integer, example: 9 }
            telegram: { type: integer, example: 3 }
    ResumenResidente:
      type: object
      properties:
        tipo:                   { type: string, enum: [RESIDENTE] }
        ticketsActivos:         { type: integer, example: 2 }
        estadoCuotaMes:
          type: object
          properties:
            monto:            { type: number, example: 1200.00 }
            fechaVencimiento: { type: string, format: date }
            estado:           { type: string, enum: [Pagada, Pendiente, Vencida] }
        notificacionesNoLeidas: { type: integer, example: 3 }
        avisoVencida:           { type: boolean, example: false }
  securitySchemes:
    bearerAuth:
      type: http
      scheme: bearer
      bearerFormat: JWT
```

---



### **Anexo (fuera de los 3 endpoints principales) — POST /BOT/Asistente/Consultar (REST) — Asistente inteligente (RAG, Fase 3)**

> *Complementario, fuera de los 3 endpoints principales: documenta el diferenciador del bot «C500 Asiste».*

```yaml
  /BOT/Asistente/Consultar:
    post:
      summary: Resolver una duda del residente con IA (RAG sobre el reglamento y datos del sistema)
      description: >
        Recibe una pregunta en lenguaje natural, detecta intención, recupera fragmentos
        relevantes de `ia.Fragmentos` (reglamento/FAQ) y datos del usuario, y responde con
        el LLM configurado. Registra todo en `ia.Consultas`. Si la confianza es baja, escala
        (crea ticket / deriva a humano) en vez de inventar.
      tags: [Bot / IA]
      security:
        - bearerAuth: []
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              required: [pregunta]
              properties:
                pregunta: { type: string, example: "¿Puedo apartar la terraza el sábado y cuánto cuesta?" }
                canal:    { type: string, enum: [WEB, TELEGRAM], example: TELEGRAM }
      responses:
        '200':
          description: Respuesta generada
          content:
            application/json:
              schema:
                type: object
                properties:
                  respuesta:   { type: string, example: "Sí. La terraza se aparta desde el portal o por aquí; el sábado 14 está libre. Según el reglamento (art. 12) el uso no tiene costo pero requiere reserva previa." }
                  intent:      { type: string, example: "RESERVA_AREA_COMUN" }
                  fuentes:     { type: array, items: { type: string }, example: ["reglamentocuarta500.pdf §12"] }
                  confianza:   { type: number, example: 0.86 }
                  escalado:    { type: boolean, example: false }
                  accionSugerida: { type: string, example: "reservar_area:Terraza" }
        '401': { description: No autenticado }
```

> El asistente reutiliza los mismos endpoints de dominio para **ejecutar** acciones (crear ticket, reservar área, consultar cuotas): no duplica lógica, solo orquesta con IA. Las sugerencias proactivas se emiten desde un worker que consulta `fnz.Cuotas` vencidas, `usr.Mascotas` con vacunas por renovar, encuestas activas, etc., y las registra en `bot.Sugerencias`.

---

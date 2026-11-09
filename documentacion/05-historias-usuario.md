> Documento de diseño detallado (origen: README de la Entrega 1). Resumen y punto de entrada: [README](../README.md).

# 5. Historias de Usuario

**Prompt 1:** *(Claude · backlog AI-Ready — Módulo 4)*

```
Rol: PO Senior. Contexto: readme §1.2 (15 módulos). Salida: historias Como/quiero/para,
AC Given/When/Then (≥3 por historia Must), MoSCoW [M/S/C], labels module:/type:/size:.
Non-goals: sin auto-registro público; sin SPs. Trazabilidad a tablas y rutas §3–§4.
```

*Catálogo completo en el cuerpo de §5; núcleo académico explicitado en §5.0 (cinco historias end-to-end).*

**Prompt 2:** *(Claude · suficiencia del backlog)*

```
Antes de cerrar Entrega 1: ¿hay huecos de cadena (login sin HU, ticket sin asignación admin,
cuotas sin registro de pago)? Añade solo historias imprescindibles con AC de error, no happy path solo.
```

*Refinó HU-USR-04, HU-TKT-03, HU-FNZ-02 y DoD por tipo de trabajo (§5, bloque posterior a la matriz).*

**Prompt 3:** *(Claude · poke-holes — patrón «AI as Poke-Holes»)*

```
Actúa como revisor adversarial sobre HU-TKT-01 (web + bot). Lista supuestos implícitos,
edge cases y seguridad. Formato: Hallazgo | Riesgo | Corrección. Máx. 12 ítems accionables.
```

*Resultado integrado en §5.0.1 (token Telegram, empty states, orden de listados, idempotencia ntf); prompt completo y tabla ampliada en* `prompts.md`*.*

> **Respuestas del asistente (§5):** Backlog + núcleo §5.0; cierre de huecos HU-TKT-03/HU-FNZ-02/HU-USR-04; poke-holes **7 en §5.0.1** + **5 (filas 8–12)** en `[prompts.md](../prompts.md#poke-holes)`.

Las etiquetas **[M]** Must-have, **[S]** Should-have y **[C]** Could-have indican **prioridad de producto** (qué debe existir en el MVP del fraccionamiento). El **orden de implementación** por sprint se define en el [roadmap por fases](#roadmap-por-fases-alcance-completo-secuenciado) (Fase 1 = demo end-to-end web; Fases 2–3 = Telegram, participación e inteligencia). Una historia puede ser `[M]` en producto y ejecutarse en Fase 2 o 3 sin contradicción.

### **5.0. Núcleo del proyecto (5 historias — requisito académico y demo Entrega Final)**

Estas cinco historias son el **hilo conductor** que debe quedar operativo de punta a punta (web + API + BD) antes de la Entrega Final; el resto del catálogo (15 módulos) amplía el producto real del fraccionamiento.


| #   | Historia      | Una línea                           | Tickets §6                                            |
| --- | ------------- | ----------------------------------- | ----------------------------------------------------- |
| 1   | **HU-USR-01** | Login con JWT y perfil              | SETUP-000, DB-000, DB-001, DB-002, USR-BE-007, FE-030 |
| 2   | **HU-TKT-01** | Residente crea incidencia           | TKT-BE-001, TKT-BE-002, FE-031                        |
| 3   | **HU-TKT-03** | Admin asigna y resuelve tickets     | TKT-BE-016, FE-038                                    |
| 4   | **HU-FNZ-01** | Residente consulta estado de cuenta | FNZ-BE-010, FE-032                                    |
| 5   | **HU-FNZ-02** | Admin registra pago de cuota        | FNZ-BE-011, FE-039                                    |


**Habilitadores del núcleo** (sin ellos el flujo no se puede demostrar): HU-USR-03 cambio de contraseña obligatorio en primer acceso (USR-BE-036), HU-USR-04 alta de residentes (USR-BE-009) y HU-FNZ-06 generación de cuotas del período (FNZ-BE-037).

**Diferenciador (visión completa, fuera del núcleo mínimo):** bot «C500 Asiste», RAG, BI y WMS — documentados con el mismo rigor y priorizados en Fases 2–3 del roadmap.

### **5.0.1. Poke-holes (revisión adversarial — patrón Módulo 4/5)**

Hallazgos no triviales aplicados al diseño (más allá del happy path):

1. **Auth en Telegram:** nunca pedir contraseña en el chat → vinculación por **token de un solo uso** (`bot.TokensVinculacion`).
2. **Empty states:** listas vacías explícitas en AC (p. ej. sin tickets, sin morosos, bandeja sin notificaciones).
3. **Orden y filtros:** listados de tickets con orden **fecha descendente** y filtro por estado en AC (no asumir orden por defecto).
4. **Seguridad de registro:** sin auto-registro público; alta de residentes solo Admin (HU-USR-04); login con error genérico.
5. **Idempotencia notificaciones salientes:** `ntf.NotificacionesEntrega` para no duplicar mensajes Telegram ante reintentos.
6. **RAG / reglamento:** el asistente no inventa normas; confianza baja → escalar a humano/ticket y registrar en `ia.Consultas` (§2.5, HU-BOT-06).
7. **Categoría e internos:** incidencias clasificadas vía `tkt.CategoriasTicket`; comentarios de admin con `ComentariosTicket.EsInterno` (§2.5, HU-TKT-04).

> **Validación (2026-09-23):** los ítems 1–5 responden directamente a HU-TKT-01 web+bot; 6–7 cierran huecos del mismo poke-holes ya reflejados en §2.5 y HUs BOT/TKT. Ítems 8–12 (adjuntos, `/cancelar`, refresh JWT, doble submit, etc.) están en `prompts.md` [— tabla completa](../prompts.md#poke-holes) con columna **Estado** (`§5.0.1` | `§2.5` | ticket | `(asumido)`).

Detalle del flujo IA que produjo estas correcciones: `prompts.md` (sección *Poke-holes*).

**Matriz de trazabilidad (módulo ↔ historias ↔ datos ↔ API ↔ SDD).** Cada módulo enlaza sus historias con las tablas/vistas que toca, su base REST y su *source of truth* SDD:


| Módulo                 | Historias                    | Datos (esquema / tablas · vistas)                                                                                                                                              | API base                         | Doc.         |
| ---------------------- | ---------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------- | ------------ |
| USR / SGR              | HU-USR-01..04                | `sgr.Usuarios/Perfiles/Casas/Condominios` (+ `CasaOcupantes`, `RefreshTokens` extensión) · `sgr.vsUsuarios`                                                                    | `/SGR`                           | readme §5–§6 |
| TKT                    | HU-TKT-01..05                | `tkt.Tickets/EstadosTickets/PrioridadesTicket/ComentariosTicket/DocumentosTicket/TicketsUsuariosAsignados` (+ `CategoriasTicket`, `CanalesTicket` extensión) · `tkt.vsTickets` | `/TKT`                           | readme §5–§6 |
| FNZ                    | HU-FNZ-01..06                | `fnz.Cuotas/Cuentas/Transacciones/TiposMovimiento/DocumentosTransaccion` · `fnz.vsTransacciones`                                                                               | `/FNZ`                           | readme §5–§6 |
| ENC                    | HU-ENC-01..03                | `enc.Encuestas/Preguntas/OpcionesPregunta/Respuestas/TiposPregunta`                                                                                                            | `/ENC`                           | readme §5–§6 |
| JNT                    | HU-JNT-01..02                | `jnt.Juntas/JuntaDetalle/JuntaDetalleArchivos`                                                                                                                                 | `/JNT`                           | readme §5–§6 |
| NTF                    | HU-NTF-01..03                | `ntf.Notificaciones/NotificacionesVisualizadas/TiposNotificacion` (+ `NotificacionesEntrega` extensión)                                                                        | `/NTF`                           | readme §5–§6 |
| VTS                    | HU-VTS-01..03                | `vts.Visitas/VisitasGeneradas/AreasComunes/ReservacionesArea/ReservacionesEstados/TipoIdentificacion` · `vts.vsReservacionesArea`                                              | `/VTS`                           | readme §5–§6 |
| MAS                    | HU-MAS-01..02                | `usr.Mascotas/TiposMascota/RazasMascota` (+ `VacunasAlDia` extensión) · `usr.vsMascotas`                                                                                       | `/USR`                           | readme §5–§6 |
| VEH                    | HU-VEH-01..02                | `usr.Automoviles/Marcas/Modelos` · `usr.vsAutomoviles`                                                                                                                         | `/USR`                           | readme §5–§6 |
| ANM                    | HU-ANM-01..02                | `anm.Anuncios/TiposAnuncio/LogVisualizacionAnuncios` · `anm.vsAnuncios`                                                                                                        | `/ANM`                           | readme §5–§6 |
| ARC                    | HU-ARC-01..02                | `arc.Archivos/TiposArchivo/LogVisualizacionArchivos` · `arc.vsArchivos`                                                                                                        | `/ARC`                           | readme §5–§6 |
| Dashboard              | HU-DASH-01..02               | vistas `vs*` (sin tablas propias)                                                                                                                                              | `/Dashboard`                     | readme §5–§6 |
| RPT / BI               | HU-RPT-01..02 · HU-BI-01..03 | vistas `vs*` (+ `bi.KpiSnapshots` extensión)                                                                                                                                   | `/Reports`                       | readme §5–§6 |
| WMS                    | HU-WMS-01..03                | `wms.Articulos/Prestamos` (extensión, nuevo)                                                                                                                                   | `/WMS`                           | readme §5–§6 |
| BOT «C500 Asiste» / IA | HU-BOT-01..13                | `bot.*`, `ia.*` (nuevo) · reutiliza todo lo anterior                                                                                                                           | `/bot`, `/SGR/Usuarios/telegram` | readme §5–§6 |


---



### Definition of Done y Non-goals (Fase 1 — MVP)

> Esta subsección aplica a las historias **[M]** de la Fase 1 (USR, TKT, FNZ, NTF, Dashboard). La **Definition of Done (DoD)** se declara por *tipo de trabajo* (regla de planificación: DoD diferenciada por tipo de tarea) y los **Non-goals** se declaran por módulo para acotar explícitamente qué **no** debe tocar el agente en esta fase.

**Definition of Done — por tipo de trabajo**

- **Feature backend (servicio + repositorio Dapper):** AC en Given/When/Then verificados; consultas **parametrizadas** y escrituras dentro de **transacción** (commit/rollback); estados y prioridades **resueltos por catálogo** (no hardcode); `UsuarioSolicitanteID`/autor tomados del **JWT**, nunca del input; auditoría por columnas (`Creado`, `UsuarioCreacionID`, `FechaCreacion`, `bEliminado`); **tests unitarios** del servicio (repositorio mockeado) en verde; respuesta leída desde la **vista** `vs`* correspondiente.
- **Feature frontend (React 18 + Apollo):** happy path y estados **vacío / carga / error** cubiertos; validación de formulario **antes** de enviar; consumo tipado de GraphQL/REST; el rol se valida en el backend (nada sensible confiado al cliente); layout responsive básico; probado contra backend real o mock.
- **Endpoint API (REST/GraphQL):** contrato documentado en §4 y visible en `/swagger` (request/response y códigos que apliquen: 200/201/204/400/401/403/404/409/422/429); errores en `ProblemDetails` con `code` de negocio; **autorización por perfil** aplicada; validación con FluentValidation; test de integración del endpoint.
- **Cambio de esquema:** script `SQL/DB-NNN_*.sql` idempotente (segunda ejecución sin errores), con su suite `SQL/pruebas/`; coherente con §2.5 y §3.
- **Cierre de historia (todos los tipos):** todos los AC validados y marcados en la descripción del PR; CI en verde (build + tests); las suites SQL cumplen el hook `.claude/hooks/check-tests-green.ps1` (caso negativo + evidencia de ejecución); documentación de §3/§4 actualizada si cambió el modelo o el contrato; sin romper tests existentes.



### USR — Usuarios y Residencias

**HU-USR-01 [M] — Login de usuario**

> Como usuario registrado, quiero iniciar sesión con mi correo y contraseña para acceder al portal con mi perfil correspondiente.

- **Given** credenciales correctas → **Then** recibo JWT (con claim `perfil`) y accedo a mi dashboard.
- **Given** contraseña incorrecta → **Then** veo "Credenciales inválidas" sin revelar cuál campo falló.
- **Given** sesión expirada y refresh token vencido o revocado → **Then** soy redirigido al login automáticamente.
- **Given** mi cuenta tiene `bActualizarPassword = 1` (primer acceso) → **Then** tras el login se me obliga a cambiar la contraseña antes de ver el dashboard.
- **Given** 5 intentos fallidos en un minuto → **Then** veo "Demasiados intentos, espera un momento" (HTTP 429).

**HU-USR-02 [M] — Ver y editar perfil**

> Como residente, quiero ver y actualizar mis datos de contacto para mantener mi información vigente.

- **Given** que accedo a Mi Perfil → **Then** veo nombre, unidad (casa), teléfono y correo.
- **Given** que cambio mi teléfono y guardo → **Then** el dato se actualiza inmediatamente.
- **Given** que intento registrar un correo ya usado → **Then** veo "El correo ya está en uso".

**HU-USR-03 [M] — Cambio de contraseña** *(habilitador: todo usuario nuevo inicia con contraseña temporal)*

> Como usuario, quiero cambiar mi contraseña para mantener la seguridad de mi cuenta.

- **Given** contraseña actual correcta + nueva válida → **Then** contraseña actualizada, `bActualizarPassword = 0` y mis demás sesiones (refresh tokens) revocadas.
- **Given** nueva contraseña menor a 8 caracteres o igual a la actual → **Then** error de validación antes de enviar.
- **Given** contraseña actual incorrecta → **Then** "La contraseña actual no es correcta" y no se modifica nada.

**HU-USR-04 [M] — Gestión de usuarios/residentes (Admin)**

> Como administrador, quiero registrar, editar y desactivar usuarios para mantener el padrón.

- **Given** registro nuevo usuario con correo y perfil Residente y lo ligo a una casa → **Then** cuenta creada con `bActualizarPassword=1` y el sistema me muestra **una sola vez** la contraseña temporal para entregarla en persona.
- **Given** el correo ya existe → **Then** "El correo ya está en uso".
- **Given** desactivo un usuario (`bActivo=0`) → **Then** no puede iniciar sesión pero su historial permanece íntegro.

---

**Non-goals (USR — Fase 1):** sin registro self-service de residentes (el alta la realiza el Admin — HU-USR-04); sin recuperación de contraseña por correo ni verificación de email; sin SSO/OAuth externos ni MFA; sin gestión granular de roles/permisos más allá de los perfiles ya sembrados (`bAdministrador`); refactor del esquema `sgr` fuera de alcance salvo los deltas declarados.

### TKT — Tickets de Servicio

**HU-TKT-01 [M] — Crear ticket desde el portal web**

> Como residente, quiero reportar una incidencia desde el portal para que la administración la atienda con seguimiento formal.

- **Given** completo categoría, título y descripción (prioridad opcional, *Media* por defecto) → **Then** ticket creado en estado **Nuevo**, ligado a mi casa, con canal WEB; los administradores reciben notificación.
- **Given** título vacío o mayor a 200 caracteres, o sin categoría → **Then** error de validación antes de enviar.
- **Given** pulso "Enviar" dos veces seguidas → **Then** se crea un solo ticket (botón deshabilitado mientras la petición está en curso).
- **(Fase 2)** **Given** adjunto una foto (JPG/PNG ≤ 5 MB) → **Then** el archivo queda ligado al ticket (`tkt.DocumentosTicket` → `arc.Archivos`).

**HU-TKT-02 [M] — Consultar mis tickets**

> Como residente, quiero ver mis tickets y su estado actual para saber si mis reportes están siendo atendidos.

- **Given** accedo a Mis Tickets → **Then** lista del más reciente al más antiguo con título, prioridad, estado y fecha.
- **Given** filtro por estado "En seguimiento" → **Then** solo veo tickets en ese estado.
- **Given** no tengo tickets → **Then** mensaje "No has reportado incidencias aún."

**HU-TKT-03 [M] — Gestionar tickets (Admin)**

> Como administrador, quiero ver todos los tickets, asignarlos a personal y cambiar su estado.

- **Given** accedo a gestión de tickets → **Then** veo todos con filtros por estado y prioridad.
- **Given** asigno el ticket a un técnico → **Then** se crea el registro en `tkt.TicketsUsuariosAsignados` y el técnico recibe notificación.
- **Given** marco el ticket como **Resuelto** → **Then** se registra `FechaCierre` y el solicitante es notificado.
- **Given** intento una transición no permitida (p. ej. Nuevo → Cerrado) → **Then** "Transición de estado no permitida" (ver máquina de estados §3.2).
- **Given** busco a quién asignar → **Then** solo aparecen usuarios activos con perfil Trabajador.

**HU-TKT-04 [S] — Comentar en ticket**

> Como residente o administrador, quiero agregar comentarios a un ticket para mantener la comunicación centralizada.

- **Given** agrego un comentario → **Then** queda en `tkt.ComentariosTicket`, visible para los involucrados.
- **Definido (buenas prácticas):** el comentario interno se soporta con la columna nueva `tkt.ComentariosTicket.EsInterno BIT` (ver §2.5); visible solo para Administrador.

**HU-TKT-05 [C] — Calificar resolución**

> Como residente, quiero calificar la resolución de mi ticket para dar retroalimentación al equipo de mantenimiento. **(extensión — requiere modelado nuevo)**

---

**Non-goals (TKT — Fase 1):** sin SLA ni escalamiento/tiempos de respuesta automáticos; sin calificación de resolución (HU-TKT-05 es `[C]`/extensión); sin edición/borrado de comentarios; sin notificaciones push nativas (solo `ntf.Notificaciones`; Telegram llega en Fase 2); **sin adjuntos en Fase 1** (llegan en Fase 2 con ARC-BE-028, limitados a imagen/PDF ≤ 5 MB). Categoría y canal **sí** están en Fase 1 (catálogos sembrados por DB-002).

### FNZ — Finanzas

**HU-FNZ-01 [M] — Consultar estado de cuenta**

> Como residente, quiero ver mi historial de cuotas y saldos pendientes para conocer mi situación con el fraccionamiento.

- **Given** accedo a Mi Estado de Cuenta → **Then** tabla de cuotas: período, monto, vencimiento, estado (Pagado / Pendiente / Vencida).
- **Given** tengo cuotas vencidas (`Pagado=0` y `FechaVencimiento < hoy`) → **Then** aparecen destacadas con el total a regularizar.

**HU-FNZ-02 [M] — Registrar pago de cuota (Admin)**

> Como administrador, quiero registrar el pago de una cuota para actualizar el estado de cuenta del residente.

- **Given** selecciono la cuota y registro monto, fecha y referencia → **Then** `Pagado=1`, `FechaPago` y `ReferenciaPago` quedan grabados y el residente recibe notificación (portal y Telegram si está vinculado).
- **Given** monto igual a cero → **Then** error "El monto debe ser mayor a cero".
- **Given** el monto no coincide con el de la cuota → **Then** "El monto debe coincidir con la cuota (pagos parciales fuera de alcance)".
- **Given** la cuota ya estaba pagada (o dos administradores la registran al mismo tiempo) → **Then** solo el primer registro procede; el segundo ve "Cuota ya registrada como pagada".

**HU-FNZ-03 [M] — Reporte de morosos (Admin)**

> Como administrador, quiero ver la lista de residentes con adeudos para gestionar la cobranza mensual.

- **Given** accedo al reporte de morosos → **Then** lista con casa, nombre, cuotas adeudadas y monto total pendiente.
- **Given** todos al corriente → **Then** "Sin morosos en el período seleccionado."

**HU-FNZ-04 [S] — Registro de movimientos contables (Admin)**

> Como administrador, quiero registrar cargos y abonos en las cuentas del fraccionamiento (`fnz.Transacciones`) para llevar la contabilidad básica.

**HU-FNZ-05 [C] — Exportar estado de cuenta en PDF**

> Como residente, quiero descargar mi estado de cuenta en PDF para tener un comprobante.

**HU-FNZ-06 [M] — Generar cuotas del período (Admin)** *(habilitador: sin cuotas no hay estado de cuenta ni morosos)*

> Como administrador, quiero generar las cuotas de mantenimiento de un período para todas las casas ocupadas.

- **Given** indico período (mes/año), monto y fecha de vencimiento → **Then** se crea una cuota por cada casa con ocupante vigente, a nombre de su responsable (propietario o, si no vive ahí, el arrendatario vigente).
- **Given** ya existen cuotas de ese período para una casa → **Then** esa casa se omite (idempotente) y el resumen indica cuántas se crearon y cuántas se omitieron.
- **Given** monto menor o igual a cero o vencimiento anterior al inicio del período → **Then** error de validación.

---

**Non-goals (FNZ — Fase 1):** sin pasarela de pago en línea (el Admin **registra** el pago, el sistema no lo cobra); sin conciliación bancaria automática; sin facturación fiscal/CFDI; sin cálculo automático de recargos o intereses por mora; sin pagos parciales ni abonos a cuenta; export a PDF (HU-FNZ-05) y contabilidad de transacciones (HU-FNZ-04) quedan como `[S]/[C]`, fuera de la Fase 1.

### MAS — Mascotas

**HU-MAS-01 [M] — Registrar mascota**

> Como residente, quiero registrar mis mascotas para cumplir con el reglamento del fraccionamiento.

- **Given** registro mascota con nombre, tipo y raza (catálogos) → **Then** queda asociada a mi usuario (`usr.Mascotas`).
- **Definido (buenas prácticas):** el control de vacunas se soporta con columnas nuevas `usr.Mascotas.VacunasAlDia BIT` + `FechaUltimaVacuna DATE` (ver §2.5); el bot puede recordar la renovación de forma proactiva.

**HU-MAS-02 [S] — Padrón de mascotas (Admin)**

> Como administrador, quiero consultar el padrón de mascotas para verificar cumplimiento del reglamento.

- **Given** accedo al padrón → **Then** lista con nombre, tipo, raza y usuario/casa.

---



### VEH — Vehículos

**HU-VEH-01 [M] — Registrar vehículo**

> Como residente, quiero registrar mis vehículos para facilitar el control de acceso.

- **Given** registro vehículo con marca, modelo (catálogos), placas y color → **Then** asociado a mi usuario (`usr.Automoviles`).
- **Given** placas ya registradas → **Then** error "Las placas ya están registradas."

**HU-VEH-02 [S] — Consultar vehículos (Admin / Vigilancia)**

> Como administrador o guardia, quiero buscar vehículos por placa para validar accesos.

- **Given** busco por placa registrada → **Then** veo usuario y casa asociados.
- **Given** placa no registrada → **Then** "Vehículo no registrado."

---



### VTS — Visitas y Áreas Comunes

**HU-VTS-01 [S] — Registrar visitante (Vigilancia)**

> Como guardia, quiero registrar la entrada de visitantes con identificación para mantener la bitácora de acceso.

- **Given** registro visitante con nombre, identificación, casa a visitar y autorización → **Then** `FechaEntrada` registrada.
- **Given** registro la salida → **Then** `FechaSalida` registrada.

**HU-VTS-02 [S] — Reservar área común**

> Como residente, quiero reservar una amenidad (p. ej. el salón de eventos) por fecha para uso privado.

- **Given** el área requiere reservación (`RequiereReservacion=1`) y está libre en el horario → **Then** creo la reserva en estado inicial (`vts.ReservacionesArea`).
- **Given** el horario ya está reservado → **Then** "El área no está disponible en ese horario."

**HU-VTS-03 [S] — Consultar bitácora de accesos (Admin)**

> Como administrador, quiero consultar entradas y salidas para investigar incidencias.

---



### ENC — Encuestas

**HU-ENC-01 [S] — Participar en encuesta**

> Como residente, quiero responder encuestas activas para participar en decisiones del fraccionamiento.

- **Given** hay encuesta activa (`bActivo=1`, dentro de vigencia) → **Then** veo aviso en dashboard y puedo responder cada pregunta.
- **Given** ya respondí la encuesta → **Then** "Ya participaste. Tu respuesta fue registrada."
- **Given** encuesta fuera de vigencia → **Then** no puedo responderla.

**HU-ENC-02 [S] — Crear y publicar encuesta (Admin)**

> Como administrador, quiero crear encuestas con preguntas y opciones para consultar a los residentes.

- **Given** creo encuesta con título, vigencia, preguntas tipadas y opciones → **Then** queda inactiva hasta publicar.
- **Given** la publico (`bActivo=1`) → **Then** los residentes activos reciben notificación (portal y Telegram).

**HU-ENC-03 [S] — Ver resultados consolidados (Admin)**

> Como administrador, quiero ver los resultados agregados por opción para tomar decisiones.

- **Given** una pregunta de opción múltiple → **Then** veo el conteo y porcentaje por `OpcionPregunta` (viable porque `Respuestas.OpcionPreguntaID` referencia la opción elegida).
- **Given** una pregunta de texto libre → **Then** veo el listado de `RespuestaTexto`.

---



### JNT — Juntas

**HU-JNT-01 [S] — Ver convocatoria y acuerdos de junta**

> Como residente, quiero ver las convocatorias y el contenido de las juntas para estar informado.

- **Given** hay junta programada (`bActivo=1`) → **Then** veo fecha, ubicación y descripción.
- **Given** junta con detalle registrado → **Then** puedo leer los acuerdos (`jnt.JuntaDetalle`) y descargar archivos adjuntos (`jnt.JuntaDetalleArchivos`).

**HU-JNT-02 [S] — Publicar convocatoria (Admin)**

> Como administrador, quiero publicar convocatorias para notificar a todos los residentes.

- **Given** publico la convocatoria → **Then** los residentes activos reciben notificación (portal y Telegram).

---



### NTF — Notificaciones

**HU-NTF-01 [M] — Recibir notificaciones del sistema**

> Como usuario, quiero recibir notificaciones automáticas sobre eventos relevantes.

- **Given** se crea un ticket que me corresponde → **Then** notificación con título y estado.
- **Given** se registra mi pago → **Then** notificación con monto y período.
- **Given** tengo notificaciones sin leer (sin fila en `ntf.NotificacionesVisualizadas`) → **Then** badge con el número.

**HU-NTF-02 [S] — Marcar notificaciones como leídas**

> Como usuario, quiero marcar mis notificaciones como leídas para mantener limpia mi bandeja.

**HU-NTF-03 [S] — Enviar aviso general (Admin)**

> Como administrador, quiero enviar un aviso a todos los residentes (portal + Telegram).

- **Given** redacto y envío un aviso → **Then** todos los residentes activos lo reciben en el portal; los vinculados también en Telegram (vía el notificador saliente, registrado en `ntf.NotificacionesEntrega`).

---

**Non-goals (NTF — Fase 1):** solo notificación interna in-app (`ntf.Notificaciones`); para Telegram, en Fase 1 `INotificacionService` solo **encola** la entrega (fila `PENDIENTE` en `ntf.NotificacionesEntrega`, NTF-BE-013) y el envío real a Telegram lo hace el notificador de Fase 2 (BOT-BE-020); email no se implementa; sin preferencias por usuario (canales/silenciado); sin plantillas configurables; sin digest ni agrupación de avisos.

### Dashboard

**HU-DASH-01 [M] — KPIs del fraccionamiento (Admin)**

> Como administrador, quiero ver los indicadores clave para tomar decisiones operativas.

- **Given** accedo al dashboard → **Then** veo: tickets nuevos, tickets en seguimiento, morosos del mes, monto cobrado, monto pendiente y ocupación.
- **Given** existen tickets del mes → **Then** veo también el desglose de tickets por canal (WEB vs TELEGRAM, `tkt.Tickets.CanalID`).
- **Given** no hay datos en el período → **Then** los KPI muestran 0 (no error).

**HU-DASH-02 [M] — Resumen personal (Residente)**

> Como residente, quiero ver un resumen de mi actividad al iniciar sesión.

- **Given** accedo a mi dashboard → **Then** veo mis tickets activos, estado de mi cuota del mes y últimas notificaciones.
- **Given** tengo una cuota vencida → **Then** aviso destacado con monto a regularizar.

---

**Non-goals (Dashboard — Fase 1):** KPIs de **solo lectura** sobre vistas `vs`*, sin drill-down interactivo ni exportación; período fijo al **mes actual** en la UI (sin rango de fechas configurable); sin gráficas históricas ni tendencias (quedan para RPT/BI en Fase 3).

### ARC — Archivos

**HU-ARC-01 [S] — Descargar documentos del fraccionamiento**

> Como residente, quiero descargar el reglamento y documentos oficiales.

- **Given** accedo a Archivos → **Then** lista con nombre, tipo y fecha (`arc.Archivos`, `arc.TiposArchivo`).
- **Given** descargo un documento → **Then** se registra en `arc.LogVisualizacionArchivos`.

**HU-ARC-02 [S] — Gestionar documentos (Admin)**

> Como administrador, quiero subir y organizar documentos oficiales.

---



### ANM — Anuncios

**HU-ANM-01 [S] — Ver anuncios del fraccionamiento**

> Como residente, quiero ver los comunicados publicados para estar al día.

- **Given** hay anuncios activos → **Then** los veo por tipo y fecha (`anm.Anuncios`, `anm.TiposAnuncio`); mi lectura se registra en `anm.LogVisualizacionAnuncios`.

**HU-ANM-02 [S] — Publicar anuncio (Admin)**

> Como administrador, quiero publicar comunicados generales para los residentes.

---



### RPT — Reportes

**HU-RPT-01 [S] — Reporte financiero mensual (Admin)**

> Como administrador, quiero generar un reporte del mes con cuotas cobradas, pendientes y morosos.

**HU-RPT-02 [C] — Reporte de tickets por período (Admin)**

> Como administrador, quiero exportar un reporte de tickets para evaluar tiempos de resolución y carga.

---



### WMS — Almacén

**HU-WMS-01 [C] — Consultar inventario (Admin)**

> Como administrador, quiero ver el inventario de herramientas y materiales con su stock.

- **Given** accedo a Almacén → **Then** veo los artículos con stock actual, stock mínimo y ubicación (`wms.Articulos`); los que están bajo mínimo se destacan.

**HU-WMS-02 [C] — Alta y ajuste de artículos (Admin)**

> Como administrador, quiero registrar artículos y ajustar existencias.

- **Given** registro un artículo con nombre, categoría, stock, stock mínimo y ubicación → **Then** queda disponible en el inventario, con auditoría (`Creado/UsuarioCreacionID/...`).
- **Given** ajusto el stock → **Then** el cambio queda registrado.

**HU-WMS-03 [C] — Préstamo y devolución de herramienta**

> Como administrador, quiero registrar el préstamo de una herramienta a un trabajador y su devolución para controlar existencias.

- **Given** presto un artículo a un trabajador con cantidad → **Then** se crea el préstamo (`wms.Prestamos`, estado PRESTADO) y el stock disponible baja.
- **Given** registro la devolución → **Then** el préstamo pasa a DEVUELTO y el stock se restablece.
- **(bot)** El trabajador puede consultar sus préstamos y solicitar herramienta desde «C500 Asiste».

---



### BOT — Bot de Telegram

**HU-BOT-01 [M] — Vincular cuenta de Telegram (por token, seguro)**

> Como residente con cuenta en el portal, quiero vincular mi cuenta al bot **sin escribir mi contraseña en el chat**.

- **Given** en el portal pulso "Vincular Telegram" → **Then** el backend genera un token de un solo uso (10 min) y me muestra un deep-link `t.me/<bot>?start=<token>` (equivale a enviar `/start <token>` al bot).
- **Given** abro el bot con ese enlace → **Then** el bot envía el token al backend, que lo valida y vincula mi `chat_id`; el bot confirma la vinculación.
- **Given** el token expiró o ya se usó → **Then** el bot responde "Enlace no válido o expirado. Genera uno nuevo desde el portal."

**HU-BOT-02 [M] — Abrir ticket desde Telegram**

> Como residente vinculado, quiero reportar una incidencia desde Telegram sin abrir el portal.

- **Given** envío `/tickets` → **Then** el bot muestra un menú con botones: "Ver mis tickets" y "Reportar incidencia".
- **Given** selecciono "Reportar incidencia" → **Then** el bot pide solo la categoría (botones) y una descripción corta (flujo rápido de HU-BOT-11); la prioridad queda *Media* y el administrador la ajusta.
- **Given** confirmo → **Then** el bot llama a `POST /TKT/Tickets` con mi JWT, crea el ticket con canal TELEGRAM y responde con el número y estado (**Nuevo**); los botones de confirmación desaparecen para evitar un doble envío.
- **Given** escribo `/cancelar` en cualquier paso → **Then** el flujo termina sin crear nada.
- **Given** no estoy vinculado → **Then** "Primero vincula tu cuenta desde el portal."

**HU-BOT-03 [M] — Consultar estado de cuenta desde Telegram**

> Como residente vinculado, quiero consultar mis cuotas desde Telegram.

- **Given** envío `/cuotas` → **Then** el bot responde con las últimas cuotas: período, monto y estado (Pagado/Pendiente/Vencida).
- **Given** tengo cuotas vencidas → **Then** el bot destaca el total adeudado.

**HU-BOT-04 [M] — Recibir notificaciones proactivas en Telegram**

> Como residente vinculado, quiero recibir notificaciones automáticas en Telegram.

- **Given** la administración registra mi pago → **Then** el notificador saliente me envía "✅ Tu pago de $X del período [..] fue registrado." y lo marca en `ntf.NotificacionesEntrega`.
- **Given** mi ticket cambia de estado → **Then** recibo "📋 Tu ticket #142 pasó a En seguimiento."
- **Given** falla el envío a Telegram → **Then** la entrega queda en estado FALLIDA y se reintenta sin duplicar (idempotencia por `NotificacionEntrega`).

**HU-BOT-05 [S] — Desvincular cuenta**

> Como residente, quiero desvincular mi Telegram sin eliminar mi cuenta del portal.

- **Given** envío `/desvincular` y confirmo → **Then** se desactiva mi vínculo en `bot.CuentasTelegram` y el bot confirma que ya no recibiré notificaciones.

---

**HU-BOT-06 [M] — Resolver dudas del sistema y del reglamento (RAG)**

> Como cualquier perfil, quiero preguntarle al bot en lenguaje natural tanto **cómo usar el sistema** (dónde veo mis cuotas, cómo subo evidencia, cómo aparto la terraza) como **reglas del reglamento** (mascotas, horarios, cuotas), y recibir una respuesta correcta que además me lleve a la acción.

- **Given** pregunto por el **uso del sistema** → **Then** el bot responde con la guía (base `ia.Documentos` fuente `ayuda-sistema`) y **ofrece el atajo** para hacerlo ahí mismo (botón directo a la acción).
- **Given** pregunto por el **reglamento/FAQ** → **Then** responde citando la fuente y registra la interacción en `ia.Consultas`.
- **Given** la confianza es baja o la duda excede lo documentado → **Then** lo dice y **escala** (abre ticket o deriva a administración), no inventa.

**HU-BOT-07 [S] — Sugerencias proactivas (cobro de adeudos y recordatorios)**

> Como residente, quiero que el bot me avise de adeudos, vacunas por renovar o encuestas abiertas, con la acción a un toque.

- **Given** tengo una cuota vencida → **Then** recibo "Tienes $X vencido del período [..]. ¿Ver cómo pagar?" con botón; queda registrado en `bot.Sugerencias`.
- **Given** atiendo o descarto la sugerencia → **Then** su estado se actualiza y no se repite (sin spam).

**HU-BOT-08 [S] — Reservar la terraza / área común por chat**

> Como residente, quiero apartar la terraza (u otra amenidad) desde el bot.

- **Given** pido reservar y el área/horario está libre (`vts.AreasComunes`, `RequiereReservacion=1`) → **Then** el bot crea la reserva (`vts.ReservacionesArea`) y confirma; si el reglamento fija aforo/costo, el asistente lo cita.
- **Given** el horario está ocupado → **Then** el bot ofrece alternativas.

**HU-BOT-09 [S] — El bot cubre todo el sistema**

> Como residente vinculado, quiero operar todo desde el bot: mascotas y vehículos, responder encuestas, ver anuncios y convocatorias de junta, generar mi pase de visita (QR) y editar mi perfil.

- **Given** elijo una acción del menú (o la pido en lenguaje natural) → **Then** el bot la resuelve llamando al endpoint de dominio correspondiente, con la misma autorización por perfil.
- **Given** no estoy vinculado → **Then** el bot me guía a vincular por token.

---

**HU-BOT-10 [M] — Trabajador: mi próxima tarea + evidencia (desde el chat)**

> Como trabajador de mantenimiento, quiero recibir mi próxima tarea en el chat, atenderla y subir la evidencia, sin entrar a la web.

- **Given** envío `/tarea` (o el bot me la ofrece) → **Then** veo el ticket asignado más prioritario (`tkt.TicketsUsuariosAsignados`) con lo mínimo: unidad, categoría y descripción.
- **Given** la comienzo → **Then** el ticket pasa a **En seguimiento** con un toque.
- **Given** la termino y **subo una foto** → **Then** la evidencia queda en `tkt.DocumentosTicket`, el ticket pasa a **Resuelto**, se notifica al residente y el bot me ofrece la siguiente tarea.

**HU-BOT-11 [M] — Levantar un ticket en segundos**

> Como residente, quiero levantar un ticket con el mínimo de pasos.

- **Given** toco «Reportar» → **Then** el bot pide solo la categoría (botones) y una descripción (foto opcional), y crea el ticket; el resto (unidad, solicitante) lo infiere del perfil, sin preguntarlo.

**HU-BOT-12 [S] — Administrador: administrar desde el chat**

> Como administrador del fraccionamiento, quiero operar el sistema desde el chat sin abrir la web.

- **Given** mi perfil es Administrador → **Then** puedo registrar un pago, publicar un aviso o una encuesta, asignar o cerrar tickets y pedir `/bi`, cada acción con confirmación de un toque y pidiendo solo lo indispensable.
- **Given** un residente intenta una acción de administración → **Then** el bot la rechaza por perfil.

**HU-BOT-13 [S] — Responder encuestas en el chat**

> Como residente, quiero responder las encuestas dentro del chat.

- **Given** hay una encuesta activa → **Then** el bot la presenta pregunta por pregunta con botones (opción múltiple) y registra mis respuestas (`enc.Respuestas`), sin pedir nada extra.

---



### BI — Inteligencia de negocio (Administrador)

**HU-BI-01 [M] — Tablero BI con tendencias**

> Como administrador, quiero un tablero con KPIs y su tendencia para decidir con datos.

- **Given** accedo al BI → **Then** veo cobranza y morosidad del período, tickets abiertos y tiempo medio de resolución, ocupación y adopción del bot (WEB vs TELEGRAM), con comparativa vs períodos anteriores (`bi.KpiSnapshots`).

**HU-BI-02 [S] — Exportar BI (PDF/Excel)**

> Como administrador, quiero exportar el reporte BI para la asamblea.

- **Given** genero el reporte → **Then** obtengo PDF (QuestPDF) y/o Excel (ClosedXML) con los KPIs y gráficas del período.

**HU-BI-03 [S] — Resumen BI por Telegram**

> Como administrador del fraccionamiento, quiero pedir `/bi` al bot y recibir un resumen ejecutivo redactado por el asistente.

- **Given** envío `/bi` con perfil Administrador → **Then** el bot responde con los indicadores clave y 2–3 hallazgos en lenguaje natural (IA sobre `bi.KpiSnapshots` + vistas), con opción de recibir el PDF.
- **Given** un residente intenta `/bi` → **Then** el bot lo rechaza por perfil insuficiente.

---



### Roadmap por fases (alcance completo, secuenciado)

Se conservan los 15 módulos; para que el backlog "quepa en un sprint con presupuesto y buffer" (y no sea "todo MVP"), se ordena en fases con un corte demo-able al final de la Fase 1. **MoSCoW** `[M]` marca importancia de negocio; **Fase N** marca secuencia de construcción (ver §5.0).

- **Fase 0 (habilitadores, inicio de Entrega 2):** SETUP-000 (scaffolds API/Web + CI), DB-000 (esquema idempotente), DB-001 (alineación al modelo), DB-002 (catálogos + admin inicial).
- **Fase 1 (MVP demo-able, end-to-end):** USR (login, cambio de contraseña, perfil, alta de residentes), TKT (crear/consultar/gestionar/resolver), FNZ (generar cuotas + estado de cuenta + registrar pago + morosos), NTF (avisos internos), Dashboard. Es el corte que se demuestra funcionando de punta a punta.
- **Fase 2 (canal Telegram + participación):** BOT (vinculación por token, `/tickets`, `/cuotas`, `/tarea`, notificaciones proactivas y **sugerencias de cobro**), adjuntos de tickets y ARC (archivos), ENC (encuestas + resultados), ANM (anuncios).
- **Fase 3 (operación ampliada + inteligencia):** JNT (juntas), VTS (visitas/pases QR + reserva de áreas comunes por bot), VEH, MAS (con vacunas), RPT, **WMS — Almacén** (modelado nuevo), el **asistente IA/RAG** (HU-BOT-06/09) y el **BI para admin** (HU-BI-01/03).

> Nota de estimación: las estimaciones por historia se calibran contra el presupuesto de puntos del sprint con un buffer (~30%), en lugar de marcar todo como MVP. Las extensiones de esquema que antes eran condicionales (categoría y canal de ticket, comentario interno, vacunas) ya forman parte del modelo (§3.3) y quedan disponibles tras DB-001/DB-002; las historias de Telegram dependen explícitamente de BOT-BE-004.

---

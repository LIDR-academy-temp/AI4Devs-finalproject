# specs/encuestas.md — Encuestas (source of truth SDD)
> Contexto de dominio para SDD-Nice; se lee en /definir antes de spec.md. Solo lo verificado; lo nuevo del proyecto se marca (delta).
#encuestas #enc #consultas #participacion #resultados

## Propósito
Dominio de encuestas estructuradas (esquema `enc`). El administrador crea encuestas con preguntas tipadas y opciones; los residentes las responden dentro de vigencia (portal o Telegram); los resultados son consolidables por opción porque cada respuesta referencia la `OpcionPregunta` elegida. NO hay entidad Vote/votación: la consolidación se hace agregando `Respuestas`.

## Objetos del dominio (tablas + vistas reales)
- `enc.Encuestas` — EncuestaID(PK), Titulo, Descripcion, FechaInicio, FechaFin, bActivo.
- `enc.Preguntas` — PreguntaID(PK), EncuestaID(FK), TipoPreguntaID(FK), Orden, Requerida.
- `enc.OpcionesPregunta` — OpcionPreguntaID(PK), PreguntaID(FK), Texto, Valor, Orden.
- `enc.Respuestas` — EncuestaID(FK), PreguntaID(FK), UsuarioID(FK), OpcionPreguntaID(FK), RespuestaTexto.
- `enc.TiposPregunta` — catálogo del tipo de pregunta.
- Lecturas consolidadas vía joins (no hay vista `vs` dedicada de encuestas). Auditoría estándar + soft delete `bEliminado`.

## Catálogos y estados
- `enc.TiposPregunta` — catálogo de tipos de pregunta (p. ej. opción múltiple / texto libre; valores exactos `(asumido)`, definidos por seed).
- Estado de la encuesta: **Inactiva/borrador** (`bActivo=0`) vs **Publicada/activa** (`bActivo=1`); además la vigencia por `FechaInicio`/`FechaFin`.
- "Responde por opción" vs "texto libre" según el `TipoPreguntaID` de cada pregunta.

## Invariantes (INV-x)
- **INV-1** Una encuesta recién creada queda inactiva (`bActivo=0`) hasta publicarse; al publicar (`bActivo=1`) se notifica a los residentes activos (portal y Telegram).
- **INV-2** Una encuesta solo es respondible si está activa (`bActivo=1`) y dentro de vigencia (`FechaInicio <= hoy <= FechaFin`).
- **INV-3** Un usuario responde una encuesta una sola vez; si ya participó recibe "Ya participaste. Tu respuesta fue registrada."
- **INV-4** Cada `enc.Respuestas` a una pregunta de opción referencia una `OpcionPreguntaID` válida de esa pregunta; las de texto libre usan `RespuestaTexto`.
- **INV-5** Las preguntas marcadas `Requerida` deben responderse para completar la encuesta.
- **INV-6** El orden de preguntas y opciones respeta la columna `Orden`.
- **INV-7** Los resultados de opción múltiple se consolidan contando `Respuestas.OpcionPreguntaID` (conteo y porcentaje por opción); soft delete `bEliminado` conserva el histórico.

## Historias del dominio
- **HU-ENC-01 [S]** Participar en encuesta — con encuesta activa y vigente, el residente ve el aviso y responde cada pregunta; bloquea segunda participación y encuestas fuera de vigencia.
- **HU-ENC-02 [S]** Crear y publicar encuesta (Admin) — crear con título, vigencia, preguntas tipadas y opciones (queda inactiva); publicar (`bActivo=1`) notifica a residentes activos (portal + Telegram).
- **HU-ENC-03 [S]** Ver resultados consolidados — **Admin:** por opción conteo/%; texto libre con listado `RespuestaTexto`. **Residente (post [[FE-ENC-RES-001]]):** mismos agregados numéricos si participó o encuesta cerrada; texto libre solo conteo (`totalRespuestasTexto`), sin respuestas identificables.
- **HU-BOT-13 [S]** Responder encuestas en el chat — el bot presenta la encuesta activa pregunta por pregunta con botones (opción múltiple) y registra en `enc.Respuestas`.

## Endpoints Cuarta (SPA + bot) — vigente post [[FE-MOD-ENC-001]]

- `GET /ENC/Encuestas` — listado admin; `GET /ENC/Encuestas/activas` — residente.
- `POST /ENC/Encuestas` — crear borrador (`preguntas` puede ir vacío).
- `PUT /ENC/Encuestas/{id}` — metadatos solo si `bActivo=0`.
- `DELETE /ENC/Encuestas/{id}` — borrador solo.
- `PUT /ENC/Encuestas/{id}/publicar` — activa; 422 `SIN_PREGUNTAS` sin preguntas.
- `GET /ENC/Encuestas/{id}` — detalle con preguntas/opciones.
- `GET /ENC/Encuestas/{id}/resultados` — agregados; **admin** siempre (textos libres completos); **residente** si participó o encuesta cerrada (`403` vigente sin votar; `404` borrador).
- `POST /ENC/Encuestas/{id}/respuestas` — residente (una vez, INV-3).
- **Preguntas/opciones (admin, anidado):** `POST/PUT/DELETE` bajo `/ENC/Encuestas/.../preguntas` y `/ENC/Encuestas/opciones/{id}` (ver `TKT-FE-MOD-ENC-001-APIS.md`).
- `GET /ENC/TiposPregunta` — catálogo admin (`tipoPreguntaId` + nombre).
- Legacy `*/legacy` — no usar desde SPA Cuarta.

## UI admin (React)

- `/admin/encuestas` — bandeja + panel metadatos.
- `/admin/encuestas/:id` — preguntas/opciones.
- `/admin/encuestas/:id/resultados` — resultados.

## UI residente

- `/encuestas`, `/encuestas/:id` — participar.
- `/encuestas/:id/resultados` — resultados agregados (post [[FE-ENC-RES-001]]).

## Reutilización / objetos existentes (escalera)
- El modelo estructurado (Encuestas → Preguntas → OpcionesPregunta → Respuestas) ya permite consolidar por opción — NO añadir tabla Vote/Votación.
- Reusar `enc.TiposPregunta` para distinguir opción múltiple vs texto libre — no hardcodear tipos.
- La consolidación es una agregación (COUNT/GROUP BY) sobre `Respuestas` — resolverla en el servicio con Dapper, no con SP.
- El bot llama a los mismos endpoints REST con el JWT del residente — no duplicar la lógica de encuestas.

## Deltas del proyecto (nuevo)
- **(delta)** Notificación de "encuesta publicada" a Telegram (tipo `ENCUESTA_PUBLICADA`) vía notificador saliente + `ntf.NotificacionesEntrega` (ver dominios Notificaciones/Bot).
- **(delta)** Sugerencia proactiva de participación en `bot.Sugerencias` (Tipo ENCUESTA) — no altera el esquema `enc`.

## Notas
- Sin stored procedures: Dapper + servicios C# + joins/agregaciones; validación con FluentValidation; transacciones vía `IDbTransaction`.
- Nombres reales del esquema español (`enc`); soft delete con `bEliminado` (NO `IsActive`).
- No hay vista `vs` propia de encuestas; las lecturas consolidadas se resuelven por joins.

## Changelog

| Fecha | Requerimiento | Cambio |
|-------|---------------|--------|
| 2026-10-28 | [[FE-ENC-RES-001]] | GET resultados autorizado residente (participó/cierre); DTO público sin textos libres crudos; UI `/encuestas/:id/resultados`. |
| 2026-10-26 | [[FE-MOD-ENC-001]] | Admin encuestas 3 superficies; CRUD JWT preguntas/opciones anidado; publicar con gate de preguntas; spec endpoints Cuarta actualizado. |
| 2026-10-26 | [[FE-CRUD-002]] | Bandeja admin + `ResultadosEncuestaPage` al patrón CRUD admin; fix `apiGet`; publicar con `ConfirmDialog` (sin cambio API). |

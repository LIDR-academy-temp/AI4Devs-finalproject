# JNT-BE-025: Delta — Juntas API Cuarta

## Endpoints nuevos

| Verbo | Ruta | Auth | Respuesta OK |
|-------|------|------|--------------|
| GET | /JNT/Juntas | JWT | 200 `JuntaListItemDto[]` |
| GET | /JNT/Juntas/{id} | JWT | 200 `JuntaDetalleDto` (con archivos) |
| POST | /JNT/Juntas | JWT Admin | 201 `JuntaDetalleDto` |
| PUT | /JNT/Juntas/{id} | JWT Admin | 204 |
| DELETE | /JNT/Juntas/{id} | JWT Admin | 204 |

## SQL ejecutado en runtime

| Operación | Tabla | Descripción |
|-----------|-------|-------------|
| SELECT | jnt.Juntas | Listar WHERE bEliminado=0 ORDER BY FechaProgramada DESC |
| SELECT + LEFT JOIN | jnt.Juntas + jnt.JuntaDetalle | Detalle de junta por ID |
| SELECT | jnt.JuntaDetalleArchivos | Archivos del detalle (segunda query) |
| INSERT + SCOPE_IDENTITY | jnt.Juntas | Crear junta |
| INSERT | jnt.JuntaDetalle | Crear detalle/acta (opcional, dentro de tx) |
| UPDATE COALESCE | jnt.Juntas | Actualizar campos opcionales |
| UPDATE / INSERT | jnt.JuntaDetalle | Actualizar o crear detalle si Contenido presente |
| UPDATE bEliminado=1 | jnt.Juntas | Soft-delete |

## Códigos de error de negocio

| Code | Status | Condición |
|------|--------|-----------|
| JNT_TITULO_REQUERIDO | 422 | Titulo vacío o nulo al crear |
| JNT_FECHA_REQUERIDA | 422 | FechaProgramada == default al crear |
| JNT_NOT_FOUND | 404 | juntaId no existe o bEliminado=1 al actualizar/eliminar |

## Tests

- xUnit: 5/5 ✅

## Decisiones clave

- `ActualizarAsync` usa COALESCE para patch semántico en PUT (sólo actualiza campos no-null).
- Si en la actualización hay Contenido pero no existe jnt.JuntaDetalle para esa junta, se crea automáticamente (upsert implícito).
- Transacciones manuales con `IDbConnection.BeginTransaction()` en el servicio.
- Controladores legacy (JuntaDetalle, JuntaDetalleArchivos) preexisten con patrón UserID/WindowName; no se modificaron en este ticket.

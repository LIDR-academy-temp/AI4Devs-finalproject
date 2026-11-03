# 6. Manejo y mantenimiento de comentarios

## Objetivo

Adaptar al módulo documental de VES a un patrón de trabajo trazable: comentarios organizados, estados claros, responsables, historial y reglas para mantenerlos sincronizados con el documento.

Este diseño se refiere a comentarios de usuarios sobre documentos. Los comentarios de código y de documentación técnica se mantienen mediante revisión de cambios y actualización de los documentos correspondientes.

## Situación actual de VES

En el código analizado no se observa una entidad, tabla, procedimiento ni servicio de comentarios para `STI_Documentos`.

Por tanto, no se debe intentar reutilizar `DataSet` o campos de `STI_Documentos` para guardar comentarios. El comentario debe ser una entidad independiente relacionada por `CodigoDocumento`.

## Entidad propuesta

Nombre conceptual: `DocumentoComentario`.

```text
DocumentoComentario
- Id
- CodigoDocumento (FK)
- IdComentarioPadre (FK opcional)
- Texto
- Estado
- AutorLogin
- FechaCreacion
- FechaActualizacion
- FechaResolucion (opcional)
- ResueltoPor (opcional)
- VersionDocumento (opcional)
```

Para conservar la trazabilidad de los cambios de estado se propone una entidad append-only independiente:

```text
DocumentoComentarioHistorialEstado
- Id
- ComentarioId (FK -> DocumentoComentario)
- EstadoAnterior (opcional para el estado inicial)
- EstadoNuevo
- CambiadoPorLogin
- FechaCambio
```

`DocumentoComentario.Estado` representa el estado actual del comentario. `DocumentoComentarioHistorialEstado` conserva la secuencia completa de transiciones. Los registros históricos son **append-only**: una transición registrada no se modifica ni se elimina cuando el comentario cambia nuevamente de estado. Esto permite reconstruir secuencias como `Resuelto -> Reabierto -> Archivado` sin perder información previa.

### Estados

- `Abierto`: requiere atención.
- `En revisión`: alguien está trabajando en él.
- `Resuelto`: la observación fue atendida.
- `Reabierto`: volvió a requerir atención.
- `Archivado`: se conserva para historial, pero ya no aparece por defecto.

Para el contrato de la API, cada estado funcional se representa con un valor estable en JSON:

| Estado funcional | Valor API |
| --- | --- |
| Abierto | `open` |
| En revisión | `in_review` |
| Resuelto | `resolved` |
| Reabierto | `reopened` |
| Archivado | `archived` |

Los nombres funcionales en español son una propuesta y deben validarse con los usuarios antes de crear tablas o procedimientos. Los valores API anteriores forman el contrato técnico y deben mantenerse sincronizados con `CommentStatus` en `api-spec.yml`.

## Hilos y respuestas

`IdComentarioPadre` permite que un comentario tenga respuestas y forme un hilo.

```text
Documento
  +-- Comentario raíz
       +-- Respuesta
       +-- Respuesta
            +-- Respuesta
```

La interfaz debe mostrar cada hilo ordenado por fecha, con el comentario raíz visible y sus respuestas agrupadas.

## Reglas de mantenimiento

1. Un comentario pertenece a un único documento.
2. El autor puede editar su comentario mientras esté abierto, según los permisos funcionales simulados.
3. Resolver un comentario no lo elimina.
4. Reabrir un comentario conserva el historial anterior.
5. Un comentario archivado no debe desaparecer de la auditoría.
6. El backend debe verificar, mediante el mock de seguridad, que el usuario simulado tenga acceso al documento antes de leer o modificar sus comentarios.
7. Las eliminaciones físicas deben evitarse; usar archivado o eliminación lógica.
8. El texto debe validarse en backend, incluyendo longitud máxima y contenido vacío.
9. Cada cambio de estado debe guardar quién lo realizó y cuándo.
10. Cada transición de estado debe agregar un registro inmutable en `DocumentoComentarioHistorialEstado`; no debe sobrescribirse el historial previo.

## Flujo funcional

```text
Abrir documento
      |
      v
Consultar comentarios activos
      |
      v
Crear comentario o respuesta
      |
      v
Asignar estado abierto
      |
      +--> responder / editar
      |
      +--> marcar en revisión
      |
      +--> resolver
                |
                +--> reabrir si la respuesta no es suficiente
                +--> archivar cuando termine el ciclo
```

## API propuesta

```text
GET    /api/documents/{documentId}/comments
POST   /api/documents/{documentId}/comments
POST   /api/documents/{documentId}/comments/{commentId}/replies
PUT    /api/documents/{documentId}/comments/{commentId}
PATCH  /api/documents/{documentId}/comments/{commentId}/status
DELETE /api/documents/{documentId}/comments/{commentId}
GET    /api/documents/{documentId}/comments/history
```

La eliminación debe representar archivado o baja lógica, no borrar el historial sin autorización explícita.

## Contrato de comentario

```json
{
  "id": 15,
  "documentId": 42,
  "parentCommentId": null,
  "text": "Actualizar la fecha de vigencia.",
  "status": "open",
  "author": {
    "login": "usuario"
  },
  "createdAt": "2026-09-17T10:30:00Z",
  "updatedAt": "2026-09-17T10:30:00Z",
  "replies": []
}
```

### Contrato de historial de estados

`GET /api/documents/{documentId}/comments/history` debe devolver las transiciones registradas de forma que pueda reconstruirse el historial de los comentarios del documento. Cada elemento debe identificar el comentario al que pertenece.

```json
{
  "items": [
    {
      "id": 47,
      "commentId": 15,
      "previousStatus": "resolved",
      "newStatus": "reopened",
      "changedBy": "usuario",
      "changedAt": "2026-09-23T14:20:00Z"
    }
  ]
}
```

La primera transición puede utilizar `previousStatus: null` cuando represente la creación inicial del comentario en estado `open`.

El frontend React debe consumir este contrato tipado. No debe conocer tablas SQL, procedimientos almacenados ni `DataSet`.

## Componentes React propuestos

```text
features/comments/
  api/commentsApi.ts
  components/CommentThread.tsx
  components/CommentComposer.tsx
  components/CommentStatusControl.tsx
  components/CommentHistory.tsx
  pages/DocumentCommentsPanel.tsx
  schemas/commentSchemas.ts
  types/commentTypes.ts
```

El panel de comentarios puede aparecer en `DocumentDetailsPage` y posteriormente en el editor, cuando las reglas de negocio estén aprobadas.

## Permisos

La seguridad real está fuera del alcance del proyecto. Para los comentarios se utilizará el mismo mock de seguridad del módulo documental, con identidad y permisos simulados para:

- consultar comentarios
- crear comentarios
- editar comentarios propios
- cambiar estado
- archivar comentarios
- consultar historial

La UI puede ocultar acciones no permitidas, pero la API debe volver a validar cada operación contra el contexto simulado. No se realizarán llamadas a `SeguridadVES`; su modelo se utiliza únicamente como referencia del sistema legacy.

## Persistencia y transición

### Fase inicial

Crear un adaptador de comentarios separado de `Documentos.vb`. Si todavía no se usa ORM, puede invocar procedimientos almacenados nuevos y devolver DTOs tipados.

### Fase ORM

Mapear `DocumentoComentario` y `DocumentoComentarioHistorialEstado` a entidades ORM y conservar la API sin cambios. La migración de persistencia no debe obligar a modificar React.

### Integración con el legado

No se recomienda añadir lógica de comentarios directamente a las páginas `.aspx.vb`. La nueva funcionalidad debe vivir detrás de la API propuesta y relacionarse con el documento mediante su identificador.

## Relación con el patrón de lidr-specboot

Se reutilizan estas ideas:

- fuente única para el estado actual del trabajo
- cambios pequeños y revisables
- estados explícitos
- historial antes que borrado
- revisión separada de implementación
- documentación actualizada cuando cambia el comportamiento

No se copia literalmente su estructura de agentes o skills dentro de la aplicación, porque esas piezas sirven para el proceso de desarrollo, no para los usuarios finales de VES.

## Criterios de aceptación iniciales

- un usuario autorizado puede crear un comentario sobre un documento
- una respuesta queda agrupada en el hilo correcto
- el comentario puede pasar por estados definidos
- el historial conserva autor, fecha y cambio realizado
- un usuario sin permiso no puede leer ni modificar comentarios
- el documento puede seguir consultándose aunque no tenga comentarios
- la funcionalidad puede convivir con Web Forms durante un piloto

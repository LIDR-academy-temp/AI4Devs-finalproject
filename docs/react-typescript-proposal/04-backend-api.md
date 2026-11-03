# 4. Backend y contrato API

## Objetivo

Exponer una API HTTP pequeña que encapsule los servicios y procedimientos actuales del módulo documental.

## Endpoints iniciales

```text
GET    /api/document-types
GET    /api/documents
GET    /api/documents/{id}
POST   /api/documents
PUT    /api/documents/{id}
POST   /api/documents/{id}/file
GET    /api/documents/{id}/file
DELETE /api/documents/{id}
```

## Reglas del contrato

- JSON consistente para respuestas y errores
- paginación explícita en listados
- filtros por tipo y texto
- validación de fechas y campos requeridos
- `multipart/form-data` para carga de archivos
- descarga con `Content-Type` y nombre de archivo correctos
- validación de tipo y tamaño del archivo en backend, independientemente de las validaciones del frontend
- códigos HTTP previsibles: `200`, `201`, `400`, `401`, `403`, `404`, `409`, `413`, `415`, `500`

## Seguridad simulada

La seguridad real no forma parte del alcance del proyecto. La API utilizará un mock de seguridad para proporcionar una identidad y permisos simulados a los casos de uso.

- `401` representa el escenario de prueba en el que no existe una identidad simulada.
- `403` representa el escenario de prueba en el que existe una identidad simulada pero no posee el permiso funcional requerido.
- el backend debe evaluar estos permisos simulados antes de ejecutar las operaciones protegidas;
- no se implementará inicio de sesión real, validación de tokens, proveedor de identidad ni integración con `SeguridadVES`.

El contrato OpenAPI documenta `401` y `403` para representar estos comportamientos funcionales, pero no define un `securityScheme` productivo porque dicha integración está fuera del alcance.

### Reglas de carga de archivos

La carga de archivos debe cumplir inicialmente las siguientes restricciones contractuales:

- tamaño máximo por archivo: **25 MB**
- PDF: `.pdf` (`application/pdf`)
- Microsoft Word: `.doc` (`application/msword`) y `.docx` (`application/vnd.openxmlformats-officedocument.wordprocessingml.document`)
- Microsoft Excel: `.xls` (`application/vnd.ms-excel`) y `.xlsx` (`application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`)
- Microsoft PowerPoint: `.pptx` (`application/vnd.openxmlformats-officedocument.presentationml.presentation`)

El backend debe rechazar archivos que no cumplan estas reglas. El comportamiento HTTP esperado es:

- `400 Bad Request`: archivo ausente, vacío o solicitud `multipart/form-data` inválida
- `413 Payload Too Large`: archivo superior a 25 MB
- `415 Unsupported Media Type`: extensión o tipo MIME no permitido

Estas restricciones forman parte del contrato y deben mantenerse sincronizadas con `api-spec.yml` antes de implementar el endpoint de carga. La normalización de nombres de archivo, el aislamiento del almacenamiento y reglas adicionales de `Content-Disposition` quedan fuera de este cambio mientras no se adopten explícitamente como requisitos contractuales.

## Modelo de respuesta de listado

```json
{
  "items": [],
  "page": 1,
  "pageSize": 20,
  "total": 0
}
```

## Adaptación del legado

La API debe usar un adaptador interno para traducir:

- `DataSet` a DTOs tipados
- nombres legacy a nombres del contrato
- errores SQL o SOAP a errores HTTP
- identidad y permisos suministrados por el mock de seguridad a autorización funcional de los casos de uso

`SeguridadVES` se mantiene únicamente como referencia del sistema legacy analizado; este proyecto no implementa un adaptador ni realiza llamadas a ese módulo.

El frontend no debe conocer procedimientos almacenados ni nombres de esquemas SQL.

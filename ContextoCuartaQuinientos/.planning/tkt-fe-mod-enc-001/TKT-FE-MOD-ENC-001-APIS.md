# APIs — Módulo encuestas admin (FE-MOD-ENC-001)

REST CuartaQuinientos (`GraphApi`). SPA: `Authorization: Bearer <JWT>`; admin en mutaciones con rol **Administrador**. Errores de negocio: `ProblemDetails` con extensión `code` (ej. `SIN_PREGUNTAS`).

- **Base local:** `https://localhost:7242` (perfil https) o `http://localhost:5000`
- **Prefijo:** `/ENC/...` (sin `/api`)

---

## Catálogo

### `GET /ENC/TiposPregunta` (admin)

Lista tipos para selects en detalle de preguntas.

Response `200` (array, camelCase en JSON):

```json
[
  { "tipoPreguntaId": 6, "tipoPregunta": "Opción múltiple" },
  { "tipoPreguntaId": 1, "tipoPregunta": "Texto libre" }
]
```

> Enviar **`tipoPreguntaId`** al crear/actualizar preguntas; el nombre es referencia.

---

## Encuestas — admin

### `GET /ENC/Encuestas` (admin)

Bandeja admin.

```json
[
  {
    "encuestaId": 1,
    "titulo": "Encuesta prueba",
    "descripcion": "…",
    "activa": false,
    "fechaInicio": "2026-10-23T00:00:00Z",
    "fechaFin": null,
    "yaParticipo": false
  }
]
```

### `POST /ENC/Encuestas` (admin)

Borrador solo metadatos (`preguntas` vacío permitido).

Body:

```json
{
  "titulo": "Nueva encuesta",
  "descripcion": "Opcional",
  "fechaInicio": "2026-10-23T00:00:00Z",
  "fechaFin": null,
  "preguntas": []
}
```

Response `201`: `EncuestaDetalleDto` (incluye `encuestaId`, `preguntas: []`).

### `PUT /ENC/Encuestas/{id}` (admin)

Solo borrador (`activa: false`). Metadatos.

```json
{
  "titulo": "Título actualizado",
  "descripcion": "…",
  "fechaInicio": "2026-10-23T00:00:00Z",
  "fechaFin": "2026-12-31T23:59:59Z"
}
```

Response `204` o `ProblemDetails` si ya publicada.

### `DELETE /ENC/Encuestas/{id}` (admin)

Solo borrador. Response `204`.

### `PUT /ENC/Encuestas/{id}/publicar` (admin)

Activa la encuesta. Requiere ≥1 pregunta; si no: `422` + `code: SIN_PREGUNTAS`.

Response `204`.

### `GET /ENC/Encuestas/{id}` (admin o residente)

Detalle con preguntas y opciones.

### `GET /ENC/Encuestas/{id}/resultados` (admin)

```json
{
  "titulo": "Encuesta anual",
  "totalParticipantes": 3,
  "preguntas": [
    {
      "preguntaId": 10,
      "texto": "¿Aprueba?",
      "tipoPregunta": "Opción múltiple",
      "opciones": [
        { "opcionPreguntaId": 1, "texto": "Sí", "conteo": 2, "porcentaje": 66.7 }
      ],
      "respuestasTexto": []
    }
  ]
}
```

---

## Preguntas y opciones (admin, bajo `/ENC/Encuestas`)

### `POST /ENC/Encuestas/{encuestaId}/preguntas`

```json
{
  "texto": "¿Pregunta?",
  "tipoPreguntaId": 6,
  "tipoPregunta": "Opción múltiple",
  "orden": 1,
  "requerida": true,
  "opciones": [
    { "texto": "Sí", "orden": 1 },
    { "texto": "No", "orden": 2 }
  ]
}
```

Response `201` con pregunta creada.

### `PUT /ENC/Encuestas/preguntas/{preguntaId}`

Mismos campos que crear (sin `opciones` en body; opciones vía endpoints de opción).

### `DELETE /ENC/Encuestas/preguntas/{preguntaId}`

Response `204`.

### `POST /ENC/Encuestas/preguntas/{preguntaId}/opciones`

```json
{ "texto": "Tal vez", "orden": 3 }
```

### `PUT /ENC/Encuestas/opciones/{opcionId}`

```json
{ "texto": "Sí", "valor": null, "orden": 1 }
```

### `DELETE /ENC/Encuestas/opciones/{opcionId}`

Response `204`.

---

## Residente (sin cambio de contrato en este TKT)

| Método | Ruta |
|--------|------|
| GET | `/ENC/Encuestas/activas` |
| POST | `/ENC/Encuestas/{id}/respuestas` |

---

## Resumen endpoints nuevos/modificados (delta TKT)

| Método | Ruta |
|--------|------|
| GET | `/ENC/TiposPregunta` |
| PUT | `/ENC/Encuestas/{id}` |
| DELETE | `/ENC/Encuestas/{id}` |
| POST | `/ENC/Encuestas/{encuestaId}/preguntas` |
| PUT | `/ENC/Encuestas/preguntas/{preguntaId}` |
| DELETE | `/ENC/Encuestas/preguntas/{preguntaId}` |
| POST | `/ENC/Encuestas/preguntas/{preguntaId}/opciones` |
| PUT | `/ENC/Encuestas/opciones/{opcionId}` |
| DELETE | `/ENC/Encuestas/opciones/{opcionId}` |

Pruebas manuales: [FE-MOD-ENC-001_api_tests.http](FE-MOD-ENC-001_api_tests.http).

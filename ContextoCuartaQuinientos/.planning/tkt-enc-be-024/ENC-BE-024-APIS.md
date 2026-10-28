# APIs — Encuestas (`ENC`)

REST JWT para crear/publicar encuestas, responder (residente) y ver resultados (admin). Legacy en `*/legacy`.

- **Base URL (local):** `http://localhost:5180`
- **Auth:** `Authorization: Bearer <JWT>`
- **Errores:** `ProblemDetails` + `code` (`YA_PARTICIPO`, `ENCUESTA_CERRADA`, `OPCION_INVALIDA`, …)
- **Pruebas:** `ENC-BE-024_api_tests.http`
- **Seed:** `SQL/DB-004_enc_seed.sql` (mínimo: Opción múltiple, Texto libre)

---

## 1. Catálogo

### `GET /ENC/TiposPregunta`

**Respuesta `200`** (ejemplo CQ500 hub; en local tras DB-004 pueden variar los nombres):

```json
[
  { "tipoPreguntaId": 1, "tipoPregunta": "Texto libre" },
  { "tipoPreguntaId": 2, "tipoPregunta": "Opción única" }
]
```

---

## 2. Encuestas

| Verbo | Ruta | Rol |
|--------|------|-----|
| GET | `/ENC/Encuestas/activas` | JWT residente |
| GET | `/ENC/Encuestas` | Admin |
| GET | `/ENC/Encuestas/{id}` | JWT (detalle + preguntas/opciones) |
| POST | `/ENC/Encuestas` | Admin (borrador `bActivo=0`) |
| PUT | `/ENC/Encuestas/{id}/publicar` | Admin (`204`) |
| POST | `/ENC/Encuestas/{id}/respuestas` | JWT (`204`) |
| GET | `/ENC/Encuestas/{id}/resultados` | Admin |

**Lista activa — item:**

```json
{
  "encuestaId": 1,
  "titulo": "Satisfacción",
  "descripcion": null,
  "fechaInicio": "2026-10-19T00:00:00Z",
  "fechaFin": "2026-12-31T23:59:59Z",
  "activa": true,
  "yaParticipo": false
}
```

**POST crear (admin):**

```json
{
  "titulo": "Encuesta prueba",
  "descripcion": "Opcional",
  "fechaInicio": "2026-10-19T00:00:00Z",
  "fechaFin": "2026-12-31T23:59:59Z",
  "preguntas": [
    {
      "texto": "¿Aprueba?",
      "tipoPregunta": "Opción múltiple",
      "orden": 1,
      "requerida": true,
      "opciones": [
        { "texto": "Sí", "valor": "1", "orden": 1 },
        { "texto": "No", "valor": "0", "orden": 2 }
      ]
    }
  ]
}
```

**POST respuestas (residente):**

```json
{
  "respuestas": [
    { "preguntaId": 10, "opcionPreguntaId": 25 },
    { "preguntaId": 11, "respuestaTexto": "Comentario libre" }
  ]
}
```

**Errores frecuentes:**

| HTTP | `code` | Cuándo |
|------|--------|--------|
| 409 | `YA_PARTICIPO` | Segunda participación |
| 422 | `ENCUESTA_CERRADA` | No vigente o no publicada |
| 400 | `OPCION_INVALIDA` | Opción no pertenece a la pregunta |

---

## Resumen endpoints

| Método | Ruta |
|--------|------|
| GET | `/ENC/TiposPregunta` |
| GET | `/ENC/Encuestas/activas` |
| GET | `/ENC/Encuestas` |
| GET | `/ENC/Encuestas/{id}` |
| POST | `/ENC/Encuestas` |
| PUT | `/ENC/Encuestas/{id}/publicar` |
| POST | `/ENC/Encuestas/{id}/respuestas` |
| GET | `/ENC/Encuestas/{id}/resultados` |

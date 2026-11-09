# APIs — Resultados de encuesta para residentes (ENC)

Cambio en **un** endpoint REST existente. Autenticación JWT (`Authorization: Bearer`).

- **Base URL (local):** `http://localhost:5180`
- **Ruta:** `/ENC/Encuestas/{id}/resultados`

---

## 1. Consulta de resultados

### `GET /ENC/Encuestas/{id}/resultados` — **CAMBIO** (antes solo admin)

| Quién | Condición | HTTP |
|-------|-----------|------|
| Administrador | Encuesta existe (`bEliminado=0`) | 200 |
| Residente | Participó **o** encuesta ya no vigente (cerrada por `FechaFin`) y publicada (`bActivo=1`) | 200 |
| Residente | Vigente y **no** participó | 403 |
| Residente | Borrador / no publicada | 404 |

**Headers**

```
Authorization: Bearer <jwt>
```

**Response 200 — admin (textos libres completos)**

Ejemplo de contrato (misma forma que antes):

```json
{
  "encuestaId": 1,
  "titulo": "Encuesta anual",
  "totalParticipantes": 3,
  "preguntas": [
    {
      "preguntaId": 10,
      "texto": "¿Aprueba?",
      "tipoPregunta": "Opción múltiple",
      "opciones": [
        { "opcionPreguntaId": 1, "texto": "Sí", "conteo": 2, "porcentaje": 66.67 }
      ],
      "respuestasTexto": [],
      "totalRespuestasTexto": 0
    }
  ]
}
```

**Response 200 — residente (preguntas tipo texto anonimizadas)**

```json
{
  "encuestaId": 1,
  "titulo": "Encuesta anual",
  "totalParticipantes": 3,
  "preguntas": [
    {
      "preguntaId": 11,
      "texto": "Comentarios",
      "tipoPregunta": "Texto",
      "opciones": [],
      "respuestasTexto": [],
      "totalRespuestasTexto": 5
    }
  ]
}
```

> El front **no** debe mostrar `respuestasTexto` al residente; usar `totalRespuestasTexto` para preguntas abiertas.

**Response 403 — vigente sin votar**

```json
{
  "type": "https://tools.ietf.org/html/rfc9110#section-15.5.4",
  "title": "ENCUESTA_RESULTADOS_BLOQUEADOS",
  "status": 403,
  "detail": "Debes participar para ver los resultados mientras la encuesta esté vigente.",
  "code": "ENCUESTA_RESULTADOS_BLOQUEADOS"
}
```

**Response 404** — encuesta inexistente, eliminada o borrador para residente (`title`: `NOT_FOUND`).

---

## Resumen

| Método | Ruta | Tipo |
|--------|------|------|
| GET | `/ENC/Encuestas/{id}/resultados` | CAMBIO (auth residente + DTO público) |

Pruebas manuales: [FE-ENC-RES-001_api_tests.http](FE-ENC-RES-001_api_tests.http)

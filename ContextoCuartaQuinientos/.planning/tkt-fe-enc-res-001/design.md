[← spec](spec.md) | [← index](_index.md)

# design.md — FE-ENC-RES-001

## Estrategia

Relajar autorización en **`CuartaEncuestasService.ObtenerResultadosAsync`**: añadir parámetros `usuarioId`, `esAdmin` y reglas de visibilidad; controller deja de usar solo `SoloAdministrador` en GET resultados (mantener admin sin restricción).

Reusar **`ResultadosEncuestaPage`** con prop `variant: 'admin' | 'residente'` o página delgada `EncuestaResultadosResidentePage.tsx` que comparte `ResultadosChart`.

### Escalera de decisión

| Capacidad | Peldaño | Objeto | Por qué |
|-----------|---------|--------|---------|
| Regla visibilidad | 4 | Extender servicio existente | Agregados ya calculados en repo |
| UI residente | 3 | Reusar componente admin | Misma forma DTO |
| DTO anonimizado | 4 | `EncuestaResultadosPublicDto` opcional | Omitir lista textos crudos |

## backend:cuartaquinientos-api

Cambio en `EncuestasController.Resultados`:

- Quitar `[Authorize(Policy = "SoloAdministrador")]`
- Llamar `_cuarta.ObtenerResultadosParaUsuarioAsync(id, usuarioId, esAdmin, ct)`

Reglas:

| Condición | Resultado |
|-----------|-----------|
| Admin | Siempre 200 si encuesta existe |
| `YaParticipo` | 200 |
| `FechaFin < UtcNow` (encuesta terminó) | 200 |
| Vigente y no participó | 403 `ENCUESTA_RESULTADOS_BLOQUEADOS` |
| `bEliminado` | 404 |

Residente DTO: mismos agregados numéricos; preguntas texto libre → solo `totalRespuestas` sin array de textos `(asumido CA M-5)`.

## frontend:cuartaquinientos-web

| Ruta | Acción |
|------|--------|
| `/encuestas/:id/resultados` | Nueva — residente |
| `EncuestasPage.tsx` | Link condicional |
| `EncuestaDetallePage.tsx` | Tras enviar → CTA “Ver resultados” |

Admin ruta actual sin cambio de URL.

## Contenido configurable

| # | Contenido | Clase | Fuente |
|---|-----------|-------|--------|
| 1 | “Debes participar para ver resultados” | Error catálogo | `ENCUESTA_RESULTADOS_BLOQUEADOS` |
| 2 | “Resultados disponibles al cerrar la encuesta” | Catálogo | `ENCUESTA_RESULTADOS_AL_CIERRE` |

## Orden de implementación

| # | Entregable | Dep |
|---|------------|-----|
| 1 | Servicio + tests xUnit reglas 403/200 | — | ✓ Hecho |
| 2 | Controller | 1 | ✓ Hecho |
| 3 | Página residente + links | 2 | ✓ Hecho |
| 4 | Vitest | 3 | ✓ Hecho |

## Plan de pruebas

| ID | Capa | Caso | Expected |
|----|------|------|----------|
| TC-ENC-R-1 | xUnit | Admin siempre | 200 |
| TC-ENC-R-2 | xUnit | Participó | 200 |
| TC-ENC-R-3 | xUnit | No participó vigente | 403 |
| TC-ENC-R-4 | xUnit | Cerrada | 200 |
| TC-ENC-R-5 | Vitest | Link visible post-respuesta | href ok |

## Pasada adversarial

| Punto | Respuesta |
|-------|-----------|
| Transparencia total en vivo | Spec: bloqueo hasta participar o cierre |
| Filtrar admin | Bypass explícito |
| Texto libre PII | DTO public sin textos |

**Veredicto:** APROBADO.

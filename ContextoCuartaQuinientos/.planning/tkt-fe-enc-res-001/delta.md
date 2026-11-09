# Delta: tkt-fe-enc-res-001-enc-resultados-residente

> [← index](_index.md) | [← impl](impl.md)

## Comportamiento agregado

- Residente autenticado puede ver resultados agregados en `/encuestas/:id/resultados` cuando participó o la encuesta ya cerró por `FechaFin`.
- Enlace «Ver resultados» en listado y CTA tras enviar respuesta (regla M-2 en front).
- DTO público: preguntas de texto libre con `totalRespuestasTexto` y sin array `respuestasTexto`.

## Comportamiento modificado

- **(Antes):** `GET /ENC/Encuestas/{id}/resultados` solo policy `SoloAdministrador`.
- **(Después):** JWT residente o admin; servicio aplica 403 `ENCUESTA_RESULTADOS_BLOQUEADOS` si vigente sin participar; 404 borrador para residente; admin sin restricción de visibilidad.

## Comportamiento eliminado

- (ninguno)

## Objetos SQL afectados

| Objeto | Tipo | Acción |
|--------|------|--------|
| — | — | Sin cambios DDL/DML |

## Endpoints API afectados

| Endpoint | Verbo | Acción |
|----------|-------|--------|
| `/ENC/Encuestas/{id}/resultados` | GET | Modificado (auth + DTO por rol) |

## Para el reviewer

- **Qué se hizo:** Resultados de encuesta visibles para residentes con reglas de participación/cierre y anonimización de textos libres.
- **Por qué:** Transparencia post-voto (FE-ENC-RES-001 / HU-ENC-03 extendida).
- **Riesgo:** Bajo — lógica acotada en servicio existente; admin conserva vista completa.
- **Qué probar:** Residente sin votar → 403; tras votar → 200 sin textos crudos; admin → 200 con textos; encuesta cerrada → 200 sin votar.
- **Rollback:** Revertir commit; restaurar `[Authorize(Policy = "SoloAdministrador")]` en controller y eliminar `ObtenerResultadosParaUsuarioAsync`.

[← index](_index.md)

# Delta: ENC-BE-024

## Endpoints nuevos

| Método | Ruta | Auth | Descripción |
|--------|------|------|-------------|
| GET | /ENC/TiposPregunta | JWT Cuarta | Catálogo de tipos de pregunta |
| GET | /ENC/Encuestas/activas | JWT Cuarta | Lista encuestas publicadas y vigentes (residente) |
| GET | /ENC/Encuestas | JWT Cuarta (Admin) | Lista todas las encuestas (admin) |
| GET | /ENC/Encuestas/{id} | JWT Cuarta | Detalle completo con preguntas y opciones |
| POST | /ENC/Encuestas | JWT Cuarta (Admin) | Crea encuesta en estado borrador |
| PUT | /ENC/Encuestas/{id}/publicar | JWT Cuarta (Admin) | Publica encuesta → estado publicada; 204 |
| POST | /ENC/Encuestas/{id}/respuestas | JWT Cuarta | Residente envía respuestas; 204 |
| GET | /ENC/Encuestas/{id}/resultados | JWT Cuarta (Admin) | Resultados agregados con porcentajes |

Legacy: todos con prefijo `*/legacy`.

## Objetos SQL afectados

| Objeto | Operación | Notas |
|--------|-----------|-------|
| `enc.TiposPregunta` | SEED MERGE | DB-004_enc_seed.sql — 'Opción múltiple', 'Texto libre' |
| `enc.Encuestas` | INSERT / UPDATE | Creación y publicación |
| `enc.Preguntas` | INSERT | Creación con encuesta |
| `enc.OpcionesPregunta` | INSERT | Creación con preguntas |
| `enc.Respuestas` | INSERT | Respuestas por residente (UNIQUE encuestaId + usuarioId) |

## Archivos backend modificados / creados

```
GraphApi/
  Controllers/
    ENC/
      Encuestas/EncuestasController.cs         [NUEVO]
      TiposPregunta/TiposPreguntaController.cs [NUEVO]
  Services/ENC/Encuestas/
    CuartaEncuestasService.cs                  [NUEVO]
    ICuartaEncuestasService.cs                 [NUEVO]
  Repositories/ENC/
    CuartaEncuestasRepository.cs              [NUEVO]
    ICuartaEncuestasRepository.cs             [NUEVO]
  Models/ENC/Encuestas/
    CuartaEncuestasDtos.cs                    [NUEVO]

GraphApi.Tests/
  CuartaEncuestasServiceTests.cs              [NUEVO] 4 tests

SQL/
  DB-004_enc_seed.sql                         [NUEVO] seed idempotente
```

## Códigos de error de negocio

| Code | Status | Condición |
|------|--------|-----------|
| `YA_PARTICIPO` | 409 | Residente ya envió respuestas a esa encuesta |
| `ENCUESTA_CERRADA` | 422 | Encuesta no publicada o fuera de vigencia |
| `OPCION_INVALIDA` | 400 | Opción no pertenece a la pregunta enviada |

## Resultados de pruebas

- **xUnit**: 68/68 PASS (dotnet test sin smoke)
- **T-SQL**: 5/5 PASS (`20261019_ENC-BE-024_PruebasUnitarias.sql`)
- **HTTP**: contrato en `ENC-BE-024_api_tests.http` — ejecución pendiente smoke password

## Decisiones técnicas clave

1. **Validación opción/pregunta**: `OpcionPerteneceAPregunta` valida que cada opción enviada pertenezca a su pregunta — evita manipulación de IDs cruzados.
2. **Respuestas únicas**: `UNIQUE (encuestaId, usuarioId)` en `enc.Respuestas` + guard `YA_PARTICIPO` en servicio antes del INSERT.
3. **Estado borrador → publicada**: transición unidireccional; publicar requiere al menos una pregunta con opciones.
4. **Seed idempotente**: DB-004 usa MERGE — re-ejecutable en cualquier entorno sin duplicar tipos.
5. **Legacy aislado**: todos los endpoints duplicados bajo `*/legacy` con controladores separados.

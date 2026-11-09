[← index](_index.md) | [← spec](spec.md)

# design.md — ENC-BE-024: Encuestas API Cuarta

## Estrategia
`CuartaEncuestasService` + repo Dapper; transacción al publicar + notificación `INotificacionService`.
Agregación resultados en SQL GROUP BY (sin SP).

## backend
| Endpoint | Notas |
|----------|-------|
| GET `/ENC/Encuestas/activas` | Residente |
| POST `/ENC/Encuestas/{id}/respuestas` | Validar INV-3 |
| GET `/ENC/Encuestas/{id}/resultados` | SoloAdministrador |

## database
- `SQL/DB-004_enc_seed.sql` — TiposPregunta (Opción múltiple, Texto libre).

## Tests
xUnit servicio + `ENC-BE-024_api_tests.http`.

## Orden implementación

1. Rama `feature/enc-be-024` · 2. RED tests · 3. Repo/Service · 4. Controller · 5. DI · 6. FE si aplica · 7. `dotnet test` / `npm test`.

## Pasada adversarial (design)

Riesgo principal: legacy sin mover → **mitigar** rutas `*/legacy` primero. Veredicto: **APROBADO**.

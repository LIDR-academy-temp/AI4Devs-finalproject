# release.md — PROD-ADMIN-001

## Piezas

1. SQL en SmarterASP (`APLICAR_FALTANTES` + validación).
2. GraphApi publish.
3. Web SPA publish.

## Smoke post-deploy

Ver tabla en [spec.md](spec.md) CA-1..CA-12. Ejecutado 2026-10-30: OK (múltiples usuarios).

## Rollback

- Web Deploy versión anterior.
- API Web Deploy versión anterior.
- SQL: no rollback automático; objetos idempotentes.

# ANM-BE-027: Anuncios y comunicados (API Cuarta)

## Estado

ARCHIVADO

## Graph

| Artefacto | Archivo | Comando | Estado |
|-----------|---------|---------|--------|
| Spec | [spec.md](spec.md) | /definir | Creado |
| Design | [design.md](design.md) | /diseñar | Creado |
| Test | [20261019_ANM-BE-027_PruebasUnitarias.sql](20261019_ANM-BE-027_PruebasUnitarias.sql) · [ANM-BE-027_api_tests.http](ANM-BE-027_api_tests.http) | /test | SQL creado; xUnit en `/ejecutar` RED |
| Impl | [impl.md](impl.md) | /ejecutar | Creado |
| APIs Front | [ANM-BE-027-APIS.md](ANM-BE-027-APIS.md) | /revisar | Creado |
| Delta | [delta.md](delta.md) | /completar | Creado |

## Metadata

- requerimiento: tkt-anm-be-027
- slug: anuncios-api-cuarta
- size: M
- created: 2026-10-19
- updated: 2026-10-19
- seed: `SQL/DB-003_anm_tipos_seed.sql`
- branch (backend): `feature/anm-be-027-anuncios-api` (pendiente crear en `/ejecutar`)

## Depende de

- [[USR-BE-007]] (auth JWT) — ARCHIVADO Fase 1
- [[FE-SHELL-001]] no bloquea backend

## Dominios

- [[anuncios]]

## Related requerimientos

- [[FE-043]] — UI web (bloqueado por este ticket)
- readme ticket 27 · HU-ANM-01..02
- [[ENTREGA_MODULOS]](../ENTREGA_MODULOS.md) ola 2

## Log de estados

| Fecha | De | A | Comando | Nota |
|-------|----|---|---------|------|
| 2026-10-19 | — | SPEC PENDIENTE | /definir | Spec + adversarial |
| 2026-10-19 | SPEC PENDIENTE | DISEÑO PENDIENTE REVISIÓN | /diseñar | design + SQL tests + DB-003 |
| 2026-10-19 | EN REVISIÓN | REQUIERE CAMBIOS | /revisar | F001 PUT vigenteHasta; tests CA-2/3/4; SQL suite sin [OK] TESTS; CQ500 sin seed |
| 2026-10-19 | REQUIERE CAMBIOS | EN REVISIÓN | /ejecutar | Correcciones post-revisión (PUT parcial, tests, SQL, validators) |
| 2026-10-19 | EN REVISIÓN | LISTO PARA PR | /revisar | xUnit 7/7, SQL CQ500, sellos verde+revisar, APIS.md |
| 2026-10-22 | LISTO PARA PR | ARCHIVADO | /completar | delta.md creado; ticket cerrado |


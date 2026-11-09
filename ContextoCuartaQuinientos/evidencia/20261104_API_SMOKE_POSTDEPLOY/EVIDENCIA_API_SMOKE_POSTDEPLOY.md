# API smoke post-deploy - BI-RPT-001 + NAV-ROOT TC-NAV-08

| Campo | Valor |
|-------|-------|
| Fecha | 2026-11-04 17:47:57 |
| Target | Prod |
| API | https://apicuartaquinientos.runasp.net |

## Resultados

[PASS] LOGIN-admin - admin@local
[PASS] LOGIN-residente - a@cq500.local
[PASS] LOGIN-guardia - guardia@local
[PASS] LOGIN-trabajador - trabajador@local
[PASS] TC-NAV-08-admin - menus admin (/admin/tickets)
[PASS] TC-NAV-08-residente - visitas/pases + areas-comunes
[PASS] TC-NAV-08-guardia - validar-pase; sin /admin/*
[PASS] TC-NAV-08-trabajador - /trabajador/tickets
[PASS] TC-NAV-08b-trabajador - asignados 200
[PASS] TC-NAV-08b-residente-403 - HTTP 403
[PASS] TC-BIRPT-07 - Morosos 200
[PASS] TC-BIRPT-05 - tendencias 200
[PASS] TC-BIRPT-06 - export pdf application/pdf
[PASS] TC-BIRPT-08 - aviso 201
[PASS] TC-BIRPT-05-ERR - HTTP 403
[PASS] TC-BIRPT-08-ERR - HTTP 403

## Veredicto

- PASS: **16** / FAIL: **0**
- Global: **PASS**

Bot/IA v2 fuera de alcance.

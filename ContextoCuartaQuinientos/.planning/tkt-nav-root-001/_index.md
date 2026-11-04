# NAV-ROOT-001 — Catálogo navegación + paridad 15 módulos (epic completo)

## Estado

**CERRADO ENTREGA 2 (fases A–D en prod)** — **E + G** en ejecución vía [[BI-RPT-001]] (sin bot); **F** (BOT web) backlog [[bot-ia]]

| Campo | Valor |
|-------|-------|
| Talla | **XL** (epic; A–D entregadas; E–G backlog v2) |
| Rama trabajo real | `feature/entrega-2-AFS` (A–D mergeadas en producto) |
| Entrada | [ENTRADA.md](ENTRADA.md) |
| Matriz | [MATRIZ_MODULOS.md](MATRIZ_MODULOS.md) |

## Documentos

| Artefacto | Archivo |
|-----------|---------|
| Entrada | [ENTRADA.md](ENTRADA.md) |
| Matriz 15 módulos | [MATRIZ_MODULOS.md](MATRIZ_MODULOS.md) |
| Spec | [spec.md](spec.md) |
| Design | [design.md](design.md) |
| Test SQL | [20261028_NAV-ROOT-001_PruebasUnitarias.sql](20261028_NAV-ROOT-001_PruebasUnitarias.sql) |
| Tests API | [NAV-ROOT-001_api_tests.http](NAV-ROOT-001_api_tests.http) |
| Release | [release.md](release.md) |
| Impl | [impl.md](impl.md) |
| Delta | [delta.md](delta.md) |

## Graph

| Artefacto | Archivo | Comando | Estado |
|-----------|---------|---------|--------|
| Spec | [spec.md](spec.md) | /definir | Creado |
| Design | [design.md](design.md) | /diseñar | Creado |
| Test | [20261028_NAV-ROOT-001_PruebasUnitarias.sql](20261028_NAV-ROOT-001_PruebasUnitarias.sql) · Vitest NAV · [NAV-ROOT-001_api_tests.http](NAV-ROOT-001_api_tests.http) | /test | TC-NAV-01/02/04/05 PASS · SQL 6 PASS · TC-NAV-06…07 ROJO |
| Impl | [impl.md](impl.md) | /revisar fase D | Verificado (A+B+C+D) |
| APIs Front | [NAV-ROOT-001-APIS.md](NAV-ROOT-001-APIS.md) | /revisar fase D | Creado (2 endpoints: C+D) |

## Sub-fases (orden obligatorio)

| Fase | ID | Entregable resumido |
|------|-----|---------------------|
| **A** | NAV-ROOT-001-A | Manifest canónico + `DB-008` + test paridad CI |
| **B** | NAV-ROOT-001-B | Menú huecos (catálogos TKT, Pases QR, NTF sidebar) + `NotificacionesPage` |
| **C** | NAV-ROOT-001-C | Guardia + Trabajador (seed, routes, tickets asignados) |
| **D** | NAV-ROOT-001-D | Admin áreas/reservas (+ CRUD áreas mínimo si API Cuarta existe) |
| **E** | NAV-ROOT-001-E | Reportes + BI web (`/admin/reportes`, API tendencias, Chart.js) |
| **F** | NAV-ROOT-001-F | Integración BOT en web (`/admin/integraciones/bot`) + manifest |
| **G** | NAV-ROOT-001-G | NTF aviso admin, cierre matriz 15/15, docs + inventario deploy |

> **2026-11-04:** [[BI-RPT-001]] implementa **E + G** (reportes/BI/aviso) **sin** fase F ni bot/IA. Menús BOT siguen ocultos hasta ticket bot.

## TKTs relacionados

[[SGR-FE-001]] · [[SGR-BE-030]] · DB-007 · [[FE-VTS-CAL-001]] · [[FE-TKT-DET-001]] · [[FE-040]] (NTF campana)

## Log

| Fecha | De | A | Nota |
|-------|----|---|------|
| 2026-10-28 | — | DISEÑO PENDIENTE REVISIÓN | spec + design inicial |
| 2026-10-28 | DISEÑO PENDIENTE REVISIÓN | LISTO PARA TEST | Alcance completo 15 módulos (sin Won't) |
| 2026-10-28 | LISTO PARA TEST | LISTO PARA TEST | /test: suite Vitest + SQL smoke + .http TC-NAV-08…10 · sello diseno |
| 2026-10-28 | LISTO PARA TEST | EN REVISIÓN (fase A) | /ejecutar fase A: manifest→APP_NAV, DB-008, tests paridad |
| 2026-10-28 | EN REVISIÓN (fase A) | LISTO PARA PR (fase A) | /revisar: SQL 6/6 · Vitest TC-NAV-01/02 · auditorías APROBADO |
| 2026-10-28 | LISTO PARA PR (fase A) | EN REVISIÓN (fase B) | /ejecutar fase B: NotificacionesPage + rutas /notificaciones |
| 2026-10-28 | EN REVISIÓN (fase D) | LISTO PARA PR (fases A+B+C+D) | /revisar fase D: SQL 6/6 · xUnit 4/4 · APIS.md +1 endpoint · auditorías APROBADO |
| 2026-10-30 | LISTO PARA PR (A–D) | **CERRADO E2 (A–D)** | Alcance académico · [PULIR_ENTREGA_2.md](../../PULIR_ENTREGA_2.md) |
| 2026-11-04 | — | **E+G → BI-RPT-001** | Spec/design BI-RPT sin bot/IA; F backlog bot-ia |

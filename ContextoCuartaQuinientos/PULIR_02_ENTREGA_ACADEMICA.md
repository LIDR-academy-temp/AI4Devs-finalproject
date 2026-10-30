# Pulir Entrega 2 — Checklist académica (sin video)

Hub: [PULIR_01_PROD_REPO.md](PULIR_01_PROD_REPO.md) · [PULIR_02_CREDENCIALES.md](PULIR_02_CREDENCIALES.md)

## Estado

| # | Ítem | Estado |
|---|------|--------|
| 1 | Prod = repo (BD + API + Web + smoke) | OK — ver PULIR_01 |
| 2 | SDD VTS-AREAS-CRUD-001 + PROD-ADMIN-001 ARCHIVADO | OK |
| 3 | Secretos fuera de git (`test.txt` + plantilla) | OK |
| 4 | Tests automatizados | OK (ver abajo) |
| 5 | **Typeform** Entrega 2 | **Pendiente humano** — [Typeform](https://lidr.typeform.com/proyectoai4devs) |
| 6 | PR `feature/entrega-2-AFS` → `main` (si curso lo pide) | Opcional post-commit |

## Texto Typeform (resumen)

- Repo: `https://github.com/afonsecanice/ProyectoFinalLIDR_AFS` · rama `feature/entrega-2-AFS`
- Web: `https://cuartaquinientosresidencial.runasp.net/login`
- API: `https://apicuartaquinientos.runasp.net/swagger`
- IA: `prompts.md` + `.planning/tkt-*`
- Alcance v2: bot / IA / BI fuera — `README.md` §0
- Credenciales: pegar desde `test.txt` **local** (no repo)

## Evidencia tests (2026-10-30)

```text
GraphApi (Release, Category!=Smoke): 177 passed, 0 failed
GraphApi Smoke (Fase1SmokeApiIntegrationTests): omitido — requiere API local :5180

Web (vitest --run): 90 files, 281 passed, 2 skipped
```

## Alcance congelado

No abrir NAV-ROOT E/F (reportes web / integración bot) en esta entrega; ver `FE-NAV-ENT1-001` / manifest.

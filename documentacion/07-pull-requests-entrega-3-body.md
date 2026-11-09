## Summary

- Cierre **Entrega 3** en rama `final-project-AFS`: **BI-RPT-001** (tendencias, exports, aviso NTF), **portal UX** (temas/layout), **matriz TDD** y evidencia **E2E** / smoke post-deploy.
- Scripts: `Invoke-Entrega3Tests.ps1`, `Invoke-E2ESmoke.ps1`, `Invoke-ApiSmokePostDeploy.ps1`.
- Higiene: deja de versionar `GraphApi/_test_out/` y `Web/test-results/`.

## Test plan

- [ ] CI GitHub Actions (API `dotnet test` + Web lint/test/build) en verde
- [ ] Local: `scripts/Invoke-Entrega3Tests.ps1` (Vitest + xUnit gates)
- [ ] E2E (opcional local): `scripts/Invoke-E2ESmoke.ps1` — ver `ContextoCuartaQuinientos/evidencia/20261104_E2E_CRITICO/EVIDENCIA_E2E_ENTREGA3.md`

## Documentación

- `ContextoCuartaQuinientos/20261104_ENTREGA3_Entregables.md`
- `ContextoCuartaQuinientos/MATRIZ_TDD_ENTREGA3.md`
- `SQL/20261104_BI-RPT-001_INVENTARIO_CAMBIOS.md`

## Base de la PR

`feature/entrega-2-AFS` ← `final-project-AFS` (entrega académica final).

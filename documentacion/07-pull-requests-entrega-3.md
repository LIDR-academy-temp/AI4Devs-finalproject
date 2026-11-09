# 7. Pull Requests (Entrega 3 — final)

## Crear la PR en GitHub

1. Abre el compare (base **`feature/entrega-2-AFS`** → compare **`final-project-AFS`**):

   https://github.com/afonsecanice/ProyectoFinalLIDR_AFS/compare/feature/entrega-2-AFS...final-project-AFS?expand=1

2. **Título sugerido:** `Entrega 3 — BI-RPT, portal UX, matriz TDD y E2E`

3. Pega la descripción de la sección **Plantilla PR** (abajo).

4. **Create pull request** — espera que **CI** (API + Web) quede en verde.

5. Copia la URL del PR en [README §7](../README.md#7-pull-requests).

### CLI (opcional)

```powershell
gh auth login
cd d:\LIDR\ProyectoFinal\feature-entrega-1-AFS
gh pr create --base feature/entrega-2-AFS --head final-project-AFS --title "Entrega 3 — BI-RPT, portal UX, matriz TDD y E2E" --body-file documentacion/07-pull-requests-entrega-3-body.md
```

---

## Plantilla PR (copiar en GitHub)

Ver archivo dedicado: [`07-pull-requests-entrega-3-body.md`](07-pull-requests-entrega-3-body.md)

## Alcance

| Incluye | Fuera de alcance (v2) |
|---------|------------------------|
| BI snapshots, exports RPT, aviso NTF admin | Bot Telegram, RAG `/bi` |
| Portal UX (temas, layout), gates TDD Entrega 3 | |
| E2E críticos + smoke post-deploy | |
| Higiene repo (`_test_out/`, `test-results/`) | |

## Enlaces

- Entregables: [`20261104_ENTREGA3_Entregables.md`](../ContextoCuartaQuinientos/20261104_ENTREGA3_Entregables.md)
- E2E: [`EVIDENCIA_E2E_ENTREGA3.md`](../ContextoCuartaQuinientos/evidencia/20261104_E2E_CRITICO/EVIDENCIA_E2E_ENTREGA3.md)
- Matriz TDD: [`MATRIZ_TDD_ENTREGA3.md`](../ContextoCuartaQuinientos/MATRIZ_TDD_ENTREGA3.md)

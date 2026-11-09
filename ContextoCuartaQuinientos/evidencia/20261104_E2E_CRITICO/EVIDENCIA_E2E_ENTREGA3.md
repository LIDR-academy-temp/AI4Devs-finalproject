# E2E Playwright — flujos críticos Entrega 3

Documento para adjuntar o mostrar en revisión académica. **No incluye contraseñas** (viven en `fase1-smoke.env`, gitignored).

| Campo | Valor |
|-------|--------|
| Rama | `final-project-AFS` |
| Portal | `https://cuartaquinientosresidencial.runasp.net` |
| API | `https://apicuartaquinientos.runasp.net` |
| BD | `db24572` (MonsterASP) |

## Cómo ejecutar

Desde la raíz del repo:

```powershell
.\scripts\Invoke-E2ESmoke.ps1 -Target Prod
```

Genera log: [`ultima-ejecucion.log`](ultima-ejecucion.log) (misma carpeta, UTF-8 con BOM).

El script corre **2 fases** con pausa 65 s: la API permite **5 `GenerateToken`/min por IP**; 7 tests + preflight superaban el cupo.

Opcional solo verificar API antes: `.\scripts\Invoke-E2ESmoke.ps1 -Target Prod -PreflightApi`

Si aparece *Demasiados intentos* (429): espera **~60 s** y vuelve a ejecutar.

La suite hace **7 logins** en browser (4 + pausa + 3).

## Matriz de pruebas (7 specs)

| # | Archivo | Rol | Qué valida |
|---|---------|-----|------------|
| 1 | `e2e/login-residente.spec.ts` | Residente | Login + inicio (saludo) |
| 2 | `e2e/crear-ticket.spec.ts` | Residente | Alta incidencia |
| 3 | `e2e/estado-cuenta.spec.ts` | Residente | Finanzas / cuenta |
| 4 | `e2e/admin-casas.spec.ts` | Admin | Alta casa E2E-* (muta prod demo) |
| 5 | `e2e/critico-residente-extra.spec.ts` | Residente | Comunicados, listado tickets, perfil, áreas |
| 6 | `e2e/critico-admin-extra.spec.ts` | Admin | Gestión tickets, anuncios admin, aviso NTF |
| 7 | `e2e/extra-bi-reportes.spec.ts` | Admin | Reportes → pestaña Tendencias BI (panel cargado) |

Unitarios (TDD, sin browser): `.\scripts\Invoke-Entrega3Tests.ps1`

Auth REST en prod (sin browser): [`EVIDENCIA_API_SMOKE_POSTDEPLOY.md`](../20261104_API_SMOKE_POSTDEPLOY/EVIDENCIA_API_SMOKE_POSTDEPLOY.md) — incluye `LOGIN-admin` y casos BI-RPT.

## Resultado de ejecución

**Fecha:** 2026-11-04

**Ejecutor:** Equipo AFS — corrida local documentada (misma fecha que API smoke prod)

**2026-11-04 17:28–17:29** — script 2 fases (`ultima-ejecucion.log`):

| Fase | Resultado |
|------|-----------|
| 1/2 | **4 passed** (26.9 s) — admin-casas, crear-ticket, crítico admin, crítico residente |
| 2/2 | **3 passed** (15.0 s) — estado cuenta, BI reportes, login residente |

**Total: 7/7 PASS** (~42 s + pausa 65 s).

```text
Preflight API omitido (rate limit; ver EVIDENCIA_API_SMOKE_POSTDEPLOY LOGIN-admin PASS)
Pausa 65s ...
Fase 1: 4 passed (26.9s)
Fase 2: 3 passed (15.0s)
```

## Veredicto

| Check | Estado |
|-------|--------|
| Login API prod (evidencia aparte o `-PreflightApi`) | ☑ **PASS** — [API smoke 16/16](../20261104_API_SMOKE_POSTDEPLOY/EVIDENCIA_API_SMOKE_POSTDEPLOY.md) |
| Playwright 7/7 passed | ☑ **7/7** |
| Log guardado | ☑ [`ultima-ejecucion.log`](ultima-ejecucion.log) |

**Veredicto global:** ☑ **PASS**

## Notas

- **Entorno demo académico:** los tests 2 y 4 crean ticket y casa con prefijo `E2E-*` en `db24572`; no hay cleanup automático (aceptable para evaluación; no usar en prod real de clientes).
- Cobertura restante del portal: Vitest (~325) + xUnit Entrega 3 (~188); ver `MATRIZ_TDD_ENTREGA3.md`.
- Credenciales de demo: Typeform / formulario del curso, no en Git.
- Huecos conscientes (unitarios/API smoke): encuestas, juntas, trabajador y guardia no tienen spec Playwright; bot/IA v2 excluido.

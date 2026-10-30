# Entrega 2 — cierre (checklist)

**Dos archivos útiles:**

| Cuándo | Archivo |
|--------|---------|
| ¿Puedo entregar al curso? | **Este doc** |
| Deploy / smoke SmarterASP | [PULIR_01_PROD_REPO.md](PULIR_01_PROD_REPO.md) |
| Copiar al Typeform (contraseñas; **gitignored**) | `PULIR_ENTREGA_2_TYPEFORM.md` (misma carpeta) |

Formulario: https://lidr.typeform.com/proyectoai4devs

---

## Checklist

| # | Ítem | Estado |
|---|------|--------|
| 1 | Prod = repo | OK — [PULIR_01](PULIR_01_PROD_REPO.md) (cerrado 2026-10-30) |
| 2 | SDD pulido (VTS-AREAS, PROD-ADMIN, módulos, NAV) | OK |
| 3 | Tests automatizados | OK — 177 API · 281 Web |
| 4 | Secretos fuera de GitHub | OK — Typeform local en `.gitignore` |
| 5 | **Enviar Typeform** | **Pendiente** — copiar `PULIR_ENTREGA_2_TYPEFORM.md` |
| 6 | PR → `main` | Opcional (curso) |

## Tests (2026-10-30)

```text
GraphApi (Release, Category!=Smoke): 177 passed
Web (vitest --run): 281 passed, 2 skipped
Smoke API local :5180: omitido (prod smoke OK en PULIR_01 §1.5)
```

## Alcance congelado

Bot / IA / BI y NAV-ROOT **E/F/G** fuera de esta entrega — `README.md` §0 · [[FE-NAV-ENT1-001]].

## Credenciales (regla rápida)

- Contraseñas de evaluación → **solo Typeform**, no `README` ni commits.
- Texto listo: archivo local **`PULIR_ENTREGA_2_TYPEFORM.md`** (ignorado por git; no `git add`).
- Plantilla sin secretos en repo: `scaffolds/CREDENCIALES_PRUEBA.example.txt`.

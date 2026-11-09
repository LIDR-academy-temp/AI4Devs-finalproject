---
name: git-frontend
model: inherit
description: Gestiona operaciones Git para el repositorio frontend (<PROYECTO_FRONT>). Crea/verifica ramas (Modo 1), genera commit+push (Modo 2), diagnóstico (Modo 3), PR (Modo 4) y worktree aislado opcional (Modo 5).
readonly: false
---

# git-frontend

> **Config:** Lee `sdd-toolkit/sdd.config.yaml` → `vars` antes de ejecutar.
> Sustituye cada `<KEY>` con el valor de `vars.KEY`. Nunca usar placeholders en crudo.

Gestiona operaciones Git para el repositorio frontend con `git.enabled: true` en `sdd-toolkit/sdd.config.yaml`.

Invocado por `/definir` (crear rama) y `/ejecutar` (crear o verificar rama).
El commit + push lo ejecuta el desarrollador manualmente — **`/completar` solo genera el mensaje de commit, no invoca `git-frontend` Modo 2**.

---

## Memory Block — leer antes de operar

| Fuente | Qué extraer |
|--------|-------------|
| `sdd.config.yaml` → `targets.frontend` | `repo`, `git.base_branch`, `git.branch_format` |
| `_index.md` del TKT | `branch` en Metadata (si ya fue creada en sesión anterior) |
| `design.md` del TKT | Sección `## frontend:web` para confirmar que está en scope |

**Nunca hardcodear** rama, ruta ni base_branch. Todo desde config.

## Stop conditions — DETENTE aquí

1. `repo`, `base_branch` o `branch_format` ausente en config → alertar y detener.
2. `git branch --show-current` ≠ rama calculada → detener y reportar antes de cualquier `git add` o `git push`.
3. Archivos prohibidos en `git status` (ver lista de secrets) → BLOQUEO hasta confirmación del usuario.
4. La instancia no tiene `git.enabled: true` → no operar git; registrar en output.
5. `git pull` de `base_branch` falla → alertar antes de crear rama nueva.

---

## Modo 1: Crear o verificar rama (`/definir` · `/ejecutar`)

### Flujo

```powershell
cd "<RUTA_REPO_FRONT>"

# 1. Actualizar rama base
git checkout <base_branch>
git pull

# 2. Calcular nombre de rama
$branch = "<branch_format>"    # {id} reemplazado con el id del requerimiento

# 3. Verificar si ya existe
$exists = git branch --list $branch
if ($exists) {
    git checkout $branch
} else {
    git checkout -b $branch
}

# 4. Confirmar
git branch --show-current
```

### Output

```md
### git-frontend — Modo 1

- Instancia: `frontend:web`
- Repo: `<RUTA_REPO_FRONT>`
- Base: `<base_branch>`
- Rama: `<branch>`
- Estado: CREADA | YA EXISTÍA → checkout realizado
```

---

## Modo 2: Commit + Push (`/completar`)

### Archivos NUNCA commiteables (secrets guard)

Antes de `git add`, verificar que **ninguno** de estos esté en `git status`:

```
.env
.env.local
.env.production
.env.staging
*.pem
*.key
secrets.ts
secrets.json
```

**Si alguno aparece:**
1. NO ejecutar `git add -A`.
2. Reportar: `⚠️ BLOQUEO: archivo sensible detectado: <nombre>`
3. Sugerir: `git restore --staged <archivo>` o agregar a `.gitignore`.
4. Solo continuar si el usuario confirma que el archivo no tiene secrets reales.

### Flujo (si pasa secrets check)

```powershell
cd "<RUTA_REPO_FRONT>"

git branch --show-current    # debe ser TKT-<id>
git status
git diff --stat

git add -A
git commit -m "TKT-<id>: <descripcion>"
git push -u origin TKT-<id>
```

### Formato del mensaje de commit

```
TKT-<id>: <descripcion concisa>

Ejemplos:
  TKT-14818: Add VentaResumen page + useVentaResumen hook
  TKT-14821: Add PromoCodes table with filters (TanStack Table)
  TKT-14491: Fix WMS picking form validation schema (Zod)
```

**Reglas:**
- Iniciar con `TKT-<id>: `.
- Descripción en inglés, máx 72 chars.
- Mencionar qué se hizo + componente/hook principal.

### Output

```md
### git-frontend — Push completado

- Repo: `<RUTA_REPO_FRONT>`
- Rama: `TKT-<id>`
- Commit: `TKT-<id>: <descripcion>`
- Archivos: X files changed
- Remote: origin/TKT-<id> ✓
```

---

## Modo 3: Verificar estado (diagnóstico)

```powershell
cd "<RUTA_REPO_FRONT>"
git branch --show-current
git status
git log --oneline -5
```

---

## Modo 4: PR (después de push)

El PR se crea manualmente en GitHub. El agente genera el texto listo para copiar:

**Título:** `TKT-<id>: <descripcion concisa>`
**Base branch:** `<base_branch>` (del config)
**Compare branch:** `TKT-<id>`

**Descripción del PR** (tomar de `delta.md`):

```md
## Qué se hizo
<Comportamiento agregado/modificado del delta.md>

## Componentes afectados
| Componente | Ruta | Acción |
|-----------|------|--------|
| ... | ... | ... |

## Cómo probar
<Sección "¿Qué probar?" del delta.md>

## Verificación
- [ ] `tsc --noEmit` sin errores
- [ ] `vite build` sin errores
- [ ] Tests Vitest pasan
- [ ] Flujo E2E Playwright verificado

## Riesgo
<Bajo / Medio / Alto + justificación>

## Rollback
<Estrategia del delta.md>
```

---

## Modo 5: Worktree aislado (opcional)

Invocar SOLO si el usuario pide explícitamente ejecutar 2+ requerimientos en paralelo o si `tools.graph_query` reporta conflicto y el usuario decide no esperar.

```powershell
cd "<RUTA_REPO_FRONT>"
git worktree add "<RUTA_REPO_FRONT>-TKT-<id>" -b "TKT-<id>" <base_branch>
cd "<RUTA_REPO_FRONT>-TKT-<id>"
```

Limpiar al cerrar: `git worktree remove "<RUTA_REPO_FRONT>-TKT-<id>"`.

---

## Done-state por modo

**Modo 1:**
- [ ] `git branch --show-current` = rama calculada del requerimiento.
- [ ] Rama registrada en `_index.md` → Metadata `branch:`.

**Modo 2:**
- [ ] Secrets check pasado sin bloqueos.
- [ ] `git branch --show-current` = `TKT-<id>` confirmado antes del commit.
- [ ] Commit con formato `TKT-<id>: <descripcion>`.
- [ ] Push exitoso a `origin/TKT-<id>`.

**Modo 4:**
- [ ] Título, base branch y descripción generados listos para copiar.
- [ ] Checklist de verificación incluido en el PR.

## Errores comunes

| Error | Causa | Solución |
|-------|-------|----------|
| `branch already exists` | Rama creada antes | `git checkout TKT-<id>` sin `-b` |
| `Your branch is behind` | Cambios en remoto | `git pull --rebase` |
| `nothing to commit` | Sin cambios guardados | Verificar que los archivos fueron editados |
| Rama activa ≠ TKT | Checkout olvidado | `git checkout TKT-<id>` primero |

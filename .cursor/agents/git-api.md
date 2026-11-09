---
name: git-api
model: inherit
description: Gestiona operaciones Git para instancias con git.enabled true. Crea/verifica ramas (Modo 1), genera commit+push (Modo 2), diagnóstico (Modo 3), PR (Modo 4) y worktree aislado opcional para paralelismo (Modo 5).
readonly: false
---

# git-api

> **Config:** Lee `sdd-toolkit/sdd.config.yaml` → `vars` antes de ejecutar.
> Sustituye cada `<KEY>` con el valor de `vars.KEY`. Nunca usar placeholders en crudo.


Gestiona operaciones Git para cualquier instancia con `git.enabled: true` en `sdd-toolkit/sdd.config.yaml`.

Invocado por `/definir` (crear rama) y `/ejecutar` (crear o verificar rama).
**Regla no negociable:** cualquier requerimiento que toque la API (controllers, endpoints, DTOs) → Modo 1 **antes** de implementar. Rama activa = `TKT-{id}` desde `git.branch_format`.
El commit + push lo ejecuta el desarrollador manualmente — **`/completar` solo genera el mensaje de commit, no invoca `git-api` Modo 2**.

---

## Memory Block — leer antes de operar

| Fuente | Qué extraer |
|--------|-------------|
| `sdd.config.yaml` → `targets` | `repo`, `git.base_branch`, `git.branch_format` por instancia |
| `_index.md` del TKT | `branch` en Metadata (si ya fue creada en sesión anterior) |
| `design.md` del TKT | Secciones `## <target>:<name>` para confirmar instancias en scope |

**Nunca hardcodear** rama, ruta ni base_branch. Todo desde config.

## Stop conditions — DETENTE aquí

Para si ocurre cualquiera de estas condiciones:

1. `repo`, `base_branch` o `branch_format` ausente en config → alertar y detener; no asumir valores.
2. `git branch --show-current` ≠ rama calculada → detener y reportar antes de cualquier `git add` o `git push`.
3. Archivos prohibidos en `git status` (appsettings.Production, secrets, *.pfx) → BLOQUEO hasta que el usuario confirme.
4. La instancia no tiene `git.enabled: true` → no operar git; registrar en output y continuar flujo sin git.
5. `git pull` de `base_branch` falla → alertar antes de crear rama nueva; no continuar con estado desconocido.

## Cómo determinar repo y ramas (siempre desde config)

Leer `sdd-toolkit/sdd.config.yaml` → `targets`. Para cada instancia invocada:

1. `repo` → ruta local del repositorio.
2. `git.base_branch` → rama base desde la que se crea la rama del requerimiento.
3. `git.branch_format` → patrón del nombre de rama; `{id}` se reemplaza con el id del requerimiento.

**Nunca** usar valores hardcodeados de rama o ruta. Si falta algún campo → alertar al usuario y detener.

Ejemplo resuelto para `nesgoapi` (del config actual):

| Campo config | Valor |
|---|---|
| `repo` | `D:\ProyNet\NesGoApi\NESGoApiNet` |
| `git.base_branch` | `MASTER-WMS` |
| `git.branch_format` | `TKT-{id}` → rama = `TKT-14818` |
| Nunca tocar | `master`, `MASTER-WMS` (solo lectura) |

---

## Modo 1: Crear o verificar rama (`/definir` · `/ejecutar`)

Invocar para cada instancia que cumpla **ambas** condiciones:
- `git.enabled: true` en su bloque de config.
- Su sección `## <target>:<name>` existe en `design.md` (confirma que esa instancia está en scope).

Se dispara desde `/definir` (al planificar) y desde `/ejecutar` (al implementar).

### Flujo (sustituir valores desde config)

```powershell
cd "<repo>"                        # valor de targets.<target>.instances[n].repo

# 1. Actualizar rama base
git checkout <base_branch>         # valor de git.base_branch
git pull

# 2. Calcular nombre de rama
$branch = "<branch_format>"        # {id} reemplazado con el id del requerimiento

# 3. Verificar si ya existe
$exists = git branch --list $branch
if ($exists) {
    git checkout $branch            # ya existe → solo checkout
} else {
    git checkout -b $branch         # no existe → crear desde base_branch
}

# 4. Confirmar
git branch --show-current
```

### Reglas

- Siempre leer `base_branch` y `branch_format` del config — nunca hardcodear.
- Siempre hacer `pull` de `base_branch` antes de crear o verificar la rama.
- Si la rama ya existe: `checkout` sin recrear. ✅
- Si la rama no existe: crearla con `-b`. ✅
- Si `git branch --show-current` ≠ nombre calculado → detener y alertar.

### Output a `/definir` y `/ejecutar`

```md
### git-api — Modo 1

- Instancia: `<target>:<name>`
- Repo: `<repo>`
- Base: `<base_branch>`
- Rama: `<branch>` (branch_format aplicado)
- Estado: CREADA | YA EXISTÍA → checkout realizado
```

---

## Modo 2: Commit + Push (`/completar`)

Invocar cuando `delta.md` tiene endpoints API en "Endpoints API afectados".

### Flujo

```powershell
cd "<RUTA_REPO_API>"

# 1. Confirmar rama activa
git branch --show-current
# Debe ser TKT-<id> — si no, hacer checkout

# 2. Revisar cambios
git status
git diff --stat

# 3. ⚠️ SECRETS CHECK — verificar archivos prohibidos
# Si alguno aparece en git status → DETENER y alertar
```

### Archivos NUNCA commiteables (secrets guard)

Antes de `git add`, verificar que **ninguno** de estos esté en `git status`:

```
appsettings.Production.json
appsettings.Staging.json
*.pfx
*.key
*.pem
.env
secrets.json
<PROYECTO_API>.Parameters.xml  ← solo si tiene connection strings reales
```

**Si alguno aparece:**
1. NO ejecutar `git add -A`.
2. Reportar: `⚠️ BLOQUEO: archivo sensible detectado: <nombre>`
3. Sugerir: `git restore --staged <archivo>` o agregar a `.gitignore`.
4. Solo continuar si el usuario confirma que el archivo no tiene secrets reales.

### Flujo (continuación si pasa secrets check)

```powershell
# 3. Stagear y commitear
git add -A
git commit -m "TKT-<id>: <descripcion del delta>"

# 4. Push con tracking
git push -u origin TKT-<id>
```

### Formato del mensaje de commit

```
TKT-<id>: <descripcion concisa del cambio>

Ejemplos:
  TKT-14818: Add TipoVenta GET/POST endpoints (sls.vsVentaSaleType)
  TKT-14821: Add PromoCodes API - prcGetPromoCodes, prcSetPromoCodes
  TKT-14491: WMS picking multiple items endpoint
```

**Reglas del mensaje:**
- Siempre iniciar con `TKT-<id>: ` (dos puntos + espacio).
- Descripción en inglés, concisa (máx 72 chars).
- Mencionar: qué se hizo + objeto/endpoint principal.
- No usar "fix", "update" genéricos — ser específico.

### Reglas de seguridad

- Verificar `git branch --show-current` = `TKT-<id>` ANTES de `git add`.
- Si la rama activa no es `TKT-<id>` → detener y reportar error.
- No hacer `git add -A` si hay archivos no relacionados al requerimiento (ej: `appsettings.json` con credenciales).
- Revisar `git status` antes de commit — confirmar solo archivos del requerimiento.
- Nunca `git push --force`.
- Nunca operar sobre `master` o `MASTER-WMS`.

### Output a `/completar`

```md
### git-api — Push completado

- Repo: `<RUTA_REPO_API>\`
- Rama: `TKT-<id>`
- Commit: `TKT-<id>: <descripcion>`
- Archivos: X files changed
- Remote: origin/TKT-<id> ✓
```

---

## Modo 3: Verificar estado (diagnóstico)

Usar cuando hay duda sobre el estado del repo antes de operar.

```powershell
cd "<RUTA_REPO_API>"
git branch --show-current
git status
git log --oneline -5
```

---

## Modo 4: PR (después de push)

Invocar al finalizar `/completar` si el push fue exitoso.

El PR se crea manualmente en GitHub. El agente genera el texto listo para copiar:

**Título:**
```
TKT-<id>: <descripcion concisa>
```

**Base branch:** `MASTER-WMS`
**Compare branch:** `TKT-<id>`

**Descripción del PR** (tomar de `delta.md`):
```md
## Qué se hizo
<Comportamiento agregado/modificado del delta.md>

## Endpoints afectados
| Endpoint | Verbo | Acción |
|----------|-------|--------|
| ... | ... | ... |

## Cómo probar
<Sección "¿Qué probar?" del delta.md>

## Riesgo
<Bajo / Medio / Alto + justificación del delta.md>

## Rollback
<Estrategia del delta.md>
```

**Regla:** No crear PR a `master` directamente. Siempre `TKT-<id>` → `MASTER-WMS`.

---

## Modo 5: Worktree aislado (opcional)

Invocar SOLO si el usuario pide explícitamente ejecutar 2+ requerimientos en paralelo
sobre la misma instancia backend, o si `tools.graph_query` (paso 3 de
`pipeline-design.md`) reporta ⚠ Conflicto potencial con un requerimiento "En progreso"
y el usuario decide no esperar a que termine. **No es el flujo default** —
`/ejecutar` sigue usando Modo 1 (checkout normal) salvo pedido explícito.

### Flujo

```powershell
cd "<repo>"                              # valor de targets.<target>.instances[n].repo
git worktree add "<repo>-TKT-<id>" -b "TKT-<id>" <base_branch>
cd "<repo>-TKT-<id>"
```

### Reglas

- Nunca crear worktree si no fue pedido explícitamente — el flujo default sigue
  siendo Modo 1.
- El worktree vive en `<repo>-TKT-<id>` (hermano del repo principal, mismo
  nivel), nunca dentro del repo.
- Al cerrar el requerimiento (`/completar` con push exitoso y PR mergeado):
  `git worktree remove "<repo>-TKT-<id>"` — limpiar, no dejar worktrees
  huérfanos.
- Todas las reglas de secrets-check y de ramas de Modo 1/2 aplican igual
  dentro del worktree.

### Output a `/ejecutar`

```md
### git-api — Modo 5

- Instancia: `<target>:<name>`
- Worktree: `<repo>-TKT-<id>`
- Rama: `TKT-<id>` (desde `<base_branch>`)
- Estado: CREADO
```

---

## Done-state por modo

**Modo 1 (crear/verificar rama):**
- [ ] `git branch --show-current` = rama calculada del requerimiento.
- [ ] Rama registrada en `_index.md` → Metadata `branch:`.
- [ ] Output reportado a `/definir` o `/ejecutar`.

**Modo 2 (commit + push):**
- [ ] Secrets check pasado sin bloqueos.
- [ ] `git branch --show-current` = `TKT-<id>` confirmado antes del commit.
- [ ] Commit creado con formato `TKT-<id>: <descripcion>`.
- [ ] Push exitoso a `origin/TKT-<id>`.
- [ ] Output reportado a `/completar`.

**Modo 4 (PR):**
- [ ] Título, base branch y descripción generados listos para copiar.
- [ ] PR apunta a `MASTER-WMS`, no a `master`.

**Modo 5 (worktree, si se usó):**
- [ ] Worktree creado en `<repo>-TKT-<id>` con rama `TKT-<id>`.
- [ ] Worktree removido (`git worktree remove`) al cerrar el requerimiento.

## Errores comunes y soluciones

| Error | Causa | Solución |
|-------|-------|----------|
| `branch already exists` | Rama creada en sesión anterior | `git checkout TKT-<id>` sin `-b` |
| `Your branch is behind` | Cambios en remoto | `git pull --rebase` |
| `nothing to commit` | Sin cambios guardados | Verificar que los archivos fueron editados |
| Rama activa ≠ TKT | Checkout olvidado | `git checkout TKT-<id>` primero |
| Archivos ajenos en stage | `git add -A` amplio | `git restore --staged <archivo>` para destagear |

# iniciar

> **Config:** Lee `sdd-toolkit/sdd.config.yaml` → `vars` antes de ejecutar.
> Sustituye cada `<KEY>` con el valor de `vars.KEY`. Nunca usar placeholders en crudo.

Bootstrap de contexto inicial para un proyecto recién instalado con SDD.
Corre una sola vez después de `sdd-install`. Genera los archivos base que
permiten a Claude y Cursor entender el proyecto antes del primer requerimiento.

---

## Cuándo usar

- Primera vez que se instala SDD en un proyecto existente.
- El `_graph.md` y `specs/` están vacíos o no existen.
- Se necesita "foto inicial" del código para que los agentes tengan contexto.

**No correr de nuevo** sobre un proyecto con requerimientos en curso — usa `/sincronizar`
para mantener el grafo actualizado en proyectos activos.

---

## Paso 0 — Doctor check (antes de escanear repos)

Verificar que el entorno está listo. Ejecutar todos los checks y mostrar la tabla:

| Check | Condición | Acción si falla |
|-------|-----------|-----------------|
| `sdd.config.yaml` existe | Presente en raíz o `sdd-toolkit/` | **Detener** — pedir crear desde plantilla |
| `vars` mínimos | `RUTA_PLANNING` y `RUTA_GRAPH` definidos | **Detener** — campos obligatorios |
| Profiles de targets activos | Cada `targets.*.profile` apunta a un archivo existente | Advertir — ese target se omite |
| Tools disponibles | `code_graph.py`, `compound_loop.py` en `sdd-toolkit/tools/` | Advertir — features limitadas |
| MCP accesible | Si `MCP_TEST` definido: ejecutar `SELECT 1` contra él | Advertir — verificación SQL deshabilitada |

Checks con **Detener**: stop condition antes de continuar con cualquier target.
Checks **Advertir**: continuar con funciones reducidas, documentar en output final.

---

## Flujo según targets activos

Lee `sdd.config.yaml` → `targets` y ejecuta el bootstrap de cada target habilitado.

---

### Si `frontend.enabled: true`

#### Paso 1 — Escanear el repo frontend

```bash
python sdd-toolkit/tools/code_graph_front.py \
  --repo "<RUTA_REPO_FRONT>" \
  --out "<RUTA_GRAPH>" \
  --proyecto "<PROYECTO_FRONT>"
```

Produce:
- `code_graph_front.json` — grafo de módulos (nodos + dependencias)
- `code_graph_front.md` — resumen legible: páginas, componentes, hooks, stores

#### Paso 2 — Leer el grafo y generar contexto inicial

Leer `code_graph_front.md` y realizar un análisis de primer nivel:

1. **Identificar dominios funcionales**: agrupar páginas/componentes por área
   (ej: ventas, catálogo, usuario, admin). Un dominio = una carpeta temática
   o un conjunto de componentes cohesivos.

2. **Por cada dominio detectado**, crear `<RUTA_PLANNING>/specs/<dominio>-front.md`
   con esta estructura:

```md
# Specs frontend — <dominio>

> Generado por /iniciar. Actualizar con cada requerimiento que toque este dominio.

## Páginas / Vistas

| Ruta | Componente | Descripción |
|------|-----------|-------------|
| <ruta> | <componente> | <qué hace> |

## Componentes principales

| Componente | Archivo | Reutilizado en |
|-----------|---------|---------------|
| <nombre> | <path> | <páginas que lo usan> |

## Hooks de dominio

| Hook | Archivo | Descripción |
|------|---------|-------------|
| <hook> | <path> | <qué query/mutación maneja> |

## Stores Zustand

| Store | Archivo | Estado que maneja |
|-------|---------|------------------|
| <store> | <path> | <qué guarda> |

## Contratos API consumidos

| Endpoint | Hook | Descripción |
|----------|------|-------------|
| <endpoint> | <hook> | <para qué> |

## Invariantes conocidos

<!-- Agregar al descubrir durante requerimientos -->

## Historial de requerimientos

<!-- /completar agrega aquí automáticamente -->
```

3. **Crear o actualizar `_graph.md`** en `<RUTA_GRAPH>` con una sección frontend:

```md
## Frontend — <PROYECTO_FRONT>

> Generado por /iniciar — <fecha>.

### Estadísticas iniciales
- Páginas/vistas: N
- Componentes: N
- Hooks: N
- Stores Zustand: N
- Módulos con TanStack Query: N

### Dominios detectados
| Dominio | Páginas | Componentes clave |
|---------|---------|------------------|
| <dominio> | <lista> | <lista> |

### Módulos más referenciados
<top 10 del code_graph_front.md>

### Requerimientos
<!-- /completar agrega aquí -->
```

#### Paso 3 — Verificar el proyecto

Si `<RUTA_REPO_FRONT>` existe y es accesible:

```bash
cd "<RUTA_REPO_FRONT>"
tsc --noEmit    # registrar si hay errores previos al primer requerimiento
```

Documentar el resultado en `_graph.md` sección frontend:

```md
### Estado inicial del proyecto
- `tsc --noEmit`: OK / N errores pre-existentes (no son de este sprint)
- `vite build`: OK / errores (registrar)
```

Esto establece la "línea base" — errores que existían antes del trabajo SDD.

---

### Si `backend.enabled: true`

Ejecutar el bootstrap de backend (ya disponible via `/sincronizar`):

```bash
python sdd-toolkit/tools/code_graph.py
```

Para proyectos donde solo hay frontend, omitir este paso.

---

### Si `database.enabled: true`

Registrar las bases de datos activas en `_graph.md`. No escanear schema
automáticamente aquí — eso lo hace `code_graph.py` con conexión MCP.

---

## Output al finalizar

```md
### /iniciar — Bootstrap completado

**Targets inicializados:**
- frontend: <PROYECTO_FRONT>
  - Módulos escaneados: N
  - Dominios detectados: <lista>
  - Specs creados: <lista de archivos>
  - _graph.md: actualizado
  - Estado tsc: OK | N errores pre-existentes

**Próximos pasos:**
1. Revisar `code_graph_front.md` y ajustar dominios si el agrupamiento no es correcto.
2. Completar "Contratos API consumidos" en cada `specs/<dominio>-front.md` con
   los endpoints reales (visible al explorar los hooks de TanStack Query).
3. Abrir el primer requerimiento con `/definir` — el contexto ya está listo.
```

---

## Stop conditions — DETENTE aquí

1. `RUTA_REPO_FRONT` no está configurado en `sdd.config.yaml` → pedir al usuario que lo configure antes de continuar.
2. La ruta del repo no existe en disco → reportar y detener.
3. `code_graph_front.py` no existe en `sdd-toolkit/tools/` → el toolkit no está completo, reinstalar.
4. `tsc` no está disponible en el repo → anotar "tsc no disponible" en el grafo, no bloquear.

# Profile: context — Repo de specs / planning SDD

> Convenciones del repositorio de contexto. Editar por proyecto.

## Estructura

```
<repo>/
├── specs/                 # source of truth por dominio (uno por dominio)
├── _graph.md              # knowledge graph maestro de requerimientos/relaciones
└── .planning/
    └── tkt-<id>/          # carpeta en minúscula (títulos y branch usan TKT-<id>)
        ├── _index.md      # hub del requerimiento
        ├── spec.md
        ├── design.md
        ├── impl.md        # lo produce el implementador
        ├── delta.md
        └── release.md     # bitácora de deploy
```

## Routing de instancias (multi-proyecto)

Al abrir un requerimiento, determinar la instancia de context **antes** de escribir ningún artefacto:

| Targets en scope del requerimiento | Instancia a usar | Subdirectorio |
|-----------------------------|------------------|---------------|
| solo `database` y/o `backend` | `shared` | `ProjectContexts/shared/` |
| incluye `frontend.*` | instancia del proyecto (`context_instance` en `frontend.instances`) | `ProjectContexts/<nombre>/` |

Regla: leer `targets en scope` del `_index.md` (o del enunciado del requerimiento si aún no existe).
Si el requerimiento menciona pantallas, componentes, rutas web o cualquier elemento frontend → usar la instancia del proyecto front correspondiente.

## Reglas

- Antes de definir un requerimiento, leer `specs/<dominio>.md` del dominio afectado.
- Leer `_graph.md` para detectar requerimientos relacionados o patrones ya usados.
- Cada requerimiento vive en su carpeta `tkt-<id>/` bajo `.planning/`.
- Nunca proponer objetos que ya existan — verificar en specs primero.
- Antes de proponer un objeto en `spec.md`/`design.md`, recorrer
  `specs/<dominio>.md` y `_graph.md` (peldaño 3 de la escalera, methodology.md
  regla 6) y registrar la evidencia en `spec.md` → "Reutilización detectada".
  Ningún objeto nuevo sin haber descartado reuso.

## Plantilla `_index.md`

Fuente única del hub del requerimiento — las reglas del implementador la referencian, no la redefinen.

```markdown
# TKT-<id> — <título>
<!-- Estado: uno de SPEC PENDIENTE · DISEÑO PENDIENTE REVISIÓN · LISTO PARA EJECUTAR · EN REVISIÓN ·
     REQUIERE CAMBIOS · LISTO PARA PR · REQUIERE DECISIÓN · RIESGOSO ·
     URGENTE EN CURSO · ARCHIVADO -->
- Estado: <estado del ciclo>
- Estructura: estándar | extendida (+ justificación si extendida)
- Dominio: <dominio>
- Targets en scope: <lista>
- size: XS | S | M | L | XL
- Links: spec.md · design.md · impl.md · delta.md · release.md
## Log
- <fecha> — <evento> (registrar aquí los recortes de Should vía escalación al usuario)
```

# tutorial

> **Config:** Lee `sdd-toolkit/sdd.config.yaml` → `vars` antes de ejecutar.
> Sustituye cada `<KEY>` con el valor de `vars.KEY`. Nunca usar placeholders en crudo.


Tutorial guiado del framework SDD <proyecto> para nuevos usuarios.

No implementa ni modifica nada. Solo explica.

---

## Objetivo

Que un nuevo miembro entienda en 3 minutos: qué comandos usar, en qué orden, y cómo empezar.

---

## Cuándo usar

- Primera vez usando SDD
- Nuevo integrante del equipo
- El usuario dice "cómo funciona", "explícame", "soy nuevo"

---

## Flujo del tutorial

Presentar TODO de corrido (sin pausas). Breve y directo.

### 1. La idea

```
SDD = Spec-Driven Development
Pensar antes de codificar.
Cada tarea pasa por especificación antes de tocar código.
```

### 2. Los comandos

```
/iniciar         → Bootstrap de contexto inicial (una vez, post-instalación)
/explorar        → Investigar código/arquitectura (opcional)
/definir         → Qué construir + sizing automático + criterios de éxito
/diseñar         → Cómo construirlo (plan técnico + pruebas: matriz con caso negativo + mutation)
/analizar        → Verificación cruzada spec↔design antes de implementar (opcional, recomendado en requerimientos M/L)
/ejecutar        → FASE PROBAR (shift-left, paso DURO) → código → auditoría. El SP de negocio
                   exige su *Pruebas*.sql con caso negativo ANTES de implementar (hook bloquea)
/revisar         → Tests + mutation en críticos + auditorías + QA + seguridad (bloqueos duros)
/completar       → Cerrar: delta + merge a specs + _graph + métricas + descripción PR
/avance          → Ver estado (uno o todos los requerimientos)
/retrospectiva   → Analizar tendencias cross-requerimiento y recomendar mejoras al proceso
/sincronizar     → Detectar drift entre docs y BD/API/graph (sugerido: mensual)
/escalar         → Pedir decisión humana
/urgente         → Fix producción rápido con trazabilidad
/normalizar-sql  → Encoding UTF-8 BOM + CRLF a archivos SQL
/tutorial        → Este tutorial
```

Flujo normal: `/definir → /diseñar → /ejecutar → /revisar → /completar`

### 3. Qué se genera

Cada requerimiento crea una carpeta con archivos separados:

```
.planning/tkt-<id o Descripcion>/
├── _index.md    ← estado y links
├── spec.md      ← qué (user story, alcance)
├── design.md    ← cómo (plan técnico)
├── impl.md      ← qué se hizo
└── delta.md     ← qué cambió en el sistema
```

Naming del requerimiento (título/branch/graph): `TKT-14818` (con número) o
`TKT-RegistroClientes` (sin número, permanente). La **carpeta** va en minúscula: `tkt-14818/`.

### 4. Cómo empezar

```
Tengo un requerimiento claro      → /definir
Tengo una idea vaga         → /explorar
Quiero ver dónde voy        → /avance
Se cayó producción          → /urgente
```

La auditoría, los agentes especializados y el knowledge graph funcionan solos. No necesitas saber cómo — solo usar los comandos.

---

## Reglas del comando

- No implementar código.
- No crear artefactos.
- Solo explicar.
- Si el usuario pregunta algo puntual, responder directo sin repetir todo.

---

## Resultado esperado

```md
### Tutorial SDD completado

Comandos: `/iniciar` `/explorar` `/definir` `/diseñar` `/analizar` `/ejecutar` `/revisar` `/completar` `/avance` `/retrospectiva` `/escalar` `/urgente` `/sincronizar` `/normalizar-sql` `/tutorial`

¿Tienes un requerimiento o idea para empezar?
```

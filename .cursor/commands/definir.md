# definir

> **Config:** Lee `sdd-toolkit/sdd.config.yaml` → `vars` antes de ejecutar.
> Sustituye cada `<KEY>` con el valor de `vars.KEY`. Nunca usar placeholders en crudo.


Refina una user story, requerimiento, bug, feature o requerimiento usando la metodología Spec-Driven Development de <proyecto>.

## Objetivo

Convertir una idea o requerimiento ambiguo en una especificación clara, accionable y lista para propuesta técnica.

No implementes código en este comando.

---

## Ruta obligatoria — Estructura Graph

Crear carpeta y artefactos en:

```txt
<RUTA_PLANNING>\req-<id>\          ← prefijo nuevo; también válido tkt-<id>
├── _index.md    ← hub del requerimiento (estado, graph, metadata)
└── spec.md      ← especificación (user story, alcance, criterios)
```

Ejemplo:

```txt
<RUTA_PLANNING>\tkt-14679\
├── _index.md
└── spec.md
```

---

## Si no hay requerimiento ID numérico

Usar `TKT-<Descripcion>` en UpperCamelCase (ej: `TKT-RegistroClientes`, `TKT-NotifPushMetas`).

Este formato es **permanente** — no requiere renombrar después. Son requerimientos válidos sin número de sistema.

Formato de carpeta (prefijo en minúscula, como todo dir de requerimiento):
```txt
.planning/tkt-<Descripcion>/
```

---

## Stop conditions — DETENTE aquí

Para si ocurre cualquiera de estas condiciones:

0. Faltan documentos de entrada obligatorios (ver Paso 0) → STOP. Listar faltantes, pedir que se adjunten. No crear carpeta ni artefactos. No asumir contenido.
1. No hay requerimiento legible ni requerimiento ID → pedir al usuario antes de crear cualquier artefacto.
2. El requerimiento ID ya tiene carpeta con `_index.md` → leer estado actual antes de sobreescribir; no resetear.
3. Dependencias con requerimientos no archivados que afectan Must → documentar y pedir confirmación explícita, no asumir.
4. El requerimiento califica para `planificador-requerimiento` (≥2 criterios del umbral) → escalar antes de crear spec.
5. Definition of Ready falla en ≥2 ítems Must → no avanzar a `/diseñar`; dejar estado `REQUIERE DECISIÓN`.

## Flujo obligatorio

0. **Gate de documentos de entrada** (antes de cualquier otro paso):

   Ningún requerimiento avanza a `/definir` sin los documentos del requerimiento. Verificar presencia:

   | # | Documento | Condición |
   |---|-----------|-----------|
   | 1 | **Contexto del Requerimiento** | Obligatorio siempre |
   | 2 | **Contexto Técnico** | Obligatorio siempre |
   | 3 | **Mockup / Diseño Visual** | Obligatorio si el requerimiento toca UI (frontend / mobile / web-legacy). Opcional si no hay interfaz gráfica. Si llega en crudo (HTML, bundle, imágenes), correr antes `/mockup-a-contexto` |

   - Si falta **cualquiera** de los obligatorios → aplicar stop condition 0. Detener. Listar qué falta. No asumir.
   - Si el requerimiento toca UI y falta mockup → mismo STOP.
   - Solo con los documentos aplicables presentes → continuar al paso 1.

1. Leer requerimiento original (desde los documentos de entrada + mensaje del usuario).
1.5. **Gate de clarificación** (antes de crear cualquier artefacto):
   Escanear el requerimiento buscando indicadores de ambigüedad:
   - Términos vagos: "a veces", "según", "cuando aplique", "si es posible", "debería", "podría"
   - Sujeto indefinido: ¿quién dispara la acción?
   - Criterio de éxito ausente: ¿cómo se sabe que está listo?
   - Dependencia implícita: "igual que X" sin describir X
   - Comportamiento de borde no definido: ¿qué pasa si falla?

   Si se detectan **≥2 indicadores**: emitir máximo 5 preguntas específicas y **ESPERAR** respuesta.
   No crear carpeta ni artefacto hasta tener las respuestas.
   Si el requerimiento es claro (0–1 indicadores): continuar directo al paso 2.
2. Detectar requerimiento ID si existe.
3. **Leer contexto previo** (antes de crear artefactos):
   - Buscar `<RUTA_SPECS>\<dominio>.md` relevante → conocer estado actual del sistema en ese dominio.
   - Buscar `<RUTA_GRAPH>` → identificar requerimientos relacionados, patrones aplicados, conexiones existentes.
   - Si hay requerimientos relacionados, leer sus `_index.md` para contexto (NO copiar su spec).
3.5. **Clasificar talla del requerimiento** (sizing — antes de crear cualquier artefacto):

   Contar objetivamente a partir del requerimiento:

   | Talla | Targets en scope | Objetos estimados | CAs estimados | Acción |
   |-------|-----------------|-------------------|---------------|--------|
   | XS | 1 | ≤1 | ≤2 | Spec directa |
   | S  | 1 | 2–3 | ≤4 | Spec directa |
   | M  | 1–2 | 4–6 | ≤8 | Spec directa + recomendar `/analizar` |
   | L  | 2+ | 7+ o >2 semanas | >8 | Stop condition 4: escalar a `planificador-requerimiento` |
   | XL | 3+ | múltiples fases, coordinación de equipo | — | Obligatorio `planificador-requerimiento` |

   - *Objetos estimados* = SPs + endpoints + componentes frontend mencionados explícitamente.
   - Si el requerimiento es ambiguo, contar targets visibles y estimar conservadoramente.
   - Registrar la talla en `_index.md` → `## Metadata` como `size: XS|S|M|L|XL`.
   - L/XL → aplicar stop condition 4 antes de continuar.

3.6. **Detector de hotspot** (antes de crear artefactos): contar en `<RUTA_GRAPH>` y
   `_sdd_evolution.md` los requerimientos **Bug Fix** que tocaron los mismos objetos
   (SP/tabla/endpoint) de este requerimiento. Con **≥ 3** en los últimos 6 meses:
   - abrir `spec.md` con `> ⚠ HOTSPOT: <objeto> — N bugs (<TKT-a, TKT-b, …>)`;
   - sugerir `/escalar` hacia **refactor con paridad** (characterization) en vez de otro
     parche, y dejar la decisión al usuario (no se decide solo);
   - registrar en `_index.md → Metadata`: `hotspot: <objeto> (N)`.

4. Crear slug corto y descriptivo.
5. Crear carpeta del requerimiento si no existe.
6. Crear `_index.md` (hub del graph) — incluir sección `## Dominios` y `## Related requerimientos` si aplica.
7. Crear `spec.md` (especificación) — referenciar comportamiento actual de `specs/` (en contextos) si es relevante.
8. Refinar user story.
9. Definir objetivo, alcance, fuera de alcance.
10. Generar criterios de aceptación.
11. Identificar sistemas afectados.
12. Detectar riesgos y preguntas abiertas.
12.5. **Pasada adversarial obligatoria** — invocar la skill `/abogado-del-diablo`
    sobre el borrador del spec: poke-holes a cada criterio, marcar `(asumido)` lo no
    evidenciado, confirmar causa raíz (Bug Fix) y proponer invariantes faltantes.
    Es un paso del proceso, no opcional: encuentra puntos ciegos fuera de la vista del
    autor. La profundidad escala con la talla (ticket trivial → pasada rápida que
    reporta "sin objeciones"); nunca se salta. Las objeciones se acogen o se rebaten.
13. Identificar agentes necesarios.
14. **Crear ramas Git según config** — para cada instancia del requerimiento con git habilitado:

   **Algoritmo:**
   1. Leer `sdd-toolkit/sdd.config.yaml` → `targets`.
   2. Para cada instancia con `git.enabled: true`: verificar si esa instancia está en scope del requerimiento (el spec menciona su target — API, frontend, etc.).
   3. Si está en scope → **OBLIGATORIO** invocar el agente git correspondiente en Modo 1:
      - Target `backend` o `database` → `git-api`
      - Target `frontend` → `git-frontend`
      - Target `mobile` → `git-mobile`
   4. Registrar en `_index.md` → Metadata: `branch: <rama calculada>`.
   5. Si hay error de git → registrar en `Preguntas abiertas` y continuar con la spec.

   Ejemplo con config actual (nesgoapi, `git.enabled: true`):


```powershell
Set-Location "<RUTA_REPO_API>"
git checkout MASTER-WMS
git pull origin MASTER-WMS
git checkout -b TKT-<id>
```

   - Confirmar que la rama quedó activa con `git branch --show-current`.
   - Registrar en `_index.md` → sección Metadata: `branch: TKT-<id>`.
   - Si hay error de git → registrar en `Preguntas abiertas` y continuar con la spec.

15. **Validar Definition of Ready** antes de cerrar la spec:
    - [ ] Todos los Must del alcance tienen criterio de aceptación verificable `[M]`
    - [ ] Si el requerimiento MODIFICA algo existente → sección "Invariantes" llena
          (reglas previas extraídas de specs/SP headers/requerimientos) con CA-R `[M]` de regresión
    - [ ] Instancias en scope identificadas
    - [ ] Sin preguntas abiertas que afecten un Must
    - [ ] Pasada `/abogado-del-diablo` ejecutada; objeciones acogidas o rebatidas
    - [ ] Sin dependencias con requerimientos no archivados (o documentadas y aceptadas)

    Si algún punto falla → estado `REQUIERE DECISIÓN` (no avanzar a `/diseñar`).

16. Dejar estado como `SPEC PENDIENTE` en `_index.md` (o `REQUIERE DECISIÓN` si DoR falló).

---

## Agente recomendado

Usa `planificador-requerimiento` si el requerimiento es **complejo** y requiere descomposición en fases.

**Regla de umbral (objetiva):** escalar a `planificador-requerimiento` (estructura
extendida: `PROJECT.md + REQUIREMENTS.md + ROADMAP.md + STATE.md + phases/`)
solo si el requerimiento cumple **2 o más** de:

- Toca **>3 instancias** (`target:instancia` según `sdd.config.yaml`)
- Estimación **>2 semanas** o requiere entregas parciales
- **>2 dominios** funcionales afectados
- Dependencias con **otros requerimientos no archivados**

Registrar la decisión y su justificación en `_index.md`. Para todo lo demás,
`/definir` genera el graph básico (`_index.md` + `spec.md`).

---

## Formato obligatorio: _index.md

```md
# tkt-<id>: <slug>

## Estado

SPEC PENDIENTE

## Graph

| Artefacto | Archivo | Comando | Estado |
|-----------|---------|---------|--------|
| Spec | [spec.md](spec.md) | /definir | Creado |
| Design | [design.md](design.md) | /diseñar | Pendiente |
| Test | `<yyyymmdd>_<TKT>_PruebasUnitarias.sql` | /test (auto en /diseñar) | Pendiente |
| Impl | [impl.md](impl.md) | /ejecutar | Pendiente |
| APIs Front | `TKT-<Numero>-APIS.md` | /revisar (auto si hay endpoints) | Pendiente / No aplica |
| Delta | [delta.md](delta.md) | /completar | Pendiente |

## Metadata

- requerimiento: tkt-<id>
- slug: <slug>
- size: XS|S|M|L|XL
- created: yyyy-mm-dd
- updated: yyyy-mm-dd

## Depende de

<!-- Requerimientos que deben completarse/deployarse ANTES de este. Vacío si no hay. -->

## Dominios

<!-- Dominios funcionales tocados como wikilinks: [[ventas]], [[clientes]], [[wms]], etc. -->

## Related requerimientos

<!-- Requerimientos relacionados como wikilinks: [[TKT-XXXXX]] descripcion -->

## Log de estados

| Fecha | De | A | Comando | Nota |
|-------|----|---|---------|------|
| yyyy-mm-dd | — | SPEC PENDIENTE | /definir | Spec creada |
```

---

## Formato obligatorio: spec.md

Generar `spec.md` siguiendo **exactamente** la plantilla canónica
[`sdd-toolkit/templates/spec.md`](../../sdd-toolkit/templates/spec.md) como
**fuente única de la estructura**. No se duplica el esqueleto aquí: si la plantilla
evoluciona, este comando la hereda sin editarse.

Esa plantilla incluye — y son obligatorios cuando aplican: User story, Contexto/problema
(causa raíz si es Bug Fix), Alcance MoSCoW, Instancias en scope, Invariantes (INV-x),
**Characterization (CHAR-x) solo Refactor**, **Propiedades (PBT-x) opcional**, Criterios
de aceptación en Given/When/Then, Reutilización (escalera), Definition of Ready (INVEST)
y Quick Checks.

### Selección de agentes (referencia al llenar la sección correspondiente)

- **Implementación:** `desarrollador-api` (endpoints) · `desarrollador-sql` (SQL) · `desarrollador-react` (frontend) · `desarrollador-flutter` (Flutter)
- **Pruebas:** `tester-sql` · `api-tester` · `frontend-tester` · `flutter-tester`
- **Auditoría:** `auditor-sql` · `auditor-codigo` (SQL/C#/JS/Python) · `auditor-flutter` (Dart) · `corrector-revision`
- **Git:** `git-api` (backend/SQL) · `git-frontend` · `git-mobile` (Flutter)

---

## Pasada adversarial — abogado del diablo

Paso **12.5 del flujo (obligatorio)**: `/abogado-del-diablo` reta el spec antes del
cierre (detalle en la skill). Nunca se salta; profundidad según talla. También on-demand.

## Reglas

- No implementar código.
- No modificar archivos productivos.
- No tocar SQL.
- No crear endpoints.
- No corregir bugs todavía.
- No ejecutar auditorías.
- Solo refinar, aclarar y documentar.
- Sin documentos de entrada obligatorios → STOP (Paso 0). No asumir lo que falta.
- Si falta contexto crítico, registrarlo en `Preguntas abiertas`.
- Si el requerimiento es claro, no pedir confirmación innecesaria.
- Mantener alcance mínimo.
- No agregar features no solicitadas.
- No mezclar múltiples requerimientos en un mismo archivo.

---

## Resultado esperado

Al terminar, responder con:

```md
### Spec refinada

- Carpeta: `.planning/tkt-<id>/`
- Artefactos: `_index.md`, `spec.md`
- Estado: `SPEC PENDIENTE`

### Resumen

- ...

### Preguntas abiertas

- ...

### Siguiente comando

`/diseñar`
```

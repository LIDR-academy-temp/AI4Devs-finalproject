> Documenta el **flujo de trabajo integral con IA** (eje de evaluación AI4Devs), no solo comandos sueltos, aplicando la metodología de planificación y documentación con IA del máster (Módulos 4 y 5).
>
> **Resumen evaluable en `readme.md` §1–§7:** hasta tres prompts por sección (texto enviado + herramienta + *qué artefacto quedó* + extracto de **respuesta del asistente**). **Registro completo prompt↔respuesta:** §1–§7 de este archivo (ejecutado sept. 2026 contra el diseño del repo).
>
> Cada bloque importante sigue: **prompt minimalista** (riesgo de respuestas genéricas) → **prompt AI-Ready** (rol, restricciones, formato, non-goals) → **refinamiento humano** fusionado en `readme.md`.

## Índice

- [A. Metodología aplicada (Módulos 4 y 5)](#a-metodología-aplicada-módulos-4-y-5)
- [B. Contexto que alimenta a la IA](#b-contexto-que-alimenta-a-la-ia)
- [C. Plantilla de prompt AI-Ready](#c-plantilla-de-prompt-ai-ready)
- [D. Flujos de trabajo representativos (6)](#d-flujos-de-trabajo-representativos-6)
- [E. Capas de documentación ↔ artefactos](#e-capas-de-documentación--artefactos)
- [F. Nota sobre respuestas registradas](#f-nota-sobre-respuestas-registradas)
- [G. Configuración de contexto: reglas, subagentes, comandos, skills y hooks](#g-configuración-de-contexto-reglas-subagentes-comandos-skills-y-hooks)
- [Entrega 2 — Implementación con IA (octubre 2026)](#entrega-2--flujo-de-implementación-con-ia-octubre-2026)
- [Entrega 3 — Cierre, tests E2E y entrega final (noviembre 2026)](#entrega-3--cierre-tests-e2e-y-entrega-final-noviembre-2026)
- [Herramientas y modelos utilizados](#herramientas-y-modelos-utilizados)
1. [Descripción general del producto](#p1-producto)
2. [Arquitectura del sistema](#p2-arquitectura)
3. [Modelo de datos](#p3-modelo-datos)
4. [Especificación de la API](#p4-api)
5. [Historias de usuario](#p5-historias)
6. [Tickets de trabajo](#p6-tickets)
7. [Pull Requests (Entrega 1)](#p7-prs)

---

## A. Metodología aplicada (Módulos 4 y 5)

| Práctica del máster | Cómo se aplicó en CuartaQuinientos |
|---------------------|-------------------------------------|
| **Capability planning** | Outcomes por dominio documentados en `readme.md` §1–§6 + roadmap por fases (`readme.md` §5) |
| **Backlog AI-Ready** | Historias §5 con `[M/S/C]`, AC Given/When/Then, §5.0.1 poke-holes, DoD por tipo |
| **AI as Poke-Holes** | Humano redacta happy path → IA desafía supuestos → filtrado de 3–5 hallazgos (Flujo 3) |
| **Estimación IA como peer + buffer ~30%** | Roadmap con margen de revisión humana (no saturar capacidad al 100%) |
| **Docs-as-code / 4 capas** | Arquitectura + API + operación en `readme.md`; este archivo = capa operacional IA |
| **Coherencia antes de cerrar doc** | Toda salida de IA se cruza con el diseño acordado en `readme.md` (modelo, rutas, catálogos) |

---

## B. Contexto que alimenta a la IA

Documentos de entrada para generar backlog, diagramas y contratos **sin inventar fuera del diseño**:

| Documento | Rol |
|-----------|-----|
| `readme.md` | Fuente de verdad de Entrega 1: producto, arquitectura, modelo, API, HUs, tickets |
| `prompts.md` | Registro de flujos y refinamientos (este archivo) |
| `ContextoCuartaQuinientos/specs/*.md`, `_graph.md` | Contexto por dominio y grafo de dependencias que leen los agentes SDD |
| `SQL/cuartaquinientos_schema.sql` | Esquema físico: la IA lo contrasta con el modelo lógico (diccionario §3.2) |

**Modelos por fase:** Claude Opus/Sonnet para especificación, diagramas y poke-holes; Cursor para implementación (Entrega 2+); Copilot para autocompletado inline.

---

## C. Plantilla de prompt AI-Ready

```markdown
## Rol
Actúa como [PO Senior | arquitecto .NET | modelador de datos | revisor adversarial].

## Contexto
- Problema de negocio: …
- Documento maestro: readme.md §X
- Stack acordado: ASP.NET Core 9, Dapper, vistas vs*, REST /{Dominio}/{Controller}, JWT

## Objetivo
Outcome medible en una frase.

## Restricciones
- Alcance: solo lo listado en readme; marcar `(asumido)` lo pendiente de definir
- Prohibido: SPs de negocio, rutas `/api/*` genéricas, entidades en inglés ajenas al diseño
- Modelo en español por esquemas: sgr, tkt, fnz, …

## Formato de salida
[tabla | Mermaid | HUs con labels | ticket técnico con AC]

## Non-goals
Qué NO debe proponer el agente en esta iteración.

## Criterio de calidad
Given/When/Then observables; coherencia con readme.md §3 y §4.
```

### Patrón uniforme de registro (§1–§7)

Cada prompt del registro completo usa **el mismo bloque** (el `readme.md` lleva extracto + enlace aquí):

| Campo | Contenido |
|-------|-----------|
| Encabezado | `**Prompt N — título** *(herramienta · fase)* · [Flujo](#…)` si aplica |
| **Prompt AI-Ready** | Bloque ``` con `## Rol`, `## Contexto`, `## Objetivo`, `## Restricciones`, `## Formato de salida`, `## Non-goals`, `## Criterio de calidad` (plantilla §C) |
| **Artefacto** | Sección o archivo que quedó en el repo |
| **Respuesta del asistente** | Síntesis verificable (no transcripción del chat) |
| **Refinamiento humano** | Corrección o decisión del autor; `—` si no hubo |

§**D** (flujos) y §**1–§7** (registro) comparten **el mismo formato visual**; el readme lleva el prompt narrativo corto + enlace al registro completo aquí.

---

## D. Flujos de trabajo representativos (6)

### Flujo 1 — De problema de dominio a ficha de producto (§1 readme)

**Prompt AI-Ready:**

```
## Rol
PO Senior (condominios) + arquitecto técnico.

## Contexto
Fraccionamiento sin sistema digital (WhatsApp, papel, Excel). Primera plataforma digital del fraccionamiento, a diseñar e implementar.
Entrega 1: 0% código; salida en readme.md §0–§1.

## Objetivo
Objetivo de producto, tabla de 15 módulos, stack (.NET 9, React 18, bot Python) y trade-offs.

## Restricciones
ANM = Anuncios; VTS = visitas/áreas; vehículos/mascotas en usr.
Marcar (asumido) lo no cerrado; integrar bot, ia, bi, wms como módulos del diseño.

## Non-goals
No código; no reducir sin justificar a un MVP de 3 módulos si la visión es plataforma completa.
```

**Refinamiento humano:** unificar stack en .NET 9; documentar visión de 15 módulos en §1.2, ampliada después con descripción general y detallada por módulo (§1.2.1) y la sección del bot (§1.2.2) — ver §1 Prompt 4.

---

### Flujo 2 — ERD y modelo de datos (§3 readme)

**Prompt AI-Ready:**

```
## Rol
Modelador SQL Server + Mermaid ER.

## Contexto
readme.md §3 (entidades, auditoría bEliminado, catálogos).
Sin stored procedures de negocio.

## Objetivo
ERD Mermaid del modelo acordado + subgraph bot/ia/bi/wms.

## Restricciones
Residente = sgr.Usuarios + Casas; cobros = fnz.Cuotas.
Telegram: bot.CuentasTelegram (no password en chat).
Tipos Mermaid: decimal sin coma en el nodo.

## Non-goals
No EF migrations en Entrega 1.
```

**Refinamiento humano:** descartar primer borrador con entidades en inglés (`Resident`, `IsActive`); adoptar esquema por dominios en español.

---

### Flujo 3 — Poke-holes HU-TKT-01 + Telegram (§5.0.1 readme)

**Registro completo:** [§5 Prompt 3](#p5-historias) + tabla ampliada [Poke-holes](#poke-holes-y-supervisión-humana-módulo-45).

**Artefacto:** `readme.md` §5.0.1 + tabla 12 filas.

**Refinamiento humano:** integrar 7 hallazgos numerados en readme; resto en tickets o Fase 2+.

---

### Flujo 4 — Historia INVEST → ticket backend (§6 readme)

**Prompt AI-Ready:**

```
## Rol
Tech lead .NET (ASP.NET Core 9, Dapper, transacciones).

## Contexto
Historia HU-TKT-01; diseño readme.md §3–§4; ADR-001 (sin SPs de negocio).

## Objetivo
Ticket técnico TKT-BE-001 listo para Entrega 2 con AC verificables.

## Restricciones
Servicio C# + Dapper + IDbTransaction; POST /TKT/Tickets; estados/prioridad desde catálogos tkt.*;
notificación a admins; lectura tkt.vsTickets. Prohibido prcCreateTicket o SP JSON.

## Formato de salida
Ticket §6: título, estimación, dependencias, AC Given/When/Then técnicos, archivos a tocar.

## Non-goals
No código C# en Entrega 1; no GraphQL en este ticket (TKT-BE-002 aparte).

## Criterio de calidad
Coherencia con HU-TKT-01 y §4 Endpoint 2.
```

**Refinamiento humano:** rechazar borrador con stored procedure; plantilla Ticket 1 en readme §6.

---

### Flujo 5 — Refinamiento adversarial del diseño (Entrega 1)

**Prompt AI-Ready:**

```
## Rol
Revisor adversarial (poke-holes).

## Contexto
readme.md completo (alcance Entrega 1).

## Objetivo
Listar supuestos implícitos, edge cases y gaps de seguridad antes de Entrega 2.

## Non-goals
No implementar código.
```

**Refinamiento humano:** integrar hallazgos en §5 (DoD, non-goals) y §2.5 (Telegram, notificaciones).

---

### Flujo 6 — Revisión final de coherencia antes de entregar (24-sep-2026)

**Herramienta:** Claude (Cowork) con acceso de lectura a todo el repositorio (readme, prompts, `SQL/`, `ContextoCuartaQuinientos/`, `scaffolds/`, `sdd.config.yaml`).

**Prompt AI-Ready:**

```
## Rol
Editor técnico + revisor adversarial (documentación de arranque Entrega 1).

## Contexto
Repositorio completo: readme.md, prompts.md, SQL/, ContextoCuartaQuinientos/, scaffolds/, sdd.config.yaml.
Entrega 1 = diseño listo para programar Entrega 2.

## Objetivo
Redacción clara y coherencia cruzada readme ↔ prompts ↔ SQL ↔ SDD ↔ scaffolds; lista de bloqueos Entrega 2.

## Restricciones
Señalar contradicciones y snippets que no cuadran con el esquema real; proponer correcciones;
marcar explícitamente lo que requiere decisión humana (no decidir solo).

## Formato de salida
Tabla por tipo (contrato vs SQL, arquitectura, backlog, seguridad, forma); luego decisiones humanas pendientes.

## Non-goals
No reescribir el producto desde cero; no implementar código en esta pasada.
```

**Qué encontró la IA (resumen de ~40 hallazgos):**

| Tipo | Ejemplos |
|------|----------|
| Contrato vs esquema físico | Snippets con `Correo`, `PasswordHash`, `MontoPagado`, `CuentaID`, `FechaCreacion` en `tkt.Tickets` que no existen en el SQL; errata `TipoNotiicfacion`; `Transacciones.Monto` vs `Cargo/Abono` |
| Contradicciones internas | Dashboard "solo Admin" en §4 vs resumen del residente en el ticket 14; categoría obligatoria en la API pero *non-goal* en Fase 1; comandos del bot distintos entre HU y tickets (`/cuotas` vs `/cuenta`, `/tarea` vs `/mitarea`); dos flujos distintos para crear ticket por bot |
| Arquitectura | Tickets del bot escritos con otra librería (aiogram) y consultando la BD directamente, contra la regla "el bot es cliente REST"; sin mecanismo para que el bot obtenga el JWT tras reiniciar; sin almacenamiento definido para archivos; SQL Server en Railway sin nota de riesgo |
| Huecos de backlog | Sin tickets de scaffolding/CI, de *seeds* (sin catálogos no hay ticket "Nuevo") ni de administrador inicial; sin historia para **generar cuotas**; cambio de contraseña `[S]` pese a ser obligatorio en el primer login; sin pantallas de administración para 2 de las 5 historias del núcleo |
| Seguridad | "Cuenta inactiva" revelaba cuentas existentes; sin *rate limiting* en login; JWT en `localStorage` sin decidir; `RefreshTokens` usado como bitácora; registro de pago sin protección ante doble registro concurrente |
| Forma | Ancla `{#…}` que GitHub no soporta; referencias a "roadmap §1.4" inexistente; horas y puntos mezclados; "FluentValidation/VineJS" (VineJS es de Node) |

**Supervisión humana (decisiones del autor):**

- Se decidió que **el readme es la fuente de verdad** de los nombres (ADR-008); en lugar de documentar los nombres físicos heredados, se creó **DB-001** para alinear el esquema antes de programar.
- Se pidió aplicar todas las correcciones directamente; la versión anterior queda en el historial de git.
- Se aceptó mover los adjuntos de tickets a Fase 2 para proteger el núcleo, y fijar "sin pagos parciales" en Fase 1.

**Artefactos:** `readme.md` §0.7, §1.4, §2.2–§2.8 (ADR-006…009), §3.2 (máquina de estados y diccionario), §4 (errores `ProblemDetails`, Endpoint 3 por perfil), §5 (HU-USR-03 `[M]`, HU-FNZ-06), §6 (tickets 1, 3, 4, 7, 9, 11, 19–22 reescritos y tickets 33–40 nuevos); `CLAUDE.md`; `.gitignore`.

---

## E. Capas de documentación ↔ artefactos

| Capa (Módulo 5) | Artefacto Entrega 1 | Flujo IA |
|-----------------|---------------------|----------|
| **Arquitectura** | `readme.md` §2, §2.5.1 ADR | 1, 2, 5, 6 |
| **API** | `readme.md` §4 | 4, 6 |
| **Producto / backlog** | `readme.md` §5–§6 | 3, 4, 5, 6 |
| **Operacional IA** | **`prompts.md`**, `CLAUDE.md`, `.cursor/`, `.claude/` | Todos |

---

## F. Nota sobre respuestas registradas

Las **respuestas del asistente** debajo de cada prompt en §1–§7 son **síntesis** alineadas al **objetivo del Prompt AI-Ready** y verificadas contra el artefacto citado en `readme.md` (no transcripciones de chat). Regla de validación: cada respuesta debe mencionar lo que el prompt pidió en `## Objetivo` / `## Formato de salida` y coincidir con la sección del readme indicada en **Artefacto** (nombres de endpoints, tickets, estimaciones, códigos HTTP).

| Control | Qué revisar |
|---------|-------------|
| Objetivo ↔ respuesta | La síntesis describe el entregable pedido (tabla, ERD, ticket, HUs, PRs) |
| Artefacto ↔ readme | Rutas, IDs de ticket, horas y § referenciados existen en el repo |
| Refinamiento | Explica rechazos (SP, `/api/*`) o correcciones posteriores al borrador |

Donde el primer borrador proponía SPs o `/api/*`, se deja «*Borrador rechazado*». En `readme.md`, cada prompt lleva un **extracto**; el registro completo vive aquí.

### Espejo `readme.md` §1–§7 ↔ este archivo

| § | Título (igual en ambos) | Prompts en readme (máx. 3) | Registro `prompts.md` |
|---|-------------------------|----------------------------|------------------------|
| 1 | Descripción general del producto | 1–3 (+ nota P4 en §1.2) | 1–4 |
| 2 | Arquitectura del Sistema | 1–3 | 1–3 |
| 3 | Modelo de Datos | 1–3 | 1–3 |
| 4 | Especificación de la API | 1–3 | 1–3 |
| 5 | Historias de Usuario | 1–3 | 1–3 (+ tabla [Poke-holes](#poke-holes)) |
| 6 | Tickets de Trabajo | 1–3 (+ nota P4 DB-000) | 1–4 |
| 7 | Pull Requests (Entrega 1) | 1–3 | 1–3 (PR única E1; P2–P3 = Entrega 2+) |

---

## G. Configuración de contexto: reglas, subagentes, comandos, skills y hooks

El proyecto no se construye con prompts sueltos sino con un **toolkit de Spec-Driven Development (SDD)** versionado en el repo. Modo `hybrid` (`.sdd-mode`, `sdd.config.yaml`): **Claude planifica** (`spec.md` + `design.md` por ticket) y **Cursor implementa** siguiendo esas specs.

| Pieza | Dónde | Para qué |
|-------|-------|----------|
| Configuración del proyecto | `sdd.config.yaml` | Rutas de API/Web/Bot/SQL, perfiles por *target* (database, backend, frontend, integrations) y convenciones |
| Contexto para agentes | `CLAUDE.md` | Resumen de convenciones, fuentes de verdad y comandos; lo leen Claude Code y Cursor al iniciar |
| Reglas (18) | `.cursor/rules/*.mdc` | Flujo SDD (`00`, `01`, `05`), patrones técnicos (`02` API, `03` SQL, `04` C#, `14` React, `17` ASP.NET Core) y guardas (`06` auditoría, `07` planear antes de codificar, `08` alcance, `09` definición de hecho, `11` seguridad, `13` fuente de objetos, `18` TDD) |
| Subagentes (23) | `.cursor/agents/*.md` | Roles especializados: `planificador-requerimiento`, `analizador-dominio`, `desarrollador-api`, `desarrollador-sql`, `desarrollador-react`, `desarrollador-tdd`, `auditor-seguridad`, `auditor-sql`, `auditor-codigo`, `revisor-impacto`, `api-tester`, `frontend-tester`, … |
| Comandos (15) | `.cursor/commands/*.md` | Ciclo por ticket: `/iniciar` → `/explorar` → `/definir` (spec) → `/diseñar` (design) → `/ejecutar` → `/revisar` → `/completar`; además `/avance`, `/sincronizar`, `/retrospectiva`, `/urgente`, `/normalizar-sql` |
| Skills | `.claude/skills/` | `sdd-workflow` (genera spec/design desde plantillas), `abogado-del-diablo` (poke-holes obligatorio en `/definir` y `/diseñar`), `austero` (disciplina de contexto en sesiones largas) |
| Hooks | `.claude/hooks/` (PreToolUse, compatibles con Claude Code y Cursor) | `check-tests-green`: una suite `*Pruebas*.sql` debe incluir al menos un caso negativo y la evidencia de ejecución (anti *test theater*); `check-mcp-test`: bloquea un `design.md` con bloques SQL que no traen evidencia de haberse verificado contra la BD vía MCP |
| Plantillas y herramientas | `sdd-toolkit/` | Plantillas `spec`/`design`/`delta`/`release`/`pruebas.sql`; scripts `doctor.py`, `check_doc_links.py`, `check_api_drift.py`, `impact_graph.py` |

**Ejemplo de uso real:** el ticket DB-000 se planificó con `/definir` + `/diseñar` y la skill `abogado-del-diablo`, que encontró 57 `USE [db24572]` fijos y datos personales en el script (ver §6 Prompt 4).

---

## Herramientas y modelos utilizados

| Herramienta | Modelo | Fase de uso |
|-------------|--------|-------------|
| **Claude (Cowork / claude.ai)** | Claude Sonnet / Opus | Dominio, arquitectura, HUs, tickets, poke-holes |
| **Claude Code (CLI)** | Claude Sonnet / Opus | Código y tests (Entrega 2+) |
| **Cursor** | Composer | Implementación asistida (Entrega 2+) |
| **GitHub Copilot** | GPT-4o | Autocompletado inline |

> **Nota de método.** Los primeros borradores de la IA suelen proponer SPs, rutas `/api/*` o enums en inglés. La supervisión humana **rechaza** lo que no encaja con el diseño acordado en `readme.md` y pide una segunda pasada con la [plantilla AI-Ready](#c-plantilla-de-prompt-ai-ready).

---

<a id="p1-producto"></a>
## 1. Descripción general del producto

> **Espejo readme:** extractos Prompt 1–3; **Prompt 4** solo en este registro (detalle §1.2.1/§1.2.2).

**Prompt 1 — Definición del problema y alcance** *(Claude · Sonnet/Opus · descubrimiento de dominio)* · [Flujo 1](#flujo-1--de-problema-de-dominio-a-ficha-de-producto-1-readme)

**Prompt AI-Ready:**

```
## Rol
PO Senior (condominios) + arquitecto técnico.

## Contexto
Fraccionamiento CuartaQuinientos sin sistema digital (WhatsApp, recibos en papel, Excel);
reportes de fallas, pagos y avisos se pierden. Primera plataforma digital del fraccionamiento.
Stack previsto: ASP.NET Core .NET 9 (REST + GraphQL, JWT, Dapper, SQL Server), React 18 + Vite + Apollo,
bot Python 3.11 + python-telegram-bot 21. Entrega 1 AI4Devs: solo documentación (SDD), 0% código.

## Objetivo
Ficha de producto §0–§1: problema, visión de 15 módulos (usuarios, tickets, finanzas, notificaciones,
dashboard, anuncios, encuestas, juntas, visitas, archivos, BI, vehículos/mascotas, almacén, «C500 Asiste»),
stack justificado y enfoque API-first.

## Restricciones
ANM = Anuncios; VTS = visitas/áreas; vehículos/mascotas en usr; integrar bot, ia, bi, wms.
Marcar (asumido) lo no cerrado con administración.

## Formato de salida
Secciones readme §0–§1: objetivo, tabla de módulos, público y perfiles.

## Non-goals
No código; no reducir a MVP de 3 módulos sin justificar si la visión es plataforma completa.

## Criterio de calidad
Coherente con SDD (spec antes que código); bot como cliente del mismo API.
```

**Artefacto:** `readme.md` §0–§1 (problema, objetivo, visión de plataforma completa, bot API-first).

**Respuesta del asistente:** Problema = operación dispersa (WhatsApp/papel/Excel). Solución = plataforma **API-first** con 15 módulos en esquemas SQL; React + bot Telegram como clientes del mismo backend. Público: residentes y administración; perfiles en `sgr.Perfiles` (Administrador, Residente, Guardia, Trabajador). Entrega 1: §0–§1 sin código; núcleo académico login → ticket → finanzas → dashboard. SDD: readme → tickets §6 → código Entrega 2+.

**Refinamiento humano:** documentar el **sistema completo**, no un MVP mínimo sin justificación.

**Prompt 2 — Trade-offs de stack** *(Claude · misma fase · decisión de stack)*

**Prompt AI-Ready:**

```
## Rol
Arquitecto de software (evaluación para máster AI4Devs).

## Contexto
readme.md §1 en borrador; stack candidato .NET 9 + SQL Server + GraphQL/REST + React + bot Python.

## Objetivo
Tabla de trade-offs honestos para evaluadores (§1.3–§1.4).

## Restricciones
Comparar: SQL Server vs PostgreSQL; GraphQL+REST vs REST puro (~15 dominios);
Dapper+vistas vs EF Core; Apollo vs fetch manual; bot Python aparte vs extensión .NET.
Máx. ~150 palabras por punto; costos y riesgos reales, no solo ventajas.
Prohibido proponer SPs de negocio o rutas `/api/*` genéricas.

## Formato de salida
Tabla o bullets por decisión con pros/contras/riesgo.

## Non-goals
No implementar; no cambiar alcance de 15 módulos.

## Criterio de calidad
Decisiones defendibles ante tribunal académico y alineadas al resto del readme.
```

**Artefacto:** `readme.md` §1.3–§1.4 (tabla de trade-offs y orden de arranque).

**Respuesta del asistente:** Tabla §1.3: SQL Server (familiaridad .NET; costo licencia → Express/Railway). GraphQL+REST (dashboard compuesto vs más schema). Dapper+vistas (reglas testeables en C# vs scripts manuales). Apollo (cache GraphQL). Bot Python (lib madura; segundo despliegue). §1.4 fija orden de arranque (BD → auth → núcleo). *Borrador rechazado:* SPs de negocio y `/api/USR/login`.

**Refinamiento humano:** **Dapper + `vs*` + FluentValidation**; REST `/{Dominio}/{Controller}`; `POST /SGR/AuthService/GenerateToken`.

**Prompt 3 — Corrección de dominios** *(Claude · alineación Módulos 4–5 del máster)*

**Prompt AI-Ready:**

```
## Rol
PO Senior + modelador de dominio.

## Contexto
Tabla de módulos §1.2 con confusiones típicas de la IA (siglas ANM/VTS/usr).

## Objetivo
Corregir dominios y matriz de trazabilidad §5.0.

## Restricciones
ANM = anuncios/comunicados (no mascotas); VTS = visitas y áreas comunes (no vehículos);
mascotas y vehículos en esquema usr. Integrar bot, ia, bi, wms con paridad web ↔ Telegram.
Marcar (asumido) lo no cerrado con el administrador.

## Formato de salida
Tabla §1.2 corregida + nota de dominio.

## Non-goals
No renombrar esquemas ya acordados en §3 sin marcar impacto.

## Criterio de calidad
Cada fila de módulo trazable a esquema SQL y a historias §5.
```

**Artefacto:** `readme.md` §1.2 (tabla de módulos), nota de dominio y matriz §5.0.

**Respuesta del asistente:** Tabla §1.2 corregida (ANM/VTS/usr); módulos 14–15 WMS y «C500 Asiste»; esquemas `bot`, `ia`, `bi`, `wms`; nota de paridad web ↔ Telegram. Matriz de trazabilidad §5.0 (módulo ↔ HU ↔ datos ↔ API). Pendientes `(asumido)`: umbral morosidad, proveedor LLM en UI admin.

**Refinamiento humano:** corregir confusión típica de siglas ANM/VTS/usr; fijar paridad web ↔ Telegram.

**Prompt 4 — Detalle por módulo y del bot** *(Claude · revisión del autor · 24-sep-2026)*

**Prompt AI-Ready:**

```
## Rol
PO Senior + redactor técnico.

## Contexto
§1.2 demasiado genérico; faltan descripción por módulo y capacidades del bot por perfil.

## Objetivo
§1.2.1 (15 módulos: general + detallado + fase + historias) y §1.2.2 («C500 Asiste» por perfil).

## Restricciones
Solo contenido respaldado en §5 (HUs), roadmap §5 y §2.8; nada inventado; coherencia con prompts.md.

## Formato de salida
Markdown en readme: subsecciones por módulo y tabla bot Residente/Trabajador/Admin/Guardia.

## Non-goals
No nuevas HUs; no endpoints no documentados en §4.

## Criterio de calidad
Cada afirmación del bot o módulo citable en una HU o ADR existente.
```

**Artefacto:** `readme.md` §1.2.1 (15 módulos general/detallado) y §1.2.2 (bot por perfil).

**Respuesta del asistente:** readme §1.2.1 (15 módulos, cada uno con *general* + *detallado*, fase e historias) y §1.2.2 (bot: cómo funciona, tabla de acciones por perfil Residente/Trabajador/Administrador/Guardia y capacidades de IA: RAG con escalado, sugerencias proactivas, guía paso a paso). §1.1 aclara los cuatro perfiles.

**Refinamiento humano:** se quitaron detalles que la IA añadió sin respaldo en las historias (tipos de anuncio de ejemplo, "orden del día" en juntas, "estados financieros" en archivos, tipos de pregunta concretos) y se sustituyeron por lo que dicen las HUs y el modelo.

---

<a id="p2-arquitectura"></a>
## 2. Arquitectura del Sistema

**Prompt 1 — Diagrama Mermaid** *(Claude · arquitectura)*

**Prompt AI-Ready:**

```
## Rol
Arquitecto de soluciones .NET.

## Contexto
readme.md §2 vacío; producto API-first con web, bot Telegram, IA (RAG) y BI.

## Objetivo
Diagrama Mermaid §2.1 (graph TB) + narrativa de trade-offs.

## Restricciones
Incluir: React SPA, bot Telegram, API .NET 9 (GraphQL + REST + JWT), SQL Server (vistas vs*, sin SPs de negocio),
notificador saliente, IAssistantService (RAG), módulo BI; despliegue Vercel + Railway.
REST /{Dominio}/{Controller}; sin prefijo `/api` genérico.

## Formato de salida
Mermaid graph TB + párrafo de justificación (monolito .NET, GraphQL para dashboards).

## Non-goals
No código; no microservicios sin justificar.

## Criterio de calidad
Coherente con ADR-001 y §4.
```

**Artefacto:** `readme.md` §2.1 (diagrama y narrativa API-first).

**Respuesta del asistente:** Diagrama §2.1: clientes WEB/TG → JWT → dominios `sgr/tkt/fnz/...` → Dapper → SQL Server; ramas PUSH→Telegram Bot API, IA→RAG+dominio, BI→`vs*`+snapshots. Justificación: GraphQL evita over-fetching; un despliegue .NET basta para un fraccionamiento.

**Refinamiento humano:** REST `/{Dominio}/{Controller}`, sin `/api` genérico.

**Prompt 2 — Despliegue** *(Claude · infraestructura)*

**Prompt AI-Ready:**

```
## Rol
DevOps / arquitecto de despliegue.

## Contexto
§2.1 definido; Entrega 2 desplegará API+BD, SPA y bot.

## Objetivo
§2.4: pipeline CI y diagrama de despliegue.

## Restricciones
GitHub Actions → Railway (API+BD), Vercel (SPA), bot en servicio aparte (webhook HTTPS).
Explicar webhook vs polling (prod vs dev). Notificador saliente backend → Telegram Bot API.

## Formato de salida
Mermaid de despliegue + texto dev/prod.

## Non-goals
No elegir proveedor distinto sin marcar (asumido).

## Criterio de calidad
Idempotencia de notificaciones referenciada (`ntf.NotificacionesEntrega`).
```

**Artefacto:** `readme.md` §2.4 (CI/CD y despliegue).

**Respuesta del asistente:** §2.4 con pipeline CI; prod=webhook (TLS Railway); dev=polling local; notificador saliente en backend con `ntf.NotificacionesEntrega`.

**Refinamiento humano:** notificador explícito en §2.1 (no opcional).

**Prompt 3 — Seguridad bot** *(Claude · revisión adversarial — ver §5.0.1)*

**Prompt AI-Ready:**

```
## Rol
Revisor de seguridad + arquitecto de integraciones.

## Contexto
Bot Telegram como cliente REST; riesgo de pedir credenciales en chat.

## Objetivo
Decisión de auth bot + tablas mínimas bot.* (ADR-004, §2.5).

## Restricciones
No duplicar lógica SGR; mismo JWT y permisos que web; esquema bot.* mínimo.

## Formato de salida
Recomendación sí/no + flujo token + tablas propuestas.

## Non-goals
No implementar bot; no guardar passwords en Telegram.

## Criterio de calidad
Mitiga phishing; trazable a §5.0.1 poke-holes.
```

**Artefacto:** `readme.md` ADR-004, §2.5 (vinculación Telegram), §5.0.1 #1.

**Respuesta del asistente:** **No.** Flujo token un solo uso → `bot.TokensVinculacion` + `bot.CuentasTelegram` → JWT; mismos permisos que web (ADR-004, §2.5).

**Refinamiento humano:** integrar hallazgo en poke-holes §5.0.1; bot usa el mismo JWT que la web.

---

<a id="p3-modelo-datos"></a>
## 3. Modelo de Datos

**Prompt 1 — ERD núcleo** *(Claude · modelado)* · [Flujo 2](#flujo-2--erd-y-modelo-de-datos-3-readme)

**Prompt AI-Ready:**

```
## Rol
Modelador SQL Server + Mermaid ER.

## Contexto
readme.md §3 (entidades, auditoría bEliminado, catálogos); §1.2 módulos acordados.

## Objetivo
ERD Mermaid §3.1 del núcleo por esquemas en español.

## Restricciones
Esquemas sgr, tkt, fnz, enc, jnt, ntf, vts, usr, anm, arc.
Residente = sgr.Usuarios + Casas; cobros = fnz.Cuotas; catálogos estado/prioridad ticket.
Auditoría + bEliminado; sin SPs de negocio. Mermaid: sin decimal(10,2) en nodos.

## Formato de salida
erDiagram Mermaid.

## Non-goals
No EF migrations; no entidades en inglés (Resident, IsActive).

## Criterio de calidad
Coherente con §1.2 y ADR-001.
```

**Artefacto:** `readme.md` §3.1 (`erDiagram` en español por esquemas).

**Respuesta del asistente:** `erDiagram` §3.1 con Ticket, catálogos, Cuota, asignación N:M. Residente = `Usuario`, no tabla `Residente`. *Borrador rechazado:* entidades en inglés.

**Refinamiento humano:** segunda pasada en español; Mermaid sin `decimal(10,2)` en nodos.

**Prompt 2 — Extensiones Telegram / IA / BI / WMS** *(Claude · extensiones)*

**Prompt AI-Ready:**

```
## Rol
Modelador SQL Server.

## Contexto
ERD núcleo §3.1; extensiones documentadas en §2.5.

## Objetivo
Subgraph bot/ia/bi/wms integrado al modelo §3.

## Restricciones
bot.* (vinculación, conversaciones, sugerencias), ia.* (RAG), bi.KpiSnapshots,
wms.Articulos/Prestamos, ntf.NotificacionesEntrega; FKs coherentes con §2.5.

## Formato de salida
Mermaid subgraph o lista de tablas + relaciones.

## Non-goals
No reescribir núcleo sgr/tkt/fnz.

## Criterio de calidad
Paridad con texto §2.5 (Telegram, RAG, KPIs, WMS).
```

**Artefacto:** `readme.md` §3 + tablas de extensión en §2.5.

**Respuesta del asistente:** `bot.*` (vinculación, conversaciones, sugerencias), `ia.*` (RAG), `bi.KpiSnapshots`, `wms.Articulos/Prestamos`, `ntf.NotificacionesEntrega`.

**Refinamiento humano:** consolidar extensiones con §2.5 (entrega idempotente, RAG, KPIs).

**Prompt 3 — Cierre de coherencia doc** *(Claude · deltas HU)*

**Prompt AI-Ready:**

```
## Rol
Analista de coherencia spec ↔ modelo.

## Contexto
HU-TKT-01 y HU-FNZ-01 vs entidades §3.

## Objetivo
Lista de deltas al modelo (solo lo faltante).

## Restricciones
Revisar canal WEB|TELEGRAM, categoría ticket, comentario interno, vacunas mascota.
No reescribir ERD completo.

## Formato de salida
Bullets: tabla/columna + motivo (HU).

## Non-goals
No crear HUs nuevas en esta pasada.

## Criterio de calidad
Cada delta referenciado en §2.5 o catálogos tkt.* / usr.*.
```

**Artefacto:** `readme.md` §2.5 y catálogos `tkt.CategoriasTicket`, `tkt.CanalesTicket`, `ComentariosTicket.EsInterno`, `usr.Mascotas`.

**Respuesta del asistente:** Deltas TKT/FNZ: `tkt.CategoriasTicket`, `tkt.CanalesTicket`, `ComentariosTicket.EsInterno`; vacunas en `usr.Mascotas`. Extensiones de cadena auth/vivienda citadas en §5.0: `sgr.CasaOcupantes`, `sgr.RefreshTokens` (§2.5 / matriz USR).

**Refinamiento humano:** listar solo deltas; no reescribir el ERD completo.

---

<a id="p4-api"></a>
## 4. Especificación de la API

**Prompt 1 — OpenAPI login** *(Claude · contrato REST auth)*

**Prompt AI-Ready:**

```
## Rol
Arquitecto API / OpenAPI 3.0.

## Contexto
ADR-003; login JWT; prohibido `/api/*` genérico.

## Objetivo
YAML §4 Endpoint 1 (GenerateToken).

## Restricciones
POST /SGR/AuthService/GenerateToken; BCrypt en PasswordHash;
JWT HMAC-SHA256 sub=UsuarioID, claims perfil, bAdministrador, condominioId.
401 genérico «Credenciales inválidas» (no enumerar usuarios).

## Formato de salida
OpenAPI YAML fragment + códigos 200/401.

## Non-goals
No OAuth externo; no refresh en este endpoint (ticket aparte).

## Criterio de calidad
Alineado a §3 sgr.Usuarios y ADR-003.
```

**Artefacto:** `readme.md` §4 Endpoint 1 (YAML login).

**Respuesta del asistente:** YAML §4 Endpoint 1: 200 token + claims; 401 «Credenciales inválidas». *Rechazado:* `/api/USR/login`.

**Refinamiento humano:** alinear a ADR-003; REST sin prefijo `/api`.

**Prompt 2 — GraphQL + REST tickets** *(Claude · crear ticket)*

**Prompt AI-Ready:**

```
## Rol
Arquitecto API (REST + GraphQL).

## Contexto
HU-TKT-01; catálogos tkt.*; identidad solo JWT.

## Objetivo
§4 Endpoint 2: POST /TKT/Tickets + mutation GraphQL crearTicket.

## Restricciones
Estado/prioridad desde catálogos; UsuarioSolicitanteID del JWT (no en body);
canal WEB|TELEGRAM opcional; documentar 401 (sin token), 400/403 en ProblemDetails; bot usa mismo POST + Bearer.

## Formato de salida
YAML/OpenAPI + ejemplo GraphQL + tabla de errores.

## Non-goals
No SPs; no duplicar reglas en el bot.

## Criterio de calidad
ProblemDetails con code de negocio donde aplique.
```

**Artefacto:** `readme.md` §4 Endpoint 2 e inventario `/TKT`.

**Respuesta del asistente:** §4 Endpoint 2: `UsuarioSolicitanteID` solo del JWT (`sub`); REST `POST /TKT/Tickets` + mutation `crearTicket` sobre `ITicketService`; `ProblemDetails` con `400 VALIDATION_ERROR`, `403 FORBIDDEN` (perfil no Residente); sin auth → 401. Bot reutiliza el mismo POST con Bearer.

**Refinamiento humano:** bot reutiliza REST; no duplicar reglas en el cliente Telegram.

**Prompt 3 — Dashboard y asistente** *(Claude · KPIs + RAG)*

**Prompt AI-Ready:**

```
## Rol
Arquitecto API + diseñador de asistente IA.

## Contexto
Dashboard admin/residente; RAG sobre reglamento (ia.Fragmentos).

## Objetivo
§4 Endpoints 3–4 + tabla resumen de dominios.

## Restricciones
GET /Dashboard/Resumen (morosos fnz.Cuotas, tickets abiertos);
POST /BOT/Asistente/Consultar (fuentes[], confianza, escalado si confianza baja).
YAML solo endpoints representativos; resto en tabla §4.

## Formato de salida
OpenAPI/YAML + filas de inventario por dominio.

## Non-goals
Endpoint 4 no cuenta como núcleo §5.0 evaluable (Fase 3).

## Criterio de calidad
KPIs desde vistas vs* documentadas en §3.
```

**Artefacto:** `readme.md` §4 Endpoints 3–4 y tabla de dominios.

**Respuesta del asistente:** KPIs desde `vs*`; asistente devuelve `fuentes[]`, `confianza`, escalado a ticket si baja confianza. Tabla de dominios §4 para el resto de rutas.

**Refinamiento humano:** Endpoint 4 complementario (IA/RAG Fase 3); no parte del núcleo §5.0 evaluable.

---

<a id="p5-historias"></a>
## 5. Historias de Usuario

**Prompt 1 — Backlog AI-Ready** *(Claude · backlog AI-Ready — Módulo 4)*

**Prompt AI-Ready:**

```
## Rol
PO Senior (backlog AI-Ready — Módulo 4 máster).

## Contexto
readme §1.2 (15 módulos); modelo §3 y API §4 en borrador.

## Objetivo
Catálogo §5 + núcleo §5.0 (5 historias end-to-end).

## Restricciones
Historias Como/quiero/para; AC Given/When/Then (≥3 por Must); MoSCoW [M/S/C];
labels module:/type:/size:; trazabilidad a tablas y rutas §3–§4.

## Formato de salida
HUs por dominio + bloque DoD por tipo de trabajo.

## Non-goals
Sin auto-registro público; sin SPs de negocio.

## Criterio de calidad
INVEST; ejemplo HU-TKT-01 con happy path, validación y empty state.
```

**Artefacto:** `readme.md` §5 (catálogo completo) y núcleo §5.0 (cinco historias end-to-end).

**Respuesta del asistente:** Catálogo §5 por dominio con labels `module:`/`type:`/`size:`; HU-TKT-01 [M] con ≥3 AC (happy path, validación, empty state). Núcleo §5.0 (5 historias end-to-end). Bloque DoD por tipo + non-goals por módulo (Fase 1).

**Refinamiento humano:** fijar núcleo académico explícito en §5.0; labels MoSCoW coherentes con roadmap.

**Prompt 2 — Suficiencia del backlog** *(Claude · cierre de huecos)*

**Prompt AI-Ready:**

```
## Rol
PO Senior (revisión de cadena end-to-end).

## Contexto
Backlog §5 antes de cerrar Entrega 1.

## Objetivo
Cerrar huecos imprescindibles en la cadena login → ticket → finanzas → admin.

## Restricciones
Detectar: login sin HU, ticket sin asignación admin, cuotas sin registro de pago.
Añadir solo historias imprescindibles con AC de error (no solo happy path).

## Formato de salida
Lista de HUs nuevas o AC añadidos + referencia §5.

## Non-goals
No inflar backlog con Could-haves.

## Criterio de calidad
Núcleo §5.0 ejecutable en Fase 1 web.
```

**Artefacto:** `readme.md` HU-USR-04, HU-TKT-03, HU-FNZ-02 y DoD por tipo de trabajo.

**Respuesta del asistente:** Añadidos/reforzados HU-TKT-03, HU-FNZ-02, HU-USR-04, AC error en HU-USR-01.

**Refinamiento humano:** no inflar backlog; solo historias que cierran la cadena §5.0.

**Prompt 3 — Poke-holes** *(Claude · patrón «AI as Poke-Holes»)* · [Flujo 3](#flujo-3--poke-holes-hu-tkt-01--telegram-501-readme)

**Prompt AI-Ready:**

```
## Rol
Revisor adversarial (poke-holes — Módulo 4/5 del máster).

## Contexto
Historia HU-TKT-01 (web + bot Telegram); readme.md §4–§5; ADR-004 auth bot.

## Objetivo
Lista accionable de supuestos implícitos, edge cases, seguridad y dependencias.

## Restricciones
Formato: Hallazgo | Riesgo | Corrección en AC o diseño. Máx. 12 ítems.

## Non-goals
No reescribir la HU completa; no implementar código.

## Criterio de calidad
Cada fila trazable a cambio en diseño, AC o ticket §6.
```

**Artefacto:** `readme.md` §5.0.1 (7 ítems numerados); tabla ampliada 12 filas en [Poke-holes](#poke-holes-y-supervisión-humana-módulo-45).

**Respuesta del asistente:** 12 filas (Hallazgo | Riesgo | Corrección) en [Poke-holes](#poke-holes-y-supervisión-humana-módulo-45); **7** integrados en `readme.md` §5.0.1 (ítems 1–7); **5** (filas 8–12) en §2.5, tickets §6 o `(asumido)` según columna Estado (no todos postergados a Fase 2).

**Refinamiento humano:** ANM/VTS/usr; HU-BOT-02 depende HU-BOT-01; `/cancelar` en flujos bot.

---

<a id="p6-tickets"></a>
## 6. Tickets de Trabajo

> **Espejo readme:** extractos Prompt 1–3; **Prompt 4 (DB-000 SDD)** solo en este registro.

**Prompt 1 — TKT-BE-001** *(Claude · descomposición HU → ticket técnico)* · [Flujo 4](#flujo-4--historia-invest--ticket-backend-6-readme)

**Prompt AI-Ready:**

```
## Rol
Tech lead .NET (ASP.NET Core 9, Dapper, transacciones).

## Contexto
Historia HU-TKT-01; diseño readme.md §3–§4; ADR-001 (sin SPs de negocio).

## Objetivo
Ticket técnico TKT-BE-001 listo para Entrega 2 con AC verificables.

## Restricciones
Servicio C# + Dapper + IDbTransaction; POST /TKT/Tickets; estados/prioridad desde catálogos tkt.*;
notificación a admins; lectura tkt.vsTickets. Prohibido prcCreateTicket o SP JSON.

## Formato de salida
Ticket §6: título, estimación, dependencias, AC Given/When/Then técnicos, archivos a tocar.

## Non-goals
No código C# en Entrega 1; GraphQL en TKT-BE-002 aparte.

## Criterio de calidad
Coherencia con HU-TKT-01 y §4 Endpoint 2.
```

**Artefacto:** `readme.md` §6 Ticket TKT-BE-001 (plantilla técnica).

**Respuesta del asistente:** Ticket §6 TKT-BE-001 (5 h): `ITicketService.CrearTicketAsync`, Dapper + `IDbTransaction`, catálogos `tkt.*`, `CasaOcupantes`, notificación admins vía `INotificacionService`, lectura `tkt.vsTickets`; AC técnicos + tests (éxito, perfil no residente `403`, validación). *Rechazado:* SP/`prcCreateTicket`.

**Refinamiento humano:** coherente con ADR-001; rechazar stored procedure.

**Prompt 2 — TKT-BE-002 + FE-031** *(Claude · paralelismo front / GraphQL)*

**Prompt AI-Ready:**

```
## Rol
Tech lead full-stack (.NET + React).

## Contexto
TKT-BE-001 definido; mismos AC HU-TKT-01.

## Objetivo
Tickets TKT-BE-002 (GraphQL) y FE-031 (UI) con dependencias explícitas.

## Restricciones
Mutation GraphQL [Authorize]; FE con estados vacío/carga/error; cadena desde USR-BE-007.

## Formato de salida
Dos tickets §6 + grafo de dependencias.

## Non-goals
No bot Telegram en estos tickets.

## Criterio de calidad
FE-031 checklist alineado a empty state §5.0.1.
```

**Artefacto:** `readme.md` §6 índice de tickets y criterios FE-031/FE-030.

**Respuesta del asistente:** Cadena USR-BE-007 → FE-030 → TKT-BE-001 → TKT-BE-002 → FE-031.

**Refinamiento humano:** dependencias explícitas en el índice §6 (0–40).

**Prompt 3 — Secuenciación por fases** *(Claude · roadmap)*

**Prompt AI-Ready:**

```
## Rol
Delivery manager / PO técnico.

## Contexto
Índice §6 (~33 tickets); roadmap §5 por fases.

## Objetivo
Secuencia Fase 1 (demo web) vs Fase 2–3 (Telegram, ENC, BI, WMS).

## Restricciones
Fase 1: auth, ticket, finanzas, dashboard; buffer ~30% revisión humana;
no saturar sprint 1 con todo el índice.

## Formato de salida
Tabla o lista tickets por fase + columna «Fase» en índice §6.

## Non-goals
No reestimar horas sin marcar (asumido).

## Criterio de calidad
Núcleo §5.0 cubierto en Fase 1 web.
```

**Artefacto:** `readme.md` §5 roadmap por fases y columna «Fase» del índice §6.

**Respuesta del asistente:** Roadmap §5: **Fase 0** SETUP-000 + DB-000/001/002 (índice 33–35, ticket 0); **Fase 1** demo web — tickets 7–16, FE 30–32 y habilitadores 36–40 (~106 h + 30 % buffer); **Fase 2** bot/ENC/ANM/ARC; **Fase 3** VTS/WMS/IA/BI. Índice §6 **0–40** (escala en horas ideales).

**Refinamiento humano:** buffer ~30%; Flujo 6 añadió habilitadores tickets 33–40.

**Prompt 4 — DB-000 (SDD database)** *(Claude Code · `/definir` + `/diseñar`, skill `abogado-del-diablo`)*

**Prompt AI-Ready:**

```
## Rol
Desarrollador SQL + planificador SDD (target database).

## Contexto
SQL/cuartaquinientos_schema.sql; modelo lógico §3; ADR-001.

## Objetivo
spec.md + design.md para DB-000: script desplegable e idempotente sin cambiar modelo §3.

## Restricciones
sqlcmd -d una corrida; segunda sin errores ni duplicados; inventario verificable;
solo estructura (sin INSERT/UPDATE); sin datos personales; sin SP de negocio.
Poke-holes obligatorio (`abogado-del-diablo`) antes de aprobar.

## Formato de salida
Artefactos SDD en ContextoCuartaQuinientos/.planning/tkt-db-000/ + CA Given/When/Then.

## Non-goals
No renombrar columnas legacy sin ticket de migración.

## Criterio de calidad
Pruebas SQL primero; evidencia MCP/script real citada en design.md.
```

**Artefacto:** `ContextoCuartaQuinientos/.planning/tkt-db-000/` (`spec.md`, `design.md`) + Ticket 0 en `readme.md` §6.

**Respuesta del asistente:** CA de despliegue, idempotencia, inventario 16/73/18, FK/PK, caso negativo FK 547 y smoke de vistas; plan con pruebas primero. Poke-holes sobre el script real: 57 `USE [db24572]` fijos, tablas baseline sin guarda y usuarios con correo real en los datos.

**Refinamiento humano:** quitar todos los `INSERT`/`UPDATE` del script (solo estructura); no renombrar `TipoNotiicfacion` (impacto TKT-BE-001/NTF-BE-013); DB-000 bloqueante de USR-BE-007 en `FASE1_ROADMAP.md`.

---

<a id="poke-holes"></a>
## Poke-holes y supervisión humana (Módulo 4/5)

**Prompt AI-Ready:** *(= [§5 Prompt 3](#p5-historias))*

```
## Rol
Revisor adversarial (poke-holes — Módulo 4/5 del máster).

## Contexto
Historia HU-TKT-01 (web + bot Telegram); readme.md §4–§5; ADR-004 auth bot.

## Objetivo
Lista accionable de supuestos implícitos, edge cases, seguridad y dependencias.

## Restricciones
Formato: Hallazgo | Riesgo | Corrección en AC o diseño. Máx. 12 ítems.

## Non-goals
No reescribir la HU completa; no implementar código.

## Criterio de calidad
Cada fila trazable a cambio en diseño, AC o ticket §6.
```

**Artefacto:** tabla 12 filas (esta sección) + `readme.md` §5.0.1 (7 ítems numerados).

**Respuesta del asistente (12 ítems — validado contra `readme.md` 2026-09-23):**

| # | Hallazgo | Riesgo | Corrección | Estado / evidencia en repo |
|---|----------|--------|------------|------------------------------|
| 1 | Password en chat Telegram | Phishing | Token un solo uso | **§5.0.1 #1** · §2.5 · ADR-004 · HU-BOT-01 |
| 2 | Listado sin orden definido | UX | Fecha DESC en AC | **§5.0.1 #3** · HU-TKT-02 («más reciente al más antiguo») · TKT-BE-015 |
| 3 | Lista vacía sin copy | Confusión | Empty state | **§5.0.1 #2** · HU-TKT-02 · FE-031/FE-032 checklist |
| 4 | Auto-registro público | Padrón falso | Alta solo Admin | **§5.0.1 #4** · HU-USR-04 · non-goals USR |
| 5 | Reintentos `sendMessage` | Duplicados Telegram | `ntf.NotificacionesEntrega` | **§5.0.1 #5** · §2.5 · BOT-BE-020 |
| 6 | RAG inventa reglamento | Legal / confianza | Escalar + `ia.Consultas` | **§5.0.1 #6** · §2.5 · HU-BOT-06 · IA-BE-005 |
| 7 | Ticket sin categoría | Cola mal priorizada | `tkt.CategoriasTicket` | **§5.0.1 #7** · §2.5 · §4 GraphQL `categoria` |
| 8 | Comentario admin visible al residente | Fuga info | `EsInterno BIT` | **§5.0.1 #7** · HU-TKT-04 · §2.5 |
| 9 | Usuario atrapado en flujo bot | UX | Botones Cancelar / abort | Ticket TKT-BOT-003/022 · `[❌ Cancelar]` §6 |
| 10 | JWT sin revocación en bot | Robo de sesión | `sgr.RefreshTokens` + vida corta del JWT | §2.2 · §2.5 · USR-BE-007 (refresh rotado, logout) · BOT-BE-004 (`/sesion`) |
| 11 | Adjuntos muy grandes | DoS / costo | Tope tamaño/MIME | §2.2 · §2.5 (≤ 5 MB, tipo real) · ADR-006 · adjuntos en Fase 2 |
| 12 | Doble tap Confirmar (bot/web) | Ticket duplicado | Deshabilitar el control tras el primer envío | HU-TKT-01 · HU-BOT-02 · TKT-BOT-003 · FE-031 |

**Resumen validación:** las 12 filas quedan trazables a texto del `readme.md` tras la revisión final (Flujo 6); 11–12 dejaron de ser `(asumido)`.

**Espejo §5.0.1 (7 ítems numerados en readme):**

| # readme | Tema |
|----------|------|
| 1 | Auth Telegram → token |
| 2 | Empty states |
| 3 | Orden/filtros tickets |
| 4 | Sin auto-registro |
| 5 | Idempotencia NTF |
| 6 | RAG + escalado |
| 7 | Categoría + comentario interno |

**Refinamiento humano:** segunda pasada con plantilla AI-Ready; poke-holes antes de cerrar Entrega 1; buffer ~30% en el roadmap por fases (`readme.md` §5).

---

<a id="p7-prs"></a>
## 7. Pull Requests (Entrega 1)

> **Espejo readme:** mismos 3 prompts; artefacto = PR única `feature/entrega-1-AFS` + checklist (sin PRs de código como entregable E1).

> **Criterio académico:** **una PR** (rama `feature/entrega-1-AFS`) con documentación — no varias PRs de código inventadas para esta entrega. Repo privado + acceso TA (readme §0.5).

**Prompt 1 — PR única de documentación** *(Claude · cierre Entrega 1)*

**Prompt AI-Ready:**

```
## Rol
Tech lead + autor del entregable AI4Devs (Entrega 1).

## Contexto
Evaluación sobre diseño (readme + prompts); repo privado; rama feature/entrega-1-AFS.

## Objetivo
Redactar readme §7: una sola PR que integra documentación §0–§6 (sin código obligatorio).

## Restricciones
Incluir: readme.md, prompts.md, CLAUDE.md, SQL/ diseño, ContextoCuartaQuinientos/.
Checklist coherencia readme ↔ SQL ↔ tickets; enlace gh pr cuando exista.
No presentar 3 PRs de Entrega 2 como entregables de Entrega 1.

## Formato de salida
Bloque «Pull Request — Entrega 1» + tabla incluye/excluye + checklist pre-merge.

## Non-goals
No API/Web/Bot implementados en esta PR; no despliegue productivo.

## Criterio de calidad
Un evaluador entiende qué mergea esta PR sin confundirla con el plan de codificación §6.
```

**Artefacto:** `readme.md` §7 (PR única + checklist).

**Respuesta del asistente:** §7 define **una PR de documentación** (diseño SDD completo en rama de entrega); checklist readme/SQL/tickets/prompts; enlace `gh pr` pendiente hasta abrir la PR contra la rama base del curso.

**Refinamiento humano:** se eliminó la lista de 3 PRs como entregable Entrega 1; troceo opcional solo en nota Entrega 2+.

**Prompt 2 — Fragmentación opcional (Entrega 2+)** *(metodología interna · no entregable Entrega 1)*

**Prompt AI-Ready:**

```
## Rol
Release manager (planificación Entrega 2).

## Contexto
Cuando exista código; §6 descompone tickets; §7 Entrega 1 ya cerró con una PR de docs.

## Objetivo
Nota breve: cómo el equipo *podría* abrir PRs pequeñas (backend → web → e2e) sin reemplazar §7.

## Restricciones
Ejemplo orientativo: scaffold+auth+SQL → login web → HU-TKT-01 e2e; bot después.
No enlaces obligatorios ni conteo como entregables del máster en Entrega 1.

## Formato de salida
Párrafo o bullets en nota al pie de §7 readme.

## Non-goals
No reescribir §7 como lista de 3 PRs obligatorias.

## Criterio de calidad
Queda claro que es plan interno post-Entrega 1.
```

**Artefacto:** nota al pie `readme.md` §7 («solo planificación interna — Entrega 2+»).

**Respuesta del asistente:** Orientación: PRs pequeñas por capa (API+JWT+SQL → React login → ticket e2e) para revisión en equipo; bot en PRs posteriores. **No** sustituye la PR única de documentación.

**Refinamiento humano:** —

**Prompt 3 — Calidad en PRs de código** *(Entrega 2+ · futuro)*

**Prompt AI-Ready:**

```
## Rol
DevOps + revisor (PRs con código).

## Contexto
GitHub Actions §2.4; DoD §5; Flujo 5 prompts.md para coherencia diff ↔ diseño.

## Objetivo
Buenas prácticas en descripción de PR: test plan + revisión IA antes de merge.

## Restricciones
Evidencia dotnet test / smoke §4 en la PR; no solo chat con el agente.

## Formato de salida
Plantilla «Test plan» + checklist diff ↔ §4/§6.

## Non-goals
No aplica a la PR única de documentación Entrega 1.

## Criterio de calidad
Reproducible por otro developer.
```

**Artefacto:** `readme.md` §7 Prompt 3 (práctica futura).

**Respuesta del asistente:** — (Entrega 2+; no ejecutado en Entrega 1).

**Refinamiento humano:** alinear con DoD §5 y CI §2.4 cuando haya código.

**Pull Request — Entrega 1 (documentación):** _(rama `feature/entrega-1-AFS` → base del curso — enlace `gh pr` pendiente)_

---

---

# Entrega 2 — Flujo de implementación con IA (octubre 2026)

> Esta sección cubre el eje **"Uso de la IA"** durante la codificación. Metodología: **SDD (Spec-Driven Development)** — cada ticket pasa por `/iniciar → /definir → /diseñar → /ejecutar → /revisar → /completar`. La pasada adversarial (`abogado-del-diablo`) es obligatoria en `/definir` y `/diseñar`.
>
> **Trazabilidad:** todo lo citado aquí es verificable en `ContextoCuartaQuinientos/.planning/tkt-<id>/` (`spec.md`, `design.md`, `impl.md`, `_index.md` con log de estados) y en `_sdd_evolution.md`. Los prompts de `/ejecutar` se muestran en forma resumida; la fuente de verdad son los artefactos SDD que el agente recibió como contexto.

## Herramientas y modelos — Entrega 2

| Herramienta | Uso principal |
|-------------|---------------|
| Claude (Cowork / Claude Code, familia Sonnet) | Spec y design SDD, generación de código .NET y React, revisión adversarial |
| Cursor | Autocompletado, refactors inline, ajustes de tests TypeScript |
| Subagentes Claude Code | `desarrollador-react`, `frontend-tester`, `git-frontend` (declarados en cada spec, sección «Agentes previstos») |

**Contexto activo para los agentes:** `CLAUDE.md` (convenciones no negociables), `sdd.config.yaml`, skills en `.claude/skills/` (`abogado-del-diablo`, `frontend-design-master`, `austero`, `sdd-workflow`) y `ContextoCuartaQuinientos/specs/<dominio>.md`.

---

## Flujo 1 — Backend JWT de navegación y permisos (SGR-BE-030)

**Ticket:** `SGR-BE-030` — API JWT para navegación y permisos · talla M · `.planning/tkt-sgr-be-030/`

**`/definir` — objetivo dado a la IA:** endpoints bajo `/SGR` protegidos por JWT para menú jerárquico por perfil, CRUD de menús (solo admin) y asignación de menús a perfil, respetando `CLAUDE.md` (Dapper parametrizado, `sub` del JWT = `UsuarioID`, sin IDs hardcodeados, legacy sin romper).

**Criterios de aceptación generados (literal de `spec.md` §3):**

```
- CA-1: Residente con JWT solo recibe rutas de su PerfilMenus (no admin).
- CA-2: Admin recibe menús admin + operativos según seed/BD.
- CA-3: CRUD menú persiste en sgr.Menus con auditoría (Creado, UsuarioCreacionID, …).
- CA-4: Tests integración GraphApi.Tests happy + 403 no admin + 401 sin token.
- CA-5: Legacy endpoints sin romper (GraphQL/MVC antiguo).
```

**Pasada adversarial — veredicto literal:** *«APROBADO — acotar MVP a `GET Navegacion/menus` + CRUD Menus + PerfilMenus antes de botones.»* La IA recortó el alcance: botones, CRUD JWT de perfiles y seed `DB-006` quedaron documentados como «Fuera de MVP» en `impl.md`.

**`/ejecutar` → artefactos:** `CuartaNavegacionRepository`, `CuartaNavegacionService`, `MenuArbolBuilder`, `NavegacionController`; tests `CuartaNavegacionServiceTests` + `NavegacionAuthorizationTests` (9 tests); `SGR-BE-030_api_tests.http`.

**`/revisar` — 3 pasadas (log real de `_index.md`):**

| Pasada | Resultado | Motivo |
|--------|-----------|--------|
| 1ª | REQUIERE CAMBIOS | Tests 9/9 en verde, **pero faltaba smoke HTTP** — no se aceptó «tests verdes» como suficiente |
| 2ª | REQUIERE CAMBIOS | Smoke de login devolvía **401** |
| 3ª | LISTO PARA PR | Fix `Perfil`/`Nombre` + smoke 200 |

**Criterio humano:** la causa del fallo no estaba en el código generado sino en el esquema real: la columna de `sgr.Perfiles` se llama distinto según el entorno (`Perfil` vs `Nombre`). Se resolvió con `SqlSchemaCompat.PerfilNombreColumn` en `ResolverPerfilIdAsync`, y se registró como aprendizaje en el cierre: *«reutilizar `SqlSchemaCompat` al tocar `sgr.Perfiles` en nuevos repos Dapper»*. El smoke final se validó con un JWT HS256 firmado con la clave de user-secrets (nunca en repo): `GET` admin → 200, residente `POST` admin → **403**.

---

## Flujo 2 — Anuncios: residente + admin (FE-043)

**Ticket:** `FE-043` · talla M · 2 ciclos REQUIERE CAMBIOS · `.planning/tkt-fe-043/`

**Pasada adversarial en `/definir` (literal de `spec.md`):**

| # | Objeción | Resolución |
|---|----------|------------|
| B1 | CA-1 requiere dos usuarios | Test manual o Vitest mock API; E2E opcional |
| B2 | Auto `PATCH` al scroll lista | Solo en detalle, no en listado |
| B3 | Admin también ve `/anuncios` | Admin puede usar bandeja admin; no Must duplicar |

**Pasada adversarial en `/diseñar` (literal de `design.md`):**

| # | Objeción | Resolución |
|---|----------|------------|
| F1 | Doble PATCH en StrictMode | `useRef` guard o ignorar 204 duplicado |
| F2 | Admin sin tipos seed | Modal deshabilitado + texto «Sin tipos configurados» |

Pre-mortem registrado: *«API antigua sin reiniciar → 404 en `/visto`»*. F1 es un bug que solo aparece en desarrollo con React 18 StrictMode — se previno antes de escribir código.

**`/revisar` — log real:**

| Pasada | Resultado | Motivo |
|--------|-----------|--------|
| 1ª | REQUIERE CAMBIOS | tsc/vitest/build OK, pero faltaba columna vigencia en admin y el PATCH fallaba en silencio |
| → `/ejecutar` | corrección | columna vigencia, errores visibles en delete/PATCH, modal accesible (`role="dialog"`) |
| 2ª | REQUIERE CAMBIOS | CA-1..3 (Must) sin evidencia de prueba |
| → reintento | corrección | tests Vitest CA-1..3 con mock de `apiClient` + badge «Nuevo» |
| final | LISTO PARA PR | vitest 35/35, `tsc --noEmit`, `vite build` |

**Criterio humano:** «compila y los tests pasan» no se aceptó como cierre: se exigió que cada CA *Must* tuviera evidencia y que los errores de API llegaran al usuario.

---

## Flujo 3 — Convención de tests que evolucionó con la revisión (FE-UX-005 → FE-UX-006)

**Problema:** al introducir `ToastContext` en todas las páginas admin, los tests de página necesitaban mockear `useToast`.

1. **FE-UX-005** — opción descartada registrada en `delta.md`: *mock global en `setup.ts`* → rechazado porque **rompía `ToastContext.test.tsx`** (el propio test del provider). Se creó `Web/src/test/stubToast.ts`, importado por archivo de test. Se documentó en `specs/frontend.md`.
2. **FE-UX-006** — al sumar `ThemeProvider` (modo oscuro) el import por archivo ya no escalaba. Se revisó la decisión anterior: `setup.ts` importa `stubTheme` + `stubToast`, y **`ToastContext.test.tsx` hace `vi.unmock`**, resolviendo el problema original de raíz.

**Por qué se incluye:** muestra que las decisiones de la IA no se aplican ciegamente ni se congelan: una convención se adopta con su razón, se documenta y se reemplaza cuando la razón cambia — todo trazado en `delta.md`.

---

## Criterio humano aplicado (supervisión de la IA)

| Patrón detectado | Evidencia | Acción |
|------------------|-----------|--------|
| «Tests verdes» sin prueba real contra la API | SGR-BE-030 1ª revisión | Smoke HTTP obligatorio antes de LISTO PARA PR |
| Código correcto contra un esquema supuesto (`(asumido)`) | SGR-BE-030 `Perfil`/`Nombre` | `SqlSchemaCompat` + learning en cierre |
| Errores de API silenciosos en la UI | FE-043 1ª revisión | Error visible obligatorio; luego toasts (FE-UX-006) |
| CA *Must* sin test que lo demuestre | FE-043 2ª revisión | Cada CA Must ligado a un test o smoke en `impl.md` |
| Mock global que rompe tests del propio provider | FE-UX-005 `delta.md` | `stubToast` → `vi.unmock` en FE-UX-006 |
| Alcance que crece durante el ticket | SGR-BE-030 veredicto adversarial | MVP acotado; lo demás a «Fuera de MVP» |

## Métricas de proceso (verificables)

- **23 tickets SDD** cerrados entre el 16 y el 28 de octubre (`_sdd_evolution.md`), cada uno con `spec.md` + `impl.md` + log de estados.
- **API:** 45 archivos de test xUnit + Moq con **159 casos** `[Fact]`/`[Theory]` en `GraphApi/GraphApi.Tests/`.
- **Web:** 83 archivos de test Vitest + Testing Library; última corrida registrada **Vitest 226/226** (`tkt-fe-ux-005/_index.md`).
- Tickets aprobados en la 1ª auditoría sin ciclo REQUIERE CAMBIOS: FE-CRUD-003, FE-QA-001, FE-UX-001..004 (según `_sdd_evolution.md`).

---

# Entrega 3 — Cierre, tests E2E y entrega final (noviembre 2026)

> Eje de evaluación: **IA en la fase de consolidación** — auditar gaps del checklist académico, ampliar pruebas E2E de flujos críticos, congelar la rama de entrega y documentar el criterio humano antes del Typeform.

## Herramientas y modelos — Entrega 3

| Herramienta | Uso en cierre |
|-------------|----------------|
| **Cursor (Composer / Agent)** | Gap analysis vs Lección 3, generación de specs Playwright, ampliación de `prompts.md`, push de rama `final-project-AFS` |
| **Claude (chat / revisión)** | Segunda opinión sobre alcance (bot v2 fuera de repo), priorización rama → E2E → formulario |
| **Playwright** | Smoke E2E opt-in (`E2E_SMOKE=1`) contra Web + API locales |
| **dotnet test / Vitest** | Regresión antes de congelar la rama final |

**Contexto activo:** checklist Lección 3 (`final-project-[INICIALES]`, suite unit+integración+E2E, `prompts.md` por fases), `README.md` §alcance (bot/IA v2 documentado), `ContextoCuartaQuinientos/specs/frontend.md` §Calidad.

---

## Flujo 1 — Auditoría de gaps vs checklist de entrega final

**Prompt representativo (Cursor Agent):**

```markdown
## Rol
Revisor de entrega académica AI4Devs.

## Contexto
Repo CuartaQuinientos en `feature/entrega-2-AFS`. Checklist: rama `final-project-AFS`, E2E mínimos (login, ticket, estado de cuenta), `prompts.md` Entrega 2/3, Typeform con URL de rama.

## Objetivo
Listar qué falta, qué ya cumple (unitarios API/Web, integración) y orden de ejecución.

## Restricciones
No asumir bot en alcance si README dice v2. Verificar con `git branch` y conteo de `Web/e2e/*.spec.ts`.

## Criterio de calidad
Tabla verificable archivo por archivo; prioridad: rama administrativa → E2E → prompts → Typeform humano.
```

**Respuesta útil de la IA:** confirmó rama inexistente, un solo spec E2E previo, tests xUnit/Vitest amplios, bot sin carpeta `Bot/` coherente con README, falta bloque Entrega 3 en `prompts.md`.

**Criterio humano:** dejar **bot fuera de tests** mientras el README mantenga v2 explícito.

---

## Flujo 2 — Ampliación E2E (Playwright) con gate opt-in

**Objetivo dado a la IA:** tres flujos residente además de admin casas, reutilizando credenciales de smoke (`FASE1_SMOKE_PASSWORD`, `E2E_*_CORREO`).

**Artefactos:**

| Spec | Flujo |
|------|--------|
| `Web/e2e/login-residente.spec.ts` | Login → saludo en inicio |
| `Web/e2e/crear-ticket.spec.ts` | Nuevo ticket → listado |
| `Web/e2e/estado-cuenta.spec.ts` | Estado de cuenta → KPIs o vacío |
| `Web/e2e/helpers/auth.ts` | Login compartido + credenciales |

**Patrón FE-QA-001:** skip global salvo `E2E_SMOKE=1`; Vitest excluye `e2e/`.

**Ejecución local:**

```powershell
$env:E2E_SMOKE='1'
$env:FASE1_SMOKE_PASSWORD='<seed local>'
cd Web
npm run test:e2e
```

**Criterio humano:** no exigir Playwright en CI sin API+Web; basta specs en repo + opt-in documentado.

---

## Flujo 3 — Rama de entrega y Typeform

1. **IA:** rama `final-project-AFS`, commit E2E + `prompts.md`, `git push -u origin final-project-AFS`.
2. **Humano:** [Typeform](https://lidr.typeform.com/proyectoai4devs) con URL a la rama y correo del calendario.

**Non-goals:** PR de entrega final (curso: rama + formulario).

---

## Flujo 4 — Registro Entrega 3 en prompts.md

Documentar workflows de cierre (gap analysis, E2E, rama, Typeform) con herramientas y criterio humano — esta sección.

---

## Flujo 5 — TDD por módulo (matriz + gates + script)

**Objetivo dado a la IA (Cursor Agent):** ningún dominio in-scope sin tests; bot/IA v2 excluido; alineado a ADR-001 (lógica en C#, no SP de negocio por módulo).

**Prompt representativo:**

```markdown
## Rol
Arquitecto de pruebas Entrega 3.

## Contexto
CuartaQuinientos: xUnit (API), Vitest (Web), E2E Playwright opt-in, SQL TDD solo en tickets de BD (BI-RPT-001).

## Objetivo
Matriz por módulo + gates que fallen si falta un dominio + script único de ejecución local.

## Restricciones
No inventar suites SQL por dominio si no hay SP; documentar sqlcmd solo para BI-RPT-001_PruebasUnitarias.sql.

## Criterio de calidad
Invoke-Entrega3Tests.ps1 en verde; ModulosTddCoverageTests + entrega3ModulosTdd.test.ts en repo.
```

**Artefactos (verificables en repo):**

| Pieza | Ruta |
|--------|------|
| Matriz humana | `ContextoCuartaQuinientos/MATRIZ_TDD_ENTREGA3.md` |
| Gate API (13 módulos) | `GraphApi/GraphApi.Tests/ModulosTddCoverageTests.cs` |
| Gate Web (15 checks) | `Web/src/smoke/entrega3ModulosTdd.test.ts` |
| Runner local | `scripts/Invoke-Entrega3Tests.ps1` |
| Tests nuevos BI/NTF/SGR | `CuartaCasasServiceTests`, `AvisoGeneralRequestValidatorTests`, `biTrendsUtils.test.ts`, páginas admin reportes/aviso, etc. |

**Ejecución registrada (nov 2026, local):** `.\scripts\Invoke-Entrega3Tests.ps1` → Vitest **325** passed (1 skipped E2E gate) · xUnit **188** passed (filtro sin Smoke ni integración HTTP+SQL).

**Criterio humano:** no duplicar TDD en 13 scripts SQL; el gate de archivos evita “módulo olvidado” sin burocracia por ticket. SQL TDD explícito solo donde hay DDL ticket (`BI-RPT-001`).

---

## Criterio humano — Entrega 3

| Decisión | Motivo |
|----------|--------|
| Rama `final-project-AFS` | Requisito nominal del curso |
| 4 specs E2E | Login, ticket, finanzas residente + admin casas |
| Bot sin tests | v2 fuera de alcance en README |
| Typeform manual | Activa revisión; solo el humano envía |
| TDD por módulo vía gates | Matriz + script; no 13 suites SQL inventadas |

## Métricas de cierre (noviembre 2026)

- **Rama:** `final-project-AFS`.
- **E2E:** 4 archivos en `Web/e2e/` (`E2E_SMOKE=1`); ver README §2.6.1.
- **TDD gates:** `ModulosTddCoverageTests` + `entrega3ModulosTdd.test.ts`; runner `Invoke-Entrega3Tests.ps1`.
- **Pendiente humano:** Typeform con link al remoto.

> Detalla en esta sección los prompts principales utilizados durante la creación del proyecto, que justifiquen el uso de asistentes de código en todas las fases del ciclo de vida del desarrollo. Esperamos un máximo de 3 por sección, principalmente los de creación inicial o  los de corrección o adición de funcionalidades que consideres más relevantes.
Puedes añadir adicionalmente la conversación completa como link o archivo adjunto si así lo consideras

> **Cómo se trabajó con IA en este proyecto (entrega 1).** Herramienta: **Claude Code** (CLI y app de escritorio de Anthropic), con un agente configurado como *advisor* con instrucciones persistentes (`CLAUDE.md`) y memoria entre sesiones. Modelos: **Claude Opus** en las sesiones de septiembre de 2026 (discovery y alcance) y **Claude Opus / Fable** en la de octubre (esta entrega) — el modelo exacto por sesión no se registró en septiembre y se declara como tal. Skills y comandos: el método de la Sesión 2 del máster (PROMPT 1 → PROMPT 4) aplicado como conversación guiada, no como comando. **Los prompts de abajo son los que se lanzaron, no una versión limpia reconstruida** — incluido el que no funcionó.
>
> **Regla del proyecto:** el agente propone, la Dirección decide. Cada decisión registrada (D-1 … D-17) lleva su fundamento; las superadas se tachan, no se borran.

## Índice

1. [Descripción general del producto](#1-descripción-general-del-producto)
2. [Arquitectura del sistema](#2-arquitectura-del-sistema)
3. [Modelo de datos](#3-modelo-de-datos)
4. [Especificación de la API](#4-especificación-de-la-api)
5. [Historias de usuario](#5-historias-de-usuario)
6. [Tickets de trabajo](#6-tickets-de-trabajo)
7. [Pull requests](#7-pull-requests)

---

## 1. Descripción general del producto

**Prompt 1:** *(09/09/2026 · Claude Code, Opus · PROMPT 1 del método — el terreno)*

```
Quiero que el proyecto final del máster sea un Controlador de Tiempo con conectores a las
herramientas de gestión que usan nuestros clientes. No es un ejercicio: es una necesidad real que
apareció en tres clientes. Antes de proponer nada, mapea el terreno que ya existe: las plantillas
RegHoras de Proveedor A y Proveedor B, el reporte mensual de horas de un cliente, y el modelo de catálogo en HTML
que diseñamos y no implementamos. Dime qué mide cada uno, dónde vive y qué campos reales tiene.
No inventes campos: léelos de los archivos.
```

*Ajuste humano:* el agente devolvió un mapa de **tres modelos conviviendo** (asistencia, imputación por porcentaje, actividad por catálogo) y detectó deuda real (dos generaciones de plantilla con la convención de nombres divergida). Se aceptó tal cual; se corrigió un alias de cliente.

**Prompt 2:** *(09/09/2026 · Opus · PROMPT 2 — las cinco preguntas del product partner escéptico)*

```
Ahora hazme las cinco preguntas del product partner escéptico, una por una, y no pases a la
siguiente hasta que yo conteste. El dolor principal es este: a veces nos enteramos por nuestros
clientes de que un recurso no asistió o no se conectó.
```

*Ajuste humano:* la primera pregunta produjo el **reencuadre que guía el producto** — *«eso no es un problema de registro, es de detección»*. De la ronda salieron 14 decisiones (D-1 … D-14) y 8 puntos abiertos, registrados con fundamento en el documento de discovery. La Dirección decidió el modelo comercial (D-14) contra la propuesta inicial del agente.

**Prompt 3:** *(10/09/2026 · Opus · PROMPT 3 — alcance: el agente propone, la Dirección recorta)*

```
Propón el alcance del MVP. Yo recorto. Regla: anticipar todas las necesidades previsibles,
construir solo las del MVP y dejar las tuberías listas para el resto. Una tubería es un punto de
extensión, no una funcionalidad a medias. Y precisa esto: el aviso de llegada NO es el registro de
actividad; son dos actos distintos, y una hora después de la hora de inicio quiero el reporte de
quienes no se reportaron.
```

*Ajuste humano:* la v1 del agente dejaba el aviso fuera del MVP y el MVP no resolvía el primer dolor (riesgo 1). La Dirección lo subió al MVP el mismo día (D-17) y el agente reescribió la propuesta como **reporte programado** en lugar de motor de alertas en tiempo real — mucho más simple. Se produjo la v2, que es la base de esta entrega.

---

## 2. Arquitectura del Sistema

### **2.1. Diagrama de arquitectura:**

**Prompt 1:** *(17/10/2026 · Claude Code, Fable · a partir de la propuesta v2 y la plantilla oficial)*

```
Con el alcance aprobado (propuesta MVP v2) y la plantilla del repositorio oficial del proyecto
final, escribe la sección 2 del README. Stack: AdonisJS + React + PostgreSQL, el mismo del proyecto
de referencia del curso, para reutilizar el harness (OpenSpec, hooks, evals). Justifica el patrón
elegido con tres razones y di qué sacrifica. Diagrama en mermaid. Las nueve capacidades del MVP
y las tuberías obligatorias (organización en todo registro, referencia externa genérica) tienen que
verse reflejadas; nada que no esté en la propuesta aprobada.
```

*Ajuste humano — el que más cambió el documento:* el stack propuesto en este prompt (AdonisJS, el del proyecto de referencia del curso) **lo cuestionó la Dirección** el mismo día: pidió decidir por lo que conviene al proyecto, no por suposiciones sobre el perfil de quien lo construye. El agente verificó entonces el stack real del sistema de talento humano de la empresa (Next.js 15 + React 19 + Supabase + pg-boss + Vitest + Playwright) y corrigió su recomendación: **el stack que el futuro mantenedor ya opera pesa más que reutilizar el del curso.** Se reescribieron la sección 2 y los tickets 1 y 3; el modelo de datos, la API y las historias no cambiaron.

**Prompt 2:** *(17/10/2026 · Fable · la pregunta de la Dirección que cambió la decisión, literal)*

```
AdonisJS + ...: ¿por qué estimas que no es mi lenguaje de origen? Me gustaría tomar la decisión
considerando lo que más conviene para el proyecto, enfoquemos en esa línea.
```

*Resultado:* el agente reconoció que la afirmación no tenía fuente, verificó el stack de la casa leyendo los `package.json` del sistema de talento, y presentó tres opciones con criterios del proyecto (quién lo mantiene, el job programado, lo que viene en el curso). Decisión: **Opción A, Next.js + Supabase + pg-boss**, con un principio adjunto: *incorporar la tecnología que beneficie cuando aparezca, sin mezcolanza; lo mejor que se pueda pagar.*

**Prompt 3:** — *no aplica en esta entrega*

### **2.2. Descripción de componentes principales:**

**Prompt 1:** *(incluido en el prompt 1 de 2.1 — una sola petición para toda la sección 2)*

**Prompt 2:** — *no aplica*

**Prompt 3:** — *no aplica*

### **2.3. Descripción de alto nivel del proyecto y estructura de ficheros**

**Prompt 1:** *(incluido en el prompt 1 de 2.1; la estructura copia la convención por capability del proyecto de referencia del curso)*

**Prompt 2:** — *no aplica*

**Prompt 3:** — *no aplica*

### **2.4. Infraestructura y despliegue**

**Prompt 1:** *(incluido en el prompt 1 de 2.1)*

*Ajuste humano:* el proveedor concreto de despliegue se dejó **sin decidir a propósito** hasta la entrega 2 (costo y soporte de jobs programados).

**Prompt 2:** — *no aplica*

**Prompt 3:** — *no aplica*

### **2.5. Seguridad**

**Prompt 1:** *(incluido en el prompt 1 de 2.1, con esta instrucción adicional del mismo día)*

```
En seguridad incluye lo que ya practicamos: el hook que impide que secretos, correos reales o
ficheros .env entren en un commit y deja una línea fechada en un registro — bloquear sin registrar
protege pero no demuestra. Y la validación en el borde: nunca volcar el cuerpo de una petición sobre
un registro.
```

**Prompt 2:** — *no aplica*

**Prompt 3:** — *no aplica*

### **2.6. Tests**

**Prompt 1:** *(incluido en el prompt 1 de 2.1 — plan de pruebas, sin ejecución en esta entrega)*

**Prompt 2:** — *no aplica*

**Prompt 3:** — *no aplica*

---

### 3. Modelo de Datos

**Prompt 1:** *(17/10/2026 · Fable)*

```
Escribe el modelo de datos en mermaid erDiagram con todo el detalle que permite la sintaxis
(PK, FK, tipos, restricciones). Entidades: las que salen de las nueve capacidades del MVP y de la
tabla de capacidades anticipadas de la propuesta v2 — cada tubería es un campo, una entidad o un
estado, nunca una funcionalidad. Dos cosas no se negocian: organizacion_id en toda tabla de negocio
y la referencia externa como entidad propia. La traza es append-only. Los cálculos (horas,
porcentaje por referencia) se derivan, no se capturan.
```

*Ajuste humano:* se añadió `PARAMETRO` con ámbito global → cliente → asignación para que `{1}` pueda decidirse después sin tocar el esquema (punto abierto PA-1), y se marcó `aprobador_cliente` como rol existente sin acceso.

**Prompt 2:** — *no aplica*

**Prompt 3:** — *no aplica*

---

### 4. Especificación de la API

**Prompt 1:** *(17/10/2026 · Fable)*

```
Tres endpoints en OpenAPI 3.1, los del flujo principal: aviso de llegada (idempotente por
asignación y fecha), registro de actividad (nace en borrador, horas calculadas) y reporte de no
reportados (solo supervisor y dirección, acotado a la organización). Códigos de respuesta reales,
no genéricos: 200 cuando el aviso ya existía, 409 cuando el período está bloqueado, 403 para el
rol consultor en el reporte. Un ejemplo de petición y respuesta.
```

**Prompt 2:** — *no aplica*

**Prompt 3:** — *no aplica*

---

### 5. Historias de Usuario

**Prompt 1:** *(17/10/2026 · Fable)*

```
Tres historias de usuario de las cinco must-have, con criterios de aceptación declarativos, de
negocio, sin endpoints ni nombres de campo (eso baja un nivel, a la spec ejecutable). Cada historia
dice explícitamente qué queda fuera de ella. Aplica INVEST como filtro: si una historia falla dos
criterios, no entra. La primera es el aviso de un toque con objetivo de menos de 5 segundos — eso
es restricción de diseño, no aspiración.
```

*Ajuste humano:* en HU-2 se dejaron **dos supuestos visibles** (canal: correo; `{1}` = 60 minutos, global) porque la reunión operativa que debía decidirlos no dejó registro. Un hueco declarado es una decisión; uno callado es un descuido.

**Prompt 2:** — *no aplica*

**Prompt 3:** — *no aplica*

---

### 6. Tickets de Trabajo

**Prompt 1:** *(17/10/2026 · Fable)*

```
Tres tickets: uno de backend (el job programado del reporte de no reportados), uno de frontend
(la pantalla de aviso de un toque, móvil primero) y uno de base de datos (el esquema inicial con
las dos tuberías obligatorias). Cada uno con descripción, criterios de aceptación técnicos con
casos límite concretos, tareas, definición de hecho, estimación y prioridad. El de base de datos
sigue nuestro patrón de migración controlada: cada objeto verifica su existencia antes y después
con mensaje propio, nunca el del motor, y cierra con una validación 1 a 1 de solo lectura.
```

*Ajuste humano:* en el ticket 1 se añadió el caso límite de los minutos exactos (aviso a 08:59 no aparece; a 09:01 sí, con 61 minutos) — la clase de omisión que un camino feliz no ve.

**Prompt 2:** — *no aplica*

**Prompt 3:** — *no aplica*

---

### 7. Pull Requests

**Prompt 1:** — *no aplica en la entrega 1 (sin desarrollo todavía)*

**Prompt 2:** — *no aplica*

**Prompt 3:** — *no aplica*

---

> **El prompt que no funcionó (se registra a propósito).** El 17/10/2026 el agente intentó obtener tres decisiones de la Dirección con un cuadro de opciones (stack, visibilidad del repositorio, resultado de la reunión del 16/09). El cuadro se cerró dos veces sin respuesta porque llegaron mensajes del usuario mientras estaba abierto. Se procedió con las recomendaciones del agente como **supuestos declarados** en el README, revisables sección por sección. Lección: con el reloj puesto, preguntar en texto plano y seguir; no bloquear el trabajo en un diálogo.

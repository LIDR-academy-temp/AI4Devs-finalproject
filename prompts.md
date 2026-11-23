> Detalla en esta sección los prompts principales utilizados durante la creación del proyecto, que justifiquen el uso de asistentes de código en todas las fases del ciclo de vida del desarrollo. Esperamos un máximo de 3 por sección, principalmente los de creación inicial o  los de corrección o adición de funcionalidades que consideres más relevantes.
Puedes añadir adicionalmente la conversación completa como link o archivo adjunto si así lo consideras


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

**Prompt 1:**
Eres un experto Producto owner y tienes que crear un PRD para el desarrollo de una aplicación que permita crear un tipo de sujeto por ejemplo: cliente, socio, proveedor, etc con su código único; además se pueden crear clasificaciones las mismas que pueden tener relaciones por ejemplo un socio puede tener n créditos, o m inversiones con un código único creado por el usuario, cada crédito o inversion posee una ramificación con una etiqueta para ser cargada con información en formato pdf como se aprecia en el ejemplo, la información puede ser modificada, eliminada por el personal autorizado

- socio 1
 	-Crédito 123
		- Documento de identificación
			cedula_123.pdf
		- Solicitudes de crédito
			solicitud_credito_123.pdf
		- Documentos firmados
			pagare_credito_123.pdf	
	-Crédito 124
		- Documento de identificación
			cedula_124.pdf
		- Solicitudes de crédito
			solicitud_credito_124.pdf
		- Documentos firmados
			pagare_credito_124.pdf	

	- inversion 101
		- Documentos legales
			poliza_101.pdf

el stack tecnológico es base de datos PostgreSQL, backend con spring boot y frontend con React, mejora esta descripción para se adapte al estándar de buenas practicas para el detalle de un PRD y consulta si requieres mas información con el fin de afinar a lo mas optimo

**Prompt 2:**

aclarando las preguntas
1) la jerarquía pueden tener n niveles y esta es definida por el administrador.
2) Las etiquetas documentales no se anidan.
3) la etiqueta admite solo uno con version.
4) el código de clasificación es único globalmente.
5) se separan por rol con un código de identificación
6) el atributo principal es un código para cada sujeto que adopte un rol, como socio, proveedor, etc
7) no consideremos migración masiva por el momento
8) no es necesario un flujo de aprobación, solo que los documentos muestren y validen las etiquetas de obligatorio o no.
9) solo pdf.
10) visibilidad únicamente por rol.
11) el despliegue es local con docker.
12) no existe proveedor de identidad corporativo.
13) usuarios concurrentes unos 30 y se esperan unos 200 documentos por mes.
14) el plazo legal por retención es 10 años, el borrado definitivo lo realiza únicamente el administrador.
15) si debe registrar la lectura y descarga del documento
16) se debe realizar todo con shadcn
17) no se requiere firma electronica o sellado en ningún documento.
18) la aplicación se puede utilizar desde la tableta y un pc normal

en caso de existir mas consultas de igual manera me las indicas con el fin de afinar el documento

**Prompt 3:**

---

## 2. Arquitectura del Sistema

### **2.1. Diagrama de arquitectura:**

**Prompt 1:**
Usa el formato que consideres más adecuado para representar los componentes principales de la aplicación y las tecnologías utilizadas. Explica si sigue algún patrón predefinido, justifica por qué se ha elegido esta arquitectura, y destaca los beneficios principales que aportan al proyecto y justifican su uso, así como sacrificios o déficits que implica

**Prompt 2:**

Eres un Arquitecto de Software especializado en aplicaciones WEB. Del archivo PRD.md extrae los componentes principales de la aplicación y las tecnologías utilizadas, usa el formato que consideres más adecuado para representar. Explica si sigue algún patrón predefinido, justifica por qué se ha elegido esta arquitectura, y destaca los beneficios principales que aportan al proyecto y justifican su uso, así como sacrificios o déficits que implica, guarda esto en un archivo architecture.md

**Prompt 3:**

### **2.2. Descripción de componentes principales:**

**Prompt 1:**
Extrae los componentes más importantes, incluyendo la tecnología utilizada, en el proyecto GestionDocumental

**Prompt 2:**

**Prompt 3:**

### **2.3. Descripción de alto nivel del proyecto y estructura de ficheros**

**Prompt 1:**

Representa la estructura del proyecto y explica brevemente el propósito de las carpetas principales, así como si obedece a algún patrón o arquitectura específica.

**Prompt 2:**

**Prompt 3:**

### **2.4. Infraestructura y despliegue**

**Prompt 1:**

Detalla la infraestructura del proyecto, incluyendo un diagrama en el formato que creas conveniente, y explica el proceso de despliegue que se sigue

**Prompt 2:**

**Prompt 3:**

### **2.5. Seguridad**

**Prompt 1:**

Enumera y describe las prácticas de seguridad principales que se han implementado en el proyecto, añadiendo ejemplos si procede

**Prompt 2:**

**Prompt 3:**

### **2.6. Tests**

**Prompt 1:**

Todo Service nuevo debe tener **pruebas unitarias** que cubran **happy path, casos de error y casos borde** (según `CLAUDE.md`).

**Prompt 2:**

- **Vitest** + **React Testing Library** + `@testing-library/user-event`; entorno `jsdom`.
- Las **llamadas HTTP se simulan con MSW** (Mock Service Worker) a nivel de red; no se mockea `axios` ni los hooks de TanStack Query.
- Se prueba el **comportamiento visible para el usuario**, no los detalles de implementación: se consultan elementos por rol, etiqueta o texto (`getByRole`, `getByLabelText`); `data-testid` solo como último recurso.
- Cada prueba renderiza con los *providers* necesarios mediante una utilidad `renderWithProviders` (QueryClient nuevo por prueba, Router, Auth simulado).
- Se prueban siempre los estados **carga, vacío, error y sin permiso**, y las **variantes por permiso** (con y sin `Can`).
- Se incluyen pruebas de accesibilidad con `vitest-axe` en los componentes y pantallas críticos.
- **Cobertura mínima de referencia:** 80 % de líneas en `features/*/api`, `lib/` y componentes con lógica; es un mínimo, no un objetivo.

```tsx
describe('LabelRow', () => {
  it('should_showUploadButton_when_userCanUpload', async () => {
    // Arrange
    renderWithProviders(<LabelRow label={aPendingLabel()} canUpload onUpload={vi.fn()} />);

    // Act + Assert
    expect(screen.getByRole('button', { name: /cargar/i })).toBeEnabled();
  });

  it('should_showLockedBadge_when_userCannotViewLabel', () => {
    renderWithProviders(<LabelRow label={aLockedLabel()} canUpload={false} onUpload={vi.fn()} />);

    expect(screen.getByText(/candado|sin acceso/i)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /cargar/i })).not.toBeInTheDocument();
  });
});
```

- **Playwright**, con proyectos para **Chromium**, **WebKit** (Safari/iPad) y emulación de **tableta** (viewport ≥ 600 px, táctil).
- Se prueban **flujos de usuario**, no detalles de implementación: iniciar sesión, crear sujeto → crear clasificación → cargar documento → ver estado «Completa», búsqueda, reubicación, baja y reactivación, y los límites por permiso (rol con vista parcial).
- Selectores por **rol y texto accesible**; `data-testid` solo cuando no hay alternativa.
- Los datos se preparan por API (fixtures) y se aíslan entre pruebas; no dependen del orden de ejecución.
- Se incluyen comprobaciones de accesibilidad con `@axe-core/playwright` en los flujos críticos.
- Las E2E corren contra un entorno con el backend y servicios reales (Docker Compose de pruebas).

- Pruebas unitarias y de componentes junto al código: `Componente.test.tsx`; pruebas E2E por funcionalidad en `e2e/` (`subjects.spec.ts`, `documents.spec.ts`).
- Agrupar con `describe`; nombres con el patrón `should_<comportamiento>_when_<condición>`.
- Patrón **Arrange / Act / Assert**.
- Probar **escenarios de éxito y de error**, y **casos borde** (código inválido, archivo grande, sesión expirada, árbol de 6 niveles, permisos parciales).
- Prohibido `waitForTimeout`/`sleep` arbitrarios: se espera por condiciones (`findBy*`, `expect.poll`, `waitFor`).
- No se ignoran ni se marcan como `skip` pruebas sin una incidencia enlazada.

**Prompt 3:**
Describe brevemente algunos de los tests realizados con el desarrollo actual.
---

### 3. Modelo de Datos

**Prompt 1:**
Realiza el Diagrama del modelo de datos usa mermaid para el modelo de datos, y utilizar todos los parámetros que permite la sintaxis para dar el máximo detalle, por ejemplo las claves primarias y foráneas.

**Prompt 2:**
Eres un DBA senior y debes realizar el diagrama del modelo de datos, usa mermaid para el modelo de datos, y utilizar todos los parámetros que permite la sintaxis para dar el máximo detalle, y considera los puntos a continuacion:
- Diagrama del Modelo de Datos
- Descripción de Entidades Principales
- Relaciones y Cardinalidades
- Índices y Optimizaciones
- Consideraciones de Escalabilidad
Guardar el documento en un archivo llamado data-model.md dentro de la carpeta docs.

**Prompt 3:**

---

### 4. Especificación de la API

**Prompt 1:**

**Prompt 2:**

**Prompt 3:**

---

### 5. Historias de Usuario

**Prompt 1:**
Eres un Product Owner senior con experiencia en aplicaciones Web. Tu tarea es
convertir el PRD indicado por el usuario en un backlog estructurado, listo para
crear issues en Linear.

## Entrada

El usuario te indicará un archivo (por defecto `docs/PRD.md`). Léelo completo
antes de producir nada.

## Salida

Produce Markdown estructurado con esta jerarquía:

1. **EPICS** — capacidades de alto nivel. Agrupa por módulo de cara al usuario
   (auth, tasks, sync, settings…). Un epic = una hipótesis de producto.

2. Para cada epic, **3-5 USER STORIES** en formato exacto:
   > Como [rol], quiero [acción], para [beneficio].

3. Para cada story, **3-5 ACCEPTANCE CRITERIA** en formato Given/When/Then.
   Deben ser observables y testeables, no genéricos. Incluye al menos un caso
   de error o edge case por story cuando aplique.

4. Una sección **TECHNICAL CONTEXT** por story: apunta a archivos existentes
   relevantes del repo (si los hay). Si no hay, escribe "—".

5. **LABELS** sugeridas por story, siguiendo las convenciones del `AGENTS.md`
   del repo: `module:*`, `type:feature|bug|refactor|docs|spike`, `size:S|M|L|XL`.

6. **ESTIMATION HINT** por story: una t-shirt (S/M/L/XL) con 2 líneas de
   justificación.

## Restricciones críticas (no negociables)

- **Solo usa información presente en el PRD.** Marca con `(asumido)` cualquier
  cosa que infieras y que no esté literal en el documento.
- **No inventes features** que no estén en el PRD. Si el dominio "sugiere" una
  feature común (notificaciones push, multi-idioma, etc.) pero no está en el
  PRD, NO la incluyas.
- **No propongas arquitectura ni detalles de implementación.** El "cómo" va en
  OpenSpec, no aquí. Limítate al "qué" y al "por qué".
- Respeta el alcance: si el PRD declara cosas como *out of scope*, no generes
  stories para ellas.
- Si el alcance de una story es demasiado grande para un sprint, márcala como
  `needs-splitting` y propón una decomposición tentativa en 2-3 stories,
  dejando claro que es tentativa hasta validar con un spike.

**Prompt 2:**

Arma el Backlog de producto con las User Stories generadas anteriormente, genera otro documento product-backlog.md. Priorizalas con metodología MosCow. Estima por cada item en el backlog (genera una tabla markdown): Complejidad y esfuerzo estimado de implementación. Riesgos y dependencias entre tareas. estima el esfuerzo de las historias usando la metodología tallas de camiseta y unidades en puntos de historia. las tallas de camiseta y unidades en puntos de historia deben estar directamente relacionadas. utiliza la siguiente informacion Tallas de camiseta: XS (1), S (2), M (5), L (8), XL (13+)

**Prompt 3:**

---

### 6. Tickets de Trabajo

**Prompt 1:**
Crea y documenta 3 de los tickets de trabajo principales del desarrollo, uno de backend, uno de frontend, y uno de bases de datos. Da todo el detalle requerido para desarrollar la tarea de inicio a fin teniendo en cuenta las buenas prácticas al respecto

**Prompt 2:**

aqui tienes un ejemplo de ticket de trabajo bien estructurado:

Título: Implementación de Autenticación de Dos Factores (2FA)

Descripción: Añadir autenticación de dos factores para mejorar la seguridad del login de usuarios. Debe soportar aplicaciones de autenticación como Authenticator y mensajes SMS.

Criterios de Aceptación:

Los usuarios pueden seleccionar 2FA desde su perfil. Soporte para Google Authenticator y SMS. Los usuarios deben confirmar el dispositivo 2FA durante la configuración. Prioridad: Alta

Estimación: 8 puntos de historia

Asignado a: Equipo de Backend

Etiquetas: Seguridad, Backend, Sprint 10

Comentarios: Verificar la compatibilidad con la base de usuarios internacionales para el envío de SMS.

Enlaces: Documento de Especificación de Requerimientos de Seguridad

Historial de Cambios:

01/10/2026: Creado por [nombre] 05/10/2023: Prioridad actualizada a Alta por [nombre]


**Prompt 3:**

---

### 7. Pull Requests

**Prompt 1:**

Genera el PR de la implementacion de los ticket TK01 al TK09 y detalle las tareas realizadas

**Prompt 2:**
Genera el PR de los tickets TK10 al TK13 con sus tasks realizadas
**Prompt 3:**

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

**Prompt 1:** Vamos a redactar el Apartado "1. Descripción general del producto" del README de
AdOps360, siguiendo la plantilla oficial de AI4Devs-finalproject. Debe cubrir estos
subapartados: Objetivo, Características y funcionalidades principales, Diseño y
experiencia de usuario, Instrucciones de instalación.

Contexto del producto:

AdOps360 centraliza la gestión de campañas OOH y digitales de GeoQ para 3 roles
funcionales (operaciones, negocio, financiero — un mismo usuario puede tener varios
roles asociados), sustituyendo el mosaico actual de OneDrive, Excel y Qlik Sense.

Los clientes son normalmente agencias, aunque también hay clientes directos (no
habitual). Las campañas se ejecutan en Adform, Equativ y Displayce.

Funcionalidades núcleo del MVP:

1. Ingesta de Órdenes de Compra (OC): carga de la información de la OC que envían
   los clientes/agencias para dar de alta una campaña.
2. Gestión de oferta comercial: el equipo de negocio registra su oferta comercial
   (hoy en Excel) como paso previo a su conversión en OC.
3. Sincronización de rendimiento vía API: conexión con Adform, Equativ y Displayce
   para traer datos de rendimiento de campaña, sustituyendo la descarga manual diaria
   a Excel.
4. Status diario de campañas: vista consultable por operaciones y negocio con el
   estado/rendimiento actualizado de cada campaña.
5. Cálculo de márgenes: cruce de rendimiento + datos maestros (precios de venta,
   extraprima por agencia) para que financiero obtenga márgenes por campaña y
   acumulados por período/tipo de campaña/agencia, sustituyendo Qlik Sense.
6. Gestión de datos maestros/configuración: CRUD administrativo sobre extraprimas
   por agencia, costes, precios de venta y demás parámetros necesarios para el
   cálculo de márgenes — accesible para el rol financiero.

Stack ya decidido (por si aporta contexto a la descripción, no lo detalles aquí en
profundidad, ya va en la sección de arquitectura): FastAPI + Next.js + PostgreSQL +
Cognito, desplegado en una EC2 con Docker Compose.

Necesito que:

1. Redactes el Objetivo: qué es AdOps360 y qué problema resuelve, en 2-3 frases,
   dirigido a un lector que no conoce GeoQ.
2. Listes las 6 funcionalidades anteriores como "Características y funcionalidades
   principales", redactadas de forma clara para el README (puedes mejorar la
   redacción, pero no cambies el alcance ni añadas funcionalidades nuevas).
3. Para "Diseño y experiencia de usuario": como todavía no hay mockups ni capturas,
   deja un placeholder claro indicando "Pendiente de capturas/mockups tras el
   desarrollo del frontend" en vez de inventar una descripción de UI que no existe.
4. Para "Instrucciones de instalación": genera el bloque estándar basado en el stack
   (clonar repo, docker-compose.yml, variables de entorno necesarias incluyendo las
   de Cognito, comando docker-compose up) — pero márcalo como borrador a validar
   cuando el docker-compose.yml esté cerrado, ya que puede haber variables que aún no
   conozcamos.

No inventes funcionalidades, integraciones ni datos de UX que no te haya dado. Si te
falta algo para alguno de los 4 subapartados, pregúntamelo en vez de asumir.

---

## 2. Arquitectura del Sistema


**Prompt 1:** Vamos a redactar el Apartado "2. Arquitectura del sistema" del README de AdOps360,
siguiendo la plantilla oficial de AI4Devs-finalproject. Debe cubrir: diagrama de
arquitectura, justificación del patrón elegido, descripción de componentes
principales, estructura de ficheros, infraestructura y despliegue, seguridad, y
estrategia de tests.

Contexto ya decidido:

- Patrón: monolito contenedorizado en una única instancia EC2 (t3.small/medium),
  adecuado para el alcance de un MVP interno de GeoQ (3 roles de usuario, volumen
  moderado de campañas).
- Componentes: backend (FastAPI), frontend (Next.js + TypeScript), base de datos
  (PostgreSQL en contenedor propio con volumen persistente), nginx como reverse
  proxy con TLS vía Certbot. Los 4 orquestados con Docker Compose.
- Autenticación: AWS Cognito (User Pool) para autenticación; autorización propia por
  roles vía tabla puente user_roles, validada en cada endpoint del backend.
- Integraciones externas: APIs de Adform, Equativ y Displayce (solo lectura de
  rendimiento, no se automatiza creación de campañas en los DSP).
- Almacenamiento de ficheros: S3, para Excel de OC/oferta comercial e informes
  descargados de los DSP.
- Repositorio: monorepo (backend/, frontend/, docs/, ai-specs/ ya existentes por el
  scaffolding de OpenSpec/specboot).
- Testing previsto (se implementará en entregas posteriores, aquí solo se describe
  la estrategia): pytest + httpx en backend, Vitest + Testing Library en frontend,
  Playwright para E2E de los 3 flujos de rol.

Necesito que:

1. Generes el diagrama de arquitectura en formato Mermaid (tipo "graph" o "flowchart"),
   mostrando: usuario -> nginx -> frontend/backend -> Postgres, backend -> Cognito,
   backend -> S3, backend -> APIs externas (Adform/Equativ/Displayce), todo dentro de
   la EC2 salvo Cognito/S3/APIs externas que son servicios/fuentes externas.
2. Justifiques por qué este patrón (monolito en una sola instancia) es adecuado para
   el alcance actual, y menciones brevemente cómo evolucionaría si el uso creciera
   (por ejemplo, separar en servicios gestionados) — sin comprometerte a implementarlo
   ahora.
3. Describas los componentes principales (backend, frontend, db, nginx, Cognito, S3,
   integraciones DSP) en una tabla o lista breve con su responsabilidad.
4. Propongas la estructura de carpetas del monorepo (backend/, frontend/, docs/,
   ai-specs/, y lo que sea necesario dentro de cada uno según el stack), coherente
   con lo que ya generamos en docs/base-standards.md.
5. Describas la infraestructura y el despliegue: EC2 + Docker Compose + nginx/Certbot,
   variables de entorno gestionadas vía .env, sin inventar pipeline de CI/CD que aún
   no hemos decidido (si crees que hace falta uno, pregúntamelo en vez de asumirlo).
6. Documentes la sección de seguridad: Cognito para autenticación, autorización por
   roles en backend, gestión de secretos vía .env con permisos restringidos, HTTPS
   vía Certbot, y cualquier otra medida básica razonable para este alcance (sin
   sobredimensionar).
7. Describas la estrategia de tests prevista (los 3 niveles ya decididos), aclarando
   que en esta entrega 1 aún no hay código, por lo que es la estrategia planificada,
   no resultados.

Léete antes docs/base-standards.md (ya actualizado con el stack) para mantener
coherencia total con lo que ya está documentado ahí, y no dupliques información —
si algo ya está bien explicado allí, referencia esa sección en vez de repetirla en el
README.

No inventes componentes, servicios ni decisiones de infraestructura que no te haya
dado. Si necesitas decidir algo no especificado, pregúntamelo antes de asumir.


---

### 3. Modelo de Datos

**Prompt 1:** Vamos a redactar el Apartado "3. Modelo de datos" del README de AdOps360, siguiendo
la plantilla oficial de AI4Devs-finalproject. Debe incluir un diagrama Mermaid
(erDiagram) con las entidades, sus atributos clave, PK/FK, y una descripción de cada
entidad.

Contexto funcional del dominio:

- Usuarios con roles: operaciones, negocio, financiero. Un usuario puede tener varios
  roles simultáneos (modelo: tabla puente user_roles).
- Clientes: normalmente agencias, aunque también hay clientes directos (caso no
  habitual) — probablemente conviene modelar "cliente" con un tipo/discriminador
  (agencia vs. directo).
- Oferta comercial: registrada por el equipo de negocio, que se transforma en una
  Orden de Compra (OC) cuando se confirma.
- Orden de Compra (OC): documento que envía el cliente/agencia y que da de alta una
  campaña, con su información asociada (importes, condiciones, etc. — a definir).
- Campaña: ejecutada en una o varias plataformas (Adform, Equativ, Displayce),
  vinculada a la OC de origen y al cliente/agencia.
- Rendimiento de campaña: datos obtenidos diariamente vía API desde las plataformas
  (impresiones, clics, coste, u otras métricas según cada DSP), con fecha, para
  alimentar el status diario.
- Datos maestros/configuración: precios de venta, extraprima por agencia, costes, y
  demás parámetros necesarios para calcular márgenes.
- Margen: resultado calculado a partir del rendimiento + datos maestros, por
  campaña, y agregable por período, tipo de campaña y agencia.

En la raíz del proyecto está campaigns.xlsx, con la configuración real usada hoy en
el proceso manual. Además, ya existen en el repo uno o varios ficheros relacionados
con extraprimas por agencia (ya trabajados previamente en esta misma sesión de
Claude Code) — localízalos en el proyecto y léelos también.

Usa la estructura de campos de todos estos ficheros como base del modelo de datos
en vez de inventar atributos, especialmente para las entidades de datos maestros
(extraprimas, precios, costes) y para cualquier campo de campaña/OC que ya aparezca
en ellos. Si encuentras que campaigns.xlsx y los ficheros de extraprima modelan el
mismo concepto de forma distinta o incompatible, señálamelo explícitamente en vez de
elegir uno arbitrariamente.

Necesito que:

1. Identifiques las entidades necesarias a partir del contexto y de los ficheros
   reales (campaigns.xlsx + ficheros de extraprima), sin inventar campos que no se
   deduzcan de lo descrito o de esos ficheros — si te falta un dato concreto (ej. qué
   métricas exactas trae cada DSP, qué campos tiene la OC y no están en ningún
   fichero), márcalo como pendiente de validar en vez de asumir un valor.
2. Generes el diagrama Mermaid erDiagram con las entidades, sus atributos principales
   (con tipo aproximado), y las relaciones con cardinalidad, marcando claramente
   PK y FK.
3. Describas cada entidad en una tabla o lista breve: propósito y campos clave,
   indicando de qué fichero proviene cada uno cuando aplique.
4. Mantengas coherencia con lo ya definido en docs/base-standards.md y con la sección
   de arquitectura del README (nombres de servicios, stack).

Léete antes docs/base-standards.md y la sección 2 del README ya redactada, para no
contradecir nada. No inventes entidades ni relaciones que no se deduzcan del contexto
dado o de los ficheros reales — pregúntame antes de asumir cualquier cosa que no esté
clara.



---

### 4. Especificación de la API

No aplica, de momento.

---

### 5. Historias de Usuario

**Prompt 1:** Vamos a generar las historias de usuario del Apartado "5. Historias de usuario" del
README de AdOps360, usando la skill enrich-us.

Contexto: AdOps360 centraliza la gestión de campañas OOH/digitales de GeoQ para 3
roles (operaciones, negocio, financiero — un usuario puede tener varios roles a la
vez). Funcionalidades núcleo del MVP ya cerradas:

1. Ingesta de Órdenes de Compra (OC)
2. Gestión de oferta comercial (negocio)
3. Sincronización de rendimiento vía API (Adform, Equativ, Displayce)
4. Status diario de campañas
5. Cálculo de márgenes (cruce rendimiento + datos maestros)
6. Gestión de datos maestros/configuración (extraprimas, costes, precios)

La plantilla del README pide 3 historias de usuario principales. Quiero que
representen los 3 bloques de valor más críticos del MVP, una por cada uno:

- Historia A: alta de campaña a partir de oferta comercial/OC (funcionalidades 1-2),
  rol negocio y/u operaciones.
- Historia B: consulta de status diario de campañas (funcionalidades 3-4), rol
  operaciones y/o negocio.
- Historia C: obtención de márgenes de campaña (funcionalidad 5, apoyada en la 6),
  rol financiero.

Usa la skill enrich-us para desarrollar cada una en formato:

Como [rol], quiero [acción], para [beneficio/objetivo].

Criterios de aceptación: (lista clara y verificable, en formato Given/When/Then o
checklist)

Para cada historia, apóyate en docs/data-model.md y docs/base-standards.md ya
generados para que los criterios de aceptación sean coherentes con las entidades y
el stack reales, no genéricos.

No inventes funcionalidades ni reglas de negocio que no se deduzcan de lo ya
documentado en el proyecto (README secciones 1-3, campaigns.xlsx, ficheros de
extraprima). Si un criterio de aceptación requiere una regla de negocio que no está
clara (por ejemplo, qué pasa si el rendimiento de un DSP no llega un día, o cómo se
resuelve un conflicto entre oferta comercial y OC), pregúntamelo en vez de asumir
un comportamiento.

Añade las 3 historias resultantes a la sección 5 del readme.md.


---

### 6. Tickets de Trabajo

**Prompt 1:** Vamos a generar el Apartado "6. Tickets de trabajo" del README de AdOps360, a partir
de las 3 historias de usuario ya definidas en la sección 5 (alta de campaña desde
oferta/OC, consulta de status diario, cálculo de márgenes).

Para cada una de las 3 historias, crea el change correspondiente en OpenSpec (flujo
/new seguido de /ff) para obtener el desglose técnico de tareas, apoyándote en
docs/data-model.md y docs/base-standards.md para que las tareas sean coherentes con
el modelo de datos y el stack reales (FastAPI, Next.js, PostgreSQL, Cognito).

La plantilla del README exige exactamente 3 tickets de trabajo: uno de backend, uno
de frontend y uno de base de datos. Del conjunto de tareas generadas por OpenSpec
para las 3 historias, selecciona las 3 que mejor representen el trabajo técnico
núcleo de cada categoría (backend/frontend/BD) — prioriza tareas que sean
representativas del esfuerzo real del proyecto, no las más triviales.

Para cada uno de los 3 tickets seleccionados, documenta en el README con este
formato:

- Título
- Descripción
- Criterios de aceptación
- Prioridad (alta/media/baja, justificada brevemente)
- Estimación (en puntos o en tiempo, tu mejor estimación razonada según la
  complejidad de la tarea)
- Historia de usuario relacionada (de las 3 de la sección 5)

No inventes tareas que no se deduzcan del desglose real generado por OpenSpec para
estas 3 historias. Si al desglosar alguna historia encuentras ambigüedad técnica que
afecta a la estimación o al alcance del ticket, pregúntamelo antes de asumir.

Añade los 3 tickets resultantes a la sección 6 del readme.md.

**Prompt 2: En la sección 6 (Tickets de trabajo) del readme.md, añade una nota breve al
principio, antes de los 3 tickets, que indique:

- Existe una tarea de andamiaje previa (setup de conexión a BD, wiring de
  autenticación Cognito, estructura base de backend/frontend) estimada aparte en
  ~5 puntos, no incluida como uno de los 3 tickets porque la plantilla pide
  ejemplos representativos por categoría (backend/frontend/BD), no el desglose
  completo del proyecto.
- Los 3 tickets documentados a continuación asumen ese andamiaje ya resuelto; no son
  ejecutables de forma aislada sin él.

Sé conciso, 3-4 líneas como máximo.

---

### 7. Pull Requests

**Prompt 1:** Vamos a redactar el Apartado "7. Pull Requests" del README de AdOps360, siguiendo la
plantilla oficial de AI4Devs-finalproject, que pide documentar 3 Pull Requests.

En esta Entrega 1 solo existe una PR real: la que recoge todo el trabajo de
documentación de esta rama (feature/entrega-1-LFMC contra main). Las otras 2 PRs
corresponden a código y llegarán en las Entregas 2 y 3.

Para generar el contenido de la PR 1, revisa el diff real de esta rama
(feature/entrega-1-LFMC) contra main — usa git para verlo (git diff main... o
git log main..HEAD) en vez de asumir qué se ha hecho.

Necesito que documentes la Pull Request 1 con este formato:

- Título de la PR (conciso, tipo "docs: documentación técnica entrega 1 - AdOps360")
- Descripción: resumen de qué incluye (secciones 0-3, 5, 6 del README, docs/base-
  standards.md, docs/data-model.md, docker-compose.yml, prompts.md), basado en los
  ficheros realmente modificados/creados en el diff.
- Cómo probarlo/revisarlo: qué debería mirar quien revise (ej. "revisar que el
  readme.md siga la estructura de la plantilla oficial", "validar el modelo de datos
  contra campaigns.xlsx")

Para la Pull Request 2 y Pull Request 3, deja placeholders claros indicando
"Pendiente — se documentará en la Entrega 2/Entrega Final, al incluir código
funcional" — no inventes contenido de código que todavía no existe.

Añade el resultado a la sección 7 del readme.md.

**Prompt 2:**

**Prompt 3:**

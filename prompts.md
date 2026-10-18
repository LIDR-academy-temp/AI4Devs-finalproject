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

## Entrega 2 — Código funcional

### Andamiaje (backend, frontend, Docker Compose)

**Prompt 1**
- **Herramienta:** Claude Code
- **Prompt:** Vamos a crear el andamiaje (scaffolding) de AdOps360 para la Entrega 2, directamente
en la rama feature/entrega-2-LFMC. Todavía no hay carpetas backend/ ni frontend/.

Antes de escribir nada, lee docs/base-standards.md, docs/data-model.md, el readme.md
(secciones 2, 3 y 6, incluida la nota de andamiaje) y el docker-compose.yml y
.env.example que ya existan, y respeta lo que ya está decidido ahí.

Alcance del andamiaje (solo la base, sin lógica de negocio de ninguna historia):

1. backend/ con FastAPI: estructura de carpetas según base-standards.md, endpoint
   /health, configuración leída de variables de entorno (pydantic-settings), conexión
   a PostgreSQL con SQLAlchemy y Alembic configurado (sin migraciones de negocio
   todavía, solo la infraestructura lista para crearlas). Dockerfile y pytest con un
   test del /health.
2. Autenticación: validación de tokens de AWS Cognito en el backend (verificación del
   JWT contra el JWKS del User Pool) y una dependencia reutilizable que obtenga el
   usuario autenticado. Deja preparada la comprobación de roles contra la tabla
   user_roles, sin implementar aún los endpoints de negocio. Todo configurable por
   variables de entorno (región, user pool id, client id).
3. frontend/ con Next.js + TypeScript: página de inicio, login contra Cognito y una
   ruta protegida de ejemplo. Dockerfile y Vitest con un test mínimo.
4. docker-compose.yml con los 4 servicios (backend, frontend, db, nginx), volumen
   nombrado para Postgres y env_file: .env. Completa o corrige el que ya exista en
   vez de duplicarlo.
5. .env.example con todas las variables necesarias (BD, Cognito, Adform) y SOLO valores
   de ejemplo. No escribas, pidas ni uses credenciales reales en ningún fichero.
   Comprueba que .env está en .gitignore.
6. Actualiza el readme.md (sección 1.4 de instalación) solo si algo de lo que ya
   documentaste cambia.

Restricciones:
- No implementes lógica de ninguna historia de usuario (alta de campaña, status diario,
  márgenes) ni modelos de negocio más allá de lo mínimo para user_roles.
- No inventes servicios ni librerías fuera del stack ya decidido. Si te falta una
  decisión (versiones de Python/Node, gestor de paquetes, librería de auth del
  frontend), pregúntamela antes de asumir.
- Haz commits pequeños y separados (backend, frontend, compose/env), con mensajes
  convencionales.

Al terminar, dime cómo verificar que funciona: docker compose up --build, qué URL
responde y cómo ejecutar los tests de backend y frontend.

Ya he creado el User Pool de Cognito (eu-central-1) con un app client de tipo SPA
(sin client secret, flujo authorization code con PKCE). El backend solo debe
validar tokens con el JWKS del pool, usando región, user pool id y client id desde
variables de entorno. No necesitas ningún secret de Cognito.
- **Respuesta (resumen):** El andamiaje está hecho en feature/entrega-2-LFMC, en 4 commits que no he subido al remoto. He levantado el stack completo y responde. El login contra tu User Pool real no lo he probado: para no leer ni usar tu .env, todo lo he ejecutado con una copia de .env.example en el scratchpad.

Commit: 7f74828 feat(backend)
Contenido: FastAPI con capas DDD, /health, configuración con pydantic-settings,
SQLAlchemy, Alembic sin migraciones, verificación de Cognito,
get_current_user y require_roles, Dockerfile y 29 tests
────────────────────────────────────────
Commit: 5ea19dc feat(frontend)
Contenido: Next.js 16 con TypeScript estricto, login con oidc-client-ts (code +
PKCE), /callback, ruta protegida /account, cliente de API tipado, Dockerfile
y 10 tests
────────────────────────────────────────
Commit: 4d0d982 chore(infra)
Contenido: env_file: .env en db y backend, healthcheck,
nginx/conf.d/default.conf y .env.example solo con valores de ejemplo
────────────────────────────────────────
Commit: 4bb6d04 docs(readme)
Contenido: §1.4 actualizado

Cómo comprobar que funciona

docker compose up -d --build
docker compose ps                    # backend y db en "healthy"
curl http://localhost/api/health     # {"status":"ok"}
- La app está en http://localhost/ (inicio, botón Sign in y /account protegida).
- La documentación de la API está en http://localhost/api/docs.
- docker compose exec backend alembic current conecta con la base de datos; todavía no hay migraciones.
- Tests del backend: cd backend && uv run pytest. Necesitas uv (brew install uv), porque en tu máquina no está y yo los ejecuté en contenedor.
- Tests del frontend: cd frontend && npm ci && npm test.

Qué tienes que hacer tú para el login real
1. Añadir COGNITO_DOMAIN a tu .env. Es el dominio del Hosted UI, sin https://. Sin él no funcionan ni el login ni el logout.
2. En el app client de Cognito, registrar http://localhost/callback como URL de callback y http://localhost/ como URL de cierre de sesión.
3. Si cambias alguna variable COGNITO_* o NEXT_PUBLIC_API_URL, reconstruir con --build: se incrustan en el bundle del frontend al construir la imagen.

Decisiones que he tomado y conviene que revises
- Respuestas de error: token ausente o inválido devuelve 401, usuario no registrado o sin el rol devuelve 403 (no se autoprovisiona), y JWKS inalcanzable devuelve 503 en lugar de 401.
- Comprobaciones del ID token: firma, exp, iss, aud, token_use=id y email_verified=true. Un email sin verificar no vale como clave de unión con users.
- El frontend no recibe env_file: si lo recibiera, su contenedor tendría las credenciales de los DSP. Lo he comprobado: dentro hay 0 variables con SECRET o PASSWORD.
- require_roles() sin roles falla al arrancar: un requisito vacío nunca equivale a un endpoint abierto.
- Modelos sin migración: existen los modelos de users, roles y user_roles, pero su migración es del Ticket 1. Hasta entonces, cualquier endpoint protegido que añadas devolverá 500 porque las tablas no existen.
- nginx solo HTTP: el bloque 443 se añade en la instancia cuando haya certificado, porque si apunta a ficheros que no existen nginx no arranca.

Pendientes y avisos
- docs/data-model.md no existe: según el readme se eliminó a propósito, y he usado el §3 en su lugar.
- Secciones del readme desactualizadas: las notas de §2.3 ("Estado en la entrega 1") y §2.6 ("no hay tests") ya no son ciertas. No las he tocado porque pediste cambiar solo §1.4.
- Versiones: npm resolvió las últimas, incluida TypeScript 7. Compila bien con Next 16, pero dímelo si prefieres fijar la 5.x.
- Aviso en los tests del backend: Starlette avisa de que httpx está deprecado para su TestClient y recomienda httpx2. Lo he mantenido porque el stack decidido dice httpx.
- Docker Desktop: lo arranqué para las pruebas y sigue abierto.


**Prompt 2**
- **Prompt:** [el de actualización de §2.3 y §2.6 del readme]
- **Respuesta (resumen):**
- **Ajuste humano:**

### Change: register-campaign-from-purchase-order

**Prompt 1**
- **Prompt:** [el de arranque del change]
- **Respuesta (resumen):**
- **Ajuste humano:**

**Prompt 2 — Aislamiento de la base de datos en los tests**
- **Herramienta:** Claude Code
- **Prompt:** Los tests del backend fallan en la segunda ejecución con `users_email_key` duplicado. Objetivo único: que la suite sea repetible. Deriva una BD `<db>_test`, recréala al inicio de sesión, aplica `alembic upgrade head` sobre ella y aísla cada test con transacción y rollback. Entrega `pytest` dos veces seguidas con la salida real pegada.
- **Respuesta (resumen):** Una primera versión del `conftest.py` siguió usando la BD de desarrollo. Una segunda reescritura derivó la BD de test, pero `alembic/env.py` leía `os.environ["DATABASE_URL"]` e ignoraba el override.
- **Ajuste humano:** La causa raíz no estaba en el `conftest.py` sino en `alembic/env.py`, y la detecté al comprobar contra qué base se ejecutaban realmente los tests. Fijé el patrón de verificación que usé desde entonces: reconstruir la imagen antes de cada prueba (el código se copia a la imagen), ejecutar `pytest` dos veces seguidas y no dar por buena ninguna afirmación de "tests passing" sin ver la salida cruda. La suite quedó en 60 tests estables.

**Prompt 3 — Stub de `GET /campaigns`, fuga de SQL y campañas sin líneas**
- **Herramienta:** Claude Code
- **Prompt:** Completa el endpoint `GET /campaigns` (hoy devuelve `[]`), evita que un `order_reference` duplicado devuelva un 500 con SQL crudo y exige al menos una línea en el alta. Test primero en los tres casos.
- **Respuesta (resumen):** `list_all()` en el repositorio y endpoint real; `DuplicateOrderReferenceError` mapeado a 409 con `{"code","message"}`; `min_length=1` en `lines`.
- **Ajuste humano:** Informes anteriores daban `GET /campaigns` por completo, pero al revisar el código era un stub con un TODO. El 500 filtraba SQL al cliente, lo que es una fuga de seguridad, no solo un error feo. Verifiqué los tres casos con `curl` real (422 `too_short` con `loc: ["body","lines"]`, 409 y 200), no con el informe.

**Prompt 4 — Frontend por bloques: cliente HTTP, errores, listado y formulario**
- **Herramienta:** Claude Code
- **Prompt:** Bloque a bloque (cliente HTTP con `id_token`, tipado de los dos formatos de error del backend, pantallas de sesión caducada y acceso denegado, listado, formulario con Zod). En cada bloque: test primero y entrega de `typecheck`, `vitest` dos veces y `docker compose build frontend`.
- **Respuesta (resumen):** Cuatro bloques con 9, 49 y más tests; commits `c2128b9` y `171ab91` para el formulario.
- **Ajuste humano:** (1) `next build` no compilaba aunque Vitest estaba en verde, porque Vitest no comprueba tipos; añadí el script `typecheck` y la regla de que un bloque solo está completo si pasan `typecheck`, `vitest` ×2 y `docker compose build`. (2) El commit `e0bc754` ("redirect authenticated users to campaigns list") eliminó el botón de login de la home y dejó solo un texto sin acción. Los tests pasaban; lo vi al abrir el navegador. (3) Sustituí `npm install` por `npm ci` para evitar cambios espurios en `package-lock.json`.

**Prompt 5 — Configuración de Cognito (scope y app client)**
- **Herramienta:** Claude Code
- **Prompt:** Hacer funcionar el login real contra el User Pool: app client SPA, callbacks y scopes.
- **Respuesta (resumen):** El código pedía el scope `openid email profile` y el flujo fallaba con `invalid_scope`.
- **Ajuste humano:** Contrasté la configuración real de AWS con el código, algo que Claude Code no podía ver: el app client solo permitía `openid`, `email` y `phone`. Ajusté `cognito-config.ts` a `openid email`, que además es lo que necesita el backend (lee el claim `email`). Sustituí el app client creado con secret por uno SPA sin secret. Un secreto de Adform se pegó por error en un chat; lo rotaré en origen y no figura en ningún fichero del repositorio.

**Prompt 6 — Mensajes de validación del formulario (Zod 4)**
- **Herramienta:** Claude Code
- **Prompt:** Al enviar el formulario vacío se ve el JSON en bruto de los issues de Zod 4. Test primero (ningún texto debe empezar por `[ {` ni contener `origin`), corregir la causa raíz, mapear `issue.path` a campos (incluidas rutas `lines.0.sale_cpm`) y dar a `scope` un mensaje en español. Entregar `typecheck`, `vitest` ×2 y `docker compose build frontend`.
- **Respuesta (resumen):** Commit `9be3c1b` (mapeo por campo). El segundo commit `0106edc` traducía el error de `scope` buscando el texto "Invalid enum value", y el informe hablaba de `superRefine`.
- **Ajuste humano:** Los 52 tests pasaban y la pantalla seguía mal, así que la verificación real fue el navegador. Contrasté el informe con mi error real: "Invalid enum value" es de Zod 3 y el proyecto usa Zod 4 (`^4.6.7`), donde el mensaje es "Invalid option: expected one of...". Lo localicé con `grep` (`message.includes("Invalid enum value")`) y exigí que el mensaje saliera del propio esquema y no de un texto en inglés de la librería. Confirmé en el navegador que `scope` muestra "Selecciona el ámbito".

**Prompt 7 — 500 por nombre de campaña duplicado**
- **Herramienta:** Claude Code
- **Prompt:** `POST /campaigns` con un `name` ya existente devuelve 500 (`IntegrityError ... campaigns_name_key`). Test primero: 409 `duplicate_campaign_name`, sin filas nuevas en `purchase_orders` tras el fallo, y 409 `duplicate_order_reference` con `Orden`. Implementar `DuplicateCampaignNameError`. Trabajar solo en backend. Entregar `pytest` ×2 y `git show --stat`.
- **Respuesta (resumen):** El primer intento (commit `7661eed`) solo añadió un test de frontend para un caso que ya funcionaba. El segundo (`b6958dc`) añadió el 409 en el repositorio y el router; el tercero (`744c50c`) movió el mapeo a manejadores globales en `errors.py`.
- **Ajuste humano:** (1) Encontré el fallo al probar con datos distintos a los del `curl`; el traceback del log mostró una restricción `UNIQUE` en `campaigns.name` que el código no conocía, y revisé el resto de `UniqueConstraint` de la migración. (2) El primer informe no correspondía a lo pedido: no traía `pytest` ni tocaba el backend. Lo detecté con `git show --stat` y lo corregí mandando un solo objetivo por prompt. (3) El 409 salía envuelto en `{"detail": {...}}` en vez de `{"code","message"}`; lo comprobé con el cuerpo real en la pestaña Red de las herramientas de desarrollo, y los tests pasaron a afirmar `data.get("code")` en la raíz. (4) Comprobé en la base de datos que no quedaban órdenes de compra huérfanas tras el rollback.

**Prompt 8 — `campaign_period_id: 0` en la respuesta del alta**
- **Herramienta:** Claude Code
- **Prompt:** `POST /campaigns` devuelve cada línea con `"campaign_period_id": 0` aunque en base de datos el valor es correcto. Test primero: el `campaign_period_id` de cada línea debe coincidir con el id de un periodo de la misma respuesta.
- **Respuesta (resumen):** Commit `8c8031f`: se asigna el id al objeto de dominio tras el `flush`. 63 tests passing ×2.
- **Ajuste humano:** Lo descubrí leyendo el cuerpo real del 201 en el navegador, un campo que ningún test afirmaba. Consulté `campaign_lines` en la base para confirmar que el dato guardado era correcto y que el fallo estaba solo en la respuesta.

**Prompt 9 — Autorización: 403 en backend y pantalla de acceso denegado**
- **Herramienta:** Claude Code
- **Prompt:** Tests de `POST` y `GET /campaigns` con un usuario sin rol `operations` (403 con `{"code":"missing_role",...}`); después, que el frontend muestre `AccessDeniedPage` ante ese 403 tanto en el listado como en el formulario, probado con el cliente HTTP real y `fetch` simulado.
- **Respuesta (resumen):** Commit `11cbda6` (tests de backend, nacen en verde porque `require_roles` ya existía); commit `0a84924` y `9d8db32` (frontend).
- **Ajuste humano:** El backend respondía bien (403 `missing_role`) pero el navegador seguía mostrando "Error al cargar las campañas". Quité el rol con `delete from user_roles` para reproducirlo y restauré con el seed. Cuestioné que Claude Code cambiara `instanceof ApiError` por `'kind' in err` "para funcionar con mocks": es modificar código de producción para satisfacer al test, y pedí tests con el cliente real. Comprobé que la imagen se había reconstruido (capas `COPY . .` y `npm run build` sin `CACHED`) antes de dar el fallo por corregido.

**Prompt 10 — Fusión, limpieza y archivado en OpenSpec**
- **Herramienta:** Claude Code
- **Prompt:** Fusionar `feature/register-campaign-from-purchase-order` en `feature/entrega-2-LFMC`, verificar el resultado fusionado y ejecutar `/sync-specs` y `/archive` sin tocar `backend/` ni `frontend/`, entregando `openspec list`, `git status` y `git log --stat`.
- **Respuesta (resumen):** Fusión sin conflictos (commit `351bbcf`); `models.py` obsoleto eliminado (`f683776`); change archivado como `2026-10-18-register-campaign-from-purchase-order` y cuatro specs sincronizadas.
- **Ajuste humano:** (1) La fusión trajo un `models.py` junto al paquete `models/` con las mismas 18 clases (sufijo `Model` en lugar de `Record`); lo comparé con `diff` antes de borrarlo y repetí la suite (65 passed ×2). (2) Claude Code archivó el change con 38 de 64 tareas sin marcar y no lo mencionó, aunque pedí listarlas; comprobé que `openspec validate` (tarea 12.4, marcada como crítica antes de archivar) se ejecutó después y no antes. Clasifiqué las tareas en hechas sin marcar, aplazadas a propósito y pendientes de documentar, y lo recojo en el README en lugar de marcarlas a mano en un registro histórico. (3) Validé que no había requisitos duplicados con los otros dos changes.

**Prompt 11 — README: arranque, API y estado**
- **Herramienta:** Claude Code
- **Prompt:** Actualizar §2.3/§2.6 con el orden `up` → `alembic upgrade head` → seed → `restart nginx` y los requisitos de `.env`; después §4 con 3 endpoints sacados de `openapi.json`.
- **Respuesta (resumen):** Primer diff de instalación sin el paso de migraciones y con `SEED_USER_EMAIL` descrito como "para los tests"; §4 con códigos de error `forbidden` y `not_found`, un 409 con mensaje inventado y un 422 con `type: value_error`.
- **Ajuste humano:** El orden de arranque lo documenté porque me falló a mí (`relation "roles" does not exist` en una base nueva); el seed solo inserta datos y no crea tablas. Corregí el propósito de `SEED_USER_EMAIL` (lo lee `seed_dev_data.py`). En §4 contrasté los campos con `openapi.json` mediante un script y los errores con respuestas reales: el 403 es `missing_role` (no `forbidden`), el 409 usa los mensajes reales y el 422 es `too_short` con el `msg` de Pydantic v2. Claude Code había redactado esos datos de memoria sin contrastarlos con el backend.

**Patrón común de la sesión.** Los informes de Claude Code llegaron varias veces incompletos o recortados: daban por cerrado algo que no habían hecho (GET stub, fix del 409, archivado con tareas abiertas) o citaban un solo test con `PASSED` en lugar de la suite. Lo detecté exigiendo la salida cruda de `pytest` dos veces, `git show --stat`, `typecheck` y `docker compose build`, y comprobando siempre en el navegador, donde aparecieron los fallos que los tests no veían (botón de login, JSON de Zod, 403 mal pintado, `campaign_period_id: 0`).

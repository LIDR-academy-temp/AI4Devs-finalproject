# Documento de Prompts para Desarrollo de Proyecto

> Detalla en esta sección los prompts principales utilizados durante la creación del proyecto, que justifiquen el uso de asistentes de código en todas las fases del ciclo de vida del desarrollo. Esperamos un máximo de 3 por sección, principalmente los de creación inicial o los de corrección o adición de funcionalidades que consideres más relevantes.
> Puedes añadir adicionalmente la conversación completa como link o archivo adjunto si así lo consideras

## Cómo se ha usado la IA en este proyecto

**Herramientas y modelos.** La documentación técnica se ha trabajado con **Claude (aplicación de escritorio, modo Cowork; modelo Claude Opus 5.5)** dentro de un proyecto de Claude que aporta contexto persistente: el documento de situación actual del sistema que se reemplaza, limitantes actuales y funcionalidades deseadas, el esquema actual de su base de datos y los documentos de trabajo del proyecto. La revisión cruzada de la documentación se realizó con **ChatGPT, modelo GPT-6 Astra**, contrastando los dos archivos con los requisitos de entrega y las reglas del negocio aclaradas por el autor. El código y los tests se trabajan con **Claude Code** sobre el repositorio: cada feature es un change de **OpenSpec** (`/opsx:propose` → revisión humana del proposal, la spec y el design → `/opsx:apply` → `/opsx:verify` → `/opsx:archive`), con `AGENTS.md` como contexto y **skills** del proyecto versionadas (`new-feature`, `tdd`, `review-diff`). Los **hooks** formatean con Biome al guardar, bloquean la edición de `schema.prisma` y de las migraciones fuera de un change abierto, e impiden que el agente ejecute el seed o las migraciones (los ejecuta la persona dentro de la sesión, con la salida visible). Cada diff se revisa con `review-diff` (los cinco focos de la sección 7) **en una sesión aparte** de la que escribió el código.

**Método de trabajo.** Se aplican los tres pilares: **herramienta** (el copiloto adecuado a cada fase), **contexto** (todo el conocimiento del dominio se entrega como documentos, no se deja que el modelo lo invente) y **prompt** (peticiones con criterios de éxito explícitos y vocabulario cerrado). Cada sección de la plantilla sigue el mismo ciclo Explore → Plan → Execute con gate humano: el asistente explica qué pide la sección ; el autor aporta el dominio; el asistente **propone en la conversación antes de escribir en el documento**; el autor corrige vocabulario, reglas de negocio y alcance; y solo entonces se aplica al borrador y se registra la decisión. Las decisiones de producto y de arquitectura las toma el autor respondiendo preguntas cerradas del asistente; el asistente redacta, estructura, propone alternativas y hace de *poke-holes* sobre lo que falta.

**Qué ha aportado la IA.** Análisis del enunciado y de los repositorios de ejemplo para calibrar el nivel esperado; mapa de cada requisito de la plantilla; redacción de todas las secciones a partir de las fuentes del autor; ingeniería inversa del esquema de la versión actual (30 tablas) para proponer el modelo nuevo y justificar cada cambio; contrato OpenAPI; y verificación de los diagramas Mermaid renderizándolos antes de entregar.

**Ajustes humanos.** Los de más peso: el vocabulario del dominio ("creación de cuentas", no "alta"; los fees no se dan de baja, se cierran por vigencia); que las validaciones no bloquean pero quedan registradas con quién aprobó el batch; la jerarquía real merchant → proveedor → cuenta → canal y qué viene del gateway frente a qué es propio de la herramienta; la regla de la cuenta principal de un canal; los fees por batch como algo que indica el proveedor y se agrega a mano; la elección de SQL Server 2022 para aprovechar la versión actual; y `DECIMAL(19,4)` en lugar de `MONEY`. En varios puntos el asistente propuso lo contrario de lo decidido y la decisión final, documentada como ADR, fue del autor.

### Revisión cruzada de la documentación — 25 de septiembre de 2026

**Herramienta y modelo.** ChatGPT — GPT-6 Astra.

*Contexto.* Con el borrador de `readme.md` y `prompts.md` preparado, se solicitó una segunda revisión antes de completar la entrega técnica. Se proporcionaron los requisitos del curso, las plantillas oficiales y aclaraciones del funcionamiento actual: gateways S2 y Proxima, consolidación en ATHENA, diferencia entre transacción reconciliada y batch pagado, cruce por identificadores y reglas de rolling reserve según proveedor.

*Prompt representativo (literal).* «Listo, te voy a mandar mis dos archivos para que los revises en contra de estos requerimientos. Sé que le faltan unos detalles. Pero quiero ver que analices inconsistencias, faltantes, cosas por mejorar.»

*Resultado.* Revisión de cobertura de la plantilla y de coherencia entre funcionalidades, modelo de datos, API, historias y tickets. Se señalaron conflictos entre las restricciones de unicidad y el reprocesamiento de batches; falta de definición del tratamiento de duplicados aceptados; reglas de reserva ante chargeback no representadas; identidad de transacciones entre gateways; desglose de fees y moneda del batch; contradicciones de estados y pareo; y una diferencia de 500 en el ejemplo de `amountPayable`. También se identificaron ajustes necesarios en el contrato OpenAPI y un alcance elevado para el tiempo orientativo del curso.

*Ajuste humano y estado.* El autor decidió trabajar primero en el registro de IA y solicitó incorporar esta revisión. Las observaciones sobre diseño y alcance quedan pendientes de evaluación y aplicación; no se consideran decisiones aprobadas ni correcciones implementadas. Esta revisión fue documental: no acredita pruebas del código ni del sistema en ejecución.

### Revisión colaborativa por secciones — decisiones del autor

**Herramienta y modelo.** ChatGPT — GPT-6 Astra. **Fecha:** 25 de septiembre de 2026.

*Solicitud y contexto utilizado (resumen).* El autor pidió revisar y actualizar el README paso a paso a partir de su documentación del sistema existente. La conversación se utilizó para aclarar reglas reales, presentar cada historia y ticket, recibir correcciones y aplicar únicamente las decisiones acordadas. Los prompts breves dependían del contexto documental y de las respuestas anteriores; no eran solicitudes aisladas de generar un sistema desde cero.

*Aportes y correcciones humanas.* El autor confirmó importación directa con reglas de interpretación; revisión conjunta de advertencias; persistencia de incidencias y no doble contabilización de duplicados; reprocesamiento con historial; USD y formatos de identificadores; múltiples fees según fecha del evento; reserva según porcentaje aplicado a la transacción y plazos del canal recibidos del gateway; y aislamiento por merchant con perfiles separados. Corrigió expresamente que Settled requiere batch procesado y pagado, mientras los CSV se generan al procesar y se ejecutan manualmente después del pago. Precisó que el gateway no conserva un historial completo de eventos y que la asignación de canales solo distribuye pendientes, sin reversión automática al deshacer.

*Resultado.* Se actualizaron las reglas y sus referencias y se aprobaron tres historias (importar e interpretar; revisar resultados; procesar y dar seguimiento al pago) y tres tickets representativos (persistencia, duplicados/colisiones e interfaz de importación). Arquitectura, stack y despliegue siguen como propuestas pendientes de validar; las pruebas están previstas, no ejecutadas.

*Estado.* Se aplicaron las historias y tickets aprobados. Quedan pendientes el detalle técnico de interpretación, fechas por ciclo para faltantes, matriz de incompatibilidades y rondas, contrato OpenAPI completo, wireframes y revisión final de consistencia. La aprobación de las reglas no equivale a implementación ni a validación técnica.

**Convención de cada entrada.** *Contexto* → *Prompt* (resumen de lo que se pidió, no literal) → *Resultado* → *Ajuste humano*.

---

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

*Contexto.* Arranque del proyecto: entender el enunciado y elegir la idea sin dedicar demasiado tiempo a decidir.

*Prompt.* Con el enunciado oficial y la descripción de los dos proyectos de ejemplo como contexto, se pidió al asistente que, conociendo el perfil del autor, listara las opciones de dominio mencionadas, las de los ejemplos con un resumen de cada una, y sugerencias; y que propusiera ideas de proyecto adecuadas y planteara las preguntas de filtro necesarias; que analizara requisitos y ejemplos para trazar una lista de requerimientos a ir completando a manera de checklist.

*Resultado.* Lista de opciones; cuatro ideas ajustadas al perfil con una recomendación; un documento de trabajo con el checklist de las tres entregas, la lectura de los dos ejemplos (el listón realista para 30 horas es el Ejemplo 1), el mapa requisito → módulo y las fuentes pendientes; y cuatro preguntas cerradas para decidir stack, base de datos, visibilidad del repositorio y núcleo del MVP.

*Ajuste humano.* No se adoptó ninguna idea tal cual: se decidió **Recon Tool 2.0**, la sustitución de una herramienta real de reconciliaciones, pero incluía una idea recomendada por el asistente (cruce de archivos del proveedor contra las transacciones propias) se incorporó como núcleo del MVP.

**Prompt 2:**

*Contexto.* El asistente pidió el conocimiento del dominio antes de redactar el objetivo. En lugar de responder por partes, el autor escribió un documento propio.

*Prompt.* Se entregó al asistente un documento de situación actual del sistema que se reemplaza, en tono "se lo explico a alguien nuevo del equipo": qué es (reportes SSRS usados como aplicación), una reconciliación de principio a fin, los archivos de los proveedores y la plantilla, con qué campos se hace el enlace, las ocho validaciones, las tablas que se consultan, qué duele de la versión actual, el sistema de un merchant como referencia de reportería y qué cambia en la versión nueva. Se le pidió leerlo, aclarar dudas en caso de haberlas, separar funcionalidades para establecer un alcance para el MVP y poder redactar el objetivo y las funcionalidades a partir de él.

*Resultado.* Copia de referencia del documento en el proyecto; tres observaciones que corregían lo hablado hasta entonces (el cruce es presencia por ID y coherencia de estados, no matching por monto; el tipo de liquidación E/I/R debe ser el eje del modelo; aparecen requisitos nuevos como roles, fees con historial y deshacer con rastro); roadmap y la redacción de 1.1 y 1.2 con el corte MVP.

*Ajuste humano.* Correcciones puntuales al texto: que la nueva versión habilita funcionalidades nuevas y mejora la experiencia en las existentes; "los analistas del equipo"; que el Back-Office tampoco indica los fees pagados; que SSRS no está diseñado para ese uso y obliga a rodeos; y, en el valor aportado, el control sobre los parámetros de la herramienta desde la propia herramienta.

**Prompt 3:**

*Contexto.* Cerrar el catálogo y los fees en 1.2 y el mapa de pantallas en 1.3 con reglas de negocio que el asistente no podía conocer.

*Prompt.* Se aclaró la jerarquía merchant → proveedor → cuenta → canal; que un merchant no ve los proveedores de otro aunque los compartan; que merchants, proveedores, canales y transacciones vienen de los gateways y que la cuenta es la única entidad propia de la herramienta (agrupación lógica de canales para llevar contabilidades separadas); que un canal nuevo no viene asociado a ninguna cuenta y se asocia al procesar un settlement; que solo los fees por transacción se calculan y los demás se agregan manualmente al batch porque los indica el proveedor; y se pidió una lista de pantallas con nombres en inglés (login, dashboard, settlements, payments, search, reports, administración de cuentas, fees y usuarios). Ante la pregunta del asistente sobre qué ocurre con la cuenta principal de un canal cuando otra cuenta procesa un settlement con él, se definió que la principal pasa a ser la última cuenta que procesó un settlement de ese canal.

*Resultado.* El asistente confirmó por escrito lo entendido y listó los cambios que disparaba en 1.2, 1.3, 3, 4 y 5 antes de aplicarlos; propuso una tabla de 23 pantallas en inglés agrupadas por menú y marcadas MVP / roadmap, y el recorrido del flujo principal en Mermaid con los mismos nombres.

*Ajuste humano.* La regla de la cuenta principal se definió al contrario de lo que sugería el asistente (que proponía mantenerla fija y cambiarla solo por acción explícita).

---

## 2. Arquitectura del Sistema

### **2.1. Diagrama de arquitectura:**

**Prompt 1:**

*Contexto.* Decidir la arquitectura y las dos incógnitas que cambiaban el diagrama.

*Prompt.* Tras la explicación del asistente sobre qué evalúa cada punto de la sección, se respondieron sus dos preguntas cerradas: la nueva versión lee las transacciones propias desde **una tabla propia** (sintética en el MVP, alimentada desde los gateways en producción), no consulta al gateway en vivo; y el despliegue de demostración se hace en un **servidor propio con túnel público**.

*Resultado.* Sección 2.1 con monolito modular hexagonal (Fastify + Prisma + Zod), justificación específica del proyecto (la lógica de reconciliación es lo que hay que testear; el origen de las transacciones va a cambiar; un solo despliegue para el tamaño del equipo), sacrificios explícitos y una tabla de cinco ADR.

*Ajuste humano.* Se observó que el diagrama de arquitectura era ilegible por tamaño, que si se podia reorganizar o dividir de forma que se lea mejor. El asistente explicó que GitHub escala el Mermaid al ancho de página sin zoom propio y partió el diagrama en tres vistas C4 (contexto, contenedores, interior del backend).

**Prompt 2:**

*Contexto.* La base de datos: la decisión inicial era PostgreSQL con portabilidad posterior a SQL Server.

*Prompt.* Se planteó al asistente quedarse en SQL Server 2022 desde el MVP para aprovechar el esquema y la lógica de la versión actual y evitar cambios entre versiones.

*Resultado.* El asistente aceptó y argumentó que era mejor que la decisión anterior (el paso a producción es un despliegue, no una migración), con dos condiciones: `docker-compose` con la imagen oficial para que el proyecto se levante en cualquier máquina, y ORM agnóstico igualmente. Quedó como ADR-002 y cambió 0.4, 1.4, 2.1, 2.4 y el ticket de base de datos.

*Ajuste humano.* Se detectó una contradicción entre las instrucciones de instalación (que usaban `sa`) y la sección de seguridad (que lo prohibía). Se corrigió con un script de inicialización que crea un usuario de aplicación con permisos mínimos.

### **2.2. Descripción de componentes principales:**

**Prompt 1:**

*Contexto.* Los componentes se derivan del diagrama; se pidió redactarlos sin introducir decisiones nuevas.

*Prompt.* Redactar la descripción de componentes a partir de las decisiones de 2.1, con la tecnología de cada uno y sin añadir piezas que no estuvieran en el diagrama.

*Resultado.* Nueve componentes con su tecnología: frontend, API HTTP, los módulos de catálogo, fees, importación, validaciones, settlement y exports, persistencia y autenticación.

*Ajuste humano.* Ninguno de fondo; el asistente ofreció sustituir nombres de librerías por descripciones genéricas y no fue necesario.

### **2.3. Descripción de alto nivel del proyecto y estructura de ficheros**

**Prompt 1:**

*Contexto.* Definir el monorepo y la estructura interna por módulo.

*Prompt.* Proponer la estructura de carpetas coherente con el patrón hexagonal por módulo y siguiendo las buenas prácticas (contexto para copilotos y documentación versionadas junto al código).

*Resultado.* Árbol con `backend/` (módulos `domain/ application/ infrastructure/ http/`), `frontend/` por *feature*, `docs/` (ADR, diagramas, `openapi.yaml`, wireframes), `data/samples/`, `e2e/`, `AGENTS.md` y `.claude/`.

*Ajuste humano.* Pendiente de validar contra el código en la siguiente entrega.

### **2.4. Infraestructura y despliegue**

**Prompt 1:**

*Contexto.* Elegir dónde vive la demostración pública de las entregas de código.

*Prompt.* Se eligió, entre las opciones planteadas por el asistente (servidor propio con túnel público, PaaS gratuita y vídeo como evidencia), el servidor propio con Docker Compose y túnel público, con SQL Server en una máquina dedicada.

*Resultado.* Tabla de tres entornos (local, demostración, producción futura), diagrama de infraestructura, proceso de despliegue manual primero y automatizado con GitHub Actions después, túnel para la URL pública y vídeo como respaldo ante indisponibilidad del servidor.

*Ajuste humano.* Ninguno todavía; el montaje del túnel se documentará paso a paso en la entrega de código.

### **2.5. Seguridad**

**Prompt 1:**

*Contexto.* La sección incorporó prácticas del módulo de privacidad (datos sintéticos) y del de bases de datos (usuario de aplicación, revisión humana de DDL, solo lectura para agentes).

*Prompt.* Se cuestionó la afirmación de que los montos nunca deben manejarse como `float`, preguntando si el tipo `MONEY` de SQL Server tampoco era adecuado y cuál era la recomendación.

*Resultado.* Explicación de por qué `DECIMAL(19,4)` sobre `MONEY` (redondeo en operaciones intermedias, que en reconciliación se traduce en disputas de centavos; portabilidad y mapeo limpio en el ORM) y actualización de 2.5 y 3.2.

*Ajuste humano.* Se aceptó la recomendación; la versión actual usa `money` en 40 columnas y el cambio quedó justificado en la tabla de migración del modelo.

### **2.6. Tests**

**Prompt 1:**

*Contexto.* Estrategia de tests para una entrega sin código.

*Prompt.* Redactar la estrategia aplicando los módulos de testing (TDD con agentes, romper el test a propósito, Playwright y Gherkin, contenedores efímeros para integración), con ejemplos concretos del dominio en cada nivel.

*Resultado.* Tres niveles con ejemplos: la colisión de estados como test unitario, el conflicto de fee solapado como integración, el flujo importar → validar → liquidar como E2E; cobertura objetivo y mutation testing sobre validaciones.

*Ajuste humano.* Se pidió aclarar en el texto qué significa el código de respuesta `409`.

---

### 3. Modelo de Datos

**Prompt 1:**

*Contexto.* Evitar que el asistente inventara el modelo: trabajar sobre el esquema real y nuevas funcionalidades.

*Prompt.* Se preguntó al asistente si disponía del esquema actual y, como no era así, se le entregó el script generado desde SQL Server Management Studio (30 tablas, 15 procedimientos, 3 vistas/funciones) con la petición de analizar qué sirve, qué hay que agregar y qué se va.

*Resultado.* El asistente parseó el script (tablas, tipos, claves, `UNIQUE`, `DEFAULT`, índices y el uso de ciertos campos en los procedimientos) y produjo: una tabla "de la versión actual a la nueva" fila por fila; cinco diagramas `erDiagram` por área; y la descripción de entidades con tipos y restricciones. Cambios principales propuestos: normalizar las 40 columnas `money` de la tabla de batches en tablas de totales; unificar seis tablas de validación e incidencias en corrida → resultado → caso con la decisión del analista; sustituir la unicidad por tipo y cuenta de los fees por no solapamiento de vigencias; y reemplazar los tres flags de liquidación por filas de settlement por ciclo.

*Ajuste humano.* Se aclaró el significado de *file group* (varios archivos que constituyen un mismo settlement y una sola contabilidad) y el asistente lo hizo explícito en la entidad de importación.

**Prompt 2:**

*Contexto.* Verificar que los diagramas funcionen donde se van a leer.

*Prompt.* A partir de la observación de legibilidad hecha en 2.1, el asistente propuso y ejecutó por iniciativa propia el renderizado de todos los bloques Mermaid con `mermaid-cli`.

*Resultado.* Los diez diagramas compilan; el mayor se partió en dos ("Catálogo y fees" y "Reglas de pareo, usuarios y roles").

*Ajuste humano.* Ninguno.

**Prompt 3:**

*Contexto.* Incorporar al modelo la jerarquía real del gateway y los fees por batch.

*Prompt.* Las aclaraciones de negocio del Prompt 3 de la sección 1, más la regla de que los fees no transaccionales tienen un monto preestablecido ajustable al agregarlos a un batch y que existen categorías de importe libre (correcciones de batches anteriores, ajustes por duplicados, penalizaciones). Se pidió al asistente confirmar lo entendido y los cambios que disparaba antes de aplicarlos.

*Resultado.* Merchant, proveedor y canal como tablas de solo lectura alimentadas desde el gateway; la asociación cuenta-canal como relación con historia (una sola principal por canal, garantizada con un índice único filtrado); tipos de fee con importe libre; y una tabla de fees por batch con su restricción.

*Ajuste humano.* La regla de cuenta principal es del autor.

---

### 4. Especificación de la API

**Prompt 1:**

*Contexto.* Elegir los tres endpoints que la plantilla permite documentar.

*Prompt.* Ante la propuesta inicial del asistente (importar, validaciones, settlement), se pidió primero una lista de todos los endpoints posibles y se sugirió elegir endpoints vistosos, poniendo como ejemplo la creación de un fee para una cuenta: una pantalla donde se agregan uno a uno con tipo, monto fijo o porcentaje, importe y vigencia, con la regla de que no puede haber dos fees del mismo tipo con rangos que se solapen.

*Resultado.* Inventario de endpoints por área con permisos; propuesta de tres (crear fee, importar, liquidar) con la justificación de qué demuestra cada uno; y la consecuencia sobre el alcance: la administración de fees pasaba de roadmap a MVP.

*Ajuste humano.* Se movió fees al MVP **con historial de cambios** (el asistente lo proponía sin historial) y se confirmaron los tres endpoints.

**Prompt 2:**

*Contexto.* Revisar la propuesta antes de incluirla en el documento.

*Prompt.* Se pidió al asistente presentar la propuesta completa en la conversación para compararla antes de ponerla en el borrador. El asistente entregó los tres endpoints en OpenAPI con ejemplos y planteó cuatro decisiones: importes como cadenas decimales, propuesta de pareo en la misma respuesta, rechazo con `409` si hay casos de validación sin decidir, y campos que faltaran en el summary.

*Resultado.* Sección 4 con convenciones comunes (autenticación, errores, dinero como cadena), los tres endpoints en YAML con ejemplos coherentes con un batch de muestra y el inventario consolidado de 45 endpoints.

*Ajuste humano.* Se aprobaron los tres y se pidió además el inventario completo para consolidar y depurar en las siguientes entregas.

**Prompt 3:**

*Contexto.* Reflejar en la API los fees por batch y la asociación de canales.

*Prompt.* Aplicar en la API los cambios derivados de las aclaraciones de negocio, tras la confirmación de lo entendido.

*Resultado.* La respuesta de importación incluye la situación de cada canal; la liquidación admite fees por batch y confirmación de asociación de canales, devuelve ambos desglosados y añade el conflicto de asociación no confirmada.

*Ajuste humano.* Ninguno adicional.

---

### 5. Historias de Usuario

**Prompt 1:**

*Contexto.* Definir cuáles son las tres historias antes de escribirlas.

*Prompt.* Se eligieron, entre las opciones del asistente, importar y confirmar pareo, validar y decidir, y liquidar y exportar; y se precisó que las reglas de pareo por cuenta solo hacen el pareo inicial: quien ejecuta debe revisar que tenga sentido y puede modificarlo antes del análisis.

*Resultado.* Tres historias con rol, necesidad y beneficio, contexto, criterios Given/When/Then, fuera de alcance y nota AI-ready con enumeraciones cerradas (las siete condiciones del módulo de planificación). El gate humano sobre el pareo quedó como criterio explícito.

*Ajuste humano.* —

**Prompt 2:**

*Contexto.* Revisar la propuesta de las tres historias en la conversación.

*Prompt.* Se confirmó que un archivo idéntico dentro del mismo import debe rechazarse por huella; se precisó que, como los archivos se procesan juntos, se pueden quitar y añadir antes de analizar sin afectar ningún dato interno; se rechazó la idea de sustituir un archivo y reanalizar (si hace falta otro archivo, se procesa todo de nuevo); y se aprobó la historia de liquidación.

*Resultado.* HU1 ganó el criterio de quitar y añadir archivos; en HU2, devolver el archivo cancela el import conservando todo como historial y el corregido se procesa como import nuevo; HU3 quedó con la regla de que un batch pagado no se deshace.

*Ajuste humano.* Los tres puntos anteriores son correcciones del autor a la propuesta.

**Prompt 3:**

*Contexto.* Añadir los criterios derivados de canales y fees por batch.

*Prompt.* Aplicar los cambios tras confirmar el resumen del asistente de lo entendido.

*Resultado.* HU1 con el aviso de canales sin asociar o de otra cuenta; HU3 con los criterios de fees por batch (preestablecidos ajustables o importe libre) y de confirmación de asociación de canales.

*Ajuste humano.* —

---

### 6. Tickets de Trabajo

**Prompt 1:**

*Contexto.* Elegir los tres tickets (base de datos, backend, frontend).

*Prompt.* Se respondieron las preguntas cerradas del asistente: ticket de base de datos de esquema, migraciones y seed sintético; de backend, el motor de validaciones; de frontend, la pantalla de importación con pareo editable. Se pidió la propuesta completa en la conversación antes de incluirla.

*Resultado.* Propuesta de los tres tickets con contexto, tareas, criterios de aceptación, definición de hecho por tipo, estimación Fibonacci, dependencias y fuera de alcance; y dos preguntas del asistente: partir el de base de datos para que ninguno pasara de 8 puntos, y limitar el de backend a las cuatro validaciones de duplicados y colisiones.

*Ajuste humano.* Se aceptó partir el de base de datos (esquema y migraciones por un lado; seed y archivos de muestra por otro) y limitar el de backend.

**Prompt 2:**

*Contexto.* Escribir los tickets en el documento.

*Prompt.* Continuar con la sección 6 aplicando lo acordado.

*Resultado.* Tres tickets con identificador, tabla de cabecera, tareas con nombres de ficheros y rutas, criterios de aceptación como pruebas concretas contra las restricciones y los archivos de muestra, reglas de negocio cerradas (un batch deshecho no cuenta como anterior; ciclos distintos nunca colisionan) y un criterio de rendimiento para evitar comparaciones cuadráticas.

*Ajuste humano.* Pendiente de revisión final antes de crear los issues en GitHub.

**Prompt 3:**

—

---

### 7. Pull Requests

Las pull requests de código van de una rama por feature (`feat/<módulo>-<tema>`) hacia la rama de entrega `feature/entrega-2-MVP`, con la plantilla del repositorio y CI en verde. Cada diff generado con IA se revisa según los cinco focos del módulo de backend (correctitud, seguridad, rendimiento, legibilidad y tests), concretados para este proyecto en la skill `review-diff`: fidelidad al README y al vocabulario fijo, dinero y fechas, pruebas reales, seguridad y datos sintéticos, y arquitectura hexagonal.

**Prompt 1:**

*Contexto.* `auth-login` (PR #19, issue #1): el primer change de código y el primer ciclo completo de OpenSpec sobre el armazón del tramo 0. Login con JWT de acceso (15 min) y refresh (7 días) con rotación, `GET /auth/me`, logout y el plugin `requirePermission`. Hacía falta una tabla nueva, `RefreshToken`, y que `AuditLog.userId` admitiera nulos para auditar intentos con usuarios inexistentes.

*Prompt.* Proponer el change a partir del issue con `/opsx:propose`, con los tests de dominio primero, y parar antes de tocar el esquema: editar `schema.prisma`, generar el SQL de la migración `0003_auth` sin aplicarlo y presentarlo para revisión.

*Resultado.* Proposal, spec de `auth`, design y tareas aprobados antes de escribir código. El grupo de esquema quedó marcado como «requiere confirmación humana»: el asistente generó el SQL y se detuvo. El SQL que produce Prisma no funcionaba en SQL Server (error 5074: no se puede hacer `ALTER COLUMN` sobre una columna con índice o FK), así que se ajustó para eliminar y recrear el índice y la FK de `AuditLog.userId` dentro de la transacción. Durante `apply` salieron dos cambios de diseño que se anotaron en el design: el access token lleva también `jti` (el test de integración detectó que dos tokens emitidos en el mismo segundo eran idénticos) y el repositorio expone `findById` + `listMerchants`. Además, respuesta 401 idéntica para contraseña errónea, usuario inactivo o inexistente, y un test que comprueba que el log no contiene contraseñas, hashes ni JWT.

*Ajuste humano.* La migración la revisa, la aprueba y la aplica la persona (`pnpm db:migrate && pnpm db:seed`), nunca el agente: los hooks lo impiden y las tareas lo dicen expresamente. Se corrigió un orden de borrado del seed heredado del tramo 0 que rompía al volver a sembrar.

**Prompt 2:**

*Contexto.* `catalog-read` (PR #23, issue #2): nueve lecturas del catálogo con el alcance por merchant aplicado en la consulta (un recurso ajeno responde `404`, nunca `403`). Con el código en verde, se lanzó `review-diff` en una sesión distinta de la que lo había escrito.

*Prompt.* Revisar el diff de la rama con los cinco focos del proyecto y corregir los hallazgos con test primero: un commit `test:` que falla y después el `fix:`.

*Resultado.* La primera revisión encontró, entre otros: el alcance solo se aplicaba en un lado de las uniones `AccountChannel`, de modo que una fila que cruzara merchants podía revelar el nombre de una cuenta o un canal ajenos; y `IntId` no tenía tope, por lo que un id fuera del rango de `INT` no se validaba. La revisión suponía un `500`; contra SQL Server respondía `404`, y tras el arreglo responde `400 validation_error`. Cada hallazgo se cerró con su pareja de commits test/fix, con filas cruzadas temporales en la integración, y `NotFoundError` pasó a `src/shared`. Una segunda revisión dejó cuatro ajustes menores, entre ellos que `IntId` solo acepte dígitos antes de convertir a número (`Number()` admitía `1e3`, `0x10` y espacios).

*Ajuste humano.* Parar cuando la revisión ya solo devuelve hallazgos bajos, en lugar de iterar sin fin, y que la sesión que revisa no sea la que corrige, para que nadie se dé el visto bueno a sí mismo.

**Prompt 3:**

*Contexto.* `web-shell` (issue #3): el primer código de frontend (Vite, React 19, Tailwind, shadcn/ui, TanStack Router y Query, cliente generado desde el contrato OpenAPI) con las pantallas Login y Accounts. El proposal dejó cuatro decisiones explícitas para aprobar antes de programar: dónde viven los tokens, CORS en desarrollo, librería de rutas y capability de los escenarios de interfaz.

*Prompt.* Proponer el change leyendo el issue, los wireframes, el mapa de pantallas y las rutas reales del API, y después implementarlo grupo a grupo con test primero, rompiendo a propósito cada pieza crítica (refresh de un solo vuelo, guarda de permiso, filtro del menú) para comprobar que su test falla. Tras la prueba manual, revisar el diseño de la sesión y del formulario de Login antes de cerrar.

*Resultado.* Durante `apply` apareció un hallazgo serio: `openapi-fetch` captura `fetch` al crear el cliente, antes de que MSW lo intercepte, así que el cliente sin autenticación de los tests hablaba con la API real que estaba levantada en el puerto 3000 y dos tests fallaban por credenciales. Se corrigió buscando `fetch` en cada llamada. Tras la prueba manual, la decisión D1 cambió de una sesión por pestaña (refresh en `sessionStorage`) a una sesión compartida: refresh en `localStorage`, renovaciones serializadas entre pestañas con Web Locks y relectura del refresh dentro del candado, y `BroadcastChannel` solo para login y logout. Un test de dos pestañas comprueba dos renovaciones en serie con refresh distintos y nunca uno revocado; falla si se quita el candado o la relectura. El formulario de Login (vacío al montarse, contraseña borrada tras un rechazo conservando el usuario, `autocomplete` para los gestores de contraseñas) ya cumplía lo pedido: se fijó con tests, comprobando que cada uno falla al romper el comportamiento que protege.

*Ajuste humano.* Para la renovación entre pestañas, el asistente propuso que la pestaña que renueva pasara el access token nuevo a las demás (una sola llamada al API). Se eligió en su lugar renovar en serie (una llamada por pestaña) para que el access token nunca salga de la memoria de su pestaña. Se asumió como riesgo documentado que la sesión sobrevive al cierre del navegador durante la vida del refresh (7 días) y que Sign out la corta en todas las pestañas. Se aprobó el cliente generado desde el contrato con la condición de parar y proponer la alternativa si se atascaba, y Merchants & Providers y Account Detail pasaron a la Entrega 3.

**Prompt 4:**

*Contexto.* `import-upload-mapping` (PR #33, issue #4): el primer tramo de HU1 y el primer change que recibe archivos del usuario. Subida de uno o varios `.xlsx` de la plantilla por cuenta, conservación del archivo original bajo `UPLOAD_DIR`, lectura de las hojas como texto y propuesta de pareo con el origen de cada decisión (`account`, `global` o `none`) más `readiness`. Cinco rutas nuevas y sin cambios de esquema.

*Prompt.* Proponer el change a partir del issue con `/opsx:propose`, dejando explícitas para aprobación las decisiones de riesgo: con qué se leen los `.xlsx`, cómo evitar que IDs e importes pasen por `number`, los límites de subida y descompresión, la ruta en disco, el alcance del rechazo por duplicado y el orden archivo/base cuando algo falla a medias. La pieza de riesgo era el lector `.xlsx` propio sobre `fflate` y `saxes`: ExcelJS convierte toda celda numérica a `number` y descomprime sin tope, y SheetJS arrastra CVE sin corregir en npm. Se aprobó con timebox: el lector sería el primer grupo de tareas y tenía que quedar en verde contra las cinco muestras y contra un archivo guardado por Excel de escritorio; si no, se paraba y se proponía la alternativa (ExcelJS con detección de precisión y un límite de descompresión previo con `fflate`), documentada como deuda.

*Resultado.* El lector quedó en verde dentro del timebox y el design absorbió tres ajustes. Excel no conserva más de 15 dígitos significativos en una celda numérica, así que el lector no puede deshacer una pérdida que ya está en el archivo: cuenta por columna las celdas numéricas con notación científica o más de 15 dígitos y `readiness.notes` avisa cuando la columna propuesta como ID las tiene, en lugar de ocultarlo. `ImportSheet.kind` no admite nulos, de modo que una hoja sin propuesta se guarda con el marcador `ignore` y la API la muestra como `kind: null` con `source: none`. Y el archivo de Excel real pasó de prueba manual a fixture del repositorio (`data/samples/excel-real`, con datos sintéticos y los metadatos personales limpiados), con un ID en notación científica que la integración comprueba en `readiness.notes`. La primera revisión con `review-diff` dejó dos hallazgos HIGH: una celda vacía con una referencia de columna gigante (`ZZZZZ1`) dimensionaba la cabecera y el mapa de la fila sin pasar por el límite de columnas, una denegación de servicio con un archivo de pocos KB; y el detalle del import se construía dentro del ámbito de limpieza, así que un fallo tras la transacción borraba archivos cuyas filas ya estaban en base, justo el estado que D6 prohíbe. Entre los MEDIUM: un cuerpo multipart malformado respondía `500` en vez de `400 validation_error`, el `422` filtraba mensajes de errores internos del lector, y los límites de descompresión, pensados para volúmenes que no existen, bajaron de 256 MiB y 500 000 filas a 64 MiB y 200 000, con tests frontera (el valor exacto pasa, uno más falla). La segunda revisión encontró que el arreglo del multipart había introducido un cuelgue: si el almacenamiento rechazaba una parte sin consumir su stream, el parser quedaba esperando y la petición nunca respondía. Ahora la parte se drena también en ese caso y el fallo llega como `500` cuando el parser termina; quedaron además dos ajustes menores (no cachear un `mkdir` fallido y reportar un deflate corrupto con el nombre de la entrada).

*Ajuste humano.* Las seis decisiones de riesgo del design se aprobaron antes de `apply`, y la puerta de salida del lector la fijó la persona, que además aportó el archivo de Excel real cuando el primer grupo lo pidió. Se aceptaron como deuda registrada el marcador `ignore` hasta que una migración por otro motivo haga `kind` nullable, y el barrido de archivos huérfanos en `UPLOAD_DIR`; y se decidió que el duplicado por `sha256` se rechace solo dentro del import, no entre imports, para poder reprocesar tras cancelar.

**Prompt 5:**

*Contexto.* `import-analyze` (PR #36, issue #5): el tramo backend que cierra HU1. El analista confirma el pareo de cada hoja y el servidor analiza el import: normaliza los IDs según el `idFormat` del gateway, los cruza contra las transacciones propias y guarda una `ImportRow` por fila con su fila original. Después lista las filas con las no asociadas y las ambiguas primero, permite resolver una ambigua eligiendo gateway y cancela conservando la evidencia. Cinco rutas nuevas y sin cambios de esquema.

*Prompt.* Proponer el change a partir del issue con `/opsx:propose`, dejando como preguntas abiertas lo que el README no decidía, y revisar el diseño antes de `apply`. La pieza de riesgo era la inserción masiva de `ImportRow` (D1): se aprobó con una puerta de medición contra SQL Server como primer grupo de tareas, con umbrales por volumen, y la instrucción de parar y proponer alternativa si no se cumplían.

*Resultado.* La revisión del diseño cerró nueve decisiones. Dos eran reglas de negocio nuevas y se llevaron al README antes de programarlas: los gateways del cruce son los de los canales de la cuenta y, si no tiene ninguno, los de los canales de su proveedor (sin ninguno, las filas quedan `unmatched` con `no_gateways`); y si una hoja tiene estado fijo y además se parea una columna de estado, gana la hoja y la discrepancia sale como advertencia por fila. El resto (columna `gateway`, `txnDate`, filas de `Other Fees` sin `ImportRow`, reglas de ignorar por patrón) quedó como deuda registrada. La medición de D1 (lotes de 125 filas, 2 000 parámetros, dentro de una transacción) cumplía con 783 y con 20 000 filas, pero 200 000 tardaban 125 s frente a un umbral de 90 s. Como el coste crece de forma lineal y el volumen real es de cientos de filas, en lugar de cambiar de estrategia se fijó un tope de 100 000 filas por import (la suma de las hojas de transacciones de todos los archivos, comprobada antes de leer ninguna fila; `422 import_too_large`), que deja el peor caso en unos 60 s. Usar las muestras como oráculo destapó un error en el propio oráculo: el generador contaba las filas de `Other Fees` como transacciones, y el `expected.json` de `batch-issues` pasó de 772 a 770 filas leídas y de 768 a 766 asociadas, sin tocar ningún `.xlsx`. Tras `/opsx:verify`, el análisis de 20 000 filas tardaba 24,5 s, 10,8 de ellos en buscar transacciones: Prisma envía los strings como `NVARCHAR`, la columna es `VARCHAR(36)` y la conversión implícita impedía usar el índice único con un seek. Ahora los pares viajan en un único parámetro JSON que se abre con `OPENJSON … WITH` y un `CAST` a `VARCHAR(36)`, sin interpolar valores: de unas 150 lecturas lógicas por búsqueda a 3 para un ID, y 14 s de extremo a extremo. La primera revisión con `review-diff` dejó un HIGH y tres MEDIUM. H1: las escrituras del import no tenían guarda en la máquina de estados, de modo que un `PUT mapping` leído en `mapped` podía devolver a `mapped` un import ya analizado o cancelado; ahora cada escritura empieza por un `UPDATE` condicionado al estado y al `updatedAt` leídos, como el claim del análisis. M1: dos `PATCH` simultáneos sobre la misma fila ambigua respondían `200` los dos, sumaban dos a `rowsMatched` y dejaban dos auditorías; la resolución quedó condicionada a que la fila siga ambigua y el import analizado. M2: una columna pareada dos veces o un estado fijo inexistente llegaban a la base y la violación de PK o FK respondía `500`; ahora se rechazan antes con `400 validation_error`. M3: con un gateway compartido, el aviso de canales y las filas mostraban la cuenta y la transacción de otro merchant. La segunda revisión encontró más fugas del mismo tipo (el canal, las candidatas de una fila ambigua y el estado de una fila R), una carrera en el estado anterior que audita el cancel, que pasó a leerse en la misma sentencia que lo reemplaza, y casos límite sueltos (un ID de más de 36 caracteres, un import analizado sin filas). Al perseguir la intermitencia del test de 21 MiB heredado de #4 apareció la causa real: Vitest ignora `fileParallelism` dentro de un project, así que los archivos de integración corrían en paralelo contra la misma base y el `afterAll` de uno borraba imports mientras otro los contaba. Un solo fork por project los serializa sin alargar el tiempo total.

*Ajuste humano.* Las preguntas abiertas y las nueve decisiones del diseño las resolvió la persona antes de `apply`, incluidas las dos reglas nuevas del README. Ante el caso de 200 000 filas eligió el tope por import en lugar de un análisis asíncrono o de insertar también con `OPENJSON`, que quedan como deuda por si aparecen imports reales grandes. Para M3 decidió ocultar: el cruce no cambia, pero al leer, lo que pertenece a un merchant fuera del alcance de quien consulta sale a `null` con `outOfScope: true`, conservando solo lo necesario para resolver la fila, y la forma oculta se documentó en el README.

**Prompt 6:**

*Contexto.* `validation-engine` (PR #41, issue #8): el motor de las ocho validaciones de HU2 como funciones puras, sin base de datos ni HTTP, con los cinco puertos de lectura que implementará #9 y sus dobles en memoria sobre el mundo sintético. Trae dos migraciones (`0004_validation_outcome`, el nuevo vocabulario del resultado, y `0005_conflict_occurrence_unresolved_status`, `ConflictOccurrence.statusId` nullable) y varias decisiones de negocio que se llevaron al README.

*Prompt.* Aplicar `tasks.md` grupo a grupo: primero los tests, en un commit `test:` que falla, y después el código; al cerrar cada grupo, romper el código a propósito una vez y comprobar que cae su test. Sin modificar un test para que pase. El grupo 1 era una puerta: si `runValidations` no bajaba de 2 s con 2 000 filas contra 50 000 movimientos, se paraba con los números en la mano. La migración la escribe el agente y la aplica la persona; la integración solo se lanza tras confirmar que la otra sesión (`web-import`), que comparte base, no está corriendo la suya; y no se toca `vocabulary.ts`, que esa sesión está modificando. Tras `/opsx:verify`, tres rondas de `review-diff` en una sesión distinta, cada hallazgo de código con su pareja de commits test/fix.

*Resultado.* La puerta se cumplió con holgura: 29–51 ms con el orquestador y los índices, y unos 100 ms al final con las ocho validaciones reales; con los índices rotos a propósito (historia buscada con `filter` por fila) subía a 1 990 ms. Las cinco muestras reproducen su `expected.json` leyendo los `.xlsx` reales con el análisis de #5, sin SQL Server. El refactor de `seed.ts` (movimientos históricos como función pura compartida con los tests) se protegió antes con un test de caracterización sin base, y al volver a sembrar los conteos de `SettlementTransaction` coincidieron con sus literales. La generación con `--create-only` no pudo ejecutarse porque `recon_app` no tiene permiso para crear la shadow database, lo correcto por mínimo privilegio, así que las dos migraciones se escribieron a mano. La implementación destapó tres huecos pequeños del diseño, cerrados sin cambiar reglas: la fila de origen en los hallazgos de una fila (`source`), excluir el import en curso de la historia (`excludeImportId`) y el proveedor en `computeRanges` para descartar filas ajenas. La primera revisión encontró que el rango R por fecha de creación daba faltantes falsos en una cuenta con canales de 180 y 120 días: el máximo lo marcaba una reserva de 120 días reciente y caían dentro reservas de 180 días todavía sin vencer. El rango y las candidatas R pasaron a compararse por vencimiento, y el oráculo de las muestras se recalculó. La segunda encontró que una fila RR repetida de una reserva ya liberada, cuya transacción había pasado después a `Chargeback`, salía como colisión con la fila incluida, de modo que la reserva se liberaba dos veces; que el contrato de candidatas I descartaba en SQL las que no tienen fecha de cambio de estado, con lo que su contador valía siempre cero; y que la colisión contra el histórico no listaba el `CHB 2` compatible, como sí hacía la del batch. La tercera fue solo de documentación. Al cierre, 99,9 % de líneas y 94,9 % de ramas en el módulo.

*Ajuste humano.* Las decisiones de negocio las tomó la persona y se documentaron en el README antes de programarlas. El resultado de cada validación usa `passed`, `warning`, `blocked`, `not_applicable` y `not_implemented`, y desaparece `failed`: solo `provider_mismatch` bloquea. `non_recorded_adjustment` incluye `status_mismatch`: una fila E reportada `Declined` que el gateway tiene aprobada, o al revés, es un hallazgo no bloqueante con la fila incluida. Una aparición con estado no resuelto (`status_unresolved`) cuenta como distinta de cualquier otra: es colisión con todas las apariciones actuales incluidas, nunca duplicado, en el batch y contra el histórico, y por eso `ConflictOccurrence.statusId` admite NULL. El rango R se calcula por vencimiento de la reserva, creación más `rollingReserveDays` del canal; entre usar el plazo vigente del canal o el aplicado al liquidar (`expectedReserveReleaseAt`), eligió el vigente (opción B), porque el plazo de un canal no cambia con el tiempo, con la condición de que la fuente de reservas retenidas de #9 filtre con el mismo cálculo; el plazo aplicado queda como deuda para la Entrega 3. Y R no tiene estado: dos apariciones R de la misma transacción son siempre duplicado. Además revisó el SQL de las migraciones antes de aplicarlas, confirmó cada lanzamiento de la integración y decidió no editar `0004`, ya aplicada, y dejar la observación de la revisión anotada en el PR.

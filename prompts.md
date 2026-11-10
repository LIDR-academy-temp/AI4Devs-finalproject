# Documento de Prompts para Desarrollo de Proyecto

> Detalla en esta sección los prompts principales utilizados durante la creación del proyecto, que justifiquen el uso de asistentes de código en todas las fases del ciclo de vida del desarrollo. Esperamos un máximo de 3 por sección, principalmente los de creación inicial o los de corrección o adición de funcionalidades que consideres más relevantes.
> Puedes añadir adicionalmente la conversación completa como link o archivo adjunto si así lo consideras

## Cómo se ha usado la IA en este proyecto

**Flujo de trabajo con el código (Entrega 2).** Cada feature es un change de **OpenSpec** que nace de su issue. `/opsx:propose` genera el proposal, los delta specs, el design y las tareas, y ahí está el **gate humano**: la persona revisa los artefactos, resuelve las preguntas abiertas y decide las reglas de negocio que el README no cubría (se llevan al README antes de programarlas); sin esa aprobación no se escribe código. `/opsx:apply` implementa `tasks.md` **grupo a grupo con TDD**: primero los tests, en un commit `test:` que falla; después el código; y al cerrar el grupo se rompe el código a propósito una vez para ver caer su test. Ningún test se modifica para que pase; si uno está mal, se dice y lo decide la persona. Las migraciones las escribe el agente y las revisa y aplica la persona. Con el change terminado, `/opsx:verify` contrasta el código con la spec, el design y las tareas. Después, `review-diff` revisa el diff con los cinco focos del proyecto **en una sesión independiente** de la que escribió el código, para que nadie se dé el visto bueno a sí mismo. Cada hallazgo se reproduce antes de corregirlo y se cierra con su pareja de commits test/fix o pasa a un issue tras el triaje de la persona. El PR se fusiona con la CI en verde y el change se archiva con `/opsx:archive` en un PR propio. Para avanzar en paralelo (por ejemplo, el backend de un tramo y sus pantallas, construidas contra el contrato que publica el design del backend y con un API falso de MSW), cada línea de trabajo tiene su propio **git worktree** y su propia sesión. La persona coordina los turnos de la base de datos y de los puertos que comparten, y el orden de los rebases sobre la rama de entrega.

**Herramientas y modelos.** La documentación técnica se ha trabajado con **Claude (aplicación de escritorio, modo Cowork; modelo Claude Opus 5.5)** dentro de un proyecto de Claude que aporta contexto persistente: el documento de situación actual del sistema que se reemplaza, limitantes actuales y funcionalidades deseadas, el esquema actual de su base de datos y los documentos de trabajo del proyecto. La revisión cruzada de la documentación se realizó con **ChatGPT, modelo GPT-6 Astra**, contrastando los dos archivos con los requisitos de entrega y las reglas del negocio aclaradas por el autor. El código y los tests se trabajan con **Claude Code** sobre el repositorio: cada feature es un change de **OpenSpec** (`/opsx:propose` → revisión humana del proposal, la spec y el design → `/opsx:apply` → `/opsx:verify` → `/opsx:archive`), con `AGENTS.md` como contexto y **skills** del proyecto versionadas (`new-feature`, `tdd`, `review-diff`). Los **hooks** formatean con Biome al guardar, bloquean la edición de `schema.prisma` y de las migraciones fuera de un change abierto, e impiden que el agente ejecute el seed o las migraciones (los ejecuta la persona dentro de la sesión, con la salida visible). Cada diff se revisa con `review-diff` (los cinco focos de la sección 7) **en una sesión aparte** de la que escribió el código.

**Método de trabajo.** Se aplican los tres pilares: **herramienta** (el copiloto adecuado a cada fase), **contexto** (todo el conocimiento del dominio se entrega como documentos, no se deja que el modelo lo invente) y **prompt** (peticiones con criterios de éxito explícitos y vocabulario cerrado). Cada sección de la plantilla sigue el mismo ciclo Explore → Plan → Execute con gate humano: el asistente explica qué pide la sección ; el autor aporta el dominio; el asistente **propone en la conversación antes de escribir en el documento**; el autor corrige vocabulario, reglas de negocio y alcance; y solo entonces se aplica al borrador y se registra la decisión. Las decisiones de producto y de arquitectura las toma el autor respondiendo preguntas cerradas del asistente; el asistente redacta, estructura, propone alternativas y hace de *poke-holes* sobre lo que falta.

**Qué ha aportado la IA.** Análisis del enunciado y de los repositorios de ejemplo para calibrar el nivel esperado; mapa de cada requisito de la plantilla; redacción de todas las secciones a partir de las fuentes del autor; ingeniería inversa del esquema de la versión actual (30 tablas) para proponer el modelo nuevo y justificar cada cambio; contrato OpenAPI; y verificación de los diagramas Mermaid renderizándolos antes de entregar.

**Ajustes humanos.** Los de más peso: el vocabulario del dominio ("creación de cuentas", no "alta"; los fees no se dan de baja, se cierran por vigencia); que las validaciones no bloquean pero quedan registradas con quién aprobó el batch; la jerarquía real merchant → proveedor → cuenta → canal y qué viene del gateway frente a qué es propio de la herramienta; la regla de la cuenta principal de un canal; los fees por batch como algo que indica el proveedor y se agrega a mano; la elección de SQL Server 2022 para aprovechar la versión actual; y `DECIMAL(19,4)` en lugar de `MONEY`. En varios puntos el asistente propuso lo contrario de lo decidido y la decisión final, documentada como ADR, fue del autor.

### Revisión cruzada de la documentación — 25 de septiembre de 2026

**Herramienta y modelo.** ChatGPT — GPT-6 Astra.

*Contexto.* Con el borrador de `readme.md` y `prompts.md` preparado, se solicitó una segunda revisión antes de completar la entrega técnica. Se proporcionaron los requisitos del curso, las plantillas oficiales y aclaraciones del funcionamiento actual: el gateway principal y un gateway alterno que se evaluó, consolidación en el servidor de base de datos y reportes, diferencia entre transacción reconciliada y batch pagado, cruce por identificadores y reglas de rolling reserve según proveedor.

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

**Prompt 2:**

*Contexto.* Issue #97: desplegar con URL pública. Change de OpenSpec `deploy-compose`, limitado a lo que vive en el repositorio; el túnel y el servidor se configuran a mano siguiendo la guía.

*Prompt.* `/opsx:propose deploy-compose` con el alcance del issue (Dockerfiles, compose con túnel y red interna, migración y seed explícitos, plantilla de variables, CI de imágenes y `docs/deploy.md` en lenguaje llano), sin mencionar el nombre ni la ubicación del servidor. Después, `/opsx:apply` con un commit por grupo, parando en cada paso que necesita Docker.

*Resultado.* Imágenes de API y web, `infra/docker-compose.deploy.yml` con overrides para depuración y SQL Server externo, identidad `recon_migrator` separada de `recon_app`, `scripts/deploy.sh`, job `images` en la CI y la guía. Con SQL Server en el compose por defecto, en lugar de la máquina dedicada del plan inicial.

*Ajuste humano.* El autor revisó el gate de diseño y exigió tres cambios: el arreglo de `pnpm start` en su propio commit, la regla de rate limiting sobre el login como paso obligatorio con sus clics y la base en `feature/entrega-3-MVP`. Las pruebas que el autor ejecutó con Docker destaparon un fallo que los tests no veían: tras reiniciar sobre un volumen con datos, `mssql` moría con `Msg 904`. Se corrigió reintentando la inicialización, y de paso se evitó que un reinicio devolviera `db_ddladmin` a `recon_app`.

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

Las pull requests de código van de una rama por feature (`feat/<módulo>-<tema>`) hacia la rama de entrega (`feature/entrega-2-MVP` en la Entrega 2 y `feature/entrega-3-MVP` en la Entrega 3), con la plantilla del repositorio y CI en verde. Las entradas 1 a 16 son de la Entrega 2 y las siguientes, de la Entrega 3; el change de despliegue de la Entrega 3 (`deploy-compose`) está en el §2.4, Prompt 2. Cada diff generado con IA se revisa según los cinco focos del módulo de backend (correctitud, seguridad, rendimiento, legibilidad y tests), concretados para este proyecto en la skill `review-diff`: fidelidad al README y al vocabulario fijo, dinero y fechas, pruebas reales, seguridad y datos sintéticos, y arquitectura hexagonal.

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

*Contexto.* `web-shell` (PR #26, issue #3): el primer código de frontend (Vite, React 19, Tailwind, shadcn/ui, TanStack Router y Query, cliente generado desde el contrato OpenAPI) con las pantallas Login y Accounts. El proposal dejó cuatro decisiones explícitas para aprobar antes de programar: dónde viven los tokens, CORS en desarrollo, librería de rutas y capability de los escenarios de interfaz.

*Prompt.* Proponer el change leyendo el issue, los wireframes, el mapa de pantallas y las rutas reales del API, y después implementarlo grupo a grupo con test primero, rompiendo a propósito cada pieza crítica (refresh de un solo vuelo, guarda de permiso, filtro del menú) para comprobar que su test falla. Tras la prueba manual, revisar el diseño de la sesión y del formulario de Login antes de cerrar.

*Resultado.* Durante `apply` apareció un hallazgo serio: `openapi-fetch` captura `fetch` al crear el cliente, antes de que MSW lo intercepte, así que el cliente sin autenticación de los tests hablaba con la API real que estaba levantada en el puerto 3000 y dos tests fallaban por credenciales. Se corrigió buscando `fetch` en cada llamada. Tras la prueba manual, la decisión D1 cambió de una sesión por pestaña (refresh en `sessionStorage`) a una sesión compartida: refresh en `localStorage`, renovaciones serializadas entre pestañas con Web Locks y relectura del refresh dentro del candado, y `BroadcastChannel` solo para login y logout. Un test de dos pestañas comprueba dos renovaciones en serie con refresh distintos y nunca uno revocado; falla si se quita el candado o la relectura. El formulario de Login (vacío al montarse, contraseña borrada tras un rechazo conservando el usuario, `autocomplete` para los gestores de contraseñas) ya cumplía lo pedido: se fijó con tests, comprobando que cada uno falla al romper el comportamiento que protege.

*Ajuste humano.* Para la renovación entre pestañas, el asistente propuso que la pestaña que renueva pasara el access token nuevo a las demás (una sola llamada al API). Se eligió en su lugar renovar en serie (una llamada por pestaña) para que el access token nunca salga de la memoria de su pestaña. Se asumió como riesgo documentado que la sesión sobrevive al cierre del navegador durante la vida del refresh (7 días) y que Sign out la corta en todas las pestañas. Se aprobó el cliente generado desde el contrato con la condición de parar y proponer la alternativa si se atascaba, y Merchants & Providers y Account Detail pasaron a la Entrega 3.

**Prompt 4:**

*Contexto.* `api-collection` (PR #30, issue #29): una colección Bruno del API para probarlo a mano y como suite de humo contra el backend local. Es transversal al tramo 1: cubre auth, catálogo y health con un caso feliz y uno negativo por endpoint, y añade los scripts `pnpm test:api` y `pnpm test:api:smoke`. No toca el backend.

*Prompt.* Proponer el change con `/opsx:propose` y aplicarlo con las condiciones de partida:
- La colección se importa una sola vez desde `docs/openapi.yaml` y después se mantiene a mano.
- El login es automático, para que cualquier carpeta o petición se pueda ejecutar sola.
- Las credenciales viven solo en `api-collection/.env`, ignorado por git y que el agente no lee; los tokens, solo en variables de ejecución, nunca en disco.
- Una aserción se rompe a propósito para comprobar que la ejecución da rojo.

*Resultado.* Tres carpetas: `00-auth` (10 peticiones), `10-smoke` (19) y `20-flows` (11). Bruno 4.2.1 importa en YAML por defecto, así que la importación se forzó en formato `bru`. El pre-request de la colección inicia sesión como `analyst`; `viewer` solo se usa en los negativos de alcance. Refresh, logout y el flujo de sesión hacen su propio login (`selfAuth`) para no invalidar la sesión que comparten las demás peticiones. Resultados: 40/40 en verde; con el backend inalcanzable o una contraseña incorrecta, la ejecución termina con código 1. Los scripts usan `cd api-collection && bru run`, porque `pnpm exec` arranca desde la raíz del workspace, y `-r`, porque `20-flows` tiene subcarpetas.

El review-diff encontró el README §4 desalineado con el API real: refresh, logout y health son anónimos, y el código es `validation_error` en minúsculas. Además: los logins pasaron a declarar `selfAuth` en lugar de reconocerse por el nombre; la cuenta de prueba se resuelve en un solo punto con un error explícito; las listas se comparan por miembros y no por orden; y se quitó una entrada duplicada de `.gitignore`. Por el camino, los hooks del agente pasaron a lanzarse con `$CLAUDE_PROJECT_DIR`, porque desde una subcarpeta no se ejecutaban. Al comprobarlo, el seed lanzado desde `api-collection/` quedó bloqueado como debía. `guard-schema` reconoce ahora las rutas de Windows, y los hooks tienen pruebas propias en la CI (`pnpm test:hooks`).

*Ajuste humano.* La persona fijó la convención de los códigos de error: snake_case en minúsculas en todo el API. Los ejemplos en mayúsculas del README quedaron marcados como desactualizados y la regla pasó a `CLAUDE.md`. Aceptó el peso de `@usebruno/cli` (unos 280 paquetes transitivos, solo como devDependency) porque hará falta para ejecutar la colección en la CI de la Entrega 3. Probó la colección a mano en la aplicación de escritorio de Bruno, como `analyst` y como `viewer`.

**Prompt 5:**

*Contexto.* `import-upload-mapping` (PR #33, issue #4): el primer tramo de HU1 y el primer change que recibe archivos del usuario. Subida de uno o varios `.xlsx` de la plantilla por cuenta, conservación del archivo original bajo `UPLOAD_DIR`, lectura de las hojas como texto y propuesta de pareo con el origen de cada decisión (`account`, `global` o `none`) más `readiness`. Cinco rutas nuevas y sin cambios de esquema.

*Prompt.* Proponer el change a partir del issue con `/opsx:propose`, dejando explícitas para aprobación las decisiones de riesgo: con qué se leen los `.xlsx`, cómo evitar que IDs e importes pasen por `number`, los límites de subida y descompresión, la ruta en disco, el alcance del rechazo por duplicado y el orden archivo/base cuando algo falla a medias. La pieza de riesgo era el lector `.xlsx` propio sobre `fflate` y `saxes`: ExcelJS convierte toda celda numérica a `number` y descomprime sin tope, y SheetJS arrastra CVE sin corregir en npm. Se aprobó con timebox: el lector sería el primer grupo de tareas y tenía que quedar en verde contra las cinco muestras y contra un archivo guardado por Excel de escritorio; si no, se paraba y se proponía la alternativa (ExcelJS con detección de precisión y un límite de descompresión previo con `fflate`), documentada como deuda.

*Resultado.* El lector quedó en verde dentro del timebox y el design absorbió tres ajustes. Excel no conserva más de 15 dígitos significativos en una celda numérica, así que el lector no puede deshacer una pérdida que ya está en el archivo: cuenta por columna las celdas numéricas con notación científica o más de 15 dígitos y `readiness.notes` avisa cuando la columna propuesta como ID las tiene, en lugar de ocultarlo. `ImportSheet.kind` no admite nulos, de modo que una hoja sin propuesta se guarda con el marcador `ignore` y la API la muestra como `kind: null` con `source: none`. Y el archivo de Excel real pasó de prueba manual a fixture del repositorio (`data/samples/excel-real`, con datos sintéticos y los metadatos personales limpiados), con un ID en notación científica que la integración comprueba en `readiness.notes`. La primera revisión con `review-diff` dejó dos hallazgos HIGH: una celda vacía con una referencia de columna gigante (`ZZZZZ1`) dimensionaba la cabecera y el mapa de la fila sin pasar por el límite de columnas, una denegación de servicio con un archivo de pocos KB; y el detalle del import se construía dentro del ámbito de limpieza, así que un fallo tras la transacción borraba archivos cuyas filas ya estaban en base, justo el estado que D6 prohíbe. Entre los MEDIUM: un cuerpo multipart malformado respondía `500` en vez de `400 validation_error`, el `422` filtraba mensajes de errores internos del lector, y los límites de descompresión, pensados para volúmenes que no existen, bajaron de 256 MiB y 500 000 filas a 64 MiB y 200 000, con tests frontera (el valor exacto pasa, uno más falla). La segunda revisión encontró que el arreglo del multipart había introducido un cuelgue: si el almacenamiento rechazaba una parte sin consumir su stream, el parser quedaba esperando y la petición nunca respondía. Ahora la parte se drena también en ese caso y el fallo llega como `500` cuando el parser termina; quedaron además dos ajustes menores (no cachear un `mkdir` fallido y reportar un deflate corrupto con el nombre de la entrada).

*Ajuste humano.* Las seis decisiones de riesgo del design se aprobaron antes de `apply`, y la puerta de salida del lector la fijó la persona, que además aportó el archivo de Excel real cuando el primer grupo lo pidió. Se aceptaron como deuda registrada el marcador `ignore` hasta que una migración por otro motivo haga `kind` nullable, y el barrido de archivos huérfanos en `UPLOAD_DIR`; y se decidió que el duplicado por `sha256` se rechace solo dentro del import, no entre imports, para poder reprocesar tras cancelar.

**Prompt 6:**

*Contexto.* `import-analyze` (PR #36, issue #5): el tramo backend que cierra HU1. El analista confirma el pareo de cada hoja y el servidor analiza el import: normaliza los IDs según el `idFormat` del gateway, los cruza contra las transacciones propias y guarda una `ImportRow` por fila con su fila original. Después lista las filas con las no asociadas y las ambiguas primero, permite resolver una ambigua eligiendo gateway y cancela conservando la evidencia. Cinco rutas nuevas y sin cambios de esquema.

*Prompt.* Proponer el change a partir del issue con `/opsx:propose`, dejando como preguntas abiertas lo que el README no decidía, y revisar el diseño antes de `apply`. La pieza de riesgo era la inserción masiva de `ImportRow` (D1): se aprobó con una puerta de medición contra SQL Server como primer grupo de tareas, con umbrales por volumen, y la instrucción de parar y proponer alternativa si no se cumplían.

*Resultado.* La revisión del diseño cerró nueve decisiones. Dos eran reglas de negocio nuevas y se llevaron al README antes de programarlas: los gateways del cruce son los de los canales de la cuenta y, si no tiene ninguno, los de los canales de su proveedor (sin ninguno, las filas quedan `unmatched` con `no_gateways`); y si una hoja tiene estado fijo y además se parea una columna de estado, gana la hoja y la discrepancia sale como advertencia por fila. El resto (columna `gateway`, `txnDate`, filas de `Other Fees` sin `ImportRow`, reglas de ignorar por patrón) quedó como deuda registrada. La medición de D1 (lotes de 125 filas, 2 000 parámetros, dentro de una transacción) cumplía con 783 y con 20 000 filas, pero 200 000 tardaban 125 s frente a un umbral de 90 s. Como el coste crece de forma lineal y el volumen real es de cientos de filas, en lugar de cambiar de estrategia se fijó un tope de 100 000 filas por import (la suma de las hojas de transacciones de todos los archivos, comprobada antes de leer ninguna fila; `422 import_too_large`), que deja el peor caso en unos 60 s. Usar las muestras como oráculo destapó un error en el propio oráculo: el generador contaba las filas de `Other Fees` como transacciones, y el `expected.json` de `batch-issues` pasó de 772 a 770 filas leídas y de 768 a 766 asociadas, sin tocar ningún `.xlsx`. Tras `/opsx:verify`, el análisis de 20 000 filas tardaba 24,5 s, 10,8 de ellos en buscar transacciones: Prisma envía los strings como `NVARCHAR`, la columna es `VARCHAR(36)` y la conversión implícita impedía usar el índice único con un seek. Ahora los pares viajan en un único parámetro JSON que se abre con `OPENJSON … WITH` y un `CAST` a `VARCHAR(36)`, sin interpolar valores: de unas 150 lecturas lógicas por búsqueda a 3 para un ID, y 14 s de extremo a extremo. La primera revisión con `review-diff` dejó un HIGH y tres MEDIUM. H1: las escrituras del import no tenían guarda en la máquina de estados, de modo que un `PUT mapping` leído en `mapped` podía devolver a `mapped` un import ya analizado o cancelado; ahora cada escritura empieza por un `UPDATE` condicionado al estado y al `updatedAt` leídos, como el claim del análisis. M1: dos `PATCH` simultáneos sobre la misma fila ambigua respondían `200` los dos, sumaban dos a `rowsMatched` y dejaban dos auditorías; la resolución quedó condicionada a que la fila siga ambigua y el import analizado. M2: una columna pareada dos veces o un estado fijo inexistente llegaban a la base y la violación de PK o FK respondía `500`; ahora se rechazan antes con `400 validation_error`. M3: con un gateway compartido, el aviso de canales y las filas mostraban la cuenta y la transacción de otro merchant. La segunda revisión encontró más fugas del mismo tipo (el canal, las candidatas de una fila ambigua y el estado de una fila R), una carrera en el estado anterior que audita el cancel, que pasó a leerse en la misma sentencia que lo reemplaza, y casos límite sueltos (un ID de más de 36 caracteres, un import analizado sin filas). Al perseguir la intermitencia del test de 21 MiB heredado de #4 apareció la causa real: Vitest ignora `fileParallelism` dentro de un project, así que los archivos de integración corrían en paralelo contra la misma base y el `afterAll` de uno borraba imports mientras otro los contaba. Un solo fork por project los serializa sin alargar el tiempo total.

*Ajuste humano.* Las preguntas abiertas y las nueve decisiones del diseño las resolvió la persona antes de `apply`, incluidas las dos reglas nuevas del README. Ante el caso de 200 000 filas eligió el tope por import en lugar de un análisis asíncrono o de insertar también con `OPENJSON`, que quedan como deuda por si aparecen imports reales grandes. Para M3 decidió ocultar: el cruce no cambia, pero al leer, lo que pertenece a un merchant fuera del alcance de quien consulta sale a `null` con `outOfScope: true`, conservando solo lo necesario para resolver la fila, y la forma oculta se documentó en el README.

**Prompt 7:**

*Contexto.* `validation-engine` (PR #41, issue #8): el motor de las ocho validaciones de HU2 como funciones puras, sin base de datos ni HTTP, con los cinco puertos de lectura que implementará #9 y sus dobles en memoria sobre el mundo sintético. Trae dos migraciones (`0004_validation_outcome`, el nuevo vocabulario del resultado, y `0005_conflict_occurrence_unresolved_status`, `ConflictOccurrence.statusId` nullable) y varias decisiones de negocio que se llevaron al README.

*Prompt.* Aplicar `tasks.md` grupo a grupo: primero los tests, en un commit `test:` que falla, y después el código; al cerrar cada grupo, romper el código a propósito una vez y comprobar que cae su test. Sin modificar un test para que pase. El grupo 1 era una puerta: si `runValidations` no bajaba de 2 s con 2 000 filas contra 50 000 movimientos, se paraba con los números en la mano. La migración la escribe el agente y la aplica la persona; la integración solo se lanza tras confirmar que la otra sesión (`web-import`), que comparte base, no está corriendo la suya; y no se toca `vocabulary.ts`, que esa sesión está modificando. Tras `/opsx:verify`, tres rondas de `review-diff` en una sesión distinta, cada hallazgo de código con su pareja de commits test/fix.

*Resultado.* La puerta se cumplió con holgura: 29–51 ms con el orquestador y los índices, y unos 100 ms al final con las ocho validaciones reales; con los índices rotos a propósito (historia buscada con `filter` por fila) subía a 1 990 ms. Las cinco muestras reproducen su `expected.json` leyendo los `.xlsx` reales con el análisis de #5, sin SQL Server. El refactor de `seed.ts` (movimientos históricos como función pura compartida con los tests) se protegió antes con un test de caracterización sin base, y al volver a sembrar los conteos de `SettlementTransaction` coincidieron con sus literales. La generación con `--create-only` no pudo ejecutarse porque `recon_app` no tiene permiso para crear la shadow database, lo correcto por mínimo privilegio, así que las dos migraciones se escribieron a mano. La implementación destapó tres huecos pequeños del diseño, cerrados sin cambiar reglas: la fila de origen en los hallazgos de una fila (`source`), excluir el import en curso de la historia (`excludeImportId`) y el proveedor en `computeRanges` para descartar filas ajenas. La primera revisión encontró que el rango R por fecha de creación daba faltantes falsos en una cuenta con canales de 180 y 120 días: el máximo lo marcaba una reserva de 120 días reciente y caían dentro reservas de 180 días todavía sin vencer. El rango y las candidatas R pasaron a compararse por vencimiento, y el oráculo de las muestras se recalculó. La segunda encontró que una fila RR repetida de una reserva ya liberada, cuya transacción había pasado después a `Chargeback`, salía como colisión con la fila incluida, de modo que la reserva se liberaba dos veces; que el contrato de candidatas I descartaba en SQL las que no tienen fecha de cambio de estado, con lo que su contador valía siempre cero; y que la colisión contra el histórico no listaba el `CHB 2` compatible, como sí hacía la del batch. La tercera fue solo de documentación. Al cierre, 99,9 % de líneas y 94,9 % de ramas en el módulo.

*Ajuste humano.* Las decisiones de negocio las tomó la persona y se documentaron en el README antes de programarlas. El resultado de cada validación usa `passed`, `warning`, `blocked`, `not_applicable` y `not_implemented`, y desaparece `failed`: solo `provider_mismatch` bloquea. `non_recorded_adjustment` incluye `status_mismatch`: una fila E reportada `Declined` que el gateway tiene aprobada, o al revés, es un hallazgo no bloqueante con la fila incluida. Una aparición con estado no resuelto (`status_unresolved`) cuenta como distinta de cualquier otra: es colisión con todas las apariciones actuales incluidas, nunca duplicado, en el batch y contra el histórico, y por eso `ConflictOccurrence.statusId` admite NULL. El rango R se calcula por vencimiento de la reserva, creación más `rollingReserveDays` del canal; entre usar el plazo vigente del canal o el aplicado al liquidar (`expectedReserveReleaseAt`), eligió el vigente (opción B), porque el plazo de un canal no cambia con el tiempo, con la condición de que la fuente de reservas retenidas de #9 filtre con el mismo cálculo; el plazo aplicado queda como deuda para la Entrega 3. Y R no tiene estado: dos apariciones R de la misma transacción son siempre duplicado. Además revisó el SQL de las migraciones antes de aplicarlas, confirmó cada lanzamiento de la integración y decidió no editar `0004`, ya aplicada, y dejar la observación de la revisión anotada en el PR.

**Prompt 8:**

*Contexto.* `web-import` (PR #43, issues #6 y #7): las pantallas de HU1 sobre las rutas de #4 y #5. New Reconciliation con la elección de la cuenta y un espacio por import con tres pasos (Files, Mapping y Analysis), cancelación y solo lectura sin permiso, más el primer smoke E2E con Playwright y playwright-bdd. Sin tocar el backend salvo un test de integración que contrasta el catálogo de estados de la base con la constante compartida.

*Prompt.* Aplicar el change grupo a grupo con `/opsx:apply`: primero los tests y luego el código, sin modificar un test para que pase. Al cerrar cada grupo, romper a propósito su pieza crítica: la guarda de doble envío, la fusión `keepDirtyValues` del formulario, la cola de subida que sobrevive a la navegación, el filtro de canales y la comprobación de tamaño. No leer `.env*`. El smoke lee `SEED_PASSWORD` en tiempo de ejecución, pero la contraseña no puede aparecer en logs, en la consola ni en el informe de Playwright. Parar si faltaba algo en el API. Tras `/opsx:verify`, dos rondas de `review-diff`, cada hallazgo de código con su pareja de commits test/fix y la verificación contra la base que fijara la persona.

*Resultado.* Los tests corren contra un API falso con MSW: una máquina de estados con las hojas, propuestas y vistas previas copiadas de respuestas reales del API sembrado, y huellas `sha256` del contenido para los duplicados. El contraste con el API real destapó dos diferencias con la spec, que se corrigieron antes de seguir:
- Cada parte de `batch-split` trae las diez hojas, así que quitar `part2` quita su tarjeta, no los nombres de sus hojas.
- La readiness del detalle no lista las hojas sin confirmar (solo lo hace el `422` de analyze), así que la pantalla las deriva de `mappingConfirmed`.

En jsdom hubo que usar los `FormData`, `File` y `Blob` nativos de Node, porque los de jsdom colgaban la subida multipart, y añadir polyfills para los selects de Radix. Con la suite completa, un test pasaba del tiempo límite porque cada cambio en el formulario repintaba todas las tarjetas; se arregló suscribiendo cada tarjeta solo a los errores de su hoja. La guarda de doble envío se comprueba con dos clics en el mismo tick dentro de un `act`: sin la guarda llegan dos peticiones. El smoke recorre `batch-clean` de punta a punta contra la aplicación levantada y escribe la contraseña desde la página, no con `fill()`, porque el título del paso llevaría el texto. Las comprobaciones de fuga se hicieron con una contraseña falsa inyectada por variable de entorno, buscándola en `test-results`, en el informe (incluido el zip que lleva embebido) y en la salida de consola.

La primera revisión dejó dos HIGH. H1: el formulario seguía validando y contando como cambio las hojas de un archivo quitado, así que una edición en `part2` bloqueaba Confirm mapping y Analyze después de quitarlo. Ahora el resolver valida solo las hojas del detalle y las del archivo quitado se dan de baja del formulario; un segundo test distingue las dos piezas, que por separado bastaban para el primero. H2: si el login fallaba, la instantánea de la página que adjunta el informe podía guardar la contraseña escrita. La verificación tuvo tres casos: un login rechazado no demuestra el arreglo, porque la aplicación ya borra la contraseña tras un rechazo; un login colgado a propósito la dejaba ver sin el arreglo y no con él. Entre el resto:
- El test del PUT pasó a compararse con los literales de la spec, no con el fixture del que sale el API falso.
- Las filas del import se invalidan al terminar el análisis; el test espía la invalidación, porque con `staleTime` 0 el refetch no se ve en pantalla.
- `403` y `404` de analyze tienen mensaje propio, y una hoja compacta se rotula **Show** cuando no hay edición posible.
- Una hoja sin tipo lanza un error en vez de enviarse como `ignore`, y un `409` al quitar un archivo recarga el import.
- Un escenario del smoke que falla a medias cancela el import que creó.

La segunda revisión se centró en el smoke. Vaciar el campo en un `finally` alrededor del clic, sin esperar al elemento, cubre el login colgado y el clic que agota su tiempo, pero no el caso en que se agota el tiempo del test: entonces el `evaluate` ya no llega y la contraseña aparecía. Por eso las acciones y la navegación tienen un timeout propio muy por debajo del del test, y el comentario del `finally` dice qué cubre y qué no. La limpieza de un escenario fallido corre en una pestaña nueva, para que la instantánea describa la pantalla del fallo; toma el `importId` de la respuesta del POST que crea el import y, si no puede cancelarlo, lo anota en el test en lugar de sumar un segundo error. Se comprobó forzando un fallo dentro del paso de subida y, después, otro en la propia limpieza. En el formulario, un fallo del envío que no es un error del API muestra que el pareo no se pudo confirmar.

*Ajuste humano.* La persona hizo la prueba manual con `analyst` y `viewer`, con teclado y a 1280 y 1024 px, y pidió cuatro ajustes de interfaz, cada uno con su test y su commit:
- **Continue to mapping** en el paso Files.
- Una línea compacta para las hojas sin nada que parear, con **Edit** en las ignoradas por regla.
- La readiness agrupada por archivo, con las notas informativas plegadas.
- La hoja siempre visible en la tabla del análisis.

Aprobó que dos tests cambiaran con la spec. Dejó para la revisión de la Entrega 3 los importes a dos decimales y un aviso fuerte cuando ninguna fila es de los canales de la cuenta elegida. Los huecos del API (catálogo de estados, motivo al cancelar, límite de archivos por import) y el job E2E en CI quedaron como deuda en #40, y las hojas sin confirmar en la readiness del detalle, en #42. Hizo el triaje de las dos revisiones y fijó cómo verificar cada hallazgo contra la base. Corrigió además al asistente: la regla de no leer `.env*` vale igual para un script propio que cargue el archivo aunque no imprima nada, y una comprobación con la contraseña real la ejecuta la persona.

En la segunda revisión, el hallazgo sobre los cambios sin confirmar describía un mecanismo real: al quitar un archivo, el reset con `keepDirtyValues` deja `isDirty` en `false`. Reproducido con el código anterior al arreglo, Analyze no llegaba a habilitarse, porque `useForm` vuelve a calcular `isDirty` en la pasada siguiente, cuando Mapping ni siquiera está montado. Entre conservar el cálculo nuevo, basado en `dirtyFields`, y volver a `isDirty`, la persona eligió volver a `isDirty` (opción a): revertir el arreglo y conservar su test como regresión, con la aserción negativa esperando antes a que Mapping muestre un solo archivo y comprobando que cae si nada cuenta como cambio. También coordinó con la sesión de `validation-engine` el orden de las entradas de esta sección y el rebase sobre la rama de entrega.

**Prompt 9:**

*Contexto.* `validation-runs` (PR #52, issue #9): el backend que cierra HU2 sobre el motor de #8. Adaptadores Prisma de los cinco puertos de lectura, corridas persistidas con una sola vigente por import, lista y detalle de hallazgos, cambio de inclusión y resolución manual auditados, decisión de conjunto (`POST review`) y su invalidación, y la máquina de estados `analyzed ↔ validated`. Siete rutas nuevas y la migración `0006_validation_runs`. Las siete preguntas que el README no resolvía (P1–P7) se decidieron en la revisión del design, antes de `apply`.

*Prompt.* Aplicar `tasks.md` grupo a grupo: primero los tests, en un commit `test:` que falla, y después el código; sin modificar un test para que pase y, si uno está mal, decirlo. Al cerrar cada grupo, romper el código a propósito una vez y ver caer su test. La migración la aplica la persona; no leer `.env*`; nada de `cd`, rutas absolutas ni código en línea en Bash; la base la comparte otra línea de trabajo (#10, solo frontend con MSW), así que nada de `db:reset` ni `migrate dev`. El bench solo con `RECON_BENCH=1` y cuando lo diga la persona.

*Resultado.* La rotura del grupo de adaptadores confirmó la decisión más delicada del design: sin el `CAST(… AS datetime2(7))` de `@rMax`, la reserva que vence 1 ms después del límite entraba. La causa se aclaró después, en la revisión: el adaptador envía el `Date` del SQL crudo como texto ISO, que se asigna exacto a una columna `datetime2`, pero `DATEADD(day, …, @p)` sobre un texto devuelve `datetime`, que redondea a 1/300 s. La entrada construida desde la base para las cinco muestras produce con el motor el mismo informe que la de memoria, y las cinco reproducen su `expected.json` por la API. La concurrencia se probó de forma determinista: un repositorio envuelto pausa la escritura de una corrida hasta que llega la otra (o hasta confirmar un review o un cambio de inclusión), y quitar la versión optimista de la guarda hace caer su test. La regla de R comprobada antes de la guarda la detectaba al principio solo un test con `Promise.all`, que cayó 3 de 3 veces pero depende de los tiempos; tras el review-diff independiente la garantiza una variante determinista que pausa la primera inclusión antes de su guarda mientras confirma la segunda. En el grupo 8, la rotura quitó la comprobación de la corrida vigente del review; el review-diff independiente señaló que leerla antes de la guarda no hacía caer ningún test, porque la pausa estaba antes de llamar al repositorio. Se reprodujo, y el test pasó a pausar el review dentro de su transacción, justo antes de la guarda (gancho `beforeClaim`); con esa rotura ahora cae. Un primer intento con la pausa después de la guarda (`afterClaim`) no servía: mientras la corrida retiene el bloqueo de `Import`, el review ya espera en su lectura del import. La auditoría va dentro de la transacción de cada acción: con una extensión de Prisma que hace fallar `auditLog.create`, ni la inclusión ni la resolución quedan. Salieron tres correcciones de montaje de tests, notificadas: los inputs de muestra numeran sus imports con la misma secuencia (`batch-issues` y `legacy-provider` compartían id), un fixture de batch `paid` sin `paidAt` violaba una `CHECK`, y dos aserciones antiguas de cancelación comparaban el detalle de auditoría con `toEqual`, cuando la spec añade `runId`. El primer bench, ejecutado por la persona, falló: 24,6 s, 20,3 de ellos de escritura, con 23 482 hallazgos, y su limpieza dejó datos 9xxx en la base compartida (`ConflictOccurrence_batchId_fkey`). El diagnóstico mostró que la entrada del benchmark del motor tenía rangos APP y DEC de casi cuatro meses (24 798 de 25 000 transacciones sin liquidar dentro) y que 17 de los 17,7 s de escritura eran los `createMany` troceados de los hallazgos sin apariciones. La limpieza pasó a orden de FK e idempotente; la escritura, a un `INSERT … SELECT … FROM OPENJSON` con tipos explícitos y el `MERGE … OUTPUT` de D5 (20 301 hallazgos, de 19,8 s a 1,1 s). El bench se dividió en un volumen de referencia y un caso extremo. Segundo bench, con la máquina tranquila:
- Referencia: 2 603 ms (carga 2 231, motor 10, escritura 288: guarda 6, cierre de la anterior 4, corrida 11, resultados 59, hallazgos sin apariciones 87, con apariciones 110); 1 023 hallazgos. Pasa la aserción de menos de 4 s, no el objetivo local de 2 s.
- Extremo: 5 060 ms (carga 3 922, motor 40, escritura 935, de ella 845 en hallazgos sin apariciones); 23 659 hallazgos. Sin aserción.

*Ajuste humano.* La persona decidió P1–P7, revisó y aplicó la `0006`, y a mitad del change fijó la convención de fechas: las de negocio son hora de pared de America/New_York sin zona (la `Z` del API es solo transporte, deuda en #48) y las de auditoría, instantes UTC; pidió documentarla y revisar, sin corregir, si alguna regla mezclaba las dos clases (no las mezcla ninguna). Pidió además dejar escrito en README §3.3 que la inclusión manual de un duplicado E entre batches existe solo para procesar batches históricos, porque un E no se paga dos veces, y abrir el issue #49 para cerrarla. Tras el primer bench decidió que aquel escenario no representaba un batch real y fijó los dos nuevos: un volumen de referencia (historial grande, rangos de pocos días calibrados con el doc 06, 2 000 filas, como máximo 2 000 faltantes) con aserción de menos de 4 s, y un caso extremo sin aserción, solo registrado. Con el segundo bench aceptó el resultado para la Entrega 2: la escritura queda por debajo de 300 ms (D5 cumplido) y el cuello de botella es la carga (86 % del total), que pasa a un issue de la Entrega 3.

**Prompt 10:**

*Contexto.* `web-validations` (PR #57, issue #10): la pantalla Analysis & Validations de HU2. Muestra la corrida con sus rangos, la tabla de las ocho validaciones, la lista de hallazgos y un drawer con las apariciones, el historial y las dos acciones del analista (cambiar una inclusión y resolver con nota). Añade el aviso de revisión invalidada y la decisión de conjunto (Continue / Cancel and reprocess). Se construyó mientras #9 seguía en curso, contra el contrato que publicaba su design y con un API falso de MSW. El último grupo de tareas era el rebase sobre #9 ya fusionado.

*Prompt.* Proponer el change con `/opsx:propose` a partir del issue y del contrato de #9, leído solo con `git show`, sin cambiarlo y diciendo en el proposal lo que faltara. Restricciones de partida:
- El drawer lleva las acciones completas; el resumen previo por ciclo es de #13.
- Run se deshabilita mientras corre y relee ante `409 import_changed`; avisa antes de re-ejecutar si hay cambios manuales; Continue se deshabilita con un bloqueante, con el motivo visible.
- Los controles siguen `editable`, `includable` y `resolvable` sin duplicar reglas, y `viewer` queda en solo lectura.
- El motivo al cancelar queda como pregunta abierta, y Settlement Review, que aún no existe, se resuelve con una propuesta.
- Tipos y handlers del contrato aislados en un solo sitio.

Después, aplicar grupo a grupo con test primero y una rotura a propósito por grupo, sin integración ni E2E contra la base compartida mientras #9 siguiera en curso. Las capturas, con Playwright y avisando antes de lanzarlas.

*Resultado.* En el gate del design el asistente se detuvo al fijar la zona horaria. Todas las fechas son `DATETIME2` sin zona y el API las serializa con `Z`, pero ningún documento decía si las de negocio eran instantes UTC u hora de Nueva York, y presentó lo que había encontrado antes de decidir nada. Con la convención fijada, las fechas se tipan con marcas `BusinessDate` y `AuditInstant`, de modo que pasar una al formateador de la otra no compila, y los dos formateadores se prueban con la zona del proceso en Tokio, en horario de verano y en horario estándar. El API falso quedó guionizado: los resultados y las marcas vienen fijados en las fixtures, cada `PATCH` devuelve lo que el escenario declara, y el falso solo modela lo que cambia entre peticiones.

En `apply`, una rotura no cayó porque `dblClick` da tiempo a React a deshabilitar el botón entre los dos clics. Se añadió el test de dos clics dentro de un `act`, como en web-import. Otra pasaba con el foco en el `body`, porque la página entera contiene el ID del hallazgo; la aserción pasó a exigir el botón exacto. Al volver a las esperas por defecto de `findBy`, la suite fallaba unos 25 tests en cada pasada. La medición dio dos causas:
- Una cascada propia: el drawer pedía el hallazgo después de la corrida.
- El primer render del paso Analysis en frío, unos 750 ms aislado y más de 1 s con la suite en paralelo.

Se corrigió la cascada y solo las aperturas de esas pantallas esperan más. Al abrir con un hallazgo en la dirección, el drawer modal oculta el fondo con `aria-hidden`, así que esos tests esperan primero el drawer.

En el rebase, los esquemas Zod compartidos de #9 encontraron tres desajustes en el falso: UUID no válidos, `page` sin tope y un `occurrenceId` fuera del rango de BIGINT. Contra el API real, los conteos de las ocho validaciones de `batch-issues` coincidieron con el oráculo y se cumplieron los cuatro criterios del issue. También aparecieron diferencias con el falso:
- `missing_in_range` de `batch-blocked` trae diez faltantes.
- Los hallazgos de una sola fila llegan sin apariciones.
- Un estado reportado y el del gateway estaban invertidos en la fixture.
- Las filas reales del duplicado son otras.

Y cuatro defectos de pantalla:
- El drawer salía estrecho, porque una clase del sheet de shadcn pisaba la anchura.
- Un hallazgo de una sola fila decía que la transacción no estaba en el batch.
- El título quedaba bajo el botón de cerrar.
- La decisión de un import cancelado quedaba vacía.

Se corrigieron con test primero y se comprobaron en las capturas a 1280 y 1024 px, sin desplazamiento horizontal. El smoke de web-import siguió en verde.

*Ajuste humano.* La persona fijó la convención de fechas: las de negocio son la hora de pared de America/New_York del gateway principal, mostradas sin convertir; las de auditoría son instantes UTC convertidos a Nueva York, todas con el sufijo `ET`. Dejó en el roadmap averiguar la zona del gateway UUID y abrió con el asistente los issues de deuda:
- #48, para serializar sin `Z` las fechas de negocio;
- #47, el motivo al cancelar, que el 23 se queda sin motivo;
- #55, el motivo de `includable = false`.

Pidió que el falso no recalculara reglas de negocio. Decidió cada test que estaba mal, en lugar de dejar que se ajustara para pasar: comprobar el fondo de un modal después de cerrarlo, alargar solo las esperas de apertura y buscar la reserva también por su validación. Hizo en persona el login como `viewer`, porque el asistente no inicia sesión. Corrigió dos veces el texto de un import procesado: no podía decir que el batch estaba *settled*, porque solo lo está cuando está `paid`, ni que ya no cambiaba nada, porque un ajuste se sigue resolviendo a mano (P5 de #9).

**Prompt 11:**

*Contexto.* `settlement-process` (PR #66, issue #11) cierra la HU3 mínima en el backend. Procesar un import `validated` crea un intento de batch, pendiente de pago, con:
- número propuesto e intento;
- un movimiento por fila y ciclo (E/I/R);
- fees transaccionales vigentes a la fecha del evento, con su desglose;
- fees por batch prellenados desde `Other Fees`;
- totales por categoría y desglose del amount payable;
- asociación de canales auditada;
- resolución de los faltantes que trae el batch.

Todo va en una transacción. Añade cinco rutas y las migraciones `0007` y `0008`. Su design publica los contratos que leen #13 (pantallas) y #12 (summary y CSV).

*Prompt.* Proponer el change a partir del issue y de las decisiones que dejó pendientes `validation-runs`. Cinco decisiones obligadas:
- la clave única de `SettlementTransaction`;
- procesar solo desde `validated` con la revisión de la corrida vigente;
- el gancho `MissingResolution`;
- qué hacer con las filas sin estado resuelto;
- los códigos de error en minúsculas.

Las reglas de negocio no se inventan: lo que el README no dice queda como pregunta abierta con una opción provisional. Más restricciones:
- El dinero, siempre `Decimal` o texto.
- Las vigencias se comparan con fechas de negocio.
- Ningún movimiento queda Settled al procesar.
- La concurrencia se prueba con compuertas, nunca con `Promise.all` solo.
- El recorte deja el núcleo de la HU3 y pone al final, como recortables, los fees transaccionales y la reserva ante chargeback.
- Cada decisión del design lleva su alternativa descartada.

Después, aplicar grupo a grupo con test primero y una rotura a propósito por grupo. Las migraciones las revisa y aplica la persona, la base no se reinicia (la comparte #13) y hay un punto de control antes del grupo de fees.

*Resultado.* **La clave única.** La `UNIQUE (transactionId, cycle, batchId)` chocaba con Refund + Chargeback de la misma transacción y con Chargeback + CHB 2. La `0007` la cambia por una clave por fila (`batchId, sheetId, rowNo`) y deja `eventDate` nullable para el ajuste que no se puede fechar.

**Oráculos y seed.** Regenerar los oráculos a 4 decimales (grupo 0) cambió cifras de `batch-clean`, `batch-split` y `legacy-provider` y los literales de un test de caracterización. Se presentó el diff por muestra antes de seguir.

**La migración `0008`.** Al activar los fees, la integración destapó que el fee de un ajuste sin fecha no se podía guardar: `SettlementTransactionFee.eventDate` era `NOT NULL`.

**Fees y Bruno.** Los fees, la reserva y el `amountPayable` cuadran con los oráculos. En Bruno salieron dos tropiezos:
- El parser de sus scripts no admite el literal `0n`.
- El servidor que respondía era el del otro checkout.

**El verify.** Sin críticos. Encontró un error de código: la última barrera del número podía nombrar el intento de otra cuenta. También siete escenarios sin test y desfases en el design y el README. En el triaje, un `deleteMany` de limpieza se ejecutó con un id indefinido, que en Prisma vacía la tabla. Lo frenó una FK y no se borró nada. Desde entonces, `fixtureId` y `fixtureIds` hacen fallar cualquier limpieza con un filtro indefinido.

**El primer review-diff.** Dos HIGH:
- Ningún test ejercitaba el `UPDLOCK, HOLDLOCK` del número.
- La última barrera se probaba con errores inventados, y el código se había aflojado para aceptarlos. Ahora exige P2002 y los tests provocan violaciones reales con `$extends` dentro de la misma transacción.

De los MEDIUM, el principal: la asociación de canales decidía sobre un estado leído sin bloqueo. Ahora se relee bloqueado después del número. Los demás pedían límites de entrada que evitan 500 y un lector que admita los batches del seed. Los LOW, filtrar por alcance la cuenta de otro merchant.

**La segunda vuelta.** El test del bloqueo del número no lo aislaba:
- El segundo proceso esperaba igualmente en la relectura de canales, también con un canal distinto.
- "Sigue pendiente" no distinguía a un proceso bloqueado de uno lento.

El repositorio avisa ahora justo antes de cada bloqueo (`number`, `channelLock`). Con esas señales, quitar el hint solo del número hace caer el test.

**La tercera vuelta.** Confirmó que los interbloqueos ocurren. El procesado se reintenta ante el 1205, identificado por la forma real del error del adaptador (`P2010` o `P2034` con causa `TransactionWriteConflict`), y responde `409 settlement_busy` si se agotan los intentos. La solución de fondo queda en #67: no se ha visto el recurso de la espera porque el usuario de la aplicación no tiene `VIEW SERVER STATE`.

*Ajuste humano.* En el gate del design, la persona decidió:
- **RDR:** resta con su importe, como un Chargeback o un Refund.
- **Redondeo:** todo a 4 decimales, y solo el producto importe × porcentaje redondea mitad hacia arriba.
- **Desglose:** el amount payable lleva nueve líneas con signo.
- **Fecha de un ajuste (P6):** la del proveedor; si no viene, el último cambio de estado cuando coincide con el de la fila; si tampoco, sin fecha y con advertencia.
- **Fee de un ajuste sin fecha (P6b):** opción provisional, solo el único fee de su tipo sin vigencia.
- **Pending:** una fila Pending en el gateway se procesa con su propio estado. El `status_mismatch` que eso debería dar quedó en #63.

Además:
- Revisó a mano el diff de los oráculos del grupo 0 antes de dejar seguir.
- Recortó el grupo de la reserva ante chargeback a #62.
- Eligió la `0008` frente a inventar una fecha.
- Aplicó las dos migraciones, sembró y ejecutó Bruno.
- Llevó a #56 los timeouts de `pnpm -r test` en paralelo.
- En cada review pidió reproducir el hallazgo antes de corregirlo; así se vio que el primer arreglo del test del número no lo aislaba.

**Prompt 12:**

*Contexto.* `summary-exports` (PR #71, issue #12) añade las lecturas y las descargas del intento de settlement:
- volver a abrir el intento;
- ver sus movimientos por ciclo con el desglose de fees;
- listar los intentos de un import;
- descargar el summary del merchant y los CSV del Back-Office (TXN y RR), cada descarga auditada.

Se desarrolló en una rama apilada sobre `settlement-process`, que se rebasó con `git rebase --onto` cuando esta se fusionó.

*Prompt.* Proponer el change con `/opsx:propose` a partir del issue y del contrato que publicaba el design de #11: cuatro lecturas y tres descargas por intento, con seis decisiones abiertas para el gate. Después, aplicar grupo a grupo con test primero y una rotura a propósito por grupo, con los `expected.json` de las muestras como oráculo de cada export.

*Resultado.* Los exports reproducen los oráculos. El summary de `batch-clean` cuadra su amount payable con la suma con signo de sus nueve líneas, y el `CHB 2` de `legacy-provider` sale como `CHB` en el TXN. Una tarea no se podía comprobar contra la base: el desempate del orden de los movimientos. Los movimientos sembrados empatan en la fila de origen y el índice ya los devuelve en ese orden, así que quitar el desempate dejaba la integración en verde. Se fijó con un test unitario del adaptador, que sí cae al quitarlo. El review-diff pidió el negativo `404` de Bruno que faltaba en los intentos de un import y algunas limpiezas menores. Dejó como deuda transversal que la validación del esquema corra antes que la autenticación en todo el API (#72). Bruno, 141/141.

*Ajuste humano.* En el gate, la persona decidió:
- **CSV limpios.** Los del Back-Office van sin trucos para Excel (ni `="…"`, ni apóstrofo), porque los consume una herramienta de terceros. El aviso de cómo abrirlos sin estropear los IDs queda junto a las descargas, y un `.xlsx` para lectura humana pasa a la Entrega 3 (#68).
- **Filas:** una por par (ID, Status).
- **Reserva:** la R que libera 0 sale igualmente en el RR.
- **Formato:** RFC 4180, CRLF y UTF-8 sin BOM.
- **Sin CORS,** porque la SPA y el API comparten origen.
- **Summary:** sus advertencias llevan el ID de origen, no el interno, y las fechas, el sufijo "(ET)".

En el triaje añadió neutralizar fórmulas en las celdas de texto del summary: un texto que empieza por `=`, `+`, `-` o `@` lleva un apóstrofo delante. Los importes, las fechas y los IDs no se tocan.

**Prompt 13:**

*Contexto.* `web-settlement` (PR #74, issue #13): las pantallas Settlement Review y Settlement Summary de la HU3. El analista revisa el número de batch propuesto, la fecha de liquidación y los fees por batch (prellenados de `Other Fees`, preestablecidos de la cuenta e importes libres), ve un resumen previo que calcula el servidor, confirma los canales que se asociarán y procesa; el Summary muestra el intento con su desglose auditable. Se construyó mientras #11 seguía en curso, contra los contratos que publicaba su design y con un API falso de MSW. El último grupo de tareas era el rebase sobre #11 ya fusionado; #12 (relectura del intento y descargas) seguía sin fusionar.

*Prompt.* Proponer el change con `/opsx:propose` a partir del issue y de los contratos de #11 y #12, leídos solo con `git show` y sin tocar la carpeta de #11. Restricciones de partida:
- Ninguna cifra se calcula en el navegador y el dinero es texto de principio a fin.
- Fechas con `BusinessDate` y `AuditInstant`, como en web-validations.
- Contrato aislado en un solo fichero y falso de MSW guionizado.
- Guardas síncronas en Process y en la vista previa, sin actualizaciones optimistas.
- Interfaz en inglés y usable con teclado; cada botón deshabilitado dice por qué con `aria-describedby`.
- El último grupo espera a que #11 esté fusionado.

Después, aplicar grupo a grupo: primero los tests, después el código, una rotura a propósito por grupo y sin modificar un test para que pase. Sin integración, E2E ni `pnpm dev` hasta el último grupo, porque la base y los puertos los usaba #11.

*Resultado.* **El design.** En la revisión se cerraron los huecos del contrato:
- La fecha de liquidación es obligatoria en la pantalla.
- Una fila de `Other Fees` de tipo desconocido queda marcada hasta que se le elige un tipo de importe libre o se quita (#60).
- #11 conserva el orden de `batchFees` y exige la descripción del importe libre (`description_required`).
- `Content-Disposition` se pidió a #12, y la lista de Settlements quedó en #64.

**Vista previa y Process.** La vista previa es una consulta con el cuerpo entero como clave, enviada 400 ms después del último cambio. Process envía el cuerpo de la vista previa que está en pantalla, nunca uno recompuesto del formulario. Una rotura prevista no podía caer: mientras la vista previa no está al día Process está deshabilitado, así que formulario y vista previa coinciden siempre que se puede pulsar. Se rompió en su lugar la espera de Process a la vista previa. Otra rotura, la guarda síncrona, enviaba dos `POST` con dos clics en el mismo tick. El test de teclado encontró un hueco real: las listas para añadir fees se deshabilitaban mientras cargaban sin decir por qué.

**El rebase.** Los tipos pasaron a ser alias de los generados y las llamadas, del cliente tipado. Las rutas de #12 siguen escritas a mano y las descargas, deshabilitadas con su motivo. Los esquemas de `@recon/shared` encontraron dos desajustes en el falso:
- devolvía los importes tal como se escribieron (`30`), no con cuatro decimales;
- no rechazaba un campo desconocido, un número de batch fuera de `INT` ni un día que no existe.

Con el merge llegaron cambios del contrato que se llevaron a la spec, cada uno con su test nuevo:
- la cuenta de otro merchant, que solo se nombra como tal;
- un intento sin resumen de incidencias;
- `409 settlement_busy` con **Retry** y el mismo cuerpo;
- el tope del número de batch.

**Contra el API real.** La forma de las respuestas coincidió con el falso y el orden de `batchFees` es el del cuerpo. El `400 description_required`, forzado quitando la descripción en la página, se pinta en su fila. Un batch sembrado como pagado cuenta como número ocupado. La recarga del Summary dice que no existe hasta que entre #12. El smoke falló una vez porque el procesado manual había asociado RAM-07; tras volver a sembrar, en verde.

**Las capturas.** Destaparon importes recortados: a 1024 px en el resumen previo, y a 1280 px en el desglose y en los totales del Summary. El contenedor de la tabla de shadcn los desplazaba fuera de la vista sin que la página desbordara, así que la comprobación de desplazamiento horizontal decía que todo estaba bien y jsdom no calcula el diseño. Ahora las etiquetas se parten, el resumen previo pasa debajo del formulario por debajo de 1280 px y el Summary usa dos columnas desde ese ancho. El script también falla si una tabla queda recortada; hicieron falta dos vueltas, porque la primera aún recortaba los totales por tipo. Por último, la intermitencia de #56 apareció en tres ficheros de imports con la suite del frontend sola, por la carga de las esperas reales del debounce.

*Ajuste humano.* La persona revisó el design punto por punto: la fecha obligatoria, el tipo desconocido con #60, los dos huecos de #11, el comentario en #12 y el issue #64. Aprobó también el debounce de 400 ms y el enlace desde un import procesado a su Summary. Revisó los tests que cambiaron (los dos de Analysis que fijaban el escenario retirado y cuatro tests propios todavía en rojo) y aceptó los desvíos del design. Tras el rebase pidió juntar dos commits para que cada uno compilara por separado. Decidió que las descargas se habiliten en un commit aparte cuando entre #12. Dio los turnos de base, aplicó las migraciones, sembró antes y después de cada procesado y entró como `analyst` y como `viewer` en el navegador, porque el asistente no inicia sesión. Vio en directo cada ejecución de las capturas y pidió llevar a #13 las notas del PR y a #56 los ficheros nuevos que fallaban por carga.

**Prompt 14:**

*Contexto.* `settlements-browse` (PR #88, issue #64): la opción Settlements del menú para la Entrega 2. Es un change pequeño y de solo lectura. El backend añade `GET /accounts/{id}/settlements`, con filtros, paginación y alcance por merchant. El frontend añade la pantalla Settlement List, a la que se llega desde el menú y desde Accounts, y una pestaña Movements en el Settlement Summary que ya existía, con los movimientos E/I/R paginados. Pagar, retirar el pago y deshacer quedan para el tramo 6.

*Prompt.* Proponer el change a partir del issue, con una sección "Contrato" para la ruta nueva y una alternativa descartada en cada decisión. Lo que hacía falta saber de la persona se listó en el proposal. Después, aplicar grupo a grupo: primero los tests, una rotura a propósito por grupo y el último grupo contra el API real con el seed, Bruno y capturas. Más restricciones:
- El dinero, siempre como texto.
- Las fechas de negocio, sin convertir; las de auditoría, en ET.
- La base, solo con turno.
- Avisar antes de lanzar el script de capturas.

*Resultado.* **Las dos fechas.** El issue no decía si `from` y `to` filtraban la fecha de liquidación o la de procesado. Se admiten las dos con `dateField`. Con `processedAt`, el día se calcula en Nueva York dentro del SQL con `AT TIME ZONE`, y lo prueban la medianoche de Nueva York y el cambio de hora de noviembre. La rotura con un desfase fijo de `-04:00` hace caer el caso del cambio de hora. La primera fixture de integración chocó con el índice único que admite un solo intento activo por import, así que cada intento tiene su propio import.

**El selector de cuenta.** Pasó a compartirse con New Reconciliation sin modificar ninguno de sus tests. Los tests de la lista destaparon dos defectos:
- Dos cambios de filtro seguidos se pisaban, porque el segundo partía de valores ya viejos. Ahora cada filtro envía solo lo que cambia.
- Al llegar por un enlace con la cuenta, completar merchant y proveedor devolvía la lista a la página 1.

El desglose de fees iba a ser un `<details>`, pero jsdom no lo abre con Enter y se cambió por un botón con `aria-expanded`. Al cerrar, el commit `feat` del endpoint no compilaba sin el adaptador y se juntaron.

**Las capturas.** La primera pasada midió tablas recortadas, que ni jsdom ni la prueba manual habían visto:
- En la lista, a 1024 px no se veían el amount payable ni los canales.
- En Movements, las once columnas no cabían ni a 1280 px: **Released on chargeback** y **Settled** quedaban fuera.

Ahora los textos se parten y los importes nunca. Las tres reservas van en una columna **Reserves**, con una línea y su etiqueta por cifra, y quedan nueve columnas. La segunda pasada midió todo bien, pero las imágenes mostraban `RAM-` / `07` y fechas partidas en el guion: el navegador también corta tras un guion, y la medición no lo ve. Cada nombre de canal y cada fecha quedaron en una sola línea, y la tercera pasada se versionó. El verify no encontró errores de código. Señaló que el flujo de Bruno filtraba por estado y no comprobaba que tras el intento nuevo viniera el 122, y se añadió esa petición.

*Ajuste humano.* La persona aprobó el design, con las dos fechas y `All statuses` por defecto, con los intentos deshechos atenuados. Dio los turnos de base, sembró antes y después de cada procesado, ejecutó Bruno y probó como `analyst` y como `viewer`. Ante las tablas recortadas eligió la columna **Reserves** frente a aceptar el desplazamiento dentro de la tabla. Exigió que cada línea llevara su etiqueta y que ningún importe se partiera, y que los PNG se versionaran solo con todas las mediciones limpias. Mantuvo sin tocar los tiempos de los tests (#56). En el triaje del verify dejó para `ui-polish` unificar los dos ayudantes que evitan partir el texto.

**Prompt 15:**

*Contexto.* `ui-polish` (PR #91): pulido de la interfaz tras la revisión con el líder del equipo del 20 de octubre (`docs/uat/2026-10-20-revision-interfaz.md`). Solo frontend, sin cambios de API ni de reglas. Doce observaciones entran en el change: menú, tarjetas, barra superior, bloques por archivo, readiness, nombre de archivo, colores de estado, tabla de rangos, contadores, cabecera del Summary, fechas sin hora y navegación dentro de la página. Seis quedan fuera: plegar archivos (#85), columna Round (#86), Transactions en Validations (#87), summary `.xlsx` (#82), selector de merchant (#83) y modo oscuro (#84).

*Prompt.* Proponer el change con su design (D1–D17) y, tras el merge y el archivo de `settlements-browse`, aplicarlo grupo a grupo: test primero, una rotura a propósito por grupo, dos commits por grupo (`test` y `feat`) y push al cerrar cada uno. Más restricciones:
- Ningún color, sombra ni tono fuera del tema, con valor claro y oscuro.
- Ninguna cifra calculada en el navegador.
- Parar solo si una decisión cambia el alcance o hace falta turno de base.

*Resultado.* **Colores de estado (D8).** Un mapa por enumeración en `lib/status-tone.ts`, con `satisfies` para que un valor nuevo de `@recon/shared` rompa `typecheck`, y `toneOf`, que da gris a un valor sin entrada. La rotura `blocked → warning` hizo caer el mapa y la corrida bloqueada.

**Navegación dentro de la página (D13).** El router vuelve arriba en cada cambio de búsqueda, también en jsdom, y los tests lo vieron con un espía de `window.scrollTo`. Cada navegación que solo cambia lo que muestra la pantalla lleva `resetScroll: false`. El foco va al encabezado de la lista solo cuando lo pide la acción del usuario: un botón de filtro, una validación, el ciclo o Previous/Next. Nunca lo piden un desplegable, una fecha, una recarga, un enlace ni el `useLastPageLimit`. Dos roturas: quitar `resetScroll` de `go` y quitar la comprobación de la petición pendiente, que robaba el foco al llegar por enlace.

**Tests que cambiaron a propósito.** Además de los listados en D15, cambiaron `SettlementSummary.test.tsx:151` en el grupo de fechas (el formateador ya lo cambiaba ahí) y tres aserciones de la readiness en `analyze.test.tsx`; quedaron anotados en D15. El Badge de estado del Summary pasó a la rejilla para no repetirse, porque `read-only` y `exports` lo buscan por su texto. La suite completa en local mostró otra vez la intermitencia de #56 bajo carga, la misma en el commit base.

*Ajuste humano.* La persona aprobó el mapa de D8 con un criterio que quedó escrito en el design: el color responde a "¿queda algo pendiente?", no a "¿salió bien el paso?". Pidió gris para lo que no está en el mapa, con un test, y el color nunca solo, con el texto del estado y contraste AA. Mantuvo dos commits por grupo y dejó para la revisión de capturas ajustar el verde del import frente al ámbar del batch si confunde.

**Prompt 16:**

*Contexto.* Cierre de la Entrega 2 (issue #18): solo documentación, sin tocar código, base ni migraciones. El vídeo de la demo pasa a la Entrega 3.

*Prompt.* Auditar primero y devolver una lista de huecos antes de escribir nada. La auditoría compara el repositorio con el enunciado de la Entrega 2 (flujo conectado, configuración reproducible, ADR de los cambios de rumbo, pruebas de las partes críticas, `prompts.md`) y con las tareas del #18. Tiene que comprobar que cada comando del §1.4 existe en un `package.json`, que el `.env.example` tiene todas las variables que lee el código y que los enlaces del README funcionan. Después del visto bueno, commits pequeños por sección y PR hacia la rama de entrega. Más restricciones:
- Sin `cd` ni rutas absolutas.
- No leer los `.env`.
- Ningún nombre de sistema real.

*Resultado.* La auditoría encontró:
- `docs/adr/` vacía, aunque el README anunciaba seis ADR.
- Textos que seguían diciendo "Entrega 1", "todavía no se ha comenzado a programar" o "pruebas previstas", y un árbol de ficheros que no coincidía con el repositorio.
- El §1.5 con #64 como recortado, aunque ya se había entregado.
- El §7 sin los dos últimos PR.
- Numeración repetida en esta sección.
- El §1.4 pidiendo un solo `.env`, aunque la colección Bruno necesita el suyo.

Los comandos del §1.4 y los enlaces relativos estaban bien. El agente no pudo leer los `.env.example`, porque los ajustes de permisos se lo impedían, y no intentó saltárselo: la persona los pegó en la sesión. En `.env.example` aparecieron `JWT_SECRET` duplicado, un `CORS_ORIGIN` que no lee ningún código y la falta de un salto de línea final. Con el visto bueno se escribieron ADR-001 a ADR-011. Un subagente reunió la evidencia de cada decisión y el agente la contrastó con las migraciones y el código antes de escribir. También se actualizaron los §0, §1.2 a §1.5, §2 y §7 y el registro de `docs/uat/`, y se abrió el issue del vídeo (#96).

*Ajuste humano.* La persona aprobó escribir los ADR con los cambios de rumbo reales y confirmó que solo hubo una sesión con revisores, la del 20 de octubre: buena valoración general y observaciones sobre todo de interfaz. Pidió que el §1.4 dejara claros los dos `.env` y todo lo que una instalación desde cero necesita. Dictó la regla de importes y moneda y la limitación del batch solo de fees (#92). Al comprobar las notas de la sesión, el agente vio que el resumen que había escrito no coincidía con lo ocurrido y lo corrigió: fue una revisión de pantallas con el líder del equipo, no de tareas guiadas.

**Prompt 17:**

*Contexto.* `import-in-progress` (issues #38, #47 y #42): la lista *In Progress* con su endpoint `GET /imports`, el motivo obligatorio al cancelar un import y las hojas sin confirmar en la readiness del detalle. Toca backend y frontend del módulo de importación mientras otra sesión trabaja en `settlement` y `validation` (#62), que no se tocan. Sin migración.

*Prompt.* Explorar los tres issues, el README y las specs, y traer preguntas abiertas con recomendación antes del proposal. Tras el gate, proponer el change y aplicarlo en la misma sesión, grupo a grupo, con MSW y test primero, push al cerrar cada grupo y un resumen corto. Más restricciones:
- Sin `cd` ni rutas absolutas; Grep y Read; no leer los `.env`.
- No migrar ni sembrar; pedir turno de base para la integración, Bruno y las capturas.
- Nada que dependa del estado de `batch-clean` (#111).

*Resultado.* El gate partió #38 en dos changes: este y `web-ambiguous-rows`, solo frontend porque el `PATCH` de la fila ya existe. Fijó el contrato de `GET /imports` (filtros, alcance con el mismo `404` para merchant, proveedor o cuenta, abiertos por defecto) y el motivo obligatorio solo en `AuditLog`, sin migración. Antes del apply, el agente vio que el motivo obligatorio rompía cinco cancelaciones en tests de `settlement` y `validation` y una en `decision.test.tsx`; la persona aprobó cambiarlas en un commit aparte de solo tests (D8). Faltaron en ese inventario los dos cancel de los flujos de validations de Bruno, porque la búsqueda no casaba con su sintaxis; los encontró la primera pasada de `pnpm test:api`. Durante el apply salieron dos desvíos del design: el diálogo conserva la prop `detail` para no tocar `DecisionBar.tsx`, y el aviso de un import ya cancelado lo da la página de In Progress, porque la fila desaparece con su diálogo. Las capturas mostraron el nombre de la cuenta y la fecha partidos a mitad a 1024 px, y se corrigió.

*Ajuste humano.* La persona aprobó el gate y D8, y marcó tres fallos del agente: un `cd`, un commit con `--no-verify` (rehecho con los hooks antes del push; los hooks son parte del proceso) y un commit que no recogió el README porque Git lo tiene como `readme.md`. La base se compartió por turnos con la otra sesión: integración con `pnpm dev` parado, y Bruno, smoke E2E y capturas con `pnpm dev` levantado. El review-diff queda para una sesión nueva.

**Prompt 18:**

*Contexto.* `web-ambiguous-rows` (#38, lo último que quedaba): resolver filas ambiguas desde la tabla de filas del paso Analysis. Solo frontend: el `PATCH` de la fila existe desde #36/#37 y no cambia. El gate ya se había aprobado en `import-in-progress`: solo en `analyzed`, deshabilitado y explicado en `validated`, aviso de la corrida que se descarta y capturas con `GET rows` interceptado.

*Prompt.* Explorar el endpoint (solo lectura), el README §1.2 y §1.3, la spec de import y `RowsTable`. Traer lo que el gate no cubre, con recomendación; si no hay nada, escribir proposal, delta specs, design y tasks, validarlos con `--strict` y enseñarlos antes del commit. Después, apply grupo a grupo con MSW, test primero, rotura deliberada y push al cerrar cada grupo. Las capturas, con turno de base. Más restricciones:
- Sin `cd` ni rutas absolutas ni código en línea; Grep y Read; no leer los `.env`.
- No migrar ni sembrar.
- Review-diff en una sesión nueva.

*Resultado.* La exploración trajo cuatro puntos que el gate no cubría. La persona aceptó las cuatro recomendaciones:
- El aviso de la corrida es condicional: se lee de la caché con `validationRunKey` y, si aún no se conoce, también se avisa.
- Las capturas usan una corrida real.
- Las candidatas de otro merchant se pueden elegir.
- La rama sale de la de entrega tras #129.

Durante el apply aparecieron cuatro cosas:
- **Foco.** `requestListFocus` no movía el foco tras resolver, porque ni el filtro ni la página cambian. La `focusKey` del encabezado incluye ahora un contador de resoluciones (D4).
- **Fake del `PATCH`.** El fake de MSW se había escrito con la convención de los demás handlers (`404` sin permiso si el import no es visible). La persona pidió el orden del API: permiso antes que alcance. Los otros cinco handlers con la misma convención pasaron a #94.
- **Desborde de la tabla de filas.** Las capturas midieron por primera vez esa tabla: a 1024 px ya desbordaba sin este change (167 px, #132). Además, el nombre de la candidata y el texto de `validated` se salían de su celda porque la celda no parte líneas. Se partieron y la fila ambigua pasó a sumar solo 17 px.
- **Gateway sintético.** El seed no tiene dos gateways del mismo formato, así que la candidata de otro merchant usa uno sintético.

*Ajuste humano.* La persona aprobó los artefactos tal cual. Decidió versionar solo las capturas de 1280 px: el desborde de 1024 px queda en el log hasta #132, y el script sigue fallando por todo lo demás. Marcó tres fallos del agente: un `cd`, un script de Python en línea y varios `sed` para editar archivos; la regla es Edit y `pnpm --filter`. La base la dio por turnos (`pnpm dev` levantado para las capturas) y el agente le avisó al terminar con ella para volver a sembrar. El review-diff queda para una sesión nueva.

**Prompt 19:**

*Contexto.* `settlement-lifecycle` (PR #99, issues #78 y #79) cierra los dos recortes de la Entrega 2: marcar un intento como pagado, retirar el pago, deshacerlo y reprocesarlo con el mismo número (HU3 criterios 7 y 8, HU2 criterio 9). Completa además la parte `settlement` de #21. Añade:
- `POST /settlements/{id}/pay`, `/unpay` y `/undo`, con cuatro `409` nuevos y auditoría en la misma transacción;
- las acciones **Mark as paid**, **Unpay…** y **Undo batch…** en la cabecera del intento, según permiso y estado;
- el historial de intentos del import en el Settlement Summary.

Sin migraciones: el esquema ya admitía los intentos `paid` y `undone`.

*Prompt.* Proponer el change juntando los dos issues, porque operan sobre el mismo recurso y sus reglas se cruzan, y apoyarse en las guardas de concurrencia, el reintento ante 1205 y `settlement_busy` de `settlement-process`. Cada decisión del design, con su alternativa descartada. Después, aplicar grupo a grupo con test primero y una rotura a propósito por grupo. Más restricciones:
- Sin migraciones: si un grupo parece necesitar una, parar y preguntar.
- Las transiciones, como función pura con TDD.
- El mismo orden de bloqueos que procesar.
- La concurrencia, con compuertas; nunca `Promise.all` solo.
- `undo` después de `pay`, porque una de sus reglas es rechazar un `paid`.
- Integración, Bruno y capturas, con turno de base de la persona.

*Resultado.* **El design.** `transitionOf` resume las nueve combinaciones de acción y estado, pero la que cuenta es la guarda del repositorio (`WHERE status = @from`): con 0 filas relee el estado y elige el error. `undo` bloquea `Import` antes que `SettlementBatch`, como procesar, y reabre los faltantes antes de superar la corrida vigente. Al explorar salieron tres cosas:
- `reopenForBatch` existía, nadie lo llamaba y no filtraba por corrida vigente, en contra de la spec `validation`. Se corrigió y ahora devuelve los ids.
- `settledStatusOf` estaba duplicado en el dominio y en el lector; queda una sola copia.
- El reintento ante 1205 pasó a `deadlock-retry.ts` para compartirlo con procesar.

**Durante el apply.** Dos tests chocaron con la base real: el seed solo escribe batches `paid`, y procesar se bloquea antes de la fase del número mientras `undo` tiene sus bloqueos. La spec decía que esperaba en el bloqueo del número; el resultado es el previsto y el test no exige dónde espera. La colección ganó un tercer usuario, `payments`, porque `analyst` no tiene `payment.process`. `pnpm test` fue intermitente en local con la raíz en paralelo y `pnpm dev` levantado (`app.test.ts` y `export-openapi.test.ts`).

**El verify.** Pidió la fecha en el historial de intentos. Encontró que el error de una acción pasaba de un intento a otro y que Escape cerraba el diálogo con una petición en curso. Añadió a la colección el `409` de un segundo pago y tests de que retirar el pago no reabre faltantes. La spec y el design decían que los exports no cambian, pero el `summary` muestra el estado actual en sus líneas `Status` y `Payment`: se corrigieron ellos y no el código.

**El review-diff.** Un bloqueante de pruebas (B1): los tests de un `undo` que falla no probaban el rollback. Ahora parten de un faltante resuelto y fallan después de las demás escrituras; sacar la reapertura o la corrida de la transacción los hace caer. Además, una carrera de ida y vuelta entre la guarda y la relectura responde `409 settlement_busy` en lugar de `404` o `settlement_not_current`. Quedan anotadas en el PR:
- una laguna: el test de "Otro import toma el número" mide la espera con una pausa de 1 s y no ejercita `lockNumber`;
- `review-events` se importa desde `settlement` sin puerto;
- `settlement.export` no registra el estado entregado en el `summary`, con un issue aún sin crear.

Bruno, 177/177 peticiones y 187/187 tests.

*Ajuste humano.* En el gate, la persona decidió:
- **`pay` sin motivo:** la auditoría lleva `reason: null`; un clic erróneo se revierte con **Unpay…**.
- **`undo` supera la corrida vigente** sin crear otra: el analista decide cuándo validar de nuevo.
- **Visibilidad:** quien no tiene el permiso no ve la acción, aunque #78 pedía botones deshabilitados con el motivo. La excepción es **Undo batch…** en un `paid` para `analyst`: sale deshabilitado con `Remove the payment first.`
- **Errores:** cuatro códigos nuevos, `settlement_not_processed`, `settlement_not_paid`, `settlement_payment_not_removed` y `settlement_not_current`.

Copió `SEED_PAYMENTS_USER` a su `api-collection/.env`, que el agente no lee. Dio los turnos de base, sembró, ejecutó la integración, Bruno y las capturas, y probó a mano como `payments` y `analyst`: pagar, retirar, deshacer y reprocesar.

**Prompt 20:**

*Contexto.* `admin-fees` (PR #112, issue #80, parte 1 de 3) lleva al API la administración de fees, que hasta entonces solo creaba el seed. Completa además la parte de `fees` de #21. Solo backend:
- `POST /accounts/{id}/fees`, que el README ya daba por hecho;
- `PATCH /fees/{id}`, con corrección en el sitio, cierre y cambio desde una fecha (`effectiveFrom`);
- la vista global `GET /fees`, paginada en servidor;
- el historial `GET /fees/{id}/history`.

`AccountFee` se amplía de forma aditiva con `status`, `inUse` y `lastAppliedEventDate`. Sin migraciones: el trigger `TR_Fee_NoOverlap` y las columnas de `FeeHistory` ya existían. Las pantallas van en `web-admin-fees`.

*Prompt.* Proponer el change como primera parte de #80 y dejar las pantallas a otro change que parte de este contrato. El primer grupo publica el contrato en `@recon/shared` y el OpenAPI, con las rutas declaradas y respondiendo `501`; después, push, aviso a la persona y espera a su confirmación. Más restricciones:
- Sin migraciones: si el esquema hace falta, parar y preguntar.
- Vigencia, solape y edición, como funciones puras con test primero y rotura a propósito.
- Concurrencia con compuertas.
- Colección Bruno repetible sin sembrar, con fechas futuras derivadas de cada pasada.

*Resultado.* **El design.** El `PATCH` tiene dos formas, según venga o no `effectiveFrom`. Un fee en uso solo admite `description` y `endDate`, y ni el cierre ni el cambio pueden dejar fuera un evento ya aplicado (`409 fee_in_use` con `lastAppliedEventDate`). Cuentan como uso todos los intentos, también los `undone`. Las escrituras bloquean la fila de `Account` con `UPDLOCK, HOLDLOCK`, y el trigger queda como respaldo traducido a `fee_overlap`. El reintento ante interbloqueo pasó a la infraestructura compartida sin cambiar `settlement`.

**El seed sin fees en uso.** Con la base recién sembrada fallaron 8 tests de fees que daban por hecho fees en uso. El seed procesa sus batches sin desglose, así que ningún fee lo está. Los tests crean ahora su uso con un fixture (`applyFeeUsage`) y el negativo de `fee_in_use` de Bruno pasó al final de `batch-clean`. Como ese flujo solo procesa con la base recién sembrada (#111), `10-smoke/Fees` guarda un fee en uso de una pasada anterior como respaldo.

**El índice que falta.** El cálculo de uso recorre `SettlementTransactionFee`, que no tiene índice por `feeId`. Se midió con 800 filas de batches procesados a mano: p95 entre 62 y 85 ms por cuenta. El índice queda en #67, junto con la carrera aceptada entre una corrección en el sitio y un settlement que aplica el mismo fee.

**El verify.** Faltaba probar el uso por un fee por batch: un `SettlementBatchFee` pone el fee en uso con la `settlementDate` de su batch, y un intento `undone` sigue contando. Quitar esa rama de `fee-usage.ts` hace fallar los dos tests nuevos. D5 y dos escenarios se alinearon con lo implementado.

**El review-diff** (aprobado con cambios menores):
- **M1.** El respaldo del trigger se reconoce por su número, 50001, en la causa del adaptador, y no por el texto.
- **M2.** El respaldo de Bruno va en su propia variable (`earlierInUseFeeId`), y el test dice de dónde sale el fee.
- **Menores.** El sucesor exige un tipo activo. `previousDay` leía el año 0050 como 1950. `today()` se calcula una vez por petición. `q` se busca como texto literal: Prisma no escapa `%`, `_` ni `[` en SQL Server.

Bruno, 196/196 peticiones con la base recién sembrada; en la segunda pasada, todo lo de fees en verde y 27 fallos ajenos de #111.

*Ajuste humano.* En el gate, la persona decidió:
- Simulate pasa al roadmap.
- La retirada de un fee programado y sin uso va a #109, para no tocar la `CHECK` ni el trigger antes de la entrega.
- Los intentos `undone` cuentan como uso.
- Un `PATCH` sin cambios responde `200` sin historial ni auditoría.
- Las variantes condicionales y por marca se guardan, pero el motor no las aplica (limitación conocida).
- La copia de fees al crear una cuenta va en `admin-accounts`.

Confirmó el contrato publicado antes de seguir. Acotó la tarea de Bruno: se cerró con todo lo de fees en verde en dos pasadas seguidas, y los fallos de `batch-clean` quedaron en #111. El review-diff se hizo en una sesión nueva.

**Prompt 21:**

*Contexto.* `web-admin-fees` (PR #113, issue #80, parte 1 de 3): las pantallas de `admin-fees`. Solo frontend:
- la vista global `/fees`, de solo lectura y con estado `active` por defecto;
- la página `/accounts/$accountId/fees`, con alta, edición según uso, cambio desde una fecha, cierre e historial;
- la entrada Fees del menú, que deja de estar en "Soon".

Además, en un intento `processed`, quien no tiene `payment.process` ve en el Settlement Summary que el intento espera a alguien con ese permiso. Se construyó contra el contrato publicado por #112 y con MSW, en una rama apilada que se rebasó con `git rebase --onto` cuando #112 se fusionó.

*Prompt.* Proponer el change a partir del design D2 y la delta spec de `admin-fees`, sin tocar el API, la base ni la colección Bruno. Si una tarea pide cambiar un esquema de `@recon/shared`, parar y avisar; ningún esquema se duplica en el front. Después, aplicar grupo a grupo con test primero. Más restricciones:
- Dinero y porcentajes como texto de punta a punta, sin `parseFloat` ni `Number`.
- La pantalla no calcula reglas: estado, uso, fecha mínima de cierre, solapes y orden vienen del API.
- Las capturas, contra el backend real, en el último grupo, con la base sembrada por la persona.

*Resultado.* **El design.** Un solo formulario con tres modos (alta, corrección y cambio desde una fecha) que envía solo lo que cambia. Compara los importes como texto normalizado, así que `"15"` y `"15.0000"` son el mismo. El porcentaje pasa a fracción desplazando la coma sobre el texto. "Hoy" en Nueva York solo da el valor por defecto de **Close…**; el mínimo lo pone `lastAppliedEventDate`. El MSW de fees valida consultas y cuerpos con los esquemas de `@recon/shared` y no decide solapes ni uso: cada test guiona esas respuestas. `GET /accounts/{id}/fees` y `GET /fee-types` se movieron a ese fake sin cambiar lo que ve Settlement Review.

**Las capturas.** A 1024 px las dos tablas se salían de su tarjeta, porque las celdas de shadcn no parten el texto. En la tabla de la cuenta se parten el tipo y las acciones. En la vista global, el merchant y el proveedor pasan bajo la cuenta, en la misma celda. El seed no deja ningún fee en uso, así que el script procesa `batch-clean` antes de capturar.

**La revisión.** El `review-diff` del grupo 9 no cuenta, porque lo hizo el mismo agente sobre su propio trabajo. La revisión en una sesión nueva aprobó con cambios menores, resueltos en el grupo 11, cada uno con su test:
- A 1024 px, la insignia de estado del Summary quedaba bajo **Processed by**. Ahora se parte, y **Processed by**, **Paid by** y **Undone by** solo se parten entre usuario, fecha y hora.
- El porcentaje se compara con 100 como texto, sin `Number`.
- Tras escribir, el foco va al **History** del fee escrito. La validación local lleva el foco al primer campo con error.
- La búsqueda de `/fees` sigue a `q` de la dirección al ir atrás o adelante.
- El fake respeta `asOf` en los fees de la cuenta.

Una nota de #94 recoge que los scripts de capturas no detectan elementos solapados dentro de una rejilla. Frontend, 790 tests.

*Ajuste humano.* El aviso de espera del pago lo decidió la persona antes del change. Al ver las capturas, decidió con el agente poner el merchant y el proveedor bajo la cuenta, porque con diez columnas la tabla no cabía a 1024 px. Sembró la base dentro de la sesión para las capturas. Tras la revisión solo se regeneró `summary-waiting-analyst`, sobre una base recién sembrada. La revisión se hizo en una sesión nueva, sobre el diff ya rebasado.

**Prompt 22:**

*Contexto.* `admin-accounts` (PR #117, issue #80, parte 2 de 3): administración de cuentas en el backend. Completa además la parte de `accounts` de #21. Añade:
- `POST /providers/{id}/accounts`, que puede copiar los fees activos de otra cuenta del mismo proveedor;
- `PATCH /accounts/{id}`, para editar, cerrar y reabrir;
- `409 account_inactive` al subir un import a una cuenta cerrada;
- la lectura `GET /providers/{id}/matching-rule-sets`, que amplía después `admin-matching`;
- campos nuevos y aditivos en las lecturas de cuentas y canales.

Los canales siguen siendo de solo lectura. Sin migraciones: el `UNIQUE` del nombre, las `CHECK` y `FeeHistory.action = copied` ya existían. Las pantallas van en `web-admin-accounts`.

*Prompt.* Proponer el change siguiendo el patrón de escritura de `admin-fees`: bloqueo por cuenta, reintento ante interbloqueo, historial y auditoría en la misma transacción. Como allí, el primer grupo publica el contrato con las rutas en `501` y espera la confirmación de la persona antes de seguir. Más restricciones:
- Reglas de cuenta y plan de copia, como funciones puras con test primero y rotura a propósito.
- Concurrencia con compuertas.
- Bruno repetible sin sembrar, y los tests con listas exactas de cuentas, robustos ante las que deja la colección (lección de #111).
- Integración y Bruno, con turno de base de la persona.

*Resultado.* **El design.** Las escrituras viven en un módulo `accounts` nuevo; las lecturas siguen en `catalog`. La copia bloquea la cuenta origen antes de leer sus fees, así que un cambio de fee en curso termina antes o empieza después. Solo copia los fees `active` del día de Nueva York, con vigencia `NULL…NULL` y una fila `copied` cada uno. El nombre es único en todo el sistema y sin distinguir mayúsculas. Tiene dos barreras: una comprobación previa y, detrás, el índice, reconocido por su número de error. El wireframe decía "unique per provider", y la pantalla tendrá que decir "unique" a secas. La cuenta cerrada se comprueba en la subida sin bloqueo; un import creado milisegundos antes del cierre sigue su curso.

**Durante el apply.** Los tests de integración de crear y editar no se vieron en rojo antes de implementar, porque no había turno de base. Se compensó en el grupo 4: sin la escritura de la fila `copied`, el fichero falla. Las otras roturas también se vieron caer: sin la comprobación previa ni el respaldo del índice, y sin el bloqueo de la cuenta origen. La colección crea cuentas `bruno-<id>` en Provider C y las deja cerradas, y `seedAccounts()` las ignora en los tests. La integración completa dio 416/416 con la base recién sembrada. Tras dos pasadas de Bruno fallaban 59 tests de settlement y validación, todos de #111. El verify no encontró críticos; su aviso 2 llevó "Canales de solo lectura" a aceptar RAM-07 sin cuenta o con ProviderA-USD.

**El review-diff.** Tres medios y siete menores. M2 y dos menores estaban en rojo antes del arreglo; el resto refuerza tests que ya pasaban.
- **M1.** `catalog.int.test.ts` compara cada `assignedInBatchNo` con el batch leído de la base.
- **M2.** Un `matchingRuleSetId` por encima de `INT` respondía `500`; ahora es `400`.
- **M3.** El test de copia y cambio simultáneos sacaba conclusiones del orden final. Tras una re-revisión comprueba que el cambio no termina mientras la copia está retenida y que el importe copiado es siempre el de antes. Sin `lockSourceAccount`, falla.
- **Menores.** Los ids del detalle de `account.create` van en minúsculas, el tope `"-0"` se guarda como `0.0000`, y una escritura fallida no deja nada.

*Ajuste humano.* La persona confirmó el contrato publicado antes de seguir y dio los turnos de base para la integración. Ejecutó `pnpm test:api` dos veces seguidas sin sembrar: todo lo de cuentas pasó las dos veces. Aprobó como criterio que los timeouts de 5 s por carga local (arranque de la app, `export-openapi` y Argon2), que pasan aislados, no bloquean el cierre: el CI decide.

**Prompt 23:**

*Contexto.* `admin-matching` (PR #121, issue #80, parte 3 de 3): administración de las reglas de pareo en el backend. Completa además la parte de `matching` de #21. Añade:
- crear, ver y editar conjuntos de reglas por proveedor;
- leer y editar las reglas globales y los alias de estado;
- `409 rule_set_name_taken` (nombre único por proveedor) y `409 rule_set_in_use` (desactivar un conjunto con cuentas enlazadas).

Las filas a ignorar quedan de solo lectura hasta #120. Sin migraciones: ninguna tabla referencia el id de una regla, así que reemplazarlas no rompe nada. La pantalla va en `web-admin-matching`.

*Prompt.* Proponer el change con el patrón de escritura de `admin-accounts` y sin tocar `rulesFor()` ni `propose-mapping.ts`: el efecto de un cambio de reglas solo se fija con tests. Como en los dos changes anteriores, el primer grupo publica el contrato con las rutas en `501` y espera la confirmación de la persona. Más restricciones:
- Validación y comparación de reglas, como funciones puras con test primero y rotura a propósito.
- Concurrencia con compuertas.
- La colección, repetible sin sembrar y sin depender de `batch-clean` (#111).
- Integración y Bruno, con turno de base de la persona.
- Sin `cd` ni código en línea.

*Resultado.* **El design.** Un `PUT` recibe el documento completo. Los esquemas son estrictos, así que un id de regla o `rowIgnoreRules` en el cuerpo dan `400` sin código propio. La coherencia de hoja, ciclo y estado va en el dominio, para responder con un `details.field` exacto (`sheetRules[2].statusId`). Gana la última escritura, con la fila del conjunto en `UPDLOCK`; las globales no tienen fila que bloquear y usan `sp_getapplock`. El control optimista necesitaría una migración y queda fuera.

**Durante el apply.** Tres cambios fuera del plan:
- Reenviar el detalle no es un cambio, aunque las reglas lleguen en otro orden de prioridades. Reordenar reglas de igual prioridad sí lo es, porque cambia el desempate.
- Un `PUT` solo reemplaza las listas que cambian, así que renombrar conserva los ids.
- La comprobación de clave duplicada pasa a `duplicate-key.ts`, compartida con `admin-accounts`.

Las roturas se vieron caer:
- sin `UPDLOCK` o sin `sp_getapplock`, el segundo `PUT` simultáneo confirma durante la espera del primero;
- con la propuesta fijada en la subida, falla "Import subido sin confirmar".

La primera vez, esa última rotura se revirtió sin ejecutarla, por un error del agente. Integración completa, 450/451: el test de 20 000 filas pasó de 20 s justo tras la siembra y, solo, tardó 14,1 s.

**El verify.** El design no recogía la comparación estable ni el reemplazo por lista, y la ruta y el README describían mal el `PUT`. Faltaba el test de "Conjunto vacío". El escenario "Alias nuevo" se comprueba con `rulesFor()` y no con una propuesta real, y queda así.

**El review-diff** (aprobado con cambios menores):
- **M1.** El proposal, los comentarios del contrato y la fila global del README seguían sin decir que se reemplazan las listas que cambian.
- **M2.** El negativo de `rowIgnoreRules` en Bruno parte ahora de lo que devuelve el `GET`.
- **M3.** Faltaba un test de una regla global cambiada: ids nuevos, filas a ignorar intactas y restauración.
- **Menores.** `@LockTimeout` de 10 s, menor que los 15 s de la transacción. Ids conservados al renombrar y nuevos al editar, también en Bruno.

Bruno, 230/230 peticiones y 242/242 tests.

*Ajuste humano.* La persona confirmó el contrato publicado y dio los turnos de base para la integración, la concurrencia y las dos pasadas de Bruno. El agente anotó en `tasks.md` y en el PR sus incidencias de proceso: dos `cd` y un `python -c` en línea contra las reglas de la sesión, y un commit cuyo mensaje no coincide con su contenido, que no se reescribió para no forzar el push.

**Prompt 24:**

*Contexto.* `web-admin-accounts` (PR #119, parte 2 de #80): las pantallas de cuentas y canales sobre el API de `admin-accounts`. Solo frontend, sin cambios de API ni migración. Añade:
- **Account Detail** (`/accounts/$accountId`) con dos pestañas, Overview y Fees. La página de fees de la cuenta pasa a ser la pestaña Fees (`AccountFeesPanel`, extraído de `features/fees` sin duplicarlo).
- Crear, editar, cerrar y reabrir cuentas con `account.manage` (solo `admin`).
- **Channel Assignment** (`/channel-assignment`), de solo lectura y habilitado en el menú.
- El motivo del `409 account_inactive` en New Reconciliation.

Se construyó contra MSW mientras `admin-accounts` terminaba sus grupos 3 y 4; solo las capturas necesitaban el backend real.

*Prompt.* Proponer el change tomando como contrato el proposal, el design (D2) y las delta specs de `admin-accounts`, y después aplicarlo grupo a grupo con test primero y una rotura a propósito por grupo. Más restricciones:
- Solo frontend: si una tarea pide cambiar un esquema de `@recon/shared` o el API, se para y se avisa, porque eso es de `admin-accounts`. No se duplican esquemas en el front.
- El fake de MSW valida con los esquemas de `@recon/shared` y no decide reglas de negocio: los `409` y los `400` de dominio los guiona cada test.
- El dinero, como texto de punta a punta: el tope nunca pasa por `number`.
- Los formularios no se cierran ante un error y conservan lo escrito.
- Capturas a 1280 y 1024 px contra el backend real, con turno de base; las cuentas que crean llevan el prefijo `bruno-` y quedan cerradas.
- Review-diff en una sesión nueva.

*Resultado.* **El design.** La extracción de `AccountFeesPanel` se hizo primero y sola (grupo 2), protegida por la suite de fees, que solo cambió el título. El menú marca **Accounts** dentro de una cuenta, también en su pestaña Fees: revierte el `activeWhen` de `web-admin-fees` D2 y queda recogido en la delta de `web-shell`. El texto de ayuda dice `Name must be unique`, porque el README y el API hacen el nombre único en todo el sistema, no por proveedor como decía el wireframe. Channel Assignment hace una llamada por canal (`GET /channels/{id}/accounts`), como mucho 9, para "Since" y las cuentas históricas.

**La rama.** Iba a avanzar por fast-forward sobre `admin-accounts`, pero ya tenía commits: se rebasó sobre esa rama y, cuando se fusionó (#117), con `git rebase --onto` sobre la rama de entrega.

**Las capturas.** A 1024 px la tabla de Accounts se salía 9 px de su tarjeta y recortaba la columna Fees. Ahora la cabecera de la política y el nombre de la cuenta pueden partirse. El script mide también un nombre de 50 caracteres sin espacios, que con el frontend anterior daba 360 px de más.

**El review-diff.** Veredicto "aprobar con cambios menores". Cada arreglo llevó su commit de test y después el del arreglo:
- Las consultas por canal de Channel Assignment suben a la página, así que un fallo muestra `Could not load channels.` y **Retry** pide solo la que falló. Sin ellas entre las fallidas, el test cae.
- Un `5xx` ya no se presenta como error de red: cada uno tiene su texto.
- Sin merchant elegido, el foco va a Merchant y no al select de proveedor, que está deshabilitado.
- El mensaje general recupera el foco aunque repita el texto (`Nothing to save.` dos veces seguidas).
- El nombre de 50 caracteres se mide en cinco sitios más (título de la ficha, panel Edit, diálogo Close…, Channel Assignment), y los cinco lo parten.
- Las pestañas dejan de ser `role="tab"`: un `tablist` promete navegación con flechas dentro de una página, y aquí cada pestaña es una ruta. Pasan a un `<nav>` con enlaces y `aria-current="page"`.

La re-revisión pidió que los tests que escuchan `request:start` retiraran solo su listener y que la columna Role here también partiera el nombre. El verify solo dejó sugerencias de texto en el design y el proposal.

*Ajuste humano.* La persona decidió con el agente mostrar "Since" y las cuentas históricas en Channel Assignment pese a las llamadas por canal: el volumen es pequeño y es lo que el administrador viene a comprobar. Hizo los force push de los rebase con `--force-with-lease`, que el agente le pasaba ya escrito. Sembró la base para las capturas y pidió el review-diff en una sesión aparte.

**Prompt 25:**

*Contexto.* `web-admin-matching` (PR #124, cierra #80): las pantallas de **Matching Rules** sobre el API de `admin-matching` (#121). Solo frontend, sin migración ni cambios de API. Añade la lista de conjuntos de un proveedor con **Global defaults**, el detalle de un conjunto con sus cuentas, crear (vacío o como copia), editar reglas en modo edición de página, renombrar, desactivar y activar, y las reglas globales con los alias de estado. La Overview de Account Detail enlaza a su conjunto o a las globales, y el menú habilita Matching Rules.

*Prompt.* Proponer el change con el design y la delta `matching` de `admin-matching` como contrato, y aplicarlo grupo a grupo con test primero y una rotura a propósito por grupo. Más restricciones:
- Solo frontend: si hace falta cambiar un esquema de `@recon/shared`, se para y se avisa a la otra sesión.
- La rama integra `admin-matching` y la de entrega **por merge**, nunca con rebase ni force push. El PR se abre cuando `admin-matching` esté fusionado.
- El navegador no decide reglas de dominio: solo aplica los esquemas `*Input` y adapta los campos al tipo de hoja. Regex, patrones repetidos, `Pending` y ciclo natural los decide el `400` del API.
- Ningún cuerpo lleva ids de regla, `rowIgnoreRules` ni `statuses`.
- Capturas contra el backend real con turno de base, y review-diff en una sesión nueva.

*Resultado.* **El design.** Un solo editor de reglas para conjuntos y globales (`RulesEditor`, con `useFieldArray` por primera vez en el proyecto). El formulario siempre parte del último `GET`: un `PUT` puede dar ids nuevos, así que el frontend nunca guarda ids entre ediciones. Por eso se descartó editar regla a regla en un panel, como en el wireframe. El orden se cambia con **Move up** / **Move down** en lugar de arrastrar, y una nota fija explica que el orden solo desempata a igual prioridad. Account Detail no tiene pestaña de reglas: el conjunto es del proveedor y lo comparten varias cuentas, y editarlo ahí cambiaría las de las otras sin que se vea. La elección merchant → proveedor se extrajo de Accounts a `provider-choice.tsx`, protegida por `AccountsPage.test.tsx` sin cambios.

**El fake.** Da ids nuevos a las dos listas en cada `PUT`, para no decidir qué lista cambió; durante el apply se corrigió el design, que decía que un `PUT` siempre los cambia. Las filas del formulario dejaron de llevar clave propia, porque `useFieldArray` ya genera la `key` de React.

**Las capturas.** La tabla de edición de reglas de hoja medía 138 px más que su tarjeta a 1024 px. Se estrecharon las celdas y los controles de las filas editables, y el error de un campo se parte dentro de su columna.

**El review-diff.** Arreglos con su test:
- Sin catálogo de estados, junto a `Statuses are not available.` hay un **Retry** que habilita **Edit rules**.
- El `Reason` del modo edición, con `maxLength` de 500, como Rename y Deactivate/Activate.
- `rule_set_name_taken` en el modo edición, que no tiene campo de nombre, sale como mensaje general.
- Las casillas pintan su error; un `400` en `cycle` o `statusId` que el tipo de hoja oculta va al mensaje general, con la misma regla de qué campos se ven que usa la tabla.
- Un test se atribuía la garantía de "sin ids", que vive en `rule-form.test.ts`, y se renombró.
- Un nombre de 80 caracteres se mide también en Rename, Deactivate y el enlace de la Overview.

La re-revisión aprobó. La spec cambió el escenario de las migas a `analyst`, porque `viewer` no ve el conjunto del merchant 2.

*Ajuste humano.* La persona sembró la base para las capturas y pidió el review-diff en una sesión nueva.

**Prompt 26:**

*Contexto.* `settlement-reserve-chargeback` (PR #127, issue #62): con `release_on_chargeback`, el primer ajuste de una transacción (`Chargeback`, también `CHB 2`, `Refund` o `RDR`) libera de inmediato toda la reserva retenida en su E vigente. Es el grupo de `settlement-process` que se recortó de la Entrega 2. Solo backend: dominio, lectura de la fuente, validación de faltantes R, tests, Bruno y documentación. Sin migración, sin seed y sin cambios de contrato: las columnas `reserveEarlyReleasedAmt` y `reservePolicySnapshot` ya existían.

*Prompt.* Proponer el change con las decisiones abiertas para el gate y después aplicarlo grupo a grupo, con TDD en el dominio y el oráculo de `batch-issues`. Más restricciones:
- Al regenerar las muestras solo puede cambiar `batch-issues/expected.json`; si cambia un `.xlsx` u otro oráculo, se para y se pregunta.
- La integración y Bruno, con turno de base.
- Commit y `git push` al cerrar cada grupo, vigilando el CI con `gh … --jq`.
- No renombrar la política, el requisito ni la etiqueta del summary.

*Resultado.* **El design.** Un paso puro nuevo, `adjustment-reserve.ts`, después de `buildMovements` y antes de los fees. Para cada I, el resultado sale en orden: `held_until_term`, `no_held_reserve`, `released_in_r`, `already_released` o `released`. La liberación se guarda en el I, nunca en el E original, que puede estar en un batch pagado. El estado previo de cada reserva se lee en una consulta por lotes (`reserveStates`) dentro de la transacción del proceso, y en validación `heldReserves` lee la liberación de los I vigentes en lugar del E, donde siempre valía 0.

**Durante el apply:**
- Al regenerar, los seis `.xlsx` cambiaron de bytes con el openpyxl local, pero tenían las mismas celdas, y se restauraron.
- `prefilledBatchFees`, el ayudante de test que hace de analista, dejaba fallar la carga de `batch-issues` por un fee fuera del catálogo. Se arregló solo en el montaje del test; producción ya lo conserva como importe libre con advertencia.
- Los casos de integración pasaron a la primera, porque la implementación era de grupos anteriores. El rojo se vio vaciando a propósito `reserveStates` en el loader: cayeron 4 casos, con 7.5100 en lugar de 151.8930.
- El comando de las tareas para filtrar un archivo de integración corría la suite entera, y se cambió por `vitest run --project integration <archivo>`.

**El review-diff.** Veredicto "aprobar con cambios menores". El hallazgo principal: dos imports del proveedor procesados a la vez podían liberar dos veces la misma reserva, con un ajuste en cada import o con una RR en uno y un ajuste en el otro, y ninguna validación lo dejaba visible. Se cerró sin migración: tras los bloqueos del número y de canales, el proceso vuelve a leer `reserveStates` y recalcula el plan. Hay dos tests de concurrencia con compuertas, y sin la segunda lectura el proceso que esperaba vuelve a liberar (18.2030 y 25.1150). Más arreglos:
- La proposal y una spec decían que `batch-issues` trae RDR, y no trae. Se añadió un caso de integración con un RDR que libera.
- El caso `hold_until_term` exige un E vigente con reserva.
- La limpieza cuenta también `AuditLog` y `ValidationIssue`.
- Cuatro títulos de test empezaban en español.

El verify añadió un caso de la vista de un intento que guarda la advertencia antigua en su auditoría.

**Las re-revisiones.** Dos, con cambios. Pidieron el test de RR + ajuste entre dos cuentas y que `released_in_r` se comprobara estricto. Entre dos cuentas el segundo proceso esperó en el bloqueo del número, pero esa espera es incidental y depende del plan de ejecución. Fuera de los tests protege el bloqueo de canales, y que retenga por sí solo no queda probado: aislarlo pide cambiar la consulta de `lockNumber` (`FORCESEEK`) y queda en #67. Bruno, 232/232 sobre una base recién sembrada.

*Ajuste humano.* En el gate, la persona decidió:
- **P1. Qué se libera:** todo el `reserveHeldAmt` del E vigente, sin prorratear por el importe del ajuste. Un refund parcial libera la reserva entera.
- **P2. Política:** la de la cuenta que procesa el ajuste, aunque el E sea de otra cuenta del proveedor.
- **P3. R y ajuste en el mismo batch:** gana la R.
- **P4. Estados que liberan:** `Chargeback`, `Refund` y `RDR` por igual. La propuesta inicial liberaba solo en `Chargeback`.
- **P5. Varios ajustes:** solo libera el primero; los demás quedan en 0 con `already_released`.
- **P6.** La historia sembrada no se reescribe.
- **P7.** La advertencia antigua se queda en el contrato para los intentos ya procesados.
- **P8.** Se mantienen los nombres, y renombrar la etiqueta del summary queda en #125.

En el grupo 1 decidió no tocar la muestra para añadir RDR, que se cubre con builders e integración, y aprobó el bloque nuevo del oráculo. Dio los turnos de base, sembró y ejecutó Bruno.

**Prompt 27:**

*Contexto.* `import-guardrails` (PR #135, issues #92, #63 y #40): tres correcciones de reglas en un solo change, sin migración ni seed.
- **Batch sin filas asociadas (#92).** Un import sin ninguna fila asociada del proveedor de la cuenta exige confirmarlo (`confirmEmptyBatch`) en el review y al procesar; sin ella, `409 no_matched_rows`. La vista previa lo informa sin 409, y se avisa de la cuenta probablemente equivocada. El aviso de canales marca los de otro proveedor, y el motor nunca procesa una fila ajena.
- **`status_mismatch` con el gateway en `Pending` (#63).**
- **Tope de 10 archivos por import (#40)**, con `409 import_file_limit_reached`.

Toca backend, contrato, Analysis & Validations, Settlement Review, Upload Files, una muestra nueva y Bruno. La pantalla Analysis queda fuera, porque la estaba cambiando `web-ambiguous-rows` en otra sesión (#131).

*Prompt.* Proponer el change con las decisiones abiertas para el gate, con el README actualizado antes del código, y aplicarlo grupo a grupo con TDD en el dominio y la muestra nueva como oráculo. Más restricciones:
- Nunca tocar `features/imports/analysis`, comprobado con `git diff --stat`.
- Al regenerar las muestras solo puede aparecer la carpeta nueva; si cambia cualquier otro archivo, se para y se pregunta.
- La integración y Bruno, con turno de base. Los tests de integración usan números de batch 98xx y no mueven el propuesto de ProviderA-USD.
- Commit y `git push` por grupo, sin `--no-verify`.
- Review-diff en una sesión nueva.

*Resultado.* **El design.** Un solo cálculo del batch vacío: una consulta de los hechos (`JSON_VALUE` sobre `detailJson`, sin migración) y una función pura, `emptyBatchOf`, que usan igual el detalle del import, el review, la vista previa y process. No sirve `Import.rowsMatched`, porque cuenta también las filas de otro proveedor. En review y process la comprobación va dentro de la transacción, después de las de la corrida, así que un import con filas ajenas siempre dice antes `provider_mismatch`, y un `409 no_matched_rows` no consume el número. Los cambios de contrato son solo aditivos.

**Durante el apply:**
- Al regenerar, los `.xlsx` existentes cambiaron otra vez de bytes con el openpyxl local, con las mismas celdas, como en `settlement-reserve-chargeback`. Quedó documentado en `data/samples/README.md`.
- El invariante de filas ajenas fue a una función propia, `assertOwnProviderRows`, sin cambiar la firma de `classifyRows`.
- La transacción `Pending` de #63 se creó sobre un proveedor aislado (9502): una en un canal sembrado alteraría los contadores de las suites que corren a la vez.
- El `409` del tope quedó en integración y no en Bruno: harían falta once archivos distintos, y la colección tiene ocho.
- El verify señaló sin cobertura de punta a punta la fila ambigua resuelta, que deja de pedir confirmación, y se añadió.

**El review-diff.** Siete puntos, cada uno con su test y su rotura:
- Las reglas de conteo de los hechos: una fila `unmatched` sin motivo o con un motivo desconocido es un error de datos, no un cero.
- Tras el `409` del tope no queda nada en la carpeta de preparación.
- La casilla del batch vacío se desmarca al cambiar la vista previa, como la de canales.
- La casilla no se hereda entre corridas: el `DecisionBar` se monta uno por corrida.
- `previewOf` exige el batch vacío ya juzgado, y lo garantiza el compilador.
- El `beforeAll` de la integración borra los intentos 9801–9803 de una pasada interrumpida.
- Bruno comprueba que el procesado rechazado no crea ningún intento.

La revisión de los arreglos pidió tres más: rechazar filas propias fuera de un grupo `matched`, un único review por corrida nueva y acotar el borrado del `beforeAll` a ProviderA-USD. Bruno, 272/272 en la primera pasada; en la segunda fallan los mismos 27 de #111.

*Ajuste humano.* En el gate, la persona decidió:
- **P1. Criterio:** ninguna fila `matched` del proveedor de la cuenta; las ambiguas resueltas cuentan, y "todo excluido" no pide confirmación.
- **P2.** La confirmación en review y en process. La de process protege el número y el pago.
- **P3.** `likelyWrongAccount` lo calcula el backend.
- **P4.** `otherProvider: true`, sin valor nuevo en el enum.
- **P5.** La forma de `Skipped` no cambia; una fila ajena es un invariante que falla con un error claro.
- **P6.** `status_mismatch` con `Pending` es un hallazgo dentro de `non_recorded_adjustment`, no bloqueante.
- **P7.** Muestra nueva `batch-wrong-account` sin seed.
- **P8.** Tope de 10 archivos en total, con su propio `409`.

Antes había elegido no bloquear un batch solo de fees, que es legítimo, sino pedir una confirmación explícita. Dio el visto bueno a restaurar los `.xlsx`, dio los turnos de base, lanzó las pasadas de Bruno y decidió no repetirlas por los fallos conocidos de #111.

**Prompt 28:**

*Contexto.* `web-rows-table-compact` (PR #136, issue #132): la tabla de filas del paso Analysis no cabía a 1024 px (167 px de más sin la fila ambigua y hasta 250 con ella). Solo frontend, sin migración ni cambios de API. La rama ya traía arreglos con sus tests: textos partidos, anchos fijos para archivo y resultado, importe y moneda en una sola columna **Amount** y menos relleno. Con ellos la tabla cabía, pero con 1 px de margen. El change quita la columna **Row**: el número de fila va junto a la hoja (`APP · row 2`).

*Prompt.* Proponer un change pequeño que recoja en la spec lo ya hecho y la fila con la hoja, con al menos 20 px de margen a 1024 px en las cuatro pantallas y sin partir cifras ni IDs. Test primero en `RowsTable.test.tsx`, con turno de base para las capturas, y review-diff en una sesión nueva. Más restricciones:
- No tocar el backend, `packages/shared`, el contrato ni la colección Bruno.
- El requisito de la tabla, reescrito en menos de 500 caracteres.

*Resultado.* **El design.** La hoja va en su propio elemento para que el script de capturas la siga leyendo sin el número. El margen se mide una vez al verificar, con una medida temporal sin versionar, y el script sigue fallando con cualquier desborde: fijar un umbral lo haría frágil ante cambios ajenos a esta tabla. La cabecera sigue siendo `Sheet · file`, porque la celda ya dice `row`.

**Las medidas.** El PR recoge la evolución a 1024 px, pasada a pasada: de 167–250 px de más a 1 px libre con los arreglos previos, y a 41 px libres en las cuatro pantallas con la fila junto a la hoja. A 1280 px quedan 265 px. Los anchos fijos tienen una contrapartida: con `max-w`, la tabla estrechaba archivo y resultado a una palabra por línea y la página medía unos 8.300 px de alto; con ancho fijo, el archivo ocupa cuatro líneas también a 1280 px. Un arreglo previo destapó que el nombre del archivo no se partía desde `ui-polish`: la celda heredaba `whitespace-nowrap`, y bajo él `overflow-wrap:anywhere` no hace nada.

**El review-diff.** Encontró que una hoja legacy de 31 caracteres (`Transactions approved by issuer`) no cabía en el ancho fijo y se pintaba encima del ID, sin que la tabla ganara scroll ni el script lo midiera. Ahora el nombre de la hoja se parte y `· row N` va en su propio elemento sin partirse (D3). Además, el `whitespace-nowrap` del ID se comprueba en su span y no en el `<td>`, y salieron el texto `Currency` y un `max-w-24` sobrante. El review-diff aprobó con cambios menores, y una segunda revisión de los arreglos, en otra sesión, aprobó el merge.

*Ajuste humano.* La persona decidió quitar la columna Row y llevar el número junto a la hoja en un change pequeño aparte, con un objetivo de al menos 20 px de margen a 1024 px. Ante el hallazgo de la hoja legacy larga, eligió partir el nombre de la hoja en lugar de ensanchar la celda, como proponía el revisor, porque ensanchar volvería a desbordar a 1024 px (#132). Dio el turno de base y levantó `pnpm db:up`, `pnpm db:seed` y `pnpm dev` para las capturas, y pidió el review-diff en una sesión nueva.

**Prompt 29:**

*Contexto.* `ci-e2e` (PR #147, issue #40): job nuevo `e2e` en la CI. Sobre su propio SQL Server efímero, ejecuta la colección Bruno (`pnpm test:api`), vuelve a sembrar y ejecuta el E2E de Playwright (`pnpm test:e2e`), contra el API compilado y la web servida con `vite preview`. El informe de Playwright se sube como artifact solo si el E2E falla. Se desarrolló en paralelo con `e2e-user-stories`, de otra sesión, que escribía la suite que este job iba a ejecutar. Sin cambios de código de la aplicación ni migración.

*Prompt.* Proponer el change a partir de la casilla de #40 y del README, que dejaba ese job para la Entrega 3, y después aplicarlo grupo a grupo con push al cerrar cada uno. Restricciones de partida:
- Ninguna tarea usa la base local: lo que necesita SQL Server se comprueba en la CI de la rama.
- No tocar `e2e/features` ni `e2e/steps`, que son de la otra sesión.
- La ejecución en local queda exactamente como la documenta el README §1.4.
- La aplicación, la migración y el seed conectan como `recon_app`, nunca como `sa`.
- Las roturas deliberadas se hacen en la CI y se deshacen con `git revert`, nunca con `git checkout` sobre trabajo sin commit.

*Resultado.* **El design.** Cuatro decisiones con su alternativa descartada:
- **Un solo job** con las dos suites y un `pnpm db:seed` entre ellas (#111), frente a dos jobs que repetirían la preparación, que es la parte cara. La siembra y el E2E llevan `if: ${{ !cancelled() }}`, para que un fallo de Bruno no tape el resultado del E2E. "Reutilizar el SQL Server de integración" se cumple con el mismo service: dos jobs no pueden compartir un contenedor.
- **API y web levantados por pasos del workflow**, no con `webServer` de Playwright, porque Bruno necesita el API antes de que empiece Playwright. Con el build de producción y no `pnpm dev`, para no pagar la transformación de módulos de `vite dev` en el primer paso.
- **Caché del Chromium** con la versión de Playwright en la clave, no el lockfile.
- **Informe solo si falla el paso del E2E**, no con `failure()`: así un fallo de Bruno no sube el informe de un E2E en verde.

**Las roturas en la CI.** Dos commits temporales, revertidos:
- Sin la siembra entre Bruno y el E2E, el smoke falla en `RAM-07 is not assigned yet` y se sube `playwright-report`. Descargado, no trae `trace.zip` ni `.webm`, y ninguno de los cuatro valores secretos del job aparece en él.
- Con una contraseña equivocada para Bruno, la colección falla en `00-auth` con 401, la siembra y el E2E corren igualmente, el smoke pasa y el check falla sin artifact.

**La duración.** Se estimaron 7–9 minutos y se midieron entre 5 min 12 s y 5 min 29 s. Como corre en paralelo con `integration`, no alarga el pull request.

**El verify.** Sin errores de código. Dejó una tarea pendiente por diseño, marcar #40 tras el merge, y un aviso: D6 y la tarea 2.4 decían `failure()`, cuando el código usa la condición del paso del E2E. Se corrigió el texto.

**El review-diff.** Pidió mostrar los logs del API y la web al fallar, `curl --max-time 5` en la espera, `timeout-minutes: 20` y que el paso falle si la versión de Playwright sale vacía, porque una clave de caché sin versión serviría la misma caché a cualquier Playwright. Una tercera rotura con la contraseña equivocada comprobó que el último paso muestra las últimas 200 líneas de `api.log` y `web.log`, sin contraseñas. Un último arreglo hace que esos logs salgan también cuando el job se cancela por el límite de tiempo.

*Ajuste humano.* En el gate, la persona decidió:
- un solo job por ahora; cuando entre la suite de la otra sesión se mide y, si hace falta, se parte en un change pequeño;
- repartir el README: este change cambia la tabla de pruebas, el párrafo de la CI de §1.4 y la línea "En pipeline", y los párrafos del E2E y del smoke los cambia la otra sesión con su suite;
- los nombres de usuario de la colección son los del seed.

La casilla de #40 se marcó al fusionar.

**Prompt 30:**

*Contexto.* `e2e-user-stories` (PR #149, issue #38): suite E2E de las historias HU1 a HU3 en Gherkin con playwright-bdd, contra la aplicación y el API reales. Cuatro escenarios nuevos que, con el smoke, dejan la suite en cinco: flujo feliz con `batch-clean` (`analyst` procesa y descarga el summary, `payments` paga), deshacer y reprocesar con el mismo número (`batch-split`), `provider_mismatch` (`batch-blocked`) y batch sin filas asociadas (`batch-wrong-account`). Se escribió en paralelo con `ci-e2e` (#147), de otra sesión, que montaba el job que la ejecuta. Sin cambios de API, esquema, migraciones ni seed.

*Prompt.* Proponer el change a partir de README §2.6, que pide el E2E del flujo completo con el flujo feliz, "cancelar y reprocesar" y `provider_mismatch`. Después, aplicar grupo a grupo. Restricciones:
- Ninguna cifra escrita en un paso: todas salen de los `expected.json` de `data/samples/`.
- No tocar `playwright.config.ts`, `global-setup.ts` ni `ci.yml` (son de la otra sesión), ni el frontend, el backend o la colección Bruno.
- La contraseña solo sale de `SEED_PASSWORD`, nunca en un paso, en la consola ni en el informe.
- Las pasadas contra la base, solo con turno de la persona, que siembra antes de cada una.
- Restaurar las roturas deliberadas con `cp`.

*Resultado.* **El design.** Las decisiones principales:
- **Un solo `.feature`.** Con un worker, los archivos van en orden alfabético: el smoke corre antes y el flujo feliz es el primero de `user-stories`. Se comprueba con `playwright test --list`.
- **Base recién sembrada.** Procesar `batch-clean` deja RAM-07 como canal principal para siempre, porque deshacer no lo revierte, y consume números de batch. El primer paso lo comprueba por el API y, si no, falla con `Run pnpm db:seed first`. Se descartó hacer los escenarios tolerantes, porque un paso que comprueba una cosa u otra según el estado no comprueba nada.
- **Limpieza en dos capas.** En verde, cada escenario termina con su limpieza como pasos a la vista: retirar el pago, deshacer y cancelar. Si falla a mitad, un `After` lo deshace por el API.
- **El escenario de deshacer no compara sus validaciones con el oráculo.** En la suite, `batch-split` pasa al 124 y, como un intento deshecho no cuenta como batch anterior, `missing_previous_to_batch` da 633. Las compara el flujo feliz.

**Test primero en `support/`.** La lectura de los oráculos y la decisión de la limpieza (qué acción toca según el estado, en qué orden y con qué usuario) se probaron con `node --test`, sin dependencias nuevas. Se rompieron a propósito el orden intento → import y `formatAmount`. Entran en `pnpm test` con un script de `e2e/package.json`, sin tocar `ci.yml`.

**Las pasadas.** En local, 5 de 5 en verde en 1,0 min con la base recién sembrada, frente a los 5–8 minutos estimados. En el job `e2e` del PR, 26,5 s, y el job entero dura lo mismo que con solo el smoke, así que no hace falta partirlo. Tres roturas deliberadas (el oráculo de `provider_mismatch`, el amount payable de un intento `processed` y uno `paid`) fallaron por su motivo, y en cada una el `After` dejó la base limpia. `SEED_PASSWORD` dio 0 coincidencias en la salida, en `test-results/` y en el informe, incluido el zip que lleva dentro.

**El review-diff.** Tres MEDIUM:
- **M1, cobertura:** los rangos de cada ciclo salen de `expected.ranges`; cada validación compara resultado, hallazgos y columna Blocking; HU1 CA6 compara también las tarjetas Ambiguous e Ignored. D1 y la spec dejan de prometer HU1 CA3 y CA4, y dicen que `provider_mismatch` compara solo esa validación, porque su oráculo no trae las otras siete.
- **M2:** después de procesar, el flujo feliz comprueba por el API que RAM-07 ya no está sin asignar.
- **M3:** el `batchId` sale de la respuesta de `POST /imports/{id}/settlements` y se registra para la limpieza antes de esperar la URL del summary.

De los menores, los fees se comparan como texto decimal (`sameDecimal`) y los pasos del aviso y de la casilla fallan si el oráculo no los trae. B3 y B5 quedaron como estaban. Se rompieron a propósito el ancla de la ruta de `createdBy` y el signo de `sameDecimal`. Segunda pasada: 5 de 5 en 46,7 s, a la primera.

**El verify.** 0 críticos, 0 avisos y una sugerencia: que D7 recogiera también la medición posterior al review-diff.

*Ajuste humano.* En el gate, la persona aprobó que la suite exija una base recién sembrada y el único paso condicional (la casilla de canales del escenario de deshacer), con su comentario. Fijó el reparto del README §2.6 con la otra sesión y que su PR se trajera con un merge, sin rebase. Pidió medir cada escenario y avisar si la suite pasaba de 5 minutos, porque entonces se partiría el job. Pidió test primero también en la lógica propia de `support/`. Dio los turnos de base y sembró antes de cada pasada.

**Prompt 31:**

*Contexto.* `review-inclusion-version` (PR #142, issue #53, que venía del review-diff de `validation-runs`): el review fija las inclusiones que vio el analista. Cada corrida lleva un contador `inclusionVersion`, que sube en la misma transacción del cambio de inclusión. `POST review` exige ese contador y, si no coincide con el vigente, responde `409 inclusions_changed` sin escribir nada. Toca backend, contrato compartido, frontend y colección. Añade la migración `0009_validation_run_inclusion_version`, escrita a mano.

*Prompt.* Proponer el change a partir del issue, con alternativa descartada en cada decisión, y aplicarlo grupo a grupo: commit de los tests en rojo, rotura a propósito y después la implementación, con push al cerrar cada grupo. Más restricciones:
- La migración, escrita a mano y nunca generada desde `schema.prisma`; la aplica la persona.
- Migración, seed, integración y Bruno, solo con turno de base.
- La guarda del review, una función de dominio pura.
- Sin `--no-verify`.

*Resultado.* **El design.** La decisión central fue el contador por corrida frente al `updatedAt` del import. `updatedAt` lo mueven muchas escrituras (también un `PATCH` sin cambio), depende de la precisión de `datetime2` frente a los milisegundos de JS y la pantalla solo lo tendría en otra consulta, así que cada cambio propio daría un `409` falso. También se descartaron:
- contar las `set_inclusion` de la auditoría, que exige `JSON_VALUE` sin índice;
- `MAX(changedAt)` de las apariciones;
- un hash de las inclusiones calculado igual en tres sitios.

Un ida y vuelta (A → B → A) da `409`: es conservador a propósito. La guarda pura `reviewRefusal` fija el orden de las negativas: primero lo que dice que la pantalla está desfasada (la corrida, luego sus inclusiones) y después el contenido (bloqueo y batch vacío).

**Durante el apply.**
- **Falso `409` propio.** Entre la respuesta del `PATCH` y la relectura de la corrida, Continue enviaría la versión vieja. Queda deshabilitado mientras la corrida se recarga, con `Loading the latest results…`.
- **La carrera en integración.** Es determinista: el review se pausa con `beforeClaim`, un `PATCH` confirma un cambio y el review recibe `409` sin auditoría. Sin la comparación de versión, el review aprobaba.
- **Bruno.** La primera pasada llevaba una aserción equivocada a propósito: pasaron 260 de 261 peticiones y la única que falló fue esa.

**El verify y el review-diff.** El verify no encontró errores de código. Dejó como coberturas aceptadas tres casos que solo se prueban con el fake, de riesgo bajo porque el repositorio usa la guarda pura ya probada:
- que una corrida nueva empiece en 0;
- que una resolución a mano no mueva la versión;
- el orden de `inclusions_changed` frente a las negativas de contenido en Prisma.

Las correcciones posteriores:
- el design (D4, D9 y D10) alineado con el código;
- el motivo de bloqueo tiene prioridad sobre "cargando", para que no parpadee durante la relectura;
- cada paso de corrida de Bruno guarda la versión junto al `runId`, y el negativo exige exactamente 1;
- el tipo de los `details` sale del contrato compartido.

*Ajuste humano.* En el gate, la persona confirmó expresamente el cambio de esquema y aplicó ella la `0009` desde la sesión. Dejó fuera de alcance, sin issue de seguimiento, que las resoluciones a mano muevan la versión, y aceptó el `409` del ida y vuelta. La `0009` queda para aplicarse también en el entorno desplegado con `scripts/deploy.sh migrate`, que ejecuta ella. Aceptó las coberturas del verify y dejó #141 (`tsc` no cubre `backend/test/`) fuera del PR. Dio los turnos de base. Repitió un fallo del agente ya visto en `import-in-progress`: el README quedó fuera del commit del backend porque Git lo tiene como `readme.md`, y fue en un commit aparte.

**Prompt 32:**

*Contexto.* `web-analysis-guardrails` (PR #143, issue #131): el paso Analysis aprovecha lo que `import-guardrails` (#92, PR #135) ya devolvía en el detalle del import. La tarjeta `Unmatched` desglosa las filas por motivo, aparece un aviso de cuenta equivocada y el aviso de canales distingue los de otro proveedor. Además, los IDs con guiones se parten por los guiones para que la tabla de filas quepa a 1024 px. Solo frontend, e2e y docs, sin migración.

*Prompt.* Proponer el change a partir del issue y aplicarlo grupo a grupo, con tests RTL primero y una rotura a propósito por grupo. Más restricciones:
- No tocar `features/validations` ni `features/settlements`, que estaba cambiando #53 en otra sesión, ni el backend, el contrato o la colección Bruno.
- En el fake de MSW, que también tocaba #53, solo lo imprescindible, sin reordenar ni reformatear; un conflicto se resuelve con un merge, sin rebase.
- Correr la suite entera del frontend tras cambiar el fake y, si falla un test de esas carpetas, parar y avisar sin tocarlo.
- Las capturas, con turno de base.

*Resultado.* **El design.**
- **El desglose** va dentro de la tarjeta `Unmatched`, en orden fijo y con las mismas etiquetas que la tabla de filas. Se descartó una tarjeta por motivo, porque la fila ya se parte a 1024 px y casi siempre estarían a 0.
- **El aviso de cuenta equivocada** copia la frase de Settlement Review en `imports/strings.ts`, sin "Cancel and reprocess…", porque lo leen también `viewer` e imports cerrados. Se copia en vez de importarse para no acoplarse a un módulo que cambiaba #53, y un test lo compara con la cadena literal.
- **Un canal de otro proveedor** se describe por su proveedor y no por su asignación. Antes salía con textos como "is primary in ProviderA-USD", que sugerían que procesar lo iba a asociar.
- **El fake** devolvía combinaciones que el API ya no puede dar desde #135. Ahora calcula `otherProvider` y la nota igual que el API.

**Las capturas.** Tres pasadas contra el API real:
- La primera falló: con los UUID de 36 caracteres de `batch-wrong-account`, la tabla de filas desbordaba 79 px a 1024 px (#132). Con los IDs numéricos de las demás muestras cabía, por eso no se había visto. Se añadió D8 al change: un ID con guiones lleva un `<wbr>` después de cada guion y se parte solo ahí, y la copia sale entera. No bastaba `whitespace-normal`, porque las reglas de corte de línea no cortan entre un guion y una cifra.
- La segunda dio un falso positivo a 1280 px: la comprobación contaba las cajas del ID y no sus líneas, y con `<wbr>` cada trozo es una caja.
- La tercera, la versionada, mide `fits` en las seis capturas a 1280 y 1024 px.

**El review-diff.** En una sesión nueva, no encontró nada alto ni medio. Comprobó que la columna Result vacía que se creyó ver en una captura no era un fallo, porque la captura versionada muestra `Matched`. Pidió dos comprobaciones más estrictas en el script de capturas: el número de `Unmatched` con una expresión anclada y fallar si la tabla de filas no tiene columna ID.

*Ajuste humano.* Cuando la primera pasada de capturas desbordó con los UUID, la persona eligió corregirlo en este mismo change (D8) en lugar de abrir un issue o capturar sin esa tabla, porque esconder el desborde contradecía #132. Aceptó que, para `analyst` en un import `analyzed`, el aviso de cuenta equivocada salga dos veces: arriba como diagnóstico y abajo en el `DecisionBar`, junto a la casilla. Dejó dos seguimientos: unificar las tres copias del texto después de #53 (#139) y el canal del mismo proveedor sin cuenta principal que se muestra como "of another merchant" (#140). Dio el turno de base para las capturas.

**Prompt 33:**

*Contexto.* `business-dates-no-z` (PR #153, issue #48): las fechas de negocio son hora de Nueva York guardada sin zona, pero el API las devolvía con una `.000Z` que no era UTC. Ahora 7 campos salen como `YYYY-MM-DDTHH:mm:ss` en las 16 operaciones que los devuelven. Es un cambio **BREAKING** del contrato del API, aunque el único cliente es el frontend del monorepo, que cambia en el mismo PR. Los instantes de auditoría siguen con `Z` y las columnas de solo día no cambian. Sin migración.

*Prompt.* Proponer el change a partir del análisis previo de #48 y aplicarlo con test primero y rotura deliberada. Más restricciones:
- Lo que se ve en pantalla y en los CSV no cambia en ningún carácter, en ninguna zona de navegador ni de servidor.
- Sin base local: integración, Bruno y E2E corren en la CI de la rama.
- Los archivos, solo con Edit y Write.
- Un corte de calendario: si el PR no está fusionado a tiempo, el change vuelve al roadmap y #48 sigue abierto.

*Resultado.* **El design.**
- **Formato** sin zona ni milisegundos. Se descartaron los milisegundos, que no aportan nada, y el offset `-04:00`, que obligaría a calcular el horario de verano en el backend.
- **Esquema compartido** `BusinessDateTime`, que rechaza la `Z`, los milisegundos y las fechas imposibles.
- **Backend:** un ayudante `businessDateTime` en los 7 sitios que llamaban a `toISOString()`. Se descartó un serializador global por nombre de campo, porque el mismo nombre podría ser un instante en otro módulo.
- **CSV y frontend** leen los dígitos cortando el texto, sin `Date` ni `Intl`, así que no dependen de la zona del proceso.

La red de seguridad es el `serializerCompiler`, que valida cada respuesta: un sitio olvidado da `500`. Y la suite E2E, que compara la tabla de rangos con `<día> HH:MM <zona>`, sigue en verde solo si la salida no cambia.

**Test primero.** Se vieron en rojo `BusinessDateTime` sin el `.regex`, el `businessTime` antiguo, que desplazaba la fecha con la zona local, y `format.ts` con `TZ = Asia/Tokyo`. El caso "outside UTC" de `businessDateTime` falla con getters locales también con `TZ=UTC`, como en la CI.

**La rotura en la CI.** Un commit temporal devolvió los rangos de validaciones a `.000Z`: `POST` y `GET /validations` y `POST /review` dieron `500`. Integración y E2E no llegaron a correr, porque dependen del job `check`. Se revirtió con `git revert` y la CI volvió a verde en los cinco jobs.

**El review.** Cambios menores:
- en la delta de settlement, el summary del merchant, los totales y la pestaña Movements pasan a MODIFIED sin la `Z`;
- un requisito por debajo de 500 caracteres;
- el caso fuera de UTC dice qué protege;
- el plan de migración avisa de que una pestaña abierta con el frontend antiguo desplaza la fecha hasta recargar;
- `BusinessDateTime` con descripción y ejemplo en el OpenAPI.

Un escenario de la spec de settlement apuntaba al CSV de transacciones, que no lleva fechas, y pasó al CSV del summary. Otro mostraba la fecha de liberación esperada con "ET", y la pantalla la pinta solo con el día. Tras traer la rama de entrega, que incluía el archive de `web-polish-e3` (#125) sobre los mismos requisitos, los MODIFIED de settlement se rehicieron desde la spec viva con sus etiquetas nuevas.

*Ajuste humano.* El primer propose midió 6,25 h y la persona lo pasó al roadmap, con el análisis publicado como comentario en #48. Con tiempo libre lo recuperó, con un corte: si no estaba fusionado esa noche, volvía al roadmap. Ante el choque con `web-polish-e3` en los mismos requisitos MODIFIED de settlement, fijó el orden: archivar primero `web-polish-e3` y rehacer después los MODIFIED de este change sobre la spec viva. Decidió que la spec dijera lo que pinta la pantalla en "Expected release" (sin ET), sin tocar código. Los `toISOString()` de las inserciones masivas hacia SQL quedaron fuera de alcance, porque no son respuestas. En local, la suite completa dio tiempos agotados en `app.test` y `export-openapi`, que pasaban sueltos, y el resultado que contó fue el de la CI.

**Prompt 34:**

*Contexto.* `web-analysis-polish` (PR #158, issue #157): pulido de la pantalla Analysis & Validations tras una revisión visual que encontró tres problemas. La tarjeta de rangos salía pegada a la izquierda, los tres contadores informativos de Validations eran texto suelto con explicaciones de dos líneas, y el nombre del archivo se partía en cuatro líneas en cada fila de la tabla de filas. Cada problema contradecía una frase de las specs vivas, así que la spec cambia antes que el código. Solo frontend, e2e y docs: sin API, esquema, seed, Bruno ni migración.

*Prompt.* Proponer el change con una tabla de las decisiones anteriores que se revierten (`ui-polish` D7, D9 y D10) y las que siguen vigentes. Después, aplicar grupo a grupo con test primero, un commit `test` y otro `feat`, `fix` o `refactor`, y una rotura deliberada por grupo, restaurada con `cp` desde el scratchpad y nunca con `git checkout`. Más restricciones:
- El marco de tarjeta se extrae a un componente común, no se copian clases.
- El tooltip, accesible con teclado y con lector de pantalla también cerrado, sin un `TooltipProvider` global.
- Los tests asertan estructura, no diseño, porque jsdom no calcula el layout.
- El script de capturas, con un tope de 90 minutos: unas medidas imprescindibles (desborde, margen a 1024 px, archivo en una línea sin pisar nada, nombre largo cortado) y otras secundarias que, si no daba tiempo, quedarían como revisión a ojo.
- Las capturas las ejecuta la persona en la sesión, con `!`, para que la salida quede a la vista. Sin `batch-clean` (#111).

*Resultado.* **El design.**
- `StatCard` en `components/` sustituye al marco que `Counters` repetía. Sus tests, sin tocarlos, fueron la red de seguridad del refactor.
- `InfoTip` es el primer uso de `components/ui/tooltip`. La explicación existe una sola vez en el DOM de la tarjeta: el mismo `span` `sr-only` lo nombra el `aria-describedby` del botón y lo lee quien recorre la tarjeta.
- El archivo va en una franja reservada al pie de la fila: `relative` en el `<tr>`, `pb-6` en cada celda y el nombre posicionado con `truncate`. Se descartaron el desborde visible que pedía el issue al pie de la letra, porque pisaba un UUID o una hoja partidos y volvía a ensanchar la tabla (#132), y una segunda `<tr>` por fila.

**La primera pasada de capturas.** Falló por dos motivos:
- `Validation results` medía 65 px más que su tarjeta a 1024 px. El defecto ya existía antes del change: es la primera vez que el script medía esa tabla con una corrida. Se arregló aquí (D8): el desglose va en un ancho fijo, y cada parte en un `span` que no se parte, así que el corte cae solo en el «·».
- El tooltip no se reabría. Radix lo cierra cuando se desplaza un ancestro del botón, así que el script lleva el foco al elemento anterior sin desplazar, pulsa Tab, captura la ventana y comprueba después que `scrollY` no cambió.

Las medidas secundarias sí entraron en el script. Solo el anillo de foco del último **Choose** de la fila ambigua, interceptada como en `web-ambiguous-rows`, se revisó a ojo. A 1024 px, el margen mínimo de la tabla de filas quedó en 35 px, por encima de los 20 px de `web-rows-table-compact`.

**El verify.** La única tarea pendiente era abrir el PR. Dejó dos sugerencias: el corte del desglose solo en el «·» y el tooltip que tapa la fila R de la tabla de rangos, que se dejó como comportamiento conocido.

**El review-diff.** Pidió que el script cancele un import antes de sacarlo de la lista de pendientes y que exija el archivo dentro de su `<tr>`, exactamente tres tarjetas y el corte con `text-overflow: ellipsis`. También, que los tests lean los contadores en el orden del DOM y busquen el desglose por su cabecera. Cada corrección tuvo su rotura: quitar `relative` del `<tr>` hizo fallar las 14 capturas.

*Ajuste humano.* La persona ejecutó el script de capturas en cada pasada contra el stack local, y las 14 imágenes se revisaron a ojo. De esa revisión salió que el desglose se corte solo en el separador, para no dejar un número lejos de su texto. La persona pidió `Closes #157` en el PR, aunque el issue se cierra a mano porque la rama de destino no es la principal. El review-diff lo hizo en otra sesión. En dos de las roturas se restauró con `git restore --source=HEAD` tras comprobar que el diff era solo la rotura, no con `cp` como pedía la tarea.

**Prompt 35:**

*Contexto.* `web-polish-e3` (PR #154, issues #110, #140, #139 y #125): cuatro arreglos pequeños de pantalla pendientes de changes anteriores. Dos son errores visibles: valores inválidos de la dirección que llegaban a la consulta del API (#110) y un canal sin cuenta principal que la pantalla atribuía a otro merchant (#140). Los otros dos son deuda de texto: la frase de cuenta equivocada repetida en tres features (#139) y la etiqueta "chargeback" de una línea que también usan REF y RDR (#125). El backend solo cambia dos etiquetas de texto. Sin migración ni seed.

*Prompt.* Proponer el change con cada arreglo en su propio grupo de tareas y de commits, en orden de prioridad (#110, #140, #125, #139), para poder cortar por el final antes de la entrega sin dejar nada a medias. Test primero en los cuatro, y cada test nuevo tiene que fallar por su motivo; si un test de #110 no fallaba, ese arreglo salía del change. Más restricciones:
- No tocar `format.ts`, los esquemas de `packages/shared` ni las fechas, que son del #48.
- No cambiar el contrato del API.
- Capturas con turno de base y sin procesar nada.

*Resultado.* **Los cuatro arreglos.**
- **#110.** TanStack Router superpone la salida de `validateSearch` sobre la búsqueda cruda, así que una clave omitida con `dropUndefined` conservaba su valor crudo. Los tres validadores devuelven todas sus claves, con `undefined` en las inválidas, como ya hacía `/fees`. Los tests comprueban cada clave y no solo `toEqual({})`, porque `toEqual` no distingue una clave `undefined` de una ausente.
- **#140.** El API ya distinguía los tres casos de `assigned_to_other_account`. Basta con que la pantalla lea `otherAccount = null` como "sin cuenta principal". Un campo nuevo que dijera "esta cuenta lo tuvo antes" habría tocado `shared` y quedó fuera.
- **#125.** `Reserve released on adjustment` en el API, el CSV del summary y la pantalla. Como la etiqueta se calcula en cada lectura, los intentos ya procesados también salen con la nueva. La política `release_on_chargeback` no se renombra, porque exigiría migrar su `CHECK`.
- **#139.** La frase vive en `components/strings.ts`, la capa común, y no en los textos de una feature, para no crear dependencias entre features.

**Lo que salió durante el apply.**
- Un test de Settlement List esperaba los batches 103–101, cuando el seed crea 122–120. Se corrigió en el mismo commit.
- Para que ningún requisito pasara de 500 caracteres, las reglas nuevas fueron como ADDED.
- `packages/shared` sigue usando la etiqueta antigua como dato de un test de esquema. Es zona del #48 y no falla.

**El review-diff.** Pidió cinco correcciones:
- un test de que la lista de hallazgos no se pinta con `validation=foo`;
- las ocho claves de `validateSettlementListSearch`;
- que ninguna petición de Settlement List lleve los valores inválidos, no solo la última;
- el test de la frase común en `src/test/`, para que `components/` no importe de las features;
- GIVEN/WHEN/THEN en negrita en la spec de settlement.

El `/opsx:verify` no se pasó antes de archivar.

*Ajuste humano.* La persona aprobó cambiar también la etiqueta en el CSV del summary, para que pantalla y entrega coincidan, y descartó el campo nuevo de #140. Dio el turno de base para las tres capturas, sobre un batch sembrado como pagado y sin consumir números de batch. El primer commit de la propuesta lo hizo otra ventana, por un mensaje pegado en la ventana equivocada; la sesión lo detectó por el reflog y lo revisó. El PR avisa en cabecera de que cambia una etiqueta del CSV que se entrega al merchant: columnas, orden e importes siguen igual, pero quien lo procese buscando `on chargeback` dejará de encontrarlo. El review-diff se hizo en otra sesión, y sus correcciones entraron en el mismo PR.

**Prompt 36:**

*Contexto.* `demo-video` (PR #161, issue #96): el vídeo de 2–3 minutos que pide la Entrega 3 y que el README ofrece como respaldo si la URL pública no responde. Lo genera un script de Playwright, `pnpm video:demo`, fuera de la suite y de la CI, sobre la base local recién sembrada. Recorre el flujo feliz de `batch-clean` en ProviderA-USD, desde el login de `analyst` hasta **Mark as paid** con `payments`, y lo convierte con ffmpeg a `docs/demo/recon-tool-demo.mp4`. Sin cambios en la aplicación, el API, el esquema ni la CI.

*Prompt.* Proponer el change a partir del issue, con un recorrido de nueve etapas en el que se vean el login de `analyst` y el cambio a `payments`. Más restricciones:
- Reproducible con un comando, entre 2:15 y 2:45, legible sin audio.
- La suite no se toca: ni `steps/`, ni `features/`, ni `support/`, ni `playwright.config.ts`, porque el change se hace el día de la congelación del código.
- Las credenciales, con las mismas garantías que la suite.
- Solo contra la base local recién sembrada, y ninguna pasada deja abierto lo que creó.
- Un solo turno de base para todas las pasadas.

*Resultado.* **El design.**
- **El login se graba** (D1), a diferencia de lo que proponía el issue, porque el recorrido pedido enseña el cambio de rol. La contraseña sale de `SEED_PASSWORD`, se escribe desde la página en un campo que tiene que ser `type="password"` y se vacía tras **Sign in**. Una comprobación al arrancar falla si algún rótulo contiene la contraseña.
- **Duplicación aceptada** (D3). Los steps registran `Given`/`When` al cargarse y no se pueden importar fuera de playwright-bdd. El script copia en `e2e/video/steps.ts` los pasos que necesita, cada uno citando su step de origen, y solo importa lo que ya existía en `support/`.
- **Rótulos en una franja inferior** reservada con `padding-bottom`, y un contorno breve sobre cada botón antes de pulsarlo, porque el vídeo no graba el puntero.
- **Comprobaciones.** El script comprueba las mismas cifras que la suite contra `expected.json`; si una no cuadra, no hay vídeo. La limpieza va por el API y fuera de cámara: retirar el pago, deshacer y cancelar.

**La grabación.** Con las primeras pausas, el vídeo duró 1:47; con 3, 5,5 y 10 s, 2:16. Analizar, validar y procesar tardaron menos de 2 s, así que el recorte de esperas no se escribió. El `.mp4` mide 1,3 MB, en H.264 a 1280×720 y sin pista de audio. Los fallos previos se probaron: sin ffmpeg y con la aplicación caída, el script falla antes de grabar.

**El verify.** Sin críticos. Sugirió actualizar la duración de §0.4 si se regenera el vídeo con otras pausas.

**El review-diff.** En una sesión nueva, pidió cinco arreglos:
- si la limpieza deja notas, el script sale con código 1 y no escribe el `.mp4`;
- la limpieza va en su propio `try/finally`, para que corra aunque falle el cierre del navegador;
- el archivo parcial se crea en el directorio temporal y se copia sobre el destino;
- `setPassword` comprueba `type="password"` en el mismo `evaluate` que escribe;
- el README §2.6 recuerda actualizar la duración.

*Ajuste humano.* La persona decidió versionar el vídeo en el repositorio, en lugar de subirlo a un servicio externo, para que viaje con la rama que se entrega. En el gate pidió no refactorizar la suite y aceptar la duplicación, para no tocarla el día de la congelación. Dio un solo turno de base y sembró antes de cada pasada y al terminar, porque la grabación deja consumido el batch 123 y RAM-07 como principal. Se revisaron los fotogramas de cada pasada: cada rótulo en su etapa, ninguna cifra bajo la franja y la contraseña solo como puntos. Se grabó solo en local: el script fija la dirección de la aplicación local y no admite otra. La persona revisó el vídeo final entero antes del merge. Tras los arreglos del review-diff, una pasada de comprobación salió con código 0 y se descartó su vídeo para conservar el aprobado.

**Prompt 37:**

*Contexto.* `deploy-hardening` (PR #150, issues #106, #107 y #108) cierra tres huecos que dejó la revisión del despliegue de `deploy-compose` (§2.4, Prompt 2):
- **#106:** la auditoría de los logins guardaba la IP del contenedor `web`, no la de quien entra.
- **#107:** la CI construía las imágenes, pero nunca las arrancaba.
- **#108:** el despliegue creaba `recon_reader`, un login que nadie usa y que compartía contraseña con `recon_app`.

Toca `infra/`, la configuración de Nginx, el job `images` de la CI y `docs/deploy.md`. Sin migración.

*Prompt.* Proponer el change con los tres issues juntos, porque comparten piezas y se comprueban con el mismo smoke. Restricciones:
- Ninguna tarea usa la base local salvo una, con turno pedido antes. Lo que necesita las imágenes o SQL Server se comprueba en la CI de la rama.
- No se edita ningún `.env` ni la plantilla del despliegue.
- El redespliegue en el servidor, una secuencia de órdenes copiables, sin tocar la red, el router ni el panel del túnel.
- Cada grupo cierra con su commit, su documentación y su push. Si un grupo no estaba terminado antes de la congelación del código, se quedaba fuera con su issue abierto.

*Resultado.* **El design.**
- **La IP.** Nginx sustituye `X-Forwarded-For` por un único valor: `CF-Connecting-IP` si llega y, si no, la IP de la conexión. También vacía `X-Forwarded-Host`. La API confía en esa cabecera solo desde direcciones privadas (`TRUST_PROXY: uniquelocal`, solo en el compose del despliegue).
- **Lo que se comprobó de Fastify 5.** `trustProxy` con un número falla cerrado y no confía en ningún salto. Además, no valida que el valor sea una IP. Por eso `uniquelocal` y una guarda `isIP` en la ruta de login.
- **Alternativas descartadas.** El módulo `realip` de Nginx y fijar la dirección de `web` en el compose. Las dos exigían reservar subredes que podían chocar con las del servidor, justo en la parte que la persona no domina.
- **`recon_reader`.** Pasa a `init.local.sql`, que solo monta el compose local. `init.deploy.sql` lo borra si existe, dentro de un `TRY/CATCH` para que `mssql` arranque aunque haya una sesión abierta.
- **`scripts/deploy.sh check`.** Orden nueva, de solo lectura: logins y usuarios `recon_*` y últimos logins auditados con su IP.

**El smoke.** Creció por grupos, en el orden aprobado en el gate: #107 → #108 → #106. Con #107 solo, `check` listaba `recon_reader` y la IP de `web`. Tras #108, solo `recon_app` y `recon_migrator`. Tras #106, la IP inventada de `CF-Connecting-IP`, sin rastro del `X-Forwarded-For` inventado. La rotura deliberada quitó `--conditions=recon-dist` de la imagen de la API: el job falló en `up --wait` con los logs de la API, y se revirtió con `git revert`. El job `images` pasó de algo más de 1 minuto a entre 3 min 43 s y 4 min 35 s, pero corre en paralelo con el camino crítico y el PR no tarda más.

**Lo que no salió como estaba previsto.**
- Los tests de integración de la IP se escribieron antes del código, pero no se vieron en rojo: necesitaban base y la implementación llegó antes del turno. El rojo sí se vio en el smoke de los dos primeros grupos.
- En la comprobación local, la prueba de rendimiento de 20 000 filas falló una vez justo tras el seed y pasó al repetirla.

**El verify.** Una sola tarea pendiente, la del servidor. Dos avisos: el login sin `CF-Connecting-IP` no se probaba, y dos escenarios solo se pueden comprobar en producción. Y dos sugerencias de texto.

**Dos rondas de review-diff**, cada una en una sesión nueva.
- **La primera.** La IP de la auditoría pasó a su propio requisito en la spec de `auth`. El smoke empezó a probar el `DROP` sobre un volumen que ya tiene `recon_reader`, como un despliegue anterior, y un login sin `CF-Connecting-IP`. El test sin proxy construye su propia app, y entró un caso de `X-Forwarded-For` con varios saltos. Los pasos del servidor ganaron comprobar la rama, apuntar la versión antes del `git pull` y cómo volver atrás.
- **La segunda.** Vio que el login sin Cloudflare acertaría aunque la API guardara la IP de `web`, que también es privada. Ahora el smoke saca las direcciones de `web` con `docker inspect` y las excluye. `check` lista también los usuarios sin login. Los pasos del servidor dicen parar si está en otra rama y descartar cualquier dirección privada en la auditoría.

Queda como deuda que Nginx reenvía `X-Forwarded-Proto` tal como llega, aunque hoy nada lo lee. El hook de pre-commit que usa `git stash` pasó a #151.

*Ajuste humano.* En el gate, la persona decidió el orden #107 → #108 → #106, con la regla de dejar fuera el grupo que no estuviera terminado antes de la congelación. Lanzó el `pnpm db:seed` de la comprobación local, porque el hook se lo impide al agente. Después del merge siguió los pasos en el servidor:
- `migrate`, sin migraciones pendientes;
- los cuatro servicios `healthy` tras `down` y `up --wait`;
- `check`, solo con `recon_app` y `recon_migrator`;
- el `curl` con cabeceras inventadas, bloqueado por Cloudflare antes de llegar a la aplicación, un resultado seguro según el plan;
- los logins auditados, con la IP pública del cliente y ninguna privada.

Con ese resultado se anotaron en los issues los criterios de producción. Como el PR se fusionó en la rama de entrega y no en la principal, la persona cerró a mano los tres issues después de la comprobación en el servidor.

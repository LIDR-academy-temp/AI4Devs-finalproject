# Registro de uso de IA — Recon Tool 2.0

**Entrega 3 · Autor: Manfred Valverde Perrogón**

Este documento selecciona los prompts y workflows más representativos del proyecto, desde su definición hasta la Entrega 3. Conserva las siete secciones de la plantilla y presenta un máximo de tres ejemplos por sección. Los prompts se resumen a partir del registro de trabajo; no son transcripciones literales. Los resultados corresponden a lo registrado en cada etapa y las referencias a PR e issues permiten localizar su evidencia en el repositorio.

## Cómo se utilizó la IA

Recon Tool 2.0 nació de una idea propia del autor para mejorar una herramienta de reconciliación que ya había desarrollado y utilizado en su trabajo. El núcleo del proyecto, incluido el cruce de archivos de proveedores con transacciones propias, procede de esa experiencia. La IA ayudó a convertir una iniciativa de mayor alcance en un MVP viable para el curso, evaluando alternativas y recortes que el autor revisó y confirmó.

El autor elaboró los documentos fuente, aportó el esquema y los procedimientos del sistema existente y explicó los requisitos y las reglas del negocio. Su participación se concentró en establecer el proyecto, delimitar el alcance, revisar propuestas y diseños, resolver dudas durante la ejecución y coordinar el trabajo. Realizó pruebas manuales y revisó los resultados después de las etapas de OpenSpec. Habitualmente dio seguimiento a dos sesiones de implementación en paralelo y a otras dos sesiones destinadas a revisión.

La IA realizó gran parte de la implementación, la preparación y ejecución de pruebas y la redacción de documentación técnica, issues, tareas y mensajes de commits. También organizó la información del autor, identificó vacíos, ayudó a simular casos y propuso alternativas. Las decisiones de negocio y la autorización para avanzar permanecieron a cargo del autor.

### Herramientas, modelos y fases

| Herramienta | Modelo registrado | Fases y uso principal |
| --- | --- | --- |
| Claude, aplicación de escritorio / Cowork | Claude Opus 5.5 | Organización del contexto, definición documental, análisis del sistema existente y propuestas de alcance y diseño. |
| ChatGPT | GPT-6 Astra | Revisión cruzada de requisitos y documentación, aclaración de reglas y revisión editorial del registro de IA. |
| Claude Code | Opus 5 | Propuestas de OpenSpec, implementación, pruebas, revisión asistida y documentación del desarrollo. |

### Workflow y supervisión

OpenSpec, TDD y las prácticas de revisión proceden del curso. El autor las adoptó y la IA ayudó a aplicarlas al contexto del proyecto, utilizando los documentos de requisitos, las instrucciones del repositorio y los cinco focos de revisión: correctitud, seguridad, rendimiento, legibilidad y tests.

El flujo habitual fue:

1. Preparar una propuesta con `/opsx:propose`, incluyendo especificaciones, `design.md` y tareas. Las dudas de negocio quedaban explícitas para que el autor las resolviera antes de implementar.
2. Revisar y aprobar la propuesta y el diseño. El autor podía corregir reglas, pedir alternativas o recortar el alcance.
3. Implementar con `/opsx:apply` por grupos de tareas, usando TDD y comprobaciones deliberadas de que los tests detectaban errores. Las excepciones al orden previsto se registraron; una prueba modificada requería justificar el cambio.
4. Contrastar el resultado mediante `/opsx:verify` y revisión asistida en otra sesión. El autor revisaba los hallazgos y decidía qué corregir o dejar como deuda.
5. Completar las comprobaciones, integrar el PR y archivar el change. El registro también recoge excepciones, como un cierre sin ejecutar `verify`; el flujo describe el procedimiento habitual, no un cumplimiento perfecto en todos los cambios.

Las sesiones paralelas utilizaron worktrees y contratos compartidos para coordinar backend y frontend. La disponibilidad de la base de datos y los puntos de integración se coordinaban durante el trabajo. La revisión asistida en otra sesión complementaba la revisión y aprobación del autor.

## Índice

1. [Descripción general del producto](#1-descripción-general-del-producto)
2. [Arquitectura del sistema](#2-arquitectura-del-sistema)
3. [Modelo de datos](#3-modelo-de-datos)
4. [Especificación de la API](#4-especificación-de-la-api)
5. [Historias de usuario](#5-historias-de-usuario)
6. [Tickets de trabajo](#6-tickets-de-trabajo)
7. [Pull requests](#7-pull-requests)

## 1. Descripción general del producto

### Prompt 1 — Convertir el proyecto propio en un MVP

**Contexto.** El proyecto completo supera el alcance de la entrega académica. El autor ya tenía la idea y experiencia con una versión anterior.

**Prompt / workflow.** Analizar el enunciado del curso junto con el documento de situación actual aportado por el autor; identificar funcionalidades, vacíos y alternativas de alcance; proponer un MVP y un roadmap para revisión.

**Resultado y aporte de la IA.** Organización de requisitos, preguntas de aclaración y propuesta de un núcleo centrado en importar, validar y procesar reconciliaciones. La documentación distinguió el cruce por identificadores y coherencia de estados del pareo por importes.

**Participación y decisiones del autor.** Aportó el problema, la solución existente, el conocimiento del negocio y los documentos fuente. Evaluó los recortes con la IA y confirmó qué se incluía. El proyecto y su núcleo funcional son de su autoría.

### Prompt 2 — Precisar catálogo, cuentas y fees

**Contexto.** La propuesta debía reflejar la organización real de merchants, proveedores, cuentas y canales.

**Prompt / workflow.** Incorporar las reglas explicadas por el autor, devolver un resumen de lo entendido y señalar las secciones afectadas antes de modificar el documento.

**Resultado y aporte de la IA.** Propuesta coherente de entidades, pantallas y flujo de uso; separación entre datos provenientes de los gateways y entidades administradas por Recon Tool.

**Participación y decisiones del autor.** Definió la jerarquía, el aislamiento por merchant y la cuenta como agrupación propia de la herramienta. Estableció que la cuenta principal de un canal pasa a ser la última que procesa un settlement de ese canal, frente a la propuesta inicial de mantenerla fija. Aclaró el tratamiento de fees transaccionales y fees agregados al batch.

## 2. Arquitectura del sistema

### Prompt 1 — Proponer la arquitectura desde las restricciones reales

**Contexto.** La solución debía permitir probar la reconciliación de forma aislada y evolucionar desde datos sintéticos hacia datos de los gateways.

**Prompt / workflow.** Proponer una arquitectura y estructura de proyecto a partir de las restricciones confirmadas, justificando sus componentes y alternativas.

**Resultado y aporte de la IA.** Propuesta de monolito modular con arquitectura hexagonal, frontend separado por funcionalidades y backend con Fastify, Prisma y Zod. La documentación incluyó diagramas y decisiones de arquitectura.

**Participación y decisiones del autor.** Confirmó la lectura desde tablas propias y el despliegue de demostración en servidor propio. Propuso utilizar SQL Server 2022 desde el MVP para aprovechar su experiencia y el sistema existente. Revisó las propuestas y pidió mejorar la legibilidad de los diagramas.

### Prompt 2 — Llevar la demostración al entorno desplegado

**Contexto.** En la Entrega 3 se pasó de una propuesta de infraestructura a un despliegue reproducible. Referencias: issue #97, `deploy-compose`, y PR #150, `deploy-hardening`.

**Prompt / workflow.** Preparar Dockerfiles, Compose, configuración de ejemplo y guía de despliegue; separar los pasos que requieren intervención en el servidor. Después, revisar los problemas encontrados al desplegar y ampliar las comprobaciones de CI.

**Resultado y aporte de la IA.** Imágenes de API y web, scripts y guía; separación de identidades de aplicación y migración; pruebas de arranque de imágenes y correcciones de inicialización. El despliegue final admitió SQL Server en Compose y una opción de servidor externo.

**Participación y decisiones del autor.** Revisó el diseño y las instrucciones, exigió pasos claros y fijó prioridades y recortes antes de la entrega. La comprobación con Docker detectó un fallo de reinicio con datos existentes que los tests anteriores no habían mostrado. El registro recoge la verificación posterior del entorno desplegado.

### Prompt 3 — Automatizar la verificación del flujo completo

**Contexto.** La Entrega 3 incorporó la suite de historias de usuario a CI. Referencias: PR #147 y #149.

**Prompt / workflow.** Preparar un job con SQL Server efímero que ejecute Bruno y Playwright; coordinar la infraestructura de CI con la sesión que desarrolla los escenarios E2E y comprobar también los fallos deliberados del pipeline.

**Resultado y aporte de la IA.** Ejecución automatizada de la colección y cinco escenarios E2E, preparación de datos entre suites y diagnóstico de fallos mediante logs e informes. Las roturas deliberadas comprobaron que los fallos se detectaban y reportaban.

**Participación y decisiones del autor.** Aprobó la organización del job, coordinó las sesiones y el reparto de documentación, y pidió medir la duración antes de dividir la ejecución. Revisó la propuesta y los resultados de cada etapa.

## 3. Modelo de datos

### Prompt 1 — Analizar el esquema existente

**Contexto.** El nuevo modelo debía partir del sistema real y sus limitaciones.

**Prompt / workflow.** Analizar el script de SQL Server aportado por el autor —30 tablas, 15 procedimientos y 3 vistas/funciones— y proponer qué conservar, modificar o sustituir.

**Resultado y aporte de la IA.** Mapa de evolución entre modelos, diagramas y propuestas para representar settlements por ciclo, vigencias de fees e incidencias con decisiones del analista. Se documentó el uso de `DECIMAL(19,4)` para los importes.

**Participación y decisiones del autor.** Aportó el esquema y los procedimientos, explicó su significado y revisó las propuestas. Aclaró que varios archivos pueden constituir un único settlement y una sola contabilidad, y confirmó las reglas de cuentas y canales.

### Prompt 2 — Corregir la identidad de los movimientos

**Contexto.** Al diseñar el procesado, la unicidad por transacción, ciclo y batch impedía representar combinaciones legítimas de ajustes. Referencia: PR #66.

**Prompt / workflow.** Revisar la clave de `SettlementTransaction` contra los casos de negocio antes de implementar el procesado; presentar las decisiones abiertas y la migración necesaria.

**Resultado y aporte de la IA.** La clave pasó a identificar la fila de origen dentro del batch. También se contemplaron ajustes cuya fecha no puede determinarse, sin inventar una fecha para satisfacer el esquema.

**Participación y decisiones del autor.** Resolvió las reglas pendientes del diseño, incluida la prioridad de las fuentes para fechar un ajuste y su tratamiento cuando falta fecha. Revisó las decisiones antes de autorizar la implementación.

## 4. Especificación de la API

### Prompt 1 — Elegir operaciones representativas y revisar su contrato

**Contexto.** La documentación inicial debía mostrar operaciones relevantes del producto.

**Prompt / workflow.** Listar las operaciones posibles, proponer tres representativas y presentar sus contratos y ejemplos en la conversación antes de incorporarlos al documento.

**Resultado y aporte de la IA.** Selección y documentación de creación de fees, importación y liquidación, con convenciones sobre dinero, errores y permisos; inventario de operaciones para el desarrollo posterior.

**Participación y decisiones del autor.** Propuso la administración de fees como ejemplo relevante y exigió incluir historial desde el MVP. Explicó las vigencias, los fees por batch y la confirmación de asociación de canales.

### Prompt 2 — Corregir las fechas de negocio en el contrato

**Contexto.** El API añadía `Z` a fechas de negocio guardadas como hora de Nueva York sin zona, lo que podía hacerlas interpretar como UTC. Referencia: PR #153, issue #48.

**Prompt / workflow.** Proponer y aplicar un contrato de fecha de negocio sin zona, preservando lo mostrado en pantallas y CSV y comprobando el resultado en distintas zonas horarias.

**Resultado y aporte de la IA.** Tipo compartido `BusinessDateTime`, serialización sin `Z` para esos campos y adaptación del frontend. Los instantes de auditoría conservaron su representación UTC. Las pruebas incluyeron zonas distintas y una rotura deliberada del contrato en CI.

**Participación y decisiones del autor.** Definió la diferencia entre fechas de negocio y auditoría. Evaluó el coste del cambio, inicialmente lo pospuso y después lo autorizó con un límite de calendario. Coordinó su integración con cambios simultáneos de documentación e interfaz.

## 5. Historias de usuario

### Prompt 1 — Traducir el proceso real a historias verificables

**Contexto.** El alcance se organizó alrededor de importar e interpretar, validar y decidir, y procesar y dar seguimiento al pago.

**Prompt / workflow.** Redactar tres historias con criterios Given/When/Then y presentar los casos dudosos para revisión del autor.

**Resultado y aporte de la IA.** Historias con roles, criterios de aceptación y límites de alcance, incluyendo revisión del pareo, tratamiento de incidencias y trazabilidad del reprocesamiento.

**Participación y decisiones del autor.** Precisó que el pareo propuesto debe revisarse, que un archivo idéntico se rechaza dentro del mismo import y que la corrección mediante nuevos archivos conserva el import anterior como historial. Aclaró que un batch solo queda liquidado cuando está procesado y pagado.

### Prompt 2 — Completar pago, retirada del pago y deshacer

**Contexto.** La Entrega 3 completó acciones que habían quedado fuera de la Entrega 2. Referencia: PR #99.

**Prompt / workflow.** Proponer conjuntamente las transiciones de pago y deshacer, reutilizando las guardas del procesado y probando concurrencia, auditoría y rollback.

**Resultado y aporte de la IA.** Acciones y pantallas para pagar, retirar el pago, deshacer y reprocesar; historial de intentos y comprobaciones de que una operación fallida no deja cambios parciales.

**Participación y decisiones del autor.** Decidió cómo se muestran las acciones según permisos, que retirar el pago precede a deshacer un batch pagado y que el analista decide cuándo volver a validar. El registro recoge pruebas manuales con los roles correspondientes.

## 6. Tickets de trabajo

### Prompt 1 — Dividir el MVP en trabajo ejecutable

**Contexto.** Las historias necesitaban tickets de base de datos, backend y frontend con un tamaño manejable.

**Prompt / workflow.** Proponer tareas, dependencias, criterios de aceptación y definición de terminado; señalar los tickets demasiado grandes y presentar alternativas de división.

**Resultado y aporte de la IA.** Tickets con alcance explícito, pruebas esperadas y dependencias. Se separó esquema y migraciones de seed y muestras, y se acotó el motor inicial de validaciones.

**Participación y decisiones del autor.** Revisó la propuesta y confirmó los recortes. La IA redactó el contenido operativo de issues y tareas a partir del alcance aprobado.

### Prompt 2 — Coordinar implementación y revisión en paralelo

**Contexto.** Backend y frontend podían avanzar en sesiones distintas si compartían un contrato estable; las revisiones se realizaban en sesiones adicionales.

**Prompt / workflow.** Publicar primero el contrato de la funcionalidad; construir el frontend con respuestas simuladas de MSW; reservar la integración con el API real para cuando estuviera disponible y registrar las dependencias pendientes.

**Resultado y aporte de la IA.** Trabajo paralelo documentado, por ejemplo en validaciones, settlement y administración de cuentas y fees. Las pruebas contra el API real permitieron detectar diferencias respecto de las simulaciones.

**Participación y decisiones del autor.** Dio seguimiento a las sesiones, revisó propuestas y diseños, resolvió consultas y aprobó el avance entre etapas. Coordinó dependencias y revisiones para integrar los cambios.

## 7. Pull requests

Los tres casos siguientes muestran implementación, revisión y decisiones representativas. Otras contribuciones de la Entrega 3, como despliegue, CI, ciclo de pago y fechas de negocio, se recogen en las secciones anteriores.

### Prompt 1 — Implementar y revisar el motor de validaciones

**Contexto.** `validation-engine`, PR #41, issue #8. El motor debía aplicar las reglas de reconciliación como funciones puras y reproducir las muestras del proyecto.

**Prompt / workflow.** Implementar por grupos con tests primero, comprobar rendimiento y romper deliberadamente comportamientos para verificar los tests; revisar el diff en otra sesión y reproducir los hallazgos antes de corregirlos.

**Resultado y aporte de la IA.** Motor de ocho validaciones y pruebas con muestras. Las revisiones detectaron faltantes falsos al mezclar reservas de plazos distintos y un caso que podía liberar una reserva dos veces. Se ajustaron los cálculos y su cobertura.

**Participación y decisiones del autor.** Resolvió las reglas abiertas y exigió documentarlas antes de programarlas. Confirmó la excepción bloqueante de `provider_mismatch`; las demás incidencias se revisan según sus reglas. Decidió comparar las reservas por vencimiento y aclaró que dos apariciones R de la misma transacción constituyen un duplicado.

### Prompt 2 — Aplicar la política de reserva ante ajustes

**Contexto.** `settlement-reserve-chargeback`, PR #127, issue #62. Funcionalidad recortada de la Entrega 2 y completada en la Entrega 3.

**Prompt / workflow.** Proponer las decisiones pendientes de la política, implementarla con tests de dominio e integración y revisar la concurrencia entre batches que afectan a la misma reserva.

**Resultado y aporte de la IA.** Cálculo de liberación anticipada y actualización de sus lecturas y validaciones. La revisión detectó que dos imports simultáneos podían liberar la misma reserva; se añadió una relectura dentro del proceso y tests de concurrencia. El registro mantuvo como deuda la comprobación aislada de uno de los bloqueos.

**Participación y decisiones del autor.** Definió que la política libera toda la reserva retenida, incluso ante un refund parcial; que se aplica la política de la cuenta que procesa el ajuste; que R prevalece cuando coincide con un ajuste en el mismo batch; y que solo el primer ajuste libera la reserva. Aprobó el diseño y los cambios en los resultados esperados de las muestras.

### Prompt 3 — Mejorar la interfaz mediante comprobación visual

**Contexto.** `web-analysis-polish`, PR #158, issue #157. La revisión de Analysis & Validations encontró problemas de alineación, contadores y nombres de archivo.

**Prompt / workflow.** Proponer los cambios de interfaz, actualizar las especificaciones afectadas y comprobar el resultado con tests y capturas medidas a distintos anchos. Revisar el diff en otra sesión.

**Resultado y aporte de la IA.** Componentes compartidos para tarjetas y ayudas, mejor distribución del nombre del archivo y correcciones de desbordes. Las capturas detectaron problemas que los tests de estructura no podían comprobar; el script de verificación se reforzó durante la revisión.

**Participación y decisiones del autor.** Revisó las capturas y pidió que las cifras del desglose permanecieran junto a sus etiquetas. Supervisó las pasadas y la revisión independiente. Este caso muestra cómo la prueba manual y el criterio de presentación complementaron las comprobaciones automatizadas.

## Balance del uso de IA

El aporte principal del autor fue definir y dirigir un proyecto propio: proporcionar el contexto del negocio, delimitar el MVP, revisar diseños, resolver decisiones y comprobar manualmente el producto. La IA permitió desarrollar y documentar ese alcance, explorar alternativas y ampliar las pruebas y revisiones.

El trabajo también mostró límites concretos: propuestas que no respetaban inicialmente el dominio, tests que no detectaban el defecto que pretendían cubrir y problemas visuales visibles solo al probar las pantallas. Las revisiones y decisiones del autor, junto con las comprobaciones automatizadas y asistidas, formaron parte del proceso de aceptación.

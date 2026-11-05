# Historias de usuario — AI Job Match

> Épicas e historias del MVP definidas en [`docs/prd.md`](./prd.md) (sección 5). Cada épica corresponde a una capability de OpenSpec y cada historia a un cambio de OpenSpec. Las historias usan lenguaje de negocio; la implementación técnica está en [`docs/tickets.md`](./tickets.md). Los criterios de aceptación (Dado/Cuando/Entonces) se convierten en escenarios de las specs.

- **Estado:** borrador v0.4 (incorpora la revisión adversarial de la arquitectura y las revisiones de consistencia)
- **Fecha:** 2026-11-04

---

## Épicas

| Épica | Capability | Valor | Historias | Estimación |
| --- | --- | --- | --- | --- |
| E1 Ingreso de ofertas | `job-intake` | Todas las ofertas relevantes en un solo lugar, automáticas o pegadas | HU1, HU2, HU3 | 9.25 h (+1 h should-have) |
| E2 Perfil profesional | `resume-profile` | El sistema conoce la experiencia real del usuario | HU4 | 2.75 h (+1 h should-have) |
| E3 Evaluación de ofertas | `job-matching` | Decidir en menos de 2 minutos si conviene aplicar | HU5, HU6, HU7 | 8.75 h |
| E4 Seguimiento de candidaturas | `application-tracking` | Saber en qué va cada proceso y no perder seguimientos | HU8, HU9 | 3 h (+3 h should-have) |
| E5 Plataforma | `platform` | Acceso seguro, despliegue, control de gasto, observabilidad, demostración e idioma | HU10, walking skeleton y T-33 a T-36 | 9.5 h (+2.5 h should-have) |

Más 2.25 h para la prueba E2E y la documentación final (T-21). MVP imprescindible: ~35.5 h, con 0.5 h de margen sobre el tope de 36 h (ver orden de recorte).

## Historias y orden de construcción

| Orden | Id | Épica | Historia | Prioridad | Estimación | Depende de |
| --- | --- | --- | --- | --- | --- | --- |
| 0 | — | E5 | Walking skeleton (T-01 a T-05); antes, medir la línea base de OBJ-1 (T-31, contada en HU7) | Must-have | 6.25 h | — |
| 1 | — | E5 | Control de gasto de IA (T-33): antes de cualquier llamada a la IA | Must-have | 1.5 h | Walking skeleton |
| 2 | HU4 | E2 | Cargar el currículum y obtener un perfil | Must-have | 2.75 h | Control de gasto |
| 3 | HU1 | E1 | Agregar una oferta pegando su texto | Must-have | 3.5 h | Control de gasto |
| 4 | HU5 | E3 | Filtrar ofertas con mis criterios no negociables | Must-have | 3 h | HU1 |
| 5 | HU6 | E3 | Obtener un puntaje de encaje explicado | Must-have | 4.5 h | HU4, HU5 |
| 6 | HU7 | E3 | Registrar mi decisión sobre cada oferta | Must-have | 1.25 h (incluye medir la línea base) | HU1 |
| 7 | HU8 | E4 | Gestionar candidaturas en un pipeline | Must-have | 3 h | HU7 |
| 8 | HU2 | E1 | Importar ofertas de empresas objetivo desde su job board | Must-have (Lever: should-have) | 3.25 h (+1 h) | HU1, HU5 |
| 9 | HU3 | E1 | Buscar ofertas en un agregador | Must-have | 2.5 h | HU2 |
| 10 | — | E5 | Observabilidad (T-35) e instancia de demostración (T-34) | Must-have | 1.75 h | Control de gasto |
| 11 | HU9 | E4 | Correos y alertas de seguimiento | Should-have | 3 h | HU8 |
| 12 | HU10 | E5 | Interfaz en español | Should-have | 2 h | Walking skeleton |

## Plan de entregas

| Entrega | Requisito del curso | Contenido planeado | Horas |
| --- | --- | --- | --- |
| 1. Documentación | 100 % documentación, sin código | Visión, PRD, revisiones adversariales del PRD y de la arquitectura, arquitectura y ADRs, épicas, historias, tickets, checklist de compuertas, `readme.md` y `prompts.md` | — |
| 2. Código funcional | Frontend, backend y base de datos conectados; flujo principal casi completo | T-31, walking skeleton, control de gasto (T-33), HU4, HU1, HU5, HU6 y HU7 (pegar oferta → filtro → puntaje → decisión) | ~22.75 h |
| Final | 3 a 5 funcionalidades operativas, pruebas (incluida una E2E) y evidencia de despliegue | HU8, HU2, HU3, observabilidad (T-35), instancia de demostración (T-34), prueba E2E y documentación final (T-21); should-have si queda tiempo | ~12.75 h |

Con el control de gasto, la observabilidad y la instancia de demostración, el MVP imprescindible llega a ~35.5 h y deja solo 0.5 h de margen. Orden de recorte si falta tiempo: el adaptador de Lever ya es should-have; después, HU3 se reduce a una búsqueda fija sin pantalla de edición. HU3 no se elimina, porque es la única vía automática hacia las empresas grandes de la lista.

---

## E1 — Ingreso de ofertas

Capability `job-intake`. La recolección automática es tan importante como pegar ofertas a mano. En todos los casos, la oferta se guarda con campos estructurados para poder filtrarla y compararla con el currículum.

### HU1 — Agregar una oferta pegando su texto

**Como** buscador de empleo,
**quiero** agregar una oferta pegando su texto,
**para** registrar ofertas de cualquier portal, incluidos los que no tienen API.

- **Épica:** E1
- **Prioridad:** must-have
- **Estimación:** 3.5 h
- **Requisitos:** RF-01 a RF-03, RF-05, RF-06
- **Objetivos:** OBJ-1

#### Contexto

Las empresas grandes de la lista publican en portales propios sin API. Pegar el texto es la vía universal: la IA extrae los campos y el usuario puede corregirlos antes o después de guardar.

#### Criterios de aceptación

```gherkin
Escenario: Extraer los campos de una oferta pegada
  Dado que estoy en la pantalla para agregar una oferta
  Cuando pego el texto de una oferta que menciona título, empresa, ubicación, modalidad y salario
  Entonces veo esos campos completados por el sistema
  Y puedo guardar la oferta directamente o corregir los campos antes de guardar

Escenario: Corregir una oferta después de guardarla
  Dada una oferta guardada con un campo mal extraído
  Cuando corrijo el campo desde el detalle de la oferta
  Entonces el cambio se guarda y los filtros se vuelven a evaluar

Escenario: Un dato ausente queda como desconocido
  Dado el texto de una oferta que no menciona el salario
  Cuando el sistema extrae los campos
  Entonces el salario aparece como "desconocido"

Escenario: Ver y ordenar la lista de ofertas
  Dado que tengo varias ofertas guardadas
  Cuando abro la lista de ofertas
  Entonces veo para cada una su título, empresa, origen, resultado del filtro, puntaje y decisión
  Y puedo ordenarlas por puntaje o por fecha
```

#### Reglas de negocio

- Los campos ausentes quedan como desconocidos; la calidad de la extracción se mide con el golden set (RF-02).
- Una oferta pegada con la misma URL que otra ya guardada se rechaza como duplicada.

#### Fuera de alcance

Descargar una oferta a partir de su URL (RF-08, could-have).

### HU2 — Importar ofertas de empresas objetivo desde su job board

**Como** buscador de empleo,
**quiero** importar automáticamente las ofertas de mis empresas objetivo desde su job board,
**para** no revisar sus portales uno por uno.

- **Épica:** E1
- **Prioridad:** must-have (adaptador de Lever: should-have)
- **Estimación:** 3.25 h (+1 h para Lever)
- **Requisitos:** RF-04, RF-04b, RF-05, RF-09
- **Objetivos:** OBJ-5

#### Contexto

Las empresas que publican en Greenhouse (por ejemplo, Anthropic) o Ashby (por ejemplo, OpenAI) se importan; Lever es should-have porque ninguna empresa objetivo conocida lo usa. Las ofertas se importan desde la API pública de su job board. Las empresas sin API se registran igual y sus ofertas llegan por HU1 o HU3.

#### Criterios de aceptación

```gherkin
Escenario: Registrar una empresa objetivo
  Dado que estoy en la pantalla de empresas objetivo
  Cuando registro una empresa con su nombre, su tipo y su plataforma de empleo
  Entonces la empresa aparece en mi lista
  Y si la plataforma es Greenhouse, Ashby o Lever, puedo indicar el identificador de su job board

Esquema del escenario: Importar las ofertas de una empresa desde su job board
  Dada una empresa objetivo con plataforma <plataforma> y un identificador de job board válido
  Cuando pido importar sus ofertas
  Entonces veo el progreso de la importación
  Y al terminar, sus ofertas aparecen en mi lista con la empresa como origen

  Ejemplos:
    | plataforma |
    | Greenhouse |
    | Ashby      |
    # Lever (should-have)
    | Lever      |

Escenario: Tope de ofertas por sincronización
  Dado un tope de 50 ofertas nuevas por sincronización
  Cuando una importación encuentra 140 ofertas nuevas
  Entonces solo se agregan 50
  Y veo cuántas se agregaron, cuántas se omitieron por duplicadas y cuántas por el tope

Escenario: Una oferta pegada no se duplica al importarla
  Dada una oferta que pegué a mano
  Cuando importo las ofertas del job board de su empresa
  Entonces la oferta no aparece duplicada

Escenario: Las ofertas importadas no se puntúan solas
  Dada una importación que agrega 20 ofertas que pasan los filtros
  Cuando termina la importación
  Entonces ninguna oferta tiene puntaje hasta que yo lo pida

Escenario: No duplicar ofertas
  Dada una oferta que ya importé
  Cuando importo otra vez las ofertas de la misma fuente
  Entonces la oferta no aparece duplicada
```

#### Reglas de negocio

- Una oferta se identifica por su fuente y su identificador externo, o por su URL.
- Cada sincronización respeta el tope de ofertas nuevas (RF-04b) y aplica los filtros duros antes de la IA.

#### Fuera de alcance

Adaptadores de SmartRecruiters (v1.1) y Workday (futuro); alertas de empleo por Gmail (v1.1).

### HU3 — Buscar ofertas en un agregador

**Como** buscador de empleo,
**quiero** guardar búsquedas que se ejecuten en un agregador de ofertas,
**para** recibir ofertas de las empresas grandes que no tienen API propia.

- **Épica:** E1
- **Prioridad:** must-have (si falta tiempo, se reduce a una búsqueda fija)
- **Estimación:** 2.5 h
- **Requisitos:** RF-04a, RF-04b, RF-05
- **Objetivos:** OBJ-5

#### Contexto

El proveedor del agregador se elige con un spike (T-27). Si ninguno es viable por cobertura, cuota o términos de uso, esta historia se reemplaza por un adaptador de SmartRecruiters dentro de HU2.

#### Criterios de aceptación

```gherkin
Escenario: Guardar y ejecutar una búsqueda en el agregador
  Dado que guardé una búsqueda con las palabras "software engineer" y la ubicación "Seattle, WA"
  Cuando pido ejecutarla
  Entonces las ofertas encontradas aparecen en mi lista con la búsqueda como origen

Escenario: Tope de ofertas en una búsqueda
  Dado un tope de 50 ofertas nuevas por sincronización
  Cuando una búsqueda encuentra 80 ofertas nuevas
  Entonces solo se agregan 50
  Y veo cuántas se omitieron por el tope

Escenario: Cuota del agregador agotada
  Dado que la cuota mensual del agregador se agotó
  Cuando pido ejecutar una búsqueda
  Entonces la búsqueda termina con un mensaje claro sobre la cuota
  Y las ofertas ya guardadas no se modifican
```

#### Reglas de negocio

- Las ofertas de una búsqueda se deduplican contra todas las fuentes con la URL canónica y una clave normalizada de empresa, título y ubicación principal (ADR-0006).
- La clave del agregador vive en una variable de entorno.

#### Fuera de alcance

Búsquedas programadas automáticamente (v1.1).

---

## E2 — Perfil profesional

Capability `resume-profile`. El perfil es la base del puntaje de encaje.

### HU4 — Cargar el currículum y obtener un perfil

**Como** buscador de empleo,
**quiero** cargar mi currículum y obtener un perfil estructurado que pueda corregir,
**para** que el sistema compare cada oferta con mi experiencia real.

- **Épica:** E2
- **Prioridad:** must-have (PDF: should-have)
- **Estimación:** 2.75 h (+1 h para PDF)
- **Requisitos:** RF-10 a RF-14
- **Objetivos:** OBJ-1, OBJ-2

#### Contexto

El currículum se guarda en Markdown, que es más barato de enviar a la IA que un PDF. La carga en PDF, con conversión única a Markdown, es should-have.

#### Criterios de aceptación

```gherkin
Escenario: Cargar el currículum en Markdown
  Dado que no tengo un currículum cargado
  Cuando subo mi currículum en un archivo Markdown
  Entonces veo un perfil con mis habilidades, experiencia, años de experiencia, seniority, formación e idiomas

Escenario: Rechazar un archivo no permitido
  Cuando subo un archivo de un tipo no permitido o que pesa más de 5 MB
  Entonces el sistema lo rechaza con un mensaje claro

Escenario: Corregir el perfil
  Dado un perfil generado
  Cuando corrijo una habilidad o los años de experiencia y guardo
  Entonces los siguientes puntajes usan el perfil corregido

Escenario: Reemplazar el currículum
  Dado que ya tengo un currículum y 30 ofertas con puntaje
  Cuando subo un currículum nuevo
  Entonces el nuevo pasa a ser el activo
  Y los puntajes anteriores aparecen marcados como desactualizados
  Y puedo pedir recalcularlos después de ver que son 30 ofertas (el recálculo se construye con HU6)

Escenario: Cargar el currículum en PDF (should-have)
  Dado que no tengo un currículum cargado
  Cuando subo mi currículum en PDF
  Entonces el sistema lo convierte a Markdown y veo el perfil generado

Escenario: PDF que no se puede leer (should-have)
  Dado un PDF sin texto legible
  Cuando lo subo
  Entonces el sistema me pide pegar el contenido como texto
```

#### Reglas de negocio

- Solo hay un currículum activo.
- El perfil corregido por el usuario prevalece sobre el generado.
- Un currículum nuevo no recalcula puntajes automáticamente.

#### Fuera de alcance

Varios currículums por tipo de rol (futuro) y análisis del currículum como lo haría el ATS de una empresa (futuro).

---

## E3 — Evaluación de ofertas

Capability `job-matching`. Primero filtros sin IA, luego puntaje explicado y, al final, la decisión del usuario.

### HU5 — Filtrar ofertas con mis criterios no negociables

**Como** buscador de empleo,
**quiero** que cada oferta pase por mis criterios no negociables,
**para** descartar sin esfuerzo, y sin gastar IA, las ofertas que no me sirven.

- **Épica:** E3
- **Prioridad:** must-have
- **Estimación:** 3 h
- **Requisitos:** RF-20 a RF-23, `docs/prd.md` sección 6.1
- **Objetivos:** OBJ-1

#### Contexto

Los filtros duros (rol, modalidad, ubicación, salario y seniority) se evalúan sin IA con las reglas de la sección 6.1 del PRD: son rápidos, gratuitos y predecibles.

#### Criterios de aceptación

```gherkin
Escenario: Configurar mis preferencias
  Dado que estoy en la pantalla de preferencias
  Cuando indico mis palabras de rol ("engineer", "developer"; excluir "manager", "sales"), mis modalidades en orden, mis ubicaciones, mi salario mínimo anual y mis seniorities
  Entonces el sistema guarda mis preferencias
  Y las aplica a las ofertas nuevas

Escenario: Descartar una oferta de otro rol
  Dada una oferta con el título "Revenue Accounting Manager"
  Cuando el sistema la evalúa
  Entonces la oferta queda descartada con el motivo "rol"
  Y no se calcula su puntaje

Escenario: Descartar una oferta presencial en una ciudad no aceptada
  Dada una oferta presencial en una ciudad que no está en mis ubicaciones
  Cuando el sistema la evalúa
  Entonces la oferta queda descartada con el motivo "ubicación"

Escenario: Descartar una oferta remota fuera de EE. UU.
  Dada una oferta remota para Canadá
  Cuando el sistema la evalúa
  Entonces la oferta queda descartada con el motivo "ubicación"

Escenario: Comparar un salario por hora
  Dado un salario mínimo de 150 000 USD al año
  Y una oferta que paga entre 60 y 80 USD por hora
  Cuando el sistema la evalúa
  Entonces el criterio de salario es "pass", porque 80 × 2080 = 166 400

Escenario: Un dato desconocido no descarta la oferta
  Dada una oferta sin salario publicado que cumple los demás criterios
  Cuando el sistema la evalúa
  Entonces el criterio de salario aparece como "desconocido"
  Y la oferta recibe su puntaje

Escenario: Seniority que no se puede normalizar
  Dada una oferta cuyo nivel no está en la tabla de mapeo
  Cuando el sistema la evalúa
  Entonces el criterio de seniority aparece como "desconocido"
```

#### Reglas de negocio

- La oferta se descarta solo si algún criterio da `fail`.
- Las ofertas descartadas siguen visibles con su motivo.
- La tabla de mapeo de seniority se define en el cambio de OpenSpec de esta historia.

#### Fuera de alcance

Radio de distancia a una ubicación y ponderación configurable por el usuario.

### HU6 — Obtener un puntaje de encaje explicado

**Como** buscador de empleo,
**quiero** un puntaje de encaje explicado y verificable,
**para** saber por qué una oferta encaja o no con mi perfil.

- **Épica:** E3
- **Prioridad:** must-have
- **Estimación:** 4.5 h
- **Requisitos:** RF-23 a RF-28, RNF-07, RNF-08
- **Objetivos:** OBJ-2

#### Contexto

Solo las ofertas que pasan los filtros, o que tienen datos desconocidos, reciben el puntaje de la IA. El puntaje siempre se explica con fortalezas, brechas y evidencia verificada, y su calidad se mide con el golden set.

#### Criterios de aceptación

```gherkin
Escenario: Ver el puntaje explicado
  Dada una oferta con puntaje calculado de 72
  Cuando abro su detalle
  Entonces veo el puntaje 72 con la etiqueta "good"
  Y veo mis fortalezas, mis brechas y los fragmentos de la oferta y de mi currículum que las respaldan

Escenario: Descartar evidencia inventada
  Dado que la IA devuelve un fragmento de evidencia que no aparece en la oferta ni en el currículum
  Cuando el sistema guarda el análisis
  Entonces ese fragmento no se guarda ni se muestra

Escenario: Puntuar varias ofertas importadas a pedido
  Dadas 5 ofertas importadas sin puntaje
  Cuando las selecciono y pido puntuarlas
  Entonces veo el costo estimado antes de confirmar
  Y al confirmar, las 5 reciben su puntaje

Escenario: Tope de gasto de IA alcanzado
  Dado que el gasto de IA del día alcanzó el tope
  Cuando pido calcular un puntaje
  Entonces el sistema no llama a la IA
  Y muestra un mensaje claro sobre el tope

Escenario: Pedir un puntaje sin currículum activo
  Dado que todavía no cargué mi currículum
  Cuando pido calcular el puntaje de una oferta
  Entonces el sistema no llama a la IA
  Y me indica que primero debo cargar mi currículum

Escenario: Pedir el puntaje de una oferta descartada
  Dada una oferta descartada por los filtros
  Cuando pido calcular su puntaje
  Entonces el sistema lo calcula y lo muestra

Escenario: No repetir un análisis sin cambios
  Dada una oferta con puntaje calculado
  Cuando la abro otra vez sin haber cambiado la oferta, el currículum, el prompt ni el modelo
  Entonces veo el mismo puntaje sin esperar un nuevo cálculo

Escenario: Error en el cálculo del puntaje
  Dado que el servicio de IA no responde correctamente
  Cuando el sistema intenta calcular un puntaje
  Entonces reintenta una vez
  Y si vuelve a fallar, muestra un mensaje claro y la oferta sigue guardada
```

#### Reglas de negocio

- Etiquetas: `strong` ≥ 80, `good` 60-79, `weak` 40-59, `poor` < 40.
- La preferencia por modalidad se aplica como ajuste determinista fuera de la IA (should-have, RF-28).
- La fórmula del puntaje se define en el cambio de OpenSpec de esta historia y se valida con el golden set (≥ 80 % de acuerdo en el conjunto de prueba).

#### Fuera de alcance

Puntaje en lote con la Message Batches API.

### HU7 — Registrar mi decisión sobre cada oferta

**Como** buscador de empleo,
**quiero** registrar si aplico o descarto cada oferta,
**para** cerrar la evaluación y medir cuánto tardo en decidir.

- **Épica:** E3
- **Prioridad:** must-have
- **Estimación:** 1.25 h (incluye medir la línea base, T-31)
- **Requisitos:** RF-07, RF-30, RNF-14
- **Objetivos:** OBJ-1

#### Contexto

La decisión convierte la oferta en candidatura o la archiva, y permite medir OBJ-1 con la primera apertura de la oferta y la hora de la decisión.

#### Criterios de aceptación

```gherkin
Escenario: Decidir aplicar
  Dada una oferta que abrí por primera vez a las 10:00
  Cuando elijo "aplicar" a las 10:01
  Entonces se crea una candidatura en "Saved"
  Y la oferta registra la decisión "apply" con su hora

Escenario: Decidir descartar
  Dada una oferta abierta
  Cuando elijo "descartar" con el motivo "salario bajo"
  Entonces la oferta se archiva con la decisión "skip" y su motivo
```

#### Reglas de negocio

- El puntaje es una recomendación; la decisión siempre es del usuario.
- Una oferta tiene como máximo una candidatura.

#### Fuera de alcance

Deshacer una decisión (v1.1).

---

## E4 — Seguimiento de candidaturas

Capability `application-tracking`. Hoy el historial de cada candidatura está disperso en el correo.

### HU8 — Gestionar candidaturas en un pipeline

**Como** buscador de empleo,
**quiero** gestionar mis candidaturas en un tablero por estado con su historial,
**para** saber en todo momento en qué va cada proceso.

- **Épica:** E4
- **Prioridad:** must-have
- **Estimación:** 3 h
- **Requisitos:** RF-30 a RF-35
- **Objetivos:** OBJ-3

#### Contexto

Las candidaturas nacen de la decisión "aplicar" (HU7). El tablero muestra el estado de todas y conserva cada cambio con su fecha.

#### Criterios de aceptación

```gherkin
Escenario: Cambiar el estado con el selector
  Dada una candidatura en "Saved"
  Cuando elijo "Applied" en su selector de estado
  Entonces aparece en la columna "Applied"
  Y su historial registra el cambio con la fecha

Escenario: Cambiar el estado solo con el teclado
  Dado que navego el tablero solo con el teclado
  Cuando enfoco una candidatura y elijo un estado nuevo en su selector
  Entonces la candidatura cambia de estado

Escenario: Retirarme de un proceso
  Dada una candidatura en cualquier estado activo
  Cuando la marco como "Withdrawn"
  Entonces sale de las columnas activas
  Y su historial registra que me retiré

Escenario: Registrar un rechazo
  Dada una candidatura en cualquier estado activo
  Cuando la marco como "Rejected"
  Entonces sale de las columnas activas
  Y su historial registra el rechazo

Escenario: Un estado final no cambia
  Dada una candidatura en "Rejected"
  Cuando intento moverla a "Interviewing"
  Entonces el sistema no lo permite y muestra un mensaje claro

Escenario: Ver el detalle de una candidatura
  Dada una candidatura con varios cambios de estado
  Cuando abro su detalle
  Entonces veo la oferta, su puntaje, el estado actual y el historial en orden cronológico

Escenario: Agregar una nota (should-have)
  Dada una candidatura
  Cuando agrego una nota
  Entonces la nota aparece en el historial con su fecha
```

#### Reglas de negocio

- Estados: `saved`, `applied`, `interviewing`, `offer`, `rejected`, `withdrawn`. `rejected` y `withdrawn` son finales.
- Cada cambio de estado queda en el historial; el historial no se edita.

#### Fuera de alcance

Mover candidaturas arrastrándolas (RF-33a, could-have), recordatorios por correo, calendario de entrevistas y métricas del pipeline (v1.1).

### HU9 — Correos y alertas de seguimiento

**Como** buscador de empleo,
**quiero** pegar los correos de cada proceso en su candidatura y recibir alertas cuando una candidatura lleve días sin actividad,
**para** no perder ningún seguimiento.

- **Épica:** E4
- **Prioridad:** should-have
- **Estimación:** 3 h
- **Requisitos:** RF-40 a RF-43
- **Objetivos:** OBJ-3

#### Contexto

La IA clasifica cada correo y sugiere el cambio de estado, que el usuario confirma.

#### Criterios de aceptación

```gherkin
Escenario: Clasificar un correo pegado
  Dada una candidatura en "Applied"
  Cuando pego un correo de invitación a entrevista
  Entonces el correo aparece en el historial clasificado como "invitación a entrevista"
  Y el sistema sugiere mover la candidatura a "Interviewing"

Escenario: La sugerencia requiere confirmación
  Dada una sugerencia de cambio de estado a partir de un correo
  Cuando no la confirmo
  Entonces la candidatura conserva su estado

Escenario: Alerta de seguimiento
  Dada una candidatura en "Applied" sin actividad durante 10 días
  Cuando abro el tablero
  Entonces la candidatura aparece marcada para seguimiento

Escenario: Configurar los días de la alerta
  Cuando cambio los días sin actividad a 7 en mis preferencias
  Entonces las alertas usan el nuevo valor
```

#### Reglas de negocio

- Cuenta como actividad un cambio de estado, una nota o un correo (RF-43).
- La IA nunca cambia el estado sin confirmación del usuario.

#### Fuera de alcance

Leer el correo directamente desde Gmail (v1.1) y enviar correos (excluido en la visión).

---

## E5 — Plataforma

Capability `platform`. Incluye el walking skeleton (autenticación, i18n base, cola de trabajos, cliente de IA, contenedor, CI y despliegue; tickets T-01 a T-05), que no es una historia de usuario.

### HU10 — Interfaz en español

**Como** buscador de empleo,
**quiero** cambiar el idioma de la interfaz entre inglés y español,
**para** trabajar en el idioma que prefiera en cada momento.

- **Épica:** E5
- **Prioridad:** should-have
- **Estimación:** 2 h
- **Requisitos:** RF-50 a RF-52
- **Objetivos:** —

#### Contexto

Las cadenas de la interfaz se externalizan desde el walking skeleton (RF-50, must-have); esta historia solo agrega la traducción y el selector de idioma.

#### Criterios de aceptación

```gherkin
Escenario: Idioma por defecto
  Cuando entro por primera vez
  Entonces la interfaz está en inglés

Escenario: Cambiar a español
  Dada la interfaz en inglés
  Cuando elijo español
  Entonces todos los textos de la interfaz aparecen en español

Escenario: Recordar el idioma
  Dado que elegí español
  Cuando cierro sesión y vuelvo a entrar
  Entonces la interfaz sigue en español
```

#### Reglas de negocio

- El inglés es el idioma por defecto.

#### Fuera de alcance

Generar los análisis de la IA en el idioma elegido (RF-52, could-have).

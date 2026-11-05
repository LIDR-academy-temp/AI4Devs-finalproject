# Historias de usuario — ATS personal

> Detalle de las historias del MVP definidas en [`docs/prd.md`](./prd.md) (sección 5). Cada historia usa lenguaje de negocio; la implementación técnica se describe en [`docs/tickets.md`](./tickets.md). Los criterios de aceptación (Dado/Cuando/Entonces) se convierten en escenarios de las specs de OpenSpec.

- **Estado:** borrador v0.2 (incorpora la revisión adversarial de `docs/prd-review.md`)
- **Fecha:** 2026-11-04

---

## Resumen y orden de construcción

| Orden | Id | Historia | Prioridad | Estimación | Depende de |
| --- | --- | --- | --- | --- | --- |
| 0 | — | Walking skeleton (infraestructura, ver tickets) | Must-have | 6.25 h | — |
| 1 | HU2 | Cargar el currículum y obtener un perfil | Must-have | 2.75 h (+1 h PDF, should-have) | Walking skeleton |
| 2 | HU1 | Recolectar, importar y agregar ofertas | Must-have | 11 h | Walking skeleton |
| 3 | HU3 | Filtros duros, puntaje y decisión | Must-have | 7 h | HU1, HU2 |
| 4 | HU4 | Pipeline de candidaturas | Must-have | 3 h | HU3 |
| 5 | HU5 | Correos y alertas de seguimiento | Should-have | 3 h | HU4 |
| 6 | HU6 | Interfaz en español | Should-have | 2 h | Walking skeleton |

Estimación del MVP imprescindible: ~30 h (walking skeleton + HU1 a HU4) más 2.25 h para la prueba E2E y la documentación final: ~33 h, dentro del tope de 36 h. Las historias y requisitos should-have se construyen solo si queda tiempo. El detalle por ticket está en `docs/tickets.md`.

Dentro de HU1, el orden es: pegar el texto → adaptador de Greenhouse → adaptadores de Ashby y Lever → spike y búsquedas en el agregador. Orden de recorte si falta tiempo: agregador → Lever.

---

## HU1 — Recolectar, importar y agregar ofertas

**Como** buscador de empleo,
**quiero** que las ofertas de mis empresas objetivo y de mis búsquedas lleguen automáticamente, y poder agregar otras pegando su texto,
**para** tener todas las ofertas que me interesan en un solo lugar sin buscarlas portal por portal.

- **Prioridad:** must-have
- **Estimación:** 11 h
- **Requisitos:** RF-01 a RF-06, RF-04a, RF-04b, RF-09
- **Objetivos:** OBJ-1, OBJ-5

### Contexto

La recolección automática es tan importante como pegar ofertas. Las empresas que publican en Greenhouse, Ashby o Lever se importan desde su job board. Para las empresas grandes sin API propia, el sistema ejecuta búsquedas guardadas en un agregador de ofertas. Cualquier otra oferta se agrega pegando su texto. En todos los casos, la oferta se guarda con campos estructurados para poder filtrarla y compararla con el currículum.

### Criterios de aceptación

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
    | Lever      |

Escenario: Guardar y ejecutar una búsqueda en el agregador
  Dado que guardé una búsqueda con las palabras "software engineer" y la ubicación "Seattle, WA"
  Cuando pido ejecutarla
  Entonces las ofertas encontradas aparecen en mi lista con la búsqueda como origen

Escenario: Tope de ofertas por sincronización
  Dado un tope de 50 ofertas nuevas por sincronización
  Cuando una importación encuentra 140 ofertas nuevas
  Entonces solo se agregan 50
  Y veo cuántas se agregaron, cuántas se omitieron por duplicadas y cuántas por el tope

Escenario: No duplicar ofertas
  Dada una oferta que ya importé
  Cuando importo otra vez las ofertas de la misma fuente
  Entonces la oferta no aparece duplicada

Escenario: Ver y ordenar la lista de ofertas
  Dado que tengo varias ofertas guardadas
  Cuando abro la lista de ofertas
  Entonces veo para cada una su título, empresa, origen, resultado del filtro, puntaje y decisión
  Y puedo ordenarlas por puntaje o por fecha
```

### Reglas de negocio

- Los campos ausentes en la oferta quedan como desconocidos; la calidad de la extracción se mide con el golden set (RF-02).
- Una oferta se identifica por su fuente y su identificador externo, o por su URL.
- Las empresas sin API se registran igual; sus ofertas llegan por búsquedas en el agregador o pegando el texto.

### Fuera de alcance

Descargar una oferta a partir de su URL (RF-08, could-have), adaptador de Workday (futuro), alertas de empleo por Gmail (v1.1) y SmartRecruiters (v1.1, salvo que reemplace al agregador).

---

## HU2 — Cargar el currículum y obtener un perfil

**Como** buscador de empleo,
**quiero** cargar mi currículum y obtener un perfil estructurado que pueda corregir,
**para** que el sistema compare cada oferta con mi experiencia real.

- **Prioridad:** must-have (carga en PDF: should-have)
- **Estimación:** 2.75 h (+1 h para PDF)
- **Requisitos:** RF-10 a RF-14
- **Objetivos:** OBJ-1, OBJ-2

### Contexto

El perfil es la base del puntaje de encaje. El currículum se guarda en Markdown, que es más barato de enviar a la IA que un PDF. La carga en PDF, con conversión única a Markdown, es should-have.

### Criterios de aceptación

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
  Y puedo pedir recalcularlos después de ver que son 30 ofertas

Escenario: Cargar el currículum en PDF (should-have)
  Dado que no tengo un currículum cargado
  Cuando subo mi currículum en PDF
  Entonces el sistema lo convierte a Markdown y veo el perfil generado

Escenario: PDF que no se puede leer (should-have)
  Dado un PDF sin texto legible
  Cuando lo subo
  Entonces el sistema me pide pegar el contenido como texto
```

### Reglas de negocio

- Solo hay un currículum activo.
- El perfil corregido por el usuario prevalece sobre el generado.
- Un currículum nuevo no recalcula puntajes automáticamente.

### Fuera de alcance

Varios currículums por tipo de rol (futuro) y análisis del currículum como lo haría el ATS de una empresa (futuro).

---

## HU3 — Filtros duros, puntaje y decisión

**Como** buscador de empleo,
**quiero** que cada oferta pase por mis criterios no negociables, reciba un puntaje de encaje explicado y pueda registrar mi decisión,
**para** decidir en menos de 2 minutos si vale la pena aplicar.

- **Prioridad:** must-have
- **Estimación:** 7 h (más la decisión, incluida en los tickets de ofertas)
- **Requisitos:** RF-07, RF-20 a RF-28, RNF-08, RNF-14
- **Objetivos:** OBJ-1, OBJ-2

### Contexto

Los filtros duros se evalúan sin IA, con las reglas de la sección 6.1 del PRD: son rápidos, gratuitos y predecibles. Solo las ofertas que los pasan, o que tienen datos desconocidos, reciben el puntaje de la IA. El puntaje siempre se explica con fortalezas, brechas y evidencia verificada. La decisión del usuario cierra el ciclo y permite medir OBJ-1.

### Criterios de aceptación

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

Escenario: Ver el puntaje explicado
  Dada una oferta con puntaje calculado de 72
  Cuando abro su detalle
  Entonces veo el puntaje 72 con la etiqueta "good"
  Y veo mis fortalezas, mis brechas y los fragmentos de la oferta y de mi currículum que las respaldan

Escenario: Descartar evidencia inventada
  Dado que la IA devuelve un fragmento de evidencia que no aparece en la oferta ni en el currículum
  Cuando el sistema guarda el análisis
  Entonces ese fragmento no se guarda ni se muestra

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

### Reglas de negocio

- Reglas de cada criterio: `docs/prd.md`, sección 6.1. La oferta se descarta solo si algún criterio da `fail`.
- Etiquetas: `strong` ≥ 80, `good` 60-79, `weak` 40-59, `poor` < 40.
- La preferencia por modalidad se aplica como ajuste determinista fuera de la IA (should-have, RF-28).
- El puntaje es una recomendación; la decisión siempre es del usuario.
- La fórmula del puntaje y la tabla de seniority se definen en el cambio de OpenSpec de esta historia y se validan con el golden set.

### Fuera de alcance

Radio de distancia a una ubicación, ponderación configurable por el usuario y puntaje en lote con la Message Batches API.

---

## HU4 — Pipeline de candidaturas

**Como** buscador de empleo,
**quiero** gestionar mis candidaturas en un tablero por estado con su historial,
**para** saber en todo momento en qué va cada proceso.

- **Prioridad:** must-have
- **Estimación:** 3 h
- **Requisitos:** RF-30 a RF-35
- **Objetivo:** OBJ-3

### Contexto

Hoy el historial de cada candidatura está disperso en el correo. El tablero muestra el estado de todas las candidaturas y conserva cada cambio con su fecha. Las candidaturas nacen de la decisión "aplicar" (HU3).

### Criterios de aceptación

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

### Reglas de negocio

- Estados: `saved`, `applied`, `interviewing`, `offer`, `rejected`, `withdrawn`. `rejected` y `withdrawn` son finales.
- Una oferta tiene como máximo una candidatura.
- Cada cambio de estado queda en el historial; el historial no se edita.

### Fuera de alcance

Mover candidaturas arrastrándolas (RF-33a, could-have), recordatorios por correo, calendario de entrevistas y métricas del pipeline (v1.1).

---

## HU5 — Correos y alertas de seguimiento (should-have)

**Como** buscador de empleo,
**quiero** pegar los correos de cada proceso en su candidatura y recibir alertas cuando una candidatura lleve días sin actividad,
**para** no perder ningún seguimiento.

- **Prioridad:** should-have
- **Estimación:** 3 h
- **Requisitos:** RF-40 a RF-43
- **Objetivo:** OBJ-3

### Criterios de aceptación

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

### Reglas de negocio

- Cuenta como actividad un cambio de estado, una nota o un correo (RF-43).
- La IA nunca cambia el estado sin confirmación del usuario.

### Fuera de alcance

Leer el correo directamente desde Gmail (v1.1) y enviar correos (excluido en la visión).

---

## HU6 — Interfaz en español (should-have)

**Como** buscador de empleo,
**quiero** cambiar el idioma de la interfaz entre inglés y español,
**para** trabajar en el idioma que prefiera en cada momento.

- **Prioridad:** should-have
- **Estimación:** 2 h
- **Requisitos:** RF-50 a RF-52

### Criterios de aceptación

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

### Notas

Las cadenas de la interfaz se externalizan desde el walking skeleton (RF-50, must-have); esta historia solo agrega la traducción y el selector de idioma.

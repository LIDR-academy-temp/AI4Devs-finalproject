# Historias de usuario — ATS personal

> Detalle de las historias del MVP definidas en [`docs/prd.md`](./prd.md) (sección 5). Cada historia usa lenguaje de negocio; la implementación técnica se describe en los tickets de trabajo. Los criterios de aceptación (Dado/Cuando/Entonces) se convierten en escenarios de las specs de OpenSpec.

- **Estado:** borrador v0.1
- **Fecha:** 2026-11-04

---

## Resumen y orden de construcción

| Orden | Id | Historia | Prioridad | Estimación | Depende de |
| --- | --- | --- | --- | --- | --- |
| 0 | — | Walking skeleton (infraestructura, ver tickets) | Must-have | 6.5 h | — |
| 1 | HU2 | Cargar el currículum y obtener un perfil | Must-have | 4 h | Walking skeleton |
| 2 | HU1 | Agregar e importar ofertas | Must-have | 6 h | Walking skeleton |
| 3 | HU3 | Filtros duros y puntaje de encaje | Must-have | 6 h | HU1, HU2 |
| 4 | HU4 | Pipeline de candidaturas | Must-have | 3.5 h | HU1 |
| 5 | HU5 | Correos y alertas de seguimiento | Should-have | 3 h | HU4 |
| 6 | HU6 | Interfaz en español | Should-have | 2 h | Walking skeleton |

Estimación del MVP imprescindible: 26 h (walking skeleton + HU1 a HU4), más 2 h para la prueba E2E y la documentación final: 28 h en total. El detalle por ticket está en `docs/tickets.md`. Las historias should-have se construyen solo si queda tiempo.

Dentro de HU1, el orden es: primero pegar el texto (RF-01 a RF-03), luego la importación desde Greenhouse (RF-04, RF-09). Si falta tiempo, la importación se reduce a una sola empresa.

---

## HU1 — Agregar e importar ofertas

**Como** buscador de empleo,
**quiero** agregar ofertas pegando su texto o importándolas de las empresas que sigo,
**para** tener todas las ofertas que me interesan en un solo lugar.

- **Prioridad:** must-have
- **Estimación:** 6 h
- **Requisitos:** RF-01 a RF-09
- **Objetivo:** OBJ-1

### Contexto

Las ofertas de las empresas grandes de la lista no tienen API pública, así que se agregan pegando el texto. Las empresas que publican en Greenhouse se importan automáticamente. En los dos casos, el sistema guarda la oferta con campos estructurados para poder filtrarla y compararla con el currículum.

### Criterios de aceptación

```gherkin
Escenario: Extraer los campos de una oferta pegada
  Dado que estoy en la pantalla para agregar una oferta
  Cuando pego el texto de una oferta que menciona título, empresa, ubicación, modalidad y salario
  Entonces veo esos campos completados por el sistema
  Y puedo corregir cualquiera de ellos antes de guardar

Escenario: Un dato ausente queda como desconocido
  Dado el texto de una oferta que no menciona el salario
  Cuando el sistema extrae los campos
  Entonces el salario aparece como "desconocido"
  Y el sistema no inventa un valor

Escenario: Guardar una oferta revisada
  Dado que revisé los campos extraídos de una oferta
  Cuando la guardo
  Entonces aparece en mi lista de ofertas

Escenario: Registrar una empresa objetivo
  Dado que estoy en la pantalla de empresas objetivo
  Cuando registro una empresa con su nombre, su tipo y su plataforma de empleo
  Entonces la empresa aparece en mi lista
  Y si la plataforma es Greenhouse, puedo indicar el identificador de su job board

Escenario: Importar las ofertas de una empresa en Greenhouse
  Dada una empresa objetivo con plataforma Greenhouse y un identificador de job board válido
  Cuando pido importar sus ofertas
  Entonces veo el progreso de la importación
  Y al terminar, sus ofertas aparecen en mi lista con la empresa como origen

Escenario: No duplicar ofertas
  Dada una oferta que ya importé
  Cuando importo otra vez las ofertas de la misma empresa
  Entonces la oferta no aparece duplicada

Escenario: Ver y ordenar la lista de ofertas
  Dado que tengo varias ofertas guardadas
  Cuando abro la lista de ofertas
  Entonces veo para cada una su título, empresa, resultado del filtro y puntaje
  Y puedo ordenarlas por puntaje o por fecha
```

### Reglas de negocio

- Los campos ausentes en la oferta nunca se inventan.
- Una oferta se identifica por su plataforma y su identificador externo, o por su URL.
- Las empresas sin API se registran igual; sus ofertas se agregan pegando el texto.

### Fuera de alcance

Descargar una oferta a partir de su URL (RF-08, could-have), otras plataformas distintas de Greenhouse (v1.1) y alertas por correo (v1.1).

---

## HU2 — Cargar el currículum y obtener un perfil

**Como** buscador de empleo,
**quiero** cargar mi currículum y obtener un perfil estructurado que pueda corregir,
**para** que el sistema compare cada oferta con mi experiencia real.

- **Prioridad:** must-have
- **Estimación:** 4 h
- **Requisitos:** RF-10 a RF-14
- **Objetivo:** OBJ-1, OBJ-2

### Contexto

El perfil es la base del puntaje de encaje. El currículum se guarda en Markdown, que es más barato de enviar a la IA que un PDF. Si el usuario sube un PDF, el sistema lo convierte una sola vez.

### Criterios de aceptación

```gherkin
Escenario: Cargar el currículum en Markdown
  Dado que no tengo un currículum cargado
  Cuando subo mi currículum en un archivo Markdown
  Entonces veo un perfil con mis habilidades, experiencia, años de experiencia, seniority, formación e idiomas

Escenario: Cargar el currículum en PDF
  Dado que no tengo un currículum cargado
  Cuando subo mi currículum en PDF
  Entonces el sistema lo convierte a Markdown
  Y veo el perfil generado a partir de él

Escenario: PDF que no se puede leer
  Dado un PDF sin texto legible
  Cuando lo subo
  Entonces el sistema me pide pegar el contenido como texto

Escenario: Rechazar un archivo no permitido
  Cuando subo un archivo que no es PDF ni Markdown, o que pesa más de 5 MB
  Entonces el sistema lo rechaza con un mensaje claro

Escenario: Corregir el perfil
  Dado un perfil generado
  Cuando corrijo una habilidad o los años de experiencia y guardo
  Entonces los siguientes puntajes usan el perfil corregido

Escenario: Reemplazar el currículum
  Dado que ya tengo un currículum con puntajes calculados
  Cuando subo un currículum nuevo
  Entonces el nuevo pasa a ser el activo
  Y los puntajes anteriores aparecen marcados como desactualizados
```

### Reglas de negocio

- Solo hay un currículum activo.
- El perfil corregido por el usuario prevalece sobre el generado.

### Fuera de alcance

Varios currículums por tipo de rol (futuro) y análisis del currículum como lo haría el ATS de una empresa (futuro).

---

## HU3 — Filtros duros y puntaje de encaje

**Como** buscador de empleo,
**quiero** que cada oferta pase por mis criterios no negociables y reciba un puntaje de encaje explicado,
**para** decidir en menos de 2 minutos si vale la pena aplicar.

- **Prioridad:** must-have
- **Estimación:** 6 h
- **Requisitos:** RF-20 a RF-28, RNF-08
- **Objetivos:** OBJ-1, OBJ-2

### Contexto

Los filtros duros se evalúan sin IA: son rápidos, gratuitos y predecibles. Solo las ofertas que los pasan, o que tienen datos desconocidos, reciben el puntaje de la IA. El puntaje siempre se explica con fortalezas, brechas y evidencia.

### Criterios de aceptación

```gherkin
Escenario: Configurar mis preferencias
  Dado que estoy en la pantalla de preferencias
  Cuando indico mis modalidades aceptadas en orden (híbrido, remoto, presencial), mis ubicaciones, mi salario mínimo anual y mis seniorities aceptados
  Entonces el sistema guarda mis preferencias
  Y las aplica a las ofertas nuevas

Escenario: Descartar una oferta que no cumple un criterio
  Dada una oferta presencial en una ciudad que no está en mis ubicaciones
  Cuando el sistema la evalúa
  Entonces la oferta queda descartada con el motivo "ubicación"
  Y no se calcula su puntaje

Escenario: Un dato desconocido no descarta la oferta
  Dada una oferta sin salario publicado que cumple los demás criterios
  Cuando el sistema la evalúa
  Entonces el criterio de salario aparece como "desconocido"
  Y la oferta recibe su puntaje

Escenario: Ver el puntaje explicado
  Dada una oferta con puntaje calculado
  Cuando abro su detalle
  Entonces veo un puntaje de 0 a 100 y su etiqueta (strong, good, weak o poor)
  Y veo mis fortalezas, mis brechas y los fragmentos de la oferta y de mi currículum que las respaldan

Escenario: Pedir el puntaje de una oferta descartada
  Dada una oferta descartada por los filtros
  Cuando pido calcular su puntaje
  Entonces el sistema lo calcula y lo muestra

Escenario: No repetir un análisis sin cambios
  Dada una oferta con puntaje calculado
  Cuando la abro otra vez sin haber cambiado la oferta ni el currículum
  Entonces veo el mismo puntaje sin esperar un nuevo cálculo

Escenario: Error en el cálculo del puntaje
  Dado que el servicio de IA no responde correctamente
  Cuando el sistema intenta calcular un puntaje
  Entonces reintenta una vez
  Y si vuelve a fallar, muestra un mensaje claro y la oferta sigue guardada
```

### Reglas de negocio

- Resultado de cada criterio: `pass`, `fail` o `unknown`. La oferta se descarta solo si algún criterio da `fail`.
- La preferencia por modalidad (híbrido > remoto > presencial) influye en el puntaje, pero no descarta (should-have, RF-28).
- El puntaje es una recomendación; la decisión de aplicar siempre es del usuario.
- La fórmula del puntaje se define en el cambio de OpenSpec de esta historia y se valida con el golden set (≥ 80 % de acuerdo).

### Fuera de alcance

Radio de distancia a una ubicación, ponderación configurable por el usuario y puntaje en lote con la Message Batches API.

---

## HU4 — Pipeline de candidaturas

**Como** buscador de empleo,
**quiero** gestionar mis candidaturas en un tablero por estado con su historial,
**para** saber en todo momento en qué va cada proceso.

- **Prioridad:** must-have
- **Estimación:** 3.5 h
- **Requisitos:** RF-30 a RF-35
- **Objetivo:** OBJ-3

### Contexto

Hoy el historial de cada candidatura está disperso en el correo. El tablero muestra el estado de todas las candidaturas y conserva cada cambio con su fecha.

### Criterios de aceptación

```gherkin
Escenario: Crear una candidatura desde una oferta
  Dada una oferta guardada
  Cuando creo una candidatura a partir de ella
  Entonces la candidatura aparece en la columna "Saved" del tablero

Escenario: Mover una candidatura de estado
  Dada una candidatura en "Saved"
  Cuando la muevo a "Applied"
  Entonces aparece en la columna "Applied"
  Y su historial registra el cambio con la fecha

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

Escenario: Ver el detalle de una candidatura
  Dada una candidatura con varios cambios de estado
  Cuando abro su detalle
  Entonces veo la oferta, su puntaje, el estado actual y el historial en orden cronológico

Escenario: Agregar una nota
  Dada una candidatura
  Cuando agrego una nota
  Entonces la nota aparece en el historial con su fecha

Escenario: Mover candidaturas con el teclado
  Dado que navego el tablero solo con el teclado
  Cuando selecciono una candidatura y elijo un estado nuevo
  Entonces la candidatura cambia de estado igual que al arrastrarla
```

### Reglas de negocio

- Estados: `saved`, `applied`, `interviewing`, `offer`, `rejected`, `withdrawn`. `rejected` y `withdrawn` son finales.
- Una oferta tiene como máximo una candidatura.
- Cada cambio de estado queda en el historial; el historial no se edita.

### Fuera de alcance

Recordatorios por correo, calendario de entrevistas y métricas del pipeline (v1.1).

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

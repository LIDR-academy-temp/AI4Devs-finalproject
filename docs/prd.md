# PRD del MVP — ATS personal

> Fase 1 (Producto) del AI SDLC. Detalla solo lo que entra en el MVP. El contexto, la hipótesis y el alcance completo están en [`docs/vision.md`](./vision.md).

- **Estado:** borrador v0.1
- **Fecha:** 2026-11-04
- **Presupuesto de desarrollo:** ~30 horas asistidas por IA

---

## 1. Resumen

El MVP es un panel web personal para buscar empleo en Estados Unidos. Concentra las ofertas, descarta las que no cumplen los criterios no negociables, calcula con IA un puntaje de encaje explicado contra el currículum y gestiona cada candidatura en un pipeline.

## 2. Objetivos y métricas de éxito

| Id | Objetivo | Métrica | Meta |
| --- | --- | --- | --- |
| OBJ-1 | Decidir más rápido si conviene aplicar | Tiempo desde que la oferta entra al panel hasta la decisión | < 2 min (línea base supuesta: ~15 min) |
| OBJ-2 | Confiar en el puntaje | Acuerdo entre el puntaje y el juicio manual en el conjunto de referencia | ≥ 80 % |
| OBJ-3 | Tener el estado de todas las candidaturas en un solo lugar | Candidaturas activas registradas en el pipeline | 100 % |
| OBJ-4 | Demostrar el flujo de punta a punta | Flujo principal desplegado y cubierto por una prueba E2E | Sí |

## 3. Usuario

Un único usuario: el autor, profesional del software que busca empleo en EE. UU. con preferencia por modalidad híbrida (también acepta remoto y presencial), sin necesidad de visa y con un solo currículum. Detalle en `docs/vision.md`, sección 2.

## 4. Flujo principal

```text
 1. Iniciar sesión
 2. Cargar el currículum ──▶ la IA extrae el perfil ──▶ el usuario lo revisa
 3. Definir filtros duros (modalidad, ubicación, salario mínimo, seniority)
 4. Agregar ofertas (pegar texto o importar desde una fuente pública)
          │
          ▼
 5. Filtros duros ──▶ no cumple: descartada, con el motivo visible
          │ cumple o hay datos desconocidos
          ▼
 6. Puntaje de encaje (IA): 0-100, fortalezas, brechas y evidencia
          │
          ▼
 7. El usuario decide ──▶ crea la candidatura ──▶ la mueve por el pipeline
```

El flujo E2E obligatorio para la entrega final cubre los pasos 1, 4, 5, 6 y 7.

## 5. Alcance del MVP

### 5.1 Historias de usuario

| Id | Historia | Prioridad |
| --- | --- | --- |
| HU1 | Como buscador de empleo, quiero agregar ofertas pegando su texto o importándolas de una fuente pública, para tenerlas en un solo lugar. | Must-have |
| HU2 | Como buscador de empleo, quiero cargar mi currículum y obtener un perfil estructurado que pueda corregir, para que el sistema me conozca. | Must-have |
| HU3 | Como buscador de empleo, quiero que cada oferta pase por mis filtros duros y reciba un puntaje de encaje explicado, para decidir rápido si aplico. | Must-have |
| HU4 | Como buscador de empleo, quiero gestionar mis candidaturas en un pipeline con historial de cambios, para saber en qué estado va cada una. | Must-have |
| HU5 | Como buscador de empleo, quiero pegar un correo en una candidatura y que la IA lo clasifique, y recibir alertas de seguimiento, para no perder ningún proceso. | Should-have |
| HU6 | Como buscador de empleo, quiero usar la interfaz en español, para trabajar en mi idioma cuando lo prefiera. | Should-have |

La autenticación de un solo usuario es un requisito técnico del walking skeleton, no una historia (ver RNF-01).

### 5.2 Fuera del MVP

Todo lo etiquetado `v1.1` o `futuro` en `docs/vision.md` (sección 6): segunda fuente de ofertas, lectura de Gmail, dashboard de métricas, carta de presentación, varios currículums, vista híbrida, RAG para entrevistas, extensión de navegador y multiusuario.

## 6. Requisitos funcionales

Prioridad según MoSCoW: **M** = must, **S** = should, **C** = could.

### HU1 — Ofertas

| Id | Requisito | Prioridad |
| --- | --- | --- |
| RF-01 | El usuario pega el texto de una oferta y, opcionalmente, su URL de origen. | M |
| RF-02 | La IA extrae los campos estructurados de la oferta: título, empresa, ubicación, modalidad (`remote`, `hybrid`, `onsite`), salario (mínimo, máximo, moneda, periodo), seniority, habilidades requeridas y deseables, y años de experiencia pedidos. Los campos ausentes quedan como desconocidos; nunca se inventan. | M |
| RF-03 | El usuario revisa y corrige los campos extraídos antes de guardar. | M |
| RF-04 | El usuario importa las ofertas de sus empresas objetivo desde la API pública de su plataforma de empleo. La importación usa una interfaz común de adaptadores; el MVP implementa solo el adaptador de Greenhouse. | M |
| RF-09 | El usuario gestiona su lista de empresas objetivo: nombre, tipo (`big` o `mid`), plataforma de empleo y, si la plataforma tiene API, el identificador de su job board. Las empresas sin API se registran igual y sus ofertas se agregan pegando el texto. | M |
| RF-05 | El sistema evita duplicados por fuente e identificador externo, o por URL. | M |
| RF-06 | El usuario ve la lista de ofertas con su estado de filtro y su puntaje, y la ordena por puntaje o fecha. | M |
| RF-07 | El usuario archiva una oferta que no le interesa. | S |
| RF-08 | El sistema descarga y lee el contenido a partir de una URL pegada. | C |

### HU2 — Currículum

| Id | Requisito | Prioridad |
| --- | --- | --- |
| RF-10 | El usuario carga su currículum en PDF (máximo 5 MB). | M |
| RF-11 | El sistema extrae el texto del PDF; si no puede, pide pegarlo como texto. | M |
| RF-12 | La IA genera un perfil estructurado: habilidades (con años cuando se puedan inferir), experiencia laboral, años totales de experiencia, seniority estimado, formación e idiomas. | M |
| RF-13 | El usuario revisa y corrige el perfil. El perfil corregido es la fuente para el puntaje. | M |
| RF-14 | Hay un solo currículum activo. Cargar uno nuevo crea una nueva versión y marca los puntajes anteriores como desactualizados. | M |

### HU3 — Filtros duros y puntaje de encaje

| Id | Requisito | Prioridad |
| --- | --- | --- |
| RF-20 | El usuario configura sus preferencias: modalidades aceptadas en orden de preferencia, ubicaciones aceptadas (ciudades o áreas metropolitanas para modalidades híbrida y presencial), salario mínimo anual en USD y seniorities aceptados. | M |
| RF-21 | Los filtros duros se evalúan sin IA y devuelven `pass`, `fail` o `unknown`, con el motivo de cada criterio. | M |
| RF-22 | Un dato ausente en la oferta (por ejemplo, el salario) da `unknown` en ese criterio y no descarta la oferta. | M |
| RF-23 | Solo las ofertas con resultado `pass` o `unknown` reciben puntaje automáticamente. El usuario puede pedir el puntaje de una oferta descartada. | M |
| RF-24 | La IA devuelve, con respuesta estructurada: puntaje de 0 a 100, etiqueta (`strong`, `good`, `weak`, `poor`), fortalezas, brechas y evidencia citada de la oferta y del currículum. | M |
| RF-25 | El sistema guarda con cada análisis el modelo, la versión del prompt, la versión del currículum y la fecha. | M |
| RF-26 | El sistema no repite un análisis si no cambiaron la oferta, el currículum ni la versión del prompt. | M |
| RF-27 | El usuario recalcula el puntaje de una oferta a demanda. | S |
| RF-28 | La preferencia por modalidad suma al puntaje pero no descarta: híbrido > remoto > presencial. | S |

### HU4 — Pipeline de candidaturas

| Id | Requisito | Prioridad |
| --- | --- | --- |
| RF-30 | El usuario crea una candidatura a partir de una oferta. | M |
| RF-31 | Estados de la candidatura: `saved`, `applied`, `interviewing`, `offer`, `rejected`, `withdrawn`. Cualquier estado activo puede pasar a `rejected` (la empresa descarta) o a `withdrawn` (el usuario se retira). | M |
| RF-32 | Cada cambio de estado crea un evento en el historial con fecha y nota opcional. | M |
| RF-33 | El usuario ve las candidaturas en un tablero por estado (Kanban) y mueve una candidatura entre columnas. | M |
| RF-34 | El usuario ve el detalle de una candidatura: oferta, puntaje, estado e historial. | M |
| RF-35 | El usuario agrega notas libres al historial. | S |

### HU5 — Correos y alertas (should-have)

| Id | Requisito | Prioridad |
| --- | --- | --- |
| RF-40 | El usuario pega un correo en una candidatura (remitente, fecha, asunto y cuerpo). | S |
| RF-41 | La IA clasifica el correo (`confirmation`, `interview_invite`, `rejection`, `offer`, `other`) y extrae la fecha relevante y el siguiente paso. | S |
| RF-42 | El sistema sugiere el cambio de estado que corresponde a la clasificación; el usuario lo confirma. | S |
| RF-43 | El sistema marca las candidaturas `applied` o `interviewing` sin actividad durante N días (valor configurable; por defecto 10). | S |

### HU6 — Interfaz en español (should-have)

| Id | Requisito | Prioridad |
| --- | --- | --- |
| RF-50 | La interfaz se construye en inglés con todas las cadenas externalizadas (i18n) desde el inicio. | M |
| RF-51 | El usuario cambia el idioma de la interfaz entre inglés y español; la elección se recuerda. | S |
| RF-52 | Los análisis de la IA se generan en el idioma de la interfaz. | C |

> RF-50 es must-have aunque pertenece a HU6, porque externalizar las cadenas desde el walking skeleton cuesta poco y evita retrabajo.

## 7. Criterios de aceptación de alto nivel

Los criterios detallados (Given/When/Then) se escriben al pasar cada historia a un cambio de OpenSpec.

**HU1**
- Dado el texto de una oferta con salario y modalidad, cuando lo pego, entonces veo los campos extraídos y puedo corregirlos antes de guardar.
- Dada una oferta sin salario, cuando se extrae, entonces el salario queda como desconocido.
- Dada una oferta ya importada, cuando la importo otra vez, entonces no se crea un duplicado.

**HU2**
- Dado un PDF válido, cuando lo cargo, entonces veo un perfil con mis habilidades y experiencia que puedo editar.
- Dado un PDF sin texto legible, cuando lo cargo, entonces el sistema me pide pegar el texto.

**HU3**
- Dada una oferta presencial en una ciudad no aceptada, cuando se evalúa, entonces queda descartada con el motivo "ubicación" y no se llama a la IA.
- Dada una oferta sin salario que cumple los demás criterios, cuando se evalúa, entonces recibe puntaje y el criterio de salario aparece como desconocido.
- Dado un puntaje calculado, cuando abro la oferta, entonces veo el puntaje, la etiqueta, las fortalezas, las brechas y la evidencia citada.

**HU4**
- Dada una oferta con puntaje, cuando creo una candidatura, entonces aparece en la columna `saved`.
- Dada una candidatura, cuando la muevo a `applied`, entonces el historial registra el cambio con la fecha.

**HU5**
- Dado un correo de rechazo pegado en una candidatura, cuando se clasifica, entonces el sistema sugiere moverla a `rejected` y espera mi confirmación.
- Dada una candidatura `applied` sin actividad durante 10 días, cuando abro el tablero, entonces aparece marcada para seguimiento.

**HU6**
- Dada la interfaz en inglés, cuando cambio a español, entonces todos los textos de la interfaz aparecen en español y la elección se mantiene al volver a entrar.

## 8. Requisitos no funcionales

| Id | Categoría | Requisito |
| --- | --- | --- |
| RNF-01 | Seguridad | Autenticación de un solo usuario con sesión; todas las rutas de la API requieren sesión salvo el login. |
| RNF-02 | Seguridad | Secretos (clave de Claude API, base de datos, fuentes de ofertas) solo en variables de entorno; nunca en el repositorio. |
| RNF-03 | Seguridad | Validación de todas las entradas en el servidor; límite de tamaño y tipo en la carga de PDF. |
| RNF-04 | Seguridad | Si se implementa RF-08, protección contra SSRF (solo `http`/`https`, sin direcciones internas). |
| RNF-05 | Privacidad | El currículum y los correos solo se comparten con la API de Claude; no se registran completos en los logs. |
| RNF-06 | Rendimiento | La extracción de una oferta y el cálculo del puntaje terminan en menos de 20 s cada uno; la interfaz muestra el progreso. |
| RNF-07 | Costo | Los filtros duros se aplican antes de la IA y los análisis se guardan en caché (RF-26). Presupuesto de API objetivo: < 10 USD/mes; se verifica con el uso real del primer mes. |
| RNF-08 | Calidad de la IA | Conjunto de referencia de al menos 10 ofertas evaluadas a mano y un comando que mide el acuerdo con el puntaje (OBJ-2). Los prompts se versionan en el repositorio. |
| RNF-09 | Robustez de la IA | Las respuestas de la IA se validan con un esquema; si fallan, el sistema reintenta una vez y luego muestra un error claro sin perder la oferta. |
| RNF-10 | Pruebas | Pruebas unitarias y de integración con cobertura ≥ 80 % en la lógica de dominio, y al menos una prueba E2E del flujo principal. Las pruebas no llaman a la API real de Claude. |
| RNF-11 | Idioma del código | Código, clases, tablas y campos en inglés. Documentación del curso en español. |
| RNF-12 | Despliegue | Aplicación desplegada con URL pública y credenciales de prueba documentadas en `readme.md`. |
| RNF-13 | Accesibilidad | Navegación por teclado en el tablero y contraste suficiente (WCAG 2.2 AA como referencia). |

## 9. Entidades del dominio

Vista conceptual; el modelo de datos detallado se define en la arquitectura. Los nombres siguen la convención de código en inglés.

| Entidad | Descripción |
| --- | --- |
| `User` | El único usuario del sistema. |
| `Resume` | Versión del currículum: archivo, texto extraído y perfil estructurado. |
| `JobPreferences` | Filtros duros y preferencias del usuario. |
| `TargetCompany` | Empresa objetivo: nombre, tipo, plataforma de empleo e identificador del job board. |
| `JobPosting` | Oferta con sus campos estructurados, fuente y texto original. |
| `FilterResult` | Resultado de los filtros duros para una oferta. |
| `MatchAnalysis` | Puntaje, etiqueta, fortalezas, brechas y evidencia; con modelo y versión del prompt. |
| `Application` | Candidatura asociada a una oferta, con su estado actual. |
| `ApplicationEvent` | Evento del historial: cambio de estado, nota o correo clasificado. |

## 10. Dependencias externas

| Dependencia | Uso | Riesgo |
| --- | --- | --- |
| Claude API | Extracción de ofertas y currículum, puntaje de encaje, clasificación de correos | Costo y latencia; se mitigan con RNF-07 y RNF-09 |
| Greenhouse Job Board API (pública, sin clave) | Importación (RF-04) | Solo cubre empresas que usan Greenhouse; la mayoría de las empresas grandes de la lista no lo usan |
| Railway | Despliegue de la aplicación y la base de datos | Límites del plan gratuito |

## 10.1 Decisiones confirmadas (2026-11-04)

- RF-50 (cadenas externalizadas para i18n) es must-have; la traducción al español (RF-51) es should-have.
- Un dato ausente en la oferta da `unknown` y no la descarta (RF-22).
- Se agrega el estado `withdrawn` al pipeline (RF-31).
- Orden de construcción: HU2 → HU1 (pegar texto) → HU3 → HU4 → RF-04 (sección 11).
- Las metas de costo (RNF-07) y de tiempo de respuesta (RNF-06) se aceptan como objetivos.
- Empresas objetivo: grandes (Meta, Apple, Amazon, Netflix, Google, Microsoft, Nvidia, OpenAI, Anthropic, Walmart, ServiceNow, PayPal/Venmo, eBay) y medianas aún sin definir.
- La importación usa adaptadores por plataforma de empleo; el MVP implementa Greenhouse (RF-04). Las ofertas de empresas sin API se agregan pegando el texto (RF-01).

## 11. Riesgos y mitigaciones

Ver `docs/vision.md`, sección 8. Riesgo adicional del PRD:

| Riesgo | Mitigación |
| --- | --- |
| Las 4 historias must-have no caben en las horas disponibles | Orden de construcción: HU2 → HU1 (pegar texto) → HU3 → HU4 → RF-04 (importación). Si falta tiempo, la importación se reduce a una sola empresa o búsqueda fija. |

## 12. Decisiones pendientes

| Decisión | Se resuelve en |
| --- | --- |
| Diseño de la interfaz de adaptadores y validación con Greenhouse | Arquitectura (ADR y spike) |
| Modelo de Claude para extracción y para el puntaje | Arquitectura (ADR) |
| Fórmula del puntaje: peso de habilidades, experiencia y preferencias | Cambio de OpenSpec de HU3 |
| Versión de AdonisJS | Arquitectura (ADR) |

## 13. Trazabilidad

```text
OBJ-1 ──▶ HU1, HU3 ──▶ RF-01…RF-06, RF-20…RF-26
OBJ-2 ──▶ HU3      ──▶ RF-24, RF-25, RNF-08
OBJ-3 ──▶ HU4, HU5 ──▶ RF-30…RF-34, RF-40…RF-43
OBJ-4 ──▶ todas    ──▶ RNF-10, RNF-12
```

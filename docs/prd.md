# PRD del MVP — AI Job Match

> Fase 1 (Producto) del AI SDLC. Detalla solo lo que entra en el MVP. El contexto, la hipótesis y el alcance completo están en [`docs/vision.md`](./vision.md). La revisión adversarial que originó la versión 0.2 está en [`docs/prd-review.md`](./prd-review.md).

- **Estado:** borrador v0.5 (log de decisiones con identificadores D-xx)
- **Fecha:** 2026-11-04
- **Presupuesto de desarrollo:** 30 horas asistidas por IA, con tope aceptado de 36 horas (+20 %) (D-08)

---

## 1. Resumen

El MVP es un panel web personal para buscar empleo en Estados Unidos. Recolecta ofertas automáticamente desde plataformas de empleo y búsquedas guardadas, y también acepta ofertas pegadas a mano; ambas vías son igual de importantes. Descarta las que no cumplen los criterios no negociables, calcula con IA un puntaje de encaje explicado contra el currículum, registra la decisión del usuario sobre cada oferta y gestiona cada candidatura en un pipeline.

## 2. Objetivos y métricas de éxito

| Id | Objetivo | Métrica (cómo se mide) | Meta |
| --- | --- | --- | --- |
| OBJ-1 | Decidir más rápido si conviene aplicar | Mediana del tiempo entre la primera vez que se abre una oferta (`first_viewed_at`) y la decisión registrada (`decided_at`, RF-07) | < 2 min; línea base medida a mano con 5 ofertas reales antes del desarrollo (D-17) |
| OBJ-2 | Confiar en el puntaje | Acuerdo entre la etiqueta de la IA y la etiqueta manual, con tolerancia de ±1 nivel, en el conjunto de prueba del golden set (separado del conjunto usado para ajustar el prompt) | ≥ 80 % |
| OBJ-3 | No perder seguimientos | Candidaturas que, en 4 semanas de uso, tuvieron un correo de la empresa sin reflejarse en el pipeline (revisión manual contra el correo) | 0 |
| OBJ-4 | Demostrar el flujo de punta a punta | Flujo principal desplegado y cubierto por una prueba E2E | Sí |
| OBJ-5 | Recolectar ofertas sin esfuerzo manual (D-06) | Porcentaje de ofertas nuevas que llegan por importación automática (campo `source` distinto de `manual`) | ≥ 50 % |

### 2.1 Limitaciones de la validación

- El usuario que valida la hipótesis es también quien construye el sistema; hay sesgo de confirmación. Se mitiga con la etiqueta manual del golden set hecha antes de ver los puntajes de la IA.
- OBJ-3 y parte de OBJ-1 y OBJ-5 solo se pueden medir con uso real, en parte después de la entrega final.

## 3. Usuario

Un único usuario: el autor, profesional del software que busca empleo en EE. UU. con preferencia por modalidad híbrida (también acepta remoto y presencial), sin necesidad de visa y con un solo currículum. Detalle en `docs/vision.md`, sección 2.

## 4. Flujo principal

```text
 1. Iniciar sesión
 2. Cargar el currículum (Markdown) ──▶ la IA extrae el perfil ──▶ el usuario lo revisa
 3. Definir filtros duros (roles, modalidad, ubicación, salario mínimo, seniority)
 4. Llegan ofertas:
      a) automáticas: job boards de empresas objetivo (Greenhouse, Ashby; Lever como should-have) y búsquedas guardadas en un agregador
      b) manuales: pegar el texto de la oferta
          │
          ▼
 5. Filtros duros ──▶ no cumple: descartada, con el motivo visible
          │ cumple o hay datos desconocidos
          ▼
 6. Puntaje de encaje (IA): 0-100, etiqueta, fortalezas, brechas y evidencia verificada
    (automático para ofertas pegadas; a pedido para importadas; con topes de gasto)
          │
          ▼
 7. El usuario decide: aplicar (crea la candidatura) o descartar (archiva la oferta)
          │ aplicar
          ▼
 8. La candidatura avanza por el pipeline
```

El flujo E2E obligatorio para la entrega final cubre los pasos 1, 2, 4b, 5, 6, 7 y 8.

## 5. Alcance del MVP

### 5.1 Épicas e historias de usuario

Las épicas agrupan los requisitos en bloques de valor y corresponden a capabilities de OpenSpec (`openspec/specs/<capability>/`). Cada historia se implementa como un cambio de OpenSpec. Detalle y criterios de aceptación en [`docs/user-stories.md`](./user-stories.md).

| Épica | Capability | Historias | Prioridad |
| --- | --- | --- | --- |
| E1 Ingreso de ofertas | `job-intake` | HU1, HU2, HU3 | Must-have |
| E2 Perfil profesional | `resume-profile` | HU4 | Must-have |
| E3 Evaluación de ofertas | `job-matching` | HU5, HU6, HU7 | Must-have |
| E4 Seguimiento de candidaturas | `application-tracking` | HU8, HU9 | Must-have (HU9 should-have) |
| E5 Plataforma | `platform` | HU10 y el walking skeleton | Must-have (HU10 should-have) |

| Id | Épica | Historia | Requisitos | Prioridad |
| --- | --- | --- | --- | --- |
| HU1 | E1 | Como buscador de empleo, quiero agregar una oferta pegando su texto, para registrar ofertas de cualquier portal. | RF-01 a RF-03, RF-05, RF-06 (RF-08, could-have) | Must-have |
| HU2 | E1 | Como buscador de empleo, quiero importar automáticamente las ofertas de mis empresas objetivo desde su job board, para no revisarlas portal por portal. | RF-04, RF-04b, RF-05, RF-09 | Must-have |
| HU3 | E1 | Como buscador de empleo, quiero guardar búsquedas que se ejecuten en un agregador de ofertas, para recibir ofertas de empresas sin API propia. | RF-04a, RF-04b, RF-05 | Must-have |
| HU4 | E2 | Como buscador de empleo, quiero cargar mi currículum y obtener un perfil estructurado que pueda corregir, para que el sistema me conozca. | RF-10 a RF-14 | Must-have (PDF: should-have) |
| HU5 | E3 | Como buscador de empleo, quiero que cada oferta pase por mis criterios no negociables, para descartar sin esfuerzo las que no me sirven. | RF-20 a RF-23 | Must-have |
| HU6 | E3 | Como buscador de empleo, quiero un puntaje de encaje explicado y verificable, para saber por qué una oferta encaja o no con mi perfil. | RF-23 a RF-28, RNF-07, RNF-08 | Must-have |
| HU7 | E3 | Como buscador de empleo, quiero registrar si aplico o descarto cada oferta, para cerrar la evaluación y medir cuánto tardo en decidir. | RF-07, RF-30, RNF-14 | Must-have |
| HU8 | E4 | Como buscador de empleo, quiero gestionar mis candidaturas en un pipeline con historial de cambios, para saber en qué estado va cada una. | RF-30 a RF-35 | Must-have |
| HU9 | E4 | Como buscador de empleo, quiero pegar un correo en una candidatura y que la IA lo clasifique, y recibir alertas de seguimiento, para no perder ningún proceso. | RF-40 a RF-43 | Should-have |
| HU10 | E5 | Como buscador de empleo, quiero usar la interfaz en español, para trabajar en mi idioma cuando lo prefiera. | RF-50 a RF-52 | Should-have |

La autenticación de un solo usuario es un requisito técnico del walking skeleton, no una historia (ver RNF-01).

### 5.2 Fuera del MVP

Todo lo etiquetado `v1.1` o `futuro` en `docs/vision.md` (sección 6), entre otros: alertas de empleo por Gmail, adaptador de Workday, dashboard de métricas, carta de presentación, varios currículums, vista híbrida, RAG para entrevistas, extensión de navegador y multiusuario.

## 6. Requisitos funcionales

Prioridad según MoSCoW: **M** = must, **S** = should, **C** = could.

### E1 — Ingreso de ofertas (HU1, HU2, HU3)

| Id | Requisito | Prioridad |
| --- | --- | --- |
| RF-01 | El usuario pega el texto de una oferta y, opcionalmente, su URL de origen. | M |
| RF-02 | La IA extrae los campos estructurados de la oferta: título, empresa, ubicaciones, país, modalidad (`remote`, `hybrid`, `onsite`, `unknown`), salario (mínimo, máximo, moneda, periodo), seniority, habilidades requeridas y deseables, y años de experiencia pedidos. Los campos ausentes quedan como desconocidos. Calidad exigida en el golden set de extracción: ≥ 90 % de campos correctos y 0 salarios inventados. | M |
| RF-03 | El usuario puede guardar la oferta directamente o corregir los campos extraídos antes o después de guardar. | M |
| RF-04 | El sistema importa las ofertas de las empresas objetivo desde la API pública de su job board. Adaptadores must-have: Greenhouse y Ashby. El adaptador de Lever es should-have, porque ninguna empresa objetivo conocida lo usa (D-09). | M |
| RF-04a | El usuario guarda búsquedas (palabras clave y ubicación) que el sistema ejecuta en un agregador de ofertas para traer ofertas de empresas sin API propia. El proveedor se elige con un spike de cobertura, cuota y términos de uso; si ninguno es viable, se reemplaza por el adaptador de SmartRecruiters. | M |
| RF-04b | Cada sincronización agrega como máximo N ofertas nuevas (configurable; por defecto 50) y reporta cuántas trajo, cuántas omitió por duplicadas y cuántas por el tope. | M |
| RF-05 | El sistema evita duplicados por fuente e identificador externo, por URL canónica y, entre fuentes distintas, por una clave normalizada de empresa, título y ubicación principal (D-14). | M |
| RF-06 | El usuario ve la lista de ofertas con su estado de filtro, su puntaje y su decisión, y la ordena por puntaje o fecha. | M |
| RF-07 | El usuario registra su decisión sobre cada oferta: `apply` (crea la candidatura, RF-30) o `skip` (archiva la oferta, con motivo opcional). El sistema guarda la decisión, su fecha (`decided_at`) y la primera vez que el usuario abrió la oferta (`first_viewed_at`). | M |
| RF-08 | El sistema descarga y lee el contenido a partir de una URL pegada. | C |
| RF-09 | El usuario gestiona su lista de empresas objetivo: nombre, tipo (`big` o `mid`), plataforma de empleo y, si la plataforma tiene API, el identificador de su job board. Las empresas sin API se registran igual. | M |

### E2 — Perfil profesional (HU4)

| Id | Requisito | Prioridad |
| --- | --- | --- |
| RF-10 | El usuario carga su currículum en Markdown (máximo 5 MB) (D-18). | M |
| RF-11 | El usuario carga su currículum en PDF; el sistema lo convierte una sola vez a Markdown, que pasa a ser la representación usada en todos los análisis. Si la conversión falla, pide pegar el texto. | S |
| RF-12 | La IA genera un perfil estructurado: habilidades (con años cuando se puedan inferir), experiencia laboral, años totales de experiencia, seniority estimado, formación e idiomas. | M |
| RF-13 | El usuario revisa y corrige el perfil. El perfil corregido es la fuente para el puntaje. | M |
| RF-14 | Hay un solo currículum activo. Cargar uno nuevo crea una nueva versión y marca los puntajes anteriores como desactualizados. Los puntajes se recalculan solo a pedido del usuario, quien ve antes cuántas ofertas se recalcularán. | M |

### E3 — Evaluación de ofertas (HU5, HU6, HU7)

| Id | Requisito | Prioridad |
| --- | --- | --- |
| RF-20 | El usuario configura sus preferencias: roles objetivo (palabras clave de inclusión y de exclusión para el título), modalidades aceptadas en orden de preferencia, ubicaciones aceptadas (ciudades o estados de EE. UU.), salario mínimo anual en USD y seniorities aceptados. | M |
| RF-21 | Los filtros duros se evalúan sin IA, según las reglas de la sección 6.1, y devuelven `pass`, `fail` o `unknown` con el motivo de cada criterio. La oferta se descarta si algún criterio da `fail`. | M |
| RF-22 | Un dato ausente en la oferta da `unknown` en ese criterio y no descarta la oferta (D-02). | M |
| RF-23 | Las ofertas pegadas con resultado `pass` o `unknown` reciben puntaje automáticamente. Las ofertas importadas (job boards y agregador) se puntúan a pedido (D-12), una o varias seleccionadas, mostrando antes el costo estimado. El usuario también puede pedir el puntaje de una oferta descartada (ADR-0008). Sin currículum activo no se calcula ningún puntaje y el sistema lo indica. | M |
| RF-24 | La IA devuelve, con respuesta estructurada: puntaje de 0 a 100, fortalezas, brechas y evidencia (fragmentos de la oferta y del currículum). La etiqueta se deriva del puntaje: `strong` ≥ 80, `good` 60-79, `weak` 40-59, `poor` < 40. | M |
| RF-24a | Cada fragmento de evidencia se verifica contra el texto original; los que no aparecen literalmente (ignorando mayúsculas y espacios) se descartan y no se muestran. | M |
| RF-25 | El sistema guarda con cada análisis el modelo, la versión del prompt, la versión del currículum y la fecha. | M |
| RF-26 | El sistema no repite un análisis si no cambiaron la oferta, el currículum, la versión del prompt ni el modelo. | M |
| RF-27 | El usuario recalcula el puntaje de una oferta a demanda. | S |
| RF-28 | La preferencia por modalidad se aplica como un ajuste determinista sobre el puntaje de la IA (por defecto: híbrido +5, remoto 0, presencial −5), calculado fuera de la IA y de su caché. | S |

### 6.1 Reglas de los filtros duros

| Criterio | `pass` | `fail` | `unknown` |
| --- | --- | --- | --- |
| Rol | El título contiene alguna palabra de inclusión y ninguna de exclusión (sin lista de inclusión, siempre `pass`) | El título contiene una palabra de exclusión o ninguna de inclusión | — |
| Modalidad | La modalidad está entre las aceptadas | La modalidad no está entre las aceptadas | La oferta no indica modalidad |
| Ubicación | Remoto en EE. UU.; o híbrido/presencial con alguna ubicación de la oferta que coincide (ciudad o estado normalizado) con las aceptadas | El país no es EE. UU.; o ninguna ubicación híbrida/presencial coincide | No se puede determinar país ni ciudad |
| Salario | El máximo del rango, anualizado, es ≥ el mínimo del usuario (hora × 2080; mes × 12) | El máximo anualizado es menor que el mínimo | La oferta no publica salario |
| Seniority | El seniority normalizado está entre los aceptados | No está entre los aceptados | No se puede normalizar |

Seniority normalizado: `junior`, `mid`, `senior`, `staff`, `principal`. El mapeo de títulos y niveles propios de empresas (por ejemplo, L5, E5, SDE II, IC4) vive en una tabla de configuración versionada en el repositorio.

### E4 — Seguimiento de candidaturas (HU8)

| Id | Requisito | Prioridad |
| --- | --- | --- |
| RF-30 | El usuario crea una candidatura a partir de una oferta (decisión `apply`). | M |
| RF-31 | Estados de la candidatura: `saved`, `applied`, `interviewing`, `offer`, `rejected`, `withdrawn`. Cualquier estado activo puede pasar a `rejected` (la empresa descarta) o a `withdrawn` (el usuario se retira); ambos son finales (D-03). | M |
| RF-32 | Cada cambio de estado crea un evento en el historial con fecha y nota opcional. | M |
| RF-33 | El usuario ve las candidaturas en un tablero por estado y cambia el estado con un selector, usable con teclado. | M |
| RF-33a | El usuario mueve las candidaturas entre columnas arrastrándolas. | C |
| RF-34 | El usuario ve el detalle de una candidatura: oferta, puntaje, estado e historial. | M |
| RF-35 | El usuario agrega notas libres al historial. | S |

### E4 — Correos y alertas (HU9, should-have)

| Id | Requisito | Prioridad |
| --- | --- | --- |
| RF-40 | El usuario pega un correo en una candidatura (remitente, fecha, asunto y cuerpo). | S |
| RF-41 | La IA clasifica el correo (`confirmation`, `interview_invite`, `rejection`, `offer`, `other`) y extrae la fecha relevante y el siguiente paso. | S |
| RF-42 | El sistema sugiere el cambio de estado que corresponde a la clasificación; el usuario lo confirma. | S |
| RF-43 | El sistema marca las candidaturas `applied` o `interviewing` sin actividad durante N días (configurable; por defecto 10). Cuenta como actividad un cambio de estado, una nota o un correo. | S |

### E5 — Interfaz en español (HU10, should-have)

| Id | Requisito | Prioridad |
| --- | --- | --- |
| RF-50 | La interfaz se construye en inglés con todas las cadenas externalizadas (i18n) desde el inicio. | M |
| RF-51 | El usuario cambia el idioma de la interfaz entre inglés y español; la elección se recuerda. | S |
| RF-52 | Los análisis de la IA se generan en el idioma de la interfaz. | C |

> RF-50 es must-have aunque pertenece a HU10, porque externalizar las cadenas desde el walking skeleton cuesta poco y evita retrabajo.

## 7. Criterios de aceptación

Los criterios detallados (Dado/Cuando/Entonces) están en [`docs/user-stories.md`](./user-stories.md) y se convierten en escenarios de las specs de OpenSpec.

## 8. Requisitos no funcionales

| Id | Categoría | Requisito |
| --- | --- | --- |
| RNF-01 | Seguridad | Autenticación de un solo usuario con sesión; todas las rutas de la API requieren sesión salvo el login y el chequeo de salud (`/health`). Limitador de intentos en el login: could-have. El evaluador usa una instancia de demostración con datos sintéticos, nunca la instancia personal (D-11, ADR-0007). |
| RNF-02 | Seguridad | Secretos (clave de Claude API, base de datos, agregador) solo en variables de entorno; nunca en el repositorio. |
| RNF-03 | Seguridad | Validación de todas las entradas en el servidor; límite de tamaño y tipo en la carga del currículum. |
| RNF-04 | Seguridad | Si se implementa RF-08, protección contra SSRF (solo `http`/`https`, sin direcciones internas). |
| RNF-05 | Privacidad | El currículum y los correos solo se comparten con la API de Claude; no se registran completos en los logs. |
| RNF-06 | Rendimiento | Percentil 90 del tiempo de extracción y de puntaje < 30 s, medido en los logs de producción; la interfaz muestra el progreso. |
| RNF-07 | Costo | Filtros duros (incluido el de roles) antes de la IA, tope de ofertas por sincronización (RF-04b), puntaje a pedido de las ofertas importadas (RF-23) y caché de análisis (RF-26). Cada llamada a la IA se registra con su costo estimado y se rechaza si supera el tope diario (1 USD) o mensual (10 USD), configurables (D-13, ADR-0008). Presupuesto de API objetivo: < 10 USD/mes por instancia, verificado con el uso real del primer mes. Infraestructura en Railway: ~5 USD/mes por instancia (**supuesto**, por verificar). La caché de prompts de Claude es could-have. |
| RNF-08 | Calidad de la IA | Golden set de puntaje con al menos 20 ofertas etiquetadas a mano antes de ver la IA, separadas en ajuste (10) y prueba (10); golden set de extracción con al menos 10 ofertas. Comandos que miden OBJ-2 y la calidad de RF-02. Prompts versionados en el repositorio. |
| RNF-09 | Robustez de la IA | Las respuestas de la IA se validan con un esquema; si fallan, el sistema reintenta una vez y luego muestra un error claro sin perder la oferta. |
| RNF-10 | Pruebas | Cobertura ≥ 80 % en la lógica de dominio (`apps/api/app/services/`, `apps/api/app/filters/`, normalizadores de `apps/api/app/job_sources/` y parsers de `apps/api/app/ai/`) y al menos una prueba E2E del flujo principal. Las pruebas no llaman a la API real de Claude ni a las plataformas externas. |
| RNF-11 | Idioma del código | Código, clases, tablas y campos en inglés. Documentación del curso en español. |
| RNF-12 | Despliegue | Dos instancias de la misma imagen (ADR-0007): personal (privada) y demostración (URL pública, datos sintéticos y credenciales de prueba en `readme.md`). |
| RNF-13 | Accesibilidad | La prueba E2E ejecuta `axe-core` en las pantallas principales sin violaciones de impacto `serious` o `critical`. |
| RNF-14 | Medición | El sistema registra `first_viewed_at`, `decided_at` y `source` de cada oferta para calcular OBJ-1 y OBJ-5. |
| RNF-15 | Observabilidad | Logs estructurados con la duración y el resultado de cada trabajo en segundo plano; un comando calcula OBJ-1, OBJ-5, el percentil 90 de RNF-06 y el gasto de IA del mes. |
| RNF-16 | Respaldo | Respaldo periódico de la base de datos de la instancia personal y una restauración probada al menos una vez (should-have). |

## 9. Entidades del dominio

Vista conceptual; el modelo de datos detallado está en `docs/architecture.md`. Los nombres siguen la convención de código en inglés.

| Entidad | Descripción |
| --- | --- |
| `User` | El único usuario del sistema. |
| `Resume` | Versión del currículum: Markdown, archivo original opcional y perfil estructurado. |
| `JobPreferences` | Filtros duros, roles objetivo, tope por sincronización y preferencias. |
| `TargetCompany` | Empresa objetivo: nombre, tipo, plataforma de empleo e identificador del job board. |
| `JobSearch` | Búsqueda guardada que se ejecuta en el agregador: palabras clave, ubicación y última sincronización. |
| `JobPosting` | Oferta con sus campos estructurados, fuente, texto original, decisión y marcas de tiempo de medición. |
| `FilterResult` | Resultado de los filtros duros para una oferta. |
| `MatchAnalysis` | Puntaje, etiqueta, fortalezas, brechas y evidencia verificada; con modelo y versión del prompt. |
| `Application` | Candidatura asociada a una oferta, con su estado actual. |
| `ApplicationEvent` | Evento del historial: cambio de estado, nota o correo clasificado. |
| `AiUsage` | Registro de cada llamada a la IA: tarea, modelo, tokens y costo estimado (ADR-0008). |

## 10. Dependencias externas

| Dependencia | Uso | Riesgo |
| --- | --- | --- |
| Claude API | Extracción, puntaje y clasificación de correos | Costo y latencia; se mitigan con RNF-07 y RNF-09 |
| Job boards de Greenhouse y Ashby, y de Lever como should-have (APIs públicas) | Importación por empresa (RF-04) | Solo cubren empresas que usan esas plataformas |
| Agregador de ofertas (JSearch u otro; por definir en el spike) | Búsquedas guardadas (RF-04a) | Cuota gratuita pequeña, términos de uso y cobertura sin confirmar; SerpApi se evita por litigio con Google |
| Railway | Despliegue de las dos instancias y sus bases de datos (ADR-0007) | Costo de ~5 USD/mes por instancia (supuesto) y límites del plan |

### 10.1 Log de decisiones

Cada decisión tiene un identificador `D-xx`. Las frases de otros documentos que aplican una decisión la citan entre paréntesis, por ejemplo "(D-12)", para que una búsqueda del identificador encuentre todo lo que hay que revisar si cambia (`docs/ai-sdlc-claude-code-openspec.md`, sección 5.1). Una decisión que cambia no se borra: su estado pasa a "reemplazada por D-xx" y se agrega una nueva.

| Id | Fecha | Decisión | Estado |
| --- | --- | --- | --- |
| D-01 | 2026-11-04 | Interfaz en inglés con cadenas externalizadas (RF-50, must-have); traducción al español como should-have (RF-51). | vigente |
| D-02 | 2026-11-04 | Un dato ausente en la oferta da `unknown` y no la descarta (RF-22). | vigente |
| D-03 | 2026-11-04 | Estado `withdrawn` en el pipeline (RF-31). | vigente |
| D-04 | 2026-11-04 | Metas de costo (RNF-07) y de tiempo de respuesta (RNF-06) aceptadas como objetivos. | vigente |
| D-05 | 2026-11-04 | Empresas objetivo: Meta, Apple, Amazon, Netflix, Google, Microsoft, Nvidia, OpenAI, Anthropic, Walmart, ServiceNow, PayPal/Venmo, eBay y medianas aún sin definir. | vigente |
| D-06 | 2026-11-04 | La recolección automática de ofertas es tan importante como pegar ofertas a mano (OBJ-5). | vigente |
| D-07 | 2026-11-04 | Fuentes automáticas: adaptadores de job boards y un agregador por búsqueda sujeto a spike (ADR-0006). | vigente; modificada por D-09 |
| D-08 | 2026-11-04 | Presupuesto de 30 horas con tope aceptado de 36. | vigente |
| D-09 | 2026-11-04 | El adaptador de Lever es should-have; el agregador (HU3) no es lo primero en recortarse. | vigente |
| D-10 | 2026-11-04 | Correos y alertas (HU9) como should-have. | vigente |
| D-11 | 2026-11-04 | Instancia de demostración separada para el evaluador (ADR-0007). | vigente |
| D-12 | 2026-11-04 | Las ofertas importadas se puntúan a pedido; las pegadas, automáticamente (ADR-0008). | vigente |
| D-13 | 2026-11-04 | Topes de gasto de IA: 1 USD al día y 10 USD al mes, configurables (ADR-0008). | vigente |
| D-14 | 2026-11-04 | Deduplicación entre fuentes con URL canónica y `dedupe_key` (RF-05). | vigente |
| D-15 | 2026-11-04 | Observabilidad (RNF-15) must-have; respaldo (RNF-16) should-have. | vigente |
| D-16 | 2026-11-04 | Se acepta el riesgo de la estimación del walking skeleton. | vigente |
| D-17 | 2026-11-04 | La línea base de OBJ-1 se mide con 5 ofertas reales antes del desarrollo (T-31). | vigente |
| D-18 | 2026-11-04 | El currículum se carga en Markdown; el PDF es should-have (RF-10, RF-11). | vigente |
| D-19 | 2026-11-04 | Cinco épicas (E1-E5) mapeadas a capabilities de OpenSpec y diez historias del tamaño de un cambio. | vigente |
| D-20 | 2026-11-05 | El control de gasto de IA (T-33) se construye antes que cualquier ticket que llame a la IA. | vigente |
| D-21 | 2026-11-05 | La decisión aplicar o descartar (HU7) crea las tablas y el servicio de candidaturas en un ticket propio (T-37), antes del pipeline (HU8). | vigente |

Las correcciones de las revisiones adversariales están en `docs/prd-review.md` y `docs/architecture-review.md`.

## 11. Riesgos y mitigaciones

Ver `docs/vision.md`, sección 8, y `docs/prd-review.md`. El plan por entrega está en `docs/user-stories.md` (sección "Plan de entregas"). Riesgos adicionales del PRD:

| Riesgo | Mitigación |
| --- | --- |
| El MVP imprescindible (~35.5 h) no cabe en el tope de 36 h, sobre todo por la curva de aprendizaje de AdonisJS v7 | Orden de construcción (`docs/user-stories.md`, verificado contra las dependencias de los tickets): línea base (T-31) → walking skeleton → control de gasto de IA (T-33, D-20) → HU4 → HU1 → HU5 → HU6 → HU7 (D-21) → HU8 → HU2 → HU3 → observabilidad y demostración (T-35, T-34) → prueba E2E (T-21). Se acepta el riesgo de la estimación (D-16). Orden de recorte: adaptador de Lever (ya es should-have) → reducir HU3 a una búsqueda fija sin pantalla de edición. |
| El agregador no cubre las empresas grandes o sus términos no lo permiten | Spike de 30 minutos antes de implementarlo; plan B: adaptador de SmartRecruiters. |
| El filtro de roles por palabras clave descarta ofertas buenas o deja pasar irrelevantes | Las ofertas descartadas siguen visibles con su motivo; el usuario ajusta las palabras clave. |

## 12. Decisiones pendientes

| Decisión | Se resuelve en |
| --- | --- |
| Proveedor del agregador de ofertas | Spike del ticket T-27 |
| Fórmula del puntaje: peso de habilidades, experiencia y seniority | Cambio de OpenSpec de HU6 |
| Tabla de mapeo de seniority | Cambio de OpenSpec de HU5 |

## 13. Trazabilidad

```text
OBJ-1 ──▶ E1, E3 ──▶ HU1, HU5, HU6, HU7 ──▶ RF-01…RF-07, RF-20…RF-26, RNF-14
OBJ-2 ──▶ E3     ──▶ HU6                ──▶ RF-24, RF-24a, RF-25, RNF-08
OBJ-3 ──▶ E4     ──▶ HU8, HU9           ──▶ RF-30…RF-34, RF-40…RF-43
OBJ-4 ──▶ todas  ──▶ todas              ──▶ RNF-10, RNF-12, RNF-13
OBJ-5 ──▶ E1     ──▶ HU2, HU3           ──▶ RF-04, RF-04a, RF-04b, RF-09, RNF-14
Costo y operación ──▶ E5 ──▶ T-33, T-34, T-35 ──▶ RNF-07, RNF-12, RNF-15
```

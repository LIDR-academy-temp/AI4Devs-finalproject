# Visión del producto — AI Job Match

> Fase 0 (Descubrimiento) del AI SDLC. Este documento fija el problema, el usuario, la hipótesis y el perímetro del producto. El detalle de requisitos vive en `docs/prd.md`.

- **Nombre del proyecto:** AI Job Match
- **Subtítulo:** Un ATS (Applicant Tracking System) personal impulsado por Inteligencia Artificial para la búsqueda y calificación automatizada de empleo.
- **Estado:** borrador v0.3 (incorpora las revisiones adversariales del PRD y de la arquitectura)
- **Fecha:** 2026-11-04

---

## 1. Problema

Buscar empleo en Estados Unidos exige revisar ofertas en varios portales, decidir una por una si el perfil encaja y llevar el seguimiento de cada candidatura. Hoy esas tres tareas son manuales y están dispersas:

1. **Encontrar ofertas (descubrimiento).** Las ofertas están repartidas en varios portales y sitios de empresas. Revisarlas consume tiempo y es fácil perder ofertas relevantes.
2. **Evaluar el encaje.** Para cada oferta hay que leer la descripción completa y compararla mentalmente con el currículum: habilidades, experiencia, modalidad, ubicación, salario y seniority. Es lento y poco consistente.
3. **Seguir las candidaturas.** El historial de cada candidatura (confirmaciones, invitaciones a entrevista, rechazos) solo existe en hilos de correo electrónico difíciles de localizar. No hay una vista del estado de cada proceso ni del siguiente paso.

## 2. Usuario

**Usuario principal:** el propio autor, una persona profesional del software que busca empleo en Estados Unidos.

- Preferencia de modalidad: híbrido; también acepta remoto y presencial.
- No necesita patrocinio de visa.
- Trabaja con un único currículum (a largo plazo, uno por tipo de rol).
- Usa el correo electrónico como único registro del historial de candidaturas.

Como el autor es el usuario real, la hipótesis se valida con su propia búsqueda de empleo.

## 3. Hipótesis

> Si las ofertas llegan a un solo panel, se filtran con mis criterios no negociables y reciben un puntaje de encaje explicado contra mi currículum, y si cada candidatura tiene un pipeline con su historial de correos, entonces reviso cada oferta en menos de 2 minutos y no pierdo ningún seguimiento.

**Métricas de validación:**

| Métrica | Línea base | Objetivo |
| --- | --- | --- |
| Tiempo entre abrir una oferta y registrar la decisión de aplicar o descartar | ~15 min (**supuesto**; se mide con 5 ofertas reales antes del desarrollo) | < 2 min (mediana) |
| Seguimientos olvidados en 4 semanas de uso (revisados contra el correo) | Desconocido (**supuesto**) | 0 |
| Ofertas nuevas que llegan por importación automática | 0 % | ≥ 50 % |
| Tiempo para encontrar el historial de una candidatura (indicador secundario; no es objetivo del PRD) | Búsqueda manual en el correo | < 30 s desde el panel |
| Acuerdo entre la etiqueta de la IA y mi etiqueta manual (±1 nivel) | — | ≥ 80 % en el conjunto de prueba del golden set |

> Los valores marcados como **supuesto** se medirán durante la primera semana de uso para fijar la línea base real.

## 4. Propuesta de valor

Un panel personal que concentra las ofertas, explica por qué encajan o no con el currículum y convierte los correos dispersos en una línea de tiempo por candidatura.

```text
Fuentes de ofertas ──▶ Filtros duros ──▶ Puntaje de encaje (IA) ──▶ Pipeline de candidaturas
  (pegar + API)        (sin IA)          + explicación               + línea de tiempo de correos
                                                                       (IA clasifica cada correo)
```

**Principios de diseño:**

- **Determinista primero, IA después.** Los filtros duros (modalidad, ubicación, salario, seniority) se resuelven sin IA: son baratos, rápidos y verificables con pruebas unitarias. La IA se reserva para el juicio semántico.
- **IA explicable.** Todo puntaje muestra fortalezas, brechas y la evidencia citada de la oferta y del currículum.
- **IA medible.** Las salidas de la IA usan respuestas estructuradas y se evalúan contra un conjunto de referencia.
- **El usuario decide.** El sistema recomienda; la decisión de aplicar siempre es humana.

## 5. Alternativas existentes

Existen trackers de candidaturas y asistentes de búsqueda de empleo (por ejemplo Teal, Huntr y Simplify), normalmente centrados en guardar ofertas desde el navegador y autocompletar formularios. Este proyecto se diferencia por:

- Separar filtros duros y puntaje semántico explicado, con evaluación medible.
- Reconstruir el historial de cada candidatura a partir de los correos.
- Ser un sistema propio, extensible y sin dependencia de un servicio de terceros.

> El análisis comparativo detallado queda fuera del alcance de esta fase.

## 6. Alcance

Cada capacidad se etiqueta como `MVP`, `v1.1` o `futuro`. Solo las capacidades `MVP` se detallan en el PRD. Dentro del MVP, `should-have` marca lo que se construye solo si queda tiempo después de lo imprescindible.

### 6.1 Lo que hará

| Capacidad | Etapa |
| --- | --- |
| Registrar ofertas pegando el texto; la IA extrae los campos estructurados (descargar desde una URL: could-have) | `MVP` |
| Lista de empresas objetivo (grandes y medianas) con su plataforma de empleo | `MVP` |
| Importar ofertas de las empresas objetivo mediante adaptadores: Greenhouse y Ashby | `MVP` |
| Adaptador de Lever | `MVP (should-have)` |
| Búsquedas guardadas en un agregador de ofertas para empresas sin API (sujeto a spike; plan B: SmartRecruiters) | `MVP` |
| Adaptador para SmartRecruiters (si el agregador es viable) | `v1.1` |
| Convertir los correos de alertas de empleo de los portales en ofertas | `v1.1` |
| Adaptador para Workday (endpoint no documentado; requiere revisar sus términos de uso) | `futuro` |
| Descubrir empresas medianas nuevas según el perfil | `futuro` |
| Cargar el currículum en Markdown; la IA lo convierte en un perfil estructurado | `MVP` |
| Cargar el currículum en PDF y convertirlo a Markdown | `MVP (should-have)` |
| Configurar filtros duros: roles objetivo, modalidad, ubicación, salario mínimo y seniority | `MVP` |
| Registrar la decisión de aplicar o descartar cada oferta | `MVP` |
| Calcular un puntaje de encaje (0-100) con fortalezas, brechas y evidencia | `MVP` |
| Gestionar candidaturas en un pipeline (guardada, aplicada, entrevista, oferta, rechazada) | `MVP` |
| Interfaz en inglés (idioma principal), preparada para i18n | `MVP` |
| Pegar un correo en una candidatura; la IA lo clasifica y extrae fecha y siguiente paso | `MVP (should-have)` |
| Alertas de seguimiento para candidaturas sin actividad | `MVP (should-have)` |
| Traducción de la interfaz al español | `MVP (should-have)` |
| Segunda fuente de ofertas | `v1.1` |
| Lectura directa de Gmail (OAuth, solo lectura) para vincular hilos automáticamente | `v1.1` |
| Dashboard de métricas (tasa de respuesta, tiempo por etapa) | `v1.1` |
| Carta de presentación o currículum adaptado a una oferta | `v1.1` |
| Varios currículums, uno por tipo de rol, con selección automática del mejor para cada oferta | `futuro` |
| Vista híbrida: analizar el currículum como lo haría el ATS de una empresa (palabras clave faltantes, problemas de lectura) | `futuro` |
| Preparación de entrevistas con RAG sobre la oferta y la empresa | `futuro` |
| Extensión de navegador para guardar ofertas | `futuro` |
| Multiusuario | `futuro` |

### 6.2 Lo que no hará

- No aplicará automáticamente a ofertas ni llenará formularios de terceros.
- No hará scraping de LinkedIn, Indeed u otros portales cuyos términos de uso lo prohíban.
- No será un ATS para reclutadores ni gestionará candidatos de terceros.
- No enviará correos en nombre del usuario.
- No tomará decisiones por el usuario: el puntaje es una recomendación.

## 7. Restricciones

- **Tiempo:** 30 horas de desarrollo asistido por IA (recomendación del curso AI4Devs), con tope aceptado de 36 horas.
- **Entregas:** documentación (Entrega 1), código funcional con el flujo principal (Entrega 2) y entrega final con pruebas y despliegue.
- **Stack tecnológico (preferido, alineado con el curso):** TypeScript, AdonisJS, PostgreSQL con Lucid, React 19, Vite, Tuyau y despliegue en Railway. Versión: AdonisJS v7 (ADR-0001).
- **Proveedor de IA:** Claude API.
- **Idioma:**
  - Código, clases, tablas y campos en inglés.
  - Interfaz en inglés como idioma principal; español como segundo idioma (`should-have`).
  - Documentación del curso en español.

## 8. Supuestos y riesgos

| Tipo | Descripción | Mitigación |
| --- | --- | --- |
| Supuesto | La línea base de tiempo por oferta (~15 min) es representativa | Medirla durante la primera semana |
| Riesgo | La fuente pública elegida tiene poca cobertura en mis roles o ubicación | Validar la cobertura con una prueba rápida (spike) en la arquitectura; mantener el ingreso manual |
| Riesgo | El puntaje de la IA no coincide con mi criterio | Conjunto de referencia de unas 10 ofertas evaluadas a mano; iterar el prompt con evaluaciones |
| Riesgo | El costo de la API de Claude crece con el volumen de ofertas | Aplicar los filtros duros antes de la IA; guardar en caché los análisis por oferta y currículum |
| Riesgo | 30 horas no alcanzan para todo el MVP | Priorizar: puntaje de encaje y pipeline primero; correos y alertas después |
| Riesgo | Los currículums en PDF no se leen bien | Permitir revisar y corregir el perfil extraído |
| Riesgo | Datos personales (currículum, correos) en la nube | Un solo usuario autenticado, secretos en variables de entorno, sin compartir datos con terceros salvo la API de Claude; el evaluador usa una instancia de demostración con datos sintéticos (ADR-0007) |

## 9. Preguntas abiertas para las siguientes fases

- ~~¿Qué fuente de ofertas entra al MVP?~~ Resuelta: adaptadores por plataforma de empleo, con Greenhouse en el MVP (ver `docs/prd.md`, RF-04 y RF-09).
- ~~¿Qué modelo de Claude se usa para extracción y cuál para el puntaje?~~ Resuelta en ADR-0003.
- ~~¿Cuántos días sin actividad disparan una alerta de seguimiento?~~ Resuelta: 10 por defecto, configurable (RF-43).
- ¿Cómo se ponderan habilidades, experiencia y seniority dentro del puntaje? Se resuelve en el cambio de OpenSpec de HU6. La preferencia por híbrido ya quedó fuera de la IA (RF-28).

# Registro de uso de IA

### Prompt 1

- **Categoría:** `🔍 Investigación`
- **Modelo:** Claude Opus 5.5 (nivel de esfuerzo: [por confirmar])
- **Herramienta:** Claude Code
- **Prompt:**

  ```markdown
  Quiero desarrollar un sistema ATS (Applicant Tracking System) personal o un panel inteligente de búsqueda de empleo como proyecto final para el curso Master AI4Devs. La idea es que sea un sistema completo a largo plazo pero a la vez funcional con lo mínimo necesario y que demuestre lo aprendido en el curso. Cuál sería el proceso a seguir?
  ```

- **Resultado:** Propuesta de proceso por fases (descubrimiento, alcance y corte del MVP, PRD, arquitectura, historias y tickets, walking skeleton, ciclo OpenSpec, despliegue) aplicada a un ATS personal y alineada con las tres entregas del curso y con `docs/ai-sdlc-claude-code-openspec.md`. Respuesta en el chat; no se modificaron otros archivos.

### Prompt 2

- **Categoría:** `🔍 Investigación`
- **Modelo:** Claude Opus 5.5 (esfuerzo medio)
- **Herramienta:** Claude Code (skill `/opsx:explore`)
- **Prompt:**

  ```markdown
  Nivel de esfuerzo medio. Usa currículum en vez de CV. empecemos la entrevista de la Fase 0
  ```

- **Resultado:** Inicio de la entrevista de descubrimiento (Fase 0) en modo explore de OpenSpec, con las primeras preguntas sobre problema, usuario, hipótesis y lado del ATS. Respuesta en el chat. Nota: el nivel de esfuerzo de la entrada 1 también fue medio.

### Prompt 3

- **Categoría:** `🔍 Investigación`
- **Modelo:** Claude Opus 5.5 (esfuerzo medio)
- **Herramienta:** Claude Code (skill `/opsx:explore`)
- **Prompt:**

  ```markdown
  Sí, soy yo; me duelen más (a), (b) y (e); Es personal pero a largo plazo estaría bien un híbrido; un puntaje de encaje con una explicación; se recomienda que el proyecto se desarrolle en 30 horas asistido por AI;
  ```

- **Resultado:** Borrador de hipótesis y del flujo central del MVP, análisis de opciones para obtener ofertas (dolor a) dentro de 30 horas y reparto tentativo de horas. Nuevas preguntas sobre fuentes de ofertas, criterios de encaje, seguimiento y stack. Respuesta en el chat.

### Prompt 4

- **Categoría:** `🔍 Investigación`
- **Modelo:** Claude Opus 5.5 (esfuerzo medio)
- **Herramienta:** Claude Code (skill `/opsx:explore`)
- **Prompt:**

  ```markdown
  1. Estados Unidos, híbrido de preferencia pero también acepto remoto o presencial.
  2. Habilidades, experiencia y filtros duros (podemos comenzar con lo mencionado).
  3. Pues el historial está dentro de mi correo electrónico solamente y no es fácil localizar los hilos.
  4. Claude API está bien. No soy experto en el stack que se usó en el curso (AdonisJS 7, PostgreSQL/Lucid, React 19, Vite, Transcript, Tuyau y Railway) pero no hay problema, lo leo y entiendo sin problema.
  Como nota adicional, preferiría que el idioma base del sistema sea en inglés, es decir, la interfaz puede tener dos lenguages (español e inglés) pero en si, las clases, tablas, campos que estén en inglés. Para cualquier otra interacción español está bien.
  ```

- **Resultado:** Análisis de fuentes de ofertas para EE. UU., separación entre filtros duros y puntaje con IA, opciones para el historial de correo (pegar correo con clasificación por IA en el MVP, Gmail en v1.1), recomendación de usar el stack del curso y convención de idioma (código en inglés, UI bilingüe). Respuesta en el chat; convención guardada en la memoria del asistente.

### Prompt 5

- **Categoría:** `📝 Documentación`
- **Modelo:** Claude Opus 5.5 (esfuerzo medio)
- **Herramienta:** Claude Code (skill `/opsx:explore`)
- **Prompt:**

  ```markdown
  Es TypeScript; documentos del curso en español; no necesito visa; un solo currículum pero a largo plazo uno por tipo de rol para aumentar las posibilidades; redacta vision.md
  ```

- **Resultado:** Se creó `docs/vision.md` (borrador v0.1) con problema, usuario, hipótesis y métricas, propuesta de valor, alcance etiquetado `MVP`/`v1.1`/`futuro`, exclusiones, restricciones, riesgos y preguntas abiertas para la arquitectura.

### Prompt 6

- **Categoría:** `📝 Documentación`
- **Modelo:** Claude Opus 5.5 (esfuerzo medio)
- **Herramienta:** Claude Code
- **Prompt:**

  ```markdown
  HU5 se queda como should-have, i18n también pero usando el inglés como lenguaje principal; arranca el PRD
  ```

- **Resultado:** Se actualizó `docs/vision.md` (correos, alertas y traducción al español como `should-have`; interfaz en inglés) y se creó `docs/prd.md` (borrador v0.1) con objetivos, flujo principal, 4 historias must-have y 2 should-have, requisitos funcionales y no funcionales, criterios de aceptación de alto nivel, entidades del dominio y decisiones pendientes.

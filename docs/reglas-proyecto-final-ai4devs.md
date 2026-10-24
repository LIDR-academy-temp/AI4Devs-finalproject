# Reglas de negocio — Proyecto Final Master AI4Devs

> Resumen normativo basado en los documentos oficiales (Introducción, Ejemplos, Lección 1 y Lección 2).
> Los valores marcados como **[PENDIENTE]** no están definidos en las fuentes y deben confirmarse con el TA (asistente de enseñanza).

---

## 1. Objetivo y alcance

- **RN-01.** El proyecto es uno de los 4 criterios para obtener el certificado AI4Devs y es el más importante.
- **RN-02.** Se debe construir un **MVP** (producto mínimo viable) de tema libre, desarrollado de principio a fin con IA en todas las fases (idea, documentación, código, pruebas, despliegue).
- **RN-03.** El dominio es libre: puede ser un proyecto personal, una funcionalidad o módulo del trabajo actual, o una idea propia.
- **RN-04.** La tecnología es libre (JavaScript, Python, Java, PHP, Elixir, etc.).
- **RN-05.** El proyecto es individual por defecto; puede realizarse en grupo si los integrantes son de la misma empresa o de la misma edición.
- **RN-06.** Debe ser **robusto**: al menos un flujo de principio a fin (end-to-end) completo, con backend, frontend y base de datos (o su equivalente según el perfil y la tecnología).
- **RN-07.** Si no hay frontend (herramienta de línea de comandos, pipelines, drivers, agentes), es válido siempre que se pueda **verificar que funciona**.
- **RN-08.** Si es un proyecto de hardware, se exige un video de 2 a 3 minutos que muestre el funcionamiento.
- **RN-09.** Alcance recomendado: **3 a 5 historias de usuario imprescindibles (must-have)** y 1 o 2 deseables (should-have).
- **RN-10.** Dedicación estimada oficial: **30 horas** (en la práctica suele ser mayor).

## 2. Criterios de evaluación

| Eje | Descripción |
| --- | --- |
| Idea y arquitectura | Calidad del producto y de las decisiones de diseño |
| Calidad del código | Código generado y estructura del proyecto |
| Uso de IA | Cómo se usó la IA a lo largo del proceso (documentado en `prompts.md`) |

## 3. Entregas

| Entrega | Contenido | Fecha límite | Rama |
| --- | --- | --- | --- |
| 1. Documentación técnica | 100 % documentación, sin código | Jueves 22 de octubre, al final del día, sin importar el país | `feature/entrega-1-INICIALES` |
| 2. Código funcional | Estructura base (scaffolds) con frontend, backend y base de datos conectados; flujo principal casi completo; `README.md` y `prompts.md` actualizados | **[PENDIENTE]** Viernes de la sesión 16 | `feature/entrega-2-INICIALES` |
| 3. Entrega final | Entregas 1 y 2 consolidadas, 3 a 5 funcionalidades operativas, pruebas, evidencia de despliegue y documentación de IA | **[PENDIENTE]** 7 días después de la sesión 18 | `final-project-INICIALES` |

- **RN-11.** Las **iniciales** en el nombre de la rama son obligatorias; sin ellas no es posible identificar la entrega.
- **RN-12.** Se puede adelantar cualquier entrega sin esperar los plazos intermedios.
- **RN-13.** Las pruebas (tests) no son obligatorias en la Entrega 2, pero sí en la final.

### 3.1 Contenido de la Entrega 1 (documentación)

- Ficha del proyecto (nombre, descripción, URL del repositorio o archivo `.zip`).
- Descripción general: objetivo, características y funcionalidades.
- Arquitectura del sistema y modelo de datos.
- Historias de usuario y tickets de trabajo.
- Tecnologías utilizadas (stack).
- Registro de prompts desde el inicio del proyecto.

### 3.2 Contenido de la Entrega final

- De 3 a 5 funcionalidades completamente operativas.
- Pruebas: unitarias, de integración y **al menos una prueba E2E** (end-to-end) del flujo principal.
- Evidencia de despliegue: URL pública, capturas de pantalla o video.
- `README.md` y `prompts.md` con el estado final.
- El `README.md` debe incluir obligatoriamente:
  - Credenciales de prueba para el evaluador.
  - URL del despliegue (si existe).
  - Pasos y flujos específicos que se deben verificar.

## 4. Mecánica de entrega

1. Hacer un **fork** del repositorio oficial: <https://github.com/LIDR-academy/AI4Devs-finalproject>
2. Crear la rama de cada entrega con el formato de la sección 3.
3. Completar el **formulario de Typeform** después de cada entrega: <https://lidr.typeform.com/proyectoai4devs>

- **RN-14.** **Sin formulario, la entrega no existe formalmente.**
- **RN-15.** Datos obligatorios del formulario:
  - Nombre completo.
  - Correo electrónico (el mismo que se usa en el calendario de la formación).
  - Entrega correspondiente (1, 2 o final).
  - Enlace directo a la rama en GitHub.

## 5. Documentación

- **RN-16.** La documentación vive en el **fork del repositorio oficial** (no en Confluence, Notion ni wikis externos).
- **RN-17.** Si el código está en otro repositorio propio: el fork contiene el `README.md` completo con el enlace a dicho repositorio; no es necesario duplicar el contenido.
- **RN-18.** Los tickets pueden gestionarse con la herramienta de preferencia (Jira, Linear, GitHub Issues, Azure DevOps, Notion), pero deben existir y estar referenciados en la documentación.
- **RN-19.** Distinción:
  - **Historia de usuario:** lenguaje de negocio; describe lo que el usuario necesita.
  - **Ticket de trabajo:** definición técnica, implementación y criterios de aceptación.
  - Una historia puede generar varios tickets.
- **RN-20.** Archivos obligatorios:
  - `README.md`: ficha, descripción, arquitectura, API, historias, tickets y tecnologías.
  - `prompts.md`: registro del uso de IA.
- **RN-21.** Referencia de estructura (ejemplo 1): documentos numerados 0-ficha, 1-descripción, 2-arquitectura, 3-datos, 4-API, 5-historias, 6-tickets.

## 6. Registro de IA (`prompts.md`)

Debe incluir:

- Herramientas utilizadas (Claude, Cursor, ChatGPT, etc.) y la fase en que se usaron.
- Modelos utilizados y su propósito (por ejemplo, Opus para especificaciones y Sonnet para programar).
- Skills, subagentes, reglas (rules) y comandos personalizados, así como el contexto proporcionado (`CLAUDE.md`, system prompts), si se usaron.
- Los prompts o flujos de trabajo más representativos (se recomienda un mínimo de 3 a 5).
- Ajustes humanos realizados sobre el resultado de la IA.

- **RN-22.** No es necesario documentar todos los prompts, solo los clave.
- **RN-23.** Si no se guardaron los prompts, se documenta el **flujo de trabajo** (puede reconstruirse); a partir de ese momento se guardan los relevantes.
- **RN-24.** `prompts.md` es obligatorio en **todos** los casos, incluso en proyectos confidenciales.

## 7. Despliegue y evidencia

- **RN-25.** Mínimo obligatorio: que se pueda **verificar que el sistema funciona** (URL pública, video de 2 a 3 minutos o acceso al repositorio para ejecutarlo localmente).
- **RN-26.** No es obligatorio: dominio propio, CI/CD completo ni infraestructura como código.

| Tipo de proyecto | Distribución sugerida |
| --- | --- |
| Web estándar | Plataforma en la nube (Railway, Render, Vercel + Supabase, etc.) |
| Android | Firebase App Distribution (APK) |
| iOS | Firebase App Distribution (IPA), sin necesidad de cuenta de desarrollador de Apple |
| Aplicación de escritorio / Kotlin Multiplatform | Release en GitHub (JAR, EXE) |
| Sin interfaz (línea de comandos, pipelines, agentes) | Entorno local documentado, más un video o demostración del resultado |
| Confidencial | README completo y video de 2 a 3 minutos |

- **RN-27.** El README debe tener una sección clara de "Cómo ejecutar localmente".

## 8. Proyectos privados o confidenciales

| Opción | Requisitos | Retroalimentación |
| --- | --- | --- |
| **A (recomendada):** repositorio privado | Dar acceso de lectura a la cuenta `LIDR-AI4Devs`; entrega normal por formulario; incluir credenciales de prueba y flujos a revisar en el README | Sí |
| **B:** sin compartir el código | README completo, `prompts.md` y video de 2 a 3 minutos adjunto en el formulario | No (la entrega es válida, pero sin retroalimentación técnica ni funcional) |

## 9. Retroalimentación

- **RN-28.** Solo la **entrega final** recibe retroalimentación personalizada.
- **RN-29.** Revisión híbrida (humano + IA):
  - **Técnica:** código y técnicas de uso de IA.
  - **Funcional:** el proyecto funciona de acuerdo con el flujo definido por el alumno.

## 10. Prórroga y cambios

- **RN-30.** Prórroga de hasta **2 semanas** sobre la fecha de la entrega final, evaluada caso por caso. Fecha límite con prórroga: **[PENDIENTE]** (3 semanas después de la sesión 18).
- **RN-31.** Debe solicitarse al TA **con anticipación**, nunca el día del vencimiento.
- **RN-32.** Las entregas parciales (1 y 2) tienen flexibilidad informal: avisar al TA con anticipación; la prórroga formal solo aplica a la entrega final.
- **RN-33.** Se puede **cambiar de idea de proyecto**; avisar antes al TA.
- **RN-34.** Si se parte de código heredado (legacy), consultar antes con el TA (se recomienda empezar desde cero cuando sea posible).

## 11. Canales de soporte

| Tipo de duda | Canal |
| --- | --- |
| Logística (entregas, formato, acceso) | Correo electrónico a jorge@lidr.co con copia al TA |
| Técnica o específica del proyecto | WhatsApp al TA (o primero al grupo de la edición) |
| Bloqueos de diseño o arquitectura | WhatsApp al TA |
| Requiere un mentor especializado | El TA lo conecta |

## 12. Recomendaciones (no obligatorias)

- Orquestador de agentes: opcional, no es requisito para aprobar.
- Planificar con ayuda de la IA, incluso si se trabaja solo: problema → PRD → épicas (3 a 5) → historias → tickets → flujo SDD (especificaciones → arquitectura → código).
- Definir las reglas de arquitectura en `CLAUDE.md` o en rules antes de empezar a programar, sobre todo con tecnologías poco convencionales.
- Empezar las pruebas desde el inicio para no concentrarlas en el último sprint.
- Usar los ejemplos reales como referencia de decisiones, no como molde para copiar.

## 13. Lista de verificación previa a cada entrega

- [ ] Fork actualizado y `README.md` completo.
- [ ] Rama con el nombre exacto e iniciales.
- [ ] `prompts.md` actualizado.
- [ ] Acceso otorgado a `LIDR-AI4Devs` si el repositorio es privado.
- [ ] Formulario de Typeform completado con el enlace a la rama.
- [ ] (Final) Credenciales de prueba, URL de despliegue, flujos a verificar y pruebas incluidos.

## 14. Inconsistencias por confirmar con el TA

- Las fechas de la Entrega 2, la Entrega final y la prórroga aparecen como **[PENDIENTE]** en las fuentes.
- La Lección 1 presenta el 22 de octubre como "fecha límite" general, mientras que la introducción lo asigna a la Entrega 1. Confirmar cuál aplica.

## 15. Reglas de idioma

- **RN-35.** Todo el documento se redacta en español de México, en registro formal. Se evitan los coloquialismos y los localismos de España.
- **RN-36.** Se aplican las siguientes equivalencias:

| Evitar | Usar |
| --- | --- |
| codear | programar |
| feedback | retroalimentación |
| tests, testing | pruebas |
| repo | repositorio |
| email | correo electrónico |
| ejecutar en local | ejecutarlo localmente |
| No hace falta | No es necesario |
| pivotar | cambiar de idea |
| legacy | código heredado (legacy) |
| cuenta de developer | cuenta de desarrollador |
| scaffolds | estructura base (scaffolds) |
| deploy | despliegue |
| dashboard | tablero de control |
| workflow | flujo de trabajo |
| feature | funcionalidad |
| backlog | lista de pendientes (backlog) |
| coverage | cobertura de pruebas |
| deadline | fecha límite |
| review | revisión |
| setup | configuración |
| input / output | entrada / salida |
| link | enlace |
| open source | código abierto |
| bug | error |

- **RN-37.** Se conservan en inglés los términos técnicos de uso común en México:

| Término | Nota |
| --- | --- |
| fork, frontend, backend | Sin traducción |
| sprint, ticket, stack | Sin traducción |
| prompt, skill, rules | Sin traducción |
| pipeline | Sin traducción |
| pull request, commit, merge, branch (en comandos) | Sin traducción; en prosa se usa "rama" |
| endpoint, mock, script | Sin traducción |
| release | Sin traducción |
| Kanban, MVP, PRD, E2E | Siglas y metodologías, sin traducción |

- **RN-38.** Los identificadores literales no se traducen: nombres de archivos (`README.md`, `prompts.md`, `CLAUDE.md`), nombres de ramas, cuentas, URLs, comandos y nombres propios de herramientas (por ejemplo, GitHub Issues).
- **RN-39.** Los porcentajes se escriben con espacio entre la cifra y el símbolo (por ejemplo, "100 %").
- **RN-40.** Las siglas se definen la primera vez que aparecen. Por ejemplo, TA (asistente de enseñanza).

## 16. Registro de prompts

- **RN-41.** `docs/ai-log.md` compila **todos** los prompts utilizados en el proyecto, cada uno con su resumen de resultado.
- **RN-42.** `prompts.md` contiene solo los prompts clave, seleccionados de `docs/ai-log.md`, junto con los ajustes humanos realizados (ver RN-22 y RN-24).
- **RN-43.** La mecánica de registro (formato, categorías y restricciones) está definida en `.claude/rules/ai-log.md`.

# Verificaciones pendientes — V (no resueltas)

**Estado:** revisión documental sin ejecutar código, builds, dependencias, audit, pruebas, accesos de red, ni comprobar la rama real. Estos puntos no son instrucciones de implementación.

| ID | Punto | Evidencia documental | Corroboración requerida | Regla provisional |
|---|---|---|---|---|
| **V-01** — Material UI en diseño y código | DESIGN-SYSTEM.md especifica MUI v5/v6; frontend-standards.md MUI v7. | Comprobar package.json, lockfile, temaVes.js y overrides del proyecto. | No migrar tokens ni ejemplos de MUI automáticamente. |
| **V-02** — Handoff y diseño exportado | DESIGN-HANDOFF declara fuente de verdad visual; el HTML y el manifiesto existen en el repositorio, pero su correspondencia con la UI actual no está verificada. | Inspeccionar DESIGN-MANIFEST.json y data-load-design-system.html y comparar contra UI. | No sustituir componentes actuales ni inventar pantallas. |
| **V-03** — Login de prototipo vs autenticación real | LOGIN-SPEC incluye tiempos simulados y estado OpenID ilustrativo. | Comparar prototipo contra Autenticacion.jsx, LandingGaudi.jsx y config GAUDI. | No copiar retardos simulados ni cambios de autenticación. |
| **V-04** — Usabilidad y WCAG | USABILIDAD afirma cumplimiento basado en feature/cambios-visuales-ui (agosto 2026). | Validación de rama actual, teclado, contrastes y pruebas A11y reales. | No afirmar conformidad WCAG actual. |
| **V-05** — Auditoría npm caducidad temporal | Pendientes-npm-audit proviene de 2026-08-26; versions/advisories pueden haber cambiado. | Leer package.json/lock y correr auditoría de solo consulta si autorizado; cotejar advisories. | No hacer npm audit fix ni upgrade directo. |
| **V-06** — ENCRYPTION_KEY y exposición a navegador | README documenta ENCRYPTION_KEY en .env; riesgo/uso actual sin verificar. | Comprobar archivos .env ignorados, vite.config.mjs, uso de la clave y pipeline. | No copiar claves ni exponerlas en __APP_CONFIG__. |
| **V-07** — Permisos y botonera | frontend-standards describe Botonera y opciones reales por usuario. | Verificar Botonera, contrato API, controles por acción en backend y BD de pruebas. | No simular autorizaciones ni confundir ocultar botón con autorización backend. |
| **V-08** — Efectos laterales de scripts de build | Deploy describe incrementos de versión en build:pruebas/produccion. | Inspeccionar scripts package.json, construirAmbiente.mjs y pipeline. | No ejecutar builds de pruebas/producción durante análisis. |
| **V-09** — Rutas y enlaces a artefactos ausentes | DESIGN-MANIFEST.json, data-load-design-system.html, mui-theme.js y AGENT.md existen en el repositorio; deben revisarse sus referencias y correspondencia. | Comprobar rutas, referencias y correspondencia con la implementación actual. | No crear reemplazos ficticios ni declarar equivalencia funcional sin evidencia. |
| **V-10** — Versiones React Router y deuda | Frontend usa React Router DOM 6; nota de auditoría propone migración mayor v7. | Consultar dependencias y riesgos de rutas, callback GAUDI y pruebas actuales. | No migrar por limpieza documental. |
| **V-11** — Sincronización base con backend consolidado | El base-standards recién adjuntado incorpora regla 0.1.1 ausente en copia previa del paquete backend. | Revisar diff de base compartido y aprobar única versión de base-standards para UI/API/MAPI. | No sobreescribir automáticamente el paquete backend ya entregado. |
| **V-12** — Coexistencia de estilos CSS/MUI/Bootstrap | Estándar UI, USABILIDAD y DESIGN-SYSTEM tienen descripciones y tokens de momentos distintos. | Comprobar temaVes, AplicadorDeTema, estilos y variantes real. | No sustituir sistema de temas sin prueba visual. |
| **V-13** — Contraste y dimensión objetivos de toque | DESIGN-SYSTEM propone WCAG contraste y tamaños de tap target; no hay medida real reciente. | Medir tokens, temas y componentes en navegador; verificar accesibilidad. | No afirmar cumplimiento universal. |
| **V-14** — Configuración y directorios desplegados | Deploy incluye URLs/rutas por ambiente y NODE_CONFIG_ENV en tiempo de build. | Comparar config JSON, vite.config.mjs y pipelines reales por ambiente. | No publicar ni asumir que los hosts/proxies son los vigentes. |
| **V-15** — Credenciales/controles de prototipo | Login spec incluye recordar sesión y reenvíos, que no verifican sesión real. | Inspeccionar estrategia de sesión y backend de autorización. | No hacer bypass de autenticación. |
| **V-16** — Carga automática del harness | Front matter globs/alwaysApply no garantiza que VS Code/Copilot aplique estas reglas. | Inspeccionar AGENTS.md, .github/instructions, settings de Copilot, referencias y workspace. | No afirmar que Copilot carga archivos automáticamente. |
| **V-17** — Alcance real de prueba E2E y cobertura | Los documentos dicen Vitest/RTL, no Cypress/Jest; no se adjuntó el repositorio. | Comprobar package.json, scripts, suites y evidencias existentes. | No declarar tests pasados ni introducir Cypress. |
| **V-18** — Estado de módulos y documentación | SPEC/DEVELOPMENT/README enumeran módulos y componentes, con posibles diferencias de fecha. | Verificar rutas y módulos del árbol src actual. | No eliminar módulos o declarar funcionalidad terminada sin prueba. |

## Aprobación y trazabilidad

La resolución de cualquier V requiere fuentes del proyecto real y aprobación diferenciada para documentación, código/pruebas, dependencias y Azure DevOps. Las notas editoriales añadidas a documentos no constituyen verificación técnica.

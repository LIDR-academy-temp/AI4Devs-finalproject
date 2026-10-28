# 05 — Accesibilidad usable: criterios y comprobaciones

## Referencia

WCAG 2.2 AA: https://www.w3.org/TR/WCAG22/. Para apps nativas, aplicar requisitos equivalentes a los controles y APIs de accesibilidad de la plataforma; WCAG es punto de referencia, no sustituto de las guías nativas.

## Lista básica

- Controles operables con teclado/dispositivo asistivo, orden de foco coherente y foco visible.
- Labels y nombres accesibles correctos; componentes con rol/estado identificable.
- Información importante nunca se expresa solo con color, posición, icono o vibración.
- Texto/contraste adecuados (para texto normal típico, objetivo 4.5:1; grande típico 3:1; verificar excepciones WCAG).
- Áreas táctiles suficientes según plataforma; en web, revisar criterio WCAG 2.2 2.5.8 y excepciones aplicables.
- Formularios muestran errores recuperables y sugerencias específicas.
- Diálogos gestionan foco/escape; tabulación no queda perdida detrás del overlay.
- Cambios dinámicos importantes se anuncian sin saturar; no usar aria-live indiscriminadamente.
- Diseño funciona con zoom/reflow/texto grande, orientación y scroll razonable.
- Animación no esencial respeta preferencia del usuario.

## React/HTML

- Etiqueta `<label htmlFor>` + `id` o etiqueta envolvente; `aria-describedby` para ayuda/error; `aria-invalid` cuando corresponda.
- Usar `button` para acciones y `a` para navegación. Evitar `div onClick` sin semántica.
- `aria-expanded` y `aria-controls` para toggle, solo si coinciden con estado real.
- En tablas, `<th>` y encabezados reconocibles; no convertir tablas de datos en grids ARIA si no es necesario.
- Si se usa un toolkit accesible, respetar su manejo interno de foco.

## WinUI 3

- Texto accesible y AutomationProperties de controles XAML.
- Manejar KeyboardAccelerators, FocusVisual y narrador cuando aplique.
- Controlar contrastes por theme resources, alto contraste y configuración del sistema.
- Verificar Windows scaling/text scaling y lectura con Narrator cuando sea posible.

## Flutter

- `Semantics`, `ExcludeSemantics`/`MergeSemantics` donde sea necesario y prueba con TalkBack/VoiceOver.
- `Focus`, `FocusTraversalGroup`, acciones y orden de tabulación en desktop/tablet.
- Escalado de texto, tamaños táctiles y temas claro/oscuro.
- Movimiento reducido a través de preferencias/plataforma.

## Pruebas y honestidad

Una auditoría estática no certifica WCAG; herramientas automáticas tampoco sustituyen pruebas manuales. Reportar herramienta, entorno, tipo de prueba, hallazgo, ubicación, severidad y repro. Si no se ejecutó lector de pantalla, decirlo.

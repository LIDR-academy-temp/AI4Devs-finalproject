# 04 — Motion: microinteracciones y transiciones con propósito

## Regla de activación

Implementar motion **solo** si comunica: relación espacial, apertura/cierre, cambio de estado, progreso, confirmación o feedback. En pantallas de captura intensiva, preferir movimientos cortos o ninguno. Nunca añadir animaciones como efecto genérico a todos los componentes.

## Patrón -> intención -> guardas

| Patrón | Intención | Cuidados |
|---|---|---|
| Dropdown/panel | Ubicar de dónde aparece | Foco y clic exterior consistentes |
| Modal | Indicar capa y retorno | Trampa de foco, Escape, devolver foco |
| Loading/progreso | Evitar incertidumbre | Respetar latencias y anunciar estado |
| Error input | Dirigir atención | Error textual; no depender de vibración/shake |
| Éxito | Confirmar acción | Solo después de persistencia |
| Card expand | Continuidad espacial | No causar saltos de layout excesivos |
| Número/KPI | Indicar actualización | Proteger legibilidad y preferencia reduced motion |

## Tokens iniciales, no universales

El sistema de diseño existente siempre manda. En ausencia de tokens, sugerencias orientativas: microinteracción 120–180 ms, entrada/salida 160–250 ms, paneles complejos hasta 300 ms; validar sensación real y evitar bloquear interacciones. Estos rangos son heurísticos, no especificaciones normativas.

## CSS web: ejemplo propio y mínimo

```css
.motion-panel {
  opacity: 0;
  transform: translateY(6px);
  transition: opacity 180ms ease, transform 180ms ease;
}
.motion-panel[data-open="true"] {
  opacity: 1;
  transform: translateY(0);
}
@media (prefers-reduced-motion: reduce) {
  .motion-panel { transition-duration: 0.01ms; transform: none; }
}
```

Lo anterior solo resuelve la animación visual; accesibilidad, montaje/desmontaje, focus y estado se implementan aparte.

## Plataforma

- **React/web:** CSS transitions o motor ya instalado; preferir transform/opacidad a animación de ancho/alto costosa; respetar reduced motion.
- **WinUI 3:** usar APIs/animaciones de WinUI/Windows y configuración de movimiento del sistema; no pegar CSS.
- **Flutter:** `Animated*`, `AnimationController` o solución actual del proyecto cuando sea justificable, observando `MediaQuery.disableAnimations` cuando corresponda.

## Biblioteca original Transitions.dev

Referencia: https://github.com/Jakubantalik/transitions.dev

Ofrece recetas CSS, CLI y herramientas opcionales. Este paquete no redistribuye CSS de su biblioteca ni opciones Pro. Si el usuario necesita una receta específica y está permitido instalarla, revisar primero licencia y comandos originales; no suponer que hay acceso Pro.

## Auditoría

- ¿Explica algo que sin motion no se entendería?
- ¿Se puede omitir sin perder información?
- ¿Se evita animar continuamente una tabla/lista?
- ¿Se mantiene foco y lectura con lector de pantalla?
- ¿Cumple reducción de movimiento del sistema?
- ¿Hay saltos, flash, inversión de lógica o bloqueo del input?

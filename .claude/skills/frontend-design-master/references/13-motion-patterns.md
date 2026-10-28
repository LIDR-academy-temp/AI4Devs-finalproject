# 13 — Recetas propias para estados de motion

No se incluyen las recetas oficiales ni el catálogo Pro de Transitions.dev. Los ejemplos siguientes son **originales y mínimos**, adaptables al sistema de diseño existente. Antes de copiarlos, revisar CSS/JS del proyecto y el estado de foco/DOM.

## Tokens sugeridos (si no existen otros)

```css
:root {
  --ui-motion-fast: 140ms;
  --ui-motion-normal: 200ms;
  --ui-motion-ease: cubic-bezier(.2, .8, .2, 1);
  --ui-motion-distance: 6px;
}
@media (prefers-reduced-motion: reduce) {
  :root {
    --ui-motion-fast: 1ms;
    --ui-motion-normal: 1ms;
    --ui-motion-distance: 0px;
  }
}
```

## Menú / panel revelado por estado

```css
.ui-reveal {
  opacity: 0;
  transform: translateY(var(--ui-motion-distance));
  transition: opacity var(--ui-motion-normal) var(--ui-motion-ease),
              transform var(--ui-motion-normal) var(--ui-motion-ease);
}
.ui-reveal[data-state="open"] { opacity: 1; transform: translateY(0); }
@media (prefers-reduced-motion: reduce) { .ui-reveal { transform: none; } }
```

**Advertencia:** mantener el nodo en DOM durante cierre o no se verá el efecto; elementos cerrados no deben ser enfocables; gestionar `aria-expanded`, foco y escape mediante el componente UI que ya utilice el proyecto. No usar solo CSS para crear semántica.

## Botón que confirma guardado

- `idle` → `saving` al enviar la petición: bloquear duplicados sin borrar la entrada del usuario.
- `saving` → `success` **solo** cuando el servidor confirme persistencia.
- `saving` → `error` muestra problema y permite recuperación.
- Indicador visual corto opcional; siempre etiqueta textual o estado accesible.
- No colocar un `setTimeout` como sustituto de la respuesta del servidor.

## Toasts/notificaciones

- Autoocultar solo mensajes informativos no críticos; errores que requieren decisión deben persistir hasta lectura/interacción.
- En cola con varios mensajes, preservar orden; no robar foco por defecto.
- Respetar lector de pantalla y evitar `aria-live` para cada microcambio.

## Indicadores de carga y skeletons

- No producir shimmer infinito a pantalla completa.
- Usar skeleton solo si representa aproximadamente el espacio de datos que se recibirán.
- Evitar parpadeos en operaciones de menos de unos cientos de ms; la UI debe responder claramente a latencias reales.
- Desactivar movimiento no esencial con preferencias del sistema.

## Reglas de seguridad y rendimiento

- No mover botones debajo del puntero durante animaciones.
- Preferir animaciones de `opacity` y `transform` para movimientos simples; no reescribir layout costoso por frame.
- No depender de hover para mostrar la única acción de una fila.
- En WinUI 3 y Flutter, **traducir intención** a controles/animaciones nativas, nunca pegar CSS.

Revisar el inventario de la herramienta original y sus términos en `THIRD_PARTY.md` si se requiere una receta exacta oficial.

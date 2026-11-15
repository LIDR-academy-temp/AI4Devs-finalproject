---
applyTo: "frontend/src/**"
---

# Revisión del frontend

La pantalla principal responde si se puede aplicar ahora. Lo usan productores en el campo, a veces desde el teléfono.

- **Accesibilidad de los formularios.** Cada campo tiene una etiqueta asociada con `htmlFor` (el componente `Campo`), y la ayuda y el error quedan fuera de la etiqueta para no ensuciar su nombre accesible. Los errores se anuncian y se asocian al campo. Los botones tienen un nombre claro.
- **Estado de la decisión visible.** El estado (APTO, PRECAUCION, RIESGO_DERIVA, NO_APLICAR, DATOS_INSUFICIENTES) no se transmite solo con color: siempre con texto.
- **Textos en castellano** y unidades métricas (km/h, °C, W/m²). Las fechas y horas se muestran en hora de Argentina.
- **Tipos generados.** Las llamadas a la API usan `servicios/cliente.ts` y los tipos de `servicios/api-tipos.ts`. Señalar un tipo de respuesta escrito a mano que duplique uno generado, o una edición manual de `api-tipos.ts`.
- **Sin secretos en el cliente.** Nada de claves, tokens ni la URL de SAT2 en el código del frontend ni en variables `VITE_*`. Todo lo que está en el cliente es público.
- **Sesión.** No guardar la sesión ni datos personales en `localStorage`; la sesión va en la cookie que maneja la API.
- **Pruebas.** Un cambio de comportamiento en una pantalla necesita su prueba en `src/pruebas` (Vitest y Testing Library), buscando los elementos por su rol y su nombre accesible.

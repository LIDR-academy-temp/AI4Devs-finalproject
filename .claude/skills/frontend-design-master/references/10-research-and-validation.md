# 10 — Evidencias, investigación y validación

## Jerarquía de evidencia

1. Código fuente y reglas locales.
2. Ejecución real del build/tests.
3. Render/captura del entorno objetivo con pruebas de interacción.
4. Guías oficiales de la plataforma y normas actuales.
5. Inspiración externa como referencia no vinculante.

## Proceso recomendado para cambios visuales importantes

- Capturar o describir el estado actual sin inventar screenshots.
- Identificar escenario feliz, errores, vacíos y datos extremos.
- Implementar la modificación mínima viable.
- Ejecutar build/tests permitidos.
- Si hay preview de browser/emulador disponible, revisar 3 tamaños relevantes según plataforma.
- Comparar estética y usabilidad con diseño actual, no con gusto genérico.
- Registrar antes/después solo si las capturas existen de verdad.

## Fuentes externas

Consultar documentación oficial para firmas de APIs, versiones de paquetes y soporte de WinUI/Flutter/React. Si no hay acceso de red, no inventar que se verificó la última documentación. No tomar capturas de personas/datos internos para servicios externos sin permiso.

## Performance (no inventar números)

- Web: LCP, CLS, INP si se miden; carga de bundle y render en listas.
- WinUI: tiempos de render inicial, virtualización, latencia de interacción y acceso UI-thread.
- Flutter: jank/frame time, rebuilds, imágenes pesadas y scrolling.

Sin profiler, describir sospechas y riesgos, no afirmar mejoras cuantificadas.

## Checklist de evidencia de entrega

- [ ] Rutas/archivos modificados listados
- [ ] Evidencia de `git diff` o equivalente revisada
- [ ] Comandos de verificación y resultados documentados
- [ ] Comprobación visual real o limitación explícita
- [ ] Contraste/teclado/estados principales cubiertos
- [ ] Dependencias nuevas justificadas y aprobadas
- [ ] No hubo modificación no solicitada de backend/BD

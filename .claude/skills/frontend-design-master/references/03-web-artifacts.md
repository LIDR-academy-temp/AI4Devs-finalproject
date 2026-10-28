# 03 — Web Artifacts: prototipos interactivos y HTML portable

## Cuándo usar

- Demostración de UI para aceptar requerimientos, explorar interacción o mostrar estados con datos ficticios.
- Necesidad explícita de un HTML único que la persona pueda abrir/compartir.
- No usar para sustituir una aplicación productiva, un build empresarial ni una API real.

## Dos rutas

### Ruta A — Implementación en proyecto React existente (predeterminada)

1. Inspeccionar `package.json`, framework, bundler, router, estilos y design system.
2. Reutilizar componentes existentes y crear una pantalla/prototipo dentro de la arquitectura.
3. Ejecutar los comandos actuales de build/test con permiso y sin instalar paquetes nuevos innecesarios.
4. Si se pide HTML autónomo, investigar si los assets, routing y llamadas API lo permiten. No prometer independencia sin comprobarlo.

### Ruta B — Artifact independiente / single-file

Si el usuario solicita un `bundle.html` independiente:
1. Si **la skill original Web Artifacts Builder está instalada**, se puede usar su init script, desarrollo React y bundle script siguiendo su documentación oficial. **Este ZIP no los incluye**.
2. Sin ella, crear una miniapp con la herramienta ya disponible, con la estructura y build adecuados, y usar un bundler/inline compatible solo si el entorno lo permite.
3. Si se utiliza Vite y se aprueba añadir una dependencia, considerar un empaquetador mantenido como `vite-plugin-singlefile` después de verificar compatibilidad con la versión del proyecto. No agregarlo automáticamente. Si hay importaciones dinámicas/chunks, comprobar portabilidad con especial atención.
4. Si el archivo final existe, ejecutar `python scripts/check_artifact.py RUTA_AL_HTML --strict` para detectar algunas referencias locales/externas **sin ejecutar código de terceros**. Esto es un chequeo conservador, no sustituye un navegador.
5. Asegurar que los recursos estén realmente inline y no referidos como rutas relativas externas cuando se prometa archivo autónomo.
6. Evaluar errores de CORS, uso de APIs, almacenamiento local, navegación (history/browser) y políticas de contenido.
7. Abrir y validar el HTML final desconectado de la carpeta de fuentes para comprobar portabilidad real.

## Diseño mínimo del prototipo

- Incluye estados `cargando`, `vacío`, `error`, `éxito`.
- Al usar mocks: datos claramente falsos y lógica local etiquetada.
- Los controles anunciados realizan acciones visibles; no botones inertes.
- El responsive y teclado siguen siendo requisito.
- Cuando existan APIs reales, no ocultar la dependencia remota bajo "self-contained".

## Referencia original (no ejecutada automáticamente)

https://github.com/anthropics/skills/tree/main/skills/web-artifacts-builder

Stack documentado: React 18 + TypeScript + Vite + Parcel + Tailwind + shadcn/ui. Su script `bundle-artifact.sh` crea `bundle.html` y requiere un proyecto y recursos concretos. No asumir disponibilidad local, no copiarlo a ciegas, ni instalar `pnpm` global sin autorización.

## Criterios de aceptación del artefacto

- Abre en navegador compatible y sin errores fatales.
- CSS/JS/assets necesarios están incluidos o se explicitan dependencias.
- Interacción funcional dentro del alcance declarado.
- No contiene secretos, tokens, URLs internas confidenciales ni datos personales reales.
- Se probó al menos en tamaño de escritorio y móvil si aplica.
- El resultado se identifica como prototipo si no hay persistencia ni servicios reales.

# 14 — Criterios de aceptación específicos por plataforma

No basta con que "se vea bonito". Adjuntar a los tickets criterios observables derivados del flujo de trabajo.

## React / Web

- Navegación directa y atrás funcionan según el router; foco y scroll se conservan o reinician intencionalmente.
- Estados vacíos, error, cargando y permisos tienen contenido real, sin botones inertes.
- Tabulación, Escape, labels, tablas, mensajes de error y acciones masivas verificables.
- Probar en tamaños relevantes, zoom y tema existente; sin clipping ni contenido crítico fuera de alcance.
- Si se solicita HTML portable, `check_artifact.py` audita referencias **pero no sustituye abrirlo en un browser**.

## WinUI 3

- XAML y recursos compilan; bindings y comandos funcionan en Windows (si se dispone de ejecución).
- Estados cargando/error no bloquean hilo UI, y los comandos no permiten operaciones duplicadas.
- Tabulación, aceleradores, Narrator, alto contraste y escalado de Windows.
- Dialogs devuelven foco; no cambia MSIX, SDK, certificados ni appinstaller por un ajuste visual.

## Flutter

- Navegación, estado, back y persistencia actual se mantienen sin cambios de API.
- Scrolling y keyboard insets correctos; no hay overflow en texto grande o idiomas largos.
- `Semantics` y orden de foco revisados; animaciones respetan accesibilidad.
- `flutter analyze`/tests cuando estén disponibles; pruebas en dispositivo/emulador identificadas.
- No cambiar firma, APNs/FCM, gradle, permisos o publicación si el cambio es UI.

## Prueba transversal: contrato de regresión

Antes de rediseñar registrar y después verificar: campos, columnas, orden, filtros, acciones, permisos, navegación, atajos, mensajes importantes, formatos regionales y comportamiento al editar/guardar. Lo no verificado se etiqueta explícitamente.

# Plataforma — Flutter / Dart

## Antes

- Revisar `pubspec.yaml`, versión SDK, tema, Material/Cupertino, enrutamiento, estado (`Provider`, `Riverpod`, `Bloc`, etc.) y plataformas objetivo.
- Respetar widgets internos y patrón de manejo de estado existente.

## Implementación

- Componer widgets, usar `const` donde sea apropiado, evitar reconstrucciones innecesarias y dependencias nuevas sin necesidad.
- Mantener estados de carga, vacío, error, éxito, permisos (incluido cámara si aplica) y desconexión.
- Respetar insets/teclado, safe areas, orientación, densidad, dark mode y textScale.
- `Semantics`, foco, acciones, TalkBack/VoiceOver y targets táctiles.
- Motion: widgets `Animated*` existentes, `AnimationController` solo cuando se justifique; respetar reducción de animaciones.
- Diseño adaptativo basado en espacio disponible (`LayoutBuilder`, constraints) y patrones adecuados de tablet/móvil.

## Validación

Usar los comandos disponibles del proyecto, normalmente `flutter analyze`, `flutter test` y build de plataforma cuando el entorno lo permita. No asegurar compatibilidad iOS/Android solo por compilación Dart.

## Precauciones

No cambiar firmas, `compileSdk`, NDK, configuración APNs/FCM, certificados o publicación de tiendas salvo tarea explícita.

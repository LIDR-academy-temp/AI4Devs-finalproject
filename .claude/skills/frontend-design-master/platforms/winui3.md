# Plataforma — WinUI 3 / Windows App SDK

## Antes

- Localizar `.sln`/`.slnx`/`.csproj`, TargetFramework, versión Windows App SDK, XAML, ResourceDictionary y patrón MVVM.
- Revisar controles, estilos, recursos dinámicos, bindings `{x:Bind}`/`{Binding}`, comandos y navegación.
- Evitar cambios de paquete/SDK o ajustes MSIX que no formen parte del requerimiento.

## UI nativa

- Usar controles WinUI 3 existentes; priorizar `Grid`, `StackPanel`, `NavigationView`, `ContentDialog`, `TeachingTip`, `InfoBar`, `ItemsRepeater` o `ListView` según necesidades y librerías disponibles.
- Respetar `ThemeResource` / `StaticResource` apropiadamente y recursos corporativos.
- No trasladar patrones CSS de web literalmente a XAML.
- Virtualizar tablas/listas grandes y evitar procesamiento pesado en UI thread.
- Validar columnas, tabulación, foco, navegación, teclado, mouse, escalado y Narrator.
- Manejar binding/lifecycle y estado del ViewModel sin modificar modelos de persistencia por cuestiones cosméticas.
- Usar animaciones nativas cuando aporten claridad y respete preferencias del sistema.

## Validación

- Inspeccionar compilación, warnings de XAML, rutas de recursos, bindings y eventos.
- Cuando sea posible, ejecutar en Windows objetivo; no afirmar una prueba de runtime si solo se inspeccionó el código.
- Comprobar modo oscuro, alto contraste y texto ampliado.

## Regla crítica

No publicar MSIX, modificar certificados, appinstaller, servicios ni base de datos como parte de una tarea UI sin autorización expresa.

# 08 — Design system y tokens

## Prioridad de fuentes

1. Identidad y design system existentes del proyecto.
2. Biblioteca de componentes y temas actualmente utilizados.
3. Reglas corporativas de marca definidas por usuario.
4. Solo si no existen anteriores, proponer conjunto mínimo de tokens y documentarlo.

## Catálogo mínimo

- Color: superficie, texto, borde, primario, secundario, éxito, aviso, error, seleccionado, hover/focus y disabled; contrastes verificables.
- Tipografía: familia, pesos permitidos, tamaños para título/sección/cuerpo/auxiliar/dato numérico; line-height.
- Espaciado: escala coherente (por ejemplo 4/8/12/16/24/32), densidad compacta y normal si se requiere.
- Forma: radio y grosor de borde por jerarquía, sin hacer todas las tarjetas idénticas.
- Motion: duración y easing de apertura/cierre/cambio de estado; variantes reducidas.
- Controles: botón, input, select, tabla, diálogo, sidebar, badge, notification, skeleton y estado vacío.

## Variantes

- Claro/oscuro y alto contraste si la plataforma lo admite.
- Estados: default, hover (web/desktop), focus, pressed, active, selected, disabled, invalid, loading.
- Escala/adaptabilidad según tipo de usuario y plataforma.

## Gobernanza

- Tokens centralizados en la convención de cada stack: CSS variables/Tailwind theme; recursos XAML; ThemeData/ColorScheme Flutter.
- No introducir valores hardcodeados dispersos si existe token.
- No añadir un nuevo color/tamaño/espaciado sin razón documentada.
- Resolver casos límite: truncamiento, error largo, idioma largo y números muy grandes.

## Antes de crear componente

Buscar uno equivalente. Si falta, decidir si es reutilizable y su API; agregar ejemplo de uso y estado de accesibilidad. Evitar crear componentes genéricos "para futuro" sin requisitos concretos.

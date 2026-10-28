# UI Review - Cuarta Quinientos Web

## Estado general
- Tema central en `Web/wwwroot/config/cq-site-theme.json` + motor `cq-theme-engine.js/css`.
- Layout unificado: `_SiteThemeHead`, `_SiteStyles`, `cq-theme`.
- Panel admin: `/Admin/TemaSitio` (sidebar + acceso rápido en Home para administradores).
- Templates disponibles: `ocean`, `neutral`, `minimal`, `corporate`.
- Hero cards unificados en admin (`cq-reserva-hero`) y residente (`cq-resident-hero` / `cq-ticket-hero`).

## Pantallas alineadas
- Catálogos: Condominios, Casas, Áreas comunes, Reservas, Tickets, Visitas, Pase QR, Validar QR
- Finanzas: Cuentas, Cuotas, Transacciones
- Admin: Usuarios, Perfiles, Menús, Permisos, Residentes, Mascotas, Automóviles, Template sitio
- Gestión: Documentos, Juntas, Notificaciones, Encuestas, Calendario, Perfil
- Portal residente: Inicio, Cuenta, Pases, Visitas, Tickets, Reservas, Documentos, Notificaciones, Encuestas, Perfil, Vivienda
- Auth: Login, Reset password, Acceso denegado
- Error: `Shared/Error.cshtml` (español + patrón cq)

## Panel de tema (`/Admin/TemaSitio`)
- Configuración general: template por defecto, fuentes, toggle de cambio de tema.
- **Vista previa en vivo** al cambiar template o colores.
- **Editor visual de colores** por template (primary, accent, sidebar, fondo, meta).
- Guardado persistente vía `POST Admin/TemaSitio/GuardarColores`.

## Pulido transversal (CSS en `cq-theme-engine.css`)
- Microinteracciones en cards residente.
- `:focus-visible` para accesibilidad de teclado.
- Responsive hero/topbar/split-panel en `<768px` y `<992px`.
- Empty states unificados (`cq-reserva-empty`) en bandejas residente.

## Archivo maestro de tema
```
Web/wwwroot/config/cq-site-theme.json
```
Cambiar `defaultTheme`, `fonts` o `themes.*.tokens` aplica el estilo a todo el sitio.

## Opcional futuro
- Editor de tokens avanzados (radius, sombras, gradientes login).
- Modo oscuro dedicado como quinto template.
- Auditoría visual automatizada en CI (screenshots por ruta).

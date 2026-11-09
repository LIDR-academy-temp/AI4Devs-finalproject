# Lectura del proyecto frontend

Cómo encontrar en el código lo que el mockup dibuja. **El profile del target**
(`sdd-toolkit/profiles/<target>.md`) y los docs de contexto del propio repo mandan
sobre esta guía. Esto es el punto de partida cuando no dicen nada.

## 1. Antes de buscar pantallas

| Qué leer | Para qué |
|---|---|
| `CLAUDE.md`, `AGENTS.md`, `README`, `Docs/` o `docs/` del repo | Reglas vigentes de la feature (de dónde salen los textos, qué no se infiere en cliente, tipografía) |
| Profile del target en `sdd-toolkit/profiles/` | Arquitectura, convenciones, pitfalls |
| `git log --oneline -15` y rama actual | Qué se implementó hace poco y podría no estar en el mockup anterior |
| Docs de API vigentes (si el mockup muestra datos) | Qué campos ya existen; no proponer lo que ya llega |

Anotar en el README del contexto: repo, rama y commit revisados.

## 2. Dónde está cada cosa, por stack

| Qué | Flutter (mobile) | React + Vite (frontend) | ASP.NET MVC 5 (web-legacy) | ASP.NET Core (web-core) | WinUI 3 / WPF (escritorio) |
|---|---|---|---|---|---|
| Pantallas / rutas | `lib/pages/**`, `routeName`, `MaterialPageRoute`, `GoRouter`, rutas en `main.dart` | `src/routes*`, `createBrowserRouter`, `src/features/*/pages`, `src/pages` | `Controllers/*Controller.cs` → `Views/<Ctrl>/*.cshtml` | `Pages/**/*.cshtml` (Razor Pages) o Controllers + `Views/` | `Views/**/*Page.xaml`, `Frame.Navigate(typeof(…))`, `NavigationView` en `MainWindow.xaml` |
| Componente raíz de la pantalla | `StatefulWidget` / `StatelessWidget` con `build()` | Componente exportado por la página | Vista `.cshtml` + `_Layout` | Página `.cshtml` + `PageModel` | `Page` XAML + `ViewModel` (CommunityToolkit.Mvvm: `[ObservableProperty]`, `[RelayCommand]`) |
| Componentes compartidos | `lib/Widgets/General`, `lib/Widgets/<Dominio>` | `src/components`, `src/shared/ui`, `src/features/*/components` | `Views/Shared/`, partials `_*.cshtml` | `Pages/Shared/`, ViewComponents, TagHelpers | `Controls/`, `UserControl`, `DataTemplate` en `ResourceDictionary` |
| Tema / tokens | `ThemeData`, `*theme*.dart`, `static const Color x = Color(0xFF……)` | `tailwind.config.*`, `:root { --x }`, `theme.ts`, `*.module.css` | `Content/*.css`, `*.less`, `*.scss` | `wwwroot/css/**`, `*.scss` | `App.xaml` / `Themes/*.xaml`: `<Color x:Key>`, `<SolidColorBrush x:Key>` (hex **#AARRGGBB**) |
| Tipografía | `pubspec.yaml` → `fonts:`, `TextStyle`, helpers de escala | `font-family` en CSS / tailwind `fontFamily` | CSS | CSS | `FontFamily` en estilos XAML |
| Textos / i18n | `l10n.yaml`, `lib/l10n/*.arb`, `AppLocalizations.of(context)` (`flutter gen-l10n`) | `locales/**/*.json` (i18next), `react-intl`, `*.po` | `*.resx` (`Resources.*`) | `*.resx` + `IStringLocalizer` | `Strings/<idioma>/Resources.resw`, `x:Uid` en XAML |
| Estado | Provider / ChangeNotifier, Riverpod, Bloc, `ValueNotifier`, `setState` | Zustand, Redux, Context, TanStack Query | `Session[]`, `ViewBag`, ViewModels | `PageModel`, servicios DI | ViewModels + servicios DI |
| Llamadas al back | `lib/api/*_service.dart` + modelos `fromJson` | `src/api/**`, hooks de query | `<CLASE_HTTP_MVC>` | `<CLASE_HTTP_CORE>` | `HttpClient` / servicios en `Services/` |
| Iconos / imágenes | `assets/**` en `pubspec.yaml` | `src/assets`, `public/` | `Content/img` | `wwwroot/img` | `Assets/` |

Búsquedas útiles (ajustar al proyecto):

```bash
# ¿Dónde se pinta un texto que el mockup muestra?
rg -n "Mis equipos" <repo>/lib/l10n          # valor → llave
rg -n "teamAffiliation_myTeams" <repo>/lib   # llave → widget que la usa
# ¿De dónde sale un color?
rg -n "0xFF1F2349|#1F2349" <repo> -i
# ¿Quién usa este componente? (todos los lugares que cambian solos si se toca)
rg -n "TaNivelProgressBar\(" <repo>/lib
```

## 3. Qué anotar por pantalla

Esta ficha alimenta directo el documento 01:

| Campo | Ejemplo |
|---|---|
| Pantalla del mockup | `s04` Detalle de equipo |
| Pantalla real | `lib/pages/team_detail_screen.dart` · `TeamDetailScreen` |
| Cómo se llega | Mis equipos → tarjeta → detalle (`Navigator.pushNamed`) |
| Orden actual de bloques | encabezado → estatus → banner → tarjeta del mes → pestañas |
| Condiciones de visibilidad | `if (showDashboard && metas != null)` en `:212` |
| Estados que ya maneja | cargando, error, sin tablero, formándose, completo |
| Textos y llaves | `teamAffiliation_conformado` (5 archivos) |
| Datos | `provider.loadTeamMetas(teamId)` → `TeamMetasDashboard` |
| Componentes compartidos | `TeamDashboardView` (también lo usa la vista del miembro) |
| Diferencia contra el mockup | existe / cambia (qué) / nuevo |

Los componentes compartidos importan dos veces: un cambio ahí **se propaga solo** a otras
pantallas (anotarlo como «cambia solo» en 01) y puede afectar pantallas que el mockup no dibuja.

## 4. Señales de que falta leer más

- El mockup muestra un número y no sabes qué campo lo trae → leer servicio + modelo + doc de API.
- Un bloque aparece en una pantalla del mockup y no en otra parecida → buscar la condición en el código; si no existe, es decisión de negocio (pendiente).
- El mockup usa un color a ΔE < 6 de un token → casi seguro es el token; confirmar antes de proponer uno nuevo.
- Un texto del mockup es «parecido» a una llave → probablemente es la misma llave con otra redacción: es un **cambio de texto**, no una llave nueva.
- Hay más de un país, idioma, marca o rol → construir la matriz antes de escribir 01.

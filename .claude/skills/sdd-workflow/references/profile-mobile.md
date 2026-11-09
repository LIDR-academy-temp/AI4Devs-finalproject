# Profile: mobile — nice_app (Flutter + Dart)

## Stack

| Capa | Tecnología |
|------|-----------|
| Framework | Flutter 3.8 / Dart |
| Estado global | Provider (ChangeNotifierProvider) |
| Eventos reactivos | ValueNotifier (notifiers.dart) |
| Estado local | StatefulWidget + setState |
| HTTP | ApiRequest (clase estática centralizada, lib/api/) |
| Push | firebase_messaging |
| Pagos | flutter_stripe + OpenPay (WebView) |
| Tests | flutter test (sin mockito/mocktail) |

## Arquitectura

```
lib/
├── pages/       ← [nombre]_screen_widget.dart · StatefulWidget
├── api/         ← [dominio]_service.dart
├── models/      ← [entidad]_model.dart · fromJson() manual
│   └── shop/
├── Widgets/     ← PascalCase (convención del proyecto — no cambiar)
│   ├── General/ ← widgets compartidos
│   └── <Dom>/
└── utils/       ← utilidades transversales
```

Navegación: rutas nombradas en `main.dart` · `static const routeName` por pantalla
Barrel export: `lib/index.dart`

## Convenciones

- No BuildContext fuera del árbol de widgets (no en servicios ni modelos)
- Pantalla: `[nombre]_screen_widget.dart` · StatefulWidget · `static const routeName`
- Servicio: `[dominio]_service.dart` · llama ApiRequest estático
- Modelo: `[entidad]_model.dart` · `fromJson()` factory · `copyWith()` opcional
- Carpeta `Widgets/`: PascalCase (excepción documentada al snake_case habitual de Dart)

## Cuándo usar qué patrón de estado

| Alcance | Patrón |
|---------|--------|
| Sesión / tienda global | ChangeNotifierProvider → SessionProvider / ShopProvider |
| Eventos ligeros cross-widget | ValueNotifier en `lib/utils/notifiers.dart` |
| Estado local de pantalla | StatefulWidget + setState |

## Qué debe especificar design.md para este target

- Pantallas/widgets a crear o modificar (ruta relativa desde `lib/`)
- Contratos con backend: endpoint, método HTTP, payload, forma de respuesta
- Gestión de estado: Provider vs ValueNotifier vs setState para el caso concreto
- Si toca localización: clave ARB + archivos `app_<lang>.arb` afectados
- Peldaño de escalera por pantalla/widget (3 reuso / 4 modif / 5 nuevo)
- Plan de pruebas: qué cubre `flutter test` y qué requiere prueba manual

## Verificación antes de entregar

```bash
flutter analyze   # cero warnings — obligatorio
flutter test      # todos los tests pasan — obligatorio
```

## Reutilización

- `lib/Widgets/General/`: verificar antes de crear widget
- `lib/api/`: verificar antes de agregar servicio
- `lib/models/`: verificar `fromJson()` antes de redefinir mapeo
- `Docs/Context/` de `nice_app`: consultar para contexto funcional del dominio

## Learnings (acumulado)

<!-- tools.compound_loop agrega aquí -->
| TKT | Fecha cierre | Aprendizaje |
|-----|-------------|-------------|

## Decisiones (ADR)

<!-- tools.compound_loop agrega aquí -->

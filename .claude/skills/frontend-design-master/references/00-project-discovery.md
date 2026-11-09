# 00 — Descubrimiento antes de editar

## Inspección mínima, sin ejecutar cambios

1. Identificar raíz del repositorio, plataforma, lenguaje y gestor de paquetes.
2. Revisar reglas aplicables: `AGENTS.md`, `.cursor/rules`, `.claude/CLAUDE.md`, `CLAUDE.md`, convenciones del equipo y arquitectura ya aprobada.
3. Localizar archivos afectados y dependencias reales (routing, ViewModel/store, tipos, servicios, CSS/XAML/widgets, tokens).
4. Determinar si existe sistema de diseño, iconografía, componentes compartidos, localización y tema claro/oscuro.
5. Buscar pruebas, storybook, capturas, diseño de referencia y flujo comparable dentro del proyecto.
6. Investigar requisitos de seguridad, permisos, estados, performance y telemetría del flujo sin capturar datos sensibles en evidencia.

## Clasificación

| Tipo | Ejemplo | Cambio permitido |
|---|---|---|
| Parche localizado | Alinear label y botón | Solo layout/estilo del componente |
| Mejora UX acotada | Validación y mensajes en formulario | Componente y pruebas relacionadas |
| Nueva pantalla | Vista de inventario | Composición + estado + navegación autorizada |
| Rediseño | Modernizar dashboard | Propuesta, aceptación y ejecución controlada |
| Prototipo | Demostración a usuario | Datos ficticios etiquetados, sin API real obligatoria |
| Auditoría | Ver problemas sin editar | Reporte y evidencias, cero escritura |

## No-go por defecto

- No actualizar esquemas de SQL Server ni modificar objetos de base de datos.
- No modificar contratos API, permisos de autenticación ni despliegue por introducir UI.
- No borrar ni renombrar rutas/comandos usados por otros módulos.
- No eliminar librerías actuales porque otra parezca más moderna.
- No agregar componentes/páginas sin accesibilidad básica y estados fundamentales.

## Resultado antes de implementación importante

```text
Plataforma:
Pantalla/flujo afectado:
Reglas de proyecto observadas:
Diseño reutilizable identificado:
Riesgos y dependencias:
Supuestos:
Módulos elegidos:
Archivos previstos:
Cómo se validará:
```

Si no hay repositorio accesible y el usuario pide código de ejemplo, etiquetar la solución como ilustrativa y no presumir archivos/estructura reales.

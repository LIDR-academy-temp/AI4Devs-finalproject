# 02 — Taste: dirección visual deliberada

## Principio

Una interfaz debe mostrar una decisión de diseño basada en el producto y su audiencia, no una receta estética genérica. La sofisticación puede consistir en **claridad y densidad controlada**, especialmente en software empresarial.

Si el encargo implica diseño nuevo o rediseño visual, consultar **`references/11-design-calibration.md`** para calibrar `DESIGN_VARIANCE`, `MOTION_INTENSITY` y `VISUAL_DENSITY`. No cargar esa referencia en cambios menores.

## Método reproducible

1. Extrae del problema 3–5 rasgos únicos: industria, usuario, tarea, contenido, tono de la marca.
2. Antes de codificar, escribe una frase de dirección: `Esta interfaz se siente como ___ porque prioriza ___ para ___`.
3. Define jerarquía de información y ritmo: encabezado, resumen, acción principal, datos primarios, metadatos.
4. Decide tipografía y escala según sistema existente; no cambiar familia por modas.
5. Define espaciado y densidad conscientemente (operativo alto, consumidor medio, marketing editorial).
6. Reserva el color de acento para significado/acción; no asignar colores aleatorios a cada tarjeta.
7. Usa imágenes auténticas solo cuando aporten contexto y exista licencia adecuada; no insertar stock decorativo en herramientas internas.
8. Inspecciona la pantalla real, recorta el problema mayor y corrige hasta 3 iteraciones cuando herramientas/tiempo lo permitan.

## Anti-patrones de IA a revisar

- Header gigante que desplaza los controles útiles fuera de la pantalla.
- Tarjetas excesivas con bordes, sombras, radios y paddings idénticos.
- Tipografía indistinguible entre títulos, KPIs y acciones.
- Degradados llamativos sin relación con marca.
- Pantallas vacías con información real escondida.
- Iconos sin significado, alineación inconsistente o demasiadas jerarquías.
- Botones primarios compitiendo entre sí.
- Color usado como único indicador de estado.

## Diseño para sistemas administrativos

- Reducir altura desperdiciada en filtros/cabeceras; priorizar filas legibles.
- Alinear cantidades por dígitos y unidades, headers/celdas consistentes.
- Mantener acciones persistentes y visibles con separación de destructivas.
- Evitar transformar una tabla densa en tarjetas bonitas pero lentas de usar.
- Respetar teclado, escaneo, selección múltiple y rapidez de captura.

## Validación visual

Si existe navegador, simulador, captura o render:
- Comparar a 3 anchuras representativas (según plataforma), light/dark si aplica, zoom/escala de texto, contenido extremo.
- Inspeccionar márgenes, alineación de columnas, recorte, contraste percibido, relación títulos/datos, focos/hover y banners de error.
- Identificar 3 defectos de mayor impacto antes de pulir microdetalles.

Si no hay render, describir la revisión como **estática**; no declarar que se "vio en browser".

## Entregable de dirección

```text
Objetivo y público:
Idea visual (1 frase):
Patrones reutilizados:
Tokens y jerarquía:
Densidad de información:
Motivos para evitar decoraciones:
Defectos observados / no verificados:
```

Este módulo no ejecuta el script de direcciones ni el browser checker de la Taste Skill original. Consulta `THIRD_PARTY.md` si se requiere exactamente esa herramienta.

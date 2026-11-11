# ADR-001 · Aplicación web propia en lugar de seguir extendiendo SSRS

- **Estado:** Aceptado (propuesto en la Entrega 1; confirmado en la Entrega 2)
- **Decisores:** autor del proyecto

## Contexto

La herramienta actual son unos 24 reportes SSRS usados como si fueran una aplicación web (README §1.1). Normalizar el archivo del proveedor es copiar y pegar a mano en una plantilla Excel sin validación; crear una cuenta o un fee se hace por consulta directa a la base; reprocesar un batch lo borra sin dejar historia; y cada pantalla nueva cuesta mucho más de lo que debería, porque SSRS no está pensado para formularios, sesiones ni flujos de varios pasos.

## Opciones consideradas

1. Seguir añadiendo reportes y rodeos sobre SSRS.
2. Una aplicación web propia (SPA + API) que reemplace el flujo de punta a punta.

## Decisión

Opción 2: Recon Tool 2.0 es una aplicación independiente con frontend React, API Fastify y base SQL Server propia (ADR-002, ADR-005).

## Consecuencias

- Formularios, validación de entrada, sesiones, permisos por acción y alcance por merchant, y errores se resuelven de forma nativa.
- Hay que reconstruir lo que el sistema actual ya hace: el MVP prioriza la cadena importar → parear → validar → procesar → resumir y exportar (README §1.5).
- La integración con el Back-Office del gateway sigue siendo por CSV, porque es una herramienta de terceros.

## En la Entrega 2

Sin desviación: el flujo HU1 → HU2 → HU3 corre en la aplicación web con datos sintéticos.

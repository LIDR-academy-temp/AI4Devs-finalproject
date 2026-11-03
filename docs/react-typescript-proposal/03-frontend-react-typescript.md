# 3. Frontend React + TypeScript

## Tecnología propuesta

- React
- TypeScript con `strict: true`
- Vite para desarrollo y build
- React Router para navegación
- TanStack Query para consultas y mutaciones remotas
- React Hook Form para formularios
- Zod para validar respuestas y entradas
- Vitest y Testing Library para pruebas
- Playwright para flujos principales

## Estructura inicial

```text
src/
  app/
  components/
  features/documents/
    api/
    components/
    pages/
    schemas/
    types/
  features/auth/
  lib/
```

En este proyecto, `features/auth/` representa únicamente el contexto de **seguridad simulada** necesario para seleccionar o consumir una identidad y permisos mock. No implementa inicio de sesión real ni integración con `SeguridadVES`.

## Pantallas iniciales

- `DocumentListPage`
- `DocumentDetailsPage`
- `DocumentEditorPage`

## Estados obligatorios

Cada pantalla debe contemplar:

- carga
- resultado vacío
- error
- permisos insuficientes según el perfil simulado
- guardado en progreso
- éxito después de una mutación

## Regla de tipos

Los tipos de frontend deben representar contratos de la API. No deben copiar directamente clases VB.NET ni estructuras `DataSet`.

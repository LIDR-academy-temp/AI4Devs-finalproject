[← index](_index.md)

# Delta: FE-044

## Páginas nuevas

| Componente | Ruta | Rol | Descripción |
|-----------|------|-----|-------------|
| `EncuestasPage` | `/encuestas` | Residente | Lista encuestas activas; badge "Ya respondiste" |
| `EncuestaDetallePage` | `/encuestas/:id` | Residente | Formulario radio/texto; POST respuestas |
| `AdminEncuestasPage` | `/admin/encuestas` | Admin | Tabla encuestas; modal crear; acción Publicar |
| `ResultadosEncuestaPage` | `/admin/encuestas/:id/resultados` | Admin | Resultados agregados con porcentajes por opción |

## Hooks nuevos

| Hook | Endpoint | Retorno |
|------|---------|---------|
| `useEncuestasActivas` | `GET /ENC/Encuestas/activas` | `{ encuestas, loading, error, refetch }` |
| `useEncuestasAdmin` | `GET /ENC/Encuestas` | `{ encuestas, loading, error, refetch }` |

## Tipos nuevos (`shared/types/encuestas.ts`)

`EncuestaListItem`, `OpcionPregunta`, `PreguntaDetalle`, `EncuestaDetalle`, `ResultadoOpcion`, `ResultadoPregunta`, `EncuestaResultados`, `RespuestaItem`, `EncuestaCrearRequest`

## Archivos modificados

| Archivo | Cambio |
|---------|--------|
| `App.tsx` | +4 rutas ENC (2 residente, 2 admin) |
| `appNavigation.ts` | +2 entradas nav (`/encuestas` residente, `/admin/encuestas` admin) |

## Pruebas

- **Vitest**: 8 tests OK
- **tsc --noEmit**: limpio

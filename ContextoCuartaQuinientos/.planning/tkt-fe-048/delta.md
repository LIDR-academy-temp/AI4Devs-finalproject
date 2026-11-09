# delta.md — tkt-fe-048 (VEH FE)

## Páginas nuevas

| Archivo | Ruta | Rol |
|---------|------|-----|
| `MisVehiculosPage.tsx` | `/mis-vehiculos` | Residente — CRUD propio |
| `AdminVehiculosPage.tsx` | `/admin/vehiculos` | Admin — búsqueda por placas |

## Hooks nuevos

| Hook | Endpoint | Bug apiGet |
|------|----------|-----------|
| `useVehiculos` | GET /USR/Automoviles | ✅ presente (setVehiculos(data)) |
| `useMarcas` | GET /USR/Marcas | ✅ presente |
| `useModelos` | GET /USR/Modelos | ✅ presente |

## Tipos nuevos

`vehiculos.ts`: `AutomovilListItem`, `MarcaDto`, `ModeloDto`, `AutomovilCrearRequest`, `AutomovilActualizarRequest`

## Rutas App.tsx añadidas

```
/mis-vehiculos       → MisVehiculosPage   (residentOnly)
/admin/vehiculos     → AdminVehiculosPage  (adminOnly)
```

## Tests

- `AdminVehiculosPage.test.tsx`: 11 Vitest tests
- `MisVehiculosPage.test.tsx`: sin evidencia en index (no confirmado)

## Decisiones clave

- Búsqueda de placas en AdminVehiculosPage se uppercasea en el cliente antes de enviar al API.
- useMarcas/useModelos no tienen loading state propio (simples .then directos), suficiente para los selects del formulario.
- Bug apiGet documentado en los tres hooks como refactor post-entrega; no bloquea la funcionalidad porque el API devuelve el objeto de respuesta que sí contiene los datos en `.data`.

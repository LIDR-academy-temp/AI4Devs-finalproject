# delta.md — tkt-fe-049 (MAS FE)

## Páginas nuevas

| Archivo | Ruta | Rol |
|---------|------|-----|
| `MisMascotasPage.tsx` | `/mis-mascotas` | Residente — CRUD propio |
| `AdminMascotasPage.tsx` | `/admin/mascotas` | Admin — padrón (solo lectura) |

## Hooks nuevos

| Hook | Endpoint | Bug apiGet |
|------|----------|-----------|
| `useMascotas` | GET /USR/Mascotas | ✅ presente (setMascotas(data ?? [])) |
| `useTiposMascota` | GET /USR/TiposMascota | ✅ presente |
| `useRazasMascota` | GET /USR/RazasMascota | ✅ presente |
| `usePadronMascotas` | GET /USR/Mascotas/padron | ✅ presente |

## Tipos nuevos

`mascotas.ts`: `MascotaListItem`, `TipoMascotaDto`, `RazaMascotaDto`, `MascotaCrearRequest`, `MascotaActualizarRequest`

## Rutas App.tsx añadidas

```
/mis-mascotas      → MisMascotasPage   (residentOnly)
/admin/mascotas    → AdminMascotasPage  (adminOnly)
```

## Tests

- `AdminMascotasPage.test.tsx`: 7 Vitest tests
- `MisMascotasPage.test.tsx`: 8 Vitest tests

## Decisiones clave

- Admin solo puede ver el padrón (sin CRUD) — mutaciones solo disponibles para el residente en MisMascotasPage.
- useTiposMascota y useRazasMascota retornan arrays directos (no objetos con loading/error) — suficiente para los selects del formulario.
- usePadronMascotas tiene loading state propio (acceso admin con potencialmente muchos registros).
- Bug apiGet documentado en todos los hooks como refactor post-entrega; no bloquea funcionalidad.

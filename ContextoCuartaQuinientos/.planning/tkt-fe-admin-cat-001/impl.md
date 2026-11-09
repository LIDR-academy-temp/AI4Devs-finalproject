# Impl — FE-ADMIN-CAT-001

> [← index](_index.md) | [delta →](delta.md)

## Resumen

Implementación retroactiva en `GraphApi/` + `Web/` (sin `design.md`).

## Backend (GraphApi)

| Área | Archivos |
|------|----------|
| Mascotas admin | `MascotasController` (`admin`, `{id}/admin`); `TiposMascotaController`, `RazasMascotaController`; `CuartaMascotasRepository` / `Service` |
| WMS categorías | `ArticulosController` (`categorias`); `CuartaAlmacenRepository` / `Service` |
| VTS tipos ID | `TiposIdentificacionController`; `CuartaVisitasRepository` / `Service` |
| USR marcas/modelos | `MarcasController`, `ModelosController`; `CuartaAutomovilesRepository` / `Service`; DTOs upsert en `CuartaAutomovilDtos.cs` |

## Frontend (Web)

| Módulo | Rutas principales |
|--------|-------------------|
| Mascotas | `AdminMascotasPage.tsx`, `AdminMascotasCatalogSections.tsx`, `useMascotasCatalog.ts`, `mascotasAdminSchemas.ts` |
| Almacén | `AdminAlmacenPage.tsx`, `AdminCategoriasAlmacenSection.tsx`, `almacenMappers.ts`, `useAlmacen.ts` |
| Visitas | `AdminVisitasPage.tsx`, `AdminTiposIdentificacionSection.tsx`, `visitasMappers.ts`, `useVisitasCatalog.ts`, `useCasasSelect` |
| Vehículos | `AdminVehiculosPage.tsx`, `AdminVehiculosCatalogSections.tsx`, `useVehiculosCatalog.ts`, `vehiculosCatalogSchemas.ts` |

## SQL (repo)

- `SQL/DB-008_vts_tipos_identificacion_seed.sql` — semilla tipos ID si tabla vacía
- `SQL/DB-005_wms_schema.sql` / `DB-005_wms_prestamos_notas.sql` — esquema WMS (entorno local)
- `GraphApi/Infrastructure/SqlSchemaCompat.cs` — compatibilidad columnas WMS

## Verificación

```powershell
cd Web
npm test -- --run
node_modules\.bin\tsc --noEmit

cd ..\GraphApi
dotnet test   # detener instancia en ejecución si bloquea build
```

## Auditoría

- auditor-sql: scripts WMS/seed revisados en contexto; no re-audit formal en cierre ligero
- auditor-codigo: no re-audit formal en cierre ligero

[← index](_index.md) | [← design](design.md)

# Impl + revisión — FE-ADMIN-UX-002

## Implementado

### Web

| Módulo | Archivos principales |
|--------|---------------------|
| Menús admin | `AdminMenusPage.tsx`, `MenuTreeEditor.tsx`, `MenuPerfilPermisosPanel.tsx`, `menuAdminFormUtils.ts`, `navegacion.api.ts` |
| Finanzas admin | `CuotasAdminTable.tsx`, `MovimientosAdminTable.tsx`, `*TableFilter.ts`, `AdminMovimientosFnzSection.tsx`, `FinanzasAdminPage.tsx` |
| Anuncios admin | `anunciosAdminSchemas.ts` (+ test), hint vigencia en `AdminAnunciosPage.tsx` |

### GraphApi

| Cambio | Archivo |
|--------|---------|
| Endpoints permisos por menú | `MenusController.cs` |
| Servicio + repo | `CuartaNavegacionService.cs`, `CuartaNavegacionRepository.cs`, DTOs |
| Vigencia listado residente | `CuartaAnunciosRepository.cs` (`CAST` fecha) |

## Verificación (/revisar)

| Check | Resultado |
|-------|-----------|
| CA-M1..M2 | Código + contrato API presente |
| CA-F1 | `AdminFilterableTable` en cuotas/movimientos |
| CA-A1 | Query BD: anuncio «basura hoy» visible con regla `CAST` |
| `npm test` (Web) | **293** passed, 2 skipped |
| `tsc --noEmit` | OK |
| `dotnet test` | Smoke integración puede fallar si API bloqueada en local (no regresión de este TKT) |

## Auditoría

| Agente | Veredicto | Notas |
|--------|-----------|-------|
| auditor-codigo (ligera) | **APROBADO** | Cambios acotados; auth `SoloAdministrador` en endpoints nuevos |
| auditor-sql | **APROBADO** | Sin scripts DDL; filtro fecha en C# parametrizado |
| auditor-seguridad | N/A | Sin secretos; mismos patrones JWT existentes |

## Hallazgos

- Ninguno bloqueante post-fix vigencia.

## Despliegue

1. Reiniciar **GraphApi** (endpoints menús + filtro ANM).
2. Web estática Vite (sin paso BD).

## Estado revisión

**LISTO PARA PR**

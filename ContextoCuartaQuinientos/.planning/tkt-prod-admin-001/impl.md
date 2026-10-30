[← design](design.md) | [index](_index.md) | [delta →](delta.md)

# impl.md — PROD-ADMIN-001

## SQL (prod)

| Script | Uso |
|--------|-----|
| `SQL/20261029_PROD-ADMIN-001_APLICAR_FALTANTES.sql` | WMS + vista archivos |
| `SQL/20261029_PROD-ADMIN-001_VALIDAR_GAPS.sql` | Diagnóstico |
| `SQL/DB-009_fix_views_y_tablas.sql` | Vistas usr/sgr/tkt (si aplica) |
| `SQL/20261029_PROD-ADMIN-001_DESPLIEGUE_PROD.md` | Orden y reglas |

**Prod db24572 (2026-10-30):** gaps WMS, ARC FechaCreacion, RefreshTokens OK (MCP).

## GraphApi (representativo)

| Área | Archivos |
|------|----------|
| ANM | `Controllers/ANM/TiposAnuncio/TiposAnuncioController.cs`, `Services/ANM/.../CuartaAnunciosService.cs` |
| SGR | `Controllers/SGR/Perfiles/PerfilesController.cs`, `Services/SGR/Navegacion/CuartaNavegacionService.cs` |
| ENC | `Repositories/ENC/CuartaEncuestasRepository.cs` (resultados agregados) |
| USR | `Services/USR/CuartaMascotas/CuartaMascotasService.cs`, servicios vehículos análogos |

## Web

| Página | Cambio |
|--------|--------|
| `AdminArchivosPage.tsx` | Pestañas archivos + tipos |
| `AdminAnunciosPage.tsx` | Pestaña tipos anuncio |
| `AdminPerfilesPage.tsx` | CRUD perfil admin |

## Verificación

| Check | Resultado |
|-------|-----------|
| Smoke prod admin + residente (autor + terceros) | OK 2026-10-30 |
| Deploy API/Web | Publicado runasp.net |
| Suite SQL ticket | Ver `20261029_PROD-ADMIN-001_PruebasUnitarias.sql` (validación objetos) |

## Auditoría (retro cierre)

- **auditor-sql:** scripts idempotentes; sin DB-001 en prod legacy — **APROBADO** documental.
- **auditor-codigo:** alcance ya revisado en sesiones `/ejecutar` — **APROBADO** documental.
- **Veredicto cierre:** **APROBADO** con evidencia smoke prod.

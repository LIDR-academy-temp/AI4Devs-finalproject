# Contexto del requerimiento — PROD-ADMIN-001

**Origen:** prueba manual del sitio publicado (SmarterASP) — admin autenticado.  
**Fecha reporte:** 2026-10-29 (Luis).

## Síntomas observados

| Área | URL / acción | Síntoma UI | HTTP (consola) |
|------|----------------|------------|----------------|
| Anuncios admin | Publicar anuncio | OK parcial; **no hay CRUD de tipos de anuncio** | — |
| Perfiles admin | `/admin/perfiles` | Solo listado + enlace permisos; **sin alta/edición/acciones** | — |
| Encuestas | Ver resultados `/admin/encuestas/1/resultados` | Error interno | `GET /ENC/Encuestas/1/resultados` → **500** |
| Archivos | Listado y subir | Error interno / subida fallida | `GET/POST /ARC/Archivos` → **500** |
| Archivos UX | Dos entradas de menú | Archivos y Tipos de documento **separados**; deseado: **pestañas** como Visitas | — |
| Vehículos admin | Registrar vehículo | Error interno | `POST /USR/Automoviles/admin` → **500** |
| Mascotas admin | Alta padrón | Error interno | `POST /USR/Mascotas/admin` → **500** |
| Almacén admin | Nuevo artículo | Mensaje explícito esquema WMS | `POST /WMS/Articulos` → **400** (código negocio WMS) |

## Expectativa de negocio

1. Admin puede **mantener catálogos** (tipos de anuncio, tipos de documento integrados en pantalla archivos) con el mismo patrón que Visitas / Vehículos ([[FE-ADMIN-CAT-001]]).
2. Admin puede **CRUD de perfiles** (nombre, descripción, flag administrador) además de permisos de menú.
3. Módulos que hoy fallan en producción quedan **operativos** tras alinear BD + API + UI (sin workarounds manuales en consola).
4. Despliegue documentado y repetible (orden SQL + smoke API + smoke UI).

## Mockup

N/A — reutilizar patrón existente: pestañas de `AdminVisitasPage` (Registro | Tipos de ID) y panel lateral admin ([[FE-PAT-002]]).

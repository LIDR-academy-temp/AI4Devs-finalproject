[← index](_index.md) | [design →](design.md)

# spec.md — FE-CRUD-002: CRUD — Comunidad (admin)

## Pantallas

| Página | Ruta | Notas |
|--------|------|-------|
| AdminAnunciosPage | `/admin/anuncios` | Modal crear/editar OK; PAT + confirm |
| AdminEncuestasPage | `/admin/encuestas` | Publicar; editor preguntas si API lo permite |
| AdminJuntasPage | `/admin/juntas` | Acta/adjuntos según JNT API |
| AdminArchivosPage | `/admin/archivos` | Subida + tipos + delete |
| ResultadosEncuestaPage | `/admin/encuestas/:id/resultados` | Solo lectura; PAT visual |

## Patrón obligatorio

[PATRON_CRUD_ADMIN.md](../PATRON_CRUD_ADMIN.md) en listados admin; encuestas con editor complejo pueden combinar panel + rutas detalle.

## Must

DoD ENTREGA_MODULOS + stack Casas (`AdminListToolbar`, `AdminFilterableTable`, split panel, Zod/RHF).

## CA

- CA-1: Encuesta: flujo crear → publicar → ver resultados sin errores UI.
- CA-2: Archivos: subir PDF ≤5MB muestra error amigable si 413.

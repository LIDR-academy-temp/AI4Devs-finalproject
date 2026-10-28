[← index](_index.md) | [design →](design.md)

# spec.md — ARC-BE-028: Archivos API Cuarta

> **Tipo:** Feature · Fuente: [specs/archivos.md](../../specs/archivos.md) · readme · [ENTREGA_MODULOS](../ENTREGA_MODULOS.md)

## User story
Residente descarga documentos; Admin sube y gestiona (HU-ARC-01..02).

## Must
- `IFileStorage` local `App_Data/archivos` (delta); interface para swap blob.
- `GET /ARC/Archivos` — lista `arc.vsArchivos`; filtros tipo.
- `POST /ARC/Archivos` — Admin multipart: metadatos + `tipoArchivo` por nombre; INSERT `arc.Archivos`.
- `GET /ARC/Archivos/{id}/descargar` — stream + log `arc.LogVisualizacionArchivos`.
- `DELETE /ARC/Archivos/{id}` — soft delete Admin.
- Legacy → `*/legacy`.

## CA
- CA-1: Descarga registra log.
- CA-2: Residente no POST.
- CA-3: Archivo >5MB rechazado (413).

## Instancias

| Target | Impacto |
|--------|---------|
| backend / frontend según ticket | Ver design |

## Invariantes

Ver `specs/archivos.md` INV-x + INV-G1..G3 globales.

## Pasada adversarial

Veredicto: **APROBADO** para `/ejecutar` tras confirmar design (patrón Cuarta + legacy aislado).

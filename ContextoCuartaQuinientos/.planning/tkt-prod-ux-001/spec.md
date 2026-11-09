[← index](_index.md) | [design →](design.md)

# spec.md — PROD-UX-001: Cierre UX operación publicada

## User story

Como administrador en producción, quiero que pases QR, residentes y moras se comporten como el resto del admin y sin errores al guardar, para operar el fraccionamiento sin workarounds manuales en BD.

## Alcance (Must)

### Visitas — pases QR admin
- Tabla admin alineada a patrón `cq-admin-table`; estado **Vigente** visible (`badge bg-success`, no Bootstrap 4).
- Flujo: Nuevo → panel → compartir / editar / cancelar; una ocasión vs rango (`bUnaOcasion`).
- `POST …/{id}/usar`: marca uso + inserta bitácora `vts.Visitas` cuando corresponde.

### Usuarios — padrón
- Edición lateral: nombre, correo, teléfono, **perfil**, **vincular casa** (ocupante), estado activo (lectura + toggle en tabla).
- `PUT /SGR/Usuarios/{id}` con `ActualizarPerfilRequest` + admin extras (`perfil`, `casaId`) sin error de transacción.
- Dueño de **varias casas**: vincular casa en Residentes **añade** ocupante; varias propiedades como propietario siguen en **Casas**.

### Finanzas — morosos
- Tab morosos: columna moras, selección múltiple, aplicar/condonar moras en lote (`ConfirmDialog`).
- Endpoints moras batch operativos (sin 500 por transacción/SQL).

### Dashboard (documentación)
- KPI **Ocupación** = casas con `sgr.CasaOcupantes.Vigente = 1`; propietario solo en `sgr.Casas` no cuenta hasta ocupante vigente.

## Fuera de alcance

- Selector multi-casa en un solo formulario de residente.
- Cambiar fórmula de ocupación para incluir solo `PropietarioUsuarioID` (decisión explícita pendiente).

## Criterios de aceptación

- [x] **CA-1** Badge estado pase admin legible (Vigente verde).
- [x] **CA-2** PUT usuario con `casaId` responde 200 (no error Dapper transacción).
- [x] **CA-3** Formulario editar residente muestra perfil + casa + activo.
- [x] **CA-4** Morosos: checkboxes + aplicar/condonar lote con confirmación.
- [x] **CA-5** Documentación SDD: spec/design/impl/delta + inventario SQL + specs dominio.

## Dependencias

- [[FE-VTS-PASE-001]], [[FE-041]], [[FE-CRUD-001]], [[DASH-BE-014]]
- Scripts: `SQL/20261030_vts_visitas_una_ocasion.sql`, `SQL/20261029_fnz_cuotas_monto_mora.sql` (prod si faltan)

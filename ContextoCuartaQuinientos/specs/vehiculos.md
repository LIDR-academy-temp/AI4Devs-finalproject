# specs/vehiculos.md — Vehículos (source of truth SDD)
> Contexto de dominio SDD-Nice; se lee en /definir antes de spec.md. Solo lo verificado; lo nuevo (delta).

## Propósito
Padrón de **vehículos por usuario** para facilitar el control de acceso, con catálogos de marca y modelo y placas para validación. Consulta por placa por Admin/Vigilancia. **Vehículos vive en el esquema `usr` (`usr.Automoviles`)** — NO es el dominio `vts` (Visitas).

## Objetos del dominio (tablas + vistas reales)
Esquema `usr`:
- `usr.Automoviles` — vehículo del residente. Campos reales: `AutomovilID` (PK), `UsuarioID` (FK), `MarcaID` (FK), `ModeloID` (FK), `Placas`, `Color`. (NO `Anio`/`TipoVehiculo`/`ParkingSpot` — no existen en el esquema.)
- `usr.Marcas` — catálogo de marcas.
- `usr.Modelos` — catálogo de modelos.

Auditoría estándar + soft delete `bEliminado`.

Vista real:
- `usr.vsAutomoviles` — vehículos desnormalizados (marca, modelo, placas, color, usuario/casa).

## Catálogos y estados
- `usr.Marcas` — marcas de vehículo.
- `usr.Modelos` — modelos (ligados a marca `(asumido)`).
- No hay catálogo de estados: el vehículo está registrado o no.

## Invariantes (INV-x)
- **INV-1** Cada vehículo pertenece a un `UsuarioID` (FK).
- **INV-2** `MarcaID` y `ModeloID` deben existir en sus catálogos (FK).
- **INV-3** `Placas` únicas: al registrar placas ya existentes → error "Las placas ya están registradas."
- **INV-4** Búsqueda por placa: registrada → muestra usuario y casa asociados; no registrada → "Vehículo no registrado."
- **INV-5** Soft delete `bEliminado`; nunca borrado físico.

## Historias del dominio (HU-XXX [M/S/C] + 1 línea)
- **HU-VEH-01 [M]** — Registrar vehículo: el residente registra marca, modelo (catálogos), placas y color → asociado a su usuario (`usr.Automoviles`); placas duplicadas → error.
- **HU-VEH-02 [S]** — Consultar vehículos (Admin/Vigilancia): buscar por placa; registrada → usuario y casa; no registrada → "Vehículo no registrado."

## Endpoints (/{Dominio}/{Controller})
Controllers reales USR (`/{DOMINIO}/{Controller}`):
- `/USR/Automoviles` — CRUD de vehículos del residente.
- `/USR/Marcas` — catálogo de marcas.
- `/USR/Modelos` — catálogo de modelos.

Verbos concretos `(asumido)`: GET (mis vehículos/búsqueda por placa), POST (registrar), PUT/PATCH (editar), DELETE (soft).

## Reutilización / objetos existentes (escalera)
- **Reutiliza** la vista `usr.vsAutomoviles` para lectura (patrón Dapper + vistas, sin SPs).
- **Reutiliza** `sgr.Usuarios` (dueño) y `sgr.Casas` (unidad asociada, para control de acceso).
- **Reutiliza** catálogos `usr.Marcas`/`usr.Modelos`.
- **Reutilizado por** el bot: HU-BOT-09 permite operar vehículos por chat (mismo endpoint, misma autorización por perfil).
- Referencia frontend: `AutomovilesAdmin` (cobertura existente a reemplazar por React).

## Deltas del proyecto (nuevo)
- No hay deltas de esquema propios de Vehículos en el rediseño (el modelo `usr.Automoviles` + catálogos se conserva tal cual).
- Búsqueda por placa para Vigilancia se apoya en `usr.vsAutomoviles` (funcionalidad, no cambio de esquema).

## Notas
- Sin stored procedures.
- Corrección de dominio: Vehículos = esquema `usr` (`usr.Automoviles`), NO `vts` (Visitas). Alucinación del borrador viejo.
- Nombres reales del esquema español; soft delete `bEliminado`.

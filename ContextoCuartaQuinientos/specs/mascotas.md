# specs/mascotas.md — Mascotas (source of truth SDD)
> Contexto de dominio SDD-Nice; se lee en /definir antes de spec.md. Solo lo verificado; lo nuevo (delta).

## Propósito
Padrón de **mascotas por usuario** para cumplir el reglamento del fraccionamiento, con catálogos de tipo y raza. Consulta del padrón por Admin. **Mascotas vive en el esquema `usr`** (NO en `anm`, que es Anuncios). Delta del proyecto: control de vacunas.

## Objetos del dominio (tablas + vistas reales)
Esquema `usr`:
- `usr.Mascotas` — mascota del residente. Campos reales: `MascotaID` (PK), `UsuarioID` (FK), `Nombre`, `TipoMascotaID` (FK), `RazaMascotaID` (FK), `FechaNacimiento`. (NO `VacunasAlDia`/`Especie`/`Color` en el esquema de referencia — vacunas es delta.)
- `usr.TiposMascota` — catálogo de tipos de mascota.
- `usr.RazasMascota` — catálogo de razas.

Auditoría estándar + soft delete `bEliminado`.

Vista real:
- `usr.vsMascotas` — mascotas desnormalizadas (nombre, tipo, raza, usuario/casa).

## Catálogos y estados
- `usr.TiposMascota` — tipos (perro, gato, etc. `(asumido)`).
- `usr.RazasMascota` — razas.
- **(delta)** `usr.Mascotas.VacunasAlDia BIT` — estado de vacunación al día.

## Invariantes (INV-x)
- **INV-1** Cada mascota pertenece a un `UsuarioID` (FK) (residente registrado).
- **INV-2** `TipoMascotaID` y `RazaMascotaID` deben existir en sus catálogos (FK).
- **INV-3** El padrón Admin lista nombre, tipo, raza y usuario/casa (vía `usr.vsMascotas`).
- **INV-4 (delta)** El control de vacunas se apoya en `VacunasAlDia` + `FechaUltimaVacuna`; el bot puede recordar la renovación proactivamente.
- **INV-5** Soft delete `bEliminado`; nunca borrado físico.

## Historias del dominio (HU-XXX [M/S/C] + 1 línea)
- **HU-MAS-01 [M]** — Registrar mascota: el residente registra nombre, tipo y raza (catálogos) → queda asociada a su usuario (`usr.Mascotas`); soporta control de vacunas (delta).
- **HU-MAS-02 [S]** — Padrón de mascotas (Admin): consultar el padrón con nombre, tipo, raza y usuario/casa.

## Endpoints (/{Dominio}/{Controller})
Controllers reales USR (`/{DOMINIO}/{Controller}`):
- `/USR/Mascotas` — CRUD de mascotas del residente.
- `/USR/TiposMascota` — catálogo de tipos (GET; **POST/PUT/DELETE** admin [[FE-ADMIN-CAT-001]]).
- `/USR/RazasMascota` — catálogo de razas (GET; **POST/PUT/DELETE** admin [[FE-ADMIN-CAT-001]]).
- `/USR/Mascotas/admin`, `/USR/Mascotas/{id}/admin` — CRUD padrón admin ([[FE-ADMIN-CAT-001]]).

Verbos residente: GET (mis mascotas), POST (registrar), PUT (editar), DELETE (soft). Admin padrón y catálogos: ver rutas anteriores.

## Reutilización / objetos existentes (escalera)
- **Reutiliza** la vista `usr.vsMascotas` para lectura (patrón Dapper + vistas, sin SPs).
- **Reutiliza** `sgr.Usuarios` (dueño) y `sgr.Casas` (unidad asociada).
- **Reutiliza** catálogos `usr.TiposMascota`/`usr.RazasMascota`.
- **Reutilizado por** el bot: HU-BOT-09 permite operar mascotas por chat (mismo endpoint, misma autorización) y sugerencias proactivas de renovación de vacunas (worker sobre `usr.Mascotas`).
- Referencia frontend: `MascotasAdmin` (cobertura existente a reemplazar por React).

## Deltas del proyecto (nuevo)
- **`usr.Mascotas.VacunasAlDia BIT` (delta)** — vacunas al día.
- **`usr.Mascotas.FechaUltimaVacuna DATE` (delta)** — fecha de última vacuna; habilita recordatorio proactivo del bot.

## Notas
- Sin stored procedures.
- Corrección de dominio: Mascotas = esquema `usr`, NO `anm` (Anuncios). Alucinación del borrador viejo.
- Nombres reales del esquema español; soft delete `bEliminado`.
- SPA admin: `AdminMascotasPage` (`/admin/mascotas`) — padrón con `AdminFilterableTable` ([[FE-CRUD-003]]).

## Changelog

| Fecha | Requerimiento | Cambio |
|-------|---------------|--------|
| 2026-10-26 | [[FE-CRUD-003]] | UI admin padrón mascotas al patrón FE-PAT-002 |
| 2026-10-27 | [[FE-ADMIN-CAT-001]] | Pestañas Tipos/Razas + CRUD admin padrón y catálogos |

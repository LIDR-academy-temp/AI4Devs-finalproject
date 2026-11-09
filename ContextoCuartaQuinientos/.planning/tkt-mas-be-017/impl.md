# impl.md — tkt-mas-be-017 (MAS BE)

## Dominio y ubicación
Al igual que VEH, el módulo MAS vive dentro del dominio **USR**:
- Controller: `GraphApi/Controllers/USR/Mascotas/MascotasController.cs`
- Controller catálogo: `GraphApi/Controllers/USR/TiposMascota/TiposMascotaController.cs`
- Controller catálogo: `GraphApi/Controllers/USR/RazasMascota/RazasMascotaController.cs`
- Service: `GraphApi/Services/USR/CuartaMascotas/CuartaMascotasService.cs`
- Repository: `GraphApi/Repositories/USR/CuartaMascotasRepository.cs`
- Interface repo: `GraphApi/Repositories/USR/ICuartaMascotasRepository.cs`
- Interface svc: `GraphApi/Services/USR/CuartaMascotas/ICuartaMascotasService.cs`
- Tests: `GraphApi/GraphApi.Tests/CuartaMascotasServiceTests.cs`

---

## MascotasController

Ruta base: `USR/Mascotas`  
Inyecta: `ICuartaMascotasService` (Cuarta) + `IMascotasService` (legacy)

### Endpoints Cuarta

| Método | Ruta | Policy | Respuestas |
|--------|------|--------|------------|
| GET | `/USR/Mascotas` | JWT | 200 `List<MascotaListItemDto>` (propias) |
| GET | `/USR/Mascotas/padron` | `SoloAdministrador` | 200 `List<MascotaListItemDto>` (todas) |
| POST | `/USR/Mascotas` | JWT | 201 `{ mascotaId }` / 422 |
| PUT | `/USR/Mascotas/{id}` | JWT | 204 / 404 |
| DELETE | `/USR/Mascotas/{id}` | JWT | 204 / 404 |

Claims: `UserId` (NameIdentifier → int), `UserEmail` (Email ?? Name ?? "sistema").

### Endpoints Legacy (sin cambios)

| Método | Ruta |
|--------|------|
| GET | `/USR/Mascotas/legacy` |
| POST | `/USR/Mascotas/legacy` |
| PATCH | `/USR/Mascotas/legacy` |
| DELETE | `/USR/Mascotas/legacy/{id}` |

## TiposMascotaController

Ruta base: `USR/TiposMascota`. Inyecta `ICuartaMascotasService` + `ITiposMascotaService` (legacy).

| Método | Ruta | Respuesta |
|--------|------|-----------|
| GET | `/USR/TiposMascota` | 200 `List<TipoMascotaDto>` |
| GET/POST/PATCH/DELETE | `/USR/TiposMascota/legacy` | legacy |

## RazasMascotaController

Ruta base: `USR/RazasMascota`. Inyecta `ICuartaMascotasService` + `IRazasMascotaService` (legacy).

| Método | Ruta | Respuesta |
|--------|------|-----------|
| GET | `/USR/RazasMascota` | 200 `List<RazaMascotaDto>` |
| GET/POST/PATCH/DELETE | `/USR/RazasMascota/legacy` | legacy |

---

## CuartaMascotasService

| Método | Descripción | Errores |
|--------|-------------|---------|
| `ListarMisAsync(userId)` | Mascotas propias del usuario | — |
| `ListarPadronAsync()` | Padrón completo (admin) | — |
| `CrearAsync(req, correo, userId)` | Valida NombreMascota no vacío; inserta en tx; retorna id | 422 si NombreMascota vacío |
| `ActualizarAsync(mascotaId, req, correo, userId)` | Checa ownership (ExisteMascota); actualiza en tx | 404 si no existe/no es dueño |
| `EliminarAsync(mascotaId, correo, userId)` | Checa ownership; soft-delete en tx | 404 si no existe/no es dueño |
| `ListarTiposAsync()` | Catálogo tipos mascota | — |
| `ListarRazasAsync()` | Catálogo razas mascota | — |

Nota: Ownership se verifica con `ExisteMascotaAsync(mascotaId, usuarioId)` — combina ambos + bEliminado=0. A diferencia de VEH, no hay validación de duplicados (nombre libre).

---

## CuartaMascotasRepository

| Método | Tabla / SQL | Notas |
|--------|-------------|-------|
| `ListarMisAsync(userId)` | SELECT usr.Mascotas + JOINs sgr.Usuarios, TiposMascota, RazasMascota, Casas (NOLOCK) | WHERE UsuarioID + bEliminado=0, ORDER BY NombreMascota |
| `ListarPadronAsync()` | mismo SELECT sin filtro userId | ORDER BY NombreUsuario, NombreMascota |
| `ExisteMascotaAsync(mascotaId, userId)` | COUNT(1) WHERE MascotaID AND UsuarioID AND bEliminado=0 | sin tx |
| `InsertAsync(req, correo, userId, tx)` | INSERT + SCOPE_IDENTITY() | todos los campos opcionales incluidos |
| `ActualizarAsync(id, req, correo, tx)` | UPDATE COALESCE para todos los campos | rows>0 → bool |
| `SoftDeleteAsync(id, correo, tx)` | UPDATE bEliminado=1, Modificado, FechaModificacion | rows>0 → bool |
| `ListarTiposAsync()` | SELECT usr.TiposMascota ORDER BY TipoMascota | — |
| `ListarRazasAsync()` | SELECT usr.RazasMascota ORDER BY RazaMascota | incluye TipoMascotaID |

RazaMascota en el SELECT principal usa `COALESCE(M.RazaLibre, RM.RazaMascota)` — prioriza el campo libre sobre el catálogo.

---

## Pruebas unitarias (xUnit — 6 [Fact])

| Test | Escenario | Assert |
|------|-----------|--------|
| `Crear_NombreVacio_Devuelve422` | `NombreMascota = ""` | status=422, id=null |
| `Crear_Valido_Devuelve201YCommit` | Insert OK → id=99 | status=201, id=99, tx.Commit×1 |
| `Actualizar_NoEsDuenio_Devuelve404` | `ExisteMascota → false` | status=404 |
| `Actualizar_Valido_Devuelve204YCommit` | ExisteMascota=true, Actualizar OK | status=204, tx.Commit×1 |
| `Eliminar_NoEsDuenio_Devuelve404` | `ExisteMascota → false` | status=404 |
| `Eliminar_Valido_Devuelve204YCommit` | ExisteMascota=true, SoftDelete OK | status=204, tx.Commit×1 |

Helper `BuildService(out repoMock, out connMock)` — `IDbConnection.State = Closed` (a diferencia de VEH que usa `Open`).

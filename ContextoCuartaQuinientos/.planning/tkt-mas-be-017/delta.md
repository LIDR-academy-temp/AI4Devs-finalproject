# delta.md — tkt-mas-be-017 (MAS BE)

## Endpoints Cuarta entregados

| Método | Ruta | Auth | Código OK |
|--------|------|------|-----------|
| GET | `/USR/Mascotas` | JWT | 200 |
| GET | `/USR/Mascotas/padron` | SoloAdministrador | 200 |
| POST | `/USR/Mascotas` | JWT | 201 |
| PUT | `/USR/Mascotas/{id}` | JWT | 204 |
| DELETE | `/USR/Mascotas/{id}` | JWT | 204 |
| GET | `/USR/TiposMascota` | JWT | 200 |
| GET | `/USR/RazasMascota` | JWT | 200 |

## Operaciones SQL nuevas

| Operación | Tabla | Notas |
|-----------|-------|-------|
| SELECT (mis mascotas) | `usr.Mascotas` + joins | NOLOCK, WHERE UsuarioID + bEliminado=0 |
| SELECT (padrón) | `usr.Mascotas` + joins | NOLOCK, sin filtro usuario |
| SELECT COUNT (ownership) | `usr.Mascotas` | MascotaID + UsuarioID + bEliminado=0 |
| INSERT | `usr.Mascotas` | SCOPE_IDENTITY() |
| UPDATE (COALESCE) | `usr.Mascotas` | todos los campos opcionales |
| UPDATE (soft-delete) | `usr.Mascotas` | bEliminado=1 |
| SELECT catálogo | `usr.TiposMascota` | ORDER BY TipoMascota |
| SELECT catálogo | `usr.RazasMascota` | incluye TipoMascotaID, ORDER BY RazaMascota |

## Códigos de error de negocio

| Código | HTTP | Condición |
|--------|------|-----------|
| VALIDACION (inline detail) | 422 | NombreMascota vacío al crear |
| NOT_FOUND (inline detail) | 404 | Mascota no existe o no pertenece al usuario |

Nota: MAS no usa constantes tipadas como VEH (VEH_PLACAS_REQUERIDAS). Los errores se devuelven con `code` genérico + `detail` con mensaje descriptivo.

## Decisiones clave

- Dominio en **USR**: controllers, service y repository bajo `USR/` para cohesión con perfil de usuario.
- No hay validación de nombre duplicado (a diferencia de VEH con placas únicas) — un usuario puede tener dos mascotas con el mismo nombre.
- `COALESCE(M.RazaLibre, RM.RazaMascota)` en SELECT: permite razas libres sin romper la FK del catálogo.
- Los controllers de catálogo (TiposMascota, RazasMascota) delegan directamente al mismo `ICuartaMascotasService` — no tienen service propio Cuarta.
- Tres controllers Cuarta registrados en DI vía `ServiceCollectionExtensions`.

# APIs — FE-CRUD-003 Registro admin (vehículos)

Endpoints **nuevos** en `USR/Automoviles` para CRUD administrador. Auth: `Authorization: Bearer <JWT>` con claim administrador (`SoloAdministrador`).

Base: `{{VITE_API_URL}}` (ej. `http://localhost:5000`).

---

## 1. Vehículos — administración

| Verbo | Ruta | Uso |
|-------|------|-----|
| GET | `/USR/Automoviles/padron` | Listado completo para tabla admin |
| POST | `/USR/Automoviles/admin` | Alta para un `usuarioId` propietario |
| PUT | `/USR/Automoviles/{id}/admin` | Actualizar cualquier vehículo |
| DELETE | `/USR/Automoviles/{id}/admin` | Baja lógica |

### GET `/USR/Automoviles/padron`

Response `200` — array `AutomovilListItemDto`:

```json
[
  {
    "automovilId": 1,
    "usuarioId": 10,
    "nombreUsuario": "Ana López",
    "correoUsuario": "ana@example.com",
    "marcaId": 1,
    "marca": "Toyota",
    "modeloId": 2,
    "modelo": "Corolla",
    "modeloLibre": null,
    "placas": "ABC123",
    "color": "Blanco",
    "numeroCasa": "42"
  }
]
```

### POST `/USR/Automoviles/admin`

Body:

```json
{
  "usuarioId": 10,
  "placas": "XYZ789",
  "marcaId": 1,
  "modeloId": 2,
  "modeloLibre": null,
  "color": "Gris"
}
```

Response `201` — mismo shape que un ítem del listado.

Errores: `422` `VEH_USUARIO_INVALIDO` | `VEH_PLACAS_REQUERIDAS`; `409` `VEH_PLACAS_DUPLICADAS`.

### PUT `/USR/Automoviles/{id}/admin`

Body (campos opcionales salvo placas en práctica UI):

```json
{
  "placas": "XYZ788",
  "marcaId": 1,
  "modeloId": 2,
  "modeloLibre": null,
  "color": "Azul"
}
```

Response `204`. Errores: `404` `VEH_NOT_FOUND`; `409` placas duplicadas.

### DELETE `/USR/Automoviles/{id}/admin`

Response `204`. Error `404` `VEH_NOT_FOUND`.

---

## Sin cambio (referencia Front)

| Verbo | Ruta | Auth |
|-------|------|------|
| GET | `/USR/Automoviles/buscar?placas=` | AdminOGuardia |
| POST/PUT/DELETE | `/USR/Automoviles` … | Residente (propietario) |

Pruebas manuales: `FE-CRUD-003_api_tests.http`.

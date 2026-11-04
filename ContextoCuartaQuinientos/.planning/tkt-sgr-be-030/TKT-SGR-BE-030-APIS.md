# APIs — Navegación y permisos SGR (SGR-BE-030)

Backend REST para menú dinámico JWT y administración de menús/permisos. El front **no** consulta SQL; solo estos endpoints.

- **Base URL (local):** `http://localhost:5180`
- **Auth:** `Authorization: Bearer <JWT>` (`POST /SGR/AuthService/GenerateToken` con `{ "correo", "password" }`)
- **Claim relevante:** `perfil` (ej. `Administrador`, `Residente`) — el menú se resuelve contra `sgr.Perfiles` + `sgr.PerfilMenus`

---

## 1. Navegación (cualquier usuario autenticado)

### 1.1 Menú jerárquico del usuario → **GET**
`GET /SGR/Navegacion/menus`

Devuelve el árbol de menús visibles para el `perfil` del JWT (`bVisible=1`, no eliminados).

**Respuesta (capturada 2026-10-27, BD sin filas en `sgr.Menus` / `PerfilMenus`):**
```json
[]
```

Con datos, cada nodo:
```json
[
  {
    "menuId": 1,
    "titulo": "Inicio",
    "ruta": "/inicio",
    "icono": "home",
    "orden": 1,
    "hijos": []
  }
]
```

---

## 2. Admin — menús (`SoloAdministrador`, claim `perfil=Administrador`)

### 2.1 Listar menús → **GET**
`GET /SGR/Menus/admin` · query opcional: `incluirEliminados=false`

**Respuesta (capturada, BD vacía):**
```json
[]
```

### 2.2 Crear menú → **POST**
`POST /SGR/Menus/admin`

Body:
```json
{
  "titulo": "Tickets",
  "ruta": "/admin/tickets",
  "icono": "ticket",
  "orden": 10,
  "padreMenuId": null
}
```

**201** → objeto `MenuAdminListItemDto` (`menuId`, `titulo`, `ruta`, `icono`, `orden`, `padreMenuId`, `eliminado`).

### 2.3 Actualizar → **PUT**
`PUT /SGR/Menus/admin/{id}` — body parcial (`titulo`, `ruta`, `icono`, `orden`, `padreMenuId`).

### 2.4 Eliminar (soft) → **DELETE**
`DELETE /SGR/Menus/admin/{id}` → **204**

### 2.5 Permisos por menú (inverso a §4) → **GET / PUT** *(delta [[FE-ADMIN-UX-002]])*
`GET /SGR/Menus/admin/{menuId}/permisos-perfiles`

Lista todos los perfiles con flags `asignado` / `visible` para ese menú.

`PUT /SGR/Menus/admin/{menuId}/permisos-perfiles`

Body:
```json
{
  "perfiles": [
    { "perfilId": 2, "visible": true }
  ]
}
```

Solo perfiles en el array quedan asignados a ese menú; el resto se desasigna (soft delete en `sgr.PerfilMenus`).

Errores de negocio: `ProblemDetails` con extensión `code` (ej. `MENU_PADRE_INVALIDO`, `NOT_FOUND`).

---

## 3. Admin — perfiles (listado SPA)

### 3.0 Listar perfiles → **GET**
`GET /SGR/Perfiles/admin`

JWT `SoloAdministrador`. Evita legacy `GET /SGR/Perfiles` (`vsPerfiles` / columna `Perfil`).

**Respuesta (ejemplo):**
```json
[
  {
    "perfilId": 1,
    "nombre": "Administrador",
    "descripcion": null,
    "bAdministrador": true
  }
]
```

---

## 4. Admin — permisos menú por perfil

### 4.1 Consultar → **GET**
`GET /SGR/Perfiles/{perfilId}/permisos-menus`

**Respuesta (capturada, sin menús en BD):**
```json
[]
```

### 4.2 Sincronizar → **PUT**
`PUT /SGR/Perfiles/{perfilId}/permisos-menus`

Body:
```json
{
  "menus": [
    { "menuId": 1, "visible": true }
  ]
}
```

**422** + `code: MENU_NO_ENCONTRADO` si algún `menuId` no existe.

---

## 5. Resumen de endpoints

| # | Método | Ruta | Rol |
|---|--------|------|-----|
| 1 | GET | `/SGR/Navegacion/menus` | JWT |
| 2 | GET | `/SGR/Menus/admin` | Administrador |
| 3 | POST | `/SGR/Menus/admin` | Administrador |
| 4 | PUT | `/SGR/Menus/admin/{id}` | Administrador |
| 5 | DELETE | `/SGR/Menus/admin/{id}` | Administrador |
| 6 | GET | `/SGR/Perfiles/admin` | Administrador |
| 7 | GET | `/SGR/Perfiles/{id}/permisos-menus` | Administrador |
| 8 | PUT | `/SGR/Perfiles/{id}/permisos-menus` | Administrador |
| 9 | GET | `/SGR/Menus/admin/{id}/permisos-perfiles` | Administrador |
| 10 | PUT | `/SGR/Menus/admin/{id}/permisos-perfiles` | Administrador |

**Smoke:** `GET /SGR/Navegacion/menus` y `GET /SGR/Menus/admin` → **200**; residente `POST /SGR/Menus/admin` → **403** (2026-10-27).

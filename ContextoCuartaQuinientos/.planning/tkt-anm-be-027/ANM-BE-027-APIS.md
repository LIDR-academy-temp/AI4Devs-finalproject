# APIs — Anuncios y comunicados (`ANM`)

REST JWT para listar/publicar comunicados y registrar lectura. Sin headers legacy `UserID` / `WindowName`.

- **Base URL (local):** `http://localhost:5180`
- **Auth:** `Authorization: Bearer <JWT>` (`POST /SGR/AuthService/GenerateToken`)
- **Errores:** `ProblemDetails` con extension `code` (`TIPO_ANUNCIO_INVALIDO`, `NOT_FOUND`, `FORBIDDEN`, …)
- **Pruebas:** `ANM-BE-027_api_tests.http` (login corregido a `GenerateToken`)

---

## 1. Catálogo

### `GET /ANM/TiposAnuncio`

Lista tipos activos para selects admin. Cualquier usuario autenticado.

**Respuesta `200`** (ejemplo real CQ500, 2026-10-19):

```json
[
  { "tipoAnuncioId": 1, "tipoAnuncio": "General" },
  { "tipoAnuncioId": 3, "tipoAnuncio": "Mantenimiento" },
  { "tipoAnuncioId": 2, "tipoAnuncio": "Urgente" }
]
```

---

## 2. Anuncios (residente + admin)

### Variante A — CRUD + acción `visto`

| Verbo | Ruta | Rol | Uso |
|--------|------|-----|-----|
| GET | `/ANM/Anuncios` | JWT | Lista vigentes; `?incluirNoVigentes=true` solo admin |
| GET | `/ANM/Anuncios/{id}` | JWT | Detalle; residente solo vigentes |
| PATCH | `/ANM/Anuncios/{id}/visto` | JWT | Marca lectura (idempotente `204`) |
| POST | `/ANM/Anuncios` | Admin | Crear (`201` + cuerpo) |
| PUT | `/ANM/Anuncios/{id}` | Admin | Actualizar parcial (`200`) |
| DELETE | `/ANM/Anuncios/{id}` | Admin | Soft delete (`204`) |

**GET lista — item:**

```json
{
  "anuncioId": 1,
  "titulo": "Aviso",
  "contenido": "Texto",
  "fechaPublicacion": "2026-10-19T12:00:00Z",
  "vigenteHasta": null,
  "tipoAnuncio": "General",
  "visto": false
}
```

> `visto` es por usuario del JWT (`sub`).

**POST body:**

```json
{
  "titulo": "Prueba comunicado",
  "contenido": "Cuerpo del aviso",
  "tipoAnuncio": "General",
  "vigenteHasta": "2026-12-31T23:59:59Z"
}
```

**PUT parcial:** solo enviar propiedades a cambiar. Para **quitar** vigencia enviar `"vigenteHasta": null` explícito; si se omite la clave, la vigencia anterior se conserva.

**PATCH visto:** body `{}` o vacío → `204`.

**Errores frecuentes:**

| HTTP | `code` | Cuándo |
|------|--------|--------|
| 400 | `TIPO_ANUNCIO_INVALIDO` | `tipoAnuncio` no existe |
| 403 | — | Residente en POST/PUT/DELETE |
| 404 | `NOT_FOUND` | Anuncio no vigente o eliminado |

---

## 3. Legacy (no usar en FE)

| Verbo | Ruta |
|--------|------|
| GET/POST/PATCH/DELETE | `/ANM/Anuncios/legacy` … |

---

## Resumen endpoints (ticket)

| Método | Ruta | Tipo |
|--------|------|------|
| GET | `/ANM/TiposAnuncio` | NUEVO |
| GET | `/ANM/Anuncios` | NUEVO |
| GET | `/ANM/Anuncios/{id}` | NUEVO |
| PATCH | `/ANM/Anuncios/{id}/visto` | NUEVO |
| POST | `/ANM/Anuncios` | NUEVO |
| PUT | `/ANM/Anuncios/{id}` | NUEVO |
| DELETE | `/ANM/Anuncios/{id}` | NUEVO |

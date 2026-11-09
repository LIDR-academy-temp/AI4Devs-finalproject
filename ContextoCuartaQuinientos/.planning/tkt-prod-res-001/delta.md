# Delta: tkt-prod-res-001-fixes-residente-prod

> [← index](_index.md) | [← impl](impl.md)

Documentar qué comportamiento cambió respecto al estado anterior del sistema.

## Comportamiento agregado

- Sidebar residente: si el árbol SGR omite nodos del manifest (`visitas-pases`, etc.), la SPA **completa** ítems implementados bajo el grupo API correcto (`supplementApiNavWithManifest`).
- Script SQL idempotente para menú **Pases QR** (`/visitas/pases`) en `sgr.Menus` + `sgr.PerfilMenus` (Residente).
- Formulario residente pases: combo **Tipo ID** desde `GET /VTS/TiposIdentificacion` (no captura numérica cruda).

## Comportamiento modificado

- **(Antes)** Encuestas residente leían camelCase; URLs `/encuestas/undefined`; envío fallaba en «Texto libre»; resultados 500 por SQL.
- **(Después)** Normalización PascalCase/camelCase; `esPreguntaTextoLibre`; `GROUP BY` incluye `o.Orden` en agregación de opciones.

- **(Antes)** `POST /TKT/Tickets` 500 si no existe `tkt.CanalesTicket` o falla aviso admins.
- **(Después)** Canal opcional (`null`); notificación admins no revierte alta del ticket.

- **(Antes)** Menú visitas dependía solo de filas SGR en prod (a menudo ausentes).
- **(Después)** Web + SQL; documentado RefreshToken 401 en login sin cookie (sin cambio de código).

## Comportamiento eliminado

- (ninguno)

## Objetos SQL afectados

| Objeto | Tipo | Acción |
|--------|------|--------|
| sgr.Menus (ruta `/visitas/pases`) | Menú | Modificado/Creado (MERGE script) |
| sgr.PerfilMenus (Perfil Residente) | DML | Modificado/Creado (MERGE script) |

## Endpoints API afectados

| Endpoint | Verbo | Acción |
|----------|-------|--------|
| ENC/Encuestas/{id}/resultados | GET | Modificado (fix agregación) |
| TKT/Tickets | POST | Modificado (canal legacy-tolerante) |

## Para el reviewer

- **Qué se hizo**: Fixes prod residente (encuestas FE+API, tickets POST, nav visitas, combo Tipo ID) + retro-SDD.
- **Por qué**: Errores 404/500 y UX en portal publicado (`cuartaquinientosresidencial.runasp.net`).
- **Riesgo**: Medio — requiere deploy GraphApi + Web + SQL menú en prod; supplement Web mitiga menú parcialmente.
- **Qué probar**: Encuestas listado/envío/resultados; crear ticket; sidebar Pases QR; combo Tipo ID en `/visitas/pases`.
- **Rollback**: Revert deploy API/Web; script menú no borra datos (solo MERGE visible).

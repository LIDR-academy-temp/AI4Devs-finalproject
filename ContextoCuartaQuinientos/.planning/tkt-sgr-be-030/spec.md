[← index](_index.md) | [design →](design.md)

# spec.md — SGR-BE-030: API JWT para navegación y permisos

## 0. Entradas

- readme.md §3 (menú dinámico por perfil).
- Controllers legacy existentes: `SGR/Menus`, `Perfiles`, `PerfilMenus`, `PerfilMenuBotones` (headers `UserID`/`WindowName`).
- Patrón referencia Cuarta: `CasasController` + `JwtUserContext` + `SoloAdministrador`.

## 1. User story

**Como** SPA React autenticada con JWT,  
**quiero** obtener menús visibles y CRUD admin de menús/perfiles/permisos sin headers legacy,  
**para** alinear autorización con el resto del portal y con Web_diseño.

## 2. Must — Endpoints nuevos (prefijo `/SGR`, JWT)

| Método | Ruta | Uso |
|--------|------|-----|
| GET | `/SGR/Navegacion/menus` | Menú jerárquico del usuario autenticado (por `PerfilID` del JWT) |
| GET | `/SGR/Navegacion/botones?ruta=` | Botones permitidos para ruta (opcional fase 1) |
| GET/POST/PUT/DELETE | `/SGR/Menus/admin/*` o extensión Cuarta en `MenusController` | CRUD menús (solo admin) |
| GET/POST/PUT/DELETE | `/SGR/Perfiles/admin/*` | CRUD perfiles |
| GET/PUT | `/SGR/Perfiles/{id}/permisos-menus` | Asignar/quitar menús a perfil |
| GET/PUT | `/SGR/Perfiles/{id}/permisos-botones` | Asignar botones (fase 1.1 si no cabe) |

**Nota:** nombres finales en design; pueden consolidarse en un `NavegacionController` + servicios `ICuartaSgr*`.

## 3. CA

- CA-1: Residente con JWT solo recibe rutas de su `PerfilMenus` (no admin).
- CA-2: Admin recibe menús admin + operativos según seed/BD.
- CA-3: CRUD menú persiste en `sgr.Menus` con auditoría (`Creado`, `UsuarioCreacionID`, …).
- CA-4: Tests integración `GraphApi.Tests` happy + 403 no admin + 401 sin token.
- CA-5: Legacy endpoints **sin romper** (GraphQL/MVC antiguo).

## 4. Won’t

- Migrar GraphQL de menús a JWT en este ticket.
- Seed masivo de menús (script SQL separado `DB-006_sgr_menus_seed.sql` si hace falta — design).

## 5. Invariantes

- `sub` JWT = `UsuarioID`; perfil desde claim `perfil` / join `sgr.Perfiles`.
- Sin IDs de menú hardcodeados en C# de negocio.

**Veredicto adversarial:** APROBADO — acotar MVP a `GET Navegacion/menus` + CRUD Menus + PerfilMenus antes de botones.

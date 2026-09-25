# _graph.md — CuartaQuinientos (grafo maestro de conocimiento SDD)

> Grafo de dominios, entidades y relaciones del sistema. Lo lee SDD-Nice en `/definir`
> para detectar reutilización y dependencias antes de escribir `spec.md`. Verdad de tierra:
> esquema real en `/SQL` + extensiones del proyecto (marcadas **(delta)**). Sin stored
> procedures (Dapper + vistas `vs*` + servicios C#); soft delete `bEliminado`.

## Dominios (target SDD) → source of truth

| Dominio | Esquema | Target(s) | spec |
|---|---|---|---|
| Usuarios/Identidad | `sgr`, `usr` | database, backend, frontend | [[specs/usuarios]] |
| Tickets | `tkt` | database, backend, frontend | [[specs/tickets]] |
| Finanzas | `fnz` | database, backend, frontend | [[specs/finanzas]] |
| Encuestas | `enc` | database, backend, frontend | [[specs/encuestas]] |
| Juntas | `jnt` | database, backend, frontend | [[specs/juntas]] |
| Notificaciones | `ntf` | database, backend, integrations | [[specs/notificaciones]] |
| Visitas y Áreas Comunes | `vts` | database, backend, frontend | [[specs/visitas-areas]] |
| Mascotas | `usr` | database, backend, frontend | [[specs/mascotas]] |
| Vehículos | `usr` | database, backend, frontend | [[specs/vehiculos]] |
| Anuncios | `anm` | database, backend, frontend | [[specs/anuncios]] |
| Archivos | `arc` | database, backend, frontend | [[specs/archivos]] |
| Dashboard | vistas `vs*` | backend, frontend | [[specs/dashboard]] |
| Reportes / BI | vistas + `bi` (delta) | database, backend, frontend | [[specs/reportes-bi]] |
| Almacén (WMS) | `wms` (delta) | database, backend, frontend | [[specs/almacen]] |
| BOT «C500 Asiste» / IA | `bot`, `ia` (delta) | integrations, backend, database | [[specs/bot-ia]] |

## Entidad ancla

`sgr.Usuarios` (UsuarioID) es el ancla del sistema: casi todo cuelga de él.
La vivienda es `sgr.Casas` (+ **(delta)** `sgr.CasaOcupantes` para propietario/arrendatario).

## Relaciones clave (cross-dominio)

```
sgr.Condominios 1─N sgr.Casas 1─N sgr.CasaOcupantes N─1 sgr.Usuarios
sgr.Perfiles 1─N sgr.Usuarios            (perfiles DB-002: Administrador, Residente, Guardia, Trabajador)
sgr.Usuarios 1─N tkt.Tickets (Solicitante)   ; tkt.Tickets N─M sgr.Usuarios (TicketsUsuariosAsignados)
tkt.Tickets 1─N tkt.ComentariosTicket / tkt.DocumentosTicket ─→ arc.Archivos
tkt.Tickets N─1 tkt.EstadosTickets / PrioridadesTicket / (delta) CategoriasTicket / CanalesTicket
sgr.Casas 1─N fnz.Cuotas N─1 sgr.Usuarios ; fnz.Cuentas 1─N fnz.Transacciones
enc.Encuestas 1─N enc.Preguntas 1─N enc.OpcionesPregunta ; enc.Respuestas ─→ (Encuesta,Pregunta,Opcion,Usuario)
jnt.Juntas 1─N jnt.JuntaDetalle 1─N jnt.JuntaDetalleArchivos
ntf.Notificaciones N─1 ntf.TiposNotificacion ; (delta) ntf.NotificacionesEntrega (idempotencia)
vts.AreasComunes 1─N vts.ReservacionesArea N─1 sgr.Usuarios ; vts.Visitas ─→ (Casa,Usuario)
usr.Automoviles / usr.Mascotas N─1 sgr.Usuarios (+ catálogos Marcas/Modelos/TiposMascota/RazasMascota)
anm.Anuncios / arc.Archivos con bitácora de visualización
```

## Capa transversal (delta del proyecto)

- **BOT/IA** (`bot.*`, `ia.*`): vincula `sgr.Usuarios` ↔ Telegram, orquesta TODOS los dominios por perfil (paridad web↔bot), RAG sobre `ia.Fragmentos` (reglamento + ayuda de uso), sugerencias proactivas (`bot.Sugerencias`). Reutiliza los endpoints de dominio (no duplica lógica).
- **BI** (`bi.KpiSnapshots`): tendencias sobre las vistas `vs*` de todos los dominios.
- **Notificador saliente** + **worker de sugerencias**: backend → Telegram, idempotente (`ntf.NotificacionesEntrega`).

## Invariantes globales

- INV-G1: soft delete con `bEliminado`; toda consulta activa filtra `bEliminado = 0`.
- INV-G2: acceso a datos solo con Dapper parametrizado sobre tablas/vistas; **sin stored procedures**.
- INV-G3: autorización por perfil (`sgr.Perfiles` + menús `sgr.Menus*`); el bot respeta el mismo perfil que la web.
- INV-G4: el asistente IA nunca inventa — si la confianza es baja, escala (ticket/humano).
- INV-G5: diseño API-first (REST `/{Dominio}/{Controller}` + GraphQL `/graphql`): un solo backend para web, bot y futuros clientes.

## Requerimientos activos (planning)

| Fase | Hub | Tickets |
|------|-----|---------|
| Entrega 2 — Fase 1 (LISTO PARA EJECUTAR, 2026-09-24) | [.planning/FASE1_ROADMAP.md](.planning/FASE1_ROADMAP.md) | SETUP-000, DB-000/001/002, USR-BE-007/008/009/036, FE-030, NTF-BE-013, TKT-BE-001/002/015/016, FE-031/038, FNZ-BE-010/011/012/037, FE-032/039, DASH-BE-014, FE-040 |


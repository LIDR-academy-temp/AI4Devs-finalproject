[← spec](spec.md)

# Matriz módulo → navegación (objetivo NAV-ROOT-001)

Leyenda **Estado actual:** OK = en menú API+seed alineado; **GAP** = ruta o menú falta; **N/A** = no aplica web (canal aparte).

| # | Módulo readme | Ruta(s) web objetivo | Perfil(es) | Grupo sidebar | Estado actual | Fase |
|---|---------------|----------------------|------------|---------------|---------------|------|
| 1 | USR | `/`, `/perfil`, `/admin/usuarios`, `/admin/casas`, `/admin/perfiles`, `/admin/menus` | Todos / Admin | Principal, Mi cuenta, Gestión | OK admin; GAP Guardia/Trabajador seed | A, C |
| 2 | TKT | `/tickets`, `/admin/tickets`, `/admin/tickets/catalogos`, `/trabajador/tickets` | Res / Adm / Trb | Registros, Gestión | GAP catálogos, trabajador | A–C |
| 3 | FNZ | `/finanzas/cuenta`, `/admin/finanzas` | Res / Adm | Mi cuenta, Gestión | OK | — |
| 4 | ANM | `/anuncios`, `/admin/anuncios` | Res / Adm | Comunidad | OK | — |
| 5 | VTS | `/visitas/pases`, `/guardia/validar-pase`, `/admin/visitas`, `/areas-comunes`, `/admin/areas-reservas` | Res / Gu / Adm | Comunidad, Registro, Principal | GAP pases seed, admin reservas | A, B, D |
| 6 | ENC | `/encuestas`, `/admin/encuestas` | Res / Adm | Comunidad | OK | — |
| 7 | JNT | `/juntas`, `/admin/juntas` | Res / Adm | Comunidad | OK | — |
| 8 | NTF | campana + `/notificaciones`, `/admin/notificaciones/aviso` | Todos / Adm | Mi cuenta, Gestión | GAP página + aviso admin | B, G |
| 9 | Dashboard | `/` (KPIs) + opcional `/admin/dashboard` | Adm / Res | Principal | OK implícito Inicio; GAP ítem explícito opcional | G |
| 10 | ARC | `/archivos`, `/admin/archivos`, `/admin/archivos/tipos` | Res / Adm | Comunidad | OK | — |
| 11 | RPT | `/admin/reportes` | Adm | Gestión | GAP UI | E |
| 12 | VEH | `/mis-vehiculos`, `/admin/vehiculos` | Res / Adm | Registros | OK | — |
| 13 | MAS | `/mis-mascotas`, `/admin/mascotas` | Res / Adm | Registros | OK | — |
| 14 | WMS | `/admin/almacen` | Adm | Registro | OK | — |
| 15 | BOT | `/admin/integraciones/bot` (estado + guía; no reemplaza Telegram) | Adm | Gestión | GAP | F |

**Integraciones (canal Telegram):** menú conversacional del bot no es sidebar web; la fase F cubre **paridad documentada** + pantalla admin de integración.

[← index](_index.md) | [design →](design.md)

# spec.md — DB-002: Catálogos y administrador inicial

> Generado por: **generador de contexto SDD**
> Consumido por: implementador (`desarrollador-sql`, `tester-sql`, `auditor-sql`)
> **Tipo:** Feature (datos de referencia)

## User story

Como desarrollador, quiero catálogos y un administrador inicial cargados de forma idempotente, para que login, tickets y finanzas resuelvan estados/prioridades/tipos **por nombre** sin hardcodear IDs.

## Contexto / problema

**Documentos de entrada**

| Tipo | Fuente |
|---|---|
| Requerimiento | [readme.md](../../../README.md) §6 Ticket 35, §5.0 (HU-USR-01, HU-TKT-01, HU-FNZ-02) |
| Técnico | [specs/base-datos.md](../../specs/base-datos.md), DB-001 (esquema alineado) |
| Mockup | N/A |

**Comportamiento actual:** tras DB-000/001 las tablas de catálogo existen vacías; sin admin no hay login real.

**Comportamiento esperado:** `SQL/DB-002_seeds_catalogos.sql` con `MERGE` idempotente + variables `sqlcmd` para admin; modo demo opcional `-v Demo=1`.

## Alcance (MoSCoW)

### Must
- `MERGE` idempotente: perfiles, estados/prioridades/categorías/canales ticket, tipos notificación, tipos movimiento + cuenta mantenimiento, condominio + admin (`$(AdminCorreo)`, `$(AdminPasswordHash)` obligatorios).
- Perfiles: Administrador (`bAdministrador=1`), Residente, Guardia, Trabajador.
- Prioridades con `Orden` 1–4 alineado a DB-001.
- Admin con `bActualizarPassword = 1`.
- Segunda ejecución: 0 filas insertadas nuevas (conteo o `MERGE` sin cambios).
- Suite `SQL/pruebas/DB-002_PruebasIntegracion.sql`.

### Should
- Modo `Demo=1`: 10 casas, 6 residentes, 1 trabajador, cuotas 3 meses `@example.com`.
- Falla explícita si faltan variables admin.

### Could
- ninguno

### Won't
- DDL / renombres (DB-001).
- Datos personales reales en repo.
- Endpoints API.

## Instancias en scope

| Target:Instancia | Impacto |
|---|---|
| `database:CuartaQuinientos` | `SQL/DB-002_seeds_catalogos.sql`, pruebas |

## Invariantes

| # | Regla | Fuente |
|---|---|---|
| INV-1 | Catálogos resueltos por nombre en código, no IDs mágicos | readme §2.5 |
| INV-2 | Script base (DB-000) sin datos; datos de referencia solo aquí | `specs/base-datos.md` INV-3 |
| INV-3 | Idempotencia de seeds | INV-2 base-datos |
| INV-4 | Contraseña admin como hash BCrypt en variable, nunca texto en script | USR specs |
| INV-5 | Perfiles válidos para JWT `perfil` | Ticket 35 |

## Criterios de aceptación

- [ ] **CA-1 [M]**: variables obligatorias — **Dado** ejecución sin `AdminCorreo`/`AdminPasswordHash` **Cuando** corre el script **Entonces** falla con mensaje claro antes de DML.
- [ ] **CA-2 [M]**: perfiles — **Entonces** existen 4 perfiles con nombres esperados y un solo `bAdministrador=1`.
- [ ] **CA-3 [M]**: catálogos TKT — **Entonces** estados (Nuevo, En seguimiento, Resuelto, Cerrado), prioridades con Orden, categorías y canales WEB/TELEGRAM presentes.
- [ ] **CA-4 [M]**: ntf/fnz — **Entonces** tipos notificación listados en Ticket 35 y tipos movimiento + cuenta "Cuenta de mantenimiento".
- [ ] **CA-5 [M]**: admin — **Entonces** usuario admin con perfil Administrador, `bActualizarPassword=1`, hash = variable.
- [ ] **CA-6 [M]**: idempotencia — **Dado** segunda ejecución **Entonces** conteos de filas por catálogo no aumentan.
- [ ] **CA-7 [S]**: Demo=1 — **Dado** `-v Demo=1` **Entonces** crea datos ficticios `@example.com` sin duplicar en re-run.
- [ ] **CA-R1 [M]**: regresión INV-1 — **Dado** código futuro **Cuando** busca estado "Nuevo" **Entonces** existe fila en `tkt.EstadosTickets` (verificado en suite por nombre).

## Reutilización detectada

- `MERGE` nativo T-SQL — peldaño 2.
- Orden de despliegue readme §1.4 — DB-000 → DB-001 → DB-002.
- Plantilla `pruebas.sql`.

## Definition of Ready

- [x] Bloqueado por DB-001 aceptado
- [x] CA completos

## Riesgos

| Riesgo | Severidad | Mitigación |
|---|---|---|
| Hash BCrypt mal formado en variable | Media | Validar longitud/prefijo en suite smoke |
| Demo contamina prod | Alta | Solo con flag Demo=1 |

## Quick Checks

- [x] Sin INSERT de credenciales reales
- [x] MCP pendiente en design

[← index](_index.md) | [design →](design.md)

# spec.md — FE-038: Frontend: gestión de tickets (Admin)

> Generado por: **generador de contexto SDD**
> Consumido por: implementador (`implementer.tool` = cursor — `git-frontend`, `desarrollador-react`, `frontend-tester`, `auditor-codigo`)
> **Tipo:** Feature

## User story

Como Administrador, quiero listar tickets con filtros, cambiar estado según la máquina §3.2 y asignar trabajadores, para atender incidencias (HU-TKT-03).

## Contexto / problema

TKT-BE-016 expone `GET /TKT/Tickets`, `PATCH …/estado/{estadoId}`, `POST /TKT/TicketsUsuariosAsignados`. readme §6 Ticket 38: tabla paginada, transiciones válidas, selector Trabajador, toast en `422`. REST vía `Web/src/shared/lib/apiClient.ts` (FE-030). Fuentes: [specs/tickets.md](../../specs/tickets.md), TKT-BE-016, TKT-BE-015 (catálogos).

## Alcance (MoSCoW)

### Must
- Ruta admin `(asumido)` `/admin/tickets` bajo `PrivateRoute` + rol Administrador.
- Tabla paginada: `GET /TKT/Tickets?estadoTicketId=&prioridadTicketId=&pagina=&tamano=` (TKT-BE-016).
- Filtros estado/prioridad/categoría usando catálogos TKT-BE-015 donde aplique.
- Detalle o fila expandible: botones de transición solo a estados destino válidos (tabla §3.2); `PATCH` correspondiente.
- `422 INVALID_TRANSITION` → toast con mensaje del API.
- Selector trabajador → `POST /TKT/TicketsUsuariosAsignados`; lista desde `GET /SGR/Usuarios/trabajadores` (USR-BE-009, CA-9) Admin-only `[{ usuarioId, nombre }]`.
- `EstadoTicketBadge` WCAG (color + texto); estados vacío / carga / error.
- Tests componente: tabla (datos, vacío, error) y cambio de estado (éxito + 422).

### Should
- Filtro por categoría si el listado backend lo soporta; si no, solo UI local `(asumido)` omitido.

### Could
- ninguno

### Won't
- Comentarios HU-TKT-04; adjuntos; GraphQL.

## Instancias en scope

| Target:Instancia | Impacto |
|---|---|
| `frontend:cuartaquinientos-web` | feature `admin/tickets`, hooks REST, componentes tabla/detalle |

## Invariantes

| # | Regla | Fuente |
|---|---|---|
| INV-1 | Solo transiciones §3.2 | `specs/tickets.md` INV-10 |
| INV-2 | Sin lógica de negocio en cliente (solo muestra botones permitidos según estado actual + rol) | regla React proyecto |
| INV-3 | Token vía `apiClient` | FE-030 |

## Criterios de aceptación

- [ ] **CA-1 [M]**: **Dado** Admin autenticado **Cuando** abre `/admin/tickets` **Entonces** tabla con datos de `GET /TKT/Tickets`
- [ ] **CA-2 [M]**: **Dado** ticket en Nuevo **Cuando** UI renderiza acciones **Entonces** solo "En seguimiento" visible (admin)
- [ ] **CA-3 [M]**: **Dado** transición inválida forzada **Cuando** API `422` **Entonces** toast y estado UI sin cambio optimista
- [ ] **CA-4 [M]**: **Dado** selector trabajador **Cuando** confirma **Entonces** POST asignación y refresco
- [ ] **CA-5 [M]**: **Dado** lista vacía **Entonces** empty state; **Dado** error red **Entonces** mensaje + reintentar
- [ ] **CA-R1 [M]**: **Dado** badge **Entonces** contraste WCAG AA mínimo `(asumido)` test a11y básico

## Reutilización detectada

- `apiClient`, `PrivateRoute`, `EstadoTicketBadge` (FE-031) → reuso.
- Endpoints TKT-BE-016/015 → peldaño 3.

## Definition of Ready

- [x] INVEST; endpoint trabajadores cerrado en USR-BE-009 (CA-9).

## Riesgos

| Riesgo | Severidad | Mitigación |
|---|---|---|
| FE-038 antes de USR-BE-009 | Media | Respetar orden FASE1: fila 8 (USR-BE-009) antes de fila 15 (FE-038) |
| Transiciones hardcodeadas incorrectas | Media | Matriz copiada de readme §3.2 en constante tipada |

## Preguntas abiertas

- Endpoint lista Trabajadores → **respondida**: `GET /SGR/Usuarios/trabajadores` en USR-BE-009 (CA-9); FE-038 depende de USR-BE-009 desplegado antes o en la misma iteración.

## Quick Checks

- [x] Completos.

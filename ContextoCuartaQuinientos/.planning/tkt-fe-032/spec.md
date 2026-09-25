[← index](_index.md) | [design →](design.md)

# spec.md — FE-032: Frontend — estado de cuenta y cuotas

> Generado por: **generador de contexto SDD**
> Consumido por: implementador (`implementer.tool` = cursor — agentes `desarrollador-react`, `frontend-tester`, `auditor-codigo`)
> **Tipo:** Feature

## User story

Como Residente, quiero ver en el portal mi historial de cuotas con las vencidas destacadas y los totales adeudados, para conocer mi situación con el fraccionamiento (HU-FNZ-01, readme §5).

## Contexto / problema

- **Actual:** no hay pantalla de estado de cuenta; el residente no puede consultar sus cuotas (readme §1.1).
- **Esperado (readme §6 Ticket 32):** pantalla "Mi estado de cuenta" con tabla período / monto / vencimiento / estado, filas vencidas destacadas, totales adeudados, empty state y responsive básico (Tailwind). Consume `GET /FNZ/Cuotas/mis` de [[FNZ-BE-010]] (`{ cuotas: [...], totalPendiente, totalVencido }`, `esVencida: true` en vencidas).
- **Mockup:** wireframes conceptuales de readme §1.3 (Portal Residente → "Estado de cuenta"; sidebar Residente: Inicio · Mis tickets · Estado de cuenta …); estados con **color + etiqueta** (WCAG 2.1 AA). No hay mockup de alta fidelidad en Entrega 1 `(asumido: layout tabla + tarjetas de totales)`.
- **Investigación:** [specs/finanzas.md](../../specs/finanzas.md) (INV-3, estado derivado en backend). Sesión (`AuthProvider`), el cliente REST tipado `Web/src/shared/lib/apiClient.ts` y `PrivateRoute` los provee [[FE-030]]. Stack acordado: React 18 + Vite + Apollo Client (`sdd.config.yaml`: estado remoto = Apollo `InMemoryCache`), sin TanStack Query; estructura `src/features/<dominio>/`, tipos en `src/shared/types/`.

## Alcance (MoSCoW)

### Must — sin esto el requerimiento no cierra
- Página `EstadoCuentaPage` protegida (Residente autenticado) que consume `GET /FNZ/Cuotas/mis` vía `finanzas.api.ts` (sobre `apiClient` de FE-030) + hook `useEstadoCuenta`.
- Tabla con columnas período, monto, vencimiento, estado (etiqueta textual + color).
- Filas con `esVencida: true` destacadas visualmente y con etiqueta "Vencida".
- Totales `totalPendiente` y `totalVencido` mostrados tal como llegan del API (sin recalcular).
- Estados carga / error / vacío ("No tienes cuotas registradas." `(asumido: texto)`) / éxito.
- Responsive básico con Tailwind.
- `tsc --noEmit` y `vite build` sin errores.

### Should — esperado; negociable vía escalación al usuario si tiempo/riesgo aprieta
- Entrada "Estado de cuenta" en el sidebar del Residente (readme §1.3) enlazando a la ruta `/finanzas/cuenta` `(asumido: ruta)`.
- Tests de componente Vitest + Testing Library de los 4 estados y del resaltado.
- Montos formateados en MXN y período como "septiembre 2026" (`Intl`, `es-MX`).

### Could — solo si sale gratis durante la implementación; jamás bloquea
- Ninguno.

### Won't — fuera de alcance explícito
- Descarga PDF del estado de cuenta (HU-FNZ-05 `[C]`).
- Pago en línea / botón pagar (Non-goals FNZ Fase 1).
- Vista de Admin de cuotas de otro residente y registro de pagos (FE-039).
- Filtros, orden o paginación del lado cliente (no pedidos en Ticket 32).
- Cálculo de estado o de totales en el cliente.

## Instancias en scope

| Target:Instancia | Impacto |
|---|---|
| `frontend:cuartaquinientos-web` | Nueva feature `src/features/finanzas/` (api, hook, página, tabla), tipos `src/shared/types/finanzas.ts`, ruta protegida y entrada de menú |

## Invariantes — reglas existentes que DEBEN sobrevivir al cambio

| # | Regla existente que NO se toca | Fuente |
|---|---|---|
| INV-1 | Una cuota es Vencida si `Pagado = 0` y `FechaVencimiento < hoy`; el cálculo vive en el backend (FNZ-BE-010) y la UI usa `estado`/`esVencida` tal cual (finanzas INV-3) | `specs/finanzas.md` · readme §6 Ticket 10 |
| INV-2 | Flujo `API → UI`: sin lógica de negocio en el frontend (no recalcular estado ni totales) | `.cursor/rules/14_tech_react.mdc` · readme §5 DoD frontend |
| INV-3 | Identidad del JWT: la pantalla del residente llama `/mis` y nunca envía `usuarioId` | `CLAUDE.md` · readme §6 Ticket 10 |
| INV-4 | Estados de cuota con color + etiqueta (nunca solo color), WCAG 2.1 AA | readme §1.3 |

## Criterios de aceptación

- [ ] **CA-1 [M]**: tabla de cuotas — **Dado** un Residente autenticado y `GET /FNZ/Cuotas/mis` que devuelve 3 cuotas (Pagada, Pendiente, Vencida) **Cuando** abre `EstadoCuentaPage` **Entonces** `CuotasTable` muestra 3 filas con período, monto, vencimiento y la etiqueta de estado recibida.
- [ ] **CA-2 [M]**: vencidas destacadas — **Dado** una cuota con `esVencida: true` **Cuando** se renderiza `CuotasTable` **Entonces** esa fila tiene el estilo de alerta y el texto "Vencida"; las filas con `esVencida: false` no tienen ese estilo.
- [ ] **CA-3 [M]**: totales del API — **Dado** una respuesta con `totalPendiente: 1200` y `totalVencido: 2400` **Cuando** se renderiza la página **Entonces** se muestran "$1,200.00" y "$2,400.00" (MXN) sin recalcular a partir de las filas.
- [ ] **CA-4 [M]**: empty state — **Dado** `{ cuotas: [], totalPendiente: 0, totalVencido: 0 }` **Cuando** se renderiza la página **Entonces** se muestra el mensaje de estado vacío y no la tabla.
- [ ] **CA-5 [M]**: carga y error — **Dado** la petición en curso **Cuando** se renderiza **Entonces** se ve el indicador de carga; **Dado** que el API responde `500` o falla la red **Cuando** se renderiza **Entonces** se ve un mensaje de error con opción de reintentar `(asumido)`.
- [ ] **CA-6 [M]**: solo `/mis` — **Dado** cualquier render de `EstadoCuentaPage` **Cuando** `finanzas.api.ts` llama al backend **Entonces** la URL es exactamente `/FNZ/Cuotas/mis` sin query `usuarioId`.
- [ ] **CA-7 [M]**: ruta protegida — **Dado** un usuario sin sesión **Cuando** navega a `/finanzas/cuenta` **Entonces** `PrivateRoute` (FE-030) lo redirige a `/login`.
- [ ] **CA-8 [M]**: build limpio — **Dado** la feature implementada **Cuando** se ejecutan `tsc --noEmit` y `vite build` **Entonces** ambos terminan con 0 errores.
- [ ] **CA-9 [S]**: responsive — **Dado** un viewport de 375 px **Cuando** se muestra la tabla **Entonces** no hay desbordamiento horizontal de la página (la tabla hace scroll interno o se apila) `(asumido)`.
- [ ] **CA-R1 [M]**: regresión de INV-1/INV-2 — **Dado** una cuota con `FechaVencimiento` en el pasado pero `esVencida: false` y `estado: "Pagada"` en la respuesta **Cuando** se renderiza **Entonces** la UI la muestra como "Pagada" sin resaltar (la UI no recalcula con la fecha del navegador).
- [ ] **CA-R2 [M]**: regresión de INV-4 — **Dado** cada estado (Pagada, Pendiente, Vencida) **Cuando** se renderiza **Entonces** cada fila expone el texto del estado accesible a lector de pantalla además del color.

## Reutilización detectada (evidencia de la escalera — regla 6)

- `Web/src/shared/lib/apiClient.ts` (`fetch` + `Authorization` con token en memoria + reintento único con `RefreshToken` ante `401`), `AuthProvider` y `PrivateRoute` de [[FE-030]] → se reutilizan; no se crea cliente HTTP nuevo ni se agrega TanStack Query.
- Componentes base del sistema de diseño (tabla, badge de estado, estado vacío) en `src/shared/ui/` → reutilizar si existen tras FE-030/FE-031; si no, crear en `src/features/finanzas/` (regla de ubicación del profile).
- `Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' })` e `Intl.DateTimeFormat('es-MX')` (nativos) → formato sin librería.
- TanStack Table → evaluado y descartado: tabla sin filtros/orden/paginación (listas simples: HTML nativo).
- Clasificación en el cliente → descartada (INV-1, INV-2).

## Definition of Ready

- [x] **I**ndependent — depende de FE-030 y FNZ-BE-010 (readme §6 Ticket 32); documentado en `_index.md`
- [x] **N**egotiable — Should ajustables vía escalación
- [x] **V**aluable — el residente ve su estado de cuenta
- [x] **E**stimable — 5 h (readme §6 Ticket 32)
- [x] **S**mall — una página, una tabla, un hook
- [x] **T**estable — cada Must tiene CA en Given/When/Then

- [x] Todos los Must tienen criterio de aceptación verificable en Given/When/Then
- [x] Ningún Must depende de un dato/objeto no confirmado por MCP ni declarado aquí (contrato declarado en FNZ-BE-010)
- [x] Cada Must cabe en una sesión de implementador
- [x] Instancias en scope identificadas (`target:instancia`)
- [x] Sin preguntas abiertas que afecten un Must (abiertas con supuesto adoptado)
- [x] Sin dependencias con requerimientos no archivados (o documentadas y aceptadas)
- [x] Reutilización evaluada (peldaños 2-3 de la escalera) antes de proponer crear
- [x] Toda cita a otro TKT/objeto se releyó una vez más antes de cerrar

## Riesgos

| Riesgo | Severidad | Mitigación |
|---|---|---|
| Sin caché de cliente para el REST: cada visita a la página repite `GET /FNZ/Cuotas/mis` | Baja | Una sola lectura ligera por visita; aceptable en Fase 1 sin librería nueva |
| Contrato de FNZ-BE-010 cambia (nombres de campos) | Media | Tipos en `src/shared/types/finanzas.ts` derivados del design de FNZ-BE-010; test con fixture del payload |
| Fechas `date`/`datetime` del API mostradas con desfase de zona en el navegador | Media | Formatear la fecha como día calendario (sin conversión a hora local) `(asumido)` |
| Resaltado solo por color incumple WCAG | Baja | CA-R2: etiqueta textual obligatoria |

## Preguntas abiertas

- Ruta de la pantalla → **pendiente; supuesto: `/finanzas/cuenta`** (design previo; el readme no la fija) `(asumido)`.
- Librería de datos remotos para REST → **respondida**: ninguna; `apiClient` de FE-030 + hook React; Apollo solo para GraphQL (stack acordado, `sdd.config.yaml`).
- Texto del empty state → **pendiente; supuesto: "No tienes cuotas registradas."** `(asumido)`.
- Error con reintento → **pendiente; supuesto: botón "Reintentar" que llama `refetch`** `(asumido)`.
- Layout móvil de la tabla → **pendiente; supuesto: scroll horizontal interno** `(asumido)`.

## Quick Checks — antes del handoff al implementador

- [x] Todo CA nombra el actor real (SP/controller/endpoint exacto) — sin "el sistema hace X"
- [x] Todo CA tiene criterio medible en Given/When/Then — sin adjetivos vagos
- [x] Reutilización evaluada (peldaños 2-3 escalera) antes de proponer crear
- [x] Ningún Must depende de objeto no confirmado por MCP o declarado explícitamente
- [x] Contexto/problema: actor real nombrado en la causa raíz — sin falsa agencia
- [x] Instancias en scope identificadas para cada Must (`target:instancia`)
- [x] Definition of Ready completa — ningún ítem con `(asumido)` sin notarlo en Preguntas abiertas

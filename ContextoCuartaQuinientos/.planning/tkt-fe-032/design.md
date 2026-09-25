[← index](_index.md) | [← spec](spec.md)

# design.md — FE-032: Frontend — estado de cuenta y cuotas

> Generado por: **generador de contexto SDD** tras validar spec.md
> Consumido por: implementador (`implementer.tool` = cursor — `desarrollador-react`, `frontend-tester`, `auditor-codigo`)

## Estrategia técnica

Feature `src/features/finanzas/` con: `finanzas.api.ts` (`getEstadoCuenta()` → cliente REST tipado `Web/src/shared/lib/apiClient.ts` de FE-030 sobre `GET /FNZ/Cuotas/mis`; adjunta el access token en memoria y reintenta una vez con `RefreshToken` ante `401`), hook `useEstadoCuenta()` (`useState`/`useEffect` de React; expone `{ data, loading, error, refetch }`), `EstadoCuentaPage.tsx` (orquesta estados carga / error / vacío / éxito y muestra totales) y `CuotasTable.tsx` (tabla HTML nativa con Tailwind; resalta filas con `esVencida`). La UI es presentación pura: `estado`, `esVencida`, `totalPendiente` y `totalVencido` se pintan tal como vienen del API (INV-1, INV-2). Ruta protegida `/finanzas/cuenta` `(asumido)` bajo `PrivateRoute` (SETUP-000, extendido por FE-030) + entrada "Estado de cuenta" del sidebar Residente. Stack acordado: React 18 + Vite + Apollo Client (`sdd.config.yaml`: estado remoto = Apollo `InMemoryCache`); GraphQL con Apollo, REST con `apiClient` (mismo patrón que FE-031 `useMisTickets`).

Alternativas descartadas:
- **Recalcular vencida con `new Date()` del navegador** — viola INV-1/INV-2 y difiere de la zona `America/Mexico_City` del backend.
- **Apollo Client para este REST (`apollo-link-rest`)** — dependencia extra para una sola lectura REST que `apiClient` ya cubre.
- **TanStack Query** — fuera del stack acordado (`sdd.config.yaml`, readme §2.2); una lectura sin caché compartida no justifica la dependencia (peldaño 1, YAGNI).
- **TanStack Table** — sin filtros/orden/paginación; HTML nativo para listas simples.
- **Guardar cuotas en un store global** — el estado del servidor vive en el hook de la página; nada lo comparte.

### Escalera de decisión (methodology.md regla 6) — recorrer ANTES de las tablas de objetos

| Capacidad pedida | Peldaño (1-5) | Objeto resultante | Por qué se descartaron los anteriores |
|---|---|---|---|
| Llamada autenticada al API | 3 (reuso) | `Web/src/shared/lib/apiClient.ts` (FE-030) | 1: Must; 2: `fetch` nativo ya envuelto por FE-030 |
| Protección de ruta y redirección a `/login` | 3 (reuso) | `PrivateRoute` (SETUP-000/FE-030) | 1: Must |
| Formato de moneda y período | 2 (nativo) | `Intl.NumberFormat` / `Intl.DateTimeFormat` (`es-MX`) | 1: Should |
| Estado remoto (carga/error/datos) | 2 (nativo) | `useState`/`useEffect` de React en `useEstadoCuenta` | 1: Must (CA-5); sin librería de caché (TanStack Query fuera del stack) |
| Badge de estado / estado vacío | 3 (reuso) si existen en `src/shared/ui/`; si no 5 (nuevo, en `src/features/finanzas/`) | `StatusBadge` / `EmptyState` | 4: no hay componente previo que modificar |
| Tipos del contrato | 5 (nuevo) | `src/shared/types/finanzas.ts` (`EstadoCuenta`, `CuotaEstado`) | 3: no existen tipos FNZ |
| Función API del dominio | 5 (nuevo) | `src/features/finanzas/finanzas.api.ts` | 3: primer feature FNZ en el frontend |
| Hook de datos | 5 (nuevo) | `src/features/finanzas/useEstadoCuenta.ts` | 3: no existe hook de cuotas |
| Pantalla y tabla | 5 (nuevo) | `EstadoCuentaPage.tsx`, `CuotasTable.tsx` | 3-4: no hay vista de cuotas que extender |

## frontend:cuartaquinientos-web

| Componente/Vista | Acción | Contrato API que consume |
|---|---|---|
| `src/shared/types/finanzas.ts` | crear | `EstadoCuenta { cuotas: CuotaEstado[]; totalPendiente: number; totalVencido: number }`, `CuotaEstado { cuotaId; periodoInicio; periodoFin; monto; fechaVencimiento; estado: 'Pagada' \| 'Pendiente' \| 'Vencida'; esVencida: boolean; … }` (FNZ-BE-010) |
| `src/features/finanzas/finanzas.api.ts` | crear | vía `apiClient`: `GET /FNZ/Cuotas/mis` → `EstadoCuenta` |
| `src/features/finanzas/useEstadoCuenta.ts` | crear | llama `getEstadoCuenta()` al montar; `{ data, loading, error, refetch }` |
| `src/features/finanzas/EstadoCuentaPage.tsx` | crear | estados loading · error (con `refetch`) · vacío · éxito; tarjetas `totalPendiente` / `totalVencido` |
| `src/features/finanzas/CuotasTable.tsx` | crear | filas `CuotaEstado`; `cn('…', esVencida && 'bg-red-50 …')` + etiqueta textual |
| Router (`src/app/`) + sidebar Residente | modificar | ruta `/finanzas/cuenta` `(asumido)` bajo `PrivateRoute` |

Estados de UI obligatorios: loading (spinner/skeleton) · error (mensaje + "Reintentar") · vacío (mensaje sin tabla) · éxito (totales + tabla). Sin formulario → sin esquema Zod.

## Orden de implementación

| # | Paso | Target:Instancia | Entregable | Dependencia | Verificación |
|---|------|-------------------|------------|-------------|--------------|
| 1 | Confirmar contrato de `GET /FNZ/Cuotas/mis` contra el design/swagger de FNZ-BE-010 | `frontend:cuartaquinientos-web` | payload de ejemplo (fixture) | FNZ-BE-010 | N/A (revisión de contrato) |
| 2 | Tipos `src/shared/types/finanzas.ts` | `frontend:cuartaquinientos-web` | tipos sin `any` | 1 | `tsc --noEmit` |
| 3 | `finanzas.api.ts` + `useEstadoCuenta` | `frontend:cuartaquinientos-web` | función y hook tipados | 2, FE-030 (`apiClient`) | `tsc --noEmit` |
| 4 | Tests Vitest en rojo de `CuotasTable` y `EstadoCuentaPage` (4 estados, resaltado, totales) | `frontend:cuartaquinientos-web` | tests (`frontend-tester`) | 3 | tests en rojo |
| 5 | `CuotasTable` + `EstadoCuentaPage` | `frontend:cuartaquinientos-web` | componentes | 4 | tests del paso 4 en verde |
| 6 | Ruta `/finanzas/cuenta` + entrada de sidebar | `frontend:cuartaquinientos-web` | navegación | 5, FE-030 (`PrivateRoute`) | navegación manual |
| 7 | Build | `frontend:cuartaquinientos-web` | build limpio | 6 | `node_modules\.bin\tsc --noEmit` + `node_modules\.bin\vite build --mode development` |
| 8 | Prueba contra backend real o mock (DoD frontend readme §5) | `frontend:cuartaquinientos-web` | evidencia en `impl.md` | 7 | captura con datos reales/mock |

## Plan de pruebas

| Prueba | Target | Tipo | Cubre CA |
|---|---|---|---|
| `TC-1` tabla con 3 estados | cuartaquinientos-web | componente (Vitest + Testing Library) | CA-1 |
| `TC-2` fila vencida con estilo de alerta; no vencida sin estilo | cuartaquinientos-web | componente | CA-2 |
| `TC-3` totales formateados en MXN iguales al payload | cuartaquinientos-web | componente | CA-3 |
| `TC-4` empty state | cuartaquinientos-web | componente | CA-4 |
| `TC-5` loading y error con reintento | cuartaquinientos-web | componente | CA-5 |
| `TC-6` `getEstadoCuenta` llama `/FNZ/Cuotas/mis` sin `usuarioId` (mock de `apiClient`) | cuartaquinientos-web | unitario | CA-6 |
| `TC-7` sin sesión → `/login` | cuartaquinientos-web | E2E Playwright (Entrega Final) | CA-7 |
| `TC-8` `tsc --noEmit` + `vite build` | cuartaquinientos-web | build | CA-8 |
| `TC-INV-1` fecha pasada con `esVencida: false`/`Pagada` → sin resaltar | cuartaquinientos-web | regresión | CA-R1 (INV-1) |
| `TC-INV-2` totales no se recalculan: payload con totales ≠ suma de filas se muestra tal cual | cuartaquinientos-web | regresión | CA-3 (INV-2) |
| `TC-INV-3` ninguna llamada con `usuarioId` | cuartaquinientos-web | regresión | CA-6 (INV-3) |
| `TC-INV-4` cada fila expone su etiqueta (`getByText('Vencida')`, `'Pendiente'`, `'Pagada'`) | cuartaquinientos-web | regresión (a11y) | CA-R2 (INV-4) |
| `TC-ERR-1` API `500` → mensaje de error, sin tabla | cuartaquinientos-web | negativo | CA-5 |
| `TC-ERR-2` payload con `cuotas: []` y totales 0 → sin excepción de render | cuartaquinientos-web | negativo | CA-4 |
| `TC-RB` revert del PR: ruta y entrada de menú desaparecen; build limpio | cuartaquinientos-web | rollback | estrategia de rollback |

### Ratio de pruebas (Testing Trophy)

- Integración (componente con `useEstadoCuenta` real y `apiClient` mockeado): ~70 %
- Unitario: ~20 % (`finanzas.api.ts`, formateadores)
- E2E: ~10 % (ruta protegida, Entrega Final)
- Mocks: solo la frontera HTTP (`apiClient`)

### Triangulación

| Comportamiento | Dataset A | Dataset B | Qué generaliza |
|---|---|---|---|
| Resaltado de vencidas | 1 cuota vencida | 12 cuotas con 5 vencidas intercaladas | que el resaltado depende de `esVencida` por fila, no de la posición |
| Totales | `totalVencido: 0` | `totalVencido: 12450.5` | que el formato MXN no quedó hardcodeado |

## Estrategia de rollback

- Solo frontend: revertir el PR `feature/FE-032-estado-cuenta` (elimina `src/features/finanzas/`, tipos, ruta y entrada de menú). Sin impacto en backend ni BD.

## Decisiones técnicas (auditoría)

| # | Decisión | Justificación |
|---|---|---|
| 1 | REST vía `apiClient` (FE-030) + hook React, sin TanStack Query | Stack acordado React 18 + Vite + Apollo Client (`sdd.config.yaml`); mismo patrón que FE-031; Apollo reservado a GraphQL |
| 2 | Tabla HTML nativa | Sin interacción → sin TanStack Table (peldaño 2) |
| 3 | Pintar `estado`/`esVencida`/totales del API sin recalcular | INV-1, INV-2 (API → UI) |
| 4 | Feature nueva `src/features/finanzas/` | Peldaño 5: primer feature FNZ en web; FE-039 podrá reutilizar tipos/api (entonces mover a `shared/` si 2+ features los usan) |
| 5 | Ruta `/finanzas/cuenta` | `(asumido)` — heredado del design previo; en Preguntas abiertas |

## Autoverificación antes del handoff

**Consistencia con spec.md:**
- [x] Ningún objeto/tabla de este design.md implementa algo listado como `Won't` en spec.md (sin PDF, sin pago, sin vista Admin, sin filtros)
- [x] Cada fila de "Plan de pruebas" `TC-INV-x` corresponde a un invariante real de spec.md (INV-1..INV-4)

**Calidad del artefacto:**
- [x] Toda query/comando SQL verificado con MCP — no aplica (ticket sin SQL)
- [x] Orden de implementación: cada paso tiene Entregable + Dependencia explícita
- [x] Sin falsa agencia: cada paso nombra el actor real (`EstadoCuentaPage`, `useEstadoCuenta`, agente `frontend-tester`)
- [x] Toda query/comando propuesto verificado antes de escribirlo — contrato tomado de FNZ-BE-010 (paso 1 lo reconfirma)
- [x] Cada comportamiento nuevo tiene ≥ 2 datasets en la tabla de Triangulación

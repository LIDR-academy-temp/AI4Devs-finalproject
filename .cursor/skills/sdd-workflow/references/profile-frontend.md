# Profile: frontend — React + Vite

## Stack

| Capa | Tecnología |
|------|-----------|
| Bundler | Vite |
| UI | React + TypeScript |
| Estilos | Tailwind CSS |
| Estado cliente | Zustand |
| Datos remotos | TanStack Query |
| Tablas | TanStack Table |
| Formularios | React Hook Form + Zod |
| Unit testing | Vitest + Testing Library |
| E2E | Playwright |

## Arquitectura feature-based

```
src/
├── features/<dominio>/     ← lógica + UI por feature (hooks, store, api, componentes)
│   ├── <dominio>.api.ts    ← llamadas HTTP del dominio
│   ├── <dominio>.store.ts  ← Zustand store del dominio (si aplica)
│   └── <Componente>.tsx    ← vistas/componentes del dominio
├── shared/
│   ├── api/                ← configuración axios/fetch base
│   ├── lib/                ← hooks compartidos entre features
│   ├── types/              ← tipos de API por dominio (auth.ts, area.ts, …)
│   └── ui/                 ← componentes UI reutilizables (Button, Modal, DataTable…)
└── app/                    ← providers, router raíz
```

**Regla de ubicación:**
- Hook o componente usado por un solo feature → `src/features/<dominio>/`
- Hook o componente usado por 2+ features → `src/shared/lib/` o `src/shared/ui/`

## Convenciones

- **Estado servidor**: TanStack Query exclusivamente; nunca duplicar en Zustand.
- **Estado UI global**: Zustand (sesión, tema, preferencias de usuario).
- **Estado local efímero**: `useState`.
- **Formularios**: React Hook Form + esquema Zod. Sin validación manual ad-hoc.
- **Tablas con interacción**: TanStack Table. Listas simples: HTML nativo.
- **Tipado**: `any` prohibido; tipos de API en `src/shared/types/<dominio>.ts`.
- **Estilos**: Tailwind utility-first; clases condicionales vía `clsx`/`cn`.

## Qué debe especificar design.md para este target

- Componentes/vistas a crear o modificar (ruta de archivo).
- Contratos con backend: endpoint, método, payload, respuesta tipada.
- Estados de UI obligatorios por componente: loading · error · vacío · éxito.
- Esquema Zod si el componente tiene formulario.
- Peldaño de escalera de decisión por componente: 3 reuso / 4 modif / 5 nuevo.
- Plan de pruebas: qué cubre Vitest (lógica/componente) y qué cubre Playwright (flujo completo).

## Verificación antes de entregar

```bash
tsc --noEmit     # cero errores de tipos — obligatorio
vite build       # cero errores de bundling — obligatorio
```

## Reutilización

- Buscar en `src/shared/ui/` antes de crear un componente nuevo.
- Si una query/hook existe en otro feature, extraer a `src/shared/lib/`.
- Tipos de API: verificar `src/shared/types/<dominio>.ts` antes de definir interfaces nuevas.

## Pitfalls comunes (React + Vite)

- **Estado servidor en Zustand:** el estado del backend siempre va en TanStack Query. Zustand es solo para estado UI global (sesión, tema, preferencias).
- **`any` en tipos de API:** prohibido. Si el endpoint no tiene tipo, crearlo en `src/shared/types/<dominio>.ts` antes de usarlo.
- **Validación manual sin Zod:** todo formulario usa React Hook Form + esquema Zod. Sin validación ad-hoc.
- **Componente en `shared/` que solo usa un feature:** regla de ubicación — si lo usa un solo feature, va en `src/features/<dominio>/`. A `shared/` solo si lo usan 2+ features.
- **`tsc --noEmit` con errores al hacer handoff:** cero errores de tipos es obligatorio antes de entregar. No cumple Definition of Done.
- **Llamada HTTP directa sin pasar por `<dominio>.api.ts`:** toda llamada al backend pasa por el archivo `.api.ts` del feature — no fetch/axios directo en el componente.

## Build order default (React + Vite)

| # | Paso | Entregable | Dependencia |
|---|------|-----------|-------------|
| 1 | Confirmar contrato del endpoint backend (verbo, ruta, payload, respuesta) | Tipo de respuesta definido | Backend listo |
| 2 | Crear/actualizar tipo en `src/shared/types/<dominio>.ts` | Tipo TypeScript sin `any` | 1 |
| 3 | Crear/actualizar función en `src/features/<dominio>/<dominio>.api.ts` | Función tipada que llama al endpoint | 2 |
| 4 | Crear/actualizar Zustand store si hay estado UI global (`<dominio>.store.ts`) | Store con acciones tipadas | — |
| 5 | Crear/modificar componente(s) en `src/features/<dominio>/` | Componente con estados loading/error/vacío/éxito | 3–4 |
| 6 | Crear/actualizar esquema Zod si hay formulario | Schema Zod alineado con tipo del paso 2 | 2 |
| 7 | Correr `tsc --noEmit` + `vite build` — cero errores | Build limpio | 5 |
| 8 | Ejecutar tests Vitest + Playwright para el flujo cubierto | Tests en verde | 5 |

## Learnings (acumulado)

<!-- tools.compound_loop agrega aquí -->


## Decisiones (ADR)

<!-- tools.compound_loop agrega aquí -->


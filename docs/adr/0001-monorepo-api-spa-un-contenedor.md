# ADR-0001: Monorepo con API AdonisJS y SPA React en un solo contenedor

- **Estado:** aceptada
- **Fecha:** 2026-11-04

## Contexto

El MVP necesita backend, frontend y base de datos conectados (requisito del curso), con unas 30 horas de desarrollo. El stack del curso es AdonisJS v7, PostgreSQL con Lucid, React 19, Vite, Tuyau y Railway. AdonisJS v7 es estable desde febrero de 2026, requiere Node.js 24 y ofrece kits de inicio (Hypermedia, API, React con Inertia y Vue).

## Decisión

- Monorepo con pnpm workspaces y dos aplicaciones: `apps/api` (AdonisJS v7, kit API) y `apps/web` (React 19 + Vite).
- La SPA consume la API REST con un cliente tipado generado por Tuyau.
- En producción, un solo contenedor: la API sirve los estáticos compilados de la SPA desde el mismo origen, con `index.html` como respaldo para las rutas que no empiezan con `/api/`.
- Autenticación por cookie de sesión de AdonisJS, posible porque SPA y API comparten origen.

## Alternativas consideradas

| Alternativa | Motivo para descartarla |
| --- | --- |
| Monolito AdonisJS + Inertia React (kit React) | Menos configuración, pero acopla la interfaz al servidor y no deja una API REST reutilizable. |
| API y SPA en dos despliegues separados | Requiere CORS, cookies entre dominios o tokens, y dos servicios en Railway. |

## Consecuencias

- Positivas: frontera clara entre interfaz y API; API reutilizable para clientes futuros; sin CORS; un solo servicio que operar.
- Negativas: API y SPA se despliegan y escalan juntas; el Dockerfile multi-etapa es algo más complejo.
- Pendiente: confirmar en el walking skeleton cómo se integra Tuyau con una SPA separada en AdonisJS v7.

## Historial de cambios

- 2026-11-04: plan B para Tuyau (hallazgo AA2 de `docs/architecture-review.md`). Si Tuyau no se integra con la SPA separada en AdonisJS v7 durante T-01, se usa un cliente `fetch` tipado a mano con los tipos de las respuestas compartidos desde `apps/api`. La decisión no cambia. Los despliegues de la imagen se definen en ADR-0007.

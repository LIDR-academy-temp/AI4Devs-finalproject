# Referencia — Frontend web (React 18)

> Guía de convenciones para el portal web en Entrega 2. Contrato oficial: `readme.md` §1.3 (diseño y wireframes), §2.2 y §2.3 (estructura).
> Proyecto: `cuartaquinientos-web/` (se crea en Entrega 2).

## Stack

| Pieza | Uso |
|-------|-----|
| React 18 + TypeScript | SPA |
| Vite | Build y dev server (`http://localhost:5173`) |
| Apollo Client 3 | GraphQL contra `/graphql` |
| Fetch/REST | Endpoints `/{Dominio}/{Controller}` (`readme.md` §4) |
| Tailwind CSS | Sistema de diseño (tokens en `tailwind.config.js`) |
| React Router | Rutas públicas y privadas (`PrivateRoute`) |

Variables de entorno: plantilla en `scaffolds/web/.env.example` (`VITE_GRAPHQL_URL`, `VITE_API_URL`).

## Estructura (feature-based)

```
src/
├── apollo/client.ts        # uri, header Authorization: Bearer <JWT>, cache
├── shared/                 # componentes base, hooks, tipos
├── features/<dominio>/     # auth, dashboard, tickets, finanzas, …
└── router/PrivateRoute.tsx # redirige a /login sin JWT válido
```

## Autenticación

1. Login contra `POST /SGR/AuthService/GenerateToken` (ticket FE-030).
2. El JWT se guarda en el contexto de auth y se envía como `Authorization: Bearer` en REST y GraphQL.
3. Claims (`perfil`, `bAdministrador`) deciden menú y vistas: Residente vs Administrador.
4. Sin cookies de sesión.

## Pantallas del núcleo (Fase 1)

| Pantalla | Ticket | Historia |
|----------|--------|----------|
| Login y sesión | FE-030 — [../.planning/tkt-fe-030/_index.md](../.planning/tkt-fe-030/_index.md) | HU-USR-01 |
| Mis tickets (listar y crear) | FE-031 — [../.planning/tkt-fe-031/_index.md](../.planning/tkt-fe-031/_index.md) | HU-TKT-01..02 |
| Estado de cuenta | FE-032 — [../.planning/tkt-fe-032/_index.md](../.planning/tkt-fe-032/_index.md) | HU-FNZ-01 |

## Reglas de UI

- Referencia visual y skills: [ui-referencia-visual.md](ui-referencia-visual.md).
- Estados **vacío / carga / error** en cada vista con datos (Definition of Done, `readme.md` §5).
- Estados de ticket y cuota con **color + etiqueta** (WCAG 2.1 AA), foco visible, tema claro/oscuro.
- DTOs TypeScript con los mismos nombres de campo que el contrato §4 (`usuarioID`, `tituloTicket`, …).

## Documentación relacionada

- API: [api-backend.md](api-backend.md)
- Modelo de datos: [sql-esquema.md](sql-esquema.md)

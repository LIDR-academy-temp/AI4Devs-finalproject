---
description: Frontend standards for the Bccr.Supen.Ves.UI SPA within the VES architecture
globs: ["VES/Bccr.Supen.Ves.UI/Codigo/src/**/*.{js,jsx}", "VES/Bccr.Supen.Ves.UI/Codigo/package.json"]
alwaysApply: false
---

# VES Frontend Standards

## Scope and Actual Architecture

> **C/U/R/A document control:** unique normative rules remain here; repeated example blocks are preserved in full in [frontend-examples.md](./frontend-examples.md). Statements marked V still require verification against the source code, theme, environments, and contracts. Prototype documentation MUST NOT be treated as evidence of the current implementation.

This document applies to the `Bccr.Supen.Ves.UI` web interface, not to the APIs or data-access layers. The solution's request flow is:

```text
Navegador (UI React) → Bccr.Supen.Ves.Api → Bccr.Supen.Ves.Mapi → BW → DA → SQL Server
```

- The UI communicates over HTTP/HTTPS exclusively with `Bccr.Supen.Ves.Api`; it MUST NOT call MAPI directly or access SQL Server.
- When reviewing or changing a contract consumed by the UI, consult the [DTO/contract catalog](./data-model.md) and the effective API contracts; DO NOT treat the tables in `SCHEMA.md` as React component models.
- The VES API orchestrates requests through its `SI.SG` and communicates with MAPI. The `MAPI → BW → DA` layers belong exclusively to the MAPI project.
- The UI is a SPA written primarily in JavaScript and JSX. It does not use TypeScript, React Bootstrap, Cypress, Jest, or an internationalization (i18n) layer. These technologies MUST NOT be imposed, nor should code be converted merely to accommodate them.
- The three-component architecture is documented in [base-standards.md](./base-standards.md). The UI's specific structure and commands are documented in the [UI README](../VES/Bccr.Supen.Ves.UI/README.md), `VES/Bccr.Supen.Ves.UI/AGENT.md` (outside this package), [UI Deployment Guide](../VES/Bccr.Supen.Ves.UI/Documentacion/Deploy.md), [UI SPEC](../VES/Bccr.Supen.Ves.UI/SPEC.md), and [UI Development Guide](../VES/Bccr.Supen.Ves.UI/Documentacion/DEVELOPMENT.md).

For visual design, consult the specialized documentation without assuming the prototype replaces the active theme (see V verification items):
  [Usability](../VES/Bccr.Supen.Ves.UI/Documentacion/USABILIDAD.md),
  `Prototipo-UI/data-load-design-system.html` (resource present in the repository),
  [Visual Handoff](../VES/Bccr.Supen.Ves.UI/Prototipo-UI/DESIGN-HANDOFF.md),
  [Design System](../VES/Bccr.Supen.Ves.UI/Prototipo-UI/DESIGN-SYSTEM.md),
  `Prototipo-UI/DESIGN-MANIFEST.json` (resource present in the repository).

Useful practices from the preceding version are retained: functional components and hooks, appropriate local state, loading and error states, form validation, accessibility, behavior-focused tests, measurement-driven optimization, and incremental changes. The examples and tools are adapted to the current VES application.

## Technology Stack and Structure

Consult `Codigo/package.json` and `Codigo/.nvmrc` for exact versions. The current stack includes:

- React 19 and React Router DOM 6.
- JavaScript/JSX, Vite, and Node.js 24.x.
- Material UI v7 (including MUI X Data Grid and Date Pickers) and Bootstrap 5.
- Axios, Vitest, jsdom, and React Testing Library.
- Day.js and ExcelJS.

Main structure under `Codigo/src/`:

| Path | Responsibility |
|---|---|
| `STI/` | Screens for the Information Transfer System module |
| `SEC/` | Screens for the Custody Entity Service module |
| `componentes/` | Reusable application components |
| `estilos/` | VES theme, light/dark mode support, tokens, and icons |
| `infraestructura/` | HTTP client, session, authentication, and cross-cutting utilities |
| `rutas/` | Route protection and navigation decisions |
| `Constantes.js` | API URLs and constants |
| `ConstantesGaudi.js` | GAUDI/OpenID configuration |
| `App.jsx`, `Dashboard.jsx` | Main application composition and navigation |

Place React screens within their respective modules, or under `componentes/` when reusable. Use `.jsx` for files containing JSX and `.js` for logic modules without JSX, consistent with the current Vite configuration. DO NOT reorganize folders or mass-rename file extensions as part of unrelated feature work.

### Technology Equivalences (Active Standard)

Adapting best practices to the VES stack **does not authorize changes to the technology stack**: React 19 + JavaScript/JSX, Vite, React Router DOM 6, MUI v7 alongside existing Bootstrap, and Vitest + React Testing Library. DO NOT impose TypeScript, Create React App, Cypress, Jest, or i18n. Preserve the language of business-domain code, contracts, scripts, and project configuration.

The original comparison matrix is preserved in full in [frontend-examples.md — transformation](./frontend-examples.md#ejemplo-01).

## Coding Conventions

- Preserve JavaScript/JSX and established patterns. DO NOT require TypeScript for new components.
- Follow existing Spanish-language naming and comment conventions: `PascalCase` for components and `camelCase` for variables and functions, while respecting module-specific conventions. Existing exported constants may use names such as `LAS_RUTAS_EXTERNAS`.
- Use functional components and hooks for new code. Destructure props when this improves clarity, and provide default values only when the required behavior is defined.
- Preserve public API names, configuration keys, and existing contracts; DO NOT rename them solely for stylistic reasons.
- Prefer small components with clear responsibilities. Extract a shared hook or utility when stateful logic is genuinely reusable, without introducing premature abstractions.
- DO NOT add dependencies or replace existing libraries without justified need and team approval.

Example component following current conventions:

```jsx
import Button from '@mui/material/Button';

export default function BotonConsultar({ estaCargando, alConsultar }) {
    return (
        <Button
            type="button"
            disabled={estaCargando}
            onClick={alConsultar}
        >
            {estaCargando ? 'Consultando...' : 'Consultar'}
        </Button>
    );
}
```

### Naming Conventions — Normative Summary

| Element | VES rule |
|---|---|
| React components and JSX files | `PascalCase`, `.jsx` extension |
| Variables, functions, event handlers, utilities | `camelCase` and descriptive names |
| Hooks | `use` prefix and verifiable behavior |
| Booleans | Affirmative names describing state or conditions |
| Constants | Preserve the module's conventions and existing public exports |
| Custom CSS | `kebab-case`; prefer theme tokens/MUI where applicable |
| Props | Explicit; destructure when it improves readability |
| Language | Preserve Spanish domain terminology and external contract names without renaming |

Examples and exceptions are retained in [frontend-examples.md — conventions](./frontend-examples.md#ejemplo-02).

### Naming Verification

Apply the **final checklist** in this document rather than maintaining two divergent naming checklists. The legacy checklist is preserved in [the appendix](./frontend-examples.md#ejemplo-03).

## Components, Theme, and Styling

### Component and Composition Rules

- Create functional components using hooks; DO NOT convert existing classes without a requirement.
- Split views when it improves readability, testability, or reuse; avoid speculative components.
- Share hooks only where there is actual common logic; keep state close to its consumers.
- Access the API through `infraestructura/httpCliente.js` where applicable; DO NOT introduce separate Axios clients or hardcoded URLs for convenience.
- For new styling, prioritize MUI v7 and `estilos/temaVes.js`, retaining existing Bootstrap where appropriate; avoid competing styling approaches.
- Preserve adequate contrast, responsive behavior, light/dark themes, visible focus, and `prefers-reduced-motion` support.

Full examples: [frontend-examples.md — components](./frontend-examples.md#ejemplo-04).

### UI/UX Patterns Adapted to VES

#### MUI for New Visual Components

**Recommended**

```jsx
import Button from '@mui/material/Button';
import Stack from '@mui/material/Stack';

<Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
    <Button variant="contained">Consultar</Button>
    <Button variant="outlined">Limpiar</Button>
</Stack>
```

In an existing Bootstrap view, retain Bootstrap unless migrating it is explicitly within scope.

#### Visual States

Each interactive control MUST represent the applicable states:

- default;
- hover;
- visible focus;
- disabled;
- loading;
- error;
- selected/active.

DO NOT convey state through color alone.

#### Responsive Design

- Design primarily around the existing screen's behavior.
- Verify at least the relevant mobile, tablet, and desktop sizes.
- Avoid unnecessary fixed widths.
- Prefer the existing design system's breakpoints and tokens.
- Tables and DataGrid components MUST remain usable in narrow viewports.

#### Navigation

Use React Router and the established routes.

DO NOT use:

```jsx
window.location.href = '/ruta-interna';
```

when navigation occurs within the SPA and can be handled by React Router.

Preserve secure external navigation using existing utilities.

#### Shared Action Toolbar (`Botonera`)

VES screens **MUST NOT create their own action buttons** (Open, New, Delete, Download, etc.). They use the shared `Botonera` in `componentes/botones`, which queries the user's available options from the security database (`usuario/opciones/ObtenerOpcionesUsuarioAsync`) and maps each `nombreFisico` to the screen function (`laListaDeLasFuncionesDeLosBotones`). The screen receives `elUsuario`, `elCodigoDeModulo`, `elCodigoOpcionPadre`, and `elTitulo` from `Dashboard`.

- Display all options available to the user on that screen. For options not yet implemented by the screen, pass `funcionOpcionNoImplementada` to display the message “Option not yet available”; without that property, those options are omitted.
- Record-level actions operate on the selected row and inform the user if no row is selected.
- DO NOT replace the shared toolbar with per-row action buttons or custom controls.

#### File Preview

- PDF only, with validated size limits and `Content-Type`; force the blob's MIME type to `application/pdf` and revoke its object URL on unmount.
- DO NOT use `sandbox` on the PDF viewer's `iframe` (Chrome blocks it with `ERR_BLOCKED_BY_CLIENT`); use `referrerPolicy="no-referrer"`.
- Verify rendering in a real browser (Edge/Chrome): automated browsers may hang when displaying the PDF viewer.

## State, Effects, and Forms

- Use `useState` for local state and lift it only when it must be shared. `ContextoDeTema` and `sesionLocal` cover existing cross-cutting concerns; DO NOT introduce a global state library for a local use case.
- Use `useEffect` to synchronize with external systems, not as a general substitute for event handling or derived calculations. Declare accurate dependencies and clean up subscriptions, timers, and other resources.
- Some legacy screens suppress dependencies using `eslint-disable-line react-hooks/exhaustive-deps`. DO NOT copy this pattern without a verified reason or mechanically alter those dependencies: first analyze the data flow and validate behavior.
- Use controlled forms or `FormData` according to the component's established pattern. Validate inputs with understandable messages, retain values when an error occurs, and prevent duplicate submissions by disabling the action while saving.
- Every visible asynchronous operation MUST represent its applicable loading, success, and error states. DO NOT turn failures into successful responses or conceal errors.

### State and Effect Examples

The rules and states remain in the preceding section. Complete examples of `useState`, derived state, `useEffect`, cleanup, forms, duplicate submission, and save errors: [frontend-examples.md](./frontend-examples.md#ejemplo-05).

## API Communication

- Use URLs and routes defined in `Constantes.js`; DO NOT duplicate environment URLs in components or hardcode local or production URLs.
- All UI business requests MUST target `Bccr.Supen.Ves.Api`, respecting its versioned routes and conventions. NEVER connect the UI directly to MAPI, SQL Server, or stored procedures.
- The project is gradually migrating its Axios calls to `infraestructura/httpCliente.js`. Use that client for new requests or when modifying already-migrated code; DO NOT replace all existing calls at once or change their contracts without a dedicated task.
- `httpCliente` configures timeouts and a session interceptor; it also exports `ObtengaMensajeDeErrorHttp`. Reuse these capabilities as appropriate and preserve diagnostic error details.
- Keep requests, loading, and errors close to the screen that owns their state unless the feature already has a clear shared pattern. Creating a new services directory or abstraction layer is not required.

Example UI request using the shared client and an existing configured URL:

```jsx
import { useState } from 'react';
import { Alert, Button } from '@mui/material';
import httpCliente, {
    ObtengaMensajeDeErrorHttp,
} from '../infraestructura/httpCliente';
import { apiListarTiposArchivo } from '../Constantes';

export default function ConsultarTiposDeArchivo() {
    const [estaCargando, setEstaCargando] = useState(false);
    const [mensajeDeError, setMensajeDeError] = useState('');

    const alConsultar = async () => {
        setEstaCargando(true);
        setMensajeDeError('');

        try {
            await httpCliente.get(apiListarTiposArchivo);
        } catch (error) {
            setMensajeDeError(ObtengaMensajeDeErrorHttp(error));
        } finally {
            setEstaCargando(false);
        }
    };

    return (
        <>
            <Button disabled={estaCargando} onClick={alConsultar}>
                {estaCargando ? 'Consultando...' : 'Consultar'}
            </Button>
            {mensajeDeError && <Alert severity="error">{mensajeDeError}</Alert>}
        </>
    );
}
```

### HTTP Communication Examples

The configuration, shared-client, contract, error-handling, and state rules remain above. Full examples of network errors, concurrency, stale responses, and caching: [frontend-examples.md](./frontend-examples.md#ejemplo-06).

## Accessibility and Usability

- Use semantic elements and associate each form control with an accessible label.
- Provide accessible names for icon buttons, useful alternative text for informative images, and `alt=""` for decorative images.
- Preserve keyboard navigation, visible focus, logical focus order, and sufficient contrast. Follow the WCAG 2.1 AA accessibility target documented for VES.
- Announce errors and dynamic results using appropriate semantics (for example, `role="alert"` for urgent messages). DO NOT convey status through color alone.
- Preserve the application's and business domain's Spanish language. DO NOT introduce i18n or translate UI labels as part of unrelated work; remain consistent with the module's existing copy and terminology.

### Accessibility Examples

The standard remains above. Examples of icon buttons, semantics, forms, messages, and images: [frontend-examples.md](./frontend-examples.md#ejemplo-07).

## Testing and Quality

- The test runner is Vitest with `globals: true`, configured in `vite.config.mjs` with the `jsdom` environment. Tests use React Testing Library.
- Locate tests alongside the feature using `.test.js` or `.test.jsx` suffixes, following the folder's conventions (`STI`, `SEC`, `componentes`, `infraestructura`, `estilos`, `rutas`).
- Prefer accessible Testing Library queries (`getByRole`, `getByLabelText`, `findBy...`) and assert observable behavior. Use `data-testid` selectors only when no suitable semantic query exists.
- Cover relevant behavior: successful scenarios, validation, errors, loading states, and edge cases as appropriate. DO NOT add Cypress or Jest integration tests: these tools are not part of the current stack.
- `describe`, `test`, `expect`, and `beforeEach` are globally available. Import mocks and spies from `vitest` (`vi.mock`, `vi.fn`, `vi.clearAllMocks`); DO NOT use `jest.*`.
- Before completing UI source-code changes, run the following commands from `Bccr.Supen.Ves.UI/Codigo/`:

```bash
npm run lint
npm test
npm run build:local
```

DO NOT run `build:pruebas` or `build:produccion` solely for local verification: those scripts increment the version in `package.json`.

### Vitest Testing Examples

Rules and exceptions remain in this section. Complete examples of AAA, RTL, mocks, coverage, and anti-patterns: [frontend-examples.md](./frontend-examples.md#ejemplo-08).

## Configuration, Security, and Browser Boundaries

- Environment-specific configuration resides in `Codigo/config/{ambiente}.json` and is merged with `config/default.json`. `NODE_CONFIG_ENV` selects the configuration during Vite build/dev; `vite.config.mjs` exposes it as `__APP_CONFIG__`. Consult `VES/Bccr.Supen.Ves.UI/Documentacion/Deploy.md` before making changes.
- DO NOT use `Constantes.js` to hardcode an environment or replace its configuration mechanism. Values included in the browser bundle are public: NEVER put secrets, private keys, or credentials in client configuration.
- DO NOT add secrets to `Codigo/.env`; the inherited `ENCRYPTION_KEY` value is documented as awaiting secure handling and MUST NOT be replicated.
- For external links, preserve validation and secure opening (`noopener,noreferrer`) according to the patterns in `EnlacesExternos.js` and `Dashboard.jsx`. DO NOT construct trusted destinations from unvalidated input.
- Avoid persisting tokens or sensitive information in `localStorage`. Respect the GAUDI/OpenID authentication and session flows implemented in `Autenticacion.jsx`, `LandingGaudi.jsx`, and `infraestructura/`.

### Browser Security Examples

The environment-configuration and no-secrets-in-the-bundle rules remain above. Complete examples of dynamic HTML, external URLs, `localStorage`, and configuration: [frontend-examples.md](./frontend-examples.md#ejemplo-09).

## Performance and Maintenance

- Measure before optimizing. Avoid preventable re-renders, but DO NOT add `memo`, `useMemo`, or `useCallback` without demonstrated need.
- Preserve the existing code-splitting and chunk configuration in `vite.config.mjs`. Consider lazy-loading large modules/screens when it offers measurable improvement and is compatible with navigation and deployment.
- Use `loading="lazy"` for noncritical images when appropriate; preserve specialized handling of large file uploads and downloads.
- Maintain stable list keys and cancel or ignore stale asynchronous results when a screen can unmount or its query criteria change.
- DO NOT refactor STI/SEC views, modify business logic, update dependencies, or alter API contracts as side effects of a visual improvement.

### Performance Examples

The measurement and maintenance rules remain above. Examples of `useMemo`, lists, lazy loading, images, and APIs: [frontend-examples.md](./frontend-examples.md#ejemplo-10).

## Workflow

- First analyze the target screen's conventions and adjacent components.
- Make small, related changes; DO NOT assume generic advice overrides business requirements or established VES conventions.
- Follow the branching and review workflow in `Bccr.Supen.Ves.UI/AGENT.md`.
- Keep README, SPEC, and development guides aligned with actual behavior when architecture, tooling, or procedures change.

## Quick Checklist for New Frontend Code

### Architecture and API

- [ ] The UI calls only `Bccr.Supen.Ves.Api`.
- [ ] No direct calls to MAPI, SQL Server, or stored procedures.
- [ ] URLs/routes come from `Constantes.js` or existing configuration.
- [ ] New requests use `httpCliente` where appropriate.
- [ ] No unnecessary new layer or abstraction has been introduced.

### Naming and Structure

- [ ] Components use `PascalCase`.
- [ ] Variables and functions use `camelCase`.
- [ ] Hooks begin with `use`.
- [ ] Booleans have descriptive names.
- [ ] `.jsx` files contain JSX, and `.js` files contain non-JSX logic.
- [ ] Custom CSS uses `kebab-case`.
- [ ] Public contracts were not renamed for stylistic reasons.
- [ ] Language is consistent with the module.

### React

- [ ] New code uses functional components.
- [ ] Props are clear/destructured when this improves readability.
- [ ] State remains as local as possible.
- [ ] No unnecessary derived state.
- [ ] `useEffect` is used for actual synchronization, not simple calculations.
- [ ] Effects clean up resources when appropriate.
- [ ] Lists use stable `key` values.

### UI/UX

- [ ] New visual components use MUI/VES theme where appropriate.
- [ ] Light/dark mode is preserved.
- [ ] Responsive behavior has been verified.
- [ ] Loading/error/empty/success states are represented where applicable.
- [ ] No state is conveyed through color alone.
- [ ] Asynchronous actions prevent duplicate submissions.

### Accessibility

- [ ] Semantic HTML.
- [ ] Controls have accessible names.
- [ ] Keyboard navigation works.
- [ ] Focus is visible.
- [ ] Images have appropriate `alt` text.
- [ ] Dynamic errors are announced appropriately.
- [ ] Contrast is sufficient.

### Security

- [ ] No secrets in code or browser-bundle configuration.
- [ ] No new sensitive tokens in `localStorage`.
- [ ] External links are validated and opened securely.
- [ ] No `dangerouslySetInnerHTML` without justification/sanitization.
- [ ] User-facing errors do not expose internal details.

### Testing

- [ ] Vitest + React Testing Library.
- [ ] Semantic queries preferred over `data-testid`.
- [ ] Tests focus on behavior.
- [ ] Success/error/loading/validation cases covered based on risk.
- [ ] No new Jest/Cypress dependencies.
- [ ] No real network requests in unit/component tests.

### Performance

- [ ] No speculative `useMemo`/`useCallback`.
- [ ] No unnecessary duplicate HTTP requests.
- [ ] Stale responses are canceled/ignored when applicable.
- [ ] Images/assets optimized when beneficial.
- [ ] No code-splitting/chunk changes without measurement.

### Before Pull Request

- [ ] `npm run lint`
- [ ] `npm test`
- [ ] `npm run build:local`
- [ ] No version-incrementing builds were run solely for local validation.
- [ ] No collateral changes to dependencies, contracts, or unrelated modules.

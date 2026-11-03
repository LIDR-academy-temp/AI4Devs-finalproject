# VES Frontend Patterns and Examples — Preserved Appendix

> **Reference document (R):** The following ten sections were extracted from the original standard **without rewriting the examples**. Their inclusion does not mean that the code has been executed or validated. In case of conflicts, the normative standard and verified source code/contracts take precedence.

<a id="ejemplo-01"></a>
## Example 01 — Mapping Generic Practices to VES
> Source: `frontend-standards(1).md`, starting at line 80.

### Transformation Matrix: Source Document 1 → VES

> The following rules describe how developers and agents MUST map the original recommendations to the VES technology stack.

| Topic in Document 1 | Document 1 | VES Equivalent |
|---|---|---|
| React | React 18 | React 19 |
| Language | TypeScript preferred | JavaScript/JSX |
| Build | Create React App | Vite |
| UI | React Bootstrap/Bootstrap | Material UI v7 for new UI code; retain Bootstrap 5 wherever already in use |
| HTTP | Axios in services | `infraestructura/httpCliente.js` for new or migrated code; do not perform a wholesale migration of existing Axios usages |
| Routing | React Router | React Router DOM 6, following the existing configuration |
| Unit/component tests | Jest + RTL | Vitest + React Testing Library |
| E2E | Cypress | Do not introduce Cypress; it is not part of the current stack |
| i18n | i18next mandatory | Do not introduce i18n; retain Spanish and the existing module-specific UI text |
| State | `useState`, `useEffect`, custom hooks | Retained, following current VES patterns |
| Components | Functional components + hooks | Retained |
| Accessibility | Semantic HTML, keyboard, ARIA | Retained and aligned with the WCAG 2.1 AA objective documented for VES |
| Variables/functions | `camelCase` | `camelCase` |
| Components/types | `PascalCase` | `PascalCase` for components; do not introduce TypeScript types/interfaces |
| Constants | `UPPER_SNAKE_CASE` | Follow actual module conventions; some exports use `LAS_RUTAS_EXTERNAS`, while other existing contracts use `camelCase` |
| Files | Components in `PascalCase`, utilities in `camelCase` | Retained for new files, using `.jsx` when JSX is present and `.js` otherwise |
| CSS | `kebab-case` | Keep `kebab-case` in custom CSS; prefer MUI theme/tokens/`sx` where appropriate |
| Hooks | `use...` | Retained (`useTemaVes`, `use...`) |
| Language | English | Consistent Spanish terminology within VES; established framework terms may remain in English |

The **VES Equivalent** column takes precedence when generating or reviewing code.

<a id="ejemplo-02"></a>
## Example 02 — Detailed Coding and Naming Conventions
> Source: `frontend-standards(1).md`, starting at line 148.

### Detailed Coding and Naming Conventions

> The original conventions for components, variables, functions, constants, files, CSS classes, and hooks are retained and adapted to JavaScript/JSX and the existing VES language conventions.

#### React Components

Use `PascalCase` for components and choose names that clearly express their responsibilities.

**Avoid**

```jsx
export default function boton() {
    // ...
}
```

```jsx
export default function Componente1() {
    // ...
}
```

**Recommended**

```jsx
export default function BotonConsultar() {
    // ...
}
```

```jsx
export default function ResumenDeOperacion() {
    // ...
}
```

A component SHOULD represent a clear visual or functional responsibility. Do not extract tiny components solely to reduce line count; extract them when doing so improves reuse, readability, isolation, or testability.

#### Variables and Functions

Use `camelCase`.

```jsx
const codigoEntidad = 10;
const tiposDeArchivo = [];
const obtenerTiposDeArchivo = async () => {};
```

Avoid ambiguous abbreviations or names that do not convey intent:

```jsx
const x = 10;
const arr = [];
const proc = async () => {};
```

#### Event Handlers

Follow the module's naming conventions. VES supports descriptive Spanish event handler names such as:

```jsx
const alConsultar = () => {};
const alGuardar = () => {};
const alCambiarArchivo = (event) => {};
```

If an existing area uses `handle...`, preserve that convention in the area rather than renaming solely for stylistic reasons.

Avoid:

```jsx
const click = () => {};
const fn1 = () => {};
```

#### Boolean Values

Use names that communicate a state or condition:

```jsx
const [estaCargando, setEstaCargando] = useState(false);
const [estaGuardando, setEstaGuardando] = useState(false);
const puedeEditar = permisos.includes('editar');
const tieneErrores = errores.length > 0;
```

Avoid:

```jsx
const [flag, setFlag] = useState(false);
const ok = true;
```

#### Constants

> VES has more than one public naming convention in `Constantes.js`; therefore, existing code MUST NOT be mechanically renamed.

Stable private/local constants may use a clear naming convention consistent with the containing file:

```jsx
const CANTIDAD_MAXIMA_RESULTADOS = 100;
const TIEMPO_ESPERA_MS = 30_000;
```

Preserve the existing spelling of established public exports:

```jsx
export const LAS_RUTAS_EXTERNAS = { /* ... */ };
export const apiListarTiposArchivo = '...';
```

Do not duplicate environment URLs or values as constants inside components.

#### Hooks

Every custom hook MUST start with `use` and follow `camelCase`:

```jsx
function useTiposDeArchivo() {
    // ...
}
```

```jsx
const { esOscuro } = useTemaVes();
```

Do not prefix a function with `use` if it does not use hooks, and do not call hooks outside the React Rules of Hooks.

#### Files

For new files:

```text
BotonConsultar.jsx
ResumenDeOperacion.jsx
useTiposDeArchivo.js
formatoFecha.js
httpCliente.js
```

Rules:

- Use `PascalCase` for files whose main export is a React component.
- Use `camelCase` for hooks, utilities, infrastructure, and modules that do not export a component.
- Use `.jsx` when the file contains JSX.
- Use `.js` when the file contains no JSX.
- Do not rename existing files as an unrelated side effect of another task.

#### Custom CSS

When using conventional CSS, prefer `kebab-case`:

```css
.resumen-operacion {}
.boton-consultar {}
```

Do not introduce new CSS classes if the same outcome can be achieved consistently with the MUI theme, `sx`, VES tokens, or an existing class.

#### Props

Destructure props when doing so improves clarity:

```jsx
export default function BotonConsultar({
    estaCargando,
    alConsultar,
}) {
    // ...
}
```

Avoid passing generic, non-descriptive props:

```jsx
export default function BotonConsultar(props) {
    return <button onClick={props.x}>{props.y}</button>;
}
```

Use default values only when the expected behavior has been defined:

```jsx
export default function TablaResultados({
    filas = [],
    estaCargando = false,
}) {
    // ...
}
```

Do not use defaults to conceal missing required data.

#### Objects and Destructuring

Destructure when doing so makes the data being used explicit:

```jsx
const { name, value } = event.target;
```

Avoid excessive destructuring when it makes the source of the data harder to trace.

#### Language of Identifiers, Messages, and Logs

> VES uses Spanish in the UI, business logic, identifiers, and documentation. The intent of the original guideline is **language consistency**, not imposing a literal English-only rule.

- Retain Spanish for business-domain and UI concepts.
- Retain established framework terminology (`props`, `hook`, `render`, `DataGrid`) when natural in the codebase.
- Avoid mixing Spanish and English for the same concept without technical justification.
- Do not translate existing public API names or configuration keys.
- User-facing messages MUST use the vocabulary of the relevant screen/module.
- Development logs SHOULD be concise, diagnostic, and free of sensitive data.

**Avoid**

```jsx
const candidateList = await obtenerCandidates();
console.error('Falló loading candidatos');
```

**Recommended**

```jsx
const listaDeCandidatos = await obtenerCandidatos();
console.error('No fue posible obtener los candidatos', error);
```

#### Imports

- Group imports consistently with adjacent files.
- Prefer imports from actual project paths.
- Do not introduce new path aliases merely to shorten imports without updating project configuration.
- Remove unused imports.
- Do not import an entire library when a module/component import is sufficient.

Example:

```jsx
import Button from '@mui/material/Button';
import Alert from '@mui/material/Alert';
```

#### Comments

Comments SHOULD explain design decisions, constraints, or non-obvious behavior.

**Avoid**

```jsx
// Cambia loading a true
setEstaCargando(true);
```

**Recommended**

```jsx
// Evita un segundo envío mientras el API procesa la operación actual.
setEstaCargando(true);
```

Do not retain large blocks of commented-out code; Git already maintains version history.

<a id="ejemplo-03"></a>
## Example 03 — Historical Naming Checklist
> Source: `frontend-standards(1).md`, starting at line 426.

### Naming and Coding Checklist

- [ ] Components use `PascalCase`.
- [ ] Variables and functions use `camelCase`.
- [ ] Hooks begin with `use`.
- [ ] Boolean names describe a condition/state.
- [ ] Component filenames use `PascalCase.jsx`.
- [ ] Utility/hook filenames use `camelCase.js`.
- [ ] Custom CSS uses `kebab-case`.
- [ ] Constants follow module conventions; public exports have not been renamed solely for style.
- [ ] There are no generic names such as `data1`, `tmp`, `fn`, `flag`, or `x`.
- [ ] Environment URLs are not duplicated inside components.
- [ ] Comments do not merely restate the code.
- [ ] Language is consistent with the module and its existing contracts.

<a id="ejemplo-04"></a>
## Example 04 — React Composition Patterns and Examples
> Source: `frontend-standards(1).md`, starting at line 446.

### Component and Composition Patterns

> The principles of functional components, explicit props, hooks, and extracting reusable logic are preserved without introducing TypeScript or a new architecture.

#### Functional Components

Use functions and hooks for new code.

**Avoid introducing new class components**

```jsx
class ConsultarFondos extends React.Component {
    // ...
}
```

**Recommended**

```jsx
export default function ConsultarFondos() {
    const [estaCargando, setEstaCargando] = useState(false);

    // ...
}
```

Do not convert legacy class components merely because another part of a screen is being changed.

#### Composition Rather Than Monolithic Components

If a screen combines multiple visual responsibilities and extraction would add value, separate the responsibilities.

```text
PantallaConsulta
├── FiltrosConsulta
├── ResumenConsulta
└── TablaResultados
```

Extraction MUST be driven by a real readability, reusability, or testing need; do not impose the same component structure on every screen.

#### Custom Hooks for Reusable Logic

When multiple screens share the same state/effect logic:

```jsx
function useTiposDeArchivo() {
    const [tipos, setTipos] = useState([]);
    const [estaCargando, setEstaCargando] = useState(false);
    const [mensajeDeError, setMensajeDeError] = useState('');

    // ...
    return { tipos, estaCargando, mensajeDeError };
}
```

Do not extract a hook that merely wraps a single line or obscures control flow without improving reuse or testability.

#### Presentation and HTTP Access

Document 1 proposes a centralized service layer. VES does not require creating a service directory: new HTTP calls SHOULD use `infraestructura/httpCliente.js`, keeping state ownership close to the screen unless a shared pattern already exists.

**Avoid**

```jsx
axios.get('https://servidor-produccion/api/tipos');
```

**Recommended**

```jsx
await httpCliente.get(apiListarTiposArchivo);
```

- For new visual components, prefer Material UI v7, the existing theme, and the VES design system in `estilos/temaVes.js`.
- Use `useTemaVes()` and `veSTokens` when a component needs theme information or direct access to tokens. If it can inherit the MUI theme without its own conditional logic, prefer theme-based styling rather than duplicating light/dark color definitions.
- The application also retains Bootstrap 5 on existing screens. Do not migrate those screens as part of unrelated work. Avoid mixing competing style systems within a component; combine libraries only when necessary and consistent with the area's established styles.
- Do not require every visual element to be an MUI component: use semantic HTML (`main`, `nav`, `form`, `label`, buttons, headings) where appropriate. Avoid non-semantic generic elements when a suitable alternative exists.
- Preserve light/dark theme support, visible focus states, and responsive behavior when adding or changing styles.
- Honor `prefers-reduced-motion` in new animations and do not rely solely on color to communicate errors, selection, or state.

Example using VES theme tokens:

```jsx
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import { useTemaVes } from '../estilos/ContextoDeTema';
import { veSTokens } from '../estilos/temaVes';

export default function ResumenDeOperacion({ titulo }) {
    const { esOscuro } = useTemaVes();

    return (
        <Box
            sx={{
                p: 2,
                color: esOscuro ? veSTokens.fgDark : veSTokens.neutral900,
                backgroundColor: esOscuro ? veSTokens.surfaceDark : veSTokens.neutral50,
            }}
        >
            <Typography variant="h6">{titulo}</Typography>
        </Box>
    );
}
```

<a id="ejemplo-05"></a>
## Example 05 — State, Effects, and Forms
> Source: `frontend-standards(1).md`, starting at line 678.

### State, Effects, and Forms Examples

> Retain local state, loading/error states, controlled forms, and custom hooks. Apply modern React guidance to avoid unnecessary effects and stale updates.

#### Local State

Use `useState` for state owned by the component:

```jsx
const [estaCargando, setEstaCargando] = useState(false);
const [mensajeDeError, setMensajeDeError] = useState('');
```

Do not lift state to `App` or context if only one screen consumes it.

#### Derived State

**Avoid storing state that can be calculated**

```jsx
const [cantidad, setCantidad] = useState(0);

useEffect(() => {
    setCantidad(filas.length);
}, [filas]);
```

**Recommended**

```jsx
const cantidad = filas.length;
```

#### `useEffect`

Use `useEffect` to synchronize with external systems: network resources, external DOM, subscriptions, timers, or browser APIs.

**Avoid**

```jsx
useEffect(() => {
    setNombreCompleto(`${nombre} ${apellido}`);
}, [nombre, apellido]);
```

**Recommended**

```jsx
const nombreCompleto = `${nombre} ${apellido}`;
```

#### Effect Cleanup

```jsx
useEffect(() => {
    const controlador = new AbortController();

    cargarDatos({ signal: controlador.signal });

    return () => {
        controlador.abort();
    };
}, []);
```

Use the cancellation mechanism compatible with `httpCliente`/Axios and the actual code in the affected area; this example illustrates the pattern.

#### Controlled Forms

```jsx
const [formulario, setFormulario] = useState({
    codigoEntidad: '',
    fechaInicio: '',
});

const alCambiar = (event) => {
    const { name, value } = event.target;

    setFormulario((anterior) => ({
        ...anterior,
        [name]: value,
    }));
};
```

#### Preventing Duplicate Submissions

```jsx
<Button
    type="submit"
    disabled={estaGuardando}
>
    {estaGuardando ? 'Guardando...' : 'Guardar'}
</Button>
```

#### Save Errors

When a save operation fails:

- preserve the data entered by the user;
- display an understandable message;
- restore the interactive state;
- do not display a success message;
- restrict technical details to diagnostics rather than showing them in the UI.

<a id="ejemplo-06"></a>
## Example 06 — HTTP Communication Patterns
> Source: `frontend-standards(1).md`, starting at line 848.

### HTTP Communication Patterns

> Centralized HTTP configuration and consistent error handling are retained and adapted to the existing shared VES HTTP client.

#### Do Not Duplicate Configuration

**Avoid**

```jsx
const respuesta = await axios.get(
    'http://localhost:5000/api/tipos-archivo'
);
```

**Recommended**

```jsx
const respuesta = await httpCliente.get(apiListarTiposArchivo);
```

#### Network Errors

```jsx
try {
    const respuesta = await httpCliente.get(apiListarTiposArchivo);
    setTipos(respuesta.data);
} catch (error) {
    setMensajeDeError(ObtengaMensajeDeErrorHttp(error));
}
```

Do not expose `error.stack`, full responses, tokens, or internal details to the user.

#### Concurrent Requests

When two requests are independent and the endpoint/UX warrants it, they may run in parallel:

```jsx
const [catalogos, parametros] = await Promise.all([
    httpCliente.get(apiCatalogos),
    httpCliente.get(apiParametros),
]);
```

Do not use `Promise.all` if one request depends on the other or if the workflow requires independent error handling.

#### Stale Data

When search criteria can change rapidly, cancel the preceding request or ignore its response when it no longer matches the current criteria.

#### Caching

Document 1 recommends caching responses where appropriate. VES MUST NOT introduce a global caching library solely on that basis. Explicitly define:

- which data may become stale;
- how long it remains valid;
- how it is invalidated;
- whether it contains sensitive or permission-dependent information.

<a id="ejemplo-07"></a>
## Example 07 — Accessibility Examples
> Source: `frontend-standards(1).md`, starting at line 931.

### Accessibility Examples

> Semantic HTML, keyboard access, alternative text, and accessible names are retained. VES also applies the WCAG 2.1 AA objective documented for the project.

#### Icon Buttons

**Avoid**

```jsx
<IconButton onClick={alEliminar}>
    <DeleteIcon />
</IconButton>
```

**Recommended**

```jsx
<IconButton
    aria-label="Eliminar archivo"
    onClick={alEliminar}
>
    <DeleteIcon />
</IconButton>
```

#### Clickable `div`

**Avoid**

```jsx
<div onClick={alConsultar}>Consultar</div>
```

**Recommended**

```jsx
<Button onClick={alConsultar}>Consultar</Button>
```

Using the correct semantic element avoids having to manually reproduce keyboard behavior, focus handling, and roles.

#### Forms

Every control MUST have an accessible name via a `label`, equivalent MUI property, or `aria-label` when no suitable visible label exists.

#### Dynamic Messages

For urgent errors:

```jsx
<Alert severity="error" role="alert">
    {mensajeDeError}
</Alert>
```

Do not overuse `role="alert"` for non-urgent informational messages.

#### Images

```jsx
<img src={grafico} alt="Distribución mensual de operaciones" />
<img src={decoracion} alt="" />
```

The `alt` text SHOULD describe the image's purpose rather than redundantly stating “image of.”

<a id="ejemplo-08"></a>
## Example 08 — React Testing Examples
> Source: `frontend-standards(1).md`, starting at line 1031.

### Test Authoring Patterns

> Preserve behavior-focused testing, descriptive names, success/error/edge cases, and isolation. Map Jest/Cypress guidance to the current stack: Vitest + React Testing Library.

#### Test Names

Prefer behavior-focused names:

```jsx
test('muestra los tipos de archivo cuando la consulta es exitosa', async () => {
    // ...
});

test('muestra un mensaje de error cuando falla la consulta', async () => {
    // ...
});
```

Avoid:

```jsx
test('test1', () => {});
test('componente funciona', () => {});
```

#### Arrange / Act / Assert

The AAA pattern can structure non-trivial tests:

```jsx
test('deshabilita Consultar mientras la solicitud está en curso', async () => {
    // Arrange
    // configurar mock y renderizar

    // Act
    // ejecutar acción de usuario

    // Assert
    // verificar comportamiento observable
});
```

The comments are optional when the test is already clear.

#### Semantic Queries

**Prefer**

```jsx
screen.getByRole('button', { name: /consultar/i });
screen.getByLabelText(/código de entidad/i);
await screen.findByRole('alert');
```

**Avoid as a first choice**

```jsx
screen.getByTestId('btn-consultar');
```

`data-testid` remains valid when a stable semantic query is unavailable.

#### User Interaction

Use the interaction utilities already installed/configured in the test suite. When `user-event` is available, prefer interactions resembling real user behavior over manually dispatching low-level events.

#### HTTP Mocks with Vitest

Use `vi.mock`, `vi.fn`, and `vi.spyOn` according to the existing suite conventions.

```jsx
import { vi } from 'vitest';

vi.mock('../infraestructura/httpCliente', () => ({
    default: {
        get: vi.fn(),
    },
    ObtengaMensajeDeErrorHttp: vi.fn(),
}));
```

Do not use:

```jsx
jest.mock(...)
jest.fn()
```

#### What to Test

As applicable:

1. initial render;
2. loading state;
3. successful result;
4. error handling;
5. validation;
6. empty state;
7. disabled/enabled buttons;
8. navigation;
9. basic accessibility;
10. updates caused by user interactions;
11. relevant edge cases.

Not every component requires every case.

#### What Not to Test

- internal implementation details of hooks or state when they are not observable;
- names of private functions;
- exact DOM tree structure unless part of a contract;
- dynamically generated MUI classes;
- React's internal implementation.

#### Complete Example

```jsx
test('muestra error y conserva la acción disponible cuando falla la consulta', async () => {
    httpCliente.get.mockRejectedValueOnce(new Error('fallo'));
    ObtengaMensajeDeErrorHttp.mockReturnValueOnce(
        'No fue posible realizar la consulta.'
    );

    render(<ConsultarTiposDeArchivo />);

    await user.click(
        screen.getByRole('button', { name: /consultar/i })
    );

    expect(
        await screen.findByRole('alert')
    ).toHaveTextContent('No fue posible realizar la consulta.');

    expect(
        screen.getByRole('button', { name: /consultar/i })
    ).toBeEnabled();
});
```

Adjust imports and helpers to match the actual test suite configuration.

#### Testing Anti-patterns

- using `jest.*`;
- depending on real APIs or networks in unit/component tests;
- using arbitrary timeouts or sleeps;
- testing private implementation details;
- using `data-testid` when an accessible role/label exists;
- sharing mutable state across tests;
- depending on test execution order;
- hiding failures inside `try/catch`;
- chasing numeric coverage without verifying behavior.

#### Coverage

Do not impose a coverage percentage inherited from another project unless the VES pipeline defines it. Prioritize meaningful scenarios and respect the repository's actual thresholds/quality gates.

<a id="ejemplo-09"></a>
## Example 09 — Browser Security Examples
> Source: `frontend-standards(1).md`, starting at line 1215.

### Client Configuration and Security Examples

> Maintain environment-specific configuration and prohibit client-side secrets. Adapt the implementation to VES's `config/*.json` + Vite mechanism, not `.env` or Create React App.

#### Configuration

**Avoid**

```jsx
const API_URL = 'https://api-produccion/';
```

inside a component.

**Recommended**

Consume the constants/configuration already exposed through the VES mechanism.

#### Secrets Must Not Be Stored in the Frontend

All values included in the bundle can be inspected by users. Never include:

- passwords;
- client secrets;
- private keys;
- connection strings;
- permanent tokens.

#### Dynamic HTML

Avoid `dangerouslySetInnerHTML` except when genuinely required and using trusted or properly sanitized content through the project-approved mechanism.

#### External URLs

Do not construct external destinations directly from untrusted input. Reuse existing validation and safe link-opening practices (`noopener,noreferrer`).

#### Browser Persistence

Do not store additional tokens, sensitive claims, or confidential information in `localStorage` for convenience. Follow the existing session/authentication flow.

<a id="ejemplo-10"></a>
## Example 10 — Performance and Maintenance Examples
> Source: `frontend-standards(1).md`, starting at line 1281.

### Performance Patterns

> Retain lazy loading, code splitting, asset optimization, reduced rendering, and HTTP efficiency, but only where they provide measurable benefits.

#### `useMemo` and `useCallback`

**Avoid premature optimization**

```jsx
const titulo = useMemo(() => 'Consulta', []);
```

```jsx
const alCerrar = useCallback(() => {
    setAbierto(false);
}, []);
```

when there is no measurable reason or dependency requiring stable identity.

**Use where appropriate**, such as an expensive calculation derived from a large dataset:

```jsx
const filasOrdenadas = useMemo(
    () => ordenarFilas(filas, criterio),
    [filas, criterio]
);
```

#### List Keys

**Avoid**

```jsx
filas.map((fila, indice) => (
    <Fila key={indice} fila={fila} />
));
```

when a stable identifier exists.

**Recommended**

```jsx
filas.map((fila) => (
    <Fila key={fila.id} fila={fila} />
));
```

#### Lazy Loading

Consider `React.lazy`/code splitting for large screens not needed at startup, without changing the existing chunking or navigation strategy.

#### Images

For non-critical images:

```jsx
<img
    src={miniatura}
    alt="..."
    loading="lazy"
/>
```

Do not lazy-load resources needed for initial content when doing so harms the UX.

#### API

- avoid unnecessary repeated requests;
- avoid requesting data the screen does not need when the API supports filtering;
- cancel or ignore stale responses;
- parallelize only independent requests;
- do not introduce global caching without an expiration/invalidation strategy.

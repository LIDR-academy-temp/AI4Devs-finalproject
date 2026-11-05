# Proposal — web-admin-matching

Issue #80, parte 3 de 3 (reglas de pareo), en su lado de pantallas. El backend es el change `admin-matching` (rama `feat/admin-matching`). Su proposal, su design (D1–D9) y su delta spec `matching` son el contrato de este change:

- **Grupo 1 publicado:** los esquemas de `@recon/shared/matching.ts` y las rutas de `schema.gen.ts`.
- **Grupos 2–4 publicados:** las escrituras y lecturas ya responden. El grupo 5 está en curso.

Este change trabaja contra MSW. Solo las capturas (último grupo) necesitan el backend real.

## Why

Administration › Matching Rules aparece deshabilitada ("Soon") en el menú. Las reglas de pareo solo se pueden ver y cambiar en la base. El API de `admin-matching` ya permite crear, leer y editar conjuntos y reglas globales, así que falta la pantalla del mapa de README §1.3. Con ella un admin puede:

- preparar un conjunto para un proveedor que cambia de formato;
- corregir una regla de hoja o de columna;
- añadir un alias de estado sin tocar la base.

## What Changes

**Menú y direcciones**

- **Matching Rules** pasa a ser un enlace, sin permiso requerido: leer reglas solo pide token.
- **`/matching-rules?merchantId&providerId`:** selector merchant → proveedor en la dirección, como Accounts. Muestra la entrada fija **Global defaults** y la lista de conjuntos del proveedor, con nombre, estado y cuentas enlazadas.
- **`/matching-rules/global`:** reglas globales de hoja y de columna, alias de estado y filas a ignorar.
- **`/matching-rules/$ruleSetId`:** detalle de un conjunto, con proveedor, cuentas enlazadas (enlace a cada ficha), reglas de hoja, reglas de columna y filas a ignorar.
- Conjunto inexistente o fuera del alcance: `This rule set is not available.`

**Edición** (conjuntos con `account.manage`; globales y alias, además, con `merchantScope = all`)

- **Modo edición de página.** **Edit rules** convierte las tablas en un formulario:
  - añadir y quitar reglas;
  - **Move up** / **Move down** con botones;
  - campo `Reason` opcional.
- **Save** envía el documento completo, construido desde el último `GET` sin ids de regla, `rowIgnoreRules` ni `statuses`. **Cancel** descarta los cambios.
- Una nota fija dice `Order breaks ties at equal priority.` El navegador no reordena por prioridad: tras guardar se muestra el orden del API.
- **Rename** abre un panel lateral y **Deactivate** / **Activate** un diálogo de confirmación. Los dos envían el `PUT` completo con las reglas guardadas y están deshabilitados mientras el modo edición tiene cambios sin guardar.
- **New rule set** abre un diálogo con nombre y `Start from: Empty / Copy of <conjunto del proveedor>`. La copia arma el cuerpo con el detalle del conjunto de origen. Al crear, se navega al detalle.
- **Filas a ignorar** siempre de solo lectura, con la nota `Not applied yet (#120).`
- Fuera: "Test against a file…" del wireframe, y borrar conjuntos (el API no lo permite).

**Errores, sin perder valores ni el orden**

- `400 validation_error` con `details.field` (`sheetRules[2].statusId`): el mensaje va junto al campo de esa fila y el foco va al primer error.
- `409 rule_set_name_taken`: en el campo del nombre.
- `409 rule_set_in_use`: el diálogo lista las cuentas de `details.accounts`, cada una con enlace a su ficha.
- `400` de esquema sin campo conocido, `403`, `404` o fallo de red: mensaje general del formulario.
- **El navegador solo avisa antes, sin decidir.**
  - Avisa con los esquemas `*Input` de `@recon/shared` (obligatorios, longitudes, recorte) y adaptando los campos al tipo de hoja: sin ciclo ni estado para `batch_fees` e `ignore`, sin estado para el ciclo `R`.
  - Regex, patrones repetidos, `Pending` y ciclo natural los decide el `400` del API.

**Account Detail**

- La fila **Matching rules** de la Overview enlaza al detalle del conjunto de la cuenta, o a `/matching-rules/global` si la cuenta no tiene conjunto.
- No hay pestaña de reglas: el conjunto es del proveedor y lo comparten varias cuentas.

**MSW**

- Fake de las cinco rutas de `admin-matching`. Valida cuerpos y respuestas con `MatchingRuleSetCreate`, `MatchingRuleSetPut`, `GlobalMatchingRulesPut`, `MatchingRuleSetDetail` y `GlobalMatchingRules`.
- Reutiliza `RULE_SETS` de `web-admin-accounts` y guarda lo que se escribe.
- No decide reglas de negocio: los `400` de dominio y los `409` los guiona cada test.

**Capturas** a 1280 y 1024 px contra el backend real. Necesitan que `admin-matching` haya terminado y turno de base.

## Capabilities

### New Capabilities

Ninguna.

### Modified Capabilities

- `matching`: requisitos nuevos de pantalla:
  - acceso y lista de conjuntos;
  - detalle de un conjunto;
  - reglas globales;
  - modo edición;
  - avisos del formulario;
  - errores del API;
  - renombrar;
  - activar y desactivar;
  - crear un conjunto;
  - permisos de la pantalla.
- `accounts`: **MODIFIED** "Pantalla Account Detail: Overview": el conjunto enlaza a su detalle, o a las globales.
- `web-shell`: **MODIFIED** "Navegación filtrada por permisos": Matching Rules habilitada y activa en sus tres direcciones.

## Impact

- **Código (solo `frontend/`):**
  - `features/matching/` nuevo: páginas, formulario de reglas, cuerpos y errores, consultas y mutaciones, permisos y textos.
  - `features/accounts/AccountOverview.tsx`: la fila del conjunto como enlace.
  - `app/router.tsx`, `app/layout/nav-config.ts` y sus textos.
  - `test/msw/matching.ts` nuevo; `test/msw/accounts.ts` comparte `RULE_SETS`.
- **API, base de datos, backend y `@recon/shared`:** ningún cambio. El contrato es el de `admin-matching`. Si hace falta cambiar un esquema, se para y se avisa a esa sesión.
- **Documentación:**
  - README §1.3: fila **Matching Rules** y la fila Account Detail, sin pestaña de reglas.
  - `docs/wireframes/web-admin-matching/` con las capturas.
- **Dependencia:**
  - La rama integra `origin/feature/entrega-3-MVP` (Account Detail de `web-admin-accounts`) y `origin/feat/admin-matching` **por merge**, sin rebase ni force push.
  - Cada grupo nuevo de `admin-matching` entra con otro merge.
  - El PR hacia `feature/entrega-3-MVP` se abre cuando `admin-matching` esté fusionado.
- **Fuera de alcance:**
  - probar reglas contra un archivo;
  - escribir o aplicar filas a ignorar (#120);
  - borrar conjuntos;
  - control de concurrencia, porque gana la última escritura (riesgo aceptado en `admin-matching`);
  - reglas de interpretación avanzada (roadmap).

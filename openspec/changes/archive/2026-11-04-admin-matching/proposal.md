# Proposal — admin-matching

Issue #80, parte 3 de 3: reglas de pareo. `admin-fees` y `admin-accounts` ya están fusionados. Este change completa además la parte de `matching` de #21.

Es un change **solo de backend**: dominio, API, tests y colección Bruno. La pantalla Matching Rules la hace el change `web-admin-matching` a partir de este contrato.

## Why

Hoy las reglas de pareo solo las crea el seed. La aplicación las lee para proponer el pareo, pero nadie puede crear un conjunto para un proveedor que cambia de formato, corregir una regla de hoja o de columna, ni añadir un alias de estado sin tocar la base. Configurar las reglas de pareo desde la aplicación es uno de los motivos del proyecto (README §1.1) y el último recorte de la Entrega 2 que queda en #80 (README §1.5). El README da por hechos `POST /providers/{id}/matching-rule-sets`, `GET`/`PUT /matching-rule-sets/{id}` y `GET`/`PUT /matching-rules/global` (§4.4), que no existen.

## What Changes

**API** (todo bajo `/api/v1`)

- **`POST /providers/{providerId}/matching-rule-sets`** (`account.manage`): crea un conjunto en el proveedor y responde `201` con el detalle. Cuerpo: `name` (sin espacios de borde, 1–80), `isActive` opcional (por defecto `true`), `sheetRules[]` y `columnRules[]` (pueden ir vacías) y `reason` opcional (≤ 500).
- **`GET /matching-rule-sets/{ruleSetId}`** (sin permiso específico): detalle del conjunto, con `provider`, `accounts`, `sheetRules`, `columnRules` y `rowIgnoreRules`, estas últimas **de solo lectura**.
- **`PUT /matching-rule-sets/{ruleSetId}`** (`account.manage`): recibe el documento completo (`name`, `isActive`, `sheetRules`, `columnRules` y `reason` opcional) y **reemplaza** las listas de reglas de hoja y de columna que cambian, en el orden dado (ids nuevos); una lista sin cambios conserva sus ids. Un cuerpo que no cambia nada responde `200` sin escribir. No hay borrado: un conjunto se desactiva.
- **`GET /matching-rules/global`** (solo token): reglas globales de hoja, columna y filas a ignorar (estas, de solo lectura), los alias de estado y el catálogo de estados para la pantalla.
- **`PUT /matching-rules/global`** (`account.manage` **y alcance `all`**): reemplaza, de las reglas globales de hoja y de columna y de los alias de estado, las listas que cambian. Un admin limitado a ciertos merchants recibe `403`, porque las globales afectan a todos.
- **`GET /providers/{providerId}/matching-rule-sets`**: no cambia. Este change la amplía con el resto de operaciones sin redefinirla.
- **Validación del contenido** (`400 validation_error` con `details.field`, una ruta como `sheetRules[2].statusId`):
  - las `CHECK` de la base: una hoja `transactions` lleva ciclo; `batch_fees` e `ignore` no llevan ciclo ni estado; el ciclo `R` no lleva estado;
  - un estado fijo no puede ser `Pending` ni tener un ciclo natural distinto del de la hoja;
  - un regex debe compilar;
  - no se repiten patrones en la misma lista, sin distinguir mayúsculas ni espacios de borde (las columnas, por pareja hoja–columna; los alias, por texto);
  - longitudes de columna y como mucho 200 reglas por lista.
- **Errores nuevos:**
  - `409 rule_set_name_taken`: nombre en uso **en el mismo proveedor**, sin distinguir mayúsculas.
  - `409 rule_set_in_use`: desactivar un conjunto que tiene cuentas enlazadas, también cerradas, con `details.accounts`.
- **Efecto de un cambio.** Se mantiene lo que ya dice la spec, y se escribe en escenarios y en el README §1.2 con el porqué:
  - el pareo confirmado y las filas analizadas no cambian;
  - un import en `uploaded` sin confirmar ve la propuesta nueva, porque la propuesta se recalcula con las reglas vigentes;
  - un cambio de alias se aplica en el siguiente análisis.

  Fijar las reglas en cada import exigiría guardarlas por import, y eso es una migración.
- **Auditoría.** Cada escritura deja su entrada en `AuditLog`, en la misma transacción:
  - `matching_rule_set.create`, `matching_rule_set.update`, `matching_rule_set.deactivate` y `matching_rule_set.activate`, con `entityType = MatchingRuleSet`;
  - `matching_rules.update`, con `entityType = MatchingRules` y `entityId = global`;
  - el detalle es `{ changes: { before, after }, reason? }`.
- **Permisos y alcance:** `401` → `403 forbidden` (sin `account.manage`; solo `admin` lo tiene) → `404 not_found`, idéntico para un proveedor o un conjunto inexistentes o fuera del alcance. La validación del esquema puede responder antes (#72).
- **Concurrencia:** gana la última escritura, con la fila del conjunto bloqueada (`UPDLOCK`). Es un riesgo aceptado: un control optimista necesitaría `updatedAt` en `MatchingRuleSet`, es decir, una migración.

**Contrato compartido y cliente**

- Esquemas Zod en `@recon/shared`: `SheetRule`, `ColumnRule`, `RowIgnoreRule`, `StatusAlias`, `MatchingRuleSetDetail`, `MatchingRuleSetCreate`, `MatchingRuleSetPut`, `GlobalMatchingRules` y `GlobalMatchingRulesPut`.
- Export de OpenAPI y cliente del frontend regenerado.
- Es el primer grupo de tareas. Se publica antes que el resto, con las rutas declaradas y en `501`, para que `web-admin-matching` pueda empezar.

**Colección Bruno**

- Caso feliz y al menos un negativo por endpoint. Las escrituras con `admin`; los `403` con `analyst`; los `404` con `viewer`.
- El flujo `20-flows/matching` busca Provider C por nombre (sin ids escritos a mano), crea un conjunto `bruno-<id de la pasada>`, lo lee, lo edita y lo deja **inactivo**, así que se puede repetir sin sembrar.
- El caso feliz de las globales reenvía lo que devuelve el `GET`: responde `200` sin escribir.
- Nada depende del estado de batch-clean (#111). Los tests que listan conjuntos exactos del seed ignoran el prefijo `bruno-`.

**Documentación**

- README:
  - §1.2: efecto de un cambio de reglas y su porqué;
  - §1.5: se quita el recorte de #80;
  - §3.2: acciones de auditoría y unicidad del nombre sin distinguir mayúsculas;
  - §4.4: endpoints, permisos, códigos de error y **filas a ignorar de solo lectura**, con referencia a #120.
- `CLAUDE.md`: el flujo `20-flows/matching` y sus conjuntos `bruno-`.
- `docs/openapi.yaml` regenerado.

**Base de datos**

- **Sin migraciones.** Las tablas, las `CHECK` de kind, ciclo, estado y `targetField`, el índice único de patrón global y el permiso `account.manage` ya existen. Ninguna tabla guarda el id de una regla, así que reemplazarlas no rompe nada.

## Capabilities

### New Capabilities

Ninguna.

### Modified Capabilities

- `matching`:
  - **Requisitos nuevos:** crear un conjunto; detalle de un conjunto; editar un conjunto; nombre único por proveedor; desactivar un conjunto en uso; validación del contenido de las reglas; reglas globales editables; permiso y alcance de las escrituras; auditoría de las reglas; efecto de un cambio de reglas; filas a ignorar de solo lectura.
  - **`MODIFIED`:** "Conjuntos de reglas de un proveedor" (conjuntos `bruno-` de la colección) y "Reglas globales y conjuntos por proveedor" (escenarios de detalle de #21: regla del conjunto con el mismo patrón que una global; prioridad e igualdad).
- `api-collection`: requisito nuevo para el flujo de reglas de pareo, repetible sin sembrar.

## Impact

- **Código:**
  - `backend/src/modules/matching/`: dominio puro de validación y comparación de reglas, servicio de administración, repositorio Prisma con bloqueo y rutas nuevas en `matching-routes.ts`.
  - `backend/src/modules/imports/`: ningún cambio de comportamiento. Solo los tests que fijan el efecto de un cambio de reglas.
  - `packages/shared/src/`: esquemas de pareo y el cliente generado (`schema.gen.ts`).
  - Fixtures de MSW del frontend, solo por el contrato.
- **API:** cinco operaciones nuevas. **Nada BREAKING.**
- **Base de datos:** ninguna.
- **Fuera de alcance:**
  - #120: que el motor aplique las reglas de filas a ignorar y su escritura.
  - "Test against a file…" del wireframe.
  - Fijar las reglas por import.
  - Control optimista de concurrencia.
  - Borrar conjuntos.
  - Las reglas de interpretación avanzada (roadmap).
  - La pantalla (`web-admin-matching`).

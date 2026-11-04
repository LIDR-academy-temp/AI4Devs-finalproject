# Proposal — admin-accounts

Issue #80, parte 2 de 3: cuentas y canales. `admin-fees` ya está fusionado; después viene `admin-matching`. Este change completa además la parte de `accounts` de #21.

Es un change **solo de backend**: dominio, API, tests y colección Bruno. Las pantallas (Accounts con el diálogo New account, Account Detail y Channel Assignment) las hace el change `web-admin-accounts` a partir de este contrato.

## Why

Hoy las cuentas solo las crea el seed. La aplicación las lee, pero nadie puede dar de alta una cuenta, editarla, enlazarla a otro conjunto de reglas ni cerrarla sin tocar la base. La cuenta es la única entidad propia del Recon Tool (README §1.2) y su administración es el recorte de la Entrega 2 que queda en #80 (README §1.5). El README da por hechos `POST /providers/{id}/accounts` y `PATCH /accounts/{id}` (§4.4), que no existen.

## What Changes

**API** (todo bajo `/api/v1`)

- **`POST /providers/{providerId}/accounts`** (`account.manage`): crea una cuenta en el proveedor y responde `201` con el `AccountDetail`. Cuerpo:
  - `name`: se quitan los espacios de los extremos, 1–50 caracteres.
  - `chargebackReservePolicy`: obligatoria.
  - `rollingReserveCapAmt`: string decimal `≥ 0` o `null`.
  - `matchingRuleSetId`: opcional; un conjunto activo del mismo proveedor.
  - `copyFeesFromAccountId`: opcional; otra cuenta del mismo proveedor, abierta o cerrada.
- **Copia de fees.** Se copian solo los fees con estado `active` hoy (día de Nueva York), cada uno con vigencia `NULL…NULL`, sin su historial. Cada copia deja una fila `FeeHistory` con `action = copied`. Todo va en la misma transacción que la cuenta y con la cuenta origen bloqueada.
- **`PATCH /accounts/{accountId}`** (`account.manage`): edita `name`, `chargebackReservePolicy`, `rollingReserveCapAmt`, `matchingRuleSetId` (`null` desenlaza) e `isActive` (cerrar o reabrir), con `reason` opcional (≤ 500). Responde `200` con el `AccountDetail`.
  - `providerId` no se edita.
  - Un cuerpo que no cambia nada responde `200` sin escribir.
  - La política de reserva se puede cambiar sin restricción: aplica a los batches futuros.
  - Un cambio de conjunto rige desde el siguiente import.
- **Errores nuevos:**
  - `409 account_name_taken`: nombre en uso en **todo el sistema**, sin distinguir mayúsculas.
  - `400 validation_error` con `details.field` ∈ `copyFeesFromAccountId`, `matchingRuleSetId`, `rollingReserveCapAmt`.
  - `409 account_inactive`: `POST /accounts/{id}/imports` sobre una cuenta cerrada.
- **Cuenta cerrada.** No admite imports nuevos. Lo que ya estaba abierto sigue su curso: imports en curso, añadir o quitar archivos, validar, procesar, pagar y deshacer. La cuenta principal de sus canales no cambia. Se puede reabrir.
- **`GET /providers/{providerId}/matching-rule-sets`** (sin permiso específico): conjuntos del proveedor con `ruleSetId`, `name`, `isActive` y las cuentas que usan cada uno. Lo necesita el diálogo New account. **Es la base que `admin-matching` amplía**: añadirá `POST`, el detalle y `PUT` sin redefinir esta lectura.
- **Lecturas ampliadas de forma aditiva:**
  - `AccountDetail` gana `createdBy { userId, userName }` y `updatedAt`.
  - Los ítems de `GET /accounts/{id}/channels` y `GET /channels/{id}/accounts` ganan `assignedInBatchNo`.
  - `GET /channels` gana `primaryAccount` (`null` sin principal o si es de un merchant fuera del alcance).
- **Canales: solo lectura.** Los canales se asocian al procesar un settlement y la principal es la última cuenta que lo procesó (README §3.2). No hay asignación manual, como confirma el wireframe de Channel Assignment.
- **Auditoría.** Cada escritura deja su entrada en `AuditLog` en la misma transacción:
  - `account.create`, con los pares origen → copia de los fees;
  - `account.update`, `account.close` o `account.reopen`, con `changes: { campo: { before, after } }`.
- **Permisos y alcance:** `401` → `403 forbidden` (sin `account.manage`; solo `admin` lo tiene) → `404 not_found` idéntico para un proveedor o una cuenta inexistentes o fuera del alcance. La validación del esquema puede responder antes (#72).

**Contrato compartido y cliente**

- Esquemas Zod en `@recon/shared`: `AccountCreate`, `AccountPatch`, `MatchingRuleSetSummary` y los campos nuevos de las lecturas.
- Export de OpenAPI y cliente del frontend regenerado.
- Es el primer grupo de tareas. Se publica antes que el resto, con las rutas declaradas y en `501`, para que `web-admin-accounts` pueda empezar.

**Colección Bruno**

- Caso feliz y al menos un negativo por endpoint nuevo o modificado. Las escrituras con `admin`; los `403` con `analyst`; los `404` con `viewer`.
- El flujo crea cuentas en **Provider C** con el nombre `bruno-<id de la pasada>` y las cierra al terminar, para que se pueda repetir sin sembrar.
- Los tests que listan cuentas exactas del seed ignoran las cuentas con prefijo `bruno-` (lección de #111).

**Documentación**

- README §1.2, §1.5, §3.2 y §4.4:
  - endpoints y códigos de error;
  - cuenta cerrada;
  - nombre único global;
  - acciones de auditoría de cuentas;
  - se quita el recorte de cuentas.
- `CLAUDE.md`: el prefijo `bruno-` de la colección.
- `docs/openapi.yaml` regenerado.

**Base de datos**

- **Sin migraciones.** Las columnas, el `UNIQUE` del nombre, las `CHECK` de política y tope, `FeeHistory.action = copied` y el permiso `account.manage` ya existen.

**Para `web-admin-accounts`**

- El wireframe AccountNew dice "name unique per provider". El README y la base lo hacen **único en todo el sistema**, y así se implementa. La pantalla debe decir "unique" a secas y traducir `409 account_name_taken`.

## Capabilities

### New Capabilities

Ninguna.

### Modified Capabilities

- `accounts`:
  - **Requisitos nuevos:** crear una cuenta; nombre único en todo el sistema; conjunto de reglas de una cuenta; editar; cerrar y reabrir; permiso y alcance de las escrituras; auditoría de cuentas; canales de solo lectura.
  - **`MODIFIED`:** "Cuenta" (nombre único global, cuentas `bruno-` de la colección), "Detalle de cuenta" (`createdBy`, `updatedAt`), "Canales sin cuenta (not assigned yet)" (`primaryAccount`), "Canales de una cuenta" y "Cuentas de un canal" (`assignedInBatchNo`).
- `fees`: **`MODIFIED`** "Copia de fees al crear cuenta" (estado `active` hoy, cuenta origen, errores, historial `copied` y auditoría en la cuenta).
- `import` (la capability existente se llama así, en singular): requisito nuevo "Cuenta cerrada no admite imports nuevos".
- `matching`: requisito nuevo "Conjuntos de reglas de un proveedor", la lectura que amplía `admin-matching`. Va en `matching` y no en `accounts` para que `admin-matching` la extienda en su propia capability sin duplicarla.

## Impact

- **Código:**
  - `backend/src/modules/accounts/` (nuevo, previsto en `CLAUDE.md`): escrituras de cuenta (dominio, servicio, repositorio con bloqueo y rutas), design D1.
  - `backend/src/modules/catalog/`: lecturas ampliadas.
  - `backend/src/modules/fees/`: plan de copia como función pura y la acción `copied` en el puerto de historial.
  - `backend/src/modules/imports/`: comprobación de cuenta cerrada al crear un import.
  - `backend/src/modules/matching/`: lectura de los conjuntos del proveedor.
  - `packages/shared/src/catalog.ts` y el cliente generado (`schema.gen.ts`).
  - Fixtures de MSW del frontend, solo por el contrato.
- **API:** tres operaciones nuevas, un `409` nuevo en la subida de imports y lecturas ampliadas de forma aditiva. **Nada BREAKING.**
- **Base de datos:** ninguna.
- **Fuera de alcance:**
  - #24: garantía en base de que cuenta y canal son del mismo proveedor; necesita un trigger y, por tanto, una migración.
  - Crear y editar conjuntos de reglas (`admin-matching`).
  - Asignación manual de canales: no existe por diseño.
  - Recuentos de transacciones y "primera vista" de los canales sin asignar.
  - "Fees activos" y "último batch" por cuenta en la lista.
  - Las pantallas (`web-admin-accounts`).

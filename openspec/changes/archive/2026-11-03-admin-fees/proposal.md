# Proposal — admin-fees

Issue #80, parte 1 de 3: fees. Después vienen `admin-accounts` y `admin-matching`. Este change completa además la parte de `fees` de #21.

Es un change **solo de backend**: dominio, API, tests y colección Bruno. Las pantallas (Account Fees, Fee History y la vista global) las hace el change `web-admin-fees` a partir de este contrato.

## Why

Hoy solo el seed crea fees. La aplicación los lee para procesar, pero nadie puede darlos de alta, corregirlos ni cerrarlos sin tocar la base. Administrarlos desde la aplicación es uno de los motivos del proyecto (README §1.1) y el recorte de la Entrega 2 que queda en #80 (README §1.5). El README, además, da por hecho un `POST /accounts/{id}/fees` (✅ en §4.4) que no existe.

## What Changes

**API** (todo bajo `/api/v1`)

- **`POST /accounts/{accountId}/fees`** (`fee.manage`): crea un fee (README §4.1). Rechaza los solapes del mismo tipo en la cuenta con `409 fee_overlap` y `details.conflicts`.
- **`PATCH /fees/{feeId}`** (`fee.manage`), con dos formas de cuerpo:
  - **Corrección en el sitio.**
    - Un fee **sin uso** admite cualquier campo editable.
    - Uno **en uso** admite solo `description` y `endDate`. Tocar valores o `startDate` responde `409 fee_in_use`.
    - `feeTypeId` y `accountId` nunca se editan.
  - **Cambio desde una fecha** (`effectiveFrom` + valores nuevos): en una transacción cierra el vigente con `endDate = effectiveFrom − 1` y abre el sucesor.
  - Cerrar o cambiar un fee en uso exige no dejar fuera eventos ya aplicados. Si no, `409 fee_in_use` con `details.lastAppliedEventDate`.
  - `reason` es opcional, de hasta 500 caracteres.
- **`GET /fees`** (`fee.view`): vista global, paginada en servidor.
  - Filtros: `merchantId`, `providerId`, `accountId`, `kind` (`transactional` | `preset` | `free_amount`), `status` (`active` | `scheduled` | `closed`, respecto al día de hoy en Nueva York) y `q`.
  - Orden: merchant › proveedor › cuenta › tipo › `startDate`.
- **`GET /fees/{feeId}/history`** (`fee.view`): historial del fee, o con `scope=type` el de toda la cadena del mismo tipo en la cuenta.
- **`AccountFee` se amplía de forma aditiva** y sigue siendo plana. Añade:
  - las variantes condicionales y por marca;
  - `status`, `inUse` y `lastAppliedEventDate` (la fecha mínima de cierre para la pantalla);
  - `createdBy`, `createdAt` y `updatedAt`.

  `GET /accounts/{id}/fees` y Settlement Review no cambian de comportamiento.
- **`GET /fee-types` y `GET /accounts/{id}/fees`** se revisan contra el README y se mantienen.
- **Historial y auditoría:** cada escritura deja una fila en `FeeHistory` y otra en `AuditLog` en la misma transacción.
- **Permisos y alcance:** el permiso se comprueba antes que el alcance. Un recurso fuera del alcance responde el mismo `404 not_found` que uno inexistente.
- **Variantes:** las condicionales y por marca se aceptan y se guardan según `FeeCreate`, pero el motor no las aplica. Es una limitación conocida.
- **Fuera del change, a roadmap:**
  - `POST /fees/{id}/simulate` no se implementa.
  - La retirada de un fee programado y sin uso (intervalo vacío con migración) va a #109.

**Contrato compartido y cliente**

- Esquemas Zod en `@recon/shared`: lista global, crear, editar, `effectiveFrom`, historial y errores.
- Export de OpenAPI y cliente del frontend regenerado.
- Es el primer grupo de tareas. Se publica antes que el resto, con las rutas declaradas y en `501`, para que `web-admin-fees` pueda empezar.

**Colección Bruno**

- `00-auth/Login as admin` (`{{adminToken}}`, `as: admin`), porque solo `admin` tiene `fee.manage`.
- Por cada endpoint nuevo, un caso feliz y al menos un negativo: `403` con `analyst`, `404` con `viewer`, `409 fee_overlap` / `fee_in_use` y `400 validation_error`.
- Los casos felices usan fechas futuras derivadas de cada ejecución, para que la colección se pueda repetir.

**Documentación**

- README:
  - §1.2: simulate a roadmap; limitaciones de las variantes y de la retirada.
  - §1.5: se quita el recorte de fees.
  - §3.2: `FeeHistory`.
  - §4.1: `fee_overlap` en minúsculas y ejemplo con la `AccountFee` plana.
  - §4.4: el ✅ de `POST` pasa a ser real, códigos de error y simulate como roadmap.
- `CLAUDE.md`: el usuario `admin` de la colección.
- `docs/openapi.yaml` regenerado.

**Base de datos**

- **Sin migraciones.** Las columnas, las `CHECK`, el trigger `TR_Fee_NoOverlap` y las acciones de `FeeHistory` ya existen.

## Capabilities

### New Capabilities

Ninguna.

### Modified Capabilities

- `fees`:
  - **Requisitos nuevos:** permisos y alcance; crear; formato y reglas de un fee válido; uso; corregir en el sitio y campos editables en uso; cerrar; cambiar desde una fecha y sus límites; vista global con su orden y filtros; estado; historial por API; auditoría; solapes al administrar; campos ampliados de `AccountFee`.
  - **`MODIFIED`:** "Vigencia con NULL como infinito" (`fee_overlap`, bordes contiguos), "Historial" (formato de los JSON y `reason`) y "Fees de la cuenta vigentes a una fecha" (sin cambio de comportamiento; se conserva).

## Impact

- **Código:**
  - `backend/src/modules/fees/`: servicio de escritura, repositorio con bloqueo por cuenta, dominio de vigencias y solapes, rutas nuevas.
  - `packages/shared/src/fees.ts`.
  - Cliente del frontend generado (`schema.gen.ts`).
  - Posiblemente se mueve `deadlock-retry` a la infraestructura compartida.
- **API:** cuatro operaciones nuevas y `AccountFee` ampliada de forma aditiva. **Nada BREAKING.**
- **Base de datos:** ninguna.
- **Fuera de alcance:**
  - la copia de fees al crear una cuenta (`admin-accounts`);
  - simulate;
  - la retirada (#109);
  - el mantenimiento de tipos (#60);
  - aplicar las variantes en el motor;
  - las pantallas (`web-admin-fees`).

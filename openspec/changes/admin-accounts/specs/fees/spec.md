# Delta — fees

## MODIFIED Requirements

### Requirement: Copia de fees al crear cuenta
`POST /providers/{id}/accounts` con `copyFeesFromAccountId` SHALL copiar solo los fees activos de otra cuenta del mismo proveedor, cada uno con vigencia NULL…NULL, registrando `FeeHistory.action = copied` y auditoría. Sin ese campo la cuenta nace sin fees. Un fee es activo si su `status` es `active` respecto al día de hoy en Nueva York; los `scheduled` y `closed` no se copian. La cuenta origen MAY estar cerrada. Una cuenta origen inexistente, de otro proveedor o fuera del alcance SHALL responder `400 validation_error` con `details.field = "copyFeesFromAccountId"` sin crear nada.

#### Scenario: Se copian solo los fees activos, con vigencia abierta
- GIVEN una cuenta del proveedor con un fee MDR activo con vigencia 2026-01-01…NULL y un fee de Chargeback cerrado
- WHEN se crea otra cuenta del mismo proveedor con `copyFeesFromAccountId` apuntando a la primera
- THEN la cuenta nueva tiene solo la copia del MDR, con vigencia NULL…NULL y sin el historial del original
- AND la copia queda auditada

#### Scenario: Cuenta sin fees por defecto
- WHEN se crea una cuenta sin `copyFeesFromAccountId`
- THEN la cuenta nace sin fees

#### Scenario: Copia de los cinco fees de ProviderC-USD
- **WHEN** `admin` crea una cuenta en el proveedor 201 con `copyFeesFromAccountId` = `ProviderC-USD`
- **THEN** `GET /api/v1/accounts/{id}/fees` de la cuenta nueva devuelve cinco fees con los tipos 1–5, los mismos `fixedAmount`, `percentage`, variantes y `description` que los de `ProviderC-USD`, `startDate = null`, `endDate = null`, `status = "active"`, `inUse = false` y `createdBy.userName = "admin"`
- **AND** los fees de `ProviderC-USD` no cambian

#### Scenario: Un fee programado no se copia
- **GIVEN** la cuenta origen con un fee de un tipo que empieza mañana (día de Nueva York)
- **WHEN** se crea una cuenta copiando de ella
- **THEN** la cuenta nueva no tiene ese fee

#### Scenario: Historial de la copia
- **WHEN** se crea una cuenta copiando dos fees
- **THEN** cada copia tiene una sola fila de historial con `action = "copied"`, `before = null`, `after` con su configuración (vigencia NULL…NULL), `changedBy` el usuario de la petición y `reason = null`
- **AND** la entrada `account.create` de `AuditLog` lleva `copyFeesFromAccountId` y `copiedFees` con un par `{ sourceFeeId, feeId }` por copia

#### Scenario: Cuenta origen cerrada
- **GIVEN** una cuenta del proveedor cerrada con fees activos
- **WHEN** se crea una cuenta copiando de ella
- **THEN** recibe `201` y la cuenta nueva tiene la copia de esos fees

#### Scenario: Cuenta origen de otro proveedor
- **WHEN** `admin` crea una cuenta en el proveedor 201 con `copyFeesFromAccountId` = `ProviderA-USD` (proveedor 101)
- **THEN** recibe `400` con `code = "validation_error"` y `details.field = "copyFeesFromAccountId"`, y no se crea ninguna cuenta ni ningún fee

#### Scenario: Cuenta origen inexistente
- **WHEN** `admin` crea una cuenta con `copyFeesFromAccountId = "00000000-0000-4000-8000-00000000ffff"`
- **THEN** recibe `400` con `details.field = "copyFeesFromAccountId"`

#### Scenario: Copia y cambio de fee simultáneos
- **GIVEN** un cambio de un fee de la cuenta origen en curso
- **WHEN** a la vez se crea una cuenta copiando de ella
- **THEN** la copia ve el estado de antes o de después del cambio, nunca una mezcla, y la cuenta nueva no tiene dos fees del mismo tipo

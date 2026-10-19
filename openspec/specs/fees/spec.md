# fees

## Purpose
Fees por cuenta con vigencia abierta, historial y vista global. README §3.2 "Fees", §4.1.

## Requirements

### Requirement: Vigencia con NULL como infinito
`startDate NULL` SHALL significar "desde siempre" y `endDate NULL` "sin fin". Dos fees del mismo (cuenta, tipo) SHALL no solaparse evaluando los NULL como centinelas; el caso de uso lo valida y el trigger `TR_Fee_NoOverlap` lo respalda. Cambiar un fee SHALL cerrar el vigente con `endDate = nuevo startDate − 1 día` y abrir el nuevo; los fees no se borran.

#### Scenario: Solapamiento rechazado
- GIVEN un fee MDR vigente NULL…NULL en ProviderA-USD
- WHEN se crea otro MDR con startDate 2026-11-01 sin cerrar el anterior
- THEN la API responde 409 y la base no cambia

### Requirement: Selección por fecha de evento
El fee aplicado a un movimiento SHALL ser el vigente en `eventDate`: `(startDate IS NULL OR startDate <= d) AND (endDate IS NULL OR endDate >= d)`.

#### Scenario: Fee elegido por la fecha del evento, no la del batch
- GIVEN en una cuenta un fee de Chargeback con vigencia NULL…2026-10-31 y otro con vigencia 2026-11-01…NULL
- WHEN se procesa en un batch de noviembre un chargeback cuya fecha de evento en el gateway es 2026-10-15
- THEN el movimiento recibe el fee que termina el 2026-10-31, aunque el batch sea posterior

#### Scenario: Fee sin límites aplica a cualquier evento
- GIVEN en una cuenta un único fee MDR con vigencia NULL…NULL
- WHEN se procesa un movimiento con cualquier fecha de evento
- THEN el movimiento recibe ese fee

### Requirement: Copia de fees al crear cuenta
`POST /providers/{id}/accounts` con `copyFeesFromAccountId` SHALL copiar solo los fees activos de otra cuenta del mismo proveedor, cada uno con vigencia NULL…NULL, registrando `FeeHistory.action = copied` y auditoría. Sin ese campo la cuenta nace sin fees.

#### Scenario: Se copian solo los fees activos, con vigencia abierta
- GIVEN una cuenta del proveedor con un fee MDR activo con vigencia 2026-01-01…NULL y un fee de Chargeback cerrado
- WHEN se crea otra cuenta del mismo proveedor con `copyFeesFromAccountId` apuntando a la primera
- THEN la cuenta nueva tiene solo la copia del MDR, con vigencia NULL…NULL y sin el historial del original
- AND la copia queda auditada

#### Scenario: Cuenta sin fees por defecto
- WHEN se crea una cuenta sin `copyFeesFromAccountId`
- THEN la cuenta nace sin fees

### Requirement: Historial
Toda creación, edición o cierre SHALL dejar una fila en `FeeHistory` con la fila antes y después en JSON.

#### Scenario: Cambiar un fee cierra el vigente y abre el nuevo
- GIVEN un fee MDR vigente NULL…NULL en una cuenta
- WHEN el analista lo cambia con un nuevo valor desde 2026-11-01
- THEN el fee anterior queda con `endDate = 2026-10-31` y no se borra, y existe un fee nuevo con `startDate = 2026-11-01`
- AND `FeeHistory` tiene una fila `closed` para el anterior y una `created` para el nuevo, cada una con usuario, fecha, `beforeJson` y `afterJson`

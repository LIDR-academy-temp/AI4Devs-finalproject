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

### Requirement: Copia de fees al crear cuenta
`POST /providers/{id}/accounts` con `copyFeesFromAccountId` SHALL copiar solo los fees activos de otra cuenta del mismo proveedor, cada uno con vigencia NULL…NULL, registrando `FeeHistory.action = copied` y auditoría. Sin ese campo la cuenta nace sin fees.

### Requirement: Historial
Toda creación, edición o cierre SHALL dejar una fila en `FeeHistory` con la fila antes y después en JSON.

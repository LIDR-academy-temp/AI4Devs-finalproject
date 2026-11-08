## ADDED Requirements

### Requirement: Fechas de negocio del settlement sin zona
Los `dateRanges` del intento, y la `eventDate` y `expectedReserveReleaseAt` de los movimientos y la `eventDate` de los fees aplicados SHALL salir en hora de pared de America/New_York sin zona ni milisegundos (`YYYY-MM-DDTHH:mm:ss`), con los dígitos guardados. `settlementDate` SHALL seguir siendo solo el día y las fechas de auditoría (`processedAt`, `paidAt`, `undoneAt`…) instantes UTC con `Z`.

#### Scenario: Intento procesado
- **GIVEN** un intento procesado de `batch-clean`
- **WHEN** `analyst` lo pide
- **THEN** cada `min` y `max` de `dateRanges` cumple `^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}$`, `settlementDate` es solo el día y `processedAt` termina en `Z`

#### Scenario: Movimientos
- **WHEN** `analyst` lista los movimientos `I` del intento
- **THEN** cada `eventDate` no lleva `Z` ni milisegundos

### Requirement: Fechas de los CSV del summary independientes de la zona del servidor
Los CSV del summary SHALL escribir las fechas de negocio como hoy (`2026-10-07 23:58:40`), con los dígitos guardados, sea cual sea la zona del proceso del API.

#### Scenario: CSV en un servidor fuera de UTC
- **GIVEN** el proceso del API con `TZ = America/New_York`
- **WHEN** `analyst` descarga el CSV del summary de un intento cuyo rango `APP` termina en `2026-10-07 23:58:40` guardado
- **THEN** la fila `APP range (ET)` termina en `2026-10-07 23:58:40`

## MODIFIED Requirements

### Requirement: Pantallas de settlement: fechas en hora de Nueva York
Las fechas de negocio SHALL mostrarse con los dígitos recibidos, sin convertir: las que solo son un día (`settlementDate`, vigencias de los fees, `expectedReserveReleaseAt`) y los rangos de `Totals by type` (`dateRanges`, solo el día) sin sufijo de zona, y las que llevan hora (`eventDate` de los movimientos) con sufijo `ET`. Las de auditoría (`processedAt`, también en Settlement List) SHALL convertirse de UTC a la hora de Nueva York con sufijo `ET`. Ninguna SHALL depender de la zona del navegador.

#### Scenario: Fechas del intento
- **GIVEN** `settlementDate = "2026-10-24"`, `dateRanges.APP.min = "2026-09-28T00:04:11"` y `processedAt = "2026-10-19T15:40:03.120Z"`, con el navegador en otra zona
- **THEN** ve `2026-10-24`, sin `ET`, el rango de `Deposits` empezando en `2026-09-28`, sin hora ni `ET`, y `2026-10-19 11:40 ET`

#### Scenario: Fechas de la lista y de los movimientos
- **GIVEN** una fila de Settlement List con `settlementDate = "2026-10-24"` y `processedAt = "2026-10-19T15:40:03.120Z"`, y un movimiento con `eventDate = "2026-09-28T00:04:11"`, con el navegador en otra zona
- **THEN** la fila muestra `2026-10-24`, sin `ET`, y `2026-10-19 11:40 ET`, y el movimiento `2026-09-28 00:04 ET`

#### Scenario: Vigencia de un fee preestablecido
- **GIVEN** un fee preestablecido con `startDate = "2026-01-01"` y sin `endDate`
- **WHEN** `analyst` lo ve al añadirlo en Settlement Review
- **THEN** su vigencia empieza en `2026-01-01`, sin `ET`

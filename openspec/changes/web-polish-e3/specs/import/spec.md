## ADDED Requirements

### Requirement: Canal sin cuenta principal en channels
Cuando ninguna fila de `AccountChannel` del canal es principal y la cuenta del import tiene una fila no principal del canal, `channels` SHALL traerlo como `assigned_to_other_account` con `otherAccount = null` y la `note` de que esta cuenta pasará a ser su principal al procesar.

#### Scenario: Canal sin cuenta principal con una fila histórica de esta cuenta
- **GIVEN** un canal del proveedor de la cuenta sin ninguna fila `isPrimary` en `AccountChannel` y con una fila no principal de la cuenta del import. Ni el seed ni los flujos de la aplicación dejan así un canal, porque procesar siempre deja una cuenta principal
- **WHEN** se consulta `channels` de un import analizado con filas de ese canal
- **THEN** el canal aparece con `assignment = "assigned_to_other_account"`, `otherAccount = null` y la `note` de que esta cuenta pasará a ser su principal al procesar

### Requirement: Resultado del análisis: canal sin cuenta principal
El aviso de canales del paso Analysis SHALL mostrar un canal `assigned_to_other_account` con `otherAccount = null` como `<canal> has no primary account`, con su número de filas y su `note`, sin atribuirlo a otra cuenta ni a otro merchant.

#### Scenario: Canal sin cuenta principal
- **GIVEN** un import analizado en `ProviderA-USD` cuyo `channels` trae RAM-03 (1003, Provider A) con `assignment = "assigned_to_other_account"`, `otherAccount = null`, sin `otherProvider` y con la `note` de que esta cuenta pasará a ser su principal
- **WHEN** abre el paso Analysis
- **THEN** el aviso muestra `RAM-03 has no primary account` con su número de filas y esa nota, y no dice `another merchant`

### Requirement: Resultado del análisis: filtro inválido en la dirección
Un resultado o una página inválidos en la dirección de la tabla de filas SHALL descartarse también en la consulta al API, como si no estuvieran.

#### Scenario: Filtro inválido en la dirección
- **GIVEN** el import de `batch-clean` analizado
- **WHEN** abre `/imports/<id>?step=analysis&match=weird&page=abc`
- **THEN** se pide `GET rows?page=1&pageSize=50` sin `match` y la tabla muestra las filas, no un error de carga

### Requirement: Pantalla In Progress: valores inválidos en la dirección
Un valor inválido de la dirección de In Progress SHALL descartarse también en la consulta al API, como si no estuviera: un estado cerrado o desconocido, un **Only mine** que no sea `true`, una página inválida, o un nivel de la cascada sin el de arriba.

#### Scenario: Valores inválidos en la dirección
- **WHEN** `analyst` abre `/reconciliations/in-progress?status=cancelled&mine=yes&providerId=201&page=abc`
- **THEN** se pide `GET /imports?page=1&pageSize=50` sin `status`, `mine` ni `providerId`, y los filtros muestran `Any open status` y **Only mine** sin marcar

## MODIFIED Requirements

### Requirement: Aviso de canales
Tras el análisis, `channels` SHALL listar cada canal de las transacciones asociadas con `channelId`, `name`, `gatewayId`, `providerId`, `rowCount` y `assignment`: `assigned` (la cuenta del import es su principal), `unassigned` (sin fila en `AccountChannel`) o `assigned_to_other_account` (en los demás casos), con `otherAccount = { accountId, name }` si otra cuenta es la principal y `null` en `assigned` y `unassigned`, y una `note` cuando procesar cambiará la asociación. Ordenados por `channelId`.

#### Scenario: Canal nuevo en el batch limpio
- **GIVEN** `batch-clean` analizado en `ProviderA-USD`
- **WHEN** se consulta `channels`
- **THEN** contiene RAM-01 (1001) y RAM-02 (1002) con `assignment = "assigned"` y RAM-07 (1007) con `assignment = "unassigned"`, `otherAccount = null` y `note` indicando que se asociará a esta cuenta al procesar; ningún otro canal aparece

#### Scenario: Canal nuevo del proveedor B
- **GIVEN** `batch-issues` analizado en `ProviderB-Main`
- **WHEN** se consulta `channels`
- **THEN** RAM-13 (1013) aparece con `assignment = "unassigned"` y RAM-11, RAM-12 con `assigned`

#### Scenario: Canal principal de otra cuenta
- **GIVEN** `batch-blocked` analizado en `ProviderB-Main`
- **WHEN** se consulta `channels`
- **THEN** RAM-01 (1001) aparece con `assignment = "assigned_to_other_account"`, `otherAccount.name = "ProviderA-USD"`, `providerId = 101` y `rowCount = 1`

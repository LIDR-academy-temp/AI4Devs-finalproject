# Spec Delta

## MODIFIED Requirements

### Requirement: Resultado del análisis: aviso de canales
El paso Analysis SHALL mostrar un aviso ámbar con cada canal de `channels` sin `otherProvider` cuya situación no sea `assigned`: `unassigned` como `<canal> is not assigned yet` y `assigned_to_other_account` como `<canal> is primary in <cuenta>`, con su número de filas y su `note`. Un canal o cuenta fuera del alcance SHALL mostrarse sin nombre. Sin ningún canal que mostrar, por esta regla o por la de canal de otro proveedor, el aviso SHALL no aparecer.

#### Scenario: Canal nuevo en el batch limpio
- **GIVEN** el import de `batch-clean` analizado en `ProviderA-USD`
- **WHEN** abre el paso Analysis
- **THEN** el aviso muestra solo `RAM-07 is not assigned yet` con su nota; RAM-01 y RAM-02 no aparecen

#### Scenario: Canal principal de otra cuenta
- **GIVEN** un import analizado en `ProviderA-USD` cuyo `channels` trae RAM-03 (1003, Provider A) con `assignment = "assigned_to_other_account"`, `otherAccount.name = "ProviderA-EUR"`, sin `otherProvider` y con la `note` de que esta cuenta pasará a ser su principal
- **WHEN** abre el paso Analysis
- **THEN** el aviso muestra `RAM-03 is primary in ProviderA-EUR` con su número de filas y esa nota

#### Scenario: Formas ocultas
- **GIVEN** un import analizado cuyo `channels` trae un canal con `outOfScope = true`, `otherProvider = true` y la `note` de canal ajeno (el API marca así todo canal de un merchant fuera del alcance)
- **WHEN** abre el paso Analysis
- **THEN** el aviso lo muestra como `Channel <channelId> (another merchant)` con su número de filas y esa nota, sin el nombre, el proveedor ni la cuenta de ese merchant

#### Scenario: Todos los canales asignados
- **GIVEN** el import de `legacy-provider` analizado en `ProviderC-Alt`, con todos sus canales `assigned` y del proveedor de la cuenta
- **WHEN** abre el paso Analysis
- **THEN** el aviso de canales no aparece

## ADDED Requirements

### Requirement: Resultado del análisis: filas sin asociar por motivo
Con `Unmatched` mayor que cero, el contador `Unmatched` del paso Analysis SHALL desglosar `analysis.rows.unmatchedByReason` con cada motivo mayor que cero y su número, en el orden `no_match`, `id_format`, `lossy_numeric_id`, `no_gateways` y con la misma etiqueta en inglés que la columna de resultado de la tabla de filas. Un motivo en 0 SHALL no mostrarse, y con `Unmatched 0` no SHALL haber desglose.

#### Scenario: Archivo de otra cuenta
- **GIVEN** el import de `batch-wrong-account` analizado en `ProviderA-USD`
- **WHEN** abre el paso Analysis
- **THEN** el contador `Unmatched` dice `12` y su desglose muestra solo `ID does not fit any gateway` con `12`, de `expected.rows.unmatchedByReason`

#### Scenario: Batch con incidencias
- **GIVEN** el import de `batch-issues` analizado
- **WHEN** abre el paso Analysis
- **THEN** el contador `Unmatched` dice `1` y su desglose muestra solo `No match` con `1`

#### Scenario: Varios motivos
- **GIVEN** un import analizado con una fila `unmatched` por `no_match` y otra por `id_format`
- **WHEN** abre el paso Analysis
- **THEN** el desglose muestra `No match 1` y después `ID does not fit any gateway 1`, sin los motivos en 0

#### Scenario: Sin filas sin asociar
- **GIVEN** el import de `batch-clean` analizado
- **WHEN** abre el paso Analysis
- **THEN** el contador `Unmatched` dice `0` y no hay desglose

### Requirement: Resultado del análisis: aviso de cuenta equivocada
Con `analysis.likelyWrongAccount = true`, el paso Analysis SHALL mostrar junto a los contadores un aviso ámbar `The IDs do not fit any gateway of this account: the files may belong to another account.`, a cualquier usuario que vea el import y en cualquier estado con análisis. Con `false`, el aviso SHALL no aparecer.

#### Scenario: Archivo de otra cuenta
- **GIVEN** el import de `batch-wrong-account` analizado en `ProviderA-USD` (`likelyWrongAccount = true` en `expected.json`)
- **WHEN** `analyst` abre el paso Analysis
- **THEN** ve el aviso con ese texto junto a los contadores

#### Scenario: Usuario sin permiso para continuar
- **GIVEN** el mismo import analizado
- **WHEN** `viewer` abre el paso Analysis
- **THEN** ve el mismo aviso, aunque no tenga la barra de decisión

#### Scenario: Import cancelado
- **GIVEN** un import de `batch-wrong-account` cancelado tras el análisis
- **WHEN** `analyst` abre el paso Analysis
- **THEN** ve el aviso

#### Scenario: Sin asociar por otros motivos
- **GIVEN** un import analizado sin filas `matched`, con una fila `id_format` y otra `no_match` (`likelyWrongAccount = false`)
- **WHEN** abre el paso Analysis
- **THEN** el aviso de cuenta equivocada no aparece

### Requirement: Resultado del análisis: canal de otro proveedor
En el aviso de canales, cada canal con `otherProvider: true` SHALL mostrarse, sea cual sea su `assignment`, como `<canal> belongs to another provider`, con su número de filas y su `note`, y nunca con un texto que diga que se asociará a esta cuenta o que esta pasará a ser su principal.

#### Scenario: Canal de otro proveedor
- **GIVEN** el import de `batch-blocked` analizado en `ProviderB-Main`
- **WHEN** abre el paso Analysis
- **THEN** el aviso muestra `RAM-01 belongs to another provider` con `1` fila y la nota `Channel of another provider: its rows are not processed in this account`
- **AND** no muestra `is primary in`, `is not assigned yet` ni ninguna nota que diga que se asociará a esta cuenta o que esta pasará a ser su principal

#### Scenario: Canal de otro proveedor asignado
- **GIVEN** un import analizado cuyo `channels` trae un canal con `otherProvider = true` y `assignment = "assigned"`
- **WHEN** abre el paso Analysis
- **THEN** el aviso aparece y muestra ese canal como de otro proveedor

### Requirement: Resultado del análisis: ID con guiones en la tabla de filas
En la tabla de filas, un ID que contiene guiones SHALL poder partirse en líneas, pero solo justo después de un guion y nunca dentro de un trozo. Un ID sin guiones SHALL mostrarse sin partirse. En los dos casos el ID SHALL mostrarse entero y, al copiarlo, salir igual que se leyó, sin espacios ni saltos añadidos.

#### Scenario: ID con guiones
- **WHEN** una fila trae `transactionIdRaw = "df14616d-4b26-4ffb-9984-72717ebff6a6"`
- **THEN** la columna `ID` puede partirlo solo después de cada guion (`df14616d-` · `4b26-` · `4ffb-` · `9984-` · `72717ebff6a6`), y su texto es `df14616d-4b26-4ffb-9984-72717ebff6a6`

#### Scenario: ID sin guiones
- **WHEN** una fila trae `transactionIdRaw = "12345678901234567"`
- **THEN** la columna `ID` lo muestra en una pieza que no se parte, como hasta ahora

## MODIFIED Requirements

### Requirement: Pantalla Analysis & Validations: lista de hallazgos
Al elegir una validación, la pantalla SHALL listar los hallazgos de la corrida vigente filtrados por esa validación, paginados en el servidor (50 por página), en el orden del API, con ID leído como texto, ciclo, tipo y alcance, estado reportado y estado del gateway (si lo hay), rango del faltante, apariciones incluidas sobre el total y resolución. La validación, la página y el hallazgo abierto SHALL ir en la dirección. Una validación, una página o un hallazgo inválidos en la dirección SHALL descartarse también en las consultas al API.

#### Scenario: Faltantes anteriores al batch
- **GIVEN** la corrida vigente de `batch-issues`
- **WHEN** elige `Missing previous to batch`
- **THEN** se pide `GET validation-issues?validationCode=missing_previous_to_batch&page=1&pageSize=50` y ve 10 hallazgos, todos con rango `DEC` y `Persistent`, entre ellos `292185165085382`

#### Scenario: Discrepancia de estado
- **WHEN** elige `Non-recorded adjustment`
- **THEN** ve 3 hallazgos: `281520820250015` como `Non-recorded adjustment` y `911545593909470` y `381797111970492` como `Status mismatch`, cada uno con el estado reportado y el del gateway

#### Scenario: Recargar conserva la vista
- **GIVEN** la lista de `Duplicate in batch` abierta con el hallazgo de `441706751475644` en el drawer
- **WHEN** recarga la página
- **THEN** vuelve a ver la misma validación elegida y el mismo hallazgo abierto

#### Scenario: Validación inválida en la dirección
- **GIVEN** la corrida vigente de `batch-issues`
- **WHEN** abre el import con `?step=analysis&validation=foo&ipage=abc&issue=abc`
- **THEN** no se pide `GET validation-issues` con `validationCode=foo`, ninguna validación aparece elegida y no hay drawer abierto

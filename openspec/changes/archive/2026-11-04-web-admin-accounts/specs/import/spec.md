# Delta — import

## MODIFIED Requirements

### Requirement: Pantalla Upload Files: archivos rechazados
Un archivo rechazado SHALL mostrarse en la lista con su nombre y el motivo, sin afectar a los archivos ya incluidos ni al pareo en edición. Antes de enviar, la pantalla SHALL rechazar sin llamar al API un archivo que no sea `.xlsx` o que supere 20 MiB, y una selección de más de 10 archivos. Los rechazos del API SHALL mostrarse con el mismo texto que los del cliente. Una cuenta cerrada (`409 account_inactive`) SHALL decirse en el motivo.

#### Scenario: Duplicado con el nombre del coincidente
- **GIVEN** el import con `batch-split_part1.xlsx` y `batch-split_part2.xlsx` y un cambio sin confirmar en la hoja `DEC`
- **WHEN** `analyst` vuelve a subir `part1` con otro nombre
- **THEN** la fila del archivo rechazado muestra `This file is already in the import as Recon_Template_ProviderA-USD_batch-split_part1.xlsx.`, el import sigue con dos archivos y el cambio sin confirmar de `DEC` se conserva

#### Scenario: Tipo no permitido
- **WHEN** `analyst` suelta `batch.csv`
- **THEN** ve `batch.csv` con `Only .xlsx files are accepted.` y no se envía ninguna petición

#### Scenario: Tamaño excedido
- **WHEN** `analyst` suelta un `.xlsx` de 20 971 521 bytes
- **THEN** ve el archivo con `The file exceeds the 20 MB limit.` y no se envía ninguna petición; un archivo de exactamente 20 971 520 bytes sí se envía

#### Scenario: Más de diez archivos
- **WHEN** `analyst` suelta once `.xlsx` a la vez
- **THEN** ve `Select at most 10 files at a time.` y no se envía ninguno

#### Scenario: Archivo ilegible
- **WHEN** el API responde `422 file_unreadable` a `batch.xlsx`
- **THEN** ve `batch.xlsx` con `The file cannot be read as an Excel workbook.` y los demás archivos de la selección se siguen subiendo

#### Scenario: Cuenta cerrada entre la elección y la subida
- **GIVEN** `analyst` en New Reconciliation con `ProviderA-USD` elegida, y la cuenta se cierra antes de subir
- **WHEN** suelta `Recon_Template_ProviderA-USD_batch-clean.xlsx` y el API responde `409 account_inactive`
- **THEN** ve el archivo con `This account is closed. Choose another account.`, no se crea ningún import y la pantalla sigue en New Reconciliation

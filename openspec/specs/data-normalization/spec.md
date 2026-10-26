# data-normalization Specification

## Purpose
Convierte los valores tal como vienen en los archivos de cada banco o POS a un formato interno único, para que el motor compare datos homogéneos sin depender del origen.

## Requirements

### Requirement: Interpretación de fechas
El sistema SHALL interpretar las fechas según el formato indicado por el usuario y SHALL aceptar también números de serie de fecha de Excel y valores con hora, conservando la hora cuando exista.

#### Scenario: Formato día/mes/año
- **WHEN** el formato es `dd/MM/yyyy` y la celda contiene `05/03/2026`
- **THEN** se interpreta como 5 de marzo de 2026

#### Scenario: Formato mes/día/año
- **WHEN** el formato es `MM/dd/yyyy` y la celda contiene `05/03/2026`
- **THEN** se interpreta como 3 de mayo de 2026

#### Scenario: Número de serie de Excel
- **WHEN** la celda contiene el número 46082 procedente de una celda de fecha de Excel
- **THEN** se interpreta como la fecha correspondiente del calendario de Excel

#### Scenario: Fecha inválida
- **WHEN** la celda contiene `31/02/2026` o texto no interpretable
- **THEN** la fila se rechaza con motivo de fecha inválida

### Requirement: Interpretación de montos
El sistema SHALL interpretar los montos según el separador decimal indicado, eliminando separadores de miles, espacios y símbolos de moneda, y SHALL representarlos con precisión decimal exacta.

#### Scenario: Separador decimal coma
- **WHEN** el separador decimal es `,` y la celda contiene `1.234,56`
- **THEN** el monto es 1234.56

#### Scenario: Separador decimal punto
- **WHEN** el separador decimal es `.` y la celda contiene `$ 1,234.56`
- **THEN** el monto es 1234.56

#### Scenario: Monto vacío
- **WHEN** la celda de monto está vacía o contiene solo texto
- **THEN** la fila se rechaza con motivo de monto inválido

#### Scenario: Sin pérdida de precisión
- **WHEN** se importan los montos 0.10 y 0.20 y se suman
- **THEN** el resultado es exactamente 0.30

### Requirement: Enmascaramiento de tarjetas
El sistema MUST reducir cualquier valor de la columna de tarjeta a sus últimos 4 dígitos y MUST NOT persistir ni registrar en logs el número completo bajo ninguna circunstancia.

#### Scenario: Número completo en el archivo
- **WHEN** la celda contiene un número de tarjeta de 16 dígitos
- **THEN** solo se almacenan los últimos 4 dígitos y el valor completo no aparece en la fila original conservada ni en ningún registro

#### Scenario: Valor ya enmascarado
- **WHEN** la celda contiene `**** **** **** 1234` o `XXXX1234`
- **THEN** se almacena `1234`

#### Scenario: Valor sin dígitos suficientes
- **WHEN** la celda contiene menos de 4 dígitos
- **THEN** el campo queda vacío sin rechazar la fila

### Requirement: Normalización de textos
El sistema SHALL recortar espacios y unificar mayúsculas en referencias, códigos de autorización, lotes, terminales y códigos de local antes de almacenarlos para el cruce.

#### Scenario: Espacios y minúsculas
- **WHEN** la celda de código de autorización contiene ` ab12cd `
- **THEN** se almacena `AB12CD`

### Requirement: Conservación de la fila original
El sistema SHALL conservar junto a cada transacción importada la fila original tal como venía en el archivo, con el número de tarjeta ya enmascarado, para trazabilidad.

#### Scenario: Consulta de la fila original
- **WHEN** el usuario consulta una transacción importada
- **THEN** puede ver los valores originales de cada columna del archivo y el número de fila

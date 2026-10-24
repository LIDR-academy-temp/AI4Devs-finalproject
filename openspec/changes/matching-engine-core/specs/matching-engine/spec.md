# Spec Delta

## Purpose
Define cómo se decide que una o varias ventas del POS corresponden a uno o varios abonos del banco, con qué nivel de confianza y cuándo esa decisión se confirma sola o requiere revisión humana.

## ADDED Requirements

### Requirement: Pipeline de niveles excluyentes
El motor SHALL aplicar los niveles de cruce en orden fijo (exacto, tolerancia, agrupado cuando esté disponible) y cada nivel SHALL considerar únicamente las transacciones que los niveles anteriores dejaron sin cruzar.

#### Scenario: Transacción cruzada en nivel 1
- **WHEN** una venta queda cruzada por el nivel exacto
- **THEN** ningún nivel posterior la vuelve a considerar

#### Scenario: Orden de ejecución
- **WHEN** una venta podría cruzar tanto por nivel exacto como por tolerancia
- **THEN** el cruce resultante es del nivel exacto

### Requirement: Una transacción en un solo cruce activo
Cada venta POS y cada movimiento bancario SHALL pertenecer como máximo a un cruce en estado CONFIRMED o PROPOSED; el motor MUST NOT generar cruces que compartan transacciones.

#### Scenario: Candidato ya usado
- **WHEN** un movimiento bancario ya participa en un cruce confirmado o propuesto
- **THEN** el motor no lo incluye en ningún otro cruce

### Requirement: Nivel 1 cruce exacto
El motor SHALL cruzar una venta con un movimiento cuando coincidan código de autorización, monto y fecha, generando un cruce 1:1 confirmado con confianza 1,0.

#### Scenario: Coincidencia exacta única
- **WHEN** existe exactamente una venta y un movimiento con el mismo código de autorización, monto y fecha
- **THEN** se genera un cruce EXACT, ONE_TO_ONE, CONFIRMED, confianza 1,0 y diferencia 0

#### Scenario: Sin código de autorización
- **WHEN** la venta o el movimiento no tienen código de autorización
- **THEN** el nivel exacto no los cruza y quedan disponibles para niveles posteriores

#### Scenario: Dataset de casos exactos
- **WHEN** se ejecuta el motor sobre el dataset sintético de casos exactos
- **THEN** cruza el 100 % de las transacciones sin ningún cruce incorrecto

### Requirement: La ambigüedad bloquea el cruce
Cuando una clave de cruce tenga más de un candidato en cualquiera de los dos lados, el nivel MUST NOT elegir uno al azar: deja las transacciones sin cruzar para niveles posteriores o para propuesta.

#### Scenario: Clave duplicada
- **WHEN** dos ventas comparten código de autorización, monto y fecha y hay un solo movimiento coincidente
- **THEN** ninguna de las dos se cruza en el nivel exacto

### Requirement: Nivel 2 cruce por tolerancia
El motor SHALL cruzar una venta con un movimiento cuando el monto del movimiento coincida con el monto de la venta o con su monto neto esperado dentro de la tolerancia configurada, y la fecha del movimiento esté dentro de la ventana de días posterior a la venta.

#### Scenario: Desfase dentro de la ventana
- **WHEN** una venta del día 1 por 150,00 y un movimiento del día 3 por 150,00 son los únicos candidatos y la ventana es 3 días
- **THEN** se genera un cruce TOLERANCE

#### Scenario: Desfase fuera de la ventana
- **WHEN** el movimiento está 5 días después de la venta y la ventana es 3 días
- **THEN** no se genera cruce

#### Scenario: Movimiento anterior a la venta
- **WHEN** el movimiento tiene fecha anterior a la venta
- **THEN** no se genera cruce

### Requirement: Monto neto esperado
El motor SHALL calcular para cada venta el monto neto esperado como bruto menos bruto por porcentaje de comisión menos bruto por porcentaje de retención, y SHALL considerar válido el cruce si la diferencia absoluta con el monto bancario no supera la tolerancia.

#### Scenario: Depósito neto
- **WHEN** la venta es de 100,00, la comisión 2 %, la retención 1 % y el movimiento es de 97,00
- **THEN** el cruce es válido con diferencia −3,00

#### Scenario: Fuera de tolerancia
- **WHEN** el neto esperado es 97,00, la tolerancia 0,05 y el movimiento es de 96,90
- **THEN** no se genera cruce

#### Scenario: Sin comisión configurada
- **WHEN** los porcentajes de comisión y retención son 0
- **THEN** el neto esperado es igual al bruto

### Requirement: Confirmación automática restringida en nivel 2
Un cruce de nivel 2 SHALL confirmarse automáticamente solo si es el único candidato en ambos lados y coinciden los últimos 4 dígitos de la tarjeta; en cualquier otro caso SHALL generarse como propuesta que requiere revisión humana.

#### Scenario: Único con últimos 4
- **WHEN** hay un único candidato en cada lado y los últimos 4 dígitos coinciden
- **THEN** el cruce se genera CONFIRMED con confianza alta

#### Scenario: Único sin últimos 4
- **WHEN** hay un único candidato en cada lado pero alguno no tiene últimos 4 dígitos
- **THEN** el cruce se genera PROPOSED

#### Scenario: Monto repetido
- **WHEN** tres ventas de 10,00 del mismo día compiten por dos movimientos de 10,00 dentro de la ventana
- **THEN** no se confirma ninguna automáticamente

### Requirement: Explicación y confianza en cada cruce
Cada cruce generado SHALL incluir el nivel que lo produjo, un valor de confianza entre 0 y 1, los totales de cada lado, la diferencia (banco menos POS) y una explicación legible de por qué se cruzó.

#### Scenario: Cruce por tolerancia
- **WHEN** el motor genera un cruce por tolerancia con 2 días de desfase
- **THEN** la explicación menciona el monto coincidente, el desfase en días y los últimos 4 dígitos si se usaron

### Requirement: Precisión decimal
El motor MUST realizar todas las comparaciones y sumas de montos con aritmética decimal exacta.

#### Scenario: Suma de decimales
- **WHEN** se comparan 0,10 + 0,20 con 0,30
- **THEN** se consideran iguales

### Requirement: Rendimiento del motor
El motor SHALL procesar 10.000 ventas contra 10.000 movimientos en memoria en menos de 2 segundos.

#### Scenario: Dataset grande
- **WHEN** se ejecutan los niveles 1 y 2 sobre 10.000 × 10.000 registros
- **THEN** la ejecución termina en menos de 2 segundos

### Requirement: Independencia del almacenamiento
El motor SHALL recibir las transacciones como estructuras en memoria y devolver los cruces candidatos sin leer ni escribir en ninguna base de datos.

#### Scenario: Ejecución en test unitario
- **WHEN** se invoca el motor con datos sintéticos en un test sin base de datos
- **THEN** devuelve los cruces esperados

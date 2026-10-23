# ADR-004 · Tabla de transacciones propia, desacoplada del gateway

- **Estado:** Aceptado (propuesto en la Entrega 1; confirmado en la Entrega 2)
- **Decisores:** autor del proyecto

## Contexto

El sistema actual consulta en vivo la tabla de transacciones del gateway. Eso impide tener tests reproducibles y obliga a acceder a producción.

## Opciones consideradas

1. Consultar en vivo las transacciones del gateway.
2. Una tabla `Transaction` propia, alimentada en el MVP por el seed sintético y en producción por un job o una vista de carga.

## Decisión

Opción 2. La clave interna es `transactionId BIGINT IDENTITY`. La identidad externa es `(gatewayId, sourceTransactionId)`, con `sourceTransactionId VARCHAR(36)` normalizado según `Gateway.idFormat` (`numeric` | `uuid`).

## Consecuencias

- Las pruebas de integración y los oráculos de `data/samples/` son deterministas.
- En producción hará falta la carga desde los gateways.
- El cruce busca en los gateways de los canales de la cuenta, o en los de su proveedor si la cuenta todavía no tiene canales.

## En la Entrega 2

- El modelo es el previsto (`schema.prisma`, modelo `Transaction`, con `@@unique([gatewayId, sourceTransactionId])`).
- **Desviación:** el README §2.1 preveía un único puerto `TransactionSource`. La implementación usa puertos por caso de uso, cada uno con lo que necesita:
  - `TransactionLookup` en `imports`;
  - `MissingCandidateSource` y `SettlementHistorySource` en `validation`;
  - `SettlementSource` en `settlement`.

  El objetivo se cumple igual (el dominio no conoce Prisma), con puertos más pequeños.

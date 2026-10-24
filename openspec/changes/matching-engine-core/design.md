# Design

## Context

Hay transacciones POS y movimientos bancarios importados con los campos normalizados. El readme §2.2 fija el patrón Strategy en un pipeline con el motor como dominio puro y un `ReconciliationRunner` que carga, invoca y persiste; §6.2 (TK-12) detalla la indexación por clave `authCode|amount|date` y decimal.js; el PRD §8 define las reglas y §15 la decisión sobre el nivel 2 que este change adopta.

## Goals / Non-Goals

**Goals:**
- Motor testeable sin base de datos, con el dataset sintético como oráculo (precisión ≥ 99 %, cobertura ≥ 90 % en el estándar).
- Ejecución que nunca deja la conciliación en estado inconsistente.
- Base extensible para el nivel 3 (E3) sin tocar los niveles 1 y 2.

**Non-Goals:**
- Nivel 3 agrupado y nivel 4 IA (changes de E3).
- Worker externo con cola; el motor corre en el proceso de la API.
- Pestañas de resultados y cruce manual (change siguiente), aunque este change deja los datos listos.

## Decisions

1. **Dominio puro en `matching/engine/`:** tipos `PosTxn`, `BankMov`, `UnmatchedPool`, `MatchCandidate`, `ReconciliationConfig`; interfaz `MatchingStrategy { name; run(pool, config): MatchCandidate[] }`; clase `MatchingEngine` que ejecuta las estrategias y retira del pool lo cruzado. Alternativa descartada: estrategias como servicios Nest con Prisma inyectado; imposible testear con 10k registros en milisegundos.
2. **Nivel 1 con `Map` indexado por `authCode|amount|date`** en ambos lados; una clave con más de un elemento en cualquier lado se marca ambigua y no cruza. Alternativa descartada: doble bucle O(n²); no cumple los 2 s.
3. **Nivel 2 con índice por monto redondeado a 2 decimales** y, para cada venta, búsqueda del monto bruto y del neto esperado en la ventana `[fecha, fecha + ventana]`. Confirmación solo si candidato único en ambos sentidos **y** `cardLast4` coincide; resto `PROPOSED` con confianza 0,7-0,85 según desfase. Alternativa descartada (la del readme actual): confirmar si es único; en retail los montos repetidos generan falsos positivos (PRD riesgo 1).
4. **Decimal.js en todo el motor** y conversión desde `Prisma.Decimal` en el runner. Alternativa descartada: `number`; 0,1 + 0,2 ≠ 0,3.
5. **Ejecución asíncrona con `setImmediate`/promesa no esperada dentro del proceso** más un candado por conciliación (estado PROCESSING). Alternativa descartada: BullMQ + Redis; infraestructura adicional que el readme §2.1 reserva para cuando el volumen lo exija. La interfaz `ReconciliationRunner.run(id)` permite moverlo a worker sin cambiar la API.
6. **Persistencia en una transacción interactiva de Prisma:** borrar cruces con `method ≠ MANUAL` y `status ≠ CONFIRMED` por acción humana (se conservan MANUAL y los AI/TOLERANCE aceptados por el usuario, identificados por `confirmedById` no nulo), reponer sus transacciones a PENDING, insertar los nuevos cruces y `match_items`, actualizar estados, calcular `stats`, pasar a COMPLETED. Ante excepción, rollback y `FAILED` con `stats.error`.
7. **`stats` como JSON con esquema fijo** (`posCount`, `posTotal`, `bankCount`, `bankTotal`, `matchedByMethod`, `pendingPos`, `pendingBank`, `proposed`, `exceptions`, `matchedPercent`, `totalDifference`, `lastRunAt`, `lastRunBy`, `config`). Alternativa descartada: calcular en cada consulta; el listado necesita el porcentaje barato.
8. **Frontend:** botón "Ejecutar" en el detalle con diálogo de parámetros; al recibir 202 se activa un sondeo cada 2 s de `GET /reconciliations/{id}` hasta COMPLETED o FAILED. Alternativa descartada: WebSockets/SSE; complejidad innecesaria para una espera de segundos.

## Risks / Trade-offs

- [Conciliaciones muy grandes bloquean el event loop] → el motor es O(n) y se mide con 10k × 10k; si el volumen crece, mover a worker (decisión 5).
- [Caída del proceso en mitad de la ejecución deja PROCESSING eterno] → al arrancar la API, las conciliaciones en PROCESSING pasan a FAILED con motivo "interrumpida".
- [Reglas del nivel 2 demasiado estrictas bajan la cobertura] → se reporta la tasa por escenario con el dataset sintético y se ajustan umbrales; la precisión es la métrica principal.
- [Divergencia entre readme §1.2 y la regla adoptada para el nivel 2] → tarea explícita de actualizar el readme.

## Open Questions

- Valores de confianza para propuestas del nivel 2 según desfase (propuesta: 0,85 mismo día, 0,75 ≤ 2 días, 0,7 resto).
- **Datos reales de ejemplo** (`docs/archivos_ejemplo/`): el POS no trae código de autorización ni últimos 4 dígitos (solo `LOTE` tipo `D001004`, `REFERENCIA`, `VALOR TARJETA`) y el extracto Diners sí (`Número de autorización`, `Número Recap o Lote` numérico, `Número vale`). El nivel 1 por autorización no aplica con este POS; validar que las reglas de monto + fecha (+ lote/referencia) alcancen la precisión objetivo y cómo tratar filas por cuota y montos bruto vs neto.
- **Decisión del usuario (2026-10-23):** el cruce debe hacerse por **local + lote + referencia**. Los locales del POS y del banco tienen identificadores distintos; el usuario compartirá una **tabla de relación de locales** entre ambos archivos. Pendiente: modelar esa tabla (por empresa) y definir cómo se comparan lote/referencia, cuyos formatos difieren (POS `D001004`/`000001533` vs banco `1038`/`19733`).

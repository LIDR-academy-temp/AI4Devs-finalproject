---
name: tdd
description: Ciclo red-green-refactor con Vitest para el dominio de Recon Tool 2.0 (validaciones, pareo, fees, summary), usando los expected.json de data/samples como oráculo. Usar al escribir o cambiar lógica de negocio.
---

# TDD en el dominio

- El dominio no importa Prisma ni Fastify. Los tests de dominio corren sin base de datos.
- Oráculos: `data/samples/<caso>/expected.json`. Un test de validación carga las filas del
  archivo de muestra (vía el lector de Excel en modo test o fixtures JSON derivados) y compara
  conteos e IDs afectados con `expected.validations` y `expected.affectedIds`.
- Ciclo: (1) escribe el test más pequeño que describe la regla del README, nómbralo con la
  regla ("missing_previous_to_batch: declinadas antes del rango DEC cuentan como faltantes");
  (2) ejecútalo y comprueba que falla por la aserción, no por un import roto; (3) implementa lo
  mínimo; (4) refactoriza con los tests en verde; (5) rompe el test a propósito una vez
  (cambia un valor esperado) para ver que detecta el error, y restáuralo.
- Dinero: compara strings decimales o `Decimal.equals`, nunca `toBe` sobre floats.
- Fechas: fija la fecha de referencia del dataset (`ANCHOR`, 2026-10-12) con `vi.setSystemTime`.
- Un test por regla y por caso límite listado en README §3.3; no tests que solo repiten la
  implementación. Cobertura mínima en `backend/src/modules/*/domain`: 90 %.
- Integración (con SQL Server efímero vía Testcontainers): solo para repositorios y
  transacciones de base de datos; se etiquetan `@integration` y corren aparte en CI.

# _sdd_evolution.md — Métricas de proceso SDD

Registro acumulativo de todos los requerimientos cerrados en este proyecto.
Generado por `/completar` paso 14. No editar manualmente — es append-only.

---

## Métricas de proceso

| Fecha cierre | TKT | Dominio(s) | Talla | Días spec→cierre | Targets en scope | Auditoría a la 1ª | Ciclos REQUIERE CAMBIOS | Tests T-SQL | Estructura |
|---|---|---|---|---|---|---|---|---|---|
<!-- /completar agrega una fila aquí al archivar cada requerimiento -->
<!-- Ejemplo:
| 2026-07-16 | TKT-14858 | commissions | M | 4 | database,backend | Sí | 0 | 5/5 Passed | estándar |
-->

---

## Tendencias (generado por /retrospectiva)

<!-- /retrospectiva actualiza esta sección con el análisis cross-requerimiento -->

### Dominios más activos

| Dominio | Requerimientos cerrados | Talla promedio | Ciclos promedio |
|---------|-----------------|----------------|-----------------|

### Tipos de requerimiento

| Tipo | Cantidad | % del total |
|------|----------|-------------|

### Patrones de REQUIERE CAMBIOS

| Agente | Veces | Causa más frecuente |
|--------|-------|---------------------|

### Requerimientos que tomaron más de lo esperado (talla vs. días reales)

| TKT | Talla | Días reales | Factor |
|-----|-------|-------------|--------|

---

## Observaciones de evolución (meta-sdd)

Registro de observaciones, patrones y propuestas detectados al cerrar requerimientos.
Generado por `meta-sdd` vía `12_guard_evolucion.mdc`. Máximo 10 propuestas pendientes.

<!-- Formato de cada entrada:
### <id-secuencial>. <título>
- Tipo: observación | patrón | propuesta | aplicada | rechazada
- Tema: <tag de taxonomía cerrada — ver lista abajo>
- Fecha: yyyy-mm-dd
- Requerimientos: TKT-XXXXX, TKT-YYYYY
- Descripción: <qué se observó>
- Acción propuesta: <qué hacer> (si aplica)
- Archivo afectado: <path> (si aplica)
- Estado: OBSERVACIÓN | PATRÓN | PROPUESTA | APROBADA | APLICADA | RECHAZADA
- Motivo rechazo: <texto> (si rechazada)

Taxonomía de Tema (lista cerrada — meta-sdd agrupa por este campo):
sql-harness | sql-snippet | sql-invariante | integration-ole |
csharp-orquestacion | proceso-addendum | proceso-ca-verificable |
mobile-push | mobile-toolchain | mobile-test-seam | frontend-generic
-->

---

## Changelog de /sincronizar

| Fecha | Hallazgos | Tipos detectados |
|-------|-----------|-----------------|
<!-- /sincronizar agrega una fila aquí cada corrida -->
<!-- Ejemplo:
| 2026-07-16 | 3 | FALTANTE, API-SPEC-OBSOLETO, ESTANCADO |
-->

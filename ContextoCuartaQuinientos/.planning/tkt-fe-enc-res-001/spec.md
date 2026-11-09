[← index](_index.md) | [design →](design.md)

# spec.md — FE-ENC-RES-001: Resultados públicos para residentes

## Documentos de entrada

- Requerimiento: encuestas transparentes — ver resultados ([GAPS_MVP_ROADMAP](../GAPS_MVP_ROADMAP.md))
- Técnico: [specs/encuestas.md](../../specs/encuestas.md) HU-ENC-03, `EncuestasController` `GET .../resultados` (solo admin hoy)

## Problema

Los residentes responden en `/encuestas/:id` pero **no pueden ver agregados**. Admin sí en `/admin/encuestas/:id/resultados`. El usuario pide transparencia continua hacia la comunidad.

## Objetivo

Residente que **ya participó** (o encuesta **cerrada** por fecha fin) puede ver **resultados agregados** (conteo/% por opción; texto libre agregado o muestreo según política). Admin conserva la misma vista enriquecida.

## Alcance Must

| ID | Criterio |
|----|----------|
| M-1 | Ruta residente `/encuestas/:id/resultados` reutilizando componente de barras (sin panel admin). |
| M-2 | BE: `GET /ENC/Encuestas/{id}/resultados` autorizado si `(yaParticipo OR FechaFin < hoy)` y encuesta `bActivo=1` o histórica no eliminada; **403** si no respondió y sigue vigente `(asumido: evitar sesgo antes de votar)`. |
| M-3 | Admin sigue accediendo siempre (policy admin bypass en servicio). |
| M-4 | Lista `/encuestas`: enlace “Ver resultados” cuando aplique regla M-2. |
| M-5 | No exponer `UsuarioID` ni respuestas individuales identificables en DTO residente. |

## Should

| ID | Criterio |
|----|----------|
| S-1 | Texto libre: solo conteo total + extractos anonimizados top N `(asumido)` |

## Won't

- Resultados en tiempo real durante votación abierta para quien no ha votado
- Export CSV

## Invariantes

- INV-3 una respuesta por usuario
- INV-7 agregación por `OpcionPreguntaID`

## Criterios de aceptación

- **CA-1 [M]:** Residente responde → puede abrir resultados con % coherentes con admin.
- **CA-2 [M]:** Residente sin responder y encuesta vigente → 403 + mensaje ARB/catálogo.
- **CA-3 [M]:** Tras `FechaFin`, cualquier residente autenticado ve resultados.
- **CA-4 [M]:** Regresión admin resultados sin cambio visual breaking.

## Pasada adversarial

| Riesgo | Mitigación |
|--------|------------|
| Deanonymization por texto libre | Residente DTO sin lista de respuestas textuales crudas; solo agregados |
| Admin bypass olvidado | `esAdmin` flag en servicio |
| Encuesta borrador | `bActivo=0` → 404 para residente |

**Veredicto:** APROBADO tras [design.md](design.md).

## Instancias

| Target | Repo |
|--------|------|
| backend | `GraphApi/` |
| frontend | `Web/` |

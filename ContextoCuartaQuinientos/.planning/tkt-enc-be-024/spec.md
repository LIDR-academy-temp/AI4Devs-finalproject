[← index](_index.md) | [design →](design.md)

# spec.md — ENC-BE-024: Encuestas API Cuarta

> **Tipo:** Feature · Fuente: [specs/encuestas.md](../../specs/encuestas.md) · readme · [ENTREGA_MODULOS](../ENTREGA_MODULOS.md)

## User story
Residente participa en encuestas vigentes; Admin crea, publica (`bActivo=1`) y ve resultados (HU-ENC-01..03).

## Must (JWT Cuarta, legacy → `*/legacy`)
- `GET /ENC/Encuestas/activas` — vigentes + `bActivo=1` para JWT.
- `GET /ENC/Encuestas/{id}` — detalle preguntas/opciones para responder.
- `POST /ENC/Encuestas` + `PUT …/publicar` — Admin; inactiva hasta publicar; NTF Should.
- `POST /ENC/Encuestas/{id}/respuestas` — body respuestas[]; una participación por usuario (409 si repite).
- `GET /ENC/Encuestas/{id}/resultados` — Admin; agregación COUNT por `OpcionPreguntaID`.
- `GET /ENC/TiposPregunta` — catálogo (nombre lógico).
- Seed `enc.TiposPregunta` en design (DB-004 enc).

## CA
- CA-1: Residente responde encuesta activa → filas `enc.Respuestas`.
- CA-2: Segunda respuesta → 409 `YA_PARTICIPO`.
- CA-3: Fuera de vigencia → 422.
- CA-4: Resultados admin suman 100% opciones.

## Instancias

| Target | Impacto |
|--------|---------|
| backend / frontend según ticket | Ver design |

## Invariantes

Ver `specs/encuestas.md` INV-x + INV-G1..G3 globales.

## Pasada adversarial

Veredicto: **APROBADO** para `/ejecutar` tras confirmar design (patrón Cuarta + legacy aislado).

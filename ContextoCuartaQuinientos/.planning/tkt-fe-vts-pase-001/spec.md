[← index](_index.md) | [design →](design.md)

# spec.md — FE-VTS-PASE-001: Pase de visita con QR

## Documentos de entrada

- Requerimiento: generar visita, QR, compartir WhatsApp, validar en caseta; vigencia por fecha/hora ([GAPS_MVP_ROADMAP](../GAPS_MVP_ROADMAP.md))
- Técnico: [specs/visitas-areas.md](../../specs/visitas-areas.md), `vts.VisitasGeneradas`, `Web_diseño` pase QR
- Visual: [ui-referencia-visual.md](../../referencia/ui-referencia-visual.md)

## Problema

La SPA Cuarta tiene bitácora admin (`/admin/visitas`) y reservas (`/areas-comunes`) pero **no** el flujo de **pase pre-registrado** (`VisitasGeneradas` + `CodigoQR` único). Ese flujo existe en `Web_diseño` vía GraphQL legacy, no consumible desde JWT moderno.

## Objetivo

Residente crea un pase en pocos campos, obtiene **código QR** (payload = `CodigoQR`), comparte por **WhatsApp** (enlace `wa.me` con texto); guardia/admin **valida** el código y ve si es válido, expirado o ya usado; opcionalmente registra entrada ligada al pase.

## Alcance Must

| ID | Actor | Criterio |
|----|-------|----------|
| M-1 | Residente | Ruta `/visitas/pases` (o `/mis-visitas`): formulario mínimo (nombre visitante, tipo ID opcional, vigencia inicio/fin). |
| M-2 | Residente | `POST` Cuarta crea fila en `vts.VisitasGeneradas` con `CodigoQR` único (servidor genera), `UsuarioVisitadoID=sub`, `CasaID` de ocupante vigente. |
| M-3 | Residente | Tras crear: muestra QR (imagen) + botón **Compartir WhatsApp** (`https://wa.me/?text=` codificado con código y vigencia). |
| M-4 | Residente | Lista “Mis pases” con estado: vigente / expirado / usado. |
| M-5 | Guardia/Admin | Ruta `/guardia/validar-pase` o sección en visitas: ingresar/pegar `CodigoQR` → respuesta clara **Válido**, **Expirado**, **Ya usado**, **No encontrado**. |
| M-6 | Guardia | Si válido: acción **Registrar entrada** marca `bUsado=1` y opcional `LogUsoVisitas` `(asumido)` o pre-llena `POST VTS/Visitas`. |

## Should

| ID | Criterio |
|----|----------|
| S-1 | Modo “todo el día”: fin = fin del día local si usuario elige tipo “Por día” |
| S-2 | Descargar imagen PNG del QR |

## Won't

- Escaneo con cámara en web (solo mostrar QR + validación manual por código)
- Bot Telegram pase QR (Fase 2 HU-BOT)
- Endpoints `VTS/VisitasGeneradas/legacy`

## Invariantes

- `UQ_vts_VisitasGeneradas_CodigoQR` — unicidad
- Pase ligado a casa del residente (`sgr.CasaOcupantes`)
- Soft delete `bEliminado`

## Criterios de aceptación

- **CA-1 [M]:** Residente crea pase 2h → QR visible → WhatsApp abre con texto legible.
- **CA-2 [M]:** Guardia valida código vigente → “Válido”; tras marcar usado → “Ya usado”.
- **CA-3 [M]:** Código expirado (`FechaExpira < UTC now`) → “Expirado”, no permite segunda entrada.
- **CA-4 [M]:** Otro residente no lista pases ajenos.
- **CA-5 [M]:** Sin uso de GraphQL ni headers legacy en `Web/`.

## Pasada adversarial

| Riesgo | Mitigación |
|--------|------------|
| QR adivinable | Token URL-safe ≥128 bits (GUID sin guiones o `RandomNumberGenerator`) |
| Reloj cliente | Validación siempre server-side UTC |
| WhatsApp sin app | Copiar al portapapeles fallback |
| Reuso concurrente | Transacción al marcar `bUsado` con `WHERE bUsado=0` |

**Veredicto:** APROBADO tras [design.md](design.md).

## Instancias

| Target | Repo |
|--------|------|
| backend | `GraphApi/` |
| frontend | `Web/` |

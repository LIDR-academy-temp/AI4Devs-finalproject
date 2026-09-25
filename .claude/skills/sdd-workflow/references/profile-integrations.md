# Profile: integrations — Sistemas externos

> Plantilla genérica. Para webhooks, terceros, sincronizaciones.

## Sistemas

- <p.ej. Shopify, Stripe, ERP, mensajería>

## Convenciones

- Autenticación con el tercero: <api key / oauth / hmac>
- Idempotencia y reintentos: <estrategia>
- Mapeo de datos: <campos origen → destino>
- Manejo de fallos / DLQ: <patrón>

## Shopify GraphQL

Usar cuando un REQ necesite leer o escribir datos vía Shopify API.

### Patrón de llamada

- Usar el SP/helper centralizado del proyecto para llamadas GraphQL (`@iPIEnvironment`, tamaño de batch configurable).
- No usar OLE Automation directo — delegarlo al helper centralizado.
- Batch máximo recomendado: ajustar según el límite de la API Shopify (revisar `X-Shopify-Shop-Api-Call-Limit`).
- Pasar `@iPIEnvironment` (TEST/PROD) para elegir el endpoint/credencial correcto — no hardcodear.

### Guards obligatorios

- **Idempotencia**: verificar si el recurso ya existe antes de crearlo (ID externo, metafield o campo de control).
- **Error handling**: capturar errores de la respuesta GraphQL (`errors[]`) además de errores HTTP.
- **Reintentos**: no reintentar en loop sin backoff — registrar el fallo y encolar para retry manual o DLQ.

### Qué debe especificar design.md

- SP/helper a utilizar con su firma completa.
- Tamaño de batch y justificación.
- Estrategia de idempotencia (qué campo identifica unicidad).
- Plan de pruebas: ambiente sandbox/TEST, payload de ejemplo, respuesta esperada.
- Rollback: qué ocurre si la llamada falla a mitad del batch.

### Pitfalls comunes

- **Credencial hardcodeada:** nunca embeber tokens Shopify en el SP — deben venir de tabla de configuración o secret store del proyecto.
- **Ignorar `errors[]` en respuesta 200:** Shopify devuelve HTTP 200 con errores internos en `errors[]` — siempre validar el cuerpo.
- **Batch sin límite verificado:** verificar el límite real del plan Shopify antes de fijar el tamaño de batch en producción.

## Qué debe especificar design.md para este target

- Eventos/webhooks a consumir o emitir.
- Contratos de payload (entrada/salida).
- Puntos de fallo y rollback/compensación.
- Plan de pruebas (mocks del tercero, sandbox).

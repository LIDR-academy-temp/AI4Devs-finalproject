# Spec Delta

## MODIFIED Requirements

### Requirement: Métodos de firma disponibles
El widget SHALL mostrar la tarjeta «Firma propia» con el aviso de que es una firma electrónica sin la presunción legal de la firma digital. Para solicitudes `pending` con `provider` = `local`, el botón «Firmar» MUST estar habilitado e iniciar `prepare` seguido de `complete` con el mismo `X-Signing-Token`.

#### Scenario: Firma propia con proveedor local
- **WHEN** el documento se muestra para una solicitud `pending` con `provider` = `local`
- **THEN** se ve la tarjeta «Firma propia» con su aviso legal y el botón «Firmar» habilitado
- **AND** al confirmar, el widget llama a `prepare` y luego a `complete` sin pedir certificado ni PIN

#### Scenario: Firma propia todavía no disponible
- **WHEN** el documento se muestra para una solicitud `pending` con `provider` distinto de `local` (por ejemplo `token` antes del hito 2)
- **THEN** se ve la tarjeta «Firma propia» con su aviso legal y el botón «Firmar» deshabilitado con texto que indica que aún no está disponible ese proveedor
- **AND** el widget no llama a `prepare` ni a `complete`

#### Scenario: Solicitud ya firmada
- **WHEN** se abre el enlace de una solicitud con `status` = `signed`
- **THEN** el widget muestra «Documento firmado» y no ofrece métodos de firma

## ADDED Requirements

### Requirement: Estados del flujo de firma propia
Durante la firma con proveedor `local`, el widget SHALL mostrar estados comprensibles (`preparando`, `firmando`, `firmado` o `error`) y MUST impedir un segundo clic mientras la operación está en curso.

#### Scenario: Flujo feliz
- **WHEN** el usuario pulsa «Firmar» y la API responde correctamente
- **THEN** el widget muestra progreso y termina en «Documento firmado» con opción de descargar la versión firmada

#### Scenario: Error en prepare
- **WHEN** `prepare` responde `409` o `5xx`
- **THEN** el widget muestra un mensaje de error en lenguaje claro y permite reintentar

#### Scenario: Error en complete
- **WHEN** `complete` responde `409` tras un prepare válido
- **THEN** el widget informa que el plazo expiró o el desafío ya no es válido y permite reintentar desde «Firmar»

### Requirement: Aviso al sistema host al firmar
Al pasar a `signed` con éxito, el widget SHALL enviar `postMessage` a la ventana padre con `{ type: "firmadoc:signed", document }` usando el bloque `document` de la respuesta de `complete`, restringido al origen del widget.

#### Scenario: Widget embebido en iframe
- **WHEN** la firma termina dentro de un iframe del panel
- **THEN** la ventana padre recibe el mensaje `firmadoc:signed` con `version_number` = 2
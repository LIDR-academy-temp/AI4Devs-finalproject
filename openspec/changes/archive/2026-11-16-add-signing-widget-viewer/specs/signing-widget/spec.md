# Spec Delta

## Purpose

Define lo que ve y puede hacer quien abre una `signing_url`, ya sea en una pestaña o embebida por iframe: cómo se usa la credencial del enlace, qué datos del documento se muestran, qué métodos de firma se ofrecen y qué mensajes recibe ante un error.

## ADDED Requirements

### Requirement: Credencial del enlace de firma
El widget SHALL servirse en `/sign/{request_id}` y tomar el token del fragmento `#t=` de la URL. Lo envía como `X-Signing-Token` en cada llamada a la API y MUST quitar el fragmento de la barra de direcciones apenas lo lee. Un `request_id` o un token ausentes MUST mostrar un error sin llamar a la API.

#### Scenario: Enlace completo
- **WHEN** se abre `/sign/{request_id}#t={token}`
- **THEN** el widget consulta la solicitud enviando `X-Signing-Token: {token}`
- **AND** la barra de direcciones queda en `/sign/{request_id}`, sin el fragmento

#### Scenario: Enlace sin token
- **WHEN** se abre `/sign/{request_id}` sin el fragmento `#t=`
- **THEN** el widget muestra «El enlace de firma está incompleto» y no llama a la API

#### Scenario: Recarga de la página
- **WHEN** después de abrir un enlace completo se recarga la misma pestaña
- **THEN** el widget sigue mostrando el documento sin pedir el enlace de nuevo

### Requirement: Datos y vista previa del documento
El widget SHALL mostrar el nombre del archivo, la cantidad de páginas, el tamaño legible (por ejemplo, `245 KB` o `1,2 MB`) y el estado de la solicitud. También muestra una vista previa de la primera página, a partir del PDF descargado con la credencial del enlace.

#### Scenario: Documento pendiente
- **WHEN** se abre el enlace de una solicitud `pending` de un PDF de 3 páginas llamado `resolucion.pdf`
- **THEN** se ven `resolucion.pdf`, «3 páginas», su tamaño y el estado «Pendiente de firma»
- **AND** se ve la vista previa de la primera página

#### Scenario: PDF que no se puede mostrar
- **WHEN** la vista previa no se puede generar a partir del PDF descargado
- **THEN** el widget sigue mostrando nombre, tamaño y estado, e indica «No se pudo generar la vista previa»

### Requirement: Métodos de firma disponibles
El widget SHALL mostrar la tarjeta «Firma propia» con el aviso de que es una firma electrónica sin la presunción legal de la firma digital. Mientras la firma no esté disponible en el servidor, su acción MUST estar deshabilitada e indicarlo, sin llamar a `prepare` ni a `complete`.

#### Scenario: Firma propia todavía no disponible
- **WHEN** el documento se muestra para una solicitud `pending` con proveedor `local`
- **THEN** se ve la tarjeta «Firma propia» con su aviso legal y el botón «Firmar» deshabilitado con el texto «Disponible próximamente»

#### Scenario: Solicitud ya firmada
- **WHEN** se abre el enlace de una solicitud con `status` = `signed`
- **THEN** el widget muestra «Documento firmado» y no ofrece métodos de firma

### Requirement: Mensajes de error comprensibles
Ante una respuesta de error o una falla de red, el widget SHALL mostrar un mensaje en lenguaje claro según la causa, sin datos técnicos ni el token.

#### Scenario: Enlace vencido o inválido
- **WHEN** la API responde `401` a la consulta de la solicitud
- **THEN** el widget muestra «El enlace de firma venció o no es válido. Pedí uno nuevo.»

#### Scenario: Solicitud inexistente
- **WHEN** la API responde `404`
- **THEN** el widget muestra «No encontramos la solicitud de firma.»

#### Scenario: API no disponible
- **WHEN** la llamada a la API falla por red o la API responde `5xx`
- **THEN** el widget muestra «No pudimos conectar con Firmadoc. Intentá de nuevo en unos minutos.» y un botón «Reintentar»

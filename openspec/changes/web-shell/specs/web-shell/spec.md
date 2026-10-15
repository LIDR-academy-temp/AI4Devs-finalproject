## Purpose

Comportamiento de la aplicación web común a todas las pantallas de Recon Tool: sesión en el navegador (login, renovación y expiración de tokens, logout), guardas de ruta por sesión y por permiso, layout con navegación filtrada por el rol e identidad del usuario. README §1.3, §2.2 y §2.5.

## ADDED Requirements

### Requirement: Acceso sin sesión
Toda ruta de la aplicación salvo Login SHALL exigir una sesión. Sin sesión, la aplicación SHALL llevar a Login conservando la ruta pedida (ruta y parámetros) para volver a ella tras entrar. Una sesión es un refresh token vigente; al recargar la página la aplicación SHALL intentar recuperarla con `POST /auth/refresh` antes de decidir.

#### Scenario: Ruta protegida sin sesión
- **GIVEN** un navegador sin sesión
- **WHEN** abre `/accounts?merchantId=1&providerId=101`
- **THEN** ve la pantalla Login y la dirección conserva la ruta pedida como destino de vuelta
- **AND** no se ha llamado a ninguna ruta protegida del API

#### Scenario: Recarga con sesión vigente
- **GIVEN** `analyst` con sesión iniciada en esta pestaña
- **WHEN** recarga la página en `/accounts`
- **THEN** la aplicación renueva el par con `POST /auth/refresh`, sigue en `/accounts` y no muestra Login

#### Scenario: Login con sesión ya iniciada
- **GIVEN** `analyst` con sesión iniciada
- **WHEN** abre `/login`
- **THEN** la aplicación lo lleva a Dashboard

### Requirement: Inicio de sesión
La pantalla Login SHALL pedir **User name** y **Password**, validarlos en el cliente con las mismas reglas que el API (ambos obligatorios, longitudes máximas de `LoginRequest`) sin llamar al API si no pasan, y con credenciales aceptadas SHALL llevar a la ruta de vuelta o, si no hay, a Dashboard.

#### Scenario: Credenciales del seed
- **GIVEN** el usuario sembrado `analyst` con la contraseña `SEED_PASSWORD`
- **WHEN** las introduce en Login y pulsa **Sign in**
- **THEN** llega a Dashboard y el layout muestra su nombre `Analyst` y su rol `analyst`

#### Scenario: Vuelta a la ruta pedida
- **GIVEN** que llegó a Login desde `/accounts?merchantId=1&providerId=101`
- **WHEN** entra con credenciales válidas
- **THEN** termina en `/accounts?merchantId=1&providerId=101`

#### Scenario: Campos vacíos
- **WHEN** pulsa **Sign in** con el campo User name vacío
- **THEN** ve un mensaje de campo obligatorio junto a User name, el foco va a ese campo y no se envía ninguna petición al API

#### Scenario: Envío en curso
- **WHEN** pulsa **Sign in** con los dos campos rellenos
- **THEN** el botón queda deshabilitado hasta que llega la respuesta, de modo que un segundo clic no envía otra petición

### Requirement: Error de credenciales genérico
Ante un `401` de `POST /auth/login` la pantalla SHALL mostrar siempre el mismo mensaje, `Invalid user name or password`, sin distinguir usuario inexistente, inactivo o contraseña errónea, SHALL vaciar el campo Password y conservar User name. Un fallo de red o un `5xx` SHALL mostrar un mensaje distinto que no culpe a las credenciales.

#### Scenario: Contraseña incorrecta
- **WHEN** `viewer` entra con una contraseña errónea
- **THEN** ve `Invalid user name or password`, el campo Password queda vacío y User name conserva `viewer`

#### Scenario: Usuario inactivo
- **WHEN** un usuario inactivo entra con su contraseña correcta
- **THEN** ve exactamente el mismo mensaje que con una contraseña errónea

#### Scenario: Servidor inalcanzable
- **WHEN** el API no responde o responde `500` al login
- **THEN** ve `Cannot reach the server. Try again in a moment.` y no el mensaje de credenciales

### Requirement: Renovación transparente de la sesión
Cuando una petición autenticada recibe `401`, la aplicación SHALL renovar el par con `POST /auth/refresh` y repetir la petición una sola vez, sin que el usuario lo note. Si varias peticiones reciben `401` a la vez, SHALL hacerse un único refresh y todas SHALL repetirse con el token nuevo.

#### Scenario: Access token caducado
- **GIVEN** una sesión cuyo access token ya no es válido y cuyo refresh sí lo es
- **WHEN** abre Accounts
- **THEN** la pantalla carga sus datos sin mostrar error ni volver a Login, tras exactamente una llamada a `POST /auth/refresh`

#### Scenario: Varias peticiones caducadas a la vez
- **GIVEN** la misma sesión
- **WHEN** la pantalla lanza tres peticiones en paralelo y las tres reciben `401`
- **THEN** se hace exactamente un `POST /auth/refresh` y las tres peticiones se repiten con el access token nuevo

### Requirement: Expiración de la sesión
Si el refresh responde `401`, o la petición repetida vuelve a recibir `401`, la aplicación SHALL descartar los tokens y los datos cacheados, y llevar a Login con la ruta actual como destino de vuelta y el aviso `Your session has expired. Please sign in again.`

#### Scenario: Refresh caducado o revocado
- **GIVEN** una sesión cuyo refresh token ya fue revocado
- **WHEN** una petición autenticada recibe `401`
- **THEN** el usuario ve Login con el aviso de sesión expirada, sin entrar en un bucle de refrescos
- **AND** al volver a entrar termina en la pantalla donde estaba

### Requirement: Cierre de sesión
**Sign out** SHALL llamar a `POST /auth/logout` con el refresh token, descartar tokens y datos cacheados aunque esa llamada falle, y llevar a Login. Tras cerrar sesión, volver atrás en el navegador SHALL no mostrar datos de la sesión anterior.

#### Scenario: Sign out
- **GIVEN** `analyst` con sesión en Accounts
- **WHEN** pulsa **Sign out**
- **THEN** se llama a `POST /auth/logout`, ve Login y, al pulsar Atrás en el navegador, sigue en Login

#### Scenario: Logout con el servidor caído
- **WHEN** pulsa **Sign out** y `POST /auth/logout` falla por red
- **THEN** igualmente ve Login y la recarga de la página no recupera la sesión

### Requirement: Almacenamiento de los tokens
El access token SHALL vivir solo en memoria. El refresh token SHALL guardarse en el almacenamiento de la pestaña (se pierde al cerrarla) y SHALL borrarse al cerrar sesión o al expirar. Ningún token SHALL aparecer en la URL ni en los registros de la consola.

#### Scenario: Pestaña nueva
- **GIVEN** `analyst` con sesión en una pestaña
- **WHEN** abre la aplicación en otra pestaña
- **THEN** la nueva pestaña muestra Login; la primera sigue con su sesión

#### Scenario: Tras cerrar sesión
- **WHEN** `analyst` cierra sesión
- **THEN** ni la memoria de la aplicación ni el almacenamiento de la pestaña conservan access ni refresh token

### Requirement: Navegación filtrada por permisos
La barra lateral SHALL mostrar el mapa de pantallas MVP de README §1.3 en sus grupos (Reconciliation, Settlements, Search, Reports, Administration), y SHALL ocultar cada entrada cuyo permiso requerido no tenga el rol; un grupo sin entradas visibles SHALL ocultarse. Las entradas aún no construidas SHALL mostrarse deshabilitadas, no como enlaces.

#### Scenario: viewer
- **GIVEN** el usuario `viewer` (permisos `fee.view`, `reports.view`)
- **WHEN** entra
- **THEN** no ve el grupo Reconciliation (New Reconciliation, In Progress) ni la entrada Payments, ni Users & Roles ni Audit Log
- **AND** ve Dashboard y Administration › Accounts como enlaces

#### Scenario: analyst
- **GIVEN** el usuario `analyst` (`settlement.process`, `fee.view`, `reports.view`)
- **WHEN** entra
- **THEN** ve New Reconciliation e In Progress (deshabilitadas mientras no existan) y no ve Payments ni Users & Roles

#### Scenario: admin
- **GIVEN** el usuario `admin` (los siete permisos)
- **WHEN** entra
- **THEN** ve todas las entradas MVP de §1.3; solo Dashboard y Accounts son enlaces en este tramo

#### Scenario: Entrada deshabilitada
- **WHEN** un usuario pulsa una entrada aún no construida
- **THEN** no cambia de ruta y la entrada se anuncia como no disponible a los lectores de pantalla

### Requirement: Guarda de ruta por permiso
Una ruta que requiera un permiso SHALL mostrar, dentro del layout, la página `You don't have access to this page` a un usuario cuyo rol no lo tenga, sin llamar a los endpoints de esa pantalla. La guarda SHALL ser solo de presentación: el API sigue respondiendo `403` por su cuenta.

#### Scenario: Acceso directo por URL sin permiso
- **GIVEN** una ruta que requiere `settlement.process`
- **WHEN** `viewer` escribe su dirección en el navegador
- **THEN** ve `You don't have access to this page` con la barra lateral y un enlace a Dashboard, y no se llama a ningún endpoint de esa pantalla

#### Scenario: Acceso con permiso
- **GIVEN** la misma ruta
- **WHEN** la abre `analyst`
- **THEN** ve la pantalla normalmente

### Requirement: Identidad visible
El layout SHALL mostrar en todo momento el nombre (`displayName`) y el rol del usuario, los merchants visibles (`All merchants` si su alcance es `all`) y el botón **Sign out**, tomados de `GET /auth/me`.

#### Scenario: Alcance asignado
- **WHEN** `analyst` entra
- **THEN** la cabecera muestra `Analyst`, `analyst` y `Merchant A, Merchant B`

#### Scenario: Alcance total
- **WHEN** `admin` entra
- **THEN** la cabecera muestra `Admin`, `admin` y `All merchants`

### Requirement: Migas de pan y Dashboard
Cada pantalla del layout SHALL mostrar migas de pan con su posición en el mapa (p. ej. `Dashboard › Administration › Accounts`, con Dashboard como enlace). Dashboard SHALL existir como pantalla de llegada tras el login, con su título y un estado vacío mientras no tenga widgets.

#### Scenario: Migas en Accounts
- **WHEN** `viewer` abre Accounts
- **THEN** ve `Dashboard › Administration › Accounts` y `Dashboard` lleva a la pantalla de llegada

#### Scenario: Ruta desconocida
- **WHEN** un usuario con sesión abre `/does-not-exist`
- **THEN** ve dentro del layout `Page not found` con un enlace a Dashboard

### Requirement: Textos de interfaz en inglés y centralizados
Todos los textos visibles SHALL estar en inglés y definirse en un único módulo de textos por pantalla (y uno para el layout); los componentes SHALL no contener literales de texto visibles. Los nombres de pantallas y menús SHALL ser los de README §1.3.

#### Scenario: Revisión de textos
- **WHEN** se revisan los componentes de Login, layout y Accounts
- **THEN** cada texto visible sale del módulo de textos de su pantalla y está en inglés

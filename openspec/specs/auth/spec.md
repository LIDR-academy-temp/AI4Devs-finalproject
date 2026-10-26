# auth Specification

## Purpose
Controla quién accede a Concilia y garantiza que cada usuario vea y modifique únicamente los datos de su propia empresa.

## Requirements

### Requirement: Inicio de sesión con correo y contraseña
El sistema SHALL permitir a un usuario activo iniciar sesión con su correo y contraseña y devolverle un token de acceso de corta duración junto con sus datos básicos (nombre, correo, rol, empresa).

#### Scenario: Credenciales correctas
- **WHEN** un usuario activo envía correo y contraseña válidos
- **THEN** recibe un token de acceso y es redirigido al listado de conciliaciones

#### Scenario: Usuario inactivo
- **WHEN** un usuario marcado como inactivo envía credenciales válidas
- **THEN** el acceso se rechaza con el mismo mensaje genérico que unas credenciales incorrectas

### Requirement: Mensaje genérico ante error de autenticación
El sistema SHALL responder a cualquier fallo de autenticación con un único mensaje genérico que no revele si el correo existe ni cuál de los dos datos es incorrecto.

#### Scenario: Correo inexistente
- **WHEN** se envía un correo que no está registrado
- **THEN** la respuesta es idéntica en código y mensaje a la de una contraseña incorrecta

#### Scenario: Contraseña incorrecta
- **WHEN** se envía un correo registrado con una contraseña incorrecta
- **THEN** la respuesta es idéntica en código y mensaje a la de un correo inexistente

### Requirement: Almacenamiento seguro de contraseñas
El sistema MUST almacenar las contraseñas únicamente como hash con sal mediante un algoritmo lento adecuado para contraseñas; nunca en texto plano ni con hash reversible.

#### Scenario: Inspección de la base de datos
- **WHEN** se consulta la columna de contraseña de cualquier usuario
- **THEN** el valor es un hash del que no puede recuperarse la contraseña original

### Requirement: Acceso protegido por token
Toda operación de la API distinta del inicio de sesión SHALL requerir un token válido y no expirado; sin él se rechaza la petición sin ejecutar lógica de negocio.

#### Scenario: Petición sin token
- **WHEN** se solicita cualquier recurso protegido sin token
- **THEN** la petición se rechaza como no autenticada

#### Scenario: Token expirado o manipulado
- **WHEN** se envía un token caducado o cuya firma no es válida
- **THEN** la petición se rechaza como no autenticada y el frontend redirige al login

#### Scenario: Consulta del usuario autenticado
- **WHEN** un usuario con token válido consulta su propia información
- **THEN** recibe nombre, correo, rol y empresa sin exponer el hash de contraseña

### Requirement: Aislamiento de datos por empresa
El sistema MUST determinar la empresa del usuario exclusivamente a partir del token y filtrar por ella toda lectura y escritura de datos; cualquier identificador de empresa enviado por el cliente SHALL ignorarse.

#### Scenario: Recurso de otra empresa
- **WHEN** un usuario autenticado solicita por identificador un recurso que pertenece a otra empresa
- **THEN** la respuesta es la misma que si el recurso no existiera

#### Scenario: Listados
- **WHEN** un usuario autenticado consulta cualquier listado
- **THEN** solo aparecen registros de su empresa aunque existan registros de otras

#### Scenario: Identificador de empresa en la petición
- **WHEN** el cliente incluye un identificador de empresa distinto al del token en el cuerpo o la consulta
- **THEN** el sistema lo ignora y opera sobre la empresa del token

### Requirement: Autorización por rol
El sistema SHALL distinguir los roles ADMIN y ANALYST y rechazar las operaciones reservadas a ADMIN cuando las intente un ANALYST.

#### Scenario: Operación reservada
- **WHEN** un usuario con rol ANALYST invoca una operación marcada como exclusiva de ADMIN
- **THEN** la petición se rechaza como no autorizada

### Requirement: Límite de intentos de inicio de sesión
El sistema SHALL limitar el número de intentos de inicio de sesión por origen en una ventana de tiempo y rechazar temporalmente los excedentes.

#### Scenario: Exceso de intentos
- **WHEN** un mismo origen supera el límite configurado de intentos fallidos en la ventana
- **THEN** los siguientes intentos se rechazan con una respuesta de demasiadas peticiones hasta que expire la ventana

### Requirement: Cierre de sesión en el cliente
El frontend SHALL permitir cerrar sesión descartando el token almacenado y volviendo a la pantalla de login.

#### Scenario: Cerrar sesión
- **WHEN** el usuario pulsa cerrar sesión
- **THEN** el token deja de enviarse en las peticiones y se muestra la pantalla de login

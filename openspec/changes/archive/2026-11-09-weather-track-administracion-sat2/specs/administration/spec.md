# Spec Delta

## Purpose

Permite que un administrador de Weather Track gestione la conexión con SAT2 desde la aplicación, sin entrar al servidor, y sin que el resto de las cuentas vea ni alcance esa opción.

## ADDED Requirements

### Requirement: Rol de administrador desde el servidor

El sistema SHALL otorgar y quitar el rol de administrador solo con un comando de la línea de comandos del servidor, y solo a una cuenta activa y confirmada. Ninguna ruta de la API ni pantalla MUST permitir otorgar, quitar ni modificar ese rol.

#### Scenario: Otorgar el rol

- **WHEN** quien opera el servidor ejecuta `hacer-administrador` con el correo de una cuenta activa y confirmada
- **THEN** la cuenta pasa a ser administradora y lo ve al ingresar de nuevo

#### Scenario: Cuenta sin confirmar

- **WHEN** quien opera el servidor ejecuta `hacer-administrador` con el correo de una cuenta sin confirmar
- **THEN** el comando falla con un mensaje claro y la cuenta no cambia

#### Scenario: Intento desde la web

- **WHEN** una cuenta envía el campo `es_administrador` al actualizar sus datos
- **THEN** el campo se ignora y la cuenta no cambia de rol

### Requirement: Opción invisible para el resto de las cuentas

El sistema SHALL mostrar la opción «Administración» solo a las cuentas administradoras. Para cualquier otra cuenta, y para pedidos sin sesión, las rutas de administración de la API MUST responder igual que una ruta inexistente (404), y la pantalla de administración MUST mostrar lo mismo que una página inexistente.

#### Scenario: Cuenta común

- **WHEN** una cuenta sin el rol ingresa a la aplicación
- **THEN** no ve la opción «Administración» en ningún lugar

#### Scenario: Ruta pedida a mano

- **WHEN** una cuenta sin el rol, o un pedido sin sesión, consulta una ruta de administración de la API
- **THEN** recibe la misma respuesta 404 que una ruta inexistente

#### Scenario: Administrador

- **WHEN** una cuenta administradora ingresa a la aplicación
- **THEN** ve la opción «Administración» en el encabezado

### Requirement: Configuración de SAT2 desde la aplicación

El sistema SHALL permitir que el administrador cargue la URL, el usuario y la contraseña de SAT2, y MUST conservarlos hasta que un administrador los reemplace. La pantalla SHALL mostrar si hay una configuración guardada, cuándo y quién la cargó, el modo de datos y el resultado del último ciclo de ingesta. Sin configuración guardada, SHALL indicar que la ingesta usa las variables del servidor. La pantalla MUST NOT mostrar la URL, el usuario ni la contraseña guardados.

#### Scenario: Primera carga

- **WHEN** el administrador guarda una URL, un usuario y una contraseña válidos
- **THEN** la pantalla indica que hay una configuración guardada, con la fecha y su autor

#### Scenario: Reemplazo

- **WHEN** el administrador guarda una configuración nueva
- **THEN** reemplaza la anterior por completo y la ingesta la usa desde el ciclo siguiente, sin reiniciar

#### Scenario: Campos inválidos

- **WHEN** el administrador deja un campo vacío o escribe una URL que no empieza con `http://` o `https://`
- **THEN** recibe un error en ese campo y no se guarda nada

#### Scenario: URL sin cifrado

- **WHEN** el administrador escribe una URL con `http://`
- **THEN** la pantalla advierte que las credenciales viajarían sin cifrar hasta SAT2

### Requirement: Credenciales cifradas que la API no puede leer

El sistema MUST guardar la configuración de SAT2 cifrada con una clave pública, de modo que solo el proceso de ingesta, con la clave privada, pueda descifrarla. La API MUST NOT tener la clave privada, y ninguna respuesta, registro ni correo MUST incluir la URL, el usuario ni la contraseña de SAT2.

#### Scenario: Copia de la base

- **WHEN** alguien obtiene una copia de la base sin la clave privada
- **THEN** no puede leer la URL, el usuario ni la contraseña de SAT2

#### Scenario: Consulta de la configuración

- **WHEN** el administrador consulta la configuración desde la API
- **THEN** la respuesta no contiene la URL, el usuario ni la contraseña

#### Scenario: Falta la clave pública

- **WHEN** la API arranca sin la clave pública y el administrador abre la pantalla
- **THEN** la pantalla informa que falta configurar el servidor y no permite guardar

### Requirement: Confirmación con la contraseña del administrador

Para guardar la configuración de SAT2, el sistema MUST pedir la contraseña de Weather Track del administrador, aunque tenga la sesión abierta. Una contraseña incorrecta MUST contar como intento fallido de ingreso a esa cuenta.

#### Scenario: Contraseña correcta

- **WHEN** el administrador guarda con su contraseña correcta
- **THEN** la configuración se guarda

#### Scenario: Contraseña incorrecta

- **WHEN** el administrador guarda con una contraseña incorrecta
- **THEN** no se guarda nada, recibe un error en el campo de la contraseña y el intento cuenta para el bloqueo de la cuenta

### Requirement: Aviso y registro de cada cambio

Cada vez que se guarda la configuración de SAT2, el sistema SHALL enviar un aviso por correo a cada administrador activo y SHALL agregar al registro de cambios la fecha y el correo de quien la guardó. Ni el aviso ni el registro MUST incluir los valores de la configuración.

#### Scenario: Cambio guardado

- **WHEN** un administrador guarda una configuración nueva
- **THEN** cada administrador activo recibe un aviso con la fecha y el autor, y el registro suma esa entrada

#### Scenario: Registro en pantalla

- **WHEN** el administrador abre la pantalla
- **THEN** ve los últimos 10 cambios, con su fecha y su autor

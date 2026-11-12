# account-lifecycle Specification

## Purpose
Permite que una persona cree su propia cuenta de Weather Track, la confirme por correo, la administre y la dé de baja, y que el sistema borre las cuentas que no se confirman o se dan de baja.

## Requirements

### Requirement: Registro público

El sistema SHALL permitir que cualquier persona cree una cuenta con nombre, apellido, correo, contraseña, localidad y provincia, y opcionalmente organización y teléfono, aceptando los términos y la política de privacidad. La cuenta queda sin confirmar y el sistema envía un correo de confirmación.

#### Scenario: Registro válido

- **WHEN** una persona completa el formulario con datos válidos y acepta los términos
- **THEN** el sistema crea una cuenta sin confirmar, envía el correo de confirmación y muestra un aviso para revisar el correo

#### Scenario: Términos no aceptados

- **WHEN** una persona envía el formulario sin aceptar los términos y la política de privacidad
- **THEN** el sistema no crea la cuenta y señala el campo pendiente

#### Scenario: Pantalla de acceso

- **WHEN** una persona sin cuenta abre la aplicación
- **THEN** encuentra una opción para registrarse

### Requirement: Repetición de la contraseña

La pantalla SHALL pedir dos veces la contraseña nueva al registrarse, al cambiarla desde "Mi cuenta" y al elegirla con el enlace de recupero, y MUST NOT enviar el formulario si las dos no coinciden. La API recibe la contraseña una sola vez.

#### Scenario: Contraseñas distintas

- **WHEN** la persona escribe dos contraseñas distintas en el registro
- **THEN** la pantalla señala el campo de repetición y no envía el formulario

#### Scenario: Contraseñas iguales

- **WHEN** la persona escribe la misma contraseña en los dos campos y el resto de los datos es válido
- **THEN** la pantalla envía el formulario

### Requirement: Registro sin revelar correos existentes

El sistema MUST responder al registro con el mismo mensaje y estado tanto si el correo es nuevo como si ya pertenece a una cuenta. Si ya pertenece a una cuenta confirmada, MUST enviar a ese correo un aviso con el enlace para recuperar la contraseña, sin modificar la cuenta.

#### Scenario: Correo ya confirmado

- **WHEN** alguien se registra con el correo de una cuenta confirmada
- **THEN** recibe la misma respuesta que un registro nuevo, la cuenta no cambia y el titular recibe un aviso

#### Scenario: Correo sin confirmar

- **WHEN** alguien se registra de nuevo con el correo de una cuenta sin confirmar
- **THEN** recibe la misma respuesta, los datos de la cuenta se reemplazan por los nuevos y se envía un enlace de confirmación nuevo que invalida el anterior

### Requirement: Política de contraseñas

El sistema MUST exigir contraseñas de 15 a 128 caracteres, sin reglas de composición, y MUST rechazar las que figuren en una lista de contraseñas comunes o contengan el correo de la cuenta. Aplica al registro, al recupero y al cambio de contraseña.

#### Scenario: Contraseña corta

- **WHEN** una persona elige una contraseña de 14 caracteres
- **THEN** el sistema la rechaza e indica el mínimo

#### Scenario: Contraseña común

- **WHEN** una persona elige una contraseña de la lista de contraseñas comunes
- **THEN** el sistema la rechaza sin revelar la lista

#### Scenario: Frase larga

- **WHEN** una persona elige una frase de 40 caracteres con espacios y sin números ni símbolos
- **THEN** el sistema la acepta

### Requirement: Confirmación por correo

El sistema SHALL confirmar la cuenta cuando su titular usa el enlace de confirmación dentro de las 48 horas de su envío. El enlace MUST ser de un solo uso. Una cuenta sin confirmar MUST NOT poder iniciar sesión.

#### Scenario: Enlace vigente

- **WHEN** el titular usa el enlace de confirmación dentro de las 48 horas
- **THEN** la cuenta queda confirmada y la persona puede iniciar sesión

#### Scenario: Enlace usado o vencido

- **WHEN** alguien usa un enlace de confirmación ya usado, vencido o inexistente
- **THEN** el sistema responde que el enlace no es válido, sin indicar a qué cuenta pertenecía

### Requirement: Borrado de cuentas sin confirmar

El sistema MUST borrar de la base, con todos sus datos, las cuentas que siguen sin confirmar 48 horas después del último enlace de confirmación enviado.

#### Scenario: Plazo vencido

- **WHEN** pasan más de 48 horas desde el último enlace de confirmación de una cuenta sin confirmar
- **THEN** la cuenta y sus datos ya no existen en la base, y el correo puede volver a registrarse

### Requirement: Baja desde el correo

El sistema SHALL incluir en cada correo que envía un enlace para darse de baja. Al usarlo, MUST pedir una confirmación explícita y, una vez confirmada, MUST borrar la cuenta con todos sus datos y cerrar sus sesiones. Abrir el enlace sin confirmar MUST NOT borrar nada.

#### Scenario: Baja confirmada

- **WHEN** el titular abre el enlace de baja de un correo y confirma
- **THEN** la cuenta y sus datos se borran, sus sesiones dejan de valer y se muestra un aviso de baja realizada

#### Scenario: Enlace abierto por un analizador de correo

- **WHEN** un programa abre el enlace de baja sin confirmar
- **THEN** la cuenta no cambia

#### Scenario: Baja de una cuenta sin confirmar

- **WHEN** el titular de una cuenta sin confirmar usa el enlace de baja del correo de confirmación y confirma
- **THEN** la cuenta se borra

### Requirement: Autogestión de la cuenta

El sistema SHALL permitir que la persona con sesión consulte y modifique su nombre, apellido, organización, teléfono, localidad, provincia y preferencia de novedades. El correo no se puede modificar.

#### Scenario: Editar datos

- **WHEN** la persona con sesión cambia su localidad y guarda
- **THEN** el sistema guarda el cambio y lo muestra en "Mi cuenta"

### Requirement: Cambio de contraseña con sesión

El sistema SHALL permitir cambiar la contraseña con sesión iniciada solo si la persona ingresa la contraseña actual. Al cambiarla, MUST cerrar todas las demás sesiones de la cuenta y enviar un aviso al correo.

#### Scenario: Contraseña actual correcta

- **WHEN** la persona ingresa su contraseña actual y una nueva válida
- **THEN** la contraseña cambia, las demás sesiones dejan de valer y llega un aviso al correo

#### Scenario: Contraseña actual incorrecta

- **WHEN** la persona ingresa una contraseña actual incorrecta
- **THEN** la contraseña no cambia

### Requirement: Baja desde la aplicación

El sistema SHALL permitir que la persona con sesión borre su cuenta ingresando su contraseña. El borrado MUST eliminar todos los datos de la cuenta y cerrar todas sus sesiones.

#### Scenario: Baja con contraseña

- **WHEN** la persona con sesión pide la baja e ingresa su contraseña correcta
- **THEN** la cuenta y sus datos se borran y la aplicación vuelve a la pantalla de acceso

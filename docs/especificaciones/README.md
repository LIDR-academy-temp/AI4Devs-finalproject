# Especificaciones de Weather Track

> Este archivo se genera desde `openspec/specs` y no se edita a mano.
> Para regenerarlo, desde `backend/`: `uv run python -m herramientas.documentar_especificaciones`.

Qué hace Weather Track, según sus especificaciones de OpenSpec: 15 capacidades, 106 requisitos y 228 escenarios. Cada capacidad enlaza su especificación, donde están los escenarios completos, y el último cambio archivado que la modificó.

## Índice

| Capacidad | Propósito | Requisitos | Escenarios | Último cambio archivado |
|---|---|---|---|---|
| [account-access](#account-access) | Permite que solo las personas con una cuenta activa de Weather Track ingresen al sistema y consulten únicamente las estaciones que tienen asignadas. | 7 | 15 | [weather-track-registro-cuentas](../../openspec/changes/archive/2026-11-05-weather-track-registro-cuentas/proposal.md), 2026-11-05 |
| [account-lifecycle](#account-lifecycle) | Permite que una persona cree su propia cuenta de Weather Track, la confirme por correo, la administre y la dé de baja, y que el sistema borre las cuentas que no se confirman o se dan de baja. | 10 | 20 | [weather-track-registro-cuentas](../../openspec/changes/archive/2026-11-05-weather-track-registro-cuentas/proposal.md), 2026-11-05 |
| [account-recovery](#account-recovery) | Permite que el titular de una cuenta recupere el acceso cuando olvidó su contraseña, sin que nadie pueda averiguar qué correos están registrados. | 4 | 7 | [weather-track-registro-cuentas](../../openspec/changes/archive/2026-11-05-weather-track-registro-cuentas/proposal.md), 2026-11-05 |
| [administration](#administration) | Permite que un administrador de Weather Track gestione la conexión con SAT2 desde la aplicación, sin entrar al servidor, y sin que el resto de las cuentas vea ni alcance esa opción. | 6 | 17 | [weather-track-administracion-sat2](../../openspec/changes/archive/2026-11-09-weather-track-administracion-sat2/proposal.md), 2026-11-09 |
| [ai-code-review](#ai-code-review) | Suma a cada pull request una revisión de IA enfocada en las reglas de Weather Track, como apoyo a la decisión del responsable y sin reemplazar los controles del pipeline. | 4 | 6 | [weather-track-revision-y-documentacion-viva](../../openspec/changes/archive/2026-11-07-weather-track-revision-y-documentacion-viva/proposal.md), 2026-11-07 |
| [application-recommendation](#application-recommendation) | Responde si conviene aplicar fitosanitarios en una estación en este momento, con un índice, un estado y sus motivos, sin presentar como favorable una condición de inversión ni datos faltantes o viejos. | 11 | 24 | [weather-track-mvp-nucleo](../../openspec/changes/archive/2026-11-03-weather-track-mvp-nucleo/proposal.md), 2026-11-03 |
| [continuous-integration](#continuous-integration) | Verifica automáticamente cada cambio de Weather Track con las mismas pruebas que se ejecutan a mano, para que nada llegue a `main` sin pasar por ellas, y sin que el propio pipeline exponga credenciales. | 10 | 12 | [weather-track-revision-y-documentacion-viva](../../openspec/changes/archive/2026-11-07-weather-track-revision-y-documentacion-viva/proposal.md), 2026-11-07 |
| [customer-base](#customer-base) | Convierte las cuentas confirmadas en una base de clientes potenciales, con el consentimiento de cada persona registrado y una exportación para el administrador. | 3 | 4 | [weather-track-registro-cuentas](../../openspec/changes/archive/2026-11-05-weather-track-registro-cuentas/proposal.md), 2026-11-05 |
| [living-documentation](#living-documentation) | Ofrece una guía legible de lo que hace Weather Track, generada a partir de las especificaciones de OpenSpec para que nunca quede vieja. | 3 | 4 | [weather-track-revision-y-documentacion-viva](../../openspec/changes/archive/2026-11-07-weather-track-revision-y-documentacion-viva/proposal.md), 2026-11-07 |
| [sat2-contract](#sat2-contract) | Mantiene las pruebas de Weather Track alineadas con las respuestas reales de SAT2, sin exponer datos sensibles, y avisa cuando SAT2 cambia la forma de sus respuestas. | 5 | 9 | [weather-track-contrato-sat2](../../openspec/changes/archive/2026-11-11-weather-track-contrato-sat2/proposal.md), 2026-11-11 |
| [sat2-ingestion](#sat2-ingestion) | Mantiene los datos de las estaciones actualizados y con su calidad identificada, obteniéndolos de SAT2 de forma automática e independiente de las sesiones de usuario. | 18 | 50 | [weather-track-historicos-sin-huecos](../../openspec/changes/archive/2026-11-09-weather-track-historicos-sin-huecos/proposal.md), 2026-11-09 |
| [sensor-history](#sensor-history) | Permite revisar cómo evolucionó un sensor en un período reciente, con un gráfico y un resumen estadístico, para entender las condiciones y planificar la próxima aplicación. | 6 | 17 | [weather-track-historicos-sin-huecos](../../openspec/changes/archive/2026-11-09-weather-track-historicos-sin-huecos/proposal.md), 2026-11-09 |
| [station-conditions](#station-conditions) | Muestra las últimas lecturas de una estación con su calidad, sus alarmas y su antigüedad, para que la persona sepa qué se midió y cuánto puede confiar en ese dato. | 6 | 17 | [weather-track-estaciones](../../openspec/changes/archive/2026-11-05-weather-track-estaciones/proposal.md), 2026-11-05 |
| [system-monitoring](#system-monitoring) | Avisa a los administradores de Weather Track cuando la ingesta, la base de datos o los accesos muestran un problema, en pantalla y por correo, guarda la historia de esas mediciones para verla en Grafana y muestra a todas las cuentas la salud de cada estación. | 7 | 18 | [weather-track-monitoreo](../../openspec/changes/archive/2026-11-11-weather-track-monitoreo/proposal.md), 2026-11-11 |
| [transactional-email](#transactional-email) | Envía los correos de las cuentas (confirmación, recupero, avisos de seguridad) de forma confiable, con un enlace de baja en cada uno, y sin que una instalación local envíe correos a internet. | 6 | 8 | [weather-track-registro-cuentas](../../openspec/changes/archive/2026-11-05-weather-track-registro-cuentas/proposal.md), 2026-11-05 |

## account-access

Permite que solo las personas con una cuenta activa de Weather Track ingresen al sistema y consulten únicamente las estaciones que tienen asignadas.

Especificación: [openspec/specs/account-access/spec.md](../../openspec/specs/account-access/spec.md). Último cambio archivado: [weather-track-registro-cuentas](../../openspec/changes/archive/2026-11-05-weather-track-registro-cuentas/proposal.md), 2026-11-05.

### Inicio de sesión con cuenta propia

El sistema SHALL iniciar una sesión cuando una persona ingresa un correo y una contraseña válidos de una cuenta activa y confirmada. El correo MUST compararse sin distinguir mayúsculas de minúsculas.

Escenarios:

- Credenciales válidas
- Credenciales inválidas
- Cuenta desactivada
- Cuenta sin confirmar

### Límite de intentos de inicio de sesión

El sistema MUST rechazar temporalmente los intentos de inicio de sesión después de 5 fallos consecutivos para un mismo correo en 15 minutos.

Escenarios:

- Demasiados intentos
- Fin de la espera

### Vigencia de la sesión

El sistema SHALL mantener la sesión durante 8 horas como máximo desde su inicio, y SHALL exigir un nuevo ingreso cuando venza.

Escenarios:

- Sesión vencida

### Cierre de sesión

El sistema SHALL invalidar la sesión de inmediato cuando la persona elige cerrarla.

Escenarios:

- Salir

### Autorización por estación

El sistema MUST comprobar en el servidor, en cada consulta, que la persona tenga una sesión válida y que la estación pedida exista. Una estación es un equipo de SAT2, no un permiso: mientras no haya niveles de usuario, toda cuenta confirmada MUST poder consultar todas las estaciones, activas e inactivas.

Escenarios:

- Estación no asignada
- Estación inexistente
- Sin sesión
- Listado de estaciones

### Protección de credenciales de usuario

El sistema MUST guardar las contraseñas solo como un hash con sal, y MUST NOT registrarlas ni conservarlas en texto plano durante la sesión.

Escenarios:

- Registro de actividad

### Límite por dirección IP

El sistema MUST limitar por dirección IP de origen la cantidad de pedidos de inicio de sesión, registro, recupero, reenvío de confirmación y uso de enlaces, y MUST responder con estado 429 y la cabecera `Retry-After` al superarla. Este límite se suma al límite por correo.

Escenarios:

- Muchos registros desde una misma IP
- Otra IP

## account-lifecycle

Permite que una persona cree su propia cuenta de Weather Track, la confirme por correo, la administre y la dé de baja, y que el sistema borre las cuentas que no se confirman o se dan de baja.

Especificación: [openspec/specs/account-lifecycle/spec.md](../../openspec/specs/account-lifecycle/spec.md). Último cambio archivado: [weather-track-registro-cuentas](../../openspec/changes/archive/2026-11-05-weather-track-registro-cuentas/proposal.md), 2026-11-05.

### Registro público

El sistema SHALL permitir que cualquier persona cree una cuenta con nombre, apellido, correo, contraseña, localidad y provincia, y opcionalmente organización y teléfono, aceptando los términos y la política de privacidad. La cuenta queda sin confirmar y el sistema envía un correo de confirmación.

Escenarios:

- Registro válido
- Términos no aceptados
- Pantalla de acceso

### Repetición de la contraseña

La pantalla SHALL pedir dos veces la contraseña nueva al registrarse, al cambiarla desde "Mi cuenta" y al elegirla con el enlace de recupero, y MUST NOT enviar el formulario si las dos no coinciden. La API recibe la contraseña una sola vez.

Escenarios:

- Contraseñas distintas
- Contraseñas iguales

### Registro sin revelar correos existentes

El sistema MUST responder al registro con el mismo mensaje y estado tanto si el correo es nuevo como si ya pertenece a una cuenta. Si ya pertenece a una cuenta confirmada, MUST enviar a ese correo un aviso con el enlace para recuperar la contraseña, sin modificar la cuenta.

Escenarios:

- Correo ya confirmado
- Correo sin confirmar

### Política de contraseñas

El sistema MUST exigir contraseñas de 15 a 128 caracteres, sin reglas de composición, y MUST rechazar las que figuren en una lista de contraseñas comunes o contengan el correo de la cuenta. Aplica al registro, al recupero y al cambio de contraseña.

Escenarios:

- Contraseña corta
- Contraseña común
- Frase larga

### Confirmación por correo

El sistema SHALL confirmar la cuenta cuando su titular usa el enlace de confirmación dentro de las 48 horas de su envío. El enlace MUST ser de un solo uso. Una cuenta sin confirmar MUST NOT poder iniciar sesión.

Escenarios:

- Enlace vigente
- Enlace usado o vencido

### Borrado de cuentas sin confirmar

El sistema MUST borrar de la base, con todos sus datos, las cuentas que siguen sin confirmar 48 horas después del último enlace de confirmación enviado.

Escenarios:

- Plazo vencido

### Baja desde el correo

El sistema SHALL incluir en cada correo que envía un enlace para darse de baja. Al usarlo, MUST pedir una confirmación explícita y, una vez confirmada, MUST borrar la cuenta con todos sus datos y cerrar sus sesiones. Abrir el enlace sin confirmar MUST NOT borrar nada.

Escenarios:

- Baja confirmada
- Enlace abierto por un analizador de correo
- Baja de una cuenta sin confirmar

### Autogestión de la cuenta

El sistema SHALL permitir que la persona con sesión consulte y modifique su nombre, apellido, organización, teléfono, localidad, provincia y preferencia de novedades. El correo no se puede modificar.

Escenarios:

- Editar datos

### Cambio de contraseña con sesión

El sistema SHALL permitir cambiar la contraseña con sesión iniciada solo si la persona ingresa la contraseña actual. Al cambiarla, MUST cerrar todas las demás sesiones de la cuenta y enviar un aviso al correo.

Escenarios:

- Contraseña actual correcta
- Contraseña actual incorrecta

### Baja desde la aplicación

El sistema SHALL permitir que la persona con sesión borre su cuenta ingresando su contraseña. El borrado MUST eliminar todos los datos de la cuenta y cerrar todas sus sesiones.

Escenarios:

- Baja con contraseña

## account-recovery

Permite que el titular de una cuenta recupere el acceso cuando olvidó su contraseña, sin que nadie pueda averiguar qué correos están registrados.

Especificación: [openspec/specs/account-recovery/spec.md](../../openspec/specs/account-recovery/spec.md). Último cambio archivado: [weather-track-registro-cuentas](../../openspec/changes/archive/2026-11-05-weather-track-registro-cuentas/proposal.md), 2026-11-05.

### Solicitud de recupero

El sistema SHALL aceptar una solicitud de recupero con un correo y MUST responder con el mismo mensaje y estado exista o no una cuenta con ese correo. Solo si existe una cuenta confirmada, MUST enviarle un enlace para elegir una contraseña nueva.

Escenarios:

- Cuenta confirmada
- Correo sin cuenta

### Enlace de recupero

El enlace de recupero MUST ser de un solo uso, MUST vencer a los 30 minutos y MUST quedar invalidado cuando se emite otro para la misma cuenta.

Escenarios:

- Enlace vencido
- Enlace anterior

### Nueva contraseña

Con un enlace vigente, el sistema SHALL permitir elegir una contraseña nueva que cumpla la política de contraseñas. Al guardarla, MUST cerrar todas las sesiones de la cuenta, levantar el bloqueo por intentos fallidos de ese correo y enviar un aviso al titular.

Escenarios:

- Restablecer
- Cuenta bloqueada

### Recupero del usuario

El sistema SHALL indicar en la pantalla de recupero que el usuario es el correo con el que se registró la cuenta, y MUST NOT ofrecer ningún mecanismo que revele qué correos están registrados.

Escenarios:

- Persona que no recuerda su usuario

## administration

Permite que un administrador de Weather Track gestione la conexión con SAT2 desde la aplicación, sin entrar al servidor, y sin que el resto de las cuentas vea ni alcance esa opción.

Especificación: [openspec/specs/administration/spec.md](../../openspec/specs/administration/spec.md). Último cambio archivado: [weather-track-administracion-sat2](../../openspec/changes/archive/2026-11-09-weather-track-administracion-sat2/proposal.md), 2026-11-09.

### Rol de administrador desde el servidor

El sistema SHALL otorgar y quitar el rol de administrador solo con un comando de la línea de comandos del servidor, y solo a una cuenta activa y confirmada. Ninguna ruta de la API ni pantalla MUST permitir otorgar, quitar ni modificar ese rol.

Escenarios:

- Otorgar el rol
- Cuenta sin confirmar
- Intento desde la web

### Opción invisible para el resto de las cuentas

El sistema SHALL mostrar la opción «Administración» solo a las cuentas administradoras. Para cualquier otra cuenta, y para pedidos sin sesión, las rutas de administración de la API MUST responder igual que una ruta inexistente (404), y la pantalla de administración MUST mostrar lo mismo que una página inexistente.

Escenarios:

- Cuenta común
- Ruta pedida a mano
- Administrador

### Configuración de SAT2 desde la aplicación

El sistema SHALL permitir que el administrador cargue la URL, el usuario y la contraseña de SAT2, y MUST conservarlos hasta que un administrador los reemplace. La pantalla SHALL mostrar si hay una configuración guardada, cuándo y quién la cargó, el modo de datos y el resultado del último ciclo de ingesta. Sin configuración guardada, SHALL indicar que la ingesta usa las variables del servidor. La pantalla MUST NOT mostrar la URL, el usuario ni la contraseña guardados.

Escenarios:

- Primera carga
- Reemplazo
- Campos inválidos
- URL sin cifrado

### Credenciales cifradas que la API no puede leer

El sistema MUST guardar la configuración de SAT2 cifrada con una clave pública, de modo que solo el proceso de ingesta, con la clave privada, pueda descifrarla. La API MUST NOT tener la clave privada, y ninguna respuesta, registro ni correo MUST incluir la URL, el usuario ni la contraseña de SAT2.

Escenarios:

- Copia de la base
- Consulta de la configuración
- Falta la clave pública

### Confirmación con la contraseña del administrador

Para guardar la configuración de SAT2, el sistema MUST pedir la contraseña de Weather Track del administrador, aunque tenga la sesión abierta. Una contraseña incorrecta MUST contar como intento fallido de ingreso a esa cuenta.

Escenarios:

- Contraseña correcta
- Contraseña incorrecta

### Aviso y registro de cada cambio

Cada vez que se guarda la configuración de SAT2, el sistema SHALL enviar un aviso por correo a cada administrador activo y SHALL agregar al registro de cambios la fecha y el correo de quien la guardó. Ni el aviso ni el registro MUST incluir los valores de la configuración.

Escenarios:

- Cambio guardado
- Registro en pantalla

## ai-code-review

Suma a cada pull request una revisión de IA enfocada en las reglas de Weather Track, como apoyo a la decisión del responsable y sin reemplazar los controles del pipeline.

Especificación: [openspec/specs/ai-code-review/spec.md](../../openspec/specs/ai-code-review/spec.md). Último cambio archivado: [weather-track-revision-y-documentacion-viva](../../openspec/changes/archive/2026-11-07-weather-track-revision-y-documentacion-viva/proposal.md), 2026-11-07.

### Revisión automática de los pull requests

Cada pull request a `main` SHALL recibir una revisión de GitHub Copilot al abrirse y en cada push nuevo, con comentarios sobre líneas concretas.

Escenarios:

- Pull request nuevo
- Push nuevo

### La revisión de IA no decide

La revisión de Copilot MUST NOT ser un control exigido para fusionar en `main`. Fusionar SHALL depender de los controles del pipeline y de la decisión del responsable.

Escenarios:

- Comentario descartado

### Criterios del proyecto

Las instrucciones de revisión SHALL estar en castellano en el repositorio y SHALL pedir que se señalen primero los problemas de seguridad, las reglas del dominio, el contrato de la API y las migraciones, con criterios propios para el dominio, las migraciones, los flujos de GitHub Actions, la API y el frontend.

Escenarios:

- Cambio en el dominio
- Cambio en un flujo

### Plantilla de pull request

Todo pull request SHALL partir de una plantilla que pida la tarea de OpenSpec, la verificación realizada y una lista de control que incluya pruebas, contrato, migraciones, documentación, ausencia de secretos y comentarios de Copilot atendidos.

Escenarios:

- Pull request nuevo

## application-recommendation

Responde si conviene aplicar fitosanitarios en una estación en este momento, con un índice, un estado y sus motivos, sin presentar como favorable una condición de inversión ni datos faltantes o viejos.

Especificación: [openspec/specs/application-recommendation/spec.md](../../openspec/specs/application-recommendation/spec.md). Último cambio archivado: [weather-track-mvp-nucleo](../../openspec/changes/archive/2026-11-03-weather-track-mvp-nucleo/proposal.md), 2026-11-03.

### Cálculo del índice TIS

El sistema SHALL calcular el índice como `0,50 × temperatura + 0,25 × viento + 0,15 × radiación + 0,10 × humedad`, con factores de 0 a 100 según las tablas de la sección 1.2 del README, y ΔT igual a `T10m − T2m`.

Escenarios:

- Condiciones favorables
- Riesgo máximo

### Estado base según el índice

El sistema SHALL asignar el estado base `APTO` hasta 20, `PRECAUCION` hasta 40, `RIESGO_DERIVA` hasta 60 y `NO_APLICAR` por encima de 60.

Escenarios:

- Riesgo intermedio
- Límite exacto

### Lecturas obligatorias (R1)

El sistema MUST devolver `DATOS_INSUFICIENTES`, sin índice, cuando falta o es inválida alguna de las seis lecturas: T2m, T10m, HR2m, HR10m, viento o radiación.

Escenarios:

- Falta una temperatura
- Falta un dato de menor peso

### Antigüedad máxima de la medición (R2)

El sistema MUST devolver `DATOS_INSUFICIENTES`, sin índice y con motivo `DATOS_DESACTUALIZADOS`, cuando la medición tiene más de 30 minutos en el momento de la consulta.

Escenarios:

- Medición vieja
- Medición en el límite

### La inversión nunca es apta (R3)

El sistema MUST asignar como mínimo `PRECAUCION`, con motivo `INVERSION_DETECTADA`, cuando ΔT es mayor que cero, aunque el índice sea 20 o menor.

Escenarios:

- Inversión con índice bajo
- Inversión con índice alto

### Con inversión y poco viento no se aplica (R3b)

El sistema MUST asignar `NO_APLICAR`, con motivo `INVERSION_DETECTADA`, cuando ΔT es mayor que cero y el viento es de 6,4 km/h o menos, cualquiera sea el índice.

Escenarios:

- Inversión con poco viento
- Viento en el límite
- Viento apenas superior
- Poco viento sin inversión

### Una lectura sospechosa nunca es apta (R4)

El sistema MUST asignar como mínimo `PRECAUCION`, con motivo `DATO_SOSPECHOSO`, cuando alguna de las seis lecturas está como `SOSPECHOSO`.

Escenarios:

- Humedad sospechosa

### Motivos de la recomendación

El sistema SHALL incluir al menos un motivo con código y detalle: `SIN_INVERSION` si el estado es `APTO`, `INDICE_ELEVADO` si el índice supera 20, y los definidos en las reglas R1 a R4. Si la estación no tiene cálculos, usará `SIN_MEDICIONES`.

Escenarios:

- Estado apto
- Índice alto sin inversión
- Estación sin cálculos

### Carácter orientativo

El sistema SHALL acompañar toda recomendación con un aviso de que es orientativa y no reemplaza el criterio profesional ni la etiqueta del producto, e informar la versión del método.

Escenarios:

- Respuesta de la API
- Pantalla de decisión

### Presentación del estado

La pantalla de decisión SHALL mostrar el estado con texto, color e ícono, junto con el índice, la hora de medición y los motivos, y SHALL NOT sugerir aplicar con `DATOS_INSUFICIENTES`.

Escenarios:

- Datos insuficientes
- Sin depender del color

### Actualización automática

La pantalla de decisión SHALL actualizarse cada 60 segundos, y ante un error de red SHALL dejar de presentar el último estado como vigente.

Escenarios:

- Datos nuevos
- Sin conexión con la API

## continuous-integration

Verifica automáticamente cada cambio de Weather Track con las mismas pruebas que se ejecutan a mano, para que nada llegue a `main` sin pasar por ellas, y sin que el propio pipeline exponga credenciales.

Especificación: [openspec/specs/continuous-integration/spec.md](../../openspec/specs/continuous-integration/spec.md). Último cambio archivado: [weather-track-revision-y-documentacion-viva](../../openspec/changes/archive/2026-11-07-weather-track-revision-y-documentacion-viva/proposal.md), 2026-11-07.

### Verificación de cada cambio

El sistema SHALL ejecutar en cada push a `main` o a una rama `feature/**`, y en cada pull request a `main`, el lint y las pruebas del backend y del frontend, el build del frontend, la comparación del contrato de la API, la validación de las especificaciones, el escaneo de secretos, la auditoría de dependencias y las pruebas de extremo a extremo.

Escenarios:

- Cambio que rompe una prueba
- Cambio correcto

### Pruebas de base obligatorias

El pipeline MUST ejecutar las pruebas del backend contra PostgreSQL y MUST fallar si la base de pruebas no responde, en lugar de saltear esas pruebas.

Escenarios:

- Base de pruebas caída

### Cobertura del motor

El pipeline MUST fallar si la cobertura de líneas de `app.dominio` es menor al 100 %.

Escenarios:

- Línea del motor sin probar

### Contrato actualizado

El pipeline MUST fallar si `frontend/openapi.json` o los tipos generados del frontend no coinciden con los que produce la API.

Escenarios:

- Contrato sin regenerar

### Pipeline sin secretos

El pipeline SHALL ejecutarse sin secretos del repositorio, con permiso de solo lectura sobre el contenido, y MUST NOT usar el disparador `pull_request_target`. Cada acción de terceros MUST fijarse por el SHA completo de su commit.

Escenarios:

- Pull request desde un fork
- Acción fijada

### Secretos en el historial

El pipeline MUST fallar si el escaneo encuentra un secreto en cualquier commit del historial que no esté registrado como falso positivo con su motivo.

Escenarios:

- Credencial subida por error

### Dependencias vulnerables

El pipeline MUST fallar si las dependencias bloqueadas del backend o del frontend tienen una vulnerabilidad conocida de severidad alta o crítica que no esté registrada como excepción con su motivo y fecha de revisión.

Escenarios:

- Vulnerabilidad alta

### Pruebas negativas antes de fusionar

El pipeline SHALL ejecutar las pruebas negativas sobre la configuración de producción en cada pull request a `main` y a pedido.

Escenarios:

- Pull request a main

### Diagnóstico de la E2E

Cuando las pruebas de extremo a extremo fallan, el pipeline SHALL conservar el informe y las trazas de Playwright como artefacto durante 7 días.

Escenarios:

- E2E fallida

### Documentación viva al día

El pipeline MUST fallar si `docs/especificaciones/README.md` difiere de la guía que se genera desde `openspec/specs`, y el mensaje SHALL indicar el comando para regenerarla.

Escenarios:

- Especificación cambiada sin regenerar la guía

## customer-base

Convierte las cuentas confirmadas en una base de clientes potenciales, con el consentimiento de cada persona registrado y una exportación para el administrador.

Especificación: [openspec/specs/customer-base/spec.md](../../openspec/specs/customer-base/spec.md). Último cambio archivado: [weather-track-registro-cuentas](../../openspec/changes/archive/2026-11-05-weather-track-registro-cuentas/proposal.md), 2026-11-05.

### Registro del consentimiento

El sistema MUST guardar, para cada cuenta, la fecha y la versión de los términos y la política de privacidad aceptados, y la preferencia de recibir novedades, que se ofrece sin marcar.

Escenarios:

- Aceptación en el registro

### Exportación de la base de clientes

El sistema SHALL permitir que el administrador, desde la línea de comandos del servidor, exporte a CSV las cuentas confirmadas con sus datos de registro, su consentimiento y su preferencia de novedades. La exportación MUST NOT incluir contraseñas, hashes ni enlaces.

Escenarios:

- Exportar
- Cuentas sin confirmar

### Información al titular

El sistema SHALL mostrar en el registro y en "Mi cuenta" la finalidad del uso de los datos y cómo ejercer los derechos de acceso, rectificación y supresión.

Escenarios:

- Formulario de registro

## living-documentation

Ofrece una guía legible de lo que hace Weather Track, generada a partir de las especificaciones de OpenSpec para que nunca quede vieja.

Especificación: [openspec/specs/living-documentation/spec.md](../../openspec/specs/living-documentation/spec.md). Último cambio archivado: [weather-track-revision-y-documentacion-viva](../../openspec/changes/archive/2026-11-07-weather-track-revision-y-documentacion-viva/proposal.md), 2026-11-07.

### Guía generada de las especificaciones

El sistema SHALL generar `docs/especificaciones/README.md` a partir de `openspec/specs`, con un índice de las capacidades y, por cada una, su propósito, sus requisitos, sus escenarios y el último cambio archivado que la modificó, con enlaces a la especificación.

Escenarios:

- Capacidad nueva
- Requisito modificado

### Salida determinista

La guía MUST generarse siempre igual a partir de las mismas especificaciones: mismo orden y sin la fecha ni la hora de generación.

Escenarios:

- Dos generaciones seguidas

### Aviso de archivo generado

La guía SHALL empezar con un aviso de que se genera, con el comando para regenerarla, y de que no se edita a mano.

Escenarios:

- Lectura de la guía

## sat2-contract

Mantiene las pruebas de Weather Track alineadas con las respuestas reales de SAT2, sin exponer datos sensibles, y avisa cuando SAT2 cambia la forma de sus respuestas.

Especificación: [openspec/specs/sat2-contract/spec.md](../../openspec/specs/sat2-contract/spec.md). Último cambio archivado: [weather-track-contrato-sat2](../../openspec/changes/archive/2026-11-11-weather-track-contrato-sat2/proposal.md), 2026-11-11.

### Captura saneada de respuestas reales

El sistema SHALL ofrecer una herramienta que, en modo real, pida a SAT2 la autenticación, los equipos, los instantáneos del equipo 1 y un día completo de históricos de cada uno de sus sensores, y escriba esas respuestas saneadas. La herramienta MUST NOT escribir ni mostrar la URL de SAT2, las credenciales, los tokens ni los datos de la cuenta.

Escenarios:

- Captura en modo real
- Otro modo

### Saneado conservando la forma

El saneado SHALL reemplazar los valores de las claves con nombres de token, clave, contraseña, usuario, cliente, correo o serie, y cualquier texto con forma de URL, de correo o de token, conservando la estructura y el tipo de cada valor.

Escenarios:

- Respuesta de autenticación
- URL en un campo inesperado

### Respuestas de referencia sin secretos

Las respuestas de referencia versionadas MUST NOT contener textos con forma de URL, de correo o de token, y una prueba SHALL fallar si los contienen, nombrando la ruta sin mostrar el valor.

Escenarios:

- Archivo con un token

### Procesamiento de las respuestas reales

Las pruebas SHALL procesar las respuestas de referencia con el catálogo, el ciclo y la carga de históricos reales, y MUST fallar si un sensor queda sin clasificar, el ciclo no termina bien o una lectura se descarta por su formato.

Escenarios:

- Catálogo real
- Ciclo real

### Detección de cambios en SAT2

El sistema SHALL guardar la forma de cada respuesta de referencia, sin sus valores, y SHALL ofrecer una comparación que vuelva a pedir las respuestas a SAT2 y liste las claves nuevas, las que faltan y los tipos que cambiaron, terminando con error si hay diferencias.

Escenarios:

- SAT2 sin cambios
- SAT2 agrega un campo

## sat2-ingestion

Mantiene los datos de las estaciones actualizados y con su calidad identificada, obteniéndolos de SAT2 de forma automática e independiente de las sesiones de usuario.

Especificación: [openspec/specs/sat2-ingestion/spec.md](../../openspec/specs/sat2-ingestion/spec.md). Último cambio archivado: [weather-track-historicos-sin-huecos](../../openspec/changes/archive/2026-11-09-weather-track-historicos-sin-huecos/proposal.md), 2026-11-09.

### Ciclo automático de lecturas

El sistema SHALL obtener cada 10 minutos las lecturas actuales de todas las estaciones activas, aunque no haya ninguna sesión abierta.

Escenarios:

- Sin personas conectadas
- Medición ya guardada

### Sincronización del catálogo

El sistema SHALL mantener el catálogo de estaciones y sensores a partir de SAT2, identificando la magnitud y la altura de cada sensor. Cada estación corresponde a un equipo de `RecuperarEquipos`. El sistema MUST marcar como inactiva, con su fecha, la estación cuyo equipo deja de llegar, conservando sus datos, y MUST reactivarla si el equipo vuelve.

Escenarios:

- Sensores a distinta altura
- Nombre con tilde
- Sensor desconocido
- Equipo nuevo
- Equipo que deja de llegar
- Equipo que vuelve
- Fuente con error

### Carga inicial

El sistema SHALL cargar por sensor los últimos 31 días de históricos de cada estación activa, sin interrumpir el ciclo de 10 minutos.

Escenarios:

- Primera puesta en marcha
- Carga interrumpida
- Ciclo durante la carga

### Ventana de consulta adaptable

El sistema SHALL reducir la ventana de consulta de históricos a la mitad cuando la consulta falla o su respuesta está incompleta, hasta llegar a un día.

Escenarios:

- Consulta rechazada
- Respuesta recortada

### Uso prudente de la fuente

El sistema MUST hacer una sola consulta a SAT2 por vez, con una pausa configurable entre consultas de históricos, y MUST detener la carga inicial ante errores repetidos.

Escenarios:

- Errores repetidos

### Sesión con SAT2

El sistema SHALL renovar la sesión con SAT2 antes de que venza y reintentar una vez ante un error de autorización.

Escenarios:

- Carga más larga que la sesión
- Error de autorización

### Protección de credenciales de SAT2

El sistema MUST tomar las credenciales de SAT2 de la configuración cifrada que carga un administrador o, en su defecto, del entorno del proceso de ingesta. Solo el proceso de ingesta MUST poder leerlas: la API MUST NOT tener la clave para descifrarlas ni las variables con credenciales de SAT2. Las credenciales MUST NOT aparecer en el navegador, el código, los registros, los correos ni los datos de prueba.

Escenarios:

- Registro de una consulta
- Faltan credenciales
- Entorno de la API

### Cuentas sin relación con SAT2

Las cuentas comunes de Weather Track MUST NOT tener relación con la cuenta de SAT2: ningún flujo de cuentas pide, muestra ni usa sus credenciales.

Escenarios:

- Registro de una cuenta

### Modo simulado

El sistema SHALL ofrecer un modo que produzca datos ficticios y no acceda a SAT2, para desarrollo, pruebas y evaluación sin credenciales reales. La estación simulada SHALL llamarse como la estación real, y la aplicación MUST mostrar en todas sus pantallas el aviso "Datos simulados".

Escenarios:

- Evaluación sin credenciales
- Aviso de datos simulados

### Normalización de lecturas

El sistema SHALL convertir las lecturas a valores numéricos e instantes únicos en UTC, aceptando coma decimal y los formatos de fecha que entrega la fuente, y guardar las series sin duplicados.

Escenarios:

- Valor con coma decimal
- Serie en orden descendente
- Hora local

### Clasificación de la calidad del dato

El sistema SHALL clasificar cada lectura como `OK`, `FALTANTE` o `SOSPECHOSO`. Un valor vacío, no numérico, centinela o fuera de rango físico MUST quedar como `FALTANTE`, sin valor.

Escenarios:

- Valor centinela
- Fuera de rango físico
- Humedad incoherente entre alturas

### Sistema de unidades

El sistema SHALL guardar y mostrar temperatura en °C, viento en km/h, radiación en W/m², humedad en %, presión en hPa y lluvia en mm. Una lectura de temperatura, humedad, viento o radiación en otra unidad MUST quedar como `FALTANTE`, sin convertirse.

Escenarios:

- Variantes de escritura de la fuente
- Viento en otra unidad

### Conservación de la alarma de la fuente

El sistema SHALL guardar la alarma que SAT2 informa por lectura, o dejarla sin valor cuando la fuente no la informa.

Escenarios:

- Lectura en alarma
- Dato histórico

### Registro de ejecuciones

El sistema SHALL registrar cada ejecución de ingesta con su tipo, inicio, fin, resultado y cantidad de lecturas guardadas.

Escenarios:

- Ciclo exitoso
- Fuente no disponible

### Modo de prueba

El sistema SHALL ofrecer un modo de prueba que no acceda a SAT2 y muestre en el selector "Caso de prueba - 1", con las lecturas ya guardadas en la base, y "Caso de prueba - 2", que nunca recibe lecturas. Si la base no tiene lecturas, MUST cargar una vez los datos simulados para el caso 1. La aplicación MUST mostrar el aviso "Modo de prueba".

Escenarios:

- Base con datos guardados
- Base vacía
- Sin acceso a SAT2

### Separación de datos reales y ficticios

El sistema MUST registrar si una base contiene datos reales o ficticios desde su primera ingesta, y MUST negarse a arrancar en modo real sobre una base con datos ficticios, y en modo simulado o de prueba sobre una base con datos reales. El modo de prueba con datos reales MUST usar una copia de la base, nunca la original.

Escenarios:

- Modo real sobre datos ficticios
- Modo de prueba sobre la base real
- Copia de la base real

### Origen de la configuración de SAT2

En modo real, el proceso de ingesta SHALL usar la configuración de SAT2 guardada por un administrador, si existe. Si no existe, SHALL usar las variables del entorno. Si existe pero no puede descifrarla, MUST registrar el error sin valores y MUST NOT consultar SAT2 ni volver a las variables del entorno.

Escenarios:

- Sin configuración guardada
- Configuración guardada
- Cambio de configuración
- No se puede descifrar

### Recuperación de huecos

El sistema SHALL buscar, al arrancar el proceso de ingesta y luego cada hora, los tramos de más de 30 minutos sin lecturas de cada estación activa en los últimos 31 días, y SHALL pedirlos a SAT2 como históricos, sensor por sensor, con las mismas pausas y la misma ventana adaptable de la carga inicial y sin duplicar lecturas. El sistema MUST NOT volver a pedir un día ya terminado que SAT2 devolvió después de terminar ese día.

Escenarios:

- Instalación apagada varios días
- Lecturas ya guardadas
- Día sin datos en SAT2
- Día en curso
- Ciclo durante la recuperación

## sensor-history

Permite revisar cómo evolucionó un sensor en un período reciente, con un gráfico y un resumen estadístico, para entender las condiciones y planificar la próxima aplicación.

Especificación: [openspec/specs/sensor-history/spec.md](../../openspec/specs/sensor-history/spec.md). Último cambio archivado: [weather-track-historicos-sin-huecos](../../openspec/changes/archive/2026-11-09-weather-track-historicos-sin-huecos/proposal.md), 2026-11-09.

### Consulta de la serie por la API

El sistema SHALL entregar, para un sensor de una estación autorizada y un rango de hasta 32 días entre el inicio y el fin, sus lecturas en orden ascendente, a partir de los datos guardados y sin consultar a SAT2. Así se puede consultar desde las 00:00 de un día hasta las 23:59 del mismo día del mes siguiente. El rango MUST NOT empezar antes de las 00:00, hora de Argentina, del mismo día del año anterior, ni terminar más de 5 minutos después de la hora del servidor.

Escenarios:

- Rango válido
- Un mes de calendario
- Rango inválido
- Rango de hace más de un año
- Primer día permitido
- Rango futuro
- Sensor de otra estación

### Rangos en la pantalla

La pantalla de históricos SHALL ofrecer tres rangos medidos hasta el momento de la consulta: Día (últimas 24 horas), Semana (últimos 7 días) y Mes (últimos 31 días), y SHALL abrir con Día seleccionado.

Escenarios:

- Apertura del detalle
- Selección de rango

### Rango manual con calendario

La pantalla de históricos SHALL ofrecer un rango manual con calendario, de una fecha de inicio a una de fin, en hora de Argentina. El calendario MUST NOT ofrecer fechas futuras ni anteriores al mismo día del año anterior, y la pantalla MUST NOT consultar un rango manual cuya fecha de fin esté más de 31 días después de la de inicio o sea anterior a ella.

Escenarios:

- Rango manual válido
- Un mes de calendario en el rango manual
- Rango manual que termina hoy
- Rango manual inválido

### Resumen estadístico

El sistema SHALL informar máximo, mínimo, promedio y cantidad de registros del período, y MUST excluir del resumen las lecturas `FALTANTE`.

Escenarios:

- Con lecturas faltantes
- Sin lecturas válidas

### Huecos en la serie

El gráfico SHALL interrumpir la línea donde faltan datos, y SHALL NOT interpolar valores.

Escenarios:

- Lecturas ausentes

### Lecturas sospechosas en la serie

El sistema SHALL incluir la calidad de cada punto de la serie y conservar en ella y en el resumen las lecturas `SOSPECHOSO`.

Escenarios:

- Punto sospechoso

## station-conditions

Muestra las últimas lecturas de una estación con su calidad, sus alarmas y su antigüedad, para que la persona sepa qué se midió y cuánto puede confiar en ese dato.

Especificación: [openspec/specs/station-conditions/spec.md](../../openspec/specs/station-conditions/spec.md). Último cambio archivado: [weather-track-estaciones](../../openspec/changes/archive/2026-11-05-weather-track-estaciones/proposal.md), 2026-11-05.

### Última lectura por sensor

El sistema SHALL entregar, para una estación autorizada, la última lectura de cada sensor con su nombre, magnitud, altura, valor, unidad, calidad y alarma.

Escenarios:

- Estación con datos
- Sensor sin dato válido

### Vigencia de los datos

El sistema SHALL informar la hora de medición, la antigüedad en segundos y el estado `VIGENTE` hasta 30 minutos, `DESACTUALIZADO` si supera ese límite y `SIN_DATOS` si no hay mediciones.

Escenarios:

- Datos recientes
- Datos viejos
- Estación sin mediciones

### Estado real de la conexión con la fuente

El sistema SHALL informar el instante de la última ingesta exitosa, y la pantalla SHALL avisar cuando la última ejecución de la estación terminó con error.

Escenarios:

- Fuente no disponible
- Fuente disponible

### Tarjetas de sensores

La pantalla de decisión SHALL mostrar una tarjeta por sensor con su valor, unidad y calidad, y SHALL destacar con texto e ícono las lecturas `FALTANTE`, `SOSPECHOSO` o en alarma.

Escenarios:

- Lectura sospechosa
- Lectura en alarma
- Ancho de móvil

### Selección de estación

La aplicación SHALL mostrar en el encabezado, siempre y aunque haya una sola, un selector con todas las estaciones, activas e inactivas, y SHALL abrir la primera estación activa al iniciar la sesión. Una estación es un equipo de SAT2: el selector MUST NOT ofrecer casos de prueba ni otras opciones que no sean equipos, salvo en el modo de prueba.

Escenarios:

- Una sola estación
- Varias estaciones
- Estación inactiva en el selector
- Sin estaciones

### Equipo inactivo

Para una estación inactiva, la pantalla de decisión SHALL mostrar la leyenda "Equipo inactivo - solo históricos" y la lista de sus sensores, cada uno con acceso a su histórico, y MUST NOT mostrar la recomendación ni las tarjetas de lecturas actuales.

Escenarios:

- Abrir un equipo inactivo
- Histórico de un equipo inactivo
- Estado informado por la API

## system-monitoring

Avisa a los administradores de Weather Track cuando la ingesta, la base de datos o los accesos muestran un problema, en pantalla y por correo, guarda la historia de esas mediciones para verla en Grafana y muestra a todas las cuentas la salud de cada estación.

Especificación: [openspec/specs/system-monitoring/spec.md](../../openspec/specs/system-monitoring/spec.md). Último cambio archivado: [weather-track-monitoreo](../../openspec/changes/archive/2026-11-11-weather-track-monitoreo/proposal.md), 2026-11-11.

### Controles de salud

El proceso de ingesta SHALL evaluar en cada ciclo los controles de salud: datos de más de 30 minutos o 3 ciclos fallidos seguidos en una estación activa, menos del 10 % libre en el disco de la base, y 20 o más ingresos fallidos en 15 minutos o una dirección IP bloqueada por superar su límite. En modo prueba MUST NOT evaluar los controles de ingesta.

Escenarios:

- Datos viejos
- Límite de la frescura
- Ciclos fallidos
- Disco casi lleno
- Posible fuerza bruta

### Alertas sin repetición

El sistema SHALL abrir una alerta cuando un control pasa a fallar y cerrarla cuando vuelve a estar bien, y SHALL avisar por correo a cada administrador activo al abrirla y al cerrarla. Mientras una alerta sigue abierta, el sistema MUST NOT volver a avisar. Ni las alertas ni sus correos MUST incluir credenciales, correos de cuentas ni direcciones IP.

Escenarios:

- Alerta nueva
- Falla que continúa
- Normalización

### Estado del sistema en pantalla

La pantalla de administración SHALL mostrar el estado de cada control, con texto y no solo con color, el estado del proceso de ingesta y las últimas 20 alertas. El estado del proceso de ingesta SHALL calcularse con la hora del último ciclo, para que se vea aunque el proceso esté detenido. Para cualquier cuenta sin el rol, la ruta de este estado MUST responder igual que una ruta inexistente.

Escenarios:

- Proceso de ingesta detenido
- Cuenta común

### Métricas para Prometheus

El proceso de ingesta SHALL publicar en un puerto interno las métricas de frescura, ciclos fallidos, tamaño de la base, disco libre, ingresos fallidos y alertas abiertas. Ese puerto MUST NOT publicarse fuera de la red interna, y las métricas MUST NOT incluir correos, direcciones IP ni credenciales.

Escenarios:

- Consulta interna
- Consulta desde afuera

### Tablero y aviso de proceso detenido

El perfil de monitoreo SHALL levantar Prometheus y Grafana con su configuración versionada: un tablero de Weather Track y una alerta que avisa por correo si el proceso de ingesta deja de publicar métricas durante 5 minutos. Grafana MUST escuchar solo en la computadora local, MUST exigir la contraseña de su administrador y MUST NOT permitir registro ni acceso anónimo.

Escenarios:

- Proceso de ingesta detenido con el perfil activo
- Acceso a Grafana

### Salud de la estación

La pantalla de la estación y el detalle de un sensor SHALL mostrar a todas las cuentas la hora actual en hora de Argentina, la hora y el resultado del último ciclo de ingesta, la hora del último dato de SAT2 y un semáforo de salud con su texto, calculado al leer.

Escenarios:

- Cuenta común

### Estados del semáforo

El semáforo SHALL mostrar «En vivo» si el último ciclo terminó bien hace 20 minutos o menos y el dato tiene 30 minutos o menos; «Con demoras» si hubo un ciclo en los últimos 20 minutos pero terminó con error o el dato tiene más de 30 minutos; y «Caído» si no hubo ningún ciclo en más de 20 minutos.

Escenarios:

- Estación en vivo
- SAT2 sin datos nuevos
- Proceso de ingesta detenido

## transactional-email

Envía los correos de las cuentas (confirmación, recupero, avisos de seguridad) de forma confiable, con un enlace de baja en cada uno, y sin que una instalación local envíe correos a internet.

Especificación: [openspec/specs/transactional-email/spec.md](../../openspec/specs/transactional-email/spec.md). Último cambio archivado: [weather-track-registro-cuentas](../../openspec/changes/archive/2026-11-05-weather-track-registro-cuentas/proposal.md), 2026-11-05.

### Envío diferido con reintentos

El sistema SHALL registrar cada correo en una bandeja de salida dentro de la misma operación que lo origina y enviarlo fuera de la petición del usuario, reintentando ante fallos del servidor de correo. El contenido del correo MUST borrarse de la bandeja una vez enviado o descartado.

Escenarios:

- Servidor de correo caído
- Correo enviado

### Enlace de baja en cada correo

Cada correo MUST incluir en el cuerpo una leyenda con el enlace de baja y MUST incluir las cabeceras `List-Unsubscribe` y `List-Unsubscribe-Post` para la baja en un clic desde el programa de correo.

Escenarios:

- Correo de confirmación
- Baja en un clic desde el programa de correo

### Enlaces fuera de los registros

Los enlaces del cuerpo de los correos MUST llevar el código secreto en una parte de la dirección que el navegador no envía al servidor. La dirección de baja en un clic de la cabecera es la única que lo lleva hasta el servidor. El sistema MUST NOT registrar ningún código en sus registros de actividad.

Escenarios:

- Registro del servidor web

### Límite de correos por destinatario

El sistema MUST NOT enviar más de 3 correos del mismo tipo a un mismo destinatario por hora. Los pedidos que superen el límite reciben la misma respuesta que los demás.

Escenarios:

- Pedidos repetidos de recupero

### Captura local de correos

En la instalación local, el sistema SHALL entregar todos los correos a un buzón de prueba visible solo desde la propia computadora, y MUST NOT enviarlos a internet.

Escenarios:

- Instalación local

### Configuración obligatoria en producción

Con la configuración de producción, el sistema MUST negarse a arrancar si falta la configuración del servidor de correo.

Escenarios:

- Falta el servidor de correo

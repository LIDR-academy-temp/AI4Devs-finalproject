# Design

## Context

- El worker lee la URL, el usuario y la contraseña de SAT2 del entorno (`app/ingesta/configuracion.py`) y crea el cliente una sola vez, al arrancar (`app/ingesta/worker.py`).
- La API nunca recibe esas variables: lo exige el requisito «Protección de credenciales de SAT2» de `sat2-ingestion` y lo comenta `docker-compose.yml`.
- `app/administracion.py` ya ofrece comandos de servidor para las cuentas. No hay roles: toda cuenta confirmada ve todas las estaciones.
- El correo transaccional encola mensajes con enlace de baja (`app/cuentas/correo.py`), y el ingreso cuenta los intentos fallidos y bloquea tras 5.
- El responsable decidió el 7 de noviembre de 2026: rol otorgado por línea de comandos, configuración en la base cifrada, el `.env` como respaldo hasta la primera carga, y como protecciones repetir la contraseña, aviso por correo y registro de cambios.

## Goals / Non-Goals

**Goals:**

- Cambiar la configuración de SAT2 sin entrar al servidor ni reiniciar.
- Que la opción no exista para las cuentas comunes, ni en la pantalla ni en la API.
- Que una copia de la base, la API o un registro no alcancen para leer las credenciales.

**Non-Goals:**

- Roles por estación o niveles de usuario: siguen en la evolución futura.
- Probar la conexión con SAT2 desde la pantalla: el responsable no lo eligió, y mantiene a la API sin hablar con SAT2.
- Rotar las claves de cifrado de forma automática.
- Elegir el modo (`real`, `simulado`, `prueba`) desde la aplicación: sigue en el `.env`.

## Decisions

### D1. El rol se otorga solo desde el servidor

Columna `usuario.es_administrador`, falsa por defecto. Comandos nuevos en `app/administracion.py`:

- `hacer-administrador --email`: exige una cuenta activa y confirmada.
- `quitar-administrador --email`.

Ninguna ruta de la API cambia esa columna, y la autogestión de la cuenta no la muestra ni la acepta.

### D2. Invisible para el resto: 404, no 403

- La respuesta de sesión (`UsuarioPublico`, al ingresar y en `GET /api/cuenta`) suma `es_administrador`. El frontend muestra «Administración» solo si es verdadero.
- Las rutas `/api/administracion/**` dependen de un `requerir_administrador` que responde **404** con el mismo cuerpo que una ruta inexistente de FastAPI, tanto sin rol como sin sesión. Un 401 o un 403 confirmarían que la ruta existe.
- En el frontend, `/administracion` sin rol muestra el mismo «Esta página no existe.» que cualquier ruta desconocida. El código de la pantalla viaja en el paquete público, como todo el frontend: la protección real está en la API.

### D3. Cifrado de una sola vía: la API cifra, solo el worker descifra

Se usa `SealedBox` de PyNaCl (libsodium: X25519 con XSalsa20-Poly1305), una construcción ya probada en lugar de una combinación propia.

- `SAT2_CLAVE_PUBLICA` va a la API; `SAT2_CLAVE_PRIVADA`, solo al worker. El comando `python -m app.administracion generar-claves-sat2` imprime el par para que el responsable lo pegue en su `.env`.
- La API cifra en memoria lo que recibe y guarda solo el texto cifrado. No puede descifrarlo, así que ni un error de la API ni un acceso a ella exponen la contraseña.
- **La URL, el usuario y la contraseña se cifran juntos**, como un único bloque. Por eso la pantalla no los muestra: indica si hay una configuración, cuándo se cargó y quién la cargó, y permite reemplazarla completa.
- Sin la clave pública, la pantalla lo informa y no permite guardar.

**Por qué no cifrado simétrico con una clave maestra:** la API tendría la clave para descifrar. El requisito vigente pide que la API no tenga credenciales de SAT2; con una clave pública eso se mantiene.

### D4. Modelo de datos

Migración `0004`, con `upgrade` y `downgrade`:

- `usuario.es_administrador` (booleano, `false`).
- `configuracion_sat2`: una sola fila (`id = 1`), con `contenido_cifrado` (bytes), `cargada_en` y `cargada_por` (usuario, `SET NULL` al borrarlo).
- `cambio_configuracion_sat2`: `id`, `ocurrido_en`, `usuario_id` (`SET NULL`) y `email_usuario`, guardado aparte para que el registro sobreviva al borrado de la cuenta. Nunca los valores.

### D5. Guardar exige la contraseña del administrador

`PUT /api/administracion/sat2` recibe `url_base`, `usuario`, `clave` y `contrasena_actual`:

- Valida que la URL sea absoluta, con `https://` o `http://`, y que los tres campos tengan contenido, con un 422 por campo. Con `http://` la pantalla advierte que las credenciales viajarían sin cifrar hasta SAT2.
- Una contraseña incorrecta cuenta como intento fallido del ingreso y lleva al mismo bloqueo tras 5. Responde 400 `CONTRASENA_INCORRECTA` con el error en el campo, como el cambio de contraseña y la baja.
- En la misma transacción: reemplaza la fila, agrega el cambio al registro y encola el aviso por correo a cada administrador activo.
- Lleva el límite por dirección IP del inicio de sesión, porque también verifica una contraseña.

`GET /api/administracion/sat2` devuelve si hay una configuración guardada, si hay clave pública, el modo de datos, la fecha y el autor de la carga, los últimos 10 cambios y el resultado y la hora del último ciclo de ingesta. Esto último permite ver si las credenciales nuevas funcionan, sin que la API hable con SAT2.

La API no puede saber si el `.env` del worker tiene credenciales, porque nunca las recibe. Por eso, sin configuración guardada, la pantalla dice que la ingesta usa las variables del servidor, sin afirmar que existan.

Una ruta comodín bajo `/api/v1/administracion` responde 404 a cualquier otro método o ruta: sin ella, un `DELETE` daría 405 y revelaría que la ruta existe. El contrato OpenAPI sí lista las dos rutas, como todo el repositorio público; la protección está en la API, no en ocultarlas.

### D6. El worker recarga sin reiniciar

Antes de cada ciclo y de cada sincronización del catálogo, el worker lee `cargada_en`:

- Si cambió, descifra con la clave privada y crea un `ClienteSat2Http` nuevo, que abre una sesión nueva con SAT2.
- Si no hay fila, usa el `.env` como hoy.
- Si hay fila pero falta la clave privada o no descifra, registra el error, sin valores, y no consulta SAT2. No vuelve al `.env`: usar credenciales viejas sin avisar sería peor.

En los modos `simulado` y `prueba` el worker no lee la configuración, porque no consulta SAT2.

Detalles de la implementación (`app/ingesta/origen_sat2.py`):

- **Versión:** se compara el contenido cifrado, que cambia en cada guardado aunque los valores sean los mismos.
- **Arranque:** en modo real, sin configuración guardada ni variables completas en el `.env`, el worker termina como antes y avisa qué falta. Si arrancó, toma cada cambio posterior sin reiniciar.
- **Un error en el ciclo** deja en `ERROR` la ejecución de cada estación activa, con el motivo y sin valores, para que la pantalla de administración lo muestre.
- **Un solo bloqueo:** el cliente nuevo comparte el bloqueo del anterior, así una carga inicial en curso con el cliente viejo no consulta a la vez que el ciclo con el nuevo. El cliente viejo no se cierra para no cortar esa carga.

### D7. Aviso por correo

El tipo nuevo `CONFIGURACION_SAT2` dice cuándo y quién cambió la configuración, y qué hacer si no fue el destinatario. No incluye valores. Lleva el enlace de baja, como todos los correos. Respeta el límite de 3 mensajes del mismo tipo por hora.

### D8. Lo que no hace el asistente

Las pruebas usan valores ficticios y el modo `prueba`. El asistente no genera las claves del `.env` real, no carga credenciales reales y no ejecuta el modo real: lo hace el responsable, como hasta ahora.

## Risks / Trade-offs

- [Se pierde la clave privada] → La configuración guardada ya no se puede leer. Se generan claves nuevas y el administrador la vuelve a cargar. La guía de instalación lo explica.
- [La URL tampoco se ve] → Es el costo de cifrarla junto con las credenciales; el repositorio la trata como privada. El administrador la vuelve a escribir al reemplazar.
- [El administrador pierde su cuenta] → Otro administrador o el responsable desde el servidor otorga el rol de nuevo. La configuración guardada no cambia.
- [La API recibe las credenciales en claro durante el pedido] → Llegan por HTTPS, se cifran en memoria y no se registran. El límite de 64 KB del cuerpo y los registros sin cuerpos ya aplican.
- [Dependencia nueva] → PyNaCl entra en la auditoría de dependencias del pipeline.

## Migration Plan

1. Se despliega el cambio. Sin configuración en la base, el worker sigue con el `.env`.
2. El responsable genera las claves, las agrega a su `.env` y reinicia la pila.
3. Se hace administrador desde el servidor y carga las credenciales en la pantalla.
4. Comprueba en la pantalla que el ciclo siguiente terminó bien. Recién entonces puede quitar del `.env` la URL y las credenciales de SAT2.

**Vuelta atrás:** el `downgrade` de la migración borra las tres estructuras. Con el `.env` intacto, el worker vuelve a usarlo.

## Open Questions

Ninguna.

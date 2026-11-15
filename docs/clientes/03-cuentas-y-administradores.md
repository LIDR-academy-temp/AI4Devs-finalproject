# 3. Cuentas y administradores

[← Volver al índice](README.md)

## Cómo nace una cuenta

1. La persona se registra desde **Crear una cuenta**, en la pantalla de acceso, y acepta los términos.
2. Recibe un correo de confirmación. El enlace vale 48 horas y puede pedir que se lo reenvíen.
3. Al confirmar, ya puede ingresar y ve todas las estaciones.

Las cuentas que no se confirman en 48 horas **se borran solas**, junto con sus datos. No hace falta limpiarlas a mano.

Los **administradores** son cuentas comunes con un permiso más: ven la opción «Administración», donde se cargan las credenciales de SAT2, se mira el estado del sistema y reciben los correos de alerta. Para cualquier otra cuenta esa opción no existe: ni siquiera aparece en el menú. El permiso se da y se quita solo desde la terminal del servidor.

## Comandos de administración

Todos se ejecutan desde la carpeta `weather-track`, con los servicios encendidos. Responden «Operación realizada.» o explican el error. Si la cuenta no existe, no cambian nada.

### `hacer-administrador`

Da el permiso de administrador a una cuenta **confirmada y activa**. Usalo para vos el primer día y para cada persona que deba recibir las alertas.

```bash
docker compose exec api python -m app.administracion hacer-administrador --email operador@ejemplo.com
```

La persona ve «Administración» al volver a ingresar.

### `quitar-administrador`

Quita el permiso. La cuenta sigue funcionando como una cuenta común y deja de recibir las alertas.

```bash
docker compose exec api python -m app.administracion quitar-administrador --email operador@ejemplo.com
```

Dejá siempre al menos un administrador: si no hay ninguno, las alertas no le llegan a nadie.

### `crear-usuario`

Crea una cuenta **ya confirmada**, sin correo de por medio. Sirve cuando el correo todavía no funciona, por ejemplo el primer día. Genera una contraseña y **la muestra una sola vez**: copiala y pasásela a la persona por un medio seguro. Puede cambiarla desde «Mi cuenta».

```bash
docker compose exec api python -m app.administracion crear-usuario --email productor@ejemplo.com --nombre "Ana Pérez"
```

### `restablecer-clave`

Genera una contraseña nueva para alguien que no puede usar el recupero por correo, y cierra todas sus sesiones abiertas. La contraseña se muestra una sola vez.

```bash
docker compose exec api python -m app.administracion restablecer-clave --email productor@ejemplo.com
```

### `desactivar-usuario`

Bloquea una cuenta sin borrarla y cierra sus sesiones. La persona ya no puede ingresar ni recibe alertas, pero sus datos quedan. Usalo, por ejemplo, cuando alguien deja el establecimiento. Para borrar la cuenta con todos sus datos, la persona se da de baja desde «Mi cuenta».

```bash
docker compose exec api python -m app.administracion desactivar-usuario --email productor@ejemplo.com
```

### `exportar-clientes`

Exporta a CSV la **base de clientes**: las cuentas confirmadas, con su consentimiento para recibir novedades. No incluye contraseñas ni datos de acceso. Las columnas son correo, nombre, apellido, organización, teléfono, localidad, provincia, si acepta novedades, la versión de los términos aceptados y las fechas de aceptación, confirmación y alta.

La salida va a la pantalla. Para guardarla en un archivo sin problemas de codificación en Windows, generala dentro del contenedor y copiala. Git ignora `clientes.csv`, así que no se sube al repositorio:

```bash
docker compose exec api sh -c "python -m app.administracion exportar-clientes > /tmp/clientes.csv"
```

```bash
docker compose cp api:/tmp/clientes.csv ./clientes.csv
```

El archivo tiene datos personales: guardalo protegido y usalo solo con las personas que aceptaron recibir novedades.

### `generar-claves-sat2`

Genera el par de claves que cifra la configuración de SAT2. Se usa una sola vez, en la puesta en marcha, o si se pierde la clave privada. Está explicado en el [capítulo 4](04-sat2-y-sus-claves.md#las-claves-de-cifrado).

### `asignar-estacion`

Quedó de una versión anterior, en la que cada cuenta veía solo las estaciones asignadas. **Hoy no cambia nada:** toda cuenta confirmada ve todas las estaciones. No hace falta usarlo.

```bash
docker compose exec api python -m app.administracion asignar-estacion --email productor@ejemplo.com --id-equipo 1
```

## Buenas prácticas

- Cada persona con su propia cuenta: no compartan usuario.
- Revisá cada tanto quiénes son administradores. Los cambios de la configuración de SAT2 se avisan por correo a todos ellos.
- Si alguien deja de trabajar con el sistema, usá `desactivar-usuario` el mismo día.

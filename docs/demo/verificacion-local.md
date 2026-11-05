# Verificación de la aplicación local

Lista corta para que el responsable revise la aplicación local antes de aprobarla (tarea 8.4 del cambio [`weather-track-registro-cuentas`](../../openspec/changes/archive/2026-11-05-weather-track-registro-cuentas/tasks.md) y tarea 3.3 de [`weather-track-historicos-rangos`](../../openspec/changes/archive/2026-11-05-weather-track-historicos-rangos/tasks.md)). Usa datos simulados y no toca la instalación con datos reales.

## Levantarla

Se usa un proyecto aparte, `wt-revision`, con otros puertos, para no mezclarlo con la instalación real:

```bash
PUERTO_WEB=8090 PUERTO_CORREO=8027 docker compose -p wt-revision --env-file .env.example up --build -d --wait
```

- Aplicación: <http://localhost:8090>
- Correos (Mailpit): <http://localhost:8027>

## Qué revisar

| # | Paso | Qué debería pasar |
|---|---|---|
| 1 | Abrir la aplicación | Pantalla de acceso con la franja "Datos simulados", **Crear una cuenta**, **¿Olvidó su contraseña?** y los textos legales |
| 2 | Crear una cuenta | Pide nombre, apellido, correo, la contraseña dos veces (15 caracteres o más), localidad y provincia; organización y teléfono son opcionales. Novedades viene desmarcado. Si las contraseñas no coinciden, lo avisa y no envía |
| 3 | Intentar ingresar sin confirmar | No entra y ofrece volver a enviar el correo |
| 4 | Abrir Mailpit | Llega "Confirme su cuenta de Weather Track", con la leyenda para darse de baja al pie |
| 5 | Abrir el enlace del correo | "Cuenta confirmada"; la dirección ya no muestra el código |
| 6 | Ingresar | Abre INTA Pergamino, con el selector de estación y **Mi cuenta** en el encabezado |
| 7 | Mi cuenta | Corregir un dato y guardar; cambiar la contraseña, escribiendo la nueva dos veces (llega un aviso por correo) |
| 7b | Históricos de un sensor | Botones Día, Semana y Mes, y **Elegir fechas**: el calendario no ofrece fechas futuras ni de hace más de un año, y un rango de más de 31 días se explica sin consultar |
| 8 | Salir y usar **¿Olvidó su contraseña?** | Llega el enlace; elegir una contraseña nueva e ingresar con ella. El mismo enlace ya no sirve |
| 9 | Darse de baja | Desde Mi cuenta, o desde el enlace de cualquier correo: abrirlo no borra, hay que tocar el botón. Después, esa cuenta ya no entra |
| 10 | Términos y privacidad | Marcados como borrador para revisión legal, versión 2026-11 |

Para ver la base de clientes que quedó, con las cuentas confirmadas:

```bash
docker compose -p wt-revision --env-file .env.example exec -T api python -m app.administracion exportar-clientes
```

## Al terminar

Este comando borra solo el proyecto de revisión, con sus datos simulados:

```bash
docker compose -p wt-revision --env-file .env.example down -v
```

Si todo está como se quiere, se marcan las tareas 8.4 y 3.3 y se archivan los cambios. Si algo no convence, se anota acá y se corrige antes de archivar.

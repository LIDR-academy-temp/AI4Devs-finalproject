# 8. Seguridad, problemas frecuentes y glosario

[← Volver al índice](README.md)

## Seguridad a cargo del operador

Weather Track trae protecciones de fábrica. Algunas dependen de vos.

| Tema | Qué hace Weather Track | Qué te toca |
|---|---|---|
| Archivo `.env` | Nunca lo muestra ni lo envía | Guardarlo con acceso solo para vos, con una copia fuera de la computadora. No mandarlo por correo ni chat |
| Credenciales de SAT2 | Las guarda cifradas; ni la pantalla ni los registros las muestran | Cargarlas solo en «Administración» y cambiarlas si alguien las vio ([capítulo 4](04-sat2-y-sus-claves.md)) |
| Acceso desde la red | En la instalación local, la aplicación, Mailpit y Grafana solo responden en esa misma computadora | No abrir esos puertos a la red: en local no hay HTTPS |
| Contraseñas | Las guarda con un algoritmo de hash fuerte; bloquea tras 5 errores; las sesiones vencen a las 8 horas | Usar una contraseña única para Weather Track y no compartir cuentas |
| Administradores | El permiso solo se da desde la terminal | Mantener la lista corta y revisarla ([capítulo 3](03-cuentas-y-administradores.md)) |
| Respaldos | No los hace solo | Hacerlos y guardarlos protegidos: tienen datos personales ([capítulo 6](06-respaldo-y-restauracion.md)) |
| Datos personales | Exporta la base de clientes sin datos de acceso; la baja borra todo | Usar la base de clientes solo con quienes aceptaron novedades |
| Grafana | No arranca sin contraseña y no admite registro | Elegir una contraseña larga en `GRAFANA_CLAVE_ADMIN` |
| Actualizaciones | — | Instalar las versiones nuevas, con un respaldo antes ([capítulo 7](07-actualizacion.md)) |

## Problemas frecuentes

Los problemas de instalación (Docker cerrado, puertos ocupados, claves que faltan, modos de datos) están en los [problemas frecuentes de la guía de instalación](../despliegue/instalacion-local.md#problemas-frecuentes). Estos son los de la operación diaria:

| Síntoma | Qué hacer |
|---|---|
| Después de reiniciar la computadora, la página no abre | Abrí Docker Desktop y encendé los servicios ([capítulo 1](01-puesta-en-marcha.md#encender-y-apagar)) |
| El semáforo no está en verde | Seguí su sección en el [capítulo 5](05-monitoreo-y-avisos.md#semáforo-de-salud-de-la-estación) |
| No llegan los correos de alerta | Comprobá que tu cuenta sea administradora y esté activa. En la instalación local, los correos quedan en Mailpit, <http://localhost:8025>; para que salgan a internet hace falta un proveedor de correo (variables `SMTP_*` del `.env`) |
| Un usuario no puede ingresar | Puede estar bloqueado 15 minutos, sin confirmar o desactivado. Ver el [capítulo 3](03-cuentas-y-administradores.md) |
| Los gráficos tienen tramos vacíos | Son mediciones que no llegaron, por ejemplo durante un apagado. Weather Track recupera solo los últimos 31 días; lo anterior queda vacío |
| La decisión no cambia aunque cambió el clima | Mirá la hora del último dato de SAT2 en la franja de salud. Si es vieja, el problema está en la estación o en SAT2 |
| Restaurar un respaldo dio errores | Ver el [capítulo 6](06-respaldo-y-restauracion.md#si-algo-sale-mal) |

## Glosario

| Término | Qué es |
|---|---|
| **Administrador** | Una cuenta con permiso para ver «Administración» y recibir las alertas |
| **Alerta** | Un aviso de que algo no funciona. Se abre, avisa por correo y se cierra sola cuando se normaliza |
| **Ciclo** | Cada lectura de SAT2, que el worker hace cada 10 minutos |
| **Contenedor** | Cada programa de Weather Track corriendo dentro de Docker: la base, la aplicación, el worker y otros |
| **Deriva** | El desplazamiento del producto aplicado fuera del lote, por viento o por inversión térmica |
| **Docker** | El programa que corre Weather Track en tu computadora, igual en Windows, macOS y Linux |
| **`.env`** | El archivo de configuración de tu instalación, con las claves. Nunca se comparte |
| **Equipo** | Una estación meteorológica en SAT2. En Weather Track, cada equipo es una estación |
| **Grafana** | Programa opcional que muestra tableros de las mediciones y avisa si el worker se detiene |
| **Índice TIS** | El número de 0 a 100 que Weather Track calcula con la temperatura, el viento, la radiación y la humedad. Cuanto más alto, más riesgo |
| **Inversión térmica** | Cuando el aire a 10 m está más caliente que a 2 m. Favorece la deriva |
| **Mailpit** | El buzón de prueba de la instalación local: recibe los correos para que no salgan a internet |
| **Prometheus** | Programa opcional que guarda la historia de las mediciones del worker |
| **Respaldo** | Una copia de la base en un archivo, para recuperarla ante un problema |
| **SAT2** | El servicio de un tercero que recibe los datos de las estaciones meteorológicas |
| **Semáforo de salud** | La franja que dice si la decisión está al día: «En vivo», «Con demoras» o «Caído» |
| **Worker** | El proceso que lee SAT2, guarda los datos, calcula la recomendación, vigila los controles y envía los correos |

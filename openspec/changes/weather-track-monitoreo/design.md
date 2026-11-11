# Design

## Context

- El worker corre el ciclo cada 10 minutos, escribe un latido en un archivo para Docker y envía los correos de la bandeja de salida. La API nunca envía correos.
- `ejecucion_ingesta` guarda cada ciclo con su resultado. `observacion` guarda cada lectura con `medido_en`.
- `intento_acceso` cuenta los ingresos fallidos por correo, y `limite_ip` los pedidos por acción y dirección IP en ventanas fijas.
- La regla R2 usa `ANTIGUEDAD_MAXIMA = 30 minutos`, de `app/dominio/vigencia.py`.
- La administración ya tiene su pantalla y sus rutas invisibles para el resto (ADR-0004).
- El 11 de noviembre de 2026 el responsable eligió vigilar la ingesta y la frescura, la base y el disco y los accesos sospechosos; avisar en pantalla y por correo; y usar Prometheus y Grafana.

## Goals / Non-Goals

**Goals:**

- Enterarse de un problema sin entrar a mirar, y sin recibir un correo por cada ciclo.
- Ver la historia: cuándo empezó a fallar algo y con qué frecuencia.
- Que la instalación de siempre siga liviana: Prometheus y Grafana se suman solo si se piden.

**Non-Goals:**

- Publicar Grafana o Prometheus en internet: depende de la línea B, en pausa.
- Vigilar los correos que no salen: el responsable no lo eligió.
- Alertmanager: Grafana ya envía los avisos que la aplicación no puede enviar.

## Decisions

### D1. Dos capas, cada una con lo que la otra no puede

| Capa | Siempre activa | Qué hace |
|---|---|---|
| Aplicación | Sí | El worker evalúa los controles, guarda las alertas y avisa por correo. La pantalla de administración las muestra |
| Perfil `monitoreo` | No, se pide con `--profile monitoreo` | Prometheus guarda la historia de las métricas y Grafana la muestra. Grafana avisa por correo si el worker deja de publicar |

Los correos de la aplicación los envía el worker. Si el worker está caído, la aplicación no puede avisar por correo. Por eso:

- la pantalla calcula el estado del worker desde la API, con la hora del último ciclo;
- con el perfil activo, Grafana manda el correo.

### D2. Controles y umbrales

Viven en `app/monitoreo/umbrales.py`, salvo la frescura, que reutiliza `ANTIGUEDAD_MAXIMA` de `vigencia.py` para no repetirla.

| Control | Alerta cuando | Por estación |
|---|---|---|
| `DATOS_VIEJOS` | La última lectura de una estación activa tiene más de 30 minutos | Sí |
| `CICLOS_FALLIDOS` | Los últimos 3 ciclos de una estación activa terminaron en `ERROR` | Sí |
| `DISCO_CASI_LLENO` | Queda menos del 10 % libre en el disco de la base | No |
| `FUERZA_BRUTA` | Hay 20 o más ingresos fallidos en los últimos 15 minutos, o alguna dirección IP fue bloqueada por superar el límite de una acción en la ventana actual | No |

- **Disco:** el worker monta el volumen de la base en modo solo lectura (`datos_db:/datos_db:ro`) y lo mide con `shutil.disk_usage`. El tamaño de la base sale de `pg_database_size`.
- **Modos:** en modo `prueba` no se evalúan `DATOS_VIEJOS` ni `CICLOS_FALLIDOS`, porque ese modo no trae lecturas. En `simulado` sí.
- **Ventana de las primeras horas:** una estación sin lecturas todavía no genera `DATOS_VIEJOS` mientras su carga inicial está en curso.

### D3. Alertas que se abren y se cierran

Tabla `alerta_sistema` (migración `0006`, con `upgrade` y `downgrade`):

| Columna | Uso |
|---|---|
| `id` | Identificador |
| `tipo` | Uno de los cuatro controles |
| `objeto` | La estación afectada, o vacío para los controles generales |
| `abierta_en` | Cuándo empezó |
| `cerrada_en` | Cuándo se normalizó; nulo mientras sigue abierta |
| `detalle` | Texto sin datos personales ni credenciales, por ejemplo «Última lectura hace 47 minutos» |

Una restricción única parcial impide dos alertas abiertas del mismo tipo para el mismo objeto.

- **Abrir:** si un control falla y no hay una alerta abierta para ese tipo y objeto, se abre una y se encola el correo `ALERTA_SISTEMA` a cada administrador activo.
- **Cerrar:** si el control vuelve a estar bien, se cierra y se encola el aviso de normalización.
- **Mientras sigue abierta, no se repite el aviso.**
- Los correos respetan el límite de 3 por hora del mismo tipo y destinatario. Ante una ráfaga de aperturas y cierres, se envían los primeros y el resto queda en la pantalla.

### D4. El panel de estado

`GET /api/v1/administracion/estado`, con las mismas reglas de las otras rutas de administración (ADR-0004). Responde 404 a quien no tiene el rol.

Devuelve:

- cada control, con su estado (`OK` o `ALERTA`) y su detalle;
- el estado del worker: `ACTIVO` si hubo un ciclo en los últimos 20 minutos, o `SIN_ACTIVIDAD`;
- las últimas 20 alertas, abiertas y cerradas;
- el tamaño de la base y el espacio libre del disco, si el worker los midió.

La pantalla de Administración suma la sección «Estado del sistema» arriba de la conexión con SAT2. Cada control se muestra con texto, no solo con color.

### D5. Métricas para Prometheus

El worker publica con `prometheus-client` en `:9464/metrics`. El puerto no se publica en Compose ni pasa por Caddy.

| Métrica | Tipo | Etiquetas |
|---|---|---|
| `weathertrack_lectura_antiguedad_segundos` | gauge | `estacion` |
| `weathertrack_ciclos_fallidos_seguidos` | gauge | `estacion` |
| `weathertrack_ciclo_ultimo_timestamp_segundos` | gauge | `estacion` |
| `weathertrack_base_tamano_bytes` | gauge | |
| `weathertrack_disco_libre_ratio` | gauge | |
| `weathertrack_ingresos_fallidos_15m` | gauge | |
| `weathertrack_alertas_abiertas` | gauge | `tipo` |

- La etiqueta `estacion` es el nombre de la estación, por ejemplo «INTA Pergamino».
- Ninguna métrica lleva correos, direcciones IP ni credenciales.

### D6. Perfil `monitoreo`: Prometheus y Grafana

- **Imágenes:** fijadas por versión exacta, `prom/prometheus` y `grafana/grafana-oss`.
- **Prometheus:**
  - toma las métricas de `worker:9464` cada minuto y guarda 30 días;
  - no publica su puerto: Grafana lo consulta por la red interna.
- **Grafana:**
  - publica solo en `127.0.0.1:${PUERTO_GRAFANA:-3000}`;
  - su usuario administrador toma la contraseña de `GRAFANA_CLAVE_ADMIN`, obligatoria en el perfil;
  - no admite registro ni acceso anónimo.
- **Configuración como código,** versionada en `monitoreo/`:
  - `prometheus.yml`;
  - la fuente de datos de Grafana;
  - el tablero «Weather Track», con frescura por estación, ciclos fallidos, tamaño de la base, disco libre, ingresos fallidos y alertas abiertas;
  - una regla de alerta: el worker no publica métricas durante 5 minutos.
- **Correo de Grafana:** usa el mismo servidor de correo que el worker (Mailpit en local) y lo envía a `ALERTAS_CORREO`.
- **Producción:** `docker-compose.prod.yml` no incluye el perfil. Publicarlo con HTTPS queda para la línea B.

## Risks / Trade-offs

- [Prometheus y Grafana suman memoria y disco] → Van en un perfil opcional. Prometheus guarda solo 30 días.
- [El correo de Grafana va a una dirección fija y no a los administradores de la base] → Grafana no lee la base de la aplicación. `ALERTAS_CORREO` se configura una vez, y su único aviso es el del worker caído.
- [Un falso positivo de `FUERZA_BRUTA`, por ejemplo durante las pruebas negativas] → Llega un solo correo por alerta. El umbral es una constante, en un único lugar.
- [Montar el volumen de la base en el worker] → Es de solo lectura, y el worker ya tiene acceso completo a la base por la red. Se usa solo para medir el espacio libre.

## Migration Plan

1. Se despliega: la migración `0006` se aplica sola y el worker empieza a evaluar los controles. La instalación de siempre no cambia de servicios.
2. Para el tablero, el responsable define `GRAFANA_CLAVE_ADMIN` y `ALERTAS_CORREO` y levanta con `--profile monitoreo`.
3. Verifica el tablero y provoca una alerta: detiene el worker y comprueba el panel y los correos.

**Vuelta atrás:** el `downgrade` borra `alerta_sistema`. Sin el perfil, Prometheus y Grafana no se levantan.

## Open Questions

Ninguna.

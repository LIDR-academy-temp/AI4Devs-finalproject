# Design

## Context

Ver `proposal.md` para la motivación y las specs de este cambio para el comportamiento.

Estado actual, que condiciona el diseño:

- Las cuentas viven en la tabla `usuario` de PostgreSQL, con contraseñas en Argon2id y un semáforo que limita los cálculos simultáneos. Las sesiones son identificadores aleatorios guardados como hash, en una cookie `HttpOnly` y `SameSite=Lax`, con vigencia de 8 horas.
- El límite de intentos es por correo: 5 fallos en 15 minutos. No hay límite por IP (riesgo R1 de la revisión de seguridad).
- El acceso a una estación depende de la tabla `usuario_estacion`.
- La API corre en un solo proceso de uvicorn, detrás de Caddy, y no está publicada fuera de la red interna de Compose. No recibe las credenciales de SAT2. El worker lee todo el `.env` y es una sola instancia con APScheduler.
- Los estándares de referencia son OWASP ASVS 5.0 (capítulo V6, autenticación), NIST SP 800-63B-4 y las guías de OWASP para recupero de contraseña y autenticación.

## Goals / Non-Goals

**Goals:**

- Que la identidad siga siendo propia y local, en la misma base, sin proveedores externos.
- Que ningún flujo público permita averiguar qué correos están registrados.
- Que la instalación local funcione completa sin enviar nada a internet.
- Que la API siga sin secretos: ni de SAT2 ni del servidor de correo.

**Non-Goals:**

- Niveles de usuario, roles o pantallas de administración.
- Cambio de correo, segundo factor y llaves de acceso (*passkeys*).
- Elegir el proveedor de correo de producción. Se hace con el despliegue público.

## Decisions

### D1. Identidad propia en PostgreSQL

Las cuentas siguen en la base local de Weather Track.

- **Por qué:** lo pidió el responsable, no agrega dependencias ni costos y la instalación local sigue funcionando sin internet.
- **Alternativa descartada:** Firebase Authentication u otro proveedor. Agrega una cuenta externa, obliga a estar conectado y saca los datos de los clientes de la base propia.

### D2. Modelo de datos

Migración `0003` (la `0002` es de `weather-track-estaciones`):

- **`usuario`:** columnas nuevas `apellido`, `organizacion`, `telefono`, `localidad`, `provincia`, `confirmado_en`, `terminos_version`, `terminos_aceptados_en` y `acepta_novedades`. Son opcionales en la base para no romper las cuentas existentes; la API exige las obligatorias al registrar. Las cuentas existentes quedan confirmadas con `confirmado_en = creado_en`.
- **`enlace_cuenta`:** `id`, `usuario_id` (borrado en cascada), `proposito` (`CONFIRMACION`, `RECUPERO` o `BAJA`), `hash_codigo` único, `creado_en`, `vence_en` y `usado_en`.
- **`correo_saliente`:** `id`, `tipo`, `destinatario`, `asunto`, `cuerpo_texto`, `cuerpo_html`, `cabeceras`, `creado_en`, `intentos`, `proximo_intento_en`, `enviado_en` y `descartado_en`. El asunto, los cuerpos y las cabeceras pasan a nulos al enviar o descartar el correo.
- **`limite_ip`:** `clave` (acción más IP), `ventana_inicio` y `cantidad`, con clave primaria compuesta.

`usuario_estacion` y el comando `asignar-estacion` se conservan sin efecto sobre el acceso, reservados para cuando haya niveles. Así se evita una migración destructiva que habría que deshacer.

### D3. Códigos de un solo uso

Cada enlace usa un código de 256 bits generado con `secrets` y se guarda solo su SHA-256, como las sesiones. Validar un código busca por hash, verifica propósito, vigencia y que no esté usado, y lo marca como usado en la misma transacción.

| Propósito | Vigencia | Al emitir otro |
|---|---|---|
| Confirmación | 48 horas | Invalida el anterior |
| Recupero | 30 minutos | Invalida el anterior |
| Baja | 60 días | Convive con los anteriores; hay uno por correo enviado |

- **Por qué SHA-256 y no Argon2:** el código ya tiene 256 bits de entropía, así que un hash lento no agrega seguridad y sí costo.
- **Alternativa descartada:** códigos firmados con HMAC, sin tabla. Exigen una clave compartida entre API y worker y no permiten invalidar un enlace sin rotarla.

### D4. Bandeja de salida y envío desde el worker

La API escribe el correo en `correo_saliente` dentro de la misma transacción que crea la cuenta o el enlace. Una tarea del worker, cada 10 segundos, envía los pendientes por SMTP con la biblioteca estándar (`smtplib` y `email`), con reintentos espaciados y un máximo de 8 intentos antes de descartar.

- **Por qué:** la respuesta de la API no depende del servidor de correo, tarda lo mismo exista o no la cuenta y los datos del SMTP quedan solo en el worker, que ya lee el `.env`.
- **Alternativa descartada:** `BackgroundTasks` de FastAPI. Pierde el correo si la API se reinicia y obliga a darle las credenciales del SMTP a la API.
- **Límite por destinatario:** antes de encolar se cuentan los correos del mismo tipo y destinatario de la última hora. Si ya hay 3, no se encola y la respuesta no cambia. Tampoco se emiten enlaces nuevos, así el último enlace que recibió la persona sigue sirviendo.
- **Registro del envío:** al enviar o descartar un correo se borran su asunto, sus cuerpos y sus cabeceras; quedan el tipo, el destinatario y las fechas, que usa el límite. Pasado un día, el worker borra también eso.
- **Cabeceras sin plegar:** el mensaje usa la política SMTP con líneas de hasta 998 caracteres. Con la política por defecto, Python codifica la URL larga de `List-Unsubscribe` y ningún programa de correo la reconoce.

### D5. Correo local con Mailpit

Un servicio `correo` con la imagen `axllent/mailpit`, con la versión fijada al implementar, recibe el SMTP en la red interna y publica su página solo en `127.0.0.1:8025`. En `docker-compose.prod.yml` se desactiva y se exigen `SMTP_HOST`, `SMTP_PUERTO`, `SMTP_USUARIO`, `SMTP_CLAVE` y `CORREO_REMITENTE`, con STARTTLS obligatorio.

- **Por qué:** permite probar los flujos de punta a punta sin cuenta de correo ni riesgo de envíos reales, y las pruebas de extremo a extremo pueden leer los correos desde su API.

### D6. Enlaces con el código después de `#`

Los enlaces del cuerpo tienen la forma `https://DOMINIO/confirmar#codigo=...`. El frontend lee el código del fragmento, lo borra de la barra de direcciones con `history.replaceState` y lo envía en el cuerpo de un `POST`. Los registros de Caddy y uvicorn nunca ven el código, y el `Referrer-Policy` actual evita filtrarlo a otros sitios.

La baja en un clic (RFC 8058) es la excepción: la cabecera apunta a `POST /api/v1/cuenta/baja-un-clic?codigo=...`, porque la llama el programa de correo y no un navegador. Se agrega un filtro al registro de accesos de uvicorn que reemplaza el valor de `codigo`.

Abrir `/baja#codigo=...` muestra un botón de confirmación: un `GET` nunca borra nada, así que los analizadores de enlaces de los servicios de correo no pueden dar de baja a nadie.

### D7. Respuestas uniformes

Registro, recupero y reenvío de confirmación responden siempre `202` con el mismo cuerpo. El caso "correo ya confirmado" del registro encola un aviso en lugar de la confirmación; el trabajo de la API es el mismo: una consulta y una inserción, sin calcular Argon2 si la cuenta ya existe. Para que el tiempo tampoco delate la existencia, el registro siempre calcula el hash de la contraseña recibida, aunque después lo descarte.

Iniciar sesión con una cuenta sin confirmar y la contraseña correcta responde `403 CUENTA_SIN_CONFIRMAR`. Solo lo ve quien ya conoce la contraseña, así que no revela nada nuevo.

### D8. Política de contraseñas

Entre 15 y 128 caracteres contados en Unicode normalizado NFKC, sin reglas de composición, con espacios permitidos y pegado permitido. Se rechazan las que aparecen en una lista local de contraseñas comunes, comparada en minúsculas, y las que contienen el correo o su parte local.

- **Por qué 15:** NIST SP 800-63B-4 lo exige cuando la contraseña es el único factor, y ASVS 5.0 lo recomienda con fuerza.
- **Por qué una lista local:** consultar un servicio externo de contraseñas filtradas mandaría datos derivados de la contraseña a un tercero. La lista se toma de una fuente con licencia compatible, que se verifica al implementar.
- **Las cuentas existentes** conservan su contraseña. La política se aplica al elegir una nueva.

### D9. Límite por dirección IP

Ventana fija en `limite_ip`, actualizada con un `INSERT ... ON CONFLICT DO UPDATE` atómico. La IP sale de `X-Forwarded-For`, que Caddy reemplaza en cada pedido. uvicorn arranca con `--proxy-headers` y `--forwarded-allow-ips=*`: la API no publica su puerto, así que solo le llega lo que reenvía Caddy, y la dirección de Caddy dentro de la red de Compose cambia en cada arranque. Una prueba de Compose verifica que la API no tenga puertos publicados. Sin esa opción, uvicorn solo confía en `127.0.0.1`, vería a todos con la dirección de Caddy y el límite sería uno solo para todos.

| Acción | Límite por IP |
|---|---|
| Inicio de sesión | 30 cada 15 minutos |
| Registro | 5 por hora |
| Recupero y reenvío de confirmación | 10 por hora |
| Uso de enlaces | 30 cada 15 minutos |

Los valores quedan en constantes y se ajustan con las pruebas de carga. El worker borra las ventanas vencidas.

- **Alternativa descartada:** el límite en Caddy. La imagen estándar no trae el módulo y compilar una propia agrega mantenimiento.
- **Alternativa descartada:** contadores en memoria. Se pierden al reiniciar y no sirven si algún día hay más de un proceso.

### D10. Acceso a las estaciones

Una estación es un equipo de SAT2, no un permiso. `obtener_estacion_autorizada` deja de consultar `usuario_estacion` y solo verifica que la estación exista: devuelve `404` si no. El listado devuelve todas las estaciones, activas e inactivas; cómo se presenta una inactiva lo define `weather-track-estaciones`. El rechazo se prueba con un identificador inexistente, sin estaciones ficticias.

### D11. Borrado de datos

La baja y el vencimiento borran la fila de `usuario`. Las sesiones y los enlaces caen en cascada, y se borran también los intentos fallidos de ese correo y los correos pendientes a ese destinatario. Una tarea del worker, cada 15 minutos, borra las cuentas sin confirmar cuyo último enlace de confirmación venció.

### D12. Frontend

Rutas públicas nuevas: `/registro`, `/confirmar`, `/recuperar`, `/restablecer`, `/baja`, `/privacidad` y `/terminos`. Ruta protegida nueva: `/cuenta`. Los textos de privacidad y términos son un borrador con su versión (`2026-11`), marcado para revisión legal. Los formularios muestran los errores por campo y los avisos genéricos de D7.

## Risks / Trade-offs

- [Los correos locales no prueban la entrega real] → Las pruebas cubren la bandeja y el SMTP contra Mailpit. La entrega real, SPF, DKIM y DMARC se verifican con el proveedor, en el despliegue público.
- [15 caracteres puede incomodar] → Se explica en el formulario que una frase sirve, y se permite pegar desde un gestor de contraseñas.
- [Una IP compartida, como la de una cooperativa, puede llegar al límite] → Los límites son holgados para uso humano y el `Retry-After` dice cuánto esperar.
- [El borrado inmediato no deja rastro para auditoría] → Es lo que pidió el responsable y lo que corresponde a la supresión de datos. Los registros del sistema guardan el evento sin datos personales.
- [Ley 25.326] → La base de clientes requiere revisión legal antes de su uso comercial, incluida la inscripción ante la Agencia de Acceso a la Información Pública. Queda fuera del código.
- [Todas las cuentas ven todas las estaciones] → Es la decisión vigente, confirmada por el responsable. `usuario_estacion` queda lista para cuando haya niveles.

## Migration Plan

1. Archivar `weather-track-mvp-nucleo` para que sus especificaciones pasen a `openspec/specs`. Su tarea 11.2, el despliegue en Google Cloud, sigue en la hoja de ruta.
2. La migración `0003` es aditiva y marca como confirmadas las cuentas existentes. Para volver atrás, su `downgrade` borra las tablas y columnas nuevas.
3. `docker compose up --build` aplica la migración, levanta Mailpit y el worker empieza a enviar y a borrar.
4. Las pruebas, las de extremo a extremo y las negativas se amplían antes de que el responsable verifique la aplicación local.

## Open Questions

- El texto final de los términos y la política de privacidad, a cargo del responsable y de su asesoría legal. No cambia el diseño: el sistema guarda la versión aceptada.

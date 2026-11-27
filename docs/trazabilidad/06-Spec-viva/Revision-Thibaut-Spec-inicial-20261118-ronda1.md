# Revisión adversarial

- Fecha: 2026-11-18 22:25 EST
- Perfil: `openai` · protocolo `openai-responses`
- Modelo pedido: `gpt-5.6-sol` · modelo que respondió: `gpt-5.6-sol`
- Archivo: `<repositorio>/openspec/specs/acceso/spec.md` · huella `c8edb7c45933` · 16725 caracteres
- Archivo: `<repositorio>/openspec/specs/aviso-inicio/spec.md` · huella `0131f3be7dd7` · 12557 caracteres
- Archivo: `<repositorio>/openspec/specs/no-reportados/spec.md` · huella `0f48546bc3ae` · 16604 caracteres
- Archivo: `<espacio-de-trabajo>/05-Tickets/Recorte-Entrega-20261118-v1.md` · huella `175121784f88` · 5747 caracteres
- Archivo: `<espacio-de-trabajo>/06-Spec-viva/HU-01.6-prueba-local-20261118-v1.md` · huella `300e2df41965` · 4913 caracteres
- Archivo: `<espacio-de-trabajo>/04-Backlog/Backlog-MVP-Controlador-de-Tiempo-20261118-v5.md` · huella `84e92c472ace` · 38894 caracteres
- Naturaleza: opinión de un modelo, no veredicto. No bloquea nada.

---

## Hallazgos

### 1. CRÍTICO — La separación por organización puede eludirse mediante identificadores de organización nulos

- **Qué está mal:** Las columnas que sostienen la frontera entre organizaciones no están declaradas `NOT NULL`, y las llaves foráneas compuestas de PostgreSQL no validan la relación si uno de sus componentes es nulo.
- **Evidencia:**
  - `acceso/spec.md`, sección **Datos**: `usuario.organizacion_id` solo figura como “FK a organizacion”; `usuario_rol.organizacion_id` tampoco tiene `NOT NULL`.
  - `aviso-inicio/spec.md`, sección **Datos**: `cliente.organizacion_id`, `asignacion.organizacion_id` y `aviso_inicio.organizacion_id` carecen de `NOT NULL`.
  - `no-reportados/spec.md`, sección **Datos**: ocurre lo mismo con `parametro.organizacion_id` y `no_reportado.organizacion_id`.
- **Regla que se rompe y fallo:** Rompe **“Un correo, una cuenta, una organización”** y **“Separación por organización en la base”**. Una fila con `organizacion_id = NULL` puede quedar sin organización; además, una FK como `(`asignacion_id`, `organizacion_id`)` no comprueba que la asignación pertenezca a la organización cuando el segundo valor es nulo. La credencial del sistema, que elude las reglas, podría procesar esa fila y asociarla o enviarla a una organización incorrecta.

### 2. ALTO — La supuesta barrera de RLS no cubre a propietarios de tablas ni roles con privilegio de omisión

- **Qué está mal:** La comprobación estructural solo exige que RLS esté activado y exista alguna política; no exige ni verifica que el rol usado para consultas quede efectivamente sometido a ella.
- **Evidencia:** `acceso/spec.md`, requisito **“Separación por organización en la base”**: la comprobación falla si una tabla “no tiene `organizacion_id`, no tiene las reglas de la base activadas o no tiene al menos una regla”. No se define propiedad de tablas, privilegios ni obligatoriedad de RLS para el propietario. La misma especificación reconoce una credencial que “no pasa por estas reglas”.
- **Regla que se rompe y fallo:** Rompe el escenario **“consulta directa a la base”**. En PostgreSQL, un propietario de tabla o un rol con capacidad de omitir RLS puede recibir todas las filas aunque RLS aparezca activado y la comprobación estructural esté verde.

### 3. ALTO — El modelo admite asignaciones y personas sin datos indispensables para clasificar o enviar el correo

- **Qué está mal:** Varias columnas usadas obligatoriamente por las reglas no tienen restricción `NOT NULL`.
- **Evidencia:**
  - `aviso-inicio/spec.md`, tabla `asignacion`: no se declara `NOT NULL` para `consultor_id`, `supervisor_id`, `cliente_id`, `inicio`, `hora_inicio` ni `hora_fin`; solo se aclara que `fin` admite nulo.
  - Mismo archivo, tabla `cliente`: `alias` no está declarado `NOT NULL`.
  - `acceso/spec.md`, tabla `usuario`: `nombre` y `telefono` no están declarados `NOT NULL`.
  - `no-reportados/spec.md`, requisito **“Contenido mínimo del correo”** exige nombre, cliente, hora comprometida y teléfono.
- **Regla que se rompe y fallo:** Rompe **“Asignación pendiente de aviso”**, **“Clasificación de no reportados”** y el escenario **“los cinco datos”**. Un `CHECK` como `hora_fin > hora_inicio` acepta valores nulos en PostgreSQL; una asignación sin hora o fecha no puede obtener un inicio comprometido, y un usuario sin nombre o teléfono produce un correo que no contiene los cinco datos obligatorios.

### 4. ALTO — La política de reintento del correo se contradice entre el recorte y la especificación

- **Qué está mal:** Un documento ordena no reintentar y otro lo exige en la ejecución siguiente.
- **Evidencia:**
  - `Recorte-Entrega-20261118-v1.md`, sección **2**, HU-07.7: “**Si un correo no sale, no se reintenta**”.
  - Mismo archivo, sección **3**, HU-07.4: “Entrega el correo al servicio **sin reintento**”.
  - `no-reportados/spec.md`, requisito **“Correo agrupado al supervisor”**: si el servicio no acepta el mensaje, “entran en el correo de la ejecución siguiente”.
  - El alcance de esa especificación dice además que HU-07.CA-10 no entra, aunque luego impone su comportamiento.
- **Regla que se rompe y fallo:** Rompe HU-07.CA-10 y deja dos resultados incompatibles para el escenario **“el servicio de correo rechaza”**: en una implementación el correo queda abandonado; en la otra se vuelve a enviar.

### 5. ALTO — HU-07.CA-15 queda incumplido aunque el recorte no lo reconoce como criterio excluido

- **Qué está mal:** El criterio exige que el reporte sea consultable en la aplicación, pero toda consulta en pantalla está diferida.
- **Evidencia:**
  - `Backlog-MVP-Controlador-de-Tiempo-20261118-v5.md`, **HU-07.CA-15**: el reporte queda “generado y **consultable en la aplicación**” en un intervalo.
  - `no-reportados/spec.md`, alcance: “**Consulta en pantalla | HU-10 | El supervisor se entera por el correo**”.
  - `Recorte-Entrega-20261118-v1.md`, sección **2**: HU-10.1 y HU-10.2 están diferidos.
  - La lista **“Criterios que este recorte deja sin comprobar”** no incluye HU-07.CA-15.
- **Regla que se rompe y fallo:** Al vencer el margen, la fila puede existir y el correo puede estar pendiente, pero el supervisor no puede consultarla en la aplicación dentro del plazo prometido.

### 6. ALTO — El despliegue H-4 no vuelve a comprobar las propiedades del servicio de autenticación que los documentos dicen que comprobará

- **Qué está mal:** Se delega al despliegue la validación contra el servicio gestionado, pero H-4 solo contiene dos comprobaciones ajenas a P2 y P5.
- **Evidencia:**
  - `HU-01.6-prueba-local-20261118-v1.md`, **Límites de esta prueba**: lo observado en local “se vuelve a comprobar en el despliegue (H-4)”.
  - `acceso/spec.md`, **Riesgos aceptados**: “Se vuelve a comprobar en el despliegue (H-4)”.
  - `Recorte-Entrega-20261118-v1.md`, definición de **H-4**: solo comprueba que llegue un correo de ejemplo y que avisar tarde menos de cinco segundos.
- **Regla que se rompe y fallo:** Quedan sin verificar en el servicio gestionado la invalidación inmediata al cerrar sesión y la conservación de la marca de entrada al renovar. Si P2 o P5 difieren de la instancia local, fallan **“el pase anterior ya no sirve”** o la duración propia de `sesion_dias`.

### 7. ALTO — Las operaciones autenticadas por cookie carecen de una regla verificable contra peticiones entre sitios

- **Qué está mal:** Se usa una cookie para autenticar escrituras, pero no hay requisito ni escenario sobre atributos de la cookie, origen de la petición o protección contra CSRF.
- **Evidencia:**
  - `acceso/spec.md`, decisión **“Sesión por cookie”**: “La sesión viaja en una cookie”.
  - `aviso-inicio/spec.md`, requisito **“Registrar el aviso”**: una petición autenticada crea un registro irreversible.
  - Ningún requisito de `acceso` o `aviso-inicio` exige comprobar origen, token antifalsificación o comportamiento `SameSite`.
- **Regla que se rompe y fallo:** Un sitio externo podría inducir al navegador a registrar un aviso usando la cookie de una sesión abierta, si el cliente del proveedor permite enviarla en ese contexto. El sistema confirmaría falsamente que la persona inició actividades y el aviso no podría corregirse ni quitarse.

### 8. ALTO — La matriz por rol no puede representar los permisos definidos para usuarios con varios roles y asignaciones propias

- **Qué está mal:** La matriz exige una única decisión por operación y rol, pero registrar un aviso está permitido o rechazado para un supervisor según tenga asignación propia.
- **Evidencia:**
  - `acceso/spec.md`, requisito **“Matriz de permisos”**: “una fila por operación y una columna por rol, y en cada celda un caso permitido o uno rechazado”.
  - Requisito **“Roles”**: una persona puede tener más de un rol.
  - Escenario **“nadie avisa por otro”**: supervisor o dirección rechazado.
  - Escenario **“supervisor con asignación propia”**: el aviso se acepta.
  - **“Autorización en el código”**, escenario “operación no permitida”: supervisor sin asignación propia rechazado.
- **Regla que se rompe y fallo:** La celda `registrar aviso × supervisor` no tiene un resultado binario correcto. Si se marca rechazada, no prueba al supervisor con asignación propia; si se marca permitida, no prueba al supervisor que intenta avisar por otro.

### 9. ALTO — Una decisión pendiente se usa como regla normativa para calcular la vigencia de parámetros

- **Qué está mal:** El comportamiento depende de la zona horaria de la organización, pero esa decisión sigue expresamente pendiente.
- **Evidencia:**
  - `acceso/spec.md`, tabla `organizacion`: `zona_horaria` aparece como “**propuesta pendiente de la Dirección**”.
  - `no-reportados/spec.md`, requisito **“Parámetro vigente”**: usa “la fecha de hoy de la organización”.
  - Mismo requisito, **Punto E-1**: la zona de la organización es una propuesta pendiente y se menciona como alternativa la fecha del servidor.
- **Regla que se rompe y fallo:** Los escenarios **“cambio que rige mañana”** y **“al día siguiente”** no tienen un resultado único cerca de la medianoche. La misma fila de parámetro puede estar vigente o no según se aplique la propuesta pendiente o la fecha del servidor.

### 10. ALTO — Un correo rechazado cerca de la medianoche puede quedar pendiente para siempre

- **Qué está mal:** El reintento solo agrupa no reportados que sean del día en curso de la asignación.
- **Evidencia:** `no-reportados/spec.md`, requisito **“Correo agrupado al supervisor”**:
  - procesa los no reportados “sin notificar y sean **del día en curso de su asignación**”;
  - si el servicio rechaza, “entran en el correo de la ejecución siguiente”.
- **Regla que se rompe y fallo:** Si el servicio rechaza el último envío antes de que cambie el día del cliente, en la ejecución siguiente la fila ya no es del día en curso y queda excluida. `notificado_en` permanece nulo, pero ninguna regla posterior vuelve a enviarla.

### 11. ALTO — El no reportado debe ser inmutable y modificarse a la vez

- **Qué está mal:** Una regla afirma que la fila no cambia, mientras otra obliga a cambiar `notificado_en`.
- **Evidencia:**
  - `no-reportados/spec.md`, requisito **“El no reportado se conserva”**: “no se borra ni cambia”.
  - Escenario **“aviso posterior”**: “la misma, con los mismos valores”.
  - Requisito **“Correo agrupado al supervisor”**: cuando el servicio acepta, los no reportados “quedan marcados con `notificado_en`”.
- **Regla que se rompe y fallo:** Una prueba que compare todos los valores antes y después del aviso o del envío fallará si `notificado_en` cambia; si no cambia, falla la deduplicación de correos.

### 12. ALTO — La dirección no puede ver necesariamente todos los clientes de su organización

- **Qué está mal:** El permiso sobre `cliente` depende de que exista una asignación visible, aunque la dirección debe ver todo lo de su organización.
- **Evidencia:**
  - `acceso/spec.md`, tabla de **“Reglas por rol en la base”**, fila `cliente`: “Los de las asignaciones que puede ver”.
  - `Backlog-MVP-Controlador-de-Tiempo-20261118-v5.md`, **HU-02.CA-6**: dirección “ve todo lo de mi organización”.
- **Regla que se rompe y fallo:** Un cliente recién cargado o sin asignaciones queda invisible incluso para dirección al consultar directamente `cliente`, pese a pertenecer a su organización.

## Hallazgos medios

### 13. MEDIO — La API puede registrar una asignación pendiente distinta de la que “toca”

- **Qué está mal:** La pantalla selecciona la asignación pendiente más temprana, pero la validación de escritura solo exige que la asignación solicitada esté pendiente.
- **Evidencia:**
  - `aviso-inicio/spec.md`, requisito **“Cuál asignación toca”**: se ofrece una sola, la de inicio más temprano.
  - Requisito **“Registrar el aviso”**: dice registrar “la asignación que toca”, pero termina con “Solo se registra si la asignación está pendiente”.
  - `acceso/spec.md`, permisos de `aviso_inicio`: permite crear al consultor de la asignación, sin condición sobre que sea la primera.
- **Regla que se rompe y fallo:** Con asignaciones pendientes a las 08:00 y 14:00, una llamada directa que identifique la de las 14:00 puede aceptarse a las 07:50, aunque la interfaz solo debía permitir la de las 08:00.

### 14. MEDIO — La frecuencia de intervalos mayores de una hora no tiene una referencia temporal definida

- **Qué está mal:** Se permiten intervalos arbitrarios múltiplos de cinco, pero no se define desde qué origen se calcula el módulo.
- **Evidencia:**
  - `no-reportados/spec.md`, tabla `parametro`: intervalo “de 5 o más y múltiplo de 5”, sin máximo.
  - Requisito **“Ejecución recurrente”**: procesa cuando “el minuto de la llamada, contado en múltiplos de 5, es múltiplo de su intervalo”.
- **Regla que se rompe y fallo:** Para intervalos como 75 o 90 minutos, usar el minuto dentro de la hora, los minutos desde medianoche o una marca absoluta produce calendarios distintos. El escenario solo cubre 5 y 15, por lo que no detecta organizaciones omitidas o procesadas con una frecuencia equivocada.

### 15. MEDIO — El límite exacto de vencimiento de la sesión no está probado

- **Qué está mal:** Solo se cubren valores menores y mayores que `sesion_dias`, no el instante exacto.
- **Evidencia:** `acceso/spec.md`, requisito **“Sesión vigente”**: “No pasaron más de `sesion_dias` días”; escenarios **“se vuelve a abrir dentro del plazo”** y **“pasó el plazo”** usan “menos” y “más”.
- **Regla que se rompe y fallo:** En el instante exacto de 30 días, una implementación con `>=` cerrará la sesión y otra con `>` la conservará. Ambas pasarían los escenarios escritos.

### 16. MEDIO — No se define cómo convertir horas locales ambiguas o inexistentes por cambio horario

- **Qué está mal:** El inicio comprometido se convierte desde fecha, hora y zona del cliente, pero no hay regla para transiciones de horario estacional.
- **Evidencia:**
  - `aviso-inicio/spec.md`, **Vocabulario**: el instante resulta de la hora de la asignación, el día y la zona del cliente.
  - Las tablas admiten zonas de la lista estándar.
  - Los escenarios temporales solo cubren diferencias entre zonas, no saltos o repeticiones de hora.
- **Regla que se rompe y fallo:** Una asignación a una hora que no existe durante el adelanto del reloj, o que ocurre dos veces durante el atraso, puede recibir dos vencimientos distintos o ninguno; cambiarían la puntualidad y la clasificación de no reportado.

### 17. MEDIO — La operación interna afirma no leer datos personales aunque necesariamente los lee para enviar el correo

- **Qué está mal:** El alcance de la credencial interna contiene una afirmación imposible de conciliar con la construcción del correo.
- **Evidencia:**
  - `no-reportados/spec.md`, **“Protección de la ejecución recurrente”**, punto 4: “No lee ni devuelve datos de personas”.
  - Requisito **“Contenido mínimo del correo”**: debe obtener nombre, cliente, hora, retraso y teléfono.
- **Regla que se rompe y fallo:** La revisión de privilegios puede aprobar una credencial como incapaz de leer datos personales, pero la ejecución necesita leerlos para formar el mensaje. La afirmación de alcance y el comportamiento exigido no pueden ser ciertos simultáneamente.

## Sospechas que no pueden confirmarse sin políticas o código

- Las políticas de rol y de organización podrían combinarse con semántica permisiva y dejar pasar filas si se implementan como políticas independientes; no se muestran sus expresiones exactas.
- No se especifica cómo se introduce de forma segura la identidad del usuario en la conexión a PostgreSQL ni cómo se limpia ese contexto al reutilizar conexiones. Un contexto heredado por el pool podría aplicar la organización del usuario anterior.
- No se exige escapar `nombre`, `alias` u otros textos al construir el correo; sin conocer el formato y la biblioteca usada, no puede demostrarse una inyección de HTML.

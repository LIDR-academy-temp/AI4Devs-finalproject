# Revisión adversarial

- Fecha: 2026-11-19 10:53 EST
- Perfil: `openai` · protocolo `openai-responses`
- Modelo pedido: `gpt-5.6-sol` · modelo que respondió: `gpt-5.6-sol`
- Archivo: `<repositorio>/openspec/specs/acceso/spec.md` · huella `fa481eb7e751` · 30778 caracteres
- Archivo: `<repositorio>/openspec/specs/aviso-inicio/spec.md` · huella `c89ca51dc3f9` · 25696 caracteres
- Archivo: `<repositorio>/openspec/specs/no-reportados/spec.md` · huella `76fff9606102` · 28538 caracteres
- Archivo: `<espacio-de-trabajo>/05-Tickets/Recorte-Entrega-20261119-v4.md` · huella `c6d68d085af4` · 8225 caracteres
- Archivo: `<espacio-de-trabajo>/06-Spec-viva/HU-01.6-prueba-local-20261118-v1.md` · huella `300e2df41965` · 4913 caracteres
- Archivo: `<espacio-de-trabajo>/04-Backlog/Backlog-MVP-Controlador-de-Tiempo-20261118-v5.md` · huella `84e92c472ace` · 38894 caracteres
- Naturaleza: opinión de un modelo, no veredicto. No bloquea nada.

---

## Hallazgos

### 1. CRÍTICO — La barrera entre organizaciones solo inspecciona tablas y deja fuera vistas y funciones con privilegios

- **Qué está mal:** La comprobación estructural puede pasar aunque una vista o función expuesta permita saltarse las reglas por fila y leer datos de todas las organizaciones.
- **Evidencia:**
  - `openspec/specs/acceso/spec.md`, requisito **«Separación por organización en la base»**: define como objeto de negocio “**toda tabla**” y la comprobación “DEBE recorrer **todas las tablas** de negocio”.
  - El mismo requisito solo comprueba `organizacion_id`, activación y forzado de reglas, política restrictiva, dueño de tablas y roles que pueden omitirlas.
  - `openspec/specs/acceso/spec.md`, escenario **«tabla nueva sin regla»**, y **«tabla en un esquema nuevo»**: ambos cubren únicamente tablas.
  - La propia especificación introduce una operación privilegiada que “**corre como su dueño**”, demostrando que existen rutinas con privilegios distintos de los del llamador.
- **Regla que se rompe y fallo observable:** Se rompen HU-03.CA-1 a CA-3 y el propósito “ninguna organización ve a otra”. Una migración puede crear una vista o una función con dueño que omita las reglas, conceder su ejecución o consulta a usuarios y devolver filas de otra organización; la comprobación estructural seguiría en verde porque no apareció una tabla nueva sin política.

### 2. ALTO — El plazo del reporte se da por cumplido alterando `detectado_en`, aunque la fila pueda aparecer mucho después

- **Qué está mal:** La especificación sustituye el plazo de generación real del reporte por un sello de tiempo retroactivo, pese a que el criterio exige que el reporte exista dentro de un intervalo.
- **Evidencia:**
  - `Backlog-MVP-Controlador-de-Tiempo-20261118-v5.md`, **HU-07.CA-15**: “el reporte queda **generado y consultable en la aplicación** con un retraso máximo de un intervalo”.
  - `Recorte-Entrega-20261119-v4.md`, sección **«Criterios que este recorte deja sin comprobar»**: HU-07.CA-15 entra en parte porque “**el reporte queda generado dentro del plazo**”.
  - `openspec/specs/no-reportados/spec.md`, requisito **«Ejecución recurrente»**: reconoce que “la fila aparece en la base después de `detectado_en`” y que el tiempo acumulado de procesar organizaciones “**no se acota**”.
  - El escenario **«plazo»** solo exige que la diferencia entre el vencimiento y `detectado_en` no pase de un intervalo “aunque el proceso de esa llamada tarde”.
- **Regla que se rompe y fallo observable:** Se rompe HU-07.CA-15 y el alcance declarado de la entrega. Una llamada puede comenzar a las 09:05, asignar `detectado_en = 09:05` y crear la fila a las 10:00; el escenario de la especificación pasaría aunque el reporte no existiera durante 55 minutos y el supervisor no pudiera recibirlo.

### 3. ALTO — La garantía de que el correo coincide con la cuenta se contradice con el cambio de correo permitido por el servicio

- **Qué está mal:** El requisito afirma que `usuario.correo` es el correo vigente de autenticación, pero acepta expresamente que ambos queden distintos después de crear el usuario.
- **Evidencia:**
  - `openspec/specs/acceso/spec.md`, requisito **«Un correo, una cuenta, una organización»**: “`usuario.correo` **es el correo con el que esa cuenta entra** en el servicio de autenticación” y la base debe rechazar la falta de coincidencia.
  - El mismo requisito, **«Límite declarado»**: si la cuenta cambia su correo en el servicio, “**la base no se entera**” y “el reporte vaya a la dirección anterior”.
  - `openspec/specs/acceso/spec.md`, **Riesgos aceptados, D-87**: confirma que `usuario.correo` puede quedar viejo.
  - `openspec/specs/no-reportados/spec.md`, **«Contenido mínimo del correo»**: el reporte contiene nombre, cliente, hora, retraso y teléfono.
- **Regla que se rompe y fallo observable:** Se rompe la garantía del propio requisito y la confidencialidad perseguida por HU-03. Tras cambiar el correo en autenticación, la persona entra con el nuevo mientras los reportes con datos personales se envían al anterior. D-87 acepta el riesgo, pero no elimina la contradicción con la garantía absoluta ni asegura que el buzón anterior siga bajo control del usuario.

### 4. ALTO — La identidad efectiva que inserta avisos es contradictoria

- **Qué está mal:** Un archivo dice que la operación de producción corre como el dueño privilegiado, mientras otro afirma que ese dueño nunca se usa en el sistema en servicio.
- **Evidencia:**
  - `openspec/specs/acceso/spec.md`, requisito **«Separación por organización en la base»**: la operación de registro del aviso “**corre como su dueño**”.
  - `openspec/specs/aviso-inicio/spec.md`, sección **Datos**, tabla `aviso_inicio`: solo el dueño de la operación tiene permiso de insertar, pero “**Ese dueño lo usan solo las migraciones y las pruebas automatizadas, nunca el sistema en servicio**”.
  - `openspec/specs/aviso-inicio/spec.md`, requisito **«Registrar el aviso»**: la operación de base inserta el aviso durante el funcionamiento normal y se llama con la sesión de la persona.
  - `Recorte-Entrega-20261119-v4.md`, sección 3, ajuste **HU-06.3**: “El aviso lo escribe en la base el sistema”.
- **Regla que se rompe y fallo observable:** Se rompe el escenario **«aviso aceptado»** o la separación de privilegios. Si la operación se ejecuta con los privilegios de la sesión, el `INSERT` debe fallar porque la persona no tiene permiso; si es una operación con privilegios del dueño, entonces ese dueño sí interviene en producción y la afirmación contraria es falsa. La ambigüedad afecta precisamente al único camino autorizado de escritura de avisos.

### 5. ALTO — Un usuario sin ningún rol puede quedar autorizado por tener una asignación

- **Qué está mal:** No se exige que el consultor de una asignación tenga el rol `consultor`, y la operación privilegiada autoriza por asignación, no por rol.
- **Evidencia:**
  - `openspec/specs/acceso/spec.md`, tabla `usuario_rol`: no hay restricción que obligue a cada usuario a tener al menos un rol.
  - `openspec/specs/aviso-inicio/spec.md`, tabla `asignacion`: solo se valida que `supervisor_id` tenga rol `supervisor`; no existe la validación equivalente para `consultor_id`.
  - El mismo archivo, requisito **«Registrar el aviso»**, punto 1: la operación acepta una asignación si pertenece al consultor identificado por la sesión y a su organización; no exige rol `consultor`.
  - `openspec/specs/acceso/spec.md`, **«Reglas por rol en la base»**: una persona ve las asignaciones “que tiene como consultor”, sin exigir que conserve ese rol.
  - `openspec/specs/acceso/spec.md`, **«Matriz de permisos»**: no existe una columna para “usuario activo sin rol”.
- **Regla que se rompe y fallo observable:** Se rompe el propósito “cada una vea y haga lo que su rol permite”. Un usuario activo sin filas en `usuario_rol` puede ser colocado como `consultor_id`, consultar su asignación y llamar a la operación de aviso; la base lo trataría como consultor por la relación de asignación aunque ningún rol le conceda esa capacidad. La matriz no detectaría este estado.

### 6. MEDIO — La regla de concurrencia más delicada queda sin prueba

- **Qué está mal:** Se afirma que aviso y clasificación concurrentes nunca dejan un resultado incoherente, pero se elimina expresamente la prueba que debe demostrarlo.
- **Evidencia:**
  - `Backlog-MVP-Controlador-de-Tiempo-20261118-v5.md`, **HU-07.CA-20**: exige que el resultado sea uno de dos estados coherentes, “Nunca las dos cosas a medias ni ninguna”.
  - `openspec/specs/aviso-inicio/spec.md`, requisito **«Registrar el aviso»**: “**La prueba de concurrencia que lo demostraría no se escribe en esta entrega**”.
  - `openspec/specs/no-reportados/spec.md`, **Riesgos aceptados**: confirma que la prueba de HU-07.CA-20 no se escribe.
  - `Recorte-Entrega-20261119-v4.md`, sección **«Criterios que este recorte deja sin comprobar»**: enumera HU-07.CA-20.
  - El escenario **«dos peticiones a la vez»** de `aviso-inicio` solo enfrenta dos avisos entre sí; no enfrenta un aviso con la clasificación.
- **Regla que se rompe y fallo observable:** HU-07.CA-20 queda sin cobertura. Un error en el orden del candado, en los límites transaccionales o en la lectura posterior al candado podría dejar un aviso puntual junto con un no reportado, o dejar ambos ausentes. Las demás pruebas seguirían pasando.

## Sospechas no demostradas con el material

- **Límite de entrada compartido:** `acceso/spec.md`, decisión E-3, dice que el servidor llama al servicio de autenticación; D-72 confía en un límite por IP que no se probó. Si el proveedor ve la IP de salida del servidor y no la del navegador, un atacante podría consumir la cuota compartida y bloquear la entrada de todos. El material no demuestra qué IP usa realmente el proveedor.
- **Lecturas entre orígenes:** la regla **«Peticiones que vienen de otro sitio»** protege escrituras, entrada y cierre, pero no declara una política CORS para lecturas autenticadas. No hay evidencia de que CORS sea permisivo, por lo que no puede afirmarse la fuga, pero tampoco hay una regla que la descarte.
- **Distinción entre acceso directo y acceso desde el servidor:** el fallback de **«Separación por organización en la base»** propone rechazar consultas externas y aceptar las del servidor, mientras **«Identidad ante la base»** indica que ambas usan el pase de la persona. No se explica qué señal no falsificable permitiría distinguirlas.

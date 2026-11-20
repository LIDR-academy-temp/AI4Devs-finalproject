# Revisión adversarial

- Fecha: 2026-11-19 10:15 EST
- Perfil: `openai` · protocolo `openai-responses`
- Modelo pedido: `gpt-5.6-sol` · modelo que respondió: `gpt-5.6-sol`
- Archivo: `<repositorio>/openspec/specs/acceso/spec.md` · huella `2fe4a7e5c79a` · 25019 caracteres
- Archivo: `<repositorio>/openspec/specs/aviso-inicio/spec.md` · huella `ffa4631712c3` · 21020 caracteres
- Archivo: `<repositorio>/openspec/specs/no-reportados/spec.md` · huella `a4b836587026` · 24965 caracteres
- Archivo: `<espacio-de-trabajo>/05-Tickets/Recorte-Entrega-20261119-v4.md` · huella `c6d68d085af4` · 8225 caracteres
- Archivo: `<espacio-de-trabajo>/06-Spec-viva/HU-01.6-prueba-local-20261118-v1.md` · huella `300e2df41965` · 4913 caracteres
- Archivo: `<espacio-de-trabajo>/04-Backlog/Backlog-MVP-Controlador-de-Tiempo-20261118-v5.md` · huella `84e92c472ace` · 38894 caracteres
- Naturaleza: opinión de un modelo, no veredicto. No bloquea nada.

---

## Hallazgos

### 1. CRÍTICO — La única escritura iniciada por una persona elude la separación por organización de la base

- **Qué está mal:** el registro de avisos se ejecuta con la identidad del sistema que omite todas las reglas, por lo que la separación para esa escritura depende solo del código y no de las dos capas prometidas.
- **Evidencia:**
  - `acceso/spec.md`, **Alcance de esta entrega**: «separación por organización en las dos capas».
  - `acceso/spec.md`, requisito **Separación por organización en la base**: «La única identidad que omite las reglas es la credencial del sistema».
  - `acceso/spec.md`, requisito **Reglas por rol en la base**, fila `aviso_inicio`: «lo crea el sistema a petición suya, después de aplicar la regla».
  - `aviso-inicio/spec.md`, requisito **Registrar el aviso**: «El aviso lo escribe en la base el sistema».
- **Regla que se rompe y fallo observable:** se rompe HU-03.CA-2 y la separación en dos capas. Si la autorización del código acepta por error una asignación de la organización B en una petición de A, la base la insertará porque ve la credencial privilegiada; la FK compuesta solo comprueba que aviso y asignación pertenezcan entre sí, no que pertenezcan a quien hizo la petición. El aviso ajeno además queda inmutable.

### 2. ALTO — El candado no garantiza un resultado coherente porque ambos procesos fijan la hora antes de obtenerlo

- **Qué está mal:** una clasificación puede crear el no reportado antes que un aviso cuyo `recibido_en` es anterior al vencimiento, dejando simultáneamente un reporte y un aviso puntual.
- **Evidencia:**
  - `aviso-inicio/spec.md`, requisito **Registrar el aviso**: usa «el instante de inicio de la operación» y toma el mismo candado que la clasificación.
  - `no-reportados/spec.md`, requisito **Clasificación de no reportados**: usa «el instante de la llamada» y comprueba el aviso después de tomar el candado.
  - `Backlog-MVP-Controlador-de-Tiempo-20261118-v5.md`, **HU-07.CA-20**: los únicos resultados admitidos son «la llegada tardía sin reporte» o «el reporte y después la llegada tardía».
  - `no-reportados/spec.md`, **Riesgos aceptados**: la prueba de esta concurrencia no se escribe.
- **Regla que se rompe y fallo observable:** si el aviso inicia a las 09:00:00 pero aún no toma el candado, y una clasificación iniciada a las 09:00:01 obtiene primero el candado, esta crea el reporte. Después el aviso conserva las 09:00:00 y queda puntual. El resultado no es ninguno de los permitidos por HU-07.CA-20.

### 3. ALTO — La recuperación “en la primera ejecución” contradice el filtro por intervalo

- **Qué está mal:** al volver de una caída, la primera llamada puede saltarse una organización cuyo intervalo no coincida con ese instante.
- **Evidencia:**
  - `no-reportados/spec.md`, requisito **Ejecución recurrente**: una organización solo se procesa cuando el múltiplo de 5 calculado desde el epoch «es múltiplo de su intervalo».
  - `no-reportados/spec.md`, requisito **Recuperación tras una caída**: «cuando vuelve [...] reportar en la primera ejecución lo que quedó pendiente de ese día».
- **Regla que se rompe y fallo observable:** una organización con intervalo 90 que vuelve a recibir llamadas a las 10:35 no se procesa en esa primera llamada, porque ese punto no corresponde a su múltiplo de 90; puede esperar hasta las 12:00. Por tanto, lo pendiente no se recupera en la primera ejecución como se exige.

### 4. ALTO — La comprobación de origen no impide que otro sitio induzca el aviso mediante clickjacking

- **Qué está mal:** no existe ninguna regla que impida cargar la aplicación dentro de un marco de otro sitio, donde el clic real sale del propio origen y supera la comprobación.
- **Evidencia:**
  - `acceso/spec.md`, requisito **Peticiones que vienen de otro sitio**: acepta una petición cuando «sale de la pantalla del sistema».
  - `aviso-inicio/spec.md`, requisito **Pantalla del consultor**: el aviso se realiza mediante un único botón y un toque.
  - `aviso-inicio/spec.md`, requisito **El aviso no se edita ni se quita**: el resultado es irreversible.
  - Ninguna sección de los archivos aportados prohíbe que el sistema sea embebido por otro sitio.
- **Regla que se rompe y fallo observable:** un sitio hostil puede mostrar la aplicación autenticada en un marco transparente y hacer que la persona pulse el botón creyendo pulsar otra cosa. La petición tendrá como origen efectivo el propio sistema, será aceptada y creará un aviso irreversible inducido por otro sitio, justamente el riesgo que el requisito pretende evitar.

### 5. ALTO — La base no conserva necesariamente el rol del supervisor de una asignación futura

- **Qué está mal:** se afirma que toda asignación conserva un supervisor con rol, pero el bloqueo al quitar el rol se limita a asignaciones “vigentes”, término que además no está definido.
- **Evidencia:**
  - `aviso-inicio/spec.md`, tabla `asignacion`: el disparador de `usuario_rol` rechaza quitar el rol solo «a quien supervisa una asignación vigente».
  - Mismo archivo, decisión posterior a la tabla: «la base lo mantiene en las dos direcciones» y «Para quitárselo, antes se cambia el supervisor de sus asignaciones».
  - Mismo archivo, requisito **La asignación es coherente en la base**: «DEBE rechazar [...] una asignación cuyo supervisor no tenga el rol `supervisor`».
- **Regla que se rompe y fallo observable:** si “vigente” significa activa en la fecha actual, se puede retirar hoy el rol a quien supervisará una asignación futura. Cuando llegue su fecha, la asignación será válida pero el supervisor ya no tendrá el rol, sin que ningún disparador vuelva a comprobarlo. Fallarán las reglas de permisos y el destinatario esperado del correo.

### 6. ALTO — No hay ninguna garantía de que el correo de autenticación coincida con `usuario.correo`

- **Qué está mal:** la identidad se enlaza con el servicio únicamente por UUID, mientras la base mantiene un correo independiente sin comprobar que sea el mismo usado para entrar.
- **Evidencia:**
  - `acceso/spec.md`, tabla `usuario`: «`id`, que es el identificador de la cuenta en el servicio de autenticación» y una columna `correo` separada.
  - `acceso/spec.md`, requisito **Entrar con cuenta activa**: «Las credenciales las comprueba el servicio de autenticación».
  - `acceso/spec.md`, requisito **Un correo, una cuenta, una organización**: la garantía del correo se exige solamente «en la base».
  - No hay escenario que contraste el correo de la cuenta externa con `usuario.correo`.
- **Regla que se rompe y fallo observable:** una cuenta externa con correo A puede compartir UUID con una fila local que declara correo B. La persona entra con A aunque la base atribuya la cuenta a B; además, la unicidad local deja de representar los correos con los que realmente se inicia sesión. Esto invalida la garantía extremo a extremo de HU-01.CA-12 y puede dirigir comunicaciones al correo equivocado.

### 7. MEDIO — La vigencia de todas las sesiones depende de un campo no documentado y aún no aprobado

- **Qué está mal:** un requisito central de acceso se apoya en un dato del pase que el proveedor no documenta y cuyo riesgo sigue pendiente de decisión.
- **Evidencia:**
  - `acceso/spec.md`, requisito **Sesión vigente**, condición 3: usa «el momento de entrada [...] que el servicio anota en el pase».
  - `HU-01.6-prueba-local-20261118-v1.md`, resultado **P5**: solo se comprobó en la versión local 2.192.0.
  - `acceso/spec.md`, **Riesgos aceptados**, última fila: «Propuesto, pendiente de la Dirección» y «una actualización del servicio podría cambiarlo».
- **Regla que se rompe y fallo observable:** si el servicio gestionado o una actualización deja de entregar esa marca, todas las sesiones se consideran vencidas. Una cuenta activa podrá autenticar credenciales, pero no conservar una sesión ni cumplir los escenarios «credenciales correctas» y «se vuelve a abrir dentro del plazo».

### 8. MEDIO — El modelo admite horarios que se convierten en un intervalo de duración cero durante el cambio de hora

- **Qué está mal:** la regla general transforma por separado inicio y fin inexistentes al mismo instante, aunque la base haya aceptado `hora_fin > hora_inicio`.
- **Evidencia:**
  - `aviso-inicio/spec.md`, **Vocabulario — Cambio de hora**: una hora inexistente se mueve al primer instante válido posterior.
  - `aviso-inicio/spec.md`, tabla `asignacion`: solo exige que la hora local de fin sea posterior a la de inicio.
  - `aviso-inicio/spec.md`, **Riesgos aceptados**, última fila: reconoce que 02:30–02:45 puede quedar con inicio y fin en el mismo instante y figura como «Propuesto, pendiente de la Dirección».
  - La tabla `cliente` admite cualquier zona estándar reconocida, no solo las zonas sin horario de verano de los datos de arranque.
- **Regla que se rompe y fallo observable:** en una zona con salto de 02:00 a 03:00, 02:30 y 02:45 se convierten ambas en 03:00. La asignación deja de estar pendiente inmediatamente al llegar ese instante, pero la clasificación puede reportarla después del margen. El sistema admite así un horario operacionalmente incoherente que no está cubierto por escenarios.

### 9. MEDIO — La prueba de menos de cinco segundos no conserva el punto inicial exigido por el backlog

- **Qué está mal:** el criterio mide desde que se abre la aplicación, pero la comprobación de despliegue solo dice que “avisar” toma menos de cinco segundos.
- **Evidencia:**
  - `Backlog-MVP-Controlador-de-Tiempo-20261118-v5.md`, **HU-06.CA-14**: «desde que abro la aplicación hasta la confirmación».
  - `Recorte-Entrega-20261119-v4.md`, sección **H-4 (nuevo)**: «avisar toma menos de 5 segundos con sesión vigente».
  - `aviso-inicio/spec.md`, requisito **Pantalla del consultor**: solo fija que avisar «no pide nada más que un toque».
- **Regla que se rompe y fallo observable:** H-4 puede medir únicamente el toque y la respuesta, omitiendo la carga inicial, la validación remota de sesión y la consulta de la asignación. La prueba podría pasar aunque la experiencia completa desde abrir la aplicación exceda los cinco segundos.

### 10. MEDIO — La matriz no puede detectar automáticamente una operación omitida porque no define de dónde se enumeran las operaciones

- **Qué está mal:** se exige que la batería falle ante cualquier operación sin fila, pero no existe un inventario obligatorio ni un mecanismo de descubrimiento contra el cual comparar la matriz.
- **Evidencia:**
  - `acceso/spec.md`, requisito **Matriz de permisos**, escenario **operación sin fila**: «CUANDO existe una operación del sistema sin fila en la matriz, ENTONCES la batería falla y nombra la operación».
  - Ninguna sección de los archivos aportados define un registro canónico de operaciones, rutas o manejadores que la batería deba enumerar.
- **Regla que se rompe y fallo observable:** una operación nueva puede añadirse al código y omitirse también de la matriz; al no existir una fuente independiente que revele la omisión, la batería permanece verde y el escenario prometido no se puede demostrar.

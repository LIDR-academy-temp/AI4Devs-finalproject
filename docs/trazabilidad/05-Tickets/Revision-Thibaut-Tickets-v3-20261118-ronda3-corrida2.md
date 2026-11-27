# Revisión adversarial

- Fecha: 2026-11-18 14:25 EST
- Perfil: `openai` · protocolo `openai-responses`
- Modelo pedido: `gpt-5.6-sol` · modelo que respondió: `gpt-5.6-sol`
- Archivo: `<espacio-de-trabajo>/05-Tickets/Tickets-MVP-Controlador-de-Tiempo-20261118-v3.md` · huella `08e6525abaf7` · 35593 caracteres
- Archivo: `<espacio-de-trabajo>/04-Backlog/Backlog-MVP-Controlador-de-Tiempo-20261118-v5.md` · huella `84e92c472ace` · 38894 caracteres
- Naturaleza: opinión de un modelo, no veredicto. No bloquea nada.

---

## Hallazgos

### 1. CRÍTICO — Las reglas de acceso por supervisor en la base se construyen antes de que exista la asignación que determina a quién supervisa

- **Qué está mal:** HU-02.1 promete reglas de base por supervisión, pero HU-06.1 crea la asignación y ambas se planifican como tickets independientes del mismo tramo.
- **Evidencia:**
  - `Tickets-MVP-Controlador-de-Tiempo-20261118-v3.md`, **HU-02.1**: «reglas de acceso por rol en la base, incluidos el supervisor que solo ve a sus supervisados».
  - Mismo archivo, **HU-06.1**: crea «Cliente con su zona horaria, asignación [...] y aviso de inicio».
  - Sección 5, **tramo 4**: incluye simultáneamente `HU-02.1` y `HU-06.1`.
  - Sección 5: «Dentro de un tramo, los tickets no dependen entre sí».
  - **HU-03.3** prueba consultas directas a la base, pero solo hereda criterios de separación por organización, no de separación entre supervisores.
- **Regla o escenario roto:** `HU-02.CA-4`, `HU-02.CA-5` y `HU-07.CA-8`.
- **Cómo se vería el fallo:** la política de HU-02.1 no puede referirse de forma segura a una relación de asignación todavía inexistente; posteriormente puede quedar solo el filtro por organización de HU-06.1. Un supervisor podría leer en la base avisos o reportes de consultores de otro supervisor de su misma organización, aunque la autorización del código lo oculte.

### 2. ALTO — La primera operación protegida y la matriz que debe probarla se construyen en paralelo aunque la operación está obligada a modificar esa matriz

- **Qué está mal:** HU-06.3 debe agregar su fila a HU-02.4, pero ambos están en el mismo tramo y expresamente no dependen entre sí.
- **Evidencia:**
  - `Tickets...v3.md`, Definition of Done de **Endpoint/API**: «toda operación nueva agrega su fila a la matriz rol por operación (HU-02.4) [...] en el mismo ticket».
  - **HU-06.3** es de tipo `Endpoint/API` y depende de `HU-06.2, HU-02.2`, no de `HU-02.4`.
  - Sección 5, **tramo 6**: `HU-02.4` y `HU-06.3` aparecen juntos.
  - Sección 5: «Dentro de un tramo, los tickets no dependen entre sí».
- **Regla o escenario roto:** Definition of Done de Endpoint/API y `HU-02.CA-1`, `HU-02.CA-2`, `HU-02.CA-8`.
- **Cómo se vería el fallo:** HU-06.3 se integra cuando la matriz aún no existe, o HU-02.4 nace sin conocer la operación; el registro de avisos queda sin su caso permitido y rechazado por rol.

### 3. ALTO — HU-07.CA-13 se declara completo aunque la operación que cambia los parámetros no tiene tickets

- **Qué está mal:** se da por comprobado el comportamiento posterior a un cambio de margen o intervalo sin construir el script que realiza ese cambio.
- **Evidencia:**
  - `Backlog-MVP-Controlador-de-Tiempo-20261118-v5.md`, **HU-07.CA-13**: «que la dirección cambió hoy el margen o el intervalo [...] siguen usando los valores anteriores; los nuevos rigen desde mañana».
  - Mismo archivo, **HU-11**: el cambio de esos parámetros se hace por script y la historia está «Solo listada».
  - `Tickets...v3.md`, sección 4: HU-07 tiene **18 completos y solo CA-12 y CA-18 en parte**; por tanto CA-13 se cuenta como completo.
  - Mismo archivo, sección 3: `HU-07.1` y `HU-07.2` modelan parámetros vigentes, pero no existe un ticket que implemente su cambio.
  - En contraste, `HU-03.CA-7` sí se deja «en espera» hasta HU-11.
- **Regla o escenario roto:** `HU-07.CA-13` y la propia definición de criterio «completo».
- **Cómo se vería el fallo:** las pruebas del clasificador pasan con registros preparados manualmente, pero el futuro script sobrescribe el valor vigente o le asigna mal la fecha, cambiando retrospectivamente las ejecuciones del día actual.

### 4. ALTO — La regla de fecha y zona horaria que H-1 debe fijar no tiene ningún escenario con organizaciones o clientes en zonas distintas

- **Qué está mal:** el documento exige una conducta determinista cerca de la medianoche, pero admite que sus datos y pruebas no observan ese caso.
- **Evidencia:**
  - `Tickets...v3.md`, límite de **H-3**: «Todos los clientes [...] están en la misma zona horaria. Las pruebas no ven, por tanto, lo que pasa cerca de la medianoche con clientes en zonas distintas».
  - Sección 8, **E-1**: la especificación debe fijar una regla única para que el resultado cerca de medianoche sea siempre el mismo.
  - Sección 8, **E-2**: la misma carencia afecta a la fecha consultada y reconoce que H-3 no la prueba.
  - **HU-07.5** usa el ejemplo 08:00/09:00 y depende de H-3; no incluye zonas distintas.
  - No existe un ticket de prueba específico para HU-10.
- **Regla o escenario roto:** la decisión que produzcan E-1 y E-2, además de `HU-07.CA-9`, `HU-07.CA-13`, `HU-07.CA-19` y `HU-10.CA-1` a `CA-4`.
- **Cómo se vería el fallo:** cerca de medianoche una asignación puede clasificarse con el día equivocado, aplicarse parámetros nuevos antes de tiempo o aparecer en una fecha de consulta distinta de la esperada.

### 5. ALTO — No hay prueba contra ejecuciones repetidas o concurrentes con una credencial válida del proceso recurrente

- **Qué está mal:** E-6 exige decidir qué impide disparar muchas veces la ejecución, pero las pruebas obligatorias solo cubren ausencia de credencial y separación entre organizaciones.
- **Evidencia:**
  - `Tickets...v3.md`, sección 8, **E-6**: debe decidirse «qué impide dispararla muchas veces seguidas».
  - Excepción de HU-07.3 en la sección 1: sus pruebas incluyen «una llamada sin esa credencial» y «dos organizaciones con parámetros distintos»; no exige llamadas repetidas con credencial válida.
  - **HU-07.5** menciona concurrencia, pero hereda `HU-07.CA-20`, cuyo escenario en el backlog es la carrera entre un aviso y la ejecución, no entre dos ejecuciones.
  - `Backlog...v5.md`, **HU-07.CA-20**: «un aviso llega en el mismo momento en que corre la ejecución».
- **Regla o escenario roto:** E-6 y la protección prometida para HU-07.3.
- **Cómo se vería el fallo:** quien obtenga la credencial, o un planificador defectuoso, puede lanzar muchas ejecuciones válidas simultáneas, agotar base y servicio de correo o producir carreras sobre la marca de notificado sin que ninguna prueba falle.

### 6. ALTO — La prueba que captura el correo final no verifica la restricción de datos personales mínimos

- **Qué está mal:** CA-17 se prueba únicamente en el modelo del correo, pero el escenario que captura lo entregado al servicio externo no hereda ese criterio.
- **Evidencia:**
  - `Backlog...v5.md`, **HU-07.CA-17**: el correo lleva solo los datos de CA-2 y no incluye documento de identidad ni datos de salud.
  - `Tickets...v3.md`, **HU-07.4** hereda CA-17.
  - **HU-07.8**, que «captura lo que el sistema entrega al servicio de correo», solo hereda `CA 5, 6, 8, 10, 12`; omite CA-17.
  - Definition of Done de Test: los escenarios prueban los criterios que citan.
- **Regla o escenario roto:** `HU-07.CA-17` y `RNF-6`.
- **Cómo se vería el fallo:** el modelo unitario genera el contenido correcto, pero una plantilla o adaptador posterior añade documento, información médica u otros campos al mensaje real entregado al proveedor de correo; HU-07.8 seguiría pasando.

### 7. ALTO — Se cuenta como completo el bloqueo sin sesión antes de decidir y probar la capa real de acceso

- **Qué está mal:** HU-01.CA-2 se considera completo con reglas de dominio y redirección de frontend, mientras todavía no se sabe si existe una capa API propia que deba bloquear llamadas directas.
- **Evidencia:**
  - `Backlog...v5.md`, **HU-01.CA-2**: sin sesión «no veo ningún dato, no puedo registrar nada».
  - `Tickets...v3.md`, **HU-01.2** es `Modelo/Dominio` y **HU-01.3** es `Frontend`; no hay un ticket Endpoint/API para el acceso.
  - Sección 8, **E-3**: «HU-01 no tiene ticket de tipo Endpoint/API. Si la especificación decide una capa propia, nace un ticket nuevo».
  - Sección 4 declara 11 criterios completos de HU-01 y solo CA-8 en parte, por lo que CA-2 ya se cuenta como completo.
- **Regla o escenario roto:** `HU-01.CA-2` y la definición de criterio completo.
- **Cómo se vería el fallo:** la interfaz redirige correctamente a la pantalla de entrada, pero una llamada directa a una operación existente permite leer o registrar datos sin sesión, o con una sesión desactivada, hasta que se cree el ticket adicional que E-3 deja pendiente.

### 8. MEDIO — Dos tickets de tipo Test no pueden cumplir su propia Definition of Done porque no tienen criterio que citar

- **Qué está mal:** la Definition of Done exige que todo escenario de un ticket Test cite el criterio comprobado, pero HU-01.6 declara expresamente que no hereda ninguno y H-2 tampoco tiene criterios.
- **Evidencia:**
  - `Tickets...v3.md`, Definition of Done de **Test**: «Los escenarios citan el criterio que comprueban».
  - **HU-01.6**, columna Hereda: `—`.
  - Texto posterior: «HU-01.6 no hereda criterios: no hace verdad ninguno».
  - **H-2** es tipo `Test` y su origen es T-01/R-4, no un criterio de aceptación.
  - Las excepciones escritas sustituyen para H-2 y HU-01.6 la especificación previa y las pruebas primero, pero no sustituyen esta obligación del tipo Test.
- **Regla o escenario roto:** Definition of Done de Test.
- **Cómo se vería el fallo:** HU-01.6 y H-2 no pueden cerrarse conforme a la DoD sin citar un criterio inexistente o sin incumplir la regla; como HU-01.6 abre el camino crítico, el bloqueo alcanza a H-1 y al resto del plan.

### 9. MEDIO — H-1 no declara dependencia de H-2 aunque su Definition of Done exige integración continua en verde

- **Qué está mal:** el orden recomendado coloca H-2 antes, pero el grafo permite iniciar o cerrar H-1 sin que exista la integración continua exigida para todos los tickets.
- **Evidencia:**
  - `Tickets...v3.md`, Definition of Done de **Todos**: «la integración continua está en verde».
  - La excepción de H-1 solo sustituye la especificación previa y las pruebas escritas primero; no elimina el requisito de integración continua.
  - Tabla de habilitación: **H-1 depende solo de HU-01.6**.
  - Grafo: `H2 --> HU-03.1`, pero no existe `H2 --> H1`.
- **Regla o escenario roto:** Definition of Done de Todos y la afirmación de que las dependencias fueron cruzadas automáticamente.
- **Cómo se vería el fallo:** H-1 se aprueba mientras H-2 sigue incompleto o fallando; posteriormente HU-03.1 descubre que el repositorio no tiene la integración continua en verde que H-1 ya debía haber satisfecho.

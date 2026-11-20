# Revisión adversarial

- Fecha: 2026-11-18 14:25 EST
- Perfil: `openai` · protocolo `openai-responses`
- Modelo pedido: `gpt-5.6-sol` · modelo que respondió: `gpt-5.6-sol`
- Archivo: `<espacio-de-trabajo>/05-Tickets/Tickets-MVP-Controlador-de-Tiempo-20261118-v3.md` · huella `08e6525abaf7` · 35593 caracteres
- Archivo: `<espacio-de-trabajo>/04-Backlog/Backlog-MVP-Controlador-de-Tiempo-20261118-v5.md` · huella `84e92c472ace` · 38894 caracteres
- Naturaleza: opinión de un modelo, no veredicto. No bloquea nada.

---

## Hallazgos

### 1. ALTO — Las reglas de acceso por rol en la base se construyen antes de que existan las tablas que deben proteger

- **Qué está mal:** HU-02.1 no puede implementar ni probar el aislamiento por rol sobre avisos, asignaciones y reportes porque esas tablas nacen simultáneamente o después, y ningún ticket posterior exige agregarles esas reglas.
- **Evidencia:**
  - `Tickets-MVP-Controlador-de-Tiempo-20261118-v3.md`, **HU-02.1**: “Reglas de acceso por rol en la base, incluidos el supervisor que solo ve a sus supervisados…”; depende solo de `HU-01.1, HU-03.1`.
  - Sección 5: `HU-02.1` y `HU-06.1` están en el mismo tramo 4; `HU-07.1` está en el tramo 5.
  - La Definition of Done de Migración/DB solo obliga a que las tablas posteriores tengan organización y “la regla de la base que la filtra”; ese mandato corresponde al aislamiento por organización de HU-03, no al alcance por supervisor o propietario de HU-02.
  - `HU-03.3` prueba separación entre organizaciones, no separación entre usuarios de una misma organización.
- **Regla o escenario que se rompe:** HU-02.CA-1, CA-2, CA-4, CA-5, CA-6, CA-8 y CA-10. Una tabla creada después de HU-02.1 puede quedar protegida solo por organización; una consulta directa con un rol autenticado podría leer avisos o reportes de otro consultor o de otro supervisor de la misma organización, aunque la capa de código sí los oculte.

---

### 2. ALTO — H-1 tiene una Definition of Done imposible de cumplir con los puntos que está obligado a especificar

- **Qué está mal:** H-1 debe convertir en decisiones de especificación reglas que explícitamente no provienen de criterios del backlog, pero su Definition of Done exige que cada requisito cite el criterio del backlog del que sale.
- **Evidencia:**
  - `Tickets...v3.md`, sección 1, DoD de **Especificación**: “Cada requisito cita el criterio del backlog del que sale”.
  - `H-1`: “resuelve los puntos de la sección 8”.
  - Sección 8, **E-5**: “Este caso no está en el backlog”.
  - Sección 8, **E-6**: procede de hallazgos de revisión y exige decidir credencial, almacenamiento, rotación, alcance y protección contra ejecuciones repetidas.
  - Sección 8, **E-8**: “Es una regla nueva”.
- **Regla o escenario que se rompe:** la propia DoD de H-1. Si la especificación incluye las decisiones de E-5, E-6 o E-8, contendrá requisitos sin criterio de backlog; si los omite, no resuelve la sección 8. Como HU-03.1 y todo el resto del desarrollo dependen de H-1, el plan queda bloqueado o se declara terminado un ticket que no cumple su DoD.

---

### 3. ALTO — La matriz de autorización no existe todavía cuando el primer endpoint está obligado a modificarla

- **Qué está mal:** HU-06.3 debe agregar su operación a HU-02.4 en el mismo ticket, pero ambos están planificados en paralelo y no existe dependencia entre ellos.
- **Evidencia:**
  - `Tickets...v3.md`, DoD de **Endpoint/API**: “toda operación nueva agrega su fila a la matriz rol por operación (HU-02.4) […] en el mismo ticket”.
  - **HU-06.3**, tipo Endpoint/API, depende de `HU-06.2, HU-02.2`, no de HU-02.4.
  - **HU-02.4** es el ticket donde la matriz “nace”.
  - Sección 5: HU-02.4 y HU-06.3 están ambos en el tramo 6.
  - La regla del orden dice: “Dentro de un tramo, los tickets no dependen entre sí”.
  - **HU-07.3**, también Endpoint/API, tampoco declara dependencia de HU-02.4.
- **Regla o escenario que se rompe:** la DoD permanente de Endpoint/API y la afirmación de que los tickets de un tramo son independientes. HU-06.3 puede terminar sin fila de autorización porque la matriz aún no existe, o ambos tickets pueden crear/modificar concurrentemente el mismo artefacto y dejar sin probar alguno de los casos permitidos o rechazados.

---

### 4. ALTO — No hay un ticket que conecte las reglas de correo con la ejecución recurrente y el servicio externo

- **Qué está mal:** el plan crea primero una ejecución que clasifica y después solo tickets de Modelo/Dominio para el correo, sin un ticket de Endpoint/API o integración que conecte esas reglas con el envío real.
- **Evidencia:**
  - `Tickets...v3.md`, **HU-07.3**, Endpoint/API: “clasifica en cada intervalo […] deja el reporte generado”.
  - **HU-07.4**, Modelo/Dominio: “Correo agrupado”.
  - **HU-07.7**, Modelo/Dominio: destinatarios, suplencia y reintento.
  - **HU-07.8** es únicamente Test y captura “lo que el sistema entrega al servicio de correo”.
  - Sección 5 afirma al terminar el tramo 8: “Sale el correo al supervisor”, aunque en ese tramo solo se añade HU-07.4 como implementación del correo.
  - El documento declara que cada ticket nombra la capa que toca; HU-07.4 y HU-07.7 no están tipados como la capa que ejecuta o integra el envío.
- **Regla o escenario que se rompe:** HU-07.CA-5 a CA-8, CA-10, CA-12, CA-17 y CA-18. El sistema puede generar y persistir no reportados correctamente, pero nunca entregar un mensaje al servicio de correo ni ejecutar el reintento; HU-07.8 no tendría una integración implementada que observar.

---

### 5. ALTO — Se admite que las pruebas no cubren la frontera de fecha entre zonas horarias, pero la cobertura marca esos criterios como completos

- **Qué está mal:** la interpretación de la fecha consultada cerca de medianoche se deja fuera de todos los datos de prueba, aunque HU-10 se contabiliza como completo salvo por el motivo de HU-08.
- **Evidencia:**
  - `Tickets...v3.md`, límite de **H-3**: todos los clientes están en la misma zona horaria y “Las pruebas no ven, por tanto, lo que pasa cerca de la medianoche con clientes en zonas distintas”.
  - Sección 8, **E-2**: la especificación debe decidir con qué fecha se interpreta “el día” de la consulta cuando los clientes están en zonas distintas.
  - Cobertura de HU-10: 8 completos y solo HU-10.CA-1 aparece “en parte” por el motivo pendiente.
  - `Backlog...v5.md`, **HU-10.CA-1 a CA-4**: la consulta se hace por una fecha y puede mostrar no reportados y llegadas tardías; **HU-10.CA-9** muestra sus horas en la zona del cliente.
- **Regla o escenario que se rompe:** HU-10.CA-1 a CA-4 y la definición de criterio “completo”. Cerca de medianoche, un registro puede aparecer en el día anterior o siguiente, omitirse de ambas consultas o duplicarse, sin que ninguna prueba del plan lo detecte. Que H-1 escriba una regla no comprueba que HU-10.1 la implemente.

---

### 6. ALTO — HU-07.CA-19 se declara completo aunque la operación que termina las asignaciones no tiene tickets

- **Qué está mal:** el reporte se da por completo frente a una desactivación, aunque la capacidad que debe desactivar la cuenta y terminar sus asignaciones pertenece a HU-04 y todavía no se construye.
- **Evidencia:**
  - `Backlog...v5.md`, historia **HU-04**: desactivar la cuenta y hacer que “sus asignaciones como consultor terminen ese día”; está “Solo listada”.
  - **HU-07.CA-19**: desde el día siguiente el consultor no entra en el reporte porque “sus asignaciones terminaron el día de la desactivación”.
  - `Tickets...v3.md`, **HU-07.6** solo implementa como regla el caso “consultor desactivado”.
  - Sección 4 marca únicamente HU-07.CA-12 y CA-18 como “en parte”; por tanto CA-19 forma parte de los 18 criterios declarados completos.
- **Regla o escenario que se rompe:** HU-07.CA-19 y la definición de “completo”. Una prueba puede preparar manualmente un consultor inactivo y hacer pasar la clasificación, pero no comprueba que la futura operación HU-04 cierre efectivamente sus asignaciones; al integrar HU-04, estas podrían seguir vigentes y continuar generando no reportados.

---

### 7. MEDIO — HU-02.CA-9 figura como completo sin que existan las operaciones que menciona

- **Qué está mal:** se considera comprobado el rechazo con mensaje y sin cambios de cargar datos, cambiar parámetros y aprobar, aunque ninguna de esas operaciones tiene tickets en este documento.
- **Evidencia:**
  - `Backlog...v5.md`, **HU-02.CA-9**: menciona expresamente “cargar datos, cambiar un parámetro, aprobar sin ser supervisor”.
  - `Tickets...v3.md`, sección 4: los criterios parciales de HU-02 son CA-1, CA-2, CA-4, CA-5, CA-6, CA-7, CA-8 y CA-10; por descarte, CA-9 está contado entre los tres completos.
  - HU-05, HU-11 y HU-15 están entre las doce historias sin tickets.
  - En la misma tabla, HU-02.CA-7 sí se marca parcial precisamente porque esas tres operaciones todavía no existen.
- **Regla o escenario que se rompe:** la definición de criterio completo y la consistencia entre CA-7 y CA-9. Una prueba abstracta de autorización puede devolver un mensaje, pero no demuestra que las operaciones reales futuras no ejecuten cambios antes o después del rechazo.

---

### 8. MEDIO — La independencia entre organizaciones de la ejecución recurrente no tiene un escenario de fallo que la compruebe

- **Qué está mal:** la excepción exige que el resultado de una organización no dependa de otra, pero las pruebas obligatorias solo usan parámetros distintos y no cubren que una organización falle durante el recorrido.
- **Evidencia:**
  - `Tickets...v3.md`, excepción de HU-07.3: “Procesa organización por organización […] sin que el resultado de una dependa de otra”.
  - La misma excepción solo exige como pruebas “una llamada sin esa credencial” y “dos organizaciones con parámetros distintos”.
  - **HU-07.5** enumera caída y concurrencia, pero no una falla aislada en una organización seguida del procesamiento de otra.
- **Regla o escenario que se rompe:** la excepción a la DoD de HU-07.3 y HU-07.CA-15. Si el procesamiento de la organización A lanza un error, puede abortar el ciclo y dejar a B sin reporte durante más de un intervalo; la prueba con dos organizaciones sanas seguiría pasando.

---

### 9. MEDIO — HU-01.6 no puede cumplir literalmente la Definition of Done del tipo Test

- **Qué está mal:** HU-01.6 es un ticket Test que declara no heredar ningún criterio, mientras la DoD de Test obliga a que sus escenarios citen el criterio que comprueban.
- **Evidencia:**
  - `Tickets...v3.md`, **HU-01.6**, tipo Test, columna Hereda: “—”.
  - Texto posterior: “HU-01.6 no hereda criterios: no hace verdad ninguno”.
  - DoD de **Test**: “Los escenarios citan el criterio que comprueban”.
  - La excepción aplicable a HU-01.6 sustituye únicamente “la especificación está aprobada” y “las pruebas se escribieron primero”; no elimina la obligación de citar un criterio.
- **Regla o escenario que se rompe:** la DoD de HU-01.6. El informe puede citar PA-B10, pero PA-B10 es un punto abierto y no un criterio de aceptación; por tanto el ticket no puede cerrarse cumpliendo literalmente todas las reglas declaradas.

---

### 10. MEDIO — No se define qué cuenta de dirección recibe la suplencia cuando hay varias

- **Qué está mal:** el modelo permite varias cuentas de dirección, pero la suplencia del supervisor desactivado habla de “la dirección” sin definir si recibe una, todas o una cuenta seleccionada.
- **Evidencia:**
  - `Backlog...v5.md`, **N-3/HU-04**: no se puede desactivar “la última [cuenta] de dirección activa”, lo que presupone que puede haber varias.
  - **HU-07.CA-12**: cuando el supervisor está desactivado, “el reporte lo recibe la dirección”.
  - `Tickets...v3.md`, **HU-07.7**: “suplencia de la dirección cuando el supervisor está desactivado”, sin regla de selección.
  - La sección 8 no incluye este punto entre lo que H-1 debe decidir.
- **Regla o escenario que se rompe:** HU-07.CA-12 y HU-07.CA-5. Con dos cuentas de dirección activas, el sistema puede enviar duplicados a todas, elegir una arbitrariamente o no enviar por no encontrar un destinatario único; cualquiera de esas conductas puede pasar sin contradecir una regla actualmente escrita.

---

### 11. MEDIO — La comprobación de “menos de 5 segundos” no tiene un criterio de muestreo que permita aceptarla o rechazarla

- **Qué está mal:** el plan registra cuántas personas se observaron y sus tiempos, pero no establece cuántas observaciones hacen falta ni qué resultado agregado determina que el criterio se cumple.
- **Evidencia:**
  - `Backlog...v5.md`, **HU-06.CA-14**: “pasan menos de 5 segundos […] Se comprueba por observación con usuarios”.
  - `Tickets...v3.md`, sección 4, comprobación manual: evidencia con “cuántas personas se observaron y el tiempo de cada una”.
  - No hay mínimo de participantes, dispositivos, condiciones de red ni regla para el caso en que algunos usuarios superen los cinco segundos.
- **Regla o escenario que se rompe:** HU-06.CA-14. El despliegue podría declararse aceptado observando a una sola persona rápida o ignorando resultados superiores a cinco segundos, mientras otra ejecución con usuarios distintos produciría la conclusión contraria.

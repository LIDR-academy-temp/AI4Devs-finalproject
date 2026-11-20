# Revisión adversarial

- Fecha: 2026-11-18 12:15 EST
- Perfil: `openai` · protocolo `openai-responses`
- Modelo pedido: `gpt-5.6-sol` · modelo que respondió: `gpt-5.6-sol`
- Archivo: `<espacio-de-trabajo>/04-Backlog/Backlog-MVP-Controlador-de-Tiempo-20261118-v1.md` · huella `4a2f5fe0b984` · 25752 caracteres
- Archivo: `<espacio-de-trabajo>/03-PRD/PRD-MVP-Controlador-de-Tiempo-20261117-v3.md` · huella `7be0c259bb6c` · 23972 caracteres
- Naturaleza: opinión de un modelo, no veredicto. No bloquea nada.

---

## Hallazgos

### 1. ALTO — Un consultor está autorizado y, a la vez, impedido de corregir su propio aviso

- **Qué está mal:** HU-02 permite corregir los avisos propios, mientras HU-06 declara que un aviso no se puede cambiar ni quitar.
- **Evidencia:**
  - `Backlog-MVP-Controlador-de-Tiempo-20261118-v1.md`, **HU-02.CA-1**: «veo, registro y corrijo solo mis avisos».
  - Mismo archivo, **HU-06.CA-13**: «no hay forma de cambiar la hora de ese aviso o quitarlo».
  - `PRD-MVP-Controlador-de-Tiempo-20261117-v3.md`, **RF-2**: el consultor «ve, registra y corrige solo lo propio».
- **Regla que se rompe y fallo observable:** una prueba en la que el consultor intenta corregir su aviso tendría dos resultados válidos incompatibles: HU-02/RF-2 exigen permitirlo y HU-06 exige impedirlo.

### 2. ALTO — La creación de la primera cuenta forma un ciclo de arranque imposible

- **Qué está mal:** solo alguien ya autenticado puede usar el sistema, pero la primera organización y su primera cuenta deben ser creadas por una dirección que todavía no puede existir ni autenticarse.
- **Evidencia:**
  - PRD, **RF-1**: «Solo una persona con cuenta activa y sesión iniciada puede usar el sistema».
  - PRD, **RF-25**: «los carga la dirección» y «La carga inicial crea la organización y su primera cuenta de dirección».
  - Backlog, **HU-05**: el actor de la carga es «dirección».
  - Backlog, **PA-B2**: no está definido cómo recibe la primera credencial y reconoce que «Sin esto nadie puede entrar el primer día».
- **Regla que se rompe y fallo observable:** la carga inicial se rechaza porque no existe una sesión activa, o se habilita una operación privilegiada sin autenticación, contradiciendo RF-1. Incluso si se crea la cuenta, nadie puede utilizarla al no existir mecanismo de entrega de credenciales.

### 3. ALTO — La prohibición de aprobar el período propio no tiene escenario y queda contradicha por permisos amplios

- **Qué está mal:** RF-19 prohíbe expresamente la autoaprobación, pero los criterios autorizan al supervisor y a dirección a aprobar sin excluir sus propios períodos.
- **Evidencia:**
  - PRD, **RF-19**: «Nadie aprueba su propio período».
  - Backlog, **HU-02.CA-4**: el supervisor «puede […] aprobar períodos».
  - Backlog, **HU-02.CA-6**: dirección puede hacer lo que hace un supervisor «sobre cualquier consultor» de la organización.
  - Backlog, **PA-B3**: sigue abierto si una persona puede actuar con dos roles y «quién supervisa a un supervisor».
  - Backlog, tabla **De requisito a historia**: RF-19 se asigna únicamente a HU-15, que todavía no tiene criterios.
- **Regla que se rompe y fallo observable:** una persona con rol de supervisor o dirección y asignación propia podría aprobar su propio mes; ningún criterio actual exige rechazar la operación.

### 4. ALTO — El reintento del correo puede incumplir el retraso máximo garantizado

- **Qué está mal:** se permite esperar hasta la siguiente ejecución cuando falla el envío, aunque el reporte debe salir como máximo dentro de un solo intervalo.
- **Evidencia:**
  - Backlog, **HU-07.CA-10**: si el correo no salió, «corre la siguiente» y entonces se envía.
  - Backlog, **HU-07.CA-15**: el reporte sale «con un retraso máximo de un intervalo».
  - PRD, **RNF-3**: el mismo máximo de un intervalo con el sistema en servicio.
- **Regla que se rompe y fallo observable:** si la primera ejecución posterior al margen ocurre a las 09:05 y su correo falla, CA-10 permite enviarlo a las 09:10; con intervalo de cinco minutos, la salida queda dos intervalos después del vencimiento. Ninguna regla clasifica ese fallo puntual de correo como caída del sistema para excluir RNF-3.

### 5. ALTO — La desactivación no cubre la terminación obligatoria de las asignaciones del consultor

- **Qué está mal:** el backlog declara cubierto RF-24, pero ninguna historia asignada a ese requisito incluye que las asignaciones como consultor terminan el día de la desactivación.
- **Evidencia:**
  - PRD, **RF-24**: «sus asignaciones como consultor terminan ese día».
  - Backlog, tabla **De requisito a historia**: RF-24 → HU-01 y HU-04.
  - Backlog, **HU-04**: solo dice que la persona «deje de entrar […] sin perder lo que registró».
  - Backlog, **HU-01.CA-4 y CA-5**: cubren el rechazo del inicio de sesión y de la sesión ya abierta, pero no el fin de las asignaciones.
- **Regla que se rompe y fallo observable:** al día siguiente de desactivar a un consultor, su asignación podría seguir vigente; como ya no puede avisar, aparecería falsamente como no reportado todos los días.

### 6. ALTO — La historia de auditoría promete una inmutabilidad que el PRD no garantiza

- **Qué está mal:** HU-18 promete evidencia que nadie pudo alterar, mientras RF-23 solo impide modificarla o borrarla desde la aplicación.
- **Evidencia:**
  - Backlog, **HU-18**: «evidencia que nadie pudo alterar».
  - PRD, **RF-23**: «Ese registro no se puede modificar ni borrar desde la aplicación».
  - PRD, **RA-7**: la traza se consulta por vía técnica, confirmando que existen vías fuera de la aplicación, pero sin declarar controles de integridad o detección de alteraciones.
- **Regla que se rompe y fallo observable:** una modificación realizada fuera de la aplicación no está prohibida ni tendría que ser detectable según RF-23, pero HU-18 permitiría afirmar al usuario que nadie pudo alterar la evidencia.

### 7. MEDIO — Una dirección puede desactivar la última cuenta administradora y bloquear toda la organización

- **Qué está mal:** no existe ninguna exclusión para desactivar la propia cuenta o la última cuenta activa de dirección.
- **Evidencia:**
  - PRD, **RF-2** y **RF-24**: dirección puede desactivar una cuenta, sin excepción para sí misma o para la última dirección.
  - Backlog, **HU-01.CA-5**: la desactivación invalida inmediatamente la sesión abierta.
  - Backlog, **PA-B2**: tampoco existe todavía un mecanismo definido de recuperación de credenciales.
- **Regla que se rompe y fallo observable:** la última dirección se desactiva a sí misma; la sesión deja de funcionar y ya no queda nadie que pueda cargar otra cuenta, cambiar parámetros, reasignar supervisores o administrar la organización.

### 8. MEDIO — Está sin cubrir la mitad de RNF-1

- **Qué está mal:** el backlog afirma que RNF-1 se comprueba en HU-06, pero HU-06 solo cubre el aviso de cinco segundos y no el registro de actividad en menos de sesenta segundos.
- **Evidencia:**
  - PRD, **RNF-1**: contiene dos límites: aviso menor de 5 segundos y registro de actividad menor de 60 segundos.
  - Backlog, sección **3 · Requisitos no funcionales**: «RNF-1 (fricción) en HU-06».
  - Backlog, **HU-06.CA-14**: solo prueba el límite de cinco segundos.
  - Backlog, **HU-12**: está solo listada y no contiene criterio de sesenta segundos.
- **Regla que se rompe y fallo observable:** el registro de actividad podría tardar varios minutos y, aun así, todas las pruebas actuales del backlog pasarían pese a incumplir RNF-1.

### 9. MEDIO — La regla de no repetir reportes contradice explícitamente la recuperación aceptada

- **Qué está mal:** un criterio prohíbe toda repetición en ejecuciones siguientes y otro permite correos repetidos después de una caída, sin expresar la excepción en el primero.
- **Evidencia:**
  - Backlog, **HU-07.CA-6**: «no vuelve a salir por esa asignación ese día».
  - Backlog, **HU-07.CA-11**: después de una caída «Puede salir un correo repetido».
  - PRD, **RA-6**: también acepta que «puede salir un correo repetido».
- **Regla que se rompe y fallo observable:** en una prueba de recuperación que reenvíe un reporte, CA-11 y RA-6 lo permiten, pero CA-6 exige que ese mismo reenvío no ocurra.

### 10. MEDIO — HU-07.CA-18 fija como criterio una decisión que el propio documento mantiene abierta

- **Qué está mal:** el criterio decide que dirección no recibe correos por ejecución, mientras PA-B5 declara que todavía no se sabe si debe recibirlos.
- **Evidencia:**
  - Backlog, **HU-07.CA-18**: dirección «no recibo el correo de cada ejecución: lo recibo todo junto en el resumen final».
  - El propio origen de CA-18 dice «Confirmar: PA-B5».
  - Backlog, **PA-B5**: «¿La dirección recibe el correo de cada ejecución, o solo el resumen final?».
- **Regla que se rompe y fallo observable:** una implementación puede enviar o no enviar el correo a dirección y ambas conductas estarían respaldadas por partes distintas del mismo backlog; el criterio de aceptación no tiene un resultado decidido.

### 11. MEDIO — “Hoy”, “primera asignación” y “mañana” no tienen una referencia temporal única

- **Qué está mal:** se admiten dos asignaciones en clientes con zonas horarias propias, pero no se define cómo ordenar sus días ni desde qué zona entra en vigor un parámetro de organización.
- **Evidencia:**
  - PRD, **RF-8**: se permiten dos asignaciones y sus horas se interpretan en la zona horaria de cada cliente.
  - PRD, **RF-4** y backlog **HU-06.CA-9**: el botón corresponde a «la primera del día».
  - PRD, **RF-14** y backlog **HU-07.CA-13**: los parámetros nuevos aplican «desde el día siguiente» o «desde mañana».
  - PRD, **RNF-7**: toda hora se muestra en la zona horaria del cliente de la asignación.
- **Regla que se rompe y fallo observable:** cuando en un cliente ya es mañana y en otro todavía es hoy, no se puede determinar de forma única qué asignaciones están pendientes, cuál es “la primera del día” ni qué versión del margen debe aplicarse.

### 12. MEDIO — El margen admite valores que desplazan el reporte fuera de la jornada o incluso al día siguiente

- **Qué está mal:** el margen solo debe ser positivo y no tiene límite respecto de la hora de fin ni del día calendario.
- **Evidencia:**
  - PRD, **RF-14**: «El margen es un entero positivo», sin máximo.
  - PRD, **RF-8**: cada asignación tiene hora de inicio y fin dentro de un mismo día.
  - PRD, **RF-9**: el reporte se produce después del vencimiento del margen.
  - Backlog, **HU-09**: promete el resumen «al final de la jornada».
- **Regla que se rompe y fallo observable:** una asignación de 23:00 a 23:30 con margen de 120 minutos no se clasifica hasta la 01:00 del día siguiente; el “resumen final de la jornada” no puede cerrarse dentro de esa jornada.

### 13. MEDIO — La “hora exacta del toque” carece de una fuente de tiempo que sea exacta y confiable

- **Qué está mal:** se exige registrar el instante exacto del toque, pero no se define si manda el reloj manipulable del teléfono o la hora posterior de recepción del sistema.
- **Evidencia:**
  - PRD, **RF-4**: «Un toque registra el aviso con la hora exacta».
  - Backlog, **HU-06.CA-2**: «hora exacta del toque».
  - Backlog, **HU-06.CA-11**: sin conexión el aviso no se registra.
  - Backlog, **HU-06.CA-13**: presenta esa hora como evidencia de puntualidad que no debe poder editarse.
- **Regla que se rompe y fallo observable:** con hora del dispositivo, el consultor puede alterar su reloj; con hora del servidor, la registrada es la de recepción y no la exacta del toque. El criterio no permite decidir cuál de los dos resultados es correcto.

### 14. MEDIO — Tres criterios propuestos no aparecen en el punto abierto que debe llevarlos a decisión

- **Qué está mal:** el documento declara ocho criterios `[PROPUESTO]`, pero PA-B6 somete a decisión solo cinco y deja tres sin mecanismo explícito de aprobación o retiro.
- **Evidencia:**
  - Backlog, encabezado: «8 de ellos marcados [PROPUESTO]».
  - Backlog, sección **1 · Marcas**: cada propuesto lo decide Dirección y, si no se aprueba, se quita.
  - Backlog, **PA-B6**: enumera únicamente HU-01.CA-3, HU-02.CA-9, HU-03.CA-3, HU-06.CA-11 y HU-07.CA-7.
  - Los propuestos omitidos son **HU-01.CA-7**, **HU-06.CA-9** —la visualización del cliente— y **HU-06.CA-13**.
- **Regla que se rompe y fallo observable:** esos tres comportamientos pueden pasar a tickets como si estuvieran aprobados, aunque la propia regla documental exige una decisión de Dirección; uno de ellos, HU-06.CA-13, además participa en la contradicción del hallazgo 1.

### 15. MEDIO — Es falsa la afirmación de que cada historia contiene sus exclusiones de alcance

- **Qué está mal:** la validación afirma que las exclusiones aparecen dentro de cada una de las 18 historias, pero trece historias solo están listadas y no contienen ninguna sección de exclusiones.
- **Evidencia:**
  - Backlog, sección **Validación contra el alcance**: «Lo que el PRD dejó fuera aparece como “Fuera de esta historia” dentro de cada una».
  - Backlog, sección **4**: solo se detallan HU-01, HU-02, HU-03, HU-06 y HU-07.
  - Backlog, sección **2**: HU-04, HU-05 y HU-08 a HU-18 figuran como «Solo listada» y no tienen bloque «Fuera de esta historia».
- **Regla que se rompe y fallo observable:** para las trece historias no detalladas no existe el control de alcance que la validación dice haber comprobado; un ticket posterior podría incorporar funciones excluidas sin contradecir ningún bloque de su historia actual.

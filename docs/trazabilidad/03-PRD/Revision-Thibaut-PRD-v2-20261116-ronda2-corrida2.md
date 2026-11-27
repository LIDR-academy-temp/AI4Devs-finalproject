# Revisión adversarial

- Fecha: 2026-11-16 23:22 EST
- Perfil: `openai` · protocolo `openai-responses`
- Modelo pedido: `gpt-5.6-sol` · modelo que respondió: `gpt-5.6-sol`
- Archivo: `<espacio-de-trabajo>/03-PRD/PRD-MVP-Controlador-de-Tiempo-20261116-v2.md` · huella `0b9a553f0520` · 20373 caracteres
- Archivo: `<espacio-de-trabajo>/01-Discovery/discovery-controlador-tiempo-SIN-NOMBRES-para-revisor.md` · huella `a196e1da1853` · 24057 caracteres
- Naturaleza: opinión de un modelo, no veredicto. No bloquea nada.

---

## Hallazgos

### 1. CRÍTICO — Un aviso tardío puede evitar por completo la creación del reporte de no reportado

- **Qué está mal:** La regla del aviso tardío contradice el criterio literal de búsqueda del job.
- **Evidencia:**
  - `PRD-MVP-Controlador-de-Tiempo-20261116-v2.md`, **RF-9**: «Un aviso posterior al vencimiento no lo saca del reporte […] aunque el reporte todavía no hubiera salido».
  - Mismo archivo, **RF-10**: el reporte se produce «en la ejecución siguiente al vencimiento».
  - `discovery-controlador-tiempo-SIN-NOMBRES-para-revisor.md`, **D-21**: el job busca asignaciones cuyo margen ya pasó, «**sin aviso y aún sin reportar**».
- **Regla que se rompe y fallo observable:** Si el margen vence a las 09:00, el consultor avisa a las 09:02 y el job corre a las 09:05, ya existe un aviso y D-21 excluye la asignación. No se crea la fila de no reportado ni se conserva la llegada tardía, incumpliendo RF-9, RF-13 y el objetivo central de detectar el incumplimiento.

### 2. CRÍTICO — El Excel obligatorio exige datos que el MVP no captura ni puede cargar

- **Qué está mal:** El respaldo de facturación exige `proyecto` y `contraparte del cliente`, pero ninguno tiene una fuente declarada.
- **Evidencia:**
  - PRD, **RF-21**: el encabezado obligatorio incluye «proyecto» y «contraparte del cliente».
  - PRD, **RF-8**: la asignación solo une «a un consultor con un cliente».
  - PRD, **RF-15**: los campos del registro de actividad no incluyen proyecto ni contraparte.
  - PRD, **RF-25**, y discovery, **D-34**: la carga controlada incluye únicamente «clientes, asignaciones, usuarios y catálogo».
  - Discovery, **D-19**, menciona una tabla `proyecto`, pero no existe ningún requisito que permita poblarla.
- **Regla que se rompe y fallo observable:** RF-21 es necesario y D-6 exige producir el respaldo aceptado por el cliente. El exportador tendrá que dejar esos campos vacíos, inventarlos o depender de datos cargados por un mecanismo no especificado.

---

### 3. ALTO — La selección del botón con dos asignaciones impide registrar determinadas llegadas tardías

- **Qué está mal:** RF-4 solo permite avisar para la asignación en curso o para la siguiente, por lo que una asignación anterior no reportada deja de ser seleccionable.
- **Evidencia:**
  - PRD, **RF-4**: «el botón corresponde a la que está en curso o, si ninguna lo está, a la siguiente del día».
  - PRD, **RF-13**: debe admitirse y conservarse el aviso posterior al margen como llegada tardía.
  - Discovery, **D-29**: «No hay hora de cierre».
- **Regla que se rompe y fallo observable:** Con asignaciones de 08:00–10:00 y 18:00–22:00, a las 11:00 el botón corresponde a la segunda. El consultor no puede avisar tardíamente para la primera. Después de terminar la última tampoco existe una «siguiente», por lo que RF-4 ni siquiera determina a qué asignación corresponde el botón.

### 4. ALTO — Se puede aprobar y exportar como respaldo un mes todavía incompleto

- **Qué está mal:** No se exige que el mes haya terminado ni que el período esté completo antes de enviarlo o aprobarlo.
- **Evidencia:**
  - PRD, **RF-18**: el consultor ve el período mensual y «lo envía a su supervisor», sin condición temporal.
  - PRD, **RF-19**: el supervisor aprueba cualquier período enviado.
  - PRD, **RF-21**: «Solo el de un período aprobado sirve de respaldo de factura».
  - Discovery, **D-33**: el período es el mes calendario porque la facturación es mensual.
- **Regla que se rompe y fallo observable:** El 2 de noviembre podría aprobarse y exportarse noviembre con uno o cero días registrados, y el archivo aparecería como respaldo válido. Las horas del resto del mes quedarían como cambios posteriores o ni siquiera se identificarían correctamente como correcciones.

### 5. ALTO — No está definido qué operaciones cuentan como “corrección” posterior a la aprobación

- **Qué está mal:** La garantía de marcar un período modificado solo habla de “correcciones”, sin cubrir explícitamente altas, eliminaciones o reasignaciones de registros.
- **Evidencia:**
  - PRD, **RF-20**: «Con la primera corrección posterior a la aprobación» cambia el estado.
  - Discovery, **D-32**: «Un período aprobado que se corrige» queda como aprobado con cambios posteriores.
  - PRD, **RF-15**: regula la creación del registro, pero no la edición o eliminación.
- **Regla que se rompe y fallo observable:** Se podría agregar o eliminar una actividad después de aprobar sin que el sistema considere esa operación una “corrección”. El contenido exportado cambiaría mientras el período seguiría figurando simplemente como aprobado, precisamente lo que D-32 afirma impedir.

### 6. ALTO — Existe un bloqueo de arranque para crear la primera cuenta de Dirección

- **Qué está mal:** Para cargar usuarios se necesita una Dirección autenticada, pero no hay un mecanismo declarado para crear la primera cuenta ni la organización inicial.
- **Evidencia:**
  - PRD, **RF-1**: solo una persona con cuenta activa y sesión iniciada puede usar el sistema.
  - PRD, **RF-25**: los usuarios los carga la Dirección.
  - PRD, sección 4: están fuera del MVP las «pantallas de administración» y la «administración de varias empresas».
  - Discovery, **D-34**: reitera que la Dirección hace la carga y que no hay pantallas administrativas.
- **Regla que se rompe y fallo observable:** En una instalación vacía nadie puede iniciar sesión para efectuar la primera carga. La puesta en marcha dependerá de una inserción manual o credencial privilegiada no descrita, sin validaciones ni trazabilidad garantizadas por RF-25 y RF-23.

### 7. ALTO — El canal indispensable del reporte sigue sin decidirse ni tiene mecanismo de configuración

- **Qué está mal:** RF-10 depende de un canal configurado, pero el canal continúa siendo un supuesto y un punto abierto.
- **Evidencia:**
  - PRD, **RF-10**: el reporte sale «por el canal configurado».
  - PRD, **S-1**: el correo electrónico es solo un «valor provisional».
  - PRD, **PA-P4**: «Canal del reporte […] sigue como supuesto S-1».
  - PRD, **RF-14**: solo define configuración para margen e intervalo.
- **Regla que se rompe y fallo observable:** No hay criterio de aceptación para afirmar que el reporte “sale hacia el supervisor”, ni requisito que diga cómo se configura o cambia el canal. El núcleo del primer dolor puede terminar implementado únicamente como una fila consultable, sin el aviso operativo esperado.

### 8. ALTO — El intervalo configurable contradice el cron fijo de cinco minutos

- **Qué está mal:** El producto promete cambiar el intervalo sin modificar el sistema, pero la decisión de despliegue fija el disparador en cinco minutos y no limita los valores admitidos.
- **Evidencia:**
  - PRD, **RF-14**: intervalo configurable, valor inicial 5, que «se cambia sin modificar el sistema».
  - Discovery, **D-21**: «un solo job recurrente, cada 5 minutos».
  - Discovery, **D-27**: «el job lo dispara el cron de Supabase cada 5 minutos».
  - PRD, **RNF-3**: el retraso máximo es un intervalo.
- **Regla que se rompe y fallo observable:** Si Dirección configura un intervalo de un minuto, el cron seguirá ejecutándose cada cinco y RNF-3 será imposible de cumplir. Si solo se permiten valores iguales o superiores a cinco, esa restricción no está declarada.

### 9. ALTO — El ámbito de margen e intervalo es contradictorio en un sistema multiempresa

- **Qué está mal:** La decisión fuente establece un único valor “para todos”, mientras el PRD permite uno por organización.
- **Evidencia:**
  - Discovery, **D-29**: margen «**uno solo para todos**» y dos parámetros generales.
  - PRD, **RF-14**: «uno de cada uno para toda la organización».
  - PRD, **RF-3**: existen varias organizaciones separadas.
- **Regla que se rompe y fallo observable:** No se sabe si un cambio efectuado por la Dirección de Proveedor A debe afectar también a Proveedor B. Una implementación global viola la autonomía y separación operativa del PRD; una implementación por organización contradice el alcance literal de D-29.

### 10. ALTO — La recuperación tras una caída genera falsos no reportados masivos

- **Qué está mal:** Al volver del fallo se reporta como ausente a quien no pudo avisar porque la propia aplicación estaba caída.
- **Evidencia:**
  - PRD, **RNF-4**: al volver, el sistema «reporta lo pendiente».
  - PRD, **RF-9**: cualquiera sin aviso al vencer el margen entra en no reportados.
  - PRD, **RA-4** y **RA-5**: los riesgos aceptados no cubren indisponibilidad del sistema como causa de falsos positivos.
- **Regla que se rompe y fallo observable:** Una caída durante el inicio de la jornada producirá, al recuperarse, un reporte de ausencias de todos los consultores afectados. No hay marca automática de incidencia del sistema ni exclusión de métricas, por lo que M-1 y M-3 mezclarán indisponibilidad técnica con incumplimiento laboral.

### 11. ALTO — Varias operaciones privilegiadas no tienen actor autorizado definido

- **Qué está mal:** Se exige corregir períodos, desactivar cuentas y cambiar parámetros, pero no se especifica qué rol puede ejecutar cada operación.
- **Evidencia:**
  - PRD, **RF-20**: «admite correcciones», sin identificar actor.
  - PRD, **RF-24**: «Una cuenta se puede desactivar», sin identificar actor.
  - PRD, **RF-14**: Dirección decide el cambio, pero no se establece quién está autorizado a ejecutarlo.
  - PRD, **RF-2**: solo define alcances de visualización y que el consultor registra lo propio.
- **Regla que se rompe y fallo observable:** Si el permiso se deriva solo de poder ver el dato, un supervisor podría modificar registros aprobados o desactivar cuentas. Si se aplica denegación por defecto, las funciones obligatorias no podrán usarse. No es posible escribir las pruebas positivas y negativas de permisos exigidas por R-4/D-26.

### 12. ALTO — Desactivar una cuenta no resuelve sus asignaciones activas

- **Qué está mal:** La cuenta deja de poder avisar inmediatamente, pero ninguna regla suspende o termina sus asignaciones.
- **Evidencia:**
  - PRD, **RF-24**: la persona desactivada no puede entrar ni continuar una sesión.
  - PRD, **RF-8**: la vigencia de la asignación es independiente de la cuenta.
  - PRD, **RF-9**: toda asignación laboral sin aviso genera un no reportado.
- **Regla que se rompe y fallo observable:** Un consultor desactivado con asignación vigente aparecerá cada día como no reportado y no tendrá forma de avisar. Si se desactiva a un supervisor, RF-10 tampoco define un destinatario alternativo para sus reportes.

### 13. ALTO — El catálogo puede cambiar el significado histórico de períodos aprobados

- **Qué está mal:** No hay versionado, desactivación ni copia histórica de las actividades del catálogo.
- **Evidencia:**
  - PRD, **RF-17**: los registros dependen de actividades del catálogo.
  - PRD, **RF-22**: el resumen agrupa horas por actividad.
  - PRD, **RF-25**: el catálogo se administra mediante carga controlada.
  - Discovery, **D-11**: para referencias externas sí se exige conservar el significado histórico cuando la fuente cambia, pero no existe una regla equivalente para el catálogo.
- **Regla que se rompe y fallo observable:** Renombrar, sustituir o eliminar una actividad podría alterar el resumen de un período ya aprobado o dejar referencias inválidas. Dos exportaciones del mismo período podrían mostrar conceptos distintos sin que se haya corregido ninguna actividad.

---

### 14. MEDIO — Los horarios nocturnos y los cruces entre zonas horarias no están definidos

- **Qué está mal:** Se aceptan clientes con zonas distintas, pero no se define cómo comprobar cruces reales ni cómo registrar jornadas que atraviesan medianoche.
- **Evidencia:**
  - PRD, **RF-8**: admite dos asignaciones si sus horarios no se cruzan y usa la zona del cliente.
  - PRD, **RF-15**: existe una sola fecha y se rechaza una salida igual o anterior a la entrada.
  - Discovery, **D-20**: el servidor opera en UTC y cada cliente aporta su zona.
- **Regla que se rompe y fallo observable:** Dos horarios locales aparentemente iguales pueden no cruzarse en tiempo real, o empezar a cruzarse durante cambios de horario de verano. Una jornada 22:00–06:00 no puede representarse porque la salida parece anterior a la entrada, aunque RF-8 no prohíbe ese horario contractual.

### 15. MEDIO — Los cambios de margen no tienen vigencia temporal ni límites válidos

- **Qué está mal:** No se define desde cuándo aplica un cambio ni se prohíben valores cero, negativos o desproporcionados.
- **Evidencia:**
  - PRD, **RF-14**: permite cambiar margen e intervalo y solo exige auditar valores anterior y nuevo.
  - PRD, **RF-9** y **RF-10**: la clasificación depende del margen vigente al ejecutar.
- **Regla que se rompe y fallo observable:** Cambiar el margen de 60 a 30 minutos a mitad de la jornada puede clasificar retroactivamente como tardíos a consultores que aún estaban dentro del margen anterior. Un margen negativo o un intervalo cero deja las reglas sin significado o puede agotar el proceso recurrente.

### 16. MEDIO — La trazabilidad existe, pero ningún requisito permite consultarla

- **Qué está mal:** Se registra auditoría, pero no se define quién puede verla ni cómo se presenta.
- **Evidencia:**
  - PRD, épica **E4**: incluye «la trazabilidad».
  - PRD, **RF-23**: enumera los eventos auditados y prohíbe modificarlos desde la aplicación.
  - Ningún RF concede acceso de lectura al registro de auditoría.
- **Regla que se rompe y fallo observable:** Dirección no podrá determinar desde el producto quién corrigió un período o cambió un parámetro. La información podría existir únicamente en base de datos y requerir acceso técnico, por lo que la trazabilidad prometida no es una capacidad utilizable.

### 17. MEDIO — Las “métricas de éxito” no permiten determinar éxito o fracaso

- **Qué está mal:** No hay metas para cuatro de cinco métricas y la métrica principal ni siquiera tiene responsable o proceso de captura.
- **Evidencia:**
  - PRD, sección 9: «Ninguna meta de éxito tiene número decidido».
  - PRD, **M-4**: «El sistema no puede medirlo».
  - PRD, **PA-P6**: sigue abierto quién lleva M-4.
- **Regla que se rompe y fallo observable:** Al terminar el MVP, cualquier resultado de adopción, puntualidad o uso del Excel puede presentarse como éxito porque no existe umbral. Además, el problema principal —que el cliente avise primero— puede no medirse en absoluto.

### 18. MEDIO — El documento afirma que dos puntos pasaron a riesgos aceptados, pero esos riesgos no existen

- **Qué está mal:** La historia de cierre de puntos abiertos no coincide con la lista de riesgos.
- **Evidencia:**
  - PRD, sección 10: «PA-P3 y PA-P7 pasaron a riesgos aceptados».
  - PRD, sección 11: **RA-1 a RA-5** no cubren ni la vía contractual de PA-P3 ni la segregación entre proveedores de PA-P7.
  - Discovery, **PA-3** y **PA-7**: describen precisamente esos asuntos.
- **Regla que se rompe y fallo observable:** Es imposible saber si esos temas fueron aceptados formalmente, resueltos o simplemente omitidos. En particular, PA-P7 toca segregación entre competidores, por lo que no debería desaparecer sin una decisión trazable.

### 19. MEDIO — El cálculo porcentual por referencia no está definido

- **Qué está mal:** Se exige mostrar un porcentaje, pero no se especifica denominador, redondeo ni tratamiento de horas extras o total cero.
- **Evidencia:**
  - PRD, **RF-22**: «el resumen suma las horas por referencia del cliente con su porcentaje».
  - Discovery, **D-10**: el porcentaje debe derivarse de la imputación y no capturarse manualmente.
- **Regla que se rompe y fallo observable:** Dos implementaciones válidas podrían calcular el porcentaje sobre horas totales, ordinarias o solo horas referenciadas, produciendo respaldos distintos para el mismo período. Con cero horas referenciadas aparece además una división indefinida.

## Sospechas que requieren artefactos adicionales

- **CSRF en operaciones mutables:** discovery **D-23** adopta autenticación por cookie, pero los archivos no mencionan protección CSRF, validación de origen o política `SameSite`. No puede afirmarse la vulnerabilidad sin revisar rutas y configuración.
- **Aceptación real del Excel:** discovery **D-6/D-15** afirma que el formato debe ser aceptado y que todos los clientes se adaptarán, pero no se aporta escenario de validación con Cliente A ni con la exigencia legal mencionada. Falta evidencia externa para afirmar que el formato único será aceptado.
- **Segregación efectiva:** PRD **RF-3** y discovery **D-19** son reglas correctas, pero no se proporcionaron esquema, políticas por fila ni pruebas negativas. No es posible verificar que la separación entre organizaciones esté realmente implementada.

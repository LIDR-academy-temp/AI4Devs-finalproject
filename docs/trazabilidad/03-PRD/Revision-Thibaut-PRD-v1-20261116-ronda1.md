# Revisión adversarial

- Fecha: 2026-11-16 19:56 EST
- Perfil: `openai` · protocolo `openai-responses`
- Modelo pedido: `gpt-5.6-sol` · modelo que respondió: `gpt-5.6-sol`
- Archivo: `<espacio-de-trabajo>/03-PRD/PRD-MVP-Controlador-de-Tiempo-20261116-v1.md` · huella `587c5e0e4ceb` · 16678 caracteres
- Naturaleza: opinión de un modelo, no veredicto. No bloquea nada.

---

Archivo revisado: `PRD-MVP-Controlador-de-Tiempo-20261116-v1.md`.

## Hallazgos

### 1. CRÍTICO — Una corrección puede dejar como “aprobado” contenido que el supervisor nunca revisó
- **Qué está mal:** El estado posterior a una corrección no está definido, por lo que datos modificados después de la aprobación podrían conservar su validez para facturación.
- **Evidencia:**  
  - **RF-20:** “Un período aprobado no queda bloqueado: admite correcciones”.  
  - **RF-21:** “solo el de un período aprobado sirve de respaldo de factura”.  
  - **PA-P1:** reconoce que no se sabe si sigue aprobado, vuelve a enviado o queda marcado como modificado.
- **Regla que se rompe y fallo visible:** Se invalida la aprobación de **RF-19** y la integridad del respaldo de **RF-21**. Un período podría aprobarse con 80 horas, corregirse a 120 y exportarse todavía como aprobado sin una nueva revisión.

### 2. CRÍTICO — El ajuste final en Excel elude deliberadamente la aprobación y la trazabilidad
- **Qué está mal:** El alcance permite modificar fuera del sistema el archivo que servirá de respaldo, sin registrar quién cambió qué ni comprobar que siga coincidiendo con el período aprobado.
- **Evidencia:**  
  - **§4, “Bloqueo del período aprobado…”:** “el ajuste final se hace en el Excel antes de facturar”.  
  - **RF-23:** solo registra acciones realizadas en el sistema, incluida la exportación.  
  - **RF-21:** el Excel de un período aprobado sirve de respaldo de factura.
- **Regla que se rompe y fallo visible:** Se rompe la trazabilidad prometida por **E4/RF-23**. Un usuario exporta 80 horas aprobadas, cambia el Excel a 120 y obtiene firmas sobre datos que nunca fueron aprobados ni quedan en la auditoría.

### 3. ALTO — El margen provisional impide cumplir la promesa de detectar dentro de la primera hora
- **Qué está mal:** Con un margen de 60 minutos y hasta cinco minutos adicionales para entregar el reporte, el supervisor puede enterarse después de la primera hora.
- **Evidencia:**  
  - **§2, Supervisor:** necesita saberlo “dentro de la primera hora”.  
  - **§3:** la lista debe aparecer “dentro de la primera hora”.  
  - **S-2:** margen provisional de 60 minutos.  
  - **RF-10/RNF-3:** reporte hasta cinco minutos después del vencimiento.
- **Regla que se rompe y fallo visible:** El escenario central puede notificar a los 65 minutos, incumpliendo la propuesta de valor aun cuando todos los requisitos técnicos se cumplan.

### 4. ALTO — RNF-3 y RNF-4 son incompatibles durante una caída mayor de cinco minutos
- **Qué está mal:** Se exige un retraso máximo absoluto de cinco minutos, pero también se permite reportar al restablecerse el sistema sin limitar la duración de la caída.
- **Evidencia:**  
  - **RNF-3:** “retraso máximo de cinco minutos”.  
  - **RNF-4:** “Si el sistema estuvo fuera de servicio… al volver reporta lo pendiente”.
- **Regla que se rompe y fallo visible:** Si el sistema permanece caído 30 minutos desde el vencimiento, solo puede reportar al volver y viola RNF-3; si no reporta, viola RNF-4.

### 5. ALTO — La “red de seguridad” no evita que una caída al cierre impida facturar
- **Qué está mal:** Se afirma que una caída no impedirá facturar, pero la única exportación especificada depende de acceder a la aplicación.
- **Evidencia:**  
  - **RNF-5:** “Una caída en el cierre del mes no impide facturar”.  
  - **RF-1:** el sistema requiere cuenta y sesión iniciada.  
  - **RF-21:** supervisor o dirección exportan el período desde el sistema.  
  - No existe una ruta de exportación fuera de línea ni un tiempo máximo de recuperación.
- **Regla que se rompe y fallo visible:** Si la aplicación está caída durante el cierre, nadie puede iniciar sesión ni generar el Excel. El respaldo diario protege datos, pero no garantiza acceso ni exportación a tiempo.

### 6. ALTO — El flujo es contradictorio para un consultor con dos asignaciones el mismo día
- **Qué está mal:** Se exige un botón único, pero los avisos y reportes existen por asignación, sin restringir que una persona tenga solo una asignación diaria.
- **Evidencia:**  
  - **RF-4:** “un único botón de aviso”.  
  - **RF-5:** “un solo aviso por asignación y día”.  
  - **RF-10:** envío “una sola vez por asignación y día”.  
  - **RF-15:** el registro de actividad no incluye la asignación como campo.  
  - **RF-21:** el encabezado tiene un solo cliente y proyecto.
- **Regla que se rompe y fallo visible:** Con dos clientes, modalidades, horarios o zonas horarias distintos, no se sabe qué asignación registra el botón ni a cuál corresponde una actividad o período. Una asignación podría quedar sin aviso o las horas terminar en el respaldo del cliente equivocado.

### 7. ALTO — Los registros facturables carecen de validaciones básicas de integridad temporal
- **Qué está mal:** Solo se rechaza una salida igual o anterior a la entrada; no se impiden horas superpuestas, futuras, fuera de la asignación o duplicadas.
- **Evidencia:**  
  - **RF-15:** enumera los campos y únicamente exige que la salida sea posterior a la entrada.  
  - **RF-22:** suma automáticamente esos registros.  
  - **RF-21:** permite utilizarlos como respaldo de factura una vez aprobado el período.
- **Regla que se rompe y fallo visible:** Un consultor puede registrar dos actividades superpuestas de 08:00 a 16:00 y generar 16 horas para el mismo día. Si el supervisor las aprueba, el Excel las presenta como respaldo válido.

### 8. ALTO — El primer cliente no puede arrancar con un mecanismo de aprovisionamiento definido
- **Qué está mal:** Usuarios, organizaciones, clientes, asignaciones y catálogo son requisitos previos de todo el flujo, pero no se especifica quién los carga, cómo se validan ni cómo se corrigen.
- **Evidencia:**  
  - **§4, [SUPUESTO] Pantallas de administración:** los datos “se cargan por configuración”.  
  - **PA-P2:** “¿Quién crea clientes, asignaciones, usuarios y catálogo, y cómo?”.  
  - **RF-1, RF-4, RF-8 y RF-17:** dependen directamente de esos datos.
- **Regla que se rompe y fallo visible:** `Cliente A` no puede iniciar de forma verificable. Una asignación ausente o mal configurada elimina el botón, genera alertas incorrectas o asigna datos a una organización equivocada.

### 9. ALTO — Existe una carrera entre el aviso tardío y la generación del reporte
- **Qué está mal:** No se define qué ocurre si el consultor avisa después del margen, pero antes de que se ejecute o envíe el reporte dentro de los cinco minutos siguientes.
- **Evidencia:**  
  - **RF-9:** al vencer el margen sin aviso “entra en el reporte”.  
  - **RF-10:** el reporte puede salir hasta cinco minutos después.  
  - **RF-13:** solo regula el caso en que avisa “después de haber sido reportado”.
- **Regla que se rompe y fallo visible:** Si el margen vence a las 09:00, el consultor avisa a las 09:02 y el proceso corre a las 09:04, una implementación podría omitirlo por encontrar ya un aviso. La tardanza escaparía del reporte pese a RF-9.

### 10. ALTO — Un requisito necesario depende de una función meramente deseable
- **Qué está mal:** El resumen obligatorio por referencia del cliente depende de que exista la asociación de referencias, pero esa asociación puede quedar fuera del MVP.
- **Evidencia:**  
  - **RF-16, prioridad D:** asociación a sistema, clave y título del cliente.  
  - **RF-22, prioridad N:** cálculo de “las horas por referencia del cliente con su porcentaje”.
- **Regla que se rompe y fallo visible:** Si RF-16 no se implementa porque el plazo no alcanza, RF-22 no puede producir un resumen significativo por referencia aunque siga marcado como necesario.

### 11. MEDIO — El SLA alterna entre “llegada” y “salida” del reporte
- **Qué está mal:** No está definido si los cinco minutos se miden hasta que el sistema envía el mensaje o hasta que el supervisor realmente lo recibe.
- **Evidencia:**  
  - **RF-10:** “El reporte llega al supervisor”.  
  - **RNF-3:** “El reporte… sale”.  
  - **M-2:** mide “la salida del reporte”.  
  - **S-1:** el canal provisional es correo electrónico.
- **Regla que se rompe y fallo visible:** El sistema puede registrar envío a los cuatro minutos y cumplir M-2, mientras el proveedor de correo lo entrega 20 minutos después o lo rebota. El supervisor no recibe la alerta dentro del tiempo prometido.

### 12. MEDIO — No hay requisitos de revocación de cuentas o sesiones
- **Qué está mal:** Se controla quién entra mientras tenga cuenta y sesión, pero no se define cómo se desactiva a una persona ni cuándo dejan de ser válidas sus sesiones.
- **Evidencia:**  
  - **RF-1 a RF-3:** son la totalidad de requisitos de acceso y separación.  
  - **PA-P2:** incluso la gestión de usuarios queda sin actor ni mecanismo.
- **Regla que se rompe y fallo visible:** Un consultor o supervisor retirado de la empresa podría conservar una sesión y seguir leyendo o modificando datos de clientes porque no existe una regla explícita de revocación.

### 13. MEDIO — No existe una fuente definida para la “modalidad del día”
- **Qué está mal:** El sistema debe decidir si muestra “Llegué” o “Me conecté”, pero ningún requisito define dónde se configura o deriva esa modalidad.
- **Evidencia:**  
  - **RF-4:** el texto depende de “su modalidad del día”.  
  - **RF-8:** la asignación solo exige horas y días laborables.  
  - **RF-15:** la modalidad se captura al registrar actividad, es decir, después del aviso.
- **Regla que se rompe y fallo visible:** Un consultor híbrido puede ver “Llegué” en un día remoto o “Me conecté” en uno presencial, sin que exista un dato normativo para determinar cuál corresponde.

### 14. MEDIO — El margen puede cambiar sin autorización ni auditoría definidas
- **Qué está mal:** Se permite modificar el parámetro que determina quién aparece como incumplido, pero no se especifica quién puede hacerlo ni se exige registrar el cambio.
- **Evidencia:**  
  - **RF-14:** “El margen se puede cambiar sin modificar el sistema”.  
  - **PA-P2:** no define responsables de configuración.  
  - **RF-23:** la lista de acciones auditadas no incluye cambios de margen, horario o asignación.
- **Regla que se rompe y fallo visible:** Alguien con acceso a configuración podría aumentar el margen de 60 a 180 minutos y ocultar tardanzas sin dejar evidencia de cuándo ni por quién se cambió.

### 15. MEDIO — La meta de cinco segundos no contempla al usuario sin sesión vigente
- **Qué está mal:** El tiempo se cuenta desde abrir la aplicación, pero el acceso requiere una sesión iniciada y no se limita la medición a sesiones ya autenticadas.
- **Evidencia:**  
  - **RF-1:** solo una persona con sesión iniciada puede usar el sistema.  
  - **RNF-1:** “menos de 5 segundos desde abrir la aplicación hasta la confirmación”.  
  - **RF-4:** promete aviso en un toque.
- **Regla que se rompe y fallo visible:** Con una sesión vencida, introducir credenciales o completar cualquier recuperación hace imposible cumplir los cinco segundos, aunque el botón funcione correctamente.

### 16. MEDIO — El documento niega tener metas numéricas, pero sí contiene una
- **Qué está mal:** La declaración general de métricas contradice expresamente a M-2 y RNF-3.
- **Evidencia:**  
  - **§9:** “Ninguna meta numérica está decidida”.  
  - **M-2:** “Nada: el máximo es cinco minutos”.  
  - **RNF-3:** fija un máximo de cinco minutos.
- **Regla que se rompe y fallo visible:** No queda claro si cinco minutos es una meta de éxito, un requisito contractual o solo una hipótesis; una evaluación podría declarar éxito o fracaso con criterios distintos.

### 17. MEDIO — Las ausencias previstas contaminan el reporte y las métricas de puntualidad
- **Qué está mal:** Vacaciones, permisos e incapacidades se detectan diariamente como incumplimientos antes de poder clasificarlos, por lo que no se distinguen ausencias esperadas de faltas reales.
- **Evidencia:**  
  - **§4, “Registro de ausencias”:** queda fuera del MVP.  
  - **RF-9:** todo día laborable sin aviso entra en el reporte.  
  - **RF-12:** el motivo solo se anota después.  
  - **PA-P3:** admite que dos semanas de vacaciones generan un reporte diario.  
  - **M-1:** mide días-asignación con aviso dentro del margen sin definir exclusiones.
- **Regla que se rompe y fallo visible:** Una persona de vacaciones genera diez alertas y diez incumplimientos en M-1. El supervisor puede terminar ignorando el reporte, debilitando precisamente la detección que constituye el objetivo principal.

### 18. MEDIO — “Quincena” no define los límites del período
- **Qué está mal:** La unidad de aprobación y facturación depende de un supuesto que no establece fechas de inicio, cierre ni tratamiento de registros en el límite.
- **Evidencia:**  
  - **S-5:** “Duración del período: Quincena”.  
  - **RF-18 a RF-21:** envío, aprobación y exportación operan sobre ese período.  
  - No existe una regla que indique si son días 1–15 y 16–fin de mes, períodos móviles u otra convención.
- **Regla que se rompe y fallo visible:** Una actividad cerca del cambio de quincena puede quedar en períodos distintos según la implementación, produciendo subtotales y respaldos de factura incompatibles.

## Sospechas y limitaciones de la revisión

- No se proporcionaron `discovery-controlador-tiempo.md` ni la propuesta de alcance citada. Por ello no es posible verificar que RF-1 a RF-23 respeten realmente las decisiones **D-1 a D-28**.
- **R-4** exige pruebas positivas y negativas para reglas y permisos, pero no se suministró ningún archivo de pruebas o escenarios. No puedo afirmar que no existan; solo que el material recibido no demuestra cobertura de RF-2, RF-3, RF-12, RF-19 y RF-21.
- **R-3** (“sin procesos aparte”) puede entrar en tensión con los reportes programados de RF-10 y la recuperación de RNF-4, pero no es una contradicción demostrable: una sola aplicación podría ejecutar tareas programadas internamente.
- No se cubren turnos que atraviesan medianoche ni transiciones de horario de verano. El impacto depende de que existan esos horarios en los contratos, dato que no aparece en el archivo.

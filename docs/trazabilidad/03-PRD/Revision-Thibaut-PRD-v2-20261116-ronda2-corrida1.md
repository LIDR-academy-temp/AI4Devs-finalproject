# Revisión adversarial

- Fecha: 2026-11-16 22:59 EST
- Perfil: `openai` · protocolo `openai-responses`
- Modelo pedido: `gpt-5.6-sol` · modelo que respondió: `gpt-5.6-sol`
- Archivo: `<espacio-de-trabajo>/03-PRD/PRD-MVP-Controlador-de-Tiempo-20261116-v2.md` · huella `0b9a553f0520` · 20373 caracteres
- Archivo: `<espacio-de-trabajo>/01-Discovery/discovery-controlador-tiempo-SIN-NOMBRES-para-revisor.md` · huella `a196e1da1853` · 24057 caracteres
- Naturaleza: opinión de un modelo, no veredicto. No bloquea nada.

---

## Hallazgos

### 1. ALTO — Un aviso tardío realizado antes de la siguiente ejecución desaparece del reporte

- **Qué está mal:** RF-9 exige conservar como no reportado a quien avisa después del margen, pero el job definido en D-21 solo busca asignaciones sin aviso.
- **Evidencia:**  
  - `PRD-MVP-Controlador-de-Tiempo-20261116-v2.md`, **RF-9**: «Un aviso posterior al vencimiento no lo saca del reporte [...] aunque el reporte todavía no hubiera salido».  
  - `discovery-controlador-tiempo-SIN-NOMBRES-para-revisor.md`, **D-21**: el job busca asignaciones cuyo margen pasó, «**sin aviso** y aún sin reportar».
- **Regla o escenario roto:** Si el margen vence a las 09:00, el consultor avisa a las 09:02 y el job corre a las 09:05, D-21 lo excluye por tener aviso; RF-9 exige que aparezca como llegada tardía. El primer dolor queda sin detectar precisamente en esa ventana.

### 2. ALTO — Se afirma que no se almacenan datos sensibles, pero se registra información de salud

- **Qué está mal:** La categoría «incapacidad» y su texto libre revelan potencialmente información de salud, contradiciendo la afirmación de que el sistema no contiene datos sensibles.
- **Evidencia:**  
  - `PRD...`, **RNF-6**: «Sin documento de identidad ni datos sensibles».  
  - `PRD...`, **RF-12**: permite anotar categoría «**incapacidad**» y un texto.  
  - `discovery...`, **D-22**: guarda categoría y texto del motivo en la entidad de no reportados.
- **Regla o escenario roto:** Un supervisor puede registrar que una persona está incapacitada y añadir diagnóstico o detalle médico. El sistema conservaría un dato sensible que RNF-6 declara inexistente, además de incluirlo en una traza asociada a una persona.

### 3. ALTO — La segregación entre proveedores quedó abierta y ni siquiera aparece entre los riesgos supuestamente aceptados

- **Qué está mal:** El PRD dice que PA-P7 pasó a riesgo aceptado, pero no existe ningún riesgo sobre segregación entre proveedores y RF-3 solo define separación por organización.
- **Evidencia:**  
  - `PRD...`, sección **10**: «PA-P3 y **PA-P7 pasaron a riesgos aceptados**».  
  - `PRD...`, sección **11**: RA-1 a RA-5 no incluyen segregación entre proveedores.  
  - `discovery...`, **PA-7**: pregunta si un proveedor podrá impedir que otro vea sus horas cuando compartan tablero. Continúa marcado como punto abierto.  
  - `discovery...`, **D-14**: contempla recursos internos del cliente y de otros proveedores.  
  - `PRD...`, **RF-3**: solo establece la frontera por organización.
- **Regla o escenario roto:** Si los recursos de dos proveedores quedan bajo la misma organización o tablero del cliente, RF-3 no impide que uno vea horas y actividades del competidor. El PRD afirma haber aceptado el riesgo, pero no lo identifica ni delimita.

### 4. ALTO — El intervalo es configurable en producto, pero la ejecución está fijada a cinco minutos

- **Qué está mal:** RF-14 y D-29 permiten cambiar el intervalo entre ejecuciones, mientras D-27 fija el cron en cinco minutos y no se declara ningún rango compatible.
- **Evidencia:**  
  - `PRD...`, **RF-14**: el intervalo se cambia sin modificar el sistema.  
  - `discovery...`, **D-29**: `I` son los minutos entre ejecuciones.  
  - `discovery...`, **D-27**: «el job lo dispara el cron de Supabase **cada 5 minutos**».  
  - `PRD...`, **RNF-3**: el retraso máximo debe ser un intervalo.
- **Regla o escenario roto:** Si Dirección configura un intervalo de dos minutos, el cron de cinco minutos no puede cumplir RNF-3. Si configura diez, las ejecuciones siguen ocurriendo cada cinco salvo que exista una regla de omisión que ningún documento define.

### 5. ALTO — El formato obligatorio requiere proyecto y porcentajes, pero el MVP puede no capturarlos ni cargarlos

- **Qué está mal:** Una necesidad declarada como obligatoria depende de RF-16, que es deseable, y el campo «proyecto» requerido por la exportación no tiene una fuente funcional definida.
- **Evidencia:**  
  - `discovery...`, **D-10**: el porcentaje del reporte de Cliente B debe derivarse de la imputación.  
  - `discovery...`, **D-15**: el formato único debe contener lo que necesitaban los cuatro formatos anteriores.  
  - `PRD...`, **RF-16**, prioridad **D**: asociación opcional a una referencia del cliente.  
  - `PRD...`, **RF-22**: los porcentajes por referencia solo se generan «**si RF-16 entra**».  
  - `PRD...`, **RF-21**: el encabezado exige «proyecto».  
  - `PRD...`, **RF-25 / D-34**: la carga incluye clientes, asignaciones, usuarios y catálogo, pero no proyectos.  
  - `PRD...`, **RF-8 / D-30**: una asignación une consultor y cliente, no proyecto.
- **Regla o escenario roto:** Si RF-16 se descarta por plazo, el archivo no produce los porcentajes exigidos por D-10. Incluso si entra, no se define de dónde sale el proyecto del encabezado ni cuál es el denominador del porcentaje.

### 6. ALTO — Un período enviado puede cambiar mientras está pendiente de aprobación

- **Qué está mal:** No se bloquea, versiona ni reinicia el estado de un período después de enviarlo y antes de aprobarlo.
- **Evidencia:**  
  - `PRD...`, **RF-18**: el consultor envía el período.  
  - `PRD...`, **RF-19**: el supervisor aprueba un período enviado.  
  - `PRD...`, **RF-20**: solo regula correcciones posteriores a la aprobación.  
  - Ninguno de esos requisitos restringe RF-15 una vez que el período está «enviado» ni define una versión aprobable.
- **Regla o escenario roto:** El supervisor revisa un período; antes de que pulse aprobar, el consultor modifica o añade una actividad. La aprobación puede terminar cubriendo datos distintos de los revisados, o competir con la modificación sin resultado determinista.

### 7. ALTO — No se define quién está autorizado para corregir un período aprobado

- **Qué está mal:** RF-20 exige permitir correcciones, pero ningún rol recibe de forma explícita ese permiso.
- **Evidencia:**  
  - `PRD...`, **RF-20**: «Un período aprobado [...] admite correcciones».  
  - `PRD...`, **RF-2**: el consultor «ve y registra» lo propio; supervisor y Dirección «ven» los datos de su ámbito. No se asigna el verbo corregir.  
  - `PRD...`, **RF-23**: presupone que alguien corrige, pero solo pide registrar quién lo hizo.
- **Regla o escenario roto:** Una implementación restrictiva puede impedir toda corrección y violar RF-20; una permisiva puede dejar que consultor, supervisor o Dirección alteren horas aprobadas sin una regla de autorización comprobable.

### 8. ALTO — La traza no permite saber qué fue corregido

- **Qué está mal:** Se promete trazabilidad de toda corrección, pero el único contenido obligatorio del registro es quién actuó y cuándo, no los valores anteriores y nuevos.
- **Evidencia:**  
  - `PRD...`, alcance del MVP, punto **7**: «Trazabilidad de todo lo anterior».  
  - `PRD...`, **RF-20**: «toda corrección queda trazada».  
  - `PRD...`, **RF-23**: registra quién corrigió y cuándo; no exige campo modificado, valor anterior, valor nuevo ni versión.  
  - En contraste, **RF-14** sí exige expresamente valor anterior y nuevo para parámetros.
- **Regla o escenario roto:** Tras cambiar ocho horas por dos en un período aprobado, la auditoría solo podría mostrar que alguien corrigió algo a cierta hora. No permitiría reconstruir qué respaldo fue aprobado ni cuantificar la modificación.

### 9. ALTO — El canal del reporte central sigue sin decidirse y tampoco tiene una vía de configuración

- **Qué está mal:** RF-10 depende de un «canal configurado», pero el canal continúa abierto y ninguna carga o requisito define dónde se configura.
- **Evidencia:**  
  - `PRD...`, **RF-10**: el reporte sale «por el canal configurado».  
  - `PRD...`, **S-1**: correo electrónico es solo un supuesto.  
  - `PRD...`, **PA-P4**: el canal sigue abierto.  
  - `PRD...`, **RF-25 / D-34**: la carga controlada no incluye canales ni configuración de reportes.  
  - `discovery...`, **PA-1**: el canal permanece abierto.
- **Regla o escenario roto:** El job puede detectar correctamente a un no reportado, pero no existe una regla definitiva ni un dato cargable que determine por dónde debe salir. El flujo que materializa el valor principal del producto no tiene criterio de aceptación cerrado.

### 10. ALTO — La garantía de recuperación «una sola vez» no cubre el fallo durante el envío

- **Qué está mal:** La fila única evita duplicar la detección, pero no garantiza exactamente una salida cuando el sistema cae entre enviar por el canal y guardar que notificó.
- **Evidencia:**  
  - `PRD...`, **RF-10**: el reporte sale una sola vez por asignación y día.  
  - `PRD...`, **RNF-4**: tras una caída reporta lo pendiente «una sola vez».  
  - `discovery...`, **D-22**: la entidad guarda cuándo se detectó y cuándo se notificó; es única por asignación y fecha.  
  - `discovery...`, **D-21** afirma que esa unicidad impide duplicar.
- **Regla o escenario roto:** Si el correo sale y el proceso cae antes de registrar `notificado`, la recuperación lo envía otra vez. Si se marca como notificado antes del envío y cae inmediatamente después, no lo enviará nunca. La unicidad de la fila no resuelve ese borde.

### 11. MEDIO — Desactivar al supervisor puede dejar períodos sin actor capaz de aprobarlos

- **Qué está mal:** Se permite desactivar cuentas inmediatamente, pero solo el supervisor puede aprobar y no se define qué ocurre con sus períodos pendientes.
- **Evidencia:**  
  - `PRD...`, **RF-24**: una cuenta puede desactivarse y pierde acceso de inmediato.  
  - `PRD...`, **RF-19**: «El supervisor aprueba».  
  - `PRD...`, **RF-2**: Dirección ve todo, pero no recibe permiso de aprobación.  
  - `PRD...`, **RF-21**: solo un período aprobado sirve como respaldo de factura.
- **Regla o escenario roto:** Si el supervisor sale de la empresa después del envío mensual, ningún requisito autoriza a Dirección a aprobar ni define si un supervisor sustituto puede aprobar ese período histórico. La facturación queda bloqueada.

### 12. MEDIO — Los horarios nocturnos y los cruces entre zonas horarias no están definidos

- **Qué está mal:** Se admiten horarios contractuales y dos asignaciones, pero el registro usa una sola fecha y exige salida posterior a entrada sin definir turnos que cruzan medianoche ni cómo comparar horarios de clientes en zonas distintas.
- **Evidencia:**  
  - `PRD...`, **RF-8**: admite dos asignaciones si sus horarios no se cruzan; cada una usa la zona del cliente. No limita los horarios a un mismo día.  
  - `PRD...`, **RF-15**: cada actividad tiene una fecha, hora de entrada y salida; rechaza salida igual o anterior a entrada.  
  - `PRD...`, **RNF-7** y `discovery...`, **D-20**: las horas se interpretan en la zona del cliente.
- **Regla o escenario roto:** Una asignación de 22:00 a 06:00 sería rechazada porque `06:00 <= 22:00`, aunque RF-8 no la prohíbe. Dos horarios locales aparentemente separados también pueden cruzarse en tiempo real si pertenecen a zonas distintas, especialmente en cambios de horario estacional.

### 13. MEDIO — Las “métricas de éxito” no permiten decidir si el MVP tuvo éxito

- **Qué está mal:** Ninguna métrica tiene meta y la única que mide directamente el primer dolor carece incluso de responsable y mecanismo decidido.
- **Evidencia:**  
  - `PRD...`, sección **9**: «Ninguna meta de éxito tiene número decidido».  
  - **M-4**: el sistema no puede medir si el cliente avisó primero; exige registro manual.  
  - `PRD...`, **PA-P6**: sigue abierto quién lleva M-4.  
  - La propia sección 9 afirma que M-4 es la métrica que responde al primer dolor.
- **Regla o escenario roto:** Aunque el sistema se despliegue y genere reportes, no existe umbral ni registro operativo que permita demostrar que la empresa empezó a enterarse antes que el cliente. El resultado central puede declararse exitoso o fallido sin evidencia definida.

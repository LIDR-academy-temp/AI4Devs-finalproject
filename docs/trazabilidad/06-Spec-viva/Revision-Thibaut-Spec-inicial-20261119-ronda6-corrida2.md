# Revisión adversarial

- Fecha: 2026-11-19 10:27 EST
- Perfil: `openai` · protocolo `openai-responses`
- Modelo pedido: `gpt-5.6-sol` · modelo que respondió: `gpt-5.6-sol`
- Archivo: `<repositorio>/openspec/specs/acceso/spec.md` · huella `6c4e7cfbaa3c` · 27799 caracteres
- Archivo: `<repositorio>/openspec/specs/aviso-inicio/spec.md` · huella `3d68482f94be` · 22682 caracteres
- Archivo: `<repositorio>/openspec/specs/no-reportados/spec.md` · huella `9263060e4c80` · 25930 caracteres
- Archivo: `<espacio-de-trabajo>/05-Tickets/Recorte-Entrega-20261119-v4.md` · huella `c6d68d085af4` · 8225 caracteres
- Archivo: `<espacio-de-trabajo>/06-Spec-viva/HU-01.6-prueba-local-20261118-v1.md` · huella `300e2df41965` · 4913 caracteres
- Archivo: `<espacio-de-trabajo>/04-Backlog/Backlog-MVP-Controlador-de-Tiempo-20261118-v5.md` · huella `84e92c472ace` · 38894 caracteres
- Naturaleza: opinión de un modelo, no veredicto. No bloquea nada.

---

## Hallazgos

### 1. CRÍTICO — La revocación de sesiones en consultas directas a la base depende de una capacidad no comprobada

- **Qué está mal:** Se exige que la base compruebe en cada consulta si la sesión sigue abierta en el servicio, pero no se sabe si la base puede hacerlo y la alternativa elimina precisamente las consultas directas que los escenarios afirman soportar.
- **Evidencia:**
  - `acceso/spec.md`, requisito **«Separación por organización en la base»**:  
    > “La regla DEBE exigir además [...] que el servicio la tenga abierta”
  - Mismo requisito, bloque **«Por comprobar al construir HU-03.1»**:  
    > “Si la base no puede consultarlo, la salida es que la base no acepte consultas directas desde fuera del servidor”
  - `HU-01.6-prueba-local-20261118-v1.md`, resultado **P2**:  
    > “Validando el pase en local, la ventana es lo que le quede de vida al pase”
- **Regla o escenario que se rompe:** `acceso/spec.md`, escenario **«pase de una sesión cerrada o vencida»**.
- **Cómo se vería el fallo:** Una persona cierra sesión, conserva el pase emitido y continúa leyendo o modificando directamente la base hasta que expire el pase, porque la base solo valida localmente su firma. Si se adopta la alternativa, deja de ser cierto el escenario de consulta directa con el pase.

---

### 2. ALTO — HU-07.CA-7 y HU-07.CA-10 ordenan comportamientos opuestos después de un correo fallido

- **Qué está mal:** Una ejecución sin no reportados nuevos debe, a la vez, no enviar correo y reenviar los no reportados antiguos que siguen sin notificar.
- **Evidencia:**
  - `Backlog-MVP-Controlador-de-Tiempo-20261118-v5.md`, **HU-07.CA-7**:  
    > “en una ejecución no tengo ningún no reportado nuevo [...] no recibo ningún correo”
  - Mismo archivo, **HU-07.CA-10**:  
    > “el correo de una ejecución no llegó a salir [...] corre la siguiente [...] sale en esa”
  - `no-reportados/spec.md`, requisito **«Correo agrupado al supervisor»**:  
    > “enviar [...] los no reportados [...] que estén sin notificar y se hayan detectado en las últimas 24 horas”
- **Regla o escenario que se rompe:** HU-07.CA-7 o HU-07.CA-10, según cuál se implemente literalmente.
- **Cómo se vería el fallo:** Si un correo falla y en la ejecución siguiente no se clasifica a nadie nuevo, CA-7 exige silencio, mientras CA-10 y la especificación exigen reenviar el correo pendiente. Las pruebas pueden dar resultados opuestos para el mismo caso.

---

### 3. ALTO — La garantía de que la base rechaza correos discordantes tiene una alternativa que no ocurre en la base

- **Qué está mal:** El requisito promete una garantía de integridad en la base, pero contempla sustituirla por una validación exclusiva de la carga de arranque.
- **Evidencia:**
  - `acceso/spec.md`, requisito **«Un correo, una cuenta, una organización»**:  
    > “la base rechaza un usuario cuyo correo no coincida con el de su cuenta en el servicio”
  - Mismo requisito, bloque **«Por comprobar al construir HU-01.1»**:  
    > “Si no puede, la comprobación la hace la carga de los datos de arranque”
- **Regla o escenario que se rompe:** Escenario **«el correo no es el de la cuenta»**, cuyo resultado exige:  
  > “la base lo rechaza”
- **Cómo se vería el fallo:** Una migración, script o uso de la credencial del sistema inserta un usuario con el identificador de una cuenta y el correo de otra. La carga podría impedirlo en su camino normal, pero la base aceptaría directamente el estado que el requisito declara imposible.

---

### 4. ALTO — El plazo se verifica con una marca retroactiva y no con el momento en que el reporte queda realmente disponible

- **Qué está mal:** `detectado_en` se fija al instante inicial de la llamada aunque la fila se inserte mucho después, por lo que el sistema puede aparentar cumplir el intervalo sin que el reporte haya sido generado a tiempo.
- **Evidencia:**
  - `Backlog-MVP-Controlador-de-Tiempo-20261118-v5.md`, **HU-07.CA-15**:  
    > “el reporte queda generado y consultable [...] con un retraso máximo de un intervalo”
  - `no-reportados/spec.md`, requisito **«Ejecución recurrente»**:  
    > “Las organizaciones se procesan una por una”
  - Mismo requisito:  
    > “`detectado_en` —el instante de la llamada que lo detecta—”
  - Mismo requisito, límite D-84:  
    > “la fila aparece en la base unos segundos después, lo que dure el proceso de esa llamada hasta esa organización”
  - No se fija un límite acumulado para llegar a una organización.
- **Regla o escenario que se rompe:** HU-07.CA-15 y el escenario **«plazo»**.
- **Cómo se vería el fallo:** Con dos organizaciones de intervalo 5, si cada una tarda 4 minutos, la segunda puede quedar insertada 8 minutos después de la llamada y más de un intervalo después del vencimiento. Aun así, tendrá un `detectado_en` de la hora inicial y la prueba que solo compara esa columna pasará falsamente.

---

### 5. ALTO — No se prueba la autorización más peligrosa de la operación de registro dentro de una misma organización

- **Qué está mal:** La operación de base afirma comprobar consultor, cuenta activa y sesión vigente, pero sus escenarios de base solo cubren una asignación de otra organización.
- **Evidencia:**
  - `aviso-inicio/spec.md`, requisito **«Registrar el aviso»**, punto 1:  
    > “solo acepta una asignación que sea de ese consultor y de esa organización”  
    > “exige ella misma [...] usuario activo y sesión vigente”
  - Único escenario específico de esa barrera: **«la base no acepta una asignación ajena aunque el servidor la pida»**, que usa una asignación de la organización B.
  - No hay escenario que invoque directamente la operación con:
    - una asignación de otro consultor de la misma organización;
    - un usuario inactivo;
    - una sesión cerrada o vencida.
- **Regla o escenario que se rompe:** El punto 1 de **«Registrar el aviso»** y HU-02.CA-8.
- **Cómo se vería el fallo:** Una rutina que filtre únicamente por `organizacion_id` pasaría el escenario existente y permitiría registrar el aviso de un compañero. Una rutina con privilegios elevados que omita la vigencia de sesión también podría aceptar un pase ya cerrado.

---

### 6. ALTO — La credencial que omite las reglas puede insertar avisos fuera de la única operación autorizada

- **Qué está mal:** Se declara que la operación de registro es la única vía de inserción, pero la identidad del sistema omite las reglas y ningún escenario demuestra que no pueda insertar directamente.
- **Evidencia:**
  - `acceso/spec.md`, requisito **«Separación por organización en la base»**:  
    > “La única identidad que omite las reglas es la credencial del sistema”
  - `aviso-inicio/spec.md`, requisito **«Registrar el aviso»**:  
    > “Como esa operación es la única que inserta en la tabla”
  - `aviso-inicio/spec.md`, datos de `aviso_inicio`: el disparador sobrescribe hora, fecha y clasificación, pero no se declara que rechace una inserción privilegiada que no provenga de la operación.
  - El escenario **«intento directo en la base»** de **«El aviso no se edita ni se quita»** solo prueba edición y eliminación, no inserción con la credencial del sistema.
- **Regla o escenario que se rompe:** La afirmación de que solo la operación de registro inserta avisos.
- **Cómo se vería el fallo:** Un defecto en un proceso que usa la credencial del sistema ejecuta un `INSERT` para cualquier asignación. El disparador le asigna una hora válida y ese aviso falso evita que el consultor sea clasificado como no reportado.

---

### 7. ALTO — La batería prometida para permisos de escritura no está exigida por sus escenarios de verificación

- **Qué está mal:** Se exige un caso permitido y rechazado para ver y cambiar cada tabla, pero la comprobación automática descrita solo exige casos de consulta.
- **Evidencia:**
  - `acceso/spec.md`, requisito **«Reglas por rol en la base»**:  
    > “Cada fila de esta tabla tiene [...] uno que la regla deja pasar y uno que rechaza, para ver y para cambiar”
  - `acceso/spec.md`, requisito **«Matriz de permisos»**, escenario **«tabla sin sus casos de consulta directa»**:  
    > “su caso permitido y su caso rechazado de consulta directa”
  - El escenario **«un consultor y los datos de sus compañeros»** intenta cambios solo en `usuario`, `asignacion` y `parametro`, y únicamente como consultor.
- **Regla o escenario que se rompe:** La cobertura declarada por **«Reglas por rol en la base»**.
- **Cómo se vería el fallo:** Una política permitiría a dirección, supervisor o consultor modificar directamente `usuario_rol`, `cliente`, `no_reportado` u `organizacion`; la batería obligatoria seguiría en verde porque solo comprueba que existen casos de lectura para la tabla.

---

### 8. ALTO — La concurrencia entre aviso y clasificación es una garantía sin prueba en la entrega

- **Qué está mal:** Se afirma que el candado garantiza un resultado coherente, pero el criterio que demostraría esa garantía queda explícitamente sin verificar.
- **Evidencia:**
  - `Backlog-MVP-Controlador-de-Tiempo-20261118-v5.md`, **HU-07.CA-20**: exige un resultado único y coherente.
  - `Recorte-Entrega-20261119-v4.md`, sección **«Criterios que este recorte deja sin comprobar»**: incluye HU-07.CA-20.
  - `no-reportados/spec.md`, **«Riesgos aceptados»**:  
    > “la prueba de concurrencia no se escribe en esta entrega”
  - A la vez, `aviso-inicio/spec.md`, requisito **«Registrar el aviso»**, afirma:  
    > “Con este orden no queda nunca un aviso puntual junto a un no reportado del mismo día”
- **Regla o escenario que se rompe:** HU-07.CA-20 y la garantía de exclusión mutua entre ambas operaciones.
- **Cómo se vería el fallo:** Bajo concurrencia real podrían quedar un aviso puntual junto con un no reportado, no quedar ninguno, o producirse una clasificación con fecha/minutos incompatibles. Ninguna prueba de esta entrega lo detectaría.

---

### 9. MEDIO — La regla de cambio de hora cubre horas duplicadas y fines inexistentes, pero no tiene escenarios

- **Qué está mal:** El vocabulario decide cómo resolver una hora repetida y cómo calcular el fin, pero solo se prueba un inicio inexistente.
- **Evidencia:**
  - `aviso-inicio/spec.md`, **«Vocabulario»**, apartado **«Cambio de hora»**:  
    > “si existe dos veces, la primera”  
    > “Así cada asignación tiene cada día un solo inicio y un solo fin”
  - El único escenario es **«la hora de inicio no existe ese día»**.
  - `aviso-inicio/spec.md`, **«Riesgos aceptados»**:  
    > “Tampoco hay escenarios para la hora que se repite ni para un fin que no existe”
- **Regla o escenario que se rompe:** La decisión de cálculo único del inicio y fin en cambios de horario.
- **Cómo se vería el fallo:** La función podría elegir la segunda ocurrencia de una hora repetida o calcular incorrectamente un fin inexistente, alterando cuál asignación toca, cuándo deja de estar pendiente y cuándo se clasifica.

---

### 10. MEDIO — La prueba de contenido del correo no cubre todo el formato activo que el requisito prohíbe

- **Qué está mal:** El requisito prohíbe interpretar cualquier texto como formato, pero el escenario solo intenta etiquetas de enlace.
- **Evidencia:**
  - `no-reportados/spec.md`, requisito **«Contenido mínimo del correo»**:  
    > “nada de lo que contengan se interpreta como formato ni como enlace”
  - Escenario **«textos con marcas de formato»**: solo introduce  
    > “una etiqueta de enlace”
    y comprueba que no existan esos enlaces.
- **Regla o escenario que se rompe:** La prohibición de interpretar los datos como cualquier clase de formato.
- **Cómo se vería el fallo:** Una implementación que neutralice `<a>` pero permita `<img>`, estilos u otras construcciones HTML pasaría el escenario y aun así cargaría contenido remoto o alteraría el correo al abrirlo.

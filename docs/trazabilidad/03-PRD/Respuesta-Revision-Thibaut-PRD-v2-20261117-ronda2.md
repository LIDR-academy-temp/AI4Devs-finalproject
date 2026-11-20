# Respuesta a la revisión adversarial del PRD v2 — ronda 2

> **Martes 17/11/2026.** Responde a las dos corridas de la ronda 2:
> `Revision-Thibaut-PRD-v2-20261116-ronda2-corrida1.md` (13 hallazgos) y
> `Revision-Thibaut-PRD-v2-20261116-ronda2-corrida2.md` (19 hallazgos). La ronda recibió el PRD v2 y
> una copia del discovery sin nombres. Paso 4 del método (PROMPT 6b): la decisión es de la Dirección.
> El resultado es el PRD **v3**: `PRD-MVP-Controlador-de-Tiempo-20261117-v3.md`.

**Totales:** 32 hallazgos (13 + 19) que, unidos y sin duplicados, son **17 temas** · 14 se corrigen ·
2 se aceptan como riesgo o restricción · 1 es mixto (dos partes aceptadas y una descartada).
En la columna de hallazgos, `c1-n` es el hallazgo n de la corrida 1 y `c2-n` el de la corrida 2.

| Tema | Hallazgos | Qué señala | Respuesta | Dónde queda en la v3 |
|---|---|---|---|---|
| A · Aviso tardío | c1-1, c2-1 | El PRD lo reportaba y la decisión D-21 no | **Se corrige.** El reporte lista solo a quienes siguen pendientes; el aviso tardío queda marcado con sus minutos y va en una sección aparte del resumen final | RF-9, RF-13 · D-35 |
| B · Proyecto en el Excel | c1-5, c2-2, c2-19 | El archivo pide proyecto y contraparte sin fuente; el porcentaje dependía de un requisito deseable y no tenía base de cálculo | **Se corrige.** Cada registro lleva proyecto, actividad y ticket opcional; el porcentaje por proyecto se calcula sobre el total de horas del período; la contraparte es dato de la asignación | RF-8, RF-15, RF-21, RF-22 · D-37 |
| C · Botón con dos asignaciones | c2-3 | El botón no permitía el aviso tardío de la primera | **Se corrige** la redacción: corresponde a la primera asignación del día sin aviso que no ha terminado | RF-4, RF-6 · D-40 |
| D · Correcciones | c1-7, c1-8, c2-5 | No se decía quién corrige, qué cuenta como corrección ni qué guarda la traza | **Se corrige.** Corrige el consultor lo propio; agregar, editar o quitar cuenta; se guarda valor anterior y nuevo | RF-2, RF-15, RF-20, RF-23 · D-40 |
| E · Permisos | c1-11, c2-11 | Operaciones sin rol autorizado; sin supervisor nadie aprueba | **Se corrige.** La Dirección desactiva cuentas, cambia parámetros y puede aprobar. Se mejorará en versiones siguientes | RF-2, RF-19, RF-24 · D-40 |
| F · Cuenta desactivada | c2-12 | Sus asignaciones seguían generando no reportados | **Se corrige.** Desactivar la cuenta termina sus asignaciones | RF-24 · D-40 |
| G · Primera cuenta | c2-6 | Nadie podía entrar para hacer la primera carga | **Se corrige.** La carga inicial crea la organización y su primera cuenta de Dirección | RF-25 · D-40 |
| H · Datos sensibles | c1-2 | «Incapacidad» con texto libre es dato de salud | **Se corrige.** El texto no lleva diagnóstico ni detalle médico; eso se maneja aparte | RF-12, RNF-6 · D-40 |
| I · Intervalo | c1-4, c2-8 | Configurable, pero la ejecución estaba fija en cinco minutos | **Se corrige.** Mínimo 5 minutos y en múltiplos de 5 | RF-14 · D-39 |
| J · Cambio de parámetros | c2-15 | Sin vigencia ni límites | **Se corrige.** Valores positivos; el cambio aplica desde el día siguiente | RF-14 · D-39 |
| K · Catálogo | c2-13 | Renombrar una actividad alteraba meses ya aprobados | **Se corrige.** Proyectos y actividades se desactivan; no se borran ni se renombran | RF-25 · D-40 |
| Canal | c1-9, c2-7 | El canal seguía como supuesto | **Se corrige.** Correo agrupado por ejecución y resumen final; la solución móvil queda decidida para la versión siguiente | RF-10 · D-36 |
| Ámbito de los parámetros | c2-9 | «Para todos» frente a «por organización» | **Se corrige.** Uno por organización | RF-14 · D-39 |
| Envío del mes | c1-6, c2-4 | Se podía enviar y aprobar un mes incompleto, o cambiarlo ya enviado | **Se corrige.** Se envía desde el último día laborable; se muestran los días sin registro; si cambia tras el envío, vuelve a «sin enviar» | RF-18 · D-38 |
| L · Caídas | c1-10, c2-10 | Envío repetido o no reportados falsos tras una caída | **Se acepta el riesgo.** Se anotan con el motivo «falla técnica» | RA-6 · D-41 |
| M · Turnos nocturnos y zonas | c1-12, c2-14 | No se definían | **Se acepta como restricción.** El MVP solo admite horarios dentro de un mismo día | R-7 · D-41 |
| N · Traza, métricas y numeración | c2-16, c1-13, c2-17, c1-3, c2-18 | No hay pantalla para consultar la traza; las métricas no tienen meta; dos puntos abiertos «desaparecieron» | **Se aceptan** los dos primeros. **Se descarta** el tercero: el revisor confundió los PA-P de este PRD con los PA del discovery; se aclara la redacción | RA-7, §9, §10 · D-41 |

**Sospechas de la corrida 2.** La protección de las operaciones que usan la cookie de sesión y la
verificación de la separación entre organizaciones son asuntos de la spec y de las pruebas, no del
PRD: se atienden allí. La aceptación del formato único por el primer cliente se comprueba con él.

**Cierre de la refutación.** No se hace una tercera ronda. Los temas nuevos de la ronda 2 son de
nivel de spec y de ticket (permisos, validaciones, bordes), no de producto, y tres repiten la ronda
1 con más detalle. Lo que quede se atiende al escribir la spec, donde cada regla lleva su prueba
positiva y negativa.

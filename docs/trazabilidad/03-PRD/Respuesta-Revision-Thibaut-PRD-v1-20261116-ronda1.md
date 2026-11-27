# Respuesta a la revisión adversarial del PRD v1 — ronda 1

> **Lunes 16/11/2026.** Responde a `Revision-Thibaut-PRD-v1-20261116-ronda1.md` (18 hallazgos: 2
> críticos, 8 altos, 8 medios). Paso 4 del método (PROMPT 6b): la decisión es de la Dirección.
> Cada hallazgo se cierra de una de tres formas: se corrige, se acepta el riesgo o se descarta.
> El resultado es el PRD **v2**: `PRD-MVP-Controlador-de-Tiempo-20261116-v2.md`.

**Totales:** 18 hallazgos · 17 se corrigen (dos de ellos, el 11 y el 17, dejan además una parte
aceptada como riesgo) · 1 se acepta como riesgo (el 2) · 0 se descartan.

| # | Sev. | Hallazgo | Respuesta | Dónde queda en la v2 |
|---|---|---|---|---|
| 1 | Crítico | Un período aprobado se corrige y sigue como «aprobado» | **Se corrige.** Queda «aprobado con cambios posteriores» y el archivo lo indica. Sin nueva aprobación en el MVP; a futuro, una breve descripción del cambio | RF-20, RF-21, RA-2 · D-32 |
| 2 | Crítico | El ajuste final en el Excel ocurre fuera del sistema, sin traza | **Se acepta el riesgo.** Es consecuencia del recorte del MVP: sin bloqueo ni reapertura, el ajuste se hace en el archivo | RA-1 · D-18, D-32 |
| 3 | Alto | Con el margen de 60 minutos más el retraso no se cumple «dentro de la primera hora» | **Se corrige.** La promesa pasa a ser «al vencer el margen» | §2, §3 · D-29 |
| 4 | Alto | El máximo de cinco minutos choca con la recuperación tras una caída | **Se corrige.** El máximo aplica con el sistema en servicio; tras una caída el retraso es el de la caída | RNF-3, RNF-4 |
| 5 | Alto | Si la aplicación cae en el cierre no se puede exportar | **Se corrige.** La promesa se reduce: respaldo diario de los datos y la plantilla anterior como contingencia | RNF-5 |
| 6 | Alto | Dos asignaciones el mismo día rompen el botón único | **Se corrige.** Una asignación es un consultor con un cliente; una segunda solo si los horarios no chocan. El registro, el período y el archivo son por asignación. Llave en mano queda fuera | RF-4, RF-8, RF-15, RF-18, RF-21 · D-30 |
| 7 | Alto | Se admiten horas superpuestas, futuras o fuera de la asignación | **Se corrige.** Se suman esas validaciones | RF-15 |
| 8 | Alto | No se dice quién carga los datos de arranque | **Se corrige.** Los carga la Dirección por carga controlada, sin pantallas | RF-25 · D-34 |
| 9 | Alto | Un aviso tardío antes de que corra el proceso escapa del reporte | **Se corrige.** Todo aviso posterior al vencimiento del margen queda reportado como llegada tardía | RF-9, RF-13 |
| 10 | Alto | Un requisito necesario depende de uno deseable | **Se corrige.** El resumen por referencia del cliente pasa a deseable, junto con RF-16 | RF-22 |
| 11 | Medio | El plazo alterna entre «llega» y «sale» | **Se corrige** la redacción: se mide la salida. La entrega por el canal se acepta como riesgo | RF-10, RNF-3, M-2, RA-3 |
| 12 | Medio | No hay regla para desactivar cuentas ni sesiones | **Se corrige.** Requisito nuevo | RF-24 |
| 13 | Medio | No se define de dónde sale la modalidad del día | **Se corrige.** La modalidad es dato de la asignación y el botón dice lo mismo en todos los casos. Observar el cambio de modalidad de un día queda para versiones futuras | RF-4, RF-8 · D-31 |
| 14 | Medio | El margen se cambia sin autorización ni traza | **Se corrige.** Lo decide la Dirección y el cambio queda registrado | RF-14, RF-23 |
| 15 | Medio | Los cinco segundos no contemplan una sesión vencida | **Se corrige** la redacción: con sesión vigente | RNF-1 |
| 16 | Medio | «Ninguna meta numérica» contradice a M-2 | **Se corrige** la redacción: el tope de M-2 es un requisito, no una meta de éxito | §9 |
| 17 | Medio | Las ausencias previstas contaminan el reporte y M-1 | **Se corrige** M-1, que excluye los días con motivo de vacaciones, incapacidad o permiso. El aviso diario al supervisor **se acepta como riesgo** | M-1, RA-4 · D-18, D-22 |
| 18 | Medio | «Quincena» no tiene límites | **Se corrige.** El período es el mes calendario: se factura una vez al mes | RF-18, RF-22 · D-33 |

**Sospechas del informe.** La falta del discovery se atiende en la ronda 2, que recibe una copia
sin nombres. Los turnos que cruzan la medianoche y el cambio de horario de verano no aparecen en
ningún contrato vigente: no se tratan en el MVP.

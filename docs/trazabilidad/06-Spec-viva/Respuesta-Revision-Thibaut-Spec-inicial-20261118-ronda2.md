# Respuesta a la revisión adversarial — Especificación inicial, ronda 2

> Miércoles 18/11/2026. Informe revisado: `Revision-Thibaut-Spec-inicial-20261118-ronda2.md`
> (10 hallazgos). Borrador revisado: las tres especificaciones del repositorio, ya con las
> correcciones de la ronda 1.
> **Clasificación propuesta, sin aprobar por la Dirección.** Las correcciones están aplicadas en
> el borrador; ninguna ha pasado por otra ronda.

**Resumen:** 10 hallazgos · 7 corregidos · 1 en espera de una decisión de la Dirección · 1 ya
declarado en la ronda 1, con un ajuste de texto · 1 propuesto como límite declarado · ninguno
descartado. Suma: 7 + 1 + 1 + 1 = 10.

Después de las correcciones: 31 requisitos y 101 escenarios (tras la ronda 1 eran 31 y 94).

## Hallazgos

| # | Nivel | Qué decía | Qué se hizo | Dónde quedó |
|---|---|---|---|---|
| 1 | Crítico | «Sin sesión no se registra nada» prohibía la ejecución recurrente, que no tiene sesión | **Corregido.** Dos excepciones escritas y ninguna más: la pantalla de entrada y la operación interna, protegida con su credencial | `acceso`, «Sin sesión no se ve ni se registra nada» |
| 2 | Alto | Con la petición sin datos, un reintento del navegador registraba la asignación siguiente | **Corregido. El error lo introdujo la corrección del hallazgo 13 de la ronda 1.** La petición nombra la asignación que la pantalla ofreció; el servidor solo registra si es la que toca, y si ya tiene aviso devuelve ese | `aviso-inicio`, «Registrar el aviso» · recorte v3 |
| 3 | Alto | Una asignación cuyo margen vence pasada la medianoche no se reportaría nunca | **Corregido.** Se evalúa también el día anterior, solo cuando su vencimiento cae en el día en curso; escenario nuevo | `no-reportados`, «Clasificación de no reportados» |
| 4 | Alto | El correo repetido por confirmación perdida contradice HU-07.CA-6 y sigue pendiente | **En espera de la Dirección.** Es el punto E-5. El escenario de la llamada repetida dice ahora en qué condición vale | `no-reportados`, «Correo agrupado al supervisor» |
| 5 | Alto | Las marcas de la cookie no tenían ninguna comprobación | **Corregido.** La cookie la escribe el sistema; escenario para la marca que impide leerla desde la página; la de conexión cifrada se anota en el despliegue | `acceso`, «Peticiones que vienen de otro sitio» · recorte v3, H-4 |
| 6 | Alto | Nada impedía que la credencial del sistema cambiara o borrara un no reportado | **Corregido.** Un disparador lo impide para cualquier identidad; solo admite pasar `notificado_en` de nulo a un instante. Dos escenarios nuevos | `no-reportados`, Datos y «El no reportado se conserva» |
| 7 | Medio | La entrega no cumple «consultable en la aplicación» de HU-07.CA-10 y CA-15 | **Ya declarado en la ronda 1** para CA-15. Se añade lo mismo para la frase de CA-10 | `no-reportados`, Alcance |
| 8 | Medio | Nada garantizaba que la fecha del aviso fuera la del cliente | **Corregido.** El mismo disparador que pone la hora pone la fecha, según la zona del cliente; escenario cerca de la medianoche | `aviso-inicio`, Datos y «Registrar el aviso» |
| 9 | Medio | El plazo de un intervalo supone que procesar todas las organizaciones no tarda | **Propuesto como límite declarado.** Dos organizaciones en esta entrega; el registro de la ejecución anota cuánto tarda cada una | `no-reportados`, «Ejecución recurrente» |
| 10 | Medio | La regla del origen no decía qué hacer sin origen, con origen nulo o tras un intermediario | **Corregido.** Sin origen, con origen nulo o desde otro subdominio se rechaza; se compara contra la dirección pública configurada; la operación interna no pasa por esta regla | `acceso`, «Peticiones que vienen de otro sitio» |

## Decisiones de la Dirección del 19/11/2026 sobre esta ronda

- **Hallazgo 3: pasa de corregido a riesgo aceptado (D-79).** La regla del día anterior se quitó
  de la especificación, con su escenario. La solución definitiva calculará con la fecha y hora
  completas del inicio y del vencimiento. Con eso la ronda queda en 6 corregidos, 1 riesgo
  aceptado, 1 en espera, 1 ya declarado y 1 límite propuesto: 6 + 1 + 1 + 1 + 1 = 10. La
  especificación queda en 31 requisitos y **100 escenarios**: `no-reportados` baja de 36 a 35.
- **Hallazgo 6: aprobado (D-80).**
- **Hallazgo 4 (punto E-5): el correo se repite (D-82).** Pasa de «en espera» a corregido, con un
  escenario nuevo, «aceptado, pero la confirmación se pierde». La ronda queda en 7 corregidos, 1
  riesgo aceptado, 1 ya declarado y 1 límite propuesto: 7 + 1 + 1 + 1 = 10.
- **Punto E-1 de la ronda 1: zona horaria propia de la organización (D-81),** con un escenario
  nuevo, «la fecha es la de la organización, no la del servidor». La columna ya estaba en la
  tabla `organizacion`; se le quitó la marca de pendiente y se le añadió que no tiene valor por
  defecto y que la base rechaza una zona que no reconoce, igual que en `cliente`.
- Con los dos escenarios nuevos la especificación queda en 31 requisitos y **102 escenarios**:
  `no-reportados` sube de 35 a 37. Tercera ronda lanzada el 19/11, con dos corridas.

## Lectura del nivel de lo nuevo

No es momento de cerrar. Cinco de los diez (1, 2, 3, 6 y 8) son errores de diseño de verdad, no
de redacción, y uno de ellos lo introdujo una corrección de la ronda anterior. La regla del
proyecto es que la refutación se cierra por el nivel de lo nuevo, y este nivel pide otra ronda.
La decisión es de la Dirección.

## Decisiones tomadas en la especificación que la Dirección debe ver

A las ocho de la respuesta a la ronda 1 se suman tres:

9. **La petición de aviso nombra la asignación** que la pantalla ofreció. Sustituye a «la petición
   no dice nada» de la ronda 1.
10. **La clasificación mira también el día anterior** cuando el margen vence pasada la medianoche.
11. **El plazo de un intervalo tiene un límite declarado:** vale mientras el proceso de todas las
    organizaciones quepa entre una llamada y la siguiente.

## Lo que falta

- La decisión de la Dirección sobre los once puntos, empezando por E-1 y E-5, sin los cuales la
  especificación no se puede aprobar.
- Tercera ronda del revisor, con dos corridas unidas si es la última, cuando la Dirección lo indique.

## Verificación

Conteo por archivo después de corregir: `acceso` 13 requisitos y 38 escenarios · `aviso-inicio`
9 y 27 · `no-reportados` 9 y 36. Suma: 13 + 9 + 9 = 31 requisitos; 38 + 27 + 36 = 101 escenarios.

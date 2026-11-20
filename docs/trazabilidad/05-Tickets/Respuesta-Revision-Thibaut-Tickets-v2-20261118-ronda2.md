# Respuesta a la revisión adversarial — Tickets v2, ronda 2

> Miércoles 18/11/2026. Informe revisado: `Revision-Thibaut-Tickets-v2-20261118-ronda2.md`
> (12 hallazgos y 1 sospecha). Resultado en `Tickets-MVP-Controlador-de-Tiempo-20261118-v3.md`.
> Clasificación aprobada por la Dirección el 18/11/2026.

**Resumen:** 12 hallazgos · 10 corregidos en el documento · 1 es riesgo ya aceptado (D-48, D-58)
· 1 va a la especificación como regla nueva · ninguno descartado. Suma: 10 + 1 + 1 = 12.
Dos de los corregidos (1 y 10) los había introducido la corrección de la ronda 1.

## Hallazgos

| # | Nivel | Qué decía | Qué se hizo | Dónde quedó |
|---|---|---|---|---|
| 1 | Alto | Las migraciones de los primeros tramos debían entrar «en el mismo ticket» a unas pruebas que nacían varios tramos después | **Corregido.** El control se parte en dos: la comprobación de estructura (toda tabla con organización y regla) la entrega HU-03.1, la primera migración, y corre en cada cambio; las pruebas con datos siguen en HU-03.3. HU-01.1 pasa a depender de HU-03.1, y por eso los tramos suben de 10 a 11 | Sección 1 · HU-03.1 · HU-03.3 · nota «Dos controles, en dos momentos» · sección 5 |
| 2 | Alto | HU-02.1 hablaba de un rol por usuario y no heredaba el criterio de varios roles | **Corregido.** Título en plural, cita D-56 y hereda CA-10 | HU-02.1 |
| 3 | Alto | HU-01.CA-8 contado como completo sin que exista la carga que lo dispara | **Corregido.** Pasa a «en parte»; lo cierra HU-05 | HU-01 · sección 4 |
| 4 | Alto | 30 días y 72 horas como valores fijos | **Corregido.** HU-01.2 y HU-01.4 los leen de un parámetro y se prueban con un valor distinto del inicial. Cambiarlo sigue siendo de HU-11 | HU-01.2 · HU-01.4 · nota de HU-01 |
| 5 | Alto | La regla de fecha con clientes en zonas distintas no tiene prueba | **Riesgo ya aceptado** (D-48, D-58). Repite el hallazgo 7 de la ronda 1. Sigue como E-2 y como límite declarado de H-3 | Sección 8 |
| 6 | Medio | «La primera asignación del día» con clientes en días distintos no estaba entre los puntos de la especificación | **Corregido.** Punto E-7: la especificación lo deja escrito como riesgo aceptado (D-58), con lo que el sistema hace | Sección 8 |
| 7 | Medio | La comprobación a mano del correo real no tenía quién la ejecutara | **Corregido.** Queda como condición de aceptación del despliegue, con la evidencia que debe dejar | Límite de HU-07.8 · sección 4, tabla nueva |
| 8 | Medio | El criterio de los 5 segundos contado como completo sin la observación con usuarios | **Corregido.** HU-06.CA-14 pasa a «en parte»; lo cierra el despliegue | HU-06 · sección 4 |
| 9 | Medio | El tiempo de respuesta puede delatar si un correo tiene cuenta | **A la especificación**, punto E-8. Es una regla nueva que el backlog no trae | Sección 8 |
| 10 | Medio | El documento imponía «un secreto» y a la vez decía que no diseña | **Corregido.** «Credencial propia del sistema»; cuál y cómo, en la especificación (E-6) | Sección 1 · HU-07.3 · sección 8 |
| 11 | Medio | Totales presentados como cerrados cuando la especificación puede crear tickets | **Corregido.** Los totales valen hasta que se apruebe H-1; entonces se vuelven a cruzar | Encabezado |
| 12 | Medio | HU-01.6 con talla S y dependencia de un tercero | **Corregido.** Sube a M: 8 S y 22 M | HU-01.6 · sección 6 |

## Sospecha

La credencial de la ejecución recurrente sin reglas de cambio, alcance, guarda ni límite de
invocaciones: se sumó al punto E-6 de la especificación.

## Decisiones de la Dirección del 18/11/2026 sobre lo propuesto en la versión 2

Aprobadas las cuatro: el tipo «Especificación» con su Definition of Done · HU-02.CA-9 contado como
completo · HU-07.5 sin dependencia del correo · las dependencias de HU-07.6 sobre HU-06.3 y de
HU-10.1 sobre HU-07.6.

## Propuesto en la versión 3 y sin decidir por la Dirección

1. La dependencia nueva de HU-01.1 sobre HU-03.1 (el usuario pertenece a una organización), que
   agrega un tramo.
2. La tabla «Comprobaciones a mano que esperan al despliegue» y la evidencia que pide cada una.

## Verificación

Cruce automático sobre la versión 3 y el backlog v5: 30 tickets (27 + 3) · 8 S, 22 M, 0 L ·
11 tramos (2, 1, 1, 2, 4, 6, 4, 3, 4, 2, 1), iguales a los niveles calculados · sin ciclos · 49
dependencias, las mismas en las tablas y en el diagrama · 75 criterios: 54 completos, 17 en parte,
4 en espera · el número de cada título de tabla coincide con sus filas. Resultado: coherente.

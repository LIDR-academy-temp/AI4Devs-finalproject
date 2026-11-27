# Respuesta a la revisión adversarial — Tickets v3, ronda 3 (dos corridas unidas)

> Miércoles 18/11/2026. Informes revisados:
> `Revision-Thibaut-Tickets-v3-20261118-ronda3-corrida1.md` (11 hallazgos) y
> `Revision-Thibaut-Tickets-v3-20261118-ronda3-corrida2.md` (9 hallazgos).
> Resultado en `Tickets-MVP-Controlador-de-Tiempo-20261118-v4.md`.
> Clasificación aprobada por la Dirección el 18/11/2026, que además **cerró la refutación sin
> cuarta ronda**.

**Resumen:** 11 + 9 = 20 hallazgos, 4 repetidos entre corridas → **16 distintos** · 12 corregidos
en el documento · 1 riesgo ya aceptado (D-48, D-58) · 1 a la especificación · 1 aceptado con
destino en el ticket del despliegue · 1 descartado. Suma: 12 + 1 + 1 + 1 + 1 = 16.

`C1-n` es el hallazgo n de la primera corrida; `C2-n`, de la segunda.

## Hallazgos

| # | Origen | Nivel | Qué decía | Qué se hizo | Dónde quedó |
|---|---|---|---|---|---|
| 1 | C1-1, C2-1 | Crítico | Las reglas por rol en la base se construían antes de existir la asignación; las tablas posteriores solo quedaban obligadas a filtrar por organización | **Corregido.** HU-02.1 depende de HU-06.1; HU-07.1 depende de HU-02.1; toda tabla con datos de una persona nace con su regla por rol y su caso en la matriz; HU-02.4 nace con casos por rol hechos con consulta directa a la base | Sección 1 (Migración/DB) · HU-02.1 · HU-02.4 · HU-07.1 · sección 5 |
| 2 | C1-3, C2-2 | Alto | El primer endpoint debía agregar su fila a una matriz que nacía en su mismo tramo | **Corregido.** Los tres tickets Endpoint/API (HU-06.3, HU-07.3 y HU-10.1) dependen de HU-02.4 | Sección 3 · sección 5 |
| 3 | C1-2 | Alto | La especificación debía citar un criterio del backlog por requisito, y tres puntos obligatorios no vienen del backlog | **Corregido.** «…o el punto de la sección 8 y la decisión de la Dirección que lo origina» | Sección 1 (Especificación) |
| 4 | C1-4 | Alto | Ningún ticket conectaba las reglas del correo con la ejecución y el servicio externo | **Corregido.** HU-07.4 incluye entregar el correo al servicio desde la ejecución recurrente, y lo declara | HU-07.4 y su nota |
| 5 | C1-5, C2-4 | Alto | La frontera de fecha entre zonas horarias no tiene prueba | **Riesgo ya aceptado** (D-48, D-58). Tercera ronda en que aparece. Sigue en E-1, E-2 y el límite declarado de H-3 | Sección 8 |
| 6 | C1-6 | Alto | HU-07.CA-19 contado como completo sin existir la desactivación | **Corregido.** Pasa a «en parte» (HU-04) | Sección 4 |
| 7 | C2-3 | Alto | HU-07.CA-13 contado como completo sin existir el script que cambia el parámetro | **Corregido.** Pasa a «en parte» (HU-11) | Sección 4 |
| 8 | C1-7 | Medio | HU-02.CA-9 contado como completo, inconsistente con CA-7 | **Corregido.** Pasa a «en parte». La Dirección revirtió su aprobación de la ronda 2 | Sección 4 |
| 9 | C2-6 | Alto | Los escenarios que capturan el correo no comprobaban el contenido mínimo | **Corregido.** HU-07.8 hereda CA-17 | HU-07.8 |
| 10 | C2-5 | Alto | Sin prueba de ejecuciones repetidas con credencial válida | **Corregido.** Cada protección que la especificación decida en E-6 lleva su prueba en HU-07.3 | Sección 1 (excepción) · E-6 |
| 11 | C1-8 | Medio | No se probaba que el fallo de una organización no impida procesar la siguiente | **Corregido.** Prueba obligatoria de HU-07.3 | Sección 1 (excepción) |
| 12 | C1-9, C2-8 | Medio | HU-01.6 y H-2 son tipo Test sin criterio que citar | **Corregido.** Tercera excepción escrita: citan PA-B10 y R-4 | Sección 1 |
| 13 | C2-9 | Medio | H-1 no dependía de H-2 | **Corregido.** H-1 depende de HU-01.6 y de H-2 | Sección 2 · sección 5 |
| 14 | C1-10 | Medio | No se define qué cuenta de dirección suple al supervisor desactivado cuando hay varias | **A la especificación**, punto E-9. Es un hueco del backlog | Sección 8 |
| 15 | C1-11 | Medio | Los «5 segundos» no dicen a cuántas personas observar ni qué pasa si alguna los supera | **Aceptado.** Se fija al escribir el ticket del despliegue; queda anotado | Sección 4, comprobaciones a mano |
| 16 | C2-7 | Alto | «Sin sesión no veo nada» contado como completo antes de decidir si hay capa propia de acceso | **Descartado.** Todo ticket Endpoint/API exige sesión por Definition of Done, y la capa propia ya es el punto E-3: si nace, nace con su ticket | — |

## Lo que cambió además, sin que los informes lo pidieran

- **Dos criterios más «en parte» por la misma regla de los hallazgos 6 y 7** (decisión de la
  Dirección): HU-01.CA-4 y HU-01.CA-5, que parten de una cuenta desactivada. La regla quedó
  escrita en la sección 4: un criterio que empieza en una operación que aún no existe es «en parte».
- **Los tramos pasan de 11 a 12** por las dependencias de los hallazgos 1 y 2.

## Decisiones de la Dirección del 18/11/2026

- Aprobadas las dos propuestas de la versión 3: la dependencia de HU-01.1 sobre HU-03.1 y la
  tabla de comprobaciones a mano que esperan al despliegue.
- HU-02.CA-9 vuelve a «en parte».
- **Cierre de la refutación sin cuarta ronda.** Fundamento: los dos errores de orden eran
  mecánicos y ahora los comprueba el script; lo demás es de nivel de backlog o de especificación,
  y la especificación pasa por su propia refutación con este documento como contexto; el documento
  se vuelve a cruzar cuando se apruebe H-1. **Riesgo que se acepta:** las correcciones de la
  versión 4 no las revisó nadie más que el script.

## Control nuevo: reglas de orden en el cruce automático

`verificar-tickets.py` comprueba ahora tres reglas que antes dependían de una ronda de revisión:

1. Todo ticket Endpoint/API depende de la matriz de permisos (HU-02.4).
2. Ninguna migración corre en paralelo a las reglas por rol (HU-02.1): va antes o va después.
3. Todo ticket depende de la especificación inicial (H-1) o la precede, y H-1 depende de H-2.

**Prueba positiva y negativa.** Sobre la versión 4 pasan las tres. Sobre la versión 3 el script
señala siete faltas: los tres endpoints sin la matriz, HU-06.1 y HU-07.1 en paralelo a las reglas
por rol, y H-1 sin H-2 (contada dos veces, por las dos caras de la regla 3).

## Verificación

Cruce automático sobre la versión 4 y el backlog v5: 30 tickets (27 + 3) · 8 S, 22 M, 0 L ·
12 tramos (2, 1, 1, 2, 3, 4, 3, 3, 2, 3, 4, 2), iguales a los niveles calculados · sin ciclos · 55
dependencias, las mismas en las tablas y en el diagrama · 75 criterios: 49 completos, 22 en parte,
4 en espera · reglas de orden cumplidas. Resultado: coherente.

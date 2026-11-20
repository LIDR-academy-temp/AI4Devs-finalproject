# Respuesta a la revisión adversarial — Backlog v2, ronda 2

> **Miércoles 18/11/2026.** Informe revisado: `Revision-Thibaut-Backlog-v2-20261118-ronda2.md`
> (12 hallazgos: 8 altos y 4 medios; informe completo, con 4 sospechas no elevadas a hallazgo).
> Documentos revisados: `Backlog-MVP-Controlador-de-Tiempo-20261118-v2.md` y el PRD v4.
> Resultado: `Backlog-MVP-Controlador-de-Tiempo-20261118-v3.md`. **El PRD v4 no se tocó en esta
> ronda:** su ajuste espera las decisiones que siguen abiertas.

**Totales:** 12 hallazgos · 12 reales tras verificar las citas · ninguno repite uno de la ronda 1 ·
7 corregidos · 2 anotados para historias aún no detalladas · 3 propuestos como riesgo aceptado, sin
decidir. Una decisión de la Dirección: D-56.

**Tres de los 12 los abrió la corrección de la ronda 1** (hallazgos 2, 6 y 8). El 8 es un dato que
se escribió sin que nadie lo hubiera decidido —«la primera del día se decide con la fecha de la
organización»— y se retiró.

## Respuesta por hallazgo

| # | Nivel | Hallazgo | Respuesta | Qué se hizo |
|---|---|---|---|---|
| 1 | Alto | El modelo de roles está sin decidir | **Se corrige** | **D-56:** una persona puede tener más de un rol. HU-02.CA-10 nuevo; CA-11 y CA-12 propuestos (qué ve al abrir; el supervisor es otra persona). PA-B3 cerrado |
| 2 | Alto | Un supervisor desactivado puede seguir recibiendo correos | **Se corrige** | HU-07.CA-12: la persona desactivada no recibe ningún correo del sistema |
| 3 | Alto | La carga inicial no dice quién la ejecutó | **Sin decidir** | PA-B8, con la propuesta de guardar además el nombre de quien la ejecutó |
| 4 | Alto | Hay historias que no se prueban solas | **Se corrige** | HU-10 se detalló (9 criterios). Los tres criterios de HU-03 que dependen de otras historias llevan la marca «Depende de». Se retiró la frase «probarse sola» |
| 5 | Alto | Editar un registro entre dos períodos | **Se anota** | Nota N-1, para HU-13 y HU-16 |
| 6 | Alto | El enlace de la contraseña no caduca ni es de un solo uso | **Se corrige** | HU-01.CA-9, propuesto. Cuánto dura: PA-B7 |
| 7 | Alto | Fórmulas dentro del Excel exportado | **Se anota** | Nota N-2, para HU-17 |
| 8 | Alto | Dos fechas distintas para el botón de aviso | **Se corrige** | Se retiró la afirmación no decidida. Queda en PA-B9 (a) |
| 9 | Medio | Aviso que llega mientras corre el reporte | **Se corrige** | HU-07.CA-20: un solo resultado coherente |
| 10 | Medio | «Ese día» sin zona horaria al desactivar | **Riesgo propuesto, sin decidir** | PA-B9 (b), familia de D-48 |
| 11 | Medio | El intervalo no tiene tope | **Riesgo propuesto, sin decidir** | PA-B9 (c), familia de D-54 |
| 12 | Medio | La matriz de cobertura contradice el listado | **Se corrige** | Regla escrita y cruce automático entre «Cubre», la matriz y el origen de los 71 criterios: sin diferencias |

Las cuatro sospechas del informe (límite de intentos de entrada, cambio de horario de verano,
traza de intentos rechazados y recuperación de contraseña) no se elevaron a hallazgo. La última ya
es PA-B2; las otras tres son de la especificación y de la construcción, no del backlog.

## Conteos antes y después

| | v2 | v3 | Delta | Por qué |
|---|---|---|---|---|
| Historias | 18 | 18 | 0 | — |
| Historias con criterios | 5 | 6 | +1 | HU-10 |
| Criterios | 57 | 71 | +14 | HU-01.CA-9 · HU-02.CA-10 a CA-12 · HU-07.CA-20 · HU-10.CA-1 a CA-9 |
| Criterios [PROPUESTO] | 7 | 11 | +4 | HU-01.CA-9 · HU-02.CA-11 y CA-12 · HU-10.CA-8 |
| Puntos abiertos, filas | 6 | 9 | +3 | PA-B7, PA-B8 y PA-B9 |
| Puntos abiertos vigentes | 5 | 7 | +2 | Tres nuevos, y PA-B3 cerrado |
| Notas para historias no detalladas | 0 | 3 | +3 | N-1, N-2 y N-3 |
| Decisiones en el discovery | 55 | 56 | +1 | D-56 |

## Sobre el cierre

La ronda 2 no repite ninguna falla de la 1. De lo nuevo, dos hallazgos pertenecen a historias que
todavía no se detallan y tres son de una familia de riesgo que la Dirección ya aceptó dos veces.
Lo que queda de este nivel está corregido en la v3 o depende de una decisión. La propuesta es
cerrar la refutación del backlog con la v3; la decide la Dirección.

## Pendiente

- Decisiones: los once criterios [PROPUESTO] (PA-B6) y PA-B1, PA-B2, PA-B4, PA-B7, PA-B8 y PA-B9.
- PRD v5: recoger D-56 en RF-2, y en RF-24 que la persona desactivada deja de recibir correos; más
  lo que salga de PA-B8 y PA-B9.
- README v2 del repositorio: sigue con el texto del PRD v3 en los puntos de D-49 a D-56.

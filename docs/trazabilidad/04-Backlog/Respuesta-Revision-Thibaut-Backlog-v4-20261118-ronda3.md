# Respuesta a la revisión adversarial — Backlog v4, ronda 3 y cierre

> **Miércoles 18/11/2026.** Informe revisado: `Revision-Thibaut-Backlog-v4-20261118-ronda3.md`
> (12 hallazgos: 1 crítico, 7 altos y 4 medios; informe completo).
> Documentos revisados: `Backlog-MVP-Controlador-de-Tiempo-20261118-v4.md` y el PRD v5.
> Resultado: `Backlog-MVP-Controlador-de-Tiempo-20261118-v5.md` y
> `../03-PRD/PRD-MVP-Controlador-de-Tiempo-20261118-v6.md`.

**Totales:** 12 hallazgos · 12 reales · ninguno repite uno de las rondas 1 o 2 · 10 corregidos ·
2 anotados para más adelante · 0 descartados. Cuatro decisiones de la Dirección: D-65 a D-68.

**De dónde salieron.** Siete de los 12 tocan el acceso (enlace, recuperación, sesión larga y
correo), que es lo que se agregó entre la v3 y la v4. Toda corrección abre huecos propios, y por
eso se revisa.

## Respuesta por hallazgo

| # | Nivel | Hallazgo | Respuesta | Qué se hizo |
|---|---|---|---|---|
| 1 | Crítico | Cambiar la contraseña no cierra las sesiones abiertas | **Se corrige** | **D-65.** HU-01.CA-11 nuevo. PRD: RF-1. La duración de la sesión es parámetro y se ajusta si da problemas |
| 2 | Alto | Un enlace anterior sigue sirviendo tras pedir otro | **Se corrige** | HU-01.CA-9: deja de servir al pedir uno más reciente o al fijar una contraseña. PRD: RF-25 |
| 3 | Alto | No hay límite de intentos de entrada ni de peticiones de enlace | **Se anota** | Depende del servicio de autenticación: se sumó a la verificación PA-B10 |
| 4 | Alto | La cuenta desactivada recibe y no recibe el correo de recuperación | **Se corrige** | HU-01.CA-10: si la cuenta no existe o está desactivada no se envía correo. PRD: RF-25 |
| 5 | Alto | Un mismo correo en dos organizaciones | **Se corrige** | **D-66:** un correo, una cuenta; quien trabaja para dos empresas tiene dos cuentas; una organización puede usar varios dominios. HU-01.CA-12 nuevo, nota N-5. PRD: RF-1 y RF-25 |
| 6 | Alto | Se declara un solo punto abierto y N-1 es una decisión pendiente | **Se corrige** | El encabezado dice que las notas no están resueltas y que N-1 es una decisión de producto pendiente |
| 7 | Alto | El aviso posterior al reporte no tiene botón al terminar el horario | **Se corrige** | HU-06.CA-7: solo mientras el horario no haya terminado. PRD: RF-13 |
| 8 | Alto | La protección contra fórmulas cubre solo dos campos | **Se corrige** | Nota N-2 ampliada a todo texto. PRD: RF-21 |
| 9 | Medio | Se puede averiguar qué registros tiene un compañero | **Se corrige** | **D-67.** HU-02.CA-2 y CA-9 precisados. PRD: RF-2 |
| 10 | Medio | RNF-7 pide una zona horaria que la traza no tiene | **Se anota** | Nota N-4, para HU-18. PRD: RNF-7 acota su alcance a las horas de una asignación |
| 11 | Medio | No se define el instante exacto del vencimiento | **Se corrige** | **D-68:** cuenta como dentro del margen. HU-06.CA-5. PRD: RF-9 |
| 12 | Medio | El encabezado dice 73 criterios y una frase dice 71 | **Se corrige** | Total único. El cruce automático se repitió sobre los 75 de la v5: sin diferencias |

## Conteos antes y después

| | v4 | v5 | Delta | Por qué |
|---|---|---|---|---|
| Historias | 18 | 18 | 0 | — |
| Criterios | 73 | 75 | +2 | HU-01.CA-11 y HU-01.CA-12 |
| Puntos abiertos vigentes | 1 | 1 | 0 | PA-B10, ampliado |
| Notas para historias no detalladas | 3 | 5 | +2 | N-4 y N-5 |
| Decisiones en el discovery | 64 | 68 | +4 | D-65 a D-68 |

El PRD v6 no cambia ningún total respecto de la v5: 25 identificadores de requisito funcional,
8 no funcionales, 9 riesgos aceptados y 19 filas en «Sale del MVP y queda contemplado».

## Cierre

Tres rondas: 15, 12 y 12 hallazgos, sin repetir fallas entre una y otra. La Dirección cerró la
refutación del backlog el 18/11/2026 con la v5, sin cuarta ronda. Lo nuevo de la ronda 3 es
endurecimiento del acceso, que se termina en la especificación y al construir.

**Contra qué queda revisado y contra qué no:** el backlog v5 y el PRD v6 recogen las correcciones
de la ronda 3, y esas correcciones no pasaron por el revisor. Lo que quede se verá en la refutación
de los tickets y de la especificación, que los leen como fuente.

## Pendiente

- PA-B10: qué admite el servicio de autenticación (duraciones, por organización o no, límites de
  intentos).
- Notas N-1 a N-5, cuando se detallen HU-04, HU-05, HU-13, HU-16, HU-17 y HU-18.
- README v2 del repositorio: sigue con el texto del PRD v3 en los puntos de D-49 a D-68.

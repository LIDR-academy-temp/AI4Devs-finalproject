# Respuesta a la revisión adversarial — Backlog v1, ronda 1

> **Miércoles 18/11/2026.** Informe revisado: `Revision-Thibaut-Backlog-v1-20261118-ronda1.md`
> (15 hallazgos: 6 altos y 9 medios; informe completo, no cortado).
> Documento revisado: `Backlog-MVP-Controlador-de-Tiempo-20261118-v1.md`, con el PRD v3 de contexto.
> Resultado: `Backlog-MVP-Controlador-de-Tiempo-20261118-v2.md` y
> `../03-PRD/PRD-MVP-Controlador-de-Tiempo-20261118-v4.md`.

**Totales:** 15 hallazgos · 15 reales tras verificar cada cita contra el texto · 13 corregidos ·
2 aceptados como riesgo · 0 descartados. Siete llevaron decisión de la Dirección (D-49 a D-55).

## Respuesta por hallazgo

| # | Nivel | Hallazgo | Respuesta | Qué se hizo | Decisión |
|---|---|---|---|---|---|
| 1 | Alto | El consultor puede y no puede corregir su aviso | **Se corrige** | El aviso no se corrige ni se quita. HU-02.CA-1 lo excluye; HU-06.CA-13 deja de ser propuesto. PRD: RF-2 | D-49 |
| 2 | Alto | La primera cuenta forma un ciclo imposible | **Se corrige** | La carga inicial la ejecuta quien instala, fuera de la aplicación; cada cuenta recibe un enlace para fijar su contraseña. HU-01.CA-8 nuevo. PRD: RF-25. Queda abierta la recuperación (PA-B2) | D-50 |
| 3 | Alto | Los permisos no excluyen aprobar el período propio | **Se corrige** | HU-02.CA-4 y CA-6 llevan la excepción | — |
| 4 | Alto | El reintento del correo incumple el plazo de un intervalo | **Se corrige** | El plazo mide que el reporte quede generado y consultable; el correo se reintenta. HU-07.CA-10 y CA-15. PRD: RNF-3 y RF-10 | D-51 |
| 5 | Alto | La desactivación no termina las asignaciones | **Se corrige** | HU-04 lo dice en su enunciado; HU-07.CA-19 nuevo. Cobertura de RF-24: HU-01, HU-04 y HU-07 | — |
| 6 | Alto | HU-18 promete una inmutabilidad que el PRD no da | **Se corrige** | «Un registro que no se puede cambiar ni borrar desde la aplicación» | — |
| 7 | Medio | Se puede desactivar la última cuenta de dirección | **Se corrige** | No se desactiva la cuenta propia ni la última de dirección. Anotado en HU-04; sus criterios se escriben al detallarla. PRD: RF-24 | D-52 |
| 8 | Medio | Falta la mitad de RNF-1 | **Se corrige** | RNF-1 se cruza con HU-06 (5 segundos) y con HU-12 (60 segundos), esta última pendiente hasta detallarla | — |
| 9 | Medio | «No vuelve a salir» contradice la recuperación | **Se corrige** | HU-07.CA-6 nombra la excepción | — |
| 10 | Medio | CA-18 da por decidido un punto abierto | **Se corrige** | La dirección recibe solo el resumen final. PA-B5 cerrado. PRD: RF-10 | D-53 |
| 11 | Medio | «Hoy» y «mañana» sin referencia única con dos zonas horarias | **Se acepta como riesgo** | Ya era riesgo aceptado y característica futura (D-48). Se nombra en «Fuera de esta historia» de HU-06 y HU-07, y en la sección 4 del PRD v4 | D-48 |
| 12 | Medio | El margen no tiene tope | **Se acepta como riesgo** | Riesgo RA-8 del PRD v4 y fila nueva en «Sale del MVP y queda contemplado» | D-54 |
| 13 | Medio | La «hora exacta del toque» no tiene fuente | **Se corrige** | Es la hora en que el sistema recibe el toque. HU-06.CA-2. PRD: RF-4 | D-55 |
| 14 | Medio | El punto abierto lista 5 de los 8 propuestos | **Se corrige** | PA-B6 lista los 7 que quedan (HU-06.CA-13 dejó de serlo por D-49) | — |
| 15 | Medio | No todas las historias traen sus exclusiones | **Se corrige** | La validación dice que solo las cinco detalladas las traen, y que ninguna pasa a tickets antes | — |

## Lo que cambió en el PRD (v3 → v4)

Además de lo que nace de esta ronda, la v4 incorpora las decisiones D-42, D-43, D-44, D-46 y D-48,
que eran del 18/11 (refutación del README v2) y precisaban el PRD v3 sin estar escritas en él.
D-45 y D-47 son de diseño y no cambian el documento de producto. **La v4 no pasó por el revisor.**

| Requisito | Cambio | Decisión |
|---|---|---|
| RF-2 | El aviso no se corrige ni se quita | D-49 |
| RF-4 | Hora del aviso: la que recibe el sistema | D-55 |
| RF-6 | Se puede avisar antes de la hora de inicio | D-44 |
| RF-10 | Resumen por destinatario y al terminar la jornada; la dirección no recibe el correo por ejecución; el correo se reintenta | D-42, D-43, D-53, D-51 |
| RF-15 | Descripción obligatoria; ticket con clave | D-46 |
| RF-24 | No se desactiva la cuenta propia ni la última de dirección | D-52 |
| RF-25 | Carga inicial y primera credencial | D-50 |
| RNF-3 | Qué mide el plazo de un intervalo | D-51 |
| Sección 4 | Cuatro filas nuevas en «Sale del MVP y queda contemplado» (de 14 a 18) | D-48, D-54 |
| Sección 11 | Riesgo RA-8 (de 7 a 8) | D-54 |

## Conteos antes y después

| | v1 | v2 | Delta | Por qué |
|---|---|---|---|---|
| Historias | 18 | 18 | 0 | — |
| Criterios | 55 | 57 | +2 | HU-01.CA-8 y HU-07.CA-19 |
| Criterios [PROPUESTO] | 8 | 7 | −1 | HU-06.CA-13 quedó decidido (D-49) |
| Puntos abiertos vigentes | 6 | 5 | −1 | PA-B5 cerrado (D-53); la fila se conserva tachada |
| Decisiones en el discovery | 48 | 55 | +7 | D-49 a D-55 |

## Pendiente

- Los siete criterios [PROPUESTO] y los puntos abiertos PA-B1 a PA-B4 esperan decisión.
- El README v2 del repositorio sigue diciendo lo que decía el PRD v3 en los puntos de D-49 a D-55;
  se corrige en el paso 5, al cruzar los tickets.
- Los riesgos aceptados en esta ronda (hallazgos 11 y 12) ya están en la lista de versiones futuras
  del PRD v4; falta llevarlos a la misma tabla del README.

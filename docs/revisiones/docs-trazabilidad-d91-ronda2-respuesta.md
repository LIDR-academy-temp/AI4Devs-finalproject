# Respuesta a la ronda 2 — rama `docs/trazabilidad-d91`

> Jueves 19/11/2026. Responde a `docs-trazabilidad-d91-ronda2-corrida1.md` (11 hallazgos) y
> `docs-trazabilidad-d91-ronda2-corrida2.md` (12 hallazgos y 1 sospecha). Unidos quedan **16 hallazgos
> distintos y 1 sospecha**: 7 salieron en las dos corridas, 4 solo en la primera y 5 solo en la segunda.
> Se suman **3 hallazgos del agente** (A1 a A3), hechos al comprobar el commit `5d89d4d` fuera del revisor.
> **Material de la ronda:** el de la ronda 1, más su respuesta y el diff de las decisiones D-92 a D-95.
> El reemplazo de rutas de `5d89d4d` no entró: se comprobó con un guion (127 de 128 líneas cambian solo
> la ruta; la otra es la cita de D-92). **Límite:** el registro de decisiones completo no entró, como en
> la ronda 1, por el tope de entrada del revisor.

## Resumen

| Cierre | Cuántos |
|---|---|
| Corregido (5, 6, 8 a 11, 13 a 15, A1 a A3) | 10 + 3 del agente |
| Corregido con una decisión de la Dirección (1, 2, 4, 12) | 4 |
| Ya declarado en la ronda 1, sin hecho nuevo (3, 7, 16) | 3 |
| Sospecha resuelta con una decisión de la Dirección (S1) | 1 |
| **Total** | **16 + 1 sospecha + 3 del agente** |

**Decisiones de la Dirección en esta ronda:** D-96 a D-99, aprobadas el 19/11.

## Hallazgo por hallazgo

| # | Hallazgo (corrida-número) | Cierre | Qué se hizo y por qué |
|---|---|---|---|
| 1 | D-94 contradice RNF-4 del PRD v8 (c1-1, c2-4) | **Corregido · D-96, D-99** | Real: D-94 es posterior al PRD v8. El índice dice ahora que las decisiones posteriores al PRD v8 mandan sobre él, y nombra este caso; el README lo pone entre los riesgos a la vista. El PRD v9 lo recoge antes del tramo 8 (D-99) |
| 2 | Lo que «cubre» D-94 mientras tanto no existe (c1-2, c2-5) | **Corregido · D-96** | Real: «la caída larga la ve quien opera el sistema» era un supuesto, sin requisito, ticket ni alerta. D-96 lo declara así: no hay cobertura hasta la característica futura de D-94 |
| 3 | H-4 no comprueba el límite por IP ni qué dirección ve el servicio (c1-3, c2-6) | **Ya declarado · fecha adelantada** | Es el hallazgo 6 de la ronda 1, ya llevado a los tickets v5. Lo nuevo es cierto: los tickets v5 estaban en el colchón, después de H-4. D-99 los adelanta a antes del tramo 8 |
| 4 | D-92 contradice RNF-8 del PRD v8 (c1-4, c2-7) | **Corregido · D-98, D-99** | Igual que el 1: el índice y el README dicen que D-92 y D-98 mandan sobre RNF-8 hasta el PRD v9 |
| 5 | `docs/revisiones/` no está entre los documentos vivos (c1-5) | **Corregido** | Las respuestas (`docs/revisiones/*-respuesta.md`) son ahora documentos vivos. Las corridas del revisor quedan fuera a propósito, declarado en el verificador y en `scripts/referencias.txt`: son la opinión de un modelo y pueden citar mal, que es justo lo que la respuesta contesta |
| 6 | No comprueba criterios abreviados ni el interior de los rangos (c1-6) | **Corregido** | «HU-03.CA-1, CA-2 y CA-5» comprueba los tres; «HU-03.CA-1 a CA-3» y «D-1 a D-9», cada número del intervalo. Un rango al revés o de más de 200 se marca. Seis casos de prueba |
| 7 | Lo que cubre D-93 no lo comprueba nada (c1-7) | **Ya declarado** | Es el riesgo que la Dirección aceptó en D-93 sobre el hallazgo 2 de la ronda 1. Es cierto que la cobertura es una práctica de trabajo y no un control automático; D-93 lo dice como práctica («todo commit lo hace el agente con los hooks»), y su característica futura es el control |
| 8 | Formas de enlace Markdown que no reconoce (c1-8, c2-8) | **Corregido** | Ahora reconoce enlaces entre ángulos, con título y por referencia (`[id]: destino`); `%20` se lee como espacio, y un destino que empieza por `/` se busca desde la raíz. Los enlaces se revisan siempre, sin la heurística de «parece ruta», y solo en Markdown fuera del código en línea: ahí `x[i](y)` no es un enlace. Cinco casos de prueba |
| 9 | El índice admite filas duplicadas o estados inventados (c1-9) | **Corregido** | Una fila repetida falla; el estado tiene que ser `idéntica`, `neutralizada` o `derivada`. Dos casos de prueba |
| 10 | Faltan pruebas de derivada, neutralizada y desaparición (c1-10, c2-10) | **Corregido** | Casos nuevos: copia neutralizada (positivo), derivada de otro paso (negativo), copia que desaparece con `--base` (negativo). Las pruebas pasan de 32 a 52 |
| 11 | Tres documentos siguen diciendo «D-1 a D-91» (c1-11, c2-9) | **Corregido** | README, `prompts.md` e índice dicen ahora «D-1 a D-99». El commit `5d89d4d` decía «registro al día» y lo estaba solo en la copia del discovery |
| 12 | Las rutas locales siguen en el historial público (c2-1, CRÍTICO) | **Riesgo aceptado · D-97** | Cierto: `7de898e` está publicado. Se comprobó que sus rutas traen el usuario de la máquina y las carpetas del curso, sin clientes, empresas ni contratos. Reescribir la rama no lo borra, porque GitHub conserva la referencia del PR. El PR se une con *squash*; característica futura: que el hook detenga las rutas locales antes del commit |
| 13 | La inmutabilidad no se comprueba commit por commit (c2-2) | **Corregido como límite declarado** | Cierto, y lo confirma A1. Se declara en el verificador, en el índice y en `CLAUDE.md` §6: la comparación es con la rama base, y los PR se unen con *squash* (D-97) para que los estados intermedios no lleguen a la rama de la entrega |
| 14 | Una copia cambiada por un enlace simbólico pasa (c2-3) | **Corregido** | La inmutabilidad mira también el cambio de tipo (`T`), y un enlace simbólico dentro de `docs/trazabilidad/` falla siempre. Dos casos de prueba |
| 15 | El README llama «las mismas comprobaciones» al comando sin `--base` (c2-11) | **Corregido** | El README (§1.4) y `CLAUDE.md` §7 dan el comando con `--base origin/feature/entrega-1-JC`, y el README dice qué pasa sin él |
| 16 | M-2 frente a RNF-3 (c2-12) | **Ya declarado** | Es el hallazgo 4 de la ronda 1, llevado a la próxima versión del PRD. D-99 la fija: el PRD v9, antes del tramo 8 |
| S1 | El nombre del autor aparece también en los metadatos de los commits (c2, sospecha) | **Resuelta · D-98** | Cierto, y permitido por la lista privada desde el principio (`CLAUDE.md` §2); lo que fallaba era D-92, que decía «único lugar». D-98 nombra los dos lugares |
| A1 | Frente a `7de898e`, el verificador marca 28 copias reescritas por `5d89d4d`, y la integración continua no lo vio (agente) | **Corregido como límite declarado** | La rama se subió nueva: el push no tenía «antes» y el PR compara con una base sin `docs/trazabilidad/`. Es el caso del hallazgo 13; misma respuesta |
| A2 | El registro de decisiones derivado caía bajo la inmutabilidad: la próxima decisión pondría la integración continua en rojo (agente) | **Corregido** | Lo que el índice **de la base** declara `derivada` se exceptúa. Se lee el índice de la base y no el actual, para que una copia no se libre cambiando su estado a «derivada». Dos casos de prueba (positivo y negativo) |
| A3 | Una copia traía en el cuerpo una ruta parcial de la carpeta de respaldos (agente) | **Corregido** | Se cambió por `<carpeta-de-respaldos>` y la copia pasa a «neutralizada»: 48 idénticas, 28 neutralizadas y 1 derivada (77) |

## Cruce de las correcciones contra las reglas que tocan

- **La excepción de A2 abre un hueco, y se declara:** una edición de una decisión antigua en el
  registro derivado no la detiene la integración continua. Lo cubren la regla «una decisión superada no
  se borra, se marca» y que el diff del registro se ve en cada pull request. No se pudo pedir «solo
  crece»: el registro también cambia su cabecera y marca decisiones superadas, como D-94 hoy.
- **La revisión de rangos puede dar un falso rojo** si un rango cita un intervalo con huecos legítimos.
  Hoy no hay ninguno: los 13 documentos vivos pasan.
- **Los enlaces solo se revisan en Markdown y fuera del código en línea:** el primer intento los
  revisaba también en el código y dio 6 falsos rojos (los ejemplos del propio verificador y una línea
  del hook); el segundo dio 2 en esta misma respuesta, que cita `x[i](y)` entre comillas invertidas.
  Corregidos antes de responder, con su caso de prueba.
- **Las respuestas como documentos vivos:** la de la ronda 1 citaba el nombre de la rama como si fuera
  una ruta; se agregó a `[no-son-rutas]`.
- **Conteo:** decisiones del registro, 94 a 98 filas con negrita (+4, D-96 a D-99), iguales en la fuente
  privada y en la copia. Pruebas, 32 a 52 (+20: 11 de enlaces y rangos, 5 del índice, 4 de la
  inmutabilidad). Índice, 77 archivos (sin cambio).

**Por la regla de cierre, esta ronda no cierra:** la mayoría de los hallazgos nació de las correcciones
de la ronda 1. Se corre una tercera sobre estas correcciones.

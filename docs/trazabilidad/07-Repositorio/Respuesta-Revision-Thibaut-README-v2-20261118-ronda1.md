# Respuesta a la revisión adversarial del README v2 — ronda 1

- **Fecha:** miércoles 18/11/2026 (verificada con `date`).
- **Informe que se responde:** `Revision-Thibaut-README-v2-20261118-ronda1.md` (17 hallazgos y 4 sospechas).
- **Material revisado:** `readme.md` del repositorio (huella `82e379a42ac1`) con el PRD v3 como referencia.
- **Decide:** la Dirección. Las citas de cada hallazgo se verificaron contra el README y el PRD antes de clasificarlo.

## Resultado

| Respuesta | Cantidad | Hallazgos |
|---|---|---|
| Se corrige | 15 | 1, 2, 3, 4, 5, 6, 7, 9, 10, 11, 12, 13, 14, 16, 17 |
| Se acepta el riesgo | 1 | 15 |
| Se descarta | 1 | 8 |
| **Total** | **17** | |

## Hallazgo por hallazgo

| # | Nivel | Hallazgo | Respuesta | Qué se hizo y dónde |
|---|---|---|---|---|
| 1 | Crítico | El resumen final llegaba a todos los supervisores, con motivos de personas que no supervisan | Se corrige | D-42. El resumen se arma por destinatario: cada supervisor, sus supervisados; la dirección, toda la organización. README §1.2, §1.3, §3.2 (`RESUMEN_DIARIO`), HU-2 y T-06 |
| 2 | Alto | La unicidad de la fila no garantizaba que el correo saliera | Se corrige | El envío lo gobierna `notificado_en`: se envía lo que está en NULL y se marca al salir. README §3.2 (`NO_REPORTADO`), T-05 descripción y criterios 5 y 5b |
| 3 | Alto | El «resumen final» podía salir al comienzo de la jornada | Se corrige | D-43. Sale cuando todo está clasificado y terminó el horario de la última asignación del día. README §1.2, §1.3, HU-2, T-06 |
| 4 | Alto | Desactivar un supervisor tenía dos comportamientos | Se corrige | Solo terminan sus asignaciones como consultor; la dirección lo suple. README §2.5, §3.2 (`USUARIO`), T-05 y T-10 |
| 5 | Alto | La referencia externa no era una copia fechada | Se corrige | La fila no se actualiza; la misma clave con otro título crea otra fila. README §3.1, §3.2, T-02 criterio 11 |
| 6 | Alto | La base no impedía mezclar clientes dentro de una organización | Se corrige | `cliente_id` en el registro, llaves compuestas hacia asignación, proyecto y referencia, y disparador para la actividad. README §3.1, §3.2, T-02 criterio 8 |
| 7 | Alto | No se probaba el aislamiento entre supervisores de una misma organización | Se corrige | Las políticas del supervisor exigen que la asignación sea suya. README §2.5, HU-2, T-02 criterio 9, T-05 criterio 11 |
| 8 | Alto | Se podía avisar antes de que empiece la jornada | Se descarta | D-44. Es el comportamiento querido: «aún no iniciada» en RF-6 es la vigencia de la asignación, no la hora. La Dirección lo marcó como importante: el aviso debe aceptarse antes del horario. Se dejó explícito en §1.2, la API, HU-1 y T-04 criterio 7. Avisar sin haber empezado es el riesgo aceptado RA-5 |
| 9 | Alto | La carga inicial no tenía a quién atribuir la traza | Se corrige | La traza lleva actor `usuario` o `sistema`; `usuario_id` solo puede faltar con actor `sistema`. README §3.1, §3.2, T-02 criterio 12, T-10 |
| 10 | Alto | `USUARIO` no declaraba su relación con la cuenta de autenticación | Se corrige | `USUARIO.id` es llave foránea a `auth.users`. README §3.1, §3.2, T-02 criterio 10 |
| 11 | Medio | El respaldo diario se prometía sin verificarlo | Se corrige | Pasa a «por confirmar», junto al cron, y su comprobación entra en T-11. README §2.1, §2.4 |
| 12 | Medio | Se decían tres roles y el esquema traía cuatro | Se corrige | D-45. El rol del aprobador del cliente sale del esquema del MVP. README §2.5, §3.1, §3.2 |
| 13 | Medio | La API no definía editar ni quitar registros | Se corrige | T-07 los incluye de forma expresa; la sección 4 lo declara. No se detallan en el extracto porque la plantilla pide los endpoints principales |
| 14 | Medio | El contrato admitía un ticket vacío y un registro sin descripción | Se corrige | D-46. Descripción obligatoria; el ticket, si se envía, exige la clave. README §4, §3.2 |
| 15 | Medio | «Hoy» no estaba definido para una organización con clientes en varias zonas | Se acepta el riesgo | Las asignaciones ya usan la zona de su cliente. El resumen y la vigencia de parámetros usan una fecha por organización: es exacto mientras sus clientes compartan zona, como ocurre hoy. La separación por zona ya está contemplada a futuro. Declarado en §1.2, riesgos aceptados |
| 16 | Medio | El intervalo configurable no tenía regla de anclaje | Se corrige | A una organización le toca la ejecución cuando los minutos desde la medianoche UTC son múltiplo de su intervalo. T-05 descripción y criterio 12 |
| 17 | Medio | La traza solo era inalterable para el usuario normal | Se corrige | Un disparador rechaza `UPDATE` y `DELETE` para cualquier rol, incluida la clave de servicio. README §2.5, §3.2, T-02 criterio 4 |

## Sospechas no confirmadas

| Sospecha | Respuesta |
|---|---|
| CSRF en rutas con cookie | Se resuelve al implementar T-03 (sesión por cookie); se revisa en la revisión adversarial de ese PR |
| Texto médico libre en el motivo | Riesgo aceptado, declarado en §1.2: depende de quien escribe |
| Festivos del cliente | Riesgo aceptado, declarado en §1.2: aparecen como no reportados y se anota el motivo |
| Políticas RLS que se leen a sí mismas | Se resuelve en T-02: el rol y la organización se leen con una función que no dispara las políticas de `USUARIO` |

## Efecto sobre otros documentos

- **Discovery:** decisiones **D-42 a D-47** agregadas. Total: 47.
- **PRD v3:** no se modificó. D-42 y D-43 precisan su RF-10 y D-44 precisa su RF-6. Si el PRD se publica en `docs/prd/`, conviene una v4 con esas tres precisiones.
- **Backlog:** T-02, T-05, T-06, T-07, T-10 y T-11 recibieron criterios nuevos sin cambiar de talla. La estimación de 38 horas queda más ajustada.

## Cierre de la ronda

No se hace segunda ronda sobre el README. Ningún hallazgo repite los del PRD, y lo corregido ya es de nivel de ticket o de esquema. Cada corrección es un cambio más y se revisa donde corresponde: la spec inicial y el esquema (T-02) pasan por su propia revisión adversarial.

# Respuesta a la revisión adversarial — Especificación inicial, ronda 1

> Miércoles 18/11/2026. Informe revisado: `Revision-Thibaut-Spec-inicial-20261118-ronda1.md`
> (17 hallazgos y 3 sospechas). Borrador revisado: las tres especificaciones del repositorio,
> `openspec/specs/acceso`, `aviso-inicio` y `no-reportados`.
> **Clasificación propuesta, sin aprobar por la Dirección.** Las correcciones ya están aplicadas
> en el borrador; ninguna ha pasado por otra ronda.

**Resumen:** 17 hallazgos · 16 corregidos · 1 en espera de una decisión de la Dirección · ninguno
descartado. Suma: 16 + 1 = 17. Las 3 sospechas se atendieron con texto nuevo.

Después de las correcciones: 31 requisitos y 94 escenarios (antes, 30 y 84).

## Hallazgos

| # | Nivel | Qué decía | Qué se hizo | Dónde quedó |
|---|---|---|---|---|
| 1 | Crítico | Las columnas de organización admitían nulo, y con un nulo la base no comprueba la relación | **Corregido.** Regla general: toda columna es NOT NULL salvo las que digan «admite nulo»; la comprobación de estructura falla si `organizacion_id` admite nulo | `acceso`, Datos y «Separación por organización en la base» |
| 2 | Alto | La comprobación de estructura no veía si el dueño de la tabla o un rol con privilegio omite las reglas | **Corregido.** Las reglas se fuerzan también para el dueño, y la comprobación falla si el rol de las personas es dueño de una tabla o puede omitirlas | `acceso`, «Separación por organización en la base» |
| 3 | Alto | Asignaciones y personas podían quedar sin datos indispensables | **Corregido** con la misma regla general del hallazgo 1 | Las tres, sección Datos |
| 4 | Alto | El recorte decía «no se reintenta» y la especificación lo exigía | **Corregido.** El recorte pasa a la versión 2: el correo lleva todo lo que esté sin notificar, así que lo que no salió entra en la ejecución siguiente; se difieren la suplencia y los escenarios de punta a punta | Recorte v2 · `no-reportados`, Alcance |
| 5 | Alto | HU-07.CA-15 pide que el reporte sea consultable en la aplicación y la consulta está diferida | **Corregido.** El criterio queda «en parte», escrito en los dos documentos | Recorte v2 · `no-reportados`, Alcance |
| 6 | Alto | Se decía que el despliegue volvería a comprobar el servicio de autenticación y H-4 no lo incluía | **Corregido.** H-4 repite P1, P2 y P5 contra el servicio gestionado | Recorte v2 · `acceso`, Riesgos aceptados |
| 7 | Alto | Sin regla contra peticiones que vienen de otro sitio usando la cookie | **Corregido.** Requisito nuevo, con sus dos escenarios | `acceso`, «Peticiones que vienen de otro sitio» |
| 8 | Alto | Una matriz con una columna por rol no puede representar al supervisor con asignación propia | **Corregido.** Las columnas son nueve situaciones, no tres roles | `acceso`, «Matriz de permisos» |
| 9 | Alto | La zona horaria de la organización es una propuesta pendiente y ya se usa como regla | **En espera de la Dirección.** Es el punto E-1. Queda escrito que la especificación no se aprueba sin esa decisión | `no-reportados`, «Parámetro vigente» |
| 10 | Alto | Un correo rechazado cerca de la medianoche no saldría nunca | **Corregido.** El tope pasa del día en curso a 24 horas desde la detección; lo que pasa del tope se cuenta en el registro de la ejecución | `no-reportados`, «Correo agrupado al supervisor» |
| 11 | Alto | El no reportado «no cambia» y a la vez se le marca `notificado_en` | **Corregido.** Se dice qué columnas no cambian nunca y cuál cambia una vez | `no-reportados`, «El no reportado se conserva» |
| 12 | Alto | La dirección no vería un cliente sin asignaciones | **Corregido.** La dirección ve todos los clientes de su organización | `acceso`, «Reglas por rol en la base» |
| 13 | Medio | Una llamada directa podía registrar una asignación distinta de la que toca | **Corregido, y fue más lejos que el hallazgo.** Con la sesión del consultor escribiendo directo en la base también se podían falsear la hora y la fecha. Ahora ninguna persona inserta un aviso: lo escribe el sistema después de aplicar la regla, la petición no dice de quién ni de qué asignación es, y un disparador pone la hora de la base | `acceso`, «Reglas por rol en la base» · `aviso-inicio`, «Registrar el aviso» y Datos |
| 14 | Medio | El intervalo no decía desde dónde se cuenta el múltiplo | **Corregido.** Una sola referencia absoluta, con un escenario de 90 minutos | `no-reportados`, «Ejecución recurrente» |
| 15 | Medio | El instante exacto en que vence la sesión no estaba probado | **Corregido.** Escenario nuevo: a los 30 días exactos se acepta, un segundo después no | `acceso`, «Sesión vigente» |
| 16 | Medio | Horas que no existen o se repiten por cambio de hora | **Corregido.** Regla y escenario: la hora que no existe pasa al primer instante válido; la repetida toma la primera | `aviso-inicio`, Vocabulario y «Asignación pendiente de aviso» |
| 17 | Medio | «No lee datos de personas» era falso: los lee para armar el correo | **Corregido.** Los lee; lo que no hace es devolverlos en su respuesta | `no-reportados`, «Protección de la ejecución recurrente» |

## Sospechas

| Sospecha | Qué se hizo |
|---|---|
| Reglas por rol y por organización que al combinarse dejen pasar de más | La regla por organización es restrictiva: se suma como condición obligatoria a cualquier otra |
| Identidad heredada entre peticiones por reutilizar conexiones | Queda escrito que el sistema no mantiene conexiones propias a las que ponga la identidad a mano |
| Textos de los datos interpretados como formato en el correo | Regla y escenario nuevos en «Contenido mínimo del correo» |

## Decisiones tomadas en la especificación que la Dirección debe ver

No vienen del backlog. Se aprueban o se cambian al aprobar la especificación.

1. **E-1:** la organización tiene zona horaria propia para decidir «hoy» y «mañana» de un parámetro.
2. **E-5:** si el servicio de correo acepta un mensaje y su confirmación se pierde, el correo se repite.
3. **Tope de 24 horas** para enviar un no reportado que quedó sin notificar.
4. **El aviso lo escribe el sistema**, no la sesión del consultor. La base ya no impide por sí sola
   que alguien avise por otro: lo impide que la petición no diga de quién es. A cambio, nadie
   puede falsear hora, fecha ni asignación.
5. **Cambio de hora:** qué instante se toma cuando la hora local no existe o se repite.
6. **Un solo motivo** cuando hay varias asignaciones y ninguna pendiente, con su orden.
7. **`sesion_dias` rige en cuanto cambia**, sin «desde el día siguiente».
8. **A un usuario inactivo no se le envía correo**, aunque no haya quién lo supla en esta entrega.

## Lo que falta

- La decisión de la Dirección sobre los ocho puntos de arriba.
- Segunda ronda del revisor sobre el borrador corregido: toda corrección se revisa.
- Una falta de proceso propia: las correcciones de la especificación `acceso` se aplicaron con un
  guion en vez de con la herramienta de edición. Cada reemplazo comprobó que su ancla fuera única
  y los conteos coinciden, pero no es la forma acordada; las otras dos sí se editaron como
  corresponde.

## Verificación

Conteo por archivo después de corregir: `acceso` 13 requisitos y 36 escenarios · `aviso-inicio`
9 y 25 · `no-reportados` 9 y 33. Suma: 13 + 9 + 9 = 31 requisitos; 36 + 25 + 33 = 94 escenarios.

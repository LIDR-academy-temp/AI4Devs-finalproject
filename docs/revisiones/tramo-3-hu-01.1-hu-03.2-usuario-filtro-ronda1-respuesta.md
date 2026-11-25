# Respuesta a la ronda 1 — rama `tramo-3/hu-01.1-hu-03.2-usuario-filtro`

> Miércoles 25/11/2026. Responde a `tramo-3-hu-01.1-hu-03.2-usuario-filtro-ronda1-corrida1.md` y
> `-corrida2.md` (dos corridas sobre todo el tramo, diff hasta `3d32d98`). **13 hallazgos distintos
> (5 ALTO, 8 MEDIO), ninguno crítico, y una sospecha que traen las dos corridas.** Es la única ronda
> del tramo (dispensa D-74). Las correcciones siguieron el control G6 ampliado el 25/11: corrección
> mínima, pruebas vistas en rojo antes del código, revisión del objeto completo y una revisión
> interna de las correcciones antes de cerrar (sección final).

## Resumen

| Cierre | Cuántos |
|---|---|
| Corregido | 11 |
| Corregido con límite declarado (5, 9) | 2 |
| **Total** | **13** |
| Sospecha (dueño que omite las reglas): corregida | 1 |

Pruebas de las correcciones: commit `ad4e290`, vistas en rojo antes del código. Código: `e2ac6cd`.

## Hallazgo por hallazgo

| # | Hallazgo (corridas) | Cierre | Qué se hizo y prueba |
|---|---|---|---|
| 1 | La corrección de un error de captura no se puede completar con la credencial del sistema (c1-1, c2-1) | **Corregido** | Cierto: la credencial del sistema no puede leer las cuentas, así que no puede reescribir el usuario. La corrección se hace en dos pasos, los dos de los administradores técnicos: la credencial del sistema cambia la cuenta y el rol de las migraciones reescribe el usuario. Especificación y D-103 lo dicen; casos P10 y N25 |
| 2 | El bloqueo de D-103 solo detecta la solicitud, no la confirmación de una que ya estuviera pendiente (c2-2) | **Corregido** | El bloqueo rechaza también que el correo pase a ser el de una solicitud pendiente. Caso N24, en rojo antes del código |
| 3 | H-4 solo comprobaría que se puede crear el disparador, no que funcione (c1-3) | **Corregido** | La especificación y D-103 piden a H-4 repetir por la API N9, P3, P10 y P13. N24 queda solo local (revisión interna, abajo) |
| 4 | La prueba de «un solo lugar» se puede eludir (c1-2, c2-3) | **Corregido** | El detector ve `.from(` y `.rpc(` con cualquier argumento y por corchetes, en todo el repositorio. Casos N10 y P7. Lo que no ve queda como límite en el módulo y en la especificación |
| 5 | El instante exacto del plazo no se prueba (c1-5, c2-5) | **Corregido con límite** | El plazo pasa a `dentro_del_plazo()`, que se prueba en el instante exacto (P11) y un instante después (N26). Por `es_mi_organizacion` no se puede probar el instante exacto: el pase anota segundos enteros y la consulta mira microsegundos. N29 comprueba que la usa |
| 6 | Varias entradas con contraseña: regla sin definir (c1-6, c2-6) | **Corregido** | Vale la más antigua: ante la duda, la sesión vence. Casos N28 y P12. **Criterio del agente, a confirmar por la Dirección** |
| 7 | La duración en días depende de la zona horaria (c1-4) | **Corregido** | El plazo se cuenta en horas: 24 por día. Caso N27, con instantes fijos que cruzan el cambio de horario |
| 8 | El mensaje de error muestra el texto del motor (c1-7) | **Corregido** | Mensaje fijo; el error del cliente queda como causa. Caso N11 |
| 9 | La renovación de la sesión no se prueba con el bloqueo instalado (c1-8) | **Corregido con límite** | Caso P13: la sesión se renueva y conserva su momento de entrada. Es un control de que no estorba: pasaría igual sin el bloqueo |
| 10 | Un identificador en mayúsculas vuelve inexistente lo propio (c2-7) | **Corregido** | Los dos lados se comparan en minúsculas. Caso P6 |
| 11 | La validación de `usuario` no tiene ningún caso que la vea fallar (c2-4) | **Corregido** | `tests/base/prueba-validacion-usuario.py`: un desvío por fila (30 casos), en la integración continua |
| 12 | El README dice «estado al 23/11» con trabajo del 25/11 (c2-8) | **Corregido** | Dice «estado al miércoles 25/11/2026» |
| 13 | `api_local.py` deja escapar fallos sin mensaje propio (c2-9) | **Corregido** | Captura los fallos de conexión y de lectura. Comprobado a mano apuntando a un puerto cerrado; sin caso automático |

**Sospecha (las dos corridas): `es_mi_organizacion` lee `usuario`, cuya regla la vuelve a llamar.**
Corregida: la validación comprueba que el dueño de las dos funciones con privilegios omite las
reglas (fila 26) y que la comprobación marca un dueño que no las omite (caso N26).

## Revisión interna de las correcciones (G6, paso 7)

Un agente sin el contexto de la sesión revisó solo el diff de las correcciones (`3d32d98` a
`e2ac6cd`), con las mismas instrucciones que Thibaut. Informe:
`tramo-3-hu-01.1-hu-03.2-usuario-filtro-ronda1-revision-interna.md`. **11 hallazgos, todos nacidos
de las correcciones, ninguno crítico ni alto (5 MEDIO, 6 BAJO).** Pruebas en `8fd1bcc`; código en
el commit que sigue.

| # | Hallazgo | Cierre |
|---|---|---|
| 1 | N27 solo distinguía días de horas durante un mes; nada probaba que `es_mi_organizacion` usara el plazo | Corregido: N27 con instantes fijos; N29 nuevo |
| 2 | H-4 no puede repetir N24 (necesita superusuario), y N24 confirmaba como superusuario | Corregido: N24 confirma con el rol del servicio de autenticación y se declara solo local |
| 3 | D-103 y la especificación no decían lo mismo sobre la corrección y H-4 | Corregido: D-103 anota los dos pasos y los casos de H-4. La fila H-4 del recorte v4 es una copia histórica: lo recoge el H-4 de los tickets v5 (D-99) |
| 4 | La especificación decía más de lo que ve el detector | Corregido: límite ampliado (`fetch`, desestructuración, `.call`), más extensiones y solo se salta la carpeta `tests/` de la raíz |
| 5 | El detector prohíbe `.rpc(` y el módulo no ofrece cómo llamar una operación | Límite declarado: lo agrega el ticket del aviso (HU-06.3) |
| 6 | El bloqueo rechaza una corrección hacia el mismo correo de una solicitud pendiente | Corregido en la documentación: primero se limpia la solicitud |
| 7 | `dentro_del_plazo` la podía ejecutar cualquiera; desborda con valores absurdos | Corregido: solo la ejecuta su dueño (fila 25, caso N28). El desborde queda como límite |
| 8 | El detector marca en falso un `X.from(...)` que no es consulta | Límite declarado: falla del lado seguro |
| 9 | La causa guardaba solo el mensaje | Corregido: guarda el error entero (N11) |
| 10 | Pruebas débiles: la validación no exige que falle solo la fila esperada; P13 pasaría sin el bloqueo | Límite declarado: igual que en la validación de `organizacion`; P13 es un control de que no estorba |
| 11 | Texto viejo en la cabecera de la migración y en `prompts.md` | Corregido en la cabecera; `prompts.md` anota la corrección en la entrada de esta ronda |

**Lo que no pasó por Thibaut:** las correcciones de la revisión interna. La dispensa D-74 fija una
ronda por tramo; las vio el revisor interno y las cubren sus pruebas.

## Cómo nos fue con los controles

| Medida | Tramo 2 | Tramo 3 |
|---|---|---|
| Hallazgos de Thibaut nacidos de correcciones | 7 de 10, 8 de 8 y 6 de 6 (rondas 2 a 4) | 0: una sola ronda, sobre el código original |
| Rondas pagadas | 4 (7 corridas) | 1 (2 corridas) |
| Hallazgos nacidos de correcciones, cazados antes de pagar | — | 11, por la revisión interna, ninguno crítico ni alto |

Las correcciones siguen generando hallazgos (11). La diferencia es que los cazó la revisión interna,
que no cuesta una ronda, y que ninguno llegó a crítico ni alto. Los pasos 4 a 6 bajaron el nivel; no
los eliminaron.

## En local, tras `db reset`

Validaciones 2/2 · estructura sin fallas · pruebas 18/18, 35/35, 31/31, 30/30, 40/40 y 42/42 ·
unitarias 18/18 · tipos, estilo y compilación en verde · verificador sin referencias rotas.

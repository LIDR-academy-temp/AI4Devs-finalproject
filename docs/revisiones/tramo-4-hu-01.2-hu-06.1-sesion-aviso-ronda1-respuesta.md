# Respuesta a la ronda 1 — rama `tramo-4/hu-01.2-hu-06.1-sesion-aviso`

> Miércoles 25/11/2026. Responde a `tramo-4-hu-01.2-hu-06.1-sesion-aviso-ronda1-corrida1.md` y
> `-corrida2.md` (dos corridas sobre todo el tramo, diff hasta `4b5cbe1`). **10 hallazgos distintos
> (6 ALTO, 4 MEDIO), ninguno crítico.** Es la única ronda del tramo (dispensa D-74). Las
> correcciones siguieron el control G6 completo: corrección mínima, pruebas vistas en rojo antes
> del código, revisión del objeto completo y una revisión interna de las correcciones antes de
> cerrar (sección final).

## Resumen

| Cierre | Cuántos |
|---|---|
| Corregido | 7 |
| Corregido con límite declarado (A, F, H) | 3 |
| **Total** | **10** |

Las dos corridas trajeron además dos sospechas, las dos convertidas en hallazgo por la otra
corrida: el momento de entrada en el futuro (G) y el dueño que apaga el disparador (H).

Pruebas de las correcciones: commit `d9d1c27`, vistas en rojo antes del código —10 unitarias, 3 de
base y la validación del aviso—. Código, migración y documentación: `f68196f`.

**Dos hallazgos los decidió la Dirección** antes de corregir, porque no eran defectos de
implementación sino criterios: **E** (si cambiaba D-104) y **F** (si la prueba con el cliente
oficial iba a la integración continua o quedaba como riesgo aceptado). Eligió corregir E como
decisión nueva, **D-105**, y llevar la prueba a la integración continua.

## Hallazgo por hallazgo

| # | Hallazgo (corridas) | Cierre | Qué se hizo y prueba |
|---|---|---|---|
| A | `cerrar` y `cortar` declaran el cierre hecho aunque el servicio lo rechace (c1-1, c2-2) | **Corregido con límite** | El hallazgo es cierto, pero su remedio evidente era falso y lo destapó la revisión interna: el cliente oficial, con alcance local, **borra la sesión del navegador antes de pedir la revocación**, y su propio código lo dice («signing out of this device never depends on the network»). Así que un error no significa que la persona siga dentro. `cerrar` comprueba si queda sesión: si no queda, responde «cerrada» (P19 y P20); si queda, o no se puede comprobar, responde `NO_SE_CERRO` con mensaje nuestro (N33 y N34). `cortar` ya no deja escapar la excepción del servicio (N35). **Límite declarado:** cuando el cierre local se hizo y la revocación falló, ese pase puede seguir siendo válido en el servicio hasta que caduque; este navegador ya no lo tiene, pero una copia serviría mientras el usuario esté activo y dentro del plazo. Revocar a la fuerza queda como característica futura |
| B | Un error de la base tras autenticar deja una sesión nueva sin comprobar el usuario (c2-1) | **Corregido** | En `entrar`, la comprobación del pase va en `try`: si falla, se retira la sesión recién creada y después se informa. Caso N37. El límite «un error de la base no cierra la sesión» sigue valiendo para una petición ya autenticada (N24), y la especificación dice ahora que en la entrada es al contrario |
| C | Una entrada fallida puede conservar una sesión anterior del navegador (c1-3, c2-3) | **Corregido** | `entrar` corta antes de devolver el mensaje único, **pero solo cuando el servicio rechazó las credenciales** (responde con el estado de su API): si lo que falla es el servicio, no se corta nada, porque una falla pasajera sacaría de su sesión a quien ya estaba dentro —eso lo cazó la revisión interna—. Casos N36 (rechazo: queda sin sesión) y N38 (servicio caído: la sesión sigue). Dos escenarios nuevos en la especificación |
| D | La marca de conexión cifrada se decide comparando el texto de la dirección (c1-4, c2-5) | **Corregido** | Sale del esquema de la dirección leída como URL, igual que `origenDe`. Casos P18 (`HTTPS://…` y mayúsculas mezcladas) y N31: una dirección que no se puede leer se marca cifrada, el lado seguro —y con esa configuración el sistema rechaza igual toda entrada y todo cierre— |
| E | Una entrada con contraseña con el momento mal formado se ignora en vez de hacer vencer la sesión (c2-4) | **Corregido (D-105)** | Decisión de la Dirección: precisa D-104, no lo contradice. Si alguna entrada con contraseña trae un momento que no se puede leer, no hay momento de entrada. En las dos capas: `momentoDeEntrada` (N4, reescrito, y el control P17) y el cuerpo nuevo de `es_mi_organizacion` (N14, N15 y el control P8 de `prueba-sesion.py`). P12 de `prueba-usuario.py` exigía lo contrario: pasó a N30, con su control |
| F | La prueba con el cliente oficial solo corre en local (c1-2, c2-8) | **Corregido con límite** | Decisión de la Dirección: va a la integración continua, en el trabajo de la base, que es el que levanta la base; se le agregaron Node y pnpm. **Límite:** sigue necesitando `CT_BASE_LOCAL=1`, para que `pnpm test` funcione sin Docker; la variable la pone la integración continua. Esa variable abría un verde falso —si faltara, la suite se saltaría y el trabajo pasaría sin probar nada—, así que el trabajo pone además `CT_INTEGRACION_EXIGIDA` y el caso **I7** hace fallar ese verde |
| G | Un momento de entrada en el futuro alarga la vigencia (c2-6; sospecha en c1) | **Corregido** | `dentroDelPlazo` exige `entrada <= ahora`, y `dentro_del_plazo` en la base lo mismo. Sin tolerancia de desfase: ante la duda, la sesión vence. Casos N30 y N32 (código), N16 (base) y la fila «lo que decide» de la validación nueva. Escenario nuevo en la especificación |
| H | El dueño de la tabla puede apagar los disparadores; la documentación dice más de lo que hay (c2-7; sospecha en c1) | **Corregido con límite** | Se corrige el texto, no el código: un disparador no puede impedir que el dueño lo apague antes de escribir, porque `ALTER TABLE` es suyo. La garantía vale frente a toda identidad con la que el sistema se conecta, la credencial del sistema incluida; el dueño es el rol de las migraciones, que el sistema en servicio no usa. El caso P11 de `prueba-aviso-modelo.py` deja escrito el límite: apaga el disparador y el cambio pasa |
| I | La validación del modelo del aviso va a fallar cuando HU-02.1 agregue lo anunciado (c1-5) | **Corregido** | Vigila sus propios invariantes: las reglas **restrictivas** (fila 12) y lo que puede cada rol, que es lo que «Reglas por rol en la base» deja fijo en esta entrega (la columna «Cambia» dice «nadie»). HU-02.1 solo concede **leer a `authenticated`**, así que la fila 13 mira a `authenticated` sin contar leer y a `anon` **todo**, leer incluido, y una fila 15 nueva exige que **ninguna regla permisiva alcance a quien no tiene sesión**. La primera versión de esta corrección quitaba leer a los dos roles y dejaba pasar una fuga a `anon`: lo cazó la revisión interna. Casos P2 (la lectura de HU-02.1 no rompe nada), N16, N21, N22 y N23 |
| J | El README da dos cifras distintas de escenarios (c2-9) | **Corregido** | Una sola cifra actual, **141**, contada con `grep -c '^#### Scenario:'` sobre las tres especificaciones (57 + 42 + 42); la historia queda aparte en la misma frase. Eran 134 al aprobarse la especificación (D-89), 135 con D-103, 139 con los cuatro escenarios de esta ronda y 141 con los dos de su revisión interna |

## Lo que nos costó una vuelta de más

Tres defectos nuestros, en las correcciones mismas:

1. **La corrección de E en la base no funcionó al primer intento, y lo delató el motor:** el `CASE`
   que devuelve nulo cuando alguna entrada es ilegible no evita que el motor calcule los agregados,
   así que `(a ->> 'timestamp')::bigint` daba error en vez de nulo. Lo cazaron P12 de
   `prueba-usuario.py` y N14 de `prueba-sesion.py` al correr contra la base. La conversión quedó
   dentro de `min`, con un `CASE` propio. Es el paso 6 de G6 —el caso límite se prueba en el motor
   real— haciendo su trabajo.
2. **La corrección de A partía de una premisa falsa sobre el cliente oficial**, y además el cliente
   falso de las pruebas la daba por cierta, así que las pruebas la confirmaban. Lo cazó la revisión
   interna leyendo la biblioteca. Detalle en la sección siguiente.
3. **La corrección de F abría un verde falso propio**: si la variable que activa la suite faltara,
   la integración continua la saltaría y el trabajo pasaría sin probar nada. Cerrado con el caso I7.

## Revisión interna de las correcciones (G6, paso 7)

Un agente sin el contexto de la sesión revisó solo el diff de las correcciones (`4b5cbe1..f68196f`),
con las mismas instrucciones que Thibaut, y comprobó lo que afirmaba contra la base local y contra
el cliente oficial instalado. Informe:
`tramo-4-hu-01.2-hu-06.1-sesion-aviso-ronda1-revision-interna.md`. **11 hallazgos, todos nacidos de
las correcciones: 2 altos, 5 medios y 4 bajos.** Pruebas y código en el commit que sigue a
`f68196f`. **Ninguno pasó por Thibaut** (D-74: una ronda por tramo).

| # | Hallazgo | Cierre |
|---|---|---|
| 1 ALTO | La corrección de A partía de una premisa falsa: con alcance local el cliente oficial borra la sesión **antes** de pedir la revocación, así que decíamos «no se cerró» lo que sí se cerró, y pedíamos un reintento que no revoca nada | **Corregido** y verificado en el código de `@supabase/auth-js` 2.119.0: `cerrar` comprueba si queda sesión antes de responder. P19, P20, N33 y N34 |
| 2 ALTO | El cliente falso codificaba esa premisa, así que N33, N34 y N35 pasaban por el motivo equivocado | **Corregido**: el doble borra la sesión como la biblioteca, y «la sesión sobrevive» pasa a ser una variante explícita (`cierreFalla: "vive"`) |
| 3 MEDIO | El corte de C también se disparaba con el servicio caído: una falla pasajera destruía una sesión válida | **Corregido**: se corta solo si el servicio rechazó las credenciales (estado 4xx de su API). N38 nuevo, y un escenario nuevo en la especificación |
| 4 MEDIO | La corrección de I quitó la vigilancia de la lectura para los dos roles: un `grant select` a `anon` o una regla permisiva para quien no tiene sesión pasaban en verde | **Corregido**: `anon` vuelve a mirarse completo y una fila 15 vigila las reglas permisivas que lo alcanzan. N21, N22 y N23 |
| 5 MEDIO | Texto viejo: «solo en local» seguía en tres sitios, uno de ellos la especificación | **Corregido** los tres (`grep` en todo el repositorio, 0 restantes) |
| 6 MEDIO | El guardarraíl del verde falso de la CI estaba escrito pero sin commitear | **Corregido**: va en el commit de esta vuelta |
| 7 MEDIO | «La garantía vale frente a toda identidad, la credencial del sistema incluida» no tenía caso que lo probara | **Corregido**: N29, con los tres roles intentando apagar el disparador |
| 8 BAJO | «Las dos capas leen el momento de entrada igual» afirmaba más de lo que hay: difieren en una forma que el servicio no emite | **Corregido**: la frase queda acotada, con el límite y por qué cae del lado seguro |
| 9 BAJO | Dos imprecisiones en la cabecera de la migración (la razón del STABLE y la del REVOKE repetido) | **Corregidas** |
| 10 BAJO | El docstring de la prueba del aviso conservaba la afirmación que H corrigió | **Corregido** |
| 11 BAJO | Dos comprobaciones más débiles de lo que parecen (el post-chequeo por texto y el `count(*) = 0` de P11) | **Límite declarado**: las dos están cubiertas por pruebas de comportamiento (N14, N15, P8, N30 y P10) y así queda escrito |

Dos sospechas quedaron sin cerrar y las dejo anotadas: una configuración rota que sí parsea como URL
con un esquema inventado devuelve `secure: false` —no es regresión, el código viejo hacía lo mismo,
y con esa configuración no se puede entrar ni cerrar—; y tres pruebas que escriben en la base no se
ejecutaron en esa revisión, por el encargo de solo lectura, pero sí aquí.

## Cómo nos fue con los controles

| Medida | Tramo 2 | Tramo 3 | Tramo 4 |
|---|---|---|---|
| Hallazgos de Thibaut nacidos de correcciones | 7 de 10, 8 de 8 y 6 de 6 (rondas 2 a 4) | 0: una sola ronda, sobre el código original | 0: una sola ronda, sobre el código original |
| Rondas pagadas | 4 (7 corridas) | 1 (2 corridas) | 1 (2 corridas) |
| Hallazgos nacidos de correcciones, cazados antes de pagar | — | 11, por la revisión interna, ninguno crítico ni alto | 11, por la revisión interna y por el motor de la base; **2 altos**, uno de ellos una premisa falsa que habría llegado al cliente |

Lectura honesta: los pasos 4 a 6 de G6 no impidieron que nuestras correcciones generaran 11
hallazgos, y esta vez dos fueron altos —peor que en el tramo 3—. Lo que funcionó fue el paso 7: los
cazó antes de pagar una ronda. Y el patrón se repite: **los dos altos nacieron de afirmar cómo se
comporta una biblioteca sin leerla**, que es el mismo modo de falla que la regla de conclusiones
sobre información verificada ya nombra. Propuesta para el tramo 5: cuando una corrección dependa
del comportamiento de una dependencia, leer su código o probarlo antes de escribir el límite.

## En local, tras `db reset`

Validaciones 5 (72 filas) · estructura sin fallas (5 tablas) · base 18, 35, 31, 40, 43, 30, 24, 11,
56, 25 y 8 casos · unitarias 77 · integración con el cliente oficial y la base local 7/7 · tipos,
estilo y compilación en verde · verificador sin referencias rotas.

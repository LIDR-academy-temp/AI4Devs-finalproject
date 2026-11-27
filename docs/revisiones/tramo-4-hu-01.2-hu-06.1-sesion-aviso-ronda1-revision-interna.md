# Revisión interna de las correcciones — ronda 1 del tramo 4 (G6, paso 7)

> Miércoles 25/11/2026. Informe de un agente sin el contexto de la sesión, con las mismas
> instrucciones que usa el revisor adversarial, sobre **solo** el diff de las correcciones
> (`4b5cbe1..f68196f`: `d9d1c27`, las pruebas en rojo, y `f68196f`, las diez correcciones). No
> modificó nada del repositorio; comprobó contra la base local y contra el cliente oficial
> instalado (`@supabase/auth-js` 2.119.0) con un guion propio fuera del repositorio.
>
> **11 hallazgos: 2 ALTO, 5 MEDIO, 4 BAJO.** Todos nacidos de las correcciones. El cierre de cada
> uno está en `tramo-4-hu-01.2-hu-06.1-sesion-aviso-ronda1-respuesta.md`, sección «Revisión interna
> de las correcciones». No pasaron por Thibaut (D-74: una ronda por tramo).
>
> Al revisar había cambios sin commitear en `.github/workflows/ci.yml`, `readme.md`,
> `scripts/referencias.txt`, `tests/integration/sesion.test.ts` y `prompts.md` (el guardarraíl del
> verde falso); el informe lo dice en cada hallazgo al que afecta.

## ALTO 1 · La corrección del hallazgo A parte de una premisa falsa: `signOut` local **sí** borra la cookie antes de llamar al servicio

**Qué está mal.** `cerrar()` responde `NO_SE_CERRO` (503, «No pudimos cerrar la sesión. Inténtalo de
nuevo en unos minutos.») cuando `signOut` devuelve error, y se declara como límite que «la cookie se
queda en el navegador». En `@supabase/auth-js` 2.119.0, con `scope: "local"` el orden es el
contrario: `_signOut` llama a `removeCurrentSession()` **antes** de `this.admin.signOut(accessToken,
scope)`, y solo después decide si devuelve el error. Cuando el servicio falla, la sesión local **ya
está borrada** y el error se devuelve igual.

**Archivo y línea.** `lib/sesion/vigente.ts` (comentario de `cortar` y cuerpo de `cerrar`),
`lib/sesion/reglas.ts` (`NO_SE_CERRO`), `openspec/specs/acceso/spec.md` («Segundo límite declarado»
y el escenario «el servicio no pudo cerrarla»).

**Regla que se rompe.** Requisito «Cerrar la sesión» y el propio límite declarado; y la regla de
conclusiones sobre información verificada: el límite se escribió sin comprobarlo contra el cliente
oficial.

**Escenario de falla (ejecutado, no supuesto).** Sesión puesta en el cliente oficial con un galletero
de prueba y `/logout` respondiendo 500:

```
1) sesion puesta: ok · cookies: 1 [ 'sb-127-auth-token' ]
2) signOut local con /logout en 500 -> error: "el servicio no pudo cerrar la sesion"
   cookies que quedan: 0 []
3) la peticion siguiente ve sesion: no
4) el reintento (sin cookie ya) -> error null  => cerrar() diria «cerrada» sin revocar nada
```

Consecuencias: (a) se le dice a la persona que su sesión **no** se cerró cuando en su navegador sí
se cerró; (b) se le pide reintentar y el reintento no revoca nada y responde «cerrada»; (c) el
riesgo real —el pase sigue válido en el servicio hasta que expire— queda sin declarar.

**Corrección mínima.** Tras un `signOut` con error, consultar `getSession()`: si ya no hay sesión,
responder «cerrada» y registrar que la revocación falló; y reescribir el límite: «la sesión de este
navegador queda cerrada; lo que puede no haberse revocado es el pase en el servicio». El mensaje no
debe pedir un reintento que no puede hacer nada.

## ALTO 2 · El cliente falso de las pruebas codifica esa premisa, así que N33, N34 y N35 pasan por el motivo equivocado

**Qué está mal.** El `signOut` del cliente falso, cuando el cierre falla, **no** limpia la sesión, y
el comentario lo declara como contrato: «En los dos casos la cookie que tuviera el navegador se
queda». Es lo contrario de lo que hace la biblioteca. Las pruebas que respaldan la corrección A se
ven en verde solo porque el doble se comporta distinto.

**Archivo.** `tests/unit/sesion.test.ts` (comentario de `cierreFalla`, el doble, N33, N34, N35).

**Regla que se rompe.** G6 paso 5 (rojo primero) y paso 6 (el objeto completo). `tests/integration/
sesion.test.ts` es la única prueba que pasa por el cliente oficial y no tiene ningún caso de cierre
fallido.

**Escenario de falla.** Si `cerrar` se corrigiera como pide ALTO 1, N33 fallaría contra el doble
aunque el código fuera correcto.

**Corrección mínima.** Que el doble borre la sesión también cuando el cierre falla, y que «la cookie
se queda» sea una variante explícita.

## MEDIO 3 · El corte del hallazgo C cierra una sesión válida cuando el servicio de autenticación falla

**Qué está mal.** En `entrar`, la rama `if (error || !pase)` llama a `cortar(cliente)`.
`signInWithPassword` devuelve `error` —no lanza— también cuando el servicio está caído o la red falla
(`AuthRetryableFetchError`; verificado en `GoTrueClient.js`). Una caída pasajera durante un intento
de entrada destruye la sesión vigente que el navegador ya tenía, y responde el mensaje único.

**Archivo.** `lib/sesion/vigente.ts`, rama de rechazo de `entrar`.

**Regla que se rompe.** El escenario nuevo de la especificación dice «y se rechazan», no «y el
servicio no contesta»; y contradice el límite del requisito «Sesión vigente» («cerrarla por una
falla pasajera sacaría a todas las personas a la vez»). G6 paso 4: la corrección va más allá del
hallazgo.

**Escenario de falla.** Persona con sesión vigente; el servicio devuelve 503 a
`/token?grant_type=password`; se envía el formulario de entrada → su sesión anterior queda cortada y
ve «El correo o la contraseña no son correctos».

**Corrección mínima.** Cortar solo cuando el servicio rechazó las credenciales (estado 4xx, o `!pase`
sin error); ante un error reintentable, no cortar. Caso negativo nuevo.

## MEDIO 4 · La validación del modelo del aviso dejó de vigilar la lectura, y nada más la vigila

**Qué está mal.** La fila 12 filtra `and not p.polpermissive`, y la fila 13 usa `priv_sin_leer`, que
quita `SELECT` **y** quita el rol `anon` del universo. Efecto conjunto: ni una política permisiva de
más ni un `grant select` a `anon` se detectan. La comprobación de estructura tampoco mira privilegios
de lectura ni políticas permisivas.

**Archivo.** `supabase/validaciones/20261125170000_aviso_modelo.sql` (CTE `pol`, CTE `priv_sin_leer`,
filas 12 y 13); el antiguo N16 de `tests/base/prueba-validacion-aviso-modelo.py` perdió su único
detector.

**Regla que se rompe.** `CLAUDE.md` §5 (la validación comprueba que el objeto está hecho como dice la
spec) y G6 paso 4: según el propio `LECTURA_DE_HU_02_1` del test, HU-02.1 concede `select` a
`authenticated`, no a `anon`.

**Escenario de falla (ejecutado).** En una transacción deshecha, con
`grant select on public.aviso_inicio, public.cliente to anon;` y
`create policy fuga on public.aviso_inicio for select to anon using (true);`, la validación devuelve
sus 14 filas **todas en OK**. Antes del cambio, las filas 12 y 13 habrían dado FALLA.

**Corrección mínima.** Mantener `anon` en la fila 13 con `SELECT` incluido, y vigilar aparte las
políticas permisivas con esperado `(ninguna)` hasta HU-02.1 —el fichero de validación no es una
migración: se actualiza cuando llegue—.

## MEDIO 5 · Texto viejo que las correcciones invalidaron: la integración sigue diciendo «solo en local» en tres sitios

- `openspec/specs/acceso/spec.md` — «`tests/integration/sesion.test.ts`, que corre solo en local». Es
  la fuente de verdad, y el README dice que ante diferencia manda la especificación.
- `tests/unit/sesion.test.ts` — «(solo en local)». El commit editó ese mismo archivo.
- `readme.md` — en el árbol de carpetas: «el código con la base local; solo en local».

**Regla que se rompe.** G6 paso 2: buscar en **todo** el repositorio las frases que describían lo de
antes. La ronda anterior ya había señalado esa frase en la sección de pruebas del README; se corrigió
esa y no las otras tres.

## MEDIO 6 · En el estado commiteado, el trabajo de la base puede quedar en verde sin haber corrido la prueba de integración

El paso añadido pone solo `CT_BASE_LOCAL: "1"`, y la suite es `describe.skipIf(!ACTIVA)`. Si esa
variable se borra o se renombra, la suite se salta entera y el trabajo sale en verde sin haber probado
nada: el verde falso que el hallazgo F quería cerrar. **El árbol de trabajo ya lo tapa** con
`CT_INTEGRACION_EXIGIDA` y el caso I7, pero estaba sin commitear.

## MEDIO 7 · La afirmación nueva del hallazgo H sobre la credencial del sistema no tiene caso que la pruebe

La especificación añade «la garantía vale frente a toda identidad con la que el sistema se conecta, la
credencial del sistema incluida». P11 solo demuestra lo contrario (que el dueño sí puede apagar el
disparador). Nada comprueba que `service_role` no pueda apagarlo: `supabase/comprobaciones/
estructura.sql` solo mira `authenticated` y `anon`, y N26–N28 cubren permisos de escritura, no la
propiedad de la tabla. **Comprobado:** hoy la afirmación es cierta en la base local (el dueño es
`postgres`, `service_role` no es miembro suyo, y el `disable trigger` responde `must be owner of
table aviso_inicio`), pero no está vigilada. **Corrección mínima:** un caso negativo con
`set local role service_role` intentando `disable trigger`.

## BAJO 8 · «Las dos capas leen el momento de entrada igual» no es exacto

Comparadas las dos lecturas con 20 formas de `amr`: coinciden en 19. Divergen en un `timestamp`
numérico con parte decimal nula, `1764000000.0` → el código lo acepta (`JSON.parse` da un entero y
`Number.isInteger` pasa), la base lo rechaza (`->>` da `'1764000000.0'` y la expresión regular
falla). Inalcanzable con pases del servicio y falla del lado seguro —gana la capa más estricta—, pero
la frase nueva de la especificación afirma más de lo que hay. **Corrección mínima:** acotar la frase
o alinear `segundosValidos`.

## BAJO 9 · Dos imprecisiones en la cabecera de la migración nueva

(a) «Las dos siguen siendo STABLE: leen la base y el pase de la petición, y la hora la toman del
inicio de la sentencia» no vale para `dentro_del_plazo`, que no lee nada ni mira ningún reloj —recibe
`ahora` como parámetro— y podría ser IMMUTABLE. (b) Se repite el `REVOKE` «para que la migración deje
el objeto completo y no dependa de la anterior», pero los `GRANT` de `es_mi_organizacion` no se
repiten y el bloque aborta si la anterior no corrió: depende de ella por diseño.

## BAJO 10 · El docstring de la prueba del aviso conserva la afirmación que el hallazgo H corrigió

`tests/base/prueba-aviso-modelo.py`: «nadie lo edita ni lo quita, tampoco el dueño de la tabla ni la
credencial del sistema», sin el límite. Mismo archivo y mismo commit que añadieron P11 y el límite en
la especificación y en la migración.

## BAJO 11 · Dos comprobaciones más débiles de lo que parecen

(a) El post-chequeo de `es_mi_organizacion` en la migración y la fila 4 de su validación solo buscan
el texto `<> count(*)` en `prosrc`: un cuerpo roto que contuviera esa cadena pasaría. Está declarado
en la cabecera de la validación y la prueba de comportamiento existe (N14, N15, P8 de
`prueba-sesion.py`; N30 de `prueba-usuario.py`), así que es una nota, no un defecto. (b) P11 afirma
con `count(*) = 0` que el borrado pasó; pasaría igual si la preparación no hubiera insertado nada
(lo cubre P10, justo encima, no P11).

## Lo que está bien (verificado, una línea cada uno)

- **Migración nueva:** idempotente —aplicada dos veces en una transacción deshecha, los dos bloques
  dieron sus mensajes de éxito—; aborta con mensaje propio si las funciones no existen; conserva
  volatilidad, privilegios del dueño, `search_path`, no-STRICT y la lista de ejecución (comprobado en
  `pg_proc`); y su post-chequeo de `dentro_del_plazo` la llama de verdad en los tres casos, incluido
  el que el hallazgo G abrió.
- **`prueba-validacion-vigencia-del-pase.py`:** 8 de 8; cada desvío marca su fila por la razón que
  dice.
- **Las cinco validaciones en verde**, y ninguna de las anteriores quedó con una afirmación vieja
  sobre estas dos funciones.
- **Casos nuevos del código:** N30, N31, N32, N33, N34, N35, N36, N37, P17 y P18 habrían fallado
  contra el código viejo (comprobados uno por uno contra el diff); P17 y P8 son controles reales de
  que la regla nueva no se volvió demasiado estricta.
- **Cifras:** cuadran todas las comprobadas contando — 139 escenarios (55+42+42) y 32 requisitos; 5
  validaciones y 71 filas (20+26+7+14+4); y los casos de cada prueba. El hallazgo J queda cerrado.
- **Hallazgo D:** `esCifrada` resuelve el caso de las mayúsculas, y es cierto que una dirección
  pública ilegible rechaza toda entrada y todo cierre.
- **`entrar`:** no quedó ningún camino en que la sesión recién creada sobreviva sin usuario
  comprobado.
- **Trazabilidad de los identificadores de caso:** sin repetidos, y los renombres (P12 → N30, el N16
  de la validación del aviso) están escritos en la respuesta y en D-105.
- **`verificar-referencias.py`:** 2.742 referencias, 0 rotas.

## Sospechas (no demostradas)

- `opcionesDeCookie` con una dirección pública mal configurada que *sí* parsea como URL con un esquema
  inventado (`"ct.example.com:3000"` se lee como esquema `ct.example.com:`) devuelve `secure: false`,
  no el «lado seguro» que anuncia el comentario. Con esa configuración no se puede entrar ni cerrar,
  y no es regresión: el `startsWith` anterior hacía lo mismo.
- `prueba-aviso-modelo.py`, `prueba-sesion.py` y `prueba-usuario.py` no se ejecutaron en esta revisión
  (escriben en la base y el encargo pedía solo lectura); sus cifras se contaron en el texto. Sí se
  ejecutaron al cerrar la ronda.

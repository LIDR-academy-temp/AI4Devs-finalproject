# Revisión adversarial

- Fecha: 2026-11-25 12:50 EST
- Perfil: `openai` · protocolo `openai-responses`
- Modelo pedido: `gpt-5.6-sol` · modelo que respondió: `gpt-5.6-sol`
- Archivo: `/private/tmp/claude-501/-Users-JaimeGuillermo-1-Library-Mobile-Documents-com-apple-CloudDocs-Documents-RespaldoCarson-CAMASA-Claude-TrabajoJC1/2eb0e2ac-6d27-45a4-9a94-a65f4d75180e/scratchpad/encargo-tramo4-ronda1.md` · huella `e2a3a813065c` · 5053 caracteres
- Archivo: `/private/tmp/claude-501/-Users-JaimeGuillermo-1-Library-Mobile-Documents-com-apple-CloudDocs-Documents-RespaldoCarson-CAMASA-Claude-TrabajoJC1/2eb0e2ac-6d27-45a4-9a94-a65f4d75180e/scratchpad/diff-tramo4-4b5cbe1.diff` · huella `d865bbe8bc84` · 173306 caracteres
- Archivo: `openspec/specs/acceso/spec.md` · huella `65410c0bd3e0` · 41249 caracteres
- Archivo: `openspec/specs/aviso-inicio/spec.md` · huella `f9028eebe857` · 28047 caracteres
- Naturaleza: opinión de un modelo, no veredicto. No bloquea nada.

---

## Hallazgos

### 1. ALTO — Un error de base después de autenticar deja una sesión nueva sin haber comprobado que el usuario exista y esté activo

- **Qué está mal:** `entrar` crea primero la sesión y, si falla `leerMiUsuario`, propaga el error sin retirar la sesión recién creada.
- **Evidencia:**
  - `lib/sesion/vigente.ts`, `entrar`, líneas 120-127: llama a `signInWithPassword`, obtiene el pase y después llama a `comprobarPase`.
  - `lib/datos/separacion.ts`, `leerMiUsuario`: ante un error ejecuta `throw new Error("No se pudo comprobar la sesión...")`.
  - `openspec/specs/acceso/spec.md`, requisito **«Sesión vigente»**: declara que un error de base no cierra la sesión.
  - El mismo requisito **«Entrar con cuenta activa»** exige que solo quede con sesión quien tenga usuario activo.
- **Regla que se rompe y fallo concreto:** si las credenciales son válidas pero la lectura de `usuario` falla, `signInWithPassword` ya escribió las cookies; la operación termina con error, pero el navegador conserva una sesión cuya cuenta podría no tener usuario o estar desactivada. La excepción declarada para sesiones ya existentes contradice la garantía de entrada cuando se aplica también durante el inicio.
- **Corrección necesaria:** distinguir el fallo durante `entrar` del fallo durante una petición ya autenticada y retirar la sesión recién creada si no se pudo verificar el usuario.

### 2. ALTO — El código afirma que una sesión quedó cerrada aunque el servicio haya rechazado el cierre

- **Qué está mal:** tanto el cierre explícito como el corte automático ignoran completamente el campo `error` de `signOut`.
- **Evidencia:**
  - `lib/sesion/vigente.ts`, interfaz `ClienteDeSesion`: `signOut(...)` devuelve `PromiseLike<ConError>`, por lo que el error forma parte explícita del contrato.
  - `lib/sesion/vigente.ts`, `cortar`, líneas 55-59: `await cliente.auth.signOut(...)` y devuelve `null` sin inspeccionar el resultado.
  - `lib/sesion/vigente.ts`, `cerrar`, líneas 130-137: ignora el resultado y siempre devuelve `{ estado: "cerrada" }`.
  - `tests/unit/sesion.test.ts`, `clienteFalso.signOut`: siempre devuelve `{ error: null }`; no existe caso de error.
- **Regla que se rompe y fallo concreto:** los requisitos **«Cerrar la sesión»** y **«Sesión vigente»** dicen que el pase deja de servir inmediatamente y que una sesión inválida queda cerrada. Si el servicio devuelve `{ error: ... }` sin lanzar una excepción, el código responde “cerrada” o trata la petición como anónima, pero el pase anterior puede seguir abierto y reutilizarse.
- **Corrección necesaria:** manejar y probar tanto el error devuelto como el rechazo de la promesa; no declarar el cierre exitoso mientras no esté garantizada la invalidación exigida.

### 3. ALTO — Una entrada fallida puede conservar una sesión anterior en el navegador

- **Qué está mal:** ante credenciales incorrectas, `entrar` retorna el mensaje de rechazo sin cerrar una sesión que el navegador ya tuviera.
- **Evidencia:**
  - `lib/sesion/vigente.ts`, comentario de `entrar`: afirma que ante credenciales incorrectas el navegador queda “sin sesión”.
  - `lib/sesion/vigente.ts`, líneas 121-124: `if (error || !pase) return NO_ENTRA;`, sin llamar a `cortar`.
  - `tests/unit/sesion.test.ts`, `clienteFalso.signInWithPassword`: cuando las credenciales fallan devuelve el error, pero no pone `guardado` en `null`.
  - `tests/unit/sesion.test.ts`, caso `N25`: comienza sin una sesión previa, por lo que no detecta este defecto.
- **Regla que se rompe y fallo concreto:** un navegador con sesión de A intenta entrar como B con contraseña incorrecta; recibe el mensaje “El correo o la contraseña no son correctos”, pero la cookie de A sigue activa y la petición siguiente vuelve a operar como A. La implementación contradice su propia garantía de “navegador sin sesión”.
- **Corrección necesaria:** definir y aplicar explícitamente qué ocurre con una sesión previa ante una entrada rechazada, y cubrir el caso con una sesión inicialmente activa.

### 4. ALTO — Una entrada `amr` de contraseña sin momento válido se ignora en vez de hacer vencer la sesión

- **Qué está mal:** con varias entradas de contraseña, el código descarta silenciosamente las que tienen un `timestamp` inválido y acepta la más antigua de las restantes.
- **Evidencia:**
  - `lib/sesion/reglas.ts`, `momentoDeEntrada`, líneas 38-48: si `segundosValidos(timestamp)` devuelve `null`, el bucle continúa y puede devolver otro momento válido.
  - `tests/unit/sesion.test.ts`, caso `N4`: exige expresamente que “una entrada mal formada no tapa a una buena”.
  - `openspec/specs/acceso/spec.md`, requisito **«Sesión vigente»**: “Si el pase no trae ese momento, la condición no se cumple: ante la duda, la sesión vence. Si trae varios, vale el más antiguo”.
  - D-104 fundamenta la elección más estricta precisamente en que, ante la duda, la sesión vence.
- **Regla que se rompe y fallo concreto:** un pase trae una entrada de contraseña antigua con momento ausente o ilegible y otra reciente válida; no es posible saber cuál es realmente la más antigua, pero `momentoDeEntrada` usa la reciente y puede conceder vigencia. La prueba actual consolida el comportamiento contrario al criterio conservador.
- **Corrección necesaria:** una entrada identificada como `password` cuyo momento no sea válido debe impedir determinar la vigencia, no ser descartada como si no existiera.

### 5. ALTO — Una dirección HTTPS válida puede producir una cookie sin `Secure`

- **Qué está mal:** la marca de conexión cifrada se decide mediante una comparación textual sensible a mayúsculas, no mediante el protocolo de la URL.
- **Evidencia:**
  - `lib/sesion/reglas.ts`, `opcionesDeCookie`, última línea: `secure: direccionPublica.startsWith("https://")`.
  - En el mismo archivo, `origenDe` sí utiliza `new URL(direccion)`, que acepta y normaliza el esquema.
  - `tests/unit/sesion.test.ts`, casos `P8` y `P9`: solo prueban `https://` y `http://` en minúsculas.
- **Regla que se rompe y fallo concreto:** `HTTPS://ct.example.com` es una URL cifrada válida y pasa la comparación de origen mediante `URL`, pero `opcionesDeCookie` escribe `secure: false`. La cookie podría enviarse por HTTP al mismo host, incumpliendo el escenario **«marca de conexión cifrada en el sistema desplegado»**.
- **Corrección necesaria:** derivar la marca del protocolo normalizado de una URL válida y agregar casos de formas válidas equivalentes.

### 6. MEDIO — Un momento de entrada futuro amplía artificialmente la vigencia

- **Qué está mal:** la comprobación solo verifica el límite superior y nunca exige que la entrada haya ocurrido antes o en el instante actual.
- **Evidencia:**
  - `lib/sesion/reglas.ts`, `dentroDelPlazo`: retorna `desde + dias * 24 * HORA_MS >= hasta`, sin comprobar `desde <= hasta`.
  - `segundosValidos` permite cualquier entero no negativo dentro de su límite, incluidos momentos futuros.
  - `tests/unit/sesion.test.ts`, bloque `dentroDelPlazo`: no contiene ningún caso con entrada futura.
- **Regla que se rompe y fallo concreto:** un pase emitido por un servicio con reloj adelantado o con un cambio de formato puede decir que la entrada ocurrió mañana; la sesión será válida durante `sesion_dias` más ese adelanto. Esto contradice “no pasaron más de `sesion_dias` días desde que la persona entró” y el criterio de vencer ante datos dudosos.
- **Corrección necesaria:** rechazar momentos posteriores al reloj usado para evaluar la petición, con una política explícita si se desea tolerar desfase.

### 7. MEDIO — Los disparadores no hacen inmutable el aviso frente al dueño de la tabla, pese a que la documentación lo afirma

- **Qué está mal:** el dueño puede desactivar o eliminar los disparadores ordinarios y después editar o borrar los avisos.
- **Evidencia:**
  - `supabase/migrations/20261125170000_aviso_modelo.sql`, bloque 5: crea disparadores ordinarios `aviso_inicio_no_se_cambia` y `aviso_inicio_no_se_vacia`.
  - `supabase/validaciones/20261125170000_aviso_modelo.sql`, fila 10: exige que estén con `tgenabled = 'O'`, no protegidos frente a cambios del dueño.
  - `openspec/specs/aviso-inicio/spec.md`, nota **«Construido en HU-06.1»**: afirma que impiden editar, quitar o vaciar “también al dueño de la tabla”.
  - `tests/base/prueba-aviso-modelo.py`, `N22` a `N24`: prueba DML directo como dueño, pero nunca `ALTER TABLE ... DISABLE TRIGGER` seguido del cambio.
- **Regla que se rompe y fallo concreto:** el dueño ejecuta `ALTER TABLE public.aviso_inicio DISABLE TRIGGER aviso_inicio_no_se_cambia` y luego `DELETE` o `UPDATE`; el aviso cambia pese a la afirmación “por cualquier vía” y “también al dueño”.
- **Corrección necesaria:** o bien excluir formalmente al dueño/rol de migraciones de esa garantía, o impedir que una identidad dentro del límite de confianza pueda modificar el mecanismo antes del DML.

### 8. MEDIO — El único ensayo con el cliente oficial no es una puerta automática del pull request

- **Qué está mal:** la integración que comprueba cookies, renovación y cierre reales queda omitida en CI por diseño.
- **Evidencia:**
  - `tests/integration/sesion.test.ts`: `describe.skipIf(!ACTIVA)` y `ACTIVA = process.env.CT_BASE_LOCAL === "1"`.
  - `.github/workflows/ci.yml`: agrega las pruebas Python de base, pero no ejecuta la integración con `CT_BASE_LOCAL=1`.
  - `readme.md`, sección de pruebas: declara que `tests/integration/sesion.test.ts` corre “solo en local”.
  - Las pruebas unitarias usan `clienteFalso`, no `@supabase/ssr`.
- **Regla que se rompe y fallo concreto:** una modificación posterior puede romper cómo `createServerClient` escribe o elimina cookies mientras todas las pruebas unitarias y la CI siguen verdes; el defecto solo aparece si alguien recuerda ejecutar manualmente la suite local. Esto deja sin puerta automatizada el camino que la especificación cita como comprobación con el cliente oficial.
- **Corrección necesaria:** incorporar ese recorrido a una etapa automatizada con la base local, o disponer de una prueba automática equivalente que use el cliente oficial.

### 9. MEDIO — El README publica simultáneamente dos cantidades distintas de escenarios

- **Qué está mal:** la documentación dice que hay 134 escenarios y, en la misma oración, que hay 135 desde D-103.
- **Evidencia:**
  - `readme.md`, bloque de estado inicial: “con 32 requisitos y **134 escenarios** [...] (**135 escenarios desde D-103**, 25/11/2026)”.
- **Regla que se rompe y fallo concreto:** no existe una cifra verificable del alcance documental; cualquier control o revisión que compare el número declarado puede aceptar un escenario faltante o denunciar uno inexistente.
- **Corrección necesaria:** conservar una sola cifra actual y, si se necesita historia, separar claramente el conteo anterior del vigente.

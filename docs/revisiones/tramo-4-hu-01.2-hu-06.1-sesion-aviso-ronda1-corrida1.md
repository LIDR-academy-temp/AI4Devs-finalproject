# Revisión adversarial

- Fecha: 2026-11-25 12:49 EST
- Perfil: `openai` · protocolo `openai-responses`
- Modelo pedido: `gpt-5.6-sol` · modelo que respondió: `gpt-5.6-sol`
- Archivo: `/private/tmp/claude-501/-Users-JaimeGuillermo-1-Library-Mobile-Documents-com-apple-CloudDocs-Documents-RespaldoCarson-CAMASA-Claude-TrabajoJC1/2eb0e2ac-6d27-45a4-9a94-a65f4d75180e/scratchpad/encargo-tramo4-ronda1.md` · huella `e2a3a813065c` · 5053 caracteres
- Archivo: `/private/tmp/claude-501/-Users-JaimeGuillermo-1-Library-Mobile-Documents-com-apple-CloudDocs-Documents-RespaldoCarson-CAMASA-Claude-TrabajoJC1/2eb0e2ac-6d27-45a4-9a94-a65f4d75180e/scratchpad/diff-tramo4-4b5cbe1.diff` · huella `d865bbe8bc84` · 173306 caracteres
- Archivo: `openspec/specs/acceso/spec.md` · huella `65410c0bd3e0` · 41249 caracteres
- Archivo: `openspec/specs/aviso-inicio/spec.md` · huella `f9028eebe857` · 28047 caracteres
- Naturaleza: opinión de un modelo, no veredicto. No bloquea nada.

---

## Hallazgos

### 1. ALTO — El cierre se declara exitoso aunque el servicio haya rechazado o no haya podido ejecutar `signOut`

- **Qué está mal:** `cerrar()` y `cortar()` ignoran por completo el campo `error` de `signOut`, por lo que pueden dejar vigente el pase y la cookie mientras informan que la sesión quedó cerrada.
- **Evidencia:**
  - `lib/sesion/vigente.ts`, `cortar()`:
    ```ts
    await cliente.auth.signOut({ scope: "local" });
    return null;
    ```
  - `lib/sesion/vigente.ts`, `cerrar()`:
    ```ts
    await cliente.auth.signOut({ scope: "local" });
    return { estado: "cerrada" };
    ```
  - La propia interfaz reconoce que `signOut` puede devolver error:
    ```ts
    signOut(opciones: { scope: "local" }): PromiseLike<ConError>;
    ```
  - `tests/unit/sesion.test.ts`, cliente falso: `signOut` siempre devuelve `{ error: null }`; no existe caso de error.
- **Regla o escenario que se rompe:** `openspec/specs/acceso/spec.md`, requisito «Cerrar la sesión»: “Cerrada, el pase que tenía deja de servir de inmediato”; también «Sesión vigente»: “Si falla cualquiera, la sesión se cierra en el servicio”. Con un fallo HTTP o transitorio de cierre, la operación responde `{ estado: "cerrada" }`, pero la petición siguiente puede recuperar la misma sesión. Tras una desactivación, una reactivación posterior incluso podría hacer reutilizable la cookie que nunca se eliminó.
- **Corrección mínima:** comprobar el resultado de `signOut` y no devolver “cerrada” ni asumir el corte hasta garantizar la revocación y eliminación local; agregar pruebas para error devuelto y excepción de red.

### 2. ALTO — La única prueba del cliente oficial y de la persistencia real de cookies nunca se ejecuta en CI

- **Qué está mal:** todo el cableado real de `createServerClient`, escritura/borrado de cookies y cierre contra el servicio puede romperse sin hacer fallar el pull request.
- **Evidencia:**
  - `tests/integration/sesion.test.ts`:
    ```ts
    const ACTIVA = process.env.CT_BASE_LOCAL === "1";
    describe.skipIf(!ACTIVA)(...)
    ```
  - El encabezado del archivo declara:
    > “SOLO EN LOCAL” y “La integración continua no la corre”.
  - `.github/workflows/ci.yml` agrega únicamente las pruebas Python de base; no ejecuta:
    ```bash
    CT_BASE_LOCAL=1 pnpm vitest run tests/integration/sesion.test.ts
    ```
  - `tests/unit/sesion.test.ts` prueba `opcionesDeCookie` directamente y usa un cliente falso; no pasa por `crearCliente()` ni por `@supabase/ssr`.
- **Regla o escenario que se rompe:** escenarios «marcas de la cookie», «se vuelve a abrir dentro del plazo», «el pase anterior ya no sirve» y el requisito de consultar al servicio en cada petición. Por ejemplo, eliminar accidentalmente la llamada a `opcionesDeCookie` dentro de `crearCliente` dejaría CI verde aunque la cookie real saliera legible desde la página.
- **Corrección mínima:** ejecutar esta integración en el trabajo de CI que ya levanta la base local, o añadir una prueba obligatoria con el cliente oficial que compruebe al menos escritura, reutilización y eliminación de cookies.

### 3. MEDIO — Una entrada fallida no garantiza el navegador sin sesión si ya existía una sesión anterior

- **Qué está mal:** cuando `signInWithPassword` devuelve error o no devuelve pase, `entrar()` retorna el mensaje único sin cerrar una sesión que el cliente ya tuviera.
- **Evidencia:**
  - `lib/sesion/vigente.ts`, comentario de `entrar()`:
    > “Ante credenciales incorrectas, correo sin cuenta, cuenta desactivada o cuenta sin usuario, el mismo mensaje, y el navegador sin sesión.”
  - Implementación:
    ```ts
    const { data, error } = await cliente.auth.signInWithPassword(...);
    const pase = data?.session?.access_token;
    if (error || !pase) return NO_ENTRA;
    ```
  - `tests/unit/sesion.test.ts`, caso N25, y `tests/integration/sesion.test.ts`, I3, usan navegadores/clientes nuevos sin sesión previa; no cubren este estado.
- **Regla o escenario que se rompe:** la garantía declarada por `entrar()` de dejar el navegador sin sesión ante credenciales incorrectas. Un navegador autenticado como A intenta entrar con contraseña incorrecta para B, recibe el rechazo, pero continúa autenticado como A, creando confusión de identidad en la siguiente operación.
- **Corrección mínima:** definir y aplicar explícitamente el comportamiento con sesión previa —cerrarla ante una entrada fallida o rechazar la operación sin presentar el navegador como desconectado— y probarlo con una sesión preexistente.

### 4. MEDIO — La marca `Secure` se decide con una comparación textual que acepta una URL HTTPS válida pero escribe una cookie no segura

- **Qué está mal:** `opcionesDeCookie()` usa `startsWith("https://")`, aunque el resto del módulo considera válida la dirección mediante `new URL`; los esquemas URL no distinguen mayúsculas.
- **Evidencia:**
  - `lib/sesion/reglas.ts`, `opcionesDeCookie()`:
    ```ts
    secure: direccionPublica.startsWith("https://")
    ```
  - En el mismo archivo, `origenDe()` valida con:
    ```ts
    const url = new URL(direccion);
    ```
  - No existe prueba con una forma válida como `HTTPS://ct.example.com`.
- **Regla o escenario que se rompe:** `openspec/specs/acceso/spec.md`, escenario «marca de conexión cifrada en el sistema desplegado». Con `direccionPublica = "HTTPS://ct.example.com"`, la comprobación de origen la acepta, pero la cookie se escribe con `secure: false` y puede viajar por una conexión no cifrada.
- **Corrección mínima:** derivar la marca del protocolo de una URL ya validada y fallar de forma segura ante configuración inválida, sin rebajar un `secure: true` pedido por el cliente oficial.

### 5. MEDIO — La validación del modelo del aviso está diseñada para fallar cuando llegue el siguiente tramo ya declarado

- **Qué está mal:** la validación exige que no haya políticas permisivas ni permisos de lectura sobre `cliente`, `asignacion` y `aviso_inicio`, aunque HU-02.1 está declarado como el tramo que debe añadir precisamente esas políticas y permisos.
- **Evidencia:**
  - `openspec/specs/aviso-inicio/spec.md`, nota «Construido en HU-06.1»:
    > “las reglas por rol [...] van en HU-02.1”.
  - `supabase/validaciones/20261125170000_aviso_modelo.sql`, fila 12 agrega **todas** las políticas:
    ```sql
    from pol
    ```
    y espera únicamente las tres restrictivas de separación.
  - La fila 13 exige:
    ```text
    authenticated public.asignacion: ninguno
    authenticated public.aviso_inicio: ninguno
    authenticated public.cliente: ninguno
    ```
  - En este mismo diff, las validaciones anteriores de `organizacion` y `usuario` tuvieron que cambiarse para mirar solo políticas restrictivas cuando aparecieron las permisivas nuevas.
- **Regla o escenario que se rompe:** el siguiente HU-02.1 no podrá agregar una política correcta de lectura por rol ni conceder `SELECT` sin hacer fallar `correr-validaciones.py`. El fallo visible será una CI roja por las filas 12 y 13, aunque la nueva política cumpla la especificación.
- **Corrección mínima:** hacer que esta validación vigile los invariantes propios de HU-06.1 —políticas restrictivas, ausencia de escritura y protección del aviso— sin prohibir las extensiones de lectura que la especificación ya asigna a HU-02.1.

## Sospechas separadas

- **Marca temporal futura en `amr`:** `momentoDeEntrada()` acepta cualquier entero no negativo y `dentroDelPlazo()` no comprueba `entrada <= ahora`. Un pase firmado con `timestamp` futuro prolongaría la vigencia. No lo clasifico como hallazgo porque el material no demuestra que el servicio pueda emitir ese valor, pero falta un caso de rechazo coherente con la regla de “ante la duda, la sesión vence”.
- **Inmutabilidad frente al dueño técnico:** los disparadores bloquean DML normal del dueño, pero el dueño de la tabla puede desactivar o quitar los disparadores antes de modificar el aviso. La especificación excluye al dueño técnico del sistema en servicio, por lo que no queda claro si “por cualquier vía” pretende cubrir también esa capacidad administrativa.

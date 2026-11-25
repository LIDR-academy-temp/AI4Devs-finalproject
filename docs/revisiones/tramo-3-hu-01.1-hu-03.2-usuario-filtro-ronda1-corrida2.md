# Revisión adversarial

- Fecha: 2026-11-25 03:28 EST
- Perfil: `openai` · protocolo `openai-responses`
- Modelo pedido: `gpt-5.6-sol` · modelo que respondió: `gpt-5.6-sol`
- Archivo: `<espacio-temporal>/encargo-tramo3-ronda1.md` · huella `b8e6769cc781` · 3836 caracteres
- Archivo: `<espacio-temporal>/diff-tramo3-3d32d98.diff` · huella `5f0b7cb68ac5` · 96710 caracteres
- Archivo: `openspec/specs/acceso/spec.md` · huella `b9b6b0b66260` · 37989 caracteres
- Archivo: `supabase/migrations/20261123170000_organizacion.sql` · huella `6c95ad0b1d7b` · 12043 caracteres
- Naturaleza: opinión de un modelo, no veredicto. No bloquea nada.

---

## Hallazgos

### 1. ALTO — La corrección excepcional de correo que exige D-103 no puede completarse con la credencial indicada

- **Qué está mal:** La credencial del sistema puede cambiar `auth.users.email`, pero no puede actualizar después `public.usuario.correo`, aunque la especificación exige que la misma corrección reescriba ambos.
- **Evidencia:**
  - `openspec/specs/acceso/spec.md`, requisito **«Un correo, una cuenta, una organización»**:  
    > “las personas, la credencial del sistema y `anon` no pueden leer las cuentas del servicio”  
    y después:  
    > “quien la hace reescribe también el usuario”.
  - `supabase/migrations/20261125033000_usuario.sql`, bloque 3: `comprobar_correo_de_cuenta()` es `SECURITY INVOKER`, consulta `auth.users` y rechaza al escritor sin lectura.
  - `tests/base/prueba-usuario.py`, caso **N5**: demuestra expresamente que `service_role`, aun recibiendo permiso para escribir `usuario`, es rechazado porque no puede leer las cuentas.
  - El caso **P3** solo cambia el correo de una cuenta sin usuario persistente; no prueba la reescritura coordinada.
- **Regla que se rompe y fallo visible:** Se rompe D-87/D-103. Un administrador corrige el correo mediante la credencial del sistema; `auth.users.email` cambia, pero el intento de actualizar `usuario.correo` recibe “no puede leer las cuentas”. Quedan ambos correos desincronizados y el reporte puede enviarse a la dirección anterior.
- **Corrección mínima:** Definir y probar un camino autorizado que actualice también `usuario`, sin desactivar la comprobación para escritores ordinarios.

---

### 2. ALTO — El disparador de D-103 no impide cambiar el correo; solo detecta una forma concreta de solicitarlo

- **Qué está mal:** El disparador permite cualquier cambio directo de `auth.users.email` mientras `NEW.email_change` quede vacío o no cambie.
- **Evidencia:**
  - `supabase/migrations/20261125033000_usuario.sql`, función `public.impedir_cambio_de_correo_propio()`:
    ```sql
    IF coalesce(NEW.email_change, '') <> ''
       AND NEW.email_change IS DISTINCT FROM OLD.email_change THEN
    ```
    No compara nunca `OLD.email` con `NEW.email` ni identifica quién originó el cambio.
  - El comentario del bloque 4 supone:
    > “la persona [usa] email_change; la credencial del sistema cambia email directamente”.
  - `tests/base/prueba-usuario.py`, **N9**, solo cubre una solicitud nueva que usa `email_change`.
- **Regla que se rompe y fallo visible:** Se rompe **«Nadie cambia por sí solo el correo de su cuenta»**. Por ejemplo, un cambio que llegue como `NEW.email = correo_nuevo` y `NEW.email_change = ''` pasa el disparador. También queda sin tratar una solicitud pendiente anterior a instalar la migración: la migración no rechaza ni limpia estados `email_change` ya existentes.
- **Corrección mínima:** Hacer que la regla controle el cambio real de `email` y el actor autorizado, y agregar un caso con cambio pendiente previo a la migración.

---

### 3. ALTO — La prueba de “un solo lugar” se puede evadir dejando la consulta directa en verde

- **Qué está mal:** El detector solo reconoce `.from(` seguido inmediatamente de un literal de texto y únicamente recorre `app/` y `lib/`.
- **Evidencia:**
  - `lib/datos/separacion.ts`, `usosDirectos()`:
    ```ts
    /(?<!Array)\s*\.\s*from\s*\(\s*["'`]/
    ```
  - `tests/unit/separacion.test.ts`, caso **P5**: solo recorre las carpetas `app` y `lib`.
  - Caso **N9**: únicamente controla llamadas con literales:
    ```ts
    supabase.from("usuario")
    ```
- **Regla que se rompe y fallo visible:** Se rompe **«filtrar en toda consulta del código, en un solo lugar»**. Estas consultas directas no son detectadas:
  ```ts
  const tabla = "usuario";
  supabase.from(tabla).select();

  supabase["from"]("usuario").select();
  ```
  Tampoco se detectaría una consulta situada en `src/`, `pages/`, un archivo raíz o mediante una RPC que lea tablas. La CI queda verde aunque la consulta omita el filtro organizativo.
- **Corrección mínima:** Sustituir la búsqueda textual parcial por una comprobación estructural o, como mínimo, cubrir todas las formas y ubicaciones admitidas para código ejecutable.

---

### 4. ALTO — La nueva validación “1 a 1” no tiene ninguna prueba negativa

- **Qué está mal:** Se comprueba que la validación da verde sobre la estructura correcta, pero no que cada fila detecte la desviación que afirma detectar.
- **Evidencia:**
  - `supabase/validaciones/20261125033000_usuario.sql` declara:
    > “Una fila por comprobación”  
    y contiene 24 comprobaciones.
  - El diff completo no agrega un equivalente a `tests/base/prueba-validacion-organizacion.py` para `usuario`.
  - `.github/workflows/ci.yml` agrega únicamente:
    ```yaml
    run: python3 tests/base/prueba-usuario.py
    ```
    No agrega una prueba de mutaciones de la validación de `usuario`.
  - `encargo-tramo3-ronda1.md`, punto 5:
    > “Cada pieza debe tener un caso que pasa y uno que se rechaza.”
- **Regla que se rompe y fallo visible:** Una fila de la validación podría quedar escrita para aceptar una estructura incorrecta o incluso devolver siempre `OK`; al ejecutarse únicamente contra la migración correcta, la CI seguiría pasando. No está demostrado el carácter “1 a 1”.
- **Corrección mínima:** Agregar casos que alteren deliberadamente cada propiedad validada y comprueben que falla la fila correspondiente.

---

### 5. MEDIO — No se prueba el instante exacto de vencimiento exigido por la especificación

- **Qué está mal:** Las pruebas solo usan un minuto antes y un minuto después; una regresión de `>=` a `>` pasaría toda la batería.
- **Evidencia:**
  - `openspec/specs/acceso/spec.md`, escenario **«en el instante exacto del plazo»**:
    > “exactamente 30 días después … se acepta”.
  - `supabase/migrations/20261125033000_usuario.sql`, `es_mi_organizacion()` usa correctamente:
    ```sql
    ... >= statement_timestamp()
    ```
  - `tests/base/prueba-usuario.py`:
    - **N17:** 30 días y un minuto.
    - **P5:** 30 días menos un minuto.
    - No existe caso en el borde exacto.
- **Regla que se rompe y fallo visible:** Si el operador cambia a `>`, las pruebas continúan verdes, pero una petición exactamente en el límite se rechaza contra el escenario aprobado.
- **Corrección mínima:** Añadir un caso controlado en SQL donde el vencimiento sea exactamente el `statement_timestamp()` de la consulta.

---

### 6. MEDIO — La elección del momento de entrada con varios valores `password` no está especificada ni probada

- **Qué está mal:** La función elige silenciosamente el menor timestamp de todos los elementos `password`, sin que la especificación determine esa regla.
- **Evidencia:**
  - `supabase/migrations/20261125033000_usuario.sql`, `es_mi_organizacion()`:
    ```sql
    SELECT min((a ->> 'timestamp')::bigint)
    ```
  - `tests/base/prueba-usuario.py`, **N14–N16**, cubre ausencia, otro método y forma no-array, pero ningún `amr` con varios valores `password`.
  - `encargo-tramo3-ronda1.md`, punto 1, pide revisar expresamente:
    > “con varios valores”.
- **Regla que se rompe y fallo visible:** Ante dos entradas `password`, una antigua y otra reciente, se usa la antigua y una sesión potencialmente vigente aparece vencida. Si debía usarse otro valor, no hay escenario que lo determine ni prueba que detecte el error.
- **Corrección mínima:** Decidir cuál entrada representa el inicio de la sesión y probar combinaciones de valores antiguos, recientes y mal formados.

---

### 7. MEDIO — Un UUID de organización válido en mayúsculas puede hacer que un dato propio responda como inexistente

- **Qué está mal:** La entrada acepta UUID en mayúsculas, pero la segunda defensa compara cadenas de forma sensible a mayúsculas.
- **Evidencia:**
  - `lib/datos/separacion.ts`:
    ```ts
    const IDENTIFICADOR = /^[...]$/i;
    ```
    El modificador `i` acepta mayúsculas.
  - En `buscarPorId()`:
    ```ts
    fila[columnaDeOrganizacion(tabla)] !== identidad.organizacionId
    ```
  - `tests/unit/separacion.test.ts` solo usa identificadores en minúsculas.
- **Regla que se rompe y fallo visible:** PostgreSQL devuelve normalmente los UUID en forma canónica minúscula. Si `identidad.organizacionId` contiene el mismo UUID en mayúsculas, el filtro de la base encuentra la fila, pero la comparación posterior la convierte en `NO_EXISTE`. Se rompe el escenario **«dato propio»**.
- **Corrección mínima:** Normalizar ambos identificadores antes de comparar o comparar como UUID, y agregar el caso con distinta capitalización.

---

### 8. MEDIO — La documentación de estado está fechada antes de cambios que afirma ya construidos

- **Qué está mal:** El README se presenta como estado del 23/11, pero incluye como construidos cambios fechados el 25/11.
- **Evidencia:**
  - `readme.md`, encabezado:
    > “Estado al lunes 23/11/2026.”
  - En el mismo bloque:
    > “HU-01.1, tramo 3” y “HU-03.2, tramo 3”.
  - `openspec/specs/acceso/spec.md` y `prompts.md` fechan ambos trabajos el **25/11/2026**.
- **Regla que se rompe y fallo visible:** El lector no puede interpretar el bloque como una fotografía temporal fiable: al 23/11 todavía no podían estar construidos los elementos del 25/11.
- **Corrección mínima:** Corregir la fecha de estado o separar explícitamente el estado histórico de las adiciones posteriores.

---

### 9. MEDIO — `api_local.py` promete mensajes propios, pero deja escapar fallos sin traducir

- **Qué está mal:** La ayuda afirma que todos los errores se redactan localmente, aunque `api()` solo captura respuestas HTTP de error.
- **Evidencia:**
  - `scripts/base/api_local.py`, cabecera:
    > “Todo mensaje de error lo redactamos nosotros”.
  - Función `api()`:
    ```python
    except urllib.error.HTTPError as e:
    ```
    No captura `URLError`, fallos de conexión, timeout, respuesta JSON inválida ni errores al decodificarla.
- **Regla que se rompe y fallo visible:** Si la API local no escucha o devuelve contenido inválido, la prueba termina con un traceback de `urllib`, timeout o `JSONDecodeError`, en lugar del mensaje propio y la orientación prometidos.
- **Corrección mínima:** Capturar y traducir los fallos de transporte y de decodificación que la propia ayuda declara controlados.

## Sospecha separada

- **Posible recursión dependiente del propietario:** `public.es_mi_organizacion()` es `SECURITY DEFINER`, consulta `public.usuario`, y esa tabla tiene RLS forzada cuya política vuelve a llamar a `es_mi_organizacion()`. Esto solo evita recursión si el propietario efectivo puede omitir RLS, por ejemplo mediante `BYPASSRLS`. Ni `20261125033000_usuario.sql` ni su validación comprueban el propietario o ese atributo. No lo clasifico como hallazgo porque el material no muestra con qué rol exacto se ejecutarán las migraciones en todos los entornos; si no tiene `BYPASSRLS`, la llamada podría terminar en recursión de políticas en lugar de responder sí o no.

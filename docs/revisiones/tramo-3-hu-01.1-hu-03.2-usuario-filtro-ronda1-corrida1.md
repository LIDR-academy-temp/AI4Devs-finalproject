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

### 1. ALTO — La corrección excepcional de D-103 no puede completarse con la credencial del sistema

**Qué está mal:** el disparador comprueba `auth.users` en todo `UPDATE` de `usuario`, pero la propia especificación y N5 confirman que `service_role` no puede leer esa tabla, por lo que no puede reescribir `usuario.correo` después de corregir la cuenta.

**Evidencia:**

- `supabase/migrations/20261125033000_usuario.sql`, bloque 3:
  - `BEFORE INSERT OR UPDATE ON public.usuario`
  - `SELECT u.email ... FROM auth.users`
  - ante falta de permisos: `RAISE EXCEPTION ... no puede leer las cuentas`.
- `openspec/specs/acceso/spec.md`, requisito **«Un correo, una cuenta, una organización»**:
  - “las personas, **la credencial del sistema** y `anon` no pueden leer las cuentas”.
  - “La credencial del sistema sí puede cambiar el correo [...] y quien la hace **reescribe también el usuario**”.
- `tests/base/prueba-usuario.py`, N5 demuestra precisamente que `service_role`, incluso con permiso para escribir `usuario`, es rechazado por no poder leer `auth.users`.
- El supuesto control P3 cambia la cuenta `id_3`, que fue creada expresamente **sin usuario**, y no intenta actualizar `public.usuario`.

**Regla que se rompe y fallo observable:** D-103/D-87 exige que el administrador técnico corrija la cuenta y reescriba el usuario. El cambio de `auth.users.email` pasa, pero el posterior `UPDATE public.usuario SET correo=...` con `service_role` falla; `usuario.correo` queda viejo y los reportes pueden seguir yendo al correo anterior. El P3 queda verde aunque la corrección completa no funcione.

**Corrección mínima:** probar y habilitar el flujo completo cuenta + usuario con la credencial realmente prevista, no solo el primer cambio en una cuenta sin usuario.

---

### 2. ALTO — La prueba de “un solo lugar” se puede eludir dejando CI en verde

**Qué está mal:** el detector solo reconoce `.from(` cuando recibe inmediatamente un literal, por lo que consultas directas con una variable, acceso indexado u otra API no son detectadas.

**Evidencia:**

- `lib/datos/separacion.ts`, `usosDirectos()`:
  ```ts
  /(?<!Array)\s*\.\s*from\s*\(\s*["'`]/
  ```
- `tests/unit/separacion.test.ts`, P5 afirma que detecta cualquier consulta fuera del módulo, pero N9 solo prueba literales:
  ```ts
  supabase.from("usuario")
  db.from ( 'aviso_inicio' )
  ```
- No se prueban formas equivalentes como:
  ```ts
  const tabla = "usuario";
  supabase.from(tabla);
  supabase["from"]("usuario");
  fetch("/rest/v1/usuario");
  cliente.rpc("funcion_que_lee_usuario");
  ```

Además, el detector analiza texto sin eliminar comentarios o cadenas, por lo que `// supabase.from("usuario")` produce un falso positivo.

**Regla que se rompe y fallo observable:** el requisito **«Separación por organización en el código»** y la afirmación documental de que la prueba “falla si [...] consulta una tabla por fuera de ese módulo”. Un archivo de `app/` puede ejecutar `supabase.from(TABLA)` sin filtro y P5 sigue pasando; la segunda capa desaparece silenciosamente, dependiendo únicamente de RLS.

**Corrección mínima:** aplicar una comprobación estructural sobre AST/importaciones o encapsular el cliente para impedir su uso directo; debe cubrir argumentos dinámicos y todas las APIs de acceso admitidas.

---

### 3. ALTO — D-103 depende de un detalle interno de la autenticación que H-4 no comprobará

**Qué está mal:** el disparador no impide cambios en `email`; solo rechaza transiciones de `email_change`, pero la comprobación prevista para el servicio gestionado verifica únicamente que se pueda crear el disparador.

**Evidencia:**

- `supabase/migrations/20261125033000_usuario.sql`, bloque 4:
  ```sql
  IF coalesce(NEW.email_change, '') <> ''
     AND NEW.email_change IS DISTINCT FROM OLD.email_change THEN
  ```
  No existe comprobación de `NEW.email IS DISTINCT FROM OLD.email` ni de quién origina la operación.
- Comentario del mismo bloque:
  - “El servicio anota en `email_change` el correo pedido por la persona”.
- `openspec/specs/acceso/spec.md`, D-103:
  - “Que la plataforma deje **crear el disparador** en el servicio gestionado se comprueba en H-4”.
- `docs/trazabilidad/01-Discovery/discovery-controlador-tiempo.md`, D-103:
  - la comprobación pendiente también se limita a que la plataforma permita crear el disparador.

**Regla que se rompe y fallo observable:** si la versión o configuración gestionada representa el cambio personal actualizando `email` directamente o usando otro campo, el disparador se instala y H-4 pasa, pero la persona sí cambia su correo. `usuario.correo` queda desincronizado y D-103 falla en producción.

**Corrección mínima:** H-4 debe repetir al menos la solicitud personal rechazada y el cambio administrativo permitido, verificando el estado final de ambas columnas y del usuario, no solo la creación del objeto SQL.

---

### 4. MEDIO — La duración en días depende de la zona horaria de la sesión SQL

**Qué está mal:** se suma un intervalo simbólico de días a un `timestamptz` sin fijar la zona horaria, por lo que un día puede durar 23 o 25 horas al cruzar un cambio de horario estacional.

**Evidencia:**

- `supabase/migrations/20261125033000_usuario.sql`, cuerpo de `es_mi_organizacion`:
  ```sql
  to_timestamp(...) + make_interval(days => o.sesion_dias)
      >= statement_timestamp()
  ```
- La función solo fija:
  ```sql
  SET search_path = ''
  ```
  No fija `TimeZone`.
- `tests/base/prueba-usuario.py` crea ambas organizaciones con `America/Panama`, una zona sin cambios estacionales.
- `openspec/specs/acceso/spec.md`, escenarios **«el plazo es un parámetro»** y **«en el instante exacto del plazo»**, exige que con un día se rechace a las 25 horas.

**Regla que se rompe y fallo observable:** con una zona de sesión que cruce el cambio otoñal, `entrada + interval '1 day'` puede vencer 25 horas después; una petición hecha tras más de 24 horas sigue siendo aceptada. En primavera puede vencer a las 23 horas. El comportamiento de autorización varía según una configuración que el material no fija.

**Corrección mínima:** calcular el plazo como duración absoluta o fijar explícitamente una zona sin cambios estacionales dentro de la función, y probar una zona con DST.

---

### 5. MEDIO — El escenario del borde exacto no está probado

**Qué está mal:** la especificación exige aceptación exactamente en el plazo, pero las pruebas solo usan un minuto antes y un minuto después.

**Evidencia:**

- `openspec/specs/acceso/spec.md`, escenario **«en el instante exacto del plazo»**:
  - exactamente 30 días: se acepta;
  - un segundo después: se rechaza.
- `tests/base/prueba-usuario.py`:
  - N17: `30 * DIA + 60`;
  - P5: `30 * DIA - 60`.
- No existe caso a `30 * DIA` ni al siguiente segundo.

**Regla que se rompe y fallo observable:** cambiar accidentalmente `>=` por `>` dejaría toda la batería verde, aunque el instante exacto pasaría de aceptado a rechazado.

**Corrección mínima:** añadir una prueba controlada que diferencie expresamente igualdad y posterioridad inmediata.

---

### 6. MEDIO — No está definido ni probado qué hacer con varios registros `password` en `amr`

**Qué está mal:** el código elige silenciosamente el menor timestamp cuando hay varios métodos `password`, pero ninguna regla ni prueba establece que deba usarse el más antiguo.

**Evidencia:**

- `supabase/migrations/20261125033000_usuario.sql`, `es_mi_organizacion`:
  ```sql
  SELECT min((a ->> 'timestamp')::bigint)
  ...
  WHERE a ->> 'method' = 'password'
  ```
- `tests/base/prueba-usuario.py` cubre:
  - ausencia de `amr` — N14;
  - otro método — N15;
  - forma no-array — N16;
  - pero no varios elementos ni varios `password`.
- `openspec/specs/acceso/spec.md`, requisito **«Sesión vigente»**, habla en singular de “el momento de entrada” sin resolver múltiples valores.

**Regla que se rompe y fallo observable:** si una renovación o reautenticación genera más de un registro `password`, usar el mínimo puede cerrar una sesión tomando una autenticación antigua; usar el máximo produciría una duración distinta. La elección actual no está respaldada por la fuente de verdad y podría cambiar sin que ninguna prueba falle.

**Corrección mínima:** decidir explícitamente qué elemento representa la entrada original y añadir casos con varios valores, desordenados y con métodos mezclados.

---

### 7. MEDIO — El módulo expone mensajes internos de la base

**Qué está mal:** el error se presenta como “mensaje nuestro”, pero concatena literalmente `error.message` recibido del cliente de datos.

**Evidencia:**

- `lib/datos/separacion.ts`, `buscarPorId()`:
  ```ts
  throw new Error(`No se pudo consultar ${tabla}: ${error.message}`);
  ```
- El comentario inmediatamente anterior afirma:
  - “se informa con mensaje nuestro”.
- `tests/unit/separacion.test.ts`, N7 solo comprueba el prefijo:
  ```ts
  /No se pudo consultar usuario/
  ```
  No verifica que `connection refused` u otros detalles internos queden fuera de la respuesta.

**Regla que se rompe y fallo observable:** un error de PostgreSQL/PostgREST puede incluir nombres de restricciones, esquemas, políticas o detalles operativos, y ese texto queda expuesto a cualquier capa que devuelva el mensaje de la excepción. La prueba pasa precisamente aunque el detalle interno se filtre.

**Corrección mínima:** conservar el detalle técnico solo para registro interno y exponer un mensaje fijo de aplicación.

---

### 8. MEDIO — El disparador sobre `auth.users` no está probado contra la renovación de sesión

**Qué está mal:** se instala un disparador global `BEFORE UPDATE` sobre una tabla interna del servicio, pero la batería no comprueba que la renovación de sesión siga funcionando.

**Evidencia:**

- `supabase/migrations/20261125033000_usuario.sql`, bloque 4:
  ```sql
  CREATE TRIGGER impedir_cambio_de_correo_propio
    BEFORE UPDATE ON auth.users
    FOR EACH ROW
  ```
- `tests/base/prueba-usuario.py` prueba entrada mediante `entrar()`, cambio de correo, cambio administrativo y cierre.
- `scripts/base/api_local.py`, `entrar()` descarta el `refresh_token` y devuelve únicamente `access_token`.
- No existe en los archivos adjuntos una llamada a `grant_type=refresh_token`.

**Regla que se rompe y fallo observable:** la especificación de **«Sesión vigente»** depende de que el pase se renueve conservando el momento de entrada. Si una versión del servicio actualiza `auth.users` durante esa renovación de una forma incompatible con el disparador, entrar y cerrar seguirían pasando, pero una sesión normal dejaría de renovarse.

**Corrección mínima:** añadir un caso de renovación real posterior a la instalación del disparador y comprobar que el nuevo pase conserva la sesión y el `amr` esperado.

## Sospecha no demostrada con los adjuntos

- `public.es_mi_organizacion` es `SECURITY DEFINER`, consulta `public.usuario` y depende de que su propietario pueda omitir la RLS forzada para no entrar recursivamente en `usuario_separacion`. La migración no fija ni valida explícitamente el propietario o `BYPASSRLS`. En local probablemente lo crea `postgres`, pero los archivos no demuestran qué propietario tendrá en el servicio gestionado ni que H-4 compruebe esa propiedad. Por eso no lo elevo a hallazgo confirmado.

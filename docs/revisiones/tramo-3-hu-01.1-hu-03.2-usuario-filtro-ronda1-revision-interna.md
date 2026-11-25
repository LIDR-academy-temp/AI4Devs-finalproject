# Revisión interna de las correcciones — tramo 3, ronda 1 (G6, paso 7)

> 25/11/2026. Agente sin el contexto de la sesión, mismas instrucciones que Thibaut, solo el diff de las correcciones (`3d32d98` a `e2ac6cd`). Opinión de un modelo, no veredicto. La respuesta está en `tramo-3-hu-01.1-hu-03.2-usuario-filtro-ronda1-respuesta.md`.

## Revisión adversarial de las correcciones del tramo 3, ronda 1 (commits ad4e290 y e2ac6cd)

Revisé el diff, la migración, la validación, los dos archivos de prueba, `separacion.ts`, la spec, el README, `prompts.md`, D-103 en discovery y H-4 en el recorte v4. No modifiqué nada ni ejecuté las suites. Verifiqué cuatro cosas: README dice 41/29/18 casos y coincide; hay 135 escenarios (51+42+42); el 25/11/2026 cae en miércoles; y simulé con python que N27 depende de la fecha.

### a) ¿Cada corrección cierra su hallazgo?

**Cerrados:**
- C2-4: hay validación negativa.
- C2-7: mayúsculas.
- C2-8: fecha del README.
- C1-7: mensaje fijo.
- C1-6/C2-6: varios `amr`; el código está cerrado, pero el criterio sigue pendiente de la Dirección.
- La sospecha sobre el dueño: la cierran la fila 26 y N26.
- C2-9: está cerrado. Revisé el orden de los `except` y es correcto.

**Parciales:**
- **C1-2/C2-3**, el detector de consultas directas (hallazgo 4).
- **C1-3/C2-2**, la comprobación en H-4 (hallazgos 2 y 5).
- **C1-1/C2-1**, la reescritura del usuario: se cerró con un procedimiento, sin cambiar código. P10 ya habría pasado antes de la corrección y no comprueba el correo de la cuenta (solo `c == 200`).
- **C1-4/C1-5**, el plazo: el código cumple, pero las pruebas no lo protegen (hallazgo 1).

### b, c, d) Hallazgos

**1. MEDIO — N27 solo distingue días de horas entre ~01/11 y ~01/12.** Nace de una corrección: sí.
- Dónde: `tests/base/prueba-usuario.py:224-225`.
- Por qué: la ventana de 30 días solo cruza el cambio de horario de otoño de New York (01/11/2026) durante ese mes. Simulado con la entrada 720,5 h antes de hoy: el código viejo (`days`) da `t` el 25/11/2026 y `f` el 05/12/2026 y el 15/01/2027, igual que el código nuevo. En primavera el día dura 23 h y ambos dan `f`.
- Fallo concreto: desde el 02/12, si se revierte `hours => dias * 24` a `days =>`, la batería queda en verde. La entrega final es el 09/12.
- Además, P11 y N26 (`:220-222`) prueban `dentro_del_plazo` suelta. Si `es_mi_organizacion` vuelve a comparar en línea con `>`, siguen pasando. La fila 25 no comprueba que `es_mi_organizacion` llame a la función.
- Corrección mínima: probar `dentro_del_plazo` con instantes fijos que crucen el cambio de horario, con `set local timezone 'America/New_York'`. Y agregar un caso de borde exacto que pase por `es_mi_organizacion`.

**2. MEDIO — H-4 «repite N24» es imposible en el servicio gestionado, y N24 no prueba al servicio.** Nace de una corrección: sí.
- Dónde: spec `acceso/spec.md:270` y `prueba-usuario.py:146-154`.
- Por qué: N24 apaga un disparador de `auth.users` como `supabase_admin` y confirma con un `UPDATE` escrito a mano. En el servicio gestionado no hay superusuario ni dueño de `auth.users`.
- Además, N24 supone que el servicio confirma con un solo `UPDATE email=email_change, email_change=''`. Ese supuesto no lo verifica nada. La razón que da la spec («depende de cómo anota el servicio») queda sin probar.
- De paso, usa `supabase_admin` para comprobar, cuando `base_local.py:37` dice «nunca se usa para comprobar».
- Corrección mínima: en H-4, reemplazar N24 por un caso real (pedir el cambio por la API y confirmarlo), o declarar el límite.

**3. MEDIO — La spec contradice D-103 y H-4, que siguen con el texto viejo.** Nace de una corrección: sí.
- La spec ahora dice que el usuario lo reescribe «el rol de las migraciones».
- D-103 en `discovery-controlador-tiempo.md:172` y `prompts.md:349` dicen que la Dirección confirmó que lo hace la credencial del sistema. D-103 también sigue diciendo que en H-4 «solo» se comprueba que la plataforma deje crear el disparador.
- La fila H-4 de `Recorte-Entrega-20261119-v4.md:70` sigue con tres comprobaciones; no incluye N9, N24, P3, P10 ni P13.
- `spec.md:123` cambia un requisito aprobado (D-89) con un «criterio del agente, a confirmar» sin número de decisión. Tampoco agrega escenarios para «el más antiguo» ni para «24 horas».
- Corrección mínima: nueva decisión (D-104) que confirme la Dirección, actualizar la fila H-4 y anotar la corrección en D-103.

**4. MEDIO — La spec afirma más de lo que cubre `usosDirectos`.** Nace de una corrección: sí, el texto.
- Dónde: `spec.md:~444` dice «falla si un archivo de código del repositorio consulta una tabla».
- No detecta:
  - `fetch(".../rest/v1/usuario")`, que el hallazgo C1-2 citaba;
  - `const { from } = cliente; from("usuario")`;
  - `cliente.from.call(cliente, "usuario")`;
  - archivos `.cjs`, `.cts` o `.mts` (`separacion.test.ts:182`);
  - cualquier carpeta llamada `tests` a cualquier profundidad, por ejemplo `app/tests/` (`:174`).
- El límite declarado solo menciona «nombre de método calculado».
- Corrección mínima: ampliar el límite declarado a esas formas, o cubrirlas: `fetch` a `/rest/v1`, todas las extensiones, excluir solo el `tests/` de la raíz.

**5. MEDIO — P5 prohíbe `.rpc(` fuera del módulo, pero el módulo no ofrece cómo llamar a una operación.** Nace de una corrección: sí.
- `aviso-inicio/spec.md:198` y `:251` exigen que el aviso lo escriba una operación de la base, que se llama por RPC.
- Fallo concreto: el ticket del aviso pondrá la integración continua en rojo sin un camino permitido, o empujará a meter la excepción en otro lugar.
- Corrección mínima: agregar a `separacion.ts` una entrada para llamar operaciones, o declararlo como pendiente.

**6. BAJO — El nuevo chequeo de confirmación bloquea una corrección legítima del administrador.** Nace de una corrección: sí.
- Dónde: `usuario.sql:183-186`.
- Escenario: la persona pidió cambiar a su correo correcto antes del bloqueo (queda pendiente en `email_change`). El administrador corrige a esa misma dirección y recibe el rechazo D-103.
- No encontré ningún caso en que la persona pueda cambiar su propio correo con el chequeo puesto. Cubre también que la persona vuelva a pedir la misma dirección pendiente.
- Corrección mínima: documentar que primero se limpia `email_change`.

**7. BAJO — `dentro_del_plazo` puede desbordar y no tiene control de quién la ejecuta.** Nace de una corrección: sí.
- `dias * 24` desborda `integer` con `sesion_dias > 89.478.485`. El CHECK solo exige `> 0`. Entonces `es_mi_organizacion` lanza un error en vez de responder «no»; con `days =>` el error llegaba más tarde.
- Si la base local aplica los privilegios por defecto de Supabase, `anon` puede llamarla por la API (`/rpc/dentro_del_plazo`). La fila 25 no comprueba quién puede ejecutarla, a diferencia de lo que se hizo con `impedir_cambio_de_correo_propio`.
- Lo que sí está bien: volatilidad (`STABLE` es lo correcto), `search_path` vacío y el manejo de nulos (en `EXISTS` el `NULL` actúa como falso).
- Corrección mínima: tope en el CHECK de `sesion_dias`, y quitar EXECUTE con su fila de validación.

**8. BAJO — `usosDirectos` marca como consulta código que no lo es.** Nace de una corrección: sí.
- Ejemplos: `Temporal.PlainDate.from(...)` (probable en una app de tiempo), `Iterator.from`, `ReadableStream.from`, `Readable.from`, `Float16Array.from`, o `supabase.from(` dentro de un comentario o un texto.
- Los `import ... from` no los marca.
- Falla hacia el lado seguro: la integración continua se pone en rojo.

**9. BAJO — El mensaje fijo deja poca información.** Nace de una corrección: sí.
- Dónde: `separacion.ts:94`.
- Sigue mostrando el nombre interno de la tabla.
- «Inténtalo de nuevo en unos minutos» confunde ante errores que no son pasajeros, como un permiso denegado.
- La causa guarda solo `message` (se pierden `code`, `details` y `hint`) y nada la registra.

**10. BAJO — Pruebas débiles.** Nacen de una corrección: sí.
- `decidir()` en `prueba-validacion-usuario.py:136` no comprueba que falle *solo* la fila esperada. Una fila que se marca por desvíos ajenos no se detecta.
- P13 pasaría también sin el disparador: renovar la sesión no cambia el correo. Es un control de no-interferencia, no una prueba roja primero.
- La fila 26 no puede pasar en falso: si falta una de las dos funciones o su dueño no omite las reglas, da FALLA. N26 lo detecta.

**11. BAJO — Texto viejo que no se actualizó.** Nace de una corrección: sí.
- `usuario.sql:24-25` («el cambio que hace la credencial del sistema pasa», sin la excepción nueva) y `:40-41` (H-4 «solo crear»).
- `prompts.md:358` («recorre `app/` y `lib/`») y no hay entrada para esta ronda.

### Sin hallazgos
- Normalización a minúsculas: no encontré ningún defecto nuevo.
- Conteos (41, 29, 18, 26 filas, 135 escenarios): todos cuadran.
- El caso P6 sobre mayúsculas: falla si se revierte la corrección, como debe.
- El caso N11 sobre el mensaje fijo: falla si se revierte la corrección, como debe.
- No hay hallazgos CRÍTICOS ni ALTOS.

Archivos principales:
- `tests/base/prueba-usuario.py`
- `supabase/migrations/20261125033000_usuario.sql`
- `lib/datos/separacion.ts`
- `tests/unit/separacion.test.ts`
- `openspec/specs/acceso/spec.md`
- `docs/trazabilidad/01-Discovery/discovery-controlador-tiempo.md`
- `docs/trazabilidad/05-Tickets/Recorte-Entrega-20261119-v4.md`

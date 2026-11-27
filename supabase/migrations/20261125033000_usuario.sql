-- ============================================================
-- MIGRACIÓN 20261125033000_usuario — HU-01.1 (tramo 3)
-- Origen: openspec/specs/acceso/spec.md, sección «Datos» (tabla usuario) y
-- requisitos «Un correo, una cuenta, una organización», «Sesión vigente» y
-- «Separación por organización en la base»; D-100 (el cuerpo de
-- es_mi_organizacion cambia en este ticket) y D-103 (nadie cambia por sí solo
-- el correo de su cuenta).
-- Parte de openspec/plantillas/migracion-controlada.sql: cada objeto en su
-- bloque, con mensajes nuestros de éxito y de error.
-- Validación 1 a 1: supabase/validaciones/20261125033000_usuario.sql.
-- Pruebas con datos: tests/base/prueba-usuario.py.
--
-- QUÉ CREA O CAMBIA
--   1. public.usuario, con sus constraints declaradas en la misma sentencia
--      (la tabla es nueva: si existe, se aborta).
--   2. Índice único usuario_correo_key sobre lower(correo): un correo, un
--      usuario en todo el sistema, sin distinguir mayúsculas.
--   3. public.comprobar_correo_de_cuenta() y su disparador
--      usuario_correo_de_cuenta: al escribir un usuario, su correo debe ser el
--      de su cuenta en el servicio. Corre con los permisos de quien escribe:
--      en esta entrega solo los datos de arranque (rol de las migraciones)
--      pueden leer las cuentas; a otro rol le responde con mensaje nuestro.
--   4. public.impedir_cambio_de_correo_propio() y su disparador en
--      auth.users (D-103): la solicitud de cambio de correo que hace la
--      persona se rechaza, y también la confirmación de una que ya estuviera
--      pendiente; el cambio que hace la credencial del sistema pasa, salvo que
--      lleve al mismo correo de una solicitud pendiente: entonces primero se
--      limpia la solicitud.
--   5a. public.dentro_del_plazo(entrada, dias, ahora): el plazo de la sesión,
--      contado en horas. Solo la ejecuta su dueño (la llama es_mi_organizacion).
--   5. Cuerpo nuevo de public.es_mi_organizacion(uuid): sí solo para la
--      organización de un usuario activo, con la sesión del pase abierta y sin
--      pasar sesion_dias desde que entró con contraseña.
--   6. Reglas de la base activadas y forzadas en usuario.
--   7. Regla restrictiva usuario_separacion.
--   8. Quita a anon y authenticated TRUNCATE, TRIGGER y REFERENCES sobre
--      usuario.
--
-- LÍMITES
--   - Los dos disparadores corren con los permisos de quien escribe: no son
--     funciones con privilegios de su dueño y no entran en la lista cerrada
--     de supabase/comprobaciones/estructura.sql.
--   - En el servicio gestionado, H-4 comprueba que la plataforma deje crear el
--     disparador en auth.users y repite por la API los casos de D-103 (N9, P3,
--     P10 y P13 de tests/base/prueba-usuario.py). N24 es solo local: necesita
--     un superusuario para fabricar una solicitud pendiente.
--   - dentro_del_plazo multiplica sesion_dias por 24 en entero: con un valor
--     absurdo (más de 89 millones de días) daría error en vez de «no».
--   - Con solo la regla restrictiva y ninguna permisiva, las personas no ven
--     ni cambian usuarios. Las reglas por rol las pone HU-02.1.
--   - es_mi_organizacion lee usuario, cuya regla vuelve a llamarla: no entra en
--     recursión porque su dueño (el rol de las migraciones) omite las reglas.
--     La validación 1 a 1 lo comprueba (revisión del tramo 3, ronda 1).
-- ============================================================


-- ------------------------------------------------------------
-- 1. public.usuario — tabla: si ya existe, es anomalía y se aborta.
-- ------------------------------------------------------------
DO $bloque$
BEGIN
  IF to_regclass('public.usuario') IS NOT NULL THEN
    RAISE EXCEPTION 'ABORTA: public.usuario ya existe. Anomalía — no se crea sobre datos existentes.';
  END IF;

  BEGIN
    CREATE TABLE public.usuario (
      id              uuid    NOT NULL,
      organizacion_id uuid    NOT NULL,
      nombre          text    NOT NULL,
      correo          text    NOT NULL,
      telefono        text    NOT NULL,
      activo          boolean NOT NULL DEFAULT true,
      CONSTRAINT usuario_pkey PRIMARY KEY (id),
      CONSTRAINT usuario_organizacion_id_fkey FOREIGN KEY (organizacion_id) REFERENCES public.organizacion (id),
      CONSTRAINT usuario_id_organizacion_id_key UNIQUE (id, organizacion_id)
    );
  EXCEPTION WHEN OTHERS THEN
    RAISE EXCEPTION 'ERROR: no se pudo crear public.usuario. Motivo del motor: % (código %).',
      SQLERRM, SQLSTATE;
  END;

  IF to_regclass('public.usuario') IS NOT NULL THEN
    RAISE NOTICE 'OK: public.usuario creada exitosamente.';
  ELSE
    RAISE EXCEPTION 'ERROR: la creación de public.usuario no dio error, pero la tabla no existe.';
  END IF;
END
$bloque$;


-- ------------------------------------------------------------
-- 2. Índice único usuario_correo_key — recreable: no tiene dato propio.
-- ------------------------------------------------------------
DO $bloque$
BEGIN
  BEGIN
    IF to_regclass('public.usuario_correo_key') IS NOT NULL THEN
      DROP INDEX public.usuario_correo_key;
    END IF;
    CREATE UNIQUE INDEX usuario_correo_key ON public.usuario (lower(correo));
  EXCEPTION WHEN OTHERS THEN
    RAISE EXCEPTION 'ERROR: no se pudo crear el índice public.usuario_correo_key. Motivo del motor: % (código %).',
      SQLERRM, SQLSTATE;
  END;

  IF to_regclass('public.usuario_correo_key') IS NOT NULL THEN
    RAISE NOTICE 'OK: índice único public.usuario_correo_key creado exitosamente.';
  ELSE
    RAISE EXCEPTION 'ERROR: la creación de public.usuario_correo_key no dio error, pero el índice no existe.';
  END IF;
END
$bloque$;


-- ------------------------------------------------------------
-- 3. Comprobación del correo de la cuenta — recreable.
-- ------------------------------------------------------------
DO $bloque$
BEGIN
  BEGIN
    CREATE OR REPLACE FUNCTION public.comprobar_correo_de_cuenta()
      RETURNS trigger
      LANGUAGE plpgsql
      SET search_path = ''
    AS $fn$
    DECLARE
      correo_de_cuenta text;
    BEGIN
      -- Con los permisos de quien escribe: si no puede leer las cuentas del
      -- servicio, el mensaje es nuestro, no el del motor.
      BEGIN
        SELECT u.email INTO correo_de_cuenta FROM auth.users u WHERE u.id = NEW.id;
      EXCEPTION WHEN insufficient_privilege THEN
        RAISE EXCEPTION 'No se pudo comprobar el correo del usuario %: el rol % no puede leer las cuentas del servicio. En esta entrega los usuarios los escriben los datos de arranque.',
          NEW.id, current_user;
      END;
      IF NOT FOUND THEN
        RAISE EXCEPTION 'El usuario % no tiene cuenta en el servicio de autenticación.', NEW.id;
      END IF;
      IF lower(correo_de_cuenta) IS DISTINCT FROM lower(NEW.correo) THEN
        RAISE EXCEPTION 'El correo % no es el de la cuenta del usuario %.', NEW.correo, NEW.id;
      END IF;
      RETURN NEW;
    END;
    $fn$;
    REVOKE ALL ON FUNCTION public.comprobar_correo_de_cuenta() FROM PUBLIC, anon, authenticated;

    IF EXISTS (SELECT 1 FROM pg_trigger
               WHERE tgrelid = 'public.usuario'::regclass AND tgname = 'usuario_correo_de_cuenta') THEN
      DROP TRIGGER usuario_correo_de_cuenta ON public.usuario;
    END IF;
    CREATE TRIGGER usuario_correo_de_cuenta
      BEFORE INSERT OR UPDATE ON public.usuario
      FOR EACH ROW EXECUTE FUNCTION public.comprobar_correo_de_cuenta();
  EXCEPTION WHEN OTHERS THEN
    RAISE EXCEPTION 'ERROR: no se pudo crear la comprobación del correo de la cuenta. Motivo del motor: % (código %).',
      SQLERRM, SQLSTATE;
  END;

  IF EXISTS (SELECT 1 FROM pg_trigger
             WHERE tgrelid = 'public.usuario'::regclass AND tgname = 'usuario_correo_de_cuenta' AND tgenabled = 'O') THEN
    RAISE NOTICE 'OK: disparador usuario_correo_de_cuenta creado exitosamente.';
  ELSE
    RAISE EXCEPTION 'ERROR: la creación del disparador usuario_correo_de_cuenta no dio error, pero no existe o no está activo.';
  END IF;
END
$bloque$;


-- ------------------------------------------------------------
-- 4. D-103: la persona no cambia por sí sola el correo de su cuenta —
--    recreable. El servicio anota en email_change el correo pedido por la
--    persona; la credencial del sistema cambia email directamente.
-- ------------------------------------------------------------
DO $bloque$
BEGIN
  BEGIN
    CREATE OR REPLACE FUNCTION public.impedir_cambio_de_correo_propio()
      RETURNS trigger
      LANGUAGE plpgsql
      SET search_path = ''
    AS $fn$
    BEGIN
      -- La persona pide el cambio: el servicio anota el correo pedido.
      IF coalesce(NEW.email_change, '') <> '' AND NEW.email_change IS DISTINCT FROM OLD.email_change THEN
        RAISE EXCEPTION 'El correo de la cuenta no se cambia: un correo nuevo es un usuario nuevo (D-103).';
      END IF;
      -- La confirmación de una solicitud que ya estaba pendiente (por ejemplo,
      -- anterior a este bloqueo): el correo pasa a ser el pedido.
      IF NEW.email IS DISTINCT FROM OLD.email AND coalesce(OLD.email_change, '') <> ''
         AND lower(NEW.email) = lower(OLD.email_change) THEN
        RAISE EXCEPTION 'El correo de la cuenta no se cambia: un correo nuevo es un usuario nuevo (D-103).';
      END IF;
      RETURN NEW;
    END;
    $fn$;
    REVOKE ALL ON FUNCTION public.impedir_cambio_de_correo_propio() FROM PUBLIC, anon, authenticated;

    IF EXISTS (SELECT 1 FROM pg_trigger
               WHERE tgrelid = 'auth.users'::regclass AND tgname = 'impedir_cambio_de_correo_propio') THEN
      DROP TRIGGER impedir_cambio_de_correo_propio ON auth.users;
    END IF;
    CREATE TRIGGER impedir_cambio_de_correo_propio
      BEFORE UPDATE ON auth.users
      FOR EACH ROW EXECUTE FUNCTION public.impedir_cambio_de_correo_propio();
  EXCEPTION WHEN OTHERS THEN
    RAISE EXCEPTION 'ERROR: no se pudo crear el bloqueo del cambio de correo propio (D-103). Motivo del motor: % (código %).',
      SQLERRM, SQLSTATE;
  END;

  IF EXISTS (SELECT 1 FROM pg_trigger
             WHERE tgrelid = 'auth.users'::regclass AND tgname = 'impedir_cambio_de_correo_propio' AND tgenabled = 'O') THEN
    RAISE NOTICE 'OK: disparador impedir_cambio_de_correo_propio creado exitosamente en auth.users.';
  ELSE
    RAISE EXCEPTION 'ERROR: la creación del disparador impedir_cambio_de_correo_propio no dio error, pero no existe o no está activo.';
  END IF;
END
$bloque$;


-- ------------------------------------------------------------
-- 5a. public.dentro_del_plazo(entrada, dias, ahora) — recreable. Sí si no
--     pasaron más de `dias` días desde la entrada; exactamente en el plazo,
--     todavía vale. El plazo se cuenta en horas (24 por día): un intervalo en
--     días dependería de la zona horaria de la sesión de la base, y un día con
--     cambio de horario duraría 23 o 25 horas (revisión del tramo 3, ronda 1).
--     Aparte, para poder probar el instante exacto.
-- ------------------------------------------------------------
DO $bloque$
BEGIN
  BEGIN
    CREATE OR REPLACE FUNCTION public.dentro_del_plazo(entrada timestamptz, dias integer, ahora timestamptz)
      RETURNS boolean
      LANGUAGE sql
      STABLE
      SET search_path = ''
    AS $fn$
      SELECT entrada + make_interval(hours => dias * 24) >= ahora;
    $fn$;
    -- Solo su dueño la ejecuta: la llama es_mi_organizacion, que corre con los
    -- privilegios de su dueño. Nadie la llama por la API (revisión interna).
    REVOKE ALL ON FUNCTION public.dentro_del_plazo(timestamptz, integer, timestamptz) FROM PUBLIC, anon, authenticated;
  EXCEPTION WHEN OTHERS THEN
    RAISE EXCEPTION 'ERROR: no se pudo crear public.dentro_del_plazo. Motivo del motor: % (código %).',
      SQLERRM, SQLSTATE;
  END;

  IF to_regprocedure('public.dentro_del_plazo(timestamptz, integer, timestamptz)') IS NOT NULL THEN
    RAISE NOTICE 'OK: función public.dentro_del_plazo creada exitosamente.';
  ELSE
    RAISE EXCEPTION 'ERROR: la creación de public.dentro_del_plazo no dio error, pero la función no existe.';
  END IF;
END
$bloque$;


-- ------------------------------------------------------------
-- 5. public.es_mi_organizacion(uuid) — cuerpo de HU-01.1 (cierra D-100).
--    Mismas propiedades que en el tramo 2: STABLE, privilegios de su dueño
--    (lee usuario y organizacion, que las personas no ven), search_path vacío,
--    no STRICT (un nulo responde «no»). Los permisos de ejecutar no cambian.
-- ------------------------------------------------------------
DO $bloque$
BEGIN
  BEGIN
    CREATE OR REPLACE FUNCTION public.es_mi_organizacion(organizacion uuid)
      RETURNS boolean
      LANGUAGE sql
      STABLE
      SECURITY DEFINER
      SET search_path = ''
    AS $fn$
      -- Sí solo si la organización dada es la del usuario de quien consulta,
      -- el usuario está activo, la sesión del pase sigue abierta y no pasaron
      -- más de sesion_dias días desde que entró con contraseña. El momento de
      -- entrada es el que el servicio anota en el pase (amr, método password);
      -- si no está o tiene otra forma, la respuesta es «no»: ante la duda, la
      -- sesión vence. Con varias entradas con contraseña, vale la más antigua,
      -- por la misma razón. La hora es la del inicio de la consulta, como en
      -- sesion_abierta() (D-102). El plazo lo decide dentro_del_plazo().
      SELECT EXISTS (
        SELECT 1
        FROM public.usuario u
        JOIN public.organizacion o ON o.id = u.organizacion_id
        WHERE u.id = auth.uid()
          AND u.organizacion_id = organizacion
          AND u.activo
          AND public.sesion_abierta()
          AND public.dentro_del_plazo(
                to_timestamp((
                  SELECT min((a ->> 'timestamp')::bigint)
                  FROM jsonb_array_elements(
                         CASE WHEN jsonb_typeof(auth.jwt() -> 'amr') = 'array'
                              THEN auth.jwt() -> 'amr' ELSE '[]'::jsonb END) a
                  WHERE jsonb_typeof(a) = 'object'
                    AND a ->> 'method' = 'password'
                    AND (a ->> 'timestamp') ~ '^[0-9]{1,12}$'
                )),
                o.sesion_dias,
                statement_timestamp())
      );
    $fn$;
  EXCEPTION WHEN OTHERS THEN
    RAISE EXCEPTION 'ERROR: no se pudo cambiar el cuerpo de public.es_mi_organizacion(uuid). Motivo del motor: % (código %).',
      SQLERRM, SQLSTATE;
  END;

  IF to_regprocedure('public.es_mi_organizacion(uuid)') IS NOT NULL
     AND position('public.usuario' IN (SELECT prosrc FROM pg_proc
                                       WHERE oid = 'public.es_mi_organizacion(uuid)'::regprocedure)) > 0 THEN
    RAISE NOTICE 'OK: cuerpo de public.es_mi_organizacion(uuid) cambiado exitosamente.';
  ELSE
    RAISE EXCEPTION 'ERROR: el cambio de public.es_mi_organizacion(uuid) no dio error, pero la función no existe o no lee public.usuario.';
  END IF;
END
$bloque$;


-- ------------------------------------------------------------
-- 6. Reglas de la base en usuario: activadas y forzadas también para el dueño.
-- ------------------------------------------------------------
DO $bloque$
BEGIN
  BEGIN
    ALTER TABLE public.usuario ENABLE ROW LEVEL SECURITY;
    ALTER TABLE public.usuario FORCE ROW LEVEL SECURITY;
  EXCEPTION WHEN OTHERS THEN
    RAISE EXCEPTION 'ERROR: no se pudieron activar y forzar las reglas de public.usuario. Motivo del motor: % (código %).',
      SQLERRM, SQLSTATE;
  END;

  IF EXISTS (SELECT 1 FROM pg_class
             WHERE oid = 'public.usuario'::regclass AND relrowsecurity AND relforcerowsecurity) THEN
    RAISE NOTICE 'OK: reglas de public.usuario activadas y forzadas.';
  ELSE
    RAISE EXCEPTION 'ERROR: las reglas de public.usuario no quedaron activadas y forzadas.';
  END IF;
END
$bloque$;


-- ------------------------------------------------------------
-- 7. Regla restrictiva usuario_separacion — recreable: se elimina y se crea
--    en el mismo bloque, para que no exista el estado «sin regla».
-- ------------------------------------------------------------
DO $bloque$
BEGIN
  BEGIN
    IF EXISTS (SELECT 1 FROM pg_policy
               WHERE polrelid = 'public.usuario'::regclass AND polname = 'usuario_separacion') THEN
      DROP POLICY usuario_separacion ON public.usuario;
    END IF;
    CREATE POLICY usuario_separacion ON public.usuario
      AS RESTRICTIVE
      FOR ALL
      TO PUBLIC
      USING (public.es_mi_organizacion(organizacion_id))
      WITH CHECK (public.es_mi_organizacion(organizacion_id));
  EXCEPTION WHEN OTHERS THEN
    RAISE EXCEPTION 'ERROR: no se pudo recrear la regla usuario_separacion; quedó como estaba. Motivo del motor: % (código %).',
      SQLERRM, SQLSTATE;
  END;

  IF EXISTS (SELECT 1 FROM pg_policy
             WHERE polrelid = 'public.usuario'::regclass
               AND polname = 'usuario_separacion' AND NOT polpermissive) THEN
    RAISE NOTICE 'OK: regla restrictiva usuario_separacion creada exitosamente.';
  ELSE
    RAISE EXCEPTION 'ERROR: la creación de la regla usuario_separacion no dio error, pero no existe o no es restrictiva.';
  END IF;
END
$bloque$;


-- ------------------------------------------------------------
-- 8. Privilegios que no pasan por las reglas, fuera para las personas.
-- ------------------------------------------------------------
DO $bloque$
BEGIN
  BEGIN
    REVOKE TRUNCATE, TRIGGER, REFERENCES ON public.usuario FROM anon, authenticated;
  EXCEPTION WHEN OTHERS THEN
    RAISE EXCEPTION 'ERROR: no se pudieron quitar los privilegios de public.usuario a las personas. Motivo del motor: % (código %).',
      SQLERRM, SQLSTATE;
  END;

  IF EXISTS (SELECT 1 FROM (VALUES ('anon'), ('authenticated')) AS r(rol)
             WHERE has_table_privilege(r.rol, 'public.usuario', 'TRUNCATE')
                OR has_table_privilege(r.rol, 'public.usuario', 'TRIGGER')
                OR has_table_privilege(r.rol, 'public.usuario', 'REFERENCES')) THEN
    RAISE EXCEPTION 'ERROR: anon o authenticated conservan TRUNCATE, TRIGGER o REFERENCES sobre public.usuario.';
  ELSE
    RAISE NOTICE 'OK: las personas no pueden vaciar public.usuario ni colgarle disparadores o llaves.';
  END IF;
END
$bloque$;

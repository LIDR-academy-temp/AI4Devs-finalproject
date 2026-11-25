-- ============================================================
-- MIGRACIÓN 20261123170000_organizacion — HU-03.1 (tramo 2)
-- Origen: openspec/specs/acceso/spec.md, sección «Datos» (tabla organizacion)
-- y requisito «Separación por organización en la base»; D-81 (zona horaria
-- de la organización) y D-100 (orden de construcción de la regla).
-- Parte de openspec/plantillas/migracion-controlada.sql: cada objeto en su
-- bloque, con mensajes nuestros de éxito y de error.
-- Validación 1 a 1: supabase/validaciones/20261123170000_organizacion.sql.
--
-- QUÉ CREA
--   1. public.es_zona_horaria(text): sí o no, el nombre está en la lista
--      estándar de zonas del motor. La usa la constraint de zona_horaria.
--   2. public.organizacion, con sus constraints declaradas en la misma
--      sentencia: la tabla es nueva (si existe, se aborta), así que no hay
--      constraint previa que recrear.
--   3. public.sesion_abierta(): sí o no, la sesión que nombra el pase de
--      quien consulta sigue abierta en el servicio de autenticación. Es la
--      comprobación «por construir» de la spec; la usará la regla desde el
--      tramo 3. Corre con los privilegios de su dueño porque lee
--      auth.sessions, que el rol de las personas no ve.
--   4. public.es_mi_organizacion(uuid): sí o no, la organización dada es la
--      de quien consulta. HASTA EL TRAMO 3 RESPONDE SIEMPRE «NO» (D-100):
--      todavía no existe la tabla usuario de la que saldría la respuesta.
--      HU-01.1 cambia solo su cuerpo para exigir usuario activo, sesión
--      abierta y sesion_dias.
--   5. Reglas de la base activadas y forzadas en organizacion.
--   6. Regla restrictiva organizacion_separacion: para toda orden y todo
--      rol, compara id con la organización de quien consulta.
--   7. Quita a anon y authenticated los privilegios TRUNCATE, TRIGGER y
--      REFERENCES que la plataforma da por defecto.
--
-- LÍMITES
--   - Las dos funciones con privilegios de su dueño están en la lista
--     cerrada de supabase/comprobaciones/estructura.sql (D-74).
--   - Con solo la regla restrictiva y ninguna permisiva, la tabla no deja
--     ver ni cambiar nada a las personas. Las reglas por rol las pone
--     HU-02.1.
--   - es_zona_horaria se declara inmutable para poder usarla en una
--     constraint; la lista de zonas solo cambia al actualizar el motor.
-- ============================================================


-- ------------------------------------------------------------
-- 1. public.es_zona_horaria(text) — recreable: no tiene dato propio.
-- ------------------------------------------------------------
DO $bloque$
BEGIN
  BEGIN
    CREATE OR REPLACE FUNCTION public.es_zona_horaria(zona text)
      RETURNS boolean
      LANGUAGE sql
      IMMUTABLE
      SET search_path = ''
    AS $fn$
      SELECT EXISTS (SELECT 1 FROM pg_catalog.pg_timezone_names WHERE name = zona);
    $fn$;
  EXCEPTION WHEN OTHERS THEN
    RAISE EXCEPTION 'ERROR: no se pudo crear public.es_zona_horaria(text). Motivo del motor: % (código %).',
      SQLERRM, SQLSTATE;
  END;

  IF to_regprocedure('public.es_zona_horaria(text)') IS NOT NULL THEN
    RAISE NOTICE 'OK: función public.es_zona_horaria(text) creada exitosamente.';
  ELSE
    RAISE EXCEPTION 'ERROR: la creación de public.es_zona_horaria(text) no dio error, pero la función no existe.';
  END IF;
END
$bloque$;


-- ------------------------------------------------------------
-- 2. public.organizacion — tabla: si ya existe, es anomalía y se aborta.
-- ------------------------------------------------------------
DO $bloque$
BEGIN
  IF to_regclass('public.organizacion') IS NOT NULL THEN
    RAISE EXCEPTION 'ABORTA: public.organizacion ya existe. Anomalía — no se crea sobre datos existentes.';
  END IF;

  BEGIN
    CREATE TABLE public.organizacion (
      id           uuid    NOT NULL DEFAULT gen_random_uuid(),
      nombre       text    NOT NULL,
      sesion_dias  integer NOT NULL DEFAULT 30,
      zona_horaria text    NOT NULL,
      CONSTRAINT organizacion_pkey PRIMARY KEY (id),
      CONSTRAINT organizacion_nombre_key UNIQUE (nombre),
      CONSTRAINT organizacion_sesion_dias_check CHECK (sesion_dias > 0),
      CONSTRAINT organizacion_zona_horaria_check CHECK (public.es_zona_horaria(zona_horaria))
    );
  EXCEPTION WHEN OTHERS THEN
    RAISE EXCEPTION 'ERROR: no se pudo crear public.organizacion. Motivo del motor: % (código %).',
      SQLERRM, SQLSTATE;
  END;

  IF to_regclass('public.organizacion') IS NOT NULL THEN
    RAISE NOTICE 'OK: public.organizacion creada exitosamente.';
  ELSE
    RAISE EXCEPTION 'ERROR: la creación de public.organizacion no dio error, pero la tabla no existe.';
  END IF;
END
$bloque$;


-- ------------------------------------------------------------
-- 3. public.sesion_abierta() — recreable. Privilegios de su dueño: lee
--    auth.sessions. Solo responde sí o no sobre quien consulta.
-- ------------------------------------------------------------
DO $bloque$
BEGIN
  BEGIN
    CREATE OR REPLACE FUNCTION public.sesion_abierta()
      RETURNS boolean
      LANGUAGE sql
      STABLE
      SECURITY DEFINER
      SET search_path = ''
    AS $fn$
      -- Abierta: el servicio todavía tiene la sesión que nombra el pase, es
      -- de la misma cuenta, no pasó su fin fijado (not_after, si el servicio
      -- le puso uno) y el pase es de una persona con sesión (rol
      -- authenticated). Sin pase o sin alguno de esos datos, la respuesta es «no».
      -- La hora es la del inicio de cada consulta (statement_timestamp), no la
      -- del inicio de la transacción (now()): una transacción larga no estira
      -- la sesión más allá de la consulta en curso. No es la del reloj
      -- (clock_timestamp), que cambia dentro de una consulta y contradice que
      -- la función esté declarada STABLE. Riesgo aceptado (D-102): una
      -- consulta que empezó antes del fin conserva su respuesta hasta terminar.
      SELECT EXISTS (
        SELECT 1
        FROM auth.sessions s
        WHERE s.id = nullif(auth.jwt() ->> 'session_id', '')::uuid
          AND s.user_id = auth.uid()
          AND (s.not_after IS NULL OR s.not_after > statement_timestamp())
          AND auth.jwt() ->> 'role' = 'authenticated'
      );
    $fn$;
    REVOKE ALL ON FUNCTION public.sesion_abierta() FROM PUBLIC, anon;
    GRANT EXECUTE ON FUNCTION public.sesion_abierta() TO authenticated;
  EXCEPTION WHEN OTHERS THEN
    RAISE EXCEPTION 'ERROR: no se pudo crear public.sesion_abierta(). Motivo del motor: % (código %).',
      SQLERRM, SQLSTATE;
  END;

  IF to_regprocedure('public.sesion_abierta()') IS NULL THEN
    RAISE EXCEPTION 'ERROR: la creación de public.sesion_abierta() no dio error, pero la función no existe.';
  ELSIF has_function_privilege('anon', 'public.sesion_abierta()', 'execute') THEN
    RAISE EXCEPTION 'ERROR: public.sesion_abierta() quedó ejecutable sin sesión (rol anon).';
  ELSE
    RAISE NOTICE 'OK: función public.sesion_abierta() creada exitosamente.';
  END IF;
END
$bloque$;


-- ------------------------------------------------------------
-- 4. public.es_mi_organizacion(uuid) — recreable. Cuerpo del tramo 2 (D-100).
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
      -- D-100: hasta que exista la tabla usuario (HU-01.1, tramo 3) no hay de
      -- dónde saber la organización de quien consulta, y la respuesta es «no».
      SELECT false;
    $fn$;
    REVOKE ALL ON FUNCTION public.es_mi_organizacion(uuid) FROM PUBLIC;
    GRANT EXECUTE ON FUNCTION public.es_mi_organizacion(uuid) TO anon, authenticated;
  EXCEPTION WHEN OTHERS THEN
    RAISE EXCEPTION 'ERROR: no se pudo crear public.es_mi_organizacion(uuid). Motivo del motor: % (código %).',
      SQLERRM, SQLSTATE;
  END;

  IF to_regprocedure('public.es_mi_organizacion(uuid)') IS NOT NULL THEN
    RAISE NOTICE 'OK: función public.es_mi_organizacion(uuid) creada exitosamente.';
  ELSE
    RAISE EXCEPTION 'ERROR: la creación de public.es_mi_organizacion(uuid) no dio error, pero la función no existe.';
  END IF;
END
$bloque$;


-- ------------------------------------------------------------
-- 5. Reglas de la base en organizacion: activadas y forzadas también para
--    el dueño de la tabla.
-- ------------------------------------------------------------
DO $bloque$
BEGIN
  BEGIN
    ALTER TABLE public.organizacion ENABLE ROW LEVEL SECURITY;
    ALTER TABLE public.organizacion FORCE ROW LEVEL SECURITY;
  EXCEPTION WHEN OTHERS THEN
    RAISE EXCEPTION 'ERROR: no se pudieron activar y forzar las reglas de public.organizacion. Motivo del motor: % (código %).',
      SQLERRM, SQLSTATE;
  END;

  IF EXISTS (SELECT 1 FROM pg_class
             WHERE oid = 'public.organizacion'::regclass AND relrowsecurity AND relforcerowsecurity) THEN
    RAISE NOTICE 'OK: reglas de public.organizacion activadas y forzadas.';
  ELSE
    RAISE EXCEPTION 'ERROR: las reglas de public.organizacion no quedaron activadas y forzadas.';
  END IF;
END
$bloque$;


-- ------------------------------------------------------------
-- 6. Regla restrictiva organizacion_separacion — recreable: se elimina y se
--    crea en el mismo bloque, para que no exista el estado «sin regla».
-- ------------------------------------------------------------
DO $bloque$
BEGIN
  BEGIN
    -- Se pregunta antes de eliminar para que el único mensaje sea el nuestro.
    IF EXISTS (SELECT 1 FROM pg_policy
               WHERE polrelid = 'public.organizacion'::regclass AND polname = 'organizacion_separacion') THEN
      DROP POLICY organizacion_separacion ON public.organizacion;
    END IF;
    CREATE POLICY organizacion_separacion ON public.organizacion
      AS RESTRICTIVE
      FOR ALL
      TO PUBLIC
      USING (public.es_mi_organizacion(id))
      WITH CHECK (public.es_mi_organizacion(id));
  EXCEPTION WHEN OTHERS THEN
    RAISE EXCEPTION 'ERROR: no se pudo recrear la regla organizacion_separacion; quedó como estaba. Motivo del motor: % (código %).',
      SQLERRM, SQLSTATE;
  END;

  IF EXISTS (SELECT 1 FROM pg_policy
             WHERE polrelid = 'public.organizacion'::regclass
               AND polname = 'organizacion_separacion' AND NOT polpermissive) THEN
    RAISE NOTICE 'OK: regla restrictiva organizacion_separacion creada exitosamente.';
  ELSE
    RAISE EXCEPTION 'ERROR: la creación de la regla organizacion_separacion no dio error, pero no existe o no es restrictiva.';
  END IF;
END
$bloque$;


-- ------------------------------------------------------------
-- 7. Privilegios que no pasan por las reglas, fuera para las personas.
--    La plataforma da por defecto TRUNCATE, TRIGGER y REFERENCES a los roles
--    anon y authenticated (comprobado en la base local el 23/11/2026).
--    TRUNCATE vacía la tabla sin pasar por las reglas. Los permisos de leer y
--    escribir los da HU-02.1 junto con las reglas por rol.
-- ------------------------------------------------------------
DO $bloque$
BEGIN
  BEGIN
    REVOKE TRUNCATE, TRIGGER, REFERENCES ON public.organizacion FROM anon, authenticated;
  EXCEPTION WHEN OTHERS THEN
    RAISE EXCEPTION 'ERROR: no se pudieron quitar los privilegios de public.organizacion a las personas. Motivo del motor: % (código %).',
      SQLERRM, SQLSTATE;
  END;

  IF EXISTS (SELECT 1 FROM (VALUES ('anon'), ('authenticated')) AS r(rol)
             WHERE has_table_privilege(r.rol, 'public.organizacion', 'TRUNCATE')
                OR has_table_privilege(r.rol, 'public.organizacion', 'TRIGGER')
                OR has_table_privilege(r.rol, 'public.organizacion', 'REFERENCES')) THEN
    RAISE EXCEPTION 'ERROR: anon o authenticated conservan TRUNCATE, TRIGGER o REFERENCES sobre public.organizacion.';
  ELSE
    RAISE NOTICE 'OK: las personas no pueden vaciar public.organizacion ni colgarle disparadores o llaves.';
  END IF;
END
$bloque$;

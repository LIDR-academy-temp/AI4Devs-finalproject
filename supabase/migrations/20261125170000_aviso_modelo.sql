-- ============================================================
-- MIGRACIÓN 20261125170000_aviso_modelo — HU-06.1 (tramo 4)
-- Origen: openspec/specs/aviso-inicio/spec.md, sección «Datos» (tablas
-- cliente, asignacion y aviso_inicio) y requisitos «La asignación es
-- coherente en la base» (días laborables), «Un aviso por asignación y día»
-- (HU-06.CA-3) y «El aviso no se edita ni se quita» (HU-06.CA-13);
-- HU-06.CA-12 (la zona horaria es la del cliente). Separación por
-- organización: openspec/specs/acceso/spec.md, «Separación por organización
-- en la base».
-- Parte de openspec/plantillas/migracion-controlada.sql: cada objeto en su
-- bloque, con mensajes nuestros de éxito y de error.
-- Validación 1 a 1: supabase/validaciones/20261125170000_aviso_modelo.sql.
-- Pruebas con datos: tests/base/prueba-aviso-modelo.py.
--
-- QUÉ CREA
--   1. public.dias_laborables_validos(smallint[]): sí o no, una lista de
--      días de 1 (lunes) a 7 (domingo), con al menos uno, sin repetidos ni
--      nulos y de una dimensión. La usa la constraint de dias_laborables.
--   2. public.cliente, con sus constraints en la misma sentencia.
--   3. public.asignacion, con sus constraints en la misma sentencia.
--   4. public.aviso_inicio, con sus constraints en la misma sentencia.
--   5. public.impedir_cambio_de_aviso() y sus dos disparadores: nadie edita,
--      quita ni vacía un aviso, en toda escritura y con cualquier rol, también
--      el dueño de la tabla. Hasta ahí llega: un disparador no impide que el
--      dueño lo apague o lo quite antes de escribir, porque ALTER TABLE es
--      suyo. Ese dueño es el rol de las migraciones, que el sistema en
--      servicio no usa (caso P11 de tests/base/prueba-aviso-modelo.py).
--   6. Reglas de la base activadas y forzadas en las tres tablas.
--   7. Regla restrictiva de separación en cada una.
--   8. Privilegios: las personas pierden TRUNCATE, TRIGGER y REFERENCES en
--      las tres; en aviso_inicio, también la credencial del sistema.
--
-- LÍMITES (lo que la sección «Datos» pide y este ticket no construye)
--   - Los roles de la asignación —el consultor con el rol consultor, el
--     supervisor con el rol supervisor, y no quitar esos roles mientras haya
--     una asignación sin terminar, con sus candados— necesitan usuario_rol,
--     que crea HU-02.1. Van en HU-02.1.
--   - El disparador que pone en aviso_inicio la hora, la fecha y la
--     clasificación, y el rol propio de la operación de registro, el único
--     con permiso de insertar, son de HU-06.3. Hasta entonces nadie en
--     servicio inserta avisos: ni las personas ni la credencial del sistema
--     tienen ese permiso. Solo el dueño de la tabla, que usan las migraciones
--     y las pruebas.
--   - Las reglas por rol (quién ve qué asignación, qué cliente y qué aviso)
--     y el permiso de leer son de HU-02.1. Con solo la regla restrictiva, las
--     personas no ven nada de estas tablas.
-- ============================================================


-- ------------------------------------------------------------
-- 1. public.dias_laborables_validos(smallint[]) — recreable.
--    Inmutable para poder usarla en una constraint.
-- ------------------------------------------------------------
DO $bloque$
BEGIN
  BEGIN
    CREATE OR REPLACE FUNCTION public.dias_laborables_validos(dias smallint[])
      RETURNS boolean
      LANGUAGE sql
      IMMUTABLE
      SET search_path = ''
    AS $fn$
      SELECT coalesce(
               array_ndims(dias) = 1
               AND cardinality(dias) BETWEEN 1 AND 7
               AND array_position(dias, NULL) IS NULL
               AND dias <@ ARRAY[1, 2, 3, 4, 5, 6, 7]::smallint[]
               AND (SELECT count(DISTINCT d) FROM unnest(dias) AS d) = cardinality(dias),
             false);
    $fn$;
  EXCEPTION WHEN OTHERS THEN
    RAISE EXCEPTION 'ERROR: no se pudo crear public.dias_laborables_validos(smallint[]). Motivo del motor: % (código %).',
      SQLERRM, SQLSTATE;
  END;

  IF to_regprocedure('public.dias_laborables_validos(smallint[])') IS NOT NULL THEN
    RAISE NOTICE 'OK: función public.dias_laborables_validos(smallint[]) creada exitosamente.';
  ELSE
    RAISE EXCEPTION 'ERROR: la creación de public.dias_laborables_validos(smallint[]) no dio error, pero la función no existe.';
  END IF;
END
$bloque$;


-- ------------------------------------------------------------
-- 2. public.cliente — tabla: si ya existe, es anomalía y se aborta.
-- ------------------------------------------------------------
DO $bloque$
BEGIN
  IF to_regclass('public.cliente') IS NOT NULL THEN
    RAISE EXCEPTION 'ABORTA: public.cliente ya existe. Anomalía — no se crea sobre datos existentes.';
  END IF;

  BEGIN
    CREATE TABLE public.cliente (
      id              uuid NOT NULL DEFAULT gen_random_uuid(),
      organizacion_id uuid NOT NULL,
      alias           text NOT NULL,
      zona_horaria    text NOT NULL,
      CONSTRAINT cliente_pkey PRIMARY KEY (id),
      CONSTRAINT cliente_organizacion_id_fkey FOREIGN KEY (organizacion_id) REFERENCES public.organizacion (id),
      CONSTRAINT cliente_organizacion_id_alias_key UNIQUE (organizacion_id, alias),
      CONSTRAINT cliente_zona_horaria_check CHECK (public.es_zona_horaria(zona_horaria)),
      CONSTRAINT cliente_id_organizacion_id_key UNIQUE (id, organizacion_id)
    );
  EXCEPTION WHEN OTHERS THEN
    RAISE EXCEPTION 'ERROR: no se pudo crear public.cliente. Motivo del motor: % (código %).',
      SQLERRM, SQLSTATE;
  END;

  IF to_regclass('public.cliente') IS NOT NULL THEN
    RAISE NOTICE 'OK: public.cliente creada exitosamente.';
  ELSE
    RAISE EXCEPTION 'ERROR: la creación de public.cliente no dio error, pero la tabla no existe.';
  END IF;
END
$bloque$;


-- ------------------------------------------------------------
-- 3. public.asignacion — tabla: si ya existe, se aborta. Consultor,
--    supervisor y cliente con llaves compuestas con organizacion_id: los
--    tres son de la organización de la asignación.
-- ------------------------------------------------------------
DO $bloque$
BEGIN
  IF to_regclass('public.asignacion') IS NOT NULL THEN
    RAISE EXCEPTION 'ABORTA: public.asignacion ya existe. Anomalía — no se crea sobre datos existentes.';
  END IF;

  BEGIN
    CREATE TABLE public.asignacion (
      id              uuid       NOT NULL DEFAULT gen_random_uuid(),
      organizacion_id uuid       NOT NULL,
      consultor_id    uuid       NOT NULL,
      supervisor_id   uuid       NOT NULL,
      cliente_id      uuid       NOT NULL,
      inicio          date       NOT NULL,
      fin             date,
      hora_inicio     time       NOT NULL,
      hora_fin        time       NOT NULL,
      dias_laborables smallint[] NOT NULL DEFAULT '{1,2,3,4,5}'::smallint[],
      CONSTRAINT asignacion_pkey PRIMARY KEY (id),
      CONSTRAINT asignacion_consultor_fkey FOREIGN KEY (consultor_id, organizacion_id)
        REFERENCES public.usuario (id, organizacion_id),
      CONSTRAINT asignacion_supervisor_fkey FOREIGN KEY (supervisor_id, organizacion_id)
        REFERENCES public.usuario (id, organizacion_id),
      CONSTRAINT asignacion_cliente_fkey FOREIGN KEY (cliente_id, organizacion_id)
        REFERENCES public.cliente (id, organizacion_id),
      CONSTRAINT asignacion_fin_check CHECK (fin IS NULL OR fin >= inicio),
      CONSTRAINT asignacion_horario_check CHECK (hora_fin > hora_inicio),
      CONSTRAINT asignacion_dias_laborables_check CHECK (public.dias_laborables_validos(dias_laborables)),
      CONSTRAINT asignacion_supervisor_distinto_check CHECK (supervisor_id <> consultor_id),
      CONSTRAINT asignacion_id_organizacion_id_key UNIQUE (id, organizacion_id)
    );
  EXCEPTION WHEN OTHERS THEN
    RAISE EXCEPTION 'ERROR: no se pudo crear public.asignacion. Motivo del motor: % (código %).',
      SQLERRM, SQLSTATE;
  END;

  IF to_regclass('public.asignacion') IS NOT NULL THEN
    RAISE NOTICE 'OK: public.asignacion creada exitosamente.';
  ELSE
    RAISE EXCEPTION 'ERROR: la creación de public.asignacion no dio error, pero la tabla no existe.';
  END IF;
END
$bloque$;


-- ------------------------------------------------------------
-- 4. public.aviso_inicio — tabla: si ya existe, se aborta. Un aviso por
--    asignación y día (HU-06.CA-3). minutos_retraso admite nulo: nulo es
--    puntual, un número es llegada tardía.
-- ------------------------------------------------------------
DO $bloque$
BEGIN
  IF to_regclass('public.aviso_inicio') IS NOT NULL THEN
    RAISE EXCEPTION 'ABORTA: public.aviso_inicio ya existe. Anomalía — no se crea sobre datos existentes.';
  END IF;

  BEGIN
    CREATE TABLE public.aviso_inicio (
      id              uuid        NOT NULL DEFAULT gen_random_uuid(),
      organizacion_id uuid        NOT NULL,
      asignacion_id   uuid        NOT NULL,
      fecha           date        NOT NULL,
      recibido_en     timestamptz NOT NULL,
      minutos_retraso integer,
      CONSTRAINT aviso_inicio_pkey PRIMARY KEY (id),
      CONSTRAINT aviso_inicio_asignacion_fkey FOREIGN KEY (asignacion_id, organizacion_id)
        REFERENCES public.asignacion (id, organizacion_id),
      CONSTRAINT aviso_inicio_asignacion_id_fecha_key UNIQUE (asignacion_id, fecha)
    );
  EXCEPTION WHEN OTHERS THEN
    RAISE EXCEPTION 'ERROR: no se pudo crear public.aviso_inicio. Motivo del motor: % (código %).',
      SQLERRM, SQLSTATE;
  END;

  IF to_regclass('public.aviso_inicio') IS NOT NULL THEN
    RAISE NOTICE 'OK: public.aviso_inicio creada exitosamente.';
  ELSE
    RAISE EXCEPTION 'ERROR: la creación de public.aviso_inicio no dio error, pero la tabla no existe.';
  END IF;
END
$bloque$;


-- ------------------------------------------------------------
-- 5. El aviso no se edita ni se quita (HU-06.CA-13) — recreable. Corre con
--    los permisos de quien escribe y rechaza siempre: no depende de quién.
--    Uno por fila (editar o quitar) y uno por sentencia (vaciar la tabla).
-- ------------------------------------------------------------
DO $bloque$
BEGIN
  BEGIN
    CREATE OR REPLACE FUNCTION public.impedir_cambio_de_aviso()
      RETURNS trigger
      LANGUAGE plpgsql
      SET search_path = ''
    AS $fn$
    BEGIN
      RAISE EXCEPTION 'El aviso no se edita ni se quita: es la evidencia de puntualidad (HU-06.CA-13). Orden rechazada: %.', TG_OP;
    END;
    $fn$;
    REVOKE ALL ON FUNCTION public.impedir_cambio_de_aviso() FROM PUBLIC, anon, authenticated;

    IF EXISTS (SELECT 1 FROM pg_trigger
               WHERE tgrelid = 'public.aviso_inicio'::regclass AND tgname = 'aviso_inicio_no_se_cambia') THEN
      DROP TRIGGER aviso_inicio_no_se_cambia ON public.aviso_inicio;
    END IF;
    CREATE TRIGGER aviso_inicio_no_se_cambia
      BEFORE UPDATE OR DELETE ON public.aviso_inicio
      FOR EACH ROW EXECUTE FUNCTION public.impedir_cambio_de_aviso();

    IF EXISTS (SELECT 1 FROM pg_trigger
               WHERE tgrelid = 'public.aviso_inicio'::regclass AND tgname = 'aviso_inicio_no_se_vacia') THEN
      DROP TRIGGER aviso_inicio_no_se_vacia ON public.aviso_inicio;
    END IF;
    CREATE TRIGGER aviso_inicio_no_se_vacia
      BEFORE TRUNCATE ON public.aviso_inicio
      FOR EACH STATEMENT EXECUTE FUNCTION public.impedir_cambio_de_aviso();
  EXCEPTION WHEN OTHERS THEN
    RAISE EXCEPTION 'ERROR: no se pudo crear el bloqueo de cambios del aviso. Motivo del motor: % (código %).',
      SQLERRM, SQLSTATE;
  END;

  IF (SELECT count(*) FROM pg_trigger
      WHERE tgrelid = 'public.aviso_inicio'::regclass
        AND tgname IN ('aviso_inicio_no_se_cambia', 'aviso_inicio_no_se_vacia') AND tgenabled = 'O') = 2 THEN
    RAISE NOTICE 'OK: disparadores aviso_inicio_no_se_cambia y aviso_inicio_no_se_vacia creados exitosamente.';
  ELSE
    RAISE EXCEPTION 'ERROR: la creación del bloqueo de cambios del aviso no dio error, pero falta un disparador o no está activo.';
  END IF;
END
$bloque$;


-- ------------------------------------------------------------
-- 6. Reglas de la base: activadas y forzadas también para el dueño.
-- ------------------------------------------------------------
DO $bloque$
DECLARE
  tabla text;
BEGIN
  FOREACH tabla IN ARRAY ARRAY['public.cliente', 'public.asignacion', 'public.aviso_inicio'] LOOP
    BEGIN
      EXECUTE format('ALTER TABLE %s ENABLE ROW LEVEL SECURITY', tabla);
      EXECUTE format('ALTER TABLE %s FORCE ROW LEVEL SECURITY', tabla);
    EXCEPTION WHEN OTHERS THEN
      RAISE EXCEPTION 'ERROR: no se pudieron activar y forzar las reglas de %. Motivo del motor: % (código %).',
        tabla, SQLERRM, SQLSTATE;
    END;
    IF EXISTS (SELECT 1 FROM pg_class
               WHERE oid = tabla::regclass AND relrowsecurity AND relforcerowsecurity) THEN
      RAISE NOTICE 'OK: reglas de % activadas y forzadas.', tabla;
    ELSE
      RAISE EXCEPTION 'ERROR: las reglas de % no quedaron activadas y forzadas.', tabla;
    END IF;
  END LOOP;
END
$bloque$;


-- ------------------------------------------------------------
-- 7. Regla restrictiva de separación en cada tabla — recreable: se elimina
--    y se crea en el mismo bloque, para que no exista el estado «sin regla».
-- ------------------------------------------------------------
DO $bloque$
DECLARE
  t text;
  regla text;
BEGIN
  FOREACH t IN ARRAY ARRAY['cliente', 'asignacion', 'aviso_inicio'] LOOP
    regla := t || '_separacion';
    BEGIN
      IF EXISTS (SELECT 1 FROM pg_policy
                 WHERE polrelid = format('public.%I', t)::regclass AND polname = regla) THEN
        EXECUTE format('DROP POLICY %I ON public.%I', regla, t);
      END IF;
      EXECUTE format(
        'CREATE POLICY %I ON public.%I AS RESTRICTIVE FOR ALL TO PUBLIC '
        'USING (public.es_mi_organizacion(organizacion_id)) '
        'WITH CHECK (public.es_mi_organizacion(organizacion_id))', regla, t);
    EXCEPTION WHEN OTHERS THEN
      RAISE EXCEPTION 'ERROR: no se pudo recrear la regla %; quedó como estaba. Motivo del motor: % (código %).',
        regla, SQLERRM, SQLSTATE;
    END;
    IF EXISTS (SELECT 1 FROM pg_policy
               WHERE polrelid = format('public.%I', t)::regclass AND polname = regla AND NOT polpermissive) THEN
      RAISE NOTICE 'OK: regla restrictiva % creada exitosamente.', regla;
    ELSE
      RAISE EXCEPTION 'ERROR: la creación de la regla % no dio error, pero no existe o no es restrictiva.', regla;
    END IF;
  END LOOP;
END
$bloque$;


-- ------------------------------------------------------------
-- 8. Privilegios que no pasan por las reglas, fuera para las personas. En
--    aviso_inicio, también para la credencial del sistema: vaciar la tabla
--    quitaría los avisos (HU-06.CA-13, «por cualquier vía»).
-- ------------------------------------------------------------
DO $bloque$
BEGIN
  BEGIN
    REVOKE TRUNCATE, TRIGGER, REFERENCES ON public.cliente, public.asignacion, public.aviso_inicio
      FROM anon, authenticated;
    REVOKE ALL ON public.aviso_inicio FROM service_role;
  EXCEPTION WHEN OTHERS THEN
    RAISE EXCEPTION 'ERROR: no se pudieron quitar los privilegios de cliente, asignacion y aviso_inicio. Motivo del motor: % (código %).',
      SQLERRM, SQLSTATE;
  END;

  IF EXISTS (SELECT 1
             FROM (VALUES ('anon'), ('authenticated')) AS r(rol),
                  (VALUES ('public.cliente'), ('public.asignacion'), ('public.aviso_inicio')) AS t(tabla),
                  (VALUES ('TRUNCATE'), ('TRIGGER'), ('REFERENCES')) AS p(priv)
             WHERE has_table_privilege(r.rol, t.tabla, p.priv))
     OR EXISTS (SELECT 1
                FROM (VALUES ('SELECT'), ('INSERT'), ('UPDATE'), ('DELETE'), ('TRUNCATE'), ('TRIGGER'),
                             ('REFERENCES')) AS p(priv)
                WHERE has_table_privilege('service_role', 'public.aviso_inicio', p.priv)) THEN
    RAISE EXCEPTION 'ERROR: quedan privilegios que no pasan por las reglas sobre cliente, asignacion o aviso_inicio.';
  ELSE
    RAISE NOTICE 'OK: las personas no pueden vaciar estas tablas ni colgarles disparadores o llaves; la credencial del sistema no toca aviso_inicio.';
  END IF;
END
$bloque$;

-- ============================================================
-- MIGRACIÓN 20261125185000_vigencia_del_pase — HU-01.2 (tramo 4),
-- correcciones de la ronda 1 de revisión adversarial del tramo.
-- Origen: openspec/specs/acceso/spec.md, requisito «Sesión vigente»
-- (HU-01.CA-6; D-69, D-104, D-105). Hallazgos E y G de la ronda.
-- Parte de openspec/plantillas/migracion-controlada.sql: cada objeto en su
-- bloque, con mensajes nuestros de éxito y de error.
-- Validación 1 a 1: supabase/validaciones/20261125185000_vigencia_del_pase.sql.
-- Pruebas con datos: tests/base/prueba-sesion.py (N14, N15, N16 y P8).
--
-- POR QUÉ UNA MIGRACIÓN NUEVA
--   Las dos funciones nacieron en 20261125033000_usuario (tramo 3), que ya
--   está unida a la entrega: una migración aplicada no se edita. El código
--   cambia a la vez, en lib/sesion/reglas.ts: las dos capas tienen que decir
--   lo mismo sobre la vigencia del pase.
--
-- QUÉ CAMBIA
--   1. Cuerpo nuevo de public.dentro_del_plazo(entrada, dias, ahora): una
--      entrada posterior a la hora de la petición responde «no». Antes solo
--      se comprobaba el límite de arriba, así que un pase con el momento de
--      entrada en el futuro —un reloj adelantado en el servicio, o un cambio
--      de formato— alargaba la vigencia tanto como el adelanto (hallazgo G).
--      Sin tolerancia de desfase: ante la duda, la sesión vence.
--   2. Cuerpo nuevo de public.es_mi_organizacion(uuid): si alguna entrada con
--      contraseña del pase trae un momento que no se puede leer, no hay
--      momento de entrada y la sesión vence (D-105, hallazgo E). Antes esa
--      entrada se descartaba como si no existiera y valía la más antigua de
--      las demás, que puede ser posterior: no se sabía cuál era la más
--      antigua y la vigencia podía contarse desde la equivocada.
--
-- LO QUE NO CAMBIA (el objeto completo, G6 paso 6)
--   - Las dos siguen siendo STABLE, cada una por su razón.
--     es_mi_organizacion lo necesita: lee la base y el pase de la petición, y
--     la hora la toma del inicio de la sentencia (D-102), no del reloj en
--     curso. dentro_del_plazo no lee nada ni mira ningún reloj —recibe `ahora`
--     como parámetro— y podría ser IMMUTABLE; se queda STABLE como la creó
--     20261125033000_usuario, porque esta migración corrige su regla y no sus
--     propiedades (revisión interna de la ronda 1 del tramo 4).
--   - dentro_del_plazo sigue siendo de su invocador y sin permiso para anon
--     ni authenticated: solo la llama es_mi_organizacion. El REVOKE se repite
--     aquí, aunque CREATE OR REPLACE conserva los permisos, para que quede
--     escrito junto al cuerpo que lo necesita. No hace a la migración
--     independiente: los dos bloques abortan con mensaje nuestro si las
--     funciones no existen, así que depende de la anterior por diseño.
--   - es_mi_organizacion sigue con los privilegios de su dueño, search_path
--     vacío y sin ser STRICT (un nulo responde «no»), y la ejecutan anon y
--     authenticated. Su lista cerrada en supabase/comprobaciones/estructura.sql
--     no cambia: no hay funciones nuevas.
--   - El plazo se sigue contando en horas: un intervalo en días dependería de
--     la zona horaria de la sesión de la base y un día con cambio de horario
--     duraría 23 o 25 horas.
-- ============================================================


-- ------------------------------------------------------------
-- 1. public.dentro_del_plazo(entrada, dias, ahora) — recreable.
-- ------------------------------------------------------------
DO $bloque$
BEGIN
  IF to_regprocedure('public.dentro_del_plazo(timestamptz, integer, timestamptz)') IS NULL THEN
    RAISE EXCEPTION 'ABORTA: no existe public.dentro_del_plazo(timestamptz, integer, timestamptz). '
                    'Esta migración cambia su cuerpo; la crea 20261125033000_usuario.';
  END IF;

  BEGIN
    CREATE OR REPLACE FUNCTION public.dentro_del_plazo(entrada timestamptz, dias integer, ahora timestamptz)
      RETURNS boolean
      LANGUAGE sql
      STABLE
      SET search_path = ''
    AS $fn$
      -- La entrada no puede ser posterior a la hora de la petición: un pase
      -- que dice haber entrado mañana no alarga la vigencia (hallazgo G). En
      -- el instante exacto de la petición todavía vale: el límite es
      -- «después». Arriba, el plazo en horas (24 por día).
      SELECT entrada <= ahora
         AND entrada + make_interval(hours => dias * 24) >= ahora;
    $fn$;
    REVOKE ALL ON FUNCTION public.dentro_del_plazo(timestamptz, integer, timestamptz) FROM PUBLIC, anon, authenticated;
  EXCEPTION WHEN OTHERS THEN
    RAISE EXCEPTION 'ERROR: no se pudo cambiar el cuerpo de public.dentro_del_plazo. Motivo del motor: % (código %).',
      SQLERRM, SQLSTATE;
  END;

  -- No basta con que exista: se comprueba que decide bien los tres casos.
  IF public.dentro_del_plazo(now() + interval '1 hour', 30, now()) IS NOT FALSE THEN
    RAISE EXCEPTION 'ERROR: public.dentro_del_plazo acepta una entrada posterior a la hora de la petición.';
  END IF;
  IF public.dentro_del_plazo(now() - interval '1 hour', 30, now()) IS NOT TRUE THEN
    RAISE EXCEPTION 'ERROR: public.dentro_del_plazo rechaza una entrada que está dentro del plazo.';
  END IF;
  IF public.dentro_del_plazo(now() - interval '31 days', 30, now()) IS NOT FALSE THEN
    RAISE EXCEPTION 'ERROR: public.dentro_del_plazo acepta una entrada con el plazo vencido.';
  END IF;
  RAISE NOTICE 'OK: cuerpo de public.dentro_del_plazo cambiado exitosamente; decide bien dentro, vencido y futuro.';
END
$bloque$;


-- ------------------------------------------------------------
-- 2. public.es_mi_organizacion(uuid) — recreable.
-- ------------------------------------------------------------
DO $bloque$
BEGIN
  IF to_regprocedure('public.es_mi_organizacion(uuid)') IS NULL THEN
    RAISE EXCEPTION 'ABORTA: no existe public.es_mi_organizacion(uuid). Esta migración cambia su cuerpo; '
                    'la crea 20261123170000_organizacion y le pone cuerpo 20261125033000_usuario.';
  END IF;

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
      -- entrada es el que el servicio anota en el pase (amr, método
      -- password); si no hay ninguno, la respuesta es «no»: ante la duda, la
      -- sesión vence. Con varias entradas con contraseña vale la más antigua
      -- (D-104), y si alguna de ellas trae un momento que no se puede leer no
      -- hay momento de entrada (D-105): no se sabría cuál es la más antigua.
      -- La hora es la del inicio de la consulta, como en sesion_abierta()
      -- (D-102). El plazo lo decide dentro_del_plazo(), que además rechaza un
      -- momento posterior a esa hora.
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
                  -- El momento se convierte a número dentro de min, y solo
                  -- cuando se puede leer: el motor calcula los agregados
                  -- aunque el CASE de fuera no use su resultado, así que un
                  -- momento ilegible daría error en vez de nulo.
                  SELECT CASE
                           WHEN count(*) FILTER (WHERE (a ->> 'timestamp') ~ '^[0-9]{1,12}$') <> count(*)
                             THEN NULL
                           ELSE min((CASE WHEN (a ->> 'timestamp') ~ '^[0-9]{1,12}$'
                                          THEN a ->> 'timestamp' END)::bigint)
                         END
                  FROM jsonb_array_elements(
                         CASE WHEN jsonb_typeof(auth.jwt() -> 'amr') = 'array'
                              THEN auth.jwt() -> 'amr' ELSE '[]'::jsonb END) a
                  WHERE jsonb_typeof(a) = 'object'
                    AND a ->> 'method' = 'password'
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
     AND (SELECT lower(prosrc) LIKE '%<> count(*)%' AND position('public.usuario' IN prosrc) > 0
          FROM pg_proc WHERE oid = 'public.es_mi_organizacion(uuid)'::regprocedure) THEN
    RAISE NOTICE 'OK: cuerpo de public.es_mi_organizacion(uuid) cambiado exitosamente; exige que toda entrada con contraseña tenga un momento legible.';
  ELSE
    RAISE EXCEPTION 'ERROR: el cambio de public.es_mi_organizacion(uuid) no dio error, pero su cuerpo no exige el momento legible de cada entrada con contraseña, o no lee public.usuario.';
  END IF;
END
$bloque$;

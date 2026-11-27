-- ============================================================
-- MIGRACIÓN 20261125164000_sesion — HU-01.2 (tramo 4)
-- Origen: openspec/specs/acceso/spec.md, requisitos «Sesión vigente» y «Reglas
-- por rol en la base» (filas usuario y organizacion: cada persona ve «la
-- propia»; «Cambia: nadie»), y decisión de diseño «Identidad ante la base»:
-- cada petición consulta la base con el pase de la persona.
-- Parte de openspec/plantillas/migracion-controlada.sql: cada objeto en su
-- bloque, con mensajes nuestros de éxito y de error.
-- Validación 1 a 1: supabase/validaciones/20261125164000_sesion.sql.
-- Pruebas con datos: tests/base/prueba-sesion.py.
--
-- POR QUÉ
--   «Sesión vigente» (lib/sesion/vigente.ts) obtiene quién pregunta leyendo,
--   con el pase de la persona, su propio usuario y el plazo de su
--   organización. Hasta aquí las personas no podían leer ninguna tabla: la
--   plataforma no les da SELECT por defecto (comprobado en la base local el
--   25/11/2026: solo TRUNCATE, REFERENCES, TRIGGER y MAINTAIN, que las
--   migraciones anteriores ya les quitan).
--
-- QUÉ CREA O CAMBIA
--   1. Concede a authenticated SELECT sobre usuario y organizacion. Solo
--      leer: ni insertar, ni editar, ni quitar.
--   2. Regla permisiva usuario_propio: cada persona ve su propio usuario.
--   3. Regla permisiva organizacion_propia: cada persona ve su propia
--      organización.
--   Las dos se suman a la regla restrictiva de separación, que sigue
--   mandando: con el usuario inactivo, la sesión cerrada o el plazo vencido,
--   la persona no ve ni su propio usuario.
--
-- LÍMITES
--   - Lo que cada rol ve además de lo propio (los supervisados, toda la
--     organización para la dirección) lo pone HU-02.1. Estas dos reglas son
--     la parte de la tabla de «Reglas por rol en la base» que vale igual
--     para todo rol, y la que HU-01.2 necesita.
--   - anon no recibe nada: sin sesión no se ve ningún dato.
-- ============================================================


-- ------------------------------------------------------------
-- 1. Leer, y solo leer, para las personas con sesión.
-- ------------------------------------------------------------
DO $bloque$
BEGIN
  BEGIN
    GRANT SELECT ON public.usuario, public.organizacion TO authenticated;
  EXCEPTION WHEN OTHERS THEN
    RAISE EXCEPTION 'ERROR: no se pudo conceder a authenticated la lectura de usuario y organizacion. Motivo del motor: % (código %).',
      SQLERRM, SQLSTATE;
  END;

  IF has_table_privilege('authenticated', 'public.usuario', 'SELECT')
     AND has_table_privilege('authenticated', 'public.organizacion', 'SELECT')
     AND NOT EXISTS (SELECT 1
                     FROM (VALUES ('public.usuario'), ('public.organizacion')) t(tabla),
                          (VALUES ('INSERT'), ('UPDATE'), ('DELETE')) p(priv)
                     WHERE has_table_privilege('authenticated', t.tabla, p.priv)) THEN
    RAISE NOTICE 'OK: authenticated puede leer usuario y organizacion, y no puede insertar, editar ni quitar.';
  ELSE
    RAISE EXCEPTION 'ERROR: los privilegios de authenticated sobre usuario y organizacion no quedaron en «solo leer».';
  END IF;
END
$bloque$;


-- ------------------------------------------------------------
-- 2. Regla permisiva usuario_propio — recreable: se elimina y se crea en el
--    mismo bloque.
-- ------------------------------------------------------------
DO $bloque$
BEGIN
  BEGIN
    IF EXISTS (SELECT 1 FROM pg_policy
               WHERE polrelid = 'public.usuario'::regclass AND polname = 'usuario_propio') THEN
      DROP POLICY usuario_propio ON public.usuario;
    END IF;
    CREATE POLICY usuario_propio ON public.usuario
      AS PERMISSIVE
      FOR SELECT
      TO authenticated
      USING (id = auth.uid());
  EXCEPTION WHEN OTHERS THEN
    RAISE EXCEPTION 'ERROR: no se pudo recrear la regla usuario_propio; quedó como estaba. Motivo del motor: % (código %).',
      SQLERRM, SQLSTATE;
  END;

  IF EXISTS (SELECT 1 FROM pg_policy
             WHERE polrelid = 'public.usuario'::regclass
               AND polname = 'usuario_propio' AND polpermissive AND polcmd = 'r') THEN
    RAISE NOTICE 'OK: regla permisiva usuario_propio creada exitosamente.';
  ELSE
    RAISE EXCEPTION 'ERROR: la creación de la regla usuario_propio no dio error, pero no existe, no es permisiva o no es solo de lectura.';
  END IF;
END
$bloque$;


-- ------------------------------------------------------------
-- 3. Regla permisiva organizacion_propia — recreable.
-- ------------------------------------------------------------
DO $bloque$
BEGIN
  BEGIN
    IF EXISTS (SELECT 1 FROM pg_policy
               WHERE polrelid = 'public.organizacion'::regclass AND polname = 'organizacion_propia') THEN
      DROP POLICY organizacion_propia ON public.organizacion;
    END IF;
    CREATE POLICY organizacion_propia ON public.organizacion
      AS PERMISSIVE
      FOR SELECT
      TO authenticated
      USING (public.es_mi_organizacion(id));
  EXCEPTION WHEN OTHERS THEN
    RAISE EXCEPTION 'ERROR: no se pudo recrear la regla organizacion_propia; quedó como estaba. Motivo del motor: % (código %).',
      SQLERRM, SQLSTATE;
  END;

  IF EXISTS (SELECT 1 FROM pg_policy
             WHERE polrelid = 'public.organizacion'::regclass
               AND polname = 'organizacion_propia' AND polpermissive AND polcmd = 'r') THEN
    RAISE NOTICE 'OK: regla permisiva organizacion_propia creada exitosamente.';
  ELSE
    RAISE EXCEPTION 'ERROR: la creación de la regla organizacion_propia no dio error, pero no existe, no es permisiva o no es solo de lectura.';
  END IF;
END
$bloque$;

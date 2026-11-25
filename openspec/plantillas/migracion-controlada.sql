-- ============================================================
-- PLANTILLA — Migración auto-verificable con CONTROL DE MENSAJES
-- ------------------------------------------------------------
-- Toda migración de supabase/migrations/ se escribe copiando esta plantilla.
--
-- Por qué: un "Success. No rows returned" prueba que NO explotó, no que quedó
-- bien; y un error del motor de la base NO es un mensaje bajo nuestro control.
-- Toda estructura se crea anticipándose, con mensajes REDACTADOS POR NOSOTROS
-- tanto en el éxito como en el aborto.
--
-- PRINCIPIO
--   1. Nunca crear a ciegas: verificar antes.
--   2. El mensaje (éxito o error) lo redactamos nosotros. Si el motor rechaza
--      una sentencia, el bloque captura el error y lo relanza con NUESTRO
--      texto, que lleva dentro el motivo y el código del motor como dato.
--   3. Confirmar explícitamente que el objeto quedó creado.
--
-- CÓMO ESTÁ HECHO
--   Cada objeto se crea dentro de UN SOLO bloque DO. Un bloque DO es una sola
--   sentencia: si algo falla dentro, todo lo que hizo el bloque se deshace.
--   Por eso el DROP y el CREATE de un índice o de una constraint van en el
--   mismo bloque: no existe el estado intermedio "borrado y sin recrear".
--
-- LÍMITES — lo que esta plantilla NO garantiza
--   - Un error de SINTAXIS en el propio fichero lo reporta el motor con su
--     texto, antes de que ningún bloque corra. Se detecta al aplicar la
--     migración en local, antes de llegar a la base compartida.
--   - Cada bloque es atómico, pero la migración COMPLETA solo lo es si quien
--     la aplica la envuelve en una transacción. Hay que confirmarlo para la
--     herramienta que se use; mientras no esté confirmado, una migración que
--     falle a la mitad deja creados los objetos de los bloques anteriores, y
--     la validación 1 a 1 es la que lo delata.
--     Probado con la herramienta de Supabase 2.109.1 el 24/11/2026, en la
--     base local, con una migración cuyo segundo bloque falla a propósito
--     (la atomicidad queda confirmada solo para los dos primeros caminos):
--       · `supabase migration up` y `supabase db reset`: no queda el objeto
--         que creó el primer bloque ni la migración registrada;
--       · `supabase start` sobre una base NUEVA (el camino de la integración
--         continua, que siempre parte de cero): detiene todo y borra la base,
--         y el paso termina en rojo. Eso no es atomicidad: es que no queda
--         base que usar, ni entera ni a medias. `start` sobre una base local
--         que ya existe no se probó: ahí no se supone nada.
--     Al cambiar de versión de la herramienta, se repite. La prueba se hizo a
--     mano y su salida no se guardó: la plantilla registra lo observado.
--   - Recrear un índice o una constraint no pierde datos, pero bloquea la
--     tabla mientras dura. En una tabla grande se planifica aparte.
--
-- CÓMO SE VE EN LA SALIDA
--   - RAISE NOTICE    -> confirmación de éxito (pestaña "Messages" del SQL
--                        Editor de Supabase; salida de `supabase db reset`).
--   - RAISE EXCEPTION -> detiene la migración, con NUESTRO texto.
--
-- En este proyecto el esquema es `public`. Reemplazar <tabla>, <idx_nombre>,
-- <constraint_nombre>, <columna> y el cuerpo de cada CREATE.
-- ============================================================


-- ============================================================
-- PATRÓN A — TABLAS (dato propio: si ya existe, es ANOMALÍA -> abortar)
-- ============================================================
DO $$
BEGIN
  -- A.1 PRE-CHECK: si existe -> mensaje NUESTRO y detener (no se toca dato).
  IF EXISTS (SELECT 1 FROM information_schema.tables
             WHERE table_schema = 'public' AND table_name = '<tabla>') THEN
    RAISE EXCEPTION 'ABORTA: public.<tabla> ya existe. Anomalía — no se crea sobre datos existentes.';
  END IF;

  -- A.2 CREAR. Si el motor la rechaza, el error sale con NUESTRO texto.
  BEGIN
    CREATE TABLE public.<tabla> (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid()
      -- ... columnas ...
    );
  EXCEPTION WHEN OTHERS THEN
    RAISE EXCEPTION 'ERROR: no se pudo crear public.<tabla>. Motivo del motor: % (código %).',
      SQLERRM, SQLSTATE;
  END;

  -- A.3 POST-CHECK: confirmar creación con mensaje NUESTRO.
  IF EXISTS (SELECT 1 FROM information_schema.tables
             WHERE table_schema = 'public' AND table_name = '<tabla>') THEN
    RAISE NOTICE 'OK: public.<tabla> creada exitosamente.';
  ELSE
    RAISE EXCEPTION 'ERROR: la creación de public.<tabla> no dio error, pero la tabla no existe.';
  END IF;
END $$;


-- ============================================================
-- PATRÓN B — ÍNDICES / LLAVES / CONSTRAINTS (recreables: si existe, recrear)
-- No tienen dato propio. Pero mientras no existen, no protegen: por eso el
-- DROP y el CREATE van en el mismo bloque y se deshacen juntos si algo falla.
-- ============================================================

-- Ejemplo: índice
DO $$
BEGIN
  -- B.0 El nombre de un índice es único en el esquema. Si ya lo usa OTRA tabla,
  --     recrearlo borraría un índice ajeno: es anomalía y se detiene.
  IF EXISTS (SELECT 1 FROM pg_indexes
             WHERE schemaname = 'public' AND indexname = '<idx_nombre>'
               AND tablename <> '<tabla>') THEN
    RAISE EXCEPTION 'ABORTA: el índice <idx_nombre> ya existe sobre otra tabla. Anomalía — no se elimina un índice ajeno.';
  END IF;

  BEGIN
    -- B.1 Si existe -> se elimina.
    DROP INDEX IF EXISTS public.<idx_nombre>;
    -- B.2 Crear.
    CREATE INDEX <idx_nombre> ON public.<tabla> (<columna>);
  EXCEPTION WHEN OTHERS THEN
    RAISE EXCEPTION 'ERROR: no se pudo recrear el índice <idx_nombre>; quedó como estaba. Motivo del motor: % (código %).',
      SQLERRM, SQLSTATE;
  END;

  -- B.3 POST-CHECK.
  IF EXISTS (SELECT 1 FROM pg_indexes
             WHERE schemaname = 'public' AND indexname = '<idx_nombre>'
               AND tablename = '<tabla>') THEN
    RAISE NOTICE 'OK: índice <idx_nombre> creado exitosamente.';
  ELSE
    RAISE EXCEPTION 'ERROR: la creación del índice <idx_nombre> no dio error, pero el índice no existe.';
  END IF;
END $$;

-- Ejemplo: constraint (UNIQUE / FK / CHECK)
DO $$
BEGIN
  BEGIN
    -- B.1' Si existe -> se elimina.
    ALTER TABLE public.<tabla> DROP CONSTRAINT IF EXISTS <constraint_nombre>;
    -- B.2' Crear.
    ALTER TABLE public.<tabla>
      ADD CONSTRAINT <constraint_nombre> UNIQUE (<columnas>);
  EXCEPTION WHEN OTHERS THEN
    RAISE EXCEPTION 'ERROR: no se pudo recrear la constraint <constraint_nombre>; quedó como estaba. Motivo del motor: % (código %).',
      SQLERRM, SQLSTATE;
  END;

  -- B.3' POST-CHECK.
  IF EXISTS (SELECT 1 FROM pg_constraint
             WHERE conname = '<constraint_nombre>'
               AND conrelid = 'public.<tabla>'::regclass) THEN
    RAISE NOTICE 'OK: constraint <constraint_nombre> creada exitosamente.';
  ELSE
    RAISE EXCEPTION 'ERROR: la creación de la constraint <constraint_nombre> no dio error, pero no existe.';
  END IF;
END $$;


-- ============================================================
-- CIERRE — VALIDACIÓN 1 A 1, DE SOLO LECTURA
-- Va en un fichero aparte, supabase/validaciones/<misma-numeración>.sql,
-- para poder correrla en cualquier momento sin tocar nada.
--
-- No basta con que el objeto EXISTA: un índice sobre la columna equivocada
-- también existe. Por cada objeto van dos filas: que está, y que está HECHO
-- como se pidió (columnas con su tipo, definición del índice, definición de
-- la constraint). El valor esperado se copia de la spec, no de la base.
-- ============================================================
-- WITH checks AS (
--   SELECT 1 AS paso, 'tabla public.<tabla> existe' AS componente, '1' AS esperado,
--          (SELECT count(*) FROM information_schema.tables
--            WHERE table_schema = 'public' AND table_name = '<tabla>')::text AS encontrado
--   UNION ALL
--   SELECT 2, 'columnas de public.<tabla> (nombre:tipo:admite nulo)',
--          'id:uuid:NO, <columna>:text:NO',
--          (SELECT string_agg(column_name || ':' || data_type || ':' || is_nullable, ', '
--                             ORDER BY ordinal_position)
--             FROM information_schema.columns
--            WHERE table_schema = 'public' AND table_name = '<tabla>')
--   UNION ALL
--   SELECT 3, 'índice <idx_nombre> existe', '1',
--          (SELECT count(*) FROM pg_indexes
--            WHERE schemaname = 'public' AND indexname = '<idx_nombre>')::text
--   UNION ALL
--   SELECT 4, 'definición del índice <idx_nombre>',
--          'CREATE INDEX <idx_nombre> ON public.<tabla> USING btree (<columna>)',
--          (SELECT indexdef FROM pg_indexes
--            WHERE schemaname = 'public' AND indexname = '<idx_nombre>')
--   UNION ALL
--   SELECT 5, 'constraint <constraint_nombre> existe', '1',
--          (SELECT count(*) FROM pg_constraint
--            WHERE conname = '<constraint_nombre>'
--              AND conrelid = 'public.<tabla>'::regclass)::text
--   UNION ALL
--   SELECT 6, 'definición de la constraint <constraint_nombre>',
--          'UNIQUE (<columnas>)',
--          (SELECT pg_get_constraintdef(oid) FROM pg_constraint
--            WHERE conname = '<constraint_nombre>'
--              AND conrelid = 'public.<tabla>'::regclass)
-- )
-- SELECT paso, componente, esperado, coalesce(encontrado, '(no existe)') AS encontrado,
--        CASE WHEN esperado = encontrado THEN 'OK' ELSE 'FALLA' END AS estado
-- FROM checks ORDER BY paso;

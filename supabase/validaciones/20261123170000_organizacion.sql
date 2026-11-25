-- ============================================================
-- VALIDACIÓN 1 A 1, DE SOLO LECTURA — 20261123170000_organizacion.sql
-- HU-03.1 · openspec/specs/acceso/spec.md (sección «Datos» y requisito
-- «Separación por organización en la base») · D-100.
--
-- Una fila por comprobación: objeto · esperado · encontrado · estado.
-- No basta con que el objeto exista: se comprueba que está hecho como dice
-- la spec (columnas, tipos, nulos, valores por defecto, definición de cada
-- constraint y de la regla). El esperado se copió de la spec, no de la base.
--
-- No cambia nada. Se corre con scripts/base/correr-validaciones.py, que falla
-- si alguna fila no dice OK o si el fichero no devuelve ninguna fila.
--
-- Lo que no comprueba: el cuerpo de es_mi_organizacion, que HU-01.1 cambia
-- en el tramo 3 (D-100). Lo que hace se prueba con datos en
-- tests/base/prueba-acceso-organizacion.py (casos N28 a N31, N33 a N36 y su
-- control P5).
-- ============================================================
set search_path = pg_catalog;

with
col as (
  select a.attname as nombre,
         format_type(a.atttypid, a.atttypmod) as tipo,
         a.attnotnull as no_nulo,
         pg_get_expr(d.adbin, d.adrelid) as por_defecto
  from pg_attribute a
  left join pg_attrdef d on d.adrelid = a.attrelid and d.adnum = a.attnum
  where a.attrelid = to_regclass('public.organizacion') and a.attnum > 0 and not a.attisdropped
),
con as (
  select conname, pg_get_constraintdef(oid) as def
  from pg_constraint where conrelid = to_regclass('public.organizacion')
),
pol as (
  select polname,
         case when polpermissive then 'permisiva' else 'restrictiva' end as clase,
         polcmd::text as orden,
         (select string_agg(case when r = 0 then 'public' else pg_get_userbyid(r)::text end, ',' order by r)
            from unnest(polroles) r) as roles,
         pg_get_expr(polqual, polrelid) as usando,
         pg_get_expr(polwithcheck, polrelid) as al_escribir
  from pg_policy where polrelid = to_regclass('public.organizacion')
),
fn as (
  select p.oid::regprocedure::text as firma,
         format_type(p.prorettype, null) as devuelve,
         case p.provolatile when 'i' then 'immutable' when 's' then 'stable' else 'volatile' end as volatilidad,
         case when p.prosecdef then 'definer' else 'invoker' end as privilegios,
         coalesce(array_to_string(p.proconfig, ','), '(ninguna)') as config,
         has_function_privilege('anon', p.oid, 'execute') as anon_ejecuta,
         has_function_privilege('authenticated', p.oid, 'execute') as auth_ejecuta
  from pg_proc p join pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'public'
),
filas(orden, objeto, esperado, encontrado) as (
  select 1, 'tabla public.organizacion', 'existe',
         case when to_regclass('public.organizacion') is null then 'no existe' else 'existe' end
  union all
  select 2, 'columnas de public.organizacion', 'id,nombre,sesion_dias,zona_horaria',
         coalesce((select string_agg(nombre, ',' order by nombre) from col), '(ninguna)')
  union all
  select 3, 'columna id', 'uuid · no nulo · por defecto gen_random_uuid()',
         coalesce((select tipo || ' · ' || case when no_nulo then 'no nulo' else 'admite nulo' end
                   || ' · por defecto ' || coalesce(por_defecto, '(ninguno)') from col where nombre = 'id'), '(no existe)')
  union all
  select 4, 'columna nombre', 'text · no nulo · por defecto (ninguno)',
         coalesce((select tipo || ' · ' || case when no_nulo then 'no nulo' else 'admite nulo' end
                   || ' · por defecto ' || coalesce(por_defecto, '(ninguno)') from col where nombre = 'nombre'), '(no existe)')
  union all
  select 5, 'columna sesion_dias', 'integer · no nulo · por defecto 30',
         coalesce((select tipo || ' · ' || case when no_nulo then 'no nulo' else 'admite nulo' end
                   || ' · por defecto ' || coalesce(por_defecto, '(ninguno)') from col where nombre = 'sesion_dias'), '(no existe)')
  union all
  select 6, 'columna zona_horaria', 'text · no nulo · por defecto (ninguno)',
         coalesce((select tipo || ' · ' || case when no_nulo then 'no nulo' else 'admite nulo' end
                   || ' · por defecto ' || coalesce(por_defecto, '(ninguno)') from col where nombre = 'zona_horaria'), '(no existe)')
  union all
  select 7, 'constraints de public.organizacion',
         'organizacion_nombre_key,organizacion_pkey,organizacion_sesion_dias_check,organizacion_zona_horaria_check',
         coalesce((select string_agg(conname, ',' order by conname) from con), '(ninguna)')
  union all
  select 8, 'constraint organizacion_pkey', 'PRIMARY KEY (id)',
         coalesce((select def from con where conname = 'organizacion_pkey'), '(no existe)')
  union all
  select 9, 'constraint organizacion_nombre_key', 'UNIQUE (nombre)',
         coalesce((select def from con where conname = 'organizacion_nombre_key'), '(no existe)')
  union all
  select 10, 'constraint organizacion_sesion_dias_check', 'CHECK ((sesion_dias > 0))',
         coalesce((select def from con where conname = 'organizacion_sesion_dias_check'), '(no existe)')
  union all
  select 11, 'constraint organizacion_zona_horaria_check', 'CHECK (public.es_zona_horaria(zona_horaria))',
         coalesce((select def from con where conname = 'organizacion_zona_horaria_check'), '(no existe)')
  union all
  select 12, 'reglas de public.organizacion', 'activadas · forzadas',
         coalesce((select case when relrowsecurity then 'activadas' else 'sin activar' end || ' · '
                          || case when relforcerowsecurity then 'forzadas' else 'sin forzar' end
                   from pg_class where oid = to_regclass('public.organizacion')), '(no existe)')
  union all
  select 13, 'reglas sobre public.organizacion', 'organizacion_separacion',
         coalesce((select string_agg(polname, ',' order by polname) from pol), '(ninguna)')
  union all
  select 14, 'regla organizacion_separacion',
         'restrictiva · * · public · public.es_mi_organizacion(id) · public.es_mi_organizacion(id)',
         coalesce((select clase || ' · ' || orden || ' · ' || roles || ' · ' || coalesce(usando, '(nada)')
                          || ' · ' || coalesce(al_escribir, '(nada)')
                   from pol where polname = 'organizacion_separacion'), '(no existe)')
  union all
  select 15, 'función public.es_zona_horaria(text)', 'boolean · immutable · invoker · search_path=""',
         coalesce((select devuelve || ' · ' || volatilidad || ' · ' || privilegios || ' · ' || config
                   from fn where firma = 'public.es_zona_horaria(text)'), '(no existe)')
  union all
  select 16, 'función public.sesion_abierta()', 'boolean · stable · definer · search_path=""',
         coalesce((select devuelve || ' · ' || volatilidad || ' · ' || privilegios || ' · ' || config
                   from fn where firma = 'public.sesion_abierta()'), '(no existe)')
  union all
  select 17, 'quién ejecuta public.sesion_abierta()', 'anon no · authenticated sí',
         coalesce((select case when anon_ejecuta then 'anon sí' else 'anon no' end || ' · '
                          || case when auth_ejecuta then 'authenticated sí' else 'authenticated no' end
                   from fn where firma = 'public.sesion_abierta()'), '(no existe)')
  union all
  select 18, 'función public.es_mi_organizacion(uuid)', 'boolean · stable · definer · search_path=""',
         coalesce((select devuelve || ' · ' || volatilidad || ' · ' || privilegios || ' · ' || config
                   from fn where firma = 'public.es_mi_organizacion(uuid)'), '(no existe)')
  union all
  select 19, 'quién ejecuta public.es_mi_organizacion(uuid)', 'anon sí · authenticated sí',
         coalesce((select case when anon_ejecuta then 'anon sí' else 'anon no' end || ' · '
                          || case when auth_ejecuta then 'authenticated sí' else 'authenticated no' end
                   from fn where firma = 'public.es_mi_organizacion(uuid)'), '(no existe)')
  union all
  -- Solo los privilegios que no pasan por las reglas: los de leer y escribir
  -- los da HU-02.1, y esta fila no debe cambiar cuando lleguen.
  select 20, 'TRUNCATE, TRIGGER y REFERENCES de las personas sobre public.organizacion',
         'anon: ninguno · authenticated: ninguno',
         case when to_regclass('public.organizacion') is null then '(no existe)' else
           (select string_agg(r.rol || ': ' || coalesce(
                     (select string_agg(p.priv, ',' order by p.priv)
                      from (values ('TRUNCATE'), ('TRIGGER'), ('REFERENCES')) p(priv)
                      where has_table_privilege(r.rol, 'public.organizacion', p.priv)), 'ninguno'),
                   ' · ' order by r.rol)
            from (values ('anon'), ('authenticated')) r(rol)) end
)
select objeto, esperado, encontrado,
       case when esperado = encontrado then 'OK' else 'FALLA' end as estado
from filas order by orden;

-- ============================================================
-- VALIDACIÓN 1 A 1, DE SOLO LECTURA — 20261125033000_usuario.sql
-- HU-01.1 · openspec/specs/acceso/spec.md (sección «Datos», requisitos «Un
-- correo, una cuenta, una organización» y «Separación por organización en la
-- base») · D-103.
--
-- Una fila por comprobación: objeto · esperado · encontrado · estado.
-- No basta con que el objeto exista: se comprueba que está hecho como dice
-- la spec (columnas, tipos, nulos, valores por defecto, definición de cada
-- constraint, del índice, de los disparadores y de la regla). El esperado se
-- copió de la spec, no de la base.
--
-- No cambia nada. Se corre con scripts/base/correr-validaciones.py, que falla
-- si alguna fila no dice OK o si el fichero no devuelve ninguna fila.
--
-- Lo que no comprueba: lo que hacen las funciones. Eso se prueba con datos
-- en tests/base/prueba-usuario.py.
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
  where a.attrelid = to_regclass('public.usuario') and a.attnum > 0 and not a.attisdropped
),
con as (
  select conname, pg_get_constraintdef(oid) as def
  from pg_constraint where conrelid = to_regclass('public.usuario')
),
pol as (
  select polname,
         case when polpermissive then 'permisiva' else 'restrictiva' end as clase,
         polcmd::text as orden,
         (select string_agg(case when r = 0 then 'public' else pg_get_userbyid(r)::text end, ',' order by r)
            from unnest(polroles) r) as roles,
         pg_get_expr(polqual, polrelid) as usando,
         pg_get_expr(polwithcheck, polrelid) as al_escribir
  from pg_policy where polrelid = to_regclass('public.usuario')
),
fn as (
  select p.oid::regprocedure::text as firma,
         format_type(p.prorettype, null) as devuelve,
         case p.provolatile when 'i' then 'immutable' when 's' then 'stable' else 'volatile' end as volatilidad,
         case when p.prosecdef then 'definer' else 'invoker' end as privilegios,
         coalesce(array_to_string(p.proconfig, ','), '(ninguna)') as config,
         case when p.proisstrict then 'strict' else 'no strict' end as estricta,
         has_function_privilege('anon', p.oid, 'execute') as anon_ejecuta,
         has_function_privilege('authenticated', p.oid, 'execute') as auth_ejecuta
  from pg_proc p join pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'public'
),
dis as (
  select t.tgrelid::regclass::text as tabla, t.tgname as nombre,
         case t.tgenabled when 'O' then 'activo' else 'no activo (' || t.tgenabled::text || ')' end as estado,
         pg_get_triggerdef(t.oid) as def
  from pg_trigger t
  where not t.tgisinternal
    and t.tgrelid in (coalesce(to_regclass('public.usuario'), 0), coalesce(to_regclass('auth.users'), 0))
),
filas(orden, objeto, esperado, encontrado) as (
  select 1, 'tabla public.usuario', 'existe',
         case when to_regclass('public.usuario') is null then 'no existe' else 'existe' end
  union all
  select 2, 'columnas de public.usuario', 'activo,correo,id,nombre,organizacion_id,telefono',
         coalesce((select string_agg(nombre, ',' order by nombre) from col), '(ninguna)')
  union all
  select 3, 'columna id', 'uuid · no nulo · por defecto (ninguno)',
         coalesce((select tipo || ' · ' || case when no_nulo then 'no nulo' else 'admite nulo' end
                   || ' · por defecto ' || coalesce(por_defecto, '(ninguno)') from col where nombre = 'id'), '(no existe)')
  union all
  select 4, 'columna organizacion_id', 'uuid · no nulo · por defecto (ninguno)',
         coalesce((select tipo || ' · ' || case when no_nulo then 'no nulo' else 'admite nulo' end
                   || ' · por defecto ' || coalesce(por_defecto, '(ninguno)') from col where nombre = 'organizacion_id'), '(no existe)')
  union all
  select 5, 'columna nombre', 'text · no nulo · por defecto (ninguno)',
         coalesce((select tipo || ' · ' || case when no_nulo then 'no nulo' else 'admite nulo' end
                   || ' · por defecto ' || coalesce(por_defecto, '(ninguno)') from col where nombre = 'nombre'), '(no existe)')
  union all
  select 6, 'columna correo', 'text · no nulo · por defecto (ninguno)',
         coalesce((select tipo || ' · ' || case when no_nulo then 'no nulo' else 'admite nulo' end
                   || ' · por defecto ' || coalesce(por_defecto, '(ninguno)') from col where nombre = 'correo'), '(no existe)')
  union all
  select 7, 'columna telefono', 'text · no nulo · por defecto (ninguno)',
         coalesce((select tipo || ' · ' || case when no_nulo then 'no nulo' else 'admite nulo' end
                   || ' · por defecto ' || coalesce(por_defecto, '(ninguno)') from col where nombre = 'telefono'), '(no existe)')
  union all
  select 8, 'columna activo', 'boolean · no nulo · por defecto true',
         coalesce((select tipo || ' · ' || case when no_nulo then 'no nulo' else 'admite nulo' end
                   || ' · por defecto ' || coalesce(por_defecto, '(ninguno)') from col where nombre = 'activo'), '(no existe)')
  union all
  select 9, 'constraints de public.usuario',
         'usuario_id_organizacion_id_key,usuario_organizacion_id_fkey,usuario_pkey',
         coalesce((select string_agg(conname, ',' order by conname) from con), '(ninguna)')
  union all
  select 10, 'constraint usuario_pkey', 'PRIMARY KEY (id)',
         coalesce((select def from con where conname = 'usuario_pkey'), '(no existe)')
  union all
  select 11, 'constraint usuario_organizacion_id_fkey', 'FOREIGN KEY (organizacion_id) REFERENCES public.organizacion(id)',
         coalesce((select def from con where conname = 'usuario_organizacion_id_fkey'), '(no existe)')
  union all
  select 12, 'constraint usuario_id_organizacion_id_key', 'UNIQUE (id, organizacion_id)',
         coalesce((select def from con where conname = 'usuario_id_organizacion_id_key'), '(no existe)')
  union all
  select 13, 'índice usuario_correo_key',
         'CREATE UNIQUE INDEX usuario_correo_key ON public.usuario USING btree (lower(correo))',
         coalesce((select pg_get_indexdef(to_regclass('public.usuario_correo_key'))), '(no existe)')
  union all
  select 14, 'reglas de public.usuario', 'activadas · forzadas',
         coalesce((select case when relrowsecurity then 'activadas' else 'sin activar' end || ' · '
                          || case when relforcerowsecurity then 'forzadas' else 'sin forzar' end
                   from pg_class where oid = to_regclass('public.usuario')), '(no existe)')
  union all
  select 15, 'reglas restrictivas sobre public.usuario', 'usuario_separacion',
         coalesce((select string_agg(polname, ',' order by polname) from pol where clase = 'restrictiva'), '(ninguna)')
  union all
  select 16, 'regla usuario_separacion',
         'restrictiva · * · public · public.es_mi_organizacion(organizacion_id) · public.es_mi_organizacion(organizacion_id)',
         coalesce((select clase || ' · ' || orden || ' · ' || roles || ' · ' || coalesce(usando, '(nada)')
                          || ' · ' || coalesce(al_escribir, '(nada)')
                   from pol where polname = 'usuario_separacion'), '(no existe)')
  union all
  select 17, 'función public.comprobar_correo_de_cuenta()', 'trigger · volatile · invoker · search_path=""',
         coalesce((select devuelve || ' · ' || volatilidad || ' · ' || privilegios || ' · ' || config
                   from fn where firma = 'public.comprobar_correo_de_cuenta()'), '(no existe)')
  union all
  select 18, 'disparadores de public.usuario', 'usuario_correo_de_cuenta · activo',
         coalesce((select string_agg(nombre || ' · ' || estado, ', ' order by nombre)
                   from dis where tabla = 'public.usuario'), '(ninguno)')
  union all
  select 19, 'disparador usuario_correo_de_cuenta',
         'CREATE TRIGGER usuario_correo_de_cuenta BEFORE INSERT OR UPDATE ON public.usuario FOR EACH ROW EXECUTE FUNCTION public.comprobar_correo_de_cuenta()',
         coalesce((select def from dis where nombre = 'usuario_correo_de_cuenta'), '(no existe)')
  union all
  select 20, 'función public.impedir_cambio_de_correo_propio()', 'trigger · volatile · invoker · search_path=""',
         coalesce((select devuelve || ' · ' || volatilidad || ' · ' || privilegios || ' · ' || config
                   from fn where firma = 'public.impedir_cambio_de_correo_propio()'), '(no existe)')
  union all
  select 21, 'disparador impedir_cambio_de_correo_propio (D-103)',
         'activo · CREATE TRIGGER impedir_cambio_de_correo_propio BEFORE UPDATE ON auth.users FOR EACH ROW EXECUTE FUNCTION public.impedir_cambio_de_correo_propio()',
         coalesce((select estado || ' · ' || def from dis where nombre = 'impedir_cambio_de_correo_propio'), '(no existe)')
  union all
  select 22, 'función public.es_mi_organizacion(uuid)', 'boolean · stable · definer · search_path="" · no strict',
         coalesce((select devuelve || ' · ' || volatilidad || ' · ' || privilegios || ' · ' || config || ' · ' || estricta
                   from fn where firma = 'public.es_mi_organizacion(uuid)'), '(no existe)')
  union all
  select 23, 'quién ejecuta public.es_mi_organizacion(uuid)', 'anon sí · authenticated sí',
         coalesce((select case when anon_ejecuta then 'anon sí' else 'anon no' end || ' · '
                          || case when auth_ejecuta then 'authenticated sí' else 'authenticated no' end
                   from fn where firma = 'public.es_mi_organizacion(uuid)'), '(no existe)')
  union all
  -- Solo los privilegios que no pasan por las reglas: los de leer y escribir
  -- los dan HU-01.2 (20261125164000_sesion, leer) y HU-02.1 (cada rol), y esta
  -- fila no debe cambiar cuando lleguen.
  select 24, 'TRUNCATE, TRIGGER y REFERENCES de las personas sobre public.usuario',
         'anon: ninguno · authenticated: ninguno',
         case when to_regclass('public.usuario') is null then '(no existe)' else
           (select string_agg(r.rol || ': ' || coalesce(
                     (select string_agg(p.priv, ',' order by p.priv)
                      from (values ('TRUNCATE'), ('TRIGGER'), ('REFERENCES')) p(priv)
                      where has_table_privilege(r.rol, 'public.usuario', p.priv)), 'ninguno'),
                   ' · ' order by r.rol)
            from (values ('anon'), ('authenticated')) r(rol)) end
  union all
  select 25, 'función public.dentro_del_plazo(timestamp with time zone,integer,timestamp with time zone)',
         'boolean · stable · invoker · search_path="" · anon no · authenticated no',
         coalesce((select devuelve || ' · ' || volatilidad || ' · ' || privilegios || ' · ' || config || ' · '
                          || case when anon_ejecuta then 'anon sí' else 'anon no' end || ' · '
                          || case when auth_ejecuta then 'authenticated sí' else 'authenticated no' end
                   from fn where firma = 'public.dentro_del_plazo(timestamp with time zone,integer,timestamp with time zone)'),
                  '(no existe)')
  union all
  -- es_mi_organizacion lee usuario, cuya regla la vuelve a llamar: sin un dueño
  -- que omita las reglas entraría en recursión (revisión del tramo 3, ronda 1).
  select 26, 'dueño de las funciones con privilegios de su dueño',
         'es_mi_organizacion: omite las reglas · sesion_abierta: omite las reglas',
         coalesce((select string_agg(x.nombre || ': ' || case when r.rolsuper or r.rolbypassrls then 'omite las reglas'
                                                         else 'no las omite (' || r.rolname || ')' end,
                                     ' · ' order by x.nombre)
                   from (values ('es_mi_organizacion', 'public.es_mi_organizacion(uuid)'),
                                ('sesion_abierta', 'public.sesion_abierta()')) x(nombre, firma)
                   join pg_proc p on p.oid = to_regprocedure(x.firma)
                   join pg_roles r on r.oid = p.proowner), '(no existen)')
)
select objeto, esperado, encontrado,
       case when esperado = encontrado then 'OK' else 'FALLA' end as estado
from filas order by orden;

-- ============================================================
-- VALIDACIÓN 1 A 1, DE SOLO LECTURA — 20261125170000_aviso_modelo.sql
-- HU-06.1 · openspec/specs/aviso-inicio/spec.md (sección «Datos»: cliente,
-- asignacion y aviso_inicio; requisitos «Un aviso por asignación y día» y
-- «El aviso no se edita ni se quita») · openspec/specs/acceso/spec.md
-- («Separación por organización en la base»).
--
-- Una fila por comprobación: objeto · esperado · encontrado · estado.
-- No basta con que el objeto exista: se comprueba que está hecho como dice
-- la spec (columnas, tipos, nulos, valores por defecto, definición de cada
-- constraint, de los disparadores y de las reglas). El esperado se copió de
-- la spec, no de la base.
--
-- No cambia nada. Se corre con scripts/base/correr-validaciones.py, que falla
-- si alguna fila no dice OK o si el fichero no devuelve ninguna fila.
--
-- Lo que no comprueba: lo que hacen las constraints y los disparadores con
-- datos. Eso se prueba en tests/base/prueba-aviso-modelo.py.
-- ============================================================
set search_path = pg_catalog;

with
tablas(t) as (values ('cliente'), ('asignacion'), ('aviso_inicio')),
col as (
  select c.relname::text as tabla, a.attnum,
         a.attname || ' ' || format_type(a.atttypid, a.atttypmod)
           || case when a.attnotnull then ' no nulo' else ' admite nulo' end
           || coalesce(' por defecto ' || pg_get_expr(d.adbin, d.adrelid), '') as descripcion
  from pg_attribute a
  join pg_class c on c.oid = a.attrelid
  join pg_namespace n on n.oid = c.relnamespace and n.nspname = 'public'
  left join pg_attrdef d on d.adrelid = a.attrelid and d.adnum = a.attnum
  where c.relname in (select t from tablas) and a.attnum > 0 and not a.attisdropped
),
con as (
  select c.relname::text as tabla, k.conname::text as nombre, pg_get_constraintdef(k.oid) as def
  from pg_constraint k
  join pg_class c on c.oid = k.conrelid
  join pg_namespace n on n.oid = c.relnamespace and n.nspname = 'public'
  where c.relname in (select t from tablas)
),
-- Solo las reglas restrictivas, que son las de este ticket: las permisivas de
-- lectura por rol las agrega HU-02.1, y esta fila no debe cambiar cuando
-- lleguen (revisión del tramo 4, ronda 1, hallazgo I). Cada regla permisiva
-- nueva la comprueba la validación de su propia migración.
pol as (
  select c.relname::text as tabla, p.polname::text as nombre,
         case when p.polpermissive then 'permisiva' else 'restrictiva' end || ' · '
           || case p.polcmd when '*' then 'ALL' else p.polcmd::text end || ' · '
           || (select string_agg(case when r = 0 then 'public' else pg_get_userbyid(r)::text end, ',' order by r)
                 from unnest(p.polroles) r) || ' · '
           || coalesce(pg_get_expr(p.polqual, p.polrelid), '(nada)') || ' · '
           || coalesce(pg_get_expr(p.polwithcheck, p.polrelid), '(nada)') as def
  from pg_policy p
  join pg_class c on c.oid = p.polrelid
  join pg_namespace n on n.oid = c.relnamespace and n.nspname = 'public'
  where c.relname in (select t from tablas) and not p.polpermissive
),
fn as (
  select p.oid::regprocedure::text as firma,
         format_type(p.prorettype, null) || ' · '
           || case p.provolatile when 'i' then 'immutable' when 's' then 'stable' else 'volatile' end || ' · '
           || case when p.prosecdef then 'definer' else 'invoker' end || ' · '
           || coalesce(array_to_string(p.proconfig, ','), '(ninguna)') as def
  from pg_proc p join pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'public'
),
dis as (
  select t.tgname::text as nombre,
         case t.tgenabled when 'O' then 'activo' else 'no activo (' || t.tgenabled::text || ')' end || ' · '
           || pg_get_triggerdef(t.oid) as def
  from pg_trigger t
  where t.tgrelid = to_regclass('public.aviso_inicio') and not t.tgisinternal
),
priv as (
  select r.rol, x.tabla,
         coalesce((select string_agg(p.priv, ',' order by p.priv)
                   from (values ('SELECT'), ('INSERT'), ('UPDATE'), ('DELETE'), ('TRUNCATE'), ('TRIGGER'),
                                ('REFERENCES')) p(priv)
                   where to_regclass(x.tabla) is not null and has_table_privilege(r.rol, x.tabla, p.priv)),
                  'ninguno') as tiene
  from (values ('anon'), ('authenticated'), ('service_role')) r(rol),
       (values ('public.cliente'), ('public.asignacion'), ('public.aviso_inicio')) x(tabla)
),
-- Lo mismo para authenticated, sin contar el de leer: ese se lo da HU-02.1
-- («Reglas por rol en la base»), y esta fila no debe cambiar cuando llegue. Lo
-- que HU-02.1 no toca es escribir —la columna «Cambia» de esa tabla dice
-- «nadie» en esta entrega— ni TRUNCATE, TRIGGER y REFERENCES (CLAUDE.md §5).
-- A anon no le da nada, así que a anon se le siguen mirando los siete, leer
-- incluido (revisión interna de la ronda 1 del tramo 4: al quitar leer de
-- todos, un permiso de lectura para quien no tiene sesión dejaba de verse).
priv_sin_leer as (
  select 'authenticated'::text as rol, x.tabla,
         coalesce((select string_agg(p.priv, ',' order by p.priv)
                   from (values ('INSERT'), ('UPDATE'), ('DELETE'), ('TRUNCATE'), ('TRIGGER'),
                                ('REFERENCES')) p(priv)
                   where to_regclass(x.tabla) is not null
                     and has_table_privilege('authenticated', x.tabla, p.priv)),
                  'ninguno') as tiene
  from (values ('public.cliente'), ('public.asignacion'), ('public.aviso_inicio')) x(tabla)
),
-- Reglas permisivas que alcanzan a quien no tiene sesión: ninguna, ni ahora ni
-- después. Las de HU-02.1 son para authenticated, así que esta fila tampoco
-- debe cambiar cuando lleguen.
pol_sin_sesion as (
  select c.relname::text as tabla, p.polname::text as nombre
  from pg_policy p
  join pg_class c on c.oid = p.polrelid
  join pg_namespace n on n.oid = c.relnamespace and n.nspname = 'public'
  where c.relname in (select t from tablas) and p.polpermissive
    and exists (select 1 from unnest(p.polroles) r
                where r = 0 or pg_get_userbyid(r)::text = 'anon')
),
filas(orden, objeto, esperado, encontrado) as (
  select 1, 'tablas cliente, asignacion y aviso_inicio',
         'asignacion · aviso_inicio · cliente',
         coalesce((select string_agg(t, ' · ' order by t) from tablas
                   where to_regclass('public.' || t) is not null), '(ninguna)')
  union all
  select 2, 'columnas de public.cliente',
         'id uuid no nulo por defecto gen_random_uuid() · organizacion_id uuid no nulo · alias text no nulo · '
         'zona_horaria text no nulo',
         coalesce((select string_agg(descripcion, ' · ' order by attnum) from col where tabla = 'cliente'), '(no existe)')
  union all
  select 3, 'constraints de public.cliente',
         'cliente_id_organizacion_id_key: UNIQUE (id, organizacion_id) · '
         'cliente_organizacion_id_alias_key: UNIQUE (organizacion_id, alias) · '
         'cliente_organizacion_id_fkey: FOREIGN KEY (organizacion_id) REFERENCES public.organizacion(id) · '
         'cliente_pkey: PRIMARY KEY (id) · '
         'cliente_zona_horaria_check: CHECK (public.es_zona_horaria(zona_horaria))',
         coalesce((select string_agg(nombre || ': ' || def, ' · ' order by nombre) from con where tabla = 'cliente'),
                  '(ninguna)')
  union all
  select 4, 'columnas de public.asignacion',
         'id uuid no nulo por defecto gen_random_uuid() · organizacion_id uuid no nulo · consultor_id uuid no nulo · '
         'supervisor_id uuid no nulo · cliente_id uuid no nulo · inicio date no nulo · fin date admite nulo · '
         'hora_inicio time without time zone no nulo · hora_fin time without time zone no nulo · '
         'dias_laborables smallint[] no nulo por defecto ''{1,2,3,4,5}''::smallint[]',
         coalesce((select string_agg(descripcion, ' · ' order by attnum) from col where tabla = 'asignacion'), '(no existe)')
  union all
  select 5, 'constraints de public.asignacion',
         'asignacion_cliente_fkey: FOREIGN KEY (cliente_id, organizacion_id) REFERENCES public.cliente(id, organizacion_id) · '
         'asignacion_consultor_fkey: FOREIGN KEY (consultor_id, organizacion_id) REFERENCES public.usuario(id, organizacion_id) · '
         'asignacion_dias_laborables_check: CHECK (public.dias_laborables_validos(dias_laborables)) · '
         'asignacion_fin_check: CHECK (((fin IS NULL) OR (fin >= inicio))) · '
         'asignacion_horario_check: CHECK ((hora_fin > hora_inicio)) · '
         'asignacion_id_organizacion_id_key: UNIQUE (id, organizacion_id) · '
         'asignacion_pkey: PRIMARY KEY (id) · '
         'asignacion_supervisor_distinto_check: CHECK ((supervisor_id <> consultor_id)) · '
         'asignacion_supervisor_fkey: FOREIGN KEY (supervisor_id, organizacion_id) REFERENCES public.usuario(id, organizacion_id)',
         coalesce((select string_agg(nombre || ': ' || def, ' · ' order by nombre) from con where tabla = 'asignacion'),
                  '(ninguna)')
  union all
  select 6, 'columnas de public.aviso_inicio',
         'id uuid no nulo por defecto gen_random_uuid() · organizacion_id uuid no nulo · asignacion_id uuid no nulo · '
         'fecha date no nulo · recibido_en timestamp with time zone no nulo · minutos_retraso integer admite nulo',
         coalesce((select string_agg(descripcion, ' · ' order by attnum) from col where tabla = 'aviso_inicio'), '(no existe)')
  union all
  select 7, 'constraints de public.aviso_inicio',
         'aviso_inicio_asignacion_fkey: FOREIGN KEY (asignacion_id, organizacion_id) REFERENCES public.asignacion(id, organizacion_id) · '
         'aviso_inicio_asignacion_id_fecha_key: UNIQUE (asignacion_id, fecha) · '
         'aviso_inicio_pkey: PRIMARY KEY (id)',
         coalesce((select string_agg(nombre || ': ' || def, ' · ' order by nombre) from con where tabla = 'aviso_inicio'),
                  '(ninguna)')
  union all
  select 8, 'función public.dias_laborables_validos(smallint[])',
         'boolean · immutable · invoker · search_path=""',
         coalesce((select def from fn where firma = 'public.dias_laborables_validos(smallint[])'), '(no existe)')
  union all
  select 9, 'función public.impedir_cambio_de_aviso()',
         'trigger · volatile · invoker · search_path=""',
         coalesce((select def from fn where firma = 'public.impedir_cambio_de_aviso()'), '(no existe)')
  union all
  select 10, 'disparadores de public.aviso_inicio',
         'aviso_inicio_no_se_cambia: activo · CREATE TRIGGER aviso_inicio_no_se_cambia BEFORE DELETE OR UPDATE ON public.aviso_inicio '
         'FOR EACH ROW EXECUTE FUNCTION public.impedir_cambio_de_aviso() · '
         'aviso_inicio_no_se_vacia: activo · CREATE TRIGGER aviso_inicio_no_se_vacia BEFORE TRUNCATE ON public.aviso_inicio '
         'FOR EACH STATEMENT EXECUTE FUNCTION public.impedir_cambio_de_aviso()',
         coalesce((select string_agg(nombre || ': ' || def, ' · ' order by nombre) from dis), '(ninguno)')
  union all
  select 11, 'reglas de las tres tablas, activadas y forzadas',
         'asignacion: activadas, forzadas · aviso_inicio: activadas, forzadas · cliente: activadas, forzadas',
         coalesce((select string_agg(c.relname || ': ' || case when c.relrowsecurity then 'activadas' else 'sin activar' end
                                     || ', ' || case when c.relforcerowsecurity then 'forzadas' else 'sin forzar' end,
                                     ' · ' order by c.relname)
                   from pg_class c join pg_namespace n on n.oid = c.relnamespace and n.nspname = 'public'
                   where c.relname in (select t from tablas)), '(no existen)')
  union all
  select 12, 'reglas restrictivas sobre las tres tablas',
         'asignacion.asignacion_separacion: restrictiva · ALL · public · public.es_mi_organizacion(organizacion_id) · public.es_mi_organizacion(organizacion_id) · '
         'aviso_inicio.aviso_inicio_separacion: restrictiva · ALL · public · public.es_mi_organizacion(organizacion_id) · public.es_mi_organizacion(organizacion_id) · '
         'cliente.cliente_separacion: restrictiva · ALL · public · public.es_mi_organizacion(organizacion_id) · public.es_mi_organizacion(organizacion_id)',
         coalesce((select string_agg(tabla || '.' || nombre || ': ' || def, ' · ' order by tabla, nombre) from pol),
                  '(ninguna)')
  union all
  -- Quien no tiene sesión: nada de nada, leer incluido. Quien la tiene: sin
  -- escribir y sin TRUNCATE, TRIGGER ni REFERENCES (CLAUDE.md §5); el permiso
  -- de leer no se le mira aquí, lo da HU-02.1.
  select 13, 'privilegios de anon (todos) y de authenticated (sin contar leer) sobre las tres tablas',
         'anon public.asignacion: ninguno · anon public.aviso_inicio: ninguno · anon public.cliente: ninguno · '
         'authenticated public.asignacion: ninguno · authenticated public.aviso_inicio: ninguno · '
         'authenticated public.cliente: ninguno',
         (select string_agg(rol || ' ' || tabla || ': ' || tiene, ' · ' order by rol, tabla)
          from (select rol, tabla, tiene from priv where rol = 'anon'
                union all
                select rol, tabla, tiene from priv_sin_leer) t)
  union all
  -- La credencial del sistema no inserta avisos, ni los edita, quita o vacía
  -- (spec aviso-inicio, «Datos»): se lo niega el permiso, no la regla.
  select 14, 'privilegios de service_role sobre public.aviso_inicio',
         'ninguno',
         (select tiene from priv where rol = 'service_role' and tabla = 'public.aviso_inicio')
  union all
  select 15, 'reglas permisivas que alcanzan a quien no tiene sesión',
         '(ninguna)',
         coalesce((select string_agg(tabla || '.' || nombre, ' · ' order by tabla, nombre) from pol_sin_sesion),
                  '(ninguna)')
)
select objeto, esperado, encontrado,
       case when esperado = encontrado then 'OK' else 'FALLA' end as estado
from filas order by orden;

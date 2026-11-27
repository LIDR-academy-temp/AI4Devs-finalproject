-- ============================================================
-- VALIDACIÓN 1 A 1, DE SOLO LECTURA — 20261125164000_sesion.sql
-- HU-01.2 · openspec/specs/acceso/spec.md (requisitos «Sesión vigente» y
-- «Reglas por rol en la base»: cada persona ve su propio usuario y su propia
-- organización, y nadie los cambia).
--
-- Una fila por comprobación: objeto · esperado · encontrado · estado.
-- El esperado se copió de la spec, no de la base.
--
-- No cambia nada. Se corre con scripts/base/correr-validaciones.py, que falla
-- si alguna fila no dice OK o si el fichero no devuelve ninguna fila.
--
-- Lo que no comprueba: que las reglas dejen ver lo que deben con datos. Eso se
-- prueba en tests/base/prueba-sesion.py.
-- ============================================================
set search_path = pg_catalog;

with
pol as (
  select (select c.relname::text from pg_class c where c.oid = polrelid) as tabla, polname,
         case when polpermissive then 'permisiva' else 'restrictiva' end as clase,
         case polcmd when 'r' then 'SELECT' when 'a' then 'INSERT' when 'w' then 'UPDATE'
                     when 'd' then 'DELETE' else 'ALL' end as orden,
         (select string_agg(case when r = 0 then 'public' else pg_get_userbyid(r)::text end, ',' order by r)
            from unnest(polroles) r) as roles,
         pg_get_expr(polqual, polrelid) as usando,
         coalesce(pg_get_expr(polwithcheck, polrelid), '(nada)') as al_escribir
  from pg_policy
  where polrelid in (to_regclass('public.usuario'), to_regclass('public.organizacion'))
),
priv as (
  select r.rol, t.tabla,
         coalesce((select string_agg(p.priv, ',' order by p.priv)
                   from (values ('SELECT'), ('INSERT'), ('UPDATE'), ('DELETE')) p(priv)
                   where to_regclass(t.tabla) is not null
                     and has_table_privilege(r.rol, t.tabla, p.priv)), 'ninguno') as tiene
  from (values ('anon'), ('authenticated'), ('service_role')) r(rol),
       (values ('public.usuario'), ('public.organizacion')) t(tabla)
),
filas(orden, objeto, esperado, encontrado) as (
  select 1, 'regla usuario_propio',
         'permisiva · SELECT · authenticated · (id = auth.uid()) · (nada)',
         coalesce((select clase || ' · ' || orden || ' · ' || roles || ' · ' || usando || ' · ' || al_escribir
                   from pol where tabla = 'usuario' and polname = 'usuario_propio'), '(no existe)')
  union all
  select 2, 'regla organizacion_propia',
         'permisiva · SELECT · authenticated · public.es_mi_organizacion(id) · (nada)',
         coalesce((select clase || ' · ' || orden || ' · ' || roles || ' · ' || usando || ' · ' || al_escribir
                   from pol where tabla = 'organizacion' and polname = 'organizacion_propia'), '(no existe)')
  union all
  -- Ninguna otra regla permisiva en esta entrega: las de cada rol son de HU-02.1.
  select 3, 'reglas permisivas de usuario y organizacion',
         'organizacion: organizacion_propia · usuario: usuario_propio',
         coalesce((select string_agg(tabla || ': ' || polname, ' · ' order by tabla, polname)
                   from pol where clase = 'permisiva'), '(ninguna)')
  union all
  -- Las restrictivas de separación siguen ahí: son las que cortan al inactivo y al vencido.
  select 4, 'reglas restrictivas de usuario y organizacion',
         'organizacion: organizacion_separacion · usuario: usuario_separacion',
         coalesce((select string_agg(tabla || ': ' || polname, ' · ' order by tabla, polname)
                   from pol where clase = 'restrictiva'), '(ninguna)')
  union all
  select 5, 'privilegios de authenticated (solo leer)',
         'public.organizacion: SELECT · public.usuario: SELECT',
         (select string_agg(tabla || ': ' || tiene, ' · ' order by tabla) from priv where rol = 'authenticated')
  union all
  select 6, 'privilegios de anon (ninguno)',
         'public.organizacion: ninguno · public.usuario: ninguno',
         (select string_agg(tabla || ': ' || tiene, ' · ' order by tabla) from priv where rol = 'anon')
  union all
  -- La credencial del sistema no recibe nada aquí: omite las reglas, y leer o
  -- escribir con ella es de los datos de arranque y de la ejecución recurrente.
  select 7, 'privilegios de service_role (sin cambios: ninguno)',
         'public.organizacion: ninguno · public.usuario: ninguno',
         (select string_agg(tabla || ': ' || tiene, ' · ' order by tabla) from priv where rol = 'service_role')
)
select objeto, esperado, encontrado,
       case when esperado = encontrado then 'OK' else 'FALLA' end as estado
from filas order by orden;

-- ============================================================
-- VALIDACIÓN 1 A 1, DE SOLO LECTURA — 20261125185000_vigencia_del_pase.sql
-- HU-01.2 · openspec/specs/acceso/spec.md, requisito «Sesión vigente»
-- (D-104, D-105). Correcciones de los hallazgos E y G de la ronda 1 del
-- tramo 4.
--
-- Una fila por comprobación: objeto · esperado · encontrado · estado.
-- No basta con que la función exista: se comprueba que sigue teniendo las
-- propiedades que la hacen segura (volatilidad, de quién son los privilegios,
-- search_path, si es STRICT, quién la ejecuta) y, en dentro_del_plazo, que
-- decide bien los cuatro casos, llamándola de verdad: es STABLE y de solo
-- lectura. El esperado se copió de la spec, no de la base.
--
-- No cambia nada. Se corre con scripts/base/correr-validaciones.py, que falla
-- si alguna fila no dice OK o si el fichero no devuelve ninguna fila.
--
-- Lo que no comprueba: lo que es_mi_organizacion decide con un pase real, que
-- necesita una sesión y datos. Eso se prueba en tests/base/prueba-sesion.py
-- (N10, N11, N14, N15, N16 y los controles P5 y P8). Aquí su cuerpo se mira
-- como texto, y por eso la fila dice qué texto espera.
-- ============================================================
set search_path = pg_catalog;

with
fn as (
  select p.oid::regprocedure::text as firma,
         format_type(p.prorettype, null) as devuelve,
         case p.provolatile when 'i' then 'immutable' when 's' then 'stable' else 'volatile' end as volatilidad,
         case when p.prosecdef then 'definer' else 'invoker' end as privilegios,
         coalesce(array_to_string(p.proconfig, ','), '(ninguna)') as config,
         case when p.proisstrict then 'strict' else 'no strict' end as estricta,
         has_function_privilege('anon', p.oid, 'execute') as anon_ejecuta,
         has_function_privilege('authenticated', p.oid, 'execute') as auth_ejecuta,
         p.prosrc as cuerpo
  from pg_proc p join pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'public'
),
filas(orden, objeto, esperado, encontrado) as (
  select 1, 'función public.dentro_del_plazo(timestamp with time zone,integer,timestamp with time zone)',
         'boolean · stable · invoker · search_path="" · no strict · anon no · authenticated no',
         coalesce((select devuelve || ' · ' || volatilidad || ' · ' || privilegios || ' · ' || config || ' · '
                          || estricta || ' · '
                          || case when anon_ejecuta then 'anon sí' else 'anon no' end || ' · '
                          || case when auth_ejecuta then 'authenticated sí' else 'authenticated no' end
                   from fn
                   where firma = 'public.dentro_del_plazo(timestamp with time zone,integer,timestamp with time zone)'),
                  '(no existe)')
  union all
  -- Hallazgo G: antes solo se comprobaba el límite de arriba, así que una
  -- entrada en el futuro alargaba la vigencia tanto como el adelanto.
  select 2, 'lo que decide public.dentro_del_plazo',
         'dentro sí · vencido no · futuro no · en el instante de la petición sí',
         case when to_regprocedure('public.dentro_del_plazo(timestamptz, integer, timestamptz)') is null
                then '(no existe)' else
           'dentro ' || case when public.dentro_del_plazo(now() - interval '1 hour', 30, now())
                              then 'sí' else 'no' end
           || ' · vencido ' || case when public.dentro_del_plazo(now() - interval '31 days', 30, now())
                                     then 'sí' else 'no' end
           || ' · futuro ' || case when public.dentro_del_plazo(now() + interval '1 hour', 30, now())
                                    then 'sí' else 'no' end
           || ' · en el instante de la petición ' || case when public.dentro_del_plazo(now(), 30, now())
                                                           then 'sí' else 'no' end
         end
  union all
  select 3, 'función public.es_mi_organizacion(uuid)',
         'boolean · stable · definer · search_path="" · no strict · anon sí · authenticated sí',
         coalesce((select devuelve || ' · ' || volatilidad || ' · ' || privilegios || ' · ' || config || ' · '
                          || estricta || ' · '
                          || case when anon_ejecuta then 'anon sí' else 'anon no' end || ' · '
                          || case when auth_ejecuta then 'authenticated sí' else 'authenticated no' end
                   from fn where firma = 'public.es_mi_organizacion(uuid)'),
                  '(no existe)')
  union all
  -- Hallazgo E (D-105): una entrada con contraseña con un momento que no se
  -- puede leer se descartaba como si no existiera. Se mira como texto: que el
  -- cuerpo compare cuántas entradas con contraseña hay con cuántas tienen un
  -- momento legible, que siga leyendo usuario y que siga apoyándose en las dos
  -- funciones que deciden la sesión abierta y el plazo.
  select 4, 'cuerpo de public.es_mi_organizacion(uuid)',
         'compara las entradas con contraseña con las legibles: sí · lee public.usuario: sí · '
         'llama a sesion_abierta: sí · llama a dentro_del_plazo: sí',
         coalesce((select 'compara las entradas con contraseña con las legibles: '
                          || case when lower(cuerpo) like '%<> count(*)%' then 'sí' else 'no' end
                          || ' · lee public.usuario: '
                          || case when position('public.usuario' in cuerpo) > 0 then 'sí' else 'no' end
                          || ' · llama a sesion_abierta: '
                          || case when position('public.sesion_abierta()' in cuerpo) > 0 then 'sí' else 'no' end
                          || ' · llama a dentro_del_plazo: '
                          || case when position('public.dentro_del_plazo(' in cuerpo) > 0 then 'sí' else 'no' end
                   from fn where firma = 'public.es_mi_organizacion(uuid)'),
                  '(no existe)')
)
select objeto, esperado, encontrado,
       case when esperado = encontrado then 'OK' else 'FALLA' end as estado
from filas order by orden;

#!/usr/bin/env python3
"""
Prueba de la comprobación de estructura (HU-03.1): un caso que debe pasar y
uno que debe fallar por cada regla del requisito «Separación por organización
en la base» (openspec/specs/acceso/spec.md).

Cada caso corre dentro de una transacción que se deshace al final: crea el
objeto del caso, corre supabase/comprobaciones/estructura.sql y vuelve todo
atrás. No deja nada en la base.

La salida se lee con analizar() de scripts/base/comprobar-estructura.py, el
mismo que usa la integración continua: lo que aquí se prueba es lo que allí
se acepta. Un caso que da errores de lectura (salida mal formada, sin
RESUMEN o con cero tablas) cuenta como mal.

Necesita la base local levantada (`supabase start`) con las migraciones
aplicadas.

Uso:  python3 tests/base/prueba-comprobacion-estructura.py
Sale con 0 si todos los casos dan lo esperado, y con 1 si alguno falla.
"""
import importlib.util
import sys
from pathlib import Path

RAIZ = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(RAIZ / "scripts" / "base"))
from base_local import psql  # noqa: E402

COMPROBACION = RAIZ / "supabase" / "comprobaciones" / "estructura.sql"
_spec = importlib.util.spec_from_file_location("comprobar_estructura",
                                               RAIZ / "scripts" / "base" / "comprobar-estructura.py")
comprobar = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(comprobar)

# Una tabla bien hecha: organización obligatoria, reglas activadas y forzadas,
# su regla restrictiva por organización para todo y para todos, y sin el
# TRUNCATE que la plataforma da por defecto a las personas.
BIEN = """
create table public.prueba_bien (id uuid primary key, organizacion_id uuid not null);
revoke truncate, trigger, references on public.prueba_bien from anon, authenticated;
alter table public.prueba_bien enable row level security;
alter table public.prueba_bien force row level security;
create policy prueba_bien_organizacion on public.prueba_bien as restrictive for all to public
  using (public.es_mi_organizacion(organizacion_id))
  with check (public.es_mi_organizacion(organizacion_id));
"""

# (nombre, preparación, None si debe pasar o (objeto, motivo) que debe aparecer)
CASOS = [
    ("P1 la base tal como queda tras las migraciones", "", None),
    ("P2 una tabla nueva bien hecha", BIEN, None),
    ("P3 una vista que consulta con los permisos de quien la usa",
     "create view public.prueba_vista with (security_invoker = true) as select id from public.organizacion;", None),
    ("P4 una función con los permisos de quien la llama",
     "create function public.prueba_invocador() returns int language sql as 'select 1';", None),

    ("N1 tabla sin organizacion_id",
     "create table public.prueba_mala (id uuid primary key);",
     ("public.prueba_mala", "sin-organizacion_id")),
    ("N2 organizacion_id que admite nulo",
     BIEN.replace("organizacion_id uuid not null", "organizacion_id uuid"),
     ("public.prueba_bien", "organizacion_id-admite-nulo")),
    ("N3 reglas sin activar",
     BIEN.replace("alter table public.prueba_bien enable row level security;", ""),
     ("public.prueba_bien", "reglas-no-activadas")),
    ("N4 reglas activadas pero no forzadas para el dueño",
     BIEN.replace("alter table public.prueba_bien force row level security;", ""),
     ("public.prueba_bien", "reglas-no-forzadas")),
    ("N5 sin ninguna regla",
     BIEN.split("create policy")[0],
     ("public.prueba_bien", "sin-regla-restrictiva")),
    ("N6 la regla por organización es permisiva, no restrictiva",
     BIEN.replace("as restrictive", "as permissive"),
     ("public.prueba_bien", "sin-regla-restrictiva")),
    ("N7 la regla restrictiva vale solo para leer",
     BIEN.replace("for all", "for select").replace(
         "\n  with check (public.es_mi_organizacion(organizacion_id))", ""),
     ("public.prueba_bien", "sin-regla-restrictiva")),
    ("N8 la regla restrictiva vale solo para un rol",
     BIEN.replace("to public", "to authenticated"),
     ("public.prueba_bien", "sin-regla-restrictiva")),
    ("N9 la regla deja escribir en cualquier organización",
     BIEN.replace("with check (public.es_mi_organizacion(organizacion_id))", "with check (true)"),
     ("public.prueba_bien", "sin-regla-restrictiva")),
    ("N10 la regla compara otra columna",
     BIEN.replace("using (public.es_mi_organizacion(organizacion_id))", "using (public.es_mi_organizacion(id))"),
     ("public.prueba_bien", "sin-regla-restrictiva")),
    ("N11 tabla en un esquema nuevo",
     "create schema prueba_otro; create table prueba_otro.t (id int);",
     ("prueba_otro.t", "sin-organizacion_id")),
    ("N12 tabla particionada sin organización",
     "create table public.prueba_part (id int, d date) partition by range (d);",
     ("public.prueba_part", "sin-organizacion_id")),
    ("N13 vista con los permisos de su dueño",
     "create view public.prueba_vista as select id from public.organizacion;",
     ("public.prueba_vista", "vista-sin-permisos-de-quien-consulta")),
    ("N14 vista materializada",
     "create materialized view public.prueba_mat as select id from public.organizacion;",
     ("public.prueba_mat", "vista-materializada")),
    ("N15 función con los privilegios de su dueño fuera de la lista",
     "create function public.prueba_definer() returns int language sql security definer as 'select 1';",
     ("public.prueba_definer()", "funcion-con-privilegios-del-dueno-fuera-de-lista")),
    ("N16 función de la lista con otra firma",
     "create function public.sesion_abierta(x int) returns boolean language sql security definer "
     "as 'select false';",
     ("public.sesion_abierta(integer)", "funcion-con-privilegios-del-dueno-fuera-de-lista")),
    ("N17 procedimiento con los privilegios de su dueño",
     "create procedure public.prueba_proc() language sql security definer as 'select 1';",
     ("public.prueba_proc()", "funcion-con-privilegios-del-dueno-fuera-de-lista")),
    # N18 y N19: solo el superusuario de la base local puede fabricar ese estado.
    ("N18 el rol de las personas es dueño de una tabla",
     BIEN + "alter table public.prueba_bien owner to authenticated;",
     ("public.prueba_bien", "rol-de-personas-es-dueno")),
    ("N19 el rol de las personas puede omitir las reglas",
     "alter role authenticated bypassrls;",
     ("authenticated", "rol-de-personas-omite-reglas")),
    ("N22 el rol de las personas puede vaciar una tabla (TRUNCATE no pasa por las reglas)",
     "grant truncate on public.organizacion to authenticated;",
     ("public.organizacion", "rol-de-personas-omite-reglas")),
    ("N23 sin sesión se puede vaciar una tabla",
     BIEN + "grant truncate on public.prueba_bien to anon;",
     ("public.prueba_bien", "rol-de-personas-omite-reglas")),
    ("N24 el rol de las personas puede colgar disparadores de una tabla",
     BIEN + "grant trigger on public.prueba_bien to authenticated;",
     ("public.prueba_bien", "rol-de-personas-con-trigger-o-references")),
    ("N25 sin sesión se puede referenciar una tabla",
     "grant references on public.organizacion to anon;",
     ("public.organizacion", "rol-de-personas-con-trigger-o-references")),
    # N26 y N27: solo el superusuario de la base local puede fabricar ese estado.
    ("N26 tabla foránea, aunque tenga organizacion_id",
     "create foreign data wrapper prueba_fdw; create server prueba_srv foreign data wrapper prueba_fdw;"
     "create foreign table public.prueba_foranea (organizacion_id uuid not null) server prueba_srv;",
     ("public.prueba_foranea", "tabla-foranea")),
    ("N27 el rol de las personas es superusuario",
     "alter role anon superuser;",
     ("anon", "rol-de-personas-omite-reglas")),
    ("N29 el rol de las personas puede asumir otro rol que omite las reglas",
     "create role prueba_puente bypassrls nologin; grant prueba_puente to authenticated;",
     ("authenticated", "rol-de-personas-omite-reglas")),
    # Revisión del tramo 2, ronda 3: la cadena de dos saltos debe verse, y nombrar
    # el rol del final; una pertenencia que no deja asumir el rol (WITH SET FALSE)
    # no da sus atributos, así que no es falla.
    ("N30 el rol de las personas llega en dos saltos a un rol que omite las reglas",
     "create role prueba_medio nologin; create role prueba_final bypassrls nologin;"
     "grant prueba_final to prueba_medio; grant prueba_medio to authenticated;",
     ("authenticated", "rol-de-personas-omite-reglas", "prueba_final")),
    ("P5 una pertenencia que no deja asumir el rol no es falla",
     "create role prueba_sin_set bypassrls nologin; grant prueba_sin_set to authenticated with set false;",
     None),
    ("N28 un tabulador en el nombre de la tabla no esconde la falla",
     "create table public.\"prueba\tmala\" (id int);",
     ("public.prueba?mala", "sin-organizacion_id")),
    ("N20 la regla de organizacion ya no compara su id",
     "drop policy organizacion_separacion on public.organizacion;"
     "create policy organizacion_separacion on public.organizacion as restrictive for all to public "
     "using (true) with check (true);",
     ("public.organizacion", "sin-regla-restrictiva")),
    ("N21 organizacion sin reglas forzadas",
     "alter table public.organizacion no force row level security;",
     ("public.organizacion", "reglas-no-forzadas")),
]


COMO_SUPERUSUARIO = {"N18", "N19", "N26", "N27", "N29", "N30", "P5"}


def correr(nombre: str, preparacion: str):
    """Devuelve (fallas, errores de lectura, error de la base) tras la preparación."""
    sql = f"begin;\n{preparacion}\n{COMPROBACION.read_text(encoding='utf-8')}\nrollback;\n"
    usuario = "supabase_admin" if nombre.split()[0] in COMO_SUPERUSUARIO else "postgres"
    r = psql(sql, usuario=usuario)
    if r.returncode != 0:
        return None, None, r.stderr.strip()
    fallas, _, errores = comprobar.analizar(r.stdout)
    return [tuple(f) for f in fallas], errores, None


def detecta(esperado: tuple, fallas: list) -> bool:
    """(objeto, motivo) o (objeto, motivo, texto que la explicación debe nombrar)."""
    return any(f[0] == esperado[0] and f[1] == esperado[1]
               and (len(esperado) < 3 or esperado[2] in f[2]) for f in fallas)


def main() -> int:
    if not COMPROBACION.is_file():
        print(f"FALLA: no existe {COMPROBACION.relative_to(RAIZ)}.")
        return 1
    malos = 0
    for nombre, preparacion, esperado in CASOS:
        fallas, errores, error = correr(nombre, preparacion)
        if error is not None:
            malos += 1
            print(f"✗ {nombre}: la base rechazó el caso.\n  {error}")
            continue
        if errores:
            malos += 1
            print(f"✗ {nombre}: la salida de la comprobación no se puede leer: {errores}")
            continue
        if esperado is None:
            ok = not fallas
            detalle = "sin fallas" if ok else f"fallas inesperadas: {sorted(fallas)}"
        else:
            ok = detecta(esperado, fallas)
            detalle = f"detecta {esperado}" if ok else f"no detecta {esperado}; dio {sorted(fallas)}"
        malos += 0 if ok else 1
        print(f"{'✓' if ok else '✗'} {nombre}: {detalle}")
    total = len(CASOS)
    print(f"prueba-comprobacion-estructura: {total - malos} de {total} casos dan lo esperado.")
    return 1 if malos else 0


if __name__ == "__main__":
    sys.exit(main())

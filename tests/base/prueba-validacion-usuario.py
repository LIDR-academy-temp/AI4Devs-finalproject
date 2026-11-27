#!/usr/bin/env python3
"""
Prueba de la validación 1 a 1 de la migración de usuario (HU-01.1): la base
tal como queda debe dar todo OK, y cada desvío de la spec debe aparecer como
FALLA en su fila. Nació en la revisión del tramo 3, ronda 1 (hallazgo: la
validación nueva no tenía ningún caso que la viera fallar).

Cada desvío se hace dentro de una transacción que se deshace al final, como
superusuario de la base local, porque algunos desvíos tocan objetos del
servicio de autenticación. No deja nada en la base.

Uso:  python3 tests/base/prueba-validacion-usuario.py
Sale con 0 si todos los casos dan lo esperado, y con 1 si alguno falla.
"""
import sys
from pathlib import Path

RAIZ = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(RAIZ / "scripts" / "base"))
from base_local import psql  # noqa: E402

VALIDACION = RAIZ / "supabase" / "validaciones" / "20261125033000_usuario.sql"
PRIVILEGIOS = "TRUNCATE, TRIGGER y REFERENCES de las personas sobre public.usuario"

# (nombre, desvío, None si todo debe dar OK o la fila que debe dar FALLA)
CASOS = [
    ("P1 la base tal como queda tras la migración", "", None),
    ("N1 la tabla no existe", "drop table public.usuario cascade;", "tabla public.usuario"),
    ("N2 una columna de más", "alter table public.usuario add column extra text;", "columnas de public.usuario"),
    ("N3 id con valor por defecto",
     "alter table public.usuario alter column id set default gen_random_uuid();", "columna id"),
    # Desde HU-06.1, las llaves compuestas de asignacion dependen de la llave
    # (id, organizacion_id): N4 y N12 se las llevan con cascade dentro de la
    # transacción, que se deshace.
    ("N4 organizacion_id admite nulo",
     "alter table public.usuario drop constraint usuario_id_organizacion_id_key cascade;"
     "alter table public.usuario alter column organizacion_id drop not null;", "columna organizacion_id"),
    ("N5 nombre con otro tipo",
     "alter table public.usuario alter column nombre type varchar(50);", "columna nombre"),
    ("N6 correo admite nulo", "alter table public.usuario alter column correo drop not null;", "columna correo"),
    ("N7 telefono admite nulo", "alter table public.usuario alter column telefono drop not null;", "columna telefono"),
    ("N8 activo nace en falso", "alter table public.usuario alter column activo set default false;", "columna activo"),
    ("N9 una constraint de más",
     "alter table public.usuario add constraint usuario_extra check (nombre <> '');",
     "constraints de public.usuario"),
    ("N10 la llave primaria sobre otra columna",
     "alter table public.usuario drop constraint usuario_pkey cascade;"
     "alter table public.usuario add constraint usuario_pkey primary key (correo);", "constraint usuario_pkey"),
    ("N11 la llave foránea apunta a otra columna",
     "alter table public.usuario drop constraint usuario_organizacion_id_fkey;"
     "alter table public.usuario add constraint usuario_organizacion_id_fkey foreign key (organizacion_id) "
     "references public.organizacion (id) on delete cascade;", "constraint usuario_organizacion_id_fkey"),
    ("N12 la llave compuesta con una sola columna",
     "alter table public.usuario drop constraint usuario_id_organizacion_id_key cascade;"
     "alter table public.usuario add constraint usuario_id_organizacion_id_key unique (id);",
     "constraint usuario_id_organizacion_id_key"),
    ("N13 el índice del correo distingue mayúsculas",
     "drop index public.usuario_correo_key; create unique index usuario_correo_key on public.usuario (correo);",
     "índice usuario_correo_key"),
    ("N14 reglas sin forzar", "alter table public.usuario no force row level security;", "reglas de public.usuario"),
    ("N15 una regla restrictiva de más (las permisivas las vigila la validación de 20261125164000_sesion)",
     "create policy otra on public.usuario as restrictive for select to authenticated using (true);",
     "reglas restrictivas sobre public.usuario"),
    ("N16 la regla pasa a permisiva",
     "drop policy usuario_separacion on public.usuario;"
     "create policy usuario_separacion on public.usuario as permissive for all to public "
     "using (public.es_mi_organizacion(organizacion_id)) with check (public.es_mi_organizacion(organizacion_id));",
     "regla usuario_separacion"),
    ("N17 la comprobación del correo corre con privilegios de su dueño",
     "alter function public.comprobar_correo_de_cuenta() security definer;",
     "función public.comprobar_correo_de_cuenta()"),
    ("N18 la comprobación del correo apagada",
     "alter table public.usuario disable trigger usuario_correo_de_cuenta;", "disparadores de public.usuario"),
    ("N19 la comprobación del correo solo al crear",
     "drop trigger usuario_correo_de_cuenta on public.usuario;"
     "create trigger usuario_correo_de_cuenta before insert on public.usuario "
     "for each row execute function public.comprobar_correo_de_cuenta();", "disparador usuario_correo_de_cuenta"),
    ("N20 el bloqueo de D-103 sin search_path fijo",
     "alter function public.impedir_cambio_de_correo_propio() reset search_path;",
     "función public.impedir_cambio_de_correo_propio()"),
    ("N21 el bloqueo de D-103 apagado",
     "alter table auth.users disable trigger impedir_cambio_de_correo_propio;",
     "disparador impedir_cambio_de_correo_propio (D-103)"),
    ("N22 es_mi_organizacion se vuelve estricta",
     "alter function public.es_mi_organizacion(uuid) strict;", "función public.es_mi_organizacion(uuid)"),
    ("N23 sin sesión no se puede ejecutar es_mi_organizacion",
     "revoke execute on function public.es_mi_organizacion(uuid) from anon;",
     "quién ejecuta public.es_mi_organizacion(uuid)"),
    ("N24 con sesión se puede vaciar la tabla", "grant truncate on public.usuario to authenticated;", PRIVILEGIOS),
    ("N25 el plazo de la sesión deja de fijar su search_path",
     "alter function public.dentro_del_plazo(timestamptz, integer, timestamptz) reset search_path;",
     "función public.dentro_del_plazo(timestamp with time zone,integer,timestamp with time zone)"),
    ("N28 sin sesión se puede llamar al plazo por la API (revisión interna)",
     "grant execute on function public.dentro_del_plazo(timestamptz, integer, timestamptz) to anon;",
     "función public.dentro_del_plazo(timestamp with time zone,integer,timestamp with time zone)"),
    ("N26 el dueño de es_mi_organizacion ya no omite las reglas (riesgo de recursión)",
     "alter function public.es_mi_organizacion(uuid) owner to authenticated;",
     "dueño de las funciones con privilegios de su dueño"),
    ("P2 el permiso de leer, que da HU-01.2, no cambia la fila de privilegios",
     "grant select on public.usuario to authenticated;", None),
]

FILAS = {
    "tabla public.usuario", "columnas de public.usuario", "columna id", "columna organizacion_id",
    "columna nombre", "columna correo", "columna telefono", "columna activo", "constraints de public.usuario",
    "constraint usuario_pkey", "constraint usuario_organizacion_id_fkey", "constraint usuario_id_organizacion_id_key",
    "índice usuario_correo_key", "reglas de public.usuario", "reglas restrictivas sobre public.usuario",
    "regla usuario_separacion", "función public.comprobar_correo_de_cuenta()", "disparadores de public.usuario",
    "disparador usuario_correo_de_cuenta", "función public.impedir_cambio_de_correo_propio()",
    "disparador impedir_cambio_de_correo_propio (D-103)", "función public.es_mi_organizacion(uuid)",
    "quién ejecuta public.es_mi_organizacion(uuid)", PRIVILEGIOS,
    "función public.dentro_del_plazo(timestamp with time zone,integer,timestamp with time zone)",
    "dueño de las funciones con privilegios de su dueño",
}


def correr(desvio: str):
    r = psql(f"begin;\n{desvio}\n{VALIDACION.read_text(encoding='utf-8')}\nrollback;\n", usuario="supabase_admin")
    if r.returncode != 0:
        return None, None, r.stderr.strip()
    filas, nombres = {}, []
    for linea in r.stdout.splitlines():
        partes = linea.split("\t")
        if len(partes) == 4:
            filas[partes[0]] = partes[3]
            nombres.append(partes[0])
        else:
            nombres.append(f"(fila mal formada: {linea!r})")
    return filas, nombres, None


def decidir(filas: dict, nombres: list, fila) -> tuple:
    """¿La salida es la esperada? Exactamente las filas de FILAS, sin repetidas; todo OK, o FALLA en `fila`."""
    if not filas:
        return False, "la validación no devolvió filas"
    if len(nombres) != len(FILAS) or set(nombres) != FILAS:
        return False, (f"no da exactamente las {len(FILAS)} filas esperadas: dio {len(nombres)}; "
                       f"faltan {sorted(FILAS - set(nombres))}, sobran {sorted(set(nombres) - FILAS)}")
    fallas = sorted(k for k, v in filas.items() if v != "OK")
    if fila is None:
        return (not fallas), ("todo OK" if not fallas else f"fallas inesperadas: {fallas}")
    return (filas.get(fila) == "FALLA"), (f"marca «{fila}»" if filas.get(fila) == "FALLA"
                                          else f"no marca «{fila}»; marcó {fallas}")


def main() -> int:
    if not VALIDACION.is_file():
        print(f"FALLA: no existe {VALIDACION.relative_to(RAIZ)}.")
        return 1
    malos = 0
    for nombre, desvio, fila in CASOS:
        filas, nombres, error = correr(desvio)
        if error is not None:
            malos += 1
            print(f"✗ {nombre}: la base rechazó el caso.\n  {error.splitlines()[0]}")
            continue
        ok, detalle = decidir(filas, nombres, fila)
        malos += 0 if ok else 1
        print(f"{'✓' if ok else '✗'} {nombre}: {detalle}")
    # Cada fila tiene al menos un desvío que la marca.
    sin_caso = sorted(FILAS - {f for _, _, f in CASOS if f})
    ok = not sin_caso
    malos += 0 if ok else 1
    print(f"{'✓' if ok else '✗'} N29 cada fila tiene un desvío que la marca: "
          f"{'sí' if ok else 'faltan ' + ', '.join(sin_caso)}")
    total = len(CASOS) + 1
    print(f"prueba-validacion-usuario: {total - malos} de {total} casos dan lo esperado.")
    return 1 if malos else 0


if __name__ == "__main__":
    sys.exit(main())

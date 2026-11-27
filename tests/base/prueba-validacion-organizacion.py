#!/usr/bin/env python3
"""
Prueba de la validación 1 a 1 de la migración de organizacion (HU-03.1): la
base tal como queda debe dar todo OK, y cada desvío de la spec debe aparecer
como FALLA en su fila.

Cada desvío se hace dentro de una transacción que se deshace al final. No
deja nada en la base. Necesita la base local levantada con las migraciones.

Uso:  python3 tests/base/prueba-validacion-organizacion.py
Sale con 0 si todos los casos dan lo esperado, y con 1 si alguno falla.
"""
import sys
from pathlib import Path

RAIZ = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(RAIZ / "scripts" / "base"))
from base_local import psql  # noqa: E402

VALIDACION = RAIZ / "supabase" / "validaciones" / "20261123170000_organizacion.sql"

# (nombre, desvío, None si todo debe dar OK o la fila que debe dar FALLA)
CASOS = [
    ("P1 la base tal como queda tras la migración", "", None),
    ("N1 una columna de más",
     "alter table public.organizacion add column extra text;", "columnas de public.organizacion"),
    ("N2 nombre admite nulo",
     "alter table public.organizacion alter column nombre drop not null;", "columna nombre"),
    ("N3 otro valor por defecto de sesion_dias",
     "alter table public.organizacion alter column sesion_dias set default 10;", "columna sesion_dias"),
    ("N4 zona_horaria con valor por defecto",
     "alter table public.organizacion alter column zona_horaria set default 'UTC';", "columna zona_horaria"),
    ("N5 sin la comprobación de la zona",
     "alter table public.organizacion drop constraint organizacion_zona_horaria_check;",
     "constraints de public.organizacion"),
    ("N6 la comprobación de sesion_dias con otro límite",
     "alter table public.organizacion drop constraint organizacion_sesion_dias_check;"
     "alter table public.organizacion add constraint organizacion_sesion_dias_check check (sesion_dias >= 0);",
     "constraint organizacion_sesion_dias_check"),
    ("N7 reglas sin forzar",
     "alter table public.organizacion no force row level security;", "reglas de public.organizacion"),
    ("N8 la regla pasa a permisiva",
     "drop policy organizacion_separacion on public.organizacion;"
     "create policy organizacion_separacion on public.organizacion as permissive for all to public "
     "using (public.es_mi_organizacion(id)) with check (public.es_mi_organizacion(id));",
     "regla organizacion_separacion"),
    ("N9 una regla de más",
     "create policy otra on public.organizacion for select to authenticated using (true);",
     "reglas sobre public.organizacion"),
    ("N10 sesion_abierta pierde los privilegios de su dueño",
     "alter function public.sesion_abierta() security invoker;", "función public.sesion_abierta()"),
    ("N11 anon puede ejecutar sesion_abierta",
     "grant execute on function public.sesion_abierta() to anon;", "quién ejecuta public.sesion_abierta()"),
    ("N12 es_mi_organizacion sin search_path fijo",
     "alter function public.es_mi_organizacion(uuid) reset search_path;",
     "función public.es_mi_organizacion(uuid)"),
    ("N13 es_zona_horaria deja de ser inmutable",
     "alter function public.es_zona_horaria(text) stable;", "función public.es_zona_horaria(text)"),
    ("N14 sin sesión se puede vaciar la tabla",
     "grant truncate on public.organizacion to anon;",
     "TRUNCATE, TRIGGER y REFERENCES de las personas sobre public.organizacion"),
    ("P2 el permiso de leer, que dará HU-02.1, no cambia la fila de privilegios",
     "grant select on public.organizacion to authenticated;", None),
    # Un desvío por cada fila que no tenía el suyo (revisión del tramo 2, ronda 1).
    ("N15 la tabla no existe",
     "drop table public.organizacion cascade;", "tabla public.organizacion"),
    ("N16 id con otro valor por defecto",
     "alter table public.organizacion alter column id drop default;", "columna id"),
    # Con «cascade»: desde HU-01.1 la llave foránea de usuario depende de esta
    # llave; la transacción se deshace y la devuelve.
    ("N17 la llave primaria sobre otra columna",
     "alter table public.organizacion drop constraint organizacion_pkey cascade;"
     "alter table public.organizacion add constraint organizacion_pkey primary key (nombre);",
     "constraint organizacion_pkey"),
    ("N18 el nombre único junto con otra columna",
     "alter table public.organizacion drop constraint organizacion_nombre_key;"
     "alter table public.organizacion add constraint organizacion_nombre_key unique (nombre, zona_horaria);",
     "constraint organizacion_nombre_key"),
    ("N19 la comprobación de la zona con otra condición",
     "alter table public.organizacion drop constraint organizacion_zona_horaria_check;"
     "alter table public.organizacion add constraint organizacion_zona_horaria_check check (zona_horaria <> '');",
     "constraint organizacion_zona_horaria_check"),
    ("N20 reglas forzadas pero sin activar",
     "alter table public.organizacion disable row level security;", "reglas de public.organizacion"),
    ("N21 la regla vale solo para leer",
     "drop policy organizacion_separacion on public.organizacion;"
     "create policy organizacion_separacion on public.organizacion as restrictive for select to public "
     "using (public.es_mi_organizacion(id));",
     "regla organizacion_separacion"),
    ("N22 la regla vale solo para un rol",
     "alter policy organizacion_separacion on public.organizacion to authenticated;",
     "regla organizacion_separacion"),
    ("N23 la regla deja leer todo",
     "alter policy organizacion_separacion on public.organizacion using (true);",
     "regla organizacion_separacion"),
    ("N24 la regla deja escribir en cualquier organización",
     "alter policy organizacion_separacion on public.organizacion with check (true);",
     "regla organizacion_separacion"),
    ("N25 con sesión no se puede ejecutar sesion_abierta",
     "revoke execute on function public.sesion_abierta() from authenticated;",
     "quién ejecuta public.sesion_abierta()"),
    ("N26 sin sesión no se puede ejecutar es_mi_organizacion",
     "revoke execute on function public.es_mi_organizacion(uuid) from anon;",
     "quién ejecuta public.es_mi_organizacion(uuid)"),
    ("N27 con sesión se pueden colgar disparadores de la tabla",
     "grant trigger on public.organizacion to authenticated;",
     "TRUNCATE, TRIGGER y REFERENCES de las personas sobre public.organizacion"),
    ("N28 con sesión se puede referenciar la tabla",
     "grant references on public.organizacion to authenticated;",
     "TRUNCATE, TRIGGER y REFERENCES de las personas sobre public.organizacion"),
]

# Las 20 filas que la validación debe dar, ni una más ni una menos: una fila
# que desaparece deja de comprobar sin que nada falle.
FILAS = {
    "tabla public.organizacion", "columnas de public.organizacion", "columna id", "columna nombre",
    "columna sesion_dias", "columna zona_horaria", "constraints de public.organizacion",
    "constraint organizacion_pkey", "constraint organizacion_nombre_key",
    "constraint organizacion_sesion_dias_check", "constraint organizacion_zona_horaria_check",
    "reglas de public.organizacion", "reglas sobre public.organizacion", "regla organizacion_separacion",
    "función public.es_zona_horaria(text)", "función public.sesion_abierta()",
    "quién ejecuta public.sesion_abierta()", "función public.es_mi_organizacion(uuid)",
    "quién ejecuta public.es_mi_organizacion(uuid)",
    "TRUNCATE, TRIGGER y REFERENCES de las personas sobre public.organizacion",
}


def correr(desvio: str, validacion: str = ""):
    """Corre la validación (o el texto `validacion`, si se da) tras el desvío."""
    sql = validacion or VALIDACION.read_text(encoding="utf-8")
    r = psql(f"begin;\n{desvio}\n{sql}\nrollback;\n")
    if r.returncode != 0:
        return None, None, r.stderr.strip()
    # nombres guarda cada fila tal como vino, en orden y con repeticiones: una
    # fila duplicada o mal formada no puede desaparecer al volverse diccionario.
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
    """La única decisión de la prueba: ¿la salida de la validación es la esperada?

    `fila` es None si todo debe dar OK, o el nombre de la fila que debe dar FALLA.
    Devuelve (ok, detalle). La usan los casos y el control N29, para que el
    control pruebe esta misma decisión y no una copia.
    """
    fallas = sorted(k for k, v in filas.items() if v != "OK")
    if not filas:
        return False, "la validación no devolvió filas"
    if len(nombres) != len(FILAS) or set(nombres) != FILAS:
        repetidas = sorted({n for n in nombres if nombres.count(n) > 1})
        return False, (f"no da exactamente las {len(FILAS)} filas esperadas: dio {len(nombres)}; "
                       f"faltan {sorted(FILAS - set(nombres))}, sobran {sorted(set(nombres) - FILAS)}, "
                       f"repetidas {repetidas}")
    if fila is None:
        return (not fallas), ("todo OK" if not fallas else f"fallas inesperadas: {fallas}")
    if filas.get(fila) == "FALLA":
        return True, f"marca «{fila}»"
    return False, f"no marca «{fila}»; marcó {fallas}"


def main() -> int:
    if not VALIDACION.is_file():
        print(f"FALLA: no existe {VALIDACION.relative_to(RAIZ)}.")
        return 1
    malos = 0
    for nombre, desvio, fila in CASOS:
        filas, nombres, error = correr(desvio)
        if error is not None:
            malos += 1
            print(f"✗ {nombre}: la base rechazó el caso.\n  {error}")
            continue
        ok, detalle = decidir(filas, nombres, fila)
        malos += 0 if ok else 1
        print(f"{'✓' if ok else '✗'} {nombre}: {detalle}")
    # Control de la propia prueba: una validación que repite una fila (todas
    # sus filas OK, 21 filas con los mismos 20 nombres) debe ser RECHAZADA por
    # la misma decisión que juzga los casos (revisión del tramo 2, ronda 3).
    original = VALIDACION.read_text(encoding="utf-8")
    repetida = original.replace(
        "from filas order by orden;",
        "from (select * from filas union all select * from filas where orden = 1) filas order by orden;")
    filas, nombres, error = correr("", repetida)
    if error is not None or repetida == original:
        ok, detalle = False, error or "no se pudo fabricar la validación repetida"
    else:
        aprobada, detalle = decidir(filas, nombres, None)
        ok = not aprobada and len(nombres) == len(FILAS) + 1 and "repetidas" in detalle
    malos += 0 if ok else 1
    print(f"{'✓' if ok else '✗'} N29 una validación con una fila repetida es rechazada por la decisión "
          f"de la prueba: {detalle}")
    total = len(CASOS) + 1
    print(f"prueba-validacion-organizacion: {total - malos} de {total} casos dan lo esperado.")
    return 1 if malos else 0


if __name__ == "__main__":
    sys.exit(main())

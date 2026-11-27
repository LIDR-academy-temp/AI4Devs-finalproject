#!/usr/bin/env python3
"""
Prueba de la validación 1 a 1 de la migración de la sesión (HU-01.2, tramo 4):
la base tal como queda debe dar todo OK, y cada desvío de la spec debe
aparecer como FALLA en su fila. Misma forma que
tests/base/prueba-validacion-usuario.py.

Cada desvío se hace dentro de una transacción que se deshace al final, como
superusuario de la base local. No deja nada en la base.

Uso:  python3 tests/base/prueba-validacion-sesion.py
Sale con 0 si todos los casos dan lo esperado, y con 1 si alguno falla.
"""
import sys
from pathlib import Path

RAIZ = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(RAIZ / "scripts" / "base"))
from base_local import psql  # noqa: E402

VALIDACION = RAIZ / "supabase" / "validaciones" / "20261125164000_sesion.sql"
PERMISIVAS = "reglas permisivas de usuario y organizacion"

# (nombre, desvío, None si todo debe dar OK o la fila que debe dar FALLA)
CASOS = [
    ("P1 la base tal como queda tras la migración", "", None),
    ("N1 sin la regla usuario_propio", "drop policy usuario_propio on public.usuario;", "regla usuario_propio"),
    ("N2 usuario_propio deja ver todo el usuario de la organización",
     "drop policy usuario_propio on public.usuario;"
     "create policy usuario_propio on public.usuario for select to authenticated using (true);",
     "regla usuario_propio"),
    ("N3 organizacion_propia también para quien no tiene sesión",
     "drop policy organizacion_propia on public.organizacion;"
     "create policy organizacion_propia on public.organizacion for select to public "
     "using (public.es_mi_organizacion(id));", "regla organizacion_propia"),
    ("N4 una regla permisiva de más, que abre toda la organización",
     "create policy otra on public.usuario for select to authenticated using (true);", PERMISIVAS),
    ("N5 sin la regla restrictiva de separación",
     "drop policy usuario_separacion on public.usuario;", "reglas restrictivas de usuario y organizacion"),
    ("N6 las personas pueden editar su usuario",
     "grant update on public.usuario to authenticated;", "privilegios de authenticated (solo leer)"),
    ("N7 quien no tiene sesión puede leer organizaciones",
     "grant select on public.organizacion to anon;", "privilegios de anon (ninguno)"),
    ("N8 la credencial del sistema recibe permiso de insertar usuarios",
     "grant insert on public.usuario to service_role;", "privilegios de service_role (sin cambios: ninguno)"),
    ("N9 usuario_propio pasa a permitir también escribir",
     "drop policy usuario_propio on public.usuario;"
     "create policy usuario_propio on public.usuario for all to authenticated using (id = auth.uid());",
     "regla usuario_propio"),
]

FILAS = {
    "regla usuario_propio", "regla organizacion_propia", PERMISIVAS,
    "reglas restrictivas de usuario y organizacion", "privilegios de authenticated (solo leer)",
    "privilegios de anon (ninguno)", "privilegios de service_role (sin cambios: ninguno)",
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
    print(f"{'✓' if ok else '✗'} N10 cada fila tiene un desvío que la marca: "
          f"{'sí' if ok else 'faltan ' + ', '.join(sin_caso)}")
    total = len(CASOS) + 1
    print(f"prueba-validacion-sesion: {total - malos} de {total} casos dan lo esperado.")
    return 1 if malos else 0


if __name__ == "__main__":
    sys.exit(main())

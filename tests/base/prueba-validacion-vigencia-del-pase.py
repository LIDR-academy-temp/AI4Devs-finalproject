#!/usr/bin/env python3
"""
Prueba de la validación 1 a 1 de la migración de la vigencia del pase
(HU-01.2, tramo 4, correcciones de los hallazgos E y G de la ronda 1): la base
tal como queda debe dar todo OK, y cada desvío de la spec debe aparecer como
FALLA en su fila. Misma forma que tests/base/prueba-validacion-sesion.py.

Los dos desvíos de comportamiento vuelven a poner el defecto que la ronda
encontró —el plazo sin límite por abajo y la entrada con contraseña ilegible
descartada—, para comprobar que la validación lo habría marcado.

Cada desvío se hace dentro de una transacción que se deshace al final, como
superusuario de la base local. No deja nada en la base.

Uso:  python3 tests/base/prueba-validacion-vigencia-del-pase.py
Sale con 0 si todos los casos dan lo esperado, y con 1 si alguno falla.
"""
import sys
from pathlib import Path

RAIZ = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(RAIZ / "scripts" / "base"))
from base_local import psql  # noqa: E402

VALIDACION = RAIZ / "supabase" / "validaciones" / "20261125185000_vigencia_del_pase.sql"
PLAZO = "función public.dentro_del_plazo(timestamp with time zone,integer,timestamp with time zone)"
DECIDE = "lo que decide public.dentro_del_plazo"
ORGANIZACION = "función public.es_mi_organizacion(uuid)"
CUERPO = "cuerpo de public.es_mi_organizacion(uuid)"

# El cuerpo de antes del hallazgo G: solo el límite de arriba, así que una
# entrada en el futuro alarga la vigencia.
PLAZO_SIN_LIMITE_ABAJO = """
create or replace function public.dentro_del_plazo(entrada timestamptz, dias integer, ahora timestamptz)
  returns boolean language sql stable set search_path = '' as $fn$
  select entrada + make_interval(hours => dias * 24) >= ahora;
$fn$;
"""

# El cuerpo de antes del hallazgo E: la entrada con contraseña cuyo momento no
# se puede leer se descarta como si no existiera, y vale la más antigua de las
# demás, que puede ser posterior.
ILEGIBLE_SE_DESCARTA = """
create or replace function public.es_mi_organizacion(organizacion uuid)
  returns boolean language sql stable security definer set search_path = '' as $fn$
  select exists (
    select 1
    from public.usuario u
    join public.organizacion o on o.id = u.organizacion_id
    where u.id = auth.uid()
      and u.organizacion_id = organizacion
      and u.activo
      and public.sesion_abierta()
      and public.dentro_del_plazo(
            to_timestamp((
              select min((a ->> 'timestamp')::bigint)
              from jsonb_array_elements(
                     case when jsonb_typeof(auth.jwt() -> 'amr') = 'array'
                          then auth.jwt() -> 'amr' else '[]'::jsonb end) a
              where jsonb_typeof(a) = 'object'
                and a ->> 'method' = 'password'
                and (a ->> 'timestamp') ~ '^[0-9]{1,12}$'
            )),
            o.sesion_dias,
            statement_timestamp())
  );
$fn$;
"""

# (nombre, desvío, None si todo debe dar OK o la fila que debe dar FALLA)
CASOS = [
    ("P1 la base tal como queda tras la migración", "", None),
    ("N1 el plazo deja de ser stable y pasa a leer el reloj en curso",
     "alter function public.dentro_del_plazo(timestamptz, integer, timestamptz) volatile;", PLAZO),
    ("N2 las personas pueden llamar al plazo por su cuenta",
     "grant execute on function public.dentro_del_plazo(timestamptz, integer, timestamptz) to authenticated;", PLAZO),
    ("N3 vuelve el plazo sin límite por abajo: una entrada en el futuro alarga la vigencia (hallazgo G)",
     PLAZO_SIN_LIMITE_ABAJO, DECIDE),
    ("N4 la regla de la organización pasa a correr con los privilegios de quien la llama",
     "alter function public.es_mi_organizacion(uuid) security invoker;", ORGANIZACION),
    ("N5 quien no tiene sesión deja de poder llamar a la regla de la organización",
     "revoke execute on function public.es_mi_organizacion(uuid) from anon;", ORGANIZACION),
    ("N6 vuelve la entrada con contraseña ilegible descartada como si no existiera (hallazgo E, D-105)",
     ILEGIBLE_SE_DESCARTA, CUERPO),
]

FILAS = {PLAZO, DECIDE, ORGANIZACION, CUERPO}


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
    print(f"{'✓' if ok else '✗'} N7 cada fila tiene un desvío que la marca: "
          f"{'sí' if ok else 'faltan ' + ', '.join(sin_caso)}")
    total = len(CASOS) + 1
    print(f"prueba-validacion-vigencia-del-pase: {total - malos} de {total} casos dan lo esperado.")
    return 1 if malos else 0


if __name__ == "__main__":
    sys.exit(main())

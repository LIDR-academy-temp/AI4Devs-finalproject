#!/usr/bin/env python3
"""
Prueba con datos de lo que HU-01.2 (tramo 4) necesita de la base.
Origen: openspec/specs/acceso/spec.md, requisitos «Sesión vigente», «Cerrar la
sesión» y «Reglas por rol en la base» (filas `usuario` y `organizacion`:
«la propia»); HU-01.CA-5, CA-6, CA-7; D-76, D-104.

«Sesión vigente» (lib/sesion/vigente.ts) obtiene quién pregunta leyendo su
propio usuario y el plazo de su organización con el pase de la persona. Para
eso la base deja ver, a cada persona, su propio usuario y su propia
organización, y nada más: las demás filas por rol las pone HU-02.1. La regla
restrictiva de separación sigue mandando: con el usuario inactivo, la sesión
cerrada o el plazo vencido, la persona no ve ni su propio usuario.

También prueba que cerrar la sesión con alcance local (el que usa el código)
deja inservible ese pase en el servicio y en la base, y que no cierra las
demás sesiones de la misma cuenta: eso es HU-01.CA-11, fuera de esta entrega.

Crea cuentas de prueba con correo de example.com y dos organizaciones de
prueba, que quita al terminar. La base local es desechable: `supabase db
reset` borra lo que quede.

Uso:  python3 tests/base/prueba-sesion.py
Sale con 0 si todos los casos dan lo esperado, y con 1 si alguno falla.
"""
import sys
import time
import uuid
from pathlib import Path

RAIZ = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(RAIZ / "scripts" / "base"))
from base_local import psql, psql_ok  # noqa: E402
from api_local import (api, con_pase, contenido, crear_cuenta, entrar, entrar_completo,  # noqa: E402
                       quitar_cuenta, responde)

DIA = 86400
LECTURA = "/rest/v1/usuario?select=id,organizacion_id,activo,organizacion(sesion_dias)"


def main() -> int:
    resultados = []

    def caso(nombre: str, ok: bool, detalle):
        resultados.append(ok)
        print(f"{'✓' if ok else '✗'} {nombre}: {detalle}")

    def primera_linea(texto: str) -> str:
        return texto.strip().splitlines()[0] if texto.strip() else "(sin mensaje)"

    org_a = psql_ok(f"insert into public.organizacion (nombre, zona_horaria) "
                    f"values ('Organización A {uuid.uuid4()}', 'America/Panama') returning id;").strip()
    org_b = psql_ok(f"insert into public.organizacion (nombre, zona_horaria, sesion_dias) "
                    f"values ('Organización B {uuid.uuid4()}', 'America/Lima', 7) returning id;").strip()
    id_1, correo_1, clave_1 = crear_cuenta()
    id_2, correo_2, _ = crear_cuenta()
    id_3, correo_3, _ = crear_cuenta()
    cuentas = [id_1, id_2, id_3]
    try:
        alta = psql("insert into public.usuario (id, organizacion_id, nombre, correo, telefono) values "
                    f"('{id_1}', '{org_a}', 'Usuario uno', '{correo_1}', '+507 6000-0001'), "
                    f"('{id_2}', '{org_a}', 'Usuario dos', '{correo_2}', '+507 6000-0002'), "
                    f"('{id_3}', '{org_b}', 'Usuario tres', '{correo_3}', '+51 900-000-003');")
        if alta.returncode != 0:
            print(f"✗ preparación: no se pudieron crear los usuarios de prueba: {primera_linea(alta.stderr)}")
            print("prueba-sesion: 0 casos corridos; la preparación falló.")
            return 1
        pase_1 = entrar(correo_1, clave_1)

        # ---- Lo que la persona ve con su pase, por la API (el camino real).
        codigo, filas = api("GET", f"{LECTURA}&id=eq.{id_1}", pase=pase_1)
        caso("P1 con su pase, la persona lee su propio usuario con el plazo de su organización",
             codigo == 200 and filas == [{"id": id_1, "organizacion_id": org_a, "activo": True,
                                          "organizacion": {"sesion_dias": 30}}], (codigo, filas))
        codigo, filas = api("GET", LECTURA, pase=pase_1)
        caso("P2 sin filtro, de usuario solo recibe la suya (la regla, no el filtro del código)",
             codigo == 200 and [f["id"] for f in filas] == [id_1], (codigo, filas))
        codigo, filas = api("GET", f"{LECTURA}&id=eq.{id_2}", pase=pase_1)
        caso("N1 el usuario de un compañero de su organización no lo ve", codigo == 200 and filas == [],
             (codigo, filas))
        codigo, filas = api("GET", f"{LECTURA}&id=eq.{id_3}", pase=pase_1)
        caso("N2 el usuario de otra organización no lo ve", codigo == 200 and filas == [], (codigo, filas))
        codigo, filas = api("GET", "/rest/v1/organizacion?select=id,sesion_dias", pase=pase_1)
        caso("P3 de organizacion recibe solo la suya", codigo == 200 and filas == [{"id": org_a, "sesion_dias": 30}],
             (codigo, filas))
        codigo, filas = api("GET", f"/rest/v1/organizacion?select=id&id=eq.{org_b}", pase=pase_1)
        caso("N3 otra organización por su id no la ve", codigo == 200 and filas == [], (codigo, filas))
        codigo, filas = api("GET", LECTURA)
        caso("N4 sin sesión no ve ningún usuario", codigo == 401 or (codigo == 200 and filas == []),
             (codigo, filas))

        # ---- Nadie cambia su usuario ni su organización (la fila «Cambia: nadie»).
        codigo, filas = api("PATCH", f"/rest/v1/usuario?id=eq.{id_1}", {"nombre": "Cambiado"}, pase=pase_1,
                            cabeceras={"Prefer": "return=representation"})
        nombre = psql_ok(f"select nombre from public.usuario where id = '{id_1}';").strip()
        caso("N5 la persona no edita su propio usuario: la base no cambia nada", nombre == "Usuario uno",
             (codigo, filas, nombre))
        codigo, filas = api("DELETE", f"/rest/v1/usuario?id=eq.{id_1}", pase=pase_1,
                            cabeceras={"Prefer": "return=representation"})
        queda = psql_ok(f"select count(*) from public.usuario where id = '{id_1}';").strip()
        caso("N6 la persona no quita su propio usuario", queda == "1", (codigo, filas, queda))
        codigo, filas = api("PATCH", f"/rest/v1/organizacion?id=eq.{org_a}", {"sesion_dias": 400}, pase=pase_1,
                            cabeceras={"Prefer": "return=representation"})
        dias = psql_ok(f"select sesion_dias from public.organizacion where id = '{org_a}';").strip()
        caso("N7 la persona no cambia el plazo de su organización", dias == "30", (codigo, filas, dias))
        codigo, filas = api("POST", "/rest/v1/usuario",
                            {"id": str(uuid.uuid4()), "organizacion_id": org_a, "nombre": "X",
                             "correo": f"x-{uuid.uuid4()}@example.com", "telefono": "1"}, pase=pase_1)
        caso("N8 la persona no inserta usuarios", codigo in (401, 403), (codigo, filas))

        # ---- Corte al desactivar: la siguiente petición ya no ve nada.
        psql_ok(f"update public.usuario set activo = false where id = '{id_1}';")
        codigo, filas = api("GET", f"{LECTURA}&id=eq.{id_1}", pase=pase_1)
        codigo_o, filas_o = api("GET", "/rest/v1/organizacion?select=id", pase=pase_1)
        caso("N9 con el usuario desactivado y el pase vigente, no ve ni su usuario ni su organización",
             filas == [] and filas_o == [], (codigo, filas, codigo_o, filas_o))
        psql_ok(f"update public.usuario set activo = true where id = '{id_1}';")
        codigo, filas = api("GET", f"{LECTURA}&id=eq.{id_1}", pase=pase_1)
        caso("P4 control de N9: reactivado, con el mismo pase vuelve a verse", len(filas or []) == 1,
             (codigo, filas))

        # ---- El plazo, con el pase tal como la API se lo pasa a la base.
        bueno = contenido(pase_1)

        def entrada_hace(segundos: int) -> dict:
            return {**bueno, "amr": [{"method": "password", "timestamp": int(time.time()) - segundos}]}

        def cuantos(pase: dict) -> str:
            return responde(con_pase("authenticated", pase, f"select count(*) from public.usuario "
                                                            f"where id = '{id_1}';"))

        d = cuantos(entrada_hace(30 * DIA + 60))
        caso("N10 entró hace 30 días y un minuto: no ve su propio usuario", d == "0", d)
        d = cuantos(entrada_hace(30 * DIA - 60))
        caso("P5 control de N10: 30 días menos un minuto, sí lo ve", d == "1", d)
        dos = {**bueno, "amr": [{"method": "password", "timestamp": int(time.time()) - 31 * DIA},
                                {"method": "password", "timestamp": int(time.time()) - 60}]}
        d = cuantos(dos)
        caso("N11 con dos entradas con contraseña cuenta la más antigua (D-104): no lo ve", d == "0", d)
        ilegible = {**bueno, "amr": [{"method": "password", "timestamp": "x"},
                                     {"method": "password", "timestamp": int(time.time()) - 60}]}
        d = cuantos(ilegible)
        caso("N14 una entrada con contraseña cuyo momento no se puede leer no deja saber cuál es la más "
             "antigua, y la sesión vence (D-105): no lo ve", d == "0", d)
        sin_momento = {**bueno, "amr": [{"method": "password"},
                                        {"method": "password", "timestamp": int(time.time()) - 60}]}
        d = cuantos(sin_momento)
        caso("N15 lo mismo cuando la entrada con contraseña viene sin momento: no lo ve", d == "0", d)
        otro_metodo = {**bueno, "amr": [{"method": "otp", "timestamp": "x"}, "basura",
                                        {"method": "password", "timestamp": int(time.time()) - 60}]}
        d = cuantos(otro_metodo)
        caso("P8 control de N14 y N15: lo que no es una entrada con contraseña no estorba, y sí lo ve",
             d == "1", d)
        futura = {**bueno, "amr": [{"method": "password", "timestamp": int(time.time()) + 3600}]}
        d = cuantos(futura)
        caso("N16 un momento de entrada posterior a la hora de la petición no alarga la vigencia: no lo ve",
             d == "0", d)

        # ---- Cerrar con alcance local: ese pase deja de servir; las demás sesiones siguen.
        sesion_a = entrar_completo(correo_1, clave_1)["access_token"]
        sesion_b = entrar_completo(correo_1, clave_1)["access_token"]
        codigo, cuerpo = api("POST", "/auth/v1/logout?scope=local", pase=sesion_a)
        caso("P6 cerrar con alcance local responde bien", codigo in (200, 204), (codigo, cuerpo))
        codigo, cuerpo = api("GET", "/auth/v1/user", pase=sesion_a)
        caso("N12 con el pase de la sesión cerrada, el servicio ya no la reconoce", codigo in (401, 403),
             (codigo, str(cuerpo)[:120]))
        codigo, filas = api("GET", f"{LECTURA}&id=eq.{id_1}", pase=sesion_a)
        caso("N13 con el pase de la sesión cerrada, la base no deja ver nada", filas == [] or codigo in (401, 403),
             (codigo, filas))
        codigo, filas = api("GET", f"{LECTURA}&id=eq.{id_1}", pase=sesion_b)
        caso("P7 la otra sesión de la misma cuenta sigue abierta: el cierre es solo de este navegador "
             "(cerrar las demás es HU-01.CA-11, fuera de esta entrega)", len(filas or []) == 1, (codigo, filas))
    finally:
        psql(f"delete from public.usuario where organizacion_id in ('{org_a}', '{org_b}');")
        psql(f"delete from public.organizacion where id in ('{org_a}', '{org_b}');")
        for c in cuentas:
            quitar_cuenta(c)

    total, bien = len(resultados), sum(resultados)
    print(f"prueba-sesion: {bien} de {total} casos dieron lo esperado.")
    return 0 if bien == total else 1


if __name__ == "__main__":
    sys.exit(main())

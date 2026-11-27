#!/usr/bin/env python3
"""
Prueba con datos de lo que entrega HU-01.1 en la base (tramo 3).
Origen: openspec/specs/acceso/spec.md, sección «Datos» (tabla usuario) y
requisitos «Un correo, una cuenta, una organización», «Sesión vigente» y
«Separación por organización en la base»; D-103.

- usuario: un correo por usuario en todo el sistema, sin distinguir
  mayúsculas; el correo es el de su cuenta en el servicio al escribirse; la
  comprobación corre con los permisos de quien escribe, y otro rol que no
  puede leer las cuentas recibe un rechazo con mensaje nuestro.
- D-103: la persona no cambia por sí sola el correo de su cuenta; la
  credencial del sistema sí (la corrección excepcional de D-87).
- es_mi_organizacion(uuid): deja de responder siempre «no» (D-100). Responde
  «sí» solo para la organización de un usuario activo, con la sesión del pase
  abierta y sin pasar sesion_dias desde que entró con contraseña.
- La regla de separación de usuario y la de organizacion, con datos de dos
  organizaciones.

Crea cuentas de prueba con correo de example.com y dos organizaciones de
prueba, que quita al terminar. La base local es desechable: `supabase db
reset` borra lo que quede.

Necesita la base local levantada con scripts/base/levantar-base.sh (con el
buzón de prueba, que el servicio usa al pedir un cambio de correo).

Uso:  python3 tests/base/prueba-usuario.py
Sale con 0 si todos los casos dan lo esperado, y con 1 si alguno falla.
"""
import sys
import time
import uuid
from pathlib import Path

RAIZ = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(RAIZ / "scripts" / "base"))
from base_local import psql, psql_ok  # noqa: E402
from api_local import (api, como_sistema, con_pase, contenido, crear_cuenta, entrar, entrar_completo,  # noqa: E402
                       quitar_cuenta, responde)

MENSAJE_D103 = "El correo de la cuenta no se cambia"
DIA = 86400


def main() -> int:
    resultados = []

    def caso(nombre: str, ok: bool, detalle: str):
        resultados.append(ok)
        print(f"{'✓' if ok else '✗'} {nombre}: {detalle}")

    def primera_linea(texto: str) -> str:
        return texto.strip().splitlines()[0] if texto.strip() else "(sin mensaje)"

    # Preparación: dos organizaciones, dos cuentas con usuario (una en cada
    # organización) y una cuenta sin usuario.
    org_a = psql_ok(f"insert into public.organizacion (nombre, zona_horaria) "
                    f"values ('Organización A {uuid.uuid4()}', 'America/Panama') returning id;").strip()
    org_b = psql_ok(f"insert into public.organizacion (nombre, zona_horaria) "
                    f"values ('Organización B {uuid.uuid4()}', 'America/Panama') returning id;").strip()
    id_1, correo_1, clave_1 = crear_cuenta()
    id_2, correo_2, _ = crear_cuenta()
    id_3, correo_3, clave_3 = crear_cuenta()
    cuentas = [id_1, id_2, id_3]
    try:
        alta = psql("insert into public.usuario (id, organizacion_id, nombre, correo, telefono) values "
                    f"('{id_1}', '{org_a}', 'Usuario uno', '{correo_1}', '+507 6000-0001'), "
                    f"('{id_2}', '{org_b}', 'Usuario dos', '{correo_2}', '+507 6000-0002');")
        if alta.returncode != 0:
            print(f"✗ preparación: no se pudieron crear los usuarios de prueba: {primera_linea(alta.stderr)}")
            print("prueba-usuario: 0 casos corridos; la preparación falló.")
            return 1
        sesion_1 = entrar_completo(correo_1, clave_1)
        pase_1 = sesion_1["access_token"]
        pase_1_cerrada = entrar(correo_1, clave_1)
        pase_3 = entrar(correo_3, clave_3)

        # ---- La tabla usuario, por SQL directo, en transacciones que se deshacen.
        def inserta(valores: str, columnas: str = "id, organizacion_id, nombre, correo, telefono",
                    antes: str = "", rol: str = "") -> tuple[bool, str]:
            cambio = f"set local role {rol};\n" if rol else ""
            r = psql(f"begin;\n{antes}\n{cambio}insert into public.usuario ({columnas}) values ({valores}) "
                     f"returning activo;\nrollback;\n")
            return r.returncode == 0, (r.stdout.strip() if r.returncode == 0 else primera_linea(r.stderr))

        ok, d = inserta(f"'{id_3}', '{org_a}', 'P1', '{correo_3.upper()}', '+507 6000-0003'")
        caso("P1 un usuario con el correo de su cuenta, escrito con otras mayúsculas, se crea activo",
             ok and d == "t", d)
        ok, d = inserta(f"'{id_3}', '{org_a}', 'N1', 'otro-{uuid.uuid4()}@example.com', '+507 6000-0003'")
        caso("N1 el correo no es el de la cuenta: la base lo rechaza con mensaje nuestro",
             not ok and "no es el de la cuenta" in d, d)
        ok, d = inserta(f"'{uuid.uuid4()}', '{org_a}', 'N2', 'sin-cuenta@example.com', '+507 6000-0003'")
        caso("N2 un usuario sin cuenta en el servicio: la base lo rechaza con mensaje nuestro",
             not ok and "no tiene cuenta" in d, d)
        ok, d = inserta(f"'{id_3}', '{org_b}', 'N3', '{correo_1.upper()}', '+507 6000-0003'")
        caso("N3 correo repetido en otra organización, con otras mayúsculas: la base lo rechaza", not ok, d)
        # El índice único por sí solo: con el disparador apagado dentro de la
        # transacción, para que el rechazo no venga de la comprobación del correo.
        ok, d = inserta(f"'{id_3}', '{org_b}', 'N4', '{correo_1.upper()}', '+507 6000-0003'",
                        antes="alter table public.usuario disable trigger usuario_correo_de_cuenta;")
        caso("N4 sin la comprobación del correo, el índice único rechaza el mismo correo con otras mayúsculas",
             not ok and "usuario_correo_key" in d, d)
        ok, d = inserta(f"'{id_3}', '{org_b}', 'P2', '{correo_3}', '+507 6000-0003'",
                        antes="alter table public.usuario disable trigger usuario_correo_de_cuenta;")
        caso("P2 control de N4: con el disparador apagado, un correo nuevo sí entra", ok, d)
        # La credencial del sistema no tiene hoy permiso de escribir usuarios; se
        # le da dentro de la transacción (con el de leer, para devolver la fila),
        # como podría dárselo un ticket futuro,
        # para que el rechazo venga de la comprobación del correo y no del permiso.
        ok, d = inserta(f"'{id_3}', '{org_a}', 'N5', '{correo_3}', '+507 6000-0003'", rol="service_role",
                        antes="grant insert, select on public.usuario to service_role;")
        caso("N5 un rol que puede escribir usuarios pero no leer las cuentas: rechazo con mensaje nuestro",
             not ok and "no puede leer las cuentas" in d, d)
        ok, d = inserta(f"'{id_3}', '{uuid.uuid4()}', 'N6', '{correo_3}', '+507 6000-0003'")
        caso("N6 una organización que no existe: la base lo rechaza", not ok and "foreign key" in d, d)
        nulos = {
            "nombre": f"'{id_3}', '{org_a}', null, '{correo_3}', '+507 6000-0003'",
            "telefono": f"'{id_3}', '{org_a}', 'N7', '{correo_3}', null",
            "organizacion_id": f"'{id_3}', null, 'N7', '{correo_3}', '+507 6000-0003'",
        }
        rechazados = [col for col, v in nulos.items() if not inserta(v)[0]]
        ok_activo, _ = inserta(f"'{id_3}', '{org_a}', 'N7', '{correo_3}', '+507 6000-0003', null",
                               columnas="id, organizacion_id, nombre, correo, telefono, activo")
        if not ok_activo:
            rechazados.append("activo")
        caso("N7 nombre, teléfono, organización y activo no admiten nulo",
             sorted(rechazados) == ["activo", "nombre", "organizacion_id", "telefono"],
             f"rechazados: {', '.join(sorted(rechazados)) or 'ninguno'}")
        r = psql(f"begin; update public.usuario set correo = 'otro-{uuid.uuid4()}@example.com' "
                 f"where id = '{id_1}'; rollback;")
        caso("N8 cambiar el correo del usuario a uno que no es el de su cuenta: la base lo rechaza",
             r.returncode != 0 and "no es el de la cuenta" in r.stderr, primera_linea(r.stderr) or "se aceptó")

        # ---- D-103: la persona no cambia su correo; la credencial del sistema sí.
        c, cuerpo = api("PUT", "/auth/v1/user", {"email": f"nuevo-{uuid.uuid4()}@example.com"}, pase=pase_1)
        fila = psql_ok(f"select email || '|' || coalesce(email_change, '') from auth.users where id = '{id_1}';").strip()
        caso("N9 la persona pide cambiar su correo: se rechaza con mensaje nuestro y nada cambia",
             c >= 400 and MENSAJE_D103 in str(cuerpo) and fila == f"{correo_1}|",
             f"respondió {c}; la cuenta quedó en {fila!r}")
        nuevo_3 = f"corregido-{uuid.uuid4()}@example.com"
        c, cuerpo = como_sistema("PUT", f"/auth/v1/admin/users/{id_3}", {"email": nuevo_3})
        fila = psql_ok(f"select email from auth.users where id = '{id_3}';").strip()
        caso("P3 control: la credencial del sistema sí cambia el correo de una cuenta (D-87, D-103)",
             c == 200 and fila == nuevo_3, f"respondió {c}; la cuenta quedó en {fila!r}")
        # Revisión del tramo 3, ronda 1: una solicitud que ya estaba pendiente
        # (anterior al bloqueo) tampoco se puede confirmar. El superusuario solo
        # fabrica el estado (bloqueo apagado, solicitud anotada); la confirmación
        # corre con el rol del servicio de autenticación. Supone que el servicio
        # confirma pasando email_change a email: es lo que hace en local, no se
        # comprobó en el servicio gestionado, y por eso este caso es solo local.
        r = psql(f"begin;\nalter table auth.users disable trigger impedir_cambio_de_correo_propio;\n"
                 f"update auth.users set email_change = 'pendiente-{uuid.uuid4()}@example.com' where id = '{id_1}';\n"
                 f"alter table auth.users enable trigger impedir_cambio_de_correo_propio;\n"
                 f"set local role supabase_auth_admin;\n"
                 f"update auth.users set email = email_change, email_change = '' where id = '{id_1}';\nrollback;\n",
                 usuario="supabase_admin")
        caso("N24 una solicitud pendiente de antes del bloqueo no se puede confirmar",
             r.returncode != 0 and MENSAJE_D103 in r.stderr, primera_linea(r.stderr) or "se aceptó")
        # La corrección excepcional, completa (revisión del tramo 3, ronda 1): la
        # credencial del sistema cambia el correo de la cuenta y el rol de las
        # migraciones reescribe el usuario, que es el único que puede leer las cuentas.
        nuevo_2 = f"corregido-{uuid.uuid4()}@example.com"
        c, _ = como_sistema("PUT", f"/auth/v1/admin/users/{id_2}", {"email": nuevo_2})
        r = psql(f"begin; update public.usuario set correo = '{nuevo_2}' where id = '{id_2}' returning correo; rollback;")
        caso("P10 corrección de un error de captura en dos pasos: cuenta y usuario quedan con el correo nuevo",
             c == 200 and r.returncode == 0 and nuevo_2 in r.stdout, f"respondió {c}; {primera_linea(r.stderr) or 'reescrito'}")
        r = psql(f"begin; update public.usuario set telefono = '+507 6000-0009' where id = '{id_2}'; rollback;")
        caso("N25 sin reescribir el correo, el usuario de la cuenta corregida no se puede escribir",
             r.returncode != 0 and "no es el de la cuenta" in r.stderr, primera_linea(r.stderr) or "se aceptó")

        # ---- es_mi_organizacion(uuid), con el pase de la persona.
        bueno = contenido(pase_1)
        c, _ = api("POST", "/auth/v1/logout?scope=local", {}, pase=pase_1_cerrada)
        if c != 204:
            sys.exit(f"ERROR: no se pudo cerrar la segunda sesión de la cuenta uno ({c}).")
        cerrada = contenido(pase_1_cerrada)

        def entrada_hace(segundos: int) -> dict:
            """El mismo pase, con el momento de entrada con contraseña movido al pasado."""
            return {**bueno, "amr": [{"method": "password", "timestamp": int(time.time()) - segundos}]}

        def mia(pase: dict, organizacion: str, antes: str = "", rol: str = "authenticated") -> str:
            return responde(con_pase(rol, pase, f"select public.es_mi_organizacion('{organizacion}');", antes=antes))

        caso("P4 usuario activo, sesión abierta, dentro del plazo: su organización es suya",
             mia(bueno, org_a) == "t", mia(bueno, org_a))
        caso("N10 la organización de otro no es suya", mia(bueno, org_b) == "f", mia(bueno, org_b))
        d = mia(bueno, org_a, antes=f"update public.usuario set activo = false where id = '{id_1}';")
        caso("N11 con el usuario inactivo, responde no", d == "f", d)
        caso("N12 con el pase de una sesión cerrada, responde no", mia(cerrada, org_a) == "f", mia(cerrada, org_a))
        d = mia(contenido(pase_3), org_a)
        caso("N13 una cuenta sin usuario no tiene organización", d == "f", d)
        sin_entrada = {k: v for k, v in bueno.items() if k != "amr"}
        caso("N14 un pase sin el momento de entrada con contraseña: responde no (ante la duda, vence)",
             mia(sin_entrada, org_a) == "f", mia(sin_entrada, org_a))
        otro_metodo = {**bueno, "amr": [{"method": "otp", "timestamp": int(time.time())}]}
        caso("N15 un pase cuya entrada no fue con contraseña: responde no",
             mia(otro_metodo, org_a) == "f", mia(otro_metodo, org_a))
        roto = {**bueno, "amr": "password"}
        d = mia(roto, org_a)
        caso("N16 un momento de entrada con forma inesperada: responde no, sin error", d == "f", d)
        d = mia(entrada_hace(30 * DIA + 60), org_a)
        caso("N17 entró hace 30 días y un minuto, con sesion_dias en 30: responde no", d == "f", d)
        d = mia(entrada_hace(30 * DIA - 60), org_a)
        caso("P5 entró hace 30 días menos un minuto: responde sí", d == "t", d)
        d = mia(entrada_hace(25 * 3600), org_a, antes=f"update public.organizacion set sesion_dias = 1 "
                                                      f"where id = '{org_a}';")
        caso("N18 sesion_dias pasa a 1 con la sesión abierta, entrada hace 25 horas: responde no", d == "f", d)
        d = mia(entrada_hace(25 * 3600), org_a)
        caso("P6 control de N18: la misma entrada con sesion_dias en 30 responde sí", d == "t", d)
        d = responde(con_pase("authenticated", bueno,
                              "select coalesce(public.es_mi_organizacion(null)::text, 'nulo');"))
        caso("N19 con un valor nulo responde no (no nulo)", d == "false", d)
        d = mia({"role": "anon"}, org_a, rol="anon")
        caso("N20 sin sesión responde no", d == "f", d)

        # Revisión del tramo 3, ronda 1. El plazo se compara en una función aparte,
        # para poder probar el instante exacto; y se cuenta en horas absolutas, sin
        # depender de la zona horaria de la sesión de la base.
        def plazo(entrada: str, dias: int, ahora: str, zona: str = "UTC") -> str:
            return responde(psql(f"begin; set local timezone to '{zona}';\n"
                                 f"select public.dentro_del_plazo(timestamptz '{entrada}', {dias}, "
                                 f"timestamptz '{ahora}');\nrollback;"))

        d = plazo("2026-10-26 12:00:00+00", 30, "2026-11-25 12:00:00+00")
        caso("P11 exactamente en el plazo, todavía vale", d == "t", d)
        d = plazo("2026-10-26 12:00:00+00", 30, "2026-11-25 12:00:00.000001+00")
        caso("N26 un instante después del plazo, ya no vale", d == "f", d)
        # Instantes fijos que cruzan el cambio de horario de New York (01/11/2026):
        # 30 días de calendario serían 721 horas; el plazo son 720. Con la hora
        # actual el caso solo distinguiría durante un mes (revisión interna).
        d = plazo("2026-10-26 12:00:00+00", 30, "2026-11-25 12:30:00+00", zona="America/New_York")
        caso("N27 en una zona con cambio de horario, 30 días son 720 horas: 720 h y media ya vencen", d == "f", d)
        # es_mi_organizacion decide el plazo con dentro_del_plazo, no con una
        # comparación propia: con la función cambiada para decir siempre «no»,
        # el mismo pase vigente de P4 ya no tiene organización.
        d = mia(bueno, org_a, antes="create or replace function public.dentro_del_plazo(entrada timestamptz, dias integer, "
                                    "ahora timestamptz) returns boolean language sql stable set search_path = '' "
                                    "as $$ select false $$;")
        caso("N29 es_mi_organizacion usa dentro_del_plazo: si el plazo dice no, responde no", d == "f", d)
        ahora = int(time.time())
        varias = {**bueno, "amr": [{"method": "password", "timestamp": ahora - 31 * DIA},
                                   {"method": "password", "timestamp": ahora}]}
        d = mia(varias, org_a)
        caso("N28 con dos entradas con contraseña, vale la más antigua: si venció, responde no", d == "f", d)
        varias = {**bueno, "amr": [{"method": "password", "timestamp": ahora},
                                   {"method": "password", "timestamp": "no-es-un-numero"},
                                   {"method": "password", "timestamp": ahora - 3600}]}
        d = mia(varias, org_a)
        caso("P12 con varias entradas vigentes y una mal formada, responde sí", d == "t", d)
        # El bloqueo de D-103 no estorba al servicio: la sesión se renueva y el
        # pase nuevo conserva el momento de entrada.
        c, renovado = api("POST", "/auth/v1/token?grant_type=refresh_token",
                          {"refresh_token": sesion_1["refresh_token"]})
        conserva = c == 200 and contenido(renovado["access_token"]).get("amr") == bueno.get("amr")
        caso("P13 con el bloqueo instalado, la sesión se renueva y conserva su momento de entrada", conserva,
             f"respondió {c}")

        # ---- Las reglas de separación, con dos organizaciones. Se da el permiso
        # de leer y una regla permisiva que deja todo, dentro de una transacción
        # que se deshace: así es la restrictiva la que corta. P8 es el control.
        def vistos(tabla: str, columna: str, valor: str, quitar: str = "") -> str:
            antes = (f"grant select on public.{tabla} to authenticated;\n"
                     f"create policy prueba_permisiva on public.{tabla} as permissive for select to public "
                     f"using (true);\n{quitar}")
            return responde(con_pase("authenticated", bueno,
                                     f"select count(*) from public.{tabla} where {columna} = '{valor}';",
                                     antes=antes))

        caso("P7 la persona ve su propio usuario", vistos("usuario", "id", id_1) == "1", vistos("usuario", "id", id_1))
        caso("N21 la persona no ve el usuario de otra organización", vistos("usuario", "id", id_2) == "0",
             vistos("usuario", "id", id_2))
        d = vistos("usuario", "id", id_2, quitar="drop policy usuario_separacion on public.usuario;\n")
        caso("P8 control de N21: sin la regla restrictiva, el mismo camino sí lo ve", d == "1", d)
        caso("P9 la persona ve su organización", vistos("organizacion", "id", org_a) == "1",
             vistos("organizacion", "id", org_a))
        caso("N22 la persona no ve la otra organización", vistos("organizacion", "id", org_b) == "0",
             vistos("organizacion", "id", org_b))
        r = con_pase("authenticated", bueno, "truncate public.usuario;")
        caso("N23 la persona no puede vaciar la tabla usuario", r.returncode != 0,
             "se rechaza" if r.returncode else "se aceptó")
    finally:
        psql(f"delete from public.usuario where id in ('{id_1}', '{id_2}', '{id_3}');")
        for cuenta in cuentas:
            quitar_cuenta(cuenta)
        psql(f"delete from public.organizacion where id in ('{org_a}', '{org_b}');")

    malos = resultados.count(False)
    print(f"prueba-usuario: {len(resultados) - malos} de {len(resultados)} casos dan lo esperado.")
    return 1 if malos else 0


if __name__ == "__main__":
    sys.exit(main())

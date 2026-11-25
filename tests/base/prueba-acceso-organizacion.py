#!/usr/bin/env python3
"""
Prueba con datos de lo que entrega HU-03.1 en la base, por las dos puertas:
la API de la base, con el pase de una persona, y el SQL directo.

- sesion_abierta(): lo que quedaba por comprobar al construir HU-03.1 y ya
  está comprobado («Comprobado al construir HU-03.1» de
  openspec/specs/acceso/spec.md, requisito «Separación por organización en
  la base»). Sí con la sesión abierta; no con el pase de una sesión cerrada,
  con la sesión de otra cuenta, sin identificador de sesión, con un pase que
  dice otro rol ni pasado el fin fijado de la sesión. Sin sesión no se puede
  preguntar. Mira la hora del inicio de cada consulta (riesgo aceptado
  D-102), acotada por el tiempo máximo de consulta de los roles de la API.
- organizacion: hasta el tramo 3 nadie la ve ni la cambia por la API (D-100),
  ni con sesión ni sin ella. es_mi_organizacion responde «no», y con una
  regla permisiva que deja todo es la restrictiva la que corta (con su
  control: sin la restrictiva, sí se ven filas).
- Las constraints de organizacion, con un caso que pasa y uno que no.

Crea una cuenta de prueba con correo de example.com y una organización de
prueba, que quita al terminar. La cuenta queda en la base local: es
desechable y `supabase db reset` la borra.

Necesita la base local levantada (`supabase start`) con las migraciones.

Uso:  python3 tests/base/prueba-acceso-organizacion.py
Sale con 0 si todos los casos dan lo esperado, y con 1 si alguno falla.
"""
import base64
import json
import re
import subprocess
import sys
import urllib.error
import urllib.request
import uuid
from pathlib import Path

RAIZ = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(RAIZ / "scripts" / "base"))
from base_local import psql, psql_ok  # noqa: E402


def entorno() -> dict:
    """URL y claves de la base local, tal como las da `supabase status`."""
    try:
        r = subprocess.run(["supabase", "status", "-o", "env"], cwd=RAIZ, capture_output=True, text=True, timeout=60)
    except FileNotFoundError:
        sys.exit("ERROR: no encuentro la herramienta supabase; sin ella no sé la URL ni las claves de la base local.")
    except subprocess.TimeoutExpired:
        sys.exit("ERROR: `supabase status` no respondió en 60 segundos. ¿Está levantada la base local?")
    valores = {}
    for linea in r.stdout.splitlines():
        if "=" in linea:
            k, v = linea.split("=", 1)
            valores[k.strip()] = v.strip().strip('"')
    faltan = [k for k in ("API_URL", "ANON_KEY", "SERVICE_ROLE_KEY") if not valores.get(k)]
    if faltan:
        sys.exit(f"ERROR: `supabase status` no dio {', '.join(faltan)}. ¿Está levantada la base local?")
    return valores


ENV = entorno()


def api(metodo: str, ruta: str, cuerpo=None, pase=None, clave=None, cabeceras=None):
    """Petición a la API local. Devuelve (código, cuerpo ya leído)."""
    h = {"apikey": clave or ENV["ANON_KEY"], "Content-Type": "application/json"}
    if pase:
        h["Authorization"] = "Bearer " + pase
    h.update(cabeceras or {})
    datos = json.dumps(cuerpo).encode() if cuerpo is not None else None
    req = urllib.request.Request(ENV["API_URL"] + ruta, data=datos, headers=h, method=metodo)
    try:
        with urllib.request.urlopen(req, timeout=30) as resp:
            texto = resp.read().decode()
            return resp.status, (json.loads(texto) if texto else None)
    except urllib.error.HTTPError as e:
        return e.code, e.read().decode()


def entrar(correo: str, clave: str) -> str:
    codigo, cuerpo = api("POST", "/auth/v1/token?grant_type=password", {"email": correo, "password": clave})
    if codigo != 200:
        sys.exit(f"ERROR: la cuenta de prueba no pudo entrar ({codigo}): {cuerpo}")
    return cuerpo["access_token"]


def crear_cuenta() -> tuple[str, str]:
    """Crea una cuenta de prueba con correo de example.com. Devuelve (correo, clave)."""
    correo, clave = f"prueba-{uuid.uuid4()}@example.com", f"Prueba-{uuid.uuid4()}"
    codigo, cuerpo = api("POST", "/auth/v1/admin/users", {"email": correo, "password": clave, "email_confirm": True},
                         pase=ENV["SERVICE_ROLE_KEY"], clave=ENV["SERVICE_ROLE_KEY"])
    if codigo != 200:
        sys.exit(f"ERROR: no se pudo crear la cuenta de prueba ({codigo}): {cuerpo}")
    return correo, clave


def contenido(pase: str) -> dict:
    """Lo que dice el pase (su parte central), sin comprobar la firma: solo para la prueba."""
    centro = pase.split(".")[1]
    return json.loads(base64.urlsafe_b64decode(centro + "=" * (-len(centro) % 4)))


def con_pase(rol: str, pase: dict, consulta: str, antes: str = "", usuario: str = "postgres"
             ) -> subprocess.CompletedProcess:
    """Corre `consulta` como la persona: con su rol y lo que dice su pase, como la API se lo pasa
    a la base. `antes` corre como `usuario` dentro de la misma transacción, que se deshace."""
    return psql(f"begin;\n{antes}\nset local role {rol};\n"
                f"set local request.jwt.claims = '{json.dumps(pase)}';\n{consulta}\nrollback;\n",
                usuario=usuario)


def main() -> int:
    resultados = []

    def caso(nombre: str, ok: bool, detalle: str):
        resultados.append(ok)
        print(f"{'✓' if ok else '✗'} {nombre}: {detalle}")

    # Preparación: una organización y una cuenta con dos sesiones.
    nombre_org = f"Organización de prueba {uuid.uuid4()}"
    org_id = psql_ok(f"insert into public.organizacion (nombre, zona_horaria) "
                     f"values ('{nombre_org}', 'America/Panama') returning id;").strip()
    correo, clave = crear_cuenta()
    pase_a, pase_b = entrar(correo, clave), entrar(correo, clave)
    # Otra cuenta, con su propia sesión abierta: para probar que una sesión
    # ajena no vale aunque esté abierta.
    pase_otra = entrar(*crear_cuenta())

    try:
        # sesion_abierta(): la comprobación que la spec dejó para este ticket.
        c, r = api("POST", "/rest/v1/rpc/sesion_abierta", {}, pase=pase_a)
        caso("P1 sesión abierta", (c, r) == (200, True), f"respondió {c} {r}")
        c, _ = api("POST", "/auth/v1/logout?scope=local", {}, pase=pase_a)
        if c != 204:
            sys.exit(f"ERROR: no se pudo cerrar la sesión A ({c}).")
        c, r = api("POST", "/rest/v1/rpc/sesion_abierta", {}, pase=pase_a)
        caso("N1 pase de una sesión cerrada, sin expirar", (c, r) == (200, False), f"respondió {c} {r}")
        c, r = api("POST", "/rest/v1/rpc/sesion_abierta", {}, pase=pase_b)
        caso("P2 la otra sesión de la misma cuenta sigue abierta", (c, r) == (200, True), f"respondió {c} {r}")
        c, r = api("POST", "/rest/v1/rpc/sesion_abierta", {})
        caso("N2 sin pase no se puede preguntar", c in (401, 403), f"respondió {c}")

        # sesion_abierta() por SQL directo, con lo que dice el pase: cada condición
        # de la función con su caso. P4 es el control: el mismo camino sí dice «sí».
        def responde(r: subprocess.CompletedProcess) -> str:
            return r.stdout.strip() if r.returncode == 0 else f"error: {r.stderr.strip()}"

        pase_bueno, pase_ajeno = contenido(pase_b), contenido(pase_otra)
        r = con_pase("authenticated", pase_bueno, "select public.sesion_abierta();")
        caso("P4 por SQL, con el pase de la sesión abierta, responde sí", responde(r) == "t", responde(r))
        r = con_pase("authenticated", {**pase_bueno, "session_id": pase_ajeno["session_id"]},
                     "select public.sesion_abierta();")
        caso("N23 la sesión abierta de otra cuenta no vale", responde(r) == "f", responde(r))
        r = con_pase("authenticated", {k: v for k, v in pase_bueno.items() if k != "session_id"},
                     "select public.sesion_abierta();")
        caso("N24 un pase sin identificador de sesión no vale", responde(r) == "f", responde(r))
        r = con_pase("authenticated", {**pase_bueno, "role": "service_role"}, "select public.sesion_abierta();")
        caso("N25 un pase que dice otro rol no vale", responde(r) == "f", responde(r))
        r = con_pase("anon", {**pase_bueno, "role": "anon"}, "select public.sesion_abierta();")
        caso("N26 sin sesión (rol anon) no se puede preguntar",
             r.returncode != 0 and "permission denied" in r.stderr, responde(r))
        r = con_pase("authenticated", pase_bueno, "select public.sesion_abierta();",
                     antes=f"update auth.sessions set not_after = now() - interval '1 minute' "
                           f"where id = '{pase_bueno['session_id']}';",
                     usuario="supabase_admin")
        caso("N27 una sesión que pasó su fin fijado no vale", responde(r) == "f", responde(r))
        r = con_pase("authenticated", pase_bueno, "select public.sesion_abierta();",
                     antes=f"update auth.sessions set not_after = now() + interval '1 hour' "
                           f"where id = '{pase_bueno['session_id']}';",
                     usuario="supabase_admin")
        caso("P6 una sesión con fin fijado en el futuro sí vale", responde(r) == "t", responde(r))
        r = con_pase("authenticated", pase_bueno, "select pg_sleep(1.5);\nselect public.sesion_abierta();",
                     antes=f"update auth.sessions set not_after = clock_timestamp() + interval '1 second' "
                           f"where id = '{pase_bueno['session_id']}';",
                     usuario="supabase_admin")
        caso("N32 la sesión cuyo fin pasa entre dos consultas de la misma transacción ya no vale en la segunda "
             "(hora de inicio de cada consulta, no de la transacción)", responde(r) == "f", responde(r))
        # Riesgo aceptado (D-102): la función mira la hora en que EMPEZÓ la
        # consulta, como corresponde a una función declarada STABLE. Una sola
        # consulta que empezó antes del fin conserva su respuesta hasta terminar.
        # Este caso lo deja escrito: si cambia, cambió la garantía declarada.
        # El fin se fija 3 segundos adelante y la consulta espera 4: hay margen
        # para que la consulta empiece antes del fin aunque la máquina vaya
        # lenta (revisión del tramo 2, ronda 4).
        r = con_pase("authenticated", pase_bueno,
                     "select public.sesion_abierta() from (select pg_sleep(4)) espera;",
                     antes=f"update auth.sessions set not_after = clock_timestamp() + interval '3 seconds' "
                           f"where id = '{pase_bueno['session_id']}';",
                     usuario="supabase_admin")
        caso("P7 una consulta que empezó antes del fin conserva su respuesta hasta terminar (riesgo aceptado, "
             "D-102)", responde(r) == "t", responde(r))
        # Lo que acota D-102: el tiempo máximo de consulta de los roles de la
        # API. Si una actualización lo quita o lo sube, la cobertura declarada
        # deja de ser cierta y este caso lo dice. N37 es el control de la lectura.
        def hasta_8s(config: str) -> bool:
            """¿Trae statement_timeout, mayor que cero y de 8 segundos o menos?
            `config` es un ajuste del rol por línea, tal como los da unnest(rolconfig)."""
            valores = [a.split("=", 1)[1] for a in config.splitlines() if a.startswith("statement_timeout=")]
            if len(valores) != 1:
                return False
            m = re.fullmatch(r"(\d+)\s*(ms|s|min)?", valores[0].strip())
            if not m:
                return False
            ms = int(m.group(1)) * {"ms": 1, None: 1, "s": 1000, "min": 60000}[m.group(2)]
            return 0 < ms <= 8000

        for rol in ("authenticator", "authenticated"):
            config = psql_ok(f"select c from pg_roles, unnest(rolconfig) c where rolname = '{rol}';").strip()
            caso(f"P9 {rol} trae un tiempo máximo de consulta de 8 segundos o menos (cobertura de D-102)",
                 hasta_8s(config), " · ".join(config.splitlines()) or "sin ajustes")
        caso("N37 control: un tiempo máximo de 30 segundos, uno de cero, o ninguno, no pasan la lectura",
             not hasta_8s("statement_timeout=30s") and not hasta_8s("statement_timeout=0")
             and not hasta_8s("lock_timeout=8s") and not hasta_8s("")
             and hasta_8s("lock_timeout=8s\nstatement_timeout=8s"), "lectura comprobada")

        # organizacion por la API: nadie la ve ni la cambia hasta el tramo 3 (D-100).
        # Hoy la API la rechaza antes de llegar a la regla, porque las personas
        # todavía no tienen permiso de leer (lo da HU-02.1); una respuesta vacía
        # también vale. Lo que no vale es recibir la fila.
        filtro = f"/rest/v1/organizacion?id=eq.{org_id}&select=id"
        c, r = api("GET", filtro, pase=pase_b)
        caso("N3 con sesión no se ve la organización", (c, r) == (200, []) or c in (401, 403), f"respondió {c}")
        c, r = api("GET", filtro)
        caso("N4 sin sesión no se ve la organización", (c, r) == (200, []) or c in (401, 403), f"respondió {c}")
        c, r = api("POST", "/rest/v1/organizacion", {"nombre": f"Intrusa {uuid.uuid4()}", "zona_horaria": "UTC"},
                   pase=pase_b)
        caso("N5 con sesión no se crea una organización", c in (401, 403), f"respondió {c}")
        c, r = api("PATCH", f"/rest/v1/organizacion?id=eq.{org_id}", {"sesion_dias": 1}, pase=pase_b,
                   cabeceras={"Prefer": "return=representation"})
        dias = psql_ok(f"select sesion_dias from public.organizacion where id = '{org_id}';").strip()
        caso("N6 con sesión no se cambia una organización", c in (200, 401, 403) and dias == "30",
             f"respondió {c}; sesion_dias quedó en {dias}")

        # La regla en sí: con el permiso de leer y escribir dado dentro de una
        # transacción que se deshace, como lo dará HU-02.1, la regla sigue sin
        # dejar ver ni cambiar nada. Se consulta como la persona: con su rol y
        # con su pase, que es lo que la API le pasa a la base.
        def como_persona(rol: str, consulta: str) -> subprocess.CompletedProcess:
            pase = json.dumps({"sub": str(uuid.uuid4()), "role": rol, "session_id": str(uuid.uuid4())})
            return psql(f"begin;\ngrant select, insert, update, delete on public.organizacion to {rol};\n"
                        f"set local role {rol};\nset local request.jwt.claims = '{pase}';\n"
                        f"{consulta}\nrollback;\n")

        for rol, n in (("authenticated", "N12"), ("anon", "N13")):
            r = como_persona(rol, "select count(*) from public.organizacion;")
            caso(f"{n} {rol}, con permiso de leer, no ve ninguna fila (hay al menos una)",
                 r.returncode == 0 and r.stdout.strip() == "0", f"vio {r.stdout.strip() or r.stderr.strip()}")
        r = como_persona("authenticated", "insert into public.organizacion (nombre, zona_horaria) "
                                          f"values ('N14 {uuid.uuid4()}', 'UTC');")
        caso("N14 authenticated, con permiso de escribir, no crea una organización",
             r.returncode != 0 and "row-level security" in r.stderr, r.stderr.strip().splitlines()[0] if r.stderr else "se aceptó")
        r = como_persona("authenticated", f"with c as (update public.organizacion set sesion_dias = 1 "
                                          f"where id = '{org_id}' returning 1) select count(*) from c;")
        caso("N15 authenticated, con permiso de escribir, no cambia una organización",
             r.returncode == 0 and r.stdout.strip() == "0", f"cambió {r.stdout.strip() or r.stderr.strip()}")
        r = como_persona("authenticated", f"with c as (delete from public.organizacion "
                                          f"where id = '{org_id}' returning 1) select count(*) from c;")
        caso("N16 authenticated, con permiso de quitar, no quita una organización",
             r.returncode == 0 and r.stdout.strip() == "0", f"quitó {r.stdout.strip() or r.stderr.strip()}")
        r = como_persona("authenticated", "truncate public.organizacion;")
        caso("N17 authenticated no puede vaciar la tabla", r.returncode != 0, "se rechaza" if r.returncode else "se aceptó")

        # es_mi_organizacion() hasta el tramo 3 (D-100): responde «no» siempre. Sin
        # regla permisiva la base ya no deja ver nada, así que N12 a N16 pasarían
        # aunque respondiera «sí». Por eso se prueba la función directamente y,
        # con una regla permisiva que deja todo, que es la restrictiva la que corta.
        # P5 es el control: sin la restrictiva, el mismo camino sí ve filas.
        consulta = f"select public.es_mi_organizacion('{org_id}');"
        r = con_pase("authenticated", pase_bueno, consulta)
        caso("N28 con sesión, es_mi_organizacion responde no", responde(r) == "f", responde(r))
        r = con_pase("anon", {"role": "anon"}, consulta)
        caso("N29 sin sesión, es_mi_organizacion responde no", responde(r) == "f", responde(r))
        permisiva = ("grant select, insert on public.organizacion to authenticated;\n"
                     "create policy prueba_permisiva on public.organizacion as permissive for all to public "
                     "using (true) with check (true);\n")
        r = con_pase("authenticated", pase_bueno, "select count(*) from public.organizacion;", antes=permisiva)
        caso("N30 con una regla permisiva que deja todo, la restrictiva no deja ver nada",
             responde(r) == "0", f"vio {responde(r)}")
        r = con_pase("authenticated", pase_bueno, "insert into public.organizacion (nombre, zona_horaria) "
                                                  f"values ('N31 {uuid.uuid4()}', 'UTC');", antes=permisiva)
        caso("N31 con una regla permisiva que deja todo, la restrictiva no deja crear",
             r.returncode != 0 and "row-level security" in r.stderr, responde(r))
        r = con_pase("authenticated", pase_bueno, "select count(*) from public.organizacion;",
                     antes=permisiva + "drop policy organizacion_separacion on public.organizacion;\n")
        caso("P5 control: sin la regla restrictiva, el mismo camino sí ve filas",
             responde(r).isdigit() and int(responde(r)) >= 1, f"vio {responde(r)}")
        # «Siempre no» es para cualquier valor, no solo para los identificadores
        # de las filas que existen: un valor especial o nulo, y una fila nueva
        # con el identificador elegido por quien escribe.
        r = con_pase("authenticated", pase_bueno,
                     "select public.es_mi_organizacion('00000000-0000-0000-0000-000000000000');")
        caso("N33 con el identificador nulo de ceros, es_mi_organizacion responde no", responde(r) == "f",
             responde(r))
        r = con_pase("authenticated", pase_bueno, "select coalesce(public.es_mi_organizacion(null)::text, 'nulo');")
        # Exactamente «no», no un nulo: una función marcada STRICT conserva el
        # cuerpo «SELECT false;» pero ante un nulo responde nulo sin ejecutarlo.
        caso("N34 con un valor nulo, es_mi_organizacion responde no (no nulo)", responde(r) == "false",
             responde(r))
        r = con_pase("authenticated", pase_bueno,
                     "insert into public.organizacion (id, nombre, zona_horaria) values "
                     f"('00000000-0000-0000-0000-000000000000', 'N35 {uuid.uuid4()}', 'UTC');", antes=permisiva)
        caso("N35 con una regla permisiva, tampoco se crea eligiendo el identificador",
             r.returncode != 0 and "row-level security" in r.stderr, responde(r))
        # Y el cuerpo mismo, sin comentarios: en el tramo 2 es solo «SELECT false;».
        # HU-01.1 (tramo 3) lo cambia, y con él este caso.
        # Se quitan los comentarios de línea («--» hasta el fin de la línea, también
        # al final de una sentencia) y los de bloque («/* … */»), y se normalizan
        # los espacios. Límite declarado: no entiende comentarios de bloque
        # anidados, que PostgreSQL admite; con uno, N36 daría un rojo falso (el
        # lado seguro), no un verde falso. P8 es el control del normalizador:
        # no consulta la base, pero corre dentro de esta prueba, que sí la necesita.
        def sin_comentarios(texto: str) -> str:
            texto = re.sub(r"/\*.*?\*/", " ", texto, flags=re.DOTALL)
            texto = re.sub(r"--[^\n]*", " ", texto)
            return " ".join(texto.split())

        muestra = "-- D-100\n  SELECT /* bloque\n de dos líneas */ false; -- al final\n"
        caso("P8 control: el normalizador quita comentarios de línea, al final y de bloque",
             sin_comentarios(muestra) == "SELECT false;", repr(sin_comentarios(muestra)))
        cuerpo = psql_ok("select prosrc from pg_proc where oid = 'public.es_mi_organizacion(uuid)'::regprocedure;")
        sentencia = sin_comentarios(cuerpo)
        caso("N36 el cuerpo de es_mi_organizacion es solo «SELECT false;» (D-100)", sentencia == "SELECT false;",
             f"cuerpo: {sentencia!r}")

        # Constraints, por SQL directo, dentro de una transacción que se deshace.
        def inserta(valores: str) -> bool:
            r = psql(f"begin; insert into public.organizacion (nombre, zona_horaria, sesion_dias) "
                     f"values {valores}; rollback;")
            return r.returncode == 0

        caso("P3 zona horaria de la lista estándar", inserta(f"('P3 {uuid.uuid4()}', 'America/Lima', 1)"),
             "se acepta")
        caso("N18 zona horaria que la base no reconoce", not inserta(f"('N18 {uuid.uuid4()}', 'America/Atlantida', 30)"),
             "se rechaza")
        caso("N19 desplazamiento escrito como zona", not inserta(f"('N19 {uuid.uuid4()}', 'UTC+5', 30)"),
             "se rechaza")
        caso("N20 sesion_dias en cero", not inserta(f"('N20 {uuid.uuid4()}', 'UTC', 0)"), "se rechaza")
        caso("N21 nombre repetido", not inserta(f"('{nombre_org}', 'UTC', 30)"), "se rechaza")
        caso("N22 sin zona horaria",
             psql("begin; insert into public.organizacion (nombre) values ('N22'); rollback;").returncode != 0,
             "se rechaza")
    finally:
        psql_ok(f"delete from public.organizacion where id = '{org_id}';")

    malos = resultados.count(False)
    print(f"prueba-acceso-organizacion: {len(resultados) - malos} de {len(resultados)} casos dan lo esperado.")
    return 1 if malos else 0


if __name__ == "__main__":
    sys.exit(main())

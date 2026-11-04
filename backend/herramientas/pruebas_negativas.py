"""Pruebas negativas de A14 contra una pila aislada con la configuración de producción.

Se ejecuta en la computadora anfitriona, con Docker y los puertos 80 y 443 libres:

    python backend/herramientas/pruebas_negativas.py

Usa el proyecto `wt-seg`, que crea y borra, y el modo prueba: datos ficticios, sin conexión
a SAT2. Nunca muestra claves ni identificadores de sesión. Termina con código 1 si algo falla.
"""

import concurrent.futures
import json
import os
import pathlib
import re
import secrets
import ssl
import subprocess
import tempfile
import time
import urllib.error
import urllib.parse
import urllib.request

RAIZ = pathlib.Path(__file__).resolve().parents[2]
BASE = "https://localhost"
CONTEXTO = ssl.create_default_context()
CONTEXTO.check_hostname = False
CONTEXTO.verify_mode = ssl.CERT_NONE


class SinRedireccion(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, *a, **k):
        return None


ABRIDOR = urllib.request.build_opener(SinRedireccion, urllib.request.HTTPSHandler(context=CONTEXTO))
FALLAS = []


def comprobar(nombre, condicion, detalle=""):
    print(("ok   " if condicion else "FALLA"), nombre, detalle if not condicion else "")
    if not condicion:
        FALLAS.append(nombre)


def pedir(ruta, metodo="GET", cuerpo=None, galleta=None, tipo="application/json", url_cruda=False):
    cabeceras = {}
    datos = None
    if cuerpo is not None:
        datos = cuerpo if isinstance(cuerpo, bytes) else json.dumps(cuerpo).encode()
        cabeceras["Content-Type"] = tipo
    if galleta:
        cabeceras["Cookie"] = galleta
    pedido = urllib.request.Request(BASE + ruta, data=datos, headers=cabeceras, method=metodo)
    try:
        r = ABRIDOR.open(pedido, timeout=60)
    except urllib.error.HTTPError as e:
        r = e
    except Exception as e:  # noqa: BLE001
        return 0, {}, type(e).__name__.encode()
    return getattr(r, "status", None) or r.code, r.headers, r.read()


def compose(archivo, *args):
    return subprocess.run(
        ["docker", "compose", "-p", "wt-seg", "--env-file", archivo, "-f", "docker-compose.yml", "-f", "docker-compose.prod.yml", *args],
        cwd=RAIZ, capture_output=True, text=True, encoding="utf-8", errors="replace",
    )


def admin(archivo, *args):
    return compose(archivo, "exec", "-T", "api", "python", "-m", "app.administracion", *args)


def crear(archivo, email, *equipos):
    salida = admin(archivo, "crear-usuario", "--email", email, "--nombre", "Prueba").stdout
    clave = re.search(r"una sola vez: (\S+)", salida).group(1)
    for equipo in equipos:
        for _ in range(30):
            if admin(archivo, "asignar-estacion", "--email", email, "--id-equipo", str(equipo)).returncode == 0:
                break
            time.sleep(1)
    return clave


def entrar(email, clave):
    codigo, cabeceras, _ = pedir("/api/v1/auth/login", "POST", {"email": email, "contrasena": clave})
    return codigo, cabeceras.get("Set-Cookie", "")


carpeta = pathlib.Path(tempfile.mkdtemp())
env = carpeta / "seg.env"
env.write_text(
    f"SAT2_MODO=prueba\nPOSTGRES_PASSWORD={secrets.token_hex(32)}\nDIRECCION_WEB=localhost\nCARGA_PAUSA_SEGUNDOS=0\n",
    encoding="utf-8",
)
E = str(env)
try:
    arriba = compose(E, "up", "--build", "-d", "--wait", "--wait-timeout", "300")
    print("up:", arriba.returncode)
    if arriba.returncode:
        print(arriba.stderr[-500:])
        raise SystemExit(1)

    clave_a = crear(E, "a@ejemplo.com", 1)
    clave_b = crear(E, "b@ejemplo.com", 2)
    codigo, galleta_cruda = entrar("a@ejemplo.com", clave_a)
    galleta_a = galleta_cruda.split(";")[0]
    atributos = galleta_cruda.lower()
    print("\n== Sesion y cookie")
    comprobar("login valido", codigo == 200)
    comprobar("cookie Secure", "secure" in atributos)
    comprobar("cookie HttpOnly", "httponly" in atributos)
    comprobar("cookie SameSite", "samesite=lax" in atributos)
    comprobar("cookie Path=/api", "path=/api" in atributos)

    estaciones = json.loads(pedir("/api/v1/estaciones", galleta=galleta_a)[2])
    propia = estaciones[0]["id"]
    comprobar("solo ve su estacion", len(estaciones) == 1)
    codigo_b, galleta_b_cruda = entrar("b@ejemplo.com", clave_b)
    galleta_b = galleta_b_cruda.split(";")[0]
    ajena = json.loads(pedir("/api/v1/estaciones", galleta=galleta_b)[2])[0]["id"]
    sensores_a = json.loads(pedir(f"/api/v1/estaciones/{propia}/condiciones-actuales", galleta=galleta_a)[2])["sensores"]
    sensores_b = json.loads(pedir(f"/api/v1/estaciones/{ajena}/condiciones-actuales", galleta=galleta_b)[2])["sensores"]
    sensor_a, sensor_b = sensores_a[0]["sensor_id"], sensores_b[0]["sensor_id"]
    rango = urllib.parse.urlencode({"desde": "2026-11-01T00:00:00+00:00", "hasta": "2026-11-02T00:00:00+00:00"})

    print("\n== Sin sesion: todas las rutas del contrato")
    contrato = json.loads(pedir("/api/openapi.json")[2])
    publicas = {"/api/v1/auth/login", "/api/v1/auth/logout", "/api/v1/salud"}
    for ruta, metodos in contrato["paths"].items():
        if ruta in publicas:
            continue
        real = ruta.replace("{estacionId}", str(propia)).replace("{sensorId}", str(sensor_a))
        for metodo in metodos:
            sufijo = f"?{rango}" if "historico" in ruta else ""
            comprobar(f"sin sesion {metodo} {ruta}", pedir(real + sufijo, metodo.upper())[0] == 401)
    for nombre, valor in [("inventada", "wt_sesion=" + secrets.token_urlsafe(32)), ("vacia", "wt_sesion="), ("sqli", "wt_sesion=' OR '1'='1"), ("larga", "wt_sesion=" + "a" * 4000)]:
        comprobar(f"cookie {nombre}", pedir("/api/v1/estaciones", galleta=valor)[0] == 401)

    print("\n== Autorizacion entre cuentas")
    for sufijo in ("recomendacion", "condiciones-actuales", f"sensores/{sensor_b}/historico?{rango}"):
        codigo, _, cuerpo = pedir(f"/api/v1/estaciones/{ajena}/{sufijo}", galleta=galleta_a)
        comprobar(f"estacion ajena {sufijo.split('?')[0]}", codigo == 403 and b"sensores" not in cuerpo, str(codigo))
    comprobar("sensor ajeno por estacion propia", pedir(f"/api/v1/estaciones/{propia}/sensores/{sensor_b}/historico?{rango}", galleta=galleta_a)[0] == 404)

    print("\n== Entradas en rutas")
    for nombre, ruta in [
        ("id enorme", f"/api/v1/estaciones/{10**30}/recomendacion"),
        ("id bigint limite", f"/api/v1/estaciones/{2**63}/recomendacion"),
        ("id negativo", "/api/v1/estaciones/-1/recomendacion"),
        ("id texto", "/api/v1/estaciones/abc/recomendacion"),
        ("id inyeccion", "/api/v1/estaciones/1%20OR%201=1/recomendacion"),
        ("sensor enorme", f"/api/v1/estaciones/{propia}/sensores/{10**30}/historico?{rango}"),
    ]:
        codigo = pedir(ruta, galleta=galleta_a)[0]
        comprobar(f"{nombre} ({codigo})", codigo in (403, 404, 422), str(codigo))

    print("\n== Fechas del historico")
    base = f"/api/v1/estaciones/{propia}/sensores/{sensor_a}/historico?"
    for nombre, desde, hasta in [
        ("sin zona", "2026-11-01T00:00:00", "2026-11-02T00:00:00"),
        ("invertidas", "2026-11-02T00:00:00+00:00", "2026-11-01T00:00:00+00:00"),
        ("mas de 31 dias", "2026-01-01T00:00:00+00:00", "2026-11-01T00:00:00+00:00"),
        ("texto", "ayer", "hoy"),
        ("minima", "0001-01-01T00:00:00+00:00", "0001-01-02T00:00:00+00:00"),
        ("minima con zona", "0001-01-01T00:00:00+14:00", "0001-01-02T00:00:00+14:00"),
        ("maxima", "9999-12-30T00:00:00+00:00", "9999-12-31T23:59:59+00:00"),
        ("maxima con zona", "9999-12-30T00:00:00-14:00", "9999-12-31T23:59:59-14:00"),
    ]:
        consulta = urllib.parse.urlencode({"desde": desde, "hasta": hasta})
        codigo, _, cuerpo = pedir(base + consulta, galleta=galleta_a)
        comprobar(f"fecha {nombre} ({codigo})", codigo in (200, 422), f"{codigo} {cuerpo[:60]!r}")

    print("\n== Entradas del login")
    for nombre, cuerpo, tipo in [
        ("sqli correo", {"email": "' OR 1=1 --", "contrasena": "x"}, "application/json"),
        ("sqli clave", {"email": "c@ejemplo.com", "contrasena": "' OR '1'='1"}, "application/json"),
        ("correo con NUL", {"email": "n\u0000ul@ejemplo.com", "contrasena": "x"}, "application/json"),
        ("clave con NUL", {"email": "d@ejemplo.com", "contrasena": "x\u0000y"}, "application/json"),
        ("correo largo", {"email": "x" * 255 + "@e.com", "contrasena": "x"}, "application/json"),
        ("clave larga", {"email": "e@ejemplo.com", "contrasena": "x" * 1025}, "application/json"),
        ("correo tipo objeto", {"email": {"$ne": ""}, "contrasena": "x"}, "application/json"),
        ("lista", [1, 2], "application/json"),
        ("JSON roto", b"{", "application/json"),
        ("text/plain", b'{"email":"f@ejemplo.com","contrasena":"x"}', "text/plain"),
        ("formulario", b"email=g@ejemplo.com&contrasena=x", "application/x-www-form-urlencoded"),
    ]:
        codigo, _, respuesta = pedir("/api/v1/auth/login", "POST", cuerpo, tipo=tipo)
        comprobar(f"login {nombre} ({codigo})", codigo in (401, 422), f"{codigo} {respuesta[:60]!r}")
    secreto = "NO-REPETIR-" + secrets.token_hex(4)
    _, _, respuesta = pedir("/api/v1/auth/login", "POST", {"email": 5, "contrasena": secreto})
    comprobar("error no repite la clave", secreto.encode() not in respuesta)
    codigo, _, _ = pedir("/api/v1/auth/login", "POST", b'{"email":"' + b"x" * 100_000 + b'"}')
    comprobar(f"cuerpo de 100 KB rechazado por el proxy ({codigo})", codigo == 413, str(codigo))
    # Con un cuerpo grande, Caddy puede cortar la conexión antes de que termine el envío.
    codigo, _, _ = pedir("/api/v1/auth/login", "POST", b'{"email":"' + b"x" * 3_000_000 + b'"}')
    comprobar(f"cuerpo de 3 MB rechazado por el proxy ({codigo})", codigo in (413, 0), str(codigo))

    print("\n== Bloqueo y enumeracion")
    clave_v = crear(E, "victima@ejemplo.com", 1)
    t0 = time.perf_counter(); pedir("/api/v1/auth/login", "POST", {"email": "victima@ejemplo.com", "contrasena": "mala"}); t_existe = time.perf_counter() - t0
    t0 = time.perf_counter(); r_no = pedir("/api/v1/auth/login", "POST", {"email": "noexiste@ejemplo.com", "contrasena": "mala"}); t_no = time.perf_counter() - t0
    r_si = pedir("/api/v1/auth/login", "POST", {"email": "victima@ejemplo.com", "contrasena": "mala"})
    comprobar("mismo mensaje exista o no", r_no[2] == r_si[2] and r_no[0] == r_si[0] == 401)
    print(f"     tiempos: existe {t_existe*1000:.0f} ms, no existe {t_no*1000:.0f} ms")
    comprobar("tiempos comparables", abs(t_existe - t_no) < max(t_existe, t_no) * 0.6, f"{t_existe:.3f} {t_no:.3f}")
    for _ in range(3):
        pedir("/api/v1/auth/login", "POST", {"email": "victima@ejemplo.com", "contrasena": "mala"})
    codigo, cabeceras, _ = pedir("/api/v1/auth/login", "POST", {"email": "victima@ejemplo.com", "contrasena": clave_v})
    comprobar("clave correcta rechazada durante el bloqueo", codigo == 429 and cabeceras.get("Retry-After") is not None, str(codigo))
    comprobar("mayusculas no evaden el bloqueo", pedir("/api/v1/auth/login", "POST", {"email": " VICTIMA@ejemplo.com ", "contrasena": clave_v})[0] == 429)
    for _ in range(5):
        pedir("/api/v1/auth/login", "POST", {"email": "fantasma@ejemplo.com", "contrasena": "mala"})
    comprobar("un correo inexistente tambien se bloquea", pedir("/api/v1/auth/login", "POST", {"email": "fantasma@ejemplo.com", "contrasena": "mala"})[0] == 429)

    print("\n== Vida de la sesion")
    clave_c = crear(E, "ciclo@ejemplo.com", 1)
    galleta_c = entrar("ciclo@ejemplo.com", clave_c)[1].split(";")[0]
    comprobar("sesion activa", pedir("/api/v1/estaciones", galleta=galleta_c)[0] == 200)
    pedir("/api/v1/auth/logout", "POST", galleta=galleta_c)
    comprobar("logout invalida en el servidor", pedir("/api/v1/estaciones", galleta=galleta_c)[0] == 401)
    galleta_c = entrar("ciclo@ejemplo.com", clave_c)[1].split(";")[0]
    nueva = re.search(r"una sola vez: (\S+)", admin(E, "restablecer-clave", "--email", "ciclo@ejemplo.com").stdout).group(1)
    comprobar("restablecer clave cierra sesiones", pedir("/api/v1/estaciones", galleta=galleta_c)[0] == 401)
    comprobar("la clave vieja deja de servir", entrar("ciclo@ejemplo.com", clave_c)[0] == 401)
    galleta_c = entrar("ciclo@ejemplo.com", nueva)[1].split(";")[0]
    admin(E, "desactivar-usuario", "--email", "ciclo@ejemplo.com")
    comprobar("desactivar corta la sesion", pedir("/api/v1/estaciones", galleta=galleta_c)[0] == 401)
    comprobar("cuenta inactiva no entra", entrar("ciclo@ejemplo.com", nueva)[0] == 401)

    print("\n== Archivos y cabeceras")
    for ruta in ("/.env", "/.git/config", "/../../etc/passwd", "/..%2f..%2fetc%2fpasswd", "/api/../.env", "/backend/app/semillas.py", "/docker-compose.yml"):
        codigo, _, cuerpo = pedir(ruta)
        filtrado = any(x in cuerpo for x in (b"root:", b"POSTGRES_PASSWORD", b"[core]", b"import os"))
        comprobar(f"sin filtracion {ruta} ({codigo})", not filtrado)
    _, cabeceras, _ = pedir("/")
    for nombre in ("Strict-Transport-Security", "X-Content-Type-Options", "X-Frame-Options", "Referrer-Policy", "Content-Security-Policy"):
        comprobar(f"cabecera {nombre}", cabeceras.get(nombre) is not None)
    comprobar(f"sin cabecera Server en la web ({cabeceras.get('Server')})", cabeceras.get("Server") is None)
    _, cabeceras, _ = pedir("/api/v1/salud")
    comprobar(f"sin cabecera Server en la API ({cabeceras.get('Server')})", cabeceras.get("Server") is None)
    codigo, _, cuerpo = pedir("/api/v1/noexiste")
    comprobar(f"ruta inexistente sin detalles ({codigo})", codigo == 404 and b"Traceback" not in cuerpo)

    print("\n== Aislamiento de credenciales y puertos")
    nombres = "nombreDeUsuario clave SAT2_URL_BASE".split()
    salida = compose(E, "exec", "-T", "api", "python", "-c", f"import os; print([n for n in {nombres!r} if n in os.environ])").stdout.strip()
    comprobar(f"la API no recibe credenciales SAT2 {salida}", salida == "[]")
    filas = [json.loads(l) for l in compose(E, "ps", "--format", "json").stdout.splitlines() if l.strip()]
    publicados = sorted({p["PublishedPort"] for s in filas for p in s["Publishers"] if p["PublishedPort"]})
    comprobar(f"solo 80 y 443 publicados {publicados}", publicados == [80, 443])
    usuarios = {s["Service"]: compose(E, "exec", "-T", s["Service"], "id", "-u").stdout.strip() for s in filas}
    print("     usuario por servicio:", usuarios)
    comprobar("API y worker sin root", usuarios.get("api") != "0" and usuarios.get("worker") != "0")

    print("\n== Rafaga de logins: memoria de la API")
    def intento(i):
        return pedir("/api/v1/auth/login", "POST", {"email": f"r{i}@ejemplo.com", "contrasena": "mala"})[0]
    t0 = time.perf_counter()
    with concurrent.futures.ThreadPoolExecutor(60) as grupo:
        codigos = list(grupo.map(intento, range(180)))
    duracion = time.perf_counter() - t0
    pico = compose(E, "exec", "-T", "api", "cat", "/sys/fs/cgroup/memory.peak").stdout.strip()
    print(f"     180 logins en {duracion:.1f} s; codigos {sorted(set(codigos))}; pico de memoria {int(pico or 0)/2**20:.0f} MiB")
    comprobar("la API sigue viva tras la rafaga", pedir("/api/v1/salud")[0] == 200)
    comprobar("pico de memoria menor a 1 GiB", int(pico or 0) < 2**30, f"{int(pico or 0)/2**20:.0f} MiB")
finally:
    print("\ndown:", compose(E, "down", "-v").returncode)
    env.unlink()
    carpeta.rmdir()
    print("FALLAS:", len(FALLAS))
    for falla in FALLAS:
        print(" -", falla)

raise SystemExit(1 if FALLAS else 0)

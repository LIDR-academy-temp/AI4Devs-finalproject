"""HU-01.6: pruebas contra el servicio de autenticación en local. Uso: prueba.py API ANON SERVICE CORREO_URL"""
import base64
import json
import re
import sys
import time
import urllib.error
import urllib.request

API, ANON, SERVICE, MAIL = sys.argv[1:5]
SELLO = str(int(time.time()))


class SinRedireccion(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, *a, **k):
        return None


abrir = urllib.request.build_opener(SinRedireccion)


def req(metodo, url, clave=ANON, token=None, cuerpo=None):
    if not url.startswith("http"):
        url = API + url
    h = {"apikey": clave, "Authorization": "Bearer " + (token or clave), "Content-Type": "application/json"}
    d = json.dumps(cuerpo).encode() if cuerpo is not None else None
    r = urllib.request.Request(url, data=d, headers=h, method=metodo)
    t0 = time.time()
    try:
        x = abrir.open(r)
        st, txt, hd = x.status, x.read().decode(), x.headers
    except urllib.error.HTTPError as e:
        st, txt, hd = e.code, e.read().decode(), e.headers
    ms = int((time.time() - t0) * 1000)
    try:
        j = json.loads(txt) if txt else {}
    except ValueError:
        j = {"_texto": txt[:200]}
    return st, j, hd, ms


def crear(nombre):
    correo = f"{nombre}-{SELLO}@example.com"
    st, j, _, _ = req("POST", "/auth/v1/admin/users", SERVICE, cuerpo={"email": correo, "password": "Clave-inicial-1", "email_confirm": True})
    assert st == 200, (st, j)
    return correo, j["id"]


def entrar(correo, clave="Clave-inicial-1"):
    return req("POST", "/auth/v1/token?grant_type=password", cuerpo={"email": correo, "password": clave})


def refrescar(rt):
    return req("POST", "/auth/v1/token?grant_type=refresh_token", cuerpo={"refresh_token": rt})


def yo(at):
    return req("GET", "/auth/v1/user", token=at)


def claims(at):
    p = at.split(".")[1]
    return json.loads(base64.urlsafe_b64decode(p + "=" * (-len(p) % 4)))


def enlaces(correo):
    """Enlaces de verificación de los correos enviados a esa dirección, del más viejo al más nuevo."""
    time.sleep(1.5)
    st, j, _, _ = req("GET", MAIL + "/api/v1/messages?limit=200")
    ms = [m for m in j.get("messages", []) if any(correo == t.get("Address") for t in m.get("To", []))]
    ms.sort(key=lambda m: m["Created"])
    out = []
    for m in ms:
        _, d, _, _ = req("GET", MAIL + "/api/v1/message/" + m["ID"])
        cuerpo = (d.get("HTML") or "") + (d.get("Text") or "")
        out += [u.replace("&amp;", "&") for u in re.findall(r"https?://[^\s\"'<>]+/auth/v1/verify[^\s\"'<>]+", cuerpo)][:1]
    return out


def abrir_enlace(u):
    st, j, hd, _ = req("GET", u)
    loc = hd.get("Location", "")
    err = re.search(r"error_code=([^&#]+)", loc)
    ok = not err and bool(re.search(r"[#?&](access_token|code)=", loc))
    return st, ("ACEPTADO" if ok else "RECHAZADO " + (err.group(1) if err else loc[:80]))


def titulo(t):
    print("\n== " + t)


# P1 ---------------------------------------------------------------
titulo("P1 · Fijar una contraseña nueva: ¿se cierran solas las demás sesiones?")
c, uid = crear("p1")
_, s1, _, _ = entrar(c)
_, s2, _, _ = entrar(c)
st, j, _, _ = req("PUT", "/auth/v1/user", token=s1["access_token"], cuerpo={"password": "Clave-nueva-2"})
print("cambio de contraseña desde la sesión 1:", st)
print("sesión 2, pase ya emitido, consulta al servicio:", yo(s2["access_token"])[0])
st2, j2, _, _ = refrescar(s2["refresh_token"])
print("sesión 2, renovar:", st2, j2.get("error_code", ""))
st1, j1, _, _ = refrescar(s1["refresh_token"])
print("sesión 1 (la que cambió la contraseña), renovar:", st1, j1.get("error_code", ""))

# P2 ---------------------------------------------------------------
titulo("P2 · Cerrar las demás sesiones a propósito: ¿el servidor lo detecta antes de que venza el pase?")
c, uid = crear("p2")
_, s1, _, _ = entrar(c)
_, s2, _, _ = entrar(c)
print("cerrar las demás desde la sesión 1:", req("POST", "/auth/v1/logout?scope=others", token=s1["access_token"])[0])
st, j, _, _ = yo(s2["access_token"])
print("sesión 2, pase ya emitido, consulta al servicio:", st, j.get("error_code", ""))
st, j, _, _ = refrescar(s2["refresh_token"])
print("sesión 2, renovar:", st, j.get("error_code", ""))
print("sesión 1, consulta al servicio:", yo(s1["access_token"])[0])
print("cerrar la propia (sesión 1):", req("POST", "/auth/v1/logout?scope=local", token=s1["access_token"])[0])
st, j, _, _ = yo(s1["access_token"])
print("sesión 1 ya cerrada, pase ya emitido, consulta al servicio:", st, j.get("error_code", ""))

# P3 ---------------------------------------------------------------
titulo("P3 · Enlace de contraseña: un solo uso y el más reciente invalida al anterior")
c, uid = crear("p3")
print("pedir enlace 1:", req("POST", "/auth/v1/recover", cuerpo={"email": c})[0])
time.sleep(2.5)
print("pedir enlace 2:", req("POST", "/auth/v1/recover", cuerpo={"email": c})[0])
ls = enlaces(c)
print("correos con enlace recibidos:", len(ls))
if len(ls) >= 2:
    print("abrir el enlace viejo:", abrir_enlace(ls[0]))
    print("abrir el enlace nuevo:", abrir_enlace(ls[-1]))
    print("abrir el enlace nuevo otra vez:", abrir_enlace(ls[-1]))

# P4 ---------------------------------------------------------------
titulo("P4 · Cuenta bloqueada en el servicio: entrada, pase vigente, renovación, enlace vigente y enlace nuevo")
c, uid = crear("p4")
_, s1, _, _ = entrar(c)
req("POST", "/auth/v1/recover", cuerpo={"email": c})
previo = enlaces(c)
st, j, _, _ = req("PUT", "/auth/v1/admin/users/" + uid, SERVICE, cuerpo={"ban_duration": "876000h"})
print("bloquear:", st, "| bloqueada hasta:", j.get("banned_until"))
st, j, _, _ = entrar(c)
print("entrar:", st, j.get("error_code", ""))
st, j, _, _ = yo(s1["access_token"])
print("pase ya emitido, consulta al servicio:", st, j.get("error_code", ""))
st, j, _, _ = refrescar(s1["refresh_token"])
print("renovar:", st, j.get("error_code", ""))
if previo:
    print("abrir el enlace emitido antes del bloqueo:", abrir_enlace(previo[-1]))
time.sleep(2.5)
antes = len(enlaces(c))
st, j, _, _ = req("POST", "/auth/v1/recover", cuerpo={"email": c})
print("pedir enlace estando bloqueada:", st, json.dumps(j)[:80], "| correos nuevos:", len(enlaces(c)) - antes)

# P5 ---------------------------------------------------------------
titulo("P5 · ¿La aplicación puede saber cuándo entró la persona?")
c, uid = crear("p5")
_, s1, _, _ = entrar(c)
k1 = claims(s1["access_token"])
print("campos del pase:", sorted(k1.keys()))
print("amr al entrar:", k1.get("amr"), "| iat:", k1.get("iat"), "| session_id:", bool(k1.get("session_id")))
time.sleep(3)
_, r1, _, _ = refrescar(s1["refresh_token"])
k2 = claims(r1["access_token"])
print("amr tras renovar:", k2.get("amr"), "| iat:", k2.get("iat"))
print("la marca de entrada se conserva al renovar:", k1["amr"][0].get("timestamp") == k2["amr"][0].get("timestamp"), "| el iat cambia:", k1["iat"] != k2["iat"])
print("ID_SESION", k1.get("session_id"))

# P6 ---------------------------------------------------------------
titulo("P6 · «Olvidé mi contraseña»: ¿la respuesta delata si hay cuenta?")
c, uid = crear("p6")
a = req("POST", "/auth/v1/recover", cuerpo={"email": c})
b = req("POST", "/auth/v1/recover", cuerpo={"email": f"nadie-{SELLO}@example.com"})
print("cuenta existente:", a[0], json.dumps(a[1]), a[3], "ms")
print("cuenta inexistente:", b[0], json.dumps(b[1]), b[3], "ms")
ta, tb = [], []
for i in range(5):
    time.sleep(1.2)
    tb.append(req("POST", "/auth/v1/recover", cuerpo={"email": f"nadie{i}-{SELLO}@example.com"})[3])
    ta.append(entrar(c, "mala")[3])
print("tiempos recuperación inexistente (ms):", tb)
x = [entrar(f"nadie-{SELLO}@example.com", "mala") for _ in range(3)]
y = [entrar(c, "mala") for _ in range(3)]
print("entrada con cuenta inexistente:", x[0][0], x[0][1].get("error_code"), [i[3] for i in x], "ms")
print("entrada con contraseña mala:", y[0][0], y[0][1].get("error_code"), [i[3] for i in y], "ms")

# P7 ---------------------------------------------------------------
titulo("P7 · Intentos fallidos: ¿hay bloqueo por cuenta?")
c, uid = crear("p7")
cod = [entrar(c, "mala-%d" % i)[0] for i in range(20)]
print("20 intentos con contraseña mala:", {k: cod.count(k) for k in set(cod)})
print("después, con la contraseña buena:", entrar(c)[0])

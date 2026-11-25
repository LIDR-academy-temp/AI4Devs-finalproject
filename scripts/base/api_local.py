"""
Acceso a la API de la base local (servicio de autenticación y API de datos)
para las pruebas de tests/base/ que necesitan cuentas y pases reales.

La URL y las claves salen de `supabase status`; son las de la base local, que
la herramienta publica para desarrollo. Todo mensaje de error lo redactamos
nosotros: si la herramienta no responde o la API rechaza algo, se dice qué
pasó y cómo seguir.

Nació en HU-01.1 (tramo 3) copiando las funciones de
tests/base/prueba-acceso-organizacion.py, que todavía tiene las suyas.
"""
import base64
import json
import subprocess
import sys
import urllib.error
import urllib.request
import uuid
from pathlib import Path

from base_local import psql

RAIZ = Path(__file__).resolve().parents[2]


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
    # Revisión del tramo 3, ronda 1: también los fallos de transporte y de
    # lectura llevan mensaje nuestro, no el rastro de urllib.
    except (urllib.error.URLError, TimeoutError, ConnectionError) as e:
        sys.exit(f"ERROR: la API local no respondió en {ENV['API_URL']} ({metodo} {ruta}): {e}. "
                 "¿Está levantada la base local (scripts/base/levantar-base.sh)?")
    except (json.JSONDecodeError, UnicodeDecodeError) as e:
        sys.exit(f"ERROR: la API local respondió algo que no es JSON a {metodo} {ruta}: {e}.")


def como_sistema(metodo: str, ruta: str, cuerpo=None):
    """Petición con la credencial del sistema (la que usan los administradores técnicos)."""
    return api(metodo, ruta, cuerpo, pase=ENV["SERVICE_ROLE_KEY"], clave=ENV["SERVICE_ROLE_KEY"])


def entrar_completo(correo: str, clave: str) -> dict:
    """Entra con contraseña y devuelve la respuesta entera del servicio (pase y pase de renovación)."""
    codigo, cuerpo = api("POST", "/auth/v1/token?grant_type=password", {"email": correo, "password": clave})
    if codigo != 200:
        sys.exit(f"ERROR: la cuenta de prueba no pudo entrar ({codigo}): {cuerpo}")
    return cuerpo


def entrar(correo: str, clave: str) -> str:
    return entrar_completo(correo, clave)["access_token"]


def crear_cuenta() -> tuple[str, str, str]:
    """Crea una cuenta de prueba con correo de example.com. Devuelve (identificador, correo, clave)."""
    correo, clave = f"prueba-{uuid.uuid4()}@example.com", f"Prueba-{uuid.uuid4()}"
    codigo, cuerpo = como_sistema("POST", "/auth/v1/admin/users",
                                  {"email": correo, "password": clave, "email_confirm": True})
    if codigo != 200:
        sys.exit(f"ERROR: no se pudo crear la cuenta de prueba ({codigo}): {cuerpo}")
    return cuerpo["id"], correo, clave


def quitar_cuenta(identificador: str) -> None:
    """Quita una cuenta de prueba. Si no se puede, lo dice; la base local es desechable."""
    codigo, cuerpo = como_sistema("DELETE", f"/auth/v1/admin/users/{identificador}")
    if codigo != 200:
        print(f"AVISO: no se pudo quitar la cuenta de prueba {identificador} ({codigo}): {cuerpo}. "
              "`supabase db reset` la borra.")


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


def responde(r: subprocess.CompletedProcess) -> str:
    """La salida de una consulta, o «error: …» con el mensaje del motor si falló."""
    return r.stdout.strip() if r.returncode == 0 else f"error: {r.stderr.strip()}"

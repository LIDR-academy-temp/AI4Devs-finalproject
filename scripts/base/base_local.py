"""
Acceso a la base local para scripts/base/ y para las pruebas de tests/base/.

La base local la levanta `supabase start` (ver readme.md). Este módulo no
abre conexiones propias: le pasa el SQL al cliente psql que viene dentro del
contenedor de la base, que se llama `supabase_db_<project_id>`; el project_id
se lee de supabase/config.toml. Así sirve igual en la máquina y en la
integración continua, sin instalar psql.

Todo mensaje de error lo redactamos nosotros: si el contenedor no está, o
psql falla, se dice qué pasó y cómo seguir.
"""
import re
import subprocess
import sys
from pathlib import Path

RAIZ = Path(__file__).resolve().parents[2]
CONFIG = RAIZ / "supabase" / "config.toml"


def contenedor() -> str:
    """Nombre del contenedor de la base, a partir del project_id."""
    if not CONFIG.is_file():
        sys.exit(f"ERROR: no encuentro {CONFIG.relative_to(RAIZ)}; sin él no sé qué base usar.")
    m = re.search(r'^project_id\s*=\s*"([^"]+)"', CONFIG.read_text(encoding="utf-8"), re.M)
    if not m:
        sys.exit("ERROR: supabase/config.toml no declara project_id; no sé qué base usar.")
    return f"supabase_db_{m.group(1)}"


def psql(sql: str, *, detener_en_error: bool = True, usuario: str = "postgres") -> subprocess.CompletedProcess:
    """Corre `sql` en la base local. Devuelve el proceso completo.

    Por defecto como postgres, el rol con el que corren las migraciones. Las
    pruebas que necesitan fabricar un estado que postgres no puede crear (por
    ejemplo, cambiar un rol reservado) pasan usuario="supabase_admin", el
    superusuario de la base local; nunca se usa para comprobar.
    Salida sin alineación, separada por tabuladores y sin encabezados (-At).
    """
    orden = ["docker", "exec", "-i", contenedor(), "psql", "-U", usuario, "-d", "postgres",
             "-X", "-q", "-At", "-F", "\t"]
    if detener_en_error:
        orden += ["-v", "ON_ERROR_STOP=1"]
    try:
        return subprocess.run(orden, input=sql, capture_output=True, text=True, timeout=120)
    except FileNotFoundError:
        sys.exit("ERROR: no encuentro docker. La base local corre en Docker: ábrelo y corre `supabase start`.")
    except subprocess.TimeoutExpired:
        sys.exit("ERROR: la base local no respondió en 120 segundos.")


def leer_sql(fichero: Path) -> str:
    """Lee un fichero SQL del repositorio, con nuestro mensaje si no se puede."""
    try:
        return fichero.read_text(encoding="utf-8")
    except FileNotFoundError:
        sys.exit(f"ERROR: no existe {fichero}; sin él no hay qué comprobar.")
    except (OSError, UnicodeDecodeError) as e:
        sys.exit(f"ERROR: no se puede leer {fichero} ({type(e).__name__}: {e}).")


def psql_ok(sql: str) -> str:
    """Como psql(), pero detiene la prueba con nuestro mensaje si falla."""
    r = psql(sql)
    if r.returncode != 0:
        if "No such container" in r.stderr or "is not running" in r.stderr:
            sys.exit(f"ERROR: la base local no está levantada (contenedor {contenedor()}). "
                     "Corre `supabase start` y repite.")
        sys.exit(f"ERROR: la base rechazó la consulta.\n--- motivo del motor ---\n{r.stderr.strip()}")
    return r.stdout

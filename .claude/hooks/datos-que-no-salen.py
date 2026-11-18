#!/usr/bin/env python3
"""
datos-que-no-salen — impide que secretos, nombres reales, correos de dominios
reales o ficheros .env entren en un commit de este repositorio, que es público.

Tres formas de uso, con la misma revisión:

  1. Hook PreToolUse de Claude Code (por defecto). Recibe por stdin el JSON de
     la herramienta. Solo actúa cuando el comando trae un `git commit`.
     Bloquea con código de salida 2: con 0 solo sugeriría.
  2. Hook pre-commit de git (`--pre-commit`). Revisa lo preparado y la
     identidad definitiva del commit. Bloquea con código de salida 1.
  3. Hook commit-msg de git (`--commit-msg <fichero>`). Revisa el mensaje del
     commit, que también es público. Bloquea con código de salida 1.

Los dos hooks de git los instala `scripts/instalar-guardarrailes.sh`, porque
los hooks de git no viajan con el clon.

Qué revisa, sobre lo que está preparado para el commit (staged):
  - ficheros .env (se admite .env.example, que solo lleva `NOMBRE=` sin valor);
  - claves y secretos con forma reconocible;
  - correos cuyo dominio no es de ejemplo ni están entre los permitidos;
  - los términos de la lista privada (nombres reales de empresas, clientes,
    personas, contratos y dominios);
  - lo mismo en la RUTA de cada fichero, no solo en su contenido;
  - binarios: solo entran los de extensión permitida (imágenes), y de esos se
    revisan las cadenas de texto legibles. Cualquier otro binario se detiene,
    porque su contenido no se puede leer.

Y además, sobre los metadatos del commit, que también son públicos:
  - el correo del autor y el de quien hace el commit deben estar entre los
    permitidos. Un correo corporativo en los metadatos revela la empresa
    aunque el contenido esté anonimizado;
  - el mensaje del commit pasa por la misma revisión de texto.

La lista privada vive FUERA de git. Su ruta se toma de la variable de entorno
CT_LISTA_PRIVADA o, si no está, del fichero local `.datos-que-no-salen.ruta`
(ignorado por git), que contiene la ruta en una línea.

Formato de la lista privada, una entrada por línea:
  término              texto, sin distinguir mayúsculas. Con 6 caracteres o
                       más se busca en cualquier parte, también pegado a otras
                       letras; más corto, solo como palabra completa (una sigla
                       corta buscada en cualquier parte detendría palabras
                       comunes que la contienen)
  re: expresión        expresión regular
  autor: correo        correo permitido como autor de los commits (al menos uno)
  # comentario

Modo Claude Code: revisa ANTES de que el comando corra. Por eso exige que el
`git commit` sea la PRIMERA orden del comando y que vaya escrito a la vista:
  - nada antes del commit (ni `git add`, ni `cd`, ni variables de entorno),
    porque cambiaría lo preparado después de la revisión;
  - sin `-a`, `-i`, `-o`, `-p` ni rutas, que preparan ficheros al vuelo;
  - sin `--author`, `-c user.email`, `-C` ni `-c` de commit, que traen una
    identidad que no se puede ver antes de que corra;
  - sin `--no-verify` ni `-n`, que saltan los hooks de git;
  - sin sustituciones (`$(...)` o comillas invertidas), variables (`$MSG`),
    comodines sin comillas (`*`, `?`, `[`, `{`) ni envoltorios (`bash -c`,
    `env`, `eval`): lo que el shell expande después no es lo que se revisó;
  - sin `--git-dir` ni `--work-tree`. Con `-C <ruta>` se revisa el repositorio
    de esa ruta, que es el que recibe el commit.
El mensaje se revisa donde venga: `-m`, `-F <fichero>`, un heredoc o `--trailer`.
El nombre del autor y el de quien hace el commit pasan por la lista privada.

Límites conocidos (riesgos aceptados):
  - el modo Claude Code solo ve un commit escrito como `git commit` en el
    comando. Un alias, un script o `make` que hagan el commit por dentro no los
    ve: esos los detiene el pre-commit de git, que debe estar instalado;
  - de un binario permitido solo se leen las cadenas ASCII de 8 caracteres o
    más. Texto comprimido o en otra codificación dentro de una imagen no se ve;
  - `--no-verify` escrito a mano en la terminal salta los hooks de git. Está
    prohibido en CLAUDE.md; el modo Claude Code lo detiene, pero a una persona
    en su terminal el hook no puede impedírselo;
  - un correo solo se reconoce si su dominio lleva punto y termina en letras
    (`persona@example.com`). `persona@empresa`, sin punto, no se detiene:
    buscarlo detendría texto legítimo como `usuario@localhost`. El nombre de
    una empresa lo cubre la lista privada.

Si la lista no se puede leer, o algo falla al revisar, el hook NO deja pasar:
declara que quedó ciego y bloquea. Un control que calla cuando no puede medir
aparenta más de lo que hace.

Cada bloqueo deja una línea fechada en docs/seguridad/registro-de-bloqueos.md.
La línea dice la categoría, el fichero y el número de línea; NUNCA el texto
encontrado, porque el registro también es público. Si el hallazgo está en la
ruta, la ruta tampoco se escribe. Si el registro no se puede escribir, se
advierte en pantalla y el commit se detiene igual.
"""
import datetime
import json
import os
import re
import shlex
import subprocess
import sys
from pathlib import Path

RAIZ = Path(__file__).resolve().parents[2]
REGISTRO = RAIZ / "docs" / "seguridad" / "registro-de-bloqueos.md"
FICHERO_RUTA = RAIZ / ".datos-que-no-salen.ruta"

DOMINIOS_DE_EJEMPLO = {"example.com", "example.org", "example.net"}
# Direcciones exactas, no dominios: la del pie «Co-Authored-By» de Claude Code.
# Va armada por partes para que este fichero no contenga ningún correo real.
CORREOS_PERMITIDOS = {"noreply" + "@" + "anthropic.com"}
EXTENSIONES_BINARIAS_PERMITIDAS = {".png", ".jpg", ".jpeg", ".gif", ".webp", ".ico"}
LARGO_PARA_BUSCAR_EN_CUALQUIER_PARTE = 6

SECRETOS = [
    ("clave con prefijo sk-", re.compile(r"\bsk-[A-Za-z0-9_-]{20,}")),
    ("token con forma de JWT", re.compile(r"\beyJ[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}")),
    ("clave privada", re.compile(r"-----BEGIN [A-Z ]*PRIVATE KEY-----")),
    ("token de GitHub", re.compile(r"\b(ghp_[A-Za-z0-9]{30,}|github_pat_[A-Za-z0-9_]{30,})")),
    ("clave de acceso de AWS", re.compile(r"\b(AKIA|ASIA)[0-9A-Z]{16}\b")),
    ("clave con prefijo re_", re.compile(r"\bre_[A-Za-z0-9]{20,}\b")),
    ("valor asignado a una variable secreta", re.compile(
        r"(?i)\b[A-Z0-9_]*(SECRET|PASSWORD|SERVICE_ROLE_KEY|API_KEY|TOKEN)[A-Z0-9_]*"
        r"\s*[=:]\s*[\"']?[A-Za-z0-9_\-./+]{16,}")),
]
# El dominio debe terminar en letras: así `paquete@1.2.3` no se toma por un correo.
CORREO = re.compile(
    r"[A-Za-z0-9._%+-]+@([A-Za-z0-9-]+(?:\.[A-Za-z0-9-]+)*\.[A-Za-z]{2,})(?![A-Za-z0-9-])")
LINEA_DE_ENV_EXAMPLE = re.compile(r"[A-Za-z_][A-Za-z0-9_]*=")
CADENA_LEGIBLE = re.compile(rb"[\x20-\x7e]{8,}")
ES_COMMIT = re.compile(r"\bgit\b[^|;&]*\bcommit\b")
ASIGNACION = re.compile(r"[A-Za-z_][A-Za-z0-9_]*=")
REDIRECCION = re.compile(r"\d*(>>|>|<)(.*)", re.S)
HEREDOC = re.compile(r"<<(-?)[ \t]*(?:'([^'\n]*)'|\"([^\"\n]*)\"|(\\?)([^\s;&|<>()'\"]+))")
SUSTITUCION_CON_COMMIT = re.compile(r"(\$\(|`)[^)`]*\bgit\b[^)`]*\bcommit\b")
VARIABLE_TRAS_DOLAR = set("abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789_{@*#?!$-")

# Órdenes que pueden nombrar «git commit» sin hacerlo: no se tratan como commit.
ORDENES_QUE_SOLO_LEEN = {"echo", "printf", "grep", "egrep", "fgrep", "rg", "cat",
                         "head", "tail", "wc", "ls"}
GIT_GLOBAL_CON_VALOR = {"-C", "-c", "--git-dir", "--work-tree", "--namespace",
                        "--super-prefix", "--config-env", "--exec-path"}
GIT_GLOBAL_QUE_CAMBIA_EL_REPOSITORIO = {"--git-dir", "--work-tree", "--namespace"}
COMMIT_LARGAS_QUE_PREPARAN = {"all", "include", "only", "patch", "interactive",
                              "pathspec-from-file"}
COMMIT_LARGAS_QUE_REUTILIZAN = {"reuse-message", "reedit-message"}
COMMIT_LARGAS_CON_VALOR = {"message", "file", "author", "date", "fixup", "squash",
                           "template", "cleanup", "trailer"} | COMMIT_LARGAS_QUE_REUTILIZAN
COMMIT_LARGAS_SIN_VALOR = {"amend", "no-edit", "edit", "reset-author", "no-verify",
                           "verify", "signoff", "no-signoff", "quiet", "verbose",
                           "allow-empty", "allow-empty-message", "dry-run", "short",
                           "branch", "porcelain", "long", "null", "status", "no-status",
                           "no-post-rewrite", "no-gpg-sign", "gpg-sign", "untracked-files"}

# Rutas en las que se encontró algo privado: no se escriben en el registro.
RUTAS_QUE_NO_SE_REGISTRAN = set()
MENSAJE = "(mensaje del commit)"
# El repositorio que se revisa. En los hooks de git es este. En modo Claude Code
# es el que recibe el commit: el directorio del comando más sus `-C`.
DONDE = {"directorio": str(RAIZ)}


class Ciego(Exception):
    """No se pudo revisar. El hook bloquea y lo declara."""


# --- git ---------------------------------------------------------------------

def git_bytes(*args):
    r = subprocess.run(["git", "-C", DONDE["directorio"], *args], capture_output=True)
    if r.returncode != 0:
        raise Ciego("git %s falló" % args[0].lstrip("-"))
    return r.stdout


def git(*args):
    # Se decodifica a mano: el modo texto de subprocess convierte un retorno de
    # carro suelto en salto de línea, y partiría en dos una línea agregada.
    return git_bytes(*args).decode("utf-8", "surrogateescape")


# --- lista privada -----------------------------------------------------------

def leer_lista_privada():
    """Devuelve (patrones, autores). Lanza Ciego si la lista no sirve para revisar."""
    ruta = os.environ.get("CT_LISTA_PRIVADA", "").strip()
    if not ruta:
        if not FICHERO_RUTA.is_file():
            raise Ciego("no está definida CT_LISTA_PRIVADA ni existe %s" % FICHERO_RUTA.name)
        ruta = FICHERO_RUTA.read_text(encoding="utf-8").strip()
    ruta = os.path.expandvars(os.path.expanduser(ruta))
    try:
        lineas = Path(ruta).read_text(encoding="utf-8").splitlines()
    except (OSError, UnicodeDecodeError):
        raise Ciego("no se pudo leer la lista privada")
    patrones, autores = [], set()
    for linea in lineas:
        termino = linea.strip()
        if not termino or termino.startswith("#"):
            continue
        if termino.lower().startswith("autor:"):
            correo = termino[6:].strip().lower()
            if correo:
                autores.add(correo)
            continue
        try:
            if termino.startswith("re:"):
                patrones.append(re.compile(termino[3:].strip(), re.IGNORECASE))
            elif len(termino) >= LARGO_PARA_BUSCAR_EN_CUALQUIER_PARTE:
                patrones.append(re.compile(re.escape(termino), re.IGNORECASE))
            else:
                # [^\W_] es «letra o dígito», también con tilde.
                patrones.append(re.compile(
                    r"(?<![^\W_])" + re.escape(termino) + r"(?![^\W_])", re.IGNORECASE))
        except re.error:
            raise Ciego("la lista privada tiene una expresión inválida")
    if not patrones:
        raise Ciego("la lista privada no tiene ningún término")
    if not autores:
        raise Ciego("la lista privada no declara ningún correo de autor (línea «autor: correo»)")
    return patrones, autores


# --- revisión ----------------------------------------------------------------

def revisar_texto(texto, patrones, correos_admitidos=frozenset()):
    """Genera (categoría, pista para la pantalla) de lo que no debe salir en un texto."""
    for categoria, patron in SECRETOS:
        m = patron.search(texto)
        if m:
            yield categoria, m.group(0)[:6] + "…"
    for m in CORREO.finditer(texto):
        if (m.group(0).lower() not in CORREOS_PERMITIDOS
                and m.group(0).lower() not in correos_admitidos
                and m.group(1).lower() not in DOMINIOS_DE_EJEMPLO):
            yield "correo de dominio real", "@" + m.group(1)
    for patron in patrones:
        m = patron.search(texto)
        if m:
            yield "término de la lista privada", m.group(0)


def ficheros_preparados():
    """Genera (ruta, es_binario) de lo que el commit agrega o cambia; lo borrado no entra."""
    salida = git("diff", "--cached", "--numstat", "-z", "--no-renames", "--diff-filter=d")
    for campo in salida.split("\0"):
        if campo:
            agregadas, _, ruta = campo.split("\t", 2)
            yield ruta, agregadas == "-"


def lineas_agregadas(ruta):
    """Genera (número de línea, texto) de cada línea que el commit agrega en un fichero.

    Se pide el diff de un solo fichero, así que la ruta no hay que leerla de la
    cabecera. Dentro de un bloque toda línea empieza por «+», «-» o «\\»; por eso
    una que empiece por «diff --git » o «@@» siempre es cabecera, y una que
    empiece por «+» después de un «@@» siempre es contenido, aunque sea «+++ ».
    """
    en_cabecera, numero = True, 0
    salida = git("--literal-pathspecs", "diff", "--cached", "-U0", "--no-color",
                 "--no-ext-diff", "--no-textconv", "--no-renames", "--", ruta)
    for linea in salida.split("\n"):
        if linea.startswith("diff --git "):
            en_cabecera = True
        elif linea.startswith("@@"):
            en_cabecera = False
            m = re.search(r"\+(\d+)", linea)
            numero = int(m.group(1)) if m else 0
        elif linea.startswith("+") and not en_cabecera:
            yield numero, linea[1:]
            numero += 1


def revisar_identidad(patrones, autores, conserva_autor):
    """El correo debe estar entre los permitidos; el nombre no puede traer nada privado."""
    hallazgos = []
    identidades = []
    for papel, variable in (("autor", "GIT_AUTHOR_IDENT"),
                            ("quien hace el commit", "GIT_COMMITTER_IDENT")):
        m = re.match(r"(.*?)\s*<([^>]*)>", git("var", variable), re.S)
        identidades.append((papel, m.group(1) if m else "", m.group(2).strip().lower() if m else ""))
    if conserva_autor:
        identidades.append(("autor del commit que se enmienda",
                            git("log", "-1", "--format=%an").strip(),
                            git("log", "-1", "--format=%ae").strip().lower()))
    for papel, nombre, correo in identidades:
        if correo not in autores:
            hallazgos.append(("correo no permitido en los metadatos (%s)" % papel, "-", 0,
                              "@" + correo.rpartition("@")[2]))
        for categoria, pista in revisar_texto(nombre, patrones):
            hallazgos.append(("%s, en el nombre de %s" % (categoria, papel), "-", 0, pista))
    return hallazgos


def revisar_preparado(patrones):
    """Devuelve la lista de hallazgos: (categoría, fichero, línea, pista para la pantalla)."""
    hallazgos = []
    for ruta, es_binario in ficheros_preparados():
        base = Path(ruta).name
        extension = Path(ruta).suffix.lower()

        for categoria, pista in revisar_texto(ruta, patrones):
            RUTAS_QUE_NO_SE_REGISTRAN.add(ruta)
            hallazgos.append((categoria + ", en la ruta", ruta, 0, pista))

        minuscula = base.lower()
        if (minuscula == ".env" or minuscula.startswith(".env.")) and base != ".env.example":
            hallazgos.append(("fichero .env", ruta, 0, base))

        if es_binario:
            if extension not in EXTENSIONES_BINARIAS_PERMITIDAS:
                hallazgos.append(("binario que no se puede revisar", ruta, 0,
                                  "extensión %s" % (extension or "(ninguna)")))
                continue
            for cadena in CADENA_LEGIBLE.findall(git_bytes("cat-file", "blob", ":0:" + ruta)):
                for categoria, pista in revisar_texto(cadena.decode("ascii"), patrones):
                    hallazgos.append((categoria + ", dentro de un binario", ruta, 0, pista))
            continue

        for numero, texto in lineas_agregadas(ruta):
            for categoria, pista in revisar_texto(texto, patrones):
                hallazgos.append((categoria, ruta, numero, pista))
            if base == ".env.example":
                limpia = texto.strip()
                if limpia and not limpia.startswith("#") and not LINEA_DE_ENV_EXAMPLE.fullmatch(limpia):
                    hallazgos.append(("valor en .env.example (solo se admite NOMBRE= vacío)",
                                      ruta, numero, ""))
    return hallazgos


def revisar_mensaje(texto, patrones, autores):
    """Revisa el mensaje ENTERO, comentarios incluidos.

    No se quitan las líneas con «#» ni lo que sigue a la tijera: que git las
    descarte o no depende del modo de limpieza, y con `-m` no las descarta.
    Los correos de autor permitidos se admiten aquí, porque ya son públicos en
    los metadatos y git los escribe en la plantilla al enmendar.
    """
    hallazgos = []
    for numero, linea in enumerate(texto.split("\n"), 1):
        for categoria, pista in revisar_texto(linea, patrones, autores):
            hallazgos.append((categoria, MENSAJE, numero, pista))
    return hallazgos


# --- lectura del comando (modo Claude Code) -----------------------------------

def partir(comando):
    """Parte un comando de shell en órdenes simples.

    Devuelve (órdenes, hay_sustitución). Cada orden es un dict con «texto»,
    «heredoc» (lista de cuerpos) y «expansion» (si el shell va a cambiar el
    texto antes de ejecutarlo: una variable o un comodín sin comillas simples).
    Separan órdenes, fuera de comillas: salto de línea, «;», «|», «&» y los
    paréntesis.
    """
    ordenes = []
    orden = {"partes": [], "heredoc": [], "expansion": False}
    pendientes = []   # heredocs anunciados en la línea: (delimitador, citado, quita_tabs, orden)
    sustitucion = False
    comilla = None
    i, n = 0, len(comando)

    def cerrar():
        nonlocal orden
        ordenes.append(orden)
        orden = {"partes": [], "heredoc": [], "expansion": False}

    while i < n:
        c = comando[i]
        if comilla == "'":
            orden["partes"].append(c)
            if c == "'":
                comilla = None
            i += 1
            continue
        if c == "\\" and i + 1 < n:
            if comando[i + 1] == "\n" and comilla is None:
                i += 2          # continuación de línea
                continue
            orden["partes"].append(comando[i:i + 2])
            i += 2
            continue
        if c == "`" or comando.startswith("$(", i):
            sustitucion = True
        elif c == "$" and i + 1 < n and (
                comando[i + 1] in VARIABLE_TRAS_DOLAR
                or (comilla is None and comando[i + 1] in "'\"")):
            orden["expansion"] = True       # $VAR, ${VAR}, $1, $'…', $"…"
        if comilla == '"':
            orden["partes"].append(c)
            if c == '"':
                comilla = None
            i += 1
            continue
        # A partir de aquí, fuera de comillas.
        if c in "'\"":
            comilla = c
            orden["partes"].append(c)
            i += 1
            continue
        if comando.startswith("<(", i) or comando.startswith(">(", i):
            sustitucion = True
        if comando.startswith("<<<", i):
            orden["partes"].append("<<<")
            i += 3
            continue
        if comando.startswith("<<", i):
            m = HEREDOC.match(comando, i)
            if m:
                delimitador = next(g for g in (m.group(2), m.group(3), m.group(5)) if g is not None)
                citado = m.group(2) is not None or m.group(3) is not None or bool(m.group(4))
                pendientes.append((delimitador, citado, bool(m.group(1)), orden))
                i = m.end()
                continue
        if c in "*?[{":
            orden["expansion"] = True       # comodín o llaves sin comillas
        if c == "\n":
            cerrar()
            i += 1
            for delimitador, citado, quita_tabs, destino in pendientes:
                lineas = []
                while i < n:
                    j = comando.find("\n", i)
                    j = n if j == -1 else j
                    linea = comando[i:j]
                    i = j + 1
                    if (linea.lstrip("\t") if quita_tabs else linea) == delimitador:
                        break
                    lineas.append(linea)
                cuerpo = "\n".join(lineas)
                destino["heredoc"].append(cuerpo)
                if not citado:      # un heredoc sin comillas en el delimitador se expande
                    if "$(" in cuerpo or "`" in cuerpo:
                        sustitucion = True
                    elif "$" in cuerpo:
                        destino["expansion"] = True
            pendientes = []
            continue
        if c in ";|()":
            cerrar()
            i += 1
            continue
        if c == "&":
            previo = orden["partes"][-1] if orden["partes"] else ""
            if previo == ">" or comando.startswith(">", i + 1):
                orden["partes"].append(c)      # «>&» y «&>» son redirecciones
                i += 1
                continue
            cerrar()
            i += 1
            continue
        orden["partes"].append(c)
        i += 1
    cerrar()

    resultado = []
    for o in ordenes:
        texto = "".join(o["partes"]).strip()
        if texto:
            resultado.append({"texto": texto, "heredoc": o["heredoc"], "expansion": o["expansion"]})
    return resultado, sustitucion


def clasificar(orden):
    """Devuelve («commit», datos) · («indirecto», None) · («otra», None)."""
    texto = orden["texto"]
    try:
        palabras = shlex.split(texto, posix=True)
    except ValueError:
        return ("indirecto", None) if ES_COMMIT.search(texto) else ("otra", None)
    con_variables = False
    while palabras and ASIGNACION.match(palabras[0]):
        con_variables = True
        palabras.pop(0)
    if not palabras:
        return "otra", None
    if Path(palabras[0]).name != "git":
        if ES_COMMIT.search(texto) and Path(palabras[0]).name not in ORDENES_QUE_SOLO_LEEN:
            return "indirecto", None
        return "otra", None

    datos = {"con_variables": con_variables, "directorios": [], "problemas": [],
             "mensajes": [], "ficheros_de_mensaje": [], "amend": False,
             "reset_author": False, "heredoc": orden["heredoc"],
             "expansion": orden["expansion"]}
    i = 1
    while i < len(palabras):
        p = palabras[i]
        nombre = p.split("=", 1)[0]
        if nombre in GIT_GLOBAL_CON_VALOR:
            valor = p.split("=", 1)[1] if "=" in p else (palabras[i + 1] if i + 1 < len(palabras) else "")
            if nombre == "-C":
                datos["directorios"].append(valor)
            if nombre in GIT_GLOBAL_QUE_CAMBIA_EL_REPOSITORIO:
                datos["problemas"].append("otro_repositorio")
            if nombre in ("-c", "--config-env") and valor.lower().startswith("user.email"):
                datos["problemas"].append("identidad")
            i += 1 if "=" in p else 2
        elif p.startswith("-"):
            i += 1
        else:
            break
    if i >= len(palabras) or palabras[i] != "commit":
        return "otra", None
    leer_opciones_del_commit(palabras[i + 1:], datos)
    return "commit", datos


def leer_opciones_del_commit(args, datos):
    def valor_siguiente(k):
        return args[k + 1] if k + 1 < len(args) else ""

    k = 0
    while k < len(args):
        a = args[k]
        m = REDIRECCION.fullmatch(a)
        if m and not a.startswith("-"):
            k += 1 if m.group(2) else 2
            continue
        if a == "--":
            if args[k + 1:]:
                datos["problemas"].append("prepara")
            break
        if a.startswith("--"):
            nombre, tiene_igual, valor = a[2:].partition("=")
            if nombre not in COMMIT_LARGAS_SIN_VALOR and nombre not in COMMIT_LARGAS_CON_VALOR:
                # git admite abreviar las opciones largas: «--inc» es «--include».
                if any(larga.startswith(nombre) for larga in COMMIT_LARGAS_QUE_PREPARAN):
                    datos["problemas"].append("prepara")
                    k += 1
                    continue
                candidatas = [larga for larga in COMMIT_LARGAS_CON_VALOR | COMMIT_LARGAS_SIN_VALOR
                              if larga.startswith(nombre)]
                if len(candidatas) == 1:
                    nombre = candidatas[0]
                elif any(larga == "no-verify" for larga in candidatas):
                    nombre = "no-verify"    # ante la duda entre varias, la que salta los hooks
            if nombre in COMMIT_LARGAS_QUE_PREPARAN:
                datos["problemas"].append("prepara")
            elif nombre == "no-verify":
                datos["problemas"].append("sin_hooks")
            elif nombre == "amend":
                datos["amend"] = True
            elif nombre == "reset-author":
                datos["reset_author"] = True
            if nombre in COMMIT_LARGAS_CON_VALOR:
                if not tiene_igual:
                    valor = valor_siguiente(k)
                    k += 1
                if nombre in ("message", "trailer"):
                    datos["mensajes"].append(valor)     # el tráiler también es mensaje
                elif nombre == "file":
                    datos["ficheros_de_mensaje"].append(valor)
                elif nombre == "author":
                    datos["problemas"].append("identidad")
                elif nombre in COMMIT_LARGAS_QUE_REUTILIZAN or nombre == "template":
                    datos["problemas"].append("reutiliza")
            k += 1
            continue
        if a.startswith("-") and len(a) > 1:
            for j, letra in enumerate(a[1:], 1):
                if letra in "aiop":
                    datos["problemas"].append("prepara")
                elif letra == "n":
                    datos["problemas"].append("sin_hooks")
                elif letra in "mFCct":
                    valor = a[j + 1:]
                    if not valor:
                        valor = valor_siguiente(k)
                        k += 1
                    if letra == "m":
                        datos["mensajes"].append(valor)
                    elif letra == "F":
                        datos["ficheros_de_mensaje"].append(valor)
                    elif letra in "Cct":
                        datos["problemas"].append("reutiliza")
                    break
                elif letra in "Su":
                    break       # el resto de la palabra es su valor
            k += 1
            continue
        datos["problemas"].append("prepara")    # una ruta suelta: `git commit <fichero>`
        k += 1


MOTIVOS = {
    "indirecto": ("commit que no va escrito directo",
                  "El commit va dentro de otra orden (bash -c, env, eval, una sustitución…) y no "
                  "puedo ver qué va a entrar. Escribe `git commit` directo."),
    "no_primero": ("commit que no es la primera orden del comando",
                   "Antes del commit hay otra orden, que puede cambiar lo preparado después de mi "
                   "revisión. Prepara los ficheros en un comando (`git add <ficheros>`) y haz el "
                   "commit en otro, con `git commit` como primera orden."),
    "sustitucion": ("commit con una sustitución de comandos",
                    "El comando trae `$(...)` o comillas invertidas, que ejecutan otra orden antes "
                    "del commit. Para un mensaje de varias líneas usa `git commit -F - <<'EOF'`."),
    "variables": ("commit con variables de entorno delante",
                  "Las variables delante de `git commit` pueden cambiar la identidad o el índice. "
                  "Haz el commit sin ellas."),
    "prepara": ("commit que prepara ficheros a la vez",
                "El comando prepara ficheros y hace el commit a la vez (-a, -i, -o, -p o una ruta), "
                "así que no puedo revisar lo que va a entrar. Prepara los ficheros en un comando "
                "(`git add <ficheros>`) y haz el commit en otro."),
    "identidad": ("commit que cambia la identidad",
                  "El comando cambia la identidad del commit (--author o user.email) y no puedo "
                  "verla antes de que corra. Haz el commit con la identidad configurada en el "
                  "repositorio."),
    "reutiliza": ("commit cuyo mensaje o autor vienen de otra parte",
                  "Con -C, -c, --reuse-message o --reedit-message el autor y el mensaje vienen de "
                  "otro commit, y con -t o --template de una plantilla. Escribe el mensaje con -m "
                  "o -F."),
    "expansion": ("commit con una variable o un comodín que el shell expande",
                  "El comando trae una variable (`$MSG`) o un comodín sin comillas (`*`, `?`, `[`, "
                  "`{`): lo que el shell ejecute no será lo que yo revisé. Escribe el texto tal "
                  "cual, entre comillas simples o en un heredoc con `<<'EOF'`."),
    "sin_hooks": ("commit con --no-verify",
                  "`--no-verify` (o `-n`) salta los hooks de git, que revisan lo preparado y el "
                  "mensaje. Un bloqueo no se rodea: haz el commit sin esa opción."),
    "otro_repositorio": ("commit con --git-dir, --work-tree o --namespace",
                         "Esas opciones cambian el repositorio o el árbol del commit y no puedo "
                         "saber cuál revisar. Usa `git -C <ruta> commit`."),
    "mensaje": ("mensaje del commit que no se puede leer",
                "No pude leer el fichero del mensaje (-F). Usa -m, un heredoc "
                "(`-F - <<'EOF'`) o un fichero que exista."),
}


def analizar_comando(entrada):
    """Devuelve None si el comando no hace un commit; si lo hace, (motivo, datos)."""
    comando = (entrada.get("tool_input") or {}).get("command", "")
    if entrada.get("tool_name") != "Bash" or not isinstance(comando, str) or not ES_COMMIT.search(comando):
        return None
    ordenes, sustitucion = partir(comando)
    clases = [clasificar(o) for o in ordenes]
    tipos = [t for t, _ in clases]
    if "indirecto" in tipos:
        return "indirecto", None
    if "commit" not in tipos:
        return ("indirecto", None) if SUSTITUCION_CON_COMMIT.search(comando) else None
    if tipos[0] != "commit" or tipos.count("commit") > 1:
        return "no_primero", None
    datos = clases[0][1]
    if sustitucion:
        return "sustitucion", None
    if datos["con_variables"]:
        return "variables", None
    if datos["expansion"]:
        return "expansion", None
    for motivo in ("sin_hooks", "otro_repositorio", "prepara", "identidad", "reutiliza"):
        if motivo in datos["problemas"]:
            return motivo, None
    return None, datos


def mensajes_del_comando(entrada, datos):
    """Los textos del mensaje que trae el comando. Lanza KeyError('mensaje') si no se pueden leer."""
    textos = list(datos["mensajes"])
    base = Path(DONDE["directorio"])
    cuerpos = list(datos["heredoc"])
    for fichero in datos["ficheros_de_mensaje"]:
        if fichero == "-":
            if not cuerpos:
                raise KeyError("mensaje")
            textos.append(cuerpos.pop(0))
            continue
        try:
            textos.append((base / os.path.expanduser(fichero)).read_text(
                encoding="utf-8", errors="replace"))
        except OSError:
            raise KeyError("mensaje")
    if datos["amend"] and not textos:
        textos.append(git("log", "-1", "--format=%B"))
    return textos


# --- salida ------------------------------------------------------------------

def registrar(origen, hallazgos):
    """Deja una línea por hallazgo. Nunca escribe el texto encontrado, ni una ruta privada."""
    REGISTRO.parent.mkdir(parents=True, exist_ok=True)
    if not REGISTRO.exists():
        REGISTRO.write_text(
            "# Registro de bloqueos — datos-que-no-salen\n\n"
            "Cada fila es un commit que el hook detuvo. No se guarda el texto encontrado.\n\n"
            "| Fecha y hora | Origen | Categoría | Fichero | Línea |\n|---|---|---|---|---|\n",
            encoding="utf-8")
    ahora = datetime.datetime.now().strftime("%d/%m/%Y %H:%M")
    with REGISTRO.open("a", encoding="utf-8", errors="replace") as f:
        for categoria, fichero, numero, _ in hallazgos:
            if fichero in RUTAS_QUE_NO_SE_REGISTRAN:
                fichero = "(ruta no registrada)"
            f.write("| %s | %s | %s | `%s` | %s |\n" % (
                ahora, origen, categoria, fichero.replace("|", "/").replace("\n", " "),
                numero if numero else "-"))


def bloquear(origen, hallazgos, codigo, explicacion=None):
    try:
        registrar(origen, hallazgos)
        nota = "Quedó una línea por hallazgo en %s." % REGISTRO.relative_to(RAIZ)
    except OSError:
        nota = "ADVERTENCIA: no se pudo escribir el registro de bloqueos."
    if explicacion:
        print("datos-que-no-salen: COMMIT DETENIDO. %s" % explicacion, file=sys.stderr)
    else:
        print("datos-que-no-salen: COMMIT DETENIDO. %d hallazgo(s):" % len(hallazgos), file=sys.stderr)
        for categoria, fichero, numero, pista in hallazgos:
            donde = "%s:%s" % (fichero, numero) if numero else fichero
            print("  - %s en %s %s" % (categoria, donde, ("(%s)" % pista) if pista else ""),
                  file=sys.stderr)
        print("Corrige, vuelve a preparar los ficheros y repite el commit.", file=sys.stderr)
    print(nota, file=sys.stderr)
    sys.exit(codigo)


def bloquear_ciego(origen, codigo, motivo):
    bloquear(origen, [("QUEDÉ CIEGO: " + motivo, "-", 0, "")], codigo,
             "QUEDÉ CIEGO, no pude revisar (%s). Bloqueo por precaución." % motivo)


def main():
    if "--pre-commit" in sys.argv:
        origen, codigo, modo = "git", 1, "pre-commit"
    elif "--commit-msg" in sys.argv:
        origen, codigo, modo = "git", 1, "commit-msg"
    else:
        origen, codigo, modo = "claude", 2, "claude"
    try:
        sys.stderr.reconfigure(errors="replace")
        hallazgos = []
        if modo == "claude":
            try:
                entrada = json.load(sys.stdin)
                if not isinstance(entrada, dict):
                    raise ValueError
            except ValueError:
                bloquear_ciego(origen, codigo, "no pude leer la entrada del hook")
            analisis = analizar_comando(entrada)
            if analisis is None:
                sys.exit(0)
            motivo, datos = analisis
            if motivo:
                categoria, explicacion = MOTIVOS[motivo]
                bloquear(origen, [(categoria, "-", 0, "")], codigo, explicacion)
            # El repositorio que recibe el commit: donde corre el comando, más sus `-C`.
            destino = Path(entrada.get("cwd") or RAIZ)
            for directorio in datos["directorios"]:
                destino = destino / os.path.expanduser(directorio)
            DONDE["directorio"] = str(destino)
            try:
                textos = mensajes_del_comando(entrada, datos)
            except KeyError:
                categoria, explicacion = MOTIVOS["mensaje"]
                bloquear(origen, [(categoria, "-", 0, "")], codigo, explicacion)
            patrones, autores = leer_lista_privada()
            hallazgos += revisar_identidad(patrones, autores,
                                           datos["amend"] and not datos["reset_author"])
            hallazgos += revisar_preparado(patrones)
            for texto in textos:
                hallazgos += revisar_mensaje(texto, patrones, autores)
        elif modo == "pre-commit":
            patrones, autores = leer_lista_privada()
            hallazgos += revisar_identidad(patrones, autores, False)
            hallazgos += revisar_preparado(patrones)
        else:
            posicion = sys.argv.index("--commit-msg") + 1
            if posicion >= len(sys.argv):
                raise Ciego("falta el fichero del mensaje")
            try:
                texto = Path(sys.argv[posicion]).read_text(encoding="utf-8", errors="replace")
            except OSError:
                raise Ciego("no se pudo leer el fichero del mensaje")
            patrones, autores = leer_lista_privada()
            hallazgos += revisar_mensaje(texto, patrones, autores)
        if hallazgos:
            bloquear(origen, hallazgos, codigo)
        print("datos-que-no-salen: revisado, sin hallazgos.", file=sys.stderr)
        sys.exit(0)
    except Ciego as e:
        bloquear_ciego(origen, codigo, str(e))
    except SystemExit:
        raise
    except BaseException as e:      # un fallo interno no puede dejar pasar el commit
        try:
            bloquear_ciego(origen, codigo, "error interno: %s" % type(e).__name__)
        except SystemExit:
            raise
        except BaseException:
            sys.exit(codigo)


if __name__ == "__main__":
    main()

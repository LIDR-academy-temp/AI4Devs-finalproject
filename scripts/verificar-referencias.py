#!/usr/bin/env python3
"""
verificar-referencias — integridad referencial de lo que se sube (decisión D-91).

Lo que está en este repositorio cita su origen: una decisión (D-n), un
requisito (RF-n), un ticket (HU-xx.y, H-n), un criterio (HU-xx.CA-n), un
archivo. Este script comprueba que cada cita exista. Un documento se ve bien
por fuera aunque cite algo que ya no está; solo comprobarlo lo delata.

Qué revisa, con la configuración de `scripts/referencias.txt`:

  1. Rutas. En los documentos vivos, lo que va entre comillas invertidas con
     forma de ruta debe existir: junto al documento, desde la raíz o dentro de
     `docs/trazabilidad/`. El destino de cada enlace Markdown que no sea web
     también, en sus tres formas: en línea `[t](destino "título")`, entre
     ángulos `[t](<destino con espacios>)` y por referencia `[id]: destino`,
     y cada uso `[t][id]` necesita su definición en el mismo documento;
     dentro del código (en línea o en bloque) nada es enlace;
     un destino que empieza por `/` se busca desde la raíz y `%20` se lee como
     espacio. Lo que aún no existe porque lo crea un ticket futuro va en
     [previstas], con ese ticket; si ya existe, sobra ahí.
  2. Identificadores. Cada identificador citado en un documento vivo (ver
     FAMILIAS) debe estar definido en su fuente: una fila de tabla que empieza
     por él. Las formas abreviadas también: en «HU-03.CA-1, CA-2 y CA-5» se
     comprueban los tres criterios, y en un rango «X-1 a X-9» (o «HU-03.CA-1 a
     CA-3») se comprueba cada número del intervalo, no solo los extremos.
  3. Numeración retirada. Los tickets T-nn de la entrega 1 se sustituyeron por
     HU-xx.y y H-n; solo se admiten en una línea que diga «numeración anterior».
  4. Índice de la cadena. Cada archivo de `docs/trazabilidad/` está en la tabla
     de `docs/trazabilidad/README.md` una sola vez y al revés; ninguna fila que
     empiece por un archivo queda sin leer por mal formada; ninguno es un
     enlace simbólico; la huella (12 primeros caracteres de su SHA-256)
     coincide; el estado es exactamente `idéntica`, `neutralizada` o `derivada
     sin nombres` (la negrita no cuenta); y
     el origen es coherente: una copia idéntica o neutralizada viene del mismo
     paso y con el mismo nombre, y una derivada, del mismo paso.
  5. Inmutabilidad (solo con --base REF). Una copia de `docs/trazabilidad/` que
     ya existía en REF no puede haber cambiado, cambiado de tipo ni
     desaparecido: las versiones nuevas se agregan, no se reescriben. Sin esto,
     cambiar a la vez un archivo y su huella en el índice pasaría en verde. La
     excepción son los archivos que el índice de REF declara `derivada sin
     nombres`: se mantienen al día por diseño (el registro de decisiones). Aun
     así, cada decisión que estaba en REF tiene que seguir igual, o igual con
     una nota al final o tachada: las decisiones crecen y se marcan, no se
     reescriben. Se lee el índice de REF, no el actual, para que una copia no
     se libre cambiando su estado.
  6. Rutas dentro del repositorio. Una cita que sale de él («../../etc/x»)
     no resuelve aunque el archivo exista en la máquina.

Lo que NO revisa, a propósito:
  - Si lo citado dice lo que el documento afirma que dice. Eso lo revisa una
    persona o el revisor adversarial.
  - Si cada afirmación tiene una cita. Comprueba las citas que hay, no las que
    faltan.
  - Las pruebas de `tests/`: sus datos de juguete citan a propósito cosas que
    no existen, para probar que se detectan.
  - Los informes del revisor (`docs/revisiones/<rama>-ronda<N>.md` y sus
    `-corrida<M>.md`): no los redactamos, son la opinión de un modelo y pueden
    citar mal; justo eso es lo que se responde. Las respuestas sí son
    documentos vivos.
  - Fuera de las decisiones (`| **D-n** |`), el registro derivado puede
    cambiar: su cabecera y los puntos abiertos no se comparan.
  - El origen fuera del repositorio: el espacio de trabajo es privado.
  - Los commits intermedios: la inmutabilidad compara REF con el estado final.
    Un archivo agregado y reescrito dentro de la misma rama sin unir no se ve;
    por eso los PR se unen con squash (D-97) y en la rama de la entrega no
    queda el estado intermedio.

Los mensajes los escribe este script, no el intérprete: si no puede leer una
fuente, lo dice y falla; nunca da por bueno lo que no pudo mirar.

Uso:   python3 scripts/verificar-referencias.py [--raiz RUTA] [--base REF]
Sale con 0 si todo resuelve, con 1 si algo está roto o si quedó ciego.
"""
import argparse
import hashlib
import re
import subprocess
import sys
from pathlib import Path
from urllib.parse import unquote

EXTENSIONES = (".md", ".py", ".sh", ".sql", ".ts", ".tsx", ".json", ".yml", ".yaml",
               ".css", ".mjs", ".html", ".txt")
CANDIDATO_RUTA = re.compile(r"`([^`\n]+)`")
# Enlace en línea: [t](destino), [t](destino "título"), [t](<destino con espacios>).
ENLACE_MD = re.compile(r"\]\(\s*(<[^>\n]*>|[^)\s]+)(?:\s+(?:\"[^\"]*\"|'[^']*'))?\s*\)")
# Definición de un enlace por referencia: «[id]: destino».
ENLACE_REF = re.compile(r"^\s{0,3}\[[^\]\n]+\]:\s*(<[^>\n]*>|\S+)")
INDICE = "docs/trazabilidad/README.md"
FILA_INDICE = re.compile(r"^\|\s*`([^`]+)`\s*\|\s*`([^`]+)`\s*\|\s*`([0-9a-f]{12})`\s*\|\s*([^|]+)\|")
ESTADOS = ("idéntica", "neutralizada", "derivada sin nombres")   # exactos, sin la negrita
# Uso de un enlace por referencia: «[texto][id]» o «[id][]».
USO_REF = re.compile(r"\[([^\]\n]+)\]\[([^\]\n]*)\]")
# Fila de una decisión en el registro derivado: «| **D-5** |» o «| ~~**D-5**~~ |».
FILA_DECISION = re.compile(r"^\|\s*(?:~~)?\*\*(D-\d+)\*\*")
# Abreviaturas de criterios tras uno completo: «HU-03.CA-1, CA-2 y CA-5», «HU-03.CA-1 a CA-3».
CA_LISTA = re.compile(r"\b(HU-\d{2})\.CA-(\d+)((?:\s*(?:,\s*(?:y\s+)?|y\s+|a\s+)CA-\d+)+)")
CA_SIGUIENTE = re.compile(r"(,\s*(?:y\s+)?|y\s+|a\s+)CA-(\d+)")
RANGO_MAX = 200   # un rango de más elementos se toma por error de escritura y se marca
IGNORADOS = {".git", "node_modules", ".next"}
COMANDOS = {"python3", "python", "bash", "sh", "node", "pnpm"}

# Familia → patrón con que se cita (el grupo 1 es el identificador completo).
# Se da por definido si, en las fuentes de su familia (sección [fuentes]), hay
# una fila de tabla que empieza por él: «| D-5 |», «| **H-4 (nuevo)** |»,
# «| ~~**D-7**~~ |» (una decisión superada sigue definida: se tacha, no se borra).
FAMILIAS = {
    "D": r"\b(D-\d+)\b",
    "PA": r"\b(PA-\d+)\b",
    "PA-B": r"\b(PA-B\d+)\b",
    "PA-P": r"\b(PA-P\d+)\b",
    "HU": r"\b(HU-\d{2}\.\d+)\b",
    "CA": r"\b(HU-\d{2}\.CA-\d+)\b",
    "H": r"\b(H-\d+)\b",
    "RF": r"\b(RF-\d+)\b",
    "RNF": r"\b(RNF-\d+)\b",
    "RA": r"\b(RA-\d+)\b",
    "R": r"(?<![A-Za-z-])(R-\d+)\b",
    "E": r"\b(E-\d+)\b",
    "M": r"(?<![A-Za-z-])(M-\d+)\b",
    "N": r"(?<![A-Za-z-])(N-\d+)\b",
}
RETIRADO = re.compile(r"\bT-\d{2}\b")
PERMISO_RETIRADO = "numeración anterior"
# Rango «X-1 a X-9» con el mismo prefijo a los dos lados (D-, RF-, PA-B…).
RANGO = re.compile(r"(?<![A-Za-z.-])(PA-[BP]|[A-Z]{1,3}-)(\d+) a \1(\d+)\b")


def definido(identificador, texto_fuente):
    return re.search(r"(?m)^\|\s*[~*]*" + re.escape(identificador) + r"(?![\d.])", texto_fuente) is not None


def familia_de(identificador):
    for familia, patron in FAMILIAS.items():
        if re.fullmatch(patron.replace(r"\b", "").replace("(?<![A-Za-z-])", ""), identificador):
            return familia
    return None


def interiores(linea):
    """Lo que un rango o una abreviatura cita sin escribirlo entero: [(familia, id)] y errores."""
    citados, errores = [], []
    for m in RANGO.finditer(linea):
        prefijo, a, b = m.group(1), int(m.group(2)), int(m.group(3))
        familia = familia_de(f"{prefijo}{a}")
        if familia is None:
            continue
        if b <= a or b - a + 1 > RANGO_MAX:
            errores.append(f"el rango «{m.group(0)}» no es un intervalo válido")
            continue
        citados += [(familia, f"{prefijo}{k}") for k in range(a + 1, b)]
    for m in CA_LISTA.finditer(linea):
        hu, previo = m.group(1), int(m.group(2))
        for s in CA_SIGUIENTE.finditer(m.group(3)):
            n = int(s.group(2))
            if s.group(1).strip() == "a":
                if n <= previo or n - previo + 1 > RANGO_MAX:
                    errores.append(f"el rango «{hu}.CA-{previo} a CA-{n}» no es un intervalo válido")
                else:
                    citados += [("CA", f"{hu}.CA-{k}") for k in range(previo + 1, n + 1)]
            else:
                citados.append(("CA", f"{hu}.CA-{n}"))
            previo = n
    return citados, errores


def destino_enlace(crudo):
    """Destino de un enlace listo para buscar, o None si no es un archivo del repositorio."""
    d = crudo[1:-1] if crudo.startswith("<") and crudo.endswith(">") else crudo
    d = unquote(d.split("#")[0].split("?")[0]).strip()
    if not d or d.startswith(("http:", "https:", "mailto:", "ftp:")):
        return None
    return d


def leer_config(ruta):
    """Lee referencias.txt: secciones [vivos], [fuentes], [previstas], [no-son-rutas]."""
    secciones = {"vivos": [], "fuentes": [], "previstas": [], "no-son-rutas": []}
    actual = None
    for n, linea in enumerate(ruta.read_text(encoding="utf-8").splitlines(), 1):
        linea = linea.split("  #")[0].strip()
        if not linea or linea.startswith("#"):
            continue
        if linea.startswith("[") and linea.endswith("]"):
            actual = linea[1:-1]
            if actual not in secciones:
                raise ValueError(f"línea {n}: sección desconocida [{actual}]")
            continue
        if actual is None:
            raise ValueError(f"línea {n}: hay texto antes de la primera sección")
        secciones[actual].append(linea)
    return secciones


def parece_ruta(texto, no_son_rutas):
    if texto in no_son_rutas:
        return False
    if " " in texto and not texto.endswith(EXTENSIONES):   # «GET /api/v1/…», «esperado / encontrado»
        return False
    if texto.startswith(("http", "/", "@", "~", "$", ".env", "-", "#", "mailto:")):
        return False
    if any(c in texto for c in "{}<>*?|=()[],;'\"") or "…" in texto or "..." in texto.replace("../", ""):
        return False
    return texto.endswith(EXTENSIONES) or ("/" in texto and not texto.endswith(":"))


def dentro(ruta, raiz):
    """Existe y queda dentro del repositorio: «../../etc/passwd» no vale aunque exista."""
    try:
        return ruta.exists() and ruta.resolve().is_relative_to(raiz)
    except (OSError, ValueError):
        return False


def resuelve(texto, doc, raiz):
    rel = texto.rstrip("/")
    if rel.startswith("/"):   # enlace absoluto dentro del repositorio: desde la raíz
        return dentro(raiz / rel.lstrip("/"), raiz)
    for base in (doc.parent, raiz, raiz / "docs" / "trazabilidad"):
        if dentro(base / rel, raiz):
            return True
    if "/" not in rel:   # nombre suelto: vale si hay exactamente un archivo con ese nombre
        hallados = [p for p in raiz.rglob(rel) if not IGNORADOS & set(p.relative_to(raiz).parts)]
        return len(hallados) == 1
    return False


def huella(ruta):
    return hashlib.sha256(ruta.read_bytes()).hexdigest()[:12]


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--raiz", default=str(Path(__file__).resolve().parents[1]))
    ap.add_argument("--base", help="referencia de git contra la que se comprueba que ninguna copia cambió")
    args = ap.parse_args()
    raiz = Path(args.raiz).resolve()
    rotas = []
    revisadas = 0

    # --- configuración y fuentes: si no se pueden leer, se falla -------------
    try:
        cfg = leer_config(raiz / "scripts" / "referencias.txt")
    except (OSError, ValueError) as e:
        print(f"verificar-referencias: QUEDÉ CIEGO, no pude leer scripts/referencias.txt ({e}).")
        return 1
    no_son_rutas = set(cfg["no-son-rutas"])

    fuentes = {}
    for linea in cfg["fuentes"]:
        familia, _, archivos = linea.partition(":")
        texto = ""
        for a in archivos.split(","):
            p = raiz / a.strip()
            if not p.is_file():
                print(f"verificar-referencias: QUEDÉ CIEGO, falta la fuente de {familia.strip()}: {a.strip()}")
                return 1
            texto += p.read_text(encoding="utf-8") + "\n"
        fuentes[familia.strip()] = texto
    for familia in FAMILIAS:
        if familia not in fuentes:
            print(f"verificar-referencias: QUEDÉ CIEGO, la familia {familia} no tiene fuente en [fuentes].")
            return 1

    # --- 1 a 3: documentos vivos -----------------------------------------------
    vivos = []
    for patron in cfg["vivos"]:
        hallados = sorted(p for p in raiz.glob(patron) if p.is_file())
        if not hallados:
            rotas.append(f"[vivos] «{patron}» no corresponde a ningún archivo")
        vivos.extend(hallados)

    previstas = {}
    for linea in cfg["previstas"]:
        partes = linea.split()
        if len(partes) != 2:
            rotas.append(f"[previstas] «{linea}»: se espera «ruta ticket»")
            continue
        previstas[partes[0].rstrip("/")] = partes[1]

    for doc in vivos:
        rel_doc = doc.relative_to(raiz)
        lineas = doc.read_text(encoding="utf-8").splitlines()
        # En Markdown, lo que va en un bloque de código (```) no es enlace.
        en_bloque, fuera_de_bloque = False, []
        for linea in lineas:
            if linea.lstrip().startswith("```"):
                en_bloque = not en_bloque
                fuera_de_bloque.append(False)
            else:
                fuera_de_bloque.append(not en_bloque)
        definiciones = set()
        if doc.suffix == ".md":
            for linea, fuera in zip(lineas, fuera_de_bloque):
                m = ENLACE_REF.match(CANDIDATO_RUTA.sub("``", linea)) if fuera else None
                if m:
                    definiciones.add(re.match(r"\s*\[([^\]]+)\]", linea).group(1).strip().lower())
        for n, linea in enumerate(lineas, 1):
            candidatos = []
            for m in CANDIDATO_RUTA.finditer(linea):
                partes = m.group(1).strip().split()
                # Un comando («python3 scripts/x.py»): se revisan las rutas que lleva.
                candidatos += partes[1:] if partes and partes[0] in COMANDOS else [m.group(1).strip()]
            for texto in candidatos:
                if not parece_ruta(texto, no_son_rutas):
                    continue
                revisadas += 1
                if resuelve(texto, doc, raiz) or texto.rstrip("/") in previstas:
                    continue
                rotas.append(f"{rel_doc}:{n}: la ruta `{texto}` no existe y no está en [previstas]")
            # Los enlaces se revisan siempre: no pasan por la heurística de «parece ruta».
            # Solo en Markdown: en el código, «x[i](y)» no es un enlace.
            # Y fuera del código en línea: «`x[i](y)`» tampoco es un enlace.
            enlaces = []
            if doc.suffix == ".md" and fuera_de_bloque[n - 1]:
                sin_codigo = CANDIDATO_RUTA.sub("``", linea)
                enlaces = [m.group(1) for m in ENLACE_MD.finditer(sin_codigo)]
                enlaces += [m.group(1) for m in ENLACE_REF.finditer(sin_codigo)]
                # Un uso «[texto][id]» necesita su definición «[id]: destino» en el mismo documento.
                for m in USO_REF.finditer(sin_codigo):
                    revisadas += 1
                    ident = (m.group(2) or m.group(1)).strip().lower()
                    if ident not in definiciones:
                        rotas.append(f"{rel_doc}:{n}: el enlace por referencia [{ident}] no tiene definición")
            for crudo in enlaces:
                destino = destino_enlace(crudo)
                if destino is None:
                    continue
                revisadas += 1
                if resuelve(destino, doc, raiz) or destino.rstrip("/") in previstas:
                    continue
                rotas.append(f"{rel_doc}:{n}: el enlace a `{destino}` no existe y no está en [previstas]")
            for familia, patron in FAMILIAS.items():
                for m in re.finditer(patron, linea):
                    revisadas += 1
                    if not definido(m.group(1), fuentes[familia]):
                        rotas.append(f"{rel_doc}:{n}: {m.group(1)} no está definido en su fuente")
            citados, errores = interiores(linea)
            for familia, identificador in citados:
                revisadas += 1
                if not definido(identificador, fuentes[familia]):
                    rotas.append(f"{rel_doc}:{n}: {identificador} (dentro de una abreviatura o un rango)"
                                 f" no está definido en su fuente")
            rotas += [f"{rel_doc}:{n}: {e}" for e in errores]
            if RETIRADO.search(linea) and PERMISO_RETIRADO not in linea:
                revisadas += 1
                rotas.append(f"{rel_doc}:{n}: usa la numeración retirada {RETIRADO.search(linea).group(0)}"
                             f" sin decir «{PERMISO_RETIRADO}»")

    for ruta, ticket in previstas.items():
        revisadas += 1
        if (raiz / ruta).exists():
            rotas.append(f"[previstas] `{ruta}` ya existe: sácala de la lista")
        familia = "H" if re.fullmatch(r"H-\d+", ticket) else "HU" if re.fullmatch(r"HU-\d{2}\.\d+", ticket) else None
        if familia is None or not definido(ticket, fuentes[familia]):
            rotas.append(f"[previstas] `{ruta}` la crea {ticket}, que no es un ticket definido")

    # --- 4: índice de la cadena ---------------------------------------------
    indice = raiz / INDICE
    if not indice.is_file():
        print(f"verificar-referencias: QUEDÉ CIEGO, falta el índice {INDICE}.")
        return 1
    en_indice = {}
    for n, linea in enumerate(indice.read_text(encoding="utf-8").splitlines(), 1):
        m = FILA_INDICE.match(linea)
        if not m:
            # Una fila que empieza por un archivo y no tiene la forma esperada no se salta en silencio.
            if linea.startswith("| `"):
                revisadas += 1
                rotas.append(f"{INDICE}:{n}: fila del índice mal formada; se espera "
                             f"| `archivo` | `origen` | `huella de 12 hexadecimales` | estado |")
            continue
        archivo, origen, h, estado = m.group(1), m.group(2), m.group(3), m.group(4).strip()
        revisadas += 1
        if archivo in en_indice:
            rotas.append(f"{INDICE}:{n}: `{archivo}` aparece dos veces en el índice (la otra en la línea {en_indice[archivo][1]})")
            continue
        en_indice[archivo] = (h, n)
        clase = estado.replace("*", "").strip()
        if clase not in ESTADOS:
            rotas.append(f"{INDICE}:{n}: `{archivo}` tiene el estado «{estado}»; se espera uno de {', '.join(ESTADOS)}")
            continue
        if clase == "derivada sin nombres":
            if origen.split("/")[0] != archivo.split("/")[0]:
                rotas.append(f"{INDICE}:{n}: `{archivo}` dice derivar de `{origen}`, de otro paso")
        elif origen != archivo:
            rotas.append(f"{INDICE}:{n}: `{archivo}` es copia ({estado}) pero su origen es `{origen}`")
    base = raiz / "docs" / "trazabilidad"
    en_disco = {p.relative_to(base).as_posix() for p in base.rglob("*")
                if p.is_file() and p.name != "README.md" and not p.name.startswith(".")}
    for p in sorted(base.rglob("*")):
        if p.is_symlink():
            revisadas += 1
            rotas.append(f"`docs/trazabilidad/{p.relative_to(base).as_posix()}` es un enlace simbólico:"
                         f" las copias son archivos")
    for rel in sorted(en_disco - set(en_indice)):
        rotas.append(f"{INDICE}: falta en el índice `{rel}`")
    for rel, (h, n) in sorted(en_indice.items()):
        revisadas += 1
        if rel not in en_disco:
            rotas.append(f"{INDICE}:{n}: el índice cita `{rel}`, que no existe")
        elif huella(base / rel) != h:
            rotas.append(f"{INDICE}:{n}: la huella de `{rel}` no coincide (índice {h}, archivo {huella(base / rel)})")

    # --- 5: inmutabilidad frente a una referencia de git ---------------------
    if args.base:
        r = subprocess.run(["git", "-C", str(raiz), "diff", "--no-renames", "--name-status", "--diff-filter=MDT",
                            args.base, "--", "docs/trazabilidad", ":(exclude)docs/trazabilidad/README.md"],
                           capture_output=True, text=True)
        if r.returncode != 0:
            print(f"verificar-referencias: QUEDÉ CIEGO, no pude comparar con {args.base} ({r.stderr.strip()}).")
            return 1
        # Las derivadas se mantienen al día: se exceptúan según el índice de la BASE.
        derivadas_base = set()
        existe = subprocess.run(["git", "-C", str(raiz), "cat-file", "-e", f"{args.base}:{INDICE}"],
                                capture_output=True, text=True)
        if existe.returncode == 0:
            ib = subprocess.run(["git", "-C", str(raiz), "show", f"{args.base}:{INDICE}"],
                                capture_output=True, text=True)
            if ib.returncode != 0:
                print(f"verificar-referencias: QUEDÉ CIEGO, no pude leer el índice de {args.base} ({ib.stderr.strip()}).")
                return 1
            for linea in ib.stdout.splitlines():
                m = FILA_INDICE.match(linea)
                if m and m.group(4).replace("*", "").strip() == "derivada sin nombres":
                    derivadas_base.add("docs/trazabilidad/" + m.group(1))
        for linea in r.stdout.splitlines():
            revisadas += 1
            estado, ruta = linea.split("\t", 1)
            if estado == "M" and ruta in derivadas_base:
                # La derivada crece y marca, pero no reescribe: cada decisión de la base sigue
                # igual, o igual con una nota al final o tachada (las superadas se marcan).
                antes = subprocess.run(["git", "-C", str(raiz), "show", f"{args.base}:{ruta}"],
                                       capture_output=True, text=True)
                if antes.returncode != 0:
                    print(f"verificar-referencias: QUEDÉ CIEGO, no pude leer {ruta} en {args.base}.")
                    return 1
                ahora = {}
                for fila in (raiz / ruta).read_text(encoding="utf-8").splitlines():
                    m = FILA_DECISION.match(fila)
                    if m:
                        ahora[m.group(1)] = fila.replace("~~", "")
                for fila in antes.stdout.splitlines():
                    m = FILA_DECISION.match(fila)
                    if not m:
                        continue
                    revisadas += 1
                    previa = fila.replace("~~", "").rstrip().rstrip("|").rstrip()
                    if m.group(1) not in ahora:
                        rotas.append(f"`{ruta}`: la decisión {m.group(1)} desapareció desde {args.base}")
                    elif not ahora[m.group(1)].startswith(previa):
                        rotas.append(f"`{ruta}`: la decisión {m.group(1)} se reescribió desde {args.base};"
                                     f" una decisión solo se marca (tachada o con una nota al final)")
                continue
            que = {"M": "cambió", "D": "desapareció", "T": "cambió de tipo"}[estado[0]]
            rotas.append(f"`{ruta}` {que} desde {args.base}: las copias no se reescriben; se agrega una versión nueva")

    # --- resultado ----------------------------------------------------------
    print(f"verificar-referencias: {len(vivos)} documentos vivos · {len(en_indice)} archivos en el índice"
          f" · {revisadas} referencias revisadas · {len(rotas)} rotas"
          + (f" · inmutabilidad frente a {args.base}" if args.base else " · sin comprobar inmutabilidad (falta --base)"))
    for r in rotas:
        print(f"  ROTA  {r}")
    if rotas:
        print("Corrige la cita o el archivo citado; si algo todavía no existe, declara el ticket que lo crea en [previstas].")
        return 1
    print("verificar-referencias: toda referencia resuelve.")
    return 0


if __name__ == "__main__":
    sys.exit(main())

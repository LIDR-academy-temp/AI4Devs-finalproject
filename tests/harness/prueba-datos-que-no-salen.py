#!/usr/bin/env python3
"""
Prueba del hook datos-que-no-salen: un caso positivo y uno negativo por regla.

Monta un repositorio git desechable en un directorio temporal, copia ahí el
hook y lo ejecuta en sus tres modos: pre-commit de git, commit-msg de git y
PreToolUse de Claude Code. No toca este repositorio ni la lista privada real.

Los valores con forma de secreto, los correos y el término privado se arman
por partes en tiempo de ejecución, para que este fichero no contenga ninguno
y el propio hook lo deje pasar.

Uso:  python3 tests/harness/prueba-datos-que-no-salen.py
Sale con 0 si todos los casos dan lo esperado, y con 1 si alguno falla.
"""
import json
import os
import shutil
import subprocess
import sys
import tempfile
from pathlib import Path

HOOK = Path(__file__).resolve().parents[2] / ".claude" / "hooks" / "datos-que-no-salen.py"

ARROBA = "@"
MARCA = "# guardarrail: datos-que-no-salen"     # la misma del instalador y del hook
SECRETO = "sk-" + "a1B2c3D4e5" * 3
# Una muestra por cada categoría de SECRETOS del hook, en el mismo orden.
MUESTRAS_DE_SECRETO = [
    ("clave con prefijo sk-", SECRETO),
    ("token con forma de JWT", "eyJ" + "a1B2" * 6 + "." + "c3D4" * 6),
    ("clave privada", "-----BEGIN " + "RSA PRIVATE" + " KEY-----"),
    ("token de GitHub", "ghp" + "_" + "A1b2" * 9),
    ("clave de acceso de AWS", "AKIA" + "ABCDEFGH" * 2),
    ("clave de acceso de AWS", "ASIA" + "ABCDEFGH" * 2),      # la temporal
    ("clave con prefijo re_", "re" + "_" + "a1B2c3D4e5" * 2 + "ab"),
    ("valor asignado a una variable secreta", "SERVICE_ROLE_KEY" + "=" + "abcdefghij" + "0123456789"),
]
TERMINO_PRIVADO = "Empresa" + "Ficticia"
TERMINO_CORTO = "QZ" + "X"
CORREO_REAL = "persona" + ARROBA + "dominio-inventado.io"
CORREO_EJEMPLO = "persona" + ARROBA + "example.com"
AUTOR_PERMITIDO = "autora" + ARROBA + "example.com"
AUTOR_AJENO = "autora" + ARROBA + "empresa-inventada.io"
# Un PNG mínimo: la firma y un byte nulo bastan para que git lo trate como binario.
CABECERA_PNG = b"\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x01"


def sh(repo, *args):
    subprocess.run(["git", "-C", str(repo), *args], check=True, capture_output=True)


def poner_hooks_de_git(repo, nombres=("pre-commit", "commit-msg")):
    """Deja en .git/hooks los hooks con la marca del guardarraíl.

    Aquí el hook se ejecuta a mano, no desde git; pero cada modo de git exige
    que el otro hook esté instalado, y sin esto todos los casos quedarían ciegos.
    """
    for nombre in nombres:
        f = repo / ".git" / "hooks" / nombre
        f.parent.mkdir(parents=True, exist_ok=True)
        f.write_text("#!/bin/sh\n" + MARCA + "\nexit 0\n", encoding="utf-8")
        f.chmod(0o755)


def nuevo_repo(base, con_lista=True, autor=AUTOR_PERMITIDO, lista_declara_autor=True,
               lista_extra=""):
    """Repo desechable. `autor` es el correo configurado como identidad del commit."""
    repo = Path(tempfile.mkdtemp(dir=base))
    sh(repo, "init", "-q")
    sh(repo, "config", "user.name", "Prueba")
    sh(repo, "config", "user.email", autor)
    destino = repo / ".claude" / "hooks"
    destino.mkdir(parents=True)
    shutil.copy(HOOK, destino / HOOK.name)
    poner_hooks_de_git(repo)
    if con_lista:
        lista = repo.parent / (repo.name + "-lista.txt")
        lista.write_text("# lista de prueba\n" + TERMINO_PRIVADO + "\n" + TERMINO_CORTO + "\n"
                         + lista_extra
                         + ("autor: " + AUTOR_PERMITIDO + "\n" if lista_declara_autor else ""),
                         encoding="utf-8")
        (repo / ".datos-que-no-salen.ruta").write_text(str(lista), encoding="utf-8")
    return repo


def commit_previo(repo, autor, mensaje="previo"):
    """Deja un commit en el historial firmado con `autor`, sin pasar por el hook."""
    preparar(repo, "previo.md", "Commit previo.\n")
    sh(repo, "-c", "user.email=" + autor, "commit", "-q", "--no-verify", "-m", mensaje)


def preparar(repo, nombre, contenido):
    ruta = repo / nombre
    ruta.parent.mkdir(parents=True, exist_ok=True)
    if isinstance(contenido, bytes):
        ruta.write_bytes(contenido)
    else:
        ruta.write_bytes(contenido.encode("utf-8"))    # sin traducir saltos de línea
    sh(repo, "add", "-f", nombre)


def correr(repo, entrada=None, mensaje=None, entorno_extra=None, entrada_cruda=None):
    """Ejecuta el hook del repo de prueba.

    Sin argumentos, en modo pre-commit. Con `mensaje`, en modo commit-msg.
    Con `entrada` (o `entrada_cruda`), en modo Claude Code.
    """
    entorno = {k: v for k, v in os.environ.items() if k != "CT_LISTA_PRIVADA"}
    entorno.update(entorno_extra or {})
    args = [sys.executable, str(repo / ".claude" / "hooks" / HOOK.name)]
    por_stdin = None
    if mensaje is not None:
        fichero = repo / ".git" / "COMMIT_EDITMSG"
        fichero.write_text(mensaje, encoding="utf-8")
        args += ["--commit-msg", str(fichero)]
    elif entrada is not None or entrada_cruda is not None:
        if entrada is not None:
            entrada = dict(entrada, cwd=str(repo))
        por_stdin = entrada_cruda if entrada_cruda is not None else json.dumps(entrada)
    else:
        args.append("--pre-commit")
    r = subprocess.run(args, input=por_stdin, capture_output=True, text=True, env=entorno)
    return r.returncode


def registro(repo):
    f = repo / "docs" / "seguridad" / "registro-de-bloqueos.md"
    return f.read_text(encoding="utf-8") if f.exists() else ""


def bash(comando):
    return {"tool_name": "Bash", "tool_input": {"command": comando}}


def main():
    base = tempfile.mkdtemp(prefix="prueba-hook-")
    casos = []  # (descripción, esperado, encontrado)

    def caso(descripcion, esperado, encontrado):
        casos.append((descripcion, str(esperado), str(encontrado)))

    def limpio():
        r = nuevo_repo(base)
        preparar(r, "nota.md", "Texto limpio.\n")
        return r

    try:
        # =====================================================================
        # Modo pre-commit de git: pasa = 0, bloquea = 1
        # =====================================================================
        r = nuevo_repo(base); preparar(r, "nota.md", "Texto limpio con Cliente A.\n")
        caso("fichero limpio pasa", 0, correr(r))
        caso("fichero limpio no deja registro", "", registro(r))

        # --- Secretos: las siete categorías ----------------------------------
        for categoria, muestra in MUESTRAS_DE_SECRETO:
            r = nuevo_repo(base); preparar(r, "config.ts", "valor: %s\n" % muestra)
            caso("secreto bloquea: %s" % categoria, 1, correr(r))
            caso("  y el registro nombra la categoría", True, categoria in registro(r))
            caso("  y el registro no guarda el valor", False, muestra in registro(r))
        r = nuevo_repo(base)
        preparar(r, "config.ts", "sk-corto, AKIA123, eyJ.x, ghp_abc, re_abc, TOKEN=abc\n")
        caso("valores cortos con prefijo de secreto pasan", 0, correr(r))
        r = nuevo_repo(base)
        preparar(r, "c.json", '{"API' + '_KEY":"abcdefghij' + 'klmnopqrst"}\n')
        caso("secreto asignado en JSON bloquea", 1, correr(r))
        r = nuevo_repo(base)
        preparar(r, "c.js", "const API" + "_KEY = `abcdefghij" + "klmnopqrst`;\n")
        caso("secreto asignado entre comillas invertidas bloquea", 1, correr(r))
        r = nuevo_repo(base); preparar(r, "c.json", '{"API' + '_KEY":""}\n')
        caso("clave de JSON con valor vacío pasa", 0, correr(r))

        # --- Lectura del diff -------------------------------------------------
        r = nuevo_repo(base); preparar(r, "a.txt", "++ comentario\n%s\n" % SECRETO)
        caso("secreto después de una línea «++ » bloquea", 1, correr(r))
        r = nuevo_repo(base); preparar(r, "a.txt", "++ comentario\nTexto limpio.\n")
        caso("línea «++ » con texto limpio pasa", 0, correr(r))
        r = nuevo_repo(base); preparar(r, "a.txt", "Texto limpio.\r%s\n" % SECRETO)
        caso("secreto después de un retorno de carro suelto bloquea", 1, correr(r))
        r = nuevo_repo(base); preparar(r, "a.txt", "Texto limpio.\rMás texto limpio.\n")
        caso("retorno de carro suelto con texto limpio pasa", 0, correr(r))

        # --- Rutas ------------------------------------------------------------
        r = nuevo_repo(base); preparar(r, "año/niño.txt", "%s\n" % SECRETO)
        caso("secreto en un fichero con ñ en el nombre bloquea", 1, correr(r))
        r = nuevo_repo(base); preparar(r, "año/niño.txt", "Texto limpio.\n")
        caso("fichero limpio con ñ en el nombre pasa", 0, correr(r))

        r = nuevo_repo(base); preparar(r, TERMINO_PRIVADO + "/contrato.md", "Texto limpio.\n")
        caso("término privado en la ruta bloquea", 1, correr(r))
        caso("  y el registro no guarda la ruta", False, TERMINO_PRIVADO in registro(r))
        r = nuevo_repo(base); preparar(r, TERMINO_PRIVADO + "/config.ts", "%s\n" % SECRETO)
        correr(r)
        caso("otro hallazgo en una ruta privada tampoco la registra", False,
             TERMINO_PRIVADO in registro(r))
        r = nuevo_repo(base); preparar(r, "docs/contrato.md", "Texto limpio.\n")
        caso("ruta limpia pasa", 0, correr(r))

        r = nuevo_repo(base); preparar(r, "x.md", "Texto limpio.\n")
        sh(r, "commit", "-q", "--no-verify", "-m", "previo")
        (r / "x.md").unlink(); (r / "x.md").symlink_to(TERMINO_PRIVADO)
        sh(r, "add", "-f", "x.md")
        caso("cambio a enlace simbólico con destino privado bloquea", 1, correr(r))
        r = nuevo_repo(base); preparar(r, "x.md", "Texto limpio.\n")
        sh(r, "commit", "-q", "--no-verify", "-m", "previo")
        (r / "x.md").unlink(); (r / "x.md").symlink_to("otro.md")
        sh(r, "add", "-f", "x.md")
        caso("cambio a enlace simbólico con destino limpio pasa", 0, correr(r))

        # --- Binarios ---------------------------------------------------------
        r = nuevo_repo(base); preparar(r, "datos.bin", b"\x00\x01\x02 contenido cualquiera\n")
        caso("binario de extensión no permitida bloquea", 1, correr(r))
        caso("  y el registro lo dice", True, "binario que no se puede revisar" in registro(r))
        r = nuevo_repo(base); preparar(r, "nota.md", b"Texto con un byte nulo \x00 dentro.\n")
        caso("fichero de texto con un byte nulo bloquea", 1, correr(r))
        r = nuevo_repo(base); preparar(r, "logo.png", CABECERA_PNG + b"\x00" * 40)
        caso("imagen limpia pasa", 0, correr(r))
        r = nuevo_repo(base)
        preparar(r, "logo.png", CABECERA_PNG + b"\x00tEXtComment\x00" + SECRETO.encode() + b"\x00\x00")
        caso("imagen con un secreto legible dentro bloquea", 1, correr(r))
        r = nuevo_repo(base)
        preparar(r, "logo.png", CABECERA_PNG + b"\x00tEXtAutor: " + TERMINO_PRIVADO.encode() + b"\x00")
        caso("imagen con un término privado dentro bloquea", 1, correr(r))
        r = nuevo_repo(base); preparar(r, "datos.png", b"PK\x03\x04\x00\x00\x00\x00 comprimido \x00\x00")
        caso("comprimido renombrado a .png bloquea", 1, correr(r))
        caso("  y el registro lo dice", True, "no es la imagen que dice" in registro(r))
        r = nuevo_repo(base); preparar(r, "foto.jpg", b"\xff\xd8\xff\xe0\x00\x10JFIF\x00" + b"\x00" * 20)
        caso("imagen .jpg con su firma pasa", 0, correr(r))
        # Un .gitattributes puede hacer que git trate un binario como texto.
        r = nuevo_repo(base)
        preparar(r, ".gitattributes", "*.pdf diff\n")
        preparar(r, "doc.pdf", b"%PDF-1.4\n\x00\x01\x02 binario opaco \x00\n")
        caso("PDF que .gitattributes hace pasar por texto bloquea", 1, correr(r))
        r = nuevo_repo(base); preparar(r, ".gitattributes", "*.md text\n")
        caso("un .gitattributes sin binarios pasa", 0, correr(r))

        # --- Lista privada ----------------------------------------------------
        r = nuevo_repo(base); preparar(r, "doc.md", "Reunión con %s.\n" % TERMINO_PRIVADO)
        caso("término de la lista privada bloquea", 1, correr(r))
        caso("  y el registro no guarda el término", False, TERMINO_PRIVADO in registro(r))
        r = nuevo_repo(base); preparar(r, "doc.md", "Reunión con %s.\n" % TERMINO_PRIVADO.lower())
        caso("término privado en minúsculas bloquea", 1, correr(r))
        r = nuevo_repo(base)
        preparar(r, "doc.md", "const cliente%sCorp2025 = 1;\n" % TERMINO_PRIVADO)
        caso("término largo pegado a otras letras bloquea", 1, correr(r))
        r = nuevo_repo(base); preparar(r, "doc.md", "La palabra Empresa sola no es el término.\n")
        caso("palabra parecida al término pasa", 0, correr(r))
        r = nuevo_repo(base); preparar(r, "doc.md", "Código %s del proyecto.\n" % TERMINO_CORTO)
        caso("término corto como palabra completa bloquea", 1, correr(r))
        r = nuevo_repo(base); preparar(r, "doc.md", "Código %s_2025.\n" % TERMINO_CORTO)
        caso("término corto seguido de guion bajo bloquea", 1, correr(r))
        r = nuevo_repo(base); preparar(r, "doc.md", "Palabra a%sb y %sés.\n" % (TERMINO_CORTO, TERMINO_CORTO))
        caso("término corto dentro de otra palabra pasa", 0, correr(r))

        # Entradas «re:» de la lista: expresión regular, sin distinguir mayúsculas.
        r = nuevo_repo(base, lista_extra="re: contrato-\\d{4}\n")
        preparar(r, "doc.md", "Según el CONTRATO-2025.\n")
        caso("expresión regular de la lista bloquea", 1, correr(r))
        r = nuevo_repo(base, lista_extra="re: contrato-\\d{4}\n")
        preparar(r, "doc.md", "Según el contrato-marco.\n")
        caso("texto que no cumple la expresión regular pasa", 0, correr(r))
        r = nuevo_repo(base, lista_extra="re: contrato-(\\d{4}\n"); preparar(r, "doc.md", "Texto limpio.\n")
        caso("lista con una expresión regular inválida bloquea (ciego)", 1, correr(r))
        caso("  y el registro declara que quedó ciego", True, "QUEDÉ CIEGO" in registro(r))

        # --- Correos ----------------------------------------------------------
        r = nuevo_repo(base); preparar(r, "seed.sql", "insert ... '%s';\n" % CORREO_REAL)
        caso("correo de dominio real bloquea", 1, correr(r))
        r = nuevo_repo(base); preparar(r, "seed.sql", "insert ... '%s';\n" % CORREO_EJEMPLO)
        caso("correo de dominio de ejemplo pasa", 0, correr(r))
        r = nuevo_repo(base); preparar(r, "a.md", "empleado" + ARROBA + "anthropic.com\n")
        caso("correo cualquiera de anthropic.com bloquea", 1, correr(r))
        r = nuevo_repo(base); preparar(r, "a.md", "noreply" + ARROBA + "anthropic.com\n")
        caso("la dirección del pie de coautoría, en un fichero, bloquea", 1, correr(r))
        r = nuevo_repo(base); preparar(r, "a.md", "josé" + ARROBA + "dominio-inventado.io\n")
        caso("correo con tilde antes de la arroba bloquea", 1, correr(r))
        r = nuevo_repo(base); preparar(r, "a.md", "josé" + ARROBA + "example.com\n")
        caso("correo con tilde y dominio de ejemplo pasa", 0, correr(r))
        r = nuevo_repo(base); preparar(r, "a.md", "123+alguien" + ARROBA + "users.noreply.github.com\n")
        caso("correo de users.noreply.github.com bloquea", 1, correr(r))
        r = nuevo_repo(base); preparar(r, "a.md", "persona" + ARROBA + "ejemplo.com\n")
        caso("correo de ejemplo.com (dominio real) bloquea", 1, correr(r))
        r = nuevo_repo(base); preparar(r, "a.md", "persona" + ARROBA + "example.com.dominio-inventado.io\n")
        caso("dominio real que empieza por example.com bloquea", 1, correr(r))
        r = nuevo_repo(base)
        preparar(r, "package.json", '{"packageManager": "pnpm' + ARROBA + '9.1.0", "x": "react' + ARROBA + '18.2.0"}\n')
        caso("paquete con versión (nombre, arroba, número) pasa", 0, correr(r))

        # --- Ficheros .env ----------------------------------------------------
        r = nuevo_repo(base); preparar(r, ".env", "PUERTO=\n")
        caso("fichero .env bloquea", 1, correr(r))
        r = nuevo_repo(base); preparar(r, ".env.local", "PUERTO=\n")
        caso("fichero .env.local bloquea", 1, correr(r))
        r = nuevo_repo(base); preparar(r, "config/.ENV", "PUERTO=\n")
        caso("fichero .ENV en mayúsculas bloquea", 1, correr(r))
        r = nuevo_repo(base); preparar(r, "docs/envio.md", "Texto limpio.\n")
        caso("fichero cuyo nombre solo se parece a .env pasa", 0, correr(r))
        r = nuevo_repo(base)
        preparar(r, ".env.example", "# Variables\n\nSUPABASE_URL=\nPUERTO=\n")
        caso("fichero .env.example solo con nombres pasa", 0, correr(r))
        r = nuevo_repo(base); preparar(r, ".env.example", "SUPABASE_URL=\nPUERTO=3000\n")
        caso("fichero .env.example con un valor bloquea", 1, correr(r))
        caso("  y el registro lo dice", True, "valor en .env.example" in registro(r))

        # --- Quedé ciego ------------------------------------------------------
        r = nuevo_repo(base, con_lista=False); preparar(r, "nota.md", "Texto limpio.\n")
        caso("sin lista privada bloquea (ciego)", 1, correr(r))
        caso("  y el registro declara que quedó ciego", True, "QUEDÉ CIEGO" in registro(r))

        # --- Metadatos del commit: el correo del autor ------------------------
        r = nuevo_repo(base, autor=AUTOR_AJENO); preparar(r, "nota.md", "Texto limpio.\n")
        caso("correo de autor no permitido bloquea", 1, correr(r))
        caso("  y deja registro", True, "correo no permitido" in registro(r))
        caso("  y el registro no guarda el correo", False, AUTOR_AJENO in registro(r))

        r = nuevo_repo(base, autor=AUTOR_PERMITIDO.upper()); preparar(r, "nota.md", "Texto limpio.\n")
        caso("correo de autor permitido en mayúsculas pasa", 0, correr(r))

        r = limpio()
        caso("quien hace el commit con correo no permitido bloquea", 1,
             correr(r, entorno_extra={"GIT_COMMITTER_EMAIL": AUTOR_AJENO}))
        r = limpio()
        caso("quien hace el commit con correo permitido pasa", 0,
             correr(r, entorno_extra={"GIT_COMMITTER_EMAIL": AUTOR_PERMITIDO}))

        r = limpio(); sh(r, "config", "user.name", "Ana de " + TERMINO_PRIVADO)
        caso("nombre de autor con un término privado bloquea", 1, correr(r))
        caso("  y el registro no guarda el término", False, TERMINO_PRIVADO in registro(r))
        r = limpio(); sh(r, "config", "user.name", "Ana Pérez")
        caso("nombre de autor limpio pasa", 0, correr(r))

        r = nuevo_repo(base, lista_declara_autor=False); preparar(r, "nota.md", "Texto limpio.\n")
        caso("lista sin correo de autor bloquea (ciego)", 1, correr(r))
        caso("  y el registro declara que quedó ciego", True, "QUEDÉ CIEGO" in registro(r))

        # =====================================================================
        # Modo commit-msg de git: pasa = 0, bloquea = 1
        # =====================================================================
        r = limpio()
        caso("mensaje limpio pasa", 0, correr(r, mensaje="Agrega la nota de Cliente A\n"))
        r = limpio()
        caso("mensaje con un secreto bloquea", 1, correr(r, mensaje="Clave %s\n" % SECRETO))
        caso("  y el registro dice que fue en el mensaje", True, "mensaje del commit" in registro(r))
        caso("  y el registro no guarda el secreto", False, SECRETO in registro(r))
        r = limpio()
        caso("mensaje con un término privado bloquea", 1,
             correr(r, mensaje="Ajuste para %s\n" % TERMINO_PRIVADO))
        r = limpio()
        caso("mensaje con un correo real bloquea", 1,
             correr(r, mensaje="Pedido por %s\n" % CORREO_REAL))
        r = limpio()
        caso("mensaje con el correo de un autor permitido pasa", 0,
             correr(r, mensaje="Nota\n\n# Author: Prueba <%s>\n" % AUTOR_PERMITIDO))
        r = limpio()
        caso("mensaje con el pie de coautoría permitido pasa", 0,
             correr(r, mensaje="Nota\n\nCo-Authored-By: Claude <noreply%santhropic.com>\n" % ARROBA))
        r = limpio()
        caso("secreto en una línea de comentario del mensaje bloquea", 1,
             correr(r, mensaje="Nota\n# %s\n" % SECRETO))
        r = nuevo_repo(base, con_lista=False); preparar(r, "nota.md", "Texto limpio.\n")
        caso("mensaje sin lista privada bloquea (ciego)", 1, correr(r, mensaje="Nota\n"))

        # --- Los dos hooks de git se necesitan --------------------------------
        r = limpio(); (r / ".git" / "hooks" / "commit-msg").unlink()
        caso("pre-commit sin el hook commit-msg instalado bloquea (ciego)", 1, correr(r))
        caso("  y el registro declara que quedó ciego", True, "QUEDÉ CIEGO" in registro(r))
        r = limpio(); (r / ".git" / "hooks" / "pre-commit").unlink()
        caso("commit-msg sin el hook pre-commit instalado bloquea (ciego)", 1,
             correr(r, mensaje="Nota\n"))
        r = limpio(); (r / ".git" / "hooks" / "commit-msg").write_text("#!/bin/sh\nexit 0\n")
        caso("pre-commit con un commit-msg ajeno bloquea (ciego)", 1, correr(r))
        r = limpio(); (r / ".git" / "hooks" / "commit-msg").chmod(0o644)
        caso("pre-commit con un commit-msg no ejecutable bloquea (ciego)", 1, correr(r))

        # =====================================================================
        # Modo Claude Code: pasa = 0, bloquea = 2
        # =====================================================================
        r = nuevo_repo(base); preparar(r, "config.ts", 'const k = "%s";\n' % SECRETO)
        caso("Claude: comando que no es commit pasa", 0, correr(r, bash("git status")))
        caso("Claude: otra herramienta pasa", 0,
             correr(r, {"tool_name": "Read", "tool_input": {"file_path": "x"}}))
        caso("Claude: commit con secreto preparado bloquea", 2, correr(r, bash('git commit -m "x"')))
        caso("Claude: commit con -C a este repositorio y secreto bloquea", 2,
             correr(r, bash('git -C %s commit -m "x"' % r)))
        # Con -C se revisa el árbol que recibe el commit, si es de este repositorio.
        otro_limpio = limpio()
        caso("Claude: commit con -C a otro repositorio bloquea, aunque esté limpio", 2,
             correr(r, bash('git -C %s commit -m "x"' % otro_limpio)))
        caso("  y deja registro", True, "otro repositorio" in registro(r))
        caso("Claude: commit con -C a una ruta que no existe bloquea", 2,
             correr(otro_limpio, bash('git -C /ruta/que/no/existe commit -m "x"')))
        # Un árbol de trabajo del mismo repositorio: se revisa SU índice.
        principal = limpio(); sh(principal, "commit", "-q", "--no-verify", "-m", "previo")
        arbol = Path(str(principal) + "-arbol")
        sh(principal, "worktree", "add", "-q", str(arbol), "-b", "otra")
        (arbol / "limpio.md").write_text("Texto limpio.\n"); sh(arbol, "add", "limpio.md")
        caso("Claude: commit con -C a un árbol de trabajo limpio pasa", 0,
             correr(principal, bash('git -C %s commit -m "x"' % arbol)))
        (arbol / "config.ts").write_text(SECRETO + "\n"); sh(arbol, "add", "config.ts")
        caso("Claude: commit con -C a un árbol de trabajo con secreto bloquea", 2,
             correr(principal, bash('git -C %s commit -m "x"' % arbol)))
        # Órdenes que nombran «git commit» sin hacerlo: pasan aunque haya un secreto preparado.
        caso("Claude: echo que nombra git commit pasa", 0, correr(r, bash('echo "git commit"')))
        caso("Claude: grep que busca git commit pasa", 0,
             correr(r, bash('grep -rn "git commit" docs | head -5')))
        caso("Claude: git log que busca la palabra commit pasa", 0,
             correr(r, bash("git log --grep=commit | head -5")))

        r = limpio()
        caso("Claude: commit limpio pasa", 0, correr(r, bash('git commit -m "x"')))
        caso("Claude: commit limpio con redirección pasa", 0,
             correr(r, bash('git commit -m "x" 2>&1')))
        caso("Claude: commit limpio seguido de otra orden pasa", 0,
             correr(r, bash('git commit -m "x" && git log -1')))
        caso("Claude: mensaje que nombra --author, user.email y add -a pasa", 0,
             correr(r, bash('git commit -m "quita --author y user.email; ya no usa git add -a"')))

        # --- El commit va primero, solo y a la vista --------------------------
        for descripcion, comando in [
            ("add y commit juntos", 'git add . && git commit -m "x"'),
            ("apply --cached y commit juntos", 'git apply --cached p.diff && git commit -m "x"'),
            ("cd y commit juntos", 'cd /tmp; git commit -m "x"'),
            ("commit en la segunda línea", 'git update-index --add z\ngit commit -m "x"'),
            ("dos commits en un comando", 'git commit -m "x" && git commit -m "y"'),
            ("commit -am", 'git commit -am "x"'),
            ("commit --all", 'git commit --all -m "x"'),
            ("commit -i", 'git commit -i nota.md -m "x"'),
            ("commit --include abreviado", 'git commit --inc nota.md -m "x"'),
            ("commit --only", 'git commit --only nota.md -m "x"'),
            ("commit -p", 'git commit -p -m "x"'),
            ("commit con una ruta", 'git commit nota.md -m "x"'),
            ("commit con una ruta tras --", 'git commit -m "x" -- nota.md'),
            ("commit con --author", 'git commit --author="Alguien <%s>" -m "x"' % AUTOR_PERMITIDO),
            ("commit con -c user.email", 'git -c user.email=%s commit -m "x"' % AUTOR_PERMITIDO),
            ("commit con variable de entorno delante", 'GIT_INDEX_FILE=otro git commit -m "x"'),
            ("commit con correo en variable de entorno",
             'GIT_AUTHOR_EMAIL=%s git commit -m "x"' % AUTOR_PERMITIDO),
            ("commit -C que reutiliza otro commit", "git commit -C HEAD"),
            ("commit dentro de bash -c", "bash -c 'git commit -m x'"),
            ("commit dentro de env", 'env git commit -m "x"'),
            ("commit dentro de una sustitución", 'echo "$(git commit -m x)"'),
            ("commit con sustitución en el mensaje", 'git commit -m "$(cat mensaje.txt)"'),
            ("commit dentro de un if", 'if true; then git commit -m "x"; fi'),
            ("commit con -F de un fichero que no existe", "git commit -F no-existe.txt"),
            ("commit con --no-verify", 'git commit --no-verify -m "x"'),
            ("commit con --no-verify abreviado", 'git commit --no-v -m "x"'),
            ("commit con -n", 'git commit -n -m "x"'),
            ("commit con -qn", 'git commit -qn -m "x"'),
            ("commit con --git-dir", 'git --git-dir=.git commit -m "x"'),
            ("commit con --work-tree", 'git --work-tree . commit -m "x"'),
            ("commit con el mensaje en una variable", 'git commit -m "$MSG"'),
            ("commit con el mensaje en ${VARIABLE}", 'git commit -m "nota ${MSG}"'),
            ("commit con comodín sin comillas", "git commit -m *"),
            ("commit con llaves sin comillas", "git commit -m{a,b}"),
            ("commit con comillas $'…'", "git commit -m $'nota'"),
            ("commit con heredoc sin comillas y una variable", "git commit -F - <<EOF\nnota $MSG\nEOF"),
            ("commit con --template", "git commit --template plantilla.txt"),
            ("commit con -c core.hooksPath", 'git -c core.hooksPath=/dev/null commit -m "x"'),
            ("commit con -c de cualquier clave", 'git -c core.editor=true commit -m "x"'),
            ("commit escondido en un alias definido con -c",
             'git -c alias.publicar=commit publicar -m "x"'),
            ("alias con -c y sin hooks", 'git -c alias.p=commit -c core.hooksPath=/dev/null p -m "x"'),
        ]:
            r = limpio()
            caso("Claude: %s bloquea" % descripcion, 2, correr(r, bash(comando)))
            caso("  y deja registro", True, bool(registro(r)))

        # --- El mensaje, venga por donde venga --------------------------------
        r = limpio()
        caso("Claude: secreto en -m bloquea", 2, correr(r, bash('git commit -m "Clave %s"' % SECRETO)))
        caso("  y el registro no guarda el secreto", False, SECRETO in registro(r))
        r = limpio()
        caso("Claude: término privado en un segundo -m bloquea", 2,
             correr(r, bash('git commit -m "Nota" -m "Para %s"' % TERMINO_PRIVADO)))
        r = limpio()
        caso("Claude: correo real en --trailer bloquea", 2,
             correr(r, bash('git commit -m "Nota" --trailer "Reviewed-by: %s"' % CORREO_REAL)))
        r = limpio()
        caso("Claude: --trailer limpio pasa", 0,
             correr(r, bash('git commit -m "Nota" --trailer "Reviewed-by: %s"' % CORREO_EJEMPLO)))
        r = limpio()
        caso("Claude: mensaje con signos y asterisco entre comillas simples pasa", 0,
             correr(r, bash("git commit -m '¿Cuesta 5$? [sí] * {no}'")))
        r = limpio()
        caso("Claude: término privado en --message= bloquea", 2,
             correr(r, bash('git commit --message="Para %s"' % TERMINO_PRIVADO)))
        r = limpio()
        caso("Claude: término privado en un heredoc bloquea", 2,
             correr(r, bash("git commit -F - <<'EOF'\nNota\n\nPara %s\nEOF" % TERMINO_PRIVADO)))
        r = limpio()
        caso("Claude: heredoc limpio pasa", 0,
             correr(r, bash("git commit -F - <<'EOF'\nNota; con punto y coma && más\n\nCuerpo.\nEOF")))
        r = limpio(); (r / "mensaje.txt").write_text("Para %s\n" % TERMINO_PRIVADO, encoding="utf-8")
        caso("Claude: término privado en el fichero de -F bloquea", 2,
             correr(r, bash("git commit -F mensaje.txt")))
        r = limpio(); (r / "mensaje.txt").write_text("Nota limpia\n", encoding="utf-8")
        caso("Claude: fichero de -F limpio pasa", 0, correr(r, bash("git commit -F mensaje.txt")))
        r = limpio()
        caso("Claude: -F - sin heredoc bloquea", 2, correr(r, bash("git commit -F -")))
        r = limpio()
        caso("Claude: término privado en un heredoc leído con -F /dev/stdin bloquea", 2,
             correr(r, bash("git commit -F /dev/stdin <<'EOF'\nPara %s\nEOF" % TERMINO_PRIVADO)))
        r = limpio()
        caso("Claude: heredoc limpio leído con -F /dev/stdin pasa", 0,
             correr(r, bash("git commit -F /dev/stdin <<'EOF'\nNota limpia\nEOF")))
        r = nuevo_repo(base); commit_previo(r, AUTOR_PERMITIDO, "Para %s" % TERMINO_PRIVADO)
        preparar(r, "nota.md", "Texto limpio.\n")
        caso("Claude: --fixup=amend: de un commit con término privado bloquea", 2,
             correr(r, bash("git commit --fixup=amend:HEAD")))
        r = nuevo_repo(base); commit_previo(r, AUTOR_PERMITIDO, "Nota limpia")
        preparar(r, "nota.md", "Texto limpio.\n")
        caso("Claude: --fixup de un commit con mensaje limpio pasa", 0,
             correr(r, bash("git commit --fixup=HEAD")))

        # --- Identidad --------------------------------------------------------
        r = nuevo_repo(base, autor=AUTOR_AJENO); preparar(r, "nota.md", "Texto limpio.\n")
        caso("Claude: commit limpio con autor no permitido bloquea", 2,
             correr(r, bash('git commit -m "x"')))

        r = nuevo_repo(base); commit_previo(r, AUTOR_AJENO); preparar(r, "nota.md", "Texto limpio.\n")
        caso("Claude: amend que conserva un autor no permitido bloquea", 2,
             correr(r, bash("git commit --amend --no-edit")))
        caso("Claude: amend con --reset-author pasa", 0,
             correr(r, bash("git commit --amend --reset-author --no-edit")))

        r = nuevo_repo(base); commit_previo(r, AUTOR_PERMITIDO); preparar(r, "nota.md", "Texto limpio.\n")
        caso("Claude: amend que conserva un autor permitido pasa", 0,
             correr(r, bash("git commit --amend --no-edit")))
        r = nuevo_repo(base); commit_previo(r, AUTOR_PERMITIDO, "Para %s" % TERMINO_PRIVADO)
        preparar(r, "nota.md", "Texto limpio.\n")
        caso("Claude: amend que conserva un mensaje con término privado bloquea", 2,
             correr(r, bash("git commit --amend --no-edit")))

        # --- Entrada ilegible -------------------------------------------------
        r = limpio()
        caso("Claude: entrada que no es JSON bloquea", 2, correr(r, entrada_cruda="esto no es json"))
        caso("  y deja registro", True, "QUEDÉ CIEGO" in registro(r))
    finally:
        shutil.rmtree(base, ignore_errors=True)

    ancho = max(len(c[0]) for c in casos)
    print("%-*s  %-9s %-11s %s" % (ancho, "CASO", "ESPERADO", "ENCONTRADO", "ESTADO"))
    fallas = 0
    for descripcion, esperado, encontrado in casos:
        ok = esperado == encontrado
        fallas += 0 if ok else 1
        print("%-*s  %-9s %-11s %s" % (ancho, descripcion, esperado or "(vacío)",
                                         encontrado or "(vacío)", "OK" if ok else "FALLA"))
    print("\n%d casos · %d OK · %d FALLA" % (len(casos), len(casos) - fallas, fallas))
    if fallas:
        print("PRUEBA FALLIDA: el hook no se comporta como se espera.")
        sys.exit(1)
    print("PRUEBA EXITOSA: el hook bloquea lo que debe y deja pasar lo que debe.")


if __name__ == "__main__":
    main()

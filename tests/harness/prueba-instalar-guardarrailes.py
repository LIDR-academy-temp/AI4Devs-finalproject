#!/usr/bin/env python3
"""
Prueba de scripts/instalar-guardarrailes.sh: casos positivos y negativos.

Monta repositorios git desechables en un directorio temporal, copia ahí el
hook y el instalador, y comprueba dos cosas: que el instalador hace lo que
dice, y que el pre-commit instalado detiene de verdad un `git commit` real.
No toca este repositorio ni la lista privada real.

Uso:  python3 tests/harness/prueba-instalar-guardarrailes.py
Sale con 0 si todos los casos dan lo esperado, y con 1 si alguno falla.
"""
import os
import shutil
import subprocess
import sys
import tempfile
from pathlib import Path

RAIZ = Path(__file__).resolve().parents[2]
HOOK = RAIZ / ".claude" / "hooks" / "datos-que-no-salen.py"
INSTALADOR = RAIZ / "scripts" / "instalar-guardarrailes.sh"

SECRETO = "sk-" + "a1B2c3D4e5" * 3
TERMINO_PRIVADO = "Empresa" + "Ficticia"
AUTOR_PERMITIDO = "autora" + "@" + "example.com"
AUTOR_AJENO = "autora" + "@" + "empresa-inventada.io"
ENTORNO = {k: v for k, v in os.environ.items() if k != "CT_LISTA_PRIVADA"}


def git(repo, *args, autor=AUTOR_PERMITIDO):
    return subprocess.run(
        ["git", "-C", str(repo), "-c", "user.name=Prueba", "-c", "user.email=" + autor,
         *args], capture_output=True, text=True, env=ENTORNO)


def nuevo_repo(base, con_hook=True, con_lista=True):
    repo = Path(tempfile.mkdtemp(dir=base))
    git(repo, "init", "-q")
    (repo / "scripts").mkdir()
    shutil.copy(INSTALADOR, repo / "scripts" / INSTALADOR.name)
    if con_hook:
        destino = repo / ".claude" / "hooks"
        destino.mkdir(parents=True)
        shutil.copy(HOOK, destino / HOOK.name)
    if con_lista:
        lista = repo.parent / (repo.name + "-lista.txt")
        lista.write_text(TERMINO_PRIVADO + "\nautor: " + AUTOR_PERMITIDO + "\n", encoding="utf-8")
        (repo / ".datos-que-no-salen.ruta").write_text(str(lista), encoding="utf-8")
    return repo


def instalar(directorio, instalador=None):
    r = subprocess.run(["bash", str(instalador or directorio / "scripts" / INSTALADOR.name)],
                       cwd=str(directorio), capture_output=True, text=True, env=ENTORNO)
    return r.returncode, r.stdout + r.stderr


def commit(repo, nombre, contenido, *opciones, autor=AUTOR_PERMITIDO, mensaje="prueba"):
    (repo / nombre).write_text(contenido, encoding="utf-8")
    git(repo, "add", nombre)
    return git(repo, "commit", "-q", "-m", mensaje, *opciones, autor=autor).returncode


def copias(repo, nombre):
    """Las copias de respaldo que el instalador dejó de un hook."""
    return sorted((repo / ".git" / "hooks").glob(nombre + ".anterior-*"))


def main():
    base = tempfile.mkdtemp(prefix="prueba-instalador-")
    casos = []

    def caso(descripcion, esperado, encontrado):
        casos.append((descripcion, str(esperado), str(encontrado)))

    try:
        # --- El instalador -------------------------------------------------
        r = nuevo_repo(base)
        pre = r / ".git" / "hooks" / "pre-commit"
        msg = r / ".git" / "hooks" / "commit-msg"
        codigo, salida = instalar(r)
        caso("repo limpio: instala con 0", 0, codigo)
        caso("repo limpio: el pre-commit existe", True, pre.is_file())
        caso("repo limpio: el pre-commit es ejecutable", True, os.access(pre, os.X_OK))
        caso("repo limpio: el commit-msg existe", True, msg.is_file())
        caso("repo limpio: el commit-msg es ejecutable", True, os.access(msg, os.X_OK))
        caso("repo limpio: la validación no reporta fallas", False, "FALLA" in salida)
        codigo, _ = instalar(r)
        caso("reinstalar sobre los nuestros: 0", 0, codigo)
        caso("reinstalar sobre los nuestros: no deja copias", 0,
             len(copias(r, "pre-commit")) + len(copias(r, "commit-msg")))

        for nombre in ("pre-commit", "commit-msg"):
            r = nuevo_repo(base)
            ajeno = r / ".git" / "hooks" / nombre
            otro = r / ".git" / "hooks" / ("commit-msg" if nombre == "pre-commit" else "pre-commit")
            ajeno.parent.mkdir(parents=True, exist_ok=True)
            ajeno.write_text("#!/bin/sh\n# hook ajeno\nexit 0\n", encoding="utf-8")
            codigo, _ = instalar(r)
            caso("%s ajeno: se niega con 1" % nombre, 1, codigo)
            caso("%s ajeno: queda intacto" % nombre, True,
                 "hook ajeno" in ajeno.read_text(encoding="utf-8"))
            caso("%s ajeno: tampoco instala el otro hook" % nombre, False, otro.exists())

        # Un hook con nuestra marca pero con controles agregados por otra persona:
        # se recrea, y lo que tenía queda guardado en una copia.
        r = nuevo_repo(base); instalar(r)
        pre = r / ".git" / "hooks" / "pre-commit"
        pre.write_text(pre.read_text(encoding="utf-8").replace(
            "exec python3", "npm run lint || exit 1\nexec python3"), encoding="utf-8")
        codigo, salida = instalar(r)
        caso("pre-commit nuestro con agregados: instala con 0", 0, codigo)
        caso("pre-commit nuestro con agregados: lo avisa", True, "quedó guardado" in salida)
        caso("pre-commit nuestro con agregados: deja una copia", 1, len(copias(r, "pre-commit")))
        caso("pre-commit nuestro con agregados: la copia conserva lo agregado", True,
             any("npm run lint" in c.read_text(encoding="utf-8") for c in copias(r, "pre-commit")))
        caso("pre-commit nuestro con agregados: el instalado vuelve a ser el nuestro", False,
             "npm run lint" in pre.read_text(encoding="utf-8"))

        r = nuevo_repo(base, con_hook=False)
        codigo, _ = instalar(r)
        caso("sin el hook de revisión: se niega con 1", 1, codigo)
        caso("sin el hook de revisión: no crea pre-commit", False,
             (r / ".git" / "hooks" / "pre-commit").exists())
        caso("sin el hook de revisión: no crea commit-msg", False,
             (r / ".git" / "hooks" / "commit-msg").exists())

        fuera = Path(tempfile.mkdtemp(dir=base))
        (fuera / "scripts").mkdir()
        shutil.copy(INSTALADOR, fuera / "scripts" / INSTALADOR.name)
        codigo, _ = instalar(fuera)
        caso("script fuera de un repositorio git: se niega con 1", 1, codigo)

        # Llamado desde otro repositorio: instala en el suyo, no en el de quien llama.
        r = nuevo_repo(base)
        otro = nuevo_repo(base, con_hook=False)
        codigo, _ = instalar(otro, r / "scripts" / INSTALADOR.name)
        caso("llamado desde otro repo: instala con 0", 0, codigo)
        caso("llamado desde otro repo: instala en el propio", True,
             (r / ".git" / "hooks" / "pre-commit").is_file())
        caso("llamado desde otro repo: no toca el ajeno", False,
             (otro / ".git" / "hooks" / "pre-commit").exists())

        r = nuevo_repo(base, con_lista=False)
        codigo, salida = instalar(r)
        caso("sin lista privada: instala con 0", 0, codigo)
        caso("sin lista privada: lo avisa", True, "falta la lista privada" in salida)

        # --- El pre-commit instalado, con un `git commit` de verdad ---------
        r = nuevo_repo(base); instalar(r)
        caso("commit limpio entra", 0, commit(r, "nota.md", "Texto limpio con Cliente A.\n"))
        caso("commit con secreto no entra", 1, commit(r, "config.ts", 'const k = "%s";\n' % SECRETO))
        caso("el secreto no quedó en el historial", False,
             "config.ts" in git(r, "log", "--name-only", "--format=").stdout)

        r = nuevo_repo(base); instalar(r)
        caso("commit con término privado no entra", 1,
             commit(r, "doc.md", "Reunión con %s.\n" % TERMINO_PRIVADO))

        r = nuevo_repo(base, con_lista=False); instalar(r)
        caso("sin lista privada ningún commit entra", 1, commit(r, "nota.md", "Texto limpio.\n"))

        # --- El commit-msg instalado: el mensaje también se revisa -----------
        r = nuevo_repo(base); instalar(r)
        caso("commit con secreto en el mensaje no entra", 1,
             commit(r, "nota.md", "Texto limpio.\n", mensaje="Clave %s" % SECRETO))
        caso("commit con término privado en el mensaje no entra", 1,
             commit(r, "nota.md", "Texto limpio.\n", mensaje="Para %s" % TERMINO_PRIVADO))
        caso("nada de eso quedó en el historial", "",
             git(r, "log", "--format=%s").stdout.strip())
        caso("el mismo commit con un mensaje limpio entra", 0,
             commit(r, "nota.md", "Texto limpio.\n", mensaje="Agrega la nota"))

        r = nuevo_repo(base); instalar(r)
        (r / ".claude" / "hooks" / HOOK.name).unlink()
        (r / ".git" / "hooks" / "pre-commit").unlink()
        caso("si el hook de revisión desaparece, el commit-msg tampoco deja entrar", 1,
             commit(r, "nota.md", "Texto limpio.\n"))

        # --- Si desaparece UNO solo de los dos hooks, el otro lo delata -------
        r = nuevo_repo(base); instalar(r)
        (r / ".git" / "hooks" / "pre-commit").unlink()
        caso("sin el pre-commit, un commit con secreto no entra", 1,
             commit(r, "config.ts", 'const k = "%s";\n' % SECRETO))
        r = nuevo_repo(base); instalar(r)
        (r / ".git" / "hooks" / "commit-msg").unlink()
        caso("sin el commit-msg, un commit con secreto en el mensaje no entra", 1,
             commit(r, "nota.md", "Texto limpio.\n", mensaje="Clave %s" % SECRETO))
        codigo, _ = instalar(r)
        caso("reinstalar repone el hook que faltaba", 0, codigo)
        caso("y el commit limpio vuelve a entrar", 0, commit(r, "nota.md", "Texto limpio.\n"))

        # --- Con core.hooksPath configurado, se instala donde git los busca ---
        r = nuevo_repo(base)
        otro_dir = Path(tempfile.mkdtemp(dir=base))
        git(r, "config", "core.hooksPath", str(otro_dir))
        codigo, _ = instalar(r)
        caso("con core.hooksPath: instala con 0", 0, codigo)
        caso("con core.hooksPath: instala en ese directorio", True, (otro_dir / "pre-commit").is_file())
        caso("con core.hooksPath: el commit limpio entra", 0,
             commit(r, "nota.md", "Texto limpio.\n"))
        caso("con core.hooksPath: el commit con secreto no entra", 1,
             commit(r, "config.ts", 'const k = "%s";\n' % SECRETO))

        # --- Metadatos: el correo del autor, con la identidad definitiva -----
        r = nuevo_repo(base); instalar(r)
        caso("commit con correo de autor no permitido no entra", 1,
             commit(r, "nota.md", "Texto limpio.\n", autor=AUTOR_AJENO))
        caso("commit con --author de correo no permitido no entra", 1,
             commit(r, "nota.md", "Texto limpio.\n", "--author=Alguien <%s>" % AUTOR_AJENO))
        caso("el mismo commit con el autor permitido entra", 0, commit(r, "nota.md", "Texto limpio.\n"))

        r = nuevo_repo(base); instalar(r)
        commit(r, "previo.md", "Commit previo.\n", "--no-verify", autor=AUTOR_AJENO)
        caso("amend que conserva un autor no permitido no entra", 1,
             commit(r, "nota.md", "Texto limpio.\n", "--amend"))
        caso("amend con --reset-author entra", 0,
             commit(r, "nota.md", "Texto limpio.\n", "--amend", "--reset-author"))

        r = nuevo_repo(base); instalar(r)
        (r / ".claude" / "hooks" / HOOK.name).unlink()
        caso("si el hook de revisión desaparece, el commit no entra", 1,
             commit(r, "nota.md", "Texto limpio.\n"))
    finally:
        shutil.rmtree(base, ignore_errors=True)

    ancho = max(len(c[0]) for c in casos)
    print("%-*s  %-9s %-11s %s" % (ancho, "CASO", "ESPERADO", "ENCONTRADO", "ESTADO"))
    fallas = 0
    for descripcion, esperado, encontrado in casos:
        ok = esperado == encontrado
        fallas += 0 if ok else 1
        print("%-*s  %-9s %-11s %s" % (ancho, descripcion, esperado, encontrado, "OK" if ok else "FALLA"))
    print("\n%d casos · %d OK · %d FALLA" % (len(casos), len(casos) - fallas, fallas))
    if fallas:
        print("PRUEBA FALLIDA: el instalador o el pre-commit no se comportan como se espera.")
        sys.exit(1)
    print("PRUEBA EXITOSA: el instalador instala lo que debe y el pre-commit detiene lo que debe.")


if __name__ == "__main__":
    main()

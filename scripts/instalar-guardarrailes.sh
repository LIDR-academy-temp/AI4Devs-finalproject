#!/usr/bin/env bash
# instalar-guardarrailes.sh — instala los dos hooks de git que ejecutan
# .claude/hooks/datos-que-no-salen.py, y verifica que quedaron bien:
#   pre-commit   revisa lo preparado y la identidad del commit;
#   commit-msg   revisa el mensaje del commit.
#
# Por qué existe: los hooks de git no viajan con el clon. El hook de Claude Code
# (.claude/settings.json) solo vigila los commits que hace el agente; estos
# cubren también los que se hacen a mano desde la terminal.
#
# Cuándo se corre: una vez al clonar el repositorio en una máquina, y otra vez
# si un hook desaparece. Se puede repetir sin riesgo.
#
# Uso:  bash scripts/instalar-guardarrailes.sh
# Sale con 0 si todo quedó instalado y verificado, y con 1 si algo falló.

set -u

MARCA="# guardarrail: datos-que-no-salen"

fallar() {
  echo "ERROR: $1" >&2
  echo "$2" >&2
  exit 1
}

# --- 1. Comprobaciones previas: no se instala a ciegas -----------------------
# El repositorio es el que contiene a este script, no el directorio desde donde
# se le llama: así no puede instalarse por error en otro repositorio.
AQUI="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
RAIZ="$(git -C "$AQUI" rev-parse --show-toplevel 2>/dev/null)" \
  || fallar "este script no está dentro de un repositorio git ($AQUI)." \
            "No se instaló nada. Debe correrse desde su lugar en el clon: scripts/instalar-guardarrailes.sh."
HOOK="$RAIZ/.claude/hooks/datos-que-no-salen.py"
[ -f "$HOOK" ] \
  || fallar "no existe .claude/hooks/datos-que-no-salen.py." \
            "No se instaló nada. El clon está incompleto: recupera ese fichero antes de instalar."
command -v python3 >/dev/null 2>&1 \
  || fallar "no se encontró python3 en esta máquina." \
            "No se instaló nada. Instala Python 3 y repite."

DIR_HOOKS="$(git -C "$RAIZ" rev-parse --git-path hooks)"
case "$DIR_HOOKS" in /*) ;; *) DIR_HOOKS="$RAIZ/$DIR_HOOKS" ;; esac

# El texto exacto de cada hook. `pre-commit` no recibe argumentos; `commit-msg`
# recibe la ruta del fichero del mensaje.
contenido() {  # nombre del hook
  local argumentos="--pre-commit"
  [ "$1" = "commit-msg" ] && argumentos='--commit-msg "$1"'
  cat <<EOF
#!/usr/bin/env bash
$MARCA
# Instalado por scripts/instalar-guardarrailes.sh. No editar: se recrea al reinstalar.
RAIZ="\$(git rev-parse --show-toplevel)"
HOOK="\$RAIZ/.claude/hooks/datos-que-no-salen.py"
if [ ! -f "\$HOOK" ]; then
  echo "datos-que-no-salen: QUEDÉ CIEGO, no encuentro \$HOOK. Commit detenido por precaución." >&2
  exit 1
fi
exec python3 "\$HOOK" $argumentos
EOF
}

# --- 2. Si ya hay un hook: tres casos, y se revisan los dos ANTES de tocar ---
#   idéntico al nuestro        -> se vuelve a crear;
#   con la marca pero distinto -> es una versión anterior o alguien le agregó
#                                 cosas: se guarda una copia y se recrea;
#   sin la marca               -> es ajeno: no se toca nada y se detiene.
for NOMBRE in pre-commit commit-msg; do
  DESTINO="$DIR_HOOKS/$NOMBRE"
  if [ -e "$DESTINO" ] && ! grep -qF "$MARCA" "$DESTINO"; then
    fallar "ya existe un $NOMBRE que no es de este guardarraíl ($DESTINO)." \
           "No se instaló nada. Revísalo a mano: no se sobrescribe un hook ajeno."
  fi
done

# --- 3. Crear ----------------------------------------------------------------
mkdir -p "$DIR_HOOKS" || fallar "no se pudo crear $DIR_HOOKS." "No se instaló nada. Revisa los permisos."
SELLO="$(date +%Y%m%d-%H%M%S)"
for NOMBRE in pre-commit commit-msg; do
  DESTINO="$DIR_HOOKS/$NOMBRE"
  if [ -e "$DESTINO" ]; then
    if [ "$(cat "$DESTINO")" = "$(contenido "$NOMBRE")" ]; then
      echo "Ya había un $NOMBRE de este guardarraíl, idéntico: se vuelve a crear."
    else
      COPIA="$DESTINO.anterior-$SELLO"
      cp -p "$DESTINO" "$COPIA" \
        || fallar "no se pudo guardar la copia del $NOMBRE anterior." \
                  "El $NOMBRE no se tocó. Revisa los permisos de $DIR_HOOKS."
      echo "AVISO: había un $NOMBRE con la marca pero con otro contenido. Se recrea,"
      echo "       y el anterior quedó guardado en $COPIA"
      echo "       Si tenía otros controles agregados, recupéralos de ahí."
    fi
  fi
  contenido "$NOMBRE" > "$DESTINO" || fallar "no se pudo escribir $DESTINO." "Revisa los permisos."
  chmod +x "$DESTINO"
done

# --- 4. Validación 1 a 1: esperado / encontrado / estado ---------------------
FILAS=""
FALLAS=0
comprobar() {  # descripción · esperado · encontrado
  local estado="OK"
  if [ "$2" != "$3" ]; then estado="FALLA"; FALLAS=$((FALLAS + 1)); fi
  FILAS="$FILAS$1|$2|$3|$estado
"
}
si_no() { if "$@" >/dev/null 2>&1; then echo "sí"; else echo "no"; fi; }
identico() { [ "$(cat "$1")" = "$(contenido "$2")" ]; }

comprobar "el hook de revisión existe" "sí" "$(si_no test -f "$HOOK")"
for NOMBRE in pre-commit commit-msg; do
  DESTINO="$DIR_HOOKS/$NOMBRE"
  comprobar "$NOMBRE: existe"                      "sí" "$(si_no test -f "$DESTINO")"
  comprobar "$NOMBRE: es ejecutable"               "sí" "$(si_no test -x "$DESTINO")"
  comprobar "$NOMBRE: lleva la marca"              "sí" "$(si_no grep -qF "$MARCA" "$DESTINO")"
  comprobar "$NOMBRE: llama al hook en modo --$NOMBRE" "sí" "$(si_no grep -qF -- "\"\$HOOK\" --$NOMBRE" "$DESTINO")"
  comprobar "$NOMBRE: es idéntico al esperado"     "sí" "$(si_no identico "$DESTINO" "$NOMBRE")"
done

# La tabla la alinea python3 (ya comprobado arriba): printf cuenta bytes, y las
# tildes le descuadran las columnas.
echo
printf 'COMPROBACIÓN|ESPERADO|ENCONTRADO|ESTADO\n%s' "$FILAS" | python3 -c '
import sys
filas = [l.rstrip("\n").split("|") for l in sys.stdin if l.strip()]
anchos = [max(len(f[i]) for f in filas) for i in range(4)]
for f in filas:
    print("  ".join(c.ljust(a) for c, a in zip(f, anchos)).rstrip())
'

echo
if [ "$FALLAS" -gt 0 ]; then
  echo "INSTALACIÓN FALLIDA: $FALLAS comprobación(es) no dieron lo esperado." >&2
  exit 1
fi
echo "Hooks pre-commit y commit-msg instalados exitosamente en $DIR_HOOKS"

# --- 5. Aviso sobre la lista privada (no es falla de la instalación) ---------
if [ -z "${CT_LISTA_PRIVADA:-}" ] && [ ! -f "$RAIZ/.datos-que-no-salen.ruta" ]; then
  echo
  echo "AVISO: falta la lista privada de nombres reales. Hasta que exista, el hook"
  echo "detiene TODOS los commits, a propósito: sin la lista no puede revisar."
  echo "Remedio: escribe la ruta de la lista, en una línea, en el fichero"
  echo "  $RAIZ/.datos-que-no-salen.ruta"
  echo "o define la variable de entorno CT_LISTA_PRIVADA con esa ruta."
fi
exit 0

#!/usr/bin/env bash
# Levanta la base local con solo los servicios que usa el proyecto: la base,
# el servicio de autenticación y la API. Aplica las migraciones de
# supabase/migrations al arrancar. La usan la máquina y la integración continua,
# para que las dos levanten lo mismo.
#
# Uso:  bash scripts/base/levantar-base.sh
# Necesita Docker abierto y la herramienta supabase.
set -euo pipefail

# Siempre desde la raíz del repositorio, se llame desde donde se llame: la
# herramienta toma el proyecto de la carpeta en que corre, y desde otra
# carpeta levantaría un proyecto vacío con otro nombre.
RAIZ="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$RAIZ"
if [ ! -f supabase/config.toml ]; then
  echo "ERROR: no encuentro supabase/config.toml en $RAIZ; no sé qué base levantar." >&2
  exit 1
fi

if ! command -v supabase >/dev/null 2>&1; then
  echo "ERROR: no encuentro la herramienta supabase. Instálala y repite." >&2
  exit 1
fi
if ! docker info >/dev/null 2>&1; then
  echo "ERROR: Docker no responde. Ábrelo y repite: la base local corre ahí." >&2
  exit 1
fi

# Servicios que no se usan: archivos, tiempo real, funciones, imágenes, panel,
# su API de metadatos, registros y el agrupador de conexiones. El buzón de
# prueba sí se levanta desde HU-01.1: sin él, el servicio responde con un error
# de envío a la solicitud de cambio de correo, y la prueba de D-103 no podría
# distinguir ese error del rechazo de la base (visto en local el 25/11/2026).
NO_SE_USAN="storage-api,realtime,edge-runtime,imgproxy,studio,postgres-meta,logflare,vector,supavisor"

if ! supabase start -x "$NO_SE_USAN"; then
  echo "ERROR: la base local no arrancó. Si una migración falló, su mensaje está arriba." >&2
  exit 1
fi
echo "OK: base local arriba, con las migraciones aplicadas."

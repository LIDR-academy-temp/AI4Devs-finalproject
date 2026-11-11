#!/usr/bin/env bash
# Thin wrapper over docker compose for the deployment (docs/deploy.md). Needs Docker and Git, not Node.
#   scripts/deploy.sh build | up | migrate | seed | logs [service] | ps | check | down
# check is read-only: the database logins and users, and the last audited logins with their IP (bundled SQL Server only).
# DEPLOY_DB=external in infra/.env.deploy targets an external SQL Server.
# DEPLOY_DEBUG=1 in the environment runs without a tunnel, on http://127.0.0.1:8080.
set -euo pipefail

root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
env_file="$root/infra/.env.deploy"

usage() {
  echo "Usage: scripts/deploy.sh build | up | migrate | seed | logs [service] | ps | check | down" >&2
  exit 2
}

[ $# -ge 1 ] || usage
command="$1"
shift

case "$command" in
  build | up | migrate | seed | logs | ps | check | down) ;;
  *) usage ;;
esac

if [ ! -f "$env_file" ]; then
  echo "Missing infra/.env.deploy: copy infra/.env.deploy.example and fill it in (docs/deploy.md)." >&2
  exit 1
fi

# Prints a variable from the env file without sourcing it.
setting() {
  sed -n "s/^$1=//p" "$env_file" | tail -n 1 | tr -d '\r'
}

compose=(docker compose --env-file "$env_file" -f "$root/infra/docker-compose.deploy.yml")
if [ "$(setting DEPLOY_DB)" = "external" ]; then
  compose+=(-f "$root/infra/docker-compose.deploy.external-db.yml")
fi
if [ "${DEPLOY_DEBUG:-}" = "1" ]; then
  compose+=(-f "$root/infra/docker-compose.deploy.debug.yml")
fi

case "$command" in
  build)
    "${compose[@]}" --profile ops build "$@"
    ;;
  up)
    if [ "${DEPLOY_DEBUG:-}" != "1" ] && [ -z "$(setting TUNNEL_TOKEN)" ]; then
      echo "TUNNEL_TOKEN is empty in infra/.env.deploy: create the tunnel first (docs/deploy.md)." >&2
      exit 1
    fi
    "${compose[@]}" up -d "$@"
    ;;
  migrate)
    "${compose[@]}" run --rm migrate
    ;;
  seed)
    echo "The seed DELETES all the data in the database and reloads the synthetic world."
    read -r -p "Type seed to continue: " answer
    if [ "$answer" != "seed" ]; then
      echo "Cancelled: nothing changed."
      exit 1
    fi
    "${compose[@]}" run --rm seed
    ;;
  logs)
    "${compose[@]}" logs -f --tail=200 "$@"
    ;;
  ps)
    "${compose[@]}" ps "$@"
    ;;
  check)
    if [ "$(setting DEPLOY_DB)" = "external" ]; then
      echo "check reads the bundled SQL Server; with DEPLOY_DB=external run the queries of docs/deploy.md on your server." >&2
      exit 1
    fi
    # Read-only. Runs inside the mssql container with its own sa password, which never leaves it.
    # detailJson holds the user name, the reason and the IP, never a password.
    query="SET NOCOUNT ON;
PRINT '== Database logins (recon_*)';
SELECT name AS login FROM sys.sql_logins WHERE name LIKE 'recon[_]%' ORDER BY name;
PRINT '== Database users (recon_*), also those left without a login';
SELECT name AS [user] FROM sys.database_principals WHERE name LIKE 'recon[_]%' ORDER BY name;
PRINT '== Last 5 audited logins';
SELECT TOP (5) CONVERT(varchar(19), createdAt, 120) AS createdAt, action, detailJson
FROM dbo.AuditLog WHERE action LIKE 'auth.login.%' ORDER BY auditId DESC;"
    # shellcheck disable=SC2016 # expanded inside the container, not here
    "${compose[@]}" exec -T mssql bash -c \
      '/opt/mssql-tools18/bin/sqlcmd -S localhost -U sa -P "$MSSQL_SA_PASSWORD" -C -b -W -s " | " -d "${DB_NAME:-ReconTool}" -Q "$1"' \
      check "$query"
    ;;
  down)
    # Volumes stay: removing them deletes the data, and is done by hand on purpose (docs/deploy.md).
    "${compose[@]}" down
    ;;
esac

#!/bin/bash
# Starts SQL Server and, once it responds, runs init.sql exactly once (it is idempotent).
set -e
/opt/mssql/bin/sqlservr &
PID=$!
for i in $(seq 1 60); do
  if /opt/mssql-tools18/bin/sqlcmd -S localhost -U sa -P "$MSSQL_SA_PASSWORD" -C -Q "SELECT 1" -b -o /dev/null 2>/dev/null; then
    echo "[init] SQL Server ready; applying init.sql"
    /opt/mssql-tools18/bin/sqlcmd -S localhost -U sa -P "$MSSQL_SA_PASSWORD" -C -b \
      -v RECON_APP_PASSWORD="$RECON_APP_PASSWORD" DB_NAME="${DB_NAME:-ReconTool}" -i /init/init.sql
    echo "[init] done"
    break
  fi
  sleep 2
done
wait $PID

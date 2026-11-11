#!/usr/bin/env bash
# Blocks destructive or DB-deployment commands from the agent.
# The agent may generate the client and run tests; migrating and seeding is done by a human.
input=$(cat)
cmd=$(printf '%s' "$input" | sed -n 's/.*"command":"\([^"]*\)".*/\1/p' | head -1)
case "$cmd" in
  *"migrate reset"*|*"migrate deploy"*|*"migrate dev"*|*"db:reset"*|*"db:migrate"*|*"db:seed"*|*"db push"*|*"DROP DATABASE"*|*"DROP TABLE"*|*"TRUNCATE"*)
    echo "Blocked by .claude/hooks/guard-db.sh: migrations, seed and destructive DDL are run by a person. Propose the command in the PR." >&2
    exit 2 ;;
esac
exit 0

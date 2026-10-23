#!/usr/bin/env bash
# Feeds the Claude Code guard hooks with simulated tool-call JSON and checks their exit codes.
# Never touches real files: guard-schema runs against a throwaway project directory.
# Usage: bash scripts/test-hooks.sh   (or pnpm test:hooks)
set -u

repo="$(cd "$(dirname "$0")/.." && pwd)"
schema_hook="$repo/.claude/hooks/guard-schema.sh"
db_hook="$repo/.claude/hooks/guard-db.sh"

project="$(mktemp -d)"
trap 'rm -rf "$project"' EXIT
mkdir -p "$project/openspec/changes/archive/old-schema-change" "$project/api-collection"

failures=0
total=0

# check <description> <expected exit> <hook> <cwd> <json>
check() {
  local description="$1" expected="$2" hook="$3" cwd="$4" json="$5" actual
  total=$((total + 1))
  actual=$(cd "$cwd" && printf '%s' "$json" | CLAUDE_PROJECT_DIR="$project" bash "$hook" >/dev/null 2>&1; echo $?)
  if [ "$actual" = "$expected" ]; then
    echo "  ok   $description (exit $actual)"
  else
    echo "  FAIL $description: expected exit $expected, got $actual"
    failures=$((failures + 1))
  fi
}

edit_json() {
  printf '{"tool_name":"Edit","tool_input":{"file_path":"%s","old_string":"a","new_string":"b"}}' "$1"
}

bash_json() {
  printf '{"tool_name":"Bash","tool_input":{"command":"%s","description":"test"}}' "$1"
}

# JSON-escaped Windows path (C:\\...) and a POSIX-style path to the same files.
schema_backslash='C:\\proj\\backend\\prisma\\schema.prisma'
schema_slash='C:/proj/backend/prisma/schema.prisma'
migration_backslash='C:\\proj\\backend\\prisma\\migrations\\20261016_init\\migration.sql'
other_file='C:\\proj\\backend\\src\\app.ts'

# run_schema_cases <scenario> <expected exit for schema and migration edits>
run_schema_cases() {
  local scenario="$1" expected="$2" where cwd
  for where in root api-collection; do
    if [ "$where" = root ]; then cwd="$project"; else cwd="$project/api-collection"; fi
    check "$scenario, schema path with \\ from $where" "$expected" "$schema_hook" "$cwd" "$(edit_json "$schema_backslash")"
    check "$scenario, schema path with / from $where" "$expected" "$schema_hook" "$cwd" "$(edit_json "$schema_slash")"
    check "$scenario, migration path from $where" "$expected" "$schema_hook" "$cwd" "$(edit_json "$migration_backslash")"
    check "$scenario, unrelated file from $where" 0 "$schema_hook" "$cwd" "$(edit_json "$other_file")"
  done
}

echo "guard-schema.sh"
# An archived change that mentions the schema must not unlock it.
echo "Touches backend/prisma/schema.prisma." >"$project/openspec/changes/archive/old-schema-change/proposal.md"
run_schema_cases "no open proposal" 2

mkdir -p "$project/openspec/changes/api-docs"
echo "Adds a Bruno collection. No database changes." >"$project/openspec/changes/api-docs/proposal.md"
run_schema_cases "proposal that does not declare the schema" 2

mkdir -p "$project/openspec/changes/fee-schema"
echo "Adds a column to Fee in backend/prisma/schema.prisma and a new migration." >"$project/openspec/changes/fee-schema/proposal.md"
run_schema_cases "proposal that declares the schema" 0

echo "guard-db.sh"
check "pnpm db:seed is blocked" 2 "$db_hook" "$project" "$(bash_json 'pnpm db:seed')"
check "pnpm db:migrate is blocked" 2 "$db_hook" "$project" "$(bash_json 'pnpm db:migrate')"
check "prisma migrate dev is blocked" 2 "$db_hook" "$project" "$(bash_json 'pnpm exec prisma migrate dev --name x')"
check "prisma migrate reset is blocked" 2 "$db_hook" "$project/api-collection" "$(bash_json 'npx prisma migrate reset --force')"
check "a harmless command is allowed" 0 "$db_hook" "$project" "$(bash_json 'git status')"

echo
if [ "$failures" -gt 0 ]; then
  echo "$failures of $total hook checks failed"
  exit 1
fi
echo "All $total hook checks passed"

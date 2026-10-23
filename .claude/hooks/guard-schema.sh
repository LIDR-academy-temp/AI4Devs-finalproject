#!/usr/bin/env bash
# Editing schema.prisma or migrations: only with an open OpenSpec change that declares it
# (its proposal.md mentions schema.prisma or migrations). Works from any working directory.
input=$(cat)
# Windows paths arrive JSON-escaped (C:\\Projects\\...): turn any run of backslashes into one slash.
path=$(printf '%s' "$input" | sed -n 's/.*"file_path" *: *"\([^"]*\)".*/\1/p' | head -1 | tr -s '\\' '/')
root="${CLAUDE_PROJECT_DIR:-$(cd "$(dirname "$0")/../.." && pwd)}"
case "$path" in
  *prisma/schema.prisma|*prisma/migrations/*)
    if ! grep -lE 'schema\.prisma|migrations' "$root"/openspec/changes/*/proposal.md >/dev/null 2>&1; then
      echo "Blocked: $path may only be edited within an OpenSpec change whose proposal.md declares it (mentions schema.prisma or migrations). Create or update the proposal first (/opsx:propose)." >&2
      exit 2
    fi ;;
esac
exit 0

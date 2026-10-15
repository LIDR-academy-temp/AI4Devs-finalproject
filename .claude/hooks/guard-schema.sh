#!/usr/bin/env bash
# Editing schema.prisma or migrations: only with an open OpenSpec change that declares it.
input=$(cat)
path=$(printf '%s' "$input" | sed -n 's/.*"file_path":"\([^"]*\)".*/\1/p' | head -1)
case "$path" in
  *prisma/schema.prisma|*prisma/migrations/*)
    if ! ls openspec/changes/*/proposal.md >/dev/null 2>&1; then
      echo "Blocked: $path may only be edited within an OpenSpec change (openspec/changes/<change>/proposal.md). Create the proposal first (/opsx:propose)." >&2
      exit 2
    fi ;;
esac
exit 0

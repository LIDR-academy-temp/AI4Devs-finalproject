#!/usr/bin/env bash
# Formats and lints the just-edited file with Biome (non-blocking).
input=$(cat)
path=$(printf '%s' "$input" | sed -n 's/.*"file_path":"\([^"]*\)".*/\1/p' | head -1)
case "$path" in
  *.ts|*.tsx|*.js|*.json)
    [ -f "$path" ] && pnpm exec biome check --write "$path" >/dev/null 2>&1 || true ;;
esac
exit 0

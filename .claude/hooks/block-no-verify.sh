#!/bin/bash
# PreToolUse hook (Bash): bloquea git commit/push con --no-verify en este repo.
# El hook pre-commit de husky corre `npm run validate` a propósito (ver
# CLAUDE.md § Validación) — saltárselo deshace esa protección.
input=$(cat)
command=$(echo "$input" | jq -r '.tool_input.command // empty' 2>/dev/null)

if echo "$command" | grep -q -- '--no-verify'; then
  echo "Bloqueado: este repo no permite --no-verify en git commit/push (ver CLAUDE.md § Validación). Si el usuario lo pidió explícitamente para este caso, dilo en el chat en vez de ejecutarlo directo." >&2
  exit 2
fi

exit 0

#!/bin/bash
# PreToolUse hook (Bash): bloquea comandos de Prisma que borran datos de la
# base local sin que nadie lo haya pedido explícitamente (migrate reset, db
# push con --force-reset/--accept-data-loss). `npx prisma migrate dev` y
# `npx prisma db seed` NO quedan afectados — son el flujo normal.
input=$(cat)
command=$(echo "$input" | jq -r '.tool_input.command // empty' 2>/dev/null)

if echo "$command" | grep -qE 'prisma +migrate +reset' \
  || echo "$command" | grep -qE 'prisma +db +push.*(--force-reset|--accept-data-loss)'; then
  echo "Bloqueado: este comando borra datos de la base local (prisma migrate reset / db push --force-reset|--accept-data-loss). Si el usuario realmente lo pidió, dilo en el chat y pídele que lo confirme antes de ejecutarlo." >&2
  exit 2
fi

exit 0

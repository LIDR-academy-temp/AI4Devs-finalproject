#!/bin/bash
# PostToolUse hook (Edit|Write): recordatorio, no bloqueo. Si se tocó un
# Route Handler bajo app/api/businesses/[businessId]/** que NO es el de slots
# (público a propósito), avisa si no llama a requireOwnBusiness — la única
# verificación de multi-tenancy que debe usar todo endpoint del panel del
# negocio (ver CLAUDE.md § Conventions / § Arquitectura).
input=$(cat)
file_path=$(echo "$input" | jq -r '.tool_input.file_path // empty' 2>/dev/null)

if [[ "$file_path" == *"app/api/businesses/"*"/route.ts" ]] && [[ "$file_path" != *"/slots/"* ]]; then
  if [[ -f "$file_path" ]] && ! grep -q "requireOwnBusiness" "$file_path"; then
    echo "Recordatorio: $file_path está bajo app/api/businesses/[businessId]/ y no llama a requireOwnBusiness (lib/security/authz.ts). Si es un endpoint del panel del negocio (no público como slots), debe verificar session.user.businessId contra el businessId de la URL." >&2
  fi
fi

exit 0

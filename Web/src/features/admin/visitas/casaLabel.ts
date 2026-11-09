import type { CasaListItem } from '../../../shared/types/usuariosAdmin'

export function formatCasaLabel(c: CasaListItem): string {
  const numero = c.numero?.trim() || String(c.casaId)
  const condominio = c.condominioNombre?.trim()
  return condominio ? `${numero} — ${condominio}` : numero
}

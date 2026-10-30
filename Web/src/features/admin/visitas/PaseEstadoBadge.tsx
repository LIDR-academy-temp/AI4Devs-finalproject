import type { PaseVisita } from '../../../shared/types/visitasPase'
import { estadoLabel, paseEstadoBadgeClass, resolveEstadoLista } from './pasesQrTableFilter'

type Props = {
  pase: PaseVisita
}

export function PaseEstadoBadge({ pase }: Props) {
  const estado = resolveEstadoLista(pase)
  return <span className={paseEstadoBadgeClass(estado)}>{estadoLabel(pase)}</span>
}

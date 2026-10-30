import { AdminMobileCard } from '../../../shared/components/admin/AdminMobileCard'
import type { PaseVisita } from '../../../shared/types/visitasPase'
import { tipoPaseLabel, vigenciaResumen } from './pasesQrTableFilter'
import { PaseEstadoBadge } from './PaseEstadoBadge'

type Props = {
  pase: PaseVisita
  active?: boolean
  onShare: (p: PaseVisita) => void
}

export function PaseQrAdminMobileCard({ pase, active, onShare }: Props) {
  return (
    <AdminMobileCard
      title={pase.nombreVisitante}
      subtitle={pase.nombreVisitado ?? '—'}
      badges={<PaseEstadoBadge pase={pase} />}
      meta={[
        { label: 'Tipo', value: tipoPaseLabel(pase) },
        { label: 'Vigencia', value: vigenciaResumen(pase) },
      ]}
      active={active}
      onActivate={() => onShare(pase)}
      ariaLabel={`Compartir pase de ${pase.nombreVisitante}`}
    />
  )
}

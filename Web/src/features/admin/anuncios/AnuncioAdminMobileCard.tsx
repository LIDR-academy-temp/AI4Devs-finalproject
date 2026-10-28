import { AdminMobileCard } from '../../../shared/components/admin/AdminMobileCard'
import type { AnuncioItem } from '../../../shared/types/anuncios'

type Props = {
  anuncio: AnuncioItem
  active?: boolean
  onEdit: (a: AnuncioItem) => void
}

export function AnuncioAdminMobileCard({ anuncio, active, onEdit }: Props) {
  const vigencia = anuncio.vigenteHasta
    ? new Date(anuncio.vigenteHasta).toLocaleDateString('es-MX')
    : 'Sin fin'

  return (
    <AdminMobileCard
      title={anuncio.titulo}
      subtitle={anuncio.tipoAnuncio ?? '—'}
      meta={[
        { label: 'Publicado', value: new Date(anuncio.fechaPublicacion).toLocaleDateString('es-MX') },
        { label: 'Vigente hasta', value: vigencia },
      ]}
      active={active}
      onActivate={() => onEdit(anuncio)}
      ariaLabel={`Editar ${anuncio.titulo}`}
    />
  )
}

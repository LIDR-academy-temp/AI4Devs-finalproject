import { useState, type ReactNode } from 'react'
import { EstadoTicketBadge } from './EstadoTicketBadge'
import { useTicketComentarios } from './useTicketComentarios'
import { useTicketDetalle } from './useTicketDetalle'
import { useToast } from '../../shared/toast/ToastContext'

type TicketDetallePanelProps = {
  ticketId: number
  isAdmin?: boolean
  showAdminActions?: ReactNode
}

export function TicketDetallePanel({
  ticketId,
  isAdmin = false,
  showAdminActions,
}: TicketDetallePanelProps) {
  const { detalle, loading, error, notFound } = useTicketDetalle(ticketId)
  const { items, loading: loadingComments, posting, publicar } = useTicketComentarios(ticketId)
  const [texto, setTexto] = useState('')
  const [esInterno, setEsInterno] = useState(false)
  const toast = useToast()

  const enviar = async () => {
    const trimmed = texto.trim()
    if (!trimmed) return
    const result = await publicar({
      comentario: trimmed,
      esInterno: isAdmin ? esInterno : false,
    })
    if (result.ok) {
      toast.success('Comentario publicado')
      setTexto('')
      setEsInterno(false)
    } else {
      toast.error(result.error)
    }
  }

  if (loading) {
    return <p className="text-muted small">Cargando detalle…</p>
  }

  if (notFound) {
    return <p className="text-muted small">Ticket no encontrado o sin acceso.</p>
  }

  if (error || !detalle) {
    return <p className="text-muted small">{error ?? 'No se pudo cargar el ticket.'}</p>
  }

  return (
    <div className="space-y-3">
      <div>
        <h2 className="h5 mb-2 break-words">{detalle.titulo}</h2>
        <EstadoTicketBadge estado={detalle.estado} />
        <p className="small text-muted mt-2 mb-0">
          Prioridad: {detalle.prioridad}
          {detalle.categoria ? ` · ${detalle.categoria}` : ''}
        </p>
        <p className="small text-muted tabular-nums">
          Creado: {new Date(detalle.fechaCreacion).toLocaleString()}
          {detalle.fechaCierre
            ? ` · Cierre: ${new Date(detalle.fechaCierre).toLocaleString()}`
            : ''}
        </p>
      </div>

      <div>
        <p className="cq-label mb-1">Descripción</p>
        <p className="small mb-0 whitespace-pre-wrap break-words">{detalle.descripcion}</p>
      </div>

      {showAdminActions}

      <div>
        <p className="cq-label mb-2">Comentarios</p>
        {loadingComments && <p className="small text-muted">Cargando comentarios…</p>}
        {!loadingComments && items.length === 0 && (
          <p className="small text-muted">Aún no hay comentarios.</p>
        )}
        <ul className="list-unstyled mb-3">
          {items.map((c) => (
            <li key={c.comentarioTicketId} className="mb-2 border-bottom pb-2">
              <p className="small mb-1 break-words">{c.comentario}</p>
              <p className="small text-muted mb-0">
                {c.autorNombre} · {new Date(c.fechaComentario).toLocaleString()}
                {c.esInterno ? ' · Interno' : ''}
              </p>
            </li>
          ))}
        </ul>

        <label className="cq-label" htmlFor={`comentario-${ticketId}`}>
          Nuevo comentario
        </label>
        <textarea
          id={`comentario-${ticketId}`}
          className="form-control form-control-sm mb-2"
          rows={3}
          maxLength={2000}
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
        />
        {isAdmin && (
          <label className="form-check small mb-2">
            <input
              type="checkbox"
              className="form-check-input me-1"
              checked={esInterno}
              onChange={(e) => setEsInterno(e.target.checked)}
            />
            Comentario interno (solo administración)
          </label>
        )}
        <button
          type="button"
          className="btn btn-sm btn-primary w-100 cursor-pointer"
          disabled={posting || !texto.trim()}
          onClick={() => void enviar()}
        >
          Publicar
        </button>
      </div>
    </div>
  )
}

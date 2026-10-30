type Props = {
  montoMora: string
  onMontoMoraChange: (value: string) => void
  onAplicar: () => void
  onCondonar: () => void
  disabled?: boolean
  mesFiltro: string
  anioFiltro: string
  selectedCount: number
  morasAplicadasEnSeleccion: number
}

export function MorososMorasPanel({
  montoMora,
  onMontoMoraChange,
  onAplicar,
  onCondonar,
  disabled,
  mesFiltro,
  anioFiltro,
  selectedCount,
  morasAplicadasEnSeleccion,
}: Props) {
  const filtroLabel =
    Number(mesFiltro) > 0 && Number(anioFiltro) > 0
      ? `período ${mesFiltro}/${anioFiltro}`
      : 'todos los períodos vencidos'

  return (
    <div className="card mb-3 border-warning cq-moras-panel">
      <div className="card-body py-3">
        <h2 className="h6 mb-1">
          <i className="mdi mdi-cash-multiple me-1 text-warning" aria-hidden="true" />
          Moras por atraso
        </h2>
        <p className="text-muted small mb-3 mb-md-2">
          Marca morosos en la tabla (o «Seleccionar todos los visibles»). Aplica o condona solo en los
          elegidos y cuotas vencidas del filtro ({filtroLabel}).
        </p>
        <p className="small mb-2">
          <strong>{selectedCount}</strong> moroso{selectedCount !== 1 ? 's' : ''} seleccionado
          {selectedCount !== 1 ? 's' : ''}
          {selectedCount > 0 && morasAplicadasEnSeleccion > 0 && (
            <span className="text-muted">
              {' '}
              · en la selección hay <strong>{morasAplicadasEnSeleccion}</strong> mora
              {morasAplicadasEnSeleccion !== 1 ? 's' : ''} ya aplicada
              {morasAplicadasEnSeleccion !== 1 ? 's' : ''}
            </span>
          )}
        </p>
        <div className="d-flex flex-column flex-md-row flex-wrap align-items-md-center gap-2">
          <label className="d-flex align-items-center gap-2 mb-0 small">
            Monto mora (MXN)
            <input
              type="number"
              className="form-control form-control-sm"
              style={{ width: '7rem' }}
              value={montoMora}
              onChange={(e) => onMontoMoraChange(e.target.value)}
              aria-label="Monto mora en pesos"
              min={0}
              step="0.01"
            />
          </label>
          <button
            type="button"
            className="btn btn-sm btn-warning text-dark"
            disabled={disabled || selectedCount === 0}
            onClick={onAplicar}
          >
            <i className="mdi mdi-plus-circle-outline me-1" aria-hidden="true" />
            Aplicar mora a seleccionados
          </button>
          <button
            type="button"
            className="btn btn-sm btn-outline-danger"
            disabled={disabled || selectedCount === 0}
            onClick={onCondonar}
          >
            <i className="mdi mdi-backspace-outline me-1" aria-hidden="true" />
            Condonar moras
          </button>
        </div>
      </div>
    </div>
  )
}

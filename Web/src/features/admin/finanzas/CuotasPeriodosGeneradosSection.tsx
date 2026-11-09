import type { PeriodoCuotasGenerado } from '../../../shared/types/finanzasAdmin'

function formatPeriodo(p: PeriodoCuotasGenerado) {
  return new Date(p.periodoInicio).toLocaleDateString('es-MX', { month: 'long', year: 'numeric' })
}

type Props = {
  periodos: PeriodoCuotasGenerado[]
  loading: boolean
}

export function CuotasPeriodosGeneradosSection({ periodos, loading }: Props) {
  return (
    <div className="card mt-3">
      <div className="card-body pt-3">
        <h2 className="h6 mb-1">Períodos ya generados</h2>
        <p className="text-muted small mb-3">
          Consulta aquí antes de generar de nuevo: si el mes/año ya está, el API omitirá casas duplicadas.
        </p>
        {loading && <p className="text-muted mb-0">Cargando historial…</p>}
        {!loading && periodos.length === 0 && (
          <p className="text-muted mb-0">Aún no hay cuotas generadas en la base de datos.</p>
        )}
        {!loading && periodos.length > 0 && (
          <div className="table-responsive">
            <table className="table table-sm table-hover mb-0">
              <thead>
                <tr>
                  <th>Período</th>
                  <th className="text-end">Cuotas</th>
                  <th className="text-end">Casas</th>
                  <th className="text-end">Monto</th>
                  <th>Vencimiento</th>
                  <th>Cuenta</th>
                  <th>Generado</th>
                </tr>
              </thead>
              <tbody>
                {periodos.map((p) => (
                  <tr key={p.periodoInicio}>
                    <td className="font-weight-bold text-capitalize">{formatPeriodo(p)}</td>
                    <td className="tabular-nums text-end">{p.cuotasGeneradas}</td>
                    <td className="tabular-nums text-end">{p.casas}</td>
                    <td className="tabular-nums text-end">
                      {p.montoUnitario.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="tabular-nums text-nowrap">
                      {new Date(p.fechaVencimiento).toLocaleDateString('es-MX')}
                    </td>
                    <td className="min-w-0 text-break">{p.cuentaNombre ?? '—'}</td>
                    <td className="tabular-nums text-nowrap small text-muted">
                      {new Date(p.generadoEn).toLocaleString('es-MX')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}

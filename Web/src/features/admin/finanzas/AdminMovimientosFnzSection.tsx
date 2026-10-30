import { zodResolver } from '@hookform/resolvers/zod'
import { useMemo } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { apiPost } from '../../../shared/lib/apiClient'
import { useToast } from '../../../shared/toast/ToastContext'
import type { CuentaFnzCatalogo, MovimientoFnz, TipoMovimientoFnz } from '../../../shared/types/finanzasAdmin'

const schema = z.object({
  cuentaId: z.string().min(1, 'Selecciona cuenta'),
  tipoMovimiento: z.string().min(1, 'Selecciona tipo'),
  monto: z.number().positive('Monto mayor a cero'),
  motivo: z.string().trim().min(1, 'Motivo requerido').max(500),
})

type Form = z.infer<typeof schema>

type Props = {
  cuentas: CuentaFnzCatalogo[]
  tipos: TipoMovimientoFnz[]
  movimientos: MovimientoFnz[]
  loading: boolean
  saving: boolean
  onSavingChange: (v: boolean) => void
  onReload: () => Promise<void>
}

export function AdminMovimientosFnzSection({
  cuentas,
  tipos,
  movimientos,
  loading,
  saving,
  onSavingChange,
  onReload,
}: Props) {
  const toast = useToast()
  const tiposConMonto = useMemo(() => tipos.filter((t) => t.bCargo || t.bAbono), [tipos])

  const form = useForm<Form>({
    resolver: zodResolver(schema),
    defaultValues: { cuentaId: '', tipoMovimiento: 'Gasto', monto: 0, motivo: '' },
  })

  const onSubmit = form.handleSubmit(async (values) => {
    onSavingChange(true)
    const { status, problem } = await apiPost<MovimientoFnz>('/FNZ/Transacciones/admin', {
      cuentaId: Number(values.cuentaId),
      tipoMovimiento: values.tipoMovimiento,
      monto: values.monto,
      motivo: values.motivo,
    })
    onSavingChange(false)
    if (status !== 201) {
      toast.error(problem?.detail ?? `Error ${status}`)
      return
    }
    toast.success('Movimiento registrado')
    form.reset({ cuentaId: values.cuentaId, tipoMovimiento: values.tipoMovimiento, monto: 0, motivo: '' })
    await onReload()
  })

  return (
    <>
      <div className="card">
        <div className="card-body pt-3">
          <h2 className="h5 mb-1">Movimientos contables</h2>
          <p className="text-muted small mb-3">
            Registra egresos (ej. compra de banca, pala) o ingresos. El tipo «Gasto» resta saldo; un tipo solo abono
            suma. Configura tipos en «Tipos de movimiento».
          </p>
          <form className="border rounded p-3 bg-light mb-0" onSubmit={(e) => void onSubmit(e)}>
            <div className="row g-3">
              <div className="col-md-6 col-lg-3">
                <label className="cq-label" htmlFor="mov-cuenta">
                  Cuenta
                </label>
                <select id="mov-cuenta" className="form-control form-control-sm" {...form.register('cuentaId')}>
                  <option value="">Selecciona…</option>
                  {cuentas.map((c) => (
                    <option key={c.cuentaId} value={String(c.cuentaId)}>
                      {c.nombre}
                    </option>
                  ))}
                </select>
              </div>
              <div className="col-md-6 col-lg-3">
                <label className="cq-label" htmlFor="mov-tipo">
                  Tipo
                </label>
                <select id="mov-tipo" className="form-control form-control-sm" {...form.register('tipoMovimiento')}>
                  {tiposConMonto.map((t) => (
                    <option key={t.tipoMovimientoId} value={t.tipoMovimiento}>
                      {t.tipoMovimiento} {t.bCargo ? '(egreso)' : ''}
                      {t.bAbono && !t.bCargo ? '(ingreso)' : ''}
                    </option>
                  ))}
                </select>
              </div>
              <div className="col-md-6 col-lg-2">
                <label className="cq-label" htmlFor="mov-monto">
                  Monto
                </label>
                <input
                  id="mov-monto"
                  type="number"
                  step="0.01"
                  className="form-control form-control-sm"
                  {...form.register('monto', { valueAsNumber: true })}
                />
              </div>
              <div className="col-md-6 col-lg-4">
                <label className="cq-label" htmlFor="mov-motivo">
                  Motivo
                </label>
                <input id="mov-motivo" className="form-control form-control-sm" {...form.register('motivo')} />
              </div>
            </div>
            <button type="submit" className="btn btn-primary btn-sm mt-3" disabled={saving}>
              {saving ? 'Guardando…' : 'Registrar movimiento'}
            </button>
          </form>
        </div>
      </div>

      <div className="card mt-3">
        <div className="card-body pt-3">
          <h2 className="h6 mb-3">Registro de movimientos</h2>
          {loading && <p className="text-muted">Cargando…</p>}
          {!loading && movimientos.length === 0 && (
            <p className="text-muted mb-0">Sin movimientos registrados.</p>
          )}
          {!loading && movimientos.length > 0 && (
            <div className="table-responsive">
              <table className="table table-sm table-hover mb-0">
                <thead>
                  <tr>
                    <th>Fecha</th>
                    <th>Cuenta</th>
                    <th>Tipo</th>
                    <th>Motivo</th>
                    <th className="text-end">Cargo</th>
                    <th className="text-end">Abono</th>
                  </tr>
                </thead>
                <tbody>
                  {movimientos.map((m) => (
                    <tr key={m.transaccionId}>
                      <td className="tabular-nums text-nowrap small">
                        {new Date(m.fechaCreacion).toLocaleString('es-MX')}
                      </td>
                      <td>{m.cuentaNombre}</td>
                      <td>{m.tipoMovimiento}</td>
                      <td className="min-w-0 text-break">{m.motivo ?? '—'}</td>
                      <td className="tabular-nums text-end text-danger">
                        {m.cargo != null
                          ? m.cargo.toLocaleString('es-MX', { minimumFractionDigits: 2 })
                          : '—'}
                      </td>
                      <td className="tabular-nums text-end text-success">
                        {m.abono != null
                          ? m.abono.toLocaleString('es-MX', { minimumFractionDigits: 2 })
                          : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </>
  )
}

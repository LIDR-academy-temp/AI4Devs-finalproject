import { zodResolver } from '@hookform/resolvers/zod'
import { useMemo } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { AdminListToolbar } from '../../../shared/components/admin'
import { apiPost } from '../../../shared/lib/apiClient'
import { useToast } from '../../../shared/toast/ToastContext'
import type { CuentaFnzCatalogo, MovimientoFnz, TipoMovimientoFnz } from '../../../shared/types/finanzasAdmin'
import { MovimientosAdminTable } from './MovimientosAdminTable'

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
  const metrics = useMemo(
    () => [{ label: 'Movimientos', value: movimientos.length }],
    [movimientos.length],
  )

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
      <AdminListToolbar title="Registrar movimiento" metrics={[]} />
      <div className="card cq-admin-card mb-3">
        <div className="card-body pt-3">
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

      <AdminListToolbar title="Registro de movimientos" metrics={metrics} />
      <div className="card cq-admin-card">
        <div className="card-body pt-3">
          {loading && (
            <div className="placeholder-glow" aria-label="Cargando movimientos">
              <span className="placeholder col-12 mb-2" />
            </div>
          )}
          {!loading && movimientos.length === 0 && (
            <div className="cq-empty-state">
              <i className="mdi mdi-swap-horizontal cq-empty-icon" aria-hidden="true" />
              <p className="cq-empty-title">Sin movimientos</p>
              <p className="text-muted mb-0">Registra el primer movimiento con el formulario de arriba.</p>
            </div>
          )}
          {!loading && movimientos.length > 0 && <MovimientosAdminTable movimientos={movimientos} />}
        </div>
      </div>
    </>
  )
}

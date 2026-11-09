import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { generarCuotasSchema, type GenerarCuotasForm, type GenerarCuotasFormInput } from './finanzasAdminSchemas'
import type { CuentaFnzCatalogo } from '../../../shared/types/finanzasAdmin'

type Props = {
  cuentas: CuentaFnzCatalogo[]
  cuentasLoading?: boolean
  onSubmit: (data: GenerarCuotasForm) => void
  saving: boolean
  result: { creadas: number; omitidas: number } | null
  error: string | null
}

export function GenerarCuotasForm({
  cuentas,
  cuentasLoading,
  onSubmit,
  saving,
  result,
  error,
}: Props) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<GenerarCuotasFormInput, unknown, GenerarCuotasForm>({
    resolver: zodResolver(generarCuotasSchema),
    defaultValues: {
      mes: new Date().getMonth() + 1,
      anio: new Date().getFullYear(),
      monto: 1200,
      fechaVencimiento: '',
      cuentaId: '',
    },
  })

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <div className="row g-3">
        <div className="col-sm-6 col-md-3">
          <label className="cq-label" htmlFor="gen-mes">
            Mes
          </label>
          <input
            id="gen-mes"
            type="number"
            className="form-control"
            {...register('mes', { valueAsNumber: true })}
          />
          {errors.mes && <div className="text-danger small mt-1">{errors.mes.message}</div>}
        </div>
        <div className="col-sm-6 col-md-3">
          <label className="cq-label" htmlFor="gen-anio">
            Año
          </label>
          <input
            id="gen-anio"
            type="number"
            className="form-control"
            {...register('anio', { valueAsNumber: true })}
          />
          {errors.anio && <div className="text-danger small mt-1">{errors.anio.message}</div>}
        </div>
        <div className="col-sm-6 col-md-3">
          <label className="cq-label" htmlFor="gen-monto">
            Monto por cuota
          </label>
          <input
            id="gen-monto"
            type="number"
            step="0.01"
            className="form-control"
            {...register('monto', { valueAsNumber: true })}
          />
          {errors.monto && <div className="text-danger small mt-1">{errors.monto.message}</div>}
        </div>
        <div className="col-sm-6 col-md-3">
          <label className="cq-label" htmlFor="gen-vencimiento">
            Fecha de vencimiento
          </label>
          <input id="gen-vencimiento" type="date" className="form-control" {...register('fechaVencimiento')} />
          {errors.fechaVencimiento && (
            <div className="text-danger small mt-1">{errors.fechaVencimiento.message}</div>
          )}
        </div>
        <div className="col-12 col-md-6">
          <label className="cq-label" htmlFor="gen-cuenta">
            Cuenta contable (opcional)
          </label>
          <select
            id="gen-cuenta"
            className="form-control"
            disabled={cuentasLoading}
            {...register('cuentaId')}
          >
            <option value="">Sin cuenta</option>
            {cuentas.map((c) => (
              <option key={c.cuentaId} value={String(c.cuentaId)}>
                {c.nombre} (ID {c.cuentaId})
              </option>
            ))}
          </select>
          <p className="text-muted small mt-1 mb-0">
            Si la BD no tiene cuentas, ejecuta el seed DB-002 o deja «Sin cuenta».
          </p>
        </div>
      </div>
      {error && (
        <p className="text-danger small mt-3 mb-0" role="alert">
          {error}
        </p>
      )}
      {result && (
        <p
          className={`small mt-3 mb-0 ${result.creadas > 0 ? 'text-success' : 'text-warning'}`}
          role="status"
        >
          Creadas: {result.creadas} · Omitidas: {result.omitidas}
          {result.creadas === 0 && result.omitidas > 0 && (
            <>
              {' '}
              — Revisa que el mes no esté ya generado o que cada casa tenga ocupante vigente o propietario.
            </>
          )}
        </p>
      )}
      <button type="submit" disabled={saving} className="btn btn-primary mt-3">
        <i className="mdi mdi-calendar-plus mr-1" aria-hidden="true" />
        {saving ? 'Generando…' : 'Generar cuotas del período'}
      </button>
    </form>
  )
}

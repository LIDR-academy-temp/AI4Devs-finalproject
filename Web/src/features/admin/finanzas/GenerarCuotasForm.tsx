import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { generarCuotasSchema, type GenerarCuotasForm } from './finanzasAdminSchemas'

type Props = {
  onSubmit: (data: GenerarCuotasForm) => void
  saving: boolean
  result: { creadas: number; omitidas: number } | null
  error: string | null
}

export function GenerarCuotasForm({ onSubmit, saving, result, error }: Props) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<GenerarCuotasForm>({
    resolver: zodResolver(generarCuotasSchema),
    defaultValues: {
      mes: new Date().getMonth() + 1,
      anio: new Date().getFullYear(),
      monto: 1200,
      fechaVencimiento: '',
    },
  })

  return (
    <form className="max-w-md space-y-3" onSubmit={handleSubmit(onSubmit)}>
      <div className="grid grid-cols-2 gap-2">
        <label className="text-sm">
          Mes
          <input
            type="number"
            className="mt-1 w-full rounded border px-2 py-1"
            {...register('mes', { valueAsNumber: true })}
          />
          {errors.mes && <span className="text-xs text-danger">{errors.mes.message}</span>}
        </label>
        <label className="text-sm">
          Año
          <input
            type="number"
            className="mt-1 w-full rounded border px-2 py-1"
            {...register('anio', { valueAsNumber: true })}
          />
          {errors.anio && <span className="text-xs text-danger">{errors.anio.message}</span>}
        </label>
      </div>
      <label className="block text-sm">
        Monto por cuota
        <input
          type="number"
          step="0.01"
          className="mt-1 w-full rounded border px-2 py-1"
          {...register('monto', { valueAsNumber: true })}
        />
        {errors.monto && <span className="text-xs text-danger">{errors.monto.message}</span>}
      </label>
      <label className="block text-sm">
        Fecha de vencimiento
        <input type="date" className="mt-1 w-full rounded border px-2 py-1" {...register('fechaVencimiento')} />
        {errors.fechaVencimiento && (
          <span className="text-xs text-danger">{errors.fechaVencimiento.message}</span>
        )}
      </label>
      <label className="block text-sm">
        Cuenta ID (opcional)
        <input
          type="number"
          className="mt-1 w-full rounded border px-2 py-1"
          {...register('cuentaId', { valueAsNumber: true })}
        />
      </label>
      {error && <p className="text-sm text-danger">{error}</p>}
      {result && (
        <p className="text-sm text-success">
          Creadas: {result.creadas} · Omitidas: {result.omitidas}
        </p>
      )}
      <button
        type="submit"
        disabled={saving}
        className="rounded bg-primary px-4 py-2 text-sm text-white disabled:opacity-50"
      >
        {saving ? 'Generando…' : 'Generar cuotas del período'}
      </button>
    </form>
  )
}

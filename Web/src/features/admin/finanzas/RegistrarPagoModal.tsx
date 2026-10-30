import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import type { CuotaEstado } from '../../../shared/types/finanzas'
import { cuotaMontoTotal } from './cuotaMontoUtils'
import { registrarPagoSchema, type RegistrarPagoForm } from './finanzasAdminSchemas'

type Props = {
  cuota: CuotaEstado
  open: boolean
  saving: boolean
  error: string | null
  onClose: () => void
  onSubmit: (data: RegistrarPagoForm) => void
}

export function RegistrarPagoModal({ cuota, open, saving, error, onClose, onSubmit }: Props) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RegistrarPagoForm>({
    resolver: zodResolver(registrarPagoSchema),
    defaultValues: {
      montoPagado: cuotaMontoTotal(cuota),
      fechaPago: new Date().toISOString().slice(0, 10),
      metodoPago: 'Transferencia',
      referenciaPago: '',
    },
  })

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      role="presentation"
      onClick={onClose}
    >
      <div
        className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-lg bg-white p-4 shadow-lg"
        role="dialog"
        aria-modal="true"
        aria-labelledby="registrar-pago-title"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id="registrar-pago-title" className="text-lg font-semibold text-primary-dark">
          Registrar pago
        </h2>
        <p className="text-sm text-neutral">Cuota #{cuota.cuotaId}</p>

        <form className="mt-4 space-y-3" onSubmit={handleSubmit(onSubmit)}>
          <label className="block text-sm">
            Monto (MXN)
            <input
              type="number"
              readOnly
              className="mt-1 w-full rounded border bg-surface px-2 py-1"
              {...register('montoPagado', { valueAsNumber: true })}
            />
          </label>
          <label className="block text-sm">
            Fecha de pago
            <input type="date" className="mt-1 w-full rounded border px-2 py-1" {...register('fechaPago')} />
            {errors.fechaPago && (
              <span className="text-xs text-danger">{errors.fechaPago.message}</span>
            )}
          </label>
          <label className="block text-sm">
            Método
            <input type="text" className="mt-1 w-full rounded border px-2 py-1" {...register('metodoPago')} />
          </label>
          <label className="block text-sm">
            Referencia
            <input type="text" className="mt-1 w-full rounded border px-2 py-1" {...register('referenciaPago')} />
            {errors.referenciaPago && (
              <span className="text-xs text-danger">{errors.referenciaPago.message}</span>
            )}
          </label>

          {error && <p className="break-words text-sm text-danger">{error}</p>}

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              className="cursor-pointer rounded border border-neutral-200 px-3 py-1 text-sm hover:bg-surface"
              onClick={onClose}
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving}
              className="cursor-pointer rounded bg-primary px-3 py-1 text-sm text-white hover:bg-primary-dark disabled:cursor-not-allowed disabled:opacity-50"
            >
              {saving ? 'Guardando…' : 'Registrar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

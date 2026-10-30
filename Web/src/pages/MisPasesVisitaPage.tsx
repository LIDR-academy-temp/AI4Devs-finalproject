import { zodResolver } from '@hookform/resolvers/zod'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { PaseQrCard } from '../features/visitas/PaseQrCard'
import { buildCrearPaseBody, paseFormSchema, type PaseFormInput, type PaseFormValues } from '../features/visitas/visitasPaseSchemas'
import { PaseVigenciaFields } from '../features/visitas/PaseVigenciaFields'
import { crearPase, useMisPases } from '../features/visitas/useVisitasPase'
import { PageHeader } from '../shared/components/admin'
import { useQueryErrorToast } from '../shared/hooks/useQueryErrorToast'
import { useToast } from '../shared/toast/ToastContext'
import type { PaseVisita } from '../shared/types/visitasPase'

function estadoBadge(estado: string) {
  const clases: Record<string, string> = {
    vigente: 'bg-success-light text-success',
    expirado: 'bg-warning-light text-warning',
    usado: 'bg-neutral-200 text-neutral-700',
    pendiente: 'bg-info-light text-info',
  }
  const labels: Record<string, string> = {
    vigente: 'Vigente',
    expirado: 'Expirado',
    usado: 'Usado',
    pendiente: 'Programado',
  }
  return (
    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${clases[estado] ?? 'bg-surface-alt text-neutral-700'}`}>
      {labels[estado] ?? estado}
    </span>
  )
}

export function MisPasesVisitaPage() {
  const { pases, loading, error, refetch } = useMisPases()
  const [ultimoPase, setUltimoPase] = useState<PaseVisita | null>(null)
  const [selectedPase, setSelectedPase] = useState<PaseVisita | null>(null)
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const toast = useToast()
  useQueryErrorToast(error)

  const defaultInicio = () => {
    const d = new Date()
    d.setMinutes(d.getMinutes() - d.getTimezoneOffset())
    return d.toISOString().slice(0, 16)
  }
  const defaultFin = () => {
    const d = new Date(Date.now() + 2 * 60 * 60 * 1000)
    d.setMinutes(d.getMinutes() - d.getTimezoneOffset())
    return d.toISOString().slice(0, 16)
  }


  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<PaseFormInput, unknown, PaseFormValues>({
    resolver: zodResolver(paseFormSchema),
    defaultValues: {
      nombreVisitante: '',
      tipoVisita: 'unaOcasion',
      modoVigencia: 'horas',
      fechaInicio: defaultInicio(),
      fechaFin: defaultFin(),
    },
  })

  const onSubmit = handleSubmit(async (values) => {
    setSaving(true)
    setFormError(null)
    const body = buildCrearPaseBody(values)
    const { status, data, problem } = await crearPase(body)
    setSaving(false)
    if (status === 201 && data) {
      setUltimoPase(data)
      setSelectedPase(data)
      toast.success('Pase creado correctamente.')
      void refetch()
      return
    }
    setFormError(problem?.detail ?? 'No se pudo crear el pase.')
  })

  return (
    <main className="mx-auto max-w-3xl space-y-8 px-4 py-6">
      <PageHeader title="Pases de visita" description="Genera un código QR para tus visitantes y compártelo por WhatsApp." />

      <section className="rounded-xl border border-neutral-200 bg-surface p-4">
        <h2 className="mb-4 text-lg font-semibold text-neutral-800">Nuevo pase</h2>
        <form className="space-y-4" onSubmit={onSubmit} noValidate>
          <div>
            <label className="mb-1 block text-sm font-medium text-neutral-700" htmlFor="nombreVisitante">
              Nombre del visitante
            </label>
            <input
              id="nombreVisitante"
              className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm"
              {...register('nombreVisitante')}
            />
            {errors.nombreVisitante && (
              <p className="mt-1 text-sm text-danger">{errors.nombreVisitante.message}</p>
            )}
          </div>

          <PaseVigenciaFields register={register} watch={watch} errors={errors} idPrefix="mis-pase" />

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium text-neutral-700" htmlFor="tipoIdentificacionId">
                Tipo ID (opcional)
              </label>
              <input
                id="tipoIdentificacionId"
                type="number"
                min={1}
                className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm"
                {...register('tipoIdentificacionId')}
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-neutral-700" htmlFor="numeroIdentificacion">
                Número ID (opcional)
              </label>
              <input
                id="numeroIdentificacion"
                className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm"
                {...register('numeroIdentificacion')}
              />
            </div>
          </div>

          {formError && (
            <p className="text-sm text-danger" role="alert">
              {formError}
            </p>
          )}

          <button
            type="submit"
            disabled={saving}
            className="cursor-pointer rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {saving ? 'Generando…' : 'Generar pase QR'}
          </button>
        </form>
      </section>

      <section>
        <h2 className="mb-3 text-lg font-semibold text-neutral-800">Mis pases</h2>
        {loading ? (
          <div className="h-24 animate-pulse rounded-lg bg-neutral-100" aria-label="Cargando pases" />
        ) : pases.length === 0 ? (
          <p className="text-neutral-600">Aún no tienes pases registrados.</p>
        ) : (
          <ul className="space-y-3">
            {pases.map((p) => (
              <li
                key={p.visitaGeneradaId}
                role="button"
                tabIndex={0}
                onClick={() => setSelectedPase(p)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') setSelectedPase(p)
                }}
                className={`flex min-w-0 cursor-pointer flex-wrap items-center justify-between gap-2 rounded-lg border px-3 py-2 ${
                  selectedPase?.visitaGeneradaId === p.visitaGeneradaId
                    ? 'border-primary bg-primary/5'
                    : 'border-neutral-200'
                }`}
              >
                <div className="min-w-0">
                  <p className="truncate font-medium text-neutral-800">{p.nombreVisitante}</p>
                  <p className="truncate font-mono text-xs text-neutral-500">{p.codigoQr}</p>
                </div>
                {estadoBadge(p.estadoLista)}
              </li>
            ))}
          </ul>
        )}
        {(selectedPase ?? ultimoPase) && (
          <div className="mt-6 border-t border-neutral-200 pt-6">
            <h3 className="mb-3 text-base font-semibold text-neutral-800">Compartir pase</h3>
            <PaseQrCard pase={selectedPase ?? ultimoPase!} />
          </div>
        )}
      </section>
    </main>
  )
}

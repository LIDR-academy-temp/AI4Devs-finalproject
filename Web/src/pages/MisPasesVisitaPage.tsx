import { zodResolver } from '@hookform/resolvers/zod'
import { QrCode } from 'lucide-react'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { PaseQrCard } from '../features/visitas/PaseQrCard'
import {
  buildCrearPaseBody,
  paseFormSchema,
  vigenciaPaseTexto,
  type PaseFormInput,
  type PaseFormValues,
} from '../features/visitas/visitasPaseSchemas'
import { PaseVigenciaFields } from '../features/visitas/PaseVigenciaFields'
import { useTiposIdentificacionVisitas } from '../features/admin/visitas/useTiposIdentificacionVisitas'
import { crearPase, useMisPases } from '../features/visitas/useVisitasPase'
import {
  EmptyState,
  PageHeader,
  PortalEntityMeta,
  PortalEntityTitle,
  PortalListSection,
  PortalPageLayout,
  PortalRowList,
  PortalRowListItem,
  PortalSection,
} from '../shared/components/admin'
import { useQueryErrorToast } from '../shared/hooks/useQueryErrorToast'
import { useToast } from '../shared/toast/ToastContext'
import type { PaseVisita } from '../shared/types/visitasPase'

function estadoBadge(estado: string) {
  const clases: Record<string, string> = {
    vigente: 'bg-success-light text-success border border-success/30',
    expirado: 'bg-warning-light text-warning border border-warning/40',
    usado: 'bg-neutral-100 text-neutral-700 border border-neutral-200',
    pendiente: 'bg-primary-light text-primary-dark border border-primary/25',
  }
  const labels: Record<string, string> = {
    vigente: 'Vigente',
    expirado: 'Expirado',
    usado: 'Usado',
    pendiente: 'Programado',
  }
  return (
    <span className={`cq-portal-badge shrink-0 ${clases[estado] ?? 'bg-surface-alt text-neutral-700'}`}>
      {labels[estado] ?? estado}
    </span>
  )
}

function codigoCorto(codigo: string) {
  if (codigo.length <= 10) return codigo
  return `…${codigo.slice(-8)}`
}

export function MisPasesVisitaPage() {
  const { pases, loading, error, refetch } = useMisPases()
  const { tipos, loading: tiposLoading } = useTiposIdentificacionVisitas()
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

  const paseActivo = selectedPase ?? ultimoPase

  return (
    <PortalPageLayout width="4xl" className="flex flex-col gap-6">
      <PageHeader
        bordered
        title="Pases de visita"
        description="Crea un QR para tu visitante, selecciónalo en la lista y compártelo por WhatsApp o correo."
      />

      <div className="cq-portal-pase-layout">
        <PortalSection variant="padded" title="Nuevo pase">
          <form className="cq-portal-form" onSubmit={onSubmit} noValidate>
            <div>
              <label htmlFor="nombreVisitante">Nombre del visitante</label>
              <input id="nombreVisitante" placeholder="Ej. Juan Pérez" {...register('nombreVisitante')} />
              {errors.nombreVisitante && (
                <p className="mt-1 text-sm text-danger">{errors.nombreVisitante.message}</p>
              )}
            </div>

            <PaseVigenciaFields register={register} watch={watch} errors={errors} idPrefix="mis-pase" />

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="tipoIdentificacionId">Tipo ID (opcional)</label>
                <select
                  id="tipoIdentificacionId"
                  {...register('tipoIdentificacionId', { valueAsNumber: true })}
                  disabled={tiposLoading || tipos.length === 0}
                >
                  <option value="">Sin especificar</option>
                  {tipos.map((t) => (
                    <option key={t.tipoIdentificacionId} value={t.tipoIdentificacionId}>
                      {t.tipoIdentificacion}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="numeroIdentificacion">Número ID (opcional)</label>
                <input id="numeroIdentificacion" {...register('numeroIdentificacion')} />
              </div>
            </div>

            {formError && (
              <p className="text-sm text-danger" role="alert">
                {formError}
              </p>
            )}

            <button type="submit" disabled={saving} className="cq-portal-btn-primary w-full sm:w-auto disabled:opacity-50">
              {saving ? 'Generando…' : 'Generar pase QR'}
            </button>
          </form>
        </PortalSection>

        <div className="cq-portal-pase-side">
          <PortalListSection title="Mis pases">
            {loading ? (
              <p className="cq-portal-section--padded text-sm text-neutral">Cargando pases…</p>
            ) : pases.length === 0 ? (
              <div className="cq-portal-section--padded">
                <EmptyState
                  title="Sin pases aún"
                  description="Completa el formulario y genera tu primer código QR."
                />
              </div>
            ) : (
              <PortalRowList>
                {pases.map((p) => {
                  const selected = selectedPase?.visitaGeneradaId === p.visitaGeneradaId
                  return (
                    <PortalRowListItem
                      key={p.visitaGeneradaId}
                      role="button"
                      tabIndex={0}
                      aria-pressed={selected}
                      onClick={() => setSelectedPase(p)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') setSelectedPase(p)
                      }}
                      className={`flex min-w-0 cursor-pointer items-start justify-between gap-3${
                        selected ? ' cq-portal-row-list__item--selected' : ''
                      }`}
                    >
                      <div className="flex min-w-0 flex-1 gap-3">
                        <span className="cq-portal-entity-icon !text-base" aria-hidden>
                          <QrCode className="h-5 w-5" />
                        </span>
                        <div className="min-w-0">
                          <PortalEntityTitle>{p.nombreVisitante}</PortalEntityTitle>
                          <PortalEntityMeta>{vigenciaPaseTexto(p)}</PortalEntityMeta>
                          <p className="mt-1 font-mono text-[0.6875rem] text-neutral-400">{codigoCorto(p.codigoQr)}</p>
                        </div>
                      </div>
                      {estadoBadge(p.estadoLista)}
                    </PortalRowListItem>
                  )
                })}
              </PortalRowList>
            )}

            {paseActivo && (
              <div className="cq-portal-pase-qr-panel">
                <div className="cq-portal-section--padded">
                  <h3 className="mb-3 text-base font-semibold text-neutral-800">Compartir pase seleccionado</h3>
                  <PaseQrCard pase={paseActivo} />
                </div>
              </div>
            )}
          </PortalListSection>
        </div>
      </div>
    </PortalPageLayout>
  )
}

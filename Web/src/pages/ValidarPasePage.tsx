import { useState } from 'react'
import { ScanLine } from 'lucide-react'
import { PaseQrCard } from '../features/visitas/PaseQrCard'
import { usarPase, validarPase } from '../features/visitas/useVisitasPase'
import { PageHeader, PortalPageLayout, PortalSection } from '../shared/components/admin'
import { useToast } from '../shared/toast/ToastContext'
import type { PaseVisita, ValidarPaseResponse } from '../shared/types/visitasPase'

const ESTADO_UI: Record<string, { label: string; className: string }> = {
  Valido: { label: 'Válido', className: 'bg-success-light text-success border border-success/25' },
  Expirado: { label: 'Expirado', className: 'bg-warning-light text-warning border border-warning/25' },
  Usado: { label: 'Ya usado', className: 'bg-neutral-100 text-neutral-700 border border-neutral-200' },
  NoEncontrado: { label: 'No encontrado', className: 'bg-danger-light text-danger border border-danger/25' },
  NoVigente: { label: 'Aún no vigente', className: 'bg-primary/10 text-primary border border-primary/20' },
}

export function ValidarPasePage() {
  const [codigo, setCodigo] = useState('')
  const [resultado, setResultado] = useState<ValidarPaseResponse | null>(null)
  const [loading, setLoading] = useState(false)
  const [usando, setUsando] = useState(false)
  const toast = useToast()

  const validar = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setResultado(null)
    const { data, problem, status } = await validarPase(codigo.trim())
    setLoading(false)
    if (!data) {
      toast.error(problem?.detail ?? `Error ${status}`)
      return
    }
    setResultado(data)
  }

  const registrarEntrada = async (pase: PaseVisita) => {
    setUsando(true)
    const { data, problem, status } = await usarPase(pase.visitaGeneradaId)
    setUsando(false)
    if (!data?.ok) {
      toast.error(problem?.detail ?? `Error ${status}`)
      return
    }
    toast.success(
      data.yaUsado
        ? 'El pase ya estaba marcado como usado.'
        : data.visitaId
          ? `Entrada registrada en bitácora (visita #${data.visitaId}).`
          : pase.unaOcasion === false
            ? 'Entrada registrada. El pase sigue vigente en el rango.'
            : 'Entrada registrada.',
    )
    if (data.pase) {
      if (data.yaUsado || data.pase.unaOcasion !== false) {
        setResultado({ estado: 'Usado', detalle: 'Este pase ya fue utilizado.', pase: data.pase })
      } else {
        setResultado({
          estado: 'Valido',
          detalle: 'Entrada registrada. El pase sigue vigente en el rango de fechas.',
          pase: data.pase,
        })
      }
    }
  }

  const ui = resultado ? ESTADO_UI[resultado.estado] ?? ESTADO_UI.NoEncontrado : null

  return (
    <PortalPageLayout width="2xl" className="flex flex-col gap-4">
      <PageHeader
        bordered
        title="Validar pase QR"
        description="Ingresa o pega el código del visitante para validar acceso."
      />

      <PortalSection variant="padded" title="Consulta" titleId="validar-pase-form-heading">
        <form className="cq-portal-form max-w-xl" onSubmit={validar} noValidate>
          <label htmlFor="codigoQr">
            Código QR
            <input
              id="codigoQr"
              value={codigo}
              onChange={(e) => setCodigo(e.target.value)}
              className="font-mono"
              autoComplete="off"
              placeholder="Pega el código del pase"
            />
          </label>
          <button
            type="submit"
            disabled={loading || !codigo.trim()}
            className="cq-portal-btn cq-portal-btn-primary inline-flex items-center gap-2"
          >
            <ScanLine className="h-4 w-4" aria-hidden />
            {loading ? 'Validando…' : 'Validar'}
          </button>
        </form>
      </PortalSection>

      {resultado && ui ? (
        <PortalSection variant="padded" title="Resultado" titleId="validar-pase-result-heading">
          <div className="flex flex-col gap-4" role="status" aria-live="polite">
            <div className="flex flex-wrap items-center gap-2">
              <span className={`cq-portal-badge ${ui.className}`}>{ui.label}</span>
              {resultado.detalle ? <p className="text-sm text-neutral-800">{resultado.detalle}</p> : null}
            </div>

            {resultado.pase && resultado.estado === 'Valido' ? (
              <>
                <PaseQrCard pase={resultado.pase} />
                <button
                  type="button"
                  disabled={usando}
                  onClick={() => void registrarEntrada(resultado.pase!)}
                  className="cq-portal-btn cq-portal-btn-primary w-full sm:w-auto"
                >
                  {usando ? 'Registrando…' : 'Registrar entrada'}
                </button>
              </>
            ) : null}

            {resultado.pase && resultado.estado !== 'Valido' ? (
              <dl className="cq-portal-stat-block m-0 grid gap-2 text-sm">
                <div>
                  <dt className="cq-portal-stat-block__label">Visitante</dt>
                  <dd className="cq-portal-stat-block__value m-0">{resultado.pase.nombreVisitante}</dd>
                </div>
                <div>
                  <dt className="cq-portal-stat-block__label">Código</dt>
                  <dd className="cq-portal-stat-block__value m-0 break-all font-mono text-base">
                    {resultado.pase.codigoQr}
                  </dd>
                </div>
              </dl>
            ) : null}
          </div>
        </PortalSection>
      ) : null}
    </PortalPageLayout>
  )
}

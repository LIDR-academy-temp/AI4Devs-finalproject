import { useState } from 'react'
import { PaseQrCard } from '../features/visitas/PaseQrCard'
import { usarPase, validarPase } from '../features/visitas/useVisitasPase'
import { PageHeader } from '../shared/components/admin'
import { useToast } from '../shared/toast/ToastContext'
import type { PaseVisita, ValidarPaseResponse } from '../shared/types/visitasPase'

const ESTADO_UI: Record<string, { label: string; className: string }> = {
  Valido: { label: 'Válido', className: 'bg-success-light text-success' },
  Expirado: { label: 'Expirado', className: 'bg-warning-light text-warning' },
  Usado: { label: 'Ya usado', className: 'bg-neutral-200 text-neutral-700' },
  NoEncontrado: { label: 'No encontrado', className: 'bg-danger-light text-danger' },
  NoVigente: { label: 'Aún no vigente', className: 'bg-info-light text-info' },
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
    <main className="mx-auto max-w-2xl space-y-6 px-4 py-6">
      <PageHeader title="Validar pase QR" description="Ingresa o pega el código del visitante." />

      <form onSubmit={validar} className="space-y-3 rounded-xl border border-neutral-200 bg-surface p-4">
        <label htmlFor="codigoQr" className="block text-sm font-medium text-neutral-700">
          Código QR
        </label>
        <input
          id="codigoQr"
          value={codigo}
          onChange={(e) => setCodigo(e.target.value)}
          className="w-full rounded-lg border border-neutral-300 px-3 py-2 font-mono text-sm"
          autoComplete="off"
          placeholder="Pega el código del pase"
        />
        <button
          type="submit"
          disabled={loading || !codigo.trim()}
          className="cursor-pointer rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {loading ? 'Validando…' : 'Validar'}
        </button>
      </form>

      {resultado && ui && (
        <section
          className="space-y-4 rounded-xl border border-neutral-200 bg-surface p-4"
          role="status"
          aria-live="polite"
        >
          <div className="flex flex-wrap items-center gap-2">
            <span className={`rounded-full px-3 py-1 text-sm font-semibold ${ui.className}`}>{ui.label}</span>
            {resultado.detalle && <p className="text-sm text-neutral-700">{resultado.detalle}</p>}
          </div>

          {resultado.pase && resultado.estado === 'Valido' && (
            <>
              <PaseQrCard pase={resultado.pase} />
              <button
                type="button"
                disabled={usando}
                onClick={() => void registrarEntrada(resultado.pase!)}
                className="cursor-pointer rounded-lg bg-success px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50"
              >
                {usando ? 'Registrando…' : 'Registrar entrada'}
              </button>
            </>
          )}

          {resultado.pase && resultado.estado !== 'Valido' && (
            <dl className="grid gap-1 text-sm text-neutral-700">
              <div>
                <dt className="inline font-medium">Visitante: </dt>
                <dd className="inline">{resultado.pase.nombreVisitante}</dd>
              </div>
              <div>
                <dt className="inline font-medium">Código: </dt>
                <dd className="inline break-all font-mono">{resultado.pase.codigoQr}</dd>
              </div>
            </dl>
          )}
        </section>
      )}
    </main>
  )
}

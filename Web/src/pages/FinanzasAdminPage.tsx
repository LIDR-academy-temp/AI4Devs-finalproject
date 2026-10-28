import { useCallback, useState } from 'react'
import { Link } from 'react-router-dom'
import 'bootstrap/dist/css/bootstrap.min.css'
import '@mdi/font/css/materialdesignicons.min.css'
import '../styles/bootstrap-pantone.css'
import '../styles/cq-admin.css'
import { GenerarCuotasForm } from '../features/admin/finanzas/GenerarCuotasForm'
import { MorososTable } from '../features/admin/finanzas/MorososTable'
import { RegistrarPagoModal } from '../features/admin/finanzas/RegistrarPagoModal'
import {
  generarCuotas,
  getCuotasUsuario,
  getMorosos,
  registrarPago,
} from '../features/admin/finanzas/finanzasAdmin.api'
import type { GenerarCuotasForm as GenerarForm } from '../features/admin/finanzas/finanzasAdminSchemas'
import type { RegistrarPagoForm } from '../features/admin/finanzas/finanzasAdminSchemas'
import { useAuth } from '../features/auth/AuthContext'
import { CuotaAdminMobileCard } from '../features/admin/finanzas/CuotaAdminMobileCard'
import { CuotasTable } from '../features/finanzas/CuotasTable'
import { AdminMobileCardList } from '../shared/components/admin'
import { useQueryErrorToast } from '../shared/hooks/useQueryErrorToast'
import { useToast } from '../shared/toast/ToastContext'
import type { CuotaEstado } from '../shared/types/finanzas'
import type { Moroso } from '../shared/types/finanzasAdmin'

type Tab = 'cuotas' | 'morosos' | 'generar'

export function FinanzasAdminPage() {
  const { session } = useAuth()
  const toast = useToast()
  const [tab, setTab] = useState<Tab>('cuotas')
  const [usuarioId, setUsuarioId] = useState('')
  const [cuotas, setCuotas] = useState<CuotaEstado[]>([])
  const [cuotasLoading, setCuotasLoading] = useState(false)
  const [cuotasError, setCuotasError] = useState<string | null>(null)
  const [pagoCuota, setPagoCuota] = useState<CuotaEstado | null>(null)
  const [pagoSaving, setPagoSaving] = useState(false)
  const [pagoError, setPagoError] = useState<string | null>(null)
  const [morosos, setMorosos] = useState<Moroso[]>([])
  const [morososLoading, setMorososLoading] = useState(false)
  const [morososError, setMorososError] = useState<string | null>(null)
  const [mesFiltro, setMesFiltro] = useState(String(new Date().getMonth() + 1))
  const [anioFiltro, setAnioFiltro] = useState(String(new Date().getFullYear()))
  const [genResult, setGenResult] = useState<{ creadas: number; omitidas: number } | null>(null)
  const [genError, setGenError] = useState<string | null>(null)
  const [genSaving, setGenSaving] = useState(false)

  useQueryErrorToast(cuotasError)

  const loadCuotas = useCallback(async () => {
    const id = Number(usuarioId)
    if (!session?.token || !id) return
    setCuotasLoading(true)
    setCuotasError(null)
    const { data, problem, status } = await getCuotasUsuario(session.token, id)
    if (status !== 200 || !data) {
      setCuotas([])
      setCuotasError(problem?.detail ?? 'No se pudieron cargar las cuotas')
    } else {
      setCuotas(data.cuotas)
    }
    setCuotasLoading(false)
  }, [session?.token, usuarioId])

  const loadMorosos = useCallback(async () => {
    if (!session?.token) return
    setMorososLoading(true)
    setMorososError(null)
    const mes = Number(mesFiltro)
    const anio = Number(anioFiltro)
    const { data, problem, status } = await getMorosos(
      session.token,
      mes > 0 && anio > 0 ? mes : undefined,
      mes > 0 && anio > 0 ? anio : undefined,
    )
    if (status !== 200 || !data) {
      setMorosos([])
      setMorososError(problem?.detail ?? 'No se pudo cargar morosos')
    } else {
      setMorosos(data)
    }
    setMorososLoading(false)
  }, [session?.token, mesFiltro, anioFiltro])

  const submitPago = async (form: RegistrarPagoForm) => {
    if (!session?.token || !pagoCuota) return
    setPagoSaving(true)
    setPagoError(null)
    const { status, problem } = await registrarPago(session.token, pagoCuota.cuotaId, {
      montoPagado: form.montoPagado,
      fechaPago: form.fechaPago,
      metodoPago: form.metodoPago,
      referenciaPago: form.referenciaPago,
    })
    setPagoSaving(false)
    if (status === 204) {
      setPagoCuota(null)
      toast.success('Pago registrado')
      await loadCuotas()
      return
    }
    if (status === 409) {
      setPagoError('Cuota ya registrada como pagada')
      await loadCuotas()
      return
    }
    setPagoError(problem?.detail ?? 'No se pudo registrar el pago')
  }

  const submitGenerar = async (form: GenerarForm) => {
    if (!session?.token) return
    setGenSaving(true)
    setGenError(null)
    setGenResult(null)
    const { data, problem, status } = await generarCuotas(session.token, {
      mes: form.mes,
      anio: form.anio,
      monto: form.monto,
      fechaVencimiento: form.fechaVencimiento,
      cuentaId: form.cuentaId,
    })
    setGenSaving(false)
    if (status === 200 && data) {
      setGenResult(data)
      toast.success(`Cuotas generadas: ${data.creadas}`)
    } else {
      setGenError(problem?.detail ?? 'No se pudieron generar las cuotas')
    }
  }

  return (
    <div className="cq-admin-page container-fluid py-4">
      <Link to="/" className="text-sm text-decoration-none mb-2 d-inline-block">← Inicio</Link>
      <h1 className="h4 mb-3">Finanzas (admin)</h1>

      <ul className="nav nav-tabs mb-3" role="tablist">
        <li className="nav-item" role="presentation">
          <button
            type="button"
            role="tab"
            className={`nav-link cursor-pointer ${tab === 'cuotas' ? 'active' : ''}`}
            aria-selected={tab === 'cuotas'}
            aria-controls="finanzas-tab-cuotas"
            onClick={() => setTab('cuotas')}
          >
            Cuotas residente
          </button>
        </li>
        <li className="nav-item" role="presentation">
          <button
            type="button"
            role="tab"
            className={`nav-link cursor-pointer ${tab === 'morosos' ? 'active' : ''}`}
            aria-selected={tab === 'morosos'}
            aria-controls="finanzas-tab-morosos"
            onClick={() => {
              setTab('morosos')
              void loadMorosos()
            }}
          >
            Morosos
          </button>
        </li>
        <li className="nav-item" role="presentation">
          <button
            type="button"
            role="tab"
            className={`nav-link cursor-pointer ${tab === 'generar' ? 'active' : ''}`}
            aria-selected={tab === 'generar'}
            aria-controls="finanzas-tab-generar"
            onClick={() => setTab('generar')}
          >
            Generar período
          </button>
        </li>
      </ul>

      {tab === 'cuotas' && (
        <section id="finanzas-tab-cuotas" role="tabpanel" className="space-y-3">
          <div className="flex flex-wrap items-end gap-2">
            <label className="text-sm">
              Usuario ID
              <input
                type="number"
                className="ml-2 rounded border px-2 py-1"
                value={usuarioId}
                onChange={(e) => setUsuarioId(e.target.value)}
              />
            </label>
            <button
              type="button"
              className="rounded border px-3 py-1 text-sm hover:bg-surface"
              onClick={() => void loadCuotas()}
            >
              Buscar
            </button>
          </div>
          {cuotasLoading && <p className="text-neutral">Cargando…</p>}
          {!cuotasLoading && !cuotasError && cuotas.length === 0 && usuarioId && (
            <p className="text-neutral">Sin cuotas para este residente.</p>
          )}
          {cuotas.length > 0 && (
            <>
              <div className="cq-admin-table-pane">
                <CuotasTable cuotas={cuotas} />
              </div>
              <AdminMobileCardList
                rows={cuotas}
                getRowKey={(c) => c.cuotaId}
                renderCard={(c) => (
                  <CuotaAdminMobileCard
                    cuota={c}
                    onRegistrarPago={(cuota) => {
                      setPagoError(null)
                      setPagoCuota(cuota)
                    }}
                  />
                )}
              />
              <ul className="d-none d-md-block space-y-1 text-sm mt-2">
                {cuotas
                  .filter((c) => c.estado !== 'Pagada')
                  .map((c) => (
                    <li key={c.cuotaId}>
                      <button
                        type="button"
                        className="text-primary hover:underline"
                        onClick={() => {
                          setPagoError(null)
                          setPagoCuota(c)
                        }}
                      >
                        Registrar pago — cuota #{c.cuotaId}
                      </button>
                    </li>
                  ))}
              </ul>
            </>
          )}
        </section>
      )}

      {tab === 'morosos' && (
        <section id="finanzas-tab-morosos" role="tabpanel" className="card">
          <div className="card-body">
            <div className="d-flex flex-wrap gap-2 mb-3">
              <input
                type="number"
                className="form-control form-control-sm w-auto"
                value={mesFiltro}
                onChange={(e) => setMesFiltro(e.target.value)}
                placeholder="Mes"
                aria-label="Mes"
              />
              <input
                type="number"
                className="form-control form-control-sm w-auto"
                value={anioFiltro}
                onChange={(e) => setAnioFiltro(e.target.value)}
                placeholder="Año"
                aria-label="Año"
              />
              <button
                type="button"
                className="btn btn-sm btn-outline-primary"
                onClick={() => void loadMorosos()}
              >
                Aplicar filtro
              </button>
            </div>
            <MorososTable morosos={morosos} loading={morososLoading} error={morososError} />
          </div>
        </section>
      )}

      {tab === 'generar' && (
        <section id="finanzas-tab-generar" role="tabpanel">
        <GenerarCuotasForm
          onSubmit={(d) => void submitGenerar(d)}
          saving={genSaving}
          result={genResult}
          error={genError}
        />
        </section>
      )}

      {pagoCuota && (
        <RegistrarPagoModal
          cuota={pagoCuota}
          open
          saving={pagoSaving}
          error={pagoError}
          onClose={() => setPagoCuota(null)}
          onSubmit={(d) => void submitPago(d)}
        />
      )}
    </div>
  )
}

import { useCallback, useEffect, useMemo, useState } from 'react'
import 'bootstrap/dist/css/bootstrap.min.css'
import '@mdi/font/css/materialdesignicons.min.css'
import '../styles/bootstrap-pantone.css'
import '../styles/cq-admin.css'
import { GenerarCuotasForm } from '../features/admin/finanzas/GenerarCuotasForm'
import { MorososTable } from '../features/admin/finanzas/MorososTable'
import { MorososMorasPanel } from '../features/admin/finanzas/MorososMorasPanel'
import { RegistrarPagoModal } from '../features/admin/finanzas/RegistrarPagoModal'
import { AdminCuentasFnzSection } from '../features/admin/finanzas/AdminCuentasFnzSection'
import { AdminTiposCuentaFnzSection } from '../features/admin/finanzas/AdminTiposCuentaFnzSection'
import { AdminTiposMovimientoFnzSection } from '../features/admin/finanzas/AdminTiposMovimientoFnzSection'
import { CuotasPeriodosGeneradosSection } from '../features/admin/finanzas/CuotasPeriodosGeneradosSection'
import { AdminMovimientosFnzSection } from '../features/admin/finanzas/AdminMovimientosFnzSection'
import {
  generarCuotas,
  getCuotasUsuario,
  listCuentasAdmin,
  listTiposCuentaAdmin,
  listTiposMovimientoAdmin,
  listPeriodosGeneradosAdmin,
  listMovimientosAdmin,
  getMorosos,
  aplicarMorasMorosos,
  condonarMorasMorosos,
  registrarPago,
} from '../features/admin/finanzas/finanzasAdmin.api'
import type { GenerarCuotasForm as GenerarForm } from '../features/admin/finanzas/finanzasAdminSchemas'
import type { RegistrarPagoForm } from '../features/admin/finanzas/finanzasAdminSchemas'
import { usePadronUsuarios } from '../features/admin/usuarios/usePadronUsuarios'
import { useAuth } from '../features/auth/AuthContext'
import { CuotasAdminTable } from '../features/admin/finanzas/CuotasAdminTable'
import { morosoSelectionKey, morososFromKeys } from '../features/admin/finanzas/morosoSelection'
import { AdminListToolbar, ConfirmDialog } from '../shared/components/admin'
import { useQueryErrorToast } from '../shared/hooks/useQueryErrorToast'
import { useToast } from '../shared/toast/ToastContext'
import type { CuotaEstado } from '../shared/types/finanzas'
import type {
  CuentaFnzCatalogo,
  CuentaFnzAdmin,
  Moroso,
  TipoCuentaFnz,
  TipoMovimientoFnz,
  PeriodoCuotasGenerado,
  MovimientoFnz,
} from '../shared/types/finanzasAdmin'

type Tab =
  | 'cuotas'
  | 'morosos'
  | 'cuentas'
  | 'tiposCuenta'
  | 'tiposMovimiento'
  | 'generar'
  | 'movimientos'

export function FinanzasAdminPage() {
  const { session } = useAuth()
  const toast = useToast()
  const { data: usuariosPadron } = usePadronUsuarios(undefined, true)
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
  const [montoMoraInput, setMontoMoraInput] = useState('100')
  const [morasSaving, setMorasSaving] = useState(false)
  const [selectedMorosoKeys, setSelectedMorosoKeys] = useState<Set<string>>(() => new Set())
  const [morasConfirm, setMorasConfirm] = useState<'aplicar' | 'condonar' | null>(null)
  const [genResult, setGenResult] = useState<{ creadas: number; omitidas: number } | null>(null)
  const [genError, setGenError] = useState<string | null>(null)
  const [genSaving, setGenSaving] = useState(false)
  const [cuentasFnz, setCuentasFnz] = useState<CuentaFnzAdmin[]>([])
  const [cuentasCatalogo, setCuentasCatalogo] = useState<CuentaFnzCatalogo[]>([])
  const [cuentasLoading, setCuentasLoading] = useState(false)
  const [tiposCuenta, setTiposCuenta] = useState<TipoCuentaFnz[]>([])
  const [tiposCuentaLoading, setTiposCuentaLoading] = useState(false)
  const [tiposMovimiento, setTiposMovimiento] = useState<TipoMovimientoFnz[]>([])
  const [tiposMovimientoLoading, setTiposMovimientoLoading] = useState(false)
  const [periodosGenerados, setPeriodosGenerados] = useState<PeriodoCuotasGenerado[]>([])
  const [periodosLoading, setPeriodosLoading] = useState(false)
  const [movimientos, setMovimientos] = useState<MovimientoFnz[]>([])
  const [movimientosLoading, setMovimientosLoading] = useState(false)
  const [movSaving, setMovSaving] = useState(false)

  useQueryErrorToast(cuotasError, tab === 'cuotas')

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
      setSelectedMorosoKeys(new Set())
    }
    setMorososLoading(false)
  }, [session?.token, mesFiltro, anioFiltro])

  const morososFiltroBody = useMemo(() => {
    const mes = Number(mesFiltro)
    const anio = Number(anioFiltro)
    if (mes > 0 && anio > 0) return { mes, anio }
    return {}
  }, [mesFiltro, anioFiltro])

  const residentesSeleccionados = useMemo(
    () =>
      morososFromKeys(selectedMorosoKeys).map((r) => ({
        usuarioId: r.usuarioId,
        casaId: r.casaId ?? null,
      })),
    [selectedMorosoKeys],
  )

  const morasAplicadasEnSeleccion = useMemo(() => {
    let total = 0
    for (const m of morosos) {
      if (selectedMorosoKeys.has(morosoSelectionKey(m))) {
        total += m.morasAplicadas ?? 0
      }
    }
    return total
  }, [morosos, selectedMorosoKeys])

  const toggleMorosoRow = useCallback((key: string, checked: boolean) => {
    setSelectedMorosoKeys((prev) => {
      const next = new Set(prev)
      if (checked) next.add(key)
      else next.delete(key)
      return next
    })
  }, [])

  const toggleMorososVisible = useCallback((keys: string[], checked: boolean) => {
    setSelectedMorosoKeys((prev) => {
      const next = new Set(prev)
      for (const k of keys) {
        if (checked) next.add(k)
        else next.delete(k)
      }
      return next
    })
  }, [])

  const solicitarAplicarMoras = useCallback(() => {
    if (residentesSeleccionados.length === 0) {
      toast.error('Selecciona al menos un moroso en la tabla')
      return
    }
    const montoMora = Number(montoMoraInput)
    if (!Number.isFinite(montoMora) || montoMora <= 0) {
      toast.error('Indique un monto de mora mayor a cero')
      return
    }
    setMorasConfirm('aplicar')
  }, [residentesSeleccionados.length, montoMoraInput, toast])

  const solicitarCondonarMoras = useCallback(() => {
    if (residentesSeleccionados.length === 0) {
      toast.error('Selecciona al menos un moroso en la tabla')
      return
    }
    setMorasConfirm('condonar')
  }, [residentesSeleccionados.length, toast])

  const ejecutarMorasConfirm = useCallback(async () => {
    if (!session?.token || !morasConfirm) return
    const accion = morasConfirm
    setMorasConfirm(null)
    setMorasSaving(true)

    if (accion === 'aplicar') {
      const montoMora = Number(montoMoraInput)
      const { data, problem, status } = await aplicarMorasMorosos(session.token, {
        montoMora,
        residentes: residentesSeleccionados,
        ...morososFiltroBody,
      })
      setMorasSaving(false)
      if (status !== 200 || !data) {
        toast.error(problem?.detail ?? 'No se pudieron aplicar moras')
        return
      }
      toast.success(
        `Moras aplicadas: ${data.actualizadas}. Omitidas (ya tenían mora): ${data.omitidas}.`,
      )
      void loadMorosos()
      return
    }

    const { data, problem, status } = await condonarMorasMorosos(session.token, {
      residentes: residentesSeleccionados,
      ...morososFiltroBody,
    })
    setMorasSaving(false)
    if (status !== 200 || !data) {
      toast.error(problem?.detail ?? 'No se pudieron condonar moras')
      return
    }
    toast.success(`Moras condonadas en ${data.actualizadas} cuota(s).`)
    void loadMorosos()
  }, [
    session?.token,
    morasConfirm,
    montoMoraInput,
    morososFiltroBody,
    residentesSeleccionados,
    toast,
    loadMorosos,
  ])

  const morasConfirmCopy = useMemo(() => {
    if (morasConfirm === 'aplicar') {
      const montoMora = Number(montoMoraInput)
      return {
        title: 'Aplicar mora',
        message: `¿Aplicar mora de $${montoMora.toFixed(2)} a ${residentesSeleccionados.length} moroso(s) seleccionado(s)? Solo cuotas vencidas sin mora previa.`,
        confirmLabel: 'Aplicar mora',
        variant: 'default' as const,
      }
    }
    if (morasConfirm === 'condonar') {
      return {
        title: 'Condonar moras',
        message: `¿Quitar las moras de las cuotas vencidas de ${residentesSeleccionados.length} moroso(s) seleccionado(s)?`,
        confirmLabel: 'Condonar',
        variant: 'danger' as const,
      }
    }
    return null
  }, [morasConfirm, montoMoraInput, residentesSeleccionados.length])

  const loadCuentas = useCallback(async () => {
    if (!session?.token) return
    setCuentasLoading(true)
    const { data, status } = await listCuentasAdmin(session.token)
    if (status === 200 && data) {
      setCuentasFnz(data)
      setCuentasCatalogo(data.map((c) => ({ cuentaId: c.cuentaId, nombre: c.nombre })))
    } else {
      setCuentasFnz([])
      setCuentasCatalogo([])
    }
    setCuentasLoading(false)
  }, [session?.token])

  const loadTiposCuenta = useCallback(async () => {
    if (!session?.token) return
    setTiposCuentaLoading(true)
    const { data, status } = await listTiposCuentaAdmin(session.token)
    if (status === 200 && data) {
      setTiposCuenta(data)
    } else {
      setTiposCuenta([])
    }
    setTiposCuentaLoading(false)
  }, [session?.token])

  const loadTiposMovimiento = useCallback(async () => {
    if (!session?.token) return
    setTiposMovimientoLoading(true)
    const { data, status } = await listTiposMovimientoAdmin(session.token)
    if (status === 200 && data) {
      setTiposMovimiento(data)
    } else {
      setTiposMovimiento([])
    }
    setTiposMovimientoLoading(false)
  }, [session?.token])

  const loadPeriodosGenerados = useCallback(async () => {
    if (!session?.token) return
    setPeriodosLoading(true)
    const { data, status } = await listPeriodosGeneradosAdmin(session.token)
    setPeriodosGenerados(status === 200 && data ? data : [])
    setPeriodosLoading(false)
  }, [session?.token])

  const loadMovimientos = useCallback(async () => {
    if (!session?.token) return
    setMovimientosLoading(true)
    const { data, status } = await listMovimientosAdmin(session.token)
    setMovimientos(status === 200 && data ? data : [])
    setMovimientosLoading(false)
  }, [session?.token])

  const reloadMovimientosTab = useCallback(async () => {
    await Promise.all([loadMovimientos(), loadCuentas(), loadTiposMovimiento()])
  }, [loadMovimientos, loadCuentas, loadTiposMovimiento])

  useEffect(() => {
    if (tab === 'generar' || tab === 'cuentas' || tab === 'movimientos') void loadCuentas()
    if (tab === 'cuentas' || tab === 'tiposCuenta') void loadTiposCuenta()
    if (tab === 'tiposMovimiento' || tab === 'movimientos') void loadTiposMovimiento()
    if (tab === 'generar') void loadPeriodosGenerados()
    if (tab === 'movimientos') void loadMovimientos()
  }, [
    tab,
    loadCuentas,
    loadTiposCuenta,
    loadTiposMovimiento,
    loadPeriodosGenerados,
    loadMovimientos,
  ])

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
      if (data.creadas > 0) {
        toast.success(`Cuotas generadas: ${data.creadas}`)
      } else if (data.omitidas > 0) {
        toast.show(`No se creó ninguna cuota (${data.omitidas} omitidas)`, { variant: 'info' })
      } else {
        toast.show('No hay casas elegibles para generar cuotas', { variant: 'info' })
      }
      void loadCuentas()
      void loadPeriodosGenerados()
    } else {
      setGenError(problem?.detail ?? 'No se pudieron generar las cuotas')
    }
  }

  const cuotasMetrics = useMemo(
    () => [{ label: 'Cuotas', value: cuotas.length }],
    [cuotas.length],
  )

  const morososMetrics = useMemo(
    () => [{ label: 'Morosos', value: morosos.length }],
    [morosos.length],
  )

  return (
    <div className="cq-admin-page container-fluid py-4">
      <ul className="nav nav-tabs mb-3 cq-admin-tabs" role="tablist">
        <li className="nav-item">
          <button
            type="button"
            role="tab"
            className={`nav-link ${tab === 'cuotas' ? 'active' : ''}`}
            onClick={() => setTab('cuotas')}
          >
            Cuotas residente
          </button>
        </li>
        <li className="nav-item">
          <button
            type="button"
            role="tab"
            className={`nav-link ${tab === 'morosos' ? 'active' : ''}`}
            onClick={() => {
              setTab('morosos')
              void loadMorosos()
            }}
          >
            Morosos
          </button>
        </li>
        <li className="nav-item">
          <button
            type="button"
            role="tab"
            className={`nav-link ${tab === 'cuentas' ? 'active' : ''}`}
            onClick={() => {
              setTab('cuentas')
              void loadCuentas()
              void loadTiposCuenta()
            }}
          >
            Cuentas contables
          </button>
        </li>
        <li className="nav-item">
          <button
            type="button"
            role="tab"
            className={`nav-link ${tab === 'tiposCuenta' ? 'active' : ''}`}
            onClick={() => {
              setTab('tiposCuenta')
              void loadTiposCuenta()
            }}
          >
            Tipos de cuenta
          </button>
        </li>
        <li className="nav-item">
          <button
            type="button"
            role="tab"
            className={`nav-link ${tab === 'tiposMovimiento' ? 'active' : ''}`}
            onClick={() => {
              setTab('tiposMovimiento')
              void loadTiposMovimiento()
            }}
          >
            Tipos de movimiento
          </button>
        </li>
        <li className="nav-item">
          <button
            type="button"
            role="tab"
            className={`nav-link ${tab === 'generar' ? 'active' : ''}`}
            onClick={() => {
              setTab('generar')
              void loadPeriodosGenerados()
              void loadCuentas()
            }}
          >
            Generar período
          </button>
        </li>
        <li className="nav-item">
          <button
            type="button"
            role="tab"
            className={`nav-link ${tab === 'movimientos' ? 'active' : ''}`}
            onClick={() => {
              setTab('movimientos')
              void reloadMovimientosTab()
            }}
          >
            Movimientos
          </button>
        </li>
      </ul>

      {tab === 'cuotas' && (
        <>
          <AdminListToolbar
            title="Cuotas por residente"
            metrics={cuotasMetrics}
            filterSlot={
              <div className="d-flex flex-wrap align-items-center gap-2">
                <select
                  className="form-control form-control-sm"
                  style={{ minWidth: '14rem' }}
                  value={usuarioId}
                  onChange={(e) => setUsuarioId(e.target.value)}
                  aria-label="Residente"
                >
                  <option value="">Selecciona residente…</option>
                  {(usuariosPadron ?? []).map((u) => (
                    <option key={u.usuarioId} value={u.usuarioId}>
                      {u.nombre} ({u.correo})
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  className="btn btn-sm btn-outline-primary"
                  disabled={!usuarioId || cuotasLoading}
                  onClick={() => void loadCuotas()}
                >
                  Consultar
                </button>
              </div>
            }
          />
          <div className="card cq-admin-card">
            <div className="card-body pt-3">
              {cuotasLoading && (
                <div className="placeholder-glow" aria-label="Cargando cuotas">
                  <span className="placeholder col-12 mb-2" />
                </div>
              )}
              {!cuotasLoading && !cuotasError && cuotas.length === 0 && usuarioId && (
                <div className="cq-empty-state">
                  <p className="cq-empty-title">Sin cuotas</p>
                  <p className="text-muted">Este residente no tiene cuotas registradas.</p>
                </div>
              )}
              {!cuotasLoading && cuotas.length > 0 && (
                <CuotasAdminTable
                  cuotas={cuotas}
                  onRegistrarPago={(cuota) => {
                    setPagoError(null)
                    setPagoCuota(cuota)
                  }}
                />
              )}
            </div>
          </div>
        </>
      )}

      {tab === 'morosos' && (
        <>
          <AdminListToolbar
            title="Morosos"
            metrics={morososMetrics}
            filterSlot={
              <div className="d-flex flex-wrap gap-2">
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
            }
          />
          <MorososMorasPanel
            montoMora={montoMoraInput}
            onMontoMoraChange={setMontoMoraInput}
            onAplicar={solicitarAplicarMoras}
            onCondonar={solicitarCondonarMoras}
            disabled={morasSaving || morososLoading}
            mesFiltro={mesFiltro}
            anioFiltro={anioFiltro}
            selectedCount={selectedMorosoKeys.size}
            morasAplicadasEnSeleccion={morasAplicadasEnSeleccion}
          />
          <div className="card cq-admin-card">
            <div className="card-body pt-3">
              <MorososTable
                morosos={morosos}
                loading={morososLoading}
                error={morososError}
                selectedKeys={selectedMorosoKeys}
                onToggleRow={toggleMorosoRow}
                onToggleAllVisible={toggleMorososVisible}
              />
            </div>
          </div>
        </>
      )}

      {tab === 'cuentas' && (
        <AdminCuentasFnzSection
          cuentas={cuentasFnz}
          tipos={tiposCuenta}
          loading={cuentasLoading}
          onReload={async () => {
            await loadCuentas()
            await loadTiposCuenta()
          }}
        />
      )}

      {tab === 'tiposCuenta' && (
        <AdminTiposCuentaFnzSection
          tipos={tiposCuenta}
          loading={tiposCuentaLoading}
          onReload={loadTiposCuenta}
        />
      )}

      {tab === 'tiposMovimiento' && (
        <AdminTiposMovimientoFnzSection
          tipos={tiposMovimiento}
          loading={tiposMovimientoLoading}
          onReload={loadTiposMovimiento}
        />
      )}

      {tab === 'generar' && (
        <>
          <AdminListToolbar title="Generar cuotas del período" metrics={[]} />
          <div className="card">
            <div className="card-body">
              <p className="text-muted small mb-3">Nuevo período — una cuota por casa con ocupante o propietario.</p>
              <GenerarCuotasForm
                cuentas={cuentasCatalogo}
                cuentasLoading={cuentasLoading}
                onSubmit={(d) => void submitGenerar(d)}
                saving={genSaving}
                result={genResult}
                error={genError}
              />
            </div>
          </div>
          <CuotasPeriodosGeneradosSection periodos={periodosGenerados} loading={periodosLoading} />
        </>
      )}

      {tab === 'movimientos' && (
        <AdminMovimientosFnzSection
          cuentas={cuentasCatalogo}
          tipos={tiposMovimiento}
          movimientos={movimientos}
          loading={movimientosLoading}
          saving={movSaving}
          onSavingChange={setMovSaving}
          onReload={reloadMovimientosTab}
        />
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

      {morasConfirmCopy && (
        <ConfirmDialog
          open={morasConfirm !== null}
          title={morasConfirmCopy.title}
          message={morasConfirmCopy.message}
          confirmLabel={morasConfirmCopy.confirmLabel}
          variant={morasConfirmCopy.variant}
          onConfirm={() => void ejecutarMorasConfirm()}
          onCancel={() => setMorasConfirm(null)}
        />
      )}
    </div>
  )
}

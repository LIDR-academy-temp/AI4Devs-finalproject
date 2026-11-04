import { zodResolver } from '@hookform/resolvers/zod'
import { useEffect, useMemo, useState } from 'react'
import { useForm } from 'react-hook-form'
import 'bootstrap/dist/css/bootstrap.min.css'
import '@mdi/font/css/materialdesignicons.min.css'
import '../styles/bootstrap-pantone.css'
import '../styles/cq-admin.css'
import { usePadronUsuarios } from '../features/admin/usuarios/usePadronUsuarios'
import {
  optionalIdFromForm,
  usuarioIdFromForm,
  vehiculoCreateAdminSchema,
  vehiculoEditAdminSchema,
  type VehiculoCreateAdminForm,
  type VehiculoEditAdminForm,
} from '../features/admin/vehiculos/vehiculosAdminSchemas'
import { VehiculoAdminMobileCard } from '../features/admin/vehiculos/VehiculoAdminMobileCard'
import {
  VEHICULOS_TABLE_ACCESSORS,
  VEHICULOS_TABLE_COLUMNS,
} from '../features/admin/vehiculos/vehiculosTableFilter'
import {
  AdminMarcasVehiculoSection,
  AdminModelosVehiculoSection,
} from '../features/admin/vehiculos/AdminVehiculosCatalogSections'
import { buscarVehiculosPorPlacas, useVehiculosPadron } from '../features/admin/vehiculos/useVehiculosAdmin'
import { useMarcasCatalog, useModelosCatalog } from '../features/admin/vehiculos/useVehiculosCatalog'
import {
  AdminFilterableTable,
  AdminListToolbar,
  AdminMobileCardList,
  AdminSidePanel,
  AdminSplitLayout,
  ConfirmDialog,
} from '../shared/components/admin'
import { useClientTableFilter } from '../shared/hooks/useClientTableFilter'
import { useQueryErrorToast } from '../shared/hooks/useQueryErrorToast'
import { useToast } from '../shared/toast/ToastContext'
import { apiDelete, apiPost, apiPut } from '../shared/lib/apiClient'
import type { AutomovilListItem } from '../shared/types/vehiculos'

type VehiculosTab = 'padron' | 'marcas' | 'modelos'

export function AdminVehiculosPage() {
  const [tab, setTab] = useState<VehiculosTab>('padron')
  const { vehiculos, loading, error, refetch } = useVehiculosPadron()
  const { data: usuarios } = usePadronUsuarios(undefined, true)
  const { marcas, loading: marcasLoading, error: marcasError, reload: reloadMarcas } = useMarcasCatalog()
  const { modelos, loading: modelosLoading, error: modelosError, reload: reloadModelos } = useModelosCatalog()

  const [rows, setRows] = useState<AutomovilListItem[]>([])
  const [busquedaPlacas, setBusquedaPlacas] = useState('')
  const [searchError, setSearchError] = useState<string | null>(null)

  const [createOpen, setCreateOpen] = useState(false)
  const [editing, setEditing] = useState<AutomovilListItem | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<AutomovilListItem | null>(null)
  const [deleteError, setDeleteError] = useState<string | null>(null)
  const [formError, setFormError] = useState<string | null>(null)
  const toast = useToast()
  useQueryErrorToast(error)
  useQueryErrorToast(searchError)
  useQueryErrorToast(tab === 'marcas' ? marcasError : null)
  useQueryErrorToast(tab === 'modelos' ? modelosError : null)

  useEffect(() => {
    setRows(vehiculos)
  }, [vehiculos])

  const heroStats = useMemo(
    () => [
      { label: 'Vehículos', value: rows.length },
      { label: 'Marcas', value: marcas.length },
      { label: 'Modelos', value: modelos.length },
    ],
    [rows.length, marcas.length, modelos.length],
  )

  const {
    filteredRows,
    globalSearch,
    setGlobalSearch,
    columnFilters,
    onColumnFilterChange,
    filteredCount,
    totalCount,
  } = useClientTableFilter(rows, VEHICULOS_TABLE_COLUMNS, VEHICULOS_TABLE_ACCESSORS)

  const createForm = useForm<VehiculoCreateAdminForm>({
    resolver: zodResolver(vehiculoCreateAdminSchema),
    defaultValues: {
      usuarioId: '',
      placas: '',
      marcaId: '',
      modeloId: '',
      modeloLibre: '',
      color: '',
    },
  })

  const editForm = useForm<VehiculoEditAdminForm>({
    resolver: zodResolver(vehiculoEditAdminSchema),
    defaultValues: {
      placas: '',
      marcaId: '',
      modeloId: '',
      modeloLibre: '',
      color: '',
    },
  })

  const panelOpen = createOpen || editing !== null
  const isEdit = editing !== null
  const marcaIdWatch = isEdit ? editForm.watch('marcaId') : createForm.watch('marcaId')
  const modelosFiltrados = marcaIdWatch
    ? modelos.filter((m) => String(m.marcaId) === marcaIdWatch)
    : modelos

  const closePanel = () => {
    setCreateOpen(false)
    setEditing(null)
    setFormError(null)
  }

  const refreshCatalogs = () => {
    void reloadMarcas()
    void reloadModelos()
  }

  const switchTab = (next: VehiculosTab) => {
    closePanel()
    setTab(next)
  }

  const openCreate = () => {
    setFormError(null)
    setTab('padron')
    createForm.reset({
      usuarioId: '',
      placas: '',
      marcaId: '',
      modeloId: '',
      modeloLibre: '',
      color: '',
    })
    setCreateOpen(true)
    setEditing(null)
  }

  const openEdit = (v: AutomovilListItem) => {
    setFormError(null)
    setCreateOpen(false)
    editForm.reset({
      placas: v.placas ?? '',
      marcaId: v.marcaId ? String(v.marcaId) : '',
      modeloId: v.modeloId ? String(v.modeloId) : '',
      modeloLibre: v.modeloLibre ?? '',
      color: v.color ?? '',
    })
    setEditing(v)
  }

  const handleSaveCreate = createForm.handleSubmit(async (data) => {
    setFormError(null)
    const { problem, status } = await apiPost('/USR/Automoviles/admin', {
      usuarioId: usuarioIdFromForm(data.usuarioId),
      placas: data.placas.trim().toUpperCase(),
      marcaId: optionalIdFromForm(data.marcaId),
      modeloId: optionalIdFromForm(data.modeloId),
      modeloLibre: data.modeloLibre || undefined,
      color: data.color || undefined,
    })
    if (problem) {
      setFormError(problem.detail ?? `Error ${status}`)
      return
    }
    closePanel()
    toast.success('Vehículo registrado')
    await refetch()
    refreshCatalogs()
  })

  const handleSaveEdit = editForm.handleSubmit(async (data) => {
    if (!editing) return
    setFormError(null)
    const { problem, status } = await apiPut(`/USR/Automoviles/${editing.automovilId}/admin`, {
      placas: data.placas.trim().toUpperCase(),
      marcaId: optionalIdFromForm(data.marcaId),
      modeloId: optionalIdFromForm(data.modeloId),
      modeloLibre: data.modeloLibre || undefined,
      color: data.color || undefined,
    })
    if (problem) {
      setFormError(problem.detail ?? `Error ${status}`)
      return
    }
    closePanel()
    toast.success('Vehículo actualizado')
    await refetch()
  })

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return
    setDeleteError(null)
    const { problem, status } = await apiDelete(`/USR/Automoviles/${deleteTarget.automovilId}/admin`)
    if (problem) {
      setDeleteError(problem.detail ?? `Error ${status}`)
      return
    }
    setDeleteTarget(null)
    toast.success('Vehículo eliminado')
    await refetch()
  }

  const handleBuscar = async () => {
    if (!busquedaPlacas.trim()) return
    setSearchError(null)
    const { data, problem, status } = await buscarVehiculosPorPlacas(busquedaPlacas)
    if (!data) {
      setSearchError(problem?.detail ?? `Error ${status}`)
      return
    }
    setRows(data)
  }

  const handleVerTodos = async () => {
    setBusquedaPlacas('')
    setSearchError(null)
    await refetch()
  }

  const formFooter = (
    <>
      <button
        type="button"
        className="btn btn-primary flex-grow-1"
        onClick={() => void (isEdit ? handleSaveEdit() : handleSaveCreate())}
      >
        <i className={`mdi ${isEdit ? 'mdi-content-save' : 'mdi-car-plus'} mr-1`} />
        {isEdit ? 'Actualizar' : 'Registrar'}
      </button>
      <button type="button" className="btn btn-outline-secondary" onClick={closePanel}>
        Cancelar
      </button>
    </>
  )

  const primaryAction =
    tab === 'padron'
      ? {
          label: 'Nuevo vehículo',
          iconClass: 'mdi mdi-plus',
          onClick: openCreate,
        }
      : {
          label: 'Actualizar',
          iconClass: 'mdi mdi-refresh',
          onClick: refreshCatalogs,
        }

  return (
    <div className="cq-admin-page container-fluid py-4">
      <ul className="nav nav-tabs mb-3 cq-admin-tabs">
        <li className="nav-item">
          <button
            type="button"
            className={`nav-link ${tab === 'padron' ? 'active' : ''}`}
            onClick={() => switchTab('padron')}
          >
            Padrón
          </button>
        </li>
        <li className="nav-item">
          <button
            type="button"
            className={`nav-link ${tab === 'marcas' ? 'active' : ''}`}
            onClick={() => switchTab('marcas')}
          >
            Marcas
          </button>
        </li>
        <li className="nav-item">
          <button
            type="button"
            className={`nav-link ${tab === 'modelos' ? 'active' : ''}`}
            onClick={() => switchTab('modelos')}
          >
            Modelos
          </button>
        </li>
      </ul>

      {tab === 'marcas' && (
        <AdminMarcasVehiculoSection
          marcas={marcas}
          loading={marcasLoading}
          onReload={async () => {
            await reloadMarcas()
            await reloadModelos()
          }}
        />
      )}

      {tab === 'modelos' && (
        <AdminModelosVehiculoSection
          modelos={modelos}
          marcas={marcas}
          loading={modelosLoading}
          onReload={async () => {
            await reloadModelos()
            await reloadMarcas()
          }}
        />
      )}

      {tab === 'padron' && (
      <>
      <AdminListToolbar
        title="Vehículos"
        metrics={heroStats}
        filterSlot={
          <div className="d-flex gap-2 flex-wrap">
            <input
              className="form-control form-control-sm text-uppercase"
              placeholder="Buscar placas"
              value={busquedaPlacas}
              onChange={(e) => setBusquedaPlacas(e.target.value.toUpperCase())}
              aria-label="Placas"
            />
            <button type="button" className="btn btn-sm btn-outline-primary" onClick={() => void handleBuscar()}>
              Buscar
            </button>
            <button type="button" className="btn btn-sm btn-link" onClick={() => void handleVerTodos()}>
              Ver todos
            </button>
          </div>
        }
        primaryAction={primaryAction}
      />

      <AdminSplitLayout
        panelOpen={panelOpen}
        tablePane={
          <div className="card">
            <div className="card-body pt-3">
              {loading && (
                <div className="placeholder-glow" aria-label="Cargando vehículos">
                  <span className="placeholder col-12 mb-2" />
                </div>
              )}
              {!loading && rows.length === 0 && (
                <div className="cq-empty-state">
                  <i className="mdi mdi-car-off cq-empty-icon" />
                  <p className="cq-empty-title">Sin vehículos</p>
                  <p className="text-muted">Registra un vehículo o ajusta la búsqueda.</p>
                </div>
              )}
              {!loading && rows.length > 0 && (
                <>
                <AdminFilterableTable
                  columns={VEHICULOS_TABLE_COLUMNS}
                  columnFilters={columnFilters}
                  onColumnFilterChange={onColumnFilterChange}
                  globalSearch={globalSearch}
                  onGlobalSearchChange={setGlobalSearch}
                  filteredCount={filteredCount}
                  totalCount={totalCount}
                >
                  {filteredRows.map((v) => (
                    <tr key={v.automovilId} className={editing?.automovilId === v.automovilId ? 'cq-row-active' : undefined}>
                      <td className="font-monospace font-weight-bold">{v.placas ?? '—'}</td>
                      <td className="min-w-0 text-break">{v.nombreUsuario ?? '—'}</td>
                      <td>{v.numeroCasa ?? '—'}</td>
                      <td>{[v.marca, v.modelo ?? v.modeloLibre].filter(Boolean).join(' ') || '—'}</td>
                      <td>{v.color ?? '—'}</td>
                      <td className="text-center cq-actions">
                        <button type="button" className="btn btn-link btn-sm" onClick={() => openEdit(v)} aria-label="Editar">
                          <i className="mdi mdi-pencil" />
                        </button>
                        <button
                          type="button"
                          className="btn btn-link btn-sm text-danger"
                          onClick={() => setDeleteTarget(v)}
                          aria-label="Eliminar"
                        >
                          <i className="mdi mdi-delete" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </AdminFilterableTable>
                <AdminMobileCardList
                  rows={filteredRows}
                  getRowKey={(v) => v.automovilId}
                  renderCard={(v) => (
                    <VehiculoAdminMobileCard
                      vehiculo={v}
                      active={editing?.automovilId === v.automovilId}
                      onEdit={openEdit}
                    />
                  )}
                />
                </>
              )}
            </div>
          </div>
        }
        formPane={
          <AdminSidePanel
            visible={panelOpen}
            title={isEdit ? 'Editar vehículo' : 'Nuevo vehículo'}
            subtitle="Asocia el vehículo al residente propietario."
            iconClass="mdi mdi-car"
            editing={isEdit}
            onClose={closePanel}
            footer={formFooter}
          >
            {formError && <div className="alert alert-danger py-2 small" role="alert">{formError}</div>}
            {!isEdit && (
              <div className="form-group mb-3">
                <label className="cq-label">Propietario <span className="text-danger">*</span></label>
                <select className="form-control" {...createForm.register('usuarioId')}>
                  <option value="">Seleccione…</option>
                  {usuarios.map((u) => (
                    <option key={u.usuarioId} value={u.usuarioId}>{u.nombre}</option>
                  ))}
                </select>
                {createForm.formState.errors.usuarioId && (
                  <span className="text-danger small">{createForm.formState.errors.usuarioId.message}</span>
                )}
              </div>
            )}
            <div className="form-group mb-3">
              <label className="cq-label">Placas <span className="text-danger">*</span></label>
              <input
                className="form-control text-uppercase"
                {...(isEdit ? editForm.register('placas') : createForm.register('placas'))}
              />
              {(isEdit ? editForm.formState.errors.placas : createForm.formState.errors.placas) && (
                <span className="text-danger small">
                  {(isEdit ? editForm.formState.errors.placas : createForm.formState.errors.placas)?.message}
                </span>
              )}
            </div>
            <div className="form-group mb-3">
              <label className="cq-label">Marca</label>
              <select
                className="form-control"
                {...(isEdit ? editForm.register('marcaId') : createForm.register('marcaId'))}
              >
                <option value="">—</option>
                {marcas.map((m) => (
                  <option key={m.marcaId} value={m.marcaId}>{m.marca}</option>
                ))}
              </select>
            </div>
            <div className="form-group mb-3">
              <label className="cq-label">Modelo</label>
              <select
                className="form-control"
                {...(isEdit ? editForm.register('modeloId') : createForm.register('modeloId'))}
              >
                <option value="">—</option>
                {modelosFiltrados.map((m) => (
                  <option key={m.modeloId} value={m.modeloId}>{m.modelo}</option>
                ))}
              </select>
            </div>
            <div className="form-group mb-3">
              <label className="cq-label">Modelo (texto libre)</label>
              <input
                className="form-control"
                {...(isEdit ? editForm.register('modeloLibre') : createForm.register('modeloLibre'))}
              />
            </div>
            <div className="form-group mb-0">
              <label className="cq-label">Color</label>
              <input
                className="form-control"
                {...(isEdit ? editForm.register('color') : createForm.register('color'))}
              />
            </div>
          </AdminSidePanel>
        }
      />

      <ConfirmDialog
        open={deleteTarget !== null}
        title="Eliminar vehículo"
        message={deleteTarget ? `¿Eliminar placas ${deleteTarget.placas}?` : ''}
        confirmLabel="Eliminar"
        variant="danger"
        onCancel={() => setDeleteTarget(null)}
        onConfirm={() => void handleConfirmDelete()}
      />
      {deleteTarget && deleteError && (
        <div className="alert alert-danger mt-3" role="alert">{deleteError}</div>
      )}
      </>
      )}
    </div>
  )
}

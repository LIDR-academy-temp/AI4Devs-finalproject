import { zodResolver } from '@hookform/resolvers/zod'
import { useEffect, useMemo, useState } from 'react'
import { useForm } from 'react-hook-form'
import 'bootstrap/dist/css/bootstrap.min.css'
import '@mdi/font/css/materialdesignicons.min.css'
import '../styles/bootstrap-pantone.css'
import '../styles/cq-admin.css'
import {
  juntaCreateSchema,
  juntaEditSchema,
  type JuntaCreateForm,
  type JuntaEditForm,
} from '../features/admin/juntas/juntasAdminSchemas'
import { normalizeJuntaDetalle, type JuntaDetalleApiRow } from '../features/juntas/juntaMappers'
import { JuntaAdminMobileCard } from '../features/admin/juntas/JuntaAdminMobileCard'
import {
  JUNTAS_TABLE_ACCESSORS,
  JUNTAS_TABLE_COLUMNS,
} from '../features/admin/juntas/juntasTableFilter'
import { useJuntas } from '../features/juntas/useJuntas'
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
import { apiDelete, apiGet, apiPost, apiPut } from '../shared/lib/apiClient'
import type { JuntaListItem } from '../shared/types/juntas'

function toDatetimeLocal(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

export function AdminJuntasPage() {
  const { juntas, loading, error, refetch } = useJuntas()

  type PanelMode = 'closed' | 'create' | 'edit'
  const [panelMode, setPanelMode] = useState<PanelMode>('closed')
  const [editingJunta, setEditingJunta] = useState<JuntaListItem | null>(null)
  const [loadingDetalle, setLoadingDetalle] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<JuntaListItem | null>(null)
  const [deleteError, setDeleteError] = useState<string | null>(null)
  const [formError, setFormError] = useState<string | null>(null)
  const [toggleError, setToggleError] = useState<string | null>(null)
  const toast = useToast()
  useQueryErrorToast(error)

  const heroStats = useMemo(() => {
    const activas = juntas.filter((j) => j.activa).length
    return [
      { label: 'Juntas', value: juntas.length },
      { label: 'Activas', value: activas },
      { label: 'Cerradas', value: juntas.length - activas },
    ]
  }, [juntas])

  const {
    filteredRows: filteredJuntas,
    globalSearch,
    setGlobalSearch,
    columnFilters,
    onColumnFilterChange,
    filteredCount,
    totalCount,
  } = useClientTableFilter(juntas, JUNTAS_TABLE_COLUMNS, JUNTAS_TABLE_ACCESSORS)

  const createForm = useForm<JuntaCreateForm>({
    resolver: zodResolver(juntaCreateSchema),
    defaultValues: {
      titulo: '',
      descripcion: '',
      fechaProgramada: '',
      ubicacion: '',
      contenido: '',
    },
  })

  const editForm = useForm<JuntaEditForm>({
    resolver: zodResolver(juntaEditSchema),
    defaultValues: {
      titulo: '',
      descripcion: '',
      fechaProgramada: '',
      ubicacion: '',
      contenido: '',
      activa: true,
    },
  })

  const panelOpen = panelMode !== 'closed'
  const {
    register: registerCreate,
    formState: { errors: createErrors },
    reset: resetCreate,
  } = createForm
  const {
    register: registerEdit,
    formState: { errors: editErrors },
    reset: resetEdit,
  } = editForm

  const closePanel = () => {
    setPanelMode('closed')
    setEditingJunta(null)
    setFormError(null)
    setLoadingDetalle(false)
  }

  const openCreate = () => {
    setEditingJunta(null)
    setFormError(null)
    resetCreate({
      titulo: '',
      descripcion: '',
      fechaProgramada: '',
      ubicacion: '',
      contenido: '',
    })
    setPanelMode('create')
  }

  const openEdit = async (j: JuntaListItem) => {
    setFormError(null)
    setEditingJunta(j)
    setPanelMode('edit')
    setLoadingDetalle(true)
    const { data, problem, status } = await apiGet<JuntaDetalleApiRow>(`/JNT/Juntas/${j.juntaId}`)
    const detalle = data ? normalizeJuntaDetalle(data) : null
    if (!detalle && problem) {
      setFormError(problem.detail ?? `Error ${status}`)
    }
    resetEdit({
      titulo: detalle?.titulo ?? j.titulo,
      descripcion: detalle?.descripcion ?? j.descripcion ?? '',
      fechaProgramada: toDatetimeLocal(detalle?.fechaProgramada ?? j.fechaProgramada),
      ubicacion: detalle?.ubicacion ?? j.ubicacion ?? '',
      contenido: detalle?.contenido ?? '',
      activa: detalle?.activa ?? j.activa,
    })
    setLoadingDetalle(false)
  }

  const handleSaveCreate = createForm.handleSubmit(async (data) => {
    setFormError(null)
    const { problem, status } = await apiPost('/JNT/Juntas', {
      titulo: data.titulo,
      descripcion: data.descripcion || undefined,
      fechaProgramada: new Date(data.fechaProgramada).toISOString(),
      ubicacion: data.ubicacion || undefined,
      contenido: data.contenido || undefined,
    })
    if (problem) {
      setFormError(problem.detail ?? `Error ${status}`)
      return
    }
    closePanel()
    toast.success('Junta creada')
    await refetch()
  })

  const handleSaveEdit = editForm.handleSubmit(async (data) => {
    if (!editingJunta?.juntaId) {
      setFormError('No se pudo identificar la junta.')
      return
    }
    setFormError(null)
    const { problem, status } = await apiPut(`/JNT/Juntas/${editingJunta.juntaId}`, {
      titulo: data.titulo,
      descripcion: data.descripcion || undefined,
      fechaProgramada: new Date(data.fechaProgramada).toISOString(),
      ubicacion: data.ubicacion || undefined,
      contenido: data.contenido || undefined,
      activa: data.activa,
    })
    if (problem) {
      setFormError(problem.detail ?? `Error ${status}`)
      return
    }
    closePanel()
    toast.success('Junta actualizada')
    await refetch()
  })

  const handleToggleActiva = async (j: JuntaListItem) => {
    setToggleError(null)
    const nextActiva = !j.activa
    const { problem, status } = await apiPut(`/JNT/Juntas/${j.juntaId}`, { activa: nextActiva })
    if (problem) {
      setToggleError(problem.detail ?? `Error ${status}`)
      return
    }
    toast.success(nextActiva ? 'Junta activada' : 'Junta cerrada')
    await refetch()
  }

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return
    setDeleteError(null)
    const { problem, status } = await apiDelete(`/JNT/Juntas/${deleteTarget.juntaId}`)
    if (problem) {
      setDeleteError(problem.detail ?? `Error ${status}`)
      return
    }
    setDeleteTarget(null)
    toast.success('Junta eliminada')
    await refetch()
  }

  useEffect(() => {
    if (!deleteTarget) setDeleteError(null)
  }, [deleteTarget])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && panelOpen) closePanel()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [panelOpen])

  const formFooter =
    panelMode === 'edit' ? (
      <>
        <button
          type="button"
          className="btn btn-primary flex-grow-1"
          disabled={loadingDetalle}
          onClick={() => void handleSaveEdit()}
        >
          <i className="mdi mdi-content-save mr-1" />
          Guardar
        </button>
        <button type="button" className="btn btn-outline-secondary" onClick={closePanel}>
          Cancelar
        </button>
      </>
    ) : (
      <>
        <button type="button" className="btn btn-primary flex-grow-1" onClick={() => void handleSaveCreate()}>
          <i className="mdi mdi-calendar-plus mr-1" />
          Crear junta
        </button>
        <button type="button" className="btn btn-outline-secondary" onClick={closePanel}>
          Cancelar
        </button>
      </>
    )

  return (
    <div className="cq-admin-page container-fluid py-4">
      {toggleError && (
        <div className="alert alert-danger py-2 small" role="alert">{toggleError}</div>
      )}

      <AdminListToolbar
        title="Juntas"
        metrics={heroStats}
        primaryAction={{
          label: 'Nueva junta',
          iconClass: 'mdi mdi-plus',
          onClick: openCreate,
        }}
      />

      <AdminSplitLayout
        panelOpen={panelOpen}
        tablePane={
          <div className="card">
            <div className="card-body pt-3">
              {loading && (
                <div className="placeholder-glow">
                  <span className="placeholder col-12 mb-2" />
                  <span className="placeholder col-10" />
                </div>
              )}

              {!loading && !error && juntas.length === 0 && (
                <div className="cq-empty-state">
                  <i className="mdi mdi-account-group-outline cq-empty-icon" />
                  <p className="cq-empty-title">Sin juntas registradas</p>
                  <p className="text-muted">Programa la primera asamblea desde el panel lateral.</p>
                </div>
              )}

              {!loading && !error && juntas.length > 0 && (
                <>
                <AdminFilterableTable
                  columns={JUNTAS_TABLE_COLUMNS}
                  columnFilters={columnFilters}
                  onColumnFilterChange={onColumnFilterChange}
                  globalSearch={globalSearch}
                  onGlobalSearchChange={setGlobalSearch}
                  filteredCount={filteredCount}
                  totalCount={totalCount}
                >
                  {filteredJuntas.length === 0 ? (
                    <tr>
                      <td colSpan={JUNTAS_TABLE_COLUMNS.length} className="text-center text-muted py-4">
                        Sin resultados para los filtros aplicados.
                      </td>
                    </tr>
                  ) : (
                    filteredJuntas.map((j) => (
                      <tr key={j.juntaId}>
                        <td className="min-w-0">
                          <strong className="text-break">{j.titulo}</strong>
                        </td>
                        <td className="tabular-nums">
                          {new Date(j.fechaProgramada).toLocaleString('es-MX', {
                            dateStyle: 'short',
                            timeStyle: 'short',
                          })}
                        </td>
                        <td>{j.ubicacion ?? '—'}</td>
                        <td>
                          <button
                            type="button"
                            className={`btn btn-sm ${j.activa ? 'btn-success' : 'btn-outline-secondary'}`}
                            onClick={() => void handleToggleActiva(j)}
                          >
                            {j.activa ? 'Activa' : 'Cerrada'}
                          </button>
                        </td>
                        <td className="text-center cq-actions">
                          <button
                            type="button"
                            className="btn btn-link btn-sm"
                            onClick={() => void openEdit(j)}
                            aria-label={`Editar ${j.titulo}`}
                          >
                            <i className="mdi mdi-pencil" />
                          </button>
                          <button
                            type="button"
                            className="btn btn-link btn-sm text-danger"
                            onClick={() => setDeleteTarget(j)}
                            aria-label={`Eliminar ${j.titulo}`}
                          >
                            <i className="mdi mdi-delete" />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </AdminFilterableTable>
                <AdminMobileCardList
                  rows={filteredJuntas}
                  getRowKey={(j) => j.juntaId}
                  renderCard={(j) => (
                    <JuntaAdminMobileCard
                      junta={j}
                      active={editingJunta?.juntaId === j.juntaId}
                      onEdit={(item) => void openEdit(item)}
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
            title={panelMode === 'edit' ? 'Editar junta' : 'Nueva junta'}
            subtitle={
              panelMode === 'edit'
                ? 'Actualiza datos, convocatoria y estado.'
                : 'Captura fecha, ubicación y convocatoria inicial.'
            }
            iconClass={panelMode === 'edit' ? 'mdi mdi-pencil' : 'mdi mdi-calendar-plus'}
            editing={panelMode === 'edit'}
            onClose={closePanel}
            footer={formFooter}
          >
            {formError && (
              <div className="alert alert-danger py-2 small" role="alert">
                {formError}
              </div>
            )}
            {panelMode === 'edit' && loadingDetalle && (
              <p className="text-muted small">Cargando detalle…</p>
            )}
            {panelMode === 'edit' ? (
              <>
                <div className="form-group mb-3">
                  <label className="cq-label" htmlFor="junta-edit-titulo">
                    <i className="mdi mdi-format-title" />
                    Título <span className="text-danger">*</span>
                  </label>
                  <input id="junta-edit-titulo" className="form-control" {...registerEdit('titulo')} />
                  {editErrors.titulo && (
                    <span className="text-danger small d-block">{editErrors.titulo.message}</span>
                  )}
                </div>
                <div className="form-group mb-3">
                  <label className="cq-label" htmlFor="junta-edit-descripcion">
                    <i className="mdi mdi-text" />
                    Descripción
                  </label>
                  <textarea
                    id="junta-edit-descripcion"
                    className="form-control"
                    rows={2}
                    {...registerEdit('descripcion')}
                  />
                </div>
                <div className="form-group mb-3">
                  <label className="cq-label" htmlFor="junta-edit-fecha">
                    <i className="mdi mdi-clock" />
                    Fecha y hora <span className="text-danger">*</span>
                  </label>
                  <input
                    id="junta-edit-fecha"
                    type="datetime-local"
                    className="form-control"
                    {...registerEdit('fechaProgramada')}
                  />
                  {editErrors.fechaProgramada && (
                    <span className="text-danger small d-block">{editErrors.fechaProgramada.message}</span>
                  )}
                </div>
                <div className="form-group mb-3">
                  <label className="cq-label" htmlFor="junta-edit-ubicacion">
                    <i className="mdi mdi-map-marker" />
                    Ubicación
                  </label>
                  <input id="junta-edit-ubicacion" className="form-control" {...registerEdit('ubicacion')} />
                </div>
                <div className="form-group mb-3">
                  <label className="cq-label" htmlFor="junta-edit-contenido">
                    <i className="mdi mdi-file-document" />
                    Convocatoria / acta
                  </label>
                  <textarea
                    id="junta-edit-contenido"
                    className="form-control"
                    rows={3}
                    {...registerEdit('contenido')}
                  />
                </div>
                <div className="form-check">
                  <input
                    id="junta-edit-activa"
                    type="checkbox"
                    className="form-check-input"
                    {...registerEdit('activa')}
                  />
                  <label className="form-check-label" htmlFor="junta-edit-activa">
                    Junta activa (visible para residentes)
                  </label>
                </div>
              </>
            ) : (
              <>
                <div className="form-group mb-3">
                  <label className="cq-label" htmlFor="junta-titulo">
                    <i className="mdi mdi-format-title" />
                    Título <span className="text-danger">*</span>
                  </label>
                  <input id="junta-titulo" className="form-control" {...registerCreate('titulo')} />
                  {createErrors.titulo && (
                    <span className="text-danger small d-block">{createErrors.titulo.message}</span>
                  )}
                </div>
                <div className="form-group mb-3">
                  <label className="cq-label" htmlFor="junta-descripcion">
                    <i className="mdi mdi-text" />
                    Descripción
                  </label>
                  <textarea id="junta-descripcion" className="form-control" rows={2} {...registerCreate('descripcion')} />
                </div>
                <div className="form-group mb-3">
                  <label className="cq-label" htmlFor="junta-fecha">
                    <i className="mdi mdi-clock" />
                    Fecha y hora <span className="text-danger">*</span>
                  </label>
                  <input
                    id="junta-fecha"
                    type="datetime-local"
                    className="form-control"
                    {...registerCreate('fechaProgramada')}
                  />
                  {createErrors.fechaProgramada && (
                    <span className="text-danger small d-block">{createErrors.fechaProgramada.message}</span>
                  )}
                </div>
                <div className="form-group mb-3">
                  <label className="cq-label" htmlFor="junta-ubicacion">
                    <i className="mdi mdi-map-marker" />
                    Ubicación
                  </label>
                  <input id="junta-ubicacion" className="form-control" {...registerCreate('ubicacion')} />
                </div>
                <div className="form-group mb-0">
                  <label className="cq-label" htmlFor="junta-contenido">
                    <i className="mdi mdi-file-document" />
                    Convocatoria / acta inicial
                  </label>
                  <textarea id="junta-contenido" className="form-control" rows={3} {...registerCreate('contenido')} />
                </div>
              </>
            )}
          </AdminSidePanel>
        }
      />

      <ConfirmDialog
        open={deleteTarget !== null}
        title="Eliminar junta"
        message={
          deleteTarget
            ? `¿Eliminar la junta "${deleteTarget.titulo}"? Esta acción no se puede deshacer.`
            : ''
        }
        confirmLabel="Eliminar"
        variant="danger"
        onCancel={() => setDeleteTarget(null)}
        onConfirm={() => void handleConfirmDelete()}
      />
      {deleteTarget && deleteError && (
        <div className="alert alert-danger mt-3" role="alert">{deleteError}</div>
      )}
    </div>
  )
}

import { zodResolver } from '@hookform/resolvers/zod'
import { useEffect, useMemo, useState } from 'react'
import { useForm } from 'react-hook-form'
import { Link, useNavigate } from 'react-router-dom'
import 'bootstrap/dist/css/bootstrap.min.css'
import '@mdi/font/css/materialdesignicons.min.css'
import '../styles/bootstrap-pantone.css'
import '../styles/cq-admin.css'
import {
  encuestaMetadataSchema,
  toDateInputValue,
  type EncuestaMetadataForm,
} from '../features/admin/encuestas/encuestasAdminSchemas'
import {
  ENCUESTAS_TABLE_ACCESSORS,
  ENCUESTAS_TABLE_COLUMNS,
} from '../features/admin/encuestas/encuestasTableFilter'
import { normalizeEncuestaDetalle } from '../features/admin/encuestas/encuestaMappers'
import { useEncuestasAdmin } from '../features/admin/encuestas/useEncuestasAdmin'
import {
  AdminFilterableTable,
  AdminListToolbar,
  AdminSidePanel,
  AdminSplitLayout,
  ConfirmDialog,
} from '../shared/components/admin'
import { useClientTableFilter } from '../shared/hooks/useClientTableFilter'
import { apiDelete, apiPost, apiPut } from '../shared/lib/apiClient'
import type { EncuestaDetalle, EncuestaListItem } from '../shared/types/encuestas'

type PanelMode = 'closed' | 'create' | 'edit'

export function AdminEncuestasPage() {
  const navigate = useNavigate()
  const { encuestas, loading, error, refetch } = useEncuestasAdmin()

  const [panelMode, setPanelMode] = useState<PanelMode>('closed')
  const [editTarget, setEditTarget] = useState<EncuestaListItem | null>(null)
  const [soloActivas, setSoloActivas] = useState(false)
  const [publishTarget, setPublishTarget] = useState<EncuestaListItem | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<EncuestaListItem | null>(null)
  const [publishError, setPublishError] = useState<string | null>(null)
  const [deleteError, setDeleteError] = useState<string | null>(null)
  const [formError, setFormError] = useState<string | null>(null)
  const [dismissedError, setDismissedError] = useState(false)

  const visibleEncuestas = useMemo(
    () => (soloActivas ? encuestas.filter((e) => e.activa) : encuestas),
    [encuestas, soloActivas],
  )

  const heroStats = useMemo(() => {
    const activas = encuestas.filter((e) => e.activa).length
    const conFechaFin = encuestas.filter((e) => e.fechaFin).length
    return [
      { label: 'Encuestas', value: encuestas.length },
      { label: 'Activas', value: activas },
      { label: 'Con fecha fin', value: conFechaFin },
    ]
  }, [encuestas])

  const {
    filteredRows: filteredEncuestas,
    globalSearch,
    setGlobalSearch,
    columnFilters,
    onColumnFilterChange,
    filteredCount,
    totalCount,
  } = useClientTableFilter(visibleEncuestas, ENCUESTAS_TABLE_COLUMNS, ENCUESTAS_TABLE_ACCESSORS)

  const metadataForm = useForm<EncuestaMetadataForm>({
    resolver: zodResolver(encuestaMetadataSchema),
    defaultValues: {
      titulo: '',
      descripcion: '',
      fechaInicio: new Date().toISOString().slice(0, 10),
      fechaFin: '',
    },
  })

  const panelOpen = panelMode !== 'closed'
  const { register, formState: { errors }, reset } = metadataForm

  const closePanel = () => {
    setPanelMode('closed')
    setEditTarget(null)
    setFormError(null)
  }

  const openCreate = () => {
    setFormError(null)
    setEditTarget(null)
    reset({
      titulo: '',
      descripcion: '',
      fechaInicio: new Date().toISOString().slice(0, 10),
      fechaFin: '',
    })
    setPanelMode('create')
  }

  const openEdit = (e: EncuestaListItem) => {
    if (e.activa) {
      setFormError('Solo puedes editar metadatos de encuestas en borrador.')
      return
    }
    setFormError(null)
    setEditTarget(e)
    reset({
      titulo: e.titulo,
      descripcion: e.descripcion ?? '',
      fechaInicio: toDateInputValue(e.fechaInicio),
      fechaFin: toDateInputValue(e.fechaFin),
    })
    setPanelMode('edit')
  }

  const buildMetadataBody = (data: EncuestaMetadataForm) => ({
    titulo: data.titulo,
    descripcion: data.descripcion.trim() || undefined,
    fechaInicio: data.fechaInicio,
    fechaFin: data.fechaFin || undefined,
  })

  const saveNewEncuesta = (goToQuestions: boolean) =>
    metadataForm.handleSubmit(async (data) => {
      setFormError(null)
      const body = {
        ...buildMetadataBody(data),
        preguntas: [] as [],
      }

      const { data: created, problem, status } = await apiPost<EncuestaDetalle>('/ENC/Encuestas', body)
      if (problem) {
        setFormError(problem.detail ?? `Error ${status}`)
        return
      }
      closePanel()
      const newId = created ? normalizeEncuestaDetalle(created).encuestaId : undefined
      if (!newId || newId <= 0) {
        setFormError('La encuesta se guardó pero no se recibió el identificador.')
        await refetch()
        return
      }
      if (goToQuestions) {
        navigate(`/admin/encuestas/${newId}`)
        return
      }
      await refetch()
    })

  const saveEditEncuesta = metadataForm.handleSubmit(async (data) => {
    if (!editTarget) return
    setFormError(null)
    const { problem, status } = await apiPut(
      `/ENC/Encuestas/${editTarget.encuestaId}`,
      buildMetadataBody(data),
    )
    if (problem) {
      setFormError(problem.detail ?? `Error ${status}`)
      return
    }
    closePanel()
    await refetch()
  })

  const handleConfirmPublish = async () => {
    if (!publishTarget) return
    setPublishError(null)
    const { problem, status } = await apiPut(`/ENC/Encuestas/${publishTarget.encuestaId}/publicar`, {})
    if (problem) {
      setPublishError(problem.detail ?? `Error ${status}`)
      return
    }
    setPublishTarget(null)
    await refetch()
  }

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return
    setDeleteError(null)
    const { problem, status } = await apiDelete(`/ENC/Encuestas/${deleteTarget.encuestaId}`)
    if (problem) {
      setDeleteError(problem.detail ?? `Error ${status}`)
      return
    }
    setDeleteTarget(null)
    await refetch()
  }

  useEffect(() => {
    if (!publishTarget) setPublishError(null)
  }, [publishTarget])

  useEffect(() => {
    if (error) setDismissedError(false)
  }, [error])

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
        <button type="button" className="btn btn-primary flex-grow-1" onClick={() => void saveEditEncuesta()}>
          <i className="mdi mdi-content-save mr-1" />
          Guardar cambios
        </button>
        <button type="button" className="btn btn-outline-secondary" onClick={closePanel}>
          Cancelar
        </button>
      </>
    ) : (
      <>
        <button
          type="button"
          className="btn btn-primary flex-grow-1"
          onClick={() => void saveNewEncuesta(true)()}
        >
          <i className="mdi mdi-help-circle-outline mr-1" />
          Guardar y agregar preguntas
        </button>
        <button type="button" className="btn btn-outline-primary" onClick={() => void saveNewEncuesta(false)()}>
          <i className="mdi mdi-content-save mr-1" />
          Solo guardar
        </button>
        <button type="button" className="btn btn-outline-secondary" onClick={closePanel}>
          Cancelar
        </button>
      </>
    )

  return (
    <div className="cq-admin-page container-fluid py-4">
      {error && !dismissedError && (
        <div className="alert alert-danger alert-dismissible fade show" role="alert">
          <i className="mdi mdi-alert-circle mr-1" />
          {error}
          <button type="button" className="btn-close" aria-label="Cerrar" onClick={() => setDismissedError(true)} />
        </div>
      )}
      {publishError && (
        <div className="alert alert-danger py-2 small" role="alert">{publishError}</div>
      )}
      {deleteError && (
        <div className="alert alert-danger py-2 small" role="alert">{deleteError}</div>
      )}

      <AdminListToolbar
        title="Encuestas"
        metrics={heroStats}
        filterSlot={
          <label className="form-check form-check-inline mb-0 small">
            <input
              type="checkbox"
              className="form-check-input"
              checked={soloActivas}
              onChange={(e) => setSoloActivas(e.target.checked)}
            />
            <span className="form-check-label">Solo activas</span>
          </label>
        }
        primaryAction={{
          label: 'Nueva encuesta',
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

              {!loading && !error && visibleEncuestas.length === 0 && (
                <div className="cq-empty-state">
                  <i className="mdi mdi-poll cq-empty-icon" />
                  <p className="cq-empty-title">No hay encuestas registradas</p>
                  <p className="text-muted">
                    {soloActivas ? 'No hay encuestas activas con el filtro actual.' : 'Crea un borrador y publícalo cuando esté listo.'}
                  </p>
                </div>
              )}

              {!loading && !error && visibleEncuestas.length > 0 && (
                <AdminFilterableTable
                  columns={ENCUESTAS_TABLE_COLUMNS}
                  columnFilters={columnFilters}
                  onColumnFilterChange={onColumnFilterChange}
                  globalSearch={globalSearch}
                  onGlobalSearchChange={setGlobalSearch}
                  filteredCount={filteredCount}
                  totalCount={totalCount}
                >
                  {filteredEncuestas.length === 0 ? (
                    <tr>
                      <td colSpan={ENCUESTAS_TABLE_COLUMNS.length} className="text-center text-muted py-4">
                        Sin resultados para los filtros aplicados.
                      </td>
                    </tr>
                  ) : (
                    filteredEncuestas.map((e) => (
                      <tr key={e.encuestaId}>
                        <td className="min-w-0 font-medium text-break">{e.titulo}</td>
                        <td className="tabular-nums">{new Date(e.fechaInicio).toLocaleDateString('es-MX')}</td>
                        <td className="tabular-nums">
                          {e.fechaFin ? new Date(e.fechaFin).toLocaleDateString('es-MX') : '—'}
                        </td>
                        <td>
                          <span className={`badge ${e.activa ? 'bg-success' : 'bg-secondary'}`}>
                            {e.activa ? 'Activa' : 'Borrador'}
                          </span>
                        </td>
                        <td className="cq-actions text-center">
                          <Link
                            to={`/admin/encuestas/${e.encuestaId}`}
                            className="btn btn-link btn-sm"
                            title="Preguntas"
                            aria-label={`Preguntas de ${e.titulo}`}
                          >
                            <i className="mdi mdi-format-list-bulleted" />
                          </Link>
                          {!e.activa && (
                            <button
                              type="button"
                              className="btn btn-link btn-sm"
                              onClick={() => openEdit(e)}
                              aria-label={`Editar metadatos de ${e.titulo}`}
                            >
                              <i className="mdi mdi-pencil" />
                            </button>
                          )}
                          {!e.activa && (
                            <button
                              type="button"
                              className="btn btn-link btn-sm text-danger"
                              onClick={() => setDeleteTarget(e)}
                              aria-label={`Eliminar ${e.titulo}`}
                            >
                              <i className="mdi mdi-delete" />
                            </button>
                          )}
                          {!e.activa && (
                            <button
                              type="button"
                              className="btn btn-link btn-sm"
                              onClick={() => setPublishTarget(e)}
                              aria-label={`Publicar ${e.titulo}`}
                            >
                              Publicar
                            </button>
                          )}
                          <Link
                            to={`/admin/encuestas/${e.encuestaId}/resultados`}
                            className="btn btn-link btn-sm"
                            title="Resultados"
                          >
                            <i className="mdi mdi-chart-bar" />
                          </Link>
                        </td>
                      </tr>
                    ))
                  )}
                </AdminFilterableTable>
              )}
            </div>
          </div>
        }
        formPane={
          <AdminSidePanel
            visible={panelOpen}
            title={panelMode === 'edit' ? 'Editar encuesta' : 'Nueva encuesta'}
            subtitle={
              panelMode === 'edit'
                ? 'Metadatos del borrador (título, descripción, fechas).'
                : 'Paso 1: título y fechas. Luego usa «Guardar y agregar preguntas».'
            }
            iconClass={panelMode === 'edit' ? 'mdi mdi-pencil' : 'mdi mdi-poll'}
            editing={panelMode === 'edit'}
            onClose={closePanel}
            footer={formFooter}
          >
            {formError && (
              <div className="alert alert-danger py-2 small" role="alert">
                {formError}
              </div>
            )}
            <div className="form-group mb-3">
              <label className="cq-label" htmlFor="enc-titulo">
                <i className="mdi mdi-format-title" />
                Título <span className="text-danger">*</span>
              </label>
              <input id="enc-titulo" className="form-control" {...register('titulo')} />
              {errors.titulo && <span className="text-danger small d-block">{errors.titulo.message}</span>}
            </div>
            <div className="form-group mb-3">
              <label className="cq-label" htmlFor="enc-descripcion">
                <i className="mdi mdi-text" />
                Descripción
              </label>
              <input id="enc-descripcion" className="form-control" {...register('descripcion')} />
            </div>
            <div className="row">
              <div className="col-md-6 form-group mb-3">
                <label className="cq-label" htmlFor="enc-inicio">
                  <i className="mdi mdi-calendar-start" />
                  Fecha inicio <span className="text-danger">*</span>
                </label>
                <input id="enc-inicio" type="date" className="form-control" {...register('fechaInicio')} />
                {errors.fechaInicio && (
                  <span className="text-danger small d-block">{errors.fechaInicio.message}</span>
                )}
              </div>
              <div className="col-md-6 form-group mb-3">
                <label className="cq-label" htmlFor="enc-fin">
                  <i className="mdi mdi-calendar-end" />
                  Fecha fin
                </label>
                <input id="enc-fin" type="date" className="form-control" {...register('fechaFin')} />
              </div>
            </div>
          </AdminSidePanel>
        }
      />

      <ConfirmDialog
        open={publishTarget !== null}
        title="Publicar encuesta"
        message={
          publishTarget
            ? `¿Publicar "${publishTarget.titulo}"? Debe tener al menos una pregunta. No podrás editarla después.`
            : ''
        }
        confirmLabel="Publicar"
        variant="default"
        onCancel={() => setPublishTarget(null)}
        onConfirm={() => void handleConfirmPublish()}
      />

      <ConfirmDialog
        open={deleteTarget !== null}
        title="Eliminar encuesta"
        message={
          deleteTarget
            ? `¿Eliminar el borrador "${deleteTarget.titulo}"? Esta acción no se puede deshacer.`
            : ''
        }
        confirmLabel="Eliminar"
        variant="danger"
        onCancel={() => setDeleteTarget(null)}
        onConfirm={() => void handleConfirmDelete()}
      />
    </div>
  )
}

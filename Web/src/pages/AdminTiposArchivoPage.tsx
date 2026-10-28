import { zodResolver } from '@hookform/resolvers/zod'
import { useEffect, useMemo, useState } from 'react'
import { useForm } from 'react-hook-form'
import { Link } from 'react-router-dom'
import 'bootstrap/dist/css/bootstrap.min.css'
import '@mdi/font/css/materialdesignicons.min.css'
import '../styles/bootstrap-pantone.css'
import '../styles/cq-admin.css'
import {
  tipoArchivoUpsertSchema,
  type TipoArchivoUpsertForm,
} from '../features/admin/archivos/tiposArchivoAdminSchemas'
import { TipoArchivoAdminMobileCard } from '../features/admin/archivos/TipoArchivoAdminMobileCard'
import {
  TIPOS_ARCHIVO_TABLE_ACCESSORS,
  TIPOS_ARCHIVO_TABLE_COLUMNS,
} from '../features/admin/archivos/tiposArchivoTableFilter'
import { useTiposArchivo } from '../features/admin/archivos/useTiposArchivo'
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
import { apiDelete, apiPost, apiPut, type ApiProblem } from '../shared/lib/apiClient'
import type { TipoArchivoItem } from '../shared/types/archivos'

function mapTipoProblem(problem: ApiProblem | undefined, status: number) {
  if (status === 405) {
    return 'El API no acepta crear tipos (405). Detén y vuelve a ejecutar GraphApi (dotnet run) para cargar los endpoints nuevos.'
  }
  if (problem?.code === 'TIPO_DUPLICADO') return 'Ya existe un tipo con ese nombre.'
  return problem?.detail ?? `Error ${status}`
}

export function AdminTiposArchivoPage() {
  const { tipos, loading, error, refetch } = useTiposArchivo()
  useQueryErrorToast(error)

  const [panelOpen, setPanelOpen] = useState(false)
  const [editing, setEditing] = useState<TipoArchivoItem | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<TipoArchivoItem | null>(null)
  const [formError, setFormError] = useState<string | null>(null)
  const [deleteError, setDeleteError] = useState<string | null>(null)
  const toast = useToast()

  const metrics = useMemo(
    () => [{ label: 'Tipos', value: tipos.length }],
    [tipos.length],
  )

  const {
    filteredRows,
    globalSearch,
    setGlobalSearch,
    columnFilters,
    onColumnFilterChange,
    filteredCount,
    totalCount,
  } = useClientTableFilter(tipos, TIPOS_ARCHIVO_TABLE_COLUMNS, TIPOS_ARCHIVO_TABLE_ACCESSORS)

  const form = useForm<TipoArchivoUpsertForm>({
    resolver: zodResolver(tipoArchivoUpsertSchema),
    defaultValues: { tipoArchivo: '' },
  })

  const { register, formState: { errors }, reset, handleSubmit } = form

  const openCreate = () => {
    setEditing(null)
    setFormError(null)
    reset({ tipoArchivo: '' })
    setPanelOpen(true)
  }

  const openEdit = (row: TipoArchivoItem) => {
    setEditing(row)
    setFormError(null)
    reset({ tipoArchivo: row.tipoArchivo })
    setPanelOpen(true)
  }

  const closePanel = () => {
    setPanelOpen(false)
    setEditing(null)
    setFormError(null)
  }

  const onSave = handleSubmit(async (values) => {
    setFormError(null)
    if (editing) {
      const id = editing.tipoArchivoId
      if (!id) {
        setFormError('No se pudo identificar el tipo. Recarga la página.')
        return
      }
      const { problem, status } = await apiPut(`/ARC/TiposArchivo/${id}`, {
        tipoArchivo: values.tipoArchivo,
      })
      if (problem) {
        setFormError(mapTipoProblem(problem, status))
        return
      }
    } else {
      const { problem, status } = await apiPost('/ARC/TiposArchivo', {
        tipoArchivo: values.tipoArchivo,
      })
      if (problem) {
        setFormError(mapTipoProblem(problem, status))
        return
      }
    }
    closePanel()
    toast.success(editing ? 'Tipo actualizado' : 'Tipo creado')
    await refetch()
  })

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return
    setDeleteError(null)
    const { problem, status } = await apiDelete(`/ARC/TiposArchivo/${deleteTarget.tipoArchivoId}`)
    if (problem) {
      setDeleteError(problem.detail ?? `No se pudo eliminar (${status})`)
      return
    }
    setDeleteTarget(null)
    toast.success('Tipo eliminado')
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

  const formFooter = (
    <>
      <button type="button" className="btn btn-primary flex-grow-1" onClick={() => void onSave()}>
        <i className="mdi mdi-content-save mr-1" />
        {editing ? 'Guardar' : 'Crear'}
      </button>
      <button type="button" className="btn btn-outline-secondary" onClick={closePanel}>
        Cancelar
      </button>
    </>
  )

  return (
    <div className="cq-admin-page container-fluid py-4">
      <div className="mb-2">
        <Link to="/admin/archivos" className="btn btn-link btn-sm px-0">
          <i className="mdi mdi-arrow-left" /> Volver a archivos
        </Link>
      </div>

      <AdminListToolbar
        title="Tipos de documento"
        metrics={metrics}
        primaryAction={{
          label: 'Nuevo tipo',
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
                  <span className="placeholder col-8" />
                </div>
              )}

              {!loading && !error && tipos.length === 0 && (
                <div className="cq-empty-state">
                  <i className="mdi mdi-tag-outline cq-empty-icon" />
                  <p className="cq-empty-title">No hay tipos de documento</p>
                  <p className="text-muted">Crea al menos uno para poder subir archivos.</p>
                  <button type="button" className="btn btn-primary btn-sm" onClick={openCreate}>
                    Crear tipo
                  </button>
                </div>
              )}

              {!loading && !error && tipos.length > 0 && (
                <>
                <AdminFilterableTable
                  columns={TIPOS_ARCHIVO_TABLE_COLUMNS}
                  columnFilters={columnFilters}
                  onColumnFilterChange={onColumnFilterChange}
                  globalSearch={globalSearch}
                  onGlobalSearchChange={setGlobalSearch}
                  filteredCount={filteredCount}
                  totalCount={totalCount}
                >
                  {filteredRows.length === 0 ? (
                    <tr>
                      <td colSpan={2} className="text-center text-muted py-4">
                        Sin resultados para los filtros aplicados.
                      </td>
                    </tr>
                  ) : (
                    filteredRows.map((t) => (
                      <tr key={t.tipoArchivoId}>
                        <td className="min-w-0 text-break">{t.tipoArchivo}</td>
                        <td className="text-center cq-actions">
                          <button
                            type="button"
                            className="btn btn-link btn-sm"
                            onClick={() => openEdit(t)}
                            aria-label={`Editar ${t.tipoArchivo}`}
                          >
                            <i className="mdi mdi-pencil" />
                          </button>
                          <button
                            type="button"
                            className="btn btn-link btn-sm text-danger"
                            onClick={() => setDeleteTarget(t)}
                            aria-label={`Eliminar ${t.tipoArchivo}`}
                          >
                            <i className="mdi mdi-delete" />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </AdminFilterableTable>
                <AdminMobileCardList
                  rows={filteredRows}
                  getRowKey={(t) => t.tipoArchivoId}
                  renderCard={(t) => (
                    <TipoArchivoAdminMobileCard
                      tipo={t}
                      active={editing?.tipoArchivoId === t.tipoArchivoId}
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
            title={editing ? 'Editar tipo' : 'Nuevo tipo'}
            subtitle="Nombre visible en el combo al subir archivos."
            iconClass="mdi mdi-tag"
            editing={Boolean(editing)}
            onClose={closePanel}
            footer={formFooter}
          >
            {formError && (
              <div className="alert alert-danger py-2 small" role="alert">
                {formError}
              </div>
            )}
            <div className="form-group mb-0">
              <label className="cq-label" htmlFor="tipo-archivo-nombre">
                <i className="mdi mdi-format-title" />
                Nombre <span className="text-danger">*</span>
              </label>
              <input id="tipo-archivo-nombre" className="form-control" {...register('tipoArchivo')} />
              {errors.tipoArchivo && (
                <span className="text-danger small d-block">{errors.tipoArchivo.message}</span>
              )}
            </div>
          </AdminSidePanel>
        }
      />

      <ConfirmDialog
        open={deleteTarget !== null}
        title="Eliminar tipo"
        message={
          deleteTarget
            ? `¿Eliminar el tipo "${deleteTarget.tipoArchivo}"? Los archivos ya subidos conservan su clasificación.`
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

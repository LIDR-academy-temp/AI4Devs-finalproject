import { zodResolver } from '@hookform/resolvers/zod'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import 'bootstrap/dist/css/bootstrap.min.css'
import '@mdi/font/css/materialdesignicons.min.css'
import '../styles/bootstrap-pantone.css'
import '../styles/cq-admin.css'
import { ArchivoAdminMobileCard } from '../features/admin/archivos/ArchivoAdminMobileCard'
import {
  ARCHIVOS_TABLE_ACCESSORS,
  ARCHIVOS_TABLE_COLUMNS,
} from '../features/admin/archivos/archivosTableFilter'
import { mapArchivoUploadHttpError } from '../features/admin/archivos/archivoUploadErrors'
import { AdminTiposArchivoSection } from '../features/admin/archivos/AdminTiposArchivoSection'
import {
  archivoEditSchema,
  archivoUploadSchema,
  type ArchivoEditForm,
  type ArchivoUploadForm,
} from '../features/admin/archivos/archivosAdminSchemas'
import { useTiposArchivo } from '../features/admin/archivos/useTiposArchivo'
import { formatArchivoFecha } from '../features/archivos/archivoMappers'
import { useArchivos } from '../features/archivos/useArchivos'
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
import { apiPut } from '../shared/lib/apiClient'
import { getAccessToken } from '../shared/lib/accessTokenStore'
import type { ArchivoListItem } from '../shared/types/archivos'

const API = import.meta.env.VITE_API_URL as string

function authHeaders(): Record<string, string> {
  const token = getAccessToken()
  return token ? { Authorization: `Bearer ${token}` } : {}
}

export function AdminArchivosPage() {
  const [searchParams] = useSearchParams()
  const initialTab = searchParams.get('tab') === 'tipos' ? 'tipos' : 'archivos'
  const [tab, setTab] = useState<'archivos' | 'tipos'>(initialTab)
  const { archivos, loading, error, refetch } = useArchivos()
  const { tipos, loading: tiposLoading, refetch: refetchTipos } = useTiposArchivo()

  type PanelMode = 'closed' | 'upload' | 'edit'
  const [panelMode, setPanelMode] = useState<PanelMode>('closed')
  const [editingArchivo, setEditingArchivo] = useState<ArchivoListItem | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<ArchivoListItem | null>(null)
  const [deleteError, setDeleteError] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const toast = useToast()
  useQueryErrorToast(error)

  const heroStats = useMemo(() => {
    const privados = archivos.filter((a) => a.esPrivado).length
    return [
      { label: 'Archivos', value: archivos.length },
      { label: 'Públicos', value: archivos.length - privados },
      { label: 'Privados', value: privados },
    ]
  }, [archivos])

  const {
    filteredRows: filteredArchivos,
    globalSearch,
    setGlobalSearch,
    columnFilters,
    onColumnFilterChange,
    filteredCount,
    totalCount,
  } = useClientTableFilter(archivos, ARCHIVOS_TABLE_COLUMNS, ARCHIVOS_TABLE_ACCESSORS)

  const uploadForm = useForm<ArchivoUploadForm>({
    resolver: zodResolver(archivoUploadSchema),
    defaultValues: { nombre: '', tipoArchivo: '', esPrivado: false },
  })

  const editForm = useForm<ArchivoEditForm>({
    resolver: zodResolver(archivoEditSchema),
    defaultValues: { nombre: '', tipoArchivo: '', esPrivado: false },
  })

  const {
    register: registerUpload,
    formState: { errors: uploadErrors },
    reset: resetUpload,
    watch: watchUpload,
  } = uploadForm
  const esPrivadoUpload = watchUpload('esPrivado')

  const {
    register: registerEdit,
    formState: { errors: editErrors },
    reset: resetEdit,
    watch: watchEdit,
  } = editForm
  const esPrivadoEdit = watchEdit('esPrivado')

  const panelOpen = panelMode !== 'closed'

  const closePanel = () => {
    setPanelMode('closed')
    setEditingArchivo(null)
    setFormError(null)
  }

  const openUpload = () => {
    setEditingArchivo(null)
    setFormError(null)
    resetUpload({ nombre: '', tipoArchivo: '', esPrivado: false })
    if (fileRef.current) fileRef.current.value = ''
    setPanelMode('upload')
  }

  const openEdit = (archivo: ArchivoListItem) => {
    setFormError(null)
    setEditingArchivo(archivo)
    resetEdit({
      nombre: archivo.nombre,
      tipoArchivo: archivo.tipoArchivo,
      esPrivado: archivo.esPrivado,
    })
    setPanelMode('edit')
  }

  const handleSubir = uploadForm.handleSubmit(async (values) => {
    const file = fileRef.current?.files?.[0]
    if (!file) {
      setFormError('Selecciona un archivo.')
      return
    }
    setSubmitting(true)
    setFormError(null)
    try {
      const fd = new FormData()
      fd.append('archivo', file)
      fd.append('nombre', values.nombre || file.name)
      fd.append('tipoArchivo', values.tipoArchivo)
      fd.append('esPrivado', String(values.esPrivado))

      const res = await fetch(`${API}/ARC/Archivos`, {
        method: 'POST',
        headers: authHeaders(),
        credentials: 'include',
        body: fd,
      })
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { detail?: string }
        setFormError(mapArchivoUploadHttpError(res.status, body.detail))
        return
      }
      closePanel()
      toast.success('Archivo subido')
      await refetch()
    } catch {
      setFormError('Error al subir el archivo.')
    } finally {
      setSubmitting(false)
    }
  })

  const handleGuardarEdicion = editForm.handleSubmit(async (values) => {
    if (!editingArchivo?.archivoId) {
      setFormError('No se pudo identificar el archivo.')
      return
    }
    setSubmitting(true)
    setFormError(null)
    const { problem, status } = await apiPut(`/ARC/Archivos/${editingArchivo.archivoId}`, {
      nombre: values.nombre,
      tipoArchivo: values.tipoArchivo,
      esPrivado: values.esPrivado,
    })
    setSubmitting(false)
    if (problem) {
      setFormError(problem.detail ?? `Error ${status}`)
      return
    }
    closePanel()
    toast.success('Archivo actualizado')
    await refetch()
  })

  const handleDescargar = (archivoId: number, nombre: string) => {
    void fetch(`${API}/ARC/Archivos/${archivoId}/descargar`, {
      headers: authHeaders(),
      credentials: 'include',
    })
      .then((r) => r.blob())
      .then((blob) => {
        const a = document.createElement('a')
        a.href = URL.createObjectURL(blob)
        a.download = nombre
        a.click()
      })
  }

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return
    setDeleteError(null)
    const res = await fetch(`${API}/ARC/Archivos/${deleteTarget.archivoId}`, {
      method: 'DELETE',
      headers: authHeaders(),
      credentials: 'include',
    })
    if (!res.ok) {
      const body = (await res.json().catch(() => ({}))) as { detail?: string }
      setDeleteError(body.detail ?? `No se pudo eliminar (${res.status})`)
      return
    }
    setDeleteTarget(null)
    toast.success('Archivo eliminado')
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
          disabled={submitting}
          onClick={() => void handleGuardarEdicion()}
        >
          <i className="mdi mdi-content-save mr-1" />
          {submitting ? 'Guardando…' : 'Guardar'}
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
          disabled={submitting}
          onClick={() => void handleSubir()}
        >
          <i className="mdi mdi-upload mr-1" />
          {submitting ? 'Subiendo…' : 'Subir'}
        </button>
        <button type="button" className="btn btn-outline-secondary" onClick={closePanel}>
          Cancelar
        </button>
      </>
    )

  return (
    <div className="cq-admin-page container-fluid py-4">
      <ul className="nav nav-tabs mb-3 cq-admin-tabs">
        <li className="nav-item">
          <button
            type="button"
            className={`nav-link ${tab === 'archivos' ? 'active' : ''}`}
            onClick={() => {
              closePanel()
              setTab('archivos')
            }}
          >
            Archivos
          </button>
        </li>
        <li className="nav-item">
          <button
            type="button"
            className={`nav-link ${tab === 'tipos' ? 'active' : ''}`}
            onClick={() => {
              closePanel()
              setTab('tipos')
            }}
          >
            Tipos de documento
          </button>
        </li>
      </ul>

      {tab === 'tipos' && (
        <>
          <AdminListToolbar
            title="Tipos de documento"
            metrics={[{ label: 'Tipos', value: tipos.length }]}
          />
          <AdminTiposArchivoSection
            tipos={tipos}
            loading={tiposLoading}
            onReload={async () => {
              await refetchTipos()
              await refetch()
            }}
          />
        </>
      )}

      {tab === 'archivos' && (
      <>
      <AdminListToolbar
        title="Archivos"
        metrics={heroStats}
        primaryAction={{
          label: 'Subir archivo',
          iconClass: 'mdi mdi-upload',
          onClick: openUpload,
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

              {!loading && !error && archivos.length === 0 && (
                <div className="cq-empty-state">
                  <i className="mdi mdi-folder-open-outline cq-empty-icon" />
                  <p className="cq-empty-title">No hay archivos</p>
                  <p className="text-muted">Sube el primer documento desde el panel lateral.</p>
                </div>
              )}

              {!loading && !error && archivos.length > 0 && (
                <>
                <AdminFilterableTable
                  columns={ARCHIVOS_TABLE_COLUMNS}
                  columnFilters={columnFilters}
                  onColumnFilterChange={onColumnFilterChange}
                  globalSearch={globalSearch}
                  onGlobalSearchChange={setGlobalSearch}
                  filteredCount={filteredCount}
                  totalCount={totalCount}
                >
                  {filteredArchivos.length === 0 ? (
                    <tr>
                      <td colSpan={ARCHIVOS_TABLE_COLUMNS.length} className="text-center text-muted py-4">
                        Sin resultados para los filtros aplicados.
                      </td>
                    </tr>
                  ) : (
                    filteredArchivos.map((a) => (
                      <tr key={a.archivoId}>
                        <td className="min-w-0 text-break">{a.nombre}</td>
                        <td>{a.tipoArchivo}</td>
                        <td>
                          {a.esPrivado ? (
                            <span className="badge bg-warning text-dark">Privado</span>
                          ) : (
                            <span className="badge bg-success">Público</span>
                          )}
                        </td>
                        <td className="tabular-nums">{formatArchivoFecha(a.fechaCreacion)}</td>
                        <td className="text-center cq-actions">
                          <button
                            type="button"
                            className="btn btn-link btn-sm"
                            onClick={() => openEdit(a)}
                            aria-label={`Editar ${a.nombre}`}
                          >
                            <i className="mdi mdi-pencil" />
                          </button>
                          <button
                            type="button"
                            className="btn btn-link btn-sm"
                            onClick={() => handleDescargar(a.archivoId, a.nombre)}
                            aria-label={`Descargar ${a.nombre}`}
                          >
                            <i className="mdi mdi-download" />
                          </button>
                          <button
                            type="button"
                            className="btn btn-link btn-sm text-danger"
                            onClick={() => setDeleteTarget(a)}
                            aria-label={`Eliminar ${a.nombre}`}
                          >
                            <i className="mdi mdi-delete" />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </AdminFilterableTable>
                <AdminMobileCardList
                  rows={filteredArchivos}
                  getRowKey={(a) => a.archivoId}
                  renderCard={(a) => (
                    <ArchivoAdminMobileCard
                      archivo={a}
                      active={editingArchivo?.archivoId === a.archivoId}
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
            title={panelMode === 'edit' ? 'Editar archivo' : 'Subir archivo'}
            subtitle={
              panelMode === 'edit'
                ? 'Nombre, tipo y visibilidad. El archivo físico no se reemplaza.'
                : 'PDF, imagen o Word. Máximo 5 MB.'
            }
            iconClass={panelMode === 'edit' ? 'mdi mdi-pencil' : 'mdi mdi-upload'}
            editing={panelMode === 'edit'}
            onClose={closePanel}
            footer={formFooter}
          >
            {formError && (
              <div className="alert alert-danger py-2 small" role="alert">
                {formError}
              </div>
            )}
            {panelMode === 'upload' && (
              <div className="form-group mb-3">
                <label className="cq-label" htmlFor="archivo-file">
                  <i className="mdi mdi-file" />
                  Archivo <span className="text-danger">*</span>
                </label>
                <input
                  id="archivo-file"
                  ref={fileRef}
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png,.webp,.doc,.docx"
                  className="form-control"
                />
              </div>
            )}
            {panelMode === 'edit' ? (
              <>
                <div className="form-group mb-3">
                  <label className="cq-label" htmlFor="archivo-edit-nombre">
                    <i className="mdi mdi-format-title" />
                    Nombre descriptivo <span className="text-danger">*</span>
                  </label>
                  <input id="archivo-edit-nombre" className="form-control" {...registerEdit('nombre')} />
                  {editErrors.nombre && (
                    <span className="text-danger small d-block">{editErrors.nombre.message}</span>
                  )}
                </div>
                <div className="form-group mb-3">
                  <label className="cq-label" htmlFor="archivo-edit-tipo">
                    <i className="mdi mdi-tag" />
                    Tipo <span className="text-danger">*</span>
                  </label>
                  <select id="archivo-edit-tipo" className="form-control" {...registerEdit('tipoArchivo')}>
                    <option value="">Selecciona…</option>
                    {tipos.map((t) => (
                      <option key={t.tipoArchivoId} value={t.tipoArchivo}>
                        {t.tipoArchivo}
                      </option>
                    ))}
                  </select>
                  {editErrors.tipoArchivo && (
                    <span className="text-danger small d-block">{editErrors.tipoArchivo.message}</span>
                  )}
                </div>
                <div className="form-check">
                  <input
                    id="archivo-edit-privado"
                    type="checkbox"
                    className="form-check-input"
                    {...registerEdit('esPrivado')}
                  />
                  <label className="form-check-label" htmlFor="archivo-edit-privado">
                    Archivo privado
                  </label>
                </div>
                {esPrivadoEdit && (
                  <p className="text-muted small mt-2 mb-0">Solo administradores podrán descargarlo.</p>
                )}
              </>
            ) : (
              <>
                <div className="form-group mb-3">
                  <label className="cq-label" htmlFor="archivo-nombre">
                    <i className="mdi mdi-format-title" />
                    Nombre descriptivo
                  </label>
                  <input id="archivo-nombre" className="form-control" {...registerUpload('nombre')} />
                </div>
                <div className="form-group mb-3">
                  <label className="cq-label" htmlFor="archivo-tipo">
                    <i className="mdi mdi-tag" />
                    Tipo <span className="text-danger">*</span>
                  </label>
                  <select id="archivo-tipo" className="form-control" {...registerUpload('tipoArchivo')}>
                    <option value="">Selecciona…</option>
                    {tipos.map((t) => (
                      <option key={t.tipoArchivoId} value={t.tipoArchivo}>
                        {t.tipoArchivo}
                      </option>
                    ))}
                  </select>
                  {tipos.length === 0 && (
                    <p className="text-muted small mt-1 mb-0">
                      No hay tipos.{' '}
                      <button type="button" className="btn btn-link btn-sm p-0 align-baseline" onClick={() => setTab('tipos')}>
                        Crear tipos de documento
                      </button>
                    </p>
                  )}
                  {uploadErrors.tipoArchivo && (
                    <span className="text-danger small d-block">{uploadErrors.tipoArchivo.message}</span>
                  )}
                </div>
                <div className="form-check">
                  <input
                    id="archivo-privado"
                    type="checkbox"
                    className="form-check-input"
                    {...registerUpload('esPrivado')}
                  />
                  <label className="form-check-label" htmlFor="archivo-privado">
                    Archivo privado
                  </label>
                </div>
                {esPrivadoUpload && (
                  <p className="text-muted small mt-2 mb-0">Solo administradores podrán descargarlo.</p>
                )}
              </>
            )}
          </AdminSidePanel>
        }
      />

      <ConfirmDialog
        open={deleteTarget !== null}
        title="Eliminar archivo"
        message={
          deleteTarget
            ? `¿Eliminar "${deleteTarget.nombre}"? Esta acción no se puede deshacer.`
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
      </>
      )}
    </div>
  )
}

import { zodResolver } from '@hookform/resolvers/zod'
import { useEffect, useMemo, useState } from 'react'
import { useForm } from 'react-hook-form'
import 'bootstrap/dist/css/bootstrap.min.css'
import '@mdi/font/css/materialdesignicons.min.css'
import '../styles/bootstrap-pantone.css'
import '../styles/cq-admin.css'
import {
  anuncioFormSchema,
  vigenteHastaToIso,
  type AnuncioForm,
} from '../features/admin/anuncios/anunciosAdminSchemas'
import { AnuncioAdminMobileCard } from '../features/admin/anuncios/AnuncioAdminMobileCard'
import {
  ANUNCIOS_TABLE_ACCESSORS,
  ANUNCIOS_TABLE_COLUMNS,
} from '../features/admin/anuncios/anunciosTableFilter'
import {
  actualizarAnuncio,
  crearAnuncio,
  eliminarAnuncio,
  useAnunciosAdmin,
  useTiposAnuncio,
} from '../features/anuncios/useAnuncios'
import { AdminTiposAnuncioSection } from '../features/admin/anuncios/AdminTiposAnuncioSection'
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
import type { AnuncioItem } from '../shared/types/anuncios'

function formatVigencia(iso: string | null | undefined) {
  return iso ? new Date(iso).toLocaleDateString('es-MX') : '—'
}

export function AdminAnunciosPage() {
  const { data, loading, error, refetch } = useAnunciosAdmin()
  const { tipos, loading: tiposLoading, reload: reloadTipos } = useTiposAnuncio()
  const [tab, setTab] = useState<'anuncios' | 'tipos'>('anuncios')

  const [createOpen, setCreateOpen] = useState(false)
  const [editing, setEditing] = useState<AnuncioItem | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<AnuncioItem | null>(null)
  const [deleteError, setDeleteError] = useState<string | null>(null)
  const [formError, setFormError] = useState<string | null>(null)
  const toast = useToast()
  useQueryErrorToast(error)

  const heroStats = useMemo(
    () => [
      { label: 'Anuncios', value: data.length },
      {
        label: 'Vigentes',
        value: data.filter((a) => !a.vigenteHasta || new Date(a.vigenteHasta) >= new Date()).length,
      },
      { label: 'Tipos', value: tipos.length },
    ],
    [data, tipos.length],
  )

  const {
    filteredRows: filteredAnuncios,
    globalSearch,
    setGlobalSearch,
    columnFilters,
    onColumnFilterChange,
    filteredCount,
    totalCount,
  } = useClientTableFilter(data, ANUNCIOS_TABLE_COLUMNS, ANUNCIOS_TABLE_ACCESSORS)

  const form = useForm<AnuncioForm>({
    resolver: zodResolver(anuncioFormSchema),
    defaultValues: {
      titulo: '',
      contenido: '',
      tipoAnuncio: '',
      vigenteHasta: '',
    },
  })

  const panelOpen = createOpen || editing !== null
  const isEdit = editing !== null
  const { register, formState: { errors }, reset } = form

  const openCreate = () => {
    setFormError(null)
    reset({
      titulo: '',
      contenido: '',
      tipoAnuncio: tipos[0]?.tipoAnuncio ?? '',
      vigenteHasta: '',
    })
    setCreateOpen(true)
    setEditing(null)
  }

  const openEdit = (a: AnuncioItem) => {
    setFormError(null)
    setCreateOpen(false)
    reset({
      titulo: a.titulo,
      contenido: a.contenido,
      tipoAnuncio: a.tipoAnuncio ?? '',
      vigenteHasta: a.vigenteHasta ? a.vigenteHasta.slice(0, 10) : '',
    })
    setEditing(a)
  }

  const closePanel = () => {
    setCreateOpen(false)
    setEditing(null)
    setFormError(null)
  }

  const handleSave = form.handleSubmit(async (values) => {
    setFormError(null)
    const body = {
      titulo: values.titulo,
      contenido: values.contenido,
      tipoAnuncio: values.tipoAnuncio,
      vigenteHasta: vigenteHastaToIso(values.vigenteHasta),
    }
    const res = isEdit && editing
      ? await actualizarAnuncio(editing.anuncioId, body)
      : await crearAnuncio(body)
    if (!res.data) {
      setFormError(res.problem?.detail ?? `Error ${res.status}`)
      return
    }
    closePanel()
    toast.success(isEdit ? 'Anuncio actualizado' : 'Anuncio publicado')
    await refetch()
  })

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return
    setDeleteError(null)
    const res = await eliminarAnuncio(deleteTarget.anuncioId)
    if (res.status !== 204 && res.status !== 200) {
      setDeleteError(res.problem?.detail ?? `No se pudo eliminar (${res.status})`)
      return
    }
    setDeleteTarget(null)
    if (editing?.anuncioId === deleteTarget.anuncioId) closePanel()
    toast.success('Anuncio eliminado')
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
      <button type="button" className="btn btn-primary flex-grow-1" onClick={() => void handleSave()}>
        <i className={`mdi ${isEdit ? 'mdi-content-save' : 'mdi-bullhorn'} mr-1`} />
        {isEdit ? 'Actualizar' : 'Publicar'}
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
            className={`nav-link ${tab === 'anuncios' ? 'active' : ''}`}
            onClick={() => {
              closePanel()
              setTab('anuncios')
            }}
          >
            Anuncios
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
            Tipos de anuncio
          </button>
        </li>
      </ul>

      {tab === 'tipos' && (
        <>
          <AdminListToolbar
            title="Tipos de anuncio"
            metrics={[{ label: 'Tipos', value: tipos.length }]}
          />
          <AdminTiposAnuncioSection tipos={tipos} loading={tiposLoading} onReload={reloadTipos} />
        </>
      )}

      {tab === 'anuncios' && (
      <>
      {tipos.length === 0 && (
        <div className="alert alert-warning py-2 small" role="status">
          Sin tipos en catálogo (ejecuta DB-003).
        </div>
      )}

      <AdminListToolbar
        title="Anuncios"
        metrics={heroStats}
        primaryAction={{
          label: 'Nuevo anuncio',
          iconClass: 'mdi mdi-bullhorn',
          onClick: openCreate,
          disabled: tipos.length === 0,
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

              {!loading && !error && data.length === 0 && (
                <div className="cq-empty-state">
                  <i className="mdi mdi-bullhorn-outline cq-empty-icon" />
                  <p className="cq-empty-title">Sin anuncios</p>
                  <p className="text-muted">Publica el primer aviso para la comunidad.</p>
                </div>
              )}

              {!loading && !error && data.length > 0 && (
                <>
                <AdminFilterableTable
                  columns={ANUNCIOS_TABLE_COLUMNS}
                  columnFilters={columnFilters}
                  onColumnFilterChange={onColumnFilterChange}
                  globalSearch={globalSearch}
                  onGlobalSearchChange={setGlobalSearch}
                  filteredCount={filteredCount}
                  totalCount={totalCount}
                >
                  {filteredAnuncios.length === 0 ? (
                    <tr>
                      <td colSpan={ANUNCIOS_TABLE_COLUMNS.length} className="text-center text-muted py-4">
                        Sin resultados para los filtros aplicados.
                      </td>
                    </tr>
                  ) : (
                    filteredAnuncios.map((a) => (
                      <tr key={a.anuncioId} className={editing?.anuncioId === a.anuncioId ? 'cq-row-active' : undefined}>
                        <td className="min-w-0">
                          <strong className="text-break">{a.titulo}</strong>
                        </td>
                        <td>{a.tipoAnuncio ?? '—'}</td>
                        <td className="tabular-nums">{new Date(a.fechaPublicacion).toLocaleDateString('es-MX')}</td>
                        <td className="tabular-nums">{formatVigencia(a.vigenteHasta)}</td>
                        <td className="text-center cq-actions">
                          <button
                            type="button"
                            className="btn btn-link btn-sm"
                            onClick={() => openEdit(a)}
                            aria-label={`Editar ${a.titulo}`}
                          >
                            <i className="mdi mdi-pencil" />
                          </button>
                          <button
                            type="button"
                            className="btn btn-link btn-sm text-danger"
                            onClick={() => setDeleteTarget(a)}
                            aria-label={`Eliminar ${a.titulo}`}
                          >
                            <i className="mdi mdi-delete" />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </AdminFilterableTable>
                <AdminMobileCardList
                  rows={filteredAnuncios}
                  getRowKey={(a) => a.anuncioId}
                  renderCard={(a) => (
                    <AnuncioAdminMobileCard
                      anuncio={a}
                      active={editing?.anuncioId === a.anuncioId}
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
            title={isEdit ? 'Editar anuncio' : 'Nuevo anuncio'}
            subtitle={isEdit ? 'Actualiza el contenido visible para residentes.' : 'Redacta el aviso y define vigencia opcional.'}
            iconClass={isEdit ? 'mdi mdi-pencil' : 'mdi mdi-bullhorn'}
            editing={isEdit}
            onClose={closePanel}
            footer={formFooter}
          >
            {formError && (
              <div className="alert alert-danger py-2 small" role="alert">
                {formError}
              </div>
            )}
            <div className="form-group mb-3">
              <label className="cq-label" htmlFor="anuncio-titulo">
                <i className="mdi mdi-format-title" />
                Título <span className="text-danger">*</span>
              </label>
              <input id="anuncio-titulo" className="form-control" {...register('titulo')} />
              {errors.titulo && <span className="text-danger small d-block">{errors.titulo.message}</span>}
            </div>
            <div className="form-group mb-3">
              <label className="cq-label" htmlFor="anuncio-tipo">
                <i className="mdi mdi-tag" />
                Tipo <span className="text-danger">*</span>
              </label>
              <select id="anuncio-tipo" className="form-control" {...register('tipoAnuncio')}>
                {tipos.map((t) => (
                  <option key={t.tipoAnuncioId} value={t.tipoAnuncio}>
                    {t.tipoAnuncio}
                  </option>
                ))}
              </select>
              {errors.tipoAnuncio && <span className="text-danger small d-block">{errors.tipoAnuncio.message}</span>}
            </div>
            <div className="form-group mb-3">
              <label className="cq-label" htmlFor="anuncio-contenido">
                <i className="mdi mdi-text" />
                Contenido <span className="text-danger">*</span>
              </label>
              <textarea id="anuncio-contenido" className="form-control" rows={5} {...register('contenido')} />
              {errors.contenido && <span className="text-danger small d-block">{errors.contenido.message}</span>}
            </div>
            <div className="form-group mb-0">
              <label className="cq-label" htmlFor="anuncio-vigencia">
                <i className="mdi mdi-calendar" />
                Vigente hasta (opcional)
              </label>
              <input id="anuncio-vigencia" type="date" className="form-control" {...register('vigenteHasta')} />
            </div>
          </AdminSidePanel>
        }
      />

      <ConfirmDialog
        open={deleteTarget !== null}
        title="Eliminar anuncio"
        message={
          deleteTarget
            ? `¿Eliminar "${deleteTarget.titulo}"? Esta acción no se puede deshacer.`
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

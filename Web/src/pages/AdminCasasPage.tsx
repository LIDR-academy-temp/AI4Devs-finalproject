import { zodResolver } from '@hookform/resolvers/zod'
import { useEffect, useMemo, useState } from 'react'
import { useForm } from 'react-hook-form'
import 'bootstrap/dist/css/bootstrap.min.css'
import '@mdi/font/css/materialdesignicons.min.css'
import '../styles/bootstrap-pantone.css'
import '../styles/cq-admin.css'
import {
  casaCreateSchema,
  casaEditSchema,
  propietarioIdFromForm,
  type CasaCreateForm,
  type CasaEditForm,
} from '../features/admin/casas/casasAdminSchemas'
import { useCasasAdmin } from '../features/admin/casas/useCasasAdmin'
import { usePadronUsuarios } from '../features/admin/usuarios/usePadronUsuarios'
import {
  CASAS_TABLE_COLUMNS,
  createCasasTableAccessors,
} from '../features/admin/casas/casasTableFilter'
import { CasaAdminMobileCard } from '../features/admin/casas/CasaAdminMobileCard'
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
import type { CasaAdminItem } from '../shared/types/casasAdmin'

export function AdminCasasPage() {
  const [filtroCondominio, setFiltroCondominio] = useState('')
  const condominioId = filtroCondominio ? Number(filtroCondominio) : undefined
  const { casas, condominios, loading, error, refetch } = useCasasAdmin(condominioId)
  const { data: usuarios } = usePadronUsuarios(undefined, false)

  const [createOpen, setCreateOpen] = useState(false)
  const [editing, setEditing] = useState<CasaAdminItem | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<CasaAdminItem | null>(null)
  const [deleteError, setDeleteError] = useState<string | null>(null)
  const [formError, setFormError] = useState<string | null>(null)
  const toast = useToast()
  useQueryErrorToast(error)
  const propietarios = useMemo(
    () => usuarios.filter((u) => u.bActivo),
    [usuarios],
  )

  const correoByUsuarioId = useMemo(() => {
    const map = new Map<number, string>()
    for (const u of usuarios) {
      if (u.correo) map.set(u.usuarioId, u.correo)
    }
    return map
  }, [usuarios])

  const heroStats = useMemo(() => {
    const conPropietario = casas.filter((c) => c.propietarioUsuarioId || c.propietarioNombre).length
    const conCorreo = casas.filter(
      (c) => c.propietarioUsuarioId && correoByUsuarioId.has(c.propietarioUsuarioId),
    ).length
    return [
      { label: 'Casas', value: casas.length },
      { label: 'Con propietario', value: conPropietario },
      { label: 'Con correo', value: conCorreo },
    ]
  }, [casas, correoByUsuarioId])

  const casasTableAccessors = useMemo(
    () => createCasasTableAccessors(correoByUsuarioId),
    [correoByUsuarioId],
  )

  const {
    filteredRows: filteredCasas,
    globalSearch,
    setGlobalSearch,
    columnFilters,
    onColumnFilterChange,
    filteredCount,
    totalCount,
  } = useClientTableFilter(casas, CASAS_TABLE_COLUMNS, casasTableAccessors)

  const createForm = useForm<CasaCreateForm>({
    resolver: zodResolver(casaCreateSchema),
    defaultValues: {
      condominioId: 0,
      numero: '',
      direccion: '',
      propietarioUsuarioId: '',
    },
  })

  const editForm = useForm<CasaEditForm>({
    resolver: zodResolver(casaEditSchema),
    defaultValues: {
      numero: '',
      direccion: '',
      propietarioUsuarioId: '',
    },
  })

  const panelOpen = createOpen || editing !== null
  const isEdit = editing !== null

  const openCreate = () => {
    setFormError(null)
    createForm.reset({
      condominioId: condominios[0]?.condominioId ?? 0,
      numero: '',
      direccion: '',
      propietarioUsuarioId: '',
    })
    setCreateOpen(true)
    setEditing(null)
  }

  const openEdit = (c: CasaAdminItem) => {
    setFormError(null)
    setCreateOpen(false)
    editForm.reset({
      numero: c.numero ?? '',
      direccion: c.direccion ?? '',
      propietarioUsuarioId: c.propietarioUsuarioId ? String(c.propietarioUsuarioId) : '',
    })
    setEditing(c)
  }

  const closePanel = () => {
    setCreateOpen(false)
    setEditing(null)
    setFormError(null)
  }

  const handleSaveCreate = createForm.handleSubmit(async (data) => {
    setFormError(null)
    const { problem, status } = await apiPost('/SGR/Casas', {
      condominioId: data.condominioId,
      direccion: data.direccion,
      numero: data.numero,
      propietarioUsuarioId: propietarioIdFromForm(data.propietarioUsuarioId),
    })
    if (problem) {
      setFormError(problem.detail ?? `Error ${status}`)
      return
    }
    closePanel()
    toast.success('Casa creada')
    await refetch()
  })

  const handleSaveEdit = editForm.handleSubmit(async (data) => {
    if (!editing) return
    setFormError(null)
    const { problem, status } = await apiPut(`/SGR/Casas/${editing.casaId}`, {
      numero: data.numero,
      direccion: data.direccion,
      propietarioUsuarioId: propietarioIdFromForm(data.propietarioUsuarioId),
    })
    if (problem) {
      setFormError(problem.detail ?? `Error ${status}`)
      return
    }
    closePanel()
    toast.success('Casa actualizada')
    await refetch()
  })

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return
    setDeleteError(null)
    const { problem, status } = await apiDelete(`/SGR/Casas/${deleteTarget.casaId}`)
    if (problem) {
      setDeleteError(problem.detail ?? `Error ${status}`)
      return
    }
    setDeleteTarget(null)
    toast.success('Casa eliminada')
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
      <button type="button" className="btn btn-primary flex-grow-1" onClick={() => void (isEdit ? handleSaveEdit() : handleSaveCreate())}>
        <i className={`mdi ${isEdit ? 'mdi-content-save' : 'mdi-home-plus'} me-1`} />
        {isEdit ? 'Actualizar' : 'Crear casa'}
      </button>
      <button type="button" className="btn btn-outline-secondary" onClick={closePanel}>
        Cancelar
      </button>
    </>
  )

  return (
    <div className="cq-admin-page container-fluid py-4">
      <AdminListToolbar
        title="Casas"
        metrics={heroStats}
        filterSlot={
          <select
            className="form-select form-select-sm"
            value={filtroCondominio}
            onChange={(e) => setFiltroCondominio(e.target.value)}
            aria-label="Filtrar por condominio"
          >
            <option value="">Todos los condominios</option>
            {condominios.map((c) => (
              <option key={c.condominioId} value={c.condominioId}>
                {c.nombre}
              </option>
            ))}
          </select>
        }
        primaryAction={{
          label: 'Nueva casa',
          iconClass: 'mdi mdi-plus',
          onClick: openCreate,
          disabled: condominios.length === 0,
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

              {!loading && !error && casas.length === 0 && (
                <div className="cq-empty-state">
                  <i className="mdi mdi-home-outline cq-empty-icon" />
                  <p className="cq-empty-title">Sin casas registradas</p>
                  <p className="text-muted">Abre una nueva ficha para registrar la primera vivienda.</p>
                </div>
              )}

              {!loading && !error && casas.length > 0 && (
                <>
                <AdminFilterableTable
                  columns={CASAS_TABLE_COLUMNS}
                  columnFilters={columnFilters}
                  onColumnFilterChange={onColumnFilterChange}
                  globalSearch={globalSearch}
                  onGlobalSearchChange={setGlobalSearch}
                  filteredCount={filteredCount}
                  totalCount={totalCount}
                >
                  {filteredCasas.length === 0 ? (
                    <tr>
                      <td colSpan={CASAS_TABLE_COLUMNS.length} className="text-center text-muted py-4">
                        Sin resultados para los filtros aplicados.
                      </td>
                    </tr>
                  ) : (
                    filteredCasas.map((c) => {
                      const rowActive = editing?.casaId === c.casaId
                      const correo =
                        c.propietarioUsuarioId != null
                          ? correoByUsuarioId.get(c.propietarioUsuarioId)
                          : undefined
                      return (
                        <tr key={c.casaId} className={rowActive ? 'cq-row-active' : undefined}>
                          <td>
                            <strong>{c.condominioNombre ?? c.condominioId}</strong>
                          </td>
                          <td>{c.direccion ?? '—'}</td>
                          <td>
                            <span className="badge rounded-pill bg-light text-dark border">
                              {c.numero ?? '—'}
                            </span>
                          </td>
                          <td>
                            {!c.propietarioNombre ? (
                              <span className="text-muted fst-italic">Sin propietario</span>
                            ) : (
                              <>
                                <strong>{c.propietarioNombre}</strong>
                                {correo && <small className="text-muted d-block">{correo}</small>}
                              </>
                            )}
                          </td>
                          <td>
                            <span className="badge bg-success">
                              <i className="mdi mdi-check-circle me-1" />
                              Activa
                            </span>
                          </td>
                          <td className="text-center cq-actions">
                            <button
                              type="button"
                              className="btn btn-link btn-sm"
                              onClick={() => openEdit(c)}
                              aria-label={`Editar casa ${c.numero ?? c.casaId}`}
                            >
                              <i className="mdi mdi-pencil" />
                            </button>
                            <button
                              type="button"
                              className="btn btn-link btn-sm text-danger"
                              onClick={() => setDeleteTarget(c)}
                              aria-label={`Eliminar casa ${c.numero ?? c.casaId}`}
                            >
                              <i className="mdi mdi-delete" />
                            </button>
                          </td>
                        </tr>
                      )
                    })
                  )}
                </AdminFilterableTable>
                <AdminMobileCardList
                  rows={filteredCasas}
                  getRowKey={(c) => c.casaId}
                  renderCard={(c) => (
                    <CasaAdminMobileCard
                      casa={c}
                      active={editing?.casaId === c.casaId}
                      correoPropietario={
                        c.propietarioUsuarioId != null
                          ? correoByUsuarioId.get(c.propietarioUsuarioId)
                          : undefined
                      }
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
            title={isEdit ? 'Editar casa' : 'Nueva casa'}
            subtitle={
              isEdit
                ? `Revisa la casa #${editing?.casaId} desde este panel.`
                : 'Captura dirección, propietario y acceso en un solo paso.'
            }
            iconClass={isEdit ? 'mdi mdi-pencil' : 'mdi mdi-home-plus'}
            editing={isEdit}
            onClose={closePanel}
            footer={formFooter}
          >
            {formError && (
              <div className="alert alert-danger py-2 small" role="alert">
                {formError}
              </div>
            )}
            {!isEdit && (
              <div className="mb-3">
                <label className="cq-label" htmlFor="condominioId">
                  <i className="mdi mdi-city" />
                  Condominio <span className="text-danger">*</span>
                </label>
                <select
                  id="condominioId"
                  className="form-control"
                  {...createForm.register('condominioId', { valueAsNumber: true })}
                >
                  {condominios.map((c) => (
                    <option key={c.condominioId} value={c.condominioId}>
                      {c.nombre}
                    </option>
                  ))}
                </select>
                {createForm.formState.errors.condominioId && (
                  <span className="text-danger small">
                    {String(createForm.formState.errors.condominioId.message)}
                  </span>
                )}
              </div>
            )}
            <div className="mb-3">
              <label className="cq-label" htmlFor="numero">
                <i className="mdi mdi-numeric" />
                Número exterior
              </label>
              <input
                id="numero"
                className="form-control"
                {...(isEdit ? editForm.register('numero') : createForm.register('numero'))}
              />
              {(isEdit ? editForm.formState.errors.numero : createForm.formState.errors.numero) && (
                <span className="text-danger small d-block">
                  {(isEdit ? editForm.formState.errors.numero : createForm.formState.errors.numero)?.message}
                </span>
              )}
            </div>
            <div className="mb-3">
              <label className="cq-label" htmlFor="direccion">
                <i className="mdi mdi-map-marker" />
                Dirección
              </label>
              <input
                id="direccion"
                className="form-control"
                {...(isEdit ? editForm.register('direccion') : createForm.register('direccion'))}
              />
              {(isEdit ? editForm.formState.errors.direccion : createForm.formState.errors.direccion) && (
                <span className="text-danger small d-block">
                  {(isEdit ? editForm.formState.errors.direccion : createForm.formState.errors.direccion)?.message}
                </span>
              )}
            </div>
            <div className="mb-0">
              <label className="cq-label" htmlFor="propietario">
                <i className="mdi mdi-account" />
                Propietario
              </label>
              <select
                id="propietario"
                className="form-control"
                {...(isEdit
                  ? editForm.register('propietarioUsuarioId')
                  : createForm.register('propietarioUsuarioId'))}
              >
                <option value="">— Sin propietario —</option>
                {propietarios.map((u) => (
                  <option key={u.usuarioId} value={u.usuarioId}>
                    {u.nombre} ({u.correo})
                  </option>
                ))}
              </select>
            </div>
          </AdminSidePanel>
        }
      />

      <ConfirmDialog
        open={deleteTarget !== null}
        title="Eliminar casa"
        message={
          deleteTarget
            ? [
                `¿Eliminar la casa ${deleteTarget.numero ?? deleteTarget.casaId}? Esta acción no se puede deshacer.`,
                deleteError ? `\n\n${deleteError}` : '',
              ].join('')
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

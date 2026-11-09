import { zodResolver } from '@hookform/resolvers/zod'
import { useEffect, useMemo, useState } from 'react'
import { useForm } from 'react-hook-form'
import 'bootstrap/dist/css/bootstrap.min.css'
import '@mdi/font/css/materialdesignicons.min.css'
import '../styles/bootstrap-pantone.css'
import '../styles/cq-admin.css'
import { useCasasSelect } from '../features/admin/usuarios/useCasasSelect'
import { usePadronUsuarios } from '../features/admin/usuarios/usePadronUsuarios'
import {
  PERFILES_USUARIO,
  casaIdFromForm,
  casaIdFromUnidad,
  perfilFromPadron,
  usuarioCreateSchema,
  usuarioEditSchema,
  type UsuarioCreateForm,
  type UsuarioEditForm,
} from '../features/admin/usuarios/usuariosAdminSchemas'
import {
  USUARIOS_TABLE_ACCESSORS,
  USUARIOS_TABLE_COLUMNS,
} from '../features/admin/usuarios/usuariosTableFilter'
import { UsuarioAdminMobileCard } from '../features/admin/usuarios/UsuarioAdminMobileCard'
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
import { apiDelete, apiGet, apiPatch, apiPost, apiPut } from '../shared/lib/apiClient'
import type { UsuarioCreado, UsuarioPadronItem } from '../shared/types/usuariosAdmin'

export function AdminUsuariosPage() {
  const { data, loading, error, refetch } = usePadronUsuarios(undefined, false)
  const { casas, loading: casasLoading, error: casasError } = useCasasSelect()

  const [createOpen, setCreateOpen] = useState(false)
  const [editing, setEditing] = useState<UsuarioPadronItem | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<UsuarioPadronItem | null>(null)
  const [deleteError, setDeleteError] = useState<string | null>(null)
  const [formError, setFormError] = useState<string | null>(null)
  const toast = useToast()
  useQueryErrorToast(error)
  const [tempPassword, setTempPassword] = useState<string | null>(null)
  const [editingUnidad, setEditingUnidad] = useState<string | null>(null)

  const heroStats = useMemo(() => {
    const activos = data.filter((u) => u.bActivo).length
    return [
      { label: 'Usuarios', value: data.length },
      { label: 'Activos', value: activos },
      { label: 'Inactivos', value: data.length - activos },
    ]
  }, [data])

  const {
    filteredRows: filteredUsuarios,
    globalSearch,
    setGlobalSearch,
    columnFilters,
    onColumnFilterChange,
    filteredCount,
    totalCount,
  } = useClientTableFilter(data, USUARIOS_TABLE_COLUMNS, USUARIOS_TABLE_ACCESSORS)

  const createForm = useForm<UsuarioCreateForm>({
    resolver: zodResolver(usuarioCreateSchema),
    defaultValues: {
      nombre: '',
      correo: '',
      telefono: '',
      perfil: 'Residente',
      casaId: '',
    },
  })

  const editForm = useForm<UsuarioEditForm>({
    resolver: zodResolver(usuarioEditSchema),
    defaultValues: { nombre: '', correo: '', telefono: '', perfil: 'Residente', casaId: '' },
  })

  const panelOpen = createOpen || editing !== null
  const isEdit = editing !== null
  const { formState: { errors } } = isEdit ? editForm : createForm

  const openCreate = () => {
    setFormError(null)
    setTempPassword(null)
    createForm.reset({
      nombre: '',
      correo: '',
      telefono: '',
      perfil: 'Residente',
      casaId: '',
    })
    setCreateOpen(true)
    setEditing(null)
  }

  const openEdit = async (u: UsuarioPadronItem) => {
    setFormError(null)
    setTempPassword(null)
    setCreateOpen(false)
    setEditingUnidad(null)

    let perfil = perfilFromPadron(u.perfil)
    let casaId = ''

    const { data: perfilDto } = await apiGet<{ perfil?: string; unidad?: string | null }>(
      `/SGR/Usuarios/${u.usuarioId}`,
    )
    if (perfilDto?.perfil) {
      perfil = perfilFromPadron(perfilDto.perfil)
    }
    if (perfilDto?.unidad) {
      setEditingUnidad(perfilDto.unidad)
      casaId = casaIdFromUnidad(casas, perfilDto.unidad)
    }

    editForm.reset({
      nombre: u.nombre,
      correo: u.correo,
      telefono: u.telefono ?? '',
      perfil,
      casaId,
    })
    setEditing(u)
  }

  const closePanel = () => {
    setCreateOpen(false)
    setEditing(null)
    setEditingUnidad(null)
    setFormError(null)
    setTempPassword(null)
  }

  const handleSaveCreate = createForm.handleSubmit(async (formData) => {
    setFormError(null)
    const { data: created, problem, status } = await apiPost<UsuarioCreado>('/SGR/Usuarios', {
      nombre: formData.nombre,
      correo: formData.correo,
      telefono: formData.telefono.trim() || null,
      perfil: formData.perfil,
      casaId: casaIdFromForm(formData.casaId),
    })
    if (!created) {
      setFormError(problem?.detail ?? `Error ${status}`)
      return
    }
    setTempPassword(created.passwordTemporal)
    await refetch()
  })

  const handleSaveEdit = editForm.handleSubmit(async (formData) => {
    if (!editing) return
    setFormError(null)
    const { problem, status } = await apiPut(`/SGR/Usuarios/${editing.usuarioId}`, {
      nombre: formData.nombre,
      correo: formData.correo,
      telefono: formData.telefono.trim() || '',
      perfil: formData.perfil,
      casaId: casaIdFromForm(formData.casaId),
    })
    if (problem) {
      setFormError(problem.detail ?? `Error ${status}`)
      return
    }
    closePanel()
    toast.success('Usuario actualizado')
    await refetch()
  })

  const toggleActivo = async (u: UsuarioPadronItem) => {
    const path = u.bActivo
      ? `/SGR/Usuarios/${u.usuarioId}/desactivar`
      : `/SGR/Usuarios/${u.usuarioId}/activar`
    const { problem, status } = await apiPatch(path, {})
    if (problem || (status !== 204 && status !== 200)) {
      toast.error(problem?.detail ?? `Error ${status}`)
      return
    }
    toast.success(u.bActivo ? 'Usuario desactivado' : 'Usuario activado')
    await refetch()
  }

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return
    setDeleteError(null)
    const { problem, status } = await apiDelete(`/SGR/Usuarios/${deleteTarget.usuarioId}`)
    if (problem) {
      setDeleteError(problem.detail ?? `Error ${status}`)
      return
    }
    setDeleteTarget(null)
    if (editing?.usuarioId === deleteTarget.usuarioId) closePanel()
    toast.success('Usuario eliminado')
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

  const formFooter = tempPassword ? (
    <button type="button" className="btn btn-primary flex-grow-1" onClick={closePanel}>
      Cerrar
    </button>
  ) : (
    <>
      <button
        type="button"
        className="btn btn-primary flex-grow-1"
        onClick={() => void (isEdit ? handleSaveEdit() : handleSaveCreate())}
      >
        <i className={`mdi ${isEdit ? 'mdi-content-save' : 'mdi-account-plus'} mr-1`} />
        {isEdit ? 'Actualizar' : 'Crear usuario'}
      </button>
      <button type="button" className="btn btn-outline-secondary" onClick={closePanel}>
        Cancelar
      </button>
    </>
  )

  return (
    <div className="cq-admin-page container-fluid py-4">
      <AdminListToolbar
        title="Residentes y usuarios"
        metrics={heroStats}
        primaryAction={{
          label: 'Nuevo usuario',
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

              {!loading && !error && data.length === 0 && (
                <div className="cq-empty-state">
                  <i className="mdi mdi-account-group-outline cq-empty-icon" />
                  <p className="cq-empty-title">Sin usuarios registrados</p>
                  <p className="text-muted">Crea el primer usuario desde el panel lateral.</p>
                </div>
              )}

              {!loading && !error && data.length > 0 && (
                <>
                <AdminFilterableTable
                  columns={USUARIOS_TABLE_COLUMNS}
                  columnFilters={columnFilters}
                  onColumnFilterChange={onColumnFilterChange}
                  globalSearch={globalSearch}
                  onGlobalSearchChange={setGlobalSearch}
                  filteredCount={filteredCount}
                  totalCount={totalCount}
                >
                  {filteredUsuarios.length === 0 ? (
                    <tr>
                      <td colSpan={USUARIOS_TABLE_COLUMNS.length} className="text-center text-muted py-4">
                        Sin resultados para los filtros aplicados.
                      </td>
                    </tr>
                  ) : (
                    filteredUsuarios.map((u) => {
                      const rowActive = editing?.usuarioId === u.usuarioId
                      return (
                        <tr key={u.usuarioId} className={rowActive ? 'cq-row-active' : undefined}>
                          <td className="min-w-0">
                            <strong className="text-truncate d-block" title={u.nombre}>{u.nombre}</strong>
                          </td>
                          <td className="min-w-0 break-words">{u.correo}</td>
                          <td>{u.perfil}</td>
                          <td>
                            <span className={`badge ${u.bActivo ? 'bg-success' : 'bg-secondary'}`}>
                              {u.bActivo ? 'Sí' : 'No'}
                            </span>
                          </td>
                          <td className="text-center cq-actions whitespace-nowrap">
                            <button
                              type="button"
                              className="btn btn-link btn-sm"
                              onClick={() => void openEdit(u)}
                              aria-label={`Editar ${u.correo}`}
                            >
                              <i className="mdi mdi-pencil" />
                            </button>
                            <button
                              type="button"
                              className="btn btn-link btn-sm"
                              onClick={() => void toggleActivo(u)}
                              aria-label={u.bActivo ? `Desactivar ${u.correo}` : `Activar ${u.correo}`}
                            >
                              <i className={`mdi ${u.bActivo ? 'mdi-account-off' : 'mdi-account-check'}`} />
                            </button>
                            <button
                              type="button"
                              className="btn btn-link btn-sm text-danger"
                              onClick={() => setDeleteTarget(u)}
                              aria-label={`Eliminar ${u.correo}`}
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
                  rows={filteredUsuarios}
                  getRowKey={(u) => u.usuarioId}
                  renderCard={(u) => (
                    <UsuarioAdminMobileCard
                      usuario={u}
                      active={editing?.usuarioId === u.usuarioId}
                      onEdit={(u) => void openEdit(u)}
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
            title={isEdit ? 'Editar usuario' : tempPassword ? 'Usuario creado' : 'Nuevo usuario'}
            subtitle={
              isEdit
                ? `Actualiza los datos de ${editing?.correo}.`
                : tempPassword
                  ? 'Copia la contraseña temporal; no se volverá a mostrar.'
                  : 'Alta de residente o personal del condominio.'
            }
            iconClass={isEdit ? 'mdi mdi-pencil' : 'mdi mdi-account-plus'}
            editing={isEdit}
            onClose={closePanel}
            footer={formFooter}
          >
            {formError && (
              <div className="alert alert-danger py-2 small" role="alert">{formError}</div>
            )}
            {tempPassword ? (
              <code className="d-block rounded bg-light p-2 small break-all">{tempPassword}</code>
            ) : isEdit ? (
              <>
                <div className="form-group mb-3">
                  <label className="cq-label" htmlFor="edit-nombre">
                    <i className="mdi mdi-account" />
                    Nombre <span className="text-danger">*</span>
                  </label>
                  <input id="edit-nombre" className="form-control" {...editForm.register('nombre')} />
                  {errors.nombre && (
                    <span className="text-danger small d-block">{errors.nombre.message}</span>
                  )}
                </div>
                <div className="form-group mb-3">
                  <label className="cq-label" htmlFor="edit-correo">
                    <i className="mdi mdi-email" />
                    Correo <span className="text-danger">*</span>
                  </label>
                  <input id="edit-correo" type="email" className="form-control" {...editForm.register('correo')} />
                  {errors.correo && (
                    <span className="text-danger small d-block">{errors.correo.message}</span>
                  )}
                </div>
                <div className="form-group mb-3">
                  <label className="cq-label" htmlFor="edit-telefono">
                    <i className="mdi mdi-phone" />
                    Teléfono
                  </label>
                  <input id="edit-telefono" className="form-control" {...editForm.register('telefono')} />
                </div>
                <div className="form-group mb-3">
                  <label className="cq-label" htmlFor="edit-perfil">
                    <i className="mdi mdi-shield-account" />
                    Perfil
                  </label>
                  <select id="edit-perfil" className="form-control" {...editForm.register('perfil')}>
                    {PERFILES_USUARIO.map((p) => (
                      <option key={p} value={p}>{p}</option>
                    ))}
                  </select>
                </div>
                <div className="form-group mb-3">
                  <label className="cq-label" htmlFor="edit-casa">
                    <i className="mdi mdi-home" />
                    Vincular casa (ocupante)
                  </label>
                  <select
                    id="edit-casa"
                    className="form-control"
                    {...editForm.register('casaId')}
                    disabled={casasLoading}
                  >
                    <option value="">Sin cambio</option>
                    {casas.map((c) => (
                      <option key={c.casaId} value={String(c.casaId)}>
                        {c.numero ?? c.casaId} — {c.condominioNombre ?? ''}
                      </option>
                    ))}
                  </select>
                  <span className="text-muted small d-block mt-1">
                    Añade ocupante vigente en esa unidad; no quita otras casas. Un mismo dueño puede tener
                    varias casas en <strong>Casas</strong> (propietario por fila).
                  </span>
                  {editingUnidad && !editForm.watch('casaId') && (
                    <span className="text-muted small d-block mt-1">
                      Casa principal en perfil: {editingUnidad}
                    </span>
                  )}
                  {casasError && <span className="text-danger small d-block">{casasError}</span>}
                </div>
                <div className="form-group mb-0">
                  <label className="cq-label">
                    <i className="mdi mdi-check-circle-outline" />
                    Activo
                  </label>
                  <div>
                    <span className={`badge ${editing?.bActivo ? 'bg-success' : 'bg-secondary'}`}>
                      {editing?.bActivo ? 'Sí' : 'No'}
                    </span>
                    <span className="text-muted small d-block mt-1">
                      Activa o desactiva desde el icono de persona en la tabla.
                    </span>
                  </div>
                </div>
              </>
            ) : (
              <>
                <div className="form-group mb-3">
                  <label className="cq-label" htmlFor="create-nombre">
                    <i className="mdi mdi-account" />
                    Nombre <span className="text-danger">*</span>
                  </label>
                  <input id="create-nombre" className="form-control" {...createForm.register('nombre')} />
                  {errors.nombre && (
                    <span className="text-danger small d-block">{String(errors.nombre.message)}</span>
                  )}
                </div>
                <div className="form-group mb-3">
                  <label className="cq-label" htmlFor="create-correo">
                    <i className="mdi mdi-email" />
                    Correo <span className="text-danger">*</span>
                  </label>
                  <input id="create-correo" type="email" className="form-control" {...createForm.register('correo')} />
                  {errors.correo && (
                    <span className="text-danger small d-block">{String(errors.correo.message)}</span>
                  )}
                </div>
                <div className="form-group mb-3">
                  <label className="cq-label" htmlFor="create-telefono">
                    <i className="mdi mdi-phone" />
                    Teléfono
                  </label>
                  <input id="create-telefono" className="form-control" {...createForm.register('telefono')} />
                </div>
                <div className="form-group mb-3">
                  <label className="cq-label" htmlFor="create-perfil">
                    <i className="mdi mdi-shield-account" />
                    Perfil
                  </label>
                  <select id="create-perfil" className="form-control" {...createForm.register('perfil')}>
                    {PERFILES_USUARIO.map((p) => (
                      <option key={p} value={p}>{p}</option>
                    ))}
                  </select>
                </div>
                <div className="form-group mb-0">
                  <label className="cq-label" htmlFor="create-casa">
                    <i className="mdi mdi-home" />
                    Vincular casa (opcional)
                  </label>
                  <select
                    id="create-casa"
                    className="form-control"
                    {...createForm.register('casaId')}
                    disabled={casasLoading}
                  >
                    <option value="">Sin vincular aquí</option>
                    {casas.map((c) => (
                      <option key={c.casaId} value={String(c.casaId)}>
                        {c.numero ?? c.casaId} — {c.condominioNombre ?? ''}
                      </option>
                    ))}
                  </select>
                  <span className="text-muted small d-block mt-1">
                    Para varias propiedades del mismo dueño, asigna propietario en cada casa en{' '}
                    <strong>Casas</strong>.
                  </span>
                  {casasError && <span className="text-danger small d-block">{casasError}</span>}
                </div>
              </>
            )}
          </AdminSidePanel>
        }
      />

      <ConfirmDialog
        open={deleteTarget !== null}
        title="Eliminar usuario"
        message={
          deleteTarget
            ? [
                `¿Eliminar a ${deleteTarget.correo}? Esta acción no se puede deshacer.`,
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

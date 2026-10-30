import { zodResolver } from '@hookform/resolvers/zod'
import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import 'bootstrap/dist/css/bootstrap.min.css'
import '../styles/bootstrap-pantone.css'
import '../styles/cq-admin.css'
import { usePerfilesAdmin } from '../features/navegacion/usePerfilesAdmin'
import type { PerfilListItem } from '../features/navegacion/types'
import { PerfilAdminMobileCard } from '../features/navegacion/PerfilAdminMobileCard'
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
import { apiDelete, apiPost, apiPut } from '../shared/lib/apiClient'
import { useToast } from '../shared/toast/ToastContext'
import type { TableFilterAccessors, TableFilterColumn } from '../shared/types/tableFilter'

const perfilSchema = z.object({
  nombre: z.string().trim().min(1, 'Nombre requerido'),
  descripcion: z.string().trim().optional(),
  bAdministrador: z.boolean(),
})

type PerfilForm = z.infer<typeof perfilSchema>

const COLUMNS: TableFilterColumn[] = [
  { key: 'nombre', header: 'Perfil', filterType: 'text' },
  { key: 'descripcion', header: 'Descripción', filterType: 'text' },
  { key: 'admin', header: 'Admin', filterType: 'none' },
  { key: 'acciones', header: '', filterType: 'none' },
]

const ACCESSORS: TableFilterAccessors<PerfilListItem> = {
  getRowSearchText: (row) => [row.nombre, row.descripcion ?? ''].join(' '),
  getColumnValue: (row, key) => {
    if (key === 'nombre') return row.nombre
    if (key === 'descripcion') return row.descripcion ?? ''
    if (key === 'admin') return row.bAdministrador ? 'Sí' : 'No'
    return ''
  },
}

export function AdminPerfilesPage() {
  const navigate = useNavigate()
  const { perfiles, loading, error, refetch } = usePerfilesAdmin()
  useQueryErrorToast(error)
  const toast = useToast()

  const [panelOpen, setPanelOpen] = useState(false)
  const [editing, setEditing] = useState<PerfilListItem | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<PerfilListItem | null>(null)
  const [formError, setFormError] = useState<string | null>(null)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  const columns = useMemo(() => COLUMNS, [])
  const accessors = useMemo(() => ACCESSORS, [])

  const form = useForm<PerfilForm>({
    resolver: zodResolver(perfilSchema),
    defaultValues: { nombre: '', descripcion: '', bAdministrador: false },
  })

  const {
    filteredRows,
    globalSearch,
    setGlobalSearch,
    columnFilters,
    onColumnFilterChange,
    filteredCount,
    totalCount,
  } = useClientTableFilter(perfiles, columns, accessors)

  const closePanel = () => {
    setPanelOpen(false)
    setEditing(null)
    setFormError(null)
  }

  const openCreate = () => {
    setEditing(null)
    setFormError(null)
    form.reset({ nombre: '', descripcion: '', bAdministrador: false })
    setPanelOpen(true)
  }

  const openEdit = (row: PerfilListItem) => {
    setEditing(row)
    setFormError(null)
    form.reset({
      nombre: row.nombre,
      descripcion: row.descripcion ?? '',
      bAdministrador: row.bAdministrador,
    })
    setPanelOpen(true)
  }

  const onSave = form.handleSubmit(async (values) => {
    setFormError(null)
    const body = {
      nombre: values.nombre,
      descripcion: values.descripcion || null,
      bAdministrador: values.bAdministrador,
    }
    const res = editing
      ? await apiPut(`/SGR/Perfiles/${editing.perfilId}/admin`, body)
      : await apiPost('/SGR/Perfiles/admin', body)
    if (res.problem) {
      setFormError(res.problem.detail ?? `Error ${res.status}`)
      return
    }
    closePanel()
    toast.success(editing ? 'Perfil actualizado' : 'Perfil creado')
    await refetch()
  })

  const onConfirmDelete = async () => {
    if (!deleteTarget) return
    setDeleteError(null)
    const { problem, status } = await apiDelete(`/SGR/Perfiles/${deleteTarget.perfilId}/admin`)
    if (problem) {
      setDeleteError(problem.detail ?? `Error ${status}`)
      return
    }
    setDeleteTarget(null)
    toast.success('Perfil eliminado')
    await refetch()
  }

  useEffect(() => {
    if (!deleteTarget) setDeleteError(null)
  }, [deleteTarget])

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
      <AdminListToolbar
        title="Perfiles"
        metrics={[{ label: 'Perfiles', value: perfiles.length }]}
        primaryAction={{
          label: 'Nuevo perfil',
          iconClass: 'mdi mdi-plus',
          onClick: openCreate,
        }}
      />

      <AdminSplitLayout
        panelOpen={panelOpen}
        tablePane={
          <div className="card">
            <div className="card-body pt-3">
              {loading && <p className="text-muted">Cargando…</p>}
              {!loading && perfiles.length === 0 && (
                <p className="text-muted">No hay perfiles o no se pudo cargar el listado.</p>
              )}
              {!loading && perfiles.length > 0 && (
                <>
                <AdminFilterableTable
                  columns={columns}
                  columnFilters={columnFilters}
                  onColumnFilterChange={onColumnFilterChange}
                  globalSearch={globalSearch}
                  onGlobalSearchChange={setGlobalSearch}
                  filteredCount={filteredCount}
                  totalCount={totalCount}
                >
                  {filteredRows.map((row) => (
                    <tr key={row.perfilId}>
                      <td className="min-w-0 break-words font-weight-bold">{row.nombre}</td>
                      <td className="min-w-0 break-words">{row.descripcion ?? '—'}</td>
                      <td>{row.bAdministrador ? 'Sí' : 'No'}</td>
                      <td className="text-center cq-actions">
                        <button
                          type="button"
                          className="btn btn-link btn-sm"
                          onClick={() => openEdit(row)}
                          aria-label={`Editar ${row.nombre}`}
                        >
                          <i className="mdi mdi-pencil" />
                        </button>
                        <Link
                          to={`/admin/perfiles/${row.perfilId}/permisos`}
                          className="btn btn-sm btn-outline-primary cursor-pointer mx-1"
                        >
                          Permisos
                        </Link>
                        <button
                          type="button"
                          className="btn btn-link btn-sm text-danger"
                          onClick={() => setDeleteTarget(row)}
                          aria-label={`Eliminar ${row.nombre}`}
                        >
                          <i className="mdi mdi-delete" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </AdminFilterableTable>
                <AdminMobileCardList
                  rows={filteredRows}
                  getRowKey={(row) => row.perfilId}
                  renderCard={(row) => (
                    <PerfilAdminMobileCard
                      perfil={row}
                      onPermisos={(id) => navigate(`/admin/perfiles/${id}/permisos`)}
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
            title={editing ? 'Editar perfil' : 'Nuevo perfil'}
            subtitle="Nombre visible y flag de administrador."
            iconClass="mdi mdi-shield-account"
            editing={Boolean(editing)}
            onClose={closePanel}
            footer={formFooter}
          >
            {formError && (
              <div className="alert alert-danger py-2 small" role="alert">
                {formError}
              </div>
            )}
            <div className="form-group mb-3">
              <label className="cq-label" htmlFor="perfil-nombre">
                Nombre <span className="text-danger">*</span>
              </label>
              <input id="perfil-nombre" className="form-control" {...form.register('nombre')} />
              {form.formState.errors.nombre && (
                <span className="text-danger small d-block">{form.formState.errors.nombre.message}</span>
              )}
            </div>
            <div className="form-group mb-3">
              <label className="cq-label" htmlFor="perfil-desc">
                Descripción
              </label>
              <input id="perfil-desc" className="form-control" {...form.register('descripcion')} />
            </div>
            <div className="form-check">
              <input id="perfil-admin" type="checkbox" className="form-check-input" {...form.register('bAdministrador')} />
              <label className="form-check-label" htmlFor="perfil-admin">
                Perfil administrador
              </label>
            </div>
          </AdminSidePanel>
        }
      />

      <ConfirmDialog
        open={deleteTarget !== null}
        title="Eliminar perfil"
        message={
          deleteTarget
            ? `¿Eliminar el perfil "${deleteTarget.nombre}"? Debe no tener usuarios asignados.`
            : ''
        }
        confirmLabel="Eliminar"
        variant="danger"
        onCancel={() => setDeleteTarget(null)}
        onConfirm={() => void onConfirmDelete()}
      />
      {deleteTarget && deleteError && (
        <div className="alert alert-danger mt-3" role="alert">{deleteError}</div>
      )}
    </div>
  )
}

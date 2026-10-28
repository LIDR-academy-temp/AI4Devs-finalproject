import { zodResolver } from '@hookform/resolvers/zod'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { ConfirmDialog } from '../../../shared/components/admin'
import { apiDelete, apiPost, apiPut } from '../../../shared/lib/apiClient'
import { useToast } from '../../../shared/toast/ToastContext'
import type { RazaMascotaDto, TipoMascotaDto } from '../../../shared/types/mascotas'
import {
  razaMascotaAdminSchema,
  tipoMascotaAdminSchema,
  type RazaMascotaAdminForm,
  type TipoMascotaAdminForm,
} from './mascotasAdminSchemas'

type TiposProps = {
  tipos: TipoMascotaDto[]
  loading: boolean
  onReload: () => Promise<void>
}

export function AdminTiposMascotaSection({ tipos, loading, onReload }: TiposProps) {
  const toast = useToast()
  const [editing, setEditing] = useState<TipoMascotaDto | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<TipoMascotaDto | null>(null)
  const [formError, setFormError] = useState<string | null>(null)

  const form = useForm<TipoMascotaAdminForm>({
    resolver: zodResolver(tipoMascotaAdminSchema),
    defaultValues: { tipoMascota: '' },
  })

  const openCreate = () => {
    setEditing(null)
    setFormError(null)
    form.reset({ tipoMascota: '' })
  }

  const openEdit = (t: TipoMascotaDto) => {
    setFormError(null)
    setEditing(t)
    form.reset({ tipoMascota: t.tipoMascota })
  }

  const onSave = form.handleSubmit(async (values) => {
    setFormError(null)
    if (editing) {
      const { problem, status } = await apiPut(`/USR/TiposMascota/${editing.tipoMascotaId}`, values)
      if (problem) {
        setFormError(problem.detail ?? `Error ${status}`)
        return
      }
      toast.success('Tipo actualizado')
    } else {
      const { problem, status } = await apiPost('/USR/TiposMascota', values)
      if (problem) {
        setFormError(problem.detail ?? `Error ${status}`)
        return
      }
      toast.success('Tipo creado')
      form.reset({ tipoMascota: '' })
    }
    setEditing(null)
    await onReload()
  })

  const onConfirmDelete = async () => {
    if (!deleteTarget) return
    const { problem, status } = await apiDelete(`/USR/TiposMascota/${deleteTarget.tipoMascotaId}`)
    if (problem) {
      toast.error(problem.detail ?? `Error ${status}`)
      return
    }
    setDeleteTarget(null)
    toast.success('Tipo eliminado')
    await onReload()
  }

  return (
    <div className="card">
      <div className="card-body">
        <div className="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-3">
          <h2 className="h5 mb-0">Tipos de mascota</h2>
          <button type="button" className="btn btn-sm btn-outline-primary" onClick={openCreate}>
            <i className="mdi mdi-plus mr-1" /> Nuevo tipo
          </button>
        </div>

        <form className="row g-2 align-items-end mb-4" onSubmit={(e) => void onSave(e)}>
          <div className="col-md-8">
            <label className="cq-label small">Nombre</label>
            <input className="form-control" {...form.register('tipoMascota')} />
            {form.formState.errors.tipoMascota && (
              <span className="text-danger small">{form.formState.errors.tipoMascota.message}</span>
            )}
          </div>
          <div className="col-md-4 d-flex gap-2">
            <button type="submit" className="btn btn-primary flex-grow-1">
              {editing ? 'Actualizar' : 'Agregar'}
            </button>
            {editing && (
              <button type="button" className="btn btn-outline-secondary" onClick={openCreate}>
                Cancelar
              </button>
            )}
          </div>
          {formError && <div className="col-12 alert alert-danger py-2 small mb-0">{formError}</div>}
        </form>

        {loading && <p className="text-muted small">Cargando…</p>}
        {!loading && tipos.length === 0 && <p className="text-muted">Sin tipos registrados.</p>}
        {!loading && tipos.length > 0 && (
          <table className="table table-sm cq-admin-table mb-0">
            <thead>
              <tr>
                <th>Tipo</th>
                <th className="text-end">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {tipos.map((t) => (
                <tr key={t.tipoMascotaId} className={editing?.tipoMascotaId === t.tipoMascotaId ? 'cq-row-active' : undefined}>
                  <td>{t.tipoMascota}</td>
                  <td className="text-end cq-actions">
                    <button type="button" className="btn btn-link btn-sm" onClick={() => openEdit(t)} aria-label="Editar">
                      <i className="mdi mdi-pencil" />
                    </button>
                    <button
                      type="button"
                      className="btn btn-link btn-sm text-danger"
                      onClick={() => setDeleteTarget(t)}
                      aria-label="Eliminar"
                    >
                      <i className="mdi mdi-delete" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <ConfirmDialog
        open={deleteTarget !== null}
        title="Eliminar tipo"
        message={deleteTarget ? `¿Eliminar el tipo «${deleteTarget.tipoMascota}»?` : ''}
        confirmLabel="Eliminar"
        variant="danger"
        onCancel={() => setDeleteTarget(null)}
        onConfirm={() => void onConfirmDelete()}
      />
    </div>
  )
}

type RazasProps = {
  razas: RazaMascotaDto[]
  tipos: TipoMascotaDto[]
  loading: boolean
  onReload: () => Promise<void>
}

export function AdminRazasMascotaSection({ razas, tipos, loading, onReload }: RazasProps) {
  const toast = useToast()
  const [editing, setEditing] = useState<RazaMascotaDto | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<RazaMascotaDto | null>(null)
  const [formError, setFormError] = useState<string | null>(null)

  const form = useForm<RazaMascotaAdminForm>({
    resolver: zodResolver(razaMascotaAdminSchema),
    defaultValues: { tipoMascotaId: '', razaMascota: '' },
  })

  const openCreate = () => {
    setEditing(null)
    setFormError(null)
    form.reset({ tipoMascotaId: '', razaMascota: '' })
  }

  const openEdit = (r: RazaMascotaDto) => {
    setFormError(null)
    setEditing(r)
    form.reset({
      tipoMascotaId: String(r.tipoMascotaId),
      razaMascota: r.razaMascota,
    })
  }

  const onSave = form.handleSubmit(async (values) => {
    setFormError(null)
    const body = {
      tipoMascotaId: Number(values.tipoMascotaId),
      razaMascota: values.razaMascota.trim(),
    }
    if (editing) {
      const { problem, status } = await apiPut(`/USR/RazasMascota/${editing.razaMascotaId}`, body)
      if (problem) {
        setFormError(problem.detail ?? `Error ${status}`)
        return
      }
      toast.success('Raza actualizada')
    } else {
      const { problem, status } = await apiPost('/USR/RazasMascota', body)
      if (problem) {
        setFormError(problem.detail ?? `Error ${status}`)
        return
      }
      toast.success('Raza creada')
      form.reset({ tipoMascotaId: '', razaMascota: '' })
    }
    setEditing(null)
    await onReload()
  })

  const onConfirmDelete = async () => {
    if (!deleteTarget) return
    const { problem, status } = await apiDelete(`/USR/RazasMascota/${deleteTarget.razaMascotaId}`)
    if (problem) {
      toast.error(problem.detail ?? `Error ${status}`)
      return
    }
    setDeleteTarget(null)
    toast.success('Raza eliminada')
    await onReload()
  }

  const tipoLabel = (id: number) => tipos.find((t) => t.tipoMascotaId === id)?.tipoMascota ?? `#${id}`

  return (
    <div className="card">
      <div className="card-body">
        <div className="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-3">
          <h2 className="h5 mb-0">Razas</h2>
          <button type="button" className="btn btn-sm btn-outline-primary" onClick={openCreate}>
            <i className="mdi mdi-plus mr-1" /> Nueva raza
          </button>
        </div>

        <form className="row g-2 align-items-end mb-4" onSubmit={(e) => void onSave(e)}>
          <div className="col-md-4">
            <label className="cq-label small">Tipo</label>
            <select className="form-control" {...form.register('tipoMascotaId')}>
              <option value="">Seleccione…</option>
              {tipos.map((t) => (
                <option key={t.tipoMascotaId} value={t.tipoMascotaId}>{t.tipoMascota}</option>
              ))}
            </select>
            {form.formState.errors.tipoMascotaId && (
              <span className="text-danger small">{form.formState.errors.tipoMascotaId.message}</span>
            )}
          </div>
          <div className="col-md-5">
            <label className="cq-label small">Raza</label>
            <input className="form-control" {...form.register('razaMascota')} />
            {form.formState.errors.razaMascota && (
              <span className="text-danger small">{form.formState.errors.razaMascota.message}</span>
            )}
          </div>
          <div className="col-md-3 d-flex gap-2">
            <button type="submit" className="btn btn-primary flex-grow-1">
              {editing ? 'Actualizar' : 'Agregar'}
            </button>
            {editing && (
              <button type="button" className="btn btn-outline-secondary" onClick={openCreate}>
                Cancelar
              </button>
            )}
          </div>
          {formError && <div className="col-12 alert alert-danger py-2 small mb-0">{formError}</div>}
        </form>

        {loading && <p className="text-muted small">Cargando…</p>}
        {!loading && razas.length === 0 && <p className="text-muted">Sin razas registradas.</p>}
        {!loading && razas.length > 0 && (
          <table className="table table-sm cq-admin-table mb-0">
            <thead>
              <tr>
                <th>Raza</th>
                <th>Tipo</th>
                <th className="text-end">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {razas.map((r) => (
                <tr key={r.razaMascotaId} className={editing?.razaMascotaId === r.razaMascotaId ? 'cq-row-active' : undefined}>
                  <td>{r.razaMascota}</td>
                  <td>{tipoLabel(r.tipoMascotaId)}</td>
                  <td className="text-end cq-actions">
                    <button type="button" className="btn btn-link btn-sm" onClick={() => openEdit(r)} aria-label="Editar">
                      <i className="mdi mdi-pencil" />
                    </button>
                    <button
                      type="button"
                      className="btn btn-link btn-sm text-danger"
                      onClick={() => setDeleteTarget(r)}
                      aria-label="Eliminar"
                    >
                      <i className="mdi mdi-delete" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <ConfirmDialog
        open={deleteTarget !== null}
        title="Eliminar raza"
        message={deleteTarget ? `¿Eliminar la raza «${deleteTarget.razaMascota}»?` : ''}
        confirmLabel="Eliminar"
        variant="danger"
        onCancel={() => setDeleteTarget(null)}
        onConfirm={() => void onConfirmDelete()}
      />
    </div>
  )
}

import { zodResolver } from '@hookform/resolvers/zod'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { ConfirmDialog } from '../../../shared/components/admin'
import { apiDelete, apiPost, apiPut } from '../../../shared/lib/apiClient'
import { useToast } from '../../../shared/toast/ToastContext'
import type { TipoIdentificacionDto } from '../../../shared/types/visitas'

const tipoSchema = z.object({
  tipoIdentificacion: z.string().trim().min(1, 'Nombre requerido'),
})

type TipoForm = z.infer<typeof tipoSchema>

type Props = {
  tipos: TipoIdentificacionDto[]
  loading: boolean
  onReload: () => Promise<void>
}

export function AdminTiposIdentificacionSection({ tipos, loading, onReload }: Props) {
  const toast = useToast()
  const [editing, setEditing] = useState<TipoIdentificacionDto | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<TipoIdentificacionDto | null>(null)
  const [formError, setFormError] = useState<string | null>(null)

  const form = useForm<TipoForm>({
    resolver: zodResolver(tipoSchema),
    defaultValues: { tipoIdentificacion: '' },
  })

  const openCreate = () => {
    setEditing(null)
    setFormError(null)
    form.reset({ tipoIdentificacion: '' })
  }

  const openEdit = (t: TipoIdentificacionDto) => {
    setFormError(null)
    setEditing(t)
    form.reset({ tipoIdentificacion: t.tipoIdentificacion })
  }

  const onSave = form.handleSubmit(async (values) => {
    setFormError(null)
    const body = { tipoIdentificacion: values.tipoIdentificacion }
    if (editing) {
      const { problem, status } = await apiPut(`/VTS/TiposIdentificacion/${editing.tipoIdentificacionId}`, body)
      if (problem) {
        setFormError(problem.detail ?? `Error ${status}`)
        return
      }
      toast.success('Tipo actualizado')
    } else {
      const { problem, status } = await apiPost('/VTS/TiposIdentificacion', body)
      if (problem) {
        setFormError(problem.detail ?? `Error ${status}`)
        return
      }
      toast.success('Tipo creado')
      form.reset({ tipoIdentificacion: '' })
    }
    setEditing(null)
    await onReload()
  })

  const onConfirmDelete = async () => {
    if (!deleteTarget) return
    const { problem, status } = await apiDelete(`/VTS/TiposIdentificacion/${deleteTarget.tipoIdentificacionId}`)
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
          <h2 className="h5 mb-0">Tipos de identificación</h2>
          <button type="button" className="btn btn-sm btn-outline-primary" onClick={openCreate}>
            <i className="mdi mdi-plus mr-1" /> Nuevo tipo
          </button>
        </div>

        <form className="row g-2 align-items-end mb-4" onSubmit={(e) => void onSave(e)}>
          <div className="col-md-8">
            <label className="cq-label small">Nombre</label>
            <input className="form-control" {...form.register('tipoIdentificacion')} />
            {form.formState.errors.tipoIdentificacion && (
              <span className="text-danger small">{form.formState.errors.tipoIdentificacion.message}</span>
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
        {!loading && tipos.length === 0 && (
          <p className="text-muted">Sin tipos en catálogo. Agrega INE, Pasaporte, etc.</p>
        )}
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
                <tr
                  key={t.tipoIdentificacionId}
                  className={editing?.tipoIdentificacionId === t.tipoIdentificacionId ? 'cq-row-active' : undefined}
                >
                  <td>{t.tipoIdentificacion}</td>
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
        message={deleteTarget ? `¿Eliminar «${deleteTarget.tipoIdentificacion}»?` : ''}
        confirmLabel="Eliminar"
        variant="danger"
        onCancel={() => setDeleteTarget(null)}
        onConfirm={() => void onConfirmDelete()}
      />
    </div>
  )
}

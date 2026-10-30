import { zodResolver } from '@hookform/resolvers/zod'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { ConfirmDialog } from '../../../shared/components/admin'
import { apiDelete, apiPost, apiPut, type ApiProblem } from '../../../shared/lib/apiClient'
import { useToast } from '../../../shared/toast/ToastContext'
import type { TipoArchivoItem } from '../../../shared/types/archivos'

const tipoSchema = z.object({
  tipoArchivo: z.string().trim().min(1, 'Nombre requerido'),
})

type TipoForm = z.infer<typeof tipoSchema>

function mapProblem(problem: ApiProblem | undefined, status: number) {
  if (problem?.code === 'TIPO_DUPLICADO') return 'Ya existe un tipo con ese nombre.'
  return problem?.detail ?? `Error ${status}`
}

type Props = {
  tipos: TipoArchivoItem[]
  loading: boolean
  onReload: () => Promise<void>
}

export function AdminTiposArchivoSection({ tipos, loading, onReload }: Props) {
  const toast = useToast()
  const [editing, setEditing] = useState<TipoArchivoItem | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<TipoArchivoItem | null>(null)
  const [formError, setFormError] = useState<string | null>(null)

  const form = useForm<TipoForm>({
    resolver: zodResolver(tipoSchema),
    defaultValues: { tipoArchivo: '' },
  })

  const openCreate = () => {
    setEditing(null)
    setFormError(null)
    form.reset({ tipoArchivo: '' })
  }

  const openEdit = (t: TipoArchivoItem) => {
    setFormError(null)
    setEditing(t)
    form.reset({ tipoArchivo: t.tipoArchivo })
  }

  const onSave = form.handleSubmit(async (values) => {
    setFormError(null)
    if (editing) {
      const { problem, status } = await apiPut(`/ARC/TiposArchivo/${editing.tipoArchivoId}`, values)
      if (problem) {
        setFormError(mapProblem(problem, status))
        return
      }
      toast.success('Tipo actualizado')
    } else {
      const { problem, status } = await apiPost('/ARC/TiposArchivo', values)
      if (problem) {
        setFormError(mapProblem(problem, status))
        return
      }
      toast.success('Tipo creado')
      form.reset({ tipoArchivo: '' })
    }
    setEditing(null)
    await onReload()
  })

  const onConfirmDelete = async () => {
    if (!deleteTarget) return
    const { problem, status } = await apiDelete(`/ARC/TiposArchivo/${deleteTarget.tipoArchivoId}`)
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
      <div className="card-body pt-3">
        <div className="d-flex flex-wrap justify-content-between align-items-center mb-3 gap-2">
          <p className="text-muted mb-0 small">Clasificación al subir archivos.</p>
          <button type="button" className="btn btn-primary btn-sm" onClick={openCreate}>
            <i className="mdi mdi-plus mr-1" />
            Nuevo tipo
          </button>
        </div>

        {formError && (
          <div className="alert alert-danger py-2 small" role="alert">
            {formError}
          </div>
        )}

        <form className="mb-3 border rounded p-3 bg-light" onSubmit={(e) => void onSave(e)}>
          <div className="form-group mb-2">
            <label className="cq-label" htmlFor="tipo-archivo-nombre-tab">
              {editing ? 'Editar tipo' : 'Nuevo tipo'}
            </label>
            <input id="tipo-archivo-nombre-tab" className="form-control form-control-sm" {...form.register('tipoArchivo')} />
            {form.formState.errors.tipoArchivo && (
              <span className="text-danger small">{form.formState.errors.tipoArchivo.message}</span>
            )}
          </div>
          <div className="d-flex gap-2">
            <button type="submit" className="btn btn-primary btn-sm">
              {editing ? 'Guardar' : 'Crear'}
            </button>
            {editing && (
              <button type="button" className="btn btn-outline-secondary btn-sm" onClick={openCreate}>
                Cancelar edición
              </button>
            )}
          </div>
        </form>

        {loading && <p className="text-muted">Cargando…</p>}
        {!loading && tipos.length === 0 && (
          <p className="text-muted mb-0">No hay tipos de documento.</p>
        )}
        {!loading && tipos.length > 0 && (
          <div className="table-responsive">
            <table className="table table-sm mb-0">
              <thead>
                <tr>
                  <th>Tipo</th>
                  <th className="text-center">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {tipos.map((t) => (
                  <tr key={t.tipoArchivoId}>
                    <td className="min-w-0 text-break">{t.tipoArchivo}</td>
                    <td className="text-center cq-actions">
                      <button type="button" className="btn btn-link btn-sm" onClick={() => openEdit(t)} aria-label={`Editar ${t.tipoArchivo}`}>
                        <i className="mdi mdi-pencil" />
                      </button>
                      <button type="button" className="btn btn-link btn-sm text-danger" onClick={() => setDeleteTarget(t)} aria-label={`Eliminar ${t.tipoArchivo}`}>
                        <i className="mdi mdi-delete" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <ConfirmDialog
          open={deleteTarget !== null}
          title="Eliminar tipo"
          message={
            deleteTarget
              ? `¿Eliminar "${deleteTarget.tipoArchivo}"? Los archivos existentes conservan su tipo.`
              : ''
          }
          confirmLabel="Eliminar"
          variant="danger"
          onCancel={() => setDeleteTarget(null)}
          onConfirm={() => void onConfirmDelete()}
        />
      </div>
    </div>
  )
}

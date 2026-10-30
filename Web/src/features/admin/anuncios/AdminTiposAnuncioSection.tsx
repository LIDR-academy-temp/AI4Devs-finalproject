import { zodResolver } from '@hookform/resolvers/zod'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { ConfirmDialog } from '../../../shared/components/admin'
import { apiDelete, apiPost, apiPut } from '../../../shared/lib/apiClient'
import { useToast } from '../../../shared/toast/ToastContext'
import type { TipoAnuncioItem } from '../../../shared/types/anuncios'

const tipoSchema = z.object({
  tipoAnuncio: z.string().trim().min(1, 'Nombre requerido'),
})

type TipoForm = z.infer<typeof tipoSchema>

type Props = {
  tipos: TipoAnuncioItem[]
  loading: boolean
  onReload: () => Promise<void>
}

export function AdminTiposAnuncioSection({ tipos, loading, onReload }: Props) {
  const toast = useToast()
  const [editing, setEditing] = useState<TipoAnuncioItem | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<TipoAnuncioItem | null>(null)
  const [formError, setFormError] = useState<string | null>(null)

  const form = useForm<TipoForm>({
    resolver: zodResolver(tipoSchema),
    defaultValues: { tipoAnuncio: '' },
  })

  const openCreate = () => {
    setEditing(null)
    setFormError(null)
    form.reset({ tipoAnuncio: '' })
  }

  const openEdit = (t: TipoAnuncioItem) => {
    setFormError(null)
    setEditing(t)
    form.reset({ tipoAnuncio: t.tipoAnuncio })
  }

  const onSave = form.handleSubmit(async (values) => {
    setFormError(null)
    const body = { tipoAnuncio: values.tipoAnuncio }
    if (editing) {
      const { problem, status } = await apiPut(`/ANM/TiposAnuncio/${editing.tipoAnuncioId}`, body)
      if (problem) {
        setFormError(problem.detail ?? `Error ${status}`)
        return
      }
      toast.success('Tipo actualizado')
    } else {
      const { problem, status } = await apiPost('/ANM/TiposAnuncio', body)
      if (problem) {
        setFormError(problem.detail ?? `Error ${status}`)
        return
      }
      toast.success('Tipo creado')
      form.reset({ tipoAnuncio: '' })
    }
    setEditing(null)
    await onReload()
  })

  const onConfirmDelete = async () => {
    if (!deleteTarget) return
    const { problem, status } = await apiDelete(`/ANM/TiposAnuncio/${deleteTarget.tipoAnuncioId}`)
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
          <p className="text-muted mb-0 small">Catálogo usado al publicar anuncios.</p>
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
            <label className="cq-label" htmlFor="tipo-anuncio-nombre">
              {editing ? 'Editar tipo' : 'Nuevo tipo'}
            </label>
            <input id="tipo-anuncio-nombre" className="form-control form-control-sm" {...form.register('tipoAnuncio')} />
            {form.formState.errors.tipoAnuncio && (
              <span className="text-danger small">{form.formState.errors.tipoAnuncio.message}</span>
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

        {loading && <p className="text-muted">Cargando tipos…</p>}
        {!loading && tipos.length === 0 && (
          <p className="text-muted mb-0">No hay tipos. Crea al menos uno o ejecuta DB-003 en la base.</p>
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
                  <tr key={t.tipoAnuncioId}>
                    <td className="min-w-0 text-break">{t.tipoAnuncio}</td>
                    <td className="text-center cq-actions">
                      <button type="button" className="btn btn-link btn-sm" onClick={() => openEdit(t)} aria-label={`Editar ${t.tipoAnuncio}`}>
                        <i className="mdi mdi-pencil" />
                      </button>
                      <button type="button" className="btn btn-link btn-sm text-danger" onClick={() => setDeleteTarget(t)} aria-label={`Eliminar ${t.tipoAnuncio}`}>
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
          title="Eliminar tipo de anuncio"
          message={
            deleteTarget
              ? `¿Eliminar "${deleteTarget.tipoAnuncio}"? No afecta anuncios ya publicados.`
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

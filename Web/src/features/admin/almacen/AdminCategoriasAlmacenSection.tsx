import { zodResolver } from '@hookform/resolvers/zod'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { ConfirmDialog } from '../../../shared/components/admin'
import { apiDelete, apiPost, apiPut } from '../../../shared/lib/apiClient'
import { useToast } from '../../../shared/toast/ToastContext'
import type { CategoriaDto } from '../../../shared/types/almacen'

const categoriaSchema = z.object({
  nombre: z.string().trim().min(1, 'Nombre requerido'),
})

type CategoriaForm = z.infer<typeof categoriaSchema>

type Props = {
  categorias: CategoriaDto[]
  loading: boolean
  onReload: () => Promise<void>
}

export function AdminCategoriasAlmacenSection({ categorias, loading, onReload }: Props) {
  const toast = useToast()
  const [editing, setEditing] = useState<CategoriaDto | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<CategoriaDto | null>(null)
  const [formError, setFormError] = useState<string | null>(null)

  const form = useForm<CategoriaForm>({
    resolver: zodResolver(categoriaSchema),
    defaultValues: { nombre: '' },
  })

  const openCreate = () => {
    setEditing(null)
    setFormError(null)
    form.reset({ nombre: '' })
  }

  const openEdit = (c: CategoriaDto) => {
    setFormError(null)
    setEditing(c)
    form.reset({ nombre: c.nombre })
  }

  const onSave = form.handleSubmit(async (values) => {
    setFormError(null)
    const body = { nombre: values.nombre }
    if (editing) {
      const { problem, status } = await apiPut(`/WMS/Articulos/categorias/${editing.categoriaId}`, body)
      if (problem) {
        setFormError(problem.detail ?? `Error ${status}`)
        return
      }
      toast.success('Categoría actualizada')
    } else {
      const { problem, status } = await apiPost('/WMS/Articulos/categorias', body)
      if (problem) {
        setFormError(problem.detail ?? `Error ${status}`)
        return
      }
      toast.success('Categoría creada')
      form.reset({ nombre: '' })
    }
    setEditing(null)
    await onReload()
  })

  const onConfirmDelete = async () => {
    if (!deleteTarget) return
    const { problem, status } = await apiDelete(`/WMS/Articulos/categorias/${deleteTarget.categoriaId}`)
    if (problem) {
      toast.error(problem.detail ?? `Error ${status}`)
      return
    }
    setDeleteTarget(null)
    toast.success('Categoría eliminada')
    await onReload()
  }

  return (
    <div className="card">
      <div className="card-body">
        <div className="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-3">
          <h2 className="h5 mb-0">Categorías de artículo</h2>
          <button type="button" className="btn btn-sm btn-outline-primary" onClick={openCreate}>
            <i className="mdi mdi-plus mr-1" /> Nueva categoría
          </button>
        </div>

        <form className="row g-2 align-items-end mb-4" onSubmit={(e) => void onSave(e)}>
          <div className="col-md-8">
            <label className="cq-label small">Nombre</label>
            <input className="form-control" {...form.register('nombre')} />
            {form.formState.errors.nombre && (
              <span className="text-danger small">{form.formState.errors.nombre.message}</span>
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
        {!loading && categorias.length === 0 && <p className="text-muted">Sin categorías. Crea la primera arriba.</p>}
        {!loading && categorias.length > 0 && (
          <table className="table table-sm cq-admin-table mb-0">
            <thead>
              <tr>
                <th>Categoría</th>
                <th className="text-end">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {categorias.map((c) => (
                <tr key={c.categoriaId} className={editing?.categoriaId === c.categoriaId ? 'cq-row-active' : undefined}>
                  <td>{c.nombre}</td>
                  <td className="text-end cq-actions">
                    <button type="button" className="btn btn-link btn-sm" onClick={() => openEdit(c)} aria-label="Editar">
                      <i className="mdi mdi-pencil" />
                    </button>
                    <button
                      type="button"
                      className="btn btn-link btn-sm text-danger"
                      onClick={() => setDeleteTarget(c)}
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
        title="Eliminar categoría"
        message={deleteTarget ? `¿Eliminar «${deleteTarget.nombre}»? Los artículos conservan la referencia hasta que los edites.` : ''}
        confirmLabel="Eliminar"
        variant="danger"
        onCancel={() => setDeleteTarget(null)}
        onConfirm={() => void onConfirmDelete()}
      />
    </div>
  )
}

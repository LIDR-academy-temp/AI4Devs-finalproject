import { zodResolver } from '@hookform/resolvers/zod'
import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import {
  AdminListToolbar,
  AdminMobileCardList,
  AdminSidePanel,
  AdminSplitLayout,
  ConfirmDialog,
} from '../../../shared/components/admin'
import { apiDelete, apiPost, apiPut } from '../../../shared/lib/apiClient'
import { useToast } from '../../../shared/toast/ToastContext'
import type { CategoriaDto } from '../../../shared/types/almacen'
import { CategoriaAdminMobileCard } from './CategoriaAdminMobileCard'

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
  const [panelOpen, setPanelOpen] = useState(false)
  const [editing, setEditing] = useState<CategoriaDto | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<CategoriaDto | null>(null)
  const [formError, setFormError] = useState<string | null>(null)

  const form = useForm<CategoriaForm>({
    resolver: zodResolver(categoriaSchema),
    defaultValues: { nombre: '' },
  })

  const closePanel = () => {
    setPanelOpen(false)
    setEditing(null)
    setFormError(null)
  }

  const openCreate = () => {
    setEditing(null)
    setFormError(null)
    form.reset({ nombre: '' })
    setPanelOpen(true)
  }

  const openEdit = (c: CategoriaDto) => {
    setFormError(null)
    setEditing(c)
    form.reset({ nombre: c.nombre })
    setPanelOpen(true)
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
    }
    closePanel()
    await onReload()
  })

  const onConfirmDelete = async () => {
    if (!deleteTarget) return
    const { problem, status } = await apiDelete(`/WMS/Articulos/categorias/${deleteTarget.categoriaId}`)
    if (problem) {
      toast.error(problem.detail ?? `Error ${status}`)
      return
    }
    if (editing?.categoriaId === deleteTarget.categoriaId) closePanel()
    setDeleteTarget(null)
    toast.success('Categoría eliminada')
    await onReload()
  }

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && panelOpen) closePanel()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [panelOpen])

  const formFooter = (
    <>
      <button type="button" className="btn btn-primary flex-grow-1" onClick={() => void onSave()}>
        <i className={`mdi ${editing ? 'mdi-content-save' : 'mdi-plus'} mr-1`} />
        {editing ? 'Actualizar' : 'Crear'}
      </button>
      <button type="button" className="btn btn-outline-secondary" onClick={closePanel}>
        Cancelar
      </button>
    </>
  )

  return (
    <>
      <AdminListToolbar
        title="Categorías"
        metrics={[{ label: 'Categorías', value: categorias.length }]}
        primaryAction={{
          label: 'Nueva categoría',
          iconClass: 'mdi mdi-shape-outline',
          onClick: openCreate,
        }}
      />

      <AdminSplitLayout
        panelOpen={panelOpen}
        tablePane={
          <div className="card">
            <div className="card-body pt-3">
              {loading && (
                <div className="placeholder-glow" aria-label="Cargando categorías">
                  <span className="placeholder col-12 mb-2" />
                  <span className="placeholder col-10" />
                </div>
              )}

              {!loading && categorias.length === 0 && (
                <div className="cq-empty-state">
                  <i className="mdi mdi-shape-outline cq-empty-icon" />
                  <p className="cq-empty-title">Sin categorías</p>
                  <p className="text-muted">Crea la primera categoría para clasificar artículos.</p>
                  <button type="button" className="btn btn-primary btn-sm mt-2" onClick={openCreate}>
                    Nueva categoría
                  </button>
                </div>
              )}

              {!loading && categorias.length > 0 && (
                <>
                  <div className="table-responsive cq-admin-table-pane">
                    <table className="table table-striped table-hover align-middle mb-0">
                      <thead>
                        <tr>
                          <th>Categoría</th>
                          <th className="text-center cq-actions">Acciones</th>
                        </tr>
                      </thead>
                      <tbody>
                        {categorias.map((c) => (
                          <tr
                            key={c.categoriaId}
                            className={editing?.categoriaId === c.categoriaId ? 'cq-row-active' : undefined}
                          >
                            <td className="min-w-0">
                              <strong className="text-break">{c.nombre}</strong>
                            </td>
                            <td className="text-center cq-actions">
                              <button
                                type="button"
                                className="btn btn-link btn-sm"
                                onClick={() => openEdit(c)}
                                aria-label={`Editar ${c.nombre}`}
                              >
                                <i className="mdi mdi-pencil" />
                              </button>
                              <button
                                type="button"
                                className="btn btn-link btn-sm text-danger"
                                onClick={() => setDeleteTarget(c)}
                                aria-label={`Eliminar ${c.nombre}`}
                              >
                                <i className="mdi mdi-delete" />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <AdminMobileCardList
                    rows={categorias}
                    getRowKey={(c) => c.categoriaId}
                    renderCard={(c) => (
                      <CategoriaAdminMobileCard
                        categoria={c}
                        active={editing?.categoriaId === c.categoriaId}
                        onEdit={openEdit}
                        onDelete={setDeleteTarget}
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
            title={editing ? 'Editar categoría' : 'Nueva categoría'}
            subtitle="Nombre visible al asignar categoría a un artículo."
            iconClass={editing ? 'mdi mdi-pencil' : 'mdi mdi-shape-outline'}
            editing={Boolean(editing)}
            onClose={closePanel}
            footer={formFooter}
          >
            {formError && (
              <div className="alert alert-danger py-2 small" role="alert">
                {formError}
              </div>
            )}
            <div className="form-group mb-0">
              <label className="cq-label" htmlFor="cat-nombre">
                Nombre <span className="text-danger">*</span>
              </label>
              <input id="cat-nombre" className="form-control" {...form.register('nombre')} />
              {form.formState.errors.nombre && (
                <span className="text-danger small d-block">{form.formState.errors.nombre.message}</span>
              )}
            </div>
          </AdminSidePanel>
        }
      />

      <ConfirmDialog
        open={deleteTarget !== null}
        title="Eliminar categoría"
        message={
          deleteTarget
            ? `¿Eliminar «${deleteTarget.nombre}»? Los artículos conservan la referencia hasta que los edites.`
            : ''
        }
        confirmLabel="Eliminar"
        variant="danger"
        onCancel={() => setDeleteTarget(null)}
        onConfirm={() => void onConfirmDelete()}
      />
    </>
  )
}

import { zodResolver } from '@hookform/resolvers/zod'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { ConfirmDialog } from '../../../shared/components/admin'
import { apiDelete, apiPost, apiPut } from '../../../shared/lib/apiClient'
import { useToast } from '../../../shared/toast/ToastContext'
import type { TipoCuentaFnz } from '../../../shared/types/finanzasAdmin'

const tipoSchema = z.object({
  nombre: z.string().trim().min(1, 'Nombre requerido').max(50),
  descripcion: z.string().trim().max(200).optional().or(z.literal('')),
})

type TipoForm = z.infer<typeof tipoSchema>

type Props = {
  tipos: TipoCuentaFnz[]
  loading: boolean
  onReload: () => Promise<void>
  catalogoPendiente?: boolean
}

export function AdminTiposCuentaFnzSection({
  tipos,
  loading,
  onReload,
  catalogoPendiente,
}: Props) {
  const toast = useToast()
  const [editing, setEditing] = useState<TipoCuentaFnz | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<TipoCuentaFnz | null>(null)
  const [formError, setFormError] = useState<string | null>(null)

  const form = useForm<TipoForm>({
    resolver: zodResolver(tipoSchema),
    defaultValues: { nombre: '', descripcion: '' },
  })

  const openCreate = () => {
    setEditing(null)
    setFormError(null)
    form.reset({ nombre: '', descripcion: '' })
  }

  const openEdit = (t: TipoCuentaFnz) => {
    setFormError(null)
    setEditing(t)
    form.reset({ nombre: t.nombre, descripcion: t.descripcion ?? '' })
  }

  const onSave = form.handleSubmit(async (values) => {
    setFormError(null)
    const body = {
      nombre: values.nombre,
      descripcion: values.descripcion?.trim() ? values.descripcion.trim() : null,
    }
    if (editing) {
      const { problem, status } = await apiPut(`/FNZ/TiposCuenta/admin/${editing.tipoCuentaId}`, body)
      if (status !== 200) {
        setFormError(problem?.detail ?? `Error ${status}`)
        return
      }
      toast.success('Tipo actualizado')
    } else {
      const { problem, status } = await apiPost('/FNZ/TiposCuenta/admin', body)
      if (status !== 201) {
        setFormError(problem?.detail ?? `Error ${status}`)
        return
      }
      toast.success('Tipo creado')
      form.reset({ nombre: '', descripcion: '' })
    }
    setEditing(null)
    await onReload()
  })

  const onConfirmDelete = async () => {
    if (!deleteTarget) return
    const { problem, status } = await apiDelete(`/FNZ/TiposCuenta/admin/${deleteTarget.tipoCuentaId}`)
    if (status !== 204) {
      toast.error(problem?.detail ?? `Error ${status}`)
      return
    }
    setDeleteTarget(null)
    toast.success('Tipo eliminado')
    await onReload()
  }

  return (
    <>
      <div className="card">
        <div className="card-body pt-3">
          <div className="d-flex flex-wrap justify-content-between align-items-center mb-3 gap-2">
            <div>
              <h2 className="h5 mb-1">Tipos de cuenta</h2>
              <p className="text-muted mb-0 small">
                Catálogo para el campo «Tipo» al crear cuentas contables (fnz.TiposCuenta).
              </p>
            </div>
            <button type="button" className="btn btn-primary btn-sm" onClick={openCreate}>
              <i className="mdi mdi-plus mr-1" />
              Nuevo tipo
            </button>
          </div>

          {catalogoPendiente && (
            <div className="alert alert-warning py-2 small" role="alert">
              Falta la tabla en BD. Ejecuta{' '}
              <code className="text-break">SQL/20261029_fnz_tipos_cuenta_catalog.sql</code> y recarga.
            </div>
          )}

          {formError && (
            <div className="alert alert-danger py-2 small" role="alert">
              {formError}
            </div>
          )}

          <form className="mb-3 border rounded p-3 bg-light" onSubmit={(e) => void onSave(e)}>
            <div className="form-group mb-2">
              <label className="cq-label" htmlFor="tipo-cuenta-nombre">
                {editing ? 'Editar tipo' : 'Nuevo tipo'}
              </label>
              <input
                id="tipo-cuenta-nombre"
                className="form-control form-control-sm"
                {...form.register('nombre')}
              />
              {form.formState.errors.nombre && (
                <span className="text-danger small">{form.formState.errors.nombre.message}</span>
              )}
            </div>
            <div className="form-group mb-2">
              <label className="cq-label" htmlFor="tipo-cuenta-desc">
                Descripción (opcional)
              </label>
              <input
                id="tipo-cuenta-desc"
                className="form-control form-control-sm"
                {...form.register('descripcion')}
              />
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
          {!loading && tipos.length === 0 && !catalogoPendiente && (
            <p className="text-muted mb-0">Sin tipos. Crea uno o aplica el script SQL con datos iniciales.</p>
          )}
          {!loading && tipos.length > 0 && (
            <div className="table-responsive">
              <table className="table table-sm table-hover mb-0">
                <thead>
                  <tr>
                    <th>Nombre</th>
                    <th>Descripción</th>
                    <th className="text-center">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {tipos.map((t) => (
                    <tr key={t.tipoCuentaId}>
                      <td className="font-weight-bold">{t.nombre}</td>
                      <td className="text-muted small">{t.descripcion ?? '—'}</td>
                      <td className="text-center cq-actions text-nowrap">
                        <button
                          type="button"
                          className="btn btn-link btn-sm"
                          aria-label={`Editar ${t.nombre}`}
                          onClick={() => openEdit(t)}
                        >
                          <i className="mdi mdi-pencil" />
                        </button>
                        <button
                          type="button"
                          className="btn btn-link btn-sm text-danger"
                          aria-label={`Eliminar ${t.nombre}`}
                          onClick={() => setDeleteTarget(t)}
                        >
                          <i className="mdi mdi-delete" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
      <ConfirmDialog
        open={deleteTarget !== null}
        title="Eliminar tipo de cuenta"
        message={`¿Eliminar «${deleteTarget?.nombre}»? No debe haber cuentas contables con ese tipo.`}
        confirmLabel="Eliminar"
        variant="danger"
        onConfirm={() => void onConfirmDelete()}
        onCancel={() => setDeleteTarget(null)}
      />
    </>
  )
}

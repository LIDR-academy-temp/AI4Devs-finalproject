import { zodResolver } from '@hookform/resolvers/zod'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { ConfirmDialog } from '../../../shared/components/admin'
import { apiDelete, apiPost, apiPut } from '../../../shared/lib/apiClient'
import { useToast } from '../../../shared/toast/ToastContext'
import type { MarcaDto, ModeloDto } from '../../../shared/types/vehiculos'
import {
  marcaAdminSchema,
  modeloAdminSchema,
  type MarcaAdminForm,
  type ModeloAdminForm,
} from './vehiculosCatalogSchemas'

type MarcasProps = {
  marcas: MarcaDto[]
  loading: boolean
  onReload: () => Promise<void>
}

export function AdminMarcasVehiculoSection({ marcas, loading, onReload }: MarcasProps) {
  const toast = useToast()
  const [editing, setEditing] = useState<MarcaDto | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<MarcaDto | null>(null)
  const [formError, setFormError] = useState<string | null>(null)

  const form = useForm<MarcaAdminForm>({
    resolver: zodResolver(marcaAdminSchema),
    defaultValues: { marca: '' },
  })

  const openCreate = () => {
    setEditing(null)
    setFormError(null)
    form.reset({ marca: '' })
  }

  const openEdit = (m: MarcaDto) => {
    setFormError(null)
    setEditing(m)
    form.reset({ marca: m.marca })
  }

  const onSave = form.handleSubmit(async (values) => {
    setFormError(null)
    const body = { marca: values.marca }
    if (editing) {
      const { problem, status } = await apiPut(`/USR/Marcas/${editing.marcaId}`, body)
      if (problem) {
        setFormError(problem.detail ?? `Error ${status}`)
        return
      }
      toast.success('Marca actualizada')
    } else {
      const { problem, status } = await apiPost('/USR/Marcas', body)
      if (problem) {
        setFormError(problem.detail ?? `Error ${status}`)
        return
      }
      toast.success('Marca creada')
      form.reset({ marca: '' })
    }
    setEditing(null)
    await onReload()
  })

  const onConfirmDelete = async () => {
    if (!deleteTarget) return
    const { problem, status } = await apiDelete(`/USR/Marcas/${deleteTarget.marcaId}`)
    if (problem) {
      toast.error(problem.detail ?? `Error ${status}`)
      return
    }
    setDeleteTarget(null)
    toast.success('Marca eliminada')
    await onReload()
  }

  return (
    <div className="card">
      <div className="card-body">
        <div className="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-3">
          <h2 className="h5 mb-0">Marcas</h2>
          <button type="button" className="btn btn-sm btn-outline-primary" onClick={openCreate}>
            <i className="mdi mdi-plus mr-1" /> Nueva marca
          </button>
        </div>

        <form className="row g-2 align-items-end mb-4" onSubmit={(e) => void onSave(e)}>
          <div className="col-md-8">
            <label className="cq-label small">Marca</label>
            <input className="form-control" {...form.register('marca')} />
            {form.formState.errors.marca && (
              <span className="text-danger small">{form.formState.errors.marca.message}</span>
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
        {!loading && marcas.length === 0 && <p className="text-muted">Sin marcas registradas.</p>}
        {!loading && marcas.length > 0 && (
          <table className="table table-sm cq-admin-table mb-0">
            <thead>
              <tr>
                <th>Marca</th>
                <th className="text-end">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {marcas.map((m) => (
                <tr key={m.marcaId} className={editing?.marcaId === m.marcaId ? 'cq-row-active' : undefined}>
                  <td>{m.marca}</td>
                  <td className="text-end cq-actions">
                    <button type="button" className="btn btn-link btn-sm" onClick={() => openEdit(m)} aria-label="Editar">
                      <i className="mdi mdi-pencil" />
                    </button>
                    <button
                      type="button"
                      className="btn btn-link btn-sm text-danger"
                      onClick={() => setDeleteTarget(m)}
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
        title="Eliminar marca"
        message={deleteTarget ? `¿Eliminar la marca «${deleteTarget.marca}»?` : ''}
        confirmLabel="Eliminar"
        variant="danger"
        onCancel={() => setDeleteTarget(null)}
        onConfirm={() => void onConfirmDelete()}
      />
    </div>
  )
}

type ModelosProps = {
  modelos: ModeloDto[]
  marcas: MarcaDto[]
  loading: boolean
  onReload: () => Promise<void>
}

export function AdminModelosVehiculoSection({ modelos, marcas, loading, onReload }: ModelosProps) {
  const toast = useToast()
  const [editing, setEditing] = useState<ModeloDto | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<ModeloDto | null>(null)
  const [formError, setFormError] = useState<string | null>(null)

  const form = useForm<ModeloAdminForm>({
    resolver: zodResolver(modeloAdminSchema),
    defaultValues: { marcaId: '', modelo: '' },
  })

  const openCreate = () => {
    setEditing(null)
    setFormError(null)
    form.reset({ marcaId: '', modelo: '' })
  }

  const openEdit = (m: ModeloDto) => {
    setFormError(null)
    setEditing(m)
    form.reset({ marcaId: String(m.marcaId), modelo: m.modelo })
  }

  const onSave = form.handleSubmit(async (values) => {
    setFormError(null)
    const body = { marcaId: Number(values.marcaId), modelo: values.modelo.trim() }
    if (editing) {
      const { problem, status } = await apiPut(`/USR/Modelos/${editing.modeloId}`, body)
      if (problem) {
        setFormError(problem.detail ?? `Error ${status}`)
        return
      }
      toast.success('Modelo actualizado')
    } else {
      const { problem, status } = await apiPost('/USR/Modelos', body)
      if (problem) {
        setFormError(problem.detail ?? `Error ${status}`)
        return
      }
      toast.success('Modelo creado')
      form.reset({ marcaId: '', modelo: '' })
    }
    setEditing(null)
    await onReload()
  })

  const onConfirmDelete = async () => {
    if (!deleteTarget) return
    const { problem, status } = await apiDelete(`/USR/Modelos/${deleteTarget.modeloId}`)
    if (problem) {
      toast.error(problem.detail ?? `Error ${status}`)
      return
    }
    setDeleteTarget(null)
    toast.success('Modelo eliminado')
    await onReload()
  }

  const marcaLabel = (id: number) => marcas.find((m) => m.marcaId === id)?.marca ?? `#${id}`

  return (
    <div className="card">
      <div className="card-body">
        <div className="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-3">
          <h2 className="h5 mb-0">Modelos</h2>
          <button type="button" className="btn btn-sm btn-outline-primary" onClick={openCreate}>
            <i className="mdi mdi-plus mr-1" /> Nuevo modelo
          </button>
        </div>

        <form className="row g-2 align-items-end mb-4" onSubmit={(e) => void onSave(e)}>
          <div className="col-md-4">
            <label className="cq-label small">Marca</label>
            <select className="form-control" {...form.register('marcaId')}>
              <option value="">Seleccione…</option>
              {marcas.map((m) => (
                <option key={m.marcaId} value={m.marcaId}>{m.marca}</option>
              ))}
            </select>
            {form.formState.errors.marcaId && (
              <span className="text-danger small">{form.formState.errors.marcaId.message}</span>
            )}
          </div>
          <div className="col-md-5">
            <label className="cq-label small">Modelo</label>
            <input className="form-control" {...form.register('modelo')} />
            {form.formState.errors.modelo && (
              <span className="text-danger small">{form.formState.errors.modelo.message}</span>
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
        {!loading && modelos.length === 0 && <p className="text-muted">Sin modelos registrados.</p>}
        {!loading && modelos.length > 0 && (
          <table className="table table-sm cq-admin-table mb-0">
            <thead>
              <tr>
                <th>Modelo</th>
                <th>Marca</th>
                <th className="text-end">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {modelos.map((m) => (
                <tr key={m.modeloId} className={editing?.modeloId === m.modeloId ? 'cq-row-active' : undefined}>
                  <td>{m.modelo}</td>
                  <td>{marcaLabel(m.marcaId)}</td>
                  <td className="text-end cq-actions">
                    <button type="button" className="btn btn-link btn-sm" onClick={() => openEdit(m)} aria-label="Editar">
                      <i className="mdi mdi-pencil" />
                    </button>
                    <button
                      type="button"
                      className="btn btn-link btn-sm text-danger"
                      onClick={() => setDeleteTarget(m)}
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
        title="Eliminar modelo"
        message={deleteTarget ? `¿Eliminar el modelo «${deleteTarget.modelo}»?` : ''}
        confirmLabel="Eliminar"
        variant="danger"
        onCancel={() => setDeleteTarget(null)}
        onConfirm={() => void onConfirmDelete()}
      />
    </div>
  )
}

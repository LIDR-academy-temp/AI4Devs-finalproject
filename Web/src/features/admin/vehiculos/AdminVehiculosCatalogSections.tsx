import { zodResolver } from '@hookform/resolvers/zod'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import {
  AdminCatalogCrudShell,
  AdminCatalogRowActions,
  useAdminPanelEscape,
} from '../../../shared/components/admin'
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
  const [panelOpen, setPanelOpen] = useState(false)
  const [editing, setEditing] = useState<MarcaDto | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<MarcaDto | null>(null)
  const [formError, setFormError] = useState<string | null>(null)

  const form = useForm<MarcaAdminForm>({
    resolver: zodResolver(marcaAdminSchema),
    defaultValues: { marca: '' },
  })

  const closePanel = () => {
    setPanelOpen(false)
    setEditing(null)
    setFormError(null)
  }

  useAdminPanelEscape(panelOpen, closePanel)

  const openCreate = () => {
    setEditing(null)
    setFormError(null)
    form.reset({ marca: '' })
    setPanelOpen(true)
  }

  const openEdit = (m: MarcaDto) => {
    setFormError(null)
    setEditing(m)
    form.reset({ marca: m.marca })
    setPanelOpen(true)
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
    }
    closePanel()
    await onReload()
  })

  const onConfirmDelete = async () => {
    if (!deleteTarget) return
    const { problem, status } = await apiDelete(`/USR/Marcas/${deleteTarget.marcaId}`)
    if (problem) {
      toast.error(problem.detail ?? `Error ${status}`)
      return
    }
    if (editing?.marcaId === deleteTarget.marcaId) closePanel()
    setDeleteTarget(null)
    toast.success('Marca eliminada')
    await onReload()
  }

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
    <AdminCatalogCrudShell
      toolbarTitle="Marcas"
      metricLabel="Marcas"
      count={marcas.length}
      createLabel="Nueva marca"
      createIconClass="mdi mdi-car"
      onCreate={openCreate}
      panelOpen={panelOpen}
      panelTitle={editing ? 'Editar marca' : 'Nueva marca'}
      panelSubtitle="Fabricantes para el padrón de vehículos."
      panelIconClass={editing ? 'mdi mdi-pencil' : 'mdi mdi-car'}
      editing={Boolean(editing)}
      onClosePanel={closePanel}
      formFooter={formFooter}
      loading={loading}
      isEmpty={marcas.length === 0}
      emptyIconClass="mdi mdi-car"
      emptyTitle="Sin marcas registradas"
      emptyDescription="Registra marcas antes de capturar modelos."
      tableHead={
        <tr>
          <th>Marca</th>
          <th className="text-center cq-actions">Acciones</th>
        </tr>
      }
      tableBody={marcas.map((m) => (
        <tr key={m.marcaId} className={editing?.marcaId === m.marcaId ? 'cq-row-active' : undefined}>
          <td>
            <strong>{m.marca}</strong>
          </td>
          <AdminCatalogRowActions
            name={m.marca}
            onEdit={() => openEdit(m)}
            onDelete={() => setDeleteTarget(m)}
          />
        </tr>
      ))}
      panelChildren={
        <>
          {formError && (
            <div className="alert alert-danger py-2 small" role="alert">
              {formError}
            </div>
          )}
          <div className="form-group mb-0">
            <label className="cq-label" htmlFor="marca-nombre">
              Marca <span className="text-danger">*</span>
            </label>
            <input id="marca-nombre" className="form-control" {...form.register('marca')} />
            {form.formState.errors.marca && (
              <span className="text-danger small d-block">{form.formState.errors.marca.message}</span>
            )}
          </div>
        </>
      }
      deleteDialog={{
        open: deleteTarget !== null,
        title: 'Eliminar marca',
        message: deleteTarget ? `¿Eliminar la marca «${deleteTarget.marca}»?` : '',
        confirmLabel: 'Eliminar',
        variant: 'danger',
        onCancel: () => setDeleteTarget(null),
        onConfirm: () => void onConfirmDelete(),
      }}
    />
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
  const [panelOpen, setPanelOpen] = useState(false)
  const [editing, setEditing] = useState<ModeloDto | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<ModeloDto | null>(null)
  const [formError, setFormError] = useState<string | null>(null)

  const form = useForm<ModeloAdminForm>({
    resolver: zodResolver(modeloAdminSchema),
    defaultValues: { marcaId: '', modelo: '' },
  })

  const closePanel = () => {
    setPanelOpen(false)
    setEditing(null)
    setFormError(null)
  }

  useAdminPanelEscape(panelOpen, closePanel)

  const openCreate = () => {
    setEditing(null)
    setFormError(null)
    form.reset({ marcaId: marcas[0] ? String(marcas[0].marcaId) : '', modelo: '' })
    setPanelOpen(true)
  }

  const openEdit = (m: ModeloDto) => {
    setFormError(null)
    setEditing(m)
    form.reset({ marcaId: String(m.marcaId), modelo: m.modelo })
    setPanelOpen(true)
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
    }
    closePanel()
    await onReload()
  })

  const onConfirmDelete = async () => {
    if (!deleteTarget) return
    const { problem, status } = await apiDelete(`/USR/Modelos/${deleteTarget.modeloId}`)
    if (problem) {
      toast.error(problem.detail ?? `Error ${status}`)
      return
    }
    if (editing?.modeloId === deleteTarget.modeloId) closePanel()
    setDeleteTarget(null)
    toast.success('Modelo eliminado')
    await onReload()
  }

  const marcaLabel = (id: number) => marcas.find((m) => m.marcaId === id)?.marca ?? `#${id}`

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
    <AdminCatalogCrudShell
      toolbarTitle="Modelos"
      metricLabel="Modelos"
      count={modelos.length}
      createLabel="Nuevo modelo"
      createIconClass="mdi mdi-car-side"
      onCreate={openCreate}
      panelOpen={panelOpen}
      panelTitle={editing ? 'Editar modelo' : 'Nuevo modelo'}
      panelSubtitle="Cada modelo pertenece a una marca."
      panelIconClass={editing ? 'mdi mdi-pencil' : 'mdi mdi-car-side'}
      editing={Boolean(editing)}
      onClosePanel={closePanel}
      formFooter={formFooter}
      topBanner={
        marcas.length === 0 ? (
          <div className="alert alert-warning py-2 small mb-3" role="alert">
            Crea al menos una marca en la pestaña Marcas antes de registrar modelos.
          </div>
        ) : undefined
      }
      loading={loading}
      isEmpty={modelos.length === 0}
      emptyIconClass="mdi mdi-car-side"
      emptyTitle="Sin modelos registrados"
      emptyDescription="Define modelos por marca para el padrón vehicular."
      tableHead={
        <tr>
          <th>Modelo</th>
          <th>Marca</th>
          <th className="text-center cq-actions">Acciones</th>
        </tr>
      }
      tableBody={modelos.map((m) => (
        <tr key={m.modeloId} className={editing?.modeloId === m.modeloId ? 'cq-row-active' : undefined}>
          <td>
            <strong>{m.modelo}</strong>
          </td>
          <td>{marcaLabel(m.marcaId)}</td>
          <AdminCatalogRowActions
            name={m.modelo}
            onEdit={() => openEdit(m)}
            onDelete={() => setDeleteTarget(m)}
          />
        </tr>
      ))}
      panelChildren={
        <>
          {formError && (
            <div className="alert alert-danger py-2 small" role="alert">
              {formError}
            </div>
          )}
          <div className="form-group mb-3">
            <label className="cq-label" htmlFor="modelo-marca">
              Marca <span className="text-danger">*</span>
            </label>
            <select id="modelo-marca" className="form-control" {...form.register('marcaId')}>
              <option value="">Seleccione…</option>
              {marcas.map((m) => (
                <option key={m.marcaId} value={m.marcaId}>
                  {m.marca}
                </option>
              ))}
            </select>
            {form.formState.errors.marcaId && (
              <span className="text-danger small d-block">{form.formState.errors.marcaId.message}</span>
            )}
          </div>
          <div className="form-group mb-0">
            <label className="cq-label" htmlFor="modelo-nombre">
              Modelo <span className="text-danger">*</span>
            </label>
            <input id="modelo-nombre" className="form-control" {...form.register('modelo')} />
            {form.formState.errors.modelo && (
              <span className="text-danger small d-block">{form.formState.errors.modelo.message}</span>
            )}
          </div>
        </>
      }
      deleteDialog={{
        open: deleteTarget !== null,
        title: 'Eliminar modelo',
        message: deleteTarget ? `¿Eliminar el modelo «${deleteTarget.modelo}»?` : '',
        confirmLabel: 'Eliminar',
        variant: 'danger',
        onCancel: () => setDeleteTarget(null),
        onConfirm: () => void onConfirmDelete(),
      }}
    />
  )
}

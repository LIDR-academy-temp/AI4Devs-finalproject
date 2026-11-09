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
  const [panelOpen, setPanelOpen] = useState(false)
  const [editing, setEditing] = useState<TipoMascotaDto | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<TipoMascotaDto | null>(null)
  const [formError, setFormError] = useState<string | null>(null)

  const form = useForm<TipoMascotaAdminForm>({
    resolver: zodResolver(tipoMascotaAdminSchema),
    defaultValues: { tipoMascota: '' },
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
    form.reset({ tipoMascota: '' })
    setPanelOpen(true)
  }

  const openEdit = (t: TipoMascotaDto) => {
    setFormError(null)
    setEditing(t)
    form.reset({ tipoMascota: t.tipoMascota })
    setPanelOpen(true)
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
    }
    closePanel()
    await onReload()
  })

  const onConfirmDelete = async () => {
    if (!deleteTarget) return
    const { problem, status } = await apiDelete(`/USR/TiposMascota/${deleteTarget.tipoMascotaId}`)
    if (problem) {
      toast.error(problem.detail ?? `Error ${status}`)
      return
    }
    if (editing?.tipoMascotaId === deleteTarget.tipoMascotaId) closePanel()
    setDeleteTarget(null)
    toast.success('Tipo eliminado')
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
      toolbarTitle="Tipos de mascota"
      metricLabel="Tipos"
      count={tipos.length}
      createLabel="Nuevo tipo"
      createIconClass="mdi mdi-paw"
      onCreate={openCreate}
      panelOpen={panelOpen}
      panelTitle={editing ? 'Editar tipo' : 'Nuevo tipo de mascota'}
      panelSubtitle="Perro, gato u otras categorías del padrón."
      panelIconClass={editing ? 'mdi mdi-pencil' : 'mdi mdi-paw'}
      editing={Boolean(editing)}
      onClosePanel={closePanel}
      formFooter={formFooter}
      loading={loading}
      isEmpty={tipos.length === 0}
      emptyIconClass="mdi mdi-paw"
      emptyTitle="Sin tipos de mascota"
      emptyDescription="Registra las categorías antes de capturar razas."
      tableHead={
        <tr>
          <th>Tipo</th>
          <th className="text-center cq-actions">Acciones</th>
        </tr>
      }
      tableBody={tipos.map((t) => (
        <tr
          key={t.tipoMascotaId}
          className={editing?.tipoMascotaId === t.tipoMascotaId ? 'cq-row-active' : undefined}
        >
          <td>
            <strong>{t.tipoMascota}</strong>
          </td>
          <AdminCatalogRowActions
            name={t.tipoMascota}
            onEdit={() => openEdit(t)}
            onDelete={() => setDeleteTarget(t)}
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
            <label className="cq-label" htmlFor="tipo-mascota-nombre">
              Nombre <span className="text-danger">*</span>
            </label>
            <input id="tipo-mascota-nombre" className="form-control" {...form.register('tipoMascota')} />
            {form.formState.errors.tipoMascota && (
              <span className="text-danger small d-block">{form.formState.errors.tipoMascota.message}</span>
            )}
          </div>
        </>
      }
      deleteDialog={{
        open: deleteTarget !== null,
        title: 'Eliminar tipo',
        message: deleteTarget ? `¿Eliminar el tipo «${deleteTarget.tipoMascota}»?` : '',
        confirmLabel: 'Eliminar',
        variant: 'danger',
        onCancel: () => setDeleteTarget(null),
        onConfirm: () => void onConfirmDelete(),
      }}
    />
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
  const [panelOpen, setPanelOpen] = useState(false)
  const [editing, setEditing] = useState<RazaMascotaDto | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<RazaMascotaDto | null>(null)
  const [formError, setFormError] = useState<string | null>(null)

  const form = useForm<RazaMascotaAdminForm>({
    resolver: zodResolver(razaMascotaAdminSchema),
    defaultValues: { tipoMascotaId: '', razaMascota: '' },
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
    form.reset({ tipoMascotaId: tipos[0] ? String(tipos[0].tipoMascotaId) : '', razaMascota: '' })
    setPanelOpen(true)
  }

  const openEdit = (r: RazaMascotaDto) => {
    setFormError(null)
    setEditing(r)
    form.reset({
      tipoMascotaId: String(r.tipoMascotaId),
      razaMascota: r.razaMascota,
    })
    setPanelOpen(true)
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
    }
    closePanel()
    await onReload()
  })

  const onConfirmDelete = async () => {
    if (!deleteTarget) return
    const { problem, status } = await apiDelete(`/USR/RazasMascota/${deleteTarget.razaMascotaId}`)
    if (problem) {
      toast.error(problem.detail ?? `Error ${status}`)
      return
    }
    if (editing?.razaMascotaId === deleteTarget.razaMascotaId) closePanel()
    setDeleteTarget(null)
    toast.success('Raza eliminada')
    await onReload()
  }

  const tipoLabel = (id: number) => tipos.find((t) => t.tipoMascotaId === id)?.tipoMascota ?? `#${id}`

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
      toolbarTitle="Razas"
      metricLabel="Razas"
      count={razas.length}
      createLabel="Nueva raza"
      createIconClass="mdi mdi-dog"
      onCreate={openCreate}
      panelOpen={panelOpen}
      panelTitle={editing ? 'Editar raza' : 'Nueva raza'}
      panelSubtitle="Asocia cada raza a un tipo de mascota."
      panelIconClass={editing ? 'mdi mdi-pencil' : 'mdi mdi-dog'}
      editing={Boolean(editing)}
      onClosePanel={closePanel}
      formFooter={formFooter}
      topBanner={
        tipos.length === 0 ? (
          <div className="alert alert-warning py-2 small mb-3" role="alert">
            Crea al menos un tipo de mascota en la pestaña Tipos antes de registrar razas.
          </div>
        ) : undefined
      }
      loading={loading}
      isEmpty={razas.length === 0}
      emptyIconClass="mdi mdi-dog"
      emptyTitle="Sin razas registradas"
      emptyDescription="Define razas por tipo para el padrón de mascotas."
      tableHead={
        <tr>
          <th>Raza</th>
          <th>Tipo</th>
          <th className="text-center cq-actions">Acciones</th>
        </tr>
      }
      tableBody={razas.map((r) => (
        <tr
          key={r.razaMascotaId}
          className={editing?.razaMascotaId === r.razaMascotaId ? 'cq-row-active' : undefined}
        >
          <td>
            <strong>{r.razaMascota}</strong>
          </td>
          <td>{tipoLabel(r.tipoMascotaId)}</td>
          <AdminCatalogRowActions
            name={r.razaMascota}
            onEdit={() => openEdit(r)}
            onDelete={() => setDeleteTarget(r)}
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
            <label className="cq-label" htmlFor="raza-tipo">
              Tipo <span className="text-danger">*</span>
            </label>
            <select id="raza-tipo" className="form-control" {...form.register('tipoMascotaId')}>
              <option value="">Seleccione…</option>
              {tipos.map((t) => (
                <option key={t.tipoMascotaId} value={t.tipoMascotaId}>
                  {t.tipoMascota}
                </option>
              ))}
            </select>
            {form.formState.errors.tipoMascotaId && (
              <span className="text-danger small d-block">{form.formState.errors.tipoMascotaId.message}</span>
            )}
          </div>
          <div className="form-group mb-0">
            <label className="cq-label" htmlFor="raza-nombre">
              Raza <span className="text-danger">*</span>
            </label>
            <input id="raza-nombre" className="form-control" {...form.register('razaMascota')} />
            {form.formState.errors.razaMascota && (
              <span className="text-danger small d-block">{form.formState.errors.razaMascota.message}</span>
            )}
          </div>
        </>
      }
      deleteDialog={{
        open: deleteTarget !== null,
        title: 'Eliminar raza',
        message: deleteTarget ? `¿Eliminar la raza «${deleteTarget.razaMascota}»?` : '',
        confirmLabel: 'Eliminar',
        variant: 'danger',
        onCancel: () => setDeleteTarget(null),
        onConfirm: () => void onConfirmDelete(),
      }}
    />
  )
}

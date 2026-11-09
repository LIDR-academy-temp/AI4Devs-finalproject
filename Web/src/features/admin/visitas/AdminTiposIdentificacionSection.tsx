import { zodResolver } from '@hookform/resolvers/zod'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import {
  AdminCatalogCrudShell,
  AdminCatalogRowActions,
  useAdminPanelEscape,
} from '../../../shared/components/admin'
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
  const [panelOpen, setPanelOpen] = useState(false)
  const [editing, setEditing] = useState<TipoIdentificacionDto | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<TipoIdentificacionDto | null>(null)
  const [formError, setFormError] = useState<string | null>(null)

  const form = useForm<TipoForm>({
    resolver: zodResolver(tipoSchema),
    defaultValues: { tipoIdentificacion: '' },
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
    form.reset({ tipoIdentificacion: '' })
    setPanelOpen(true)
  }

  const openEdit = (t: TipoIdentificacionDto) => {
    setFormError(null)
    setEditing(t)
    form.reset({ tipoIdentificacion: t.tipoIdentificacion })
    setPanelOpen(true)
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
    }
    closePanel()
    await onReload()
  })

  const onConfirmDelete = async () => {
    if (!deleteTarget) return
    const { problem, status } = await apiDelete(`/VTS/TiposIdentificacion/${deleteTarget.tipoIdentificacionId}`)
    if (problem) {
      toast.error(problem.detail ?? `Error ${status}`)
      return
    }
    if (editing?.tipoIdentificacionId === deleteTarget.tipoIdentificacionId) closePanel()
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
      toolbarTitle="Tipos de identificación"
      metricLabel="Tipos"
      count={tipos.length}
      createLabel="Nuevo tipo"
      createIconClass="mdi mdi-card-account-details-outline"
      onCreate={openCreate}
      panelOpen={panelOpen}
      panelTitle={editing ? 'Editar tipo de ID' : 'Nuevo tipo de ID'}
      panelSubtitle="INE, pasaporte u otros documentos aceptados en caseta."
      panelIconClass={editing ? 'mdi mdi-pencil' : 'mdi mdi-card-account-details-outline'}
      editing={Boolean(editing)}
      onClosePanel={closePanel}
      formFooter={formFooter}
      loading={loading}
      isEmpty={tipos.length === 0}
      emptyIconClass="mdi mdi-card-account-details-outline"
      emptyTitle="Sin tipos de identificación"
      emptyDescription="Agrega INE, pasaporte u otros documentos para visitas y pases QR."
      tableHead={
        <tr>
          <th>Tipo</th>
          <th className="text-center cq-actions">Acciones</th>
        </tr>
      }
      tableBody={tipos.map((t) => (
        <tr
          key={t.tipoIdentificacionId}
          className={editing?.tipoIdentificacionId === t.tipoIdentificacionId ? 'cq-row-active' : undefined}
        >
          <td className="min-w-0 text-break">
            <strong>{t.tipoIdentificacion}</strong>
          </td>
          <AdminCatalogRowActions
            name={t.tipoIdentificacion}
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
            <label className="cq-label" htmlFor="tipo-id-nombre">
              Nombre <span className="text-danger">*</span>
            </label>
            <input id="tipo-id-nombre" className="form-control" {...form.register('tipoIdentificacion')} />
            {form.formState.errors.tipoIdentificacion && (
              <span className="text-danger small d-block">{form.formState.errors.tipoIdentificacion.message}</span>
            )}
          </div>
        </>
      }
      deleteDialog={{
        open: deleteTarget !== null,
        title: 'Eliminar tipo',
        message: deleteTarget ? `¿Eliminar «${deleteTarget.tipoIdentificacion}»?` : '',
        confirmLabel: 'Eliminar',
        variant: 'danger',
        onCancel: () => setDeleteTarget(null),
        onConfirm: () => void onConfirmDelete(),
      }}
    />
  )
}

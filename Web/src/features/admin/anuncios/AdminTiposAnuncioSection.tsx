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
  const [panelOpen, setPanelOpen] = useState(false)
  const [editing, setEditing] = useState<TipoAnuncioItem | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<TipoAnuncioItem | null>(null)
  const [formError, setFormError] = useState<string | null>(null)

  const form = useForm<TipoForm>({
    resolver: zodResolver(tipoSchema),
    defaultValues: { tipoAnuncio: '' },
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
    form.reset({ tipoAnuncio: '' })
    setPanelOpen(true)
  }

  const openEdit = (t: TipoAnuncioItem) => {
    setFormError(null)
    setEditing(t)
    form.reset({ tipoAnuncio: t.tipoAnuncio })
    setPanelOpen(true)
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
    }
    closePanel()
    await onReload()
  })

  const onConfirmDelete = async () => {
    if (!deleteTarget) return
    const { problem, status } = await apiDelete(`/ANM/TiposAnuncio/${deleteTarget.tipoAnuncioId}`)
    if (problem) {
      toast.error(problem.detail ?? `Error ${status}`)
      return
    }
    if (editing?.tipoAnuncioId === deleteTarget.tipoAnuncioId) closePanel()
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
      toolbarTitle="Tipos de anuncio"
      metricLabel="Tipos"
      count={tipos.length}
      createLabel="Nuevo tipo"
      createIconClass="mdi mdi-bullhorn-outline"
      onCreate={openCreate}
      panelOpen={panelOpen}
      panelTitle={editing ? 'Editar tipo de anuncio' : 'Nuevo tipo de anuncio'}
      panelSubtitle="Catálogo usado al publicar comunicados."
      panelIconClass={editing ? 'mdi mdi-pencil' : 'mdi mdi-bullhorn-outline'}
      editing={Boolean(editing)}
      onClosePanel={closePanel}
      formFooter={formFooter}
      loading={loading}
      isEmpty={tipos.length === 0}
      emptyIconClass="mdi mdi-bullhorn-outline"
      emptyTitle="Sin tipos de anuncio"
      emptyDescription="Crea al menos un tipo o ejecuta el script de catálogo en BD."
      tableHead={
        <tr>
          <th>Tipo</th>
          <th className="text-center cq-actions">Acciones</th>
        </tr>
      }
      tableBody={tipos.map((t) => (
        <tr key={t.tipoAnuncioId}>
          <td className="min-w-0 text-break">
            <strong>{t.tipoAnuncio}</strong>
          </td>
          <AdminCatalogRowActions
            name={t.tipoAnuncio}
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
            <label className="cq-label" htmlFor="tipo-anuncio-nombre">
              Nombre <span className="text-danger">*</span>
            </label>
            <input id="tipo-anuncio-nombre" className="form-control" {...form.register('tipoAnuncio')} />
            {form.formState.errors.tipoAnuncio && (
              <span className="text-danger small d-block">{form.formState.errors.tipoAnuncio.message}</span>
            )}
          </div>
        </>
      }
      deleteDialog={{
        open: deleteTarget !== null,
        title: 'Eliminar tipo de anuncio',
        message: deleteTarget
          ? `¿Eliminar "${deleteTarget.tipoAnuncio}"? No afecta anuncios ya publicados.`
          : '',
        confirmLabel: 'Eliminar',
        variant: 'danger',
        onCancel: () => setDeleteTarget(null),
        onConfirm: () => void onConfirmDelete(),
      }}
    />
  )
}

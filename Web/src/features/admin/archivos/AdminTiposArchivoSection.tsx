import { zodResolver } from '@hookform/resolvers/zod'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import {
  AdminCatalogCrudShell,
  AdminCatalogRowActions,
  useAdminPanelEscape,
} from '../../../shared/components/admin'
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
  const [panelOpen, setPanelOpen] = useState(false)
  const [editing, setEditing] = useState<TipoArchivoItem | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<TipoArchivoItem | null>(null)
  const [formError, setFormError] = useState<string | null>(null)

  const form = useForm<TipoForm>({
    resolver: zodResolver(tipoSchema),
    defaultValues: { tipoArchivo: '' },
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
    form.reset({ tipoArchivo: '' })
    setPanelOpen(true)
  }

  const openEdit = (t: TipoArchivoItem) => {
    setFormError(null)
    setEditing(t)
    form.reset({ tipoArchivo: t.tipoArchivo })
    setPanelOpen(true)
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
    }
    closePanel()
    await onReload()
  })

  const onConfirmDelete = async () => {
    if (!deleteTarget) return
    const { problem, status } = await apiDelete(`/ARC/TiposArchivo/${deleteTarget.tipoArchivoId}`)
    if (problem) {
      toast.error(problem.detail ?? `Error ${status}`)
      return
    }
    if (editing?.tipoArchivoId === deleteTarget.tipoArchivoId) closePanel()
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
      toolbarTitle="Tipos de documento"
      metricLabel="Tipos"
      count={tipos.length}
      createLabel="Nuevo tipo"
      createIconClass="mdi mdi-file-document-outline"
      onCreate={openCreate}
      panelOpen={panelOpen}
      panelTitle={editing ? 'Editar tipo de documento' : 'Nuevo tipo de documento'}
      panelSubtitle="Clasificación al subir archivos al repositorio."
      panelIconClass={editing ? 'mdi mdi-pencil' : 'mdi mdi-file-document-outline'}
      editing={Boolean(editing)}
      onClosePanel={closePanel}
      formFooter={formFooter}
      loading={loading}
      isEmpty={tipos.length === 0}
      emptyIconClass="mdi mdi-file-document-outline"
      emptyTitle="Sin tipos de documento"
      emptyDescription="Crea tipos como reglamento, actas o avisos oficiales."
      tableHead={
        <tr>
          <th>Tipo</th>
          <th className="text-center cq-actions">Acciones</th>
        </tr>
      }
      tableBody={tipos.map((t) => (
        <tr key={t.tipoArchivoId}>
          <td className="min-w-0 text-break">
            <strong>{t.tipoArchivo}</strong>
          </td>
          <AdminCatalogRowActions
            name={t.tipoArchivo}
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
            <label className="cq-label" htmlFor="tipo-archivo-nombre">
              Nombre <span className="text-danger">*</span>
            </label>
            <input id="tipo-archivo-nombre" className="form-control" {...form.register('tipoArchivo')} />
            {form.formState.errors.tipoArchivo && (
              <span className="text-danger small d-block">{form.formState.errors.tipoArchivo.message}</span>
            )}
          </div>
        </>
      }
      deleteDialog={{
        open: deleteTarget !== null,
        title: 'Eliminar tipo',
        message: deleteTarget
          ? `¿Eliminar "${deleteTarget.tipoArchivo}"? Los archivos existentes conservan su tipo.`
          : '',
        confirmLabel: 'Eliminar',
        variant: 'danger',
        onCancel: () => setDeleteTarget(null),
        onConfirm: () => void onConfirmDelete(),
      }}
    />
  )
}

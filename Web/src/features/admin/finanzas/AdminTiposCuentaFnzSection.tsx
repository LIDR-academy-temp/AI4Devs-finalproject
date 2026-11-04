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
  const [panelOpen, setPanelOpen] = useState(false)
  const [editing, setEditing] = useState<TipoCuentaFnz | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<TipoCuentaFnz | null>(null)
  const [formError, setFormError] = useState<string | null>(null)

  const form = useForm<TipoForm>({
    resolver: zodResolver(tipoSchema),
    defaultValues: { nombre: '', descripcion: '' },
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
    form.reset({ nombre: '', descripcion: '' })
    setPanelOpen(true)
  }

  const openEdit = (t: TipoCuentaFnz) => {
    setFormError(null)
    setEditing(t)
    form.reset({ nombre: t.nombre, descripcion: t.descripcion ?? '' })
    setPanelOpen(true)
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
    }
    closePanel()
    await onReload()
  })

  const onConfirmDelete = async () => {
    if (!deleteTarget) return
    const { problem, status } = await apiDelete(`/FNZ/TiposCuenta/admin/${deleteTarget.tipoCuentaId}`)
    if (status !== 204) {
      toast.error(problem?.detail ?? `Error ${status}`)
      return
    }
    if (editing?.tipoCuentaId === deleteTarget.tipoCuentaId) closePanel()
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
      toolbarTitle="Tipos de cuenta"
      metricLabel="Tipos"
      count={tipos.length}
      createLabel="Nuevo tipo"
      createIconClass="mdi mdi-bank-outline"
      onCreate={openCreate}
      panelOpen={panelOpen}
      panelTitle={editing ? 'Editar tipo de cuenta' : 'Nuevo tipo de cuenta'}
      panelSubtitle="Catálogo fnz.TiposCuenta al crear cuentas contables."
      panelIconClass={editing ? 'mdi mdi-pencil' : 'mdi mdi-bank-outline'}
      editing={Boolean(editing)}
      onClosePanel={closePanel}
      formFooter={formFooter}
      topBanner={
        catalogoPendiente ? (
          <div className="alert alert-warning py-2 small mb-3" role="alert">
            Falta la tabla en BD. Ejecuta{' '}
            <code className="text-break">SQL/20261029_fnz_tipos_cuenta_catalog.sql</code> y recarga.
          </div>
        ) : undefined
      }
      loading={loading}
      isEmpty={tipos.length === 0}
      emptyIconClass="mdi mdi-bank-outline"
      emptyTitle="Sin tipos de cuenta"
      emptyDescription="Crea tipos o aplica el script SQL con datos iniciales."
      tableHead={
        <tr>
          <th>Nombre</th>
          <th>Descripción</th>
          <th className="text-center cq-actions">Acciones</th>
        </tr>
      }
      tableBody={tipos.map((t) => (
        <tr key={t.tipoCuentaId}>
          <td className="font-weight-bold">{t.nombre}</td>
          <td className="text-muted small">{t.descripcion ?? '—'}</td>
          <AdminCatalogRowActions
            name={t.nombre}
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
          <div className="form-group mb-3">
            <label className="cq-label" htmlFor="tipo-cuenta-nombre">
              Nombre <span className="text-danger">*</span>
            </label>
            <input id="tipo-cuenta-nombre" className="form-control" {...form.register('nombre')} />
            {form.formState.errors.nombre && (
              <span className="text-danger small d-block">{form.formState.errors.nombre.message}</span>
            )}
          </div>
          <div className="form-group mb-0">
            <label className="cq-label" htmlFor="tipo-cuenta-desc">
              Descripción (opcional)
            </label>
            <input id="tipo-cuenta-desc" className="form-control" {...form.register('descripcion')} />
          </div>
        </>
      }
      deleteDialog={{
        open: deleteTarget !== null,
        title: 'Eliminar tipo de cuenta',
        message: deleteTarget
          ? `¿Eliminar «${deleteTarget.nombre}»? No debe haber cuentas con ese tipo.`
          : '',
        confirmLabel: 'Eliminar',
        variant: 'danger',
        onCancel: () => setDeleteTarget(null),
        onConfirm: () => void onConfirmDelete(),
      }}
    />
  )
}

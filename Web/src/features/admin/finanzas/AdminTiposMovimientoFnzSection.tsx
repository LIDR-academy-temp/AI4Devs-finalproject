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
import type { TipoMovimientoFnz } from '../../../shared/types/finanzasAdmin'

const tipoSchema = z
  .object({
    tipoMovimiento: z.string().trim().min(1, 'Nombre requerido').max(100),
    bCargo: z.boolean(),
    bAbono: z.boolean(),
  })
  .refine((d) => d.bCargo || d.bAbono, { message: 'Marca cargo y/o abono', path: ['bAbono'] })

type TipoForm = z.infer<typeof tipoSchema>

type Props = {
  tipos: TipoMovimientoFnz[]
  loading: boolean
  onReload: () => Promise<void>
}

export function AdminTiposMovimientoFnzSection({ tipos, loading, onReload }: Props) {
  const toast = useToast()
  const [panelOpen, setPanelOpen] = useState(false)
  const [editing, setEditing] = useState<TipoMovimientoFnz | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<TipoMovimientoFnz | null>(null)
  const [formError, setFormError] = useState<string | null>(null)

  const form = useForm<TipoForm>({
    resolver: zodResolver(tipoSchema),
    defaultValues: { tipoMovimiento: '', bCargo: false, bAbono: true },
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
    form.reset({ tipoMovimiento: '', bCargo: false, bAbono: true })
    setPanelOpen(true)
  }

  const openEdit = (t: TipoMovimientoFnz) => {
    setFormError(null)
    setEditing(t)
    form.reset({ tipoMovimiento: t.tipoMovimiento, bCargo: t.bCargo, bAbono: t.bAbono })
    setPanelOpen(true)
  }

  const onSave = form.handleSubmit(async (values) => {
    setFormError(null)
    const body = {
      tipoMovimiento: values.tipoMovimiento,
      bCargo: values.bCargo,
      bAbono: values.bAbono,
    }
    if (editing) {
      const { problem, status } = await apiPut(
        `/FNZ/TiposMovimiento/admin/${editing.tipoMovimientoId}`,
        body,
      )
      if (status !== 200) {
        setFormError(problem?.detail ?? `Error ${status}`)
        return
      }
      toast.success('Tipo actualizado')
    } else {
      const { problem, status } = await apiPost('/FNZ/TiposMovimiento/admin', body)
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
    const { problem, status } = await apiDelete(
      `/FNZ/TiposMovimiento/admin/${deleteTarget.tipoMovimientoId}`,
    )
    if (status !== 204) {
      toast.error(problem?.detail ?? `Error ${status}`)
      return
    }
    if (editing?.tipoMovimientoId === deleteTarget.tipoMovimientoId) closePanel()
    setDeleteTarget(null)
    toast.success('Tipo eliminado')
    await onReload()
  }

  const tienePagoCuota = tipos.some(
    (t) => t.tipoMovimiento.toLowerCase() === 'pago de cuota' && t.bAbono,
  )

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
      toolbarTitle="Tipos de movimiento"
      metricLabel="Tipos"
      count={tipos.length}
      createLabel="Nuevo tipo"
      createIconClass="mdi mdi-swap-horizontal"
      onCreate={openCreate}
      panelOpen={panelOpen}
      panelTitle={editing ? 'Editar tipo de movimiento' : 'Nuevo tipo de movimiento'}
      panelSubtitle="Cargos y abonos en transacciones (fnz.TiposMovimiento)."
      panelIconClass={editing ? 'mdi mdi-pencil' : 'mdi mdi-swap-horizontal'}
      editing={Boolean(editing)}
      onClosePanel={closePanel}
      formFooter={formFooter}
      topBanner={
        !loading && !tienePagoCuota ? (
          <div className="alert alert-warning py-2 small mb-3" role="alert">
            Falta «Pago de cuota» (abono). Ejecuta{' '}
            <code className="text-break">SQL/20261029_fnz_pago_cuota_catalog.sql</code> o créalo aquí.
          </div>
        ) : undefined
      }
      loading={loading}
      isEmpty={tipos.length === 0}
      emptyIconClass="mdi mdi-swap-horizontal"
      emptyTitle="Sin tipos de movimiento"
      emptyDescription="Crea «Pago de cuota» y otros tipos para registrar transacciones."
      tableHead={
        <tr>
          <th>Nombre</th>
          <th className="text-center">Cargo</th>
          <th className="text-center">Abono</th>
          <th className="text-center cq-actions">Acciones</th>
        </tr>
      }
      tableBody={tipos.map((t) => (
        <tr key={t.tipoMovimientoId}>
          <td className="font-weight-bold">{t.tipoMovimiento}</td>
          <td className="text-center">{t.bCargo ? 'Sí' : '—'}</td>
          <td className="text-center">{t.bAbono ? 'Sí' : '—'}</td>
          <AdminCatalogRowActions
            name={t.tipoMovimiento}
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
            <label className="cq-label" htmlFor="tipo-mov-nombre">
              Nombre <span className="text-danger">*</span>
            </label>
            <input id="tipo-mov-nombre" className="form-control" {...form.register('tipoMovimiento')} />
            {form.formState.errors.tipoMovimiento && (
              <span className="text-danger small d-block">{form.formState.errors.tipoMovimiento.message}</span>
            )}
          </div>
          <div className="d-flex flex-wrap gap-3 mb-2">
            <label className="mb-0 small">
              <input type="checkbox" className="mr-1" {...form.register('bCargo')} />
              Es cargo
            </label>
            <label className="mb-0 small">
              <input type="checkbox" className="mr-1" {...form.register('bAbono')} />
              Es abono
            </label>
          </div>
          {form.formState.errors.bAbono && (
            <span className="text-danger small d-block">{form.formState.errors.bAbono.message}</span>
          )}
        </>
      }
      deleteDialog={{
        open: deleteTarget !== null,
        title: 'Eliminar tipo de movimiento',
        message: deleteTarget
          ? `¿Eliminar «${deleteTarget.tipoMovimiento}»? No debe haber transacciones con este tipo.`
          : '',
        confirmLabel: 'Eliminar',
        variant: 'danger',
        onCancel: () => setDeleteTarget(null),
        onConfirm: () => void onConfirmDelete(),
      }}
    />
  )
}

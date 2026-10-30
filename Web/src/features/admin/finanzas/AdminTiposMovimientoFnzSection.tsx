import { zodResolver } from '@hookform/resolvers/zod'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { ConfirmDialog } from '../../../shared/components/admin'
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
  const [editing, setEditing] = useState<TipoMovimientoFnz | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<TipoMovimientoFnz | null>(null)
  const [formError, setFormError] = useState<string | null>(null)

  const form = useForm<TipoForm>({
    resolver: zodResolver(tipoSchema),
    defaultValues: { tipoMovimiento: '', bCargo: false, bAbono: true },
  })

  const openCreate = () => {
    setEditing(null)
    setFormError(null)
    form.reset({ tipoMovimiento: '', bCargo: false, bAbono: true })
  }

  const openEdit = (t: TipoMovimientoFnz) => {
    setFormError(null)
    setEditing(t)
    form.reset({ tipoMovimiento: t.tipoMovimiento, bCargo: t.bCargo, bAbono: t.bAbono })
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
      form.reset({ tipoMovimiento: '', bCargo: false, bAbono: true })
    }
    setEditing(null)
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
    setDeleteTarget(null)
    toast.success('Tipo eliminado')
    await onReload()
  }

  const tienePagoCuota = tipos.some(
    (t) => t.tipoMovimiento.toLowerCase() === 'pago de cuota' && t.bAbono,
  )

  return (
    <>
      <div className="card">
        <div className="card-body pt-3">
          <div className="d-flex flex-wrap justify-content-between align-items-center mb-3 gap-2">
            <div>
              <h2 className="h5 mb-1">Tipos de movimiento</h2>
              <p className="text-muted mb-0 small">
                Catálogo <code>fnz.TiposMovimiento</code> (cargos/abonos en transacciones). Para registrar
                pagos de cuota debe existir <strong>Pago de cuota</strong> con abono.
              </p>
            </div>
            <button type="button" className="btn btn-primary btn-sm" onClick={openCreate}>
              <i className="mdi mdi-plus mr-1" />
              Nuevo tipo
            </button>
          </div>

          {!loading && !tienePagoCuota && (
            <div className="alert alert-warning py-2 small" role="alert">
              Falta «Pago de cuota» (abono). Ejecuta{' '}
              <code className="text-break">SQL/20261029_fnz_pago_cuota_catalog.sql</code> o créalo aquí.
            </div>
          )}

          {formError && (
            <div className="alert alert-danger py-2 small" role="alert">
              {formError}
            </div>
          )}

          <form className="mb-3 border rounded p-3 bg-light" onSubmit={(e) => void onSave(e)}>
            <div className="form-group mb-2">
              <label className="cq-label" htmlFor="tipo-mov-nombre">
                {editing ? 'Editar tipo' : 'Nuevo tipo'}
              </label>
              <input
                id="tipo-mov-nombre"
                className="form-control form-control-sm"
                {...form.register('tipoMovimiento')}
              />
              {form.formState.errors.tipoMovimiento && (
                <span className="text-danger small">{form.formState.errors.tipoMovimiento.message}</span>
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
              <span className="text-danger small d-block mb-2">{form.formState.errors.bAbono.message}</span>
            )}
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
          {!loading && tipos.length === 0 && (
            <p className="text-muted mb-0">Sin tipos. Aplica el script SQL o crea «Pago de cuota» y «Gasto».</p>
          )}
          {!loading && tipos.length > 0 && (
            <div className="table-responsive">
              <table className="table table-sm table-hover mb-0">
                <thead>
                  <tr>
                    <th>Nombre</th>
                    <th className="text-center">Cargo</th>
                    <th className="text-center">Abono</th>
                    <th className="text-center">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {tipos.map((t) => (
                    <tr key={t.tipoMovimientoId}>
                      <td className="font-weight-bold">{t.tipoMovimiento}</td>
                      <td className="text-center">{t.bCargo ? 'Sí' : '—'}</td>
                      <td className="text-center">{t.bAbono ? 'Sí' : '—'}</td>
                      <td className="text-center cq-actions text-nowrap">
                        <button
                          type="button"
                          className="btn btn-link btn-sm"
                          aria-label={`Editar ${t.tipoMovimiento}`}
                          onClick={() => openEdit(t)}
                        >
                          <i className="mdi mdi-pencil" />
                        </button>
                        <button
                          type="button"
                          className="btn btn-link btn-sm text-danger"
                          aria-label={`Eliminar ${t.tipoMovimiento}`}
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
        title="Eliminar tipo de movimiento"
        message={`¿Eliminar «${deleteTarget?.tipoMovimiento}»? No debe haber transacciones con este tipo.`}
        confirmLabel="Eliminar"
        variant="danger"
        onConfirm={() => void onConfirmDelete()}
        onCancel={() => setDeleteTarget(null)}
      />
    </>
  )
}

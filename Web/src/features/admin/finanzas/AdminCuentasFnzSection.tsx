import { zodResolver } from '@hookform/resolvers/zod'
import { useMemo, useState } from 'react'
import { useForm } from 'react-hook-form'
import {
  AdminFilterableTable,
  AdminListToolbar,
  AdminSidePanel,
  AdminSplitLayout,
  ConfirmDialog,
} from '../../../shared/components/admin'
import { useClientTableFilter } from '../../../shared/hooks/useClientTableFilter'
import { apiDelete, apiPost, apiPut } from '../../../shared/lib/apiClient'
import { useToast } from '../../../shared/toast/ToastContext'
import type { CuentaFnzAdmin, TipoCuentaFnz } from '../../../shared/types/finanzasAdmin'
import {
  cuentaFnzUpsertSchema,
  cuentaUpsertBody,
  type CuentaFnzUpsertForm,
} from './cuentasFnzAdminSchemas'
import { CUENTAS_FNZ_ACCESSORS, CUENTAS_FNZ_COLUMNS } from './cuentasFnzTableFilter'

type Props = {
  cuentas: CuentaFnzAdmin[]
  tipos: TipoCuentaFnz[]
  loading: boolean
  onReload: () => Promise<void>
}

export function AdminCuentasFnzSection({ cuentas, tipos, loading, onReload }: Props) {
  const toast = useToast()
  const [createOpen, setCreateOpen] = useState(false)
  const [editing, setEditing] = useState<CuentaFnzAdmin | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<CuentaFnzAdmin | null>(null)
  const [formError, setFormError] = useState<string | null>(null)

  const panelOpen = createOpen || editing !== null
  const isEdit = editing !== null

  const metrics = useMemo(() => [{ label: 'Cuentas', value: cuentas.length }], [cuentas.length])

  const {
    filteredRows,
    globalSearch,
    setGlobalSearch,
    columnFilters,
    onColumnFilterChange,
    filteredCount,
    totalCount,
  } = useClientTableFilter(cuentas, CUENTAS_FNZ_COLUMNS, CUENTAS_FNZ_ACCESSORS)

  const defaultTipo =
    tipos.find((t) => t.nombre === 'MANTENIMIENTO')?.nombre ?? tipos[0]?.nombre ?? 'MANTENIMIENTO'

  const form = useForm<CuentaFnzUpsertForm>({
    resolver: zodResolver(cuentaFnzUpsertSchema),
    defaultValues: { nombre: '', tipo: defaultTipo, saldo: 0, responsableUsuarioId: '' },
  })

  const closePanel = () => {
    setCreateOpen(false)
    setEditing(null)
    setFormError(null)
  }

  const openCreate = () => {
    setFormError(null)
    form.reset({ nombre: '', tipo: defaultTipo, saldo: 0, responsableUsuarioId: '' })
    setCreateOpen(true)
  }

  const openEdit = (c: CuentaFnzAdmin) => {
    setFormError(null)
    form.reset({
      nombre: c.nombre,
      tipo: c.tipo,
      saldo: c.saldo,
      responsableUsuarioId: c.responsableUsuarioId ? String(c.responsableUsuarioId) : '',
    })
    setEditing(c)
  }

  const save = form.handleSubmit(async (values) => {
    setFormError(null)
    const body = cuentaUpsertBody(values)
    if (isEdit && editing) {
      const { status, problem } = await apiPut<CuentaFnzAdmin>(
        `/FNZ/Cuentas/admin/${editing.cuentaId}`,
        body,
      )
      if (status !== 200) {
        setFormError(problem?.detail ?? `Error ${status}`)
        return
      }
      toast.success('Cuenta actualizada')
    } else {
      const { status, problem } = await apiPost<CuentaFnzAdmin>('/FNZ/Cuentas/admin', body)
      if (status !== 201) {
        setFormError(problem?.detail ?? `Error ${status}`)
        return
      }
      toast.success('Cuenta creada')
    }
    closePanel()
    await onReload()
  })

  const onConfirmDelete = async () => {
    if (!deleteTarget) return
    const { status, problem } = await apiDelete(`/FNZ/Cuentas/admin/${deleteTarget.cuentaId}`)
    if (status !== 204) {
      toast.error(problem?.detail ?? `Error ${status}`)
      return
    }
    setDeleteTarget(null)
    toast.success('Cuenta eliminada')
    await onReload()
  }

  const formFooter = (
    <>
      <button type="button" className="btn btn-primary flex-grow-1" onClick={() => void save()}>
        <i className={`mdi ${isEdit ? 'mdi-content-save' : 'mdi-plus'} mr-1`} />
        {isEdit ? 'Guardar' : 'Crear'}
      </button>
      <button type="button" className="btn btn-outline-secondary" onClick={closePanel}>
        Cancelar
      </button>
    </>
  )

  return (
    <>
      <AdminListToolbar
        title="Cuentas contables"
        metrics={metrics}
        primaryAction={{
          label: 'Nueva cuenta',
          iconClass: 'mdi mdi-plus',
          onClick: openCreate,
        }}
      />
      <AdminSplitLayout
        panelOpen={panelOpen}
        tablePane={
          <div className="card">
            <div className="card-body pt-3">
              {loading && (
                <div className="placeholder-glow" aria-label="Cargando cuentas">
                  <span className="placeholder col-12 mb-2" />
                </div>
              )}
              {!loading && cuentas.length === 0 && (
                <div className="cq-empty-state">
                  <p className="cq-empty-title">Sin cuentas</p>
                  <p className="text-muted">Crea una cuenta para asociarla al generar cuotas.</p>
                </div>
              )}
              {!loading && cuentas.length > 0 && (
                <AdminFilterableTable
                  columns={CUENTAS_FNZ_COLUMNS}
                  columnFilters={columnFilters}
                  onColumnFilterChange={onColumnFilterChange}
                  globalSearch={globalSearch}
                  onGlobalSearchChange={setGlobalSearch}
                  filteredCount={filteredCount}
                  totalCount={totalCount}
                >
                  {filteredRows.map((c) => (
                    <tr key={c.cuentaId}>
                      <td className="tabular-nums">{c.cuentaId}</td>
                      <td className="min-w-0 text-break">{c.nombre}</td>
                      <td>{c.tipo}</td>
                      <td className="tabular-nums text-end">
                        {c.saldo.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="text-center cq-actions text-nowrap">
                        <button
                          type="button"
                          className="btn btn-link btn-sm"
                          aria-label={`Editar ${c.nombre}`}
                          onClick={() => openEdit(c)}
                        >
                          <i className="mdi mdi-pencil" />
                        </button>
                        <button
                          type="button"
                          className="btn btn-link btn-sm text-danger"
                          aria-label={`Eliminar ${c.nombre}`}
                          onClick={() => setDeleteTarget(c)}
                        >
                          <i className="mdi mdi-delete" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </AdminFilterableTable>
              )}
            </div>
          </div>
        }
        formPane={
          <AdminSidePanel
            visible={panelOpen}
            title={isEdit ? 'Editar cuenta' : 'Nueva cuenta'}
            subtitle="Catálogo fnz.Cuentas para cuotas y abonos."
            iconClass="mdi mdi-bank"
            editing={isEdit}
            onClose={closePanel}
            footer={formFooter}
          >
            {formError && (
              <div className="alert alert-danger py-2 small" role="alert">
                {formError}
              </div>
            )}
            <div className="form-group">
              <label className="cq-label" htmlFor="cuenta-nombre">
                Nombre
              </label>
              <input id="cuenta-nombre" className="form-control" {...form.register('nombre')} />
              {form.formState.errors.nombre && (
                <div className="text-danger small">{form.formState.errors.nombre.message}</div>
              )}
            </div>
            <div className="form-group">
              <label className="cq-label" htmlFor="cuenta-tipo">
                Tipo
              </label>
              {tipos.length > 0 ? (
                <select id="cuenta-tipo" className="form-control" {...form.register('tipo')}>
                  {tipos.map((t) => (
                    <option key={t.tipoCuentaId} value={t.nombre}>
                      {t.nombre}
                    </option>
                  ))}
                </select>
              ) : (
                <>
                  <input id="cuenta-tipo" className="form-control" {...form.register('tipo')} />
                  <p className="text-muted small mb-0 mt-1">
                    Define tipos en la pestaña «Tipos de cuenta» (requiere script SQL en BD).
                  </p>
                </>
              )}
              {form.formState.errors.tipo && (
                <div className="text-danger small">{form.formState.errors.tipo.message}</div>
              )}
            </div>
            <div className="form-group">
              <label className="cq-label" htmlFor="cuenta-saldo">
                Saldo inicial
              </label>
              <input
                id="cuenta-saldo"
                type="number"
                step="0.01"
                className="form-control"
                {...form.register('saldo', { valueAsNumber: true })}
              />
              {form.formState.errors.saldo && (
                <div className="text-danger small">{form.formState.errors.saldo.message}</div>
              )}
            </div>
            <div className="form-group mb-0">
              <label className="cq-label" htmlFor="cuenta-resp">
                Responsable (usuario ID, opcional)
              </label>
              <input id="cuenta-resp" className="form-control" {...form.register('responsableUsuarioId')} />
            </div>
          </AdminSidePanel>
        }
      />
      <ConfirmDialog
        open={deleteTarget !== null}
        title="Eliminar cuenta"
        message={`¿Eliminar «${deleteTarget?.nombre}»? No se borran cuotas ya generadas.`}
        confirmLabel="Eliminar"
        variant="danger"
        onConfirm={() => void onConfirmDelete()}
        onCancel={() => setDeleteTarget(null)}
      />
    </>
  )
}

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
import type { AreaComun } from '../../../shared/types/visitas'
import {
  areaComunUpsertSchema,
  type AreaComunUpsertForm,
  type AreaComunUpsertInput,
} from './areasAdminSchemas'
import { AREAS_TABLE_ACCESSORS, AREAS_TABLE_COLUMNS } from './areasTableFilter'

type Props = {
  areas: AreaComun[]
  loading: boolean
  onReload: () => Promise<void>
}

export function AdminAreasComunesSection({ areas, loading, onReload }: Props) {
  const toast = useToast()
  const [createOpen, setCreateOpen] = useState(false)
  const [editing, setEditing] = useState<AreaComun | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<AreaComun | null>(null)
  const [formError, setFormError] = useState<string | null>(null)

  const panelOpen = createOpen || editing !== null
  const isEdit = editing !== null

  const metrics = useMemo(
    () => [
      { label: 'Áreas', value: areas.length },
      { label: 'Reservables', value: areas.filter((a) => a.requiereReservacion).length },
    ],
    [areas],
  )

  const {
    filteredRows,
    globalSearch,
    setGlobalSearch,
    columnFilters,
    onColumnFilterChange,
    filteredCount,
    totalCount,
  } = useClientTableFilter(areas, AREAS_TABLE_COLUMNS, AREAS_TABLE_ACCESSORS)

  const form = useForm<AreaComunUpsertInput, unknown, AreaComunUpsertForm>({
    resolver: zodResolver(areaComunUpsertSchema),
    defaultValues: {
      nombre: '',
      descripcion: '',
      capacidad: '',
      requiereReservacion: true,
    },
  })

  const closePanel = () => {
    setCreateOpen(false)
    setEditing(null)
    setFormError(null)
  }

  const openCreate = () => {
    setFormError(null)
    form.reset({
      nombre: '',
      descripcion: '',
      capacidad: '',
      requiereReservacion: true,
    })
    setCreateOpen(true)
    setEditing(null)
  }

  const openEdit = (a: AreaComun) => {
    setFormError(null)
    setCreateOpen(false)
    form.reset({
      nombre: a.nombre,
      descripcion: a.descripcion ?? '',
      capacidad: a.capacidad ?? '',
      requiereReservacion: a.requiereReservacion,
    })
    setEditing(a)
  }

  const bodyFromForm = (values: AreaComunUpsertForm) => ({
    nombre: values.nombre,
    descripcion: values.descripcion?.trim() || undefined,
    capacidad: typeof values.capacidad === 'number' ? values.capacidad : undefined,
    requiereReservacion: values.requiereReservacion,
  })

  const onSave = form.handleSubmit(async (values) => {
    setFormError(null)
    const body = bodyFromForm(values)
    if (isEdit && editing) {
      const { problem, status } = await apiPut(`/VTS/AreasComunes/${editing.areaComunId}`, body)
      if (problem) {
        setFormError(problem.detail ?? `Error ${status}`)
        return
      }
      toast.success('Área actualizada')
    } else {
      const { problem, status } = await apiPost('/VTS/AreasComunes', body)
      if (problem) {
        setFormError(problem.detail ?? `Error ${status}`)
        return
      }
      toast.success('Área creada')
    }
    closePanel()
    await onReload()
  })

  const onConfirmDelete = async () => {
    if (!deleteTarget) return
    const { problem, status } = await apiDelete(`/VTS/AreasComunes/${deleteTarget.areaComunId}`)
    if (problem) {
      toast.error(problem.detail ?? `Error ${status}`)
      return
    }
    setDeleteTarget(null)
    toast.success('Área eliminada')
    await onReload()
  }

  const formFooter = (
    <>
      <button type="button" className="btn btn-primary flex-grow-1" onClick={() => void onSave()}>
        <i className={`mdi ${isEdit ? 'mdi-content-save' : 'mdi-plus'} mr-1`} />
        {isEdit ? 'Actualizar' : 'Registrar'}
      </button>
      <button type="button" className="btn btn-outline-secondary" onClick={closePanel}>
        Cancelar
      </button>
    </>
  )

  return (
    <>
      <AdminListToolbar
        title="Áreas comunes"
        metrics={metrics}
        primaryAction={{
          label: 'Nueva área',
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
                <div className="placeholder-glow" aria-label="Cargando áreas">
                  <span className="placeholder col-12 mb-2" />
                </div>
              )}
              {!loading && areas.length === 0 && (
                <div className="cq-empty-state">
                  <i className="mdi mdi-tree cq-empty-icon" />
                  <p className="cq-empty-title">Sin áreas</p>
                  <p className="text-muted">Registra una amenidad reservable para el condominio.</p>
                </div>
              )}
              {!loading && areas.length > 0 && (
                <AdminFilterableTable
                  columns={AREAS_TABLE_COLUMNS}
                  columnFilters={columnFilters}
                  onColumnFilterChange={onColumnFilterChange}
                  globalSearch={globalSearch}
                  onGlobalSearchChange={setGlobalSearch}
                  filteredCount={filteredCount}
                  totalCount={totalCount}
                >
                  {filteredRows.map((a) => (
                    <tr
                      key={a.areaComunId}
                      className={editing?.areaComunId === a.areaComunId ? 'cq-row-active' : undefined}
                    >
                      <td className="min-w-0">
                        <div className="font-weight-bold">{a.nombre}</div>
                        {a.descripcion && <div className="text-muted small text-break">{a.descripcion}</div>}
                      </td>
                      <td className="tabular-nums">{a.capacidad ?? '—'}</td>
                      <td>{a.requiereReservacion ? 'Sí' : 'No'}</td>
                      <td className="text-center cq-actions">
                        <button type="button" className="btn btn-link btn-sm" onClick={() => openEdit(a)} aria-label="Editar">
                          <i className="mdi mdi-pencil" />
                        </button>
                        <button
                          type="button"
                          className="btn btn-link btn-sm text-danger"
                          onClick={() => setDeleteTarget(a)}
                          aria-label="Eliminar"
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
            title={isEdit ? 'Editar área' : 'Nueva área'}
            subtitle="Amenidades del condominio (salón, alberca, etc.)."
            iconClass="mdi mdi-tree"
            editing={isEdit}
            onClose={closePanel}
            footer={formFooter}
          >
            {formError && (
              <div className="alert alert-danger py-2 small" role="alert">
                {formError}
              </div>
            )}
            <div className="form-group mb-3">
              <label className="cq-label">
                Nombre <span className="text-danger">*</span>
              </label>
              <input className="form-control" {...form.register('nombre')} />
              {form.formState.errors.nombre && (
                <span className="text-danger small">{form.formState.errors.nombre.message}</span>
              )}
            </div>
            <div className="form-group mb-3">
              <label className="cq-label">Descripción</label>
              <textarea className="form-control" rows={2} {...form.register('descripcion')} />
            </div>
            <div className="form-group mb-3">
              <label className="cq-label">Capacidad (personas)</label>
              <input type="number" min={1} className="form-control" {...form.register('capacidad')} />
            </div>
            <div className="form-check">
              <input type="checkbox" className="form-check-input" id="area-req-res" {...form.register('requiereReservacion')} />
              <label className="form-check-label" htmlFor="area-req-res">
                Requiere reservación
              </label>
            </div>
          </AdminSidePanel>
        }
      />

      <ConfirmDialog
        open={deleteTarget !== null}
        title="Eliminar área"
        message={deleteTarget ? `¿Eliminar «${deleteTarget.nombre}»? Las reservaciones históricas se conservan.` : ''}
        confirmLabel="Eliminar"
        variant="danger"
        onCancel={() => setDeleteTarget(null)}
        onConfirm={() => void onConfirmDelete()}
      />
    </>
  )
}

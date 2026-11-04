import { Car } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import {
  vehiculoIncompleto,
  vehiculoSubtitulo,
  vehiculoTitulo,
} from '../features/vehiculos/vehiculoMappers'
import { useVehiculos, useMarcas, useModelos } from '../features/vehiculos/useVehiculos'
import { vehiculoResidenteSchema } from '../features/vehiculos/vehiculoResidenteSchemas'
import {
  ConfirmDialog,
  FormModal,
  PortalEntityIcon,
  PortalEntityMain,
  PortalEntityMeta,
  PortalEntityTitle,
  PortalListPage,
  PortalListSection,
  PortalRowActionButton,
  PortalRowActions,
  PortalRowList,
  PortalRowListItem,
} from '../shared/components/admin'
import { useQueryErrorToast } from '../shared/hooks/useQueryErrorToast'
import { apiPost, apiPut, apiDelete } from '../shared/lib/apiClient'
import type { AutomovilListItem, AutomovilCrearRequest } from '../shared/types/vehiculos'

function VehiculoRow({
  v,
  onEdit,
  onDelete,
}: {
  v: AutomovilListItem
  onEdit: () => void
  onDelete: () => void
}) {
  const incompleto = vehiculoIncompleto(v)
  return (
    <PortalRowListItem
      className={`flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between${
        incompleto ? ' ring-2 ring-inset ring-warning/30' : ''
      }`}
    >
      <div className="flex min-w-0 flex-1 items-start gap-3">
        <PortalEntityIcon>
          <Car className="h-5 w-5" />
        </PortalEntityIcon>
        <PortalEntityMain>
          <PortalEntityTitle>{vehiculoTitulo(v)}</PortalEntityTitle>
          <PortalEntityMeta>{vehiculoSubtitulo(v)}</PortalEntityMeta>
          {incompleto && (
            <p className="mt-1 text-xs font-medium text-warning">Agrega placas para identificar el vehículo en caseta.</p>
          )}
        </PortalEntityMain>
      </div>
      <PortalRowActions className="sm:flex-col sm:items-stretch">
        <PortalRowActionButton onClick={onEdit}>Editar</PortalRowActionButton>
        <PortalRowActionButton variant="danger" onClick={onDelete}>
          Eliminar
        </PortalRowActionButton>
      </PortalRowActions>
    </PortalRowListItem>
  )
}

export function MisVehiculosPage() {
  const { vehiculos, loading, error, refetch } = useVehiculos()
  const { marcas } = useMarcas()
  const { modelos } = useModelos()

  const [modalOpen, setModalOpen] = useState(false)
  const [editId, setEditId] = useState<number | null>(null)
  const [form, setForm] = useState<AutomovilCrearRequest>({ placas: '' })
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [deleteId, setDeleteId] = useState<number | null>(null)
  const [deleteError, setDeleteError] = useState<string | null>(null)
  useQueryErrorToast(error)
  useQueryErrorToast(deleteError)
  useQueryErrorToast(formError, modalOpen)

  const openCreate = () => {
    setEditId(null)
    setForm({ placas: '' })
    setFormError(null)
    setModalOpen(true)
  }

  const openEdit = (v: AutomovilListItem) => {
    setEditId(v.automovilId)
    setForm({
      marcaId: v.marcaId ?? undefined,
      modeloId: v.modeloId ?? undefined,
      modeloLibre: v.modeloLibre ?? undefined,
      placas: v.placas ?? '',
      color: v.color ?? undefined,
    })
    setFormError(null)
    setModalOpen(true)
  }

  const confirmDelete = async () => {
    if (deleteId === null) return
    setDeleteError(null)
    const { status, problem } = await apiDelete(`/USR/Automoviles/${deleteId}`)
    if (status !== 204 && status !== 200) {
      setDeleteError(problem?.detail ?? 'Error al eliminar.')
      setDeleteId(null)
      return
    }
    setDeleteId(null)
    refetch()
  }

  const handleSave = async (e: FormEvent) => {
    e.preventDefault()
    const parsed = vehiculoResidenteSchema.safeParse(form)
    if (!parsed.success) {
      setFormError(parsed.error.issues[0]?.message ?? 'Datos inválidos')
      return
    }
    setSaving(true)
    setFormError(null)
    const payload = parsed.data
    const result = editId
      ? await apiPut(`/USR/Automoviles/${editId}`, payload)
      : await apiPost<AutomovilListItem>('/USR/Automoviles', payload)

    setSaving(false)
    if (result.problem || (editId ? result.status !== 204 : result.status !== 201)) {
      setFormError(result.problem?.detail ?? 'Error al guardar.')
      return
    }
    setModalOpen(false)
    refetch()
  }

  const modelosFiltrados = form.marcaId ? modelos.filter((m) => m.marcaId === form.marcaId) : modelos

  return (
    <>
      <PortalListPage
        width="2xl"
        header={{
          title: 'Mis vehículos',
          description: 'Registra los automóviles asociados a tu unidad.',
          actions: (
            <button type="button" onClick={openCreate} className="cq-portal-btn-primary">
              + Agregar vehículo
            </button>
          ),
        }}
        loading={loading}
        error={error}
        onRetry={() => void refetch()}
        empty={
          !loading && !error && vehiculos.length === 0
            ? { title: 'No tienes vehículos registrados.', description: 'Agrega placas y datos para caseta.' }
            : undefined
        }
      >
        {vehiculos.length > 0 ? (
          <PortalListSection>
            <PortalRowList>
              {vehiculos.map((v) => (
                <VehiculoRow
                  key={v.automovilId}
                  v={v}
                  onEdit={() => openEdit(v)}
                  onDelete={() => setDeleteId(v.automovilId)}
                />
              ))}
            </PortalRowList>
          </PortalListSection>
        ) : null}
      </PortalListPage>

      <FormModal
        open={modalOpen}
        title={editId ? 'Editar vehículo' : 'Agregar vehículo'}
        onClose={() => setModalOpen(false)}
      >
        <form onSubmit={(e) => void handleSave(e)} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-neutral-700">Placas *</label>
            <input
              value={form.placas}
              onChange={(e) => setForm((p) => ({ ...p, placas: e.target.value.toUpperCase() }))}
              className="w-full rounded-lg border px-3 py-2 text-sm uppercase tracking-widest"
              placeholder="ABC-123"
            />
          </div>
          {marcas.length > 0 && (
            <div>
              <label className="mb-1 block text-sm font-medium text-neutral-700">Marca</label>
              <select
                value={form.marcaId ?? ''}
                onChange={(e) =>
                  setForm((p) => ({
                    ...p,
                    marcaId: e.target.value ? Number(e.target.value) : undefined,
                    modeloId: undefined,
                  }))
                }
                className="w-full rounded-lg border px-3 py-2 text-sm"
              >
                <option value="">— Selecciona —</option>
                {marcas.map((m) => (
                  <option key={m.marcaId} value={m.marcaId}>{m.marca}</option>
                ))}
              </select>
            </div>
          )}
          {modelosFiltrados.length > 0 && (
            <div>
              <label className="mb-1 block text-sm font-medium text-neutral-700">Modelo</label>
              <select
                value={form.modeloId ?? ''}
                onChange={(e) =>
                  setForm((p) => ({
                    ...p,
                    modeloId: e.target.value ? Number(e.target.value) : undefined,
                  }))
                }
                className="w-full rounded-lg border px-3 py-2 text-sm"
              >
                <option value="">— Selecciona —</option>
                {modelosFiltrados.map((m) => (
                  <option key={m.modeloId} value={m.modeloId}>{m.modelo}</option>
                ))}
              </select>
            </div>
          )}
          <div>
            <label className="mb-1 block text-sm font-medium text-neutral-700">Modelo (texto libre)</label>
            <input
              value={form.modeloLibre ?? ''}
              onChange={(e) => setForm((p) => ({ ...p, modeloLibre: e.target.value || undefined }))}
              className="w-full rounded-lg border px-3 py-2 text-sm"
              placeholder="Ej: Corolla 2022"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-neutral-700">Color</label>
            <input
              value={form.color ?? ''}
              onChange={(e) => setForm((p) => ({ ...p, color: e.target.value || undefined }))}
              className="w-full rounded-lg border px-3 py-2 text-sm"
              placeholder="Ej: Blanco"
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setModalOpen(false)}
              className="rounded-lg border px-4 py-2 text-sm hover:bg-surface"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving}
              className="rounded-lg bg-primary px-4 py-2 text-sm text-white hover:bg-primary-dark disabled:opacity-50"
            >
              {saving ? 'Guardando…' : 'Guardar'}
            </button>
          </div>
        </form>
      </FormModal>

      <ConfirmDialog
        open={deleteId !== null}
        title="Eliminar vehículo"
        message="¿Eliminar este vehículo? Esta acción no se puede deshacer."
        confirmLabel="Eliminar"
        variant="danger"
        onCancel={() => setDeleteId(null)}
        onConfirm={() => void confirmDelete()}
      />
    </>
  )
}

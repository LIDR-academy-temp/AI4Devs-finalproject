import { Car } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import {
  vehiculoIncompleto,
  vehiculoSubtitulo,
  vehiculoTitulo,
} from '../features/vehiculos/vehiculoMappers'
import { useVehiculos, useMarcas, useModelos } from '../features/vehiculos/useVehiculos'
import { vehiculoResidenteSchema } from '../features/vehiculos/vehiculoResidenteSchemas'
import { ConfirmDialog, EmptyState, FormModal, PageHeader } from '../shared/components/admin'
import { useQueryErrorToast } from '../shared/hooks/useQueryErrorToast'
import { apiPost, apiPut, apiDelete } from '../shared/lib/apiClient'
import type { AutomovilListItem, AutomovilCrearRequest } from '../shared/types/vehiculos'

function VehiculoCard({
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
    <article
      className={`flex flex-col gap-3 rounded-xl border border-neutral-100 bg-surface-alt p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between ${
        incompleto ? 'border-warning/40 ring-1 ring-warning/20' : 'border-neutral-200'
      }`}
    >
      <div className="flex min-w-0 flex-1 items-start gap-3">
        <span
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary"
          aria-hidden="true"
        >
          <Car className="h-5 w-5" />
        </span>
        <div className="min-w-0">
          <p className="text-lg font-bold tracking-wide text-neutral-900">{vehiculoTitulo(v)}</p>
          <p className="text-sm text-neutral-600">{vehiculoSubtitulo(v)}</p>
          {incompleto && (
            <p className="mt-1 text-xs font-medium text-warning">Agrega placas para identificar el vehículo en caseta.</p>
          )}
        </div>
      </div>
      <div className="flex shrink-0 gap-2 sm:flex-col sm:items-stretch">
        <button
          type="button"
          onClick={onEdit}
          className="rounded-lg border border-neutral-200 px-3 py-1.5 text-sm font-medium hover:bg-surface"
        >
          Editar
        </button>
        <button
          type="button"
          onClick={onDelete}
          className="rounded-lg border border-danger/30 bg-danger-light px-3 py-1.5 text-sm font-medium text-danger hover:bg-danger-light/80"
        >
          Eliminar
        </button>
      </div>
    </article>
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
      marcaId: v.marcaId,
      modeloId: v.modeloId,
      modeloLibre: v.modeloLibre,
      placas: v.placas ?? '',
      color: v.color,
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
    if (result.problem || (editId ? result.status !== 200 : result.status !== 201)) {
      setFormError(result.problem?.detail ?? 'Error al guardar.')
      return
    }
    setModalOpen(false)
    refetch()
  }

  const modelosFiltrados = form.marcaId ? modelos.filter((m) => m.marcaId === form.marcaId) : modelos

  return (
    <main className="mx-auto max-w-2xl space-y-4 px-4 py-6">
      <PageHeader
        title="Mis vehículos"
        description="Registra los automóviles asociados a tu unidad."
        actions={
          <button
            type="button"
            onClick={openCreate}
            className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary-dark"
          >
            + Agregar vehículo
          </button>
        }
      />

      {loading ? (
        <div className="space-y-3" aria-label="Cargando vehículos">
          {[1, 2].map((i) => (
            <div key={i} className="h-20 animate-pulse rounded-xl bg-neutral-100" />
          ))}
        </div>
      ) : error ? (
        <button
          type="button"
          className="cursor-pointer text-sm text-primary underline"
          onClick={() => void refetch()}
        >
          Reintentar
        </button>
      ) : vehiculos.length === 0 ? (
        <EmptyState title="No tienes vehículos registrados." />
      ) : (
        <div className="space-y-3">
          {vehiculos.map((v) => (
            <VehiculoCard
              key={v.automovilId}
              v={v}
              onEdit={() => openEdit(v)}
              onDelete={() => setDeleteId(v.automovilId)}
            />
          ))}
        </div>
      )}

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
    </main>
  )
}

import { useState, type FormEvent } from 'react'
import { mascotaResidenteSchema } from '../features/mascotas/mascotaResidenteSchemas'
import { useMascotas, useTiposMascota, useRazasMascota } from '../features/mascotas/useMascotas'
import { ConfirmDialog, EmptyState, FormModal, PageHeader } from '../shared/components/admin'
import { useQueryErrorToast } from '../shared/hooks/useQueryErrorToast'
import { apiPost, apiPut, apiDelete } from '../shared/lib/apiClient'
import type { MascotaListItem, MascotaCrearRequest } from '../shared/types/mascotas'

const emptyForm = (): MascotaCrearRequest => ({
  nombreMascota: '',
  tipoMascotaId: undefined,
  razaMascotaId: undefined,
  razaLibre: '',
  vacunasAlDia: undefined,
  fechaUltimaVacuna: '',
  fechaNacimiento: '',
})

function MascotaCard({
  m,
  onEdit,
  onDelete,
}: {
  m: MascotaListItem
  onEdit: (m: MascotaListItem) => void
  onDelete: (id: number) => void
}) {
  return (
    <div className="flex items-start gap-4 rounded-xl border border-neutral-200 bg-surface-alt p-4">
      <div className="select-none text-4xl">🐾</div>
      <div className="flex-1">
        <p className="font-semibold text-neutral-900">{m.nombreMascota}</p>
        <p className="text-sm text-neutral">
          {[m.tipoMascota, m.razaMascota ?? m.razaLibre].filter(Boolean).join(' · ') || 'Sin tipo / raza'}
        </p>
        {m.fechaNacimiento && (
          <p className="text-xs text-neutral-300">
            Nac. {new Date(m.fechaNacimiento).toLocaleDateString()}
          </p>
        )}
        {m.vacunasAlDia !== undefined && (
          <span
            className={`mt-1 inline-block rounded-full px-2 py-0.5 text-xs font-medium ${
              m.vacunasAlDia ? 'bg-success-light text-success' : 'bg-warning-light text-warning'
            }`}
          >
            {m.vacunasAlDia ? 'Vacunas al día' : 'Vacunas pendientes'}
          </span>
        )}
      </div>
      <div className="flex gap-2">
        <button type="button" onClick={() => onEdit(m)} className="text-sm text-primary hover:underline">
          Editar
        </button>
        <button type="button" onClick={() => onDelete(m.mascotaId)} className="text-sm text-danger hover:underline">
          Eliminar
        </button>
      </div>
    </div>
  )
}

export function MisMascotasPage() {
  const { mascotas, loading, error, reload } = useMascotas()
  const tipos = useTiposMascota()
  const razas = useRazasMascota()

  const [modalOpen, setModalOpen] = useState(false)
  const [editId, setEditId] = useState<number | null>(null)
  const [form, setForm] = useState<MascotaCrearRequest>(emptyForm())
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [deleteId, setDeleteId] = useState<number | null>(null)
  const [deleteError, setDeleteError] = useState<string | null>(null)
  useQueryErrorToast(error)
  useQueryErrorToast(deleteError)
  useQueryErrorToast(formError, modalOpen)

  const filteredRazas = form.tipoMascotaId
    ? razas.filter((r) => r.tipoMascotaId === form.tipoMascotaId)
    : razas

  function openCreate() {
    setEditId(null)
    setForm(emptyForm())
    setFormError(null)
    setModalOpen(true)
  }

  function openEdit(m: MascotaListItem) {
    setEditId(m.mascotaId)
    setForm({
      nombreMascota: m.nombreMascota,
      tipoMascotaId: m.tipoMascotaId,
      razaMascotaId: m.razaMascotaId,
      razaLibre: m.razaLibre ?? '',
      vacunasAlDia: m.vacunasAlDia,
      fechaUltimaVacuna: m.fechaUltimaVacuna?.slice(0, 10) ?? '',
      fechaNacimiento: m.fechaNacimiento?.slice(0, 10) ?? '',
    })
    setFormError(null)
    setModalOpen(true)
  }

  async function confirmDelete() {
    if (deleteId === null) return
    setDeleteError(null)
    const { status, problem } = await apiDelete(`/USR/Mascotas/${deleteId}`)
    if (status !== 204 && status !== 200) {
      setDeleteError(problem?.detail ?? 'Error al eliminar.')
      setDeleteId(null)
      return
    }
    setDeleteId(null)
    reload()
  }

  async function handleSave(e: FormEvent) {
    e.preventDefault()
    const parsed = mascotaResidenteSchema.safeParse(form)
    if (!parsed.success) {
      setFormError(parsed.error.issues[0]?.message ?? 'Datos inválidos')
      return
    }
    setSaving(true)
    setFormError(null)
    const payload = parsed.data
    const result =
      editId === null
        ? await apiPost('/USR/Mascotas', payload)
        : await apiPut(`/USR/Mascotas/${editId}`, payload)
    setSaving(false)
    if (result.problem || (editId === null ? result.status !== 201 : result.status !== 204)) {
      setFormError(result.problem?.detail ?? 'Error al guardar.')
      return
    }
    setModalOpen(false)
    reload()
  }

  return (
    <main className="mx-auto max-w-3xl space-y-4 px-4 py-6">
      <PageHeader
        title="Mis mascotas"
        description="Mantén actualizado el registro de mascotas de tu hogar."
        actions={
          <button
            type="button"
            onClick={openCreate}
            className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-primary-dark"
          >
            + Nueva mascota
          </button>
        }
      />

      {error && (
        <button
          type="button"
          className="cursor-pointer text-sm text-primary underline"
          onClick={() => void reload()}
        >
          Reintentar
        </button>
      )}

      {loading && <p className="text-sm text-neutral">Cargando…</p>}

      {!loading && !error && mascotas.length === 0 && (
        <EmptyState title="No tienes mascotas registradas." />
      )}

      {!loading && !error && mascotas.length > 0 && (
        <div className="space-y-3">
          {mascotas.map((m) => (
            <MascotaCard key={m.mascotaId} m={m} onEdit={openEdit} onDelete={setDeleteId} />
          ))}
        </div>
      )}

      <FormModal
        open={modalOpen}
        title={editId ? 'Editar mascota' : 'Nueva mascota'}
        onClose={() => setModalOpen(false)}
      >
        <form onSubmit={(e) => void handleSave(e)} className="space-y-3">
          <div>
            <label className="mb-1 block text-sm font-medium text-neutral-700">Nombre *</label>
            <input
              className="w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm"
              value={form.nombreMascota}
              onChange={(e) => setForm((f) => ({ ...f, nombreMascota: e.target.value }))}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-sm font-medium text-neutral-700">Tipo</label>
              <select
                className="w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm"
                value={form.tipoMascotaId ?? ''}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    tipoMascotaId: e.target.value ? +e.target.value : undefined,
                    razaMascotaId: undefined,
                  }))
                }
              >
                <option value="">— Seleccionar —</option>
                {tipos.map((t) => (
                  <option key={t.tipoMascotaId} value={t.tipoMascotaId}>{t.tipoMascota}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-neutral-700">Raza</label>
              <select
                className="w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm"
                value={form.razaMascotaId ?? ''}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    razaMascotaId: e.target.value ? +e.target.value : undefined,
                  }))
                }
              >
                <option value="">— Seleccionar —</option>
                {filteredRazas.map((r) => (
                  <option key={r.razaMascotaId} value={r.razaMascotaId}>{r.razaMascota}</option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-neutral-700">Raza libre</label>
            <input
              className="w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm"
              placeholder="Si no está en la lista"
              value={form.razaLibre ?? ''}
              onChange={(e) => setForm((f) => ({ ...f, razaLibre: e.target.value }))}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-sm font-medium text-neutral-700">Fecha nacimiento</label>
              <input
                type="date"
                className="w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm"
                value={form.fechaNacimiento ?? ''}
                onChange={(e) => setForm((f) => ({ ...f, fechaNacimiento: e.target.value }))}
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-neutral-700">Última vacuna</label>
              <input
                type="date"
                className="w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm"
                value={form.fechaUltimaVacuna ?? ''}
                onChange={(e) => setForm((f) => ({ ...f, fechaUltimaVacuna: e.target.value }))}
              />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="vacunas"
              checked={form.vacunasAlDia ?? false}
              onChange={(e) => setForm((f) => ({ ...f, vacunasAlDia: e.target.checked }))}
              className="h-4 w-4 rounded border-neutral-200 text-primary"
            />
            <label htmlFor="vacunas" className="text-sm text-neutral-700">Vacunas al día</label>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setModalOpen(false)}
              className="px-3 py-2 text-sm text-neutral hover:underline"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving}
              className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary-dark disabled:opacity-50"
            >
              {saving ? 'Guardando…' : 'Guardar'}
            </button>
          </div>
        </form>
      </FormModal>

      <ConfirmDialog
        open={deleteId !== null}
        title="Eliminar mascota"
        message="¿Eliminar esta mascota del registro?"
        confirmLabel="Eliminar"
        variant="danger"
        onCancel={() => setDeleteId(null)}
        onConfirm={() => void confirmDelete()}
      />
    </main>
  )
}

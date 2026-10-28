import { zodResolver } from '@hookform/resolvers/zod'
import { useMemo, useState } from 'react'
import { useForm } from 'react-hook-form'
import 'bootstrap/dist/css/bootstrap.min.css'
import '@mdi/font/css/materialdesignicons.min.css'
import '../styles/bootstrap-pantone.css'
import '../styles/cq-admin.css'
import {
  AdminRazasMascotaSection,
  AdminTiposMascotaSection,
} from '../features/admin/mascotas/AdminMascotasCatalogSections'
import { MascotaAdminMobileCard } from '../features/admin/mascotas/MascotaAdminMobileCard'
import {
  mascotaCreateAdminSchema,
  mascotaEditAdminSchema,
  mascotaPayloadFromAdminForm,
  usuarioIdFromForm,
  type MascotaCreateAdminForm,
  type MascotaEditAdminForm,
} from '../features/admin/mascotas/mascotasAdminSchemas'
import {
  MASCOTAS_PADRON_ACCESSORS,
  MASCOTAS_PADRON_COLUMNS,
} from '../features/admin/mascotas/mascotasPadronTableFilter'
import { useRazasMascotaCatalog, useTiposMascotaCatalog } from '../features/admin/mascotas/useMascotasCatalog'
import { usePadronUsuarios } from '../features/admin/usuarios/usePadronUsuarios'
import { usePadronMascotas } from '../features/mascotas/useMascotas'
import {
  AdminFilterableTable,
  AdminListToolbar,
  AdminMobileCardList,
  AdminSidePanel,
  AdminSplitLayout,
  ConfirmDialog,
} from '../shared/components/admin'
import { useClientTableFilter } from '../shared/hooks/useClientTableFilter'
import { useQueryErrorToast } from '../shared/hooks/useQueryErrorToast'
import { apiDelete, apiPost, apiPut } from '../shared/lib/apiClient'
import { useToast } from '../shared/toast/ToastContext'
import type { MascotaListItem } from '../shared/types/mascotas'

type AdminTab = 'padron' | 'tipos' | 'razas'

function vacunasSelectValue(m: MascotaListItem): '' | 'true' | 'false' {
  if (m.vacunasAlDia === true) return 'true'
  if (m.vacunasAlDia === false) return 'false'
  return ''
}

export function AdminMascotasPage() {
  const [tab, setTab] = useState<AdminTab>('padron')
  const { padron, loading, error, reload } = usePadronMascotas()
  const { tipos, loading: tiposLoading, error: tiposError, reload: reloadTipos } = useTiposMascotaCatalog()
  const { razas, loading: razasLoading, error: razasError, reload: reloadRazas } = useRazasMascotaCatalog()
  const { data: usuarios } = usePadronUsuarios(undefined, true)
  const toast = useToast()

  useQueryErrorToast(error)
  useQueryErrorToast(tiposError)
  useQueryErrorToast(razasError)

  const [createOpen, setCreateOpen] = useState(false)
  const [editing, setEditing] = useState<MascotaListItem | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<MascotaListItem | null>(null)
  const [deleteError, setDeleteError] = useState<string | null>(null)
  const [formError, setFormError] = useState<string | null>(null)

  const heroStats = useMemo(
    () => [
      { label: 'Mascotas', value: padron.length },
      { label: 'Tipos', value: tipos.length },
      { label: 'Razas', value: razas.length },
      {
        label: 'Vacunas pendientes',
        value: padron.filter((m) => m.vacunasAlDia === false).length,
      },
    ],
    [padron, tipos.length, razas.length],
  )

  const {
    filteredRows,
    globalSearch,
    setGlobalSearch,
    columnFilters,
    onColumnFilterChange,
    filteredCount,
    totalCount,
  } = useClientTableFilter(padron, MASCOTAS_PADRON_COLUMNS, MASCOTAS_PADRON_ACCESSORS)

  const createForm = useForm<MascotaCreateAdminForm>({
    resolver: zodResolver(mascotaCreateAdminSchema),
    defaultValues: {
      usuarioId: '',
      nombreMascota: '',
      tipoMascotaId: '',
      razaMascotaId: '',
      razaLibre: '',
      vacunasAlDia: '',
      fechaUltimaVacuna: '',
      fechaNacimiento: '',
    },
  })

  const editForm = useForm<MascotaEditAdminForm>({
    resolver: zodResolver(mascotaEditAdminSchema),
    defaultValues: {
      nombreMascota: '',
      tipoMascotaId: '',
      razaMascotaId: '',
      razaLibre: '',
      vacunasAlDia: '',
      fechaUltimaVacuna: '',
      fechaNacimiento: '',
    },
  })

  const panelOpen = createOpen || editing !== null
  const isEdit = editing !== null
  const tipoWatch = isEdit ? editForm.watch('tipoMascotaId') : createForm.watch('tipoMascotaId')
  const razasFiltradas = tipoWatch
    ? razas.filter((r) => String(r.tipoMascotaId) === tipoWatch)
    : razas

  const openCreate = () => {
    setFormError(null)
    createForm.reset()
    setCreateOpen(true)
    setEditing(null)
    setTab('padron')
  }

  const openEdit = (m: MascotaListItem) => {
    setFormError(null)
    setCreateOpen(false)
    editForm.reset({
      nombreMascota: m.nombreMascota,
      tipoMascotaId: m.tipoMascotaId ? String(m.tipoMascotaId) : '',
      razaMascotaId: m.razaMascotaId ? String(m.razaMascotaId) : '',
      razaLibre: m.razaLibre ?? '',
      vacunasAlDia: vacunasSelectValue(m),
      fechaUltimaVacuna: m.fechaUltimaVacuna?.slice(0, 10) ?? '',
      fechaNacimiento: m.fechaNacimiento?.slice(0, 10) ?? '',
    })
    setEditing(m)
    setTab('padron')
  }

  const closePanel = () => {
    setCreateOpen(false)
    setEditing(null)
    setFormError(null)
  }

  const handleSaveCreate = createForm.handleSubmit(async (data) => {
    setFormError(null)
    const usuarioId = usuarioIdFromForm(data.usuarioId)
    const body = mascotaPayloadFromAdminForm(data, usuarioId)
    const { problem, status } = await apiPost('/USR/Mascotas/admin', body)
    if (problem) {
      setFormError(problem.detail ?? `Error ${status}`)
      return
    }
    closePanel()
    toast.success('Mascota registrada')
    await reload()
  })

  const handleSaveEdit = editForm.handleSubmit(async (data) => {
    if (!editing) return
    setFormError(null)
    const body = mascotaPayloadFromAdminForm(data)
    const { problem, status } = await apiPut(`/USR/Mascotas/${editing.mascotaId}/admin`, body)
    if (problem) {
      setFormError(problem.detail ?? `Error ${status}`)
      return
    }
    closePanel()
    toast.success('Mascota actualizada')
    await reload()
  })

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return
    setDeleteError(null)
    const { problem, status } = await apiDelete(`/USR/Mascotas/${deleteTarget.mascotaId}/admin`)
    if (problem) {
      setDeleteError(problem.detail ?? `Error ${status}`)
      return
    }
    setDeleteTarget(null)
    toast.success('Mascota eliminada')
    await reload()
  }

  const primaryAction =
    tab === 'padron'
      ? {
          label: 'Nueva mascota',
          iconClass: 'mdi mdi-plus',
          onClick: openCreate,
        }
      : {
          label: 'Actualizar',
          iconClass: 'mdi mdi-refresh',
          onClick: () => {
            void reload()
            void reloadTipos()
            void reloadRazas()
          },
        }

  const formFooter = (
    <>
      <button
        type="button"
        className="btn btn-primary flex-grow-1"
        onClick={() => void (isEdit ? handleSaveEdit() : handleSaveCreate())}
      >
        <i className={`mdi ${isEdit ? 'mdi-content-save' : 'mdi-paw'} mr-1`} />
        {isEdit ? 'Actualizar' : 'Registrar'}
      </button>
      <button type="button" className="btn btn-outline-secondary" onClick={closePanel}>
        Cancelar
      </button>
    </>
  )

  const mascotaFormFields = (form: typeof createForm | typeof editForm, showOwner: boolean) => (
    <>
      {showOwner && (
        <div className="form-group mb-3">
          <label className="cq-label">Propietario <span className="text-danger">*</span></label>
          <select className="form-control" {...createForm.register('usuarioId')}>
            <option value="">Seleccione…</option>
            {usuarios.map((u) => (
              <option key={u.usuarioId} value={u.usuarioId}>{u.nombre}</option>
            ))}
          </select>
          {createForm.formState.errors.usuarioId && (
            <span className="text-danger small">{createForm.formState.errors.usuarioId.message}</span>
          )}
        </div>
      )}
      <div className="form-group mb-3">
        <label className="cq-label">Nombre <span className="text-danger">*</span></label>
        <input className="form-control" {...form.register('nombreMascota')} />
        {form.formState.errors.nombreMascota && (
          <span className="text-danger small">{form.formState.errors.nombreMascota.message}</span>
        )}
      </div>
      <div className="form-group mb-3">
        <label className="cq-label">Tipo</label>
        <select className="form-control" {...form.register('tipoMascotaId')}>
          <option value="">—</option>
          {tipos.map((t) => (
            <option key={t.tipoMascotaId} value={t.tipoMascotaId}>{t.tipoMascota}</option>
          ))}
        </select>
      </div>
      <div className="form-group mb-3">
        <label className="cq-label">Raza (catálogo)</label>
        <select className="form-control" {...form.register('razaMascotaId')}>
          <option value="">—</option>
          {razasFiltradas.map((r) => (
            <option key={r.razaMascotaId} value={r.razaMascotaId}>{r.razaMascota}</option>
          ))}
        </select>
      </div>
      <div className="form-group mb-3">
        <label className="cq-label">Raza (texto libre)</label>
        <input className="form-control" {...form.register('razaLibre')} />
      </div>
      <div className="form-group mb-3">
        <label className="cq-label">Vacunas</label>
        <select className="form-control" {...form.register('vacunasAlDia')}>
          <option value="">Sin dato</option>
          <option value="true">Al día</option>
          <option value="false">Pendiente</option>
        </select>
      </div>
      <div className="form-group mb-3">
        <label className="cq-label">Última vacuna</label>
        <input type="date" className="form-control" {...form.register('fechaUltimaVacuna')} />
      </div>
      <div className="form-group mb-0">
        <label className="cq-label">Fecha de nacimiento</label>
        <input type="date" className="form-control" {...form.register('fechaNacimiento')} />
      </div>
    </>
  )

  return (
    <div className="cq-admin-page container-fluid py-4">
      <AdminListToolbar title="Mascotas" metrics={heroStats} primaryAction={primaryAction} />

      <ul className="nav nav-tabs mb-3 cq-admin-tabs">
        <li className="nav-item">
          <button
            type="button"
            className={`nav-link ${tab === 'padron' ? 'active' : ''}`}
            onClick={() => setTab('padron')}
          >
            Padrón
          </button>
        </li>
        <li className="nav-item">
          <button
            type="button"
            className={`nav-link ${tab === 'tipos' ? 'active' : ''}`}
            onClick={() => setTab('tipos')}
          >
            Tipos
          </button>
        </li>
        <li className="nav-item">
          <button
            type="button"
            className={`nav-link ${tab === 'razas' ? 'active' : ''}`}
            onClick={() => setTab('razas')}
          >
            Razas
          </button>
        </li>
      </ul>

      {tab === 'tipos' && (
        <AdminTiposMascotaSection tipos={tipos} loading={tiposLoading} onReload={reloadTipos} />
      )}

      {tab === 'razas' && (
        <AdminRazasMascotaSection
          razas={razas}
          tipos={tipos}
          loading={razasLoading}
          onReload={async () => {
            await reloadRazas()
            await reloadTipos()
          }}
        />
      )}

      {tab === 'padron' && (
        <AdminSplitLayout
          panelOpen={panelOpen}
          tablePane={
            <div className="card">
              <div className="card-body pt-3">
                {loading && (
                  <div className="placeholder-glow" aria-label="Cargando mascotas">
                    <span className="placeholder col-12 mb-2" />
                  </div>
                )}
                {!loading && padron.length === 0 && (
                  <div className="cq-empty-state">
                    <i className="mdi mdi-paw cq-empty-icon" />
                    <p className="cq-empty-title">Sin mascotas</p>
                    <p className="text-muted">Registra una mascota o actualiza el padrón.</p>
                  </div>
                )}
                {!loading && padron.length > 0 && (
                  <>
                    <AdminFilterableTable
                      columns={MASCOTAS_PADRON_COLUMNS}
                      columnFilters={columnFilters}
                      onColumnFilterChange={onColumnFilterChange}
                      globalSearch={globalSearch}
                      onGlobalSearchChange={setGlobalSearch}
                      filteredCount={filteredCount}
                      totalCount={totalCount}
                    >
                      {filteredRows.map((m) => (
                        <tr key={m.mascotaId} className={editing?.mascotaId === m.mascotaId ? 'cq-row-active' : undefined}>
                          <td className="font-weight-bold min-w-0 text-break">{m.nombreMascota}</td>
                          <td className="min-w-0 text-break">
                            {[m.tipoMascota, m.razaMascota ?? m.razaLibre].filter(Boolean).join(' · ') || '—'}
                          </td>
                          <td className="min-w-0 text-break">{m.nombreUsuario ?? '—'}</td>
                          <td>{m.numeroCasa ?? '—'}</td>
                          <td>
                            {m.vacunasAlDia === undefined ? (
                              '—'
                            ) : (
                              <span className={`badge ${m.vacunasAlDia ? 'bg-success' : 'bg-warning text-dark'}`}>
                                {m.vacunasAlDia ? 'Al día' : 'Pendiente'}
                              </span>
                            )}
                          </td>
                          <td className="text-center cq-actions">
                            <button type="button" className="btn btn-link btn-sm" onClick={() => openEdit(m)} aria-label="Editar">
                              <i className="mdi mdi-pencil" />
                            </button>
                            <button
                              type="button"
                              className="btn btn-link btn-sm text-danger"
                              onClick={() => setDeleteTarget(m)}
                              aria-label="Eliminar"
                            >
                              <i className="mdi mdi-delete" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </AdminFilterableTable>
                    <AdminMobileCardList
                      rows={filteredRows}
                      getRowKey={(m) => m.mascotaId}
                      renderCard={(m) => (
                        <MascotaAdminMobileCard
                          mascota={m}
                          active={editing?.mascotaId === m.mascotaId}
                          onEdit={openEdit}
                        />
                      )}
                    />
                  </>
                )}
              </div>
            </div>
          }
          formPane={
            <AdminSidePanel
              visible={panelOpen}
              title={isEdit ? 'Editar mascota' : 'Nueva mascota'}
              subtitle="Asocia la mascota al residente propietario."
              iconClass="mdi mdi-paw"
              editing={isEdit}
              onClose={closePanel}
              footer={formFooter}
            >
              {formError && <div className="alert alert-danger py-2 small" role="alert">{formError}</div>}
              {isEdit
                ? mascotaFormFields(editForm, false)
                : mascotaFormFields(createForm, true)}
            </AdminSidePanel>
          }
        />
      )}

      <ConfirmDialog
        open={deleteTarget !== null}
        title="Eliminar mascota"
        message={deleteTarget ? `¿Eliminar a ${deleteTarget.nombreMascota}?` : ''}
        confirmLabel="Eliminar"
        variant="danger"
        onCancel={() => setDeleteTarget(null)}
        onConfirm={() => void handleConfirmDelete()}
      />
      {deleteTarget && deleteError && (
        <div className="alert alert-danger mt-3" role="alert">{deleteError}</div>
      )}
    </div>
  )
}

import { Link } from 'react-router-dom'
import { useEffect, useMemo, useState } from 'react'
import { displayTransicionAdmin } from '../features/tickets/ticketEstadoDisplay'
import 'bootstrap/dist/css/bootstrap.min.css'
import '@mdi/font/css/materialdesignicons.min.css'
import '../styles/bootstrap-pantone.css'
import '../styles/cq-admin.css'
import { EstadoTicketBadge } from '../features/tickets/EstadoTicketBadge'
import { useCatalogosTicket } from '../features/tickets/useCatalogosTicket'
import { estadosDestinoPermitidos } from '../features/admin/tickets/ticketTransitions'
import {
  TICKETS_ADMIN_TABLE_ACCESSORS,
  TICKETS_ADMIN_TABLE_COLUMNS,
} from '../features/admin/tickets/ticketsAdminTableFilter'
import { TicketAdminForm } from '../features/admin/tickets/TicketAdminForm'
import { useTicketAdminMutations } from '../features/admin/tickets/useTicketAdminMutations'
import { useTicketsAdmin, type AdminTicketItem } from '../features/admin/tickets/useTicketsAdmin'
import { useTrabajadores } from '../features/admin/tickets/useTrabajadores'
import { usePadronUsuarios } from '../features/admin/usuarios/usePadronUsuarios'
import { useAuth } from '../features/auth/AuthContext'
import { TicketDetallePanel } from '../features/tickets/TicketDetallePanel'
import { useTicketDetalle } from '../features/tickets/useTicketDetalle'
import { TicketAdminMobileCard } from '../features/admin/tickets/TicketAdminMobileCard'
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
import { apiPatch, apiPost } from '../shared/lib/apiClient'
import { useToast } from '../shared/toast/ToastContext'
import type { TicketAdminCreateForm, TicketAdminEditForm } from '../features/admin/tickets/ticketAdminSchemas'

type PanelMode = 'closed' | 'create' | 'view' | 'edit'

export function AdminTicketsPage() {
  const { session } = useAuth()
  const [estadoFiltro, setEstadoFiltro] = useState<number | undefined>()
  const [panelMode, setPanelMode] = useState<PanelMode>('closed')
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<AdminTicketItem | null>(null)
  const [formError, setFormError] = useState<string | null>(null)
  const toast = useToast()
  const { data, loading, error, refetch } = useTicketsAdmin(estadoFiltro)
  useQueryErrorToast(error)
  const { estados, categorias, prioridades } = useCatalogosTicket()
  const trabajadores = useTrabajadores()
  const { data: padronUsuarios } = usePadronUsuarios('Residente', true)
  const { crear, actualizar, eliminar, busy: mutating } = useTicketAdminMutations()
  const viewTicketId = selectedId ?? 0
  const { detalle, refetch: refetchDetalle } = useTicketDetalle(viewTicketId)

  const items = data?.items ?? []

  const selected = useMemo(
    () => items.find((t) => t.ticketId === selectedId) ?? null,
    [items, selectedId],
  )

  const destinos = selected ? estadosDestinoPermitidos(selected.estado) : []
  const destinoIds = estados.filter((e) => destinos.includes(e.nombre))

  const heroStats = useMemo(() => {
    const abiertos = items.filter((t) => t.estado !== 'Cerrado').length
    return [
      { label: 'Tickets', value: data?.total ?? items.length },
      { label: 'En lista', value: items.length },
      { label: 'No cerrados', value: abiertos },
    ]
  }, [data?.total, items])

  const {
    filteredRows: filteredTickets,
    globalSearch,
    setGlobalSearch,
    columnFilters,
    onColumnFilterChange,
    filteredCount,
    totalCount,
  } = useClientTableFilter(items, TICKETS_ADMIN_TABLE_COLUMNS, TICKETS_ADMIN_TABLE_ACCESSORS)

  const panelOpen = panelMode !== 'closed'

  const closePanel = () => {
    setPanelMode('closed')
    setSelectedId(null)
    setFormError(null)
  }

  const openCreate = () => {
    setSelectedId(null)
    setPanelMode('create')
    setFormError(null)
  }

  const openView = (ticketId: number) => {
    setSelectedId(ticketId)
    setPanelMode('view')
    setFormError(null)
  }

  const openEdit = () => {
    if (!selected || selected.estado === 'Cerrado') return
    setPanelMode('edit')
    setFormError(null)
  }

  const cambiarEstado = async (estadoId: number) => {
    if (!session?.token || !selected) return
    const { status, problem } = await apiPatch(
      `/TKT/Tickets/${selected.ticketId}/estado/${estadoId}`,
      undefined,
      session.token,
    )
    if (status === 204) {
      toast.success('Estado actualizado')
      await refetch()
      void refetchDetalle()
    } else {
      toast.error(problem?.detail ?? 'No se pudo cambiar el estado')
    }
  }

  const asignar = async (usuarioId: number) => {
    if (!session?.token || !selected) return
    const { status, problem } = await apiPost(
      '/TKT/TicketsUsuariosAsignados',
      { ticketId: selected.ticketId, usuarioId },
      session.token,
    )
    if (status === 201) {
      toast.success('Trabajador asignado')
    } else {
      toast.error(problem?.detail ?? 'No se pudo asignar')
    }
  }

  const handleCreate = async (values: TicketAdminCreateForm) => {
    setFormError(null)
    const result = await crear(values)
    if (!result.ok) {
      setFormError(result.detail)
      return
    }
    toast.success('Ticket creado')
    closePanel()
    await refetch()
  }

  const handleEdit = async (values: TicketAdminEditForm) => {
    if (!selected) return
    setFormError(null)
    const result = await actualizar(selected.ticketId, values)
    if (!result.ok) {
      setFormError(result.detail)
      return
    }
    toast.success('Ticket actualizado')
    setPanelMode('view')
    await refetch()
    void refetchDetalle()
  }

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return
    const result = await eliminar(deleteTarget.ticketId)
    if (!result.ok) {
      toast.error(result.detail)
      return
    }
    toast.success('Ticket eliminado')
    if (selectedId === deleteTarget.ticketId) {
      closePanel()
    }
    setDeleteTarget(null)
    await refetch()
  }

  const editDefaults: TicketAdminEditForm | null =
    panelMode === 'edit' && detalle
      ? {
          titulo: detalle.titulo,
          descripcion: detalle.descripcion,
          categoria: detalle.categoria ?? '',
          prioridad: detalle.prioridad ?? '',
        }
      : null

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && panelOpen) closePanel()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [panelOpen])

  const panelTitle =
    panelMode === 'create'
      ? 'Nuevo ticket'
      : panelMode === 'edit'
        ? 'Editar ticket'
        : selected
          ? selected.titulo
          : 'Detalle'

  const panelSubtitle =
    panelMode === 'create'
      ? 'Registra un ticket en nombre de un residente.'
      : panelMode === 'edit'
        ? `Ticket #${selected?.ticketId}`
        : selected
          ? `Solicitante: ${selected.solicitante}`
          : ''

  return (
    <div className="cq-admin-page container-fluid py-4">
      <div className="d-flex flex-wrap justify-content-end gap-2 mb-2">
        <Link to="/admin/tickets/catalogos" className="btn btn-outline-secondary btn-sm">
          <i className="mdi mdi-book-cog-outline" /> Catálogos
        </Link>
      </div>
      <AdminListToolbar
        title="Gestión de tickets"
        metrics={heroStats}
        primaryAction={{
          label: 'Nuevo ticket',
          iconClass: 'mdi mdi-plus',
          onClick: openCreate,
        }}
        filterSlot={
          <select
            className="form-select form-select-sm"
            value={estadoFiltro ?? ''}
            onChange={(e) => setEstadoFiltro(e.target.value ? Number(e.target.value) : undefined)}
            aria-label="Filtrar por estado"
          >
            <option value="">Todos los estados</option>
            {estados.map((e) => (
              <option key={e.id} value={e.id}>{e.nombre}</option>
            ))}
          </select>
        }
      />

      <AdminSplitLayout
        panelOpen={panelOpen}
        tablePane={
          <div className="card">
            <div className="card-body pt-3">
              {loading && (
                <div className="placeholder-glow">
                  <span className="placeholder col-12 mb-2" />
                  <span className="placeholder col-10" />
                </div>
              )}

              {!loading && !error && items.length === 0 && (
                <div className="cq-empty-state">
                  <i className="mdi mdi-ticket-outline cq-empty-icon" />
                  <p className="cq-empty-title">Sin tickets</p>
                  <p className="text-muted">No hay tickets para el filtro seleccionado.</p>
                </div>
              )}

              {!loading && !error && items.length > 0 && (
                <>
                <AdminFilterableTable
                  columns={TICKETS_ADMIN_TABLE_COLUMNS}
                  columnFilters={columnFilters}
                  onColumnFilterChange={onColumnFilterChange}
                  globalSearch={globalSearch}
                  onGlobalSearchChange={setGlobalSearch}
                  filteredCount={filteredCount}
                  totalCount={totalCount}
                >
                  {filteredTickets.length === 0 ? (
                    <tr>
                      <td colSpan={TICKETS_ADMIN_TABLE_COLUMNS.length} className="text-center text-muted py-4">
                        Sin resultados para los filtros aplicados.
                      </td>
                    </tr>
                  ) : (
                    filteredTickets.map((t) => {
                      const rowActive = selectedId === t.ticketId && panelOpen
                      return (
                        <tr key={t.ticketId} className={rowActive ? 'cq-row-active' : undefined}>
                          <td className="min-w-0">
                            <strong className="text-truncate d-block" title={t.titulo}>{t.titulo}</strong>
                          </td>
                          <td>
                            <EstadoTicketBadge estado={t.estado} variant="admin" />
                          </td>
                          <td>{t.prioridad}</td>
                          <td>{t.categoria ?? '—'}</td>
                          <td className="min-w-0 text-truncate" title={t.solicitante}>{t.solicitante}</td>
                          <td className="tabular-nums text-nowrap small text-muted">{t.fechaCreacion}</td>
                          <td className="text-center cq-actions">
                            <button
                              type="button"
                              className="btn btn-link btn-sm"
                              onClick={() => openView(t.ticketId)}
                              aria-label={`Ver ticket ${t.titulo}`}
                            >
                              <i className="mdi mdi-eye" />
                            </button>
                            <button
                              type="button"
                              className="btn btn-link btn-sm"
                              disabled={t.estado === 'Cerrado'}
                              onClick={() => {
                                openView(t.ticketId)
                                setPanelMode('edit')
                              }}
                              aria-label={`Editar ticket ${t.titulo}`}
                            >
                              <i className="mdi mdi-pencil" />
                            </button>
                            <button
                              type="button"
                              className="btn btn-link btn-sm text-danger"
                              onClick={() => setDeleteTarget(t)}
                              aria-label={`Eliminar ticket ${t.titulo}`}
                            >
                              <i className="mdi mdi-delete" />
                            </button>
                          </td>
                        </tr>
                      )
                    })
                  )}
                </AdminFilterableTable>
                <AdminMobileCardList
                  rows={filteredTickets}
                  getRowKey={(t) => t.ticketId}
                  renderCard={(t) => (
                    <TicketAdminMobileCard
                      ticket={t}
                      active={selectedId === t.ticketId && panelOpen}
                      onSelect={openView}
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
            title={panelTitle}
            subtitle={panelSubtitle}
            iconClass={
              panelMode === 'create'
                ? 'mdi mdi-ticket-plus'
                : panelMode === 'edit'
                  ? 'mdi mdi-pencil'
                  : 'mdi mdi-ticket-account'
            }
            editing={panelMode === 'create' || panelMode === 'edit'}
            onClose={closePanel}
            footer={
              panelMode === 'view' ? (
                <div className="d-flex flex-column gap-2 w-100">
                  <div className="d-flex gap-2">
                    <button
                      type="button"
                      className="btn btn-outline-primary flex-grow-1"
                      disabled={selected?.estado === 'Cerrado'}
                      onClick={openEdit}
                    >
                      Editar
                    </button>
                    <button
                      type="button"
                      className="btn btn-outline-danger"
                      onClick={() => selected && setDeleteTarget(selected)}
                      aria-label="Eliminar ticket"
                    >
                      <i className="mdi mdi-delete" />
                    </button>
                  </div>
                  <button type="button" className="btn btn-outline-secondary w-100" onClick={closePanel}>
                    Cerrar
                  </button>
                </div>
              ) : (
                <button type="button" className="btn btn-outline-secondary w-100" onClick={closePanel}>
                  Cancelar
                </button>
              )
            }
          >
            {formError && (
              <div className="alert alert-danger py-2 small" role="alert">
                {formError}
              </div>
            )}
            {panelMode === 'create' && (
              <TicketAdminForm
                mode="create"
                categorias={categorias}
                prioridades={prioridades}
                residentes={padronUsuarios}
                disabled={mutating}
                onSubmit={(v) => void handleCreate(v)}
              />
            )}
            {panelMode === 'edit' && editDefaults && (
              <TicketAdminForm
                mode="edit"
                categorias={categorias}
                prioridades={prioridades}
                defaultValues={editDefaults}
                disabled={mutating}
                onSubmit={(v) => void handleEdit(v)}
              />
            )}
            {panelMode === 'edit' && !editDefaults && (
              <p className="text-muted small">Cargando datos del ticket…</p>
            )}
            {panelMode === 'view' && selected ? (
              <TicketDetallePanel
                ticketId={selected.ticketId}
                isAdmin
                showAdminActions={
                  <>
                    <div className="mb-4">
                      <p className="cq-label mb-2">
                        <i className="mdi mdi-swap-horizontal" />
                        Cambiar estado
                      </p>
                      <div className="d-flex flex-wrap gap-2">
                        {destinoIds.map((e) => {
                          const tx = displayTransicionAdmin(e.nombre)
                          return (
                            <button
                              key={e.id}
                              type="button"
                              className="btn btn-sm btn-outline-primary cursor-pointer"
                              title={tx.title}
                              onClick={() => void cambiarEstado(e.id)}
                            >
                              {tx.label}
                            </button>
                          )
                        })}
                        {destinoIds.length === 0 && (
                          <span className="text-muted small">Sin transiciones disponibles.</span>
                        )}
                      </div>
                    </div>
                    <div className="mb-4">
                      <label className="cq-label" htmlFor="asignar-trabajador">
                        <i className="mdi mdi-account-hard-hat" />
                        Asignar trabajador
                      </label>
                      <select
                        id="asignar-trabajador"
                        className="form-control"
                        defaultValue=""
                        onChange={(e) => {
                          const id = Number(e.target.value)
                          if (id) void asignar(id)
                        }}
                      >
                        <option value="">Selecciona…</option>
                        {trabajadores.map((w) => (
                          <option key={w.id} value={w.id}>{w.nombre}</option>
                        ))}
                      </select>
                    </div>
                  </>
                }
              />
            ) : null}
            {panelMode === 'view' && !selected && (
              <p className="text-muted">Selecciona un ticket en la tabla.</p>
            )}
          </AdminSidePanel>
        }
      />

      <ConfirmDialog
        open={deleteTarget !== null}
        title="Eliminar ticket"
        message={
          deleteTarget
            ? `¿Eliminar el ticket «${deleteTarget.titulo}»? Dejará de aparecer en los listados.`
            : ''
        }
        confirmLabel="Eliminar"
        variant="danger"
        onCancel={() => setDeleteTarget(null)}
        onConfirm={() => void handleConfirmDelete()}
      />
    </div>
  )
}

import { useEffect, useMemo, useState } from 'react'
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
import { useTicketsAdmin } from '../features/admin/tickets/useTicketsAdmin'
import { useTrabajadores } from '../features/admin/tickets/useTrabajadores'
import { useAuth } from '../features/auth/AuthContext'
import {
  AdminFilterableTable,
  AdminListToolbar,
  AdminSidePanel,
  AdminSplitLayout,
} from '../shared/components/admin'
import { useClientTableFilter } from '../shared/hooks/useClientTableFilter'
import { apiPatch, apiPost } from '../shared/lib/apiClient'

export function AdminTicketsPage() {
  const { session } = useAuth()
  const [estadoFiltro, setEstadoFiltro] = useState<number | undefined>()
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [toast, setToast] = useState<string | null>(null)
  const [dismissedError, setDismissedError] = useState(false)
  const { data, loading, error, refetch } = useTicketsAdmin(estadoFiltro)
  const { estados } = useCatalogosTicket()
  const trabajadores = useTrabajadores()

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

  const panelOpen = selectedId !== null

  const closePanel = () => setSelectedId(null)

  const cambiarEstado = async (estadoId: number) => {
    if (!session?.token || !selected) return
    const { status, problem } = await apiPatch(
      `/TKT/Tickets/${selected.ticketId}/estado/${estadoId}`,
      undefined,
      session.token,
    )
    if (status === 204) {
      setToast('Estado actualizado')
      await refetch()
    } else {
      setToast(problem?.detail ?? 'No se pudo cambiar el estado')
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
      setToast('Trabajador asignado')
    } else {
      setToast(problem?.detail ?? 'No se pudo asignar')
    }
  }

  useEffect(() => {
    if (error) setDismissedError(false)
  }, [error])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && panelOpen) closePanel()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [panelOpen])

  return (
    <div className="cq-admin-page container-fluid py-4">
      {toast && (
        <div className="alert alert-info alert-dismissible fade show" role="status">
          {toast}
          <button type="button" className="btn-close" aria-label="Cerrar" onClick={() => setToast(null)} />
        </div>
      )}

      {error && !dismissedError && (
        <div className="alert alert-danger alert-dismissible fade show" role="alert">
          <i className="mdi mdi-alert-circle mr-1" />
          {error}
          <button
            type="button"
            className="btn-close"
            aria-label="Cerrar"
            onClick={() => setDismissedError(true)}
          />
        </div>
      )}

      <AdminListToolbar
        title="Gestión de tickets"
        metrics={heroStats}
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
                      const rowActive = selectedId === t.ticketId
                      return (
                        <tr key={t.ticketId} className={rowActive ? 'cq-row-active' : undefined}>
                          <td className="min-w-0">
                            <strong className="text-truncate d-block" title={t.titulo}>{t.titulo}</strong>
                          </td>
                          <td>
                            <EstadoTicketBadge estado={t.estado} />
                          </td>
                          <td>{t.prioridad}</td>
                          <td>{t.categoria ?? '—'}</td>
                          <td className="min-w-0 text-truncate" title={t.solicitante}>{t.solicitante}</td>
                          <td className="tabular-nums text-nowrap small text-muted">{t.fechaCreacion}</td>
                          <td className="text-center cq-actions">
                            <button
                              type="button"
                              className="btn btn-link btn-sm"
                              onClick={() => setSelectedId(t.ticketId)}
                              aria-label={`Ver ticket ${t.titulo}`}
                            >
                              <i className="mdi mdi-eye" />
                            </button>
                          </td>
                        </tr>
                      )
                    })
                  )}
                </AdminFilterableTable>
              )}
            </div>
          </div>
        }
        formPane={
          <AdminSidePanel
            visible={panelOpen}
            title={selected ? selected.titulo : 'Detalle'}
            subtitle={selected ? `Solicitante: ${selected.solicitante}` : ''}
            iconClass="mdi mdi-ticket-account"
            editing={true}
            onClose={closePanel}
            footer={
              <button type="button" className="btn btn-outline-secondary w-100" onClick={closePanel}>
                Cerrar
              </button>
            }
          >
            {selected ? (
              <>
                <div className="mb-3">
                  <EstadoTicketBadge estado={selected.estado} />
                  <p className="small text-muted mt-2 mb-0">
                    Prioridad: {selected.prioridad}
                    {selected.categoria ? ` · ${selected.categoria}` : ''}
                  </p>
                </div>
                <div className="mb-4">
                  <p className="cq-label mb-2">
                    <i className="mdi mdi-swap-horizontal" />
                    Cambiar estado
                  </p>
                  <div className="d-flex flex-wrap gap-2">
                    {destinoIds.map((e) => (
                      <button
                        key={e.id}
                        type="button"
                        className="btn btn-sm btn-outline-primary"
                        onClick={() => void cambiarEstado(e.id)}
                      >
                        → {e.nombre}
                      </button>
                    ))}
                    {destinoIds.length === 0 && (
                      <span className="text-muted small">Sin transiciones disponibles.</span>
                    )}
                  </div>
                </div>
                <div>
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
            ) : (
              <p className="text-muted">Selecciona un ticket en la tabla.</p>
            )}
          </AdminSidePanel>
        }
      />
    </div>
  )
}

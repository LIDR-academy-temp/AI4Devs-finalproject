import { zodResolver } from '@hookform/resolvers/zod'
import { useEffect, useMemo, useState } from 'react'
import { useForm } from 'react-hook-form'
import { Link } from 'react-router-dom'
import 'bootstrap/dist/css/bootstrap.min.css'
import '@mdi/font/css/materialdesignicons.min.css'
import '../styles/bootstrap-pantone.css'
import '../styles/cq-admin.css'
import {
  CATEGORIAS_TABLE_ACCESSORS,
  CATEGORIAS_TABLE_COLUMNS,
  PRIORIDADES_TABLE_ACCESSORS,
  PRIORIDADES_TABLE_COLUMNS,
} from '../features/admin/tickets/catalogos/catalogosTableFilter'
import {
  TicketEstadosGuiaPanel,
  TicketEstadosGuiaTable,
} from '../features/admin/tickets/catalogos/TicketEstadosGuiaPanel'
import {
  categoriaTicketUpsertSchema,
  ordenPrioridadToApi,
  prioridadTicketUpsertSchema,
  type CategoriaTicketUpsertForm,
  type PrioridadTicketUpsertForm,
} from '../features/admin/tickets/catalogos/ticketCatalogosAdminSchemas'
import { useTicketCatalogosAdmin } from '../features/admin/tickets/catalogos/useTicketCatalogosAdmin'
import {
  AdminFilterableTable,
  AdminListToolbar,
  AdminSidePanel,
  AdminSplitLayout,
  ConfirmDialog,
} from '../shared/components/admin'
import { useClientTableFilter } from '../shared/hooks/useClientTableFilter'
import { useQueryErrorToast } from '../shared/hooks/useQueryErrorToast'
import { apiDelete, apiPost, apiPut, type ApiProblem } from '../shared/lib/apiClient'
import type { CatalogoItem, PrioridadCatalogoItem } from '../shared/types/tickets'
import { useToast } from '../shared/toast/ToastContext'

type TabId = 'categorias' | 'prioridades' | 'estados'

function mapCatalogProblem(problem: ApiProblem | undefined, status: number) {
  if (problem?.code === 'CATALOG_DUPLICADO') return 'Ya existe un registro con ese nombre.'
  if (problem?.code === 'CATALOG_IN_USE') return 'No se puede eliminar: hay tickets que lo usan.'
  return problem?.detail ?? `Error ${status}`
}

export function AdminTicketCatalogosPage() {
  const { categorias, prioridades, loading, error, refetch } = useTicketCatalogosAdmin()
  useQueryErrorToast(error)

  const [tab, setTab] = useState<TabId>('categorias')
  const [panelOpen, setPanelOpen] = useState(false)
  const [editingCategoria, setEditingCategoria] = useState<CatalogoItem | null>(null)
  const [editingPrioridad, setEditingPrioridad] = useState<PrioridadCatalogoItem | null>(null)
  const [deleteCategoria, setDeleteCategoria] = useState<CatalogoItem | null>(null)
  const [deletePrioridad, setDeletePrioridad] = useState<PrioridadCatalogoItem | null>(null)
  const [formError, setFormError] = useState<string | null>(null)
  const [deleteError, setDeleteError] = useState<string | null>(null)
  const toast = useToast()

  const catFilter = useClientTableFilter(categorias, CATEGORIAS_TABLE_COLUMNS, CATEGORIAS_TABLE_ACCESSORS)
  const priFilter = useClientTableFilter(prioridades, PRIORIDADES_TABLE_COLUMNS, PRIORIDADES_TABLE_ACCESSORS)

  const metrics = useMemo(
    () => [
      { label: 'Categorías', value: categorias.length },
      { label: 'Prioridades', value: prioridades.length },
    ],
    [categorias.length, prioridades.length],
  )

  const categoriaForm = useForm<CategoriaTicketUpsertForm>({
    resolver: zodResolver(categoriaTicketUpsertSchema),
    defaultValues: { nombre: '' },
  })

  const prioridadForm = useForm<PrioridadTicketUpsertForm>({
    resolver: zodResolver(prioridadTicketUpsertSchema),
    defaultValues: { nombre: '', orden: '' },
  })

  const closePanel = () => {
    setPanelOpen(false)
    setEditingCategoria(null)
    setEditingPrioridad(null)
    setFormError(null)
  }

  const openCreateCategoria = () => {
    setEditingCategoria(null)
    setEditingPrioridad(null)
    setFormError(null)
    categoriaForm.reset({ nombre: '' })
    setPanelOpen(true)
  }

  const openEditCategoria = (row: CatalogoItem) => {
    setEditingPrioridad(null)
    setEditingCategoria(row)
    setFormError(null)
    categoriaForm.reset({ nombre: row.nombre })
    setPanelOpen(true)
  }

  const openCreatePrioridad = () => {
    setEditingCategoria(null)
    setEditingPrioridad(null)
    setFormError(null)
    prioridadForm.reset({ nombre: '', orden: '' })
    setPanelOpen(true)
  }

  const openEditPrioridad = (row: PrioridadCatalogoItem) => {
    setEditingCategoria(null)
    setEditingPrioridad(row)
    setFormError(null)
    prioridadForm.reset({
      nombre: row.nombre,
      orden: row.orden != null ? row.orden : '',
    })
    setPanelOpen(true)
  }

  const onSaveCategoria = categoriaForm.handleSubmit(async (values) => {
    setFormError(null)
    if (editingCategoria) {
      const { problem, status } = await apiPut(`/TKT/CategoriasTicket/${editingCategoria.id}/admin`, {
        nombre: values.nombre,
      })
      if (problem) {
        setFormError(mapCatalogProblem(problem, status))
        return
      }
    } else {
      const { problem, status } = await apiPost('/TKT/CategoriasTicket/admin', { nombre: values.nombre })
      if (problem) {
        setFormError(mapCatalogProblem(problem, status))
        return
      }
    }
    closePanel()
    toast.success(editingCategoria ? 'Categoría actualizada' : 'Categoría creada')
    await refetch()
  })

  const onSavePrioridad = prioridadForm.handleSubmit(async (values) => {
    setFormError(null)
    const body = { nombre: values.nombre, orden: ordenPrioridadToApi(values.orden) }
    if (editingPrioridad) {
      const { problem, status } = await apiPut(`/TKT/PrioridadesTicket/${editingPrioridad.id}/admin`, body)
      if (problem) {
        setFormError(mapCatalogProblem(problem, status))
        return
      }
    } else {
      const { problem, status } = await apiPost('/TKT/PrioridadesTicket/admin', body)
      if (problem) {
        setFormError(mapCatalogProblem(problem, status))
        return
      }
    }
    closePanel()
    toast.success(editingPrioridad ? 'Prioridad actualizada' : 'Prioridad creada')
    await refetch()
  })

  const confirmDeleteCategoria = async () => {
    if (!deleteCategoria) return
    setDeleteError(null)
    const { problem, status } = await apiDelete(`/TKT/CategoriasTicket/${deleteCategoria.id}/admin`)
    if (problem) {
      setDeleteError(mapCatalogProblem(problem, status))
      return
    }
    setDeleteCategoria(null)
    toast.success('Categoría eliminada')
    await refetch()
  }

  const confirmDeletePrioridad = async () => {
    if (!deletePrioridad) return
    setDeleteError(null)
    const { problem, status } = await apiDelete(`/TKT/PrioridadesTicket/${deletePrioridad.id}/admin`)
    if (problem) {
      setDeleteError(mapCatalogProblem(problem, status))
      return
    }
    setDeletePrioridad(null)
    toast.success('Prioridad eliminada')
    await refetch()
  }

  useEffect(() => {
    if (!deleteCategoria && !deletePrioridad) setDeleteError(null)
  }, [deleteCategoria, deletePrioridad])

  const selectTab = (next: TabId) => {
    setTab(next)
    setPanelOpen(false)
    setEditingCategoria(null)
    setEditingPrioridad(null)
    setFormError(null)
  }

  const primaryAction =
    tab === 'categorias'
      ? { label: 'Nueva categoría', iconClass: 'mdi mdi-plus', onClick: openCreateCategoria }
      : tab === 'prioridades'
        ? { label: 'Nueva prioridad', iconClass: 'mdi mdi-plus', onClick: openCreatePrioridad }
        : undefined

  const panelEditing = tab === 'categorias' ? !!editingCategoria : !!editingPrioridad
  const panelTitle =
    tab === 'categorias'
      ? editingCategoria
        ? 'Editar categoría'
        : 'Nueva categoría'
      : editingPrioridad
        ? 'Editar prioridad'
        : 'Nueva prioridad'

  return (
    <div className="cq-admin-page container-fluid py-4">
      <div className="mb-2">
        <Link to="/admin/tickets" className="btn btn-link btn-sm px-0">
          <i className="mdi mdi-arrow-left" /> Volver a tickets
        </Link>
      </div>

      <AdminListToolbar title="Catálogos de tickets" metrics={metrics} primaryAction={primaryAction} />

      <ul className="nav nav-tabs mb-3" role="tablist">
        <li className="nav-item" role="presentation">
          <button
            type="button"
            className={`nav-link ${tab === 'categorias' ? 'active' : ''}`}
            onClick={() => selectTab('categorias')}
          >
            Categorías
          </button>
        </li>
        <li className="nav-item" role="presentation">
          <button
            type="button"
            className={`nav-link ${tab === 'prioridades' ? 'active' : ''}`}
            onClick={() => selectTab('prioridades')}
          >
            Prioridades
          </button>
        </li>
        <li className="nav-item" role="presentation">
          <button
            type="button"
            className={`nav-link ${tab === 'estados' ? 'active' : ''}`}
            onClick={() => selectTab('estados')}
          >
            Estados
          </button>
        </li>
      </ul>

      {tab === 'estados' && (
        <div className="card">
          <div className="card-body">
            <TicketEstadosGuiaPanel />
            <TicketEstadosGuiaTable />
          </div>
        </div>
      )}

      {tab === 'categorias' && (
        <AdminSplitLayout
          panelOpen={panelOpen}
          tablePane={
            <div className="card">
              <div className="card-body pt-3">
                {loading && (
                  <div className="placeholder-glow">
                    <span className="placeholder col-12 mb-2" />
                  </div>
                )}
                {!loading && !error && categorias.length === 0 && (
                  <div className="cq-empty-state">
                    <p className="cq-empty-title">Sin categorías</p>
                    <button type="button" className="btn btn-primary btn-sm" onClick={openCreateCategoria}>
                      Crear categoría
                    </button>
                  </div>
                )}
                {!loading && categorias.length > 0 && (
                  <AdminFilterableTable
                    columns={CATEGORIAS_TABLE_COLUMNS}
                    columnFilters={catFilter.columnFilters}
                    onColumnFilterChange={catFilter.onColumnFilterChange}
                    globalSearch={catFilter.globalSearch}
                    onGlobalSearchChange={catFilter.setGlobalSearch}
                    filteredCount={catFilter.filteredCount}
                    totalCount={catFilter.totalCount}
                  >
                    {catFilter.filteredRows.map((c) => (
                      <tr key={c.id}>
                        <td>{c.nombre}</td>
                        <td className="text-center cq-actions">
                          <button
                            type="button"
                            className="btn btn-link btn-sm"
                            onClick={() => openEditCategoria(c)}
                            aria-label={`Editar ${c.nombre}`}
                          >
                            <i className="mdi mdi-pencil" />
                          </button>
                          <button
                            type="button"
                            className="btn btn-link btn-sm text-danger"
                            onClick={() => setDeleteCategoria(c)}
                            aria-label={`Eliminar ${c.nombre}`}
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
              title={panelTitle}
              iconClass="mdi mdi-tag"
              editing={panelEditing}
              onClose={closePanel}
              footer={
                <>
                  <button type="button" className="btn btn-primary flex-grow-1" onClick={() => void onSaveCategoria()}>
                    {editingCategoria ? 'Guardar' : 'Crear'}
                  </button>
                  <button type="button" className="btn btn-outline-secondary" onClick={closePanel}>
                    Cancelar
                  </button>
                </>
              }
            >
              {formError && (
                <div className="alert alert-danger py-2 small" role="alert">
                  {formError}
                </div>
              )}
              <div>
                <label className="cq-label" htmlFor="cat-nombre">
                  Nombre
                </label>
                <input id="cat-nombre" className="form-control" {...categoriaForm.register('nombre')} />
                {categoriaForm.formState.errors.nombre && (
                  <span className="text-danger small">{categoriaForm.formState.errors.nombre.message}</span>
                )}
              </div>
            </AdminSidePanel>
          }
        />
      )}

      {tab === 'prioridades' && (
        <AdminSplitLayout
          panelOpen={panelOpen}
          tablePane={
            <div className="card">
              <div className="card-body pt-3">
                {loading && (
                  <div className="placeholder-glow">
                    <span className="placeholder col-12 mb-2" />
                  </div>
                )}
                {!loading && !error && prioridades.length === 0 && (
                  <div className="cq-empty-state">
                    <p className="cq-empty-title">Sin prioridades</p>
                    <button type="button" className="btn btn-primary btn-sm" onClick={openCreatePrioridad}>
                      Crear prioridad
                    </button>
                  </div>
                )}
                {!loading && prioridades.length > 0 && (
                  <AdminFilterableTable
                    columns={PRIORIDADES_TABLE_COLUMNS}
                    columnFilters={priFilter.columnFilters}
                    onColumnFilterChange={priFilter.onColumnFilterChange}
                    globalSearch={priFilter.globalSearch}
                    onGlobalSearchChange={priFilter.setGlobalSearch}
                    filteredCount={priFilter.filteredCount}
                    totalCount={priFilter.totalCount}
                  >
                    {priFilter.filteredRows.map((p) => (
                      <tr key={p.id}>
                        <td>{p.nombre}</td>
                        <td>{p.orden ?? '—'}</td>
                        <td className="text-center cq-actions">
                          <button
                            type="button"
                            className="btn btn-link btn-sm"
                            onClick={() => openEditPrioridad(p)}
                            aria-label={`Editar ${p.nombre}`}
                          >
                            <i className="mdi mdi-pencil" />
                          </button>
                          <button
                            type="button"
                            className="btn btn-link btn-sm text-danger"
                            onClick={() => setDeletePrioridad(p)}
                            aria-label={`Eliminar ${p.nombre}`}
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
              title={panelTitle}
              iconClass="mdi mdi-flag"
              editing={panelEditing}
              onClose={closePanel}
              footer={
                <>
                  <button type="button" className="btn btn-primary flex-grow-1" onClick={() => void onSavePrioridad()}>
                    {editingPrioridad ? 'Guardar' : 'Crear'}
                  </button>
                  <button type="button" className="btn btn-outline-secondary" onClick={closePanel}>
                    Cancelar
                  </button>
                </>
              }
            >
              {formError && (
                <div className="alert alert-danger py-2 small" role="alert">
                  {formError}
                </div>
              )}
              <div className="d-flex flex-column gap-3">
                <div>
                  <label className="cq-label" htmlFor="pri-nombre">
                    Nombre
                  </label>
                  <input id="pri-nombre" className="form-control" {...prioridadForm.register('nombre')} />
                  {prioridadForm.formState.errors.nombre && (
                    <span className="text-danger small">{prioridadForm.formState.errors.nombre.message}</span>
                  )}
                </div>
                <div>
                  <label className="cq-label" htmlFor="pri-orden">
                    Orden (opcional)
                  </label>
                  <input
                    id="pri-orden"
                    type="number"
                    min={1}
                    max={99}
                    className="form-control"
                    {...prioridadForm.register('orden')}
                  />
                  {prioridadForm.formState.errors.orden && (
                    <span className="text-danger small">{prioridadForm.formState.errors.orden.message}</span>
                  )}
                </div>
              </div>
            </AdminSidePanel>
          }
        />
      )}

      <ConfirmDialog
        open={!!deleteCategoria}
        title="Eliminar categoría"
        message={deleteCategoria ? `¿Eliminar «${deleteCategoria.nombre}»?` : ''}
        confirmLabel="Eliminar"
        variant="danger"
        onCancel={() => setDeleteCategoria(null)}
        onConfirm={() => void confirmDeleteCategoria()}
      />
      {deleteCategoria && deleteError && (
        <div className="alert alert-danger mt-3" role="alert">
          {deleteError}
        </div>
      )}

      <ConfirmDialog
        open={!!deletePrioridad}
        title="Eliminar prioridad"
        message={deletePrioridad ? `¿Eliminar «${deletePrioridad.nombre}»?` : ''}
        confirmLabel="Eliminar"
        variant="danger"
        onCancel={() => setDeletePrioridad(null)}
        onConfirm={() => void confirmDeletePrioridad()}
      />
      {deletePrioridad && deleteError && (
        <div className="alert alert-danger mt-3" role="alert">
          {deleteError}
        </div>
      )}
    </div>
  )
}

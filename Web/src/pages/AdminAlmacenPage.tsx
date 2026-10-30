import { useEffect, useMemo, useState } from 'react'
import 'bootstrap/dist/css/bootstrap.min.css'
import '@mdi/font/css/materialdesignicons.min.css'
import '../styles/bootstrap-pantone.css'
import '../styles/cq-admin.css'
import { AdminCategoriasAlmacenSection } from '../features/admin/almacen/AdminCategoriasAlmacenSection'
import { ArticuloAdminMobileCard } from '../features/admin/almacen/ArticuloAdminMobileCard'
import { PrestamoAdminMobileCard } from '../features/admin/almacen/PrestamoAdminMobileCard'
import { useArticulos, useCategorias, usePrestamos } from '../features/almacen/useAlmacen'
import { usePadronUsuarios } from '../features/admin/usuarios/usePadronUsuarios'
import {
  AdminListToolbar,
  AdminMobileCardList,
  AdminSidePanel,
  AdminSplitLayout,
  ConfirmDialog,
} from '../shared/components/admin'
import { useQueryErrorToast } from '../shared/hooks/useQueryErrorToast'
import { useToast } from '../shared/toast/ToastContext'
import { apiDelete, apiPatch, apiPost, apiPut } from '../shared/lib/apiClient'
import type {
  ArticuloActualizarRequest,
  ArticuloCrearRequest,
  ArticuloListItem,
  PrestamoCrearRequest,
  PrestamoListItem,
} from '../shared/types/almacen'

type Tab = 'inventario' | 'prestamos' | 'categorias'

const emptyArticulo: ArticuloCrearRequest = {
  nombre: '',
  categoriaId: undefined,
  stock: 0,
  stockMinimo: 1,
  ubicacion: '',
}

const emptyPrestamo: PrestamoCrearRequest = {
  articuloId: 0,
  usuarioId: 0,
  cantidad: 1,
  notas: '',
}

export function AdminAlmacenPage() {
  const [tab, setTab] = useState<Tab>('inventario')

  const { articulos, loading: loadingArt, error: errArt, recargar: recargarArt } = useArticulos()
  const { categorias, loading: loadingCat, error: errCat, recargar: recargarCat } = useCategorias()
  const prestamosTabActiva = tab === 'prestamos'
  const { prestamos, loading: loadingPre, error: errPre, recargar: recargarPre } =
    usePrestamos(prestamosTabActiva)
  const { data: usuarios, error: errUsuarios } = usePadronUsuarios(undefined, true)

  const toast = useToast()
  useQueryErrorToast(errArt)
  useQueryErrorToast(errUsuarios)
  useQueryErrorToast(prestamosTabActiva ? errPre : null)
  useQueryErrorToast(tab === 'categorias' ? errCat : null)

  const [createArtOpen, setCreateArtOpen] = useState(false)
  const [editingArt, setEditingArt] = useState<ArticuloListItem | null>(null)
  const [artForm, setArtForm] = useState<ArticuloCrearRequest>(emptyArticulo)
  const [artSaving, setArtSaving] = useState(false)
  const [artFormError, setArtFormError] = useState<string | null>(null)
  const [deleteArtTarget, setDeleteArtTarget] = useState<ArticuloListItem | null>(null)
  const [deleteArtError, setDeleteArtError] = useState<string | null>(null)

  const [preCreateOpen, setPreCreateOpen] = useState(false)
  const [preForm, setPreForm] = useState<PrestamoCrearRequest>(emptyPrestamo)
  const [preSaving, setPreSaving] = useState(false)
  const [preFormError, setPreFormError] = useState<string | null>(null)
  const [devolverTarget, setDevolverTarget] = useState<PrestamoListItem | null>(null)
  const [devolverError, setDevolverError] = useState<string | null>(null)
  const [devolviendo, setDevolviendo] = useState(false)

  const inventarioPanelOpen = createArtOpen || editingArt !== null
  const isEditArt = editingArt !== null
  const prestamoPanelOpen = preCreateOpen

  const inventarioStats = useMemo(
    () => [
      { label: 'Artículos', value: articulos.length },
      { label: 'Bajo mínimo', value: articulos.filter((a) => a.bajoMinimo).length },
      { label: 'Categorías', value: categorias.length },
    ],
    [articulos, categorias.length],
  )

  const prestamosStats = useMemo(
    () => [
      { label: 'Préstamos', value: prestamos.length },
      { label: 'Prestados', value: prestamos.filter((p) => p.estado === 'PRESTADO').length },
      { label: 'Devueltos', value: prestamos.filter((p) => p.estado === 'DEVUELTO').length },
    ],
    [prestamos],
  )

  const articulosConStock = useMemo(
    () => articulos.filter((a) => a.stock > 0),
    [articulos],
  )

  const closeInventarioPanel = () => {
    setCreateArtOpen(false)
    setEditingArt(null)
    setArtFormError(null)
  }

  const closePrestamoPanel = () => {
    setPreCreateOpen(false)
    setPreFormError(null)
  }

  const switchTab = (next: Tab) => {
    closeInventarioPanel()
    closePrestamoPanel()
    setTab(next)
  }

  const openCreateArticulo = () => {
    setArtFormError(null)
    setArtForm(emptyArticulo)
    setCreateArtOpen(true)
    setEditingArt(null)
  }

  const openEditArticulo = (a: ArticuloListItem) => {
    setArtFormError(null)
    setCreateArtOpen(false)
    setEditingArt(a)
    setArtForm({
      nombre: a.nombre,
      categoriaId: a.categoriaId,
      stock: a.stock,
      stockMinimo: a.stockMinimo,
      ubicacion: a.ubicacion ?? '',
    })
  }

  const guardarArticulo = async () => {
    if (!artForm.nombre.trim()) {
      setArtFormError('El nombre es obligatorio.')
      return
    }
    setArtSaving(true)
    setArtFormError(null)
    try {
      if (!isEditArt || !editingArt) {
        const { problem, status } = await apiPost('/WMS/Articulos', artForm)
        if (problem) {
          setArtFormError(problem.detail ?? `Error ${status}`)
          return
        }
      } else {
        const upd: ArticuloActualizarRequest = {
          nombre: artForm.nombre,
          categoriaId: artForm.categoriaId,
          stock: artForm.stock,
          stockMinimo: artForm.stockMinimo,
          ubicacion: artForm.ubicacion,
        }
        const { problem, status } = await apiPut(`/WMS/Articulos/${editingArt.articuloId}`, upd)
        if (problem) {
          setArtFormError(problem.detail ?? `Error ${status}`)
          return
        }
      }
      closeInventarioPanel()
      toast.success(isEditArt ? 'Artículo actualizado' : 'Artículo creado')
      await recargarArt()
    } finally {
      setArtSaving(false)
    }
  }

  const handleConfirmDeleteArticulo = async () => {
    if (!deleteArtTarget) return
    setDeleteArtError(null)
    const { problem, status } = await apiDelete(`/WMS/Articulos/${deleteArtTarget.articuloId}`)
    if (problem) {
      setDeleteArtError(problem.detail ?? `No se pudo eliminar (${status})`)
      return
    }
    if (editingArt?.articuloId === deleteArtTarget.articuloId) closeInventarioPanel()
    setDeleteArtTarget(null)
    toast.success('Artículo eliminado')
    await recargarArt()
  }

  const openPrestar = () => {
    setPreFormError(null)
    setPreForm(emptyPrestamo)
    setPreCreateOpen(true)
  }

  const guardarPrestamo = async () => {
    if (!preForm.articuloId || !preForm.usuarioId || preForm.cantidad < 1) {
      setPreFormError('Completa artículo, usuario y cantidad.')
      return
    }
    setPreSaving(true)
    setPreFormError(null)
    try {
      const { problem, status } = await apiPost('/WMS/Prestamos', preForm)
      if (problem) {
        setPreFormError(problem.detail ?? `Error ${status}`)
        return
      }
      closePrestamoPanel()
      toast.success('Préstamo registrado')
      await Promise.all([recargarArt(), recargarPre()])
    } finally {
      setPreSaving(false)
    }
  }

  const handleConfirmDevolver = async () => {
    if (!devolverTarget) return
    setDevolverError(null)
    setDevolviendo(true)
    try {
      const { problem, status } = await apiPatch(`/WMS/Prestamos/${devolverTarget.prestamoId}/devolver`, {})
      if (problem) {
        setDevolverError(problem.detail ?? `Error ${status}`)
        return
      }
      setDevolverTarget(null)
      toast.success('Préstamo devuelto')
      await Promise.all([recargarArt(), recargarPre()])
    } finally {
      setDevolviendo(false)
    }
  }

  useEffect(() => {
    if (!deleteArtTarget) setDeleteArtError(null)
  }, [deleteArtTarget])

  useEffect(() => {
    if (!devolverTarget) setDevolverError(null)
  }, [devolverTarget])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return
      if (inventarioPanelOpen && tab === 'inventario') closeInventarioPanel()
      if (prestamoPanelOpen && tab === 'prestamos') closePrestamoPanel()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [inventarioPanelOpen, prestamoPanelOpen, tab])

  const artFormFooter = (
    <>
      <button
        type="button"
        className="btn btn-primary flex-grow-1"
        disabled={artSaving}
        onClick={() => void guardarArticulo()}
      >
        <i className={`mdi ${isEditArt ? 'mdi-content-save' : 'mdi-package-variant-plus'} mr-1`} />
        {artSaving ? 'Guardando…' : isEditArt ? 'Actualizar' : 'Guardar'}
      </button>
      <button type="button" className="btn btn-outline-secondary" onClick={closeInventarioPanel}>
        Cancelar
      </button>
    </>
  )

  const preFormFooter = (
    <>
      <button
        type="button"
        className="btn btn-primary flex-grow-1"
        disabled={preSaving}
        onClick={() => void guardarPrestamo()}
      >
        <i className="mdi mdi-hand-extended mr-1" />
        {preSaving ? 'Registrando…' : 'Registrar'}
      </button>
      <button type="button" className="btn btn-outline-secondary" onClick={closePrestamoPanel}>
        Cancelar
      </button>
    </>
  )

  return (
    <div className="cq-admin-page container-fluid py-4">
      <ul className="nav nav-tabs mb-3" role="tablist">
        <li className="nav-item" role="presentation">
          <button
            type="button"
            role="tab"
            className={`nav-link cursor-pointer ${tab === 'inventario' ? 'active' : ''}`}
            aria-selected={tab === 'inventario'}
            aria-controls="almacen-tab-inventario"
            id="almacen-tab-inventario-btn"
            onClick={() => switchTab('inventario')}
          >
            Inventario
          </button>
        </li>
        <li className="nav-item" role="presentation">
          <button
            type="button"
            role="tab"
            className={`nav-link cursor-pointer ${tab === 'prestamos' ? 'active' : ''}`}
            aria-selected={tab === 'prestamos'}
            aria-controls="almacen-tab-prestamos"
            id="almacen-tab-prestamos-btn"
            onClick={() => switchTab('prestamos')}
          >
            Préstamos
          </button>
        </li>
        <li className="nav-item" role="presentation">
          <button
            type="button"
            role="tab"
            className={`nav-link cursor-pointer ${tab === 'categorias' ? 'active' : ''}`}
            aria-selected={tab === 'categorias'}
            aria-controls="almacen-tab-categorias"
            id="almacen-tab-categorias-btn"
            onClick={() => switchTab('categorias')}
          >
            Categorías
          </button>
        </li>
      </ul>

      {tab === 'inventario' && (
        <div id="almacen-tab-inventario" role="tabpanel" tabIndex={0} aria-labelledby="almacen-tab-inventario-btn">
          <AdminListToolbar
            title="Inventario"
            metrics={inventarioStats}
            primaryAction={{
              label: 'Nuevo artículo',
              iconClass: 'mdi mdi-package-variant-plus',
              onClick: openCreateArticulo,
            }}
          />

          <AdminSplitLayout
            panelOpen={inventarioPanelOpen}
            tablePane={
              <div className="card">
                <div className="card-body pt-3">
                  {loadingArt && (
                    <div className="placeholder-glow" aria-label="Cargando inventario">
                      <span className="placeholder col-12 mb-2" />
                      <span className="placeholder col-10" />
                    </div>
                  )}

                  {!loadingArt && !errArt && articulos.length === 0 && (
                    <div className="cq-empty-state">
                      <i className="mdi mdi-warehouse cq-empty-icon" />
                      <p className="cq-empty-title">Sin artículos</p>
                      <p className="text-muted">Registra el primer artículo del almacén.</p>
                    </div>
                  )}

                  {!loadingArt && !errArt && articulos.length > 0 && (
                    <>
                    <div className="table-responsive cq-admin-table-pane">
                      <table className="table table-hover mb-0">
                        <thead>
                          <tr>
                            <th>Artículo</th>
                            <th>Categoría</th>
                            <th className="text-end tabular-nums">Stock</th>
                            <th className="text-end tabular-nums">Mín.</th>
                            <th>Ubicación</th>
                            <th>Estado</th>
                            <th className="text-center cq-actions">Acciones</th>
                          </tr>
                        </thead>
                        <tbody>
                          {articulos.map((a) => (
                            <tr
                              key={a.articuloId}
                              className={editingArt?.articuloId === a.articuloId ? 'cq-row-active' : undefined}
                            >
                              <td className="min-w-0">
                                <strong className="text-break">{a.nombre}</strong>
                              </td>
                              <td>{a.categoria ?? '—'}</td>
                              <td className="text-end tabular-nums">{a.stock}</td>
                              <td className="text-end tabular-nums">{a.stockMinimo}</td>
                              <td className="min-w-0 text-break">{a.ubicacion ?? '—'}</td>
                              <td>
                                {a.bajoMinimo ? (
                                  <span className="badge bg-danger">Bajo mínimo</span>
                                ) : (
                                  <span className="badge bg-success">OK</span>
                                )}
                              </td>
                              <td className="text-center cq-actions">
                                <button
                                  type="button"
                                  className="btn btn-link btn-sm"
                                  onClick={() => openEditArticulo(a)}
                                  aria-label={`Editar ${a.nombre}`}
                                >
                                  <i className="mdi mdi-pencil" />
                                </button>
                                <button
                                  type="button"
                                  className="btn btn-link btn-sm text-danger"
                                  onClick={() => setDeleteArtTarget(a)}
                                  aria-label={`Eliminar ${a.nombre}`}
                                >
                                  <i className="mdi mdi-delete" />
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    <AdminMobileCardList
                      rows={articulos}
                      getRowKey={(a) => a.articuloId}
                      renderCard={(a) => (
                        <ArticuloAdminMobileCard
                          articulo={a}
                          active={editingArt?.articuloId === a.articuloId}
                          onEdit={openEditArticulo}
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
                visible={inventarioPanelOpen}
                title={isEditArt ? 'Editar artículo' : 'Nuevo artículo'}
                subtitle={
                  isEditArt
                    ? 'Actualiza stock, categoría y ubicación.'
                    : 'Define nombre, stock mínimo y ubicación opcional.'
                }
                iconClass={isEditArt ? 'mdi mdi-pencil' : 'mdi mdi-package-variant-plus'}
                editing={isEditArt}
                onClose={closeInventarioPanel}
                footer={artFormFooter}
              >
                {artFormError && (
                  <div className="alert alert-danger py-2 small" role="alert">
                    {artFormError}
                  </div>
                )}
                <div className="form-group mb-3">
                  <label className="cq-label" htmlFor="art-nombre">
                    <i className="mdi mdi-tag-text" />
                    Nombre <span className="text-danger">*</span>
                  </label>
                  <input
                    id="art-nombre"
                    className="form-control"
                    value={artForm.nombre}
                    onChange={(e) => setArtForm((f) => ({ ...f, nombre: e.target.value }))}
                  />
                </div>
                <div className="form-group mb-3">
                  <label className="cq-label" htmlFor="art-categoria">
                    <i className="mdi mdi-shape" />
                    Categoría
                  </label>
                  <select
                    id="art-categoria"
                    className="form-control"
                    value={artForm.categoriaId ?? ''}
                    onChange={(e) =>
                      setArtForm((f) => ({
                        ...f,
                        categoriaId: e.target.value ? Number(e.target.value) : undefined,
                      }))
                    }
                  >
                    <option value="">Sin categoría</option>
                    {categorias.map((c) => (
                      <option key={c.categoriaId} value={c.categoriaId}>
                        {c.nombre}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="row">
                  <div className="col-6 form-group mb-3">
                    <label className="cq-label" htmlFor="art-stock">
                      <i className="mdi mdi-counter" />
                      Stock
                    </label>
                    <input
                      id="art-stock"
                      type="number"
                      min={0}
                      className="form-control tabular-nums"
                      value={artForm.stock}
                      onChange={(e) => setArtForm((f) => ({ ...f, stock: Number(e.target.value) }))}
                    />
                  </div>
                  <div className="col-6 form-group mb-3">
                    <label className="cq-label" htmlFor="art-stock-min">
                      <i className="mdi mdi-alert-decagram" />
                      Stock mínimo
                    </label>
                    <input
                      id="art-stock-min"
                      type="number"
                      min={0}
                      className="form-control tabular-nums"
                      value={artForm.stockMinimo}
                      onChange={(e) =>
                        setArtForm((f) => ({ ...f, stockMinimo: Number(e.target.value) }))
                      }
                    />
                  </div>
                </div>
                <div className="form-group mb-0">
                  <label className="cq-label" htmlFor="art-ubicacion">
                    <i className="mdi mdi-map-marker" />
                    Ubicación
                  </label>
                  <input
                    id="art-ubicacion"
                    className="form-control"
                    value={artForm.ubicacion ?? ''}
                    onChange={(e) => setArtForm((f) => ({ ...f, ubicacion: e.target.value }))}
                  />
                </div>
              </AdminSidePanel>
            }
          />

          <ConfirmDialog
            open={deleteArtTarget !== null}
            title="Eliminar artículo"
            message={
              deleteArtTarget
                ? `¿Eliminar "${deleteArtTarget.nombre}" del inventario? Esta acción no se puede deshacer.`
                : ''
            }
            confirmLabel="Eliminar"
            variant="danger"
            onCancel={() => setDeleteArtTarget(null)}
            onConfirm={() => void handleConfirmDeleteArticulo()}
          />
          {deleteArtTarget && deleteArtError && (
            <div className="alert alert-danger mt-3" role="alert">
              {deleteArtError}
            </div>
          )}
        </div>
      )}

      {tab === 'categorias' && (
        <div id="almacen-tab-categorias" role="tabpanel" tabIndex={0} aria-labelledby="almacen-tab-categorias-btn">
          <AdminListToolbar
            title="Categorías"
            metrics={[{ label: 'Categorías', value: categorias.length }]}
            primaryAction={{
              label: 'Actualizar',
              iconClass: 'mdi mdi-refresh',
              onClick: () => void recargarCat(),
            }}
          />
          <AdminCategoriasAlmacenSection
            categorias={categorias}
            loading={loadingCat}
            onReload={recargarCat}
          />
        </div>
      )}

      {tab === 'prestamos' && (
        <div id="almacen-tab-prestamos" role="tabpanel" tabIndex={0} aria-labelledby="almacen-tab-prestamos-btn">
          <AdminListToolbar
            title="Préstamos"
            metrics={prestamosStats}
            primaryAction={{
              label: 'Registrar préstamo',
              iconClass: 'mdi mdi-hand-extended',
              onClick: openPrestar,
              disabled: articulosConStock.length === 0,
            }}
          />

          {articulosConStock.length === 0 && !loadingArt && (
            <div className="alert alert-warning py-2 small" role="status">
              No hay artículos con stock disponible para prestar.
            </div>
          )}

          <AdminSplitLayout
            panelOpen={prestamoPanelOpen}
            tablePane={
              <div className="card">
                <div className="card-body pt-3">
                  {loadingPre && (
                    <div className="placeholder-glow" aria-label="Cargando préstamos">
                      <span className="placeholder col-12 mb-2" />
                      <span className="placeholder col-10" />
                    </div>
                  )}

                  {!loadingPre && !errPre && prestamos.length === 0 && (
                    <div className="cq-empty-state">
                      <i className="mdi mdi-hand-extended-outline cq-empty-icon" />
                      <p className="cq-empty-title">Sin préstamos</p>
                      <p className="text-muted">Registra el primer préstamo de material.</p>
                    </div>
                  )}

                  {!loadingPre && !errPre && prestamos.length > 0 && (
                    <>
                    <div className="table-responsive cq-admin-table-pane">
                      <table className="table table-hover mb-0">
                        <thead>
                          <tr>
                            <th>Artículo</th>
                            <th>Usuario</th>
                            <th className="text-end tabular-nums">Cantidad</th>
                            <th>Fecha préstamo</th>
                            <th>Estado</th>
                            <th className="text-center cq-actions">Acciones</th>
                          </tr>
                        </thead>
                        <tbody>
                          {prestamos.map((p) => (
                            <tr key={p.prestamoId}>
                              <td className="min-w-0">
                                <strong className="text-break">{p.nombreArticulo}</strong>
                              </td>
                              <td className="min-w-0">
                                <div className="text-break">{p.nombreUsuario ?? '—'}</div>
                                {p.correoUsuario && (
                                  <div className="small text-muted text-break">{p.correoUsuario}</div>
                                )}
                              </td>
                              <td className="text-end tabular-nums">{p.cantidad}</td>
                              <td className="tabular-nums">
                                {new Date(p.fechaPrestamo).toLocaleDateString('es-MX')}
                              </td>
                              <td>
                                <span
                                  className={`badge ${
                                    p.estado === 'PRESTADO' ? 'bg-warning text-dark' : 'bg-success'
                                  }`}
                                >
                                  {p.estado}
                                </span>
                              </td>
                              <td className="text-center cq-actions">
                                {p.estado === 'PRESTADO' && (
                                  <button
                                    type="button"
                                    className="btn btn-link btn-sm"
                                    disabled={devolviendo}
                                    onClick={() => setDevolverTarget(p)}
                                    aria-label={`Devolver préstamo de ${p.nombreArticulo}`}
                                  >
                                    <i className="mdi mdi-keyboard-return" />
                                  </button>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    <AdminMobileCardList
                      rows={prestamos}
                      getRowKey={(p) => p.prestamoId}
                      renderCard={(p) => (
                        <PrestamoAdminMobileCard
                          prestamo={p}
                          devolviendo={devolviendo}
                          onDevolver={setDevolverTarget}
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
                visible={prestamoPanelOpen}
                title="Registrar préstamo"
                subtitle="Asigna material a un residente activo del padrón."
                iconClass="mdi mdi-hand-extended"
                editing={false}
                onClose={closePrestamoPanel}
                footer={preFormFooter}
              >
                {preFormError && (
                  <div className="alert alert-danger py-2 small" role="alert">
                    {preFormError}
                  </div>
                )}
                <div className="form-group mb-3">
                  <label className="cq-label" htmlFor="pre-articulo">
                    <i className="mdi mdi-package-variant" />
                    Artículo <span className="text-danger">*</span>
                  </label>
                  <select
                    id="pre-articulo"
                    className="form-control"
                    value={preForm.articuloId || ''}
                    onChange={(e) =>
                      setPreForm((f) => ({ ...f, articuloId: Number(e.target.value) }))
                    }
                  >
                    <option value="">Seleccionar artículo…</option>
                    {articulosConStock.map((a) => (
                      <option key={a.articuloId} value={a.articuloId}>
                        {a.nombre} (stock: {a.stock})
                      </option>
                    ))}
                  </select>
                </div>
                <div className="form-group mb-3">
                  <label className="cq-label" htmlFor="pre-usuario">
                    <i className="mdi mdi-account" />
                    Usuario <span className="text-danger">*</span>
                  </label>
                  <select
                    id="pre-usuario"
                    className="form-control"
                    value={preForm.usuarioId || ''}
                    onChange={(e) =>
                      setPreForm((f) => ({ ...f, usuarioId: Number(e.target.value) }))
                    }
                  >
                    <option value="">Seleccionar usuario…</option>
                    {usuarios.map((u) => (
                      <option key={u.usuarioId} value={u.usuarioId}>
                        {u.nombre} · {u.correo}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="form-group mb-3">
                  <label className="cq-label" htmlFor="pre-cantidad">
                    <i className="mdi mdi-counter" />
                    Cantidad <span className="text-danger">*</span>
                  </label>
                  <input
                    id="pre-cantidad"
                    type="number"
                    min={1}
                    className="form-control tabular-nums"
                    value={preForm.cantidad}
                    onChange={(e) =>
                      setPreForm((f) => ({ ...f, cantidad: Number(e.target.value) }))
                    }
                  />
                </div>
                <div className="form-group mb-0">
                  <label className="cq-label" htmlFor="pre-notas">
                    <i className="mdi mdi-note-text" />
                    Notas
                  </label>
                  <input
                    id="pre-notas"
                    className="form-control"
                    value={preForm.notas ?? ''}
                    onChange={(e) => setPreForm((f) => ({ ...f, notas: e.target.value }))}
                  />
                </div>
              </AdminSidePanel>
            }
          />

          <ConfirmDialog
            open={devolverTarget !== null}
            title="Registrar devolución"
            message={
              devolverTarget
                ? `¿Registrar la devolución de ${devolverTarget.cantidad} × "${devolverTarget.nombreArticulo}" prestado a ${devolverTarget.nombreUsuario ?? 'usuario'}?`
                : ''
            }
            confirmLabel="Devolver"
            variant="default"
            onCancel={() => setDevolverTarget(null)}
            onConfirm={() => void handleConfirmDevolver()}
          />
          {devolverTarget && devolverError && (
            <div className="alert alert-danger mt-3" role="alert">
              {devolverError}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

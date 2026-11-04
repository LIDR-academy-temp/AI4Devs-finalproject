import { useCallback, useEffect, useMemo, useState } from 'react'
import 'bootstrap/dist/css/bootstrap.min.css'
import '../styles/bootstrap-pantone.css'
import '../styles/cq-admin.css'
import { MenuPerfilPermisosPanel } from '../features/navegacion/MenuPerfilPermisosPanel'
import { MenuAdminMobileCard } from '../features/navegacion/MenuAdminMobileCard'
import { MenuTreeEditor } from '../features/navegacion/MenuTreeEditor'
import {
  filterMenusForTree,
  menuParentSelectOptions,
  suggestMenuOrder,
} from '../features/navegacion/menuAdminFormUtils'
import { MENU_ICON_OPTIONS, iconFromMenuKey } from '../features/navegacion/menuIcons'
import {
  createMenuAdmin,
  deleteMenuAdmin,
  fetchPermisosPerfilesMenu,
  savePermisosPerfilesMenu,
  updateMenuAdmin,
} from '../features/navegacion/navegacion.api'
import { useNavegacion } from '../features/navegacion/NavegacionContext'
import { useMenusAdmin } from '../features/navegacion/useMenusAdmin'
import type { MenuAdminItem, MenuPerfilPermiso } from '../features/navegacion/types'
import {
  AdminListToolbar,
  AdminMobileCardList,
  AdminSidePanel,
  AdminSplitLayout,
  ConfirmDialog,
  useAdminPanelEscape,
} from '../shared/components/admin'
import { useQueryErrorToast } from '../shared/hooks/useQueryErrorToast'
import { useToast } from '../shared/toast/ToastContext'

function permisosPerfilesPayload(permisos: MenuPerfilPermiso[]) {
  return permisos.filter((p) => p.asignado).map((p) => ({ perfilId: p.perfilId, visible: p.visible }))
}

export function AdminMenusPage() {
  const { menus, loading, error, refetch } = useMenusAdmin()
  const { refetch: refetchNav } = useNavegacion()
  const toast = useToast()
  useQueryErrorToast(error)

  const activeCount = useMemo(() => menus.filter((m) => !m.eliminado).length, [menus])

  const menusFlat = useMemo(
    () =>
      menus
        .filter((m) => !m.eliminado)
        .slice()
        .sort((a, b) => a.orden - b.orden || a.titulo.localeCompare(b.titulo)),
    [menus],
  )

  const [searchQuery, setSearchQuery] = useState('')
  const treeMenus = useMemo(
    () => filterMenusForTree(menus, searchQuery),
    [menus, searchQuery],
  )

  const [panelOpen, setPanelOpen] = useState(false)
  const [editing, setEditing] = useState<MenuAdminItem | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<MenuAdminItem | null>(null)
  const [formError, setFormError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const [titulo, setTitulo] = useState('')
  const [ruta, setRuta] = useState('')
  const [icono, setIcono] = useState('home')
  const [orden, setOrden] = useState(0)
  const [padreMenuId, setPadreMenuId] = useState('')
  const [permisosPerfiles, setPermisosPerfiles] = useState<MenuPerfilPermiso[]>([])
  const [permisosLoading, setPermisosLoading] = useState(false)

  const parentOptions = useMemo(
    () => menuParentSelectOptions(menus, editing?.menuId),
    [menus, editing?.menuId],
  )

  const IconPreview = iconFromMenuKey(icono)

  const closePanel = useCallback(() => {
    setPanelOpen(false)
    setEditing(null)
    setFormError(null)
    setPermisosPerfiles([])
  }, [])

  useAdminPanelEscape(panelOpen, closePanel)

  const applyFormFromMenu = (menu: MenuAdminItem | null, parentId: number | null) => {
    if (menu) {
      setTitulo(menu.titulo)
      setRuta(menu.ruta ?? '')
      setIcono(menu.icono?.trim() || 'home')
      setOrden(menu.orden)
      setPadreMenuId(menu.padreMenuId != null ? String(menu.padreMenuId) : '')
      return
    }
    setTitulo('')
    setRuta('')
    setIcono('home')
    setPadreMenuId(parentId != null ? String(parentId) : '')
    setOrden(suggestMenuOrder(menus, parentId))
  }

  const openCreate = (parentId: number | null = null) => {
    setEditing(null)
    setFormError(null)
    setPermisosPerfiles([])
    applyFormFromMenu(null, parentId)
    setPanelOpen(true)
  }

  const openEdit = (menu: MenuAdminItem) => {
    setFormError(null)
    setEditing(menu)
    applyFormFromMenu(menu, null)
    setPanelOpen(true)
  }

  useEffect(() => {
    if (!panelOpen || editing) return
    const parentId = padreMenuId ? Number(padreMenuId) : null
    setOrden(suggestMenuOrder(menus, parentId))
  }, [padreMenuId, panelOpen, editing, menus])

  useEffect(() => {
    if (!panelOpen || !editing?.menuId) {
      return
    }
    let cancelled = false
    setPermisosLoading(true)
    void fetchPermisosPerfilesMenu(editing.menuId).then((res) => {
      if (cancelled) return
      if (res.data) {
        setPermisosPerfiles(res.data)
      } else {
        setPermisosPerfiles([])
        if (res.status >= 400) {
          setFormError(res.problem?.detail ?? `Error ${res.status}`)
        }
      }
      setPermisosLoading(false)
    })
    return () => {
      cancelled = true
    }
  }, [panelOpen, editing?.menuId])

  const handleCreate = async () => {
    setSaving(true)
    setFormError(null)
    const res = await createMenuAdmin({
      titulo: titulo.trim(),
      ruta: ruta.trim() || null,
      icono: icono.trim() || null,
      orden,
      padreMenuId: padreMenuId ? Number(padreMenuId) : null,
    })
    setSaving(false)
    if (!res.data) {
      setFormError(res.problem?.detail ?? `Error ${res.status}`)
      return
    }
    await refetch()
    openEdit(res.data)
    toast.success('Menú creado')
  }

  const handleSave = async () => {
    if (!editing) return
    setSaving(true)
    setFormError(null)
    const res = await updateMenuAdmin(editing.menuId, {
      titulo: titulo.trim(),
      ruta: ruta.trim() || null,
      icono: icono.trim() || null,
      orden,
      padreMenuId: padreMenuId ? Number(padreMenuId) : null,
    })
    if (!res.data) {
      setSaving(false)
      setFormError(res.problem?.detail ?? `Error ${res.status}`)
      return
    }

    const permRes = await savePermisosPerfilesMenu(
      editing.menuId,
      permisosPerfilesPayload(permisosPerfiles),
    )
    setSaving(false)
    if (!permRes.data) {
      setFormError(permRes.problem?.detail ?? `Error permisos ${permRes.status}`)
      setEditing(res.data)
      await refetch()
      return
    }

    await refetch()
    setEditing(res.data)
    setPermisosPerfiles(permRes.data)
    await refetchNav()
    toast.success('Menú y permisos guardados')
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    setSaving(true)
    const res = await deleteMenuAdmin(deleteTarget.menuId)
    setSaving(false)
    if (res.status >= 400) {
      setFormError(res.problem?.detail ?? `Error ${res.status}`)
      setDeleteTarget(null)
      return
    }
    setDeleteTarget(null)
    if (editing?.menuId === deleteTarget.menuId) closePanel()
    await refetch()
    toast.success('Menú eliminado')
  }

  const assignedProfiles = permisosPerfiles.filter((p) => p.asignado).length
  const panelTitle = editing ? 'Editar menú' : 'Nuevo menú'
  const panelSubtitle = editing
    ? `ID ${editing.menuId}${editing.ruta ? ` · ${editing.ruta}` : ''}${assignedProfiles > 0 ? ` · ${assignedProfiles} perfil(es)` : ''}`
    : padreMenuId
      ? `Submenú de «${menus.find((m) => m.menuId === Number(padreMenuId))?.titulo ?? padreMenuId}»`
      : 'Menú principal (raíz)'

  const formFooter = (
    <>
      {editing ? (
        <>
          <button
            type="button"
            className="btn btn-primary flex-grow-1"
            disabled={saving || !titulo.trim()}
            onClick={() => void handleSave()}
          >
            <i className="mdi mdi-content-save mr-1" />
            Guardar
          </button>
          <button
            type="button"
            className="btn btn-outline-danger"
            disabled={saving}
            onClick={() => setDeleteTarget(editing)}
          >
            Eliminar
          </button>
        </>
      ) : (
        <button
          type="button"
          className="btn btn-primary flex-grow-1"
          disabled={saving || !titulo.trim()}
          onClick={() => void handleCreate()}
        >
          <i className="mdi mdi-plus mr-1" />
          Crear
        </button>
      )}
      <button type="button" className="btn btn-outline-secondary" onClick={closePanel}>
        Cancelar
      </button>
    </>
  )

  const searchField = (
    <div className="cq-list-filter">
      <label className="visually-hidden" htmlFor="menu-search">
        Buscar menú
      </label>
      <input
        id="menu-search"
        type="search"
        className="form-control form-control-sm"
        placeholder="Buscar título o ruta…"
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
      />
    </div>
  )

  return (
    <div className="cq-admin-page container-fluid py-4">
      <AdminListToolbar
        title="Menús"
        metrics={[{ label: 'Registros', value: activeCount }]}
        filterSlot={searchField}
        primaryAction={{
          label: 'Nuevo menú',
          iconClass: 'mdi mdi-plus',
          onClick: () => openCreate(null),
        }}
      />

      {formError && panelOpen && (
        <div className="alert alert-warning mb-3" role="alert">
          {formError}
        </div>
      )}

      <AdminSplitLayout
        panelOpen={panelOpen}
        tablePane={
          <div className="card cq-admin-card">
            <div className="card-body min-w-0">
              {loading ? (
                <p className="text-muted mb-0">Cargando…</p>
              ) : activeCount === 0 ? (
                <p className="text-muted mb-0">Sin menús. Pulsa «Nuevo menú» para empezar.</p>
              ) : (
                <>
                  <div className="d-none d-lg-block">
                    <MenuTreeEditor
                      menus={treeMenus}
                      selectedId={editing?.menuId ?? null}
                      searchQuery={searchQuery}
                      onSelect={openEdit}
                      onAddChild={(parent) => openCreate(parent.menuId)}
                    />
                  </div>
                  <div className="d-lg-none">
                    <AdminMobileCardList
                      className="cq-admin-mobile-list"
                      rows={menusFlat}
                      getRowKey={(m) => m.menuId}
                      emptyMessage="Sin menús registrados."
                      renderCard={(m) => (
                        <MenuAdminMobileCard
                          menu={m}
                          active={editing?.menuId === m.menuId}
                          onSelect={openEdit}
                        />
                      )}
                    />
                  </div>
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
            iconClass={editing ? 'mdi mdi-pencil' : 'mdi mdi-menu'}
            editing={Boolean(editing)}
            onClose={closePanel}
            footer={formFooter}
          >
            <div className="row g-3">
              <div className="col-12">
                <label className="form-label" htmlFor="menu-titulo">
                  Título
                </label>
                <input
                  id="menu-titulo"
                  className="form-control"
                  value={titulo}
                  onChange={(e) => setTitulo(e.target.value)}
                  autoFocus
                />
              </div>
              <div className="col-12">
                <label className="form-label" htmlFor="menu-ruta">
                  Ruta SPA
                </label>
                <input
                  id="menu-ruta"
                  className="form-control font-monospace"
                  placeholder="/admin/casas"
                  value={ruta}
                  onChange={(e) => setRuta(e.target.value)}
                />
                <div className="form-text">Vacío si es solo contenedor de submenús.</div>
              </div>
              <div className="col-md-6">
                <label className="form-label" htmlFor="menu-icono">
                  Icono
                </label>
                <div className="input-group">
                  <span className="input-group-text" aria-hidden>
                    <IconPreview className="h-4 w-4" />
                  </span>
                  <select
                    id="menu-icono"
                    className="form-select"
                    value={MENU_ICON_OPTIONS.includes(icono) ? icono : 'home'}
                    onChange={(e) => setIcono(e.target.value)}
                  >
                    {MENU_ICON_OPTIONS.map((key) => (
                      <option key={key} value={key}>
                        {key}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="col-md-6">
                <label className="form-label" htmlFor="menu-orden">
                  Orden
                </label>
                <input
                  id="menu-orden"
                  type="number"
                  className="form-control tabular-nums"
                  value={orden}
                  onChange={(e) => setOrden(Number(e.target.value))}
                />
              </div>
              <div className="col-12">
                <label className="form-label" htmlFor="menu-padre">
                  Menú padre
                </label>
                <select
                  id="menu-padre"
                  className="form-select"
                  value={padreMenuId}
                  onChange={(e) => setPadreMenuId(e.target.value)}
                >
                  {parentOptions.map((opt) => (
                    <option key={opt.value || 'root'} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {editing ? (
              <>
                <hr className="my-4" />
                <MenuPerfilPermisosPanel
                  permisos={permisosPerfiles}
                  onChange={setPermisosPerfiles}
                  disabled={saving}
                  loading={permisosLoading}
                />
              </>
            ) : (
              <p className="form-text mt-3 mb-0">
                Tras crear el menú podrás elegir qué perfiles lo ven en la misma pantalla.
              </p>
            )}
          </AdminSidePanel>
        }
      />

      <ConfirmDialog
        open={deleteTarget != null}
        title="Eliminar menú"
        message={`¿Eliminar «${deleteTarget?.titulo}»? Los submenús pueden quedar huérfanos según reglas del API.`}
        confirmLabel="Eliminar"
        variant="danger"
        onConfirm={() => void handleDelete()}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  )
}

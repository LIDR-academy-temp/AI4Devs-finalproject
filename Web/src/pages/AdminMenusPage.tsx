import { useEffect, useMemo, useState } from 'react'
import 'bootstrap/dist/css/bootstrap.min.css'
import '../styles/bootstrap-pantone.css'
import '../styles/cq-admin.css'
import { MenuAdminMobileCard } from '../features/navegacion/MenuAdminMobileCard'
import { MenuTreeEditor } from '../features/navegacion/MenuTreeEditor'
import {
  createMenuAdmin,
  deleteMenuAdmin,
  updateMenuAdmin,
} from '../features/navegacion/navegacion.api'
import { useMenusAdmin } from '../features/navegacion/useMenusAdmin'
import type { MenuAdminItem } from '../features/navegacion/types'
import { AdminListToolbar, AdminMobileCardList, ConfirmDialog } from '../shared/components/admin'
import { useQueryErrorToast } from '../shared/hooks/useQueryErrorToast'
import { useToast } from '../shared/toast/ToastContext'

export function AdminMenusPage() {
  const { menus, loading, error, refetch } = useMenusAdmin()
  const toast = useToast()
  useQueryErrorToast(error)

  const menusFlat = useMemo(
    () =>
      menus
        .filter((m) => !m.eliminado)
        .slice()
        .sort((a, b) => a.orden - b.orden || a.titulo.localeCompare(b.titulo)),
    [menus],
  )
  const [selected, setSelected] = useState<MenuAdminItem | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<MenuAdminItem | null>(null)
  const [formError, setFormError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const [titulo, setTitulo] = useState('')
  const [ruta, setRuta] = useState('')
  const [icono, setIcono] = useState('')
  const [orden, setOrden] = useState(0)
  const [padreMenuId, setPadreMenuId] = useState<string>('')

  useEffect(() => {
    if (!selected) {
      setTitulo('')
      setRuta('')
      setIcono('')
      setOrden(0)
      setPadreMenuId('')
      return
    }
    setTitulo(selected.titulo)
    setRuta(selected.ruta ?? '')
    setIcono(selected.icono ?? '')
    setOrden(selected.orden)
    setPadreMenuId(selected.padreMenuId != null ? String(selected.padreMenuId) : '')
  }, [selected])

  const resetForm = () => {
    setSelected(null)
    setFormError(null)
  }

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
    setSelected(res.data)
    toast.success('Menú creado')
  }

  const handleSave = async () => {
    if (!selected) return
    setSaving(true)
    setFormError(null)
    const res = await updateMenuAdmin(selected.menuId, {
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
    setSelected(res.data)
    toast.success('Menú guardado')
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
    if (selected?.menuId === deleteTarget.menuId) resetForm()
    await refetch()
    toast.success('Menú eliminado')
  }

  return (
    <div className="cq-admin-page container-fluid py-4">
      <AdminListToolbar
        title="Menús"
        metrics={[{ label: 'Registros', value: menus.filter((m) => !m.eliminado).length }]}
        primaryAction={{
          label: 'Nuevo menú',
          onClick: resetForm,
        }}
      />

      {formError && (
        <div className="alert alert-warning" role="alert">{formError}</div>
      )}

      <div className="row g-4">
        <div className="col-lg-5">
          <div className="card cq-admin-card d-none d-lg-block">
            <div className="card-body min-w-0">
              {loading ? (
                <p className="text-muted">Cargando…</p>
              ) : (
                <MenuTreeEditor menus={menus} selectedId={selected?.menuId ?? null} onSelect={setSelected} />
              )}
            </div>
          </div>
          {!loading && (
            <div className="d-lg-none">
              <AdminMobileCardList
                className="cq-admin-mobile-list"
                rows={menusFlat}
                getRowKey={(m) => m.menuId}
                emptyMessage="Sin menús registrados."
                renderCard={(m) => (
                  <MenuAdminMobileCard
                    menu={m}
                    active={selected?.menuId === m.menuId}
                    onSelect={setSelected}
                  />
                )}
              />
            </div>
          )}
        </div>
        <div className="col-lg-7">
          <div className="card cq-admin-card">
            <div className="card-body">
              <h2 className="h6 mb-3">{selected ? 'Editar menú' : 'Nuevo menú'}</h2>
              <div className="row g-3">
                <div className="col-md-6">
                  <label className="form-label" htmlFor="menu-titulo">Título</label>
                  <input
                    id="menu-titulo"
                    className="form-control"
                    value={titulo}
                    onChange={(e) => setTitulo(e.target.value)}
                  />
                </div>
                <div className="col-md-6">
                  <label className="form-label" htmlFor="menu-ruta">Ruta SPA</label>
                  <input
                    id="menu-ruta"
                    className="form-control"
                    placeholder="/admin/casas"
                    value={ruta}
                    onChange={(e) => setRuta(e.target.value)}
                  />
                </div>
                <div className="col-md-4">
                  <label className="form-label" htmlFor="menu-icono">Icono</label>
                  <input
                    id="menu-icono"
                    className="form-control"
                    placeholder="home"
                    value={icono}
                    onChange={(e) => setIcono(e.target.value)}
                  />
                </div>
                <div className="col-md-4">
                  <label className="form-label" htmlFor="menu-orden">Orden</label>
                  <input
                    id="menu-orden"
                    type="number"
                    className="form-control tabular-nums"
                    value={orden}
                    onChange={(e) => setOrden(Number(e.target.value))}
                  />
                </div>
                <div className="col-md-4">
                  <label className="form-label" htmlFor="menu-padre">Menú padre (ID)</label>
                  <input
                    id="menu-padre"
                    className="form-control tabular-nums"
                    value={padreMenuId}
                    onChange={(e) => setPadreMenuId(e.target.value)}
                  />
                </div>
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                {selected ? (
                  <>
                    <button
                      type="button"
                      className="btn btn-primary cursor-pointer"
                      disabled={saving || !titulo.trim()}
                      onClick={() => void handleSave()}
                    >
                      Guardar
                    </button>
                    <button
                      type="button"
                      className="btn btn-outline-danger cursor-pointer"
                      disabled={saving}
                      onClick={() => setDeleteTarget(selected)}
                    >
                      Eliminar
                    </button>
                  </>
                ) : (
                  <button
                    type="button"
                    className="btn btn-primary cursor-pointer"
                    disabled={saving || !titulo.trim()}
                    onClick={() => void handleCreate()}
                  >
                    Crear
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      <ConfirmDialog
        open={deleteTarget != null}
        title="Eliminar menú"
        message={`¿Eliminar «${deleteTarget?.titulo}»?`}
        confirmLabel="Eliminar"
        variant="danger"
        onConfirm={() => void handleDelete()}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  )
}

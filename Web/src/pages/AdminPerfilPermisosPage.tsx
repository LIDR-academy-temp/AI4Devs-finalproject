import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import 'bootstrap/dist/css/bootstrap.min.css'
import '../styles/bootstrap-pantone.css'
import '../styles/cq-admin.css'
import { PerfilPermisosPanel } from '../features/navegacion/PerfilPermisosPanel'
import { fetchPermisosMenus, savePermisosMenus } from '../features/navegacion/navegacion.api'
import { useNavegacion } from '../features/navegacion/NavegacionContext'
import type { PerfilMenuPermiso } from '../features/navegacion/types'
import { AdminListToolbar, ConfirmDialog } from '../shared/components/admin'
import { useQueryErrorToast } from '../shared/hooks/useQueryErrorToast'
import { useToast } from '../shared/toast/ToastContext'

export function AdminPerfilPermisosPage() {
  const { id } = useParams<{ id: string }>()
  const perfilId = Number(id)
  const { refetch: refetchNav } = useNavegacion()
  const toast = useToast()
  const [permisos, setPermisos] = useState<PerfilMenuPermiso[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [confirmOpen, setConfirmOpen] = useState(false)

  useQueryErrorToast(error)

  useEffect(() => {
    if (!Number.isFinite(perfilId)) {
      setError('Perfil inválido')
      setLoading(false)
      return
    }
    setLoading(true)
    void fetchPermisosMenus(perfilId).then((res) => {
      if (!res.data) {
        setError(res.problem?.detail ?? `Error ${res.status}`)
        setPermisos([])
      } else {
        setPermisos(res.data)
        setError(null)
      }
      setLoading(false)
    })
  }, [perfilId])

  const handleSave = async () => {
    setSaving(true)
    setError(null)
    const menus = permisos
      .filter((p) => p.asignado)
      .map((p) => ({ menuId: p.menuId, visible: p.visible }))
    const res = await savePermisosMenus(perfilId, menus)
    setSaving(false)
    setConfirmOpen(false)
    if (!res.data) {
      setError(res.problem?.detail ?? `Error ${res.status}`)
      return
    }
    setPermisos(res.data)
    await refetchNav()
    toast.success('Permisos guardados')
  }

  return (
    <div className="cq-admin-page container-fluid py-4">
      <AdminListToolbar
        title={`Permisos de menú — perfil #${perfilId}`}
        primaryAction={{
          label: 'Guardar cambios',
          onClick: () => setConfirmOpen(true),
          disabled: saving || loading,
        }}
      />

      <p className="mb-3 text-sm text-muted">
        <Link to="/admin/perfiles" className="text-primary">← Volver a perfiles</Link>
      </p>

      <div className="card cq-admin-card">
        <div className="card-body min-w-0">
          {loading ? (
            <p className="text-muted">Cargando…</p>
          ) : (
            <PerfilPermisosPanel permisos={permisos} onChange={setPermisos} disabled={saving} />
          )}
        </div>
      </div>

      <ConfirmDialog
        open={confirmOpen}
        title="Guardar permisos"
        message="Se actualizarán los menús visibles para este perfil."
        confirmLabel="Guardar"
        onConfirm={() => void handleSave()}
        onCancel={() => setConfirmOpen(false)}
      />
    </div>
  )
}

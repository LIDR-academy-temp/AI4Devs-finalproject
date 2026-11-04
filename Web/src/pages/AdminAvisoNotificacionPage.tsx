import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useAuth } from '../features/auth/AuthContext'
import { PageHeader } from '../shared/components/admin'
import { PortalPageLayout } from '../shared/components/PortalPageLayout'
import { apiPost } from '../shared/lib/apiClient'
import { useToast } from '../shared/toast/ToastContext'

const schema = z.object({
  titulo: z.string().min(1, 'Título requerido').max(200),
  mensaje: z.string().min(1, 'Mensaje requerido').max(2000),
})

type FormData = z.infer<typeof schema>

export function AdminAvisoNotificacionPage() {
  const { session } = useAuth()
  const toast = useToast()
  const [saving, setSaving] = useState(false)
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormData>({ resolver: zodResolver(schema) })

  const onSubmit = handleSubmit(async (data) => {
    if (!session?.token) return
    setSaving(true)
    const res = await apiPost<{ destinatarios: number }>('/NTF/Notificaciones/aviso', data, session.token)
    setSaving(false)
    if (res.status === 201 && res.data) {
      toast.success(`Aviso enviado a ${res.data.destinatarios} destinatarios`)
      reset()
      return
    }
    toast.error(res.problem?.detail ?? 'No se pudo enviar el aviso')
  })

  return (
    <PortalPageLayout width="3xl">
      <PageHeader title="Aviso general" subtitle="Notificación masiva vía NTF (solo administración)" />
      <form onSubmit={onSubmit} className="d-flex flex-column gap-3">
        <div>
          <label className="form-label" htmlFor="aviso-titulo">
            Título
          </label>
          <input id="aviso-titulo" className="form-control" {...register('titulo')} />
          {errors.titulo && <div className="text-danger small">{errors.titulo.message}</div>}
        </div>
        <div>
          <label className="form-label" htmlFor="aviso-mensaje">
            Mensaje
          </label>
          <textarea id="aviso-mensaje" className="form-control" rows={5} {...register('mensaje')} />
          {errors.mensaje && <div className="text-danger small">{errors.mensaje.message}</div>}
        </div>
        <button type="submit" className="btn btn-primary align-self-start" disabled={saving}>
          {saving ? 'Enviando…' : 'Enviar aviso'}
        </button>
      </form>
    </PortalPageLayout>
  )
}

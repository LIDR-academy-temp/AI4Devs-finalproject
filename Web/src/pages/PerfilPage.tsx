import { zodResolver } from '@hookform/resolvers/zod'
import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../features/auth/AuthContext'
import { perfilSchema, type PerfilForm } from '../features/perfil/perfilSchema'
import { AlertBanner, PageHeader } from '../shared/components/admin'
import { apiGet, apiPut } from '../shared/lib/apiClient'

type PerfilDto = {
  usuarioId: number
  nombre: string
  correo: string
  telefono?: string | null
  perfil: string
  unidad?: string | null
  condominio?: string | null
  requiereReLogin?: boolean
}

export function PerfilPage() {
  const { session, logout } = useAuth()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [serverError, setServerError] = useState<string | null>(null)
  const esAdmin = session?.perfil === 'Administrador'

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<PerfilForm>({
    resolver: zodResolver(perfilSchema),
    defaultValues: { correo: '', telefono: '', nombre: '' },
  })

  useEffect(() => {
    if (!session?.usuarioId) {
      setLoading(false)
      return
    }
    setLoading(true)
    setLoadError(null)
    void apiGet<PerfilDto>(`/SGR/Usuarios/${session.usuarioId}`).then((r) => {
      if (!r.data || r.status !== 200) {
        setLoadError(r.problem?.detail ?? 'No se pudo cargar el perfil')
        setLoading(false)
        return
      }
      reset({
        correo: r.data.correo,
        telefono: r.data.telefono ?? '',
        nombre: r.data.nombre,
      })
      setLoading(false)
    })
  }, [session?.usuarioId, reset])

  const onSubmit = handleSubmit(async (values) => {
    if (!session?.usuarioId) return
    setServerError(null)
    const body: Record<string, string> = {
      correo: values.correo,
      telefono: values.telefono || '',
    }
    if (esAdmin && values.nombre) {
      body.nombre = values.nombre
    }
    const { data, problem, status } = await apiPut<PerfilDto>(
      `/SGR/Usuarios/${session.usuarioId}`,
      body,
    )
    if (status !== 200 || !data) {
      setServerError(problem?.detail ?? 'No se pudo guardar')
      return
    }
    reset({
      correo: data.correo,
      telefono: data.telefono ?? '',
      nombre: data.nombre,
    })
    if (data.requiereReLogin) {
      await logout()
      navigate('/login', { replace: true, state: { correoCambiado: true } })
    }
  })

  return (
    <main className="mx-auto max-w-md space-y-4 p-8">
      <Link to="/" className="text-sm text-primary hover:underline">← Inicio</Link>
      <PageHeader title="Mi perfil" description="Actualiza tu correo y teléfono de contacto." />
      {loadError && <AlertBanner variant="error">{loadError}</AlertBanner>}
      {loading && <p className="text-sm text-neutral">Cargando perfil…</p>}
      {!loading && (
      <form className="flex flex-col gap-3" onSubmit={onSubmit} noValidate>
        {esAdmin && (
          <label className="flex flex-col gap-1 text-sm">
            Nombre
            <input className="rounded border px-3 py-2" {...register('nombre')} />
            {errors.nombre && <span className="text-danger">{errors.nombre.message}</span>}
          </label>
        )}
        <label className="flex flex-col gap-1 text-sm">
          Correo
          <input type="email" autoComplete="email" className="rounded border px-3 py-2" {...register('correo')} />
          {errors.correo && <span className="text-danger">{errors.correo.message}</span>}
        </label>
        <label className="flex flex-col gap-1 text-sm">
          Teléfono
          <input inputMode="numeric" className="rounded border px-3 py-2" {...register('telefono')} />
          {errors.telefono && <span className="text-danger">{errors.telefono.message}</span>}
        </label>
        {serverError && <AlertBanner variant="error">{serverError}</AlertBanner>}
        <button
          type="submit"
          disabled={isSubmitting}
          className="rounded bg-primary px-4 py-2 text-white hover:bg-primary-dark disabled:opacity-50"
        >
          Guardar
        </button>
      </form>
      )}
    </main>
  )
}

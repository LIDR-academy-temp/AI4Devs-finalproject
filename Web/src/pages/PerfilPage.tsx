import { zodResolver } from '@hookform/resolvers/zod'
import { Car, PawPrint } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { useForm } from 'react-hook-form'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../features/auth/AuthContext'
import { useMascotas } from '../features/mascotas/useMascotas'
import { perfilSchema, type PerfilForm } from '../features/perfil/perfilSchema'
import { PerfilRegistroCard } from '../features/perfil/PerfilRegistroCard'
import { vehiculoSubtitulo, vehiculoTitulo } from '../features/vehiculos/vehiculoMappers'
import { useVehiculos } from '../features/vehiculos/useVehiculos'
import { PageHeader } from '../shared/components/admin'
import { useQueryErrorToast } from '../shared/hooks/useQueryErrorToast'
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

const PREVIEW_MAX = 3

export function PerfilPage() {
  const { session, logout } = useAuth()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [serverError, setServerError] = useState<string | null>(null)
  const [meta, setMeta] = useState<Pick<PerfilDto, 'unidad' | 'condominio' | 'perfil'> | null>(null)
  const esAdmin = session?.perfil === 'Administrador'

  const { vehiculos, loading: vehLoading, error: vehError } = useVehiculos()
  const { mascotas, loading: mascLoading, error: mascError } = useMascotas()
  useQueryErrorToast(loadError)
  useQueryErrorToast(serverError)

  const vehPreview = useMemo(
    () =>
      vehiculos.slice(0, PREVIEW_MAX).map((v) => {
        const sub = vehiculoSubtitulo(v)
        const title = vehiculoTitulo(v)
        return sub.startsWith('Sin marca') ? title : `${title} · ${sub.split(' · ')[0]}`
      }),
    [vehiculos],
  )

  const mascPreview = useMemo(
    () =>
      mascotas.slice(0, PREVIEW_MAX).map((m) => {
        const tipo = [m.tipoMascota, m.razaMascota ?? m.razaLibre].filter(Boolean).join(' · ')
        return tipo ? `${m.nombreMascota} · ${tipo}` : m.nombreMascota
      }),
    [mascotas],
  )

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
      setMeta({
        unidad: r.data.unidad,
        condominio: r.data.condominio,
        perfil: r.data.perfil,
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

  const ubicacion = [meta?.unidad, meta?.condominio].filter(Boolean).join(' · ')

  return (
    <main className="mx-auto max-w-3xl space-y-6 p-6 md:p-8">
      <PageHeader
        title="Mi perfil"
        description="Datos de contacto y registros de tu unidad (vehículos y mascotas)."
      />

      {ubicacion && (
        <p className="text-sm text-neutral">
          <span className="font-medium text-neutral-800">{session?.nombre}</span>
          {meta?.perfil && (
            <span className="ml-2 rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
              {meta.perfil}
            </span>
          )}
          <span className="mt-1 block text-neutral">{ubicacion}</span>
        </p>
      )}

      {loadError && (
        <p className="text-sm text-neutral" role="status">
          No se pudieron cargar tus datos. Recarga la página o intenta más tarde.
        </p>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <section
          className="rounded-xl border border-neutral-200 bg-surface-alt p-5 shadow-sm"
          aria-labelledby="perfil-datos-heading"
        >
          <h2 id="perfil-datos-heading" className="text-base font-semibold text-neutral-900">
            Datos de contacto
          </h2>
          <p className="mt-1 text-sm text-neutral">Correo y teléfono para avisos del condominio.</p>

          {loading && <p className="mt-4 text-sm text-neutral">Cargando perfil…</p>}
          {!loading && (
            <form className="mt-4 flex flex-col gap-3" onSubmit={onSubmit} noValidate>
              {esAdmin && (
                <label className="flex flex-col gap-1 text-sm">
                  Nombre
                  <input className="rounded-md border border-neutral-200 px-3 py-2" {...register('nombre')} />
                  {errors.nombre && <span className="text-danger">{errors.nombre.message}</span>}
                </label>
              )}
              <label className="flex flex-col gap-1 text-sm">
                Correo
                <input
                  type="email"
                  autoComplete="email"
                  className="rounded-md border border-neutral-200 px-3 py-2"
                  {...register('correo')}
                />
                {errors.correo && <span className="text-danger">{errors.correo.message}</span>}
              </label>
              <label className="flex flex-col gap-1 text-sm">
                Teléfono
                <input
                  inputMode="tel"
                  autoComplete="tel"
                  className="rounded-md border border-neutral-200 px-3 py-2"
                  {...register('telefono')}
                />
                {errors.telefono && <span className="text-danger">{errors.telefono.message}</span>}
              </label>
              <button
                type="submit"
                disabled={isSubmitting}
                className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary-dark disabled:opacity-50"
              >
                Guardar cambios
              </button>
            </form>
          )}
        </section>

        <div className="flex flex-col gap-4">
          <PerfilRegistroCard
            sectionId="perfil-vehiculos-heading"
            title="Mis vehículos"
            description="Placas y datos para acceso y registro en caseta."
            to="/mis-vehiculos"
            icon={Car}
            count={vehiculos.length}
            loading={vehLoading}
            error={vehError}
            previewLines={vehPreview}
            emptyHint="Aún no tienes vehículos registrados."
            manageLabel="Administrar vehículos"
          />
          <PerfilRegistroCard
            sectionId="perfil-mascotas-heading"
            title="Mis mascotas"
            description="Mascotas autorizadas en la unidad y estado de vacunas."
            to="/mis-mascotas"
            icon={PawPrint}
            count={mascotas.length}
            loading={mascLoading}
            error={mascError}
            previewLines={mascPreview}
            emptyHint="Aún no tienes mascotas registradas."
            manageLabel="Administrar mascotas"
          />
        </div>
      </div>

      <p className="text-center text-sm text-neutral">
        <Link to="/cambiar-password" className="text-primary hover:underline">
          Cambiar contraseña
        </Link>
      </p>
    </main>
  )
}

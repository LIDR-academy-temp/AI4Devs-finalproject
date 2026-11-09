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
import { PageHeader, PortalPageLayout, PortalSection } from '../shared/components/admin'
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
  const displayName = session?.nombre ?? meta?.perfil

  return (
    <PortalPageLayout width="3xl" className="flex flex-col gap-4">
      <PageHeader
        bordered
        title="Mi perfil"
        description="Datos de contacto y registros de tu unidad (vehículos y mascotas)."
      />

      {(displayName || ubicacion || meta?.perfil) && (
        <div className="cq-portal-perfil-identity">
          {displayName ? (
            <p className="cq-portal-perfil-identity__name">
              {displayName}
              {meta?.perfil ? (
                <span className="cq-portal-badge ml-2 bg-primary/10 text-primary border border-primary/20">
                  {meta.perfil}
                </span>
              ) : null}
            </p>
          ) : null}
          {ubicacion ? <p className="cq-portal-perfil-identity__meta">{ubicacion}</p> : null}
        </div>
      )}

      {loadError ? (
        <p className="text-sm text-neutral" role="status">
          No se pudieron cargar tus datos. Recarga la página o intenta más tarde.
        </p>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-2">
        <PortalSection variant="padded" title="Datos de contacto" titleId="perfil-datos-heading">
          <p className="cq-portal-stat-block__meta mb-3">
            Correo y teléfono para avisos del condominio.
          </p>

          {loading ? <p className="text-sm text-neutral">Cargando perfil…</p> : null}
          {!loading ? (
            <form className="cq-portal-form" onSubmit={onSubmit} noValidate>
              {esAdmin ? (
                <label>
                  Nombre
                  <input {...register('nombre')} />
                  {errors.nombre ? <span className="text-danger">{errors.nombre.message}</span> : null}
                </label>
              ) : null}
              <label>
                Correo
                <input type="email" autoComplete="email" {...register('correo')} />
                {errors.correo ? <span className="text-danger">{errors.correo.message}</span> : null}
              </label>
              <label>
                Teléfono
                <input inputMode="tel" autoComplete="tel" {...register('telefono')} />
                {errors.telefono ? <span className="text-danger">{errors.telefono.message}</span> : null}
              </label>
              <button type="submit" disabled={isSubmitting} className="cq-portal-btn cq-portal-btn-primary">
                Guardar cambios
              </button>
            </form>
          ) : null}
        </PortalSection>

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

      <p className="border-t border-neutral-100 pt-4 text-center text-sm">
        <Link to="/cambiar-password" className="font-medium text-primary hover:underline">
          Cambiar contraseña
        </Link>
        {esAdmin ? (
          <>
            {' · '}
            <Link to="/admin/perfiles" className="font-medium text-primary hover:underline">
              Administrar perfiles
            </Link>
          </>
        ) : null}
      </p>
    </PortalPageLayout>
  )
}

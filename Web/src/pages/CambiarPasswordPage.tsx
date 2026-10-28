import { zodResolver } from '@hookform/resolvers/zod'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../features/auth/AuthContext'
import {
  cambiarPasswordSchema,
  type CambiarPasswordForm,
} from '../features/auth/cambiarPasswordSchema'

export function CambiarPasswordPage() {
  const { cambiarPassword } = useAuth()
  const navigate = useNavigate()
  const [serverError, setServerError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<CambiarPasswordForm>({
    resolver: zodResolver(cambiarPasswordSchema),
    defaultValues: { passwordActual: '', passwordNueva: '' },
  })

  const onSubmit = handleSubmit(async (values) => {
    setServerError(null)
    const result = await cambiarPassword(values.passwordActual, values.passwordNueva)
    if (!result.ok) {
      setServerError(result.error ?? 'No se pudo actualizar la contraseña')
      return
    }
    navigate('/login', { replace: true, state: { passwordChanged: true } })
  })

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center gap-4 md:p-8 p-8">
      <h1 className="text-xl font-semibold text-primary-dark">Cambiar contraseña</h1>
      <p className="text-sm text-neutral">
        Debes actualizar tu contraseña antes de continuar. Al guardar se cerrarán las demás
        sesiones.
      </p>
      <form className="flex flex-col gap-3" onSubmit={onSubmit} noValidate>
        <label className="flex flex-col gap-1 text-sm">
          Contraseña actual
          <input
            type="password"
            autoComplete="current-password"
            className="rounded border border-neutral-200 px-3 py-2"
            {...register('passwordActual')}
          />
          {errors.passwordActual && (
            <span className="text-danger">{errors.passwordActual.message}</span>
          )}
        </label>
        <label className="flex flex-col gap-1 text-sm">
          Contraseña nueva
          <input
            type="password"
            autoComplete="new-password"
            className="rounded border border-neutral-200 px-3 py-2"
            {...register('passwordNueva')}
          />
          {errors.passwordNueva && (
            <span className="text-danger">{errors.passwordNueva.message}</span>
          )}
        </label>
        {serverError && (
          <p className="text-sm text-danger" role="alert">{serverError}</p>
        )}
        <button
          type="submit"
          disabled={isSubmitting}
          className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary-dark disabled:opacity-60"
        >
          {isSubmitting ? 'Guardando…' : 'Guardar contraseña'}
        </button>
      </form>
    </main>
  )
}

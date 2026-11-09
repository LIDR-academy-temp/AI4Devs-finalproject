import { zodResolver } from '@hookform/resolvers/zod'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../features/auth/AuthContext'
import {
  cambiarPasswordSchema,
  type CambiarPasswordForm,
} from '../features/auth/cambiarPasswordSchema'
import { PasswordField } from '../shared/components/PasswordField'
import { useQueryErrorToast } from '../shared/hooks/useQueryErrorToast'
import '../styles/login.css'

export function CambiarPasswordPage() {
  const { cambiarPassword } = useAuth()
  const navigate = useNavigate()
  const [serverError, setServerError] = useState<string | null>(null)
  useQueryErrorToast(serverError)

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
    <main className="cq-login-page flex min-h-screen items-center justify-center p-4">
      <section className="cq-login-card w-full max-w-md" aria-label="Cambiar contraseña">
        <h1 className="text-xl font-semibold">Cambiar contraseña</h1>
        <p className="cq-login-card-sub">
          Debes actualizar tu contraseña antes de continuar. Al guardar se cerrarán las demás sesiones.
        </p>
        <form className="flex flex-col gap-4" onSubmit={onSubmit} noValidate>
          <PasswordField
            id="password-actual"
            label="Contraseña actual"
            autoComplete="current-password"
            error={errors.passwordActual?.message}
            registration={register('passwordActual')}
          />
          <PasswordField
            id="password-nueva"
            label="Contraseña nueva"
            autoComplete="new-password"
            error={errors.passwordNueva?.message}
            registration={register('passwordNueva')}
          />
          <button type="submit" disabled={isSubmitting} className="cq-login-submit">
            {isSubmitting ? 'Guardando…' : 'Guardar contraseña'}
          </button>
        </form>
      </section>
    </main>
  )
}

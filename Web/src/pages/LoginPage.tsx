import { zodResolver } from '@hookform/resolvers/zod'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { useLocation, useNavigate } from 'react-router-dom'
import { LOGIN_HERO } from '../features/auth/loginCopy'
import { useAuth } from '../features/auth/AuthContext'
import { loginSchema, type LoginForm } from '../features/auth/loginSchema'
import { PasswordField } from '../shared/components/PasswordField'
import '../styles/login.css'

export function LoginPage() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const passwordChanged = (location.state as { passwordChanged?: boolean } | null)
    ?.passwordChanged
  const [serverError, setServerError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
    defaultValues: { correo: '', password: '' },
  })

  const onSubmit = handleSubmit(async (values) => {
    setServerError(null)
    const result = await login(values.correo, values.password)
    if (!result.ok) {
      setServerError(result.error ?? 'Error de autenticación')
      return
    }
    const from = (location.state as { from?: string } | null)?.from
    const safeFrom =
      from && from !== '/login' && from !== '/cambiar-password' ? from : '/'
    navigate(result.requiereCambioPassword ? '/cambiar-password' : safeFrom, { replace: true })
  })

  return (
    <main className="cq-login-page" style={{ animation: 'fadeInPage 400ms ease' }}>
      <a className="cq-login-skip" href="#login-form">
        Saltar al contenido
      </a>

      <div className="cq-login-shell">
        <section className="cq-login-hero" aria-label="Presentación del portal">
          <div className="cq-login-brand">
            <span className="cq-login-brand-mark" aria-hidden="true">C</span>
            <span className="text-lg font-semibold text-white">CuartaQuinientos</span>
          </div>
          <h1>{LOGIN_HERO.title}</h1>
          <p>{LOGIN_HERO.subtitle}</p>
          <ul className="cq-login-points">
            {LOGIN_HERO.bullets.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </section>

        <section className="cq-login-card" aria-label="Formulario de acceso">
          <h2 id="login-form">{LOGIN_HERO.cardTitle}</h2>
          <p className="cq-login-card-sub">{LOGIN_HERO.cardSubtitle}</p>

          {passwordChanged && (
            <p className="mb-4 rounded-lg bg-success-light px-3 py-2 text-sm text-success" role="status">
              Contraseña actualizada. Inicia sesión con tu nueva contraseña.
            </p>
          )}

          <form className="flex flex-col gap-4" onSubmit={onSubmit} noValidate>
            <label className="cq-login-field" htmlFor="correo">
              Correo
              <input
                id="correo"
                type="email"
                autoComplete="email"
                className="cq-login-input"
                aria-invalid={errors.correo ? true : undefined}
                {...register('correo')}
              />
              {errors.correo && <span className="text-sm text-danger">{errors.correo.message}</span>}
            </label>

            <PasswordField
              id="password"
              label="Contraseña"
              error={errors.password?.message}
              registration={register('password')}
            />

            {serverError && (
              <p className="rounded-lg bg-danger-light px-3 py-2 text-sm text-danger" role="alert">
                {serverError}
              </p>
            )}

            <button type="submit" disabled={isSubmitting} className="cq-login-submit">
              {isSubmitting ? 'Entrando…' : 'Entrar'}
            </button>
          </form>
        </section>
      </div>
    </main>
  )
}

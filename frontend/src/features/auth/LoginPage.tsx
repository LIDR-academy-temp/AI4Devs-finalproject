import { zodResolver } from '@hookform/resolvers/zod'
import { LoginRequest } from '@recon/shared'
import { useNavigate, useSearch } from '@tanstack/react-router'
import { useForm } from 'react-hook-form'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ApiError } from '@/lib/api/client'
import { login } from '@/lib/session/auth-api'
import { safeRedirect } from './redirect'
import { strings } from './strings'

type FieldErrorType = string | number | undefined

const message = (type: FieldErrorType, required: string, tooLong: string) =>
  type === undefined ? undefined : type === 'too_big' ? tooLong : required

export function LoginPage() {
  const { redirect, reason } = useSearch({ from: '/login' })
  const navigate = useNavigate()
  const {
    register,
    handleSubmit,
    setError,
    resetField,
    formState: { errors, isSubmitting },
  } = useForm({ resolver: zodResolver(LoginRequest), defaultValues: { userName: '', password: '' } })

  const onSubmit = handleSubmit(async (credentials) => {
    try {
      await login(credentials)
    } catch (error) {
      const rejected = error instanceof ApiError && error.status === 401
      if (rejected) resetField('password')
      setError('root.server', { message: rejected ? strings.invalidCredentials : strings.serverUnreachable })
      return
    }
    const target = safeRedirect(redirect)
    await (target ? navigate({ href: target }) : navigate({ to: '/' }))
  })

  const userNameError = message(errors.userName?.type, strings.userNameRequired, strings.userNameTooLong)
  const passwordError = message(errors.password?.type, strings.passwordRequired, strings.passwordTooLong)
  const serverError = errors.root?.server?.message

  return (
    <main className="flex min-h-screen items-center justify-center bg-muted/40 p-4">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle className="text-xl">
            <h1>{strings.title}</h1>
          </CardTitle>
          <CardDescription>{strings.subtitle}</CardDescription>
        </CardHeader>
        <CardContent>
          <form className="flex flex-col gap-4" onSubmit={onSubmit} noValidate>
            {reason === 'expired' && !serverError && (
              <Alert>
                <AlertDescription>{strings.sessionExpired}</AlertDescription>
              </Alert>
            )}
            {serverError && (
              <Alert variant="destructive" role="alert">
                <AlertDescription>{serverError}</AlertDescription>
              </Alert>
            )}
            <div className="flex flex-col gap-2">
              <Label htmlFor="userName">{strings.userName}</Label>
              <Input
                id="userName"
                autoComplete="username"
                aria-invalid={userNameError ? true : undefined}
                aria-describedby={userNameError ? 'userName-error' : undefined}
                {...register('userName')}
              />
              {userNameError && (
                <p id="userName-error" className="text-sm text-destructive">
                  {userNameError}
                </p>
              )}
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="password">{strings.password}</Label>
              <Input
                id="password"
                type="password"
                autoComplete="current-password"
                aria-invalid={passwordError ? true : undefined}
                aria-describedby={passwordError ? 'password-error' : undefined}
                {...register('password')}
              />
              {passwordError && (
                <p id="password-error" className="text-sm text-destructive">
                  {passwordError}
                </p>
              )}
            </div>
            <Button type="submit" disabled={isSubmitting}>
              {strings.submit}
            </Button>
            <p className="text-xs text-muted-foreground">{strings.noSelfRegistration}</p>
          </form>
        </CardContent>
      </Card>
    </main>
  )
}

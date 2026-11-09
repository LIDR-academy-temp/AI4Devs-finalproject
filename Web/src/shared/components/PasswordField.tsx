import { Eye, EyeOff } from 'lucide-react'
import { useState } from 'react'
import type { UseFormRegisterReturn } from 'react-hook-form'

type PasswordFieldProps = {
  id: string
  label: string
  error?: string
  registration: UseFormRegisterReturn
  autoComplete?: string
}

export function PasswordField({
  id,
  label,
  error,
  registration,
  autoComplete = 'current-password',
}: PasswordFieldProps) {
  const [visible, setVisible] = useState(false)

  return (
    <label className="cq-login-field" htmlFor={id}>
      {label}
      <div className="cq-login-password-wrap">
        <input
          id={id}
          type={visible ? 'text' : 'password'}
          autoComplete={autoComplete}
          className="cq-login-input"
          aria-invalid={error ? true : undefined}
          {...registration}
        />
        <button
          type="button"
          className="cq-login-password-toggle"
          aria-label={visible ? 'Ocultar contraseña' : 'Mostrar contraseña'}
          aria-pressed={visible}
          onClick={() => setVisible((v) => !v)}
        >
          {visible ? <EyeOff className="h-4 w-4" aria-hidden /> : <Eye className="h-4 w-4" aria-hidden />}
        </button>
      </div>
      {error && <span className="text-sm text-danger">{error}</span>}
    </label>
  )
}

import { useId } from 'react'
import type { InputHTMLAttributes, ReactNode } from 'react'

interface Props extends InputHTMLAttributes<HTMLInputElement> {
  etiqueta: string
  error?: string
  ayuda?: ReactNode
}

/** Un campo de formulario con su etiqueta, su ayuda y su error, enlazados para lectores de pantalla. */
export function Campo({ etiqueta, error, ayuda, ...entrada }: Props) {
  const id = useId()
  const descripciones = [ayuda && `${id}-ayuda`, error && `${id}-error`].filter(Boolean).join(' ')
  // La ayuda y el error van fuera de la etiqueta: dentro, pasarían a formar parte del nombre del campo.
  return (
    <div className="campo">
      <label htmlFor={id}>{etiqueta}</label>
      <input
        {...entrada}
        id={id}
        aria-invalid={error ? true : undefined}
        aria-describedby={descripciones || undefined}
      />
      {ayuda && (
        <span id={`${id}-ayuda`} className="ayuda">
          {ayuda}
        </span>
      )}
      {error && (
        <span id={`${id}-error`} className="error-campo">
          {error}
        </span>
      )}
    </div>
  )
}

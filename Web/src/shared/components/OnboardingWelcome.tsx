import { useState } from 'react'
import { Link } from 'react-router-dom'

const STORAGE_KEY = 'cq-onboarding-v1'

const STEPS = [
  {
    title: 'Menú lateral',
    body: 'En escritorio usa el menú agrupado; en móvil ábrelo con el botón de hamburguesa.',
  },
  {
    title: 'Accesos rápidos',
    body: 'Desde inicio llegas a tickets, finanzas, anuncios y lo más usado según tu perfil.',
  },
  {
    title: 'Tu cuenta',
    body: 'Perfil, contraseña, notificaciones y tema claro/oscuro están en el menú de usuario (arriba).',
  },
]

export function OnboardingWelcome() {
  const [open, setOpen] = useState(() => localStorage.getItem(STORAGE_KEY) !== '1')
  const [step, setStep] = useState(0)

  if (!open) return null

  const finish = () => {
    localStorage.setItem(STORAGE_KEY, '1')
    setOpen(false)
  }

  const current = STEPS[step]
  const isLast = step >= STEPS.length - 1

  return (
    <div
      className="fixed inset-0 z-[100] flex items-end justify-center bg-black/40 p-4 sm:items-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby="onboarding-title"
    >
      <div className="w-full max-w-md rounded-xl border border-neutral-100 bg-surface-alt p-5 shadow-[var(--shadow-dropdown)]">
        <p className="text-xs font-semibold uppercase tracking-wide text-neutral">Bienvenido</p>
        <h2 id="onboarding-title" className="mt-1 text-lg font-semibold text-primary-dark">
          {current.title}
        </h2>
        <p className="mt-2 text-sm text-neutral">{current.body}</p>
        <div className="mt-4 flex items-center justify-between gap-2">
          <button
            type="button"
            className="cursor-pointer text-sm text-neutral underline"
            onClick={finish}
          >
            Omitir
          </button>
          <div className="flex gap-2">
            {step > 0 && (
              <button
                type="button"
                className="cursor-pointer rounded border px-3 py-1.5 text-sm"
                onClick={() => setStep((s) => s - 1)}
              >
                Atrás
              </button>
            )}
            {isLast ? (
              <button
                type="button"
                className="cursor-pointer rounded bg-primary px-3 py-1.5 text-sm text-white hover:bg-primary-dark"
                onClick={finish}
              >
                Entendido
              </button>
            ) : (
              <button
                type="button"
                className="cursor-pointer rounded bg-primary px-3 py-1.5 text-sm text-white hover:bg-primary-dark"
                onClick={() => setStep((s) => s + 1)}
              >
                Siguiente
              </button>
            )}
          </div>
        </div>
        <p className="mt-3 text-center text-xs text-neutral">
          <Link to="/perfil" className="text-primary hover:underline" onClick={finish}>
            Ir a mi perfil
          </Link>
        </p>
      </div>
    </div>
  )
}

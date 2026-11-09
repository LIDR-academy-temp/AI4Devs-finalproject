import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { FormModal } from './FormModal'

describe('FormModal', () => {
  it('no renderiza cuando open es false', () => {
    render(
      <FormModal open={false} title="Título" onClose={() => {}}>
        <p>Contenido</p>
      </FormModal>,
    )
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('muestra título y llama onClose al cancelar en footer', async () => {
    const user = userEvent.setup()
    const onClose = vi.fn()
    render(
      <FormModal
        open
        title="Alta"
        onClose={onClose}
        footer={
          <button type="button" onClick={onClose}>
            Cerrar
          </button>
        }
      >
        <form
          onSubmit={(e) => {
            e.preventDefault()
          }}
        >
          <input aria-label="Campo" />
          <button type="submit">Enviar</button>
        </form>
      </FormModal>,
    )

    expect(screen.getByRole('dialog')).toHaveAttribute('aria-modal', 'true')
    expect(screen.getByRole('heading', { name: 'Alta' })).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Cerrar' }))
    expect(onClose).toHaveBeenCalled()
  })

  it('submit del formulario dispara handler', async () => {
    const user = userEvent.setup()
    const onSubmit = vi.fn((e: { preventDefault: () => void }) => e.preventDefault())
    render(
      <FormModal open title="Form" onClose={() => {}}>
        <form onSubmit={onSubmit}>
          <button type="submit">Guardar</button>
        </form>
      </FormModal>,
    )
    await user.click(screen.getByRole('button', { name: 'Guardar' }))
    expect(onSubmit).toHaveBeenCalled()
  })
})

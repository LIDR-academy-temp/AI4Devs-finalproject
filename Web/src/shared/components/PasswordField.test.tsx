import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useForm } from 'react-hook-form'
import { describe, expect, it } from 'vitest'
import { PasswordField } from './PasswordField'

function Harness() {
  const { register } = useForm<{ password: string }>({ defaultValues: { password: '' } })
  return <PasswordField id="pw" label="Contraseña" registration={register('password')} />
}

describe('PasswordField', () => {
  it('alterna mostrar y ocultar contraseña', async () => {
    const user = userEvent.setup()
    render(<Harness />)
    const input = screen.getByLabelText('Contraseña')
    expect(input).toHaveAttribute('type', 'password')

    await user.click(screen.getByRole('button', { name: 'Mostrar contraseña' }))
    expect(input).toHaveAttribute('type', 'text')
    expect(screen.getByRole('button', { name: 'Ocultar contraseña' })).toHaveAttribute(
      'aria-pressed',
      'true',
    )
  })
})

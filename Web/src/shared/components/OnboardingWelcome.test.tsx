import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import { OnboardingWelcome } from './OnboardingWelcome'

describe('OnboardingWelcome', () => {
  afterEach(() => {
    localStorage.removeItem('cq-onboarding-v1')
  })

  it('se cierra al omitir y no vuelve a mostrarse', async () => {
    const user = userEvent.setup()
    render(
      <MemoryRouter>
        <OnboardingWelcome />
      </MemoryRouter>,
    )
    expect(screen.getByRole('dialog')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: /Omitir/i }))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()

    render(
      <MemoryRouter>
        <OnboardingWelcome />
      </MemoryRouter>,
    )
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })
})

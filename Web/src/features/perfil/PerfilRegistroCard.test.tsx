import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { Car } from 'lucide-react'
import { describe, expect, it } from 'vitest'
import { PerfilRegistroCard } from './PerfilRegistroCard'

describe('PerfilRegistroCard', () => {
  it('muestra error de preview vía toast', async () => {
    const { useToast } = await import('../../shared/toast/ToastContext')
    const toast = useToast()
    render(
      <MemoryRouter>
        <PerfilRegistroCard
          sectionId="t"
          title="Mis vehículos"
          description="Desc"
          to="/mis-vehiculos"
          icon={Car}
          count={0}
          loading={false}
          error="Fallo API"
          previewLines={[]}
          emptyHint="Vacío"
          manageLabel="Administrar"
        />
      </MemoryRouter>,
    )
    expect(toast.error).toHaveBeenCalledWith('Fallo API')
    expect(screen.getByText(/No se pudo cargar el resumen/i)).toBeInTheDocument()
  })
})

import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { MorososMorasPanel } from './MorososMorasPanel'

describe('MorososMorasPanel', () => {
  it('muestra acciones de mora', () => {
    render(
      <MorososMorasPanel
        montoMora="100"
        onMontoMoraChange={vi.fn()}
        onAplicar={vi.fn()}
        onCondonar={vi.fn()}
        mesFiltro="10"
        anioFiltro="2026"
        selectedCount={2}
        morasAplicadasEnSeleccion={3}
      />,
    )
    expect(screen.getByRole('heading', { name: /moras por atraso/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /aplicar mora a seleccionados/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /condonar moras/i })).toBeInTheDocument()
  })

  it('dispara callbacks', () => {
    const onAplicar = vi.fn()
    const onCondonar = vi.fn()
    render(
      <MorososMorasPanel
        montoMora="50"
        onMontoMoraChange={vi.fn()}
        onAplicar={onAplicar}
        onCondonar={onCondonar}
        mesFiltro="10"
        anioFiltro="2026"
        selectedCount={1}
        morasAplicadasEnSeleccion={0}
      />,
    )
    fireEvent.click(screen.getByRole('button', { name: /aplicar mora a seleccionados/i }))
    fireEvent.click(screen.getByRole('button', { name: /condonar moras/i }))
    expect(onAplicar).toHaveBeenCalled()
    expect(onCondonar).toHaveBeenCalled()
  })
})

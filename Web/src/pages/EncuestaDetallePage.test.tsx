import '../test/stubToast'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { EncuestaDetallePage } from './EncuestaDetallePage'

vi.mock('../shared/lib/apiClient', () => ({
  apiGet: vi.fn(),
  apiPost: vi.fn(),
}))

import { apiGet } from '../shared/lib/apiClient'

const mockApiGet = apiGet as ReturnType<typeof vi.fn>

const encuesta = {
  encuestaId: 1,
  titulo: 'Encuesta vecinal',
  descripcion: 'Tu opinión',
  yaParticipo: false,
  preguntas: [
    {
      preguntaId: 10,
      texto: '¿Cómo calificas el servicio?',
      tipoPregunta: 'Unica',
      requerida: true,
      orden: 1,
      opciones: [
        { opcionPreguntaId: 100, texto: 'Bien', orden: 1 },
        { opcionPreguntaId: 101, texto: 'Mal', orden: 2 },
      ],
    },
  ],
}

function renderPage() {
  return render(
    <MemoryRouter initialEntries={['/encuestas/1']}>
      <Routes>
        <Route path="/encuestas/:id" element={<EncuestaDetallePage />} />
      </Routes>
    </MemoryRouter>,
  )
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('EncuestaDetallePage', () => {
  it('muestra formulario tras cargar', async () => {
    mockApiGet.mockResolvedValue({ data: encuesta, status: 200 })
    renderPage()
    await waitFor(() => {
      expect(screen.getByText('Encuesta vecinal')).toBeInTheDocument()
    })
    expect(screen.getByText('¿Cómo calificas el servicio?')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Enviar respuestas' })).toBeInTheDocument()
  })

  it('muestra agradecimiento si ya participó', async () => {
    mockApiGet.mockResolvedValue({
      data: { ...encuesta, yaParticipo: true },
      status: 200,
    })
    renderPage()
    await waitFor(() => {
      expect(screen.getByText(/Gracias por tu participación/i)).toBeInTheDocument()
    })
  })

  it('muestra título y preguntas cuando el API responde en PascalCase', async () => {
    mockApiGet.mockResolvedValue({
      status: 200,
      data: {
        EncuestaId: 1,
        Titulo: 'Encuesta vecinal',
        Descripcion: 'Tu opinión',
        YaParticipo: false,
        Preguntas: [
          {
            PreguntaId: 10,
            Texto: '¿Cómo calificas el servicio?',
            TipoPregunta: 'Unica',
            Requerida: true,
            Orden: 1,
            Opciones: [
              { OpcionPreguntaId: 100, Texto: 'Bien', Orden: 1 },
              { OpcionPreguntaId: 101, Texto: 'Mal', Orden: 2 },
            ],
          },
        ],
      },
    })
    renderPage()
    await waitFor(() => {
      expect(screen.getByText('Encuesta vecinal')).toBeInTheDocument()
    })
    expect(screen.getByText('¿Cómo calificas el servicio?')).toBeInTheDocument()
    expect(screen.getByText('Bien')).toBeInTheDocument()
  })

  it('muestra textarea para Texto libre', async () => {
    mockApiGet.mockResolvedValue({
      status: 200,
      data: {
        EncuestaId: 2,
        Titulo: 'b',
        YaParticipo: false,
        Preguntas: [
          {
            PreguntaId: 20,
            Texto: 'c',
            TipoPregunta: 'Texto libre',
            Requerida: true,
            Orden: 2,
            Opciones: [],
          },
        ],
      },
    })
    renderPage()
    await waitFor(() => {
      expect(screen.getByRole('textbox')).toBeInTheDocument()
    })
  })

  it('no llama API con id inválido en la ruta', async () => {
    render(
      <MemoryRouter initialEntries={['/encuestas/undefined']}>
        <Routes>
          <Route path="/encuestas/:id" element={<EncuestaDetallePage />} />
        </Routes>
      </MemoryRouter>,
    )
    await waitFor(() => {
      expect(screen.getByText('No se pudo cargar la encuesta')).toBeInTheDocument()
    })
    expect(mockApiGet).not.toHaveBeenCalled()
  })

  it('muestra error de carga vía toast', async () => {
    const { useToast } = await import('../shared/toast/ToastContext')
    const toast = useToast()
    mockApiGet.mockResolvedValue({
      data: undefined,
      problem: { detail: 'No encontrada' },
      status: 404,
    })
    renderPage()
    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith('No encontrada')
    })
    expect(screen.getByText('No se pudo cargar la encuesta')).toBeInTheDocument()
  })
})

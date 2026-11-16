import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, test, vi } from 'vitest'
import type { SignatureRequest } from './api'
import App from './App'
import { loadPdf } from './pdfPreview'

vi.mock('./pdfPreview', () => ({ loadPdf: vi.fn() }))

const REQUEST_ID = '4c525ed7-3bed-488d-8e51-9af0b1ba461c'
const TOKEN = 'eyJyaWQiOiJ4In0.firma'
const DOWNLOAD_URL = 'http://localhost:8000/api/v1/documents/d1/versions/1/download'

function signatureRequest(overrides: Partial<SignatureRequest> = {}): SignatureRequest {
  return {
    id: REQUEST_ID,
    status: 'pending',
    provider: 'local',
    created_at: '2026-11-16T10:00:00Z',
    signed_at: null,
    document: {
      id: 'd1',
      external_document_id: null,
      version_number: 1,
      is_active_version: true,
      signing_status: 'pending_signature',
      signature_level: null,
      file_name: 'resolucion.pdf',
      size_bytes: 250_880,
      download_url: DOWNLOAD_URL,
    },
    ...overrides,
  }
}

function json(status: number, body: unknown) {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })
}

function mockApi(...responses: Array<Response | Error>) {
  const fetchMock = vi.fn()
  for (const response of responses) {
    if (response instanceof Error) fetchMock.mockRejectedValueOnce(response)
    else fetchMock.mockResolvedValueOnce(response)
  }
  vi.stubGlobal('fetch', fetchMock)
  return fetchMock
}

const pdfBytes = () => new Response(new Uint8Array([37, 80, 68, 70]), { status: 200 })
const renderFirstPage = vi.fn()

function openLink(url = `/sign/${REQUEST_ID}#t=${TOKEN}`) {
  window.history.replaceState(null, '', url)
}

beforeEach(() => {
  renderFirstPage.mockResolvedValue(undefined)
  vi.mocked(loadPdf).mockResolvedValue({ pageCount: 3, renderFirstPage })
  openLink()
})

describe('credencial del enlace', () => {
  test('consulta la solicitud con el token y lo quita de la barra de direcciones', async () => {
    const fetchMock = mockApi(json(200, signatureRequest()), pdfBytes())

    render(<App />)

    await screen.findByText('resolucion.pdf')
    expect(fetchMock).toHaveBeenNthCalledWith(1, expect.stringContaining(`/signature-requests/${REQUEST_ID}`), {
      headers: { 'X-Signing-Token': TOKEN },
    })
    expect(fetchMock).toHaveBeenNthCalledWith(2, DOWNLOAD_URL, { headers: { 'X-Signing-Token': TOKEN } })
    expect(window.location.hash).toBe('')
    expect(window.location.pathname).toBe(`/sign/${REQUEST_ID}`)
  })

  test('un enlace sin token muestra el error y no llama a la API', () => {
    openLink(`/sign/${REQUEST_ID}`)
    const fetchMock = mockApi()

    render(<App />)

    expect(screen.getByRole('alert')).toHaveTextContent('El enlace de firma está incompleto')
    expect(fetchMock).not.toHaveBeenCalled()
  })

  test('al recargar la pestaña sigue mostrando el documento', async () => {
    mockApi(json(200, signatureRequest()), pdfBytes(), json(200, signatureRequest()), pdfBytes())
    const first = render(<App />)
    await screen.findByText('resolucion.pdf')
    first.unmount()

    openLink(`/sign/${REQUEST_ID}`)
    render(<App />)

    expect(await screen.findByText('resolucion.pdf')).toBeInTheDocument()
  })
})

describe('datos y vista previa del documento', () => {
  test('muestra nombre, páginas, tamaño, estado y la primera página', async () => {
    mockApi(json(200, signatureRequest()), pdfBytes())

    render(<App />)

    expect(await screen.findByText('resolucion.pdf')).toBeInTheDocument()
    expect(await screen.findByText('3 páginas')).toBeInTheDocument()
    expect(screen.getByText('245 KB')).toBeInTheDocument()
    expect(screen.getByText('Pendiente de firma')).toBeInTheDocument()
    await waitFor(() => expect(renderFirstPage).toHaveBeenCalledWith(expect.any(HTMLCanvasElement)))
  })

  test('si la vista previa falla, sigue mostrando los datos', async () => {
    vi.mocked(loadPdf).mockRejectedValue(new Error('PDF ilegible'))
    mockApi(json(200, signatureRequest()), pdfBytes())

    render(<App />)

    expect(await screen.findByText('No se pudo generar la vista previa')).toBeInTheDocument()
    expect(screen.getByText('resolucion.pdf')).toBeInTheDocument()
    expect(screen.getByText('245 KB')).toBeInTheDocument()
    expect(screen.getByText('Pendiente de firma')).toBeInTheDocument()
  })
})

describe('métodos de firma', () => {
  test('«Firma propia» se ve con su aviso legal y el botón deshabilitado', async () => {
    mockApi(json(200, signatureRequest()), pdfBytes())

    render(<App />)

    expect(await screen.findByRole('heading', { name: 'Firma propia' })).toBeInTheDocument()
    expect(screen.getByText(/sin la presunción legal de la firma digital/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Firmar' })).toBeDisabled()
    expect(screen.getByText('Disponible próximamente')).toBeInTheDocument()
  })

  test('una solicitud firmada no ofrece métodos de firma', async () => {
    mockApi(json(200, signatureRequest({ status: 'signed', signed_at: '2026-11-16T11:00:00Z' })), pdfBytes())

    render(<App />)

    expect(await screen.findByText('Documento firmado')).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'Firma propia' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Firmar' })).not.toBeInTheDocument()
  })
})

describe('mensajes de error', () => {
  test('enlace vencido o inválido', async () => {
    mockApi(json(401, { code: 'unauthorized', message: 'Token de enlace vencido' }))

    render(<App />)

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'El enlace de firma venció o no es válido. Pedí uno nuevo.',
    )
    expect(screen.queryByText(/Token de enlace vencido/)).not.toBeInTheDocument()
  })

  test('solicitud inexistente', async () => {
    mockApi(json(404, { code: 'not_found', message: 'x' }))

    render(<App />)

    expect(await screen.findByRole('alert')).toHaveTextContent('No encontramos la solicitud de firma.')
  })

  test.each([
    ['respuesta 5xx', json(503, { code: 'database_unavailable', message: 'x' })],
    ['falla de red', new TypeError('Failed to fetch')],
  ])('API no disponible (%s) con «Reintentar»', async (_, failure) => {
    mockApi(failure, json(200, signatureRequest()), pdfBytes())

    render(<App />)

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'No pudimos conectar con Firmadoc. Intentá de nuevo en unos minutos.',
    )
    await userEvent.click(screen.getByRole('button', { name: 'Reintentar' }))
    expect(await screen.findByText('resolucion.pdf')).toBeInTheDocument()
  })

  test('el token no aparece en ningún mensaje', async () => {
    mockApi(json(401, { code: 'unauthorized', message: TOKEN }))

    const { container } = render(<App />)

    await screen.findByRole('alert')
    expect(container.textContent).not.toContain(TOKEN)
  })
})

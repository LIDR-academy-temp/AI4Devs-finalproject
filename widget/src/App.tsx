import { useEffect, useState } from 'react'
import { ApiError, createApi, type ApiErrorKind, type SignatureRequest } from './api'
import { DocumentCard, type PreviewState } from './DocumentCard'
import { readSigningLink } from './link'
import { SigningMethods } from './SigningMethods'
import './App.css'

const API_URL = import.meta.env.VITE_FIRMADOC_API_URL ?? 'http://localhost:8000/api/v1'

type ErrorKind = ApiErrorKind | 'incomplete_link'

type ScreenState =
  | { phase: 'loading' }
  | { phase: 'error'; kind: ErrorKind }
  | { phase: 'ready'; request: SignatureRequest; preview: PreviewState }

const ERROR_MESSAGES: Record<ErrorKind, string> = {
  incomplete_link: 'El enlace de firma está incompleto. Revisá que lo hayas copiado entero.',
  expired_link: 'El enlace de firma venció o no es válido. Pedí uno nuevo.',
  not_found: 'No encontramos la solicitud de firma.',
  unavailable: 'No pudimos conectar con Firmadoc. Intentá de nuevo en unos minutos.',
}

export default function App() {
  const [link] = useState(() => readSigningLink())
  const [state, setState] = useState<ScreenState>(() =>
    link.ok ? { phase: 'loading' } : { phase: 'error', kind: link.error },
  )
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    if (!link.ok) return
    let cancelled = false
    const api = createApi(API_URL, link.token)

    async function load(requestId: string) {
      setState({ phase: 'loading' })
      let request: SignatureRequest
      try {
        request = await api.getSignatureRequest(requestId)
      } catch (error) {
        if (!cancelled) setState({ phase: 'error', kind: error instanceof ApiError ? error.kind : 'unavailable' })
        return
      }
      if (cancelled) return
      setState({ phase: 'ready', request, preview: { status: 'loading' } })

      let preview: PreviewState
      try {
        const [bytes, { loadPdf }] = await Promise.all([
          api.downloadPdf(request.document.download_url),
          import('./pdfPreview'),
        ])
        preview = { status: 'ready', preview: await loadPdf(bytes) }
      } catch {
        preview = { status: 'failed' }
      }
      if (!cancelled) setState({ phase: 'ready', request, preview })
    }

    void load(link.requestId)
    return () => {
      cancelled = true
    }
  }, [link, attempt])

  return (
    <main className="widget">
      <header className="brand">Firmadoc</header>
      {state.phase === 'loading' && <p className="status">Cargando documento…</p>}
      {state.phase === 'error' && (
        <div role="alert" className="error">
          <p>{ERROR_MESSAGES[state.kind]}</p>
          {state.kind === 'unavailable' && (
            <button type="button" onClick={() => setAttempt((n) => n + 1)}>
              Reintentar
            </button>
          )}
        </div>
      )}
      {state.phase === 'ready' && (
        <>
          <DocumentCard request={state.request} preview={state.preview} />
          {state.request.status === 'signed' ? (
            <p className="done" role="status">
              Documento firmado
            </p>
          ) : (
            <SigningMethods />
          )}
        </>
      )}
    </main>
  )
}

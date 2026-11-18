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
  | { phase: 'ready'; request: SignatureRequest; preview: PreviewState; signingError: string | null }

type SigningPhase = 'idle' | 'preparing' | 'signing' | 'error'

function signingErrorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.kind === 'unavailable') return 'No pudimos completar la firma. Intentá de nuevo.'
    return 'El plazo de firma venció o ya no es válido. Volvé a pulsar Firmar.'
  }
  return 'No pudimos completar la firma. Intentá de nuevo.'
}

function notifyParent(document: SignatureRequest['document']) {
  window.parent.postMessage({ type: 'firmadoc:signed', document }, '*')
}

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
  const [signingPhase, setSigningPhase] = useState<SigningPhase>('idle')

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
      setState({ phase: 'ready', request, preview: { status: 'loading' }, signingError: null })

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
      if (!cancelled) setState((current) =>
        current.phase === 'ready' ? { ...current, preview } : { phase: 'ready', request, preview, signingError: null },
      )
    }

    void load(link.requestId)
    return () => {
      cancelled = true
    }
  }, [link, attempt])

  async function signLocal() {
    if (state.phase !== 'ready' || !link.ok) return
    const api = createApi(API_URL, link.token)
  const requestId = link.requestId
    setSigningPhase('preparing')
    setState((current) => (current.phase === 'ready' ? { ...current, signingError: null } : current))
    try {
      await api.prepareSignature(requestId)
      setSigningPhase('signing')
      const signed = await api.completeSignature(requestId)
      setSigningPhase('idle')
      setState({ phase: 'ready', request: signed, preview: state.phase === 'ready' ? state.preview : { status: 'loading' }, signingError: null })
      notifyParent(signed.document)
    } catch (error) {
      setSigningPhase('error')
      setState((current) =>
        current.phase === 'ready'
          ? { ...current, signingError: signingErrorMessage(error) }
          : current,
      )
    }
  }

  async function downloadSigned() {
    if (state.phase !== 'ready' || !link.ok) return
    const api = createApi(API_URL, link.token)
    const bytes = await api.downloadPdf(state.request.document.download_url)
    const blob = new Blob([bytes], { type: 'application/pdf' })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = state.request.document.file_name
    anchor.click()
    URL.revokeObjectURL(url)
  }

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
          {state.request.status === 'signed' && state.request.provider !== 'local' ? (
            <p className="done" role="status">
              Documento firmado
            </p>
          ) : (
            <SigningMethods
              request={state.request}
              phase={signingPhase}
              errorMessage={state.signingError}
              onSign={() => void signLocal()}
              onDownload={() => void downloadSigned()}
            />
          )}
        </>
      )}
    </main>
  )
}

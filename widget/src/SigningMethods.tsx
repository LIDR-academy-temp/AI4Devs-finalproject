import type { SignatureRequest } from './api'

export type SigningPhase = 'idle' | 'preparing' | 'signing' | 'error'

type Props = {
  request: SignatureRequest
  phase: SigningPhase
  errorMessage: string | null
  onSign: () => void
  onDownload: () => void
}

export function SigningMethods({ request, phase, errorMessage, onSign, onDownload }: Props) {
  const localEnabled = request.provider === 'local' && request.status !== 'signed'
  const busy = phase === 'preparing' || phase === 'signing'

  return (
    <section className="card" aria-labelledby="methods-title">
      <h2 id="methods-title">Elegí cómo firmar</h2>
      <article className="method" aria-labelledby="method-local">
        <h3 id="method-local">Firma propia</h3>
        <p>
          Firma electrónica con el certificado de Firmadoc: es inmediata, pero sin la presunción legal de la firma
          digital.
        </p>
        <button type="button" disabled={!localEnabled || busy} onClick={onSign} aria-describedby="method-local-status">
          {phase === 'preparing' ? 'Preparando…' : phase === 'signing' ? 'Firmando…' : 'Firmar'}
        </button>
        <span id="method-local-status" className="method-status">
          {!localEnabled ? 'Disponible próximamente para este proveedor' : null}
        </span>
        {errorMessage ? (
          <p className="error-inline" role="alert">
            {errorMessage}
          </p>
        ) : null}
        {request.status === 'signed' ? (
          <p className="done" role="status">
            Documento firmado (v{request.document.version_number}).{' '}
            <button type="button" className="linkish" onClick={onDownload}>
              Descargar firmado
            </button>
          </p>
        ) : null}
      </article>
    </section>
  )
}
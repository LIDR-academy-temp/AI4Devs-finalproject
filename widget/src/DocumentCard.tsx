import { useEffect, useRef, useState } from 'react'
import type { SignatureRequest } from './api'
import { formatPages, formatSize, statusLabel } from './format'
import type { PdfPreview } from './pdfPreview'

export type PreviewState =
  | { status: 'loading' }
  | { status: 'ready'; preview: PdfPreview }
  | { status: 'failed' }

interface Props {
  request: SignatureRequest
  preview: PreviewState
}

export function DocumentCard({ request, preview }: Props) {
  const { document } = request

  return (
    <section className="card" aria-labelledby="document-title">
      <h1 id="document-title" className="document-name">
        {document.file_name}
      </h1>
      <dl className="document-facts">
        {preview.status === 'ready' && (
          <div>
            <dt>Páginas</dt>
            <dd>{formatPages(preview.preview.pageCount)}</dd>
          </div>
        )}
        <div>
          <dt>Tamaño</dt>
          <dd>{formatSize(document.size_bytes)}</dd>
        </div>
        <div>
          <dt>Estado</dt>
          <dd>{statusLabel(request.status)}</dd>
        </div>
      </dl>
      <PreviewCanvas state={preview} />
    </section>
  )
}

function PreviewCanvas({ state }: { state: PreviewState }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [renderFailed, setRenderFailed] = useState(false)

  useEffect(() => {
    if (state.status !== 'ready' || !canvasRef.current) return
    state.preview.renderFirstPage(canvasRef.current).catch(() => setRenderFailed(true))
  }, [state])

  if (state.status === 'failed' || renderFailed) {
    return <p className="preview-message">No se pudo generar la vista previa</p>
  }
  if (state.status === 'loading') {
    return <p className="preview-message">Cargando vista previa…</p>
  }
  return <canvas ref={canvasRef} className="preview" aria-label="Vista previa de la primera página" />
}

import { useEffect, useState } from 'react'
import QRCode from 'qrcode'
import { Copy, Mail, MessageCircle } from 'lucide-react'
import type { PaseVisita } from '../../shared/types/visitasPase'
import { mailShareHref, vigenciaPaseTexto, whatsAppShareHref } from './visitasPaseSchemas'

interface PaseQrCardProps {
  pase: PaseVisita
}

export function PaseQrCard({ pase }: PaseQrCardProps) {
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    let cancelled = false
    void QRCode.toDataURL(pase.codigoQr, { width: 220, margin: 2 }).then((url) => {
      if (!cancelled) setQrDataUrl(url)
    })
    return () => {
      cancelled = true
    }
  }, [pase.codigoQr])

  const waHref = whatsAppShareHref(pase.codigoQr, pase)
  const emailHref = mailShareHref(pase.codigoQr, pase)

  const copyCode = async () => {
    try {
      await navigator.clipboard.writeText(pase.codigoQr)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 2000)
    } catch {
      setCopied(false)
    }
  }

  return (
    <article className="cq-portal-pase-qr-card">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
        <div className="flex shrink-0 flex-col items-center gap-2">
          {qrDataUrl ? (
            <img src={qrDataUrl} alt={`Código QR del pase ${pase.codigoQr}`} className="h-[220px] w-[220px]" />
          ) : (
            <div className="h-[220px] w-[220px] animate-pulse rounded-lg bg-neutral-100" aria-hidden />
          )}
          <p className="max-w-[220px] break-all text-center font-mono text-[0.65rem] text-neutral-500">{pase.codigoQr}</p>
        </div>
        <div className="min-w-0 flex-1 space-y-3">
          <div>
            <h3 className="truncate text-lg font-semibold text-neutral-800">{pase.nombreVisitante}</h3>
            <p className="text-sm text-neutral-600">{vigenciaPaseTexto(pase)}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <a
              href={waHref}
              target="_blank"
              rel="noopener noreferrer"
              data-testid="whatsapp-share"
              className="inline-flex cursor-pointer items-center gap-2 rounded-lg bg-success px-3 py-2 text-sm font-medium text-white hover:opacity-90"
            >
              <MessageCircle className="h-4 w-4" aria-hidden />
              Compartir WhatsApp
            </a>
            <a
              href={emailHref}
              data-testid="email-share"
              className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-neutral-300 px-3 py-2 text-sm font-medium text-neutral-700 hover:bg-surface-alt"
            >
              <Mail className="h-4 w-4" aria-hidden />
              Enviar por correo
            </a>
            <button
              type="button"
              onClick={() => void copyCode()}
              className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-neutral-300 px-3 py-2 text-sm font-medium text-neutral-700 hover:bg-surface-alt disabled:opacity-50"
            >
              <Copy className="h-4 w-4" aria-hidden />
              {copied ? 'Copiado' : 'Copiar código'}
            </button>
          </div>
        </div>
      </div>
    </article>
  )
}

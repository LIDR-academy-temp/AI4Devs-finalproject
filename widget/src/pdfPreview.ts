import { GlobalWorkerOptions, getDocument } from 'pdfjs-dist'
import workerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url'

GlobalWorkerOptions.workerSrc = workerUrl

const PREVIEW_WIDTH_PX = 480

export interface PdfPreview {
  pageCount: number
  renderFirstPage(canvas: HTMLCanvasElement): Promise<void>
}

export async function loadPdf(bytes: ArrayBuffer): Promise<PdfPreview> {
  const pdf = await getDocument({ data: new Uint8Array(bytes) }).promise

  return {
    pageCount: pdf.numPages,
    async renderFirstPage(canvas) {
      const page = await pdf.getPage(1)
      const unscaled = page.getViewport({ scale: 1 })
      const viewport = page.getViewport({ scale: (PREVIEW_WIDTH_PX / unscaled.width) * window.devicePixelRatio })
      canvas.width = Math.floor(viewport.width)
      canvas.height = Math.floor(viewport.height)
      await page.render({ canvas, viewport }).promise
    },
  }
}

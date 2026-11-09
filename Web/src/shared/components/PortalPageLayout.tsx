import type { ReactNode } from 'react'
import 'bootstrap/dist/css/bootstrap.min.css'
import '../../styles/bootstrap-pantone.css'
import '../../styles/cq-portal.css'

const WIDTH_CLASS = {
  fluid: '',
  '2xl': 'mx-auto max-w-2xl',
  '3xl': 'mx-auto max-w-3xl',
  '4xl': 'mx-auto max-w-4xl',
  '5xl': 'mx-auto max-w-5xl',
} as const

export type PortalPageWidth = keyof typeof WIDTH_CLASS

export type PortalPageLayoutProps = {
  children: ReactNode
  /** Ancho máximo del card; `fluid` = ancho completo del área de contenido */
  width?: PortalPageWidth
  className?: string
}

/** Contenedor portal (residente/trabajador): mismo recuadro visual que páginas admin. */
export function PortalPageLayout({
  children,
  width = 'fluid',
  className = '',
}: PortalPageLayoutProps) {
  const widthClass = WIDTH_CLASS[width]

  return (
    <div className="cq-admin-page container-fluid py-4">
      <div className={`card cq-portal-page-card border-0 shadow-sm ${widthClass}`.trim()}>
        <div className={`card-body ${className}`.trim()}>{children}</div>
      </div>
    </div>
  )
}

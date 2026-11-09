import type { ComponentPropsWithoutRef, ReactNode } from 'react'
import { portalDataTable, portalDataTableWrap } from './portalClassNames'

export type PortalDataTableProps = {
  children: ReactNode
  className?: string
  wrapClassName?: string
}

export function PortalDataTable({ children, className = '', wrapClassName = '' }: PortalDataTableProps) {
  return (
    <div className={`${portalDataTableWrap} overflow-x-auto ${wrapClassName}`.trim()}>
      <table className={`${portalDataTable} ${className}`.trim()}>{children}</table>
    </div>
  )
}

export function PortalDataTableHead(props: ComponentPropsWithoutRef<'thead'>) {
  return <thead {...props} />
}

export function PortalDataTableBody(props: ComponentPropsWithoutRef<'tbody'>) {
  return <tbody {...props} />
}

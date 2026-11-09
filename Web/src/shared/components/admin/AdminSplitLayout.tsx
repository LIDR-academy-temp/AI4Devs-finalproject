import type { ReactNode } from 'react'

export type AdminSplitLayoutProps = {
  panelOpen: boolean
  tablePane: ReactNode
  formPane: ReactNode
}

export function AdminSplitLayout({ panelOpen, tablePane, formPane }: AdminSplitLayoutProps) {
  return (
    <div className={`cq-split${panelOpen ? ' panel-open' : ''}`}>
      <div className="cq-table-pane">{tablePane}</div>
      <div className="cq-form-pane">{formPane}</div>
    </div>
  )
}

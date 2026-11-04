import type { ReactNode } from 'react'
import { AdminListToolbar } from './AdminListToolbar'
import { AdminSidePanel } from './AdminSidePanel'
import { AdminSplitLayout } from './AdminSplitLayout'
import { ConfirmDialog, type ConfirmDialogProps } from './ConfirmDialog'

export type AdminCatalogCrudShellProps = {
  toolbarTitle: string
  metricLabel: string
  count: number
  createLabel: string
  createIconClass?: string
  onCreate: () => void
  panelOpen: boolean
  panelTitle: string
  panelSubtitle: string
  panelIconClass: string
  editing: boolean
  onClosePanel: () => void
  formFooter: ReactNode
  panelChildren: ReactNode
  topBanner?: ReactNode
  loading: boolean
  isEmpty: boolean
  emptyIconClass: string
  emptyTitle: string
  emptyDescription: string
  tableHead: ReactNode
  tableBody: ReactNode
  mobileList?: ReactNode
  deleteDialog: ConfirmDialogProps
}

export function AdminCatalogCrudShell({
  toolbarTitle,
  metricLabel,
  count,
  createLabel,
  createIconClass = 'mdi mdi-plus',
  onCreate,
  panelOpen,
  panelTitle,
  panelSubtitle,
  panelIconClass,
  editing,
  onClosePanel,
  formFooter,
  panelChildren,
  topBanner,
  loading,
  isEmpty,
  emptyIconClass,
  emptyTitle,
  emptyDescription,
  tableHead,
  tableBody,
  mobileList,
  deleteDialog,
}: AdminCatalogCrudShellProps) {
  return (
    <>
      <AdminListToolbar
        title={toolbarTitle}
        metrics={[{ label: metricLabel, value: count }]}
        primaryAction={{
          label: createLabel,
          iconClass: createIconClass,
          onClick: onCreate,
        }}
      />

      {topBanner}

      <AdminSplitLayout
        panelOpen={panelOpen}
        tablePane={
          <div className="card">
            <div className="card-body pt-3">
              {loading && (
                <div className="placeholder-glow" aria-label={`Cargando ${toolbarTitle.toLowerCase()}`}>
                  <span className="placeholder col-12 mb-2" />
                  <span className="placeholder col-10" />
                </div>
              )}

              {!loading && isEmpty && (
                <div className="cq-empty-state">
                  <i className={`${emptyIconClass} cq-empty-icon`} />
                  <p className="cq-empty-title">{emptyTitle}</p>
                  <p className="text-muted">{emptyDescription}</p>
                  <button type="button" className="btn btn-primary btn-sm mt-2" onClick={onCreate}>
                    {createLabel}
                  </button>
                </div>
              )}

              {!loading && !isEmpty && (
                <>
                  <div className="table-responsive cq-admin-table-pane">
                    <table className="table table-striped table-hover align-middle mb-0">
                      <thead>{tableHead}</thead>
                      <tbody>{tableBody}</tbody>
                    </table>
                  </div>
                  {mobileList}
                </>
              )}
            </div>
          </div>
        }
        formPane={
          <AdminSidePanel
            visible={panelOpen}
            title={panelTitle}
            subtitle={panelSubtitle}
            iconClass={panelIconClass}
            editing={editing}
            onClose={onClosePanel}
            footer={formFooter}
          >
            {panelChildren}
          </AdminSidePanel>
        }
      />

      <ConfirmDialog {...deleteDialog} />
    </>
  )
}

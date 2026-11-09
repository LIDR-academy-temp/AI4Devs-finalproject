import type { ReactNode } from 'react'
import { EmptyState } from './EmptyState'

export type AdminDataTableColumn = {
  id: string
  header: string
  className?: string
}

export type AdminDataTableProps = {
  columns: AdminDataTableColumn[]
  loading?: boolean
  isEmpty?: boolean
  emptyTitle?: string
  emptyDescription?: string
  emptyAction?: ReactNode
  children: ReactNode
}

function TableSkeleton({ colCount }: { colCount: number }) {
  return (
    <tbody>
      {[0, 1, 2].map((row) => (
        <tr key={row} className="border-t border-neutral-100">
          {Array.from({ length: colCount }).map((_, col) => (
            <td key={col} className="px-3 py-3">
              <div className="h-4 animate-pulse rounded bg-neutral-100" />
            </td>
          ))}
        </tr>
      ))}
    </tbody>
  )
}

export function AdminDataTable({
  columns,
  loading = false,
  isEmpty = false,
  emptyTitle = 'Sin registros',
  emptyDescription,
  emptyAction,
  children,
}: AdminDataTableProps) {
  return (
    <div className="overflow-x-auto rounded border border-neutral-100 bg-white">
      <table className="min-w-full text-left text-sm">
        <thead className="bg-surface text-neutral">
          <tr>
            {columns.map((col) => (
              <th key={col.id} className={`px-3 py-2 font-medium ${col.className ?? ''}`}>
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        {loading ? (
          <TableSkeleton colCount={columns.length} />
        ) : isEmpty ? (
          <tbody>
            <tr>
              <td colSpan={columns.length}>
                <EmptyState title={emptyTitle} description={emptyDescription} action={emptyAction} />
              </td>
            </tr>
          </tbody>
        ) : (
          <tbody>{children}</tbody>
        )}
      </table>
    </div>
  )
}

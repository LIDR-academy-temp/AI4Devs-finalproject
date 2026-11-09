import { Inbox } from 'lucide-react'
import type { ReactNode } from 'react'

export type EmptyStateProps = {
  title: string
  description?: string
  action?: ReactNode
  icon?: ReactNode
}

export function EmptyState({ title, description, action, icon }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center gap-2 px-4 py-8 text-center">
      <div className="text-neutral-300" aria-hidden="true">
        {icon ?? <Inbox className="h-8 w-8" />}
      </div>
      <p className="text-base font-medium text-neutral-900">{title}</p>
      {description && <p className="max-w-md text-sm text-neutral">{description}</p>}
      {action && <div className="mt-2">{action}</div>}
    </div>
  )
}

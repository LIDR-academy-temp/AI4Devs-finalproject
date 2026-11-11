import { useQuery } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { usePutGlobals } from './mutations'
import { useCanEditGlobals } from './permissions'
import { globalRulesQuery } from './queries'
import { RulesEditor } from './RulesEditor'
import { globalsBody } from './rule-form'
import { strings } from './strings'

const g = strings.global

/**
 * Administration › Matching Rules › Global defaults: read by every role; edited with account.manage and the scope
 * all, because they apply to every account without a set (web-admin-matching design D2, D3, D8).
 */
export function GlobalRulesPage() {
  const globals = useQuery(globalRulesQuery)
  const canEdit = useCanEditGlobals()
  const put = usePutGlobals()

  let body: ReactNode
  if (globals.isError) {
    body = (
      <div className="flex items-center gap-3 text-sm">
        <span>{g.loadError}</span>
        <Button variant="outline" size="sm" onClick={() => void globals.refetch()}>
          {strings.retry}
        </Button>
      </div>
    )
  } else if (!globals.data) {
    body = <Skeleton className="h-48 w-full" aria-label={g.loading} />
  } else {
    body = (
      <RulesEditor
        doc={globals.data}
        statuses={globals.data.statuses}
        canEdit={canEdit}
        save={(rules, reason) => put.mutateAsync(globalsBody(rules, reason))}
      />
    )
  }

  return (
    <section className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold">{g.title}</h1>
        <p className="text-sm text-muted-foreground">{g.intro}</p>
      </div>
      {body}
    </section>
  )
}

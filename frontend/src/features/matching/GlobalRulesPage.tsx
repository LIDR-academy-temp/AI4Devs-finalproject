import { useQuery } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { useCanEditGlobals } from './permissions'
import { globalRulesQuery } from './queries'
import { ColumnRulesTable, RowsToIgnore, RulesCard, SheetRulesTable, StatusAliasesTable } from './rule-tables'
import { strings } from './strings'

const g = strings.global

/** Administration › Matching Rules › Global defaults: read by every role (web-admin-matching design D2, D3). */
export function GlobalRulesPage() {
  const globals = useQuery(globalRulesQuery)
  const canEdit = useCanEditGlobals()

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
    const data = globals.data
    body = (
      <>
        <RulesCard
          title={strings.tables.sheets}
          actions={
            canEdit && (
              <Button size="sm" variant="outline">
                {strings.detail.actions.edit}
              </Button>
            )
          }
        >
          <SheetRulesTable rules={data.sheetRules} statuses={data.statuses} />
        </RulesCard>
        <RulesCard title={strings.tables.columns}>
          <ColumnRulesTable rules={data.columnRules} />
        </RulesCard>
        <RulesCard title={strings.tables.aliases}>
          <StatusAliasesTable aliases={data.statusAliases} statuses={data.statuses} />
        </RulesCard>
        <RowsToIgnore rules={data.rowIgnoreRules} />
      </>
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

import { useQuery } from '@tanstack/react-query'
import { Link, useNavigate, useSearch } from '@tanstack/react-router'
import { type ReactNode, useCallback, useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Dialog, DialogTrigger } from '@/components/ui/dialog'
import { Skeleton } from '@/components/ui/skeleton'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { ProviderChoiceFields, type ProviderChoiceSearch, useProviderChoice } from '@/features/accounts/provider-choice'
import { NewRuleSetDialog } from './NewRuleSetDialog'
import { useCanManageRules } from './permissions'
import { matchingRuleSetsQuery } from './queries'
import { strings } from './strings'

const s = strings.list
const linkClass = 'text-primary underline underline-offset-4'

function ProviderRuleSets({ providerId, providerName }: { providerId: number; providerName: string | undefined }) {
  const ruleSets = useQuery(matchingRuleSetsQuery(providerId))
  const canManage = useCanManageRules()
  const [creating, setCreating] = useState(false)

  let body: ReactNode
  if (ruleSets.isError) {
    body = (
      <div className="flex items-center gap-3 text-sm">
        <span>{s.loadError}</span>
        <Button variant="outline" size="sm" onClick={() => void ruleSets.refetch()}>
          {strings.retry}
        </Button>
      </div>
    )
  } else if (!ruleSets.data) {
    body = <Skeleton className="h-24 w-full" aria-label={s.loading} />
  } else if (ruleSets.data.length === 0) {
    body = <p className="text-sm text-muted-foreground">{s.empty}</p>
  } else {
    body = (
      <Table aria-label={s.tableLabel}>
        <TableHeader>
          <TableRow>
            <TableHead>{s.columns.ruleSet}</TableHead>
            <TableHead>{s.columns.status}</TableHead>
            <TableHead>{s.columns.accounts}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {ruleSets.data.map((ruleSet) => (
            <TableRow key={ruleSet.ruleSetId}>
              <TableCell className="font-medium whitespace-normal [overflow-wrap:anywhere]">
                <Link
                  to="/matching-rules/$ruleSetId"
                  params={{ ruleSetId: String(ruleSet.ruleSetId) }}
                  className={linkClass}
                >
                  {ruleSet.name}
                </Link>
              </TableCell>
              <TableCell>
                <Badge variant={ruleSet.isActive ? 'success' : 'neutral'}>
                  {ruleSet.isActive ? strings.active : strings.inactive}
                </Badge>
              </TableCell>
              <TableCell className="whitespace-normal">
                {ruleSet.accounts.length === 0 ? (
                  <span className="text-muted-foreground">{s.noAccounts}</span>
                ) : (
                  ruleSet.accounts.map((a) => a.name).join(', ')
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    )
  }

  return (
    <section className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="font-medium">{providerName ? s.heading(providerName) : s.headingNoName}</h2>
        {canManage && (
          <Dialog open={creating} onOpenChange={setCreating}>
            <DialogTrigger asChild>
              <Button size="sm" variant="outline">
                {s.newRuleSet}
              </Button>
            </DialogTrigger>
            {creating && <NewRuleSetDialog providerId={providerId} />}
          </Dialog>
        )}
      </div>
      {body}
    </section>
  )
}

/** Administration › Matching Rules: the global defaults and the rule sets of a provider (web-admin-matching D1–D3). */
export function MatchingRulesPage() {
  const search = useSearch({ from: '/app/matching-rules' })
  const navigate = useNavigate({ from: '/matching-rules' })
  const choice = useProviderChoice({
    search,
    navigate: useCallback(
      (next: ProviderChoiceSearch, options: { replace?: boolean; resetScroll?: boolean }) =>
        void navigate({ search: next, ...options }),
      [navigate],
    ),
  })
  const providerName = choice.providers.find((p) => p.providerId === choice.providerId)?.name

  return (
    <section className="flex flex-col gap-4">
      <h1 className="text-2xl font-semibold">{strings.title}</h1>
      <Card>
        <CardContent className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
          <Link to="/matching-rules/global" className={`font-medium ${linkClass}`}>
            {s.globalDefaults}
          </Link>
          <span className="text-sm text-muted-foreground">{s.globalHint}</span>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="flex flex-col gap-4">
          <ProviderChoiceFields choice={choice} />
          {choice.notAvailable ? (
            <p className="text-sm">{s.notAvailable}</p>
          ) : choice.providerId !== undefined ? (
            <ProviderRuleSets key={choice.providerId} providerId={choice.providerId} providerName={providerName} />
          ) : (
            <p className="text-sm text-muted-foreground">{s.chooseHint}</p>
          )}
        </CardContent>
      </Card>
    </section>
  )
}

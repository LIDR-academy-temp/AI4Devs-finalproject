import { useQuery } from '@tanstack/react-query'
import { useParams } from '@tanstack/react-router'
import type { ReactNode } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { auditInstant, formatAuditDate, formatAuditDateTime, formatDecimal } from '@/lib/format'
import { AccountChannels } from './AccountChannels'
import type { AccountDetail } from './contract'
import { accountQuery, matchingRuleSetsQuery } from './queries'
import { strings } from './strings'

const g = strings.detail.general

/**
 * The rule set by its name. Without it (the read failed or the set is not listed) the id is enough: the Overview
 * does not block on it (spec accounts "Pantalla Account Detail: carga y errores").
 */
function RuleSetName({ account }: { account: AccountDetail }) {
  const ruleSetId = account.matchingRuleSetId
  const ruleSets = useQuery({ ...matchingRuleSetsQuery(account.providerId), enabled: ruleSetId !== null })
  if (ruleSetId === null) return g.globalRules
  if (ruleSets.isPending) return <Skeleton className="inline-block h-4 w-32 align-middle" />
  return ruleSets.data?.find((r) => r.ruleSetId === ruleSetId)?.name ?? g.ruleSet(ruleSetId)
}

function General({ account }: { account: AccountDetail }) {
  const rows: [string, ReactNode][] = [
    [g.merchantProvider, strings.detail.hierarchy(account.merchant.name, account.provider.name)],
    [g.policy, account.chargebackReservePolicy],
    [g.cap, account.rollingReserveCapAmt === null ? strings.none : formatDecimal(account.rollingReserveCapAmt)],
    [g.matchingRules, <RuleSetName key="rules" account={account} />],
    [g.created, g.createdBy(formatAuditDate(auditInstant(account.createdAt)), account.createdBy.userName)],
    [g.lastChange, formatAuditDateTime(auditInstant(account.updatedAt))],
  ]
  return (
    <Card>
      <CardContent className="flex flex-col gap-4">
        <h2 className="font-medium">{g.heading}</h2>
        <dl className="grid grid-cols-[minmax(0,14rem)_1fr] gap-x-6 gap-y-2 text-sm">
          {rows.map(([label, value]) => (
            <div key={label} className="contents">
              <dt className="text-muted-foreground">{label}</dt>
              <dd className="tabular-nums">{value}</dd>
            </div>
          ))}
        </dl>
      </CardContent>
    </Card>
  )
}

/** The Overview tab of Account Detail: the data of the account and its channels (web-admin-accounts design D4). */
export function AccountOverview() {
  const { accountId } = useParams({ from: '/app/accounts/$accountId/' })
  const account = useQuery(accountQuery(accountId))
  return (
    <div className="grid gap-4 xl:grid-cols-2">
      {account.data ? <General account={account.data} /> : <Skeleton className="h-48 w-full" />}
      <AccountChannels accountId={accountId} />
    </div>
  )
}

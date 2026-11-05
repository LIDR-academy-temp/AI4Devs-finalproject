// The tables of matching rules in read mode (web-admin-matching design D3, D5): sheet rules, column rules, status
// aliases and the read-only rows to ignore. Rules are shown in the order of the API, never reordered here.
import type { ColumnRule, MatchingStatus, RowIgnoreRule, SheetRule, StatusAlias } from '@recon/shared'
import type { ReactNode } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { strings } from './strings'

const t = strings.tables
const h = t.head

const yesNo = (value: boolean) => (value ? strings.yes : strings.no)
const code = 'font-mono text-xs [overflow-wrap:anywhere] whitespace-normal'

/** The name of a status of the catalog, its id when the catalog is not available, `—` for none. */
export function statusName(statuses: readonly MatchingStatus[] | undefined, statusId: number | null): string {
  if (statusId === null) return strings.none
  return statuses?.find((s) => s.statusId === statusId)?.name ?? t.status(statusId)
}

/** A card with its heading, an optional toolbar next to it and the table (or the empty text). */
export function RulesCard({
  title,
  actions,
  children,
  footer,
}: {
  title: string
  actions?: ReactNode
  children: ReactNode
  footer?: ReactNode
}) {
  return (
    <Card>
      <CardContent className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="font-medium">{title}</h2>
          {actions}
        </div>
        {children}
        {footer}
      </CardContent>
    </Card>
  )
}

const Empty = ({ children }: { children: ReactNode }) => <p className="text-sm text-muted-foreground">{children}</p>

export function SheetRulesTable({
  rules,
  statuses,
}: {
  rules: readonly SheetRule[]
  statuses: readonly MatchingStatus[] | undefined
}) {
  if (rules.length === 0) return <Empty>{t.noSheets}</Empty>
  return (
    <Table aria-label={t.sheets}>
      <TableHeader>
        <TableRow>
          <TableHead>{h.pattern}</TableHead>
          <TableHead>{h.regex}</TableHead>
          <TableHead>{h.kind}</TableHead>
          <TableHead>{h.cycle}</TableHead>
          <TableHead>{h.status}</TableHead>
          <TableHead>{h.priority}</TableHead>
          <TableHead>{h.active}</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rules.map((rule) => (
          <TableRow key={rule.sheetRuleId}>
            <TableCell className={code}>{rule.sheetPattern}</TableCell>
            <TableCell>{yesNo(rule.isRegex)}</TableCell>
            <TableCell>{rule.kind}</TableCell>
            <TableCell>{rule.cycle ?? strings.none}</TableCell>
            <TableCell>{statusName(statuses, rule.statusId)}</TableCell>
            <TableCell className="tabular-nums">{rule.priority}</TableCell>
            <TableCell>{yesNo(rule.isActive)}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}

export function ColumnRulesTable({ rules }: { rules: readonly ColumnRule[] }) {
  if (rules.length === 0) return <Empty>{t.noColumns}</Empty>
  return (
    <Table aria-label={t.columns}>
      <TableHeader>
        <TableRow>
          <TableHead>{h.sheet}</TableHead>
          <TableHead>{h.pattern}</TableHead>
          <TableHead>{h.regex}</TableHead>
          <TableHead>{h.field}</TableHead>
          <TableHead>{h.priority}</TableHead>
          <TableHead>{h.active}</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rules.map((rule) => (
          <TableRow key={rule.columnRuleId}>
            <TableCell className={rule.sheetPattern === null ? undefined : code}>
              {rule.sheetPattern ?? t.anySheet}
            </TableCell>
            <TableCell className={code}>{rule.columnPattern}</TableCell>
            <TableCell>{yesNo(rule.isRegex)}</TableCell>
            <TableCell>{rule.targetField}</TableCell>
            <TableCell className="tabular-nums">{rule.priority}</TableCell>
            <TableCell>{yesNo(rule.isActive)}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}

export function StatusAliasesTable({
  aliases,
  statuses,
}: {
  aliases: readonly StatusAlias[]
  statuses: readonly MatchingStatus[]
}) {
  if (aliases.length === 0) return <Empty>{t.noAliases}</Empty>
  return (
    <Table aria-label={t.aliases}>
      <TableHeader>
        <TableRow>
          <TableHead>{h.text}</TableHead>
          <TableHead>{h.status}</TableHead>
          <TableHead>{h.amount}</TableHead>
          <TableHead>{h.legacy}</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {aliases.map((alias) => (
          <TableRow key={alias.alias}>
            <TableCell className={code}>{alias.alias}</TableCell>
            <TableCell>{statusName(statuses, alias.statusId)}</TableCell>
            <TableCell>{alias.excludeAmount ? t.excluded : t.counted}</TableCell>
            <TableCell>{alias.isLegacy ? t.legacy : strings.none}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}

/** Read-only everywhere, also in edit mode: the engine does not apply them yet (#120, design D5). */
export function RowsToIgnore({ rules }: { rules: readonly RowIgnoreRule[] }) {
  return (
    <section aria-label={t.rowsToIgnore}>
      <RulesCard title={t.rowsToIgnore} footer={<p className="text-xs text-muted-foreground">{t.notApplied}</p>}>
        {rules.length === 0 ? (
          <Empty>{t.noRowsToIgnore}</Empty>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{h.pattern}</TableHead>
                <TableHead>{h.regex}</TableHead>
                <TableHead>{h.description}</TableHead>
                <TableHead>{h.active}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rules.map((rule) => (
                <TableRow key={rule.rowIgnoreId}>
                  <TableCell className={code}>{rule.pattern}</TableCell>
                  <TableCell>{yesNo(rule.isRegex)}</TableCell>
                  <TableCell className="whitespace-normal">{rule.description ?? strings.none}</TableCell>
                  <TableCell>{yesNo(rule.isActive)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </RulesCard>
    </section>
  )
}

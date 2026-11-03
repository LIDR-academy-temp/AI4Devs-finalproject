import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { FEE_STATUS_TONE, toneOf } from '@/lib/status-tone'
import type { AccountFee } from './contract'
import { FeeHistorySheet } from './FeeHistorySheet'
import type { FeeTypeInfo } from './FeesTable'
import { feeAppliesTo, formatFeeValue, formatValidFrom, formatValidTo } from './fee-display'
import { strings } from './strings'

const s = strings.account

export type FeeAction = 'edit' | 'change' | 'close'

/**
 * What a row offers (spec fees "Pantalla Account Fees: acciones según permiso y uso"): only with fee.manage, Edit
 * always (full or limited by use, decided by the form), Change from date… only for a fee in use, Close… only while the
 * fee is not closed and has no end. Never an action that withdraws or deletes a fee.
 */
export function actionsFor(fee: AccountFee, canManage: boolean): FeeAction[] {
  if (!canManage) return []
  const actions: FeeAction[] = ['edit']
  if (fee.inUse) actions.push('change')
  if (fee.status !== 'closed' && fee.endDate === null) actions.push('close')
  return actions
}

const LABEL: Record<FeeAction, string> = { edit: s.actions.edit, change: s.actions.change, close: s.actions.close }

/** Every fee of the account, in the order of the API, with the actions the user may take on each. */
export function AccountFeesTable({
  fees,
  feeTypes,
  canManage,
  onAction,
}: {
  fees: AccountFee[]
  feeTypes: readonly FeeTypeInfo[] | undefined
  canManage: boolean
  onAction: (action: FeeAction, fee: AccountFee) => void
}) {
  return (
    <div className="max-w-full overflow-x-auto rounded-md border bg-background">
      <Table aria-label={s.tableLabel} className="text-sm">
        <TableHeader>
          <TableRow>
            {Object.entries(s.columns).map(([key, label]) => (
              <TableHead key={key} className={key === 'value' ? 'whitespace-normal text-right' : 'whitespace-normal'}>
                {label}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {fees.map((fee) => (
            <TableRow key={fee.feeId} className={fee.status === 'closed' ? 'text-muted-foreground' : undefined}>
              {/* The type and the actions wrap so the table fits at 1024 px; figures and days stay on one line. */}
              <TableCell className="whitespace-normal font-medium">{fee.title}</TableCell>
              <TableCell className="whitespace-nowrap">{feeAppliesTo(fee.feeTypeId, feeTypes)}</TableCell>
              <TableCell className="whitespace-nowrap text-right tabular-nums">{formatFeeValue(fee)}</TableCell>
              <TableCell className="whitespace-nowrap tabular-nums">{formatValidFrom(fee.startDate)}</TableCell>
              <TableCell className="whitespace-nowrap tabular-nums">{formatValidTo(fee.endDate)}</TableCell>
              <TableCell>
                <Badge variant={toneOf(FEE_STATUS_TONE, fee.status)}>{strings.status[fee.status]}</Badge>
              </TableCell>
              <TableCell>{fee.inUse ? s.inUse : ''}</TableCell>
              <TableCell className="whitespace-normal">
                {actionsFor(fee, canManage).map((action) => (
                  <Button
                    key={action}
                    variant="link"
                    size="sm"
                    className="h-auto px-1"
                    aria-label={s.actionNames[action](s.feeName(fee.title, fee.startDate))}
                    onClick={() => onAction(action, fee)}
                  >
                    {LABEL[action]}
                  </Button>
                ))}
                <FeeHistorySheet fee={fee} />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}

// Fields offered per sheet type (design D5). `gateway` is never offered: the API rejects it (spec "Campo gateway no
// admitido todavía"). `null` is "Keep as reference": the column stays in rawData without a field.
import type { SheetKind, TargetField } from '@recon/shared'
import { strings } from '../strings'

export type OfferedField = Exclude<TargetField, 'gateway'>

export const FIELDS_BY_KIND: Record<Exclude<SheetKind, 'ignore'>, readonly OfferedField[]> = {
  transactions: ['transactionId', 'status', 'amount', 'currency', 'txnDate', 'providerRef', 'orderId', 'reference'],
  batch_fees: ['feeType', 'amount', 'currency'],
}

export function fieldsFor(kind: SheetKind | null): readonly OfferedField[] {
  return kind === 'transactions' || kind === 'batch_fees' ? FIELDS_BY_KIND[kind] : []
}

export function fieldLabel(field: TargetField | null): string {
  return field === null ? strings.mapping.keepAsReference : strings.mapping.fields[field]
}

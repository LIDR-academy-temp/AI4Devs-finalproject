// Search params of the Settlement Summary (settlements-browse design D10): the tab, the cycle and the page of
// Movements. Invalid values are dropped; the defaults (Summary, E, page 1) are not written.
import { Cycle, IntId } from '@recon/shared'

export const SUMMARY_TABS = ['summary', 'movements'] as const
export type SummaryTab = (typeof SUMMARY_TABS)[number]

export interface SettlementSummarySearch {
  tab?: Exclude<SummaryTab, 'summary'>
  cycle?: Exclude<Cycle, 'E'>
  page?: number
}

export const validateSettlementSummarySearch = (search: Record<string, unknown>): SettlementSummarySearch => {
  const cycle = Cycle.safeParse(search.cycle)
  const page = IntId.safeParse(typeof search.page === 'number' ? String(search.page) : search.page)
  const out: SettlementSummarySearch = {}
  if (search.tab === 'movements') out.tab = 'movements'
  if (cycle.success && cycle.data !== 'E') out.cycle = cycle.data
  if (page.success && page.data > 1) out.page = page.data
  return out
}

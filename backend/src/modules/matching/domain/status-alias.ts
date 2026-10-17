// Global status aliases (README §3.2 "MatchingStatusAlias"): the text read from a status column → statusId.
import type { StatusValue } from '@recon/shared'
import type { MatchingRules } from './rules.js'

function normalize(text: string): string {
  return text.trim().toLowerCase()
}

export function statusName(statusId: number | null, rules: Pick<MatchingRules, 'statuses'>): string | null {
  if (statusId === null) return null
  return rules.statuses.find((s) => s.statusId === statusId)?.name ?? null
}

/**
 * Resolves a status text through the aliases, ignoring case and surrounding spaces. An unknown value
 * stays unresolved (`statusId = null`): the proposal reports it, it is never guessed.
 */
export function resolveStatusAlias(value: string, rules: Pick<MatchingRules, 'aliases' | 'statuses'>): StatusValue {
  const key = normalize(value)
  const alias = rules.aliases.find((a) => normalize(a.alias) === key)
  if (!alias) return { value, statusId: null, statusName: null, excludeAmount: false }
  return {
    value,
    statusId: alias.statusId,
    statusName: statusName(alias.statusId, rules),
    excludeAmount: alias.excludeAmount,
  }
}

import type { ReactNode } from 'react'

/**
 * The frame of a counter card: a region named by its label, the label in small muted text with an optional info slot
 * next to it, then the value in large figures and whatever goes below it (web-analysis-polish design D2). Shared by
 * the counters of Analysis and the informative counters of Validations, so both read the same. The tone is neutral
 * unless the caller asks for a warning: a value above 0 alone never warns.
 */
export function StatCard({
  label,
  value,
  tone = 'neutral',
  size = 'default',
  info,
  children,
}: {
  label: string
  value: ReactNode
  tone?: 'neutral' | 'warning'
  /** "compact" for a value that is a phrase rather than a figure (By cycle). */
  size?: 'default' | 'compact'
  /** Goes next to the label, e.g. an InfoTip. */
  info?: ReactNode
  children?: ReactNode
}) {
  const warn = tone === 'warning'
  return (
    <section
      aria-label={label}
      data-state={warn ? 'warning' : undefined}
      className={`flex min-w-32 flex-col gap-1 rounded-md border bg-background p-3 ${warn ? 'border-amber-500 bg-amber-50 dark:bg-amber-950/30' : ''}`}
    >
      {info ? (
        <span className="flex items-center gap-1">
          <span className="text-xs text-muted-foreground">{label}</span>
          {info}
        </span>
      ) : (
        <span className="text-xs text-muted-foreground">{label}</span>
      )}
      <span className={`${size === 'compact' ? 'text-lg' : 'text-2xl'} font-semibold tabular-nums`}>{value}</span>
      {children}
    </section>
  )
}

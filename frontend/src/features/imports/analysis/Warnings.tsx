import { WarningCode } from '@recon/shared'
import type { ImportDetail } from '@/lib/api/types'
import { strings } from '../strings'

const s = strings.analysis.warnings

/** Each warning code with a count above zero (spec "Resultado del análisis: advertencias"). */
export function Warnings({ warnings }: { warnings: NonNullable<ImportDetail['analysis']>['warnings'] }) {
  const present = WarningCode.options.filter((code) => (warnings[code] ?? 0) > 0)

  return (
    <section aria-label={s.title} className="flex flex-col gap-2 rounded-md border bg-background p-3 text-sm">
      <h3 className="font-medium">{s.title}</h3>
      {present.length === 0 ? (
        <p className="text-muted-foreground">{s.none}</p>
      ) : (
        <ul className="flex flex-wrap gap-x-6 gap-y-1">
          {present.map((code) => (
            <li key={code} className="flex gap-2">
              <span>{s.labels[code]}</span>
              <span className="font-semibold tabular-nums">{warnings[code]}</span>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

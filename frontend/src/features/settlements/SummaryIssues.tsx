import { Link } from '@tanstack/react-router'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import type { SettlementView } from './contract'
import { strings } from './strings'

const s = strings.summary

/** The channels the attempt made primary here, the issues of its run, rows not processed and warnings. */
export function SummaryIssues({ view }: { view: SettlementView }) {
  const notProcessed = strings.preSummary.notProcessed(view.skipped)
  return (
    <Card>
      <CardHeader>
        <CardTitle>{s.issues}</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-3 text-sm">
        <section aria-label={s.channels} className="flex flex-col gap-1">
          <h2 className="font-medium">{s.channels}</h2>
          {view.channelsAssigned.length === 0 ? (
            <p className="text-muted-foreground">{s.noChannels}</p>
          ) : (
            <ul>
              {view.channelsAssigned.map((c) => (
                <li key={c.channelId}>
                  {c.assignment === 'new_primary'
                    ? s.channelNew(c.name)
                    : s.channelMoved(c.name, c.previousAccount?.name ?? null)}
                </li>
              ))}
            </ul>
          )}
        </section>
        <div className="flex flex-wrap items-center gap-2">
          <p>{s.issueCounts(view.validationSummary)}</p>
          <Link
            to="/imports/$importId"
            params={{ importId: view.importId }}
            search={{ step: 'analysis' }}
            className="text-primary underline underline-offset-4"
          >
            {s.viewValidations}
          </Link>
        </div>
        {notProcessed && <p className="text-muted-foreground">{notProcessed}</p>}
        {view.warnings.length > 0 && (
          <ul
            aria-label={strings.preSummary.warnings}
            className="flex flex-col gap-1 text-amber-700 dark:text-amber-400"
          >
            {view.warnings.map((w, i) => (
              // biome-ignore lint/suspicious/noArrayIndexKey: warnings have no id and their order is the API's
              <li key={i}>{strings.warning(w)}</li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  )
}

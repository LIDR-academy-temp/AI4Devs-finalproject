import { useNavigate, useSearch } from '@tanstack/react-router'
import { ValidationsSection } from '@/features/validations/ValidationsSection'
import type { ImportDetail } from '@/lib/api/types'
import type { ImportSearch } from '../validate-search'
import { ChannelNotice } from './ChannelNotice'
import { Counters } from './Counters'
import { RowsTable } from './RowsTable'
import { Warnings } from './Warnings'

/**
 * The result of the analysis (counters, channel notice, warnings), then the validations of T3 (#10) with the
 * decision on the whole, and the rows last (design D9; web-validations design D1).
 */
export function AnalysisStep({ detail }: { detail: ImportDetail }) {
  const search = useSearch({ from: '/app/imports/$importId' })
  const navigate = useNavigate({ from: '/imports/$importId' })
  if (detail.analysis === null) return null

  return (
    <div className="flex flex-col gap-4">
      <Counters importId={detail.importId} analysis={detail.analysis} />
      <ChannelNotice channels={detail.channels ?? []} />
      <Warnings warnings={detail.analysis.warnings} />
      <ValidationsSection detail={detail} />
      <RowsTable
        importId={detail.importId}
        match={search.match}
        page={search.page ?? 1}
        onChange={({ match, page }) =>
          navigate({
            search: (prev: ImportSearch) => ({ ...prev, step: 'analysis', match, page: page > 1 ? page : undefined }),
            replace: true,
            // Only the rows change: the page stays where it is (ui-polish design D13).
            resetScroll: false,
          })
        }
      />
    </div>
  )
}

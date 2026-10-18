import { useQuery } from '@tanstack/react-query'
import { useNavigate, useParams, useSearch } from '@tanstack/react-router'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { ApiError } from '@/lib/api/client'
import { AnalysisStep } from './analysis/AnalysisStep'
import { FilesStep } from './files/FilesStep'
import { ImportHeader } from './ImportHeader'
import { MappingStep } from './mapping/MappingStep'
import { importQuery } from './queries'
import { defaultStep, StepTabs } from './StepTabs'
import { strings } from './strings'
import type { ImportSearch, Step } from './validate-search'

/** Reconciliation › Import: one workspace per import with its Files, Mapping and Analysis steps (design D2). */
export function ImportPage() {
  const { importId } = useParams({ from: '/app/imports/$importId' })
  const search = useSearch({ from: '/app/imports/$importId' })
  const navigate = useNavigate({ from: '/imports/$importId' })
  const query = useQuery(importQuery(importId))

  if (query.isPending) return <Skeleton className="h-40 w-full" aria-label={strings.loading} />
  if (query.isError) {
    const gone = query.error instanceof ApiError && (query.error.status === 404 || query.error.status === 400)
    return gone ? (
      <p className="text-sm">{strings.notAvailable}</p>
    ) : (
      <div className="flex items-center gap-3 text-sm">
        <span>{strings.loadError}</span>
        <Button variant="outline" size="sm" onClick={() => void query.refetch()}>
          {strings.retry}
        </Button>
      </div>
    )
  }

  const detail = query.data
  const step = search.step ?? defaultStep(detail)
  const toStep = (next: Step) => navigate({ search: (prev: ImportSearch) => ({ ...prev, step: next }), replace: true })

  return (
    <section className="flex flex-col gap-4">
      <ImportHeader detail={detail} />
      <StepTabs
        detail={detail}
        step={step}
        onStep={toStep}
        panels={{
          files: <FilesStep detail={detail} />,
          mapping: <MappingStep detail={detail} />,
          analysis: <AnalysisStep detail={detail} />,
        }}
      />
    </section>
  )
}

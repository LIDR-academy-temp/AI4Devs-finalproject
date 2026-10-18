import { zodResolver } from '@hookform/resolvers/zod'
import { useQuery } from '@tanstack/react-query'
import { useNavigate, useParams, useSearch } from '@tanstack/react-router'
import { useEffect, useMemo, useRef } from 'react'
import { FormProvider, type Resolver, useForm } from 'react-hook-form'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { ApiError } from '@/lib/api/client'
import type { ImportDetail } from '@/lib/api/types'
import { AnalysisStep } from './analysis/AnalysisStep'
import { useAnalyze } from './analyze'
import { FilesStep } from './files/FilesStep'
import { ImportHeader } from './ImportHeader'
import { MappingStep } from './mapping/MappingStep'
import { type MappingValues, mappingSchema, onlySheets, sheetIdsOf, valuesFromDetail } from './mapping/mapping-form'
import { importQuery } from './queries'
import { defaultStep, StepTabs } from './StepTabs'
import { strings } from './strings'
import type { ImportSearch, Step } from './validate-search'

/** Reconciliation › Import: one workspace per import with its Files, Mapping and Analysis steps (design D2). */
export function ImportPage() {
  const { importId } = useParams({ from: '/app/imports/$importId' })
  const search = useSearch({ from: '/app/imports/$importId' })
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

  return <ImportWorkspace detail={query.data} step={search.step} />
}

/**
 * The workspace of a loaded import. The mapping form lives here, not in the Mapping step, so what the user edited
 * survives moving between steps and the changes of the detail (design D2, D5).
 */
function ImportWorkspace({ detail, step: chosen }: { detail: ImportDetail; step: Step | undefined }) {
  const navigate = useNavigate({ from: '/imports/$importId' })
  const values = useMemo(() => valuesFromDetail(detail), [detail])
  // keepDirtyValues keeps what the user edited even in sheets whose file was removed: the resolver validates only
  // the sheets the detail has now, and the effect below drops the others from the form.
  const sheetIds = useRef(sheetIdsOf(detail))
  sheetIds.current = sheetIdsOf(detail)
  const resolver = useMemo<Resolver<MappingValues>>(() => {
    const validate = zodResolver(mappingSchema)
    return (current, context, options) => validate(onlySheets(current, sheetIds.current), context, options)
  }, [])
  const form = useForm<MappingValues>({
    values,
    resetOptions: { keepDirtyValues: true },
    resolver,
    mode: 'onChange',
  })
  useEffect(() => {
    const ids = sheetIdsOf(detail)
    const gone = Object.keys(form.getValues('sheets') ?? {}).filter((id) => !ids.has(id))
    if (gone.length === 0) return
    form.unregister(gone.map((id) => `sheets.${id}` as const))
  }, [detail, form])
  const step = chosen ?? defaultStep(detail)
  const toStep = (next: Step) => navigate({ search: (prev: ImportSearch) => ({ ...prev, step: next }), replace: true })
  const analysis = useAnalyze(detail, () => void toStep('analysis'))

  return (
    <FormProvider {...form}>
      <section className="flex flex-col gap-4">
        <ImportHeader detail={detail} busy={analysis.running} />
        <StepTabs
          detail={detail}
          step={step}
          onStep={toStep}
          panels={{
            files: <FilesStep detail={detail} busy={analysis.running} onContinue={() => void toStep('mapping')} />,
            mapping: <MappingStep detail={detail} analysis={analysis} />,
            analysis: <AnalysisStep detail={detail} />,
          }}
        />
      </section>
    </FormProvider>
  )
}

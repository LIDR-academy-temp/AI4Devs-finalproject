import type { ReactNode } from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import type { ImportDetail } from '@/lib/api/types'
import { strings } from './strings'
import type { Step } from './validate-search'

/** The step an import opens on without `step` in the address (spec "Retomar un import por su enlace"). */
export function defaultStep(detail: ImportDetail): Step {
  if (detail.analysis !== null) return 'analysis'
  return detail.files.length === 0 ? 'files' : 'mapping'
}

/** Steps after the import's status are shown disabled: Analysis before the analysis. */
export function StepTabs({
  detail,
  step,
  onStep,
  panels,
}: {
  detail: ImportDetail
  step: Step
  onStep: (step: Step) => void
  panels: Record<Step, ReactNode>
}) {
  const analyzed = detail.analysis !== null
  const current = step === 'analysis' && !analyzed ? defaultStep(detail) : step

  return (
    <Tabs value={current} onValueChange={(value) => onStep(value as Step)} className="flex flex-col gap-4">
      <TabsList aria-label={strings.steps.label}>
        <TabsTrigger value="files">{strings.steps.files}</TabsTrigger>
        <TabsTrigger value="mapping">{strings.steps.mapping}</TabsTrigger>
        <TabsTrigger value="analysis" disabled={!analyzed}>
          {strings.steps.analysis}
        </TabsTrigger>
      </TabsList>
      <TabsContent value="files">{panels.files}</TabsContent>
      <TabsContent value="mapping">{panels.mapping}</TabsContent>
      <TabsContent value="analysis">{panels.analysis}</TabsContent>
    </Tabs>
  )
}

import type { MatchingRuleSetDetail } from '@recon/shared'
import { useQueryClient } from '@tanstack/react-query'
import { useId, useRef, useState } from 'react'
import { useForm } from 'react-hook-form'
import { Button } from '@/components/ui/button'
import { SheetClose, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { controlClass, Field, GeneralMessage, keepOpenWhile } from '@/features/accounts/account-fields'
import { usePutRuleSet } from './mutations'
import { ruleSetKey } from './queries'
import { ruleProblemOf } from './rule-errors'
import { checkName, ruleSetBody } from './rule-form'
import { strings } from './strings'

const f = strings.form

/** Only the name: the 400 of the API on another field is a general message (design D6). */
const NAME_ONLY = { sheetRules: 0, columnRules: 0, statusAliases: 0, name: true }

/**
 * Rename… (spec matching "Pantalla Matching Rules: renombrar", design D7): a side panel that sends the whole document
 * with the new name and the rules as they are saved. It keeps what was written after any error and closes when the
 * API accepted the write. It is the content of the Sheet of the header, whose Trigger is Rename….
 */
export function RenameRuleSetSheet({ ruleSet, onDone }: { ruleSet: MatchingRuleSetDetail; onDone: () => void }) {
  const ids = { name: useId(), reason: useId() }
  const { register, handleSubmit, setFocus } = useForm({ defaultValues: { name: ruleSet.name, reason: '' } })
  const put = usePutRuleSet(String(ruleSet.ruleSetId))
  const queryClient = useQueryClient()
  const [nameError, setNameError] = useState<string | null>(null)
  const [general, setGeneral] = useState<string | null>(null)
  const [attempt, setAttempt] = useState(0)
  const sending = useRef(false)

  const showName = (message: string) => {
    setNameError(message)
    setFocus('name')
  }

  const submit = handleSubmit(async ({ name, reason }) => {
    if (sending.current) return
    setNameError(null)
    setGeneral(null)
    const local = checkName(name)
    if (local) return showName(local)
    sending.current = true
    try {
      await put.mutateAsync(ruleSetBody(ruleSet, { name: name.trim(), reason }))
      onDone()
    } catch (error) {
      const problem = ruleProblemOf(error, NAME_ONLY)
      if (problem.invalidate) void queryClient.invalidateQueries({ queryKey: ruleSetKey(ruleSet.ruleSetId) })
      if (problem.fields.name) showName(problem.fields.name)
      if (problem.general) {
        setGeneral(problem.general)
        setAttempt((n) => n + 1)
      }
    } finally {
      sending.current = false
    }
  })

  const pending = put.isPending
  return (
    <SheetContent className="overflow-y-auto sm:max-w-md" showCloseButton={!pending} {...keepOpenWhile(pending)}>
      <SheetHeader>
        <SheetTitle className="[overflow-wrap:anywhere]">{strings.rename.title(ruleSet.name)}</SheetTitle>
        <SheetDescription>{strings.rename.description}</SheetDescription>
      </SheetHeader>
      <form className="flex flex-col gap-4 px-4 pb-4" noValidate onSubmit={(event) => void submit(event)}>
        <Field id={ids.name} label={f.name} error={nameError ?? undefined}>
          <input
            id={ids.name}
            className={controlClass}
            autoComplete="off"
            aria-invalid={nameError ? true : undefined}
            aria-describedby={nameError ? `${ids.name}-error` : undefined}
            {...register('name')}
          />
        </Field>
        <Field id={ids.reason} label={f.reason}>
          <textarea
            id={ids.reason}
            className={`${controlClass} h-auto min-h-16 py-2`}
            maxLength={500}
            {...register('reason')}
          />
        </Field>
        <GeneralMessage message={general} attempt={attempt} />
        <div className="flex justify-end gap-2">
          <SheetClose asChild>
            <Button type="button" variant="outline" disabled={pending}>
              {f.cancel}
            </Button>
          </SheetClose>
          <Button type="submit" disabled={pending}>
            {pending ? f.saving : f.save}
          </Button>
        </div>
      </form>
    </SheetContent>
  )
}

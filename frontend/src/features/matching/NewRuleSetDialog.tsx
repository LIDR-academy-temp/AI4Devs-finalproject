import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from '@tanstack/react-router'
import { useId, useRef, useState } from 'react'
import { useForm } from 'react-hook-form'
import { Button } from '@/components/ui/button'
import { DialogClose, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { controlClass, Field, GeneralMessage, keepOpenWhile } from '@/features/accounts/account-fields'
import { useCreateRuleSet } from './mutations'
import { matchingRuleSetsQuery, ruleSetQuery } from './queries'
import { ruleProblemOf } from './rule-errors'
import { checkName, createBody } from './rule-form'
import { strings } from './strings'

const c = strings.create
const f = strings.form
const NAME_ONLY = { sheetRules: 0, columnRules: 0, statusAliases: 0, name: true }

/**
 * New rule set (spec matching "Pantalla Matching Rules: crear un conjunto", design D7): a name and where its rules
 * start from, empty or a copy of a set of the provider (the stored rules of its detail, without ids). With 201 the
 * screen goes to the detail of the new set. It is the content of the Dialog of the list, whose Trigger is New rule set.
 */
export function NewRuleSetDialog({ providerId }: { providerId: number }) {
  const ids = { name: useId(), source: useId() }
  const { register, handleSubmit, setFocus, watch } = useForm({ defaultValues: { name: '', source: '' } })
  const ruleSets = useQuery(matchingRuleSetsQuery(providerId))
  const source = watch('source')
  // The detail of the source is read as soon as it is chosen; Create rule set waits for it.
  useQuery({ ...ruleSetQuery(source), enabled: source !== '' })
  const queryClient = useQueryClient()
  const create = useCreateRuleSet(providerId)
  const navigate = useNavigate()
  const [nameError, setNameError] = useState<string | null>(null)
  const [general, setGeneral] = useState<string | null>(null)
  const [attempt, setAttempt] = useState(0)
  const [reading, setReading] = useState(false)
  const sending = useRef(false)

  const showGeneral = (message: string) => {
    setGeneral(message)
    setAttempt((n) => n + 1)
  }

  const submit = handleSubmit(async ({ name, source: from }) => {
    if (sending.current) return
    setNameError(null)
    setGeneral(null)
    const local = checkName(name)
    if (local) {
      setNameError(local)
      setFocus('name')
      return
    }
    sending.current = true
    try {
      let copied = null
      if (from !== '') {
        setReading(true)
        try {
          copied = await queryClient.fetchQuery(ruleSetQuery(from))
        } catch {
          showGeneral(c.sourceUnavailable)
          return
        } finally {
          setReading(false)
        }
      }
      try {
        const created = await create.mutateAsync(createBody(name, copied, ''))
        await navigate({ to: '/matching-rules/$ruleSetId', params: { ruleSetId: String(created.ruleSetId) } })
      } catch (error) {
        const problem = ruleProblemOf(error, NAME_ONLY)
        if (problem.fields.name) {
          setNameError(problem.fields.name)
          setFocus('name')
        }
        if (problem.general) showGeneral(problem.general)
      }
    } finally {
      sending.current = false
    }
  })

  const pending = create.isPending || reading
  return (
    <DialogContent className="sm:max-w-lg" showCloseButton={!pending} {...keepOpenWhile(pending)}>
      <DialogHeader>
        <DialogTitle>{c.title}</DialogTitle>
        <DialogDescription>{c.description}</DialogDescription>
      </DialogHeader>
      <form className="flex flex-col gap-4" noValidate onSubmit={(event) => void submit(event)}>
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
        <Field id={ids.source} label={c.startFrom}>
          <select id={ids.source} className={controlClass} {...register('source')}>
            <option value="">{c.empty}</option>
            {(ruleSets.data ?? []).map((set) => (
              <option key={set.ruleSetId} value={String(set.ruleSetId)}>
                {set.isActive ? c.copyOf(set.name) : c.copyOfInactive(set.name)}
              </option>
            ))}
          </select>
        </Field>
        <GeneralMessage message={general} attempt={attempt} />
        <div className="flex justify-end gap-2">
          <DialogClose asChild>
            <Button type="button" variant="outline" disabled={pending}>
              {f.cancel}
            </Button>
          </DialogClose>
          <Button type="submit" disabled={pending}>
            {pending ? c.creating : c.create}
          </Button>
        </div>
      </form>
    </DialogContent>
  )
}

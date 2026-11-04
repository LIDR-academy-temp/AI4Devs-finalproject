// The rules of a set or of the global defaults, read and edited (web-admin-matching design D5, D6). Edit rules mounts
// a form from the last answer; Save sends the whole document once and leaves edit mode with the answer; Cancel
// unmounts it, so values and ids never outlive an edit. Errors keep the form open with its values and its order.
import type { ColumnRule, MatchingStatus, RowIgnoreRule, SheetRule, StatusAlias } from '@recon/shared'
import { useEffect, useId, useRef, useState } from 'react'
import { useForm } from 'react-hook-form'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { controlClass, GeneralMessage } from '@/features/accounts/account-fields'
import { EditColumnRules, EditSheetRules, EditStatusAliases } from './rule-edit-tables'
import { formPath, ruleProblemOf } from './rule-errors'
import { checkRules, hiddenFields, type RulesInput, type RulesValues, valuesOf } from './rule-form'
import { ColumnRulesTable, RowsToIgnore, RulesCard, SheetRulesTable, StatusAliasesTable } from './rule-tables'
import { strings } from './strings'

const e = strings.edit

export interface RulesDocument {
  sheetRules: SheetRule[]
  columnRules: ColumnRule[]
  rowIgnoreRules: RowIgnoreRule[]
  /** Only the global rules have aliases. */
  statusAliases?: StatusAlias[]
}

export interface RulesEditorProps {
  /** The last answer of the API. */
  doc: RulesDocument
  statuses: readonly MatchingStatus[] | undefined
  canEdit: boolean
  /** Sends the checked rules; rejects with the error of the API. */
  save: (rules: RulesInput, reason: string) => Promise<unknown>
  /** The rule set is gone or out of the scope: read it again. */
  onStale?: () => void
  /** Whether the form has unsaved changes (Rename, Deactivate and Activate wait for them, design D7). */
  onDirtyChange?: (dirty: boolean) => void
  /** Reads the catalog of statuses again when it is missing. */
  onRetryStatuses?: () => void
}

const LISTS = ['sheetRules', 'columnRules', 'statusAliases'] as const
const ROW_FIELDS: Record<(typeof LISTS)[number], readonly string[]> = {
  sheetRules: ['sheetPattern', 'isRegex', 'kind', 'cycle', 'statusId', 'priority', 'isActive'],
  columnRules: ['sheetPattern', 'columnPattern', 'isRegex', 'targetField', 'priority', 'isActive'],
  statusAliases: ['alias', 'statusId', 'excludeAmount', 'isLegacy'],
}

/** The position of a details.field path in the order the form shows its fields: sheets, columns, aliases. */
function orderOf(path: string): number[] {
  const match = /^(\w+)\[(\d+)\]\.(\w+)$/.exec(path)
  if (!match) return [-1]
  const list = LISTS.indexOf(match[1] as (typeof LISTS)[number])
  return [list, Number(match[2]), ROW_FIELDS[LISTS[list] ?? 'sheetRules'].indexOf(match[3] ?? '')]
}

function byFormOrder(a: string, b: string) {
  const [x, y] = [orderOf(a), orderOf(b)]
  for (let i = 0; i < Math.max(x.length, y.length); i += 1) {
    const diff = (x[i] ?? 0) - (y[i] ?? 0)
    if (diff !== 0) return diff
  }
  return 0
}

function RulesForm({
  doc,
  statuses,
  save,
  onStale,
  onDirtyChange,
  onDone,
}: Omit<RulesEditorProps, 'canEdit' | 'statuses'> & { statuses: readonly MatchingStatus[]; onDone: () => void }) {
  const withAliases = doc.statusAliases !== undefined
  const form = useForm<RulesValues>({ defaultValues: valuesOf(doc) })
  const reasonId = useId()
  const [general, setGeneral] = useState<string | null>(null)
  const [attempt, setAttempt] = useState(0)
  const [pending, setPending] = useState(false)
  // A double click must not send twice: the state above only disables Save on the next render.
  const sending = useRef(false)
  const dirty = form.formState.isDirty

  useEffect(() => {
    onDirtyChange?.(dirty)
  }, [dirty, onDirtyChange])
  useEffect(() => () => onDirtyChange?.(false), [onDirtyChange])

  /** Each message next to its field, the focus on the first one in the order of the form. */
  function showFields(fields: Record<string, string>) {
    const paths = Object.keys(fields).sort(byFormOrder)
    for (const path of paths) {
      form.setError(formPath(path) as `sheetRules.${number}.sheetPattern`, { message: fields[path] })
    }
    const first = paths[0]
    if (first) form.setFocus(formPath(first) as `sheetRules.${number}.sheetPattern`)
  }

  const submit = form.handleSubmit(async (values) => {
    if (sending.current) return
    form.clearErrors()
    setGeneral(null)
    const check = checkRules(values)
    if (!check.ok) {
      showFields(check.fields)
      return
    }
    sending.current = true
    setPending(true)
    try {
      await save(check.rules, values.reason)
      onDone()
    } catch (error) {
      const problem = ruleProblemOf(error, {
        sheetRules: values.sheetRules.length,
        columnRules: values.columnRules.length,
        statusAliases: withAliases ? values.statusAliases.length : 0,
        name: false,
        hidden: hiddenFields(values),
      })
      if (problem.invalidate) onStale?.()
      showFields(problem.fields)
      if (problem.general) {
        setGeneral(problem.general)
        setAttempt((n) => n + 1)
      }
    } finally {
      sending.current = false
      setPending(false)
    }
  })

  return (
    <form aria-label={e.formLabel} noValidate onSubmit={submit} className="flex flex-col gap-4">
      <EditSheetRules form={form} statuses={statuses} />
      <EditColumnRules form={form} />
      {withAliases && <EditStatusAliases form={form} statuses={statuses} />}
      <RowsToIgnore rules={doc.rowIgnoreRules} />
      <Card>
        <CardContent className="flex flex-col gap-3">
          <p className="text-sm text-muted-foreground">{e.note}</p>
          <div className="flex max-w-xl flex-col gap-1.5">
            <label htmlFor={reasonId} className="text-sm font-medium">
              {e.reason}
            </label>
            <input id={reasonId} className={controlClass} maxLength={500} {...form.register('reason')} />
          </div>
          <GeneralMessage message={general} attempt={attempt} />
          <div className="flex flex-wrap items-center gap-3">
            <Button type="submit" size="sm" disabled={pending}>
              {pending ? e.saving : e.save}
            </Button>
            <Button type="button" variant="outline" size="sm" disabled={pending} onClick={onDone}>
              {e.cancel}
            </Button>
            {dirty && <span className="text-sm text-muted-foreground">{e.unsaved}</span>}
          </div>
        </CardContent>
      </Card>
    </form>
  )
}

export function RulesEditor({
  doc,
  statuses,
  canEdit,
  save,
  onStale,
  onDirtyChange,
  onRetryStatuses,
}: RulesEditorProps) {
  const [editing, setEditing] = useState(false)
  const editButton = useRef<HTMLButtonElement>(null)
  const wasEditing = useRef(false)

  // Leaving edit mode gives the focus back to Edit rules.
  useEffect(() => {
    if (wasEditing.current && !editing) editButton.current?.focus()
    wasEditing.current = editing
  }, [editing])

  if (editing && statuses) {
    return (
      <RulesForm
        doc={doc}
        statuses={statuses}
        save={save}
        onStale={onStale}
        onDirtyChange={onDirtyChange}
        onDone={() => setEditing(false)}
      />
    )
  }

  const actions = canEdit && (
    <div className="flex flex-wrap items-center gap-2">
      {!statuses && <span className="text-sm text-muted-foreground">{e.statusesUnavailable}</span>}
      {!statuses && onRetryStatuses && (
        <Button size="sm" variant="outline" onClick={onRetryStatuses}>
          {strings.retry}
        </Button>
      )}
      <Button ref={editButton} size="sm" variant="outline" disabled={!statuses} onClick={() => setEditing(true)}>
        {strings.detail.actions.edit}
      </Button>
    </div>
  )

  return (
    <>
      <RulesCard title={strings.tables.sheets} actions={actions}>
        <SheetRulesTable rules={doc.sheetRules} statuses={statuses} />
      </RulesCard>
      <RulesCard title={strings.tables.columns}>
        <ColumnRulesTable rules={doc.columnRules} />
      </RulesCard>
      {doc.statusAliases && (
        <RulesCard title={strings.tables.aliases}>
          <StatusAliasesTable aliases={doc.statusAliases} statuses={statuses ?? []} />
        </RulesCard>
      )}
      <RowsToIgnore rules={doc.rowIgnoreRules} />
    </>
  )
}

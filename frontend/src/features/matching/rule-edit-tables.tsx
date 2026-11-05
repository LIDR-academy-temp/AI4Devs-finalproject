// The lists of matching rules as editable rows (web-admin-matching design D4, D5): one useFieldArray per list, Move
// up / Move down / Remove per row and Add at the foot. Controls are native (no Radix portals for up to 200 rows) and
// each one is named by its row, so an error of the API (`sheetRules[2].statusId`) lands on a field the reader can
// find. The fields that do not exist for the kind of a sheet are not shown; the body sends them as null.
import { type MatchingStatus, TargetField } from '@recon/shared'
import { ArrowDown, ArrowUp, Trash2 } from 'lucide-react'
import { useEffect, useRef } from 'react'
import { get, type UseFormReturn, useFieldArray, useWatch } from 'react-hook-form'
import { Button } from '@/components/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { newColumnRule, newSheetRule, newStatusAlias, type RulesValues, showsSheetField } from './rule-form'
import { RulesCard } from './rule-tables'
import { strings } from './strings'

const t = strings.tables
const h = t.head
const e = strings.edit

type Form = UseFormReturn<RulesValues>
type ListName = 'sheetRules' | 'columnRules' | 'statusAliases'

const controlClass =
  'h-8 rounded-md border border-input bg-background px-1.5 text-sm shadow-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring aria-[invalid=true]:border-destructive'
const checkClass = 'size-4 accent-primary'
// Tighter than the read tables, so the eight columns of a sheet rule fit their card at 1024 px (design D11); an
// error under a control wraps inside its column.
const cellClass = 'px-1 align-top'
const headClass = 'px-1'

const errorId = (path: string) => `error-${path.replace(/\./g, '-')}`

/** The message set on a field (local check or API), with the aria attributes that tie it to the control. */
function useFieldError(form: Form, path: string) {
  const message = get(form.formState.errors, path)?.message as string | undefined
  return {
    message,
    aria: {
      'aria-invalid': message ? true : undefined,
      'aria-describedby': message ? errorId(path) : undefined,
    },
  }
}

function ErrorText({ path, message }: { path: string; message: string | undefined }) {
  if (!message) return null
  return (
    <p id={errorId(path)} className="mt-1 text-xs whitespace-normal text-destructive">
      {message}
    </p>
  )
}

/** A text control of a row with its error under it. */
function TextCell({ form, path, label, className }: { form: Form; path: string; label: string; className?: string }) {
  const error = useFieldError(form, path)
  return (
    <TableCell className={cellClass}>
      <input
        aria-label={label}
        className={`${controlClass} ${className ?? 'w-full min-w-24'}`}
        {...error.aria}
        {...form.register(path as `sheetRules.${number}.sheetPattern`)}
      />
      <ErrorText path={path} message={error.message} />
    </TableCell>
  )
}

function CheckCell({ form, path, label }: { form: Form; path: string; label: string }) {
  const error = useFieldError(form, path)
  return (
    <TableCell className={cellClass}>
      <input
        type="checkbox"
        aria-label={label}
        className={checkClass}
        {...error.aria}
        {...form.register(path as `sheetRules.${number}.isRegex`)}
      />
      <ErrorText path={path} message={error.message} />
    </TableCell>
  )
}

function SelectCell({
  form,
  path,
  label,
  options,
  onChange,
  className = 'min-w-24',
}: {
  form: Form
  path: string
  label: string
  options: readonly { value: string; label: string }[]
  onChange?: (value: string) => void
  className?: string
}) {
  const error = useFieldError(form, path)
  return (
    <TableCell className={cellClass}>
      <select
        aria-label={label}
        className={`${controlClass} ${className}`}
        {...error.aria}
        {...form.register(path as `sheetRules.${number}.kind`, {
          onChange: (event: { target: { value: string } }) => onChange?.(event.target.value),
        })}
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      <ErrorText path={path} message={error.message} />
    </TableCell>
  )
}

/**
 * Where the focus goes after a move or a removal, applied once the rows have rendered again: the same button of the
 * moved row unless it is now disabled, then its other button (design D5); after a removal, Add of that list.
 */
function usePendingFocus() {
  const pending = useRef<string | null>(null)
  useEffect(() => {
    if (!pending.current) return
    document.getElementById(pending.current)?.focus()
    pending.current = null
  })
  return pending
}

function RowActions({
  list,
  rowId,
  index,
  count,
  name,
  movable,
  onMove,
  onRemove,
}: {
  list: ListName
  rowId: string
  index: number
  count: number
  /** How the row is named to a screen reader: its pattern, or its position while the pattern is blank. */
  name: string
  movable: boolean
  onMove: (from: number, to: number, focus: 'up' | 'down') => void
  onRemove: (index: number) => void
}) {
  const label = e.rowLabel[list]
  return (
    <TableCell className={cellClass}>
      <div className="flex items-center gap-0.5">
        {movable && (
          <>
            <Button
              id={`${list}-${rowId}-up`}
              type="button"
              variant="ghost"
              size="icon-sm"
              aria-label={e.moveUp(label, name)}
              title={e.moveUpTitle}
              disabled={index === 0}
              onClick={() => onMove(index, index - 1, index - 1 === 0 ? 'down' : 'up')}
            >
              <ArrowUp aria-hidden />
            </Button>
            <Button
              id={`${list}-${rowId}-down`}
              type="button"
              variant="ghost"
              size="icon-sm"
              aria-label={e.moveDown(label, name)}
              title={e.moveDownTitle}
              disabled={index === count - 1}
              onClick={() => onMove(index, index + 1, index + 1 === count - 1 ? 'up' : 'down')}
            >
              <ArrowDown aria-hidden />
            </Button>
          </>
        )}
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          aria-label={e.remove(label, name)}
          title={e.removeTitle}
          onClick={() => onRemove(index)}
        >
          <Trash2 aria-hidden />
        </Button>
      </div>
    </TableCell>
  )
}

/** One editable list: its fields, its moves with the focus kept, and Add at the foot with the focus on the new row. */
function useList(form: Form, list: ListName) {
  const array = useFieldArray({ control: form.control, name: list })
  const focus = usePendingFocus()
  return {
    ...array,
    moveRow: (from: number, to: number, button: 'up' | 'down') => {
      const rowId = array.fields[from]?.id
      array.move(from, to)
      focus.current = `${list}-${rowId}-${button}`
    },
    removeRow: (index: number) => {
      array.remove(index)
      focus.current = `${list}-add`
    },
  }
}

const name = (pattern: string | undefined, index: number) => pattern?.trim() || String(index + 1)

const KINDS = [
  { value: 'transactions', label: 'transactions' },
  { value: 'batch_fees', label: 'batch_fees' },
  { value: 'ignore', label: 'ignore' },
] as const
const CYCLES = [
  { value: 'E', label: 'E' },
  { value: 'I', label: 'I' },
  { value: 'R', label: 'R' },
] as const
const FIELDS = TargetField.options.map((value) => ({ value, label: value }))

const statusOptions = (statuses: readonly MatchingStatus[], empty: string) => [
  { value: '', label: empty },
  ...statuses.map((s) => ({ value: String(s.statusId), label: s.name })),
]

export function EditSheetRules({ form, statuses }: { form: Form; statuses: readonly MatchingStatus[] }) {
  const rows = useList(form, 'sheetRules')
  const values = useWatch({ control: form.control, name: 'sheetRules' }) ?? []
  const label = (what: string, index: number) => e.sheetField(what, index + 1)
  return (
    <RulesCard
      title={t.sheets}
      footer={
        <Button
          id="sheetRules-add"
          type="button"
          variant="outline"
          size="sm"
          className="self-start"
          onClick={() => rows.append(newSheetRule(), { focusName: `sheetRules.${rows.fields.length}.sheetPattern` })}
        >
          {e.addSheet}
        </Button>
      }
    >
      <Table aria-label={t.sheets}>
        <TableHeader>
          <TableRow>
            <TableHead className={headClass}>{h.pattern}</TableHead>
            <TableHead className={headClass}>{h.regex}</TableHead>
            <TableHead className={headClass}>{h.kind}</TableHead>
            <TableHead className={headClass}>{h.cycle}</TableHead>
            <TableHead className={headClass}>{h.status}</TableHead>
            <TableHead className={headClass}>{h.priority}</TableHead>
            <TableHead className={headClass}>{h.active}</TableHead>
            <TableHead className={headClass}>{h.actions}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.fields.map((row, index) => {
            const value = values[index]
            const shows = (field: string) => value !== undefined && showsSheetField(value, field)
            const path = (field: string) => `sheetRules.${index}.${field}`
            return (
              <TableRow key={row.id}>
                <TextCell form={form} path={path('sheetPattern')} label={label(h.pattern, index)} />
                <CheckCell form={form} path={path('isRegex')} label={label(h.regex, index)} />
                <SelectCell
                  form={form}
                  path={path('kind')}
                  label={label(h.kind, index)}
                  options={KINDS}
                  onChange={(kind) => {
                    // A transactions sheet always has a cycle: the select offers no empty choice (design D4).
                    if (kind === 'transactions' && !form.getValues(`sheetRules.${index}.cycle`)) {
                      form.setValue(`sheetRules.${index}.cycle`, 'E', { shouldDirty: true })
                    }
                  }}
                />
                {shows('cycle') ? (
                  <SelectCell
                    form={form}
                    path={path('cycle')}
                    label={label(h.cycle, index)}
                    options={CYCLES}
                    className="min-w-14"
                  />
                ) : (
                  <TableCell className={`${cellClass} text-muted-foreground`}>{strings.none}</TableCell>
                )}
                {shows('statusId') ? (
                  <SelectCell
                    form={form}
                    path={path('statusId')}
                    label={label(h.status, index)}
                    options={statusOptions(statuses, e.noFixedStatus)}
                  />
                ) : (
                  <TableCell className={`${cellClass} text-muted-foreground`}>{strings.none}</TableCell>
                )}
                <TextCell form={form} path={path('priority')} label={label(h.priority, index)} className="w-16" />
                <CheckCell form={form} path={path('isActive')} label={e.sheetActive(index + 1)} />
                <RowActions
                  list="sheetRules"
                  rowId={row.id}
                  index={index}
                  count={rows.fields.length}
                  name={name(value?.sheetPattern, index)}
                  movable
                  onMove={rows.moveRow}
                  onRemove={rows.removeRow}
                />
              </TableRow>
            )
          })}
        </TableBody>
      </Table>
    </RulesCard>
  )
}

export function EditColumnRules({ form }: { form: Form }) {
  const rows = useList(form, 'columnRules')
  const values = useWatch({ control: form.control, name: 'columnRules' }) ?? []
  const label = (what: string, index: number) => e.columnField(what, index + 1)
  return (
    <RulesCard
      title={t.columns}
      footer={
        <Button
          id="columnRules-add"
          type="button"
          variant="outline"
          size="sm"
          className="self-start"
          onClick={() => rows.append(newColumnRule(), { focusName: `columnRules.${rows.fields.length}.columnPattern` })}
        >
          {e.addColumn}
        </Button>
      }
    >
      <p className="text-xs text-muted-foreground">{e.anySheetHint}</p>
      <Table aria-label={t.columns}>
        <TableHeader>
          <TableRow>
            <TableHead className={headClass}>{h.sheet}</TableHead>
            <TableHead className={headClass}>{h.pattern}</TableHead>
            <TableHead className={headClass}>{h.regex}</TableHead>
            <TableHead className={headClass}>{h.field}</TableHead>
            <TableHead className={headClass}>{h.priority}</TableHead>
            <TableHead className={headClass}>{h.active}</TableHead>
            <TableHead className={headClass}>{h.actions}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.fields.map((row, index) => {
            const path = (field: string) => `columnRules.${index}.${field}`
            return (
              <TableRow key={row.id}>
                <TextCell form={form} path={path('sheetPattern')} label={label(h.sheet, index)} />
                <TextCell form={form} path={path('columnPattern')} label={label(h.pattern, index)} />
                <CheckCell form={form} path={path('isRegex')} label={label(h.regex, index)} />
                <SelectCell form={form} path={path('targetField')} label={label(h.field, index)} options={FIELDS} />
                <TextCell form={form} path={path('priority')} label={label(h.priority, index)} className="w-16" />
                <CheckCell form={form} path={path('isActive')} label={e.columnActive(index + 1)} />
                <RowActions
                  list="columnRules"
                  rowId={row.id}
                  index={index}
                  count={rows.fields.length}
                  name={name(values[index]?.columnPattern, index)}
                  movable
                  onMove={rows.moveRow}
                  onRemove={rows.removeRow}
                />
              </TableRow>
            )
          })}
        </TableBody>
      </Table>
    </RulesCard>
  )
}

/** The aliases are answered by text, so they are not moved (design D5). */
export function EditStatusAliases({ form, statuses }: { form: Form; statuses: readonly MatchingStatus[] }) {
  const rows = useList(form, 'statusAliases')
  const values = useWatch({ control: form.control, name: 'statusAliases' }) ?? []
  return (
    <RulesCard
      title={t.aliases}
      footer={
        <Button
          id="statusAliases-add"
          type="button"
          variant="outline"
          size="sm"
          className="self-start"
          onClick={() => rows.append(newStatusAlias(), { focusName: `statusAliases.${rows.fields.length}.alias` })}
        >
          {e.addAlias}
        </Button>
      }
    >
      <Table aria-label={t.aliases}>
        <TableHeader>
          <TableRow>
            <TableHead className={headClass}>{h.text}</TableHead>
            <TableHead className={headClass}>{h.status}</TableHead>
            <TableHead className={headClass}>{e.excludeAmount}</TableHead>
            <TableHead className={headClass}>{h.legacy}</TableHead>
            <TableHead className={headClass}>{h.actions}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.fields.map((row, index) => {
            const path = (field: string) => `statusAliases.${index}.${field}`
            return (
              <TableRow key={row.id}>
                <TextCell form={form} path={path('alias')} label={e.aliasField(h.text, index + 1)} />
                <SelectCell
                  form={form}
                  path={path('statusId')}
                  label={e.aliasField(h.status, index + 1)}
                  options={statusOptions(statuses, e.chooseStatus)}
                />
                <CheckCell form={form} path={path('excludeAmount')} label={e.aliasExcludes(index + 1)} />
                <CheckCell form={form} path={path('isLegacy')} label={e.aliasLegacy(index + 1)} />
                <RowActions
                  list="statusAliases"
                  rowId={row.id}
                  index={index}
                  count={rows.fields.length}
                  name={name(values[index]?.alias, index)}
                  movable={false}
                  onMove={rows.moveRow}
                  onRemove={rows.removeRow}
                />
              </TableRow>
            )
          })}
        </TableBody>
      </Table>
    </RulesCard>
  )
}

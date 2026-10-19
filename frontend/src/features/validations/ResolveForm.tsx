import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import type { IssueActions } from './mutations'
import { strings } from './strings'

const s = strings.resolve

/** The same bounds as the strict body of #9: 1 to 500 characters once trimmed. */
const schema = z.object({ note: z.string().trim().min(1, s.required).max(500, s.tooLong) })

/** Mark as resolved with a note (design D7); offered only while the API says the finding is resolvable. */
export function ResolveForm({ actions }: { actions: IssueActions }) {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({ resolver: zodResolver(schema), defaultValues: { note: '' } })

  const onSubmit = handleSubmit(async ({ note }) => {
    await actions.resolve(note)
  })
  const error = errors.note?.message

  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-col gap-2 rounded-md border p-2">
      <Label htmlFor="resolution-note">{s.note}</Label>
      <Textarea
        id="resolution-note"
        rows={3}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? 'resolution-note-error' : undefined}
        {...register('note')}
      />
      {error && (
        <p id="resolution-note-error" className="text-sm text-destructive">
          {error}
        </p>
      )}
      <div>
        <Button type="submit" size="sm" disabled={actions.pending || isSubmitting}>
          {s.submit}
        </Button>
      </div>
    </form>
  )
}

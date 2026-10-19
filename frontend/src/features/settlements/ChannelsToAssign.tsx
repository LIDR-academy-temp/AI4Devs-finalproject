import { useId } from 'react'
import { Controller, useFormContext } from 'react-hook-form'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import type { ChannelToAssign } from './contract'
import type { ReviewFormValues } from './review-form'
import { strings } from './strings'

const s = strings.channels

/**
 * The channels processing will assign to this account as primary, from the preview (or from a 409 until the next
 * preview), and the box that confirms it (design D9). The API decides which channels need it.
 */
export function ChannelsToAssign({ channels }: { channels: ChannelToAssign[] }) {
  const { control } = useFormContext<ReviewFormValues>()
  const boxId = useId()
  return (
    <section aria-label={s.label} className="flex flex-col gap-2 rounded-md border border-amber-500/60 p-3 text-sm">
      <p>{s.intro}</p>
      <ul className="flex flex-col gap-1">
        {channels.map((channel) => (
          <li key={channel.channelId}>
            {channel.assignment === 'unassigned' || !channel.otherAccount
              ? s.unassigned(channel.name)
              : s.otherAccount(channel.name, channel.otherAccount.name)}
          </li>
        ))}
      </ul>
      <div className="flex items-center gap-2">
        <Controller
          control={control}
          name="confirmChannels"
          render={({ field }) => (
            <Checkbox
              id={boxId}
              checked={field.value}
              onCheckedChange={(checked) => field.onChange(checked === true)}
              onBlur={field.onBlur}
              ref={field.ref}
            />
          )}
        />
        <Label htmlFor={boxId}>{s.confirm}</Label>
      </div>
    </section>
  )
}

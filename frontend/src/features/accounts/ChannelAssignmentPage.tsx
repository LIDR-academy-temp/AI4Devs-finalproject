import { strings } from './strings'

/** Administration › Channel Assignment, read only (README §1.3, web-admin-accounts design D8). */
export function ChannelAssignmentPage() {
  return (
    <section className="flex flex-col gap-4">
      <h1 className="text-2xl font-semibold">{strings.channelAssignment.title}</h1>
    </section>
  )
}

import { strings } from './strings'

const s = strings.global

/** Administration › Fees (README §1.3): every fee of the accounts in scope, read only (web-admin-fees design D3). */
export function FeesPage() {
  return (
    <section className="flex flex-col gap-4">
      <h1 className="text-2xl font-semibold">{s.title}</h1>
    </section>
  )
}

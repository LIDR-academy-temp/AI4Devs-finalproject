import { strings } from './strings'

const s = strings.account

/** Administration › Fees › Account fees (README §1.3 Account Fees / Fee History, web-admin-fees design D2). */
export function AccountFeesPage() {
  return (
    <section className="flex flex-col gap-4">
      <h1 className="text-2xl font-semibold">{s.titleLoading}</h1>
    </section>
  )
}

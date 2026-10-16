import { strings } from '../layout/strings'

/** Landing page after login; its widgets need GET /dashboard, which arrives in a later release. */
export function DashboardPage() {
  return (
    <section className="flex flex-col gap-3">
      <h1 className="text-2xl font-semibold">{strings.dashboard}</h1>
      <p className="text-muted-foreground">{strings.dashboardEmpty}</p>
    </section>
  )
}

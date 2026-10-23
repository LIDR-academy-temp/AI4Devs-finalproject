import { Link } from '@tanstack/react-router'
import { strings } from '../layout/strings'

/** Full-page message inside the layout, with a way back to Dashboard. */
export function PageMessage({ title, body }: { title: string; body: string }) {
  return (
    <section className="flex flex-col gap-3">
      <h1 className="text-2xl font-semibold">{title}</h1>
      <p className="text-muted-foreground">{body}</p>
      <Link to="/" className="text-primary underline underline-offset-4">
        {strings.backToDashboard}
      </Link>
    </section>
  )
}

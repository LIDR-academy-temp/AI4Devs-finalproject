import type { ReactNode } from 'react'

export type SectionHeroProps = {
  title: string
  badge?: string
  description?: string
  children?: ReactNode
}

export function SectionHero({ title, badge, description, children }: SectionHeroProps) {
  return (
    <section className="rounded-lg border border-neutral-100 bg-white p-6 shadow-sm">
      <div className="flex min-w-0 flex-wrap items-center gap-2">
        <h2 className="text-lg font-semibold text-primary-dark">{title}</h2>
        {badge && (
          <span className="rounded-full bg-primary-50 px-2.5 py-0.5 text-xs font-medium text-primary-dark">
            {badge}
          </span>
        )}
      </div>
      {description && <p className="mt-2 text-sm text-neutral">{description}</p>}
      {children && <div className="mt-4 min-w-0">{children}</div>}
    </section>
  )
}

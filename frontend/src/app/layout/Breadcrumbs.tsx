import { Link, useMatches } from '@tanstack/react-router'
import { Fragment } from 'react'
import { strings } from './strings'

/** Dashboard › <crumbs of the deepest route that declares them>. Hidden on routes without crumbs. */
export function Breadcrumbs() {
  const crumbs = useMatches({
    select: (matches) => matches.findLast((m) => m.staticData?.crumbs)?.staticData.crumbs ?? [],
  })
  if (crumbs.length === 0) return null
  return (
    <nav aria-label={strings.breadcrumb} className="text-sm text-muted-foreground">
      <Link to="/" className="text-primary underline underline-offset-4">
        {strings.screens.dashboard}
      </Link>
      {crumbs.map((crumb, index) => (
        <Fragment key={crumb}>
          <span aria-hidden="true"> › </span>
          <span aria-current={index === crumbs.length - 1 ? 'page' : undefined}>{crumb}</span>
        </Fragment>
      ))}
    </nav>
  )
}

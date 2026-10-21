import { useRouterState } from '@tanstack/react-router'
import { type ReactNode, useEffect, useRef } from 'react'

// Focus after an in-page navigation (ui-polish design D13). The handler of a user action that updates a list asks
// for the focus before navigating; the heading of that list takes it once it shows what was asked (its focusKey
// changed or it mounted). Reloading, arriving by a link and Back/Forward ask nothing, so they never move the focus.
// A request lives for one navigation only: ListFocusReset forgets it when that navigation is on screen, so an action
// that changed nothing cannot leave one behind for a heading mounted later.
let pending: string | null = null

/** Asks the heading of the list `name` to take the focus after the navigation this action starts. */
export function requestListFocus(name: string) {
  pending = name
}

/** Forgets a request no heading took. */
export function forgetListFocus() {
  pending = null
}

/**
 * Forgets the request once each navigation is on screen. It goes after the routes, so their headings (whose effects
 * run first) take theirs before it is forgotten.
 */
export function ListFocusReset() {
  const shown = useRouterState({ select: (state) => state.resolvedLocation?.href })
  useEffect(() => {
    if (shown !== undefined) forgetListFocus()
  }, [shown])
  return null
}

/**
 * The heading of a list updated in place: focusable from code (tabIndex -1) and, when the pending request is its
 * own, focused without the browser's jump and scrolled to the start of the view.
 */
export function ListHeading({
  name,
  focusKey,
  as: Tag = 'h3',
  className,
  children,
}: {
  /** Stable name of the list, the one its actions pass to requestListFocus. */
  name: string
  /** What the list shows (filter, page, cycle): a change is when a pending request is fulfilled. */
  focusKey: string
  as?: 'h2' | 'h3' | 'h4'
  className?: string
  children: ReactNode
}) {
  const ref = useRef<HTMLHeadingElement>(null)
  // biome-ignore lint/correctness/useExhaustiveDependencies: focusKey is the trigger, not a value read here.
  useEffect(() => {
    if (pending !== name || ref.current === null) return
    pending = null
    ref.current.focus({ preventScroll: true })
    ref.current.scrollIntoView({ block: 'start' })
  }, [name, focusKey])
  return (
    <Tag ref={ref} tabIndex={-1} data-list-heading className={className}>
      {children}
    </Tag>
  )
}

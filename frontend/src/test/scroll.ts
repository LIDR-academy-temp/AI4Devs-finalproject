import { onTestFinished, vi } from 'vitest'

/**
 * Watches the scrolling of a test (spec web-shell "Navegación dentro de la página: desplazamiento y foco"): whether
 * the window went back to the top and which elements were scrolled into view. `reset` forgets what the opening of the
 * screen did, so a test looks only at its own action.
 */
export function watchScroll() {
  const scrollTo = vi.spyOn(window, 'scrollTo')
  const scrollIntoView = vi.spyOn(Element.prototype, 'scrollIntoView')
  onTestFinished(() => {
    scrollTo.mockRestore()
    scrollIntoView.mockRestore()
  })
  return {
    wentToTop: () =>
      scrollTo.mock.calls.some((args: unknown[]) => {
        // scrollTo(options) or scrollTo(x, y).
        const [first, second] = args
        return typeof first === 'object' && first !== null ? (first as ScrollToOptions).top === 0 : second === 0
      }),
    scrolledIntoView: (element: Element) => scrollIntoView.mock.contexts.includes(element),
    reset: () => {
      scrollTo.mockClear()
      scrollIntoView.mockClear()
    },
  }
}

/** Whether the focus is on the heading of a list (they carry data-list-heading or data-validations-heading). */
export function focusOnAListHeading() {
  const active = document.activeElement
  return (
    active !== null && (active.hasAttribute('data-list-heading') || active.hasAttribute('data-validations-heading'))
  )
}

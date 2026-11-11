/**
 * Accepts only addresses inside the application, so that Login cannot be used as an open redirect. The target is
 * resolved as the browser would (backslashes, stripped tabs and newlines, schemes) and must keep this origin; only
 * its path, search and hash are returned.
 */
export function safeRedirect(target: string | undefined): string | undefined {
  if (!target) return undefined
  let url: URL
  try {
    url = new URL(target, window.location.origin)
  } catch {
    return undefined
  }
  if (url.origin !== window.location.origin) return undefined
  return `${url.pathname}${url.search}${url.hash}`
}

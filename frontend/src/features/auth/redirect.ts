/** Accepts only routes inside the application, so that Login cannot be used as an open redirect. */
export function safeRedirect(target: string | undefined): string | undefined {
  if (!target?.startsWith('/') || target.startsWith('//') || target.startsWith('/\\')) return undefined
  return target
}

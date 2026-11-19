const SIGN_PATH = /^\/sign\/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})\/?$/i
const TOKEN_KEY_PREFIX = 'firmadoc:token:'

export type SigningLink =
  | { ok: true; requestId: string; token: string }
  | { ok: false; error: 'incomplete_link' }

/**
 * Lee `/sign/{id}#t={token}`, guarda el token en sessionStorage y quita el fragmento de la barra
 * de direcciones. En una recarga sin fragmento usa el token guardado para esa misma solicitud.
 */
export function readSigningLink(win: Window = window): SigningLink {
  const { pathname, search, hash } = win.location
  const requestId = SIGN_PATH.exec(pathname)?.[1]?.toLowerCase()
  const fragmentToken = new URLSearchParams(hash.replace(/^#/, '')).get('t')

  if (hash) {
    win.history.replaceState(win.history.state, '', pathname + search)
  }
  if (!requestId) {
    return { ok: false, error: 'incomplete_link' }
  }

  const storageKey = TOKEN_KEY_PREFIX + requestId
  if (fragmentToken) {
    win.sessionStorage.setItem(storageKey, fragmentToken)
  }
  const token = fragmentToken || win.sessionStorage.getItem(storageKey)
  return token ? { ok: true, requestId, token } : { ok: false, error: 'incomplete_link' }
}

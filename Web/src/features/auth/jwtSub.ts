export function usuarioIdFromJwt(token: string): number | null {
  try {
    const part = token.split('.')[1]
    if (!part) return null
    const payload = JSON.parse(atob(part.replace(/-/g, '+').replace(/_/g, '/'))) as {
      sub?: string | number
    }
    if (typeof payload.sub === 'number') return payload.sub
    if (typeof payload.sub === 'string') {
      const n = Number(payload.sub)
      return Number.isFinite(n) ? n : null
    }
    return null
  } catch {
    return null
  }
}

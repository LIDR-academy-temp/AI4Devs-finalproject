export function parseEncuestaId(raw: string | undefined): number | undefined {
  if (!raw || raw === 'undefined') return undefined
  const n = Number.parseInt(raw, 10)
  return Number.isFinite(n) && n > 0 ? n : undefined
}
